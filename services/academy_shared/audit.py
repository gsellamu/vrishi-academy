"""Audit logging service -- persists actions to the audit_log table."""
from __future__ import annotations
import json
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .database import DatabasePool

log = logging.getLogger(__name__)


class AuditService:
    """Write-only audit trail.  Failures are logged but never propagated
    so auditing can never break the main request flow."""

    def __init__(self, db: "DatabasePool"):
        self._db = db

    async def log(
        self,
        user_id: str | None,
        action: str,
        resource: str | None = None,
        detail: dict | None = None,
        ip: str = "unknown",
        user_agent: str = "",
    ) -> None:
        try:
            await self._db.execute(
                "INSERT INTO audit_log (user_id, action, resource, detail, ip, user_agent) "
                "VALUES ($1, $2, $3, $4, $5, $6)",
                user_id, action, resource,
                json.dumps(detail) if detail else None,
                ip, user_agent[:500],
            )
        except Exception as exc:
            log.warning("Audit write failed: %s", exc)
