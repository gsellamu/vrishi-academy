"""Redis-backed cache service with graceful degradation."""
from __future__ import annotations
import json
import logging
from typing import Any

import redis.asyncio as aioredis

log = logging.getLogger(__name__)


class CacheService:
    """Thin wrapper around aioredis with silent failure semantics.

    When Redis is down every method returns a safe default rather than
    raising, so callers never need try/except around cache operations.
    """

    def __init__(self, redis_url: str):
        self._url = redis_url
        self._redis: aioredis.Redis | None = None

    # -- lifecycle ----------------------------------------------------------

    async def start(self) -> None:
        try:
            self._redis = aioredis.from_url(self._url, decode_responses=True)
            await self._redis.ping()
            log.info("Redis connected")
        except Exception as exc:
            log.warning("Redis unavailable: %s", exc)
            self._redis = None

    async def stop(self) -> None:
        if self._redis:
            await self._redis.close()
            self._redis = None

    @property
    def available(self) -> bool:
        return self._redis is not None

    # -- operations ---------------------------------------------------------

    async def get(self, key: str) -> Any | None:
        if not self._redis:
            return None
        try:
            val = await self._redis.get(key)
            return json.loads(val) if val else None
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        if not self._redis:
            return
        try:
            await self._redis.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass

    async def delete(self, *keys: str) -> None:
        if not self._redis or not keys:
            return
        try:
            await self._redis.delete(*keys)
        except Exception:
            pass

    async def invalidate(self, pattern: str) -> None:
        if not self._redis:
            return
        try:
            keys = []
            async for k in self._redis.scan_iter(match=pattern, count=100):
                keys.append(k)
            if keys:
                await self._redis.delete(*keys)
        except Exception:
            pass

    async def incr(self, key: str, window: int | None = None) -> int:
        """Increment counter.  Returns current count, or 0 if Redis is down."""
        if not self._redis:
            return 0
        try:
            hits = await self._redis.incr(key)
            if hits == 1 and window:
                await self._redis.expire(key, window)
            return hits
        except Exception:
            return 0

    async def setex_raw(self, key: str, ttl: int, value: str) -> None:
        if not self._redis:
            return
        try:
            await self._redis.setex(key, ttl, value)
        except Exception:
            pass

    async def ping(self) -> bool:
        if not self._redis:
            return False
        try:
            return await self._redis.ping()
        except Exception:
            return False
