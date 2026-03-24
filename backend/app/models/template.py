from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_file: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fields: Mapped[list["TemplateField"]] = relationship(
        back_populates="template", cascade="all, delete-orphan", order_by="TemplateField.sort_order"
    )
    documents: Mapped[list["Document"]] = relationship(back_populates="template")


class TemplateField(Base):
    __tablename__ = "template_fields"
    __table_args__ = (UniqueConstraint("template_id", "field_name", name="uq_template_field_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    field_label: Mapped[str] = mapped_column(String(200), nullable=False)
    field_type: Mapped[str] = mapped_column(String(50), nullable=False, default="text")
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    template: Mapped["Template"] = relationship(back_populates="fields")
