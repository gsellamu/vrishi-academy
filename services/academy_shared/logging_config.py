"""Structured JSON logging for cloud deployments.

Works with CloudWatch, Stackdriver, Azure Monitor -- all expect JSON
log lines with standard fields (timestamp, level, message, service).
"""
from __future__ import annotations
import json
import logging
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Emit one JSON object per log line."""

    def __init__(self, service: str = "academy"):
        super().__init__()
        self._service = service

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self._service,
        }
        if record.exc_info and record.exc_info[1]:
            entry["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "request_id"):
            entry["request_id"] = record.request_id
        return json.dumps(entry, default=str)


def setup_logging(service_name: str, level: str = "INFO") -> None:
    """Configure root logger with JSON output to stderr.

    Call once at service startup before any log statements.
    """
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers (uvicorn adds its own)
    for h in root.handlers[:]:
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JSONFormatter(service_name))
    root.addHandler(handler)

    # Quieten noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
