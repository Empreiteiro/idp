"""Activity log API - tracks all platform operations."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import ActivityLog

router = APIRouter(prefix="/api/activity", tags=["activity"])


def log_activity(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    entity_name: str | None = None,
    details: str | None = None,
    status: str = "success",
):
    """Helper to create an activity log entry."""
    entry = ActivityLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details,
        status=status,
    )
    db.add(entry)
    db.commit()
    return entry


@router.get("")
def get_activity_log(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    action: str | None = None,
    entity_type: str | None = None,
    db: Session = Depends(get_db),
):
    """Get activity log entries with pagination and filters."""
    query = db.query(ActivityLog)

    if action:
        query = query.filter(ActivityLog.action == action)
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)

    total = query.count()
    entries = (
        query.order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "entries": [
            {
                "id": e.id,
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "entity_name": e.entity_name,
                "details": e.details,
                "status": e.status,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
