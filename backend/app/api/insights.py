"""API routes for Insight Templates and Document Insights."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Template, TemplateField, Document
from app.models.insight import InsightTemplate, InsightTemplateSection, DocumentInsight, document_insight_documents
from app.schemas.insight import (
    InsightTemplateCreate, InsightTemplateUpdate, InsightTemplateResponse, InsightTemplateListResponse,
    SectionCreate, SectionUpdate, SectionResponse,
    InsightGenerateRequest, InsightGenerateResponse, InsightResponse, InsightListResponse, InsightDocumentRef,
)
from app.schemas.responses import SuccessResponse
from app.api.activity import log_activity

logger = logging.getLogger("idp.insights")

router = APIRouter(tags=["insights"])


# ---------------------------------------------------------------------------
# Insight Template CRUD
# ---------------------------------------------------------------------------

@router.get("/api/insight-templates", response_model=list[InsightTemplateListResponse])
def list_insight_templates(db: Session = Depends(get_db)):
    rows = (
        db.query(InsightTemplate, Template.name.label("template_name"))
        .join(Template, InsightTemplate.template_id == Template.id)
        .order_by(InsightTemplate.created_at.desc())
        .all()
    )
    result = []
    for it, template_name in rows:
        insight_count = db.query(func.count(DocumentInsight.id)).filter(
            DocumentInsight.insight_template_id == it.id
        ).scalar() or 0
        result.append(InsightTemplateListResponse(
            id=it.id, name=it.name, description=it.description,
            template_name=template_name,
            section_count=len(it.sections),
            insight_count=insight_count,
            is_active=it.is_active,
            created_at=it.created_at,
        ))
    return result


@router.post("/api/insight-templates", response_model=InsightTemplateResponse, status_code=201)
def create_insight_template(data: InsightTemplateCreate, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == data.template_id).first()
    if not template:
        raise HTTPException(404, "Linked document template not found")

    existing = db.query(InsightTemplate).filter(InsightTemplate.name == data.name).first()
    if existing:
        raise HTTPException(400, "Insight template with this name already exists")

    it = InsightTemplate(
        name=data.name,
        description=data.description,
        template_id=data.template_id,
        system_prompt=data.system_prompt,
    )
    db.add(it)
    db.commit()
    db.refresh(it)

    log_activity(db, "insight_template_created", "insight_template",
                 entity_id=it.id, entity_name=it.name)

    return _build_insight_template_response(db, it, template.name)


@router.get("/api/insight-templates/{it_id}", response_model=InsightTemplateResponse)
def get_insight_template(it_id: int, db: Session = Depends(get_db)):
    it = db.query(InsightTemplate).filter(InsightTemplate.id == it_id).first()
    if not it:
        raise HTTPException(404, "Insight template not found")
    template_name = it.template.name if it.template else "Unknown"
    return _build_insight_template_response(db, it, template_name)


@router.put("/api/insight-templates/{it_id}", response_model=InsightTemplateResponse)
def update_insight_template(it_id: int, data: InsightTemplateUpdate, db: Session = Depends(get_db)):
    it = db.query(InsightTemplate).filter(InsightTemplate.id == it_id).first()
    if not it:
        raise HTTPException(404, "Insight template not found")
    if data.name is not None:
        it.name = data.name
    if data.description is not None:
        it.description = data.description
    if data.system_prompt is not None:
        it.system_prompt = data.system_prompt
    if data.is_active is not None:
        it.is_active = data.is_active
    db.commit()
    db.refresh(it)

    log_activity(db, "insight_template_updated", "insight_template",
                 entity_id=it.id, entity_name=it.name)

    template_name = it.template.name if it.template else "Unknown"
    return _build_insight_template_response(db, it, template_name)


@router.delete("/api/insight-templates/{it_id}", response_model=SuccessResponse)
def delete_insight_template(it_id: int, db: Session = Depends(get_db)):
    it = db.query(InsightTemplate).filter(InsightTemplate.id == it_id).first()
    if not it:
        raise HTTPException(404, "Insight template not found")
    name = it.name
    db.delete(it)
    db.commit()

    log_activity(db, "insight_template_deleted", "insight_template",
                 entity_id=it_id, entity_name=name)

    return SuccessResponse(message=f"Insight template '{name}' deleted")


# ---------------------------------------------------------------------------
# AI Section Suggestion
# ---------------------------------------------------------------------------

@router.post("/api/insight-templates/{it_id}/suggest-sections", response_model=list[SectionResponse])
async def suggest_sections(it_id: int, db: Session = Depends(get_db)):
    it = db.query(InsightTemplate).filter(InsightTemplate.id == it_id).first()
    if not it:
        raise HTTPException(404, "Insight template not found")

    template = it.template
    if not template:
        raise HTTPException(400, "Linked document template not found")

    if not template.fields:
        raise HTTPException(400, "Linked template has no fields. Add fields first.")

    # Build fields description
    fields_desc_parts = []
    for f in template.fields:
        desc = f"- {f.field_label} ({f.field_name}): type={f.field_type}"
        if f.field_type == "table" and f.columns:
            cols = json.loads(f.columns) if isinstance(f.columns, str) else f.columns
            col_names = ", ".join(c.get("label", c.get("name", "")) for c in cols)
            desc += f", columns=[{col_names}]"
        fields_desc_parts.append(desc)
    fields_description = "\n".join(fields_desc_parts)

    # Get example text if available
    ocr_text = None
    if template.example_file:
        try:
            from app.services.ocr import extract_text
            from app.core.file_utils import get_file_full_path
            file_path = get_file_full_path(template.example_file)
            file_ext = template.example_file.rsplit(".", 1)[-1].lower()
            file_type = "pdf" if file_ext == "pdf" else f"image/{file_ext}"
            ocr_text, _ = extract_text(file_path, file_type)
        except Exception as e:
            logger.warning("Could not extract text from example file: %s", e)

    try:
        from app.services.insight_suggester import suggest_sections as ai_suggest
        suggested = await ai_suggest(
            db, it.id, template.name, fields_description, ocr_text
        )
    except Exception as e:
        raise HTTPException(500, f"Section suggestion failed: {str(e)}")

    # Clear existing sections and add new ones
    db.query(InsightTemplateSection).filter(
        InsightTemplateSection.insight_template_id == it.id
    ).delete()
    db.flush()

    for section_data in suggested:
        section = InsightTemplateSection(
            insight_template_id=it.id,
            title=section_data["title"],
            description=section_data.get("description"),
            prompt_hint=section_data.get("prompt_hint"),
            sort_order=section_data.get("sort_order", 0),
        )
        db.add(section)
    db.commit()

    log_activity(db, "insight_sections_suggested", "insight_template",
                 entity_id=it.id, entity_name=it.name,
                 details=f"Suggested {len(suggested)} sections")

    db.refresh(it)
    return [SectionResponse.model_validate(s) for s in it.sections]


# ---------------------------------------------------------------------------
# Section CRUD
# ---------------------------------------------------------------------------

@router.post("/api/insight-templates/{it_id}/sections", response_model=SectionResponse, status_code=201)
def add_section(it_id: int, data: SectionCreate, db: Session = Depends(get_db)):
    it = db.query(InsightTemplate).filter(InsightTemplate.id == it_id).first()
    if not it:
        raise HTTPException(404, "Insight template not found")
    section = InsightTemplateSection(
        insight_template_id=it_id,
        title=data.title,
        description=data.description,
        prompt_hint=data.prompt_hint,
        sort_order=data.sort_order,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return SectionResponse.model_validate(section)


@router.put("/api/insight-templates/{it_id}/sections/{section_id}", response_model=SectionResponse)
def update_section(it_id: int, section_id: int, data: SectionUpdate, db: Session = Depends(get_db)):
    section = db.query(InsightTemplateSection).filter(
        InsightTemplateSection.id == section_id,
        InsightTemplateSection.insight_template_id == it_id,
    ).first()
    if not section:
        raise HTTPException(404, "Section not found")
    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(section, key, value)
    db.commit()
    db.refresh(section)
    return SectionResponse.model_validate(section)


@router.delete("/api/insight-templates/{it_id}/sections/{section_id}", response_model=SuccessResponse)
def delete_section(it_id: int, section_id: int, db: Session = Depends(get_db)):
    section = db.query(InsightTemplateSection).filter(
        InsightTemplateSection.id == section_id,
        InsightTemplateSection.insight_template_id == it_id,
    ).first()
    if not section:
        raise HTTPException(404, "Section not found")
    db.delete(section)
    db.commit()
    return SuccessResponse(message="Section deleted")


# ---------------------------------------------------------------------------
# Document Insights
# ---------------------------------------------------------------------------

@router.post("/api/insights/generate", response_model=InsightGenerateResponse)
async def generate_insight(data: InsightGenerateRequest, db: Session = Depends(get_db)):
    if data.analysis_mode not in ("individual", "consolidated"):
        raise HTTPException(400, "analysis_mode must be 'individual' or 'consolidated'")
    if not data.document_ids:
        raise HTTPException(400, "At least one document_id is required")

    try:
        from app.services.insight_generator import generate_insights
        insights = await generate_insights(
            db,
            insight_template_id=data.insight_template_id,
            document_ids=data.document_ids,
            analysis_mode=data.analysis_mode,
            custom_instructions=data.custom_instructions,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error("Insight generation error: %s", e)
        raise HTTPException(500, f"Insight generation failed: {str(e)}")

    total_tokens = 0
    total_cost = 0.0
    total_latency = 0
    insight_responses = []

    for insight in insights:
        meta = {}
        if insight.metadata_json:
            meta = json.loads(insight.metadata_json) if isinstance(insight.metadata_json, str) else insight.metadata_json
        total_tokens += meta.get("total_tokens", 0) or 0
        total_cost += meta.get("estimated_cost", 0) or 0.0
        total_latency += meta.get("latency_ms", 0) or 0

        insight_responses.append(_build_insight_response(db, insight))

    return InsightGenerateResponse(
        insights=insight_responses,
        total_tokens=total_tokens,
        total_cost=total_cost,
        total_latency_ms=total_latency,
    )


@router.get("/api/insights", response_model=dict)
def list_insights(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    insight_template_id: int | None = None,
    status: str | None = None,
    analysis_mode: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(DocumentInsight)
    if insight_template_id:
        query = query.filter(DocumentInsight.insight_template_id == insight_template_id)
    if status:
        query = query.filter(DocumentInsight.status == status)
    if analysis_mode:
        query = query.filter(DocumentInsight.analysis_mode == analysis_mode)

    total = query.count()
    rows = (
        query.order_by(DocumentInsight.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for insight in rows:
        template_name = None
        if insight.insight_template:
            template_name = insight.insight_template.name
        items.append(InsightListResponse(
            id=insight.id,
            title=insight.title,
            insight_template_name=template_name,
            analysis_mode=insight.analysis_mode,
            document_count=len(insight.documents),
            status=insight.status,
            created_at=insight.created_at,
        ))

    return {"insights": items, "total": total, "page": page, "limit": limit}


@router.get("/api/insights/{insight_id}", response_model=InsightResponse)
def get_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = db.query(DocumentInsight).filter(DocumentInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(404, "Insight not found")
    return _build_insight_response(db, insight)


@router.delete("/api/insights/{insight_id}", response_model=SuccessResponse)
def delete_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = db.query(DocumentInsight).filter(DocumentInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(404, "Insight not found")
    title = insight.title
    db.delete(insight)
    db.commit()

    log_activity(db, "insight_deleted", "insight",
                 entity_id=insight_id, entity_name=title)

    return SuccessResponse(message=f"Insight '{title}' deleted")


@router.post("/api/insights/{insight_id}/regenerate", response_model=InsightResponse)
async def regenerate_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = db.query(DocumentInsight).filter(DocumentInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(404, "Insight not found")
    if not insight.insight_template_id:
        raise HTTPException(400, "Cannot regenerate: insight template was deleted")

    document_ids = [d.id for d in insight.documents]
    if not document_ids:
        raise HTTPException(400, "No documents linked to this insight")

    # Delete old insight
    old_meta = {}
    if insight.metadata_json:
        old_meta = json.loads(insight.metadata_json) if isinstance(insight.metadata_json, str) else insight.metadata_json

    db.delete(insight)
    db.commit()

    try:
        from app.services.insight_generator import generate_insights
        new_insights = await generate_insights(
            db,
            insight_template_id=insight.insight_template_id,
            document_ids=document_ids,
            analysis_mode=insight.analysis_mode,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Regeneration failed: {str(e)}")

    if not new_insights:
        raise HTTPException(500, "Regeneration produced no results")

    return _build_insight_response(db, new_insights[0])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_insight_template_response(
    db: Session, it: InsightTemplate, template_name: str
) -> InsightTemplateResponse:
    insight_count = db.query(func.count(DocumentInsight.id)).filter(
        DocumentInsight.insight_template_id == it.id
    ).scalar() or 0
    return InsightTemplateResponse(
        id=it.id, name=it.name, description=it.description,
        template_id=it.template_id, template_name=template_name,
        system_prompt=it.system_prompt, is_active=it.is_active,
        sections=[SectionResponse.model_validate(s) for s in it.sections],
        insight_count=insight_count,
        created_at=it.created_at, updated_at=it.updated_at,
    )


def _build_insight_response(db: Session, insight: DocumentInsight) -> InsightResponse:
    template_name = None
    if insight.insight_template:
        template_name = insight.insight_template.name

    metadata = None
    if insight.metadata_json:
        metadata = json.loads(insight.metadata_json) if isinstance(insight.metadata_json, str) else insight.metadata_json

    docs = []
    for doc in insight.documents:
        docs.append(InsightDocumentRef(
            document_id=doc.id,
            filename=doc.filename,
            template_name=doc.template.name if doc.template else None,
        ))

    return InsightResponse(
        id=insight.id,
        insight_template_id=insight.insight_template_id,
        insight_template_name=template_name,
        analysis_mode=insight.analysis_mode,
        title=insight.title,
        content=insight.content,
        summary=insight.summary,
        status=insight.status,
        error_message=insight.error_message,
        metadata=metadata,
        documents=docs,
        created_at=insight.created_at,
        updated_at=insight.updated_at,
    )
