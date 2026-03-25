from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import logging

from app.config import settings
from app.database import init_db
from app.api.templates import router as templates_router
from app.api.documents import router as documents_router
from app.api.extraction import router as extraction_router
from app.api.dashboard import router as dashboard_router
from app.api.settings_api import router as settings_router
from app.api.data_tables import router as data_tables_router
from app.api.activity import router as activity_router
from app.api.llm_logs import router as llm_logs_router


logger = logging.getLogger("idp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not settings.ai_api_key:
        logger.warning("AI_API_KEY not set — document processing will fail until configured")
    yield


app = FastAPI(
    title="IDP - Intelligent Document Processing",
    description="Platform for intelligent extraction of structured data from documents",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN",
                404: "NOT_FOUND", 409: "CONFLICT", 422: "VALIDATION_ERROR",
                429: "RATE_LIMITED", 500: "INTERNAL_ERROR"}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "code": code_map.get(exc.status_code, "ERROR"),
            "message": exc.detail,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        messages.append(f"{loc}: {err.get('msg', '')}")
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {"errors": messages},
        },
    )


app.include_router(templates_router)
app.include_router(documents_router)
app.include_router(extraction_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(data_tables_router)
app.include_router(activity_router)
app.include_router(llm_logs_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
