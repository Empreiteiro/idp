"""Insight Templates and Document Insights models."""

from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, Table, Column, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# Association table for many-to-many between DocumentInsight and Document
document_insight_documents = Table(
    "document_insight_documents",
    Base.metadata,
    Column("insight_id", Integer, ForeignKey("document_insights.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
)


class InsightTemplate(Base):
    __tablename__ = "insight_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    template: Mapped["Template"] = relationship(back_populates="insight_templates")
    sections: Mapped[list["InsightTemplateSection"]] = relationship(
        back_populates="insight_template", cascade="all, delete-orphan",
        order_by="InsightTemplateSection.sort_order",
    )
    insights: Mapped[list["DocumentInsight"]] = relationship(back_populates="insight_template")


class InsightTemplateSection(Base):
    __tablename__ = "insight_template_sections"
    __table_args__ = (
        UniqueConstraint("insight_template_id", "title", name="uq_insight_section_title"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    insight_template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("insight_templates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    insight_template: Mapped["InsightTemplate"] = relationship(back_populates="sections")


class DocumentInsight(Base):
    __tablename__ = "document_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    insight_template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("insight_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    analysis_mode: Mapped[str] = mapped_column(String(20), nullable=False)  # individual | consolidated
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight_template: Mapped["InsightTemplate | None"] = relationship(back_populates="insights")
    documents: Mapped[list["Document"]] = relationship(
        secondary=document_insight_documents, backref="insights",
    )
