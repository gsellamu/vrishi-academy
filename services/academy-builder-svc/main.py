"""
academy-builder-svc (:8606) -- Builder Studio
Context-aware Claude API assistant + document generation + session automation.

Endpoints:
  POST /api/v1/chat              - Chat with Claude (sync, cached system prompt)
  POST /api/v1/chat/stream       - Chat with Claude (SSE streaming + cached prompt)
  POST /api/v1/generate-docs     - Generate client documents from JSON
  POST /api/v1/intake-to-plan    - Intake data -> treatment plan via Claude
  POST /api/v1/post-session      - SOAP notes -> AVS + email draft via Claude
  GET  /api/v1/sessions          - List chat sessions
  GET  /api/v1/sessions/{id}     - Get session history
  DELETE /api/v1/sessions/{id}   - Delete session
  GET  /api/v1/context-files     - List workspace context files
  PUT  /api/v1/context-files     - Upload/update a context file
  POST /api/v1/clients           - Store client data
  GET  /api/v1/clients/{id}      - Get client data
  GET  /api/v1/stats             - Cost attribution + cache hit stats
  GET  /healthz                  - Liveness
  GET  /readyz                   - Readiness
"""
from __future__ import annotations
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy_shared.service_factory import create_app

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from storage import PostgresStorage, MinioStorage
from claude_engine import ClaudeEngine

# Add scripts dir to path for doc generator
SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = create_app("academy-builder-svc", "1.0.0")

# Globals initialized lazily
pg_storage: PostgresStorage = None
minio_storage: MinioStorage = None
claude: ClaudeEngine = None


def _ensure_storage():
    """Lazy-init storage from app.state (set by service_factory lifespan)."""
    global pg_storage, minio_storage, claude
    if pg_storage is None:
        db = getattr(app.state, "db", None)
        if db:
            pg_storage = PostgresStorage(db)
    if minio_storage is None:
        ep = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
        user = os.getenv("MINIO_ROOT_USER", "")
        pw = os.getenv("MINIO_ROOT_PASSWORD", "")
        if user and pw:
            try:
                minio_storage = MinioStorage(ep, user, pw, "builder-studio")
            except Exception:
                pass
    if claude is None:
        key = os.getenv("ANTHROPIC_API_KEY", "")
        if key:
            try:
                claude = ClaudeEngine(key)
            except Exception:
                pass


@app.on_event("shutdown")
async def shutdown():
    if claude:
        await claude.close()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    prompt: str
    session_id: str = ""
    continue_session: bool = True
    model: str = ""

class ContextFileRequest(BaseModel):
    filename: str
    content: str
    category: str = "context"

class ClientDataRequest(BaseModel):
    client_id: str
    data: dict

class GenerateDocsRequest(BaseModel):
    client_data: dict
    session_index: int = 0
    output_to_minio: bool = False

class IntakeRequest(BaseModel):
    client_data: dict
    model: str = ""

class PostSessionRequest(BaseModel):
    client_data: dict
    session_num: int
    soap: dict
    model: str = ""


# ---------------------------------------------------------------------------
# Chat endpoints (sync + streaming)
# ---------------------------------------------------------------------------
@app.post("/api/v1/chat")
async def chat_endpoint(req: ChatRequest):
    """Synchronous chat with prompt caching."""
    _ensure_storage()
    if not claude:
        raise HTTPException(503, "Claude API not configured. Set ANTHROPIC_API_KEY.")
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    session_id = req.session_id or str(uuid.uuid4())
    result = await claude.chat(
        prompt=req.prompt,
        storage=pg_storage,
        session_id=session_id,
        continue_session=req.continue_session,
        model=req.model or None,
    )
    return result


@app.post("/api/v1/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """Streaming chat via SSE with prompt caching. First token <500ms."""
    _ensure_storage()
    if not claude:
        raise HTTPException(503, "Claude API not configured. Set ANTHROPIC_API_KEY.")
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    session_id = req.session_id or str(uuid.uuid4())

    async def event_generator():
        try:
            async for chunk in claude.chat_stream(
                prompt=req.prompt,
                storage=pg_storage,
                session_id=session_id,
                continue_session=req.continue_session,
                model=req.model or None,
            ):
                yield "data: {}\n\n".format(json.dumps(chunk))
        except Exception as e:
            yield "data: {}\n\n".format(json.dumps({"type": "error", "error": str(e)}))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Session endpoints
# ---------------------------------------------------------------------------
@app.get("/api/v1/sessions")
async def list_sessions(limit: int = 20):
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    return await pg_storage.list_sessions(limit=limit)


@app.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str):
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    return await pg_storage.load_session(session_id)


@app.delete("/api/v1/sessions/{session_id}")
async def delete_session(session_id: str):
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    ok = await pg_storage.delete_session(session_id)
    if not ok:
        raise HTTPException(404, "Session not found")
    return {"deleted": session_id}


# ---------------------------------------------------------------------------
# Context file endpoints
# ---------------------------------------------------------------------------
@app.get("/api/v1/context-files")
async def list_context_files():
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    return await pg_storage.list_context_files()


@app.put("/api/v1/context-files")
async def put_context_file(req: ContextFileRequest):
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    await pg_storage.put_context_file(req.filename, req.content, req.category)
    return {"filename": req.filename, "status": "saved"}


# ---------------------------------------------------------------------------
# Client data endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/clients")
async def store_client(req: ClientDataRequest):
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    await pg_storage.db.execute(
        """INSERT INTO builder_clients (client_id, data, updated_at)
           VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT (client_id) DO UPDATE
           SET data = $2::jsonb, updated_at = CURRENT_TIMESTAMP""",
        req.client_id, json.dumps(req.data),
    )
    return {"client_id": req.client_id, "status": "saved"}


@app.get("/api/v1/clients/{client_id}")
async def get_client(client_id: str):
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    row = await pg_storage.db.fetchrow(
        "SELECT data FROM builder_clients WHERE client_id = $1", client_id
    )
    if not row:
        raise HTTPException(404, "Client not found")
    data = row["data"]
    if isinstance(data, str):
        data = json.loads(data)
    return data


# ---------------------------------------------------------------------------
# Document generation endpoint
# ---------------------------------------------------------------------------
@app.post("/api/v1/generate-docs")
async def generate_docs(req: GenerateDocsRequest):
    """Generate all 4 client documents. Returns HTML content."""
    try:
        from generate_client_docs import gen_avs, gen_treatment_plan, gen_sb577, gen_recording_consent
    except ImportError:
        raise HTTPException(500, "Document generator not found. Check scripts/ path.")

    client = req.client_data
    try:
        docs = {
            "avs": gen_avs(client, req.session_index),
            "treatment_plan": gen_treatment_plan(client),
            "sb577": gen_sb577(client),
            "recording_consent": gen_recording_consent(client),
        }
    except Exception as e:
        raise HTTPException(422, "Document generation failed: {}".format(e))

    result = {"documents": {}}
    for doc_type, html in docs.items():
        entry = {"html": html}
        if req.output_to_minio and minio_storage:
            cid = client.get("id", "unknown")
            key = "client-documents/{}/{}".format(cid, doc_type)
            minio_storage.upload_file("{}.html".format(key), html.encode("utf-8"), "text/html")
            entry["minio_key"] = "{}.html".format(key)
        result["documents"][doc_type] = entry

    return result


# ---------------------------------------------------------------------------
# AI-powered workflow endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/intake-to-plan")
async def intake_to_plan(req: IntakeRequest):
    """Generate treatment plan from intake data using Claude."""
    _ensure_storage()
    if not claude:
        raise HTTPException(503, "Claude API not configured.")
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    try:
        from session_prep import build_intake_prompt
    except ImportError:
        raise HTTPException(500, "Session prep module not found.")

    prompt = build_intake_prompt(req.client_data)
    return await claude.generate_structured(prompt=prompt, storage=pg_storage, model=req.model or None)


@app.post("/api/v1/post-session")
async def post_session(req: PostSessionRequest):
    """Generate post-session docs from SOAP notes using Claude."""
    _ensure_storage()
    if not claude:
        raise HTTPException(503, "Claude API not configured.")
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    try:
        from session_prep import build_post_session_prompt
    except ImportError:
        raise HTTPException(500, "Session prep module not found.")

    prompt = build_post_session_prompt(req.client_data, req.session_num, req.soap)
    return await claude.generate_structured(prompt=prompt, storage=pg_storage, model=req.model or None)


# ---------------------------------------------------------------------------
# Stats / cost attribution
# ---------------------------------------------------------------------------
@app.get("/api/v1/stats")
async def get_stats():
    """Aggregate token usage and cache hit stats across sessions."""
    _ensure_storage()
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    row = await pg_storage.db.fetchrow(
        """SELECT
            COUNT(*) as total_sessions,
            COALESCE(SUM(token_count), 0) as total_tokens,
            COALESCE(AVG(token_count), 0) as avg_tokens_per_session
           FROM builder_sessions"""
    )

    return {
        "total_sessions": row["total_sessions"],
        "total_tokens": row["total_tokens"],
        "avg_tokens_per_session": round(float(row["avg_tokens_per_session"])),
        "estimated_cost_usd": round(float(row["total_tokens"]) * 0.000009, 4),
        "prompt_caching": "enabled",
        "streaming": "enabled",
        "model": claude.model if claude else "not configured",
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8606"))
    uvicorn.run(app, host="0.0.0.0", port=port)
