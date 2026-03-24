from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Document, Template, ExtractionResult

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_docs = db.query(func.count(Document.id)).scalar() or 0
    total_templates = db.query(func.count(Template.id)).scalar() or 0

    status_counts = dict(
        db.query(Document.status, func.count(Document.id))
        .group_by(Document.status)
        .all()
    )

    reviewed = db.query(func.count(ExtractionResult.id)).filter(
        ExtractionResult.is_reviewed == True
    ).scalar() or 0

    pending_review = db.query(func.count(Document.id)).filter(
        Document.status == "completed"
    ).scalar() or 0

    return {
        "total_documents": total_docs,
        "total_templates": total_templates,
        "documents_by_status": status_counts,
        "reviewed": reviewed,
        "pending_review": pending_review - reviewed,
        "failed": status_counts.get("failed", 0),
        "processing": sum(
            status_counts.get(s, 0)
            for s in ["uploaded", "ocr_processing", "classifying", "extracting"]
        ),
    }


@router.get("/recent")
def get_recent(limit: int = 10, db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).limit(limit).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "status": d.status,
            "template_name": d.template.name if d.template else None,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]
