"""Request logging middleware with request ID tracing."""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("idp.requests")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request with method, path, status code, and duration."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id

        start = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000)
            logger.error("[%s] %s %s 500 (%dms)", request_id, method, path, duration_ms)
            raise

        duration_ms = round((time.perf_counter() - start) * 1000)
        status = response.status_code

        response.headers["X-Request-ID"] = request_id

        log_fn = logger.info if status < 400 else logger.warning if status < 500 else logger.error
        log_fn("[%s] %s %s %d (%dms)", request_id, method, path, status, duration_ms)

        return response
