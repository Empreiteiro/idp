"""AI-powered field extraction from document text."""

from sqlalchemy.orm import Session

from app.services.ai_provider import get_provider, save_trace
from app.utils.constants import AI_TEXT_MAX_LENGTH
from app.utils.json_utils import parse_ai_json_response


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
    document_id: int | None = None,
    template_id: int | None = None,
    document_name: str | None = None,
) -> dict:
    """Extract fields from OCR text using AI."""
    provider = get_provider(db)

    fields_description = "\n".join(
        f"- {f['field_name']} ({f['field_type']}): {f['field_label']}"
        for f in fields
    )

    user_prompt = f"""Extract the following fields from this document:

Fields to extract:
{fields_description}

Document text:
{ocr_text[:AI_TEXT_MAX_LENGTH]}"""

    response_text, trace = await provider.complete(EXTRACTION_SYSTEM_PROMPT, user_prompt)

    # Save trace
    save_trace(db, trace, "extraction", document_id=document_id,
               template_id=template_id, entity_name=document_name)

    # Parse JSON from response
    data = parse_ai_json_response(response_text)

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
