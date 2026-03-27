from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProviderConfig(Base):
    """Stores AI and OCR provider configurations (supports multiple providers)."""

    __tablename__ = "provider_configs"
    __table_args__ = (
        UniqueConstraint("kind", "provider_name", name="uq_kind_provider"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # "ai" or "ocr"
    provider_name: Mapped[str] = mapped_column(String(50), nullable=False)  # "openai", "claude", etc.
    display_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    api_key: Mapped[str] = mapped_column(Text, nullable=False, default="")  # encrypted
    model: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    extra_config: Mapped[str] = mapped_column(Text, nullable=False, default="{}")  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
