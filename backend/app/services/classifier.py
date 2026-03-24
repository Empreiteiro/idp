"""AI-powered document classification into templates."""

import json
from sqlalchemy.orm import Session

from app.services.ai_provider import get_provider, save_trace


CLASSIFICATION_SYSTEM_PROMPT = """You are a document classification assistant.
Given a document text and a list of available document templates, classify the document into the most appropriate template.
Return ONLY valid JSON with no additional text.

Return format:
{
  "template_id": 1,
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}

If no template matches well (confidence < 0.5), return:
{
  "template_id": null,
  "confidence": 0.0,
  "reasoning": "Why no template matches",
  "suggested_type": "Suggested template name for this document type"
}"""


async def classify_document(
    db: Session,
    ocr_text: str,
    templates: list[dict],
    document_id: int | None = None,
    document_name: str | None = None,
) -> dict:
    """Classify a document into one of the available templates."""
    if not templates:
        return {
            "template_id": None,
            "confidence": 0.0,
            "reasoning": "No templates available for classification",
        }

    provider = get_provider(db)

    templates_desc = "\n".join(
        f"- ID {t['id']}: {t['name']} - {t.get('description', 'No description')} "
        f"(fields: {', '.join(t.get('field_names', []))})"
        for t in templates
    )

    user_prompt = f"""Classify this document into one of these templates:

Available templates:
{templates_desc}

Document text (first 4000 chars):
{ocr_text[:4000]}"""

    response_text, trace = await provider.complete(CLASSIFICATION_SYSTEM_PROMPT, user_prompt)

    # Save trace
    save_trace(db, trace, "classification", document_id=document_id,
               entity_name=document_name)

    data = _parse_json_response(response_text)

    return {
        "template_id": data.get("template_id"),
        "confidence": float(data.get("confidence", 0.0)),
        "reasoning": data.get("reasoning", ""),
        "suggested_type": data.get("suggested_type"),
    }


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
