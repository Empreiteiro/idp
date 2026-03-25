import logging
import uuid
from pathlib import Path

import magic
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/bmp",
    "image/webp",
}


def validate_file_type(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def validate_file_content(file_bytes: bytes) -> str:
    """Validate file content by checking magic bytes against allowed MIME types.

    Returns the detected MIME type if valid, raises ValueError otherwise.
    """
    detected_mime = magic.from_buffer(file_bytes, mime=True)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise ValueError(
            f"File content type '{detected_mime}' is not allowed. "
            f"Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )
    logger.debug("File content validated: detected MIME type '%s'", detected_mime)
    return detected_mime


async def save_upload_file(file: UploadFile) -> tuple[str, int]:
    """Save uploaded file to disk. Returns (relative_path, file_size)."""
    ext = get_file_extension(file.filename or "file")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = settings.upload_path / unique_name

    content = await file.read()
    file_size = len(content)

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise ValueError(f"File size exceeds {settings.max_file_size_mb}MB limit")

    # Validate actual file content via magic bytes
    validate_file_content(content)

    with open(file_path, "wb") as f:
        f.write(content)

    return unique_name, file_size


def delete_file(relative_path: str) -> None:
    file_path = settings.upload_path / relative_path
    if file_path.exists():
        file_path.unlink()


def get_file_full_path(relative_path: str) -> Path:
    return settings.upload_path / relative_path
