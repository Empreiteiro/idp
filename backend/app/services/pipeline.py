"""Document processing pipeline orchestrator."""

import json
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger("idp.pipeline")

from app.models import Template, TemplateField, Document, ExtractionResult
from app.services.ocr import extract_text
from app.services.ai_extractor import extract_fields
from app.services.classifier import classify_document
from app.services.field_suggester import suggest_fields, suggest_fields_multi
from app.config import settings as app_settings
from app.core.file_utils import get_file_full_path


def _log(db: Session, action: str, entity_type: str, entity_id=None, entity_name=None, details=None, status="success"):
    """Best-effort activity logging."""
    try:
        from app.api.activity import log_activity
        log_activity(db, action, entity_type, entity_id, entity_name, details, status)
    except Exception as e:
        logger.warning("Activity logging failed: %s", e)


async def process_document(db: Session, document_id: int) -> None:
    """Full processing pipeline for a document.

    Steps:
    1. OCR - extract text from document
    2. Classify - if no template, auto-classify
    3. Extract - extract fields using template
    4. Store - save extraction results
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    _log(db, "process_start", "document", doc.id, doc.filename)

    try:
        # Step 1: OCR
        doc.status = "ocr_processing"
        db.commit()

        file_path = get_file_full_path(doc.file_path)
        ocr_text, page_count = extract_text(file_path, doc.file_type)

        doc.ocr_text = ocr_text
        doc.page_count = page_count
        doc.status = "ocr_complete"
        db.commit()

        if not ocr_text.strip():
            doc.status = "failed"
            doc.error_message = "OCR produced no text. The document may be empty or unreadable."
            db.commit()
            return

        # Step 2: Classification (if no template assigned)
        if not doc.template_id:
            doc.status = "classifying"
            db.commit()

            templates = db.query(Template).all()
            if templates:
                template_data = []
                for t in templates:
                    field_names = [f.field_name for f in t.fields]
                    template_data.append({
                        "id": t.id,
                        "name": t.name,
                        "description": t.description or "",
                        "field_names": field_names,
                    })

                result = await classify_document(
                    db, ocr_text, template_data,
                    document_id=doc.id, document_name=doc.filename,
                )
                doc.classification_confidence = result.get("confidence", 0.0)

                if result.get("template_id") and result.get("confidence", 0) >= app_settings.classification_threshold:
                    doc.template_id = result["template_id"]
                else:
                    doc.status = "review"
                    doc.error_message = (
                        f"Auto-classification uncertain. "
                        f"Suggested: {result.get('suggested_type', 'Unknown')}. "
                        f"Confidence: {result.get('confidence', 0):.0%}"
                    )
                    db.commit()
                    return
            else:
                doc.status = "review"
                doc.error_message = "No templates available. Create a template first or assign one manually."
                db.commit()
                return

        # Step 3: Extract fields
        doc.status = "extracting"
        db.commit()

        template = db.query(Template).filter(Template.id == doc.template_id).first()
        if not template or not template.fields:
            doc.status = "failed"
            doc.error_message = "Template has no fields defined. Add fields to the template first."
            db.commit()
            return

        fields_data = []
        for f in template.fields:
            fd = {
                "field_name": f.field_name,
                "field_label": f.field_label,
                "field_type": f.field_type,
            }
            if f.field_type == "table" and f.columns:
                fd["columns"] = json.loads(f.columns) if isinstance(f.columns, str) else f.columns
            fields_data.append(fd)

        extracted_data = await extract_fields(
            db, ocr_text, fields_data,
            document_id=doc.id, template_id=doc.template_id,
            document_name=doc.filename,
        )

        # Step 4: Store results
        extraction = ExtractionResult(
            document_id=doc.id,
            template_id=doc.template_id,
            extracted_data=json.dumps(extracted_data),
        )
        db.add(extraction)
        doc.status = "completed"
        db.commit()

        _log(db, "process_complete", "document", doc.id, doc.filename,
             f"Extracted {len(extracted_data)} fields from template '{template.name}'")

    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        _log(db, "process_failed", "document", doc.id, doc.filename, str(e), "error")
        raise


async def suggest_fields_for_template(db: Session, template: Template) -> None:
    """Run AI field suggestion on a template's example documents.

    When multiple example files exist, all are OCR-processed and the AI
    compares them to build a unified field set — marking fields present in
    all documents as required and the rest as optional.
    """
    # Resolve example files (supports both legacy single-path and JSON array)
    example_files: list[str] = []
    if template.example_files:
        try:
            parsed = json.loads(template.example_files)
            example_files = parsed if isinstance(parsed, list) else [parsed]
        except (ValueError, TypeError):
            example_files = [template.example_files]
    elif template.example_file:
        example_files = [template.example_file]

    if not example_files:
        raise ValueError("Template has no example files")

    # OCR each file
    ocr_texts: list[str] = []
    for ef in example_files:
        file_path = get_file_full_path(ef)
        file_ext = ef.rsplit(".", 1)[-1].lower()
        file_type = "pdf" if file_ext == "pdf" else f"image/{file_ext}"

        text, _ = extract_text(file_path, file_type)
        if text.strip():
            ocr_texts.append(text)

    if not ocr_texts:
        raise ValueError("OCR produced no text from the example documents")

    # Use multi-doc or single-doc suggestion
    if len(ocr_texts) > 1:
        suggested = await suggest_fields_multi(
            db, ocr_texts,
            template_id=template.id, template_name=template.name,
        )
    else:
        suggested = await suggest_fields(
            db, ocr_texts[0],
            template_id=template.id, template_name=template.name,
        )

    # Clear existing fields and add new ones
    db.query(TemplateField).filter(TemplateField.template_id == template.id).delete()
    db.flush()

    for field_data in suggested:
        columns_json = None
        if field_data.get("field_type") == "table" and field_data.get("columns"):
            columns_json = json.dumps(field_data["columns"])
        field = TemplateField(
            template_id=template.id,
            field_name=field_data["field_name"],
            field_label=field_data["field_label"],
            field_type=field_data["field_type"],
            required=field_data.get("required", False),
            sort_order=field_data.get("sort_order", 0),
            columns=columns_json,
        )
        db.add(field)

    db.commit()
