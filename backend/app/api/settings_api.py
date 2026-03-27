"""Settings & Provider configuration API routes."""

import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.settings import AppSettings, ProviderConfig
from app.schemas.responses import SuccessResponse
from app.core.rate_limit import limiter
from app.utils.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/api/settings", tags=["settings"])

ALLOWED_KEYS = {"ai_provider", "ai_api_key", "ai_model", "tesseract_path", "poppler_path", "ocr_provider", "mistral_api_key"}

# ---------------------------------------------------------------------------
# Provider models / constants
# ---------------------------------------------------------------------------

PROVIDER_MODELS: dict[str, list[str]] = {
    "openai": ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    "claude": ["claude-sonnet-4-20250514", "claude-haiku-4-20250414", "claude-opus-4-20250514"],
    "gemini": ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
}

DEFAULT_PROVIDERS = [
    # AI providers
    {"kind": "ai", "provider_name": "openai", "display_name": "OpenAI (GPT)", "model": "gpt-4o-mini", "is_default": True},
    {"kind": "ai", "provider_name": "claude", "display_name": "Anthropic (Claude)", "model": "claude-sonnet-4-20250514", "is_default": False},
    {"kind": "ai", "provider_name": "gemini", "display_name": "Google (Gemini)", "model": "gemini-2.0-flash", "is_default": False},
    # OCR providers (Tesseract is a system dependency — managed in /dependencies)
    {"kind": "ocr", "provider_name": "mistral", "display_name": "Mistral OCR", "model": "mistral-ocr-latest", "is_default": True},
]


class ProviderCreate(BaseModel):
    kind: str  # "ai" or "ocr"
    provider_name: str
    display_name: str = ""
    api_key: str = ""
    model: str = ""
    is_default: bool = False
    extra_config: dict = {}


class ProviderUpdate(BaseModel):
    display_name: str | None = None
    api_key: str | None = None
    model: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None
    extra_config: dict | None = None


def _seed_providers(db: Session):
    """Insert default providers if the table is empty."""
    count = db.query(ProviderConfig).count()
    if count > 0:
        return
    for p in DEFAULT_PROVIDERS:
        provider = ProviderConfig(
            kind=p["kind"],
            provider_name=p["provider_name"],
            display_name=p["display_name"],
            model=p["model"],
            is_default=p["is_default"],
            api_key="",
            extra_config="{}",
        )
        db.add(provider)
    db.commit()


def _provider_to_dict(p: ProviderConfig) -> dict:
    """Serialize a ProviderConfig row, masking the API key."""
    api_key_display = ""
    if p.api_key:
        raw = decrypt_value(p.api_key)
        if raw and len(raw) > 8:
            api_key_display = raw[:4] + "..." + raw[-4:]
        elif raw:
            api_key_display = "***"

    return {
        "id": p.id,
        "kind": p.kind,
        "provider_name": p.provider_name,
        "display_name": p.display_name,
        "api_key": api_key_display,
        "has_key": bool(p.api_key and decrypt_value(p.api_key)),
        "model": p.model,
        "is_default": p.is_default,
        "is_active": p.is_active,
        "extra_config": json.loads(p.extra_config) if p.extra_config else {},
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ---------------------------------------------------------------------------
# Provider CRUD
# ---------------------------------------------------------------------------

@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    """List all configured providers (AI + OCR). Seeds defaults on first call."""
    _seed_providers(db)
    providers = db.query(ProviderConfig).order_by(ProviderConfig.kind, ProviderConfig.is_default.desc(), ProviderConfig.provider_name).all()
    return {
        "providers": [_provider_to_dict(p) for p in providers],
        "available_models": PROVIDER_MODELS,
    }


@router.post("/providers")
def create_provider(body: ProviderCreate, db: Session = Depends(get_db)):
    """Create a new provider configuration."""
    existing = db.query(ProviderConfig).filter(
        ProviderConfig.kind == body.kind,
        ProviderConfig.provider_name == body.provider_name,
    ).first()
    if existing:
        raise HTTPException(409, f"Provider '{body.provider_name}' already exists for kind '{body.kind}'")

    api_key = encrypt_value(body.api_key) if body.api_key else ""

    if body.is_default:
        db.query(ProviderConfig).filter(
            ProviderConfig.kind == body.kind,
            ProviderConfig.is_default == True,
        ).update({"is_default": False})

    provider = ProviderConfig(
        kind=body.kind,
        provider_name=body.provider_name,
        display_name=body.display_name or body.provider_name,
        api_key=api_key,
        model=body.model,
        is_default=body.is_default,
        extra_config=json.dumps(body.extra_config),
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return _provider_to_dict(provider)


@router.put("/providers/{provider_id}")
def update_provider(provider_id: int, body: ProviderUpdate, db: Session = Depends(get_db)):
    """Update a provider configuration."""
    provider = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider not found")

    if body.display_name is not None:
        provider.display_name = body.display_name
    if body.api_key is not None:
        provider.api_key = encrypt_value(body.api_key) if body.api_key else ""
    if body.model is not None:
        provider.model = body.model
    if body.is_active is not None:
        provider.is_active = body.is_active
    if body.extra_config is not None:
        provider.extra_config = json.dumps(body.extra_config)

    if body.is_default is True:
        # Unset previous default of the same kind
        db.query(ProviderConfig).filter(
            ProviderConfig.kind == provider.kind,
            ProviderConfig.id != provider.id,
            ProviderConfig.is_default == True,
        ).update({"is_default": False})
        provider.is_default = True

    db.commit()
    db.refresh(provider)
    return _provider_to_dict(provider)


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    """Delete a provider (cannot delete the default)."""
    provider = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider not found")
    if provider.is_default:
        raise HTTPException(400, "Cannot delete the default provider. Set another as default first.")
    db.delete(provider)
    db.commit()
    return SuccessResponse(message=f"Provider '{provider.display_name}' deleted")


@router.post("/providers/{provider_id}/set-default")
def set_default_provider(provider_id: int, db: Session = Depends(get_db)):
    """Set a provider as the default for its kind."""
    provider = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider not found")

    db.query(ProviderConfig).filter(
        ProviderConfig.kind == provider.kind,
        ProviderConfig.is_default == True,
    ).update({"is_default": False})

    provider.is_default = True
    db.commit()
    return SuccessResponse(message=f"'{provider.display_name}' is now the default {provider.kind} provider")


@router.post("/providers/{provider_id}/test")
@limiter.limit("5/minute")
async def test_provider(provider_id: int, request: Request, db: Session = Depends(get_db)):
    """Test a provider connection."""
    provider = db.query(ProviderConfig).filter(ProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(404, "Provider not found")

    raw_key = decrypt_value(provider.api_key) if provider.api_key else ""

    if provider.kind == "ai":
        return await _test_ai_provider(provider.provider_name, raw_key, provider.model)
    elif provider.kind == "ocr":
        return _test_ocr_provider(provider.provider_name, raw_key, provider.extra_config, db)
    else:
        raise HTTPException(400, f"Unknown provider kind: {provider.kind}")


async def _test_ai_provider(provider_name: str, api_key: str, model: str) -> dict:
    """Test an AI provider connection."""
    if not api_key:
        return {"status": "error", "message": "API key not configured"}
    try:
        from app.services.ai_provider import OpenAIProvider, ClaudeProvider, GeminiProvider

        providers = {"openai": OpenAIProvider, "claude": ClaudeProvider, "gemini": GeminiProvider}
        cls = providers.get(provider_name)
        if not cls:
            return {"status": "error", "message": f"Unknown AI provider: {provider_name}"}

        instance = cls(api_key=api_key, model=model)
        response_text, _trace = await instance.complete(
            "You are a helpful assistant. Reply with exactly: CONNECTION_OK",
            "Test connection. Reply with exactly: CONNECTION_OK",
            json_mode=False,
        )
        if "CONNECTION_OK" in response_text:
            return {"status": "ok", "message": f"{provider_name} connection successful"}
        return {"status": "ok", "message": f"{provider_name} responded (unexpected format)", "response": response_text[:100]}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def _test_ocr_provider(provider_name: str, api_key: str, extra_config_json: str, db: Session) -> dict:
    """Test an OCR provider connection."""
    if provider_name == "mistral":
        if not api_key:
            return {"status": "error", "message": "Mistral API key not configured"}
        try:
            from mistralai import Mistral
            client = Mistral(api_key=api_key)
            models = client.models.list()
            ocr_models = [m.id for m in models.data if "ocr" in m.id.lower()] if models.data else []
            if ocr_models:
                return {"status": "ok", "message": f"Mistral OCR connected. Models: {', '.join(ocr_models)}"}
            return {"status": "ok", "message": "Mistral API connected (OCR via mistral-ocr-latest)"}
        except ImportError:
            return {"status": "error", "message": "mistralai package not installed. Run: pip install mistralai"}
        except Exception as e:
            return {"status": "error", "message": f"Mistral connection failed: {str(e)}"}

    return {"status": "error", "message": f"Unknown OCR provider: {provider_name}"}


# ---------------------------------------------------------------------------
# Legacy global settings (kept for backward compatibility)
# ---------------------------------------------------------------------------

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
