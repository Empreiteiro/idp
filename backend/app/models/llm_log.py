"""LLM request tracing - stores every AI provider call with full details."""

from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LLMLog(Base):
    __tablename__ = "llm_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Request classification
    request_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Provider info
    provider: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)

    # Linked entity (optional)
    document_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    template_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Request details
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Response details
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Token usage
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Performance
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Cost estimation (USD)
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
