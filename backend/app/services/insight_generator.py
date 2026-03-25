"""AI-powered document insight generation."""

import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.insight import InsightTemplate, DocumentInsight, document_insight_documents
from app.models.document import Document
from app.models.extraction import ExtractionResult
from app.services.ai_provider import get_provider, save_trace
from app.api.activity import log_activity

logger = logging.getLogger("idp.insights")


def _build_system_prompt(insight_template: InsightTemplate) -> str:
    """Build the system prompt from the insight template and its sections."""
    template_name = insight_template.template.name if insight_template.template else "Unknown"

    sections_text = ""
    for section in insight_template.sections:
        sections_text += f"\n## {section.title}\n"
        if section.description:
            sections_text += f"Focus: {section.description}\n"
        if section.prompt_hint:
            sections_text += f"Guidance: {section.prompt_hint}\n"

    prompt = f"""You are an expert document analyst. You will receive structured data extracted from "{template_name}" document(s).

Generate a comprehensive analytical report with the following sections:
{sections_text}

{insight_template.system_prompt or ''}

Output format: Markdown with clear section headers (## Section Title).
Include data-driven observations, anomalies, comparisons, and actionable insights.
At the beginning, provide a brief executive summary (## Executive Summary) of the key findings.
Be thorough, precise, and reference specific data points from the extracted fields."""

    return prompt


def _build_user_prompt(
    documents: list[Document],
    extractions: dict[int, dict],
    fields_info: list[dict],
    analysis_mode: str,
    custom_instructions: str | None = None,
) -> str:
    """Build the user prompt with document extracted data."""
    prompt_parts = []

    for doc in documents:
        extraction_data = extractions.get(doc.id, {})
        prompt_parts.append(f"=== Document: {doc.filename} ===")
        prompt_parts.append(f"Template: {doc.template.name if doc.template else 'Unknown'}")
        prompt_parts.append("Extracted Fields:")

        for field_info in fields_info:
            field_name = field_info["field_name"]
            field_label = field_info["field_label"]
            field_data = extraction_data.get(field_name, {})

            if isinstance(field_data, dict):
                value = field_data.get("value", "N/A")
                confidence = field_data.get("confidence", 0)
                prompt_parts.append(f"  {field_label}: {value} (confidence: {confidence:.0%})")
            else:
                prompt_parts.append(f"  {field_label}: {field_data}")

        prompt_parts.append("")

    if analysis_mode == "consolidated" and len(documents) > 1:
        prompt_parts.append(f"ANALYSIS MODE: Consolidated analysis across all {len(documents)} documents.")
        prompt_parts.append("Compare, correlate, and identify patterns across all documents.")
    else:
        prompt_parts.append("ANALYSIS MODE: Individual document analysis.")

    if custom_instructions:
        prompt_parts.append(f"\nAdditional instructions: {custom_instructions}")

    prompt_parts.append("\nGenerate the analytical insight report.")

    return "\n".join(prompt_parts)


async def generate_insights(
    db: Session,
    insight_template_id: int,
    document_ids: list[int],
    analysis_mode: str,
    custom_instructions: str | None = None,
) -> list[DocumentInsight]:
    """Generate insight reports for the given documents.

    Returns a list of DocumentInsight objects (1 for consolidated, N for individual).
    """
    # Load insight template with sections
    insight_template = (
        db.query(InsightTemplate)
        .filter(InsightTemplate.id == insight_template_id)
        .first()
    )
    if not insight_template:
        raise ValueError(f"Insight template {insight_template_id} not found")

    if not insight_template.template:
        raise ValueError("Insight template has no linked document template")

    # Load documents with extractions
    documents = db.query(Document).filter(Document.id.in_(document_ids)).all()
    if not documents:
        raise ValueError("No documents found for the given IDs")

    found_ids = {d.id for d in documents}
    missing = set(document_ids) - found_ids
    if missing:
        raise ValueError(f"Documents not found: {missing}")

    # Load extraction data
    extractions: dict[int, dict] = {}
    for doc in documents:
        ext = db.query(ExtractionResult).filter(ExtractionResult.document_id == doc.id).first()
        if not ext:
            raise ValueError(f"Document '{doc.filename}' (ID {doc.id}) has no extraction results. Process it first.")
        data = ext.extracted_data
        if isinstance(data, str):
            data = json.loads(data)
        extractions[doc.id] = data

    # Build fields info from the linked template
    fields_info = []
    for f in insight_template.template.fields:
        fields_info.append({
            "field_name": f.field_name,
            "field_label": f.field_label,
            "field_type": f.field_type,
        })

    # Get AI provider
    provider = get_provider(db)
    system_prompt = _build_system_prompt(insight_template)

    results: list[DocumentInsight] = []
    total_tokens = 0
    total_cost = 0.0
    total_latency = 0

    if analysis_mode == "consolidated":
        # One report for all documents
        doc_groups = [documents]
    else:
        # One report per document
        doc_groups = [[doc] for doc in documents]

    for doc_group in doc_groups:
        doc_names = ", ".join(d.filename for d in doc_group)
        if analysis_mode == "consolidated":
            title = f"Consolidated Analysis — {insight_template.name} ({len(doc_group)} docs)"
        else:
            title = f"Analysis — {doc_group[0].filename}"

        # Create the insight record
        insight = DocumentInsight(
            insight_template_id=insight_template.id,
            analysis_mode=analysis_mode,
            title=title,
            status="generating",
        )
        db.add(insight)
        db.flush()

        # Link documents
        for doc in doc_group:
            db.execute(
                document_insight_documents.insert().values(
                    insight_id=insight.id, document_id=doc.id
                )
            )
        db.flush()

        log_activity(
            db, "insight_generate_start", "insight",
            entity_id=insight.id, entity_name=title,
            details=json.dumps({
                "insight_template": insight_template.name,
                "documents": [d.filename for d in doc_group],
                "analysis_mode": analysis_mode,
            }),
        )

        try:
            user_prompt = _build_user_prompt(
                doc_group, extractions, fields_info, analysis_mode, custom_instructions
            )

            logger.info("Generating insight '%s' for %d document(s)", title, len(doc_group))

            response_text, trace = await provider.complete(system_prompt, user_prompt)

            # Save LLM trace
            doc_id_for_trace = doc_group[0].id if len(doc_group) == 1 else None
            save_trace(
                db, trace, "insight_generation",
                document_id=doc_id_for_trace,
                template_id=insight_template.template_id,
                entity_name=title,
            )

            # Extract summary (first paragraph after Executive Summary header, or first 500 chars)
            summary = ""
            if "## Executive Summary" in response_text:
                after_header = response_text.split("## Executive Summary", 1)[1]
                # Get content until next ## header
                if "##" in after_header.strip().lstrip("\n"):
                    parts = after_header.strip().split("\n##", 1)
                    summary = parts[0].strip()[:1000]
                else:
                    summary = after_header.strip()[:1000]
            else:
                summary = response_text[:500]

            # Update insight
            insight.content = response_text
            insight.summary = summary
            insight.status = "completed"
            insight.metadata_json = json.dumps({
                "prompt_tokens": trace.prompt_tokens,
                "completion_tokens": trace.completion_tokens,
                "total_tokens": trace.total_tokens,
                "latency_ms": trace.latency_ms,
                "estimated_cost": trace.estimated_cost,
                "provider": trace.provider,
                "model": trace.model,
                "document_ids": [d.id for d in doc_group],
            })
            db.commit()

            total_tokens += trace.total_tokens or 0
            total_cost += trace.estimated_cost or 0.0
            total_latency += trace.latency_ms or 0

            logger.info("Insight '%s' generated successfully (%d tokens, %.4f USD)",
                        title, trace.total_tokens or 0, trace.estimated_cost or 0)

            log_activity(
                db, "insight_generate_complete", "insight",
                entity_id=insight.id, entity_name=title,
                details=json.dumps({
                    "tokens": trace.total_tokens,
                    "cost": trace.estimated_cost,
                    "latency_ms": trace.latency_ms,
                }),
            )

            results.append(insight)

        except Exception as e:
            insight.status = "failed"
            insight.error_message = str(e)
            db.commit()

            logger.error("Insight generation failed for '%s': %s", title, e)

            log_activity(
                db, "insight_generate_failed", "insight",
                entity_id=insight.id, entity_name=title,
                details=str(e), status="error",
            )

            # Save error trace if available
            try:
                save_trace(
                    db, trace, "insight_generation",
                    document_id=doc_group[0].id if len(doc_group) == 1 else None,
                    template_id=insight_template.template_id,
                    entity_name=title,
                )
            except Exception:
                pass

            results.append(insight)

    return results
