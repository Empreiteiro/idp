import json
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger("idp.templates")

from app.database import get_db
from app.models import Template, TemplateField, Document
from app.schemas.template import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplateListResponse,
    FieldCreate, FieldUpdate, FieldResponse,
)
from app.core.file_utils import save_upload_file, validate_file_type, delete_file
from app.schemas.responses import SuccessResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=list[TemplateListResponse])
def list_templates(db: Session = Depends(get_db)):
    doc_counts_subq = (
        db.query(Document.template_id, func.count(Document.id).label("doc_count"))
        .group_by(Document.template_id)
        .subquery()
    )
    rows = (
        db.query(Template, func.coalesce(doc_counts_subq.c.doc_count, 0).label("doc_count"))
        .outerjoin(doc_counts_subq, Template.id == doc_counts_subq.c.template_id)
        .order_by(Template.created_at.desc())
        .all()
    )
    return [
        TemplateListResponse(
            id=t.id, name=t.name, description=t.description,
            created_at=t.created_at,
            field_count=len(t.fields), document_count=doc_count,
        )
        for t, doc_count in rows
    ]


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    name: str = Form(...),
    description: str = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    existing = db.query(Template).filter(Template.name == name).first()
    if existing:
        raise HTTPException(400, "Template with this name already exists")

    example_file = None
    if file and file.filename:
        if not validate_file_type(file.filename):
            raise HTTPException(400, "Unsupported file type")
        example_file, _ = await save_upload_file(file)

    template = Template(name=name, description=description, example_file=example_file)
    db.add(template)
    db.commit()
    db.refresh(template)

    # If file was uploaded, auto-suggest fields
    if example_file:
        try:
            from app.services.pipeline import suggest_fields_for_template
            await suggest_fields_for_template(db, template)
        except Exception as e:
            logger.warning("Auto field suggestion failed for template '%s': %s", name, e)

    db.refresh(template)
    doc_count = db.query(func.count(Document.id)).filter(Document.template_id == template.id).scalar()
    return TemplateResponse(
        id=template.id, name=template.name, description=template.description,
        example_file=template.example_file, created_at=template.created_at,
        updated_at=template.updated_at, fields=[FieldResponse.model_validate(f) for f in template.fields],
        document_count=doc_count or 0,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    doc_count = db.query(func.count(Document.id)).filter(Document.template_id == template.id).scalar()
    return TemplateResponse(
        id=template.id, name=template.name, description=template.description,
        example_file=template.example_file, created_at=template.created_at,
        updated_at=template.updated_at, fields=[FieldResponse.model_validate(f) for f in template.fields],
        document_count=doc_count or 0,
    )


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(template_id: int, data: TemplateUpdate, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    db.commit()
    db.refresh(template)
    doc_count = db.query(func.count(Document.id)).filter(Document.template_id == template.id).scalar()
    return TemplateResponse(
        id=template.id, name=template.name, description=template.description,
        example_file=template.example_file, created_at=template.created_at,
        updated_at=template.updated_at, fields=[FieldResponse.model_validate(f) for f in template.fields],
        document_count=doc_count or 0,
    )


@router.delete("/{template_id}", response_model=SuccessResponse)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    if template.example_file:
        delete_file(template.example_file)
    db.delete(template)
    db.commit()
    return SuccessResponse(message=f"Template '{template.name}' deleted")


@router.post("/{template_id}/suggest-fields", response_model=list[FieldResponse])
async def suggest_fields(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    if not template.example_file:
        raise HTTPException(400, "Template has no example file for field suggestion")
    try:
        from app.services.pipeline import suggest_fields_for_template
        await suggest_fields_for_template(db, template)
    except Exception as e:
        raise HTTPException(500, f"Field suggestion failed: {str(e)}")
    db.refresh(template)
    return [FieldResponse.model_validate(f) for f in template.fields]


# --- Field CRUD ---


@router.get("/{template_id}/fields", response_model=list[FieldResponse])
def list_fields(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    return [FieldResponse.model_validate(f) for f in template.fields]


@router.post("/{template_id}/fields", response_model=FieldResponse, status_code=201)
def add_field(template_id: int, data: FieldCreate, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")
    field = TemplateField(template_id=template_id, **data.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return FieldResponse.model_validate(field)


@router.put("/{template_id}/fields/{field_id}", response_model=FieldResponse)
def update_field(template_id: int, field_id: int, data: FieldUpdate, db: Session = Depends(get_db)):
    field = db.query(TemplateField).filter(
        TemplateField.id == field_id, TemplateField.template_id == template_id
    ).first()
    if not field:
        raise HTTPException(404, "Field not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(field, key, value)
    db.commit()
    db.refresh(field)
    return FieldResponse.model_validate(field)


@router.delete("/{template_id}/fields/{field_id}", response_model=SuccessResponse)
def delete_field(template_id: int, field_id: int, db: Session = Depends(get_db)):
    field = db.query(TemplateField).filter(
        TemplateField.id == field_id, TemplateField.template_id == template_id
    ).first()
    if not field:
        raise HTTPException(404, "Field not found")
    db.delete(field)
    db.commit()
    return SuccessResponse(message="Field deleted")
