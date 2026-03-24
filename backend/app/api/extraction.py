import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, ExtractionResult
from app.schemas.document import ExtractionResponse, ExtractionUpdate

router = APIRouter(prefix="/api/documents", tags=["extraction"])


@router.get("/{doc_id}/extraction", response_model=ExtractionResponse)
def get_extraction(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.extraction:
        raise HTTPException(404, "No extraction results yet")

    ext = doc.extraction
    data = json.loads(ext.extracted_data) if isinstance(ext.extracted_data, str) else ext.extracted_data
    return ExtractionResponse(
        id=ext.id, document_id=ext.document_id, template_id=ext.template_id,
        extracted_data=data, is_reviewed=ext.is_reviewed,
        reviewed_at=ext.reviewed_at, created_at=ext.created_at,
    )


@router.put("/{doc_id}/extraction", response_model=ExtractionResponse)
def update_extraction(doc_id: int, data: ExtractionUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.extraction:
        raise HTTPException(404, "No extraction results yet")

    ext = doc.extraction
    ext.extracted_data = json.dumps(data.extracted_data)
    ext.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ext)

    parsed = json.loads(ext.extracted_data)
    return ExtractionResponse(
        id=ext.id, document_id=ext.document_id, template_id=ext.template_id,
        extracted_data=parsed, is_reviewed=ext.is_reviewed,
        reviewed_at=ext.reviewed_at, created_at=ext.created_at,
    )


@router.post("/{doc_id}/extraction/approve", response_model=ExtractionResponse)
def approve_extraction(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.extraction:
        raise HTTPException(404, "No extraction results yet")

    ext = doc.extraction
    ext.is_reviewed = True
    ext.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(ext)

    parsed = json.loads(ext.extracted_data) if isinstance(ext.extracted_data, str) else ext.extracted_data
    return ExtractionResponse(
        id=ext.id, document_id=ext.document_id, template_id=ext.template_id,
        extracted_data=parsed, is_reviewed=ext.is_reviewed,
        reviewed_at=ext.reviewed_at, created_at=ext.created_at,
    )
