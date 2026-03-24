"""Multi-provider AI abstraction for document processing."""

import json
from abc import ABC, abstractmethod

from sqlalchemy.orm import Session
from app.models.settings import AppSettings


class AIProvider(ABC):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def complete(self, system: str, user: str) -> str:
        """Send a completion request and return the response text."""
        ...


class OpenAIProvider(AIProvider):
    async def complete(self, system: str, user: str) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model=self.model or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or ""


class ClaudeProvider(AIProvider):
    async def complete(self, system: str, user: str) -> str:
        from anthropic import Anthropic
        client = Anthropic(api_key=self.api_key)
        response = client.messages.create(
            model=self.model or "claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user}],
            temperature=0.0,
        )
        return response.content[0].text


class GeminiProvider(AIProvider):
    async def complete(self, system: str, user: str) -> str:
        from google import genai
        client = genai.Client(api_key=self.api_key)
        response = client.models.generate_content(
            model=self.model or "gemini-2.0-flash",
            contents=f"{system}\n\n{user}",
            config=genai.types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
            ),
        )
        return response.text or ""


def get_ai_settings(db: Session) -> tuple[str, str, str]:
    """Get AI settings from database, fallback to env."""
    from app.config import settings as env_settings

    rows = {r.key: r.value for r in db.query(AppSettings).all()}
    provider = rows.get("ai_provider") or env_settings.ai_provider
    api_key = rows.get("ai_api_key") or env_settings.ai_api_key
    model = rows.get("ai_model") or env_settings.ai_model

    return provider, api_key, model


def get_provider(db: Session) -> AIProvider:
    """Factory: create the right AI provider based on settings."""
    provider_name, api_key, model = get_ai_settings(db)

    if not api_key:
        raise ValueError(
            "No AI API key configured. Set it in Settings page or .env file."
        )

    providers = {
        "openai": OpenAIProvider,
        "claude": ClaudeProvider,
        "gemini": GeminiProvider,
    }

    provider_cls = providers.get(provider_name.lower())
    if not provider_cls:
        raise ValueError(f"Unknown AI provider: {provider_name}. Use: openai, claude, or gemini")

    return provider_cls(api_key=api_key, model=model)
