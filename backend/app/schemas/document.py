from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_type: str
    file_size: int | None
    template_id: int | None
    template_name: str | None = None
    status: str
    classification_confidence: float | None
    error_message: str | None
    page_count: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(DocumentResponse):
    extraction: "ExtractionResponse | None" = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    page: int
    limit: int


class ExtractionResponse(BaseModel):
    id: int
    document_id: int
    template_id: int
    extracted_data: dict
    is_reviewed: bool
    reviewed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractionUpdate(BaseModel):
    extracted_data: dict
