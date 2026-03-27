from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON array of file paths, e.g. '["uploads/a.pdf","uploads/b.pdf"]'
    example_files: Mapped[str | None] = mapped_column("example_files", Text, nullable=True)

    # Legacy column kept for backward compat — reads are routed through example_files
    @property
    def example_file(self) -> str | None:
        """Return the first example file for backward compatibility."""
        import json as _json
        if not self.example_files:
            return None
        try:
            files = _json.loads(self.example_files)
            return files[0] if files else None
        except (ValueError, TypeError):
            # Legacy single-path value
            return self.example_files
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fields: Mapped[list["TemplateField"]] = relationship(
        back_populates="template", cascade="all, delete-orphan", order_by="TemplateField.sort_order"
    )
    documents: Mapped[list["Document"]] = relationship(back_populates="template")
    insight_templates: Mapped[list["InsightTemplate"]] = relationship(back_populates="template", cascade="all, delete-orphan")


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
    columns: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    template: Mapped["Template"] = relationship(back_populates="fields")
