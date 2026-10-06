"""
academy-builder-svc (:8606) -- Builder Studio
Context-aware Claude API assistant + document generation + session automation.

Endpoints:
  POST /api/v1/chat              - Chat with Claude (context-aware, session persistence)
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
  GET  /healthz                  - Liveness
  GET  /readyz                   - Readiness
"""
from __future__ import annotations
import json
import os
import sys
import uuid
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy_shared.service_factory import create_app, get_db
from academy_shared.database import DatabasePool

from fastapi import Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from storage import PostgresStorage, MinioStorage
from claude_engine import ClaudeEngine

# Add scripts dir to path for doc generator
SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = create_app("academy-builder-svc", "1.0.0")

# Globals initialized in startup
pg_storage: PostgresStorage = None
minio_storage: MinioStorage = None
claude: ClaudeEngine = None


@app.on_event("startup")
async def startup():
    global pg_storage, minio_storage, claude

    db = get_db()
    if db and db.pool:
        pg_storage = PostgresStorage(db.pool)

    # MinIO (optional)
    minio_endpoint = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    minio_user = os.getenv("MINIO_ROOT_USER", "")
    minio_pass = os.getenv("MINIO_ROOT_PASSWORD", "")
    if minio_user and minio_pass:
        try:
            minio_storage = MinioStorage(minio_endpoint, minio_user, minio_pass, "builder-studio")
        except Exception as e:
            print("MinIO not available: {}".format(e))

    # Claude API (optional - works without it for doc generation)
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            claude = ClaudeEngine(api_key)
        except Exception as e:
            print("Claude API not available: {}".format(e))


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
# Chat endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/chat")
async def chat_endpoint(req: ChatRequest):
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


@app.get("/api/v1/sessions")
async def list_sessions(limit: int = 20):
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    return await pg_storage.list_sessions(limit=limit)


@app.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str):
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    return await pg_storage.load_session(session_id)


@app.delete("/api/v1/sessions/{session_id}")
async def delete_session(session_id: str):
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
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    return await pg_storage.list_context_files()


@app.put("/api/v1/context-files")
async def put_context_file(req: ContextFileRequest):
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    await pg_storage.put_context_file(req.filename, req.content, req.category)
    return {"filename": req.filename, "status": "saved"}


# ---------------------------------------------------------------------------
# Client data endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/clients")
async def store_client(req: ClientDataRequest):
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    async with pg_storage.pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO builder_clients (client_id, data, updated_at)
               VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
               ON CONFLICT (client_id) DO UPDATE
               SET data = $2::jsonb, updated_at = CURRENT_TIMESTAMP""",
            req.client_id, json.dumps(req.data),
        )
    return {"client_id": req.client_id, "status": "saved"}


@app.get("/api/v1/clients/{client_id}")
async def get_client(client_id: str):
    if not pg_storage:
        raise HTTPException(503, "Database not available.")
    async with pg_storage.pool.acquire() as conn:
        row = await conn.fetchrow(
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
    """Generate all 4 client documents. Returns HTML content (and optionally uploads to MinIO)."""
    try:
        from generate_client_docs import gen_avs, gen_treatment_plan, gen_sb577, gen_recording_consent
    except ImportError:
        raise HTTPException(500, "Document generator not found. Check scripts/ path.")

    client = req.client_data
    docs = {}

    try:
        docs["avs"] = gen_avs(client, req.session_index)
        docs["treatment_plan"] = gen_treatment_plan(client)
        docs["sb577"] = gen_sb577(client)
        docs["recording_consent"] = gen_recording_consent(client)
    except Exception as e:
        raise HTTPException(422, "Document generation failed: {}".format(e))

    result = {"documents": {}}
    for doc_type, html in docs.items():
        entry = {"html": html}

        # Upload to MinIO if requested
        if req.output_to_minio and minio_storage:
            cid = client.get("id", "unknown")
            key = "client-documents/{}/{}".format(cid, doc_type)
            minio_storage.upload_file(
                "{}.html".format(key), html.encode("utf-8"), "text/html"
            )
            entry["minio_key"] = "{}.html".format(key)

        result["documents"][doc_type] = entry

    return result


# ---------------------------------------------------------------------------
# AI-powered workflow endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/intake-to-plan")
async def intake_to_plan(req: IntakeRequest):
    """Generate treatment plan from intake data using Claude."""
    if not claude:
        raise HTTPException(503, "Claude API not configured.")
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    try:
        from session_prep import build_intake_prompt
    except ImportError:
        raise HTTPException(500, "Session prep module not found.")

    prompt = build_intake_prompt(req.client_data)
    result = await claude.generate_structured(
        prompt=prompt, storage=pg_storage, model=req.model or None
    )
    return result


@app.post("/api/v1/post-session")
async def post_session(req: PostSessionRequest):
    """Generate post-session docs (AVS + email) from SOAP notes using Claude."""
    if not claude:
        raise HTTPException(503, "Claude API not configured.")
    if not pg_storage:
        raise HTTPException(503, "Database not available.")

    try:
        from session_prep import build_post_session_prompt
    except ImportError:
        raise HTTPException(500, "Session prep module not found.")

    prompt = build_post_session_prompt(req.client_data, req.session_num, req.soap)
    result = await claude.generate_structured(
        prompt=prompt, storage=pg_storage, model=req.model or None
    )
    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8606"))
    uvicorn.run(app, host="0.0.0.0", port=port)
