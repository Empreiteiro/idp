from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.settings import AppSettings
from app.schemas.responses import SuccessResponse
from app.core.rate_limit import limiter
from app.utils.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/api/settings", tags=["settings"])

ALLOWED_KEYS = {"ai_provider", "ai_api_key", "ai_model", "tesseract_path", "poppler_path", "ocr_provider", "mistral_api_key"}


@router.post("/test-ai")
@limiter.limit("5/minute")
async def test_ai_connection(request: Request, db: Session = Depends(get_db)):
    """Test the AI provider connection with a simple request."""
    try:
        from app.services.ai_provider import get_provider, save_trace
        provider = get_provider(db)
        response_text, trace = await provider.complete(
            "You are a helpful assistant. Reply with exactly: CONNECTION_OK",
            "Test connection. Reply with exactly: CONNECTION_OK",
            json_mode=False,
        )
        save_trace(db, trace, "connection_test")
        if "CONNECTION_OK" in response_text:
            return {"status": "ok", "message": "AI connection successful", "response": response_text.strip()[:100]}
        return {"status": "ok", "message": "AI responded but unexpected format", "response": response_text.strip()[:100]}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/test-ocr")
@limiter.limit("5/minute")
def test_ocr_connection(request: Request, db: Session = Depends(get_db)):
    """Test if Tesseract OCR is accessible."""
    try:
        import pytesseract
        from app.models.settings import AppSettings

        tesseract_path = ""
        row = db.query(AppSettings).filter(AppSettings.key == "tesseract_path").first()
        if row and row.value:
            tesseract_path = row.value

        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path

        version = pytesseract.get_tesseract_version()
        return {"status": "ok", "message": f"Tesseract v{version} found"}
    except Exception as e:
        return {"status": "error", "message": f"Tesseract not found: {str(e)}"}


@router.post("/test-mistral-ocr")
@limiter.limit("5/minute")
def test_mistral_ocr(request: Request, db: Session = Depends(get_db)):
    """Test if Mistral OCR API is accessible."""
    try:
        from mistralai import Mistral

        row = db.query(AppSettings).filter(AppSettings.key == "mistral_api_key").first()
        if not row or not row.value:
            return {"status": "error", "message": "Mistral API key not configured"}

        api_key = decrypt_value(row.value)
        client = Mistral(api_key=api_key)

        # List models to verify API key works
        models = client.models.list()
        ocr_models = [m.id for m in models.data if "ocr" in m.id.lower()] if models.data else []

        if ocr_models:
            return {"status": "ok", "message": f"Mistral OCR connected. Available models: {', '.join(ocr_models)}"}
        return {"status": "ok", "message": "Mistral API connected (OCR model available via mistral-ocr-latest)"}
    except ImportError:
        return {"status": "error", "message": "mistralai package not installed. Run: pip install mistralai"}
    except Exception as e:
        return {"status": "error", "message": f"Mistral connection failed: {str(e)}"}


@router.get("/validate-deps")
def validate_deps():
    """Validate that all required packages for document extraction are installed."""
    from app.services.deps_validator import validate_dependencies
    from dataclasses import asdict

    result = validate_dependencies()
    return asdict(result)


@router.get("/system-info")
def get_system_info(db: Session = Depends(get_db)):
    """Get system information about available tools."""
    info = {
        "pdfplumber": False,
        "pymupdf": False,
        "pytesseract": False,
        "tesseract_bin": False,
        "pdf2image": False,
        "openai": False,
        "anthropic": False,
        "google_genai": False,
        "mistralai": False,
    }

    try:
        import pdfplumber
        info["pdfplumber"] = True
    except ImportError:
        pass

    try:
        import fitz
        info["pymupdf"] = True
    except ImportError:
        pass

    try:
        import pytesseract
        info["pytesseract"] = True
        try:
            pytesseract.get_tesseract_version()
            info["tesseract_bin"] = True
        except Exception:
            pass
    except ImportError:
        pass

    try:
        import pdf2image
        info["pdf2image"] = True
    except ImportError:
        pass

    try:
        import openai
        info["openai"] = True
    except ImportError:
        pass

    try:
        import anthropic
        info["anthropic"] = True
    except ImportError:
        pass

    try:
        import google.genai
        info["google_genai"] = True
    except ImportError:
        pass

    try:
        import mistralai
        info["mistralai"] = True
    except ImportError:
        pass

    return {"libraries": info}


class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingsResponse(BaseModel):
    settings: dict[str, str]


def _get_all_settings(db: Session) -> dict[str, str]:
    rows = db.query(AppSettings).all()
    result = {}
    for r in rows:
        val = r.value
        if r.key in ("ai_api_key", "mistral_api_key"):
            val = decrypt_value(val)
            if len(val) > 8:
                val = val[:4] + "..." + val[-4:]
        result[r.key] = val
    return result


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return SettingsResponse(settings=_get_all_settings(db))


@router.put("", response_model=SuccessResponse)
def update_setting(data: SettingUpdate, db: Session = Depends(get_db)):
    if data.key not in ALLOWED_KEYS:
        raise HTTPException(400, f"Unknown setting: {data.key}")

    value = encrypt_value(data.value) if data.key in ("ai_api_key", "mistral_api_key") else data.value

    setting = db.query(AppSettings).filter(AppSettings.key == data.key).first()
    if setting:
        setting.value = value
    else:
        setting = AppSettings(key=data.key, value=value)
        db.add(setting)
    db.commit()
    return SuccessResponse(message=f"Setting '{data.key}' updated")


@router.put("/bulk", response_model=SuccessResponse)
def update_settings_bulk(settings: dict[str, str], db: Session = Depends(get_db)):
    updated = []
    for key, value in settings.items():
        if key not in ALLOWED_KEYS:
            continue
        store_value = encrypt_value(value) if key in ("ai_api_key", "mistral_api_key") else value
        setting = db.query(AppSettings).filter(AppSettings.key == key).first()
        if setting:
            setting.value = store_value
        else:
            setting = AppSettings(key=key, value=store_value)
            db.add(setting)
        updated.append(key)
    db.commit()
    return SuccessResponse(message=f"Updated {len(updated)} setting(s)")
