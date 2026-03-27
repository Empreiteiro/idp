"""Multi-provider AI abstraction with full request tracing."""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from sqlalchemy.orm import Session
from app.models.settings import AppSettings


# ---------------------------------------------------------------------------
# Trace data container returned by every provider call
# ---------------------------------------------------------------------------
@dataclass
class LLMTrace:
    """Captures every detail of an LLM call for the tracing log."""
    provider: str = ""
    model: str = ""
    system_prompt: str = ""
    user_prompt: str = ""
    response_text: str = ""
    status: str = "success"          # success | error
    error_message: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: int | None = None
    estimated_cost: float | None = None


# ---------------------------------------------------------------------------
# Cost tables (USD per 1M tokens) – updated for common models
# ---------------------------------------------------------------------------
_COST_PER_1M: dict[str, tuple[float, float]] = {
    # OpenAI  (input, output)
    "gpt-4o-mini":    (0.15,  0.60),
    "gpt-4o":         (2.50, 10.00),
    "gpt-4.1-mini":   (0.40,  1.60),
    "gpt-4.1":        (2.00,  8.00),
    # Anthropic
    "claude-sonnet-4-20250514":  (3.00, 15.00),
    "claude-haiku-4-20250414":   (0.80,  4.00),
    "claude-opus-4-20250514":   (15.00, 75.00),
    # Gemini
    "gemini-2.0-flash":  (0.10, 0.40),
    "gemini-2.5-pro":    (1.25, 10.00),
    "gemini-2.5-flash":  (0.15, 0.60),
}


def _estimate_cost(model: str, prompt_tokens: int | None, completion_tokens: int | None) -> float | None:
    if prompt_tokens is None or completion_tokens is None:
        return None
    costs = _COST_PER_1M.get(model)
    if not costs:
        return None
    input_cost, output_cost = costs
    return round((prompt_tokens * input_cost + completion_tokens * output_cost) / 1_000_000, 6)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------
class AIProvider(ABC):
    provider_name: str = "unknown"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def complete(self, system: str, user: str, *, json_mode: bool = True) -> tuple[str, LLMTrace]:
        """Send a completion request. Returns (response_text, trace).

        Args:
            json_mode: When True, instruct the provider to return JSON.
                       When False, allow free-form text (e.g. Markdown).
        """
        ...


# ---------------------------------------------------------------------------
# OpenAI
# ---------------------------------------------------------------------------
class OpenAIProvider(AIProvider):
    provider_name = "openai"

    async def complete(self, system: str, user: str, *, json_mode: bool = True) -> tuple[str, LLMTrace]:
        from openai import OpenAI

        trace = LLMTrace(
            provider=self.provider_name,
            model=self.model or "gpt-4o-mini",
            system_prompt=system,
            user_prompt=user,
        )
        t0 = time.perf_counter()
        try:
            client = OpenAI(api_key=self.api_key)
            kwargs: dict = dict(
                model=trace.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.0,
            )
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            response = client.chat.completions.create(**kwargs)
            trace.latency_ms = int((time.perf_counter() - t0) * 1000)
            trace.response_text = response.choices[0].message.content or ""

            if response.usage:
                trace.prompt_tokens = response.usage.prompt_tokens
                trace.completion_tokens = response.usage.completion_tokens
                trace.total_tokens = response.usage.total_tokens

            trace.estimated_cost = _estimate_cost(trace.model, trace.prompt_tokens, trace.completion_tokens)
            return trace.response_text, trace

        except Exception as e:
            trace.latency_ms = int((time.perf_counter() - t0) * 1000)
            trace.status = "error"
            trace.error_message = str(e)
            raise


# ---------------------------------------------------------------------------
# Claude (Anthropic)
# ---------------------------------------------------------------------------
class ClaudeProvider(AIProvider):
    provider_name = "claude"

    async def complete(self, system: str, user: str, *, json_mode: bool = True) -> tuple[str, LLMTrace]:
        from anthropic import Anthropic

        trace = LLMTrace(
            provider=self.provider_name,
            model=self.model or "claude-sonnet-4-20250514",
            system_prompt=system,
            user_prompt=user,
        )
        t0 = time.perf_counter()
        try:
            client = Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model=trace.model,
                max_tokens=4096,
                system=system,
                messages=[{"role": "user", "content": user}],
                temperature=0.0,
            )
            trace.latency_ms = int((time.perf_counter() - t0) * 1000)
            trace.response_text = response.content[0].text

            if response.usage:
                trace.prompt_tokens = response.usage.input_tokens
                trace.completion_tokens = response.usage.output_tokens
                trace.total_tokens = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)

            trace.estimated_cost = _estimate_cost(trace.model, trace.prompt_tokens, trace.completion_tokens)
            return trace.response_text, trace

        except Exception as e:
            trace.latency_ms = int((time.perf_counter() - t0) * 1000)
            trace.status = "error"
            trace.error_message = str(e)
            raise


# ---------------------------------------------------------------------------
# Gemini (Google)
# ---------------------------------------------------------------------------
class GeminiProvider(AIProvider):
    provider_name = "gemini"

    async def complete(self, system: str, user: str, *, json_mode: bool = True) -> tuple[str, LLMTrace]:
        from google import genai

        trace = LLMTrace(
            provider=self.provider_name,
            model=self.model or "gemini-2.0-flash",
            system_prompt=system,
            user_prompt=user,
        )
        t0 = time.perf_counter()
        try:
            client = genai.Client(api_key=self.api_key)
            gen_config: dict = {"temperature": 0.0}
            if json_mode:
                gen_config["response_mime_type"] = "application/json"
            response = client.models.generate_content(
                model=trace.model,
                contents=f"{system}\n\n{user}",
                config=genai.types.GenerateContentConfig(**gen_config),
            )
            trace.latency_ms = int((time.perf_counter() - t0) * 1000)
            trace.response_text = response.text or ""

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                meta = response.usage_metadata
                trace.prompt_tokens = getattr(meta, "prompt_token_count", None)
                trace.completion_tokens = getattr(meta, "candidates_token_count", None)
                trace.total_tokens = getattr(meta, "total_token_count", None)

            trace.estimated_cost = _estimate_cost(trace.model, trace.prompt_tokens, trace.completion_tokens)
            return trace.response_text, trace

        except Exception as e:
            trace.latency_ms = int((time.perf_counter() - t0) * 1000)
            trace.status = "error"
            trace.error_message = str(e)
            raise


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_ai_settings(db: Session) -> tuple[str, str, str]:
    """Get AI settings from the default provider config, fallback to legacy settings & env."""
    from app.config import settings as env_settings
    from app.utils.encryption import decrypt_value
    from app.models.settings import ProviderConfig

    # Try new ProviderConfig table first
    default_provider = db.query(ProviderConfig).filter(
        ProviderConfig.kind == "ai",
        ProviderConfig.is_default == True,
        ProviderConfig.is_active == True,
    ).first()

    if default_provider and default_provider.api_key:
        api_key = decrypt_value(default_provider.api_key)
        if api_key:
            return default_provider.provider_name, api_key, default_provider.model

    # Fallback to legacy AppSettings / env
    rows = {r.key: r.value for r in db.query(AppSettings).all()}
    provider = rows.get("ai_provider") or env_settings.ai_provider
    api_key = rows.get("ai_api_key") or env_settings.ai_api_key
    model = rows.get("ai_model") or env_settings.ai_model

    if api_key:
        api_key = decrypt_value(api_key)

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


def save_trace(db: Session, trace: LLMTrace, request_type: str,
               document_id: int | None = None, template_id: int | None = None,
               entity_name: str | None = None) -> None:
    """Persist a trace to the llm_logs table."""
    from app.models.llm_log import LLMLog

    log = LLMLog(
        request_type=request_type,
        provider=trace.provider,
        model=trace.model,
        document_id=document_id,
        template_id=template_id,
        entity_name=entity_name,
        system_prompt=trace.system_prompt,
        user_prompt=trace.user_prompt,
        response_text=trace.response_text,
        status=trace.status,
        error_message=trace.error_message,
        prompt_tokens=trace.prompt_tokens,
        completion_tokens=trace.completion_tokens,
        total_tokens=trace.total_tokens,
        latency_ms=trace.latency_ms,
        estimated_cost=trace.estimated_cost,
    )
    db.add(log)
    db.commit()
