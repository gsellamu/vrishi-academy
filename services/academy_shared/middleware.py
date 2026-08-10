"""FastAPI middleware for cloud-grade observability and security."""
from __future__ import annotations
import time
import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

log = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assigns a unique request ID to every inbound request.

    The ID is available as ``request.state.request_id`` and returned in
    the ``X-Request-ID`` response header.  Cloud load balancers and log
    aggregators use this for distributed tracing.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Adds ``X-Response-Time`` header (milliseconds) to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed = int((time.monotonic() - start) * 1000)
        response.headers["X-Response-Time"] = str(elapsed)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """OWASP-recommended security headers on every response.

    HSTS is only added when the request arrived via TLS (detected by
    the ``X-Forwarded-Proto: https`` header set by ALB / nginx).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        if request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


class RequestBodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects request bodies exceeding ``max_bytes`` (default 1 MB).

    Checks the ``Content-Length`` header up front; streaming bodies
    without Content-Length are still handled by uvicorn's own limit.
    """

    def __init__(self, app, max_bytes: int = 1_048_576):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next) -> Response:
        cl = request.headers.get("content-length")
        if cl and int(cl) > self.max_bytes:
            return JSONResponse(
                {"detail": "Request body too large (limit: {} bytes)".format(self.max_bytes)},
                status_code=413,
            )
        return await call_next(request)
