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


MULTI_DOC_SYSTEM_PROMPT = """You are a document analysis assistant.
You are given text extracted from MULTIPLE example documents of the same type.
Your job is to:
1. Analyze ALL documents to identify every extractable field across all examples.
2. Compare the documents and note structural differences (e.g., fields that appear in some documents but not others).
3. Suggest a unified set of fields that covers ALL the document variations.
4. Mark fields that appear in ALL documents as "required": true.
5. Mark fields that appear in ONLY SOME documents as "required": false.

Return ONLY valid JSON with no additional text.

Return:
{
  "fields": [
    {
      "field_name": "snake_case_name",
      "field_label": "Human Readable Label",
      "field_type": "text",
      "required": true
    }
  ],
  "analysis": {
    "total_documents": 2,
    "differences": ["Document 2 has an additional 'discount' field", "Document 1 uses 'client_name' while Document 2 uses 'customer_name' — unified as 'client_name'"]
  }
}

Available field_type values: text, number, date, currency, boolean, table

When documents contain tabular data, suggest a field with field_type "table" and include a "columns" array.
Each column object has: name (snake_case), label (human-readable), type (text/number/date/currency/boolean).

Suggest between 3 and 20 fields (more documents may reveal more fields).
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
    """Analyze a single document text and suggest extractable fields."""
    provider = get_provider(db)

    user_prompt = f"""Analyze this document and suggest fields that can be extracted:

Document text:
{ocr_text[:AI_TEXT_MAX_LENGTH]}"""

    response_text, trace = await provider.complete(SUGGESTION_SYSTEM_PROMPT, user_prompt)

    save_trace(db, trace, "field_suggestion", template_id=template_id,
               entity_name=template_name)

    data = parse_ai_json_response(response_text)
    fields = data.get("fields", [])

    return _normalize_fields(fields)


async def suggest_fields_multi(
    db: Session,
    ocr_texts: list[str],
    template_id: int | None = None,
    template_name: str | None = None,
) -> list[dict]:
    """Analyze multiple document texts, compare differences, and suggest unified fields."""
    provider = get_provider(db)

    # Build the user prompt with all documents
    per_doc_limit = AI_TEXT_MAX_LENGTH // len(ocr_texts) if ocr_texts else AI_TEXT_MAX_LENGTH
    doc_sections = []
    for i, text in enumerate(ocr_texts, 1):
        doc_sections.append(f"--- DOCUMENT {i} ---\n{text[:per_doc_limit]}")

    all_docs_text = "\n\n".join(doc_sections)

    user_prompt = f"""Analyze these {len(ocr_texts)} example documents of the same type.
Identify all extractable fields across all documents and note any differences between them.

{all_docs_text}"""

    response_text, trace = await provider.complete(MULTI_DOC_SYSTEM_PROMPT, user_prompt)

    save_trace(db, trace, "field_suggestion", template_id=template_id,
               entity_name=template_name)

    data = parse_ai_json_response(response_text)
    fields = data.get("fields", [])

    return _normalize_fields(fields)


def _normalize_fields(fields: list) -> list[dict]:
    """Validate and normalize field suggestions from AI."""
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
