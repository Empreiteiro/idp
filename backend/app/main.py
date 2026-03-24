from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api.templates import router as templates_router
from app.api.documents import router as documents_router
from app.api.extraction import router as extraction_router
from app.api.dashboard import router as dashboard_router
from app.api.settings_api import router as settings_router
from app.api.data_tables import router as data_tables_router
from app.api.activity import router as activity_router
from app.api.llm_logs import router as llm_logs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="IDP - Intelligent Document Processing",
    description="Platform for intelligent extraction of structured data from documents",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
