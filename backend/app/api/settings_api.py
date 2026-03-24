from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.settings import AppSettings

router = APIRouter(prefix="/api/settings", tags=["settings"])

ALLOWED_KEYS = {"ai_provider", "ai_api_key", "ai_model", "tesseract_path", "poppler_path"}


@router.post("/test-ai")
async def test_ai_connection(db: Session = Depends(get_db)):
    """Test the AI provider connection with a simple request."""
    try:
        from app.services.ai_provider import get_provider
        provider = get_provider(db)
        response = await provider.complete(
            "You are a helpful assistant. Reply with exactly: CONNECTION_OK",
            "Test connection. Reply with exactly: CONNECTION_OK"
        )
        if "CONNECTION_OK" in response:
            return {"status": "ok", "message": "AI connection successful", "response": response.strip()[:100]}
        return {"status": "ok", "message": "AI responded but unexpected format", "response": response.strip()[:100]}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/test-ocr")
def test_ocr_connection(db: Session = Depends(get_db)):
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


@router.get("/system-info")
def get_system_info(db: Session = Depends(get_db)):
    """Get system information about available tools."""
    info = {
        "pdfplumber": False,
        "pytesseract": False,
        "pdf2image": False,
        "openai": False,
        "anthropic": False,
        "google_genai": False,
    }

    try:
        import pdfplumber
        info["pdfplumber"] = True
    except ImportError:
        pass

    try:
        import pytesseract
        info["pytesseract"] = True
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
        if r.key == "ai_api_key" and len(val) > 8:
            val = val[:4] + "..." + val[-4:]
        result[r.key] = val
    return result


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return SettingsResponse(settings=_get_all_settings(db))


@router.put("")
def update_setting(data: SettingUpdate, db: Session = Depends(get_db)):
    if data.key not in ALLOWED_KEYS:
        return {"error": f"Unknown setting: {data.key}"}

    setting = db.query(AppSettings).filter(AppSettings.key == data.key).first()
    if setting:
        setting.value = data.value
    else:
        setting = AppSettings(key=data.key, value=data.value)
        db.add(setting)
    db.commit()
    return {"ok": True}


@router.put("/bulk")
def update_settings_bulk(settings: dict[str, str], db: Session = Depends(get_db)):
    for key, value in settings.items():
        if key not in ALLOWED_KEYS:
            continue
        setting = db.query(AppSettings).filter(AppSettings.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = AppSettings(key=key, value=value)
            db.add(setting)
    db.commit()
    return {"ok": True}
