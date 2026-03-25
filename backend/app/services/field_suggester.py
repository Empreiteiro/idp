"""AI-powered field suggestion for document templates."""

from sqlalchemy.orm import Session

from app.services.ai_provider import get_provider, save_trace
from app.utils.constants import AI_TEXT_MAX_LENGTH
from app.utils.json_utils import parse_ai_json_response


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

Available field_type values: text, number, date, currency, boolean, table

When the document contains tabular data (multiple rows of the same structure, such as line items, lists of assets, income sources, etc.), suggest a field with field_type "table" and include a "columns" array defining the table structure.
Each column object has: name (snake_case), label (human-readable), type (text/number/date/currency/boolean).
Example of a table field:
{
  "field_name": "income_sources",
  "field_label": "Income Sources",
  "field_type": "table",
  "required": true,
  "columns": [
    {"name": "source_name", "label": "Source Name", "type": "text"},
    {"name": "amount", "label": "Amount", "type": "currency"}
  ]
}

Suggest between 3 and 15 fields.
Focus on the most important and commonly extracted fields for this document type.
Use snake_case for field_name and descriptive labels for field_label.
Field names should be in English."""


VALID_TYPES = {"text", "number", "date", "currency", "boolean", "table"}
VALID_COLUMN_TYPES = {"text", "number", "date", "currency", "boolean"}


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
{ocr_text[:AI_TEXT_MAX_LENGTH]}"""

    response_text, trace = await provider.complete(SUGGESTION_SYSTEM_PROMPT, user_prompt)

    # Save trace
    save_trace(db, trace, "field_suggestion", template_id=template_id,
               entity_name=template_name)

    data = parse_ai_json_response(response_text)
    fields = data.get("fields", [])

    # Validate and normalize
    result = []
    for i, f in enumerate(fields):
        if not isinstance(f, dict):
            continue
        name = f.get("field_name", "").strip()
        if not name:
            continue

        field_type = f.get("field_type", "text")
        if field_type not in VALID_TYPES:
            field_type = "text"

        entry = {
            "field_name": name,
            "field_label": f.get("field_label", name.replace("_", " ").title()),
            "field_type": field_type,
            "required": bool(f.get("required", False)),
            "sort_order": i,
        }

        # Include columns for table fields
        if field_type == "table" and isinstance(f.get("columns"), list):
            columns = []
            for col in f["columns"]:
                if isinstance(col, dict) and col.get("name"):
                    col_type = col.get("type", "text")
                    if col_type not in VALID_COLUMN_TYPES:
                        col_type = "text"
                    columns.append({
                        "name": col["name"],
                        "label": col.get("label", col["name"].replace("_", " ").title()),
                        "type": col_type,
                    })
            if columns:
                entry["columns"] = columns
            else:
                # Table without valid columns - skip it
                continue

        result.append(entry)

    return result
