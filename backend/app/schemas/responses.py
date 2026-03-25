"""Standardized API response schemas."""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Unified error response format for all API endpoints."""
    error: bool = True
    code: str
    message: str
    details: dict | None = None


class SuccessResponse(BaseModel):
    """Unified success response for mutation endpoints."""
    ok: bool = True
    message: str | None = None
