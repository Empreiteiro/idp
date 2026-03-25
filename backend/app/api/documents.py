from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Document, Template, ExtractionResult
from app.schemas.document import DocumentResponse, DocumentDetailResponse, DocumentListResponse, ExtractionResponse
from app.utils.json_utils import parse_extracted_data
from app.core.file_utils import save_upload_file, validate_file_type, delete_file, get_file_full_path, get_file_extension
from app.schemas.responses import SuccessResponse
from app.core.rate_limit import limiter

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id, filename=doc.filename, file_path=doc.file_path,
        file_type=doc.file_type, file_size=doc.file_size,
        template_id=doc.template_id,
        template_name=doc.template.name if doc.template else None,
        status=doc.status, classification_confidence=doc.classification_confidence,
        error_message=doc.error_message, page_count=doc.page_count,
        created_at=doc.created_at, updated_at=doc.updated_at,
    )


def _extraction_to_response(ext: ExtractionResult) -> ExtractionResponse:
    data = parse_extracted_data(ext.extracted_data)
    return ExtractionResponse(
        id=ext.id, document_id=ext.document_id, template_id=ext.template_id,
        extracted_data=data, is_reviewed=ext.is_reviewed,
        reviewed_at=ext.reviewed_at, created_at=ext.created_at,
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    status: str | None = None,
    template_id: int | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if status:
        query = query.filter(Document.status == status)
    if template_id:
        query = query.filter(Document.template_id == template_id)

    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return DocumentListResponse(
        documents=[_doc_to_response(d) for d in docs],
        total=total, page=page, limit=limit,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=201)
@limiter.limit("10/hour")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    template_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename or not validate_file_type(file.filename):
        raise HTTPException(400, "Unsupported file type. Allowed: PDF, PNG, JPG, TIFF, BMP, WEBP")

    if template_id:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(404, "Template not found")

    try:
        file_path, file_size = await save_upload_file(file)
    except ValueError as e:
        raise HTTPException(400, str(e))

    ext = get_file_extension(file.filename)
    file_type = "pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"

    doc = Document(
        filename=file.filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        template_id=template_id,
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Start processing in background-like fashion (sync for now)
    try:
        from app.services.pipeline import process_document
        await process_document(db, doc.id)
        db.refresh(doc)
    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        db.refresh(doc)

    return _doc_to_response(doc)


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    extraction = None
    if doc.extraction:
        extraction = _extraction_to_response(doc.extraction)

    resp = _doc_to_response(doc)
    return DocumentDetailResponse(**resp.model_dump(), extraction=extraction)


@router.delete("/{doc_id}", response_model=SuccessResponse)
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    delete_file(doc.file_path)
    db.delete(doc)
    db.commit()
    return SuccessResponse(message=f"Document '{doc.filename}' deleted")


@router.get("/{doc_id}/file")
def serve_file(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    path = get_file_full_path(doc.file_path)
    if not path.exists():
        raise HTTPException(404, "File not found on disk")

    media_type = "application/pdf" if doc.file_type == "pdf" else f"image/{doc.file_type.split('/')[-1]}"
    return FileResponse(path, media_type=media_type, filename=doc.filename)


@router.put("/{doc_id}/assign-template", response_model=DocumentResponse)
async def assign_template(
    doc_id: int,
    template_id: int = Form(...),
    auto_process: bool = Form(True),
    db: Session = Depends(get_db),
):
    """Assign a template to a document (for review/unclassified docs)."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")

    doc.template_id = template_id
    doc.error_message = None
    db.commit()

    if auto_process:
        # Delete existing extraction if any
        if doc.extraction:
            db.delete(doc.extraction)
            db.commit()

        doc.status = "uploaded"
        db.commit()

        try:
            from app.services.pipeline import process_document
            await process_document(db, doc.id)
            db.refresh(doc)
        except Exception as e:
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
            db.refresh(doc)

    return _doc_to_response(doc)


@router.post("/upload-batch", status_code=201)
@limiter.limit("10/hour")
async def upload_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    template_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    """Upload multiple documents at once."""
    results = []

    for file in files:
        if not file.filename or not validate_file_type(file.filename):
            results.append({"filename": file.filename, "error": "Unsupported file type", "status": "failed"})
            continue

        try:
            file_path, file_size = await save_upload_file(file)
            ext = get_file_extension(file.filename)
            file_type = "pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"

            doc = Document(
                filename=file.filename,
                file_path=file_path,
                file_type=file_type,
                file_size=file_size,
                template_id=template_id,
                status="uploaded",
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            try:
                from app.services.pipeline import process_document
                await process_document(db, doc.id)
                db.refresh(doc)
            except Exception as e:
                doc.status = "failed"
                doc.error_message = str(e)
                db.commit()
                db.refresh(doc)

            results.append({
                "id": doc.id,
                "filename": doc.filename,
                "status": doc.status,
                "error": doc.error_message,
            })
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e), "status": "failed"})

    succeeded = sum(1 for r in results if r.get("status") != "failed")
    failed = len(results) - succeeded

    return {
        "total": len(results),
        "succeeded": succeeded,
        "failed": failed,
        "results": results,
    }


@router.post("/{doc_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete existing extraction
    if doc.extraction:
        db.delete(doc.extraction)
        db.commit()

    doc.status = "uploaded"
    doc.error_message = None
    db.commit()

    try:
        from app.services.pipeline import process_document
        await process_document(db, doc.id)
        db.refresh(doc)
    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        db.refresh(doc)

    return _doc_to_response(doc)
