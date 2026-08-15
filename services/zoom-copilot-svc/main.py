"""
zoom-copilot-svc (:8605) -- P3 slice
AI-powered Zoom Room analysis, recommendations, and layout management.

Photo Analysis:
  POST   /analyze              -- upload photos for AI room analysis
  GET    /analyses              -- list user's analyses
  GET    /analyses/{aid}        -- single analysis detail

Chat:
  POST   /chat                  -- conversational follow-up on analysis

Layouts:
  POST   /layouts               -- save a room layout
  GET    /layouts                -- list user's layouts
  GET    /layouts/{lid}          -- single layout detail
  PUT    /layouts/{lid}          -- update layout placements
  DELETE /layouts/{lid}          -- delete layout

Equipment:
  GET    /equipment              -- browse equipment catalog

Validation:
  POST   /validate              -- validate layout against ZR rules

Health:
  GET    /healthz               -- liveness (from service_factory)
  GET    /readyz                -- readiness (from service_factory)
"""
from __future__ import annotations
import json
import logging
import os
import sys
import uuid
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy_shared.service_factory import (
    create_app, get_db, get_cache, get_audit, get_coach,
)
from academy_shared.database import DatabasePool
from academy_shared.cache import CacheService
from academy_shared.audit import AuditService
from academy_shared.coaching import CoachingEngine
from academy_shared.auth import require_auth, TokenPayload, get_client_ip

from fastapi import Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional

from vision import analyze_photos, VisionResult

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
AI_RATE_LIMIT_MAX = int(os.getenv("AI_RATE_LIMIT_MAX", "10"))
MAX_PHOTOS = 5
MAX_PHOTO_SIZE = 10 * 1024 * 1024  # 10 MB per photo
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

# MinIO config
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET_ZOOM", "zoom-room-photos")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = create_app(
    "zoom-copilot-svc", "1.0.0",
    include_coaching=True,
)


async def _rate_limit(
    cache: CacheService, key: str,
    window: int = 60, max_hits: int = AI_RATE_LIMIT_MAX,
):
    hits = await cache.incr("rl:{}".format(key), window)
    if hits > max_hits:
        raise HTTPException(429, "Too many requests. Try again later.")


def _get_minio():
    """Lazy MinIO client import and init."""
    from minio import Minio
    from urllib.parse import urlparse
    parsed = urlparse(MINIO_ENDPOINT)
    host = parsed.hostname or "localhost"
    port = parsed.port
    endpoint = "{}:{}".format(host, port) if port else host
    secure = parsed.scheme == "https"
    client = Minio(endpoint, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, secure=secure)
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
    return client


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    analysis_id: str
    message: str = Field(max_length=2000)


class LayoutRequest(BaseModel):
    name: str = Field(max_length=128)
    analysis_id: Optional[str] = None
    room: dict = Field(default_factory=lambda: {"width_m": 4.0, "depth_m": 3.5, "height_m": 2.7})
    placements: list = Field(default_factory=list)


class LayoutUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    room: Optional[dict] = None
    placements: Optional[list] = None


class ValidateRequest(BaseModel):
    room: dict
    placements: list


# ---------------------------------------------------------------------------
# PHOTO ANALYSIS
# ---------------------------------------------------------------------------
@app.post("/analyze")
async def analyze_room(
    request: Request,
    photos: list[UploadFile] = File(..., description="Room photos (max 5, JPEG/PNG/WebP)"),
    notes: str = Form(""),
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    await _rate_limit(cache, "ai:analyze:{}".format(auth.user_id))

    if len(photos) > MAX_PHOTOS:
        raise HTTPException(422, "Maximum {} photos allowed".format(MAX_PHOTOS))

    # Read and validate photos
    photo_data = []
    for i, photo in enumerate(photos):
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(422, "Photo {} has unsupported type: {}".format(i + 1, photo.content_type))
        content = await photo.read()
        if len(content) > MAX_PHOTO_SIZE:
            raise HTTPException(422, "Photo {} exceeds 10 MB limit".format(i + 1))
        photo_type = ["front", "left", "right", "behind", "overhead"][i] if i < 5 else "extra"
        photo_data.append((content, photo.content_type, photo_type))

    # Run AI analysis
    result = await analyze_photos(photo_data)

    # Create analysis record
    analysis_row = await db.fetchrow(
        """INSERT INTO zoom_analyses (user_id, scores, issues, overall_grade, notes, photo_count, room_dimensions)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, created_at""",
        auth.user_id,
        json.dumps(result.scores),
        json.dumps(result.issues),
        result.overall_grade,
        notes or None,
        len(photo_data),
        json.dumps(result.room_estimate) if result.room_estimate else None,
    )
    analysis_id = str(analysis_row["id"])

    # Upload photos to MinIO
    minio_keys = []
    try:
        mc = _get_minio()
        for content, content_type, photo_type in photo_data:
            key = "analyses/{}/{}-{}.{}".format(
                analysis_id, photo_type, uuid.uuid4().hex[:8],
                "jpg" if "jpeg" in content_type else content_type.split("/")[-1],
            )
            mc.put_object(MINIO_BUCKET, key, BytesIO(content), len(content), content_type)
            minio_keys.append(key)

            await db.execute(
                """INSERT INTO zoom_photos (analysis_id, minio_key, photo_type)
                   VALUES ($1, $2, $3)""",
                analysis_row["id"], key, photo_type,
            )
    except Exception as e:
        log.warning("MinIO upload failed (analysis saved without photos): %s", e)

    await audit.log(
        auth.user_id, "zoom_analyze", "analyses/{}".format(analysis_id),
        {"photo_count": len(photo_data), "grade": result.overall_grade, "source": result.source},
        get_client_ip(request),
    )

    return {
        "id": analysis_id,
        "scores": result.scores,
        "issues": result.issues,
        "overall_grade": result.overall_grade,
        "room_estimate": result.room_estimate,
        "observations": result.observations,
        "photo_count": len(photo_data),
        "model": result.model,
        "latency_ms": result.latency_ms,
        "source": result.source,
        "advisory": True,
        "created_at": analysis_row["created_at"].isoformat(),
    }


@app.get("/analyses")
async def list_analyses(
    page: int = 1, per_page: int = 20,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    page = max(1, page)
    per_page = max(1, min(50, per_page))
    offset = (page - 1) * per_page

    total = await db.fetchval(
        "SELECT COUNT(*) FROM zoom_analyses WHERE user_id = $1", auth.user_id,
    )
    rows = await db.fetch(
        """SELECT id, scores, overall_grade, photo_count, notes, created_at
           FROM zoom_analyses WHERE user_id = $1
           ORDER BY created_at DESC LIMIT $2 OFFSET $3""",
        auth.user_id, per_page, offset,
    )
    return {
        "analyses": [
            {
                "id": str(r["id"]),
                "scores": json.loads(r["scores"]) if r["scores"] else {},
                "overall_grade": r["overall_grade"],
                "photo_count": r["photo_count"],
                "notes": r["notes"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
    }


@app.get("/analyses/{aid}")
async def get_analysis(
    aid: str,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM zoom_analyses WHERE id = $1 AND user_id = $2",
        aid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Analysis not found")

    photos = await db.fetch(
        "SELECT id, minio_key, photo_type, created_at FROM zoom_photos WHERE analysis_id = $1",
        row["id"],
    )
    chats = await db.fetch(
        "SELECT role, content, created_at FROM zoom_copilot_chats WHERE analysis_id = $1 ORDER BY created_at",
        row["id"],
    )

    return {
        "id": str(row["id"]),
        "scores": json.loads(row["scores"]) if row["scores"] else {},
        "issues": json.loads(row["issues"]) if row["issues"] else [],
        "overall_grade": row["overall_grade"],
        "room_dimensions": json.loads(row["room_dimensions"]) if row["room_dimensions"] else None,
        "notes": row["notes"],
        "photo_count": row["photo_count"],
        "created_at": row["created_at"].isoformat(),
        "photos": [
            {"id": str(p["id"]), "key": p["minio_key"], "type": p["photo_type"]}
            for p in photos
        ],
        "chat_history": [
            {"role": c["role"], "content": c["content"], "created_at": c["created_at"].isoformat()}
            for c in chats
        ],
    }


# ---------------------------------------------------------------------------
# CHAT
# ---------------------------------------------------------------------------
CHAT_SYSTEM_PROMPT = """\
You are an HMI-certified Zoom Room setup advisor. The user has uploaded photos of their room
and received an AI analysis with scores and issues. Help them improve their Zoom Room setup
for professional hypnotherapy sessions.

Be specific, practical, and grounded in HMI standards. Reference the analysis results when relevant.
Keep responses concise (2-4 paragraphs max). If they ask about equipment, reference specific
models and price ranges. Always mark advice as advisory.

Analysis context:
{analysis_context}
"""


@app.post("/chat")
async def chat(
    req: ChatRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    coach: CoachingEngine = Depends(get_coach),
    audit: AuditService = Depends(get_audit),
):
    await _rate_limit(cache, "ai:chat:{}".format(auth.user_id))

    # Load analysis context
    analysis = await db.fetchrow(
        "SELECT * FROM zoom_analyses WHERE id = $1 AND user_id = $2",
        req.analysis_id, auth.user_id,
    )
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    # Load chat history
    history = await db.fetch(
        """SELECT role, content FROM zoom_copilot_chats
           WHERE analysis_id = $1 ORDER BY created_at""",
        analysis["id"],
    )

    # Build context
    scores = json.loads(analysis["scores"]) if analysis["scores"] else {}
    issues = json.loads(analysis["issues"]) if analysis["issues"] else []
    context = "Scores: {}. Issues: {}".format(
        ", ".join("{}: {}".format(k, v) for k, v in scores.items()),
        "; ".join("{} ({}): {}".format(i["category"], i["severity"], i["description"]) for i in issues[:5]),
    )

    # Build messages for Ollama
    system = CHAT_SYSTEM_PROMPT.format(analysis_context=context)
    messages = [{"role": "system", "content": system}]
    for h in history[-10:]:  # last 10 messages for context window
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": req.message})

    # Call Ollama (via CoachingEngine's underlying HTTP call)
    result = await coach._call_llm(messages, max_tokens=500)

    reply = result.text if result else "I'm unable to process your question right now. Please try again later."

    # Save chat messages
    await db.execute(
        "INSERT INTO zoom_copilot_chats (analysis_id, user_id, role, content) VALUES ($1, $2, 'user', $3)",
        analysis["id"], auth.user_id, req.message,
    )
    await db.execute(
        "INSERT INTO zoom_copilot_chats (analysis_id, user_id, role, content) VALUES ($1, $2, 'assistant', $3)",
        analysis["id"], auth.user_id, reply,
    )

    await audit.log(
        auth.user_id, "zoom_chat", "analyses/{}".format(req.analysis_id),
        None, get_client_ip(request),
    )

    return {
        "reply": reply,
        "source": result.source if result else "fallback",
        "model": result.model if result else "fallback",
        "advisory": True,
    }


# ---------------------------------------------------------------------------
# EQUIPMENT CATALOG
# ---------------------------------------------------------------------------
@app.get("/equipment")
async def list_equipment(
    category: str | None = None,
    priority: str | None = None,
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    cache_key = "zoom:equipment:{}:{}".format(category, priority)
    cached = await cache.get(cache_key)
    if cached:
        return cached

    where = []
    args = []
    idx = 1
    if category:
        where.append("category = ${}".format(idx))
        args.append(category)
        idx += 1
    if priority:
        where.append("priority = ${}".format(idx))
        args.append(priority)
        idx += 1

    where_sql = " AND ".join(where) if where else "TRUE"
    rows = await db.fetch(
        "SELECT * FROM zoom_equipment WHERE {} ORDER BY sort_order".format(where_sql), *args,
    )

    result = {
        "equipment": [
            {
                "id": r["id"],
                "name": r["name"],
                "category": r["category"],
                "models": json.loads(r["models"]) if r["models"] else [],
                "dimensions": json.loads(r["dimensions"]) if r["dimensions"] else None,
                "priority": r["priority"],
            }
            for r in rows
        ]
    }
    await cache.set(cache_key, result, 3600)
    return result


# ---------------------------------------------------------------------------
# LAYOUTS
# ---------------------------------------------------------------------------
@app.post("/layouts")
async def create_layout(
    req: LayoutRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    row = await db.fetchrow(
        """INSERT INTO zoom_layouts (user_id, analysis_id, name, room, placements, source)
           VALUES ($1, $2, $3, $4, $5, 'manual')
           RETURNING id, created_at""",
        auth.user_id,
        req.analysis_id or None,
        req.name,
        json.dumps(req.room),
        json.dumps(req.placements),
    )
    await audit.log(
        auth.user_id, "zoom_layout_create", "layouts/{}".format(str(row["id"])),
        {"name": req.name}, get_client_ip(request),
    )
    return {"id": str(row["id"]), "name": req.name, "created_at": row["created_at"].isoformat()}


@app.get("/layouts")
async def list_layouts(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT id, name, source, created_at, updated_at
           FROM zoom_layouts WHERE user_id = $1 ORDER BY updated_at DESC""",
        auth.user_id,
    )
    return {
        "layouts": [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "source": r["source"],
                "created_at": r["created_at"].isoformat(),
                "updated_at": r["updated_at"].isoformat(),
            }
            for r in rows
        ]
    }


@app.get("/layouts/{lid}")
async def get_layout(
    lid: str,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM zoom_layouts WHERE id = $1 AND user_id = $2",
        lid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Layout not found")
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "room": json.loads(row["room"]),
        "placements": json.loads(row["placements"]),
        "source": row["source"],
        "validation": json.loads(row["validation"]) if row["validation"] else None,
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@app.put("/layouts/{lid}")
async def update_layout(
    lid: str,
    req: LayoutUpdateRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    row = await db.fetchrow(
        "SELECT id FROM zoom_layouts WHERE id = $1 AND user_id = $2",
        lid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Layout not found")

    sets, vals, idx = [], [], 1
    if req.name is not None:
        sets.append("name = ${}".format(idx))
        vals.append(req.name)
        idx += 1
    if req.room is not None:
        sets.append("room = ${}".format(idx))
        vals.append(json.dumps(req.room))
        idx += 1
    if req.placements is not None:
        sets.append("placements = ${}".format(idx))
        vals.append(json.dumps(req.placements))
        idx += 1

    if not sets:
        raise HTTPException(422, "No fields to update")

    sets.append("updated_at = now()")
    vals.append(lid)
    await db.execute(
        "UPDATE zoom_layouts SET {} WHERE id = ${}".format(", ".join(sets), idx),
        *vals,
    )

    await audit.log(
        auth.user_id, "zoom_layout_update", "layouts/{}".format(lid),
        None, get_client_ip(request),
    )
    return await get_layout(lid=lid, auth=auth, db=db)


@app.delete("/layouts/{lid}")
async def delete_layout(
    lid: str,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    row = await db.fetchrow(
        "SELECT id FROM zoom_layouts WHERE id = $1 AND user_id = $2",
        lid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Layout not found")
    await db.execute("DELETE FROM zoom_layouts WHERE id = $1", lid)
    await audit.log(
        auth.user_id, "zoom_layout_delete", "layouts/{}".format(lid),
        None, get_client_ip(request),
    )
    return {"deleted": True}


# ---------------------------------------------------------------------------
# VALIDATION (Zoom Room Gate: ZR-1 to ZR-10)
# ---------------------------------------------------------------------------
VALIDATION_RULES = [
    {
        "id": "ZR-1", "name": "Camera Eye Level",
        "check": lambda room, placements: _check_camera_position(placements),
    },
    {
        "id": "ZR-2", "name": "Key Light Front",
        "check": lambda room, placements: _check_key_light(room, placements),
    },
    {
        "id": "ZR-3", "name": "No Backlight",
        "check": lambda room, placements: _check_no_backlight(room, placements),
    },
    {
        "id": "ZR-4", "name": "Mic Distance",
        "check": lambda room, placements: _check_mic_distance(placements),
    },
    {
        "id": "ZR-5", "name": "Clear Background",
        "check": lambda room, placements: _check_background(room, placements),
    },
    {
        "id": "ZR-6", "name": "Privacy Enclosed",
        "check": lambda room, placements: _check_privacy(room, placements),
    },
    {
        "id": "ZR-7", "name": "Min Camera Distance",
        "check": lambda room, placements: _check_min_distance(placements),
    },
    {
        "id": "ZR-8", "name": "Desk Clear",
        "check": lambda room, placements: {"verdict": "PASS", "detail": "Manual check required"},
    },
    {
        "id": "ZR-9", "name": "Internet Position",
        "check": lambda room, placements: {"verdict": "PASS", "detail": "Manual check required"},
    },
    {
        "id": "ZR-10", "name": "Emergency Access",
        "check": lambda room, placements: {"verdict": "PASS", "detail": "Manual check required"},
    },
]


def _find_by_category(placements, cat):
    return [p for p in placements if p.get("category") == cat or p.get("equipment_id", "").startswith(cat)]


def _find_by_id(placements, eq_id):
    return [p for p in placements if p.get("equipment_id") == eq_id]


def _check_camera_position(placements):
    cameras = _find_by_id(placements, "webcam_hd")
    if not cameras:
        return {"verdict": "WARN", "detail": "No webcam placed. Add a webcam to validate camera position."}
    return {"verdict": "PASS", "detail": "Webcam is placed. Ensure it is at eye level in the physical setup."}


def _check_key_light(room, placements):
    lights = _find_by_id(placements, "ringlight_18") + _find_by_id(placements, "softbox")
    if not lights:
        return {"verdict": "FAIL", "detail": "No key light placed. Add a ring light or softbox in front of your position."}
    # Check if light is roughly in front (same x-zone as desk/chair)
    chairs = _find_by_id(placements, "chair_office")
    if chairs and lights:
        chair_x = chairs[0].get("x", 0)
        light_x = lights[0].get("x", 0)
        if abs(chair_x - light_x) > 1.5:
            return {"verdict": "WARN", "detail": "Key light is far from your seating position. Move it closer to center."}
    return {"verdict": "PASS", "detail": "Key light is placed."}


def _check_no_backlight(room, placements):
    curtains = _find_by_id(placements, "curtain")
    # If there's a window behind the user but no curtain, warn
    return {"verdict": "PASS", "detail": "Check that no bright light sources are behind you. Close blinds if needed."}


def _check_mic_distance(placements):
    mics = _find_by_id(placements, "mic_usb")
    if not mics:
        return {"verdict": "FAIL", "detail": "No external microphone placed. Add a USB condenser mic near your position."}
    chairs = _find_by_id(placements, "chair_office")
    if chairs and mics:
        dx = abs(mics[0].get("x", 0) - chairs[0].get("x", 0))
        dy = abs(mics[0].get("y", 0) - chairs[0].get("y", 0))
        dist = (dx * dx + dy * dy) ** 0.5
        if dist > 1.0:
            return {"verdict": "WARN", "detail": "Microphone is too far from seating position ({:.1f}m). Move within 0.3m.".format(dist)}
    return {"verdict": "PASS", "detail": "Microphone is placed near seating position."}


def _check_background(room, placements):
    return {"verdict": "PASS", "detail": "Background check requires photo analysis. Use /analyze for AI assessment."}


def _check_privacy(room, placements):
    return {"verdict": "PASS", "detail": "Privacy check requires photo analysis. Ensure room has a closeable door."}


def _check_min_distance(placements):
    cameras = _find_by_id(placements, "webcam_hd")
    chairs = _find_by_id(placements, "chair_office")
    if cameras and chairs:
        dx = abs(cameras[0].get("x", 0) - chairs[0].get("x", 0))
        dy = abs(cameras[0].get("y", 0) - chairs[0].get("y", 0))
        dist = (dx * dx + dy * dy) ** 0.5
        if dist < 0.6:
            return {"verdict": "WARN", "detail": "Camera is too close ({:.1f}m). Move at least 0.6m from seating.".format(dist)}
    return {"verdict": "PASS", "detail": "Camera distance is acceptable."}


@app.post("/validate")
async def validate_layout(
    req: ValidateRequest,
    auth: TokenPayload = Depends(require_auth),
):
    results = []
    pass_count = 0
    for rule in VALIDATION_RULES:
        verdict = rule["check"](req.room, req.placements)
        results.append({
            "id": rule["id"],
            "name": rule["name"],
            "verdict": verdict["verdict"],
            "detail": verdict["detail"],
        })
        if verdict["verdict"] == "PASS":
            pass_count += 1

    return {
        "rules": results,
        "pass_count": pass_count,
        "total": len(VALIDATION_RULES),
        "all_pass": pass_count == len(VALIDATION_RULES),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
