"""12-factor configuration for academy services.

Secrets (DB URL, JWT key) are REQUIRED from environment -- no hardcoded
defaults.  In development mode (ACADEMY_ENV=development), insecure
placeholder values emit a warning; in staging/production they cause an
immediate startup failure.
"""
from __future__ import annotations
import logging
import os

log = logging.getLogger(__name__)

_INSECURE_SECRETS = frozenset({
    "academy-dev-secret-change-me", "change-me", "secret", "test",
    "dev-secret", "changeme", "password",
})


def _require_secret(name: str, *alt_names: str) -> str:
    """Read a required secret from environment.  Fails fast if missing."""
    for n in (name,) + alt_names:
        val = os.getenv(n)
        if val:
            if val.lower() in _INSECURE_SECRETS:
                env = os.getenv("ACADEMY_ENV", "development").lower()
                if env not in ("development", "dev", "test"):
                    raise RuntimeError(
                        "FATAL: {} uses an insecure default value. "
                        "Set a strong secret for {} environments.".format(n, env)
                    )
                log.warning(
                    "SECURITY: %s is using an insecure default. "
                    "Change before deploying to staging/production.", n,
                )
            return val
    raise RuntimeError(
        "Required environment variable {} is not set. "
        "Add it to .env or export before starting.".format(name)
    )


class AcademyConfig:
    """Immutable configuration loaded from environment variables."""

    __slots__ = (
        "environment",
        "db_url", "db_min_pool", "db_max_pool", "db_timeout", "db_ssl",
        "redis_url",
        "jwt_secret", "jwt_algorithm", "access_token_minutes", "refresh_token_days",
        "ollama_url", "coach_model", "coach_timeout",
        "kafka_enabled", "kafka_servers",
        "cors_origins", "cors_methods", "cors_headers",
        "body_max_bytes",
        "docs_enabled",
        "service_name", "service_version",
    )

    def __init__(
        self,
        db_url: str = "",
        redis_url: str = "",
        jwt_secret: str = "",
        ollama_url: str = "",
        coach_model: str = "",
        cors_origins: str = "",
        service_name: str = "academy",
        service_version: str = "1.0.0",
        **_kw,
    ):
        self.environment = os.getenv("ACADEMY_ENV", "development").lower()

        # -- secrets: required, no hardcoded defaults --------------------------
        self.db_url = db_url or _require_secret("ACADEMY_DB_URL")
        self.jwt_secret = jwt_secret or _require_secret("JWT_SECRET_KEY", "JWT_SECRET")

        # -- database pool -----------------------------------------------------
        self.db_min_pool = int(os.getenv("DB_MIN_POOL", "2"))
        self.db_max_pool = int(os.getenv("DB_MAX_POOL", "10"))
        self.db_timeout = int(os.getenv("DB_TIMEOUT", "15"))
        self.db_ssl = os.getenv("DB_SSL", "false").lower() in ("true", "1", "yes")

        # -- cache -------------------------------------------------------------
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/3")

        # -- JWT ---------------------------------------------------------------
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_minutes = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
        self.refresh_token_days = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))

        # -- AI / coaching -----------------------------------------------------
        self.ollama_url = ollama_url or os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.coach_model = coach_model or os.getenv(
            "COACH_MODEL", os.getenv("OLLAMA_DEFAULT_MODEL", "gemma3:4b"),
        )
        self.coach_timeout = float(os.getenv("COACH_TIMEOUT", "15"))

        # -- events ------------------------------------------------------------
        self.kafka_enabled = os.getenv("KAFKA_ENABLED", "false").lower() == "true"
        self.kafka_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")

        # -- HTTP security -----------------------------------------------------
        self.cors_origins = (
            cors_origins or os.getenv("CORS_ORIGINS", "http://localhost:3070")
        ).split(",")
        self.cors_methods = os.getenv(
            "CORS_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        ).split(",")
        self.cors_headers = os.getenv(
            "CORS_HEADERS", "Authorization,Content-Type,X-Request-ID",
        ).split(",")
        self.body_max_bytes = int(os.getenv("BODY_MAX_BYTES", str(1024 * 1024)))
        self.docs_enabled = self.environment in ("development", "dev", "test")

        self.service_name = service_name
        self.service_version = service_version

    @classmethod
    def from_env(cls, service_name: str = "academy", version: str = "1.0.0") -> AcademyConfig:
        return cls(service_name=service_name, service_version=version)
