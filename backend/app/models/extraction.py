from datetime import datetime

from sqlalchemy import Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExtractionResult(Base):
    __tablename__ = "extraction_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False
    )
    extracted_data: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document: Mapped["Document"] = relationship(back_populates="extraction")
    template: Mapped["Template"] = relationship()
