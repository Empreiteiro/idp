"""OCR text extraction with multiple fallback strategies.

Priority:
1. pdfplumber (fast, works for text-based PDFs, no external deps)
2. pdf2image + pytesseract (for image-based/scanned PDFs, requires poppler)
3. Pillow + pytesseract (for images)
"""

from pathlib import Path

from PIL import Image

from app.config import settings


def _get_tesseract_cmd():
    if settings.tesseract_path:
        return settings.tesseract_path
    return "tesseract"


def _get_poppler_path():
    if settings.poppler_path:
        return settings.poppler_path
    return None


def _get_db_setting(key: str) -> str:
    """Try to read setting from DB without requiring a session parameter."""
    try:
        from app.database import SessionLocal
        from app.models.settings import AppSettings
        db = SessionLocal()
        try:
            row = db.query(AppSettings).filter(AppSettings.key == key).first()
            return row.value if row else ""
        finally:
            db.close()
    except Exception:
        return ""


def extract_text_from_image(image_path: str | Path) -> str:
    import pytesseract

    tesseract_cmd = _get_db_setting("tesseract_path") or _get_tesseract_cmd()
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    img = Image.open(image_path)
    if img.mode != "RGB":
        img = img.convert("RGB")

    text = pytesseract.image_to_string(img, lang="por+eng")
    return text.strip()


def extract_text_from_pdf_pdfplumber(pdf_path: str | Path) -> tuple[str, int]:
    """Extract text using pdfplumber (works for text-based PDFs without poppler)."""
    import pdfplumber

    texts = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if text.strip():
                texts.append(f"--- Page {i + 1} ---\n{text.strip()}")

    full_text = "\n\n".join(texts)
    return full_text, page_count


def extract_text_from_pdf_ocr(pdf_path: str | Path) -> tuple[str, int]:
    """Extract text using pdf2image + pytesseract (for scanned PDFs)."""
    import pytesseract
    from pdf2image import convert_from_path

    tesseract_cmd = _get_db_setting("tesseract_path") or _get_tesseract_cmd()
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    poppler_path = _get_db_setting("poppler_path") or _get_poppler_path()
    kwargs = {}
    if poppler_path:
        kwargs["poppler_path"] = poppler_path

    images = convert_from_path(str(pdf_path), dpi=300, **kwargs)
    page_count = len(images)

    texts = []
    for i, img in enumerate(images):
        text = pytesseract.image_to_string(img, lang="por+eng")
        texts.append(f"--- Page {i + 1} ---\n{text.strip()}")

    return "\n\n".join(texts), page_count


def extract_text_from_pdf(pdf_path: str | Path) -> tuple[str, int]:
    """Extract text from PDF with fallback strategies.

    1. Try pdfplumber first (fast, no external deps)
    2. If text is empty/short, fall back to OCR (scanned PDF)
    """
    # Strategy 1: pdfplumber
    try:
        text, page_count = extract_text_from_pdf_pdfplumber(pdf_path)
        # If we got meaningful text, use it
        if text.strip() and len(text.strip()) > 50:
            return text, page_count
    except Exception:
        pass

    # Strategy 2: OCR with pdf2image
    try:
        text, page_count = extract_text_from_pdf_ocr(pdf_path)
        return text, page_count
    except Exception as e:
        # Strategy 3: if OCR fails too, try pdfplumber again and accept any result
        try:
            text, page_count = extract_text_from_pdf_pdfplumber(pdf_path)
            if text.strip():
                return text, page_count
        except Exception:
            pass

        raise ValueError(
            f"Failed to extract text from PDF. "
            f"pdfplumber and OCR both failed. OCR error: {str(e)}. "
            f"For scanned PDFs, ensure Tesseract is installed and poppler_path is set in Settings."
        )


def extract_text(file_path: Path, file_type: str) -> tuple[str, int]:
    """Main entry point. Returns (text, page_count)."""
    if file_type == "pdf":
        return extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_image(file_path)
        return text, 1
