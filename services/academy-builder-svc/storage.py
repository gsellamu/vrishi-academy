"""
Storage adapters for Builder Studio.
Supports Postgres (workspace files + sessions) and MinIO (documents + context).
"""
from __future__ import annotations
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional

log = logging.getLogger("builder.storage")


class StorageAdapter(ABC):
    """Unified contract for context files and session persistence."""

    @abstractmethod
    async def get_context_file(self, filename: str) -> str:
        pass

    @abstractmethod
    async def list_context_files(self) -> list:
        pass

    @abstractmethod
    async def put_context_file(self, filename: str, content: str, category: str = "context") -> None:
        pass

    @abstractmethod
    async def load_session(self, session_id: str) -> dict:
        pass

    @abstractmethod
    async def save_session(self, session_id: str, messages: list, title: str = "", model: str = "", token_count: int = 0) -> None:
        pass

    @abstractmethod
    async def list_sessions(self, user_id: int = None, limit: int = 20) -> list:
        pass

    @abstractmethod
    async def delete_session(self, session_id: str) -> bool:
        pass


class PostgresStorage(StorageAdapter):
    """Stores workspace docs and sessions in Postgres (academy DB)."""

    def __init__(self, pool):
        self.pool = pool

    async def get_context_file(self, filename: str) -> str:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT content FROM builder_workspace_files WHERE filename = $1",
                filename,
            )
            return row["content"] if row else ""

    async def list_context_files(self) -> list:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT filename, category, updated_at FROM builder_workspace_files ORDER BY filename"
            )
            return [dict(r) for r in rows]

    async def put_context_file(self, filename: str, content: str, category: str = "context") -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO builder_workspace_files (filename, content, category, updated_at)
                   VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                   ON CONFLICT (filename) DO UPDATE
                   SET content = $2, category = $3, updated_at = CURRENT_TIMESTAMP""",
                filename, content, category,
            )

    async def load_session(self, session_id: str) -> dict:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT session_id, title, messages, model, token_count, created_at, updated_at "
                "FROM builder_sessions WHERE session_id = $1",
                session_id,
            )
            if not row:
                return {"session_id": session_id, "messages": [], "title": "", "model": "", "token_count": 0}
            result = dict(row)
            if isinstance(result["messages"], str):
                result["messages"] = json.loads(result["messages"])
            return result

    async def save_session(self, session_id: str, messages: list, title: str = "", model: str = "", token_count: int = 0) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO builder_sessions (session_id, messages, title, model, token_count, updated_at)
                   VALUES ($1, $2::jsonb, $3, $4, $5, CURRENT_TIMESTAMP)
                   ON CONFLICT (session_id) DO UPDATE
                   SET messages = $2::jsonb, title = COALESCE(NULLIF($3, ''), builder_sessions.title),
                       model = COALESCE(NULLIF($4, ''), builder_sessions.model),
                       token_count = $5, updated_at = CURRENT_TIMESTAMP""",
                session_id, json.dumps(messages), title, model, token_count,
            )

    async def list_sessions(self, user_id: int = None, limit: int = 20) -> list:
        async with self.pool.acquire() as conn:
            if user_id:
                rows = await conn.fetch(
                    "SELECT session_id, title, model, token_count, created_at, updated_at "
                    "FROM builder_sessions WHERE user_id = $1 "
                    "ORDER BY updated_at DESC LIMIT $2",
                    user_id, limit,
                )
            else:
                rows = await conn.fetch(
                    "SELECT session_id, title, model, token_count, created_at, updated_at "
                    "FROM builder_sessions ORDER BY updated_at DESC LIMIT $1",
                    limit,
                )
            return [dict(r) for r in rows]

    async def delete_session(self, session_id: str) -> bool:
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM builder_sessions WHERE session_id = $1", session_id
            )
            return "DELETE 1" in result


class MinioStorage:
    """Handles document storage in MinIO (S3-compatible)."""

    def __init__(self, endpoint: str, access_key: str, secret_key: str, bucket: str):
        import boto3
        self.s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )
        self.bucket = bucket
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.s3.create_bucket(Bucket=self.bucket)
                log.info("Created MinIO bucket: %s", self.bucket)
            except Exception as e:
                log.warning("Could not create bucket %s: %s", self.bucket, e)

    def upload_file(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=content, ContentType=content_type)
        return key

    def download_file(self, key: str) -> bytes:
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def list_files(self, prefix: str = "") -> list:
        response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        return [obj["Key"] for obj in response.get("Contents", [])]

    def delete_file(self, key: str) -> bool:
        self.s3.delete_object(Bucket=self.bucket, Key=key)
        return True
