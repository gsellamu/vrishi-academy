"""Liveness and readiness health checks for cloud orchestrators.

/healthz  -- liveness:  is the process alive?  (always 200 unless frozen)
/readyz   -- readiness: can this instance serve traffic?  (checks deps)
"""
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .database import DatabasePool
    from .cache import CacheService
    from .events import EventBus


class HealthChecker:
    """Aggregates dependency health into liveness/readiness responses."""

    def __init__(
        self,
        service_name: str,
        version: str,
        db: "DatabasePool",
        cache: "CacheService | None" = None,
        events: "EventBus | None" = None,
    ):
        self.service_name = service_name
        self.version = version
        self._db = db
        self._cache = cache
        self._events = events

    async def liveness(self) -> dict:
        """Lightweight check -- always returns OK if the process is responding."""
        return {"status": "ok", "service": self.service_name, "version": self.version}

    async def readiness(self) -> dict:
        """Deep check -- verifies critical dependencies are reachable."""
        checks = {
            "service": self.service_name,
            "version": self.version,
        }

        # Postgres is critical
        db_ok = await self._db.ping()
        checks["postgres"] = "ok" if db_ok else "error"

        # Redis is non-critical
        if self._cache:
            checks["redis"] = "ok" if await self._cache.ping() else "unavailable"

        # Kafka status
        if self._events:
            checks["kafka"] = "enabled" if self._events._enabled else "disabled"

        checks["ok"] = db_ok
        return checks
