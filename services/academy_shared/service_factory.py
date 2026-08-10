"""Factory for bootstrapping a cloud-ready FastAPI service.

Provides the standard lifespan, middleware, and health endpoints shared
by all academy microservices.  Each service calls ``create_app()`` and
gets a fully-configured FastAPI instance with DI via ``app.state``.
"""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import AcademyConfig
from .database import DatabasePool
from .cache import CacheService
from .events import EventBus
from .audit import AuditService
from .coaching import CoachingEngine
from .health import HealthChecker
from .logging_config import setup_logging
from .middleware import (
    RequestIDMiddleware, TimingMiddleware,
    SecurityHeadersMiddleware, RequestBodySizeLimitMiddleware,
)

log = logging.getLogger(__name__)


def create_app(
    service_name: str,
    version: str = "1.0.0",
    config: AcademyConfig | None = None,
    include_coaching: bool = False,
    include_events: bool = False,
) -> FastAPI:
    """Build a FastAPI app with standard cloud infrastructure wired up.

    All services are available on ``request.app.state``:
      - ``db``: DatabasePool
      - ``cache``: CacheService
      - ``audit``: AuditService
      - ``health``: HealthChecker
      - ``coach``: CoachingEngine  (if include_coaching)
      - ``events``: EventBus       (if include_events)
      - ``config``: AcademyConfig
    """
    cfg = config or AcademyConfig.from_env(service_name, version)

    setup_logging(service_name, "INFO")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # -- startup --
        db = DatabasePool(cfg.db_url, cfg.db_min_pool, cfg.db_max_pool, cfg.db_timeout, cfg.db_ssl)
        await db.start()

        cache = CacheService(cfg.redis_url)
        await cache.start()

        audit = AuditService(db)

        events = None
        if include_events:
            events = EventBus(cfg.kafka_enabled, cfg.kafka_servers)
            await events.start()

        coach = None
        if include_coaching:
            coach = CoachingEngine(cfg.ollama_url, cfg.coach_model, cfg.coach_timeout)

        health = HealthChecker(service_name, version, db, cache, events)

        app.state.config = cfg
        app.state.db = db
        app.state.cache = cache
        app.state.audit = audit
        app.state.events = events
        app.state.coach = coach
        app.state.health = health

        log.info("Service %s v%s started", service_name, version)
        yield

        # -- shutdown --
        if events:
            await events.stop()
        await cache.stop()
        await db.stop()
        log.info("Service %s stopped", service_name)

    # Disable interactive docs in production/staging
    docs_kwargs = {}
    if not cfg.docs_enabled:
        docs_kwargs = {"docs_url": None, "redoc_url": None, "openapi_url": None}

    app = FastAPI(title=service_name, version=version, lifespan=lifespan, **docs_kwargs)

    # Middleware (order matters: outermost first)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=cfg.cors_methods,
        allow_headers=cfg.cors_headers,
        expose_headers=["X-Request-ID", "X-Response-Time"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestBodySizeLimitMiddleware, max_bytes=cfg.body_max_bytes)
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Health endpoints
    @app.get("/healthz")
    async def liveness(request: Request):
        return await request.app.state.health.liveness()

    @app.get("/readyz")
    @app.get("/health")
    async def readiness(request: Request):
        return await request.app.state.health.readiness()

    return app


# -- DI helpers for endpoint injection --------------------------------------

def get_db(request: Request) -> DatabasePool:
    return request.app.state.db

def get_cache(request: Request) -> CacheService:
    return request.app.state.cache

def get_audit(request: Request) -> AuditService:
    return request.app.state.audit

def get_coach(request: Request) -> CoachingEngine:
    return request.app.state.coach

def get_events(request: Request) -> EventBus:
    return request.app.state.events
