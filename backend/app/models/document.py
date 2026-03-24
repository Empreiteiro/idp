from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("templates.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="uploaded")
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    template: Mapped["Template | None"] = relationship(back_populates="documents")
    extraction: Mapped["ExtractionResult | None"] = relationship(
        back_populates="document", uselist=False, cascade="all, delete-orphan"
    )
