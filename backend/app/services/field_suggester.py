"""AI-powered field suggestion for document templates."""

import json
from sqlalchemy.orm import Session

from app.services.ai_provider import get_provider, save_trace


SUGGESTION_SYSTEM_PROMPT = """You are a document analysis assistant.
Analyze the provided document text and suggest fields that can be extracted from documents of this type.
Return ONLY valid JSON with no additional text.

Return an array of field objects:
{
  "fields": [
    {
      "field_name": "snake_case_name",
      "field_label": "Human Readable Label",
      "field_type": "text",
      "required": true
    }
  ]
}

Available field_type values: text, number, date, currency, boolean
Suggest between 3 and 15 fields.
Focus on the most important and commonly extracted fields for this document type.
Use snake_case for field_name and descriptive labels for field_label.
Field names should be in English."""


async def suggest_fields(
    db: Session,
    ocr_text: str,
    template_id: int | None = None,
    template_name: str | None = None,
) -> list[dict]:
    """Analyze document text and suggest extractable fields."""
    provider = get_provider(db)

    user_prompt = f"""Analyze this document and suggest fields that can be extracted:

Document text:
{ocr_text[:8000]}"""

    response_text, trace = await provider.complete(SUGGESTION_SYSTEM_PROMPT, user_prompt)

    # Save trace
    save_trace(db, trace, "field_suggestion", template_id=template_id,
               entity_name=template_name)

    data = _parse_json_response(response_text)
    fields = data.get("fields", [])

    # Validate and normalize
    result = []
    for i, f in enumerate(fields):
        if not isinstance(f, dict):
            continue
        name = f.get("field_name", "").strip()
        if not name:
            continue

        result.append({
            "field_name": name,
            "field_label": f.get("field_label", name.replace("_", " ").title()),
            "field_type": f.get("field_type", "text") if f.get("field_type") in ("text", "number", "date", "currency", "boolean") else "text",
            "required": bool(f.get("required", False)),
            "sort_order": i,
        })

    return result


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return {}
