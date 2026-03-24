"""OCR text extraction with multiple fallback strategies.

Priority for PDFs:
1. pdfplumber  – fast, works for text-based (digital) PDFs
2. PyMuPDF (fitz) + pytesseract – for scanned PDFs (needs Tesseract only)
3. PyMuPDF (fitz) + AI vision – for scanned PDFs when Tesseract is unavailable
4. pdf2image + pytesseract – legacy fallback (needs poppler + Tesseract)
"""

import base64
import io
from pathlib import Path

from PIL import Image

from app.config import settings


def _get_tesseract_cmd() -> str:
    db_val = _get_db_setting("tesseract_path")
    if db_val:
        return db_val
    if settings.tesseract_path:
        return settings.tesseract_path
    return "tesseract"


def _get_poppler_path() -> str | None:
    db_val = _get_db_setting("poppler_path")
    if db_val:
        return db_val
    if settings.poppler_path:
        return settings.poppler_path
    return None


def _get_db_setting(key: str) -> str:
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


def _tesseract_available() -> bool:
    """Check if Tesseract is actually reachable."""
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _image_to_base64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ── Image OCR ────────────────────────────────────────────────────────────────

def _ocr_with_tesseract(img: Image.Image) -> str:
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()
    if img.mode != "RGB":
        img = img.convert("RGB")
    return pytesseract.image_to_string(img, lang="por+eng").strip()


def _ocr_with_ai(img: Image.Image) -> str:
    """Use the configured AI provider with vision to extract text from image.
    Works with OpenAI (gpt-4o), Claude (vision), Gemini (vision).
    """
    from app.database import SessionLocal
    from app.services.ai_provider import get_ai_settings

    db = SessionLocal()
    try:
        provider_name, api_key, model = get_ai_settings(db)
    finally:
        db.close()

    if not api_key:
        raise ValueError("No AI API key configured for vision OCR fallback")

    if img.mode != "RGB":
        img = img.convert("RGB")
    b64 = _image_to_base64(img, "JPEG")

    prompt = (
        "Extract ALL text from this document image. Return the raw text exactly as it appears, "
        "preserving layout and line breaks. Do not add any interpretation or commentary. "
        "If it's a form, include field labels and their values."
    )

    if provider_name == "openai":
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=model or "gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            }],
            temperature=0.0,
            max_tokens=4096,
        )
        return resp.choices[0].message.content or ""

    elif provider_name == "claude":
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=model or "claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
                    {"type": "text", "text": prompt},
                ],
            }],
            temperature=0.0,
        )
        return resp.content[0].text

    elif provider_name == "gemini":
        from google import genai

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=model or "gemini-2.0-flash",
            contents=[
                {"parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                ]},
            ],
        )
        return resp.text or ""

    raise ValueError(f"Provider {provider_name} not supported for vision OCR")


def extract_text_from_image(image_path: str | Path) -> str:
    """OCR a single image file."""
    img = Image.open(image_path)

    if _tesseract_available():
        return _ocr_with_tesseract(img)

    # Fallback to AI vision
    return _ocr_with_ai(img)


# ── PDF strategies ───────────────────────────────────────────────────────────

def _pdf_pdfplumber(pdf_path: str | Path) -> tuple[str, int]:
    """Extract embedded text with pdfplumber (no OCR, instant)."""
    import pdfplumber

    texts: list[str] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if text.strip():
                texts.append(f"--- Page {i + 1} ---\n{text.strip()}")

    return "\n\n".join(texts), page_count


def _pdf_pymupdf_ocr(pdf_path: str | Path) -> tuple[str, int]:
    """Render pages with PyMuPDF, OCR with Tesseract.
    Needs only Tesseract — NO poppler required.
    """
    import fitz
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()

    doc = fitz.open(str(pdf_path))
    page_count = len(doc)
    texts: list[str] = []

    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = pytesseract.image_to_string(img, lang="por+eng")
        texts.append(f"--- Page {i + 1} ---\n{text.strip()}")

    doc.close()
    return "\n\n".join(texts), page_count


def _pdf_pymupdf_ai(pdf_path: str | Path) -> tuple[str, int]:
    """Render pages with PyMuPDF, OCR with AI vision.
    No external binaries needed — only a configured AI API key.
    """
    import fitz

    doc = fitz.open(str(pdf_path))
    page_count = len(doc)
    texts: list[str] = []

    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=200)  # 200 DPI is enough for AI vision
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = _ocr_with_ai(img)
        texts.append(f"--- Page {i + 1} ---\n{text.strip()}")

    doc.close()
    return "\n\n".join(texts), page_count


def _pdf_pdf2image_ocr(pdf_path: str | Path) -> tuple[str, int]:
    """Legacy fallback: pdf2image (needs poppler) + Tesseract."""
    import pytesseract
    from pdf2image import convert_from_path

    pytesseract.pytesseract.tesseract_cmd = _get_tesseract_cmd()

    poppler_path = _get_poppler_path()
    kwargs = {}
    if poppler_path:
        kwargs["poppler_path"] = poppler_path

    images = convert_from_path(str(pdf_path), dpi=300, **kwargs)
    page_count = len(images)

    texts: list[str] = []
    for i, img in enumerate(images):
        text = pytesseract.image_to_string(img, lang="por+eng")
        texts.append(f"--- Page {i + 1} ---\n{text.strip()}")

    return "\n\n".join(texts), page_count


# ── Main entry points ────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str | Path) -> tuple[str, int]:
    """Extract text from a PDF using the best available strategy.

    1. pdfplumber  – fast, for digital/text-based PDFs
    2. PyMuPDF+Tesseract – for scanned PDFs (no poppler)
    3. PyMuPDF+AI vision – for scanned PDFs when Tesseract is absent
    4. pdf2image+Tesseract – legacy (needs poppler + Tesseract)
    """
    errors: list[str] = []

    # ── Strategy 1: pdfplumber (digital text) ────────────────────────────
    try:
        text, page_count = _pdf_pdfplumber(pdf_path)
        if text.strip() and len(text.strip()) > 50:
            return text, page_count
    except Exception as e:
        errors.append(f"pdfplumber: {e}")

    # ── Strategy 2: PyMuPDF + Tesseract ──────────────────────────────────
    if _tesseract_available():
        try:
            text, page_count = _pdf_pymupdf_ocr(pdf_path)
            if text.strip():
                return text, page_count
        except Exception as e:
            errors.append(f"PyMuPDF+Tesseract: {e}")

    # ── Strategy 3: PyMuPDF + AI vision ──────────────────────────────────
    try:
        text, page_count = _pdf_pymupdf_ai(pdf_path)
        if text.strip():
            return text, page_count
    except Exception as e:
        errors.append(f"PyMuPDF+AI-vision: {e}")

    # ── Strategy 4: pdf2image + Tesseract (legacy) ───────────────────────
    try:
        text, page_count = _pdf_pdf2image_ocr(pdf_path)
        if text.strip():
            return text, page_count
    except Exception as e:
        errors.append(f"pdf2image+Tesseract: {e}")

    # ── Last resort: return pdfplumber partial result ─────────────────────
    try:
        text, page_count = _pdf_pdfplumber(pdf_path)
        if text.strip():
            return text, page_count
    except Exception:
        pass

    raise ValueError(
        "Failed to extract text from PDF. Tried strategies:\n"
        + "\n".join(f"  - {e}" for e in errors)
        + "\n\nInstall Tesseract OCR or configure an AI provider with "
        "a vision-capable model in Settings."
    )


def extract_text(file_path: Path, file_type: str) -> tuple[str, int]:
    """Main entry point. Returns (text, page_count)."""
    if file_type == "pdf":
        return extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_image(file_path)
        return text, 1
