"""AI-powered field extraction from document text."""

import json
from sqlalchemy.orm import Session

from app.services.ai_provider import get_provider


EXTRACTION_SYSTEM_PROMPT = """You are a document processing assistant that extracts structured data from OCR text.
You must return ONLY valid JSON with no additional text or explanation.
Extract the requested fields from the document text.
For each field, provide the extracted value and a confidence score from 0.0 to 1.0.
If a field cannot be found, set the value to null and confidence to 0.0.

Return format:
{
  "field_name": {
    "value": "extracted value or null",
    "confidence": 0.95
  }
}"""


async def extract_fields(
    db: Session,
    ocr_text: str,
    fields: list[dict],
) -> dict:
    """Extract fields from OCR text using AI.

    Args:
        db: Database session (for getting AI settings)
        ocr_text: The raw OCR text from the document
        fields: List of dicts with keys: field_name, field_label, field_type

    Returns:
        Dict with field_name -> {value, confidence, original_value, corrected}
    """
    provider = get_provider(db)

    fields_description = "\n".join(
        f"- {f['field_name']} ({f['field_type']}): {f['field_label']}"
        for f in fields
    )

    user_prompt = f"""Extract the following fields from this document:

Fields to extract:
{fields_description}

Document text:
{ocr_text[:8000]}"""

    response_text = await provider.complete(EXTRACTION_SYSTEM_PROMPT, user_prompt)

    # Parse JSON from response
    data = _parse_json_response(response_text)

    # Normalize the result
    result = {}
    for field in fields:
        name = field["field_name"]
        if name in data and isinstance(data[name], dict):
            value = data[name].get("value")
            confidence = float(data[name].get("confidence", 0.0))
        elif name in data:
            value = data[name]
            confidence = 0.8
        else:
            value = None
            confidence = 0.0

        result[name] = {
            "value": value,
            "confidence": confidence,
            "original_value": value,
            "corrected": False,
        }

    return result


def _parse_json_response(text: str) -> dict:
    """Try to parse JSON from AI response, handling markdown code blocks."""
    text = text.strip()

    # Remove markdown code blocks if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return {}
