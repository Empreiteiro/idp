"""AI-powered section suggestion for insight templates."""

import logging

from sqlalchemy.orm import Session

from app.services.ai_provider import get_provider, save_trace
from app.utils.constants import AI_TEXT_MAX_LENGTH
from app.utils.json_utils import parse_ai_json_response

logger = logging.getLogger("idp.insights")

SUGGESTION_SYSTEM_PROMPT = """You are an expert document analyst.
Analyze the provided template information (field definitions and example document text) and suggest sections for an analytical insight report.

Return ONLY valid JSON with no additional text.

Return an array of section objects:
{
  "sections": [
    {
      "title": "Section Title",
      "description": "What this section should analyze and cover",
      "prompt_hint": "Specific guidance for generating this section content"
    }
  ]
}

Suggest between 3 and 10 sections.
Each section should focus on a specific analytical aspect of the extracted data.
Think about what insights, patterns, anomalies, and summaries would be valuable.
Consider comparisons, validations, risk assessments, and actionable recommendations.
Section titles should be clear and professional."""


async def suggest_sections(
    db: Session,
    insight_template_id: int,
    template_name: str,
    fields_description: str,
    ocr_text: str | None = None,
) -> list[dict]:
    """Analyze template fields and suggest insight report sections."""
    provider = get_provider(db)

    user_prompt = f"""Template: {template_name}

Fields available for analysis:
{fields_description}"""

    if ocr_text:
        user_prompt += f"""

Example document text (for context):
{ocr_text[:AI_TEXT_MAX_LENGTH]}"""

    user_prompt += """

Based on the document type and available fields, suggest sections for an analytical insight report.
Each section should provide meaningful analysis of the extracted data."""

    logger.info("Suggesting insight sections for template '%s'", template_name)

    response_text, trace = await provider.complete(SUGGESTION_SYSTEM_PROMPT, user_prompt)

    save_trace(
        db, trace, "insight_suggestion",
        template_id=insight_template_id,
        entity_name=f"Insight sections for {template_name}",
    )

    data = parse_ai_json_response(response_text)
    sections = data.get("sections", [])

    result = []
    for i, s in enumerate(sections):
        if not isinstance(s, dict):
            continue
        title = s.get("title", "").strip()
        if not title:
            continue
        result.append({
            "title": title,
            "description": s.get("description", ""),
            "prompt_hint": s.get("prompt_hint", ""),
            "sort_order": i,
        })

    logger.info("Suggested %d sections for template '%s'", len(result), template_name)
    return result
