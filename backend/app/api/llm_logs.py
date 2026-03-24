"""LLM request logs API - full tracing of every AI provider call."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.llm_log import LLMLog

router = APIRouter(prefix="/api/llm-logs", tags=["llm-logs"])


@router.get("")
def list_llm_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    request_type: str | None = None,
    provider: str | None = None,
    status: str | None = None,
    document_id: int | None = None,
    template_id: int | None = None,
    db: Session = Depends(get_db),
):
    """List LLM request logs with filters and pagination."""
    query = db.query(LLMLog)

    if request_type:
        query = query.filter(LLMLog.request_type == request_type)
    if provider:
        query = query.filter(LLMLog.provider == provider)
    if status:
        query = query.filter(LLMLog.status == status)
    if document_id:
        query = query.filter(LLMLog.document_id == document_id)
    if template_id:
        query = query.filter(LLMLog.template_id == template_id)

    total = query.count()
    logs = (
        query.order_by(LLMLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "logs": [
            {
                "id": log.id,
                "request_type": log.request_type,
                "provider": log.provider,
                "model": log.model,
                "document_id": log.document_id,
                "template_id": log.template_id,
                "entity_name": log.entity_name,
                "status": log.status,
                "prompt_tokens": log.prompt_tokens,
                "completion_tokens": log.completion_tokens,
                "total_tokens": log.total_tokens,
                "latency_ms": log.latency_ms,
                "estimated_cost": log.estimated_cost,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/stats")
def get_llm_stats(db: Session = Depends(get_db)):
    """Aggregate statistics for LLM usage."""
    total_requests = db.query(func.count(LLMLog.id)).scalar() or 0
    total_tokens_used = db.query(func.sum(LLMLog.total_tokens)).scalar() or 0
    total_cost = db.query(func.sum(LLMLog.estimated_cost)).scalar() or 0.0
    avg_latency = db.query(func.avg(LLMLog.latency_ms)).filter(LLMLog.latency_ms.isnot(None)).scalar() or 0
    error_count = db.query(func.count(LLMLog.id)).filter(LLMLog.status == "error").scalar() or 0

    # By provider
    by_provider = dict(
        db.query(LLMLog.provider, func.count(LLMLog.id))
        .group_by(LLMLog.provider).all()
    )

    # By request type
    by_type = dict(
        db.query(LLMLog.request_type, func.count(LLMLog.id))
        .group_by(LLMLog.request_type).all()
    )

    # By model
    by_model = dict(
        db.query(LLMLog.model, func.count(LLMLog.id))
        .group_by(LLMLog.model).all()
    )

    # Tokens by provider
    tokens_by_provider = dict(
        db.query(LLMLog.provider, func.sum(LLMLog.total_tokens))
        .filter(LLMLog.total_tokens.isnot(None))
        .group_by(LLMLog.provider).all()
    )

    # Cost by provider
    cost_by_provider = {}
    rows = (
        db.query(LLMLog.provider, func.sum(LLMLog.estimated_cost))
        .filter(LLMLog.estimated_cost.isnot(None))
        .group_by(LLMLog.provider).all()
    )
    for prov, cost in rows:
        cost_by_provider[prov] = round(float(cost), 6) if cost else 0.0

    return {
        "total_requests": total_requests,
        "total_tokens": total_tokens_used,
        "total_cost": round(float(total_cost), 6),
        "avg_latency_ms": round(float(avg_latency)),
        "error_count": error_count,
        "success_rate": round((total_requests - error_count) / total_requests * 100, 1) if total_requests else 0,
        "by_provider": by_provider,
        "by_type": by_type,
        "by_model": by_model,
        "tokens_by_provider": {k: int(v) if v else 0 for k, v in tokens_by_provider.items()},
        "cost_by_provider": cost_by_provider,
    }


@router.get("/{log_id}")
def get_llm_log_detail(log_id: int, db: Session = Depends(get_db)):
    """Get full details of a single LLM request including prompts and response."""
    log = db.query(LLMLog).filter(LLMLog.id == log_id).first()
    if not log:
        raise HTTPException(404, "Log entry not found")

    return {
        "id": log.id,
        "request_type": log.request_type,
        "provider": log.provider,
        "model": log.model,
        "document_id": log.document_id,
        "template_id": log.template_id,
        "entity_name": log.entity_name,
        "system_prompt": log.system_prompt,
        "user_prompt": log.user_prompt,
        "response_text": log.response_text,
        "status": log.status,
        "error_message": log.error_message,
        "prompt_tokens": log.prompt_tokens,
        "completion_tokens": log.completion_tokens,
        "total_tokens": log.total_tokens,
        "latency_ms": log.latency_ms,
        "estimated_cost": log.estimated_cost,
        "created_at": log.created_at.isoformat(),
    }
