from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import logging

from app.config import settings
from app.database import init_db
from app.middleware.logging import RequestLoggingMiddleware
from app.core.rate_limit import limiter

# Configure root logger
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
from app.api.templates import router as templates_router
from app.api.documents import router as documents_router
from app.api.extraction import router as extraction_router
from app.api.dashboard import router as dashboard_router
from app.api.settings_api import router as settings_router
from app.api.data_tables import router as data_tables_router
from app.api.activity import router as activity_router
from app.api.llm_logs import router as llm_logs_router
from app.api.auth import router as auth_router


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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(RequestLoggingMiddleware)
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
app.include_router(auth_router)


@app.get("/api/health")
def health():
    """Health check with dependency verification."""
    import os
    import shutil
    from pathlib import Path
    from sqlalchemy import text

    checks = {}
    overall = True

    # Database connectivity
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            checks["database"] = {"status": "ok"}
        finally:
            db.close()
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)}
        overall = False

    # Upload directory
    upload_dir = Path(settings.upload_dir)
    if upload_dir.exists() and os.access(str(upload_dir), os.W_OK):
        checks["upload_dir"] = {"status": "ok"}
    else:
        checks["upload_dir"] = {"status": "error", "detail": "Not writable or missing"}
        overall = False

    # Disk space
    try:
        disk = shutil.disk_usage("/")
        free_gb = round(disk.free / (1024 ** 3), 1)
        checks["disk_space"] = {
            "status": "ok" if free_gb > 1 else "warning",
            "free_gb": free_gb,
        }
        if free_gb <= 1:
            overall = False
    except Exception:
        checks["disk_space"] = {"status": "unknown"}

    status_code = 200 if overall else 503
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ok" if overall else "degraded",
            "version": "1.0.0",
            "checks": checks,
        },
    )
