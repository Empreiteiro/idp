"""Data tables API - view extracted data in tabular format per template, with CSV export."""

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Template, TemplateField, Document, ExtractionResult

router = APIRouter(prefix="/api/data", tags=["data-tables"])


@router.get("/templates/{template_id}/table")
def get_template_data_table(
    template_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    reviewed_only: bool = False,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """Get extracted data as a table for a given template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")

    # Get field definitions (columns)
    fields = db.query(TemplateField).filter(
        TemplateField.template_id == template_id
    ).order_by(TemplateField.sort_order).all()

    columns = [
        {"field_name": f.field_name, "field_label": f.field_label, "field_type": f.field_type}
        for f in fields
    ]

    # Query extractions for this template
    query = (
        db.query(ExtractionResult, Document)
        .join(Document, ExtractionResult.document_id == Document.id)
        .filter(ExtractionResult.template_id == template_id)
    )

    if reviewed_only:
        query = query.filter(ExtractionResult.is_reviewed == True)

    total = query.count()
    results = (
        query.order_by(Document.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    rows = []
    for ext, doc in results:
        data = json.loads(ext.extracted_data) if isinstance(ext.extracted_data, str) else ext.extracted_data

        row = {
            "_doc_id": doc.id,
            "_filename": doc.filename,
            "_status": doc.status,
            "_is_reviewed": ext.is_reviewed,
            "_created_at": doc.created_at.isoformat(),
            "_confidence_avg": 0.0,
        }

        confidences = []
        for field in fields:
            field_data = data.get(field.field_name, {})
            if isinstance(field_data, dict):
                row[field.field_name] = field_data.get("value")
                conf = field_data.get("confidence", 0.0)
                confidences.append(conf)
            else:
                row[field.field_name] = field_data
                confidences.append(0.8)

        row["_confidence_avg"] = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

        # Search filter - check if any field value matches
        if search:
            search_lower = search.lower()
            matched = False
            for field in fields:
                val = row.get(field.field_name)
                if val and search_lower in str(val).lower():
                    matched = True
                    break
            if search_lower in doc.filename.lower():
                matched = True
            if not matched:
                total -= 1
                continue

        rows.append(row)

    return {
        "template_id": template_id,
        "template_name": template.name,
        "columns": columns,
        "rows": rows,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/templates/{template_id}/export")
def export_template_data_csv(
    template_id: int,
    reviewed_only: bool = False,
    db: Session = Depends(get_db),
):
    """Export extracted data as CSV for a given template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")

    fields = db.query(TemplateField).filter(
        TemplateField.template_id == template_id
    ).order_by(TemplateField.sort_order).all()

    query = (
        db.query(ExtractionResult, Document)
        .join(Document, ExtractionResult.document_id == Document.id)
        .filter(ExtractionResult.template_id == template_id)
    )

    if reviewed_only:
        query = query.filter(ExtractionResult.is_reviewed == True)

    results = query.order_by(Document.created_at.desc()).all()

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    header = ["Document ID", "Filename", "Status", "Reviewed", "Created At"]
    header.extend([f.field_label for f in fields])
    header.append("Avg Confidence")
    writer.writerow(header)

    # Data rows
    for ext, doc in results:
        data = json.loads(ext.extracted_data) if isinstance(ext.extracted_data, str) else ext.extracted_data

        row = [doc.id, doc.filename, doc.status, "Yes" if ext.is_reviewed else "No", doc.created_at.isoformat()]

        confidences = []
        for field in fields:
            field_data = data.get(field.field_name, {})
            if isinstance(field_data, dict):
                row.append(field_data.get("value", ""))
                confidences.append(field_data.get("confidence", 0.0))
            else:
                row.append(field_data if field_data is not None else "")
                confidences.append(0.8)

        avg_conf = round(sum(confidences) / len(confidences) * 100, 1) if confidences else 0
        row.append(f"{avg_conf}%")
        writer.writerow(row)

    output.seek(0)

    safe_name = template.name.replace(" ", "_").lower()
    filename = f"{safe_name}_data_export.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/summary")
def get_data_summary(db: Session = Depends(get_db)):
    """Get summary of all extracted data across templates."""
    templates = db.query(Template).all()

    summary = []
    for t in templates:
        extraction_count = db.query(ExtractionResult).filter(
            ExtractionResult.template_id == t.id
        ).count()

        reviewed_count = db.query(ExtractionResult).filter(
            ExtractionResult.template_id == t.id,
            ExtractionResult.is_reviewed == True,
        ).count()

        field_count = db.query(TemplateField).filter(
            TemplateField.template_id == t.id
        ).count()

        summary.append({
            "template_id": t.id,
            "template_name": t.name,
            "field_count": field_count,
            "extraction_count": extraction_count,
            "reviewed_count": reviewed_count,
            "pending_count": extraction_count - reviewed_count,
        })

    return {"templates": summary}
