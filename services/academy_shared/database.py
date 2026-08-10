"""Async PostgreSQL connection pool with pgbouncer compatibility."""
from __future__ import annotations
import logging
import asyncpg

log = logging.getLogger(__name__)


class DatabasePool:
    """Manages an asyncpg connection pool.

    Designed for pgbouncer transaction mode: ``statement_cache_size=0``,
    ``ssl=False``.  Safe for horizontal scaling -- each service instance
    owns its own pool.
    """

    def __init__(
        self,
        url: str,
        min_size: int = 2,
        max_size: int = 10,
        command_timeout: int = 15,
        ssl: bool = False,
    ):
        self._url = url
        self._min = min_size
        self._max = max_size
        self._timeout = command_timeout
        self._ssl = ssl
        self._pool: asyncpg.Pool | None = None

    # -- lifecycle ----------------------------------------------------------

    async def start(self) -> None:
        if self._pool is None or self._pool._closed:
            self._pool = await asyncpg.create_pool(
                self._url,
                min_size=self._min,
                max_size=self._max,
                statement_cache_size=0,
                command_timeout=self._timeout,
                ssl="require" if self._ssl else False,
            )
            log.info("DB pool started (%s-%s conns)", self._min, self._max)

    async def stop(self) -> None:
        if self._pool and not self._pool._closed:
            await self._pool.close()
            self._pool = None
            log.info("DB pool closed")

    # -- query helpers ------------------------------------------------------

    async def fetch(self, query: str, *args):
        return await self._pool.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        return await self._pool.fetchrow(query, *args)

    async def fetchval(self, query: str, *args):
        return await self._pool.fetchval(query, *args)

    async def execute(self, query: str, *args):
        return await self._pool.execute(query, *args)

    async def executemany(self, query: str, args):
        async with self._pool.acquire() as conn:
            return await conn.executemany(query, args)

    async def acquire(self):
        return self._pool.acquire()

    # -- health -------------------------------------------------------------

    async def ping(self) -> bool:
        try:
            return await self.fetchval("SELECT 1") == 1
        except Exception:
            return False
