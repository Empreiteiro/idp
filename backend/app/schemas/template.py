import json
from datetime import datetime
from pydantic import BaseModel, field_validator


class ColumnDefinition(BaseModel):
    name: str
    label: str
    type: str = "text"


class FieldCreate(BaseModel):
    field_name: str
    field_label: str
    field_type: str = "text"
    required: bool = False
    sort_order: int = 0
    columns: list[ColumnDefinition] | None = None


class FieldUpdate(BaseModel):
    field_name: str | None = None
    field_label: str | None = None
    field_type: str | None = None
    required: bool | None = None
    sort_order: int | None = None
    columns: list[ColumnDefinition] | None = None


class FieldResponse(BaseModel):
    id: int
    template_id: int
    field_name: str
    field_label: str
    field_type: str
    required: bool
    sort_order: int
    columns: list[ColumnDefinition] | None = None

    model_config = {"from_attributes": True}

    @field_validator("columns", mode="before")
    @classmethod
    def parse_columns(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v


class TemplateCreate(BaseModel):
    name: str
    description: str | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: str | None
    example_files: list[str] = []
    created_at: datetime
    updated_at: datetime
    fields: list[FieldResponse] = []
    document_count: int = 0

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    field_count: int = 0
    document_count: int = 0

    model_config = {"from_attributes": True}
