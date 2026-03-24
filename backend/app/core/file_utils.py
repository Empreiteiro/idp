import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"}


def validate_file_type(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


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

    with open(file_path, "wb") as f:
        f.write(content)

    return unique_name, file_size


def delete_file(relative_path: str) -> None:
    file_path = settings.upload_path / relative_path
    if file_path.exists():
        file_path.unlink()


def get_file_full_path(relative_path: str) -> Path:
    return settings.upload_path / relative_path
