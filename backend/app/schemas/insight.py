"""Pydantic schemas for Insight Templates and Document Insights."""

from datetime import datetime
from pydantic import BaseModel


# --- Insight Template Sections ---

class SectionCreate(BaseModel):
    title: str
    description: str | None = None
    prompt_hint: str | None = None
    sort_order: int = 0


class SectionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    prompt_hint: str | None = None
    sort_order: int | None = None


class SectionResponse(BaseModel):
    id: int
    insight_template_id: int
    title: str
    description: str | None
    prompt_hint: str | None
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Insight Templates ---

class InsightTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    template_id: int
    system_prompt: str | None = None


class InsightTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    is_active: bool | None = None


class InsightTemplateResponse(BaseModel):
    id: int
    name: str
    description: str | None
    template_id: int
    template_name: str
    system_prompt: str | None
    is_active: bool
    sections: list[SectionResponse] = []
    insight_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InsightTemplateListResponse(BaseModel):
    id: int
    name: str
    description: str | None
    template_name: str
    section_count: int = 0
    insight_count: int = 0
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Document Insights ---

class InsightDocumentRef(BaseModel):
    document_id: int
    filename: str
    template_name: str | None = None


class InsightGenerateRequest(BaseModel):
    insight_template_id: int
    document_ids: list[int]
    analysis_mode: str  # individual | consolidated
    custom_instructions: str | None = None


class InsightResponse(BaseModel):
    id: int
    insight_template_id: int | None
    insight_template_name: str | None
    analysis_mode: str
    title: str
    content: str | None
    summary: str | None
    status: str
    error_message: str | None
    metadata: dict | None = None
    documents: list[InsightDocumentRef] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InsightListResponse(BaseModel):
    id: int
    title: str
    insight_template_name: str | None
    analysis_mode: str
    document_count: int = 0
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InsightGenerateResponse(BaseModel):
    insights: list[InsightResponse]
    total_tokens: int = 0
    total_cost: float = 0.0
    total_latency_ms: int = 0
