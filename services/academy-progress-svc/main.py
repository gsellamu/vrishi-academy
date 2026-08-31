"""
academy-progress-svc (:8603) -- P2 slice
Persistent drill history, session logs, gap tracking, analytics, and AI coaching.

Cloud-ready: lifespan, structured logging, DI, /healthz + /readyz.

Drill CRUD:
  POST   /drills              -- save drill attempt + optional AI debrief
  GET    /drills              -- list attempts (paginated, filtered)
  GET    /drills/stats        -- per-drill aggregates
  GET    /drills/heatmap      -- daily attempt counts (90 days)
  GET    /drills/weak-areas   -- bottom checklist items by miss rate

Session CRUD:
  POST   /sessions            -- save session run (with turns)
  GET    /sessions            -- list runs (paginated)
  GET    /sessions/stats      -- per-plan aggregates  (MUST be before /{sid})
  GET    /sessions/{sid}      -- full session with turn data
  GET    /sessions/{sid}/replay -- turn-by-turn replay

Gap tracker:
  GET    /gap                 -- current gap progress
  PUT    /gap                 -- update gap values (with audit trail)
  GET    /gap/history         -- change audit trail
  GET    /gap/pace            -- AI-powered pace analysis

Analytics:
  GET    /analytics/dashboard -- comprehensive user stats
  GET    /analytics/trends    -- score trends over time

AI Coaching:
  POST   /ai/drill-debrief   -- AI coaching after drill
  POST   /ai/session-debrief -- AI coaching after session
  POST   /ai/study-plan      -- AI weekly study plan
  POST   /ai/weak-areas      -- AI analysis of weak areas

Preferences:
  GET    /preferences         -- user preferences
  PUT    /preferences         -- update preferences

CSP (Community Service Program):
  POST   /csp/intakes           -- submit intake form (public, no auth)
  GET    /csp/intakes           -- list intake submissions (auth)
  PUT    /csp/intakes/{id}/status -- update intake status (auth)
  GET    /csp/clients           -- list practitioner's clients (auth)
  POST   /csp/clients           -- add a client (auth)
  PUT    /csp/clients/{id}      -- update client fields (auth)
  GET    /csp/conferences       -- list conferences (auth)
  POST   /csp/conferences       -- add a conference (auth)

Health:
  GET    /healthz             -- liveness (from service_factory)
  GET    /readyz              -- readiness (from service_factory)
  GET    /health              -- readiness alias (from service_factory)
"""
from __future__ import annotations
import os, sys, json, math
from datetime import datetime, date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy_shared.service_factory import (
    create_app, get_db, get_cache, get_audit, get_coach, get_events,
)
from academy_shared.database import DatabasePool
from academy_shared.cache import CacheService
from academy_shared.audit import AuditService
from academy_shared.coaching import CoachingEngine
from academy_shared.events import EventBus
from academy_shared.auth import require_auth, TokenPayload, get_client_ip

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# App + rate limiting
# ---------------------------------------------------------------------------
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "30"))
AI_RATE_LIMIT_MAX = int(os.getenv("AI_RATE_LIMIT_MAX", "10"))

app = create_app(
    "academy-progress-svc", "1.0.0",
    include_coaching=True,
    include_events=True,
)


async def _rate_limit(
    cache: CacheService, key: str,
    window: int = RATE_LIMIT_WINDOW, max_hits: int = RATE_LIMIT_MAX,
):
    hits = await cache.incr("rl:{}".format(key), window)
    if hits > max_hits:
        raise HTTPException(429, "Too many requests. Try again later.")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class SaveDrillRequest(BaseModel):
    drill_id: str = Field(max_length=100)
    sequence_id: str | None = Field(None, max_length=100)
    preset_id: str | None = Field(None, max_length=100)
    mode: str = "inferred"
    minutes_planned: int = Field(ge=1, le=120)
    duration_s: int = Field(ge=0, le=7200)
    score: int = Field(ge=0, le=100)
    checks: dict[str, bool] = Field(default_factory=dict)
    missed: list[str] = Field(default_factory=list, max_length=100)
    notes: str | None = Field(None, max_length=2000)
    request_ai_debrief: bool = True

    @field_validator("checks")
    @classmethod
    def limit_checks(cls, v):
        if len(v) > 100:
            raise ValueError("checks cannot exceed 100 items")
        return v


class SaveSessionRequest(BaseModel):
    orchestrator_session_id: str | None = Field(None, max_length=100)
    profile: str = Field(max_length=100)
    plan: str = Field(max_length=100)
    persona: str = Field(max_length=100)
    ep_type: str | None = Field(None, max_length=50)
    vak: str | None = Field(None, max_length=50)
    turns_total: int = Field(ge=0, le=1000)
    awaits_total: int = Field(ge=0, le=1000)
    nods_counted: int = Field(default=0, ge=0, le=1000)
    stages_seen: list[str] = Field(default_factory=list, max_length=50)
    tonalities_seen: list[str] = Field(default_factory=list, max_length=50)
    nlp_types_seen: list[str] = Field(default_factory=list, max_length=50)
    nlp_coverage_pct: float = Field(default=0.0, ge=0, le=100)
    duration_s: int = Field(ge=0, le=14400)
    enrichment_stats: dict = Field(default_factory=dict)
    turns: list[dict] = Field(default_factory=list, max_length=500)
    request_ai_debrief: bool = True

    @field_validator("enrichment_stats")
    @classmethod
    def limit_enrichment(cls, v):
        if len(v) > 50:
            raise ValueError("enrichment_stats cannot exceed 50 keys")
        return v


class UpdateGapRequest(BaseModel):
    contacts_done: int | None = Field(None, ge=0, le=9999)
    conferences_done: int | None = Field(None, ge=0, le=9999)
    electives_done: float | None = Field(None, ge=0, le=9999)
    workshops_done: int | None = Field(None, ge=0, le=9999)
    contacts_need: int | None = Field(None, ge=0, le=9999)
    conferences_need: int | None = Field(None, ge=0, le=9999)
    electives_need: float | None = Field(None, ge=0, le=9999)
    workshops_need: int | None = Field(None, ge=0, le=9999)
    hard_stop: str | None = Field(None, max_length=10)
    notes: str | None = Field(None, max_length=2000)


class UpdatePrefsRequest(BaseModel):
    default_profile: str | None = Field(None, max_length=100)
    default_plan: str | None = Field(None, max_length=100)
    default_persona: str | None = Field(None, max_length=100)
    default_mode: str | None = Field(None, max_length=20)
    show_nlp: bool | None = None
    show_prosody: bool | None = None
    theme: str | None = Field(None, max_length=50)


class AIDebriefRequest(BaseModel):
    context_id: str


class AIStudyPlanRequest(BaseModel):
    pass


# ---------------------------------------------------------------------------
# DRILLS
# ---------------------------------------------------------------------------
@app.post("/drills")
async def save_drill(
    req: SaveDrillRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
    coach: CoachingEngine = Depends(get_coach),
    events: EventBus = Depends(get_events),
):
    await _rate_limit(cache, "write:{}".format(auth.user_id))
    if req.mode not in ("literal", "inferred", "blended"):
        raise HTTPException(422, "mode must be literal, inferred, or blended")

    row = await db.fetchrow(
        """INSERT INTO drill_attempts
           (user_id, drill_id, sequence_id, preset_id, mode, minutes_planned,
            duration_s, score, checks, missed, notes)
           VALUES ($1, $2, $3, $4, $5::suggestibility_mode, $6, $7, $8, $9, $10, $11)
           RETURNING id, created_at""",
        auth.user_id, req.drill_id, req.sequence_id, req.preset_id,
        req.mode, req.minutes_planned, req.duration_s, req.score,
        json.dumps(req.checks), json.dumps(req.missed), req.notes,
    )
    drill_id = str(row["id"])
    await cache.invalidate("drills:{}:*".format(auth.user_id))

    ai_result = None
    if req.request_ai_debrief and req.missed:
        prompt = CoachingEngine.build_drill_prompt(req.drill_id, req.score, req.missed, req.mode)
        ai_result = await coach.coach(prompt, "drill_debrief")
        await db.execute(
            "UPDATE drill_attempts SET ai_debrief = $1, ai_debrief_model = $2 WHERE id = $3",
            ai_result.text, ai_result.model, row["id"],
        )
        await db.execute(
            """INSERT INTO ai_coaching_logs
               (user_id, context_type, context_id, prompt, response, model, latency_ms)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            auth.user_id, "drill_debrief", row["id"], prompt,
            ai_result.text, ai_result.model, ai_result.latency_ms,
        )

    await audit.log(auth.user_id, "save_drill", "drills/{}".format(drill_id),
                    {"drill_id": req.drill_id, "score": req.score},
                    get_client_ip(request))

    if events:
        await events.publish("academy.drill.completed", {
            "user_id": auth.user_id, "drill_id": req.drill_id,
            "score": req.score, "timestamp": row["created_at"].isoformat(),
        })

    return {
        "id": drill_id,
        "created_at": row["created_at"].isoformat(),
        "ai_debrief": ai_result.text if ai_result else None,
        "ai_source": ai_result.source if ai_result else None,
    }


@app.get("/drills")
async def list_drills(
    page: int = 1, per_page: int = 20,
    drill_id: str | None = None, sequence_id: str | None = None,
    mode: str | None = None, days: int | None = None,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    page = max(1, page)
    per_page = max(1, min(100, per_page))
    offset = (page - 1) * per_page

    cache_key = "drills:{}:p{}:{}:{}:{}:{}".format(auth.user_id, page, per_page, drill_id, mode, days)
    cached = await cache.get(cache_key)
    if cached:
        return cached

    where = ["user_id = $1"]
    args: list = [auth.user_id]
    idx = 2

    if drill_id:
        where.append("drill_id = ${}".format(idx))
        args.append(drill_id)
        idx += 1
    if sequence_id:
        where.append("sequence_id = ${}".format(idx))
        args.append(sequence_id)
        idx += 1
    if mode and mode in ("literal", "inferred", "blended"):
        where.append("mode = ${}::suggestibility_mode".format(idx))
        args.append(mode)
        idx += 1
    if days:
        where.append("created_at >= NOW() - ${} * INTERVAL '1 day'".format(idx))
        args.append(max(1, min(365, days)))
        idx += 1

    where_sql = " AND ".join(where)
    total = await db.fetchval("SELECT COUNT(*) FROM drill_attempts WHERE {}".format(where_sql), *args)

    args.extend([per_page, offset])
    rows = await db.fetch(
        """SELECT id, drill_id, sequence_id, preset_id, mode, minutes_planned,
            duration_s, score, missed, notes, ai_debrief, created_at
            FROM drill_attempts WHERE {}
            ORDER BY created_at DESC LIMIT ${} OFFSET ${}""".format(where_sql, idx, idx + 1),
        *args,
    )
    result = {
        "drills": [
            {
                "id": str(r["id"]),
                "drill_id": r["drill_id"],
                "sequence_id": r["sequence_id"],
                "preset_id": r["preset_id"],
                "mode": r["mode"],
                "minutes_planned": r["minutes_planned"],
                "duration_s": r["duration_s"],
                "score": r["score"],
                "missed": json.loads(r["missed"]) if r["missed"] else [],
                "notes": r["notes"],
                "ai_debrief": r["ai_debrief"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, math.ceil(total / per_page)),
    }
    await cache.set(cache_key, result, 120)
    return result


@app.get("/drills/stats")
async def drill_stats(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    cached = await cache.get("drills:{}:stats".format(auth.user_id))
    if cached:
        return cached

    rows = await db.fetch(
        """SELECT drill_id, COUNT(*) AS attempts, ROUND(AVG(score)::numeric, 1) AS avg_score,
           MAX(score) AS best, MIN(score) AS worst,
           ROUND(AVG(duration_s)::numeric, 0) AS avg_dur,
           MAX(created_at) AS last_at
           FROM drill_attempts WHERE user_id = $1
           GROUP BY drill_id ORDER BY attempts DESC""",
        auth.user_id,
    )
    total_attempts = await db.fetchval(
        "SELECT COUNT(*) FROM drill_attempts WHERE user_id = $1", auth.user_id,
    )
    avg_score = await db.fetchval(
        "SELECT ROUND(AVG(score)::numeric, 1) FROM drill_attempts WHERE user_id = $1", auth.user_id,
    )
    result = {
        "by_drill": [
            {
                "drill_id": r["drill_id"],
                "attempts": r["attempts"],
                "avg_score": float(r["avg_score"]) if r["avg_score"] else 0,
                "best_score": r["best"],
                "worst_score": r["worst"],
                "avg_duration_s": int(r["avg_dur"]) if r["avg_dur"] else 0,
                "last_attempt": r["last_at"].isoformat() if r["last_at"] else None,
            }
            for r in rows
        ],
        "total_attempts": total_attempts,
        "overall_avg_score": float(avg_score) if avg_score else 0,
    }
    await cache.set("drills:{}:stats".format(auth.user_id), result, 180)
    return result


@app.get("/drills/heatmap")
async def drill_heatmap(
    days: int = 90,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    days = max(7, min(365, days))
    rows = await db.fetch(
        """SELECT DATE(created_at) AS day, COUNT(*) AS count
           FROM drill_attempts
           WHERE user_id = $1 AND created_at >= NOW() - $2 * INTERVAL '1 day'
           GROUP BY DATE(created_at) ORDER BY day""",
        auth.user_id, days,
    )
    return {
        "days": days,
        "data": [{"day": str(r["day"]), "count": r["count"]} for r in rows],
    }


@app.get("/drills/weak-areas")
async def drill_weak_areas(
    limit: int = 10,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    limit = max(1, min(30, limit))
    rows = await db.fetch(
        """SELECT drill_id, elem AS check_item, COUNT(*) AS miss_count
           FROM drill_attempts, jsonb_array_elements_text(missed) AS elem
           WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
           GROUP BY drill_id, elem
           ORDER BY miss_count DESC
           LIMIT $2""",
        auth.user_id, limit,
    )
    return {
        "weak_areas": [
            {"drill_id": r["drill_id"], "check": r["check_item"], "miss_count": r["miss_count"]}
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# SESSIONS  (static routes BEFORE dynamic /{sid})
# ---------------------------------------------------------------------------
@app.post("/sessions")
async def save_session(
    req: SaveSessionRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
    coach: CoachingEngine = Depends(get_coach),
    events: EventBus = Depends(get_events),
):
    await _rate_limit(cache, "write:{}".format(auth.user_id))
    row = await db.fetchrow(
        """INSERT INTO session_runs
           (user_id, orchestrator_session_id, profile, plan, persona, ep_type, vak,
            turns_total, awaits_total, nods_counted, stages_seen, tonalities_seen,
            nlp_types_seen, nlp_coverage_pct, duration_s, enrichment_stats)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           RETURNING id, created_at""",
        auth.user_id, req.orchestrator_session_id, req.profile, req.plan,
        req.persona, req.ep_type, req.vak, req.turns_total, req.awaits_total,
        req.nods_counted, json.dumps(req.stages_seen), json.dumps(req.tonalities_seen),
        json.dumps(req.nlp_types_seen), req.nlp_coverage_pct, req.duration_s,
        json.dumps(req.enrichment_stats),
    )
    session_id = str(row["id"])

    if req.turns:
        await db.executemany(
            """INSERT INTO session_turns
               (session_run_id, idx, turn_type, stage, name, text, prosody, nlp,
                persona_reply, persona_source)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
            [
                (
                    row["id"], t.get("idx", i), t.get("type", "line"),
                    t.get("stage"), t.get("name"), t.get("text"),
                    json.dumps(t["prosody"]) if t.get("prosody") else None,
                    json.dumps(t["nlp"]) if t.get("nlp") else None,
                    t.get("persona_reply"), t.get("persona_source"),
                )
                for i, t in enumerate(req.turns)
            ],
        )

    await cache.invalidate("sessions:{}:*".format(auth.user_id))

    ai_result = None
    if req.request_ai_debrief:
        prompt = CoachingEngine.build_session_prompt(
            req.plan, req.persona, req.ep_type or "balanced",
            req.nlp_coverage_pct, req.nods_counted, req.awaits_total,
            req.duration_s, req.tonalities_seen,
        )
        ai_result = await coach.coach(prompt, "session_debrief")
        await db.execute(
            "UPDATE session_runs SET ai_debrief = $1, ai_debrief_model = $2, ai_debrief_generated_at = NOW() WHERE id = $3",
            ai_result.text, ai_result.model, row["id"],
        )
        await db.execute(
            """INSERT INTO ai_coaching_logs
               (user_id, context_type, context_id, prompt, response, model, latency_ms)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            auth.user_id, "session_debrief", row["id"], prompt,
            ai_result.text, ai_result.model, ai_result.latency_ms,
        )

    await audit.log(auth.user_id, "save_session", "sessions/{}".format(session_id),
                    {"plan": req.plan, "persona": req.persona, "turns": len(req.turns)},
                    get_client_ip(request))

    if events:
        await events.publish("academy.session.completed", {
            "user_id": auth.user_id, "plan": req.plan, "persona": req.persona,
            "duration_s": req.duration_s, "nlp_coverage": req.nlp_coverage_pct,
            "timestamp": row["created_at"].isoformat(),
        })

    return {
        "id": session_id,
        "turns_stored": len(req.turns),
        "created_at": row["created_at"].isoformat(),
        "ai_debrief": ai_result.text if ai_result else None,
        "ai_source": ai_result.source if ai_result else None,
    }


@app.get("/sessions/stats")
async def session_stats(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT plan, COUNT(*) AS runs, ROUND(AVG(duration_s)::numeric, 0) AS avg_dur,
           ROUND(AVG(nlp_coverage_pct)::numeric, 1) AS avg_nlp,
           ROUND(AVG(nods_counted)::numeric, 1) AS avg_nods,
           MAX(created_at) AS last_run
           FROM session_runs WHERE user_id = $1
           GROUP BY plan ORDER BY runs DESC""",
        auth.user_id,
    )
    total = await db.fetchval(
        "SELECT COUNT(*) FROM session_runs WHERE user_id = $1", auth.user_id,
    )
    return {
        "by_plan": [
            {
                "plan": r["plan"], "runs": r["runs"],
                "avg_duration_s": int(r["avg_dur"]) if r["avg_dur"] else 0,
                "avg_nlp_coverage": float(r["avg_nlp"]) if r["avg_nlp"] else 0,
                "avg_nods": float(r["avg_nods"]) if r["avg_nods"] else 0,
                "last_run": r["last_run"].isoformat() if r["last_run"] else None,
            }
            for r in rows
        ],
        "total_sessions": total,
    }


@app.get("/sessions")
async def list_sessions(
    page: int = 1, per_page: int = 20,
    plan: str | None = None, persona: str | None = None, days: int | None = None,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    page = max(1, page)
    per_page = max(1, min(100, per_page))
    offset = (page - 1) * per_page

    where = ["user_id = $1"]
    args: list = [auth.user_id]
    idx = 2

    if plan:
        where.append("plan = ${}".format(idx))
        args.append(plan)
        idx += 1
    if persona:
        where.append("persona = ${}".format(idx))
        args.append(persona)
        idx += 1
    if days:
        where.append("created_at >= NOW() - ${} * INTERVAL '1 day'".format(idx))
        args.append(max(1, min(365, days)))
        idx += 1

    where_sql = " AND ".join(where)
    total = await db.fetchval("SELECT COUNT(*) FROM session_runs WHERE {}".format(where_sql), *args)

    args.extend([per_page, offset])
    rows = await db.fetch(
        """SELECT id, orchestrator_session_id, profile, plan, persona, ep_type, vak,
            turns_total, awaits_total, nods_counted, nlp_coverage_pct,
            duration_s, ai_debrief, created_at
            FROM session_runs WHERE {}
            ORDER BY created_at DESC LIMIT ${} OFFSET ${}""".format(where_sql, idx, idx + 1),
        *args,
    )
    return {
        "sessions": [
            {
                "id": str(r["id"]),
                "profile": r["profile"], "plan": r["plan"], "persona": r["persona"],
                "ep_type": r["ep_type"], "vak": r["vak"],
                "turns_total": r["turns_total"], "awaits_total": r["awaits_total"],
                "nods_counted": r["nods_counted"],
                "nlp_coverage_pct": r["nlp_coverage_pct"],
                "duration_s": r["duration_s"],
                "ai_debrief": r["ai_debrief"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ],
        "total": total, "page": page, "per_page": per_page,
        "pages": max(1, math.ceil(total / per_page)),
    }


@app.get("/sessions/{sid}")
async def get_session(
    sid: str,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM session_runs WHERE id = $1 AND user_id = $2", sid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Session not found")
    turns = await db.fetch(
        "SELECT * FROM session_turns WHERE session_run_id = $1 ORDER BY idx", row["id"],
    )
    return {
        "id": str(row["id"]),
        "profile": row["profile"], "plan": row["plan"], "persona": row["persona"],
        "ep_type": row["ep_type"], "vak": row["vak"],
        "turns_total": row["turns_total"], "awaits_total": row["awaits_total"],
        "nods_counted": row["nods_counted"],
        "stages_seen": json.loads(row["stages_seen"]) if row["stages_seen"] else [],
        "tonalities_seen": json.loads(row["tonalities_seen"]) if row["tonalities_seen"] else [],
        "nlp_types_seen": json.loads(row["nlp_types_seen"]) if row["nlp_types_seen"] else [],
        "nlp_coverage_pct": row["nlp_coverage_pct"],
        "duration_s": row["duration_s"],
        "enrichment_stats": json.loads(row["enrichment_stats"]) if row["enrichment_stats"] else {},
        "ai_debrief": row["ai_debrief"],
        "created_at": row["created_at"].isoformat(),
        "turns": [
            {
                "idx": t["idx"], "type": t["turn_type"], "stage": t["stage"],
                "name": t["name"], "text": t["text"],
                "prosody": json.loads(t["prosody"]) if t["prosody"] else None,
                "nlp": json.loads(t["nlp"]) if t["nlp"] else None,
                "persona_reply": t["persona_reply"],
                "persona_source": t["persona_source"],
            }
            for t in turns
        ],
    }


@app.get("/sessions/{sid}/replay")
async def replay_session(
    sid: str,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT id, profile, plan, persona, ep_type, vak FROM session_runs WHERE id = $1 AND user_id = $2",
        sid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Session not found")
    turns = await db.fetch(
        "SELECT idx, turn_type, stage, name, text, prosody, nlp, persona_reply, persona_source "
        "FROM session_turns WHERE session_run_id = $1 ORDER BY idx", row["id"],
    )
    return {
        "session_id": str(row["id"]),
        "profile": row["profile"], "plan": row["plan"],
        "persona": row["persona"], "ep_type": row["ep_type"], "vak": row["vak"],
        "turns": [
            {
                "idx": t["idx"], "type": t["turn_type"], "stage": t["stage"],
                "name": t["name"], "text": t["text"],
                "prosody": json.loads(t["prosody"]) if t["prosody"] else None,
                "nlp": json.loads(t["nlp"]) if t["nlp"] else None,
                "persona_reply": t["persona_reply"],
            }
            for t in turns
        ],
    }


# ---------------------------------------------------------------------------
# GAP PROGRESS
# ---------------------------------------------------------------------------
@app.get("/gap")
async def get_gap(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM gap_progress WHERE user_id = $1", auth.user_id)
    if not row:
        await db.execute("INSERT INTO gap_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING", auth.user_id)
        row = await db.fetchrow("SELECT * FROM gap_progress WHERE user_id = $1", auth.user_id)
    days_left = max(0, (row["hard_stop"] - date.today()).days) if row["hard_stop"] else 0
    weeks_left = max(1, math.ceil(days_left / 7))
    return {
        "contacts": {"done": row["contacts_done"], "need": row["contacts_need"],
                      "pace_per_week": round(max(0, row["contacts_need"] - row["contacts_done"]) / weeks_left, 1)},
        "conferences": {"done": row["conferences_done"], "need": row["conferences_need"],
                         "pace_per_week": round(max(0, row["conferences_need"] - row["conferences_done"]) / weeks_left, 1)},
        "electives": {"done": row["electives_done"], "need": row["electives_need"],
                       "pace_per_week": round(max(0, row["electives_need"] - row["electives_done"]) / weeks_left, 1)},
        "workshops": {"done": row["workshops_done"], "need": row["workshops_need"],
                       "pace_per_week": round(max(0, row["workshops_need"] - row["workshops_done"]) / weeks_left, 1)},
        "hard_stop": str(row["hard_stop"]) if row["hard_stop"] else None,
        "days_left": days_left,
        "weeks_left": weeks_left,
        "notes": row["notes"],
        "ai_pace_advice": row["ai_pace_advice"],
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


@app.put("/gap")
async def update_gap(
    req: UpdateGapRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
    events: EventBus = Depends(get_events),
):
    row = await db.fetchrow("SELECT * FROM gap_progress WHERE user_id = $1", auth.user_id)
    if not row:
        await db.execute("INSERT INTO gap_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING", auth.user_id)
        row = await db.fetchrow("SELECT * FROM gap_progress WHERE user_id = $1", auth.user_id)

    field_map = {
        "contacts_done": req.contacts_done, "contacts_need": req.contacts_need,
        "conferences_done": req.conferences_done, "conferences_need": req.conferences_need,
        "electives_done": req.electives_done, "electives_need": req.electives_need,
        "workshops_done": req.workshops_done, "workshops_need": req.workshops_need,
        "notes": req.notes,
    }
    sets, vals, idx = [], [], 1
    changes = []
    for field, new_val in field_map.items():
        if new_val is not None:
            old_val = row[field]
            if str(old_val) != str(new_val):
                changes.append((field, str(old_val), str(new_val)))
            sets.append("{} = ${}".format(field, idx))
            vals.append(new_val)
            idx += 1

    if req.hard_stop:
        try:
            hs = datetime.strptime(req.hard_stop, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(422, "hard_stop must be YYYY-MM-DD")
        old_hs = str(row["hard_stop"]) if row["hard_stop"] else "none"
        if old_hs != str(hs):
            changes.append(("hard_stop", old_hs, str(hs)))
        sets.append("hard_stop = ${}".format(idx))
        vals.append(hs)
        idx += 1

    if not sets:
        raise HTTPException(422, "No fields to update")

    vals.append(auth.user_id)
    await db.execute(
        "UPDATE gap_progress SET {} WHERE user_id = ${}".format(", ".join(sets), idx), *vals,
    )

    for field, old, new in changes:
        await db.execute(
            """INSERT INTO gap_history (gap_progress_id, user_id, field_changed, old_value, new_value)
               VALUES ($1, $2, $3, $4, $5)""",
            row["id"], auth.user_id, field, old, new,
        )

    await cache.invalidate("gap:{}:*".format(auth.user_id))
    await audit.log(auth.user_id, "update_gap", "gap_progress",
                    {"changes": [{"field": f, "old": o, "new": n} for f, o, n in changes]},
                    get_client_ip(request))
    if events:
        await events.publish("academy.gap.updated", {
            "user_id": auth.user_id, "changes": [{"field": f, "old": o, "new": n} for f, o, n in changes],
        })

    return await get_gap(auth=auth, db=db)


@app.get("/gap/history")
async def gap_history(
    limit: int = 50,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    limit = max(1, min(200, limit))
    rows = await db.fetch(
        """SELECT gh.field_changed, gh.old_value, gh.new_value, gh.changed_at
           FROM gap_history gh
           JOIN gap_progress gp ON gh.gap_progress_id = gp.id
           WHERE gp.user_id = $1
           ORDER BY gh.changed_at DESC LIMIT $2""",
        auth.user_id, limit,
    )
    return {
        "history": [
            {
                "field": r["field_changed"], "old": r["old_value"],
                "new": r["new_value"], "at": r["changed_at"].isoformat(),
            }
            for r in rows
        ],
    }


@app.get("/gap/pace")
async def gap_pace(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    coach: CoachingEngine = Depends(get_coach),
):
    row = await db.fetchrow("SELECT * FROM gap_progress WHERE user_id = $1", auth.user_id)
    if not row:
        raise HTTPException(404, "No gap progress found. Save your gap data first.")

    days_left = max(0, (row["hard_stop"] - date.today()).days) if row["hard_stop"] else 0

    prompt = CoachingEngine.build_gap_prompt(
        (row["contacts_done"], row["contacts_need"]),
        (row["conferences_done"], row["conferences_need"]),
        (row["electives_done"], row["electives_need"]),
        (row["workshops_done"], row["workshops_need"]),
        days_left,
    )
    ai_result = await coach.coach(prompt, "gap_advice")

    await db.execute(
        "UPDATE gap_progress SET ai_pace_advice = $1, ai_pace_model = $2, ai_pace_generated_at = NOW() WHERE user_id = $3",
        ai_result.text, ai_result.model, auth.user_id,
    )
    await db.execute(
        """INSERT INTO ai_coaching_logs
           (user_id, context_type, context_id, prompt, response, model, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        auth.user_id, "gap_advice", row["id"], prompt,
        ai_result.text, ai_result.model, ai_result.latency_ms,
    )

    return {
        "advice": ai_result.text,
        "source": ai_result.source,
        "advisory": True,
        "days_left": days_left,
    }


# ---------------------------------------------------------------------------
# ANALYTICS
# ---------------------------------------------------------------------------
@app.get("/analytics/dashboard")
async def analytics_dashboard(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    cached = await cache.get("analytics:{}:dashboard".format(auth.user_id))
    if cached:
        return cached

    drill_total = await db.fetchval(
        "SELECT COUNT(*) FROM drill_attempts WHERE user_id = $1", auth.user_id) or 0
    drill_avg = await db.fetchval(
        "SELECT ROUND(AVG(score)::numeric, 1) FROM drill_attempts WHERE user_id = $1", auth.user_id)
    session_total = await db.fetchval(
        "SELECT COUNT(*) FROM session_runs WHERE user_id = $1", auth.user_id) or 0
    session_avg_dur = await db.fetchval(
        "SELECT ROUND(AVG(duration_s)::numeric, 0) FROM session_runs WHERE user_id = $1", auth.user_id)
    session_avg_nlp = await db.fetchval(
        "SELECT ROUND(AVG(nlp_coverage_pct)::numeric, 1) FROM session_runs WHERE user_id = $1", auth.user_id)

    activity_days = await db.fetch(
        """SELECT DISTINCT DATE(created_at) AS day FROM (
             SELECT created_at FROM drill_attempts WHERE user_id = $1
             UNION ALL
             SELECT created_at FROM session_runs WHERE user_id = $1
           ) combined ORDER BY day DESC LIMIT 90""",
        auth.user_id,
    )
    streak = 0
    today = date.today()
    for r in activity_days:
        expected = today - timedelta(days=streak)
        if r["day"] == expected:
            streak += 1
        else:
            break

    recent = await db.fetch(
        """SELECT score, DATE(created_at) AS day
           FROM drill_attempts WHERE user_id = $1
           ORDER BY created_at DESC LIMIT 20""",
        auth.user_id,
    )

    result = {
        "drill_total": drill_total,
        "drill_avg_score": float(drill_avg) if drill_avg else 0,
        "session_total": session_total,
        "session_avg_duration_s": int(session_avg_dur) if session_avg_dur else 0,
        "session_avg_nlp_coverage": float(session_avg_nlp) if session_avg_nlp else 0,
        "current_streak_days": streak,
        "recent_scores": [{"score": r["score"], "day": str(r["day"])} for r in reversed(recent)],
    }
    await cache.set("analytics:{}:dashboard".format(auth.user_id), result, 300)
    return result


@app.get("/analytics/trends")
async def analytics_trends(
    days: int = 30,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    days = max(7, min(365, days))
    rows = await db.fetch(
        """SELECT DATE(created_at) AS day,
           ROUND(AVG(score)::numeric, 1) AS avg_score,
           COUNT(*) AS attempts
           FROM drill_attempts
           WHERE user_id = $1 AND created_at >= NOW() - $2 * INTERVAL '1 day'
           GROUP BY DATE(created_at) ORDER BY day""",
        auth.user_id, days,
    )
    return {
        "days": days,
        "data": [
            {"day": str(r["day"]), "avg_score": float(r["avg_score"]), "attempts": r["attempts"]}
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# AI COACHING ENDPOINTS
# ---------------------------------------------------------------------------
@app.post("/ai/drill-debrief")
async def ai_drill_debrief(
    req: AIDebriefRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    coach: CoachingEngine = Depends(get_coach),
):
    await _rate_limit(cache, "ai:{}".format(auth.user_id), window=60, max_hits=AI_RATE_LIMIT_MAX)
    row = await db.fetchrow(
        "SELECT drill_id, score, missed, mode FROM drill_attempts WHERE id = $1 AND user_id = $2",
        req.context_id, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Drill attempt not found")

    missed = json.loads(row["missed"]) if row["missed"] else []
    prompt = CoachingEngine.build_drill_prompt(row["drill_id"], row["score"], missed, row["mode"])
    result = await coach.coach(prompt, "drill_debrief")

    await db.execute(
        "UPDATE drill_attempts SET ai_debrief = $1, ai_debrief_model = $2 WHERE id = $3",
        result.text, result.model, req.context_id,
    )
    await db.execute(
        """INSERT INTO ai_coaching_logs
           (user_id, context_type, context_id, prompt, response, model, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        auth.user_id, "drill_debrief", req.context_id, prompt,
        result.text, result.model, result.latency_ms,
    )
    return {"debrief": result.text, "source": result.source, "advisory": True}


@app.post("/ai/session-debrief")
async def ai_session_debrief(
    req: AIDebriefRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    coach: CoachingEngine = Depends(get_coach),
):
    await _rate_limit(cache, "ai:{}".format(auth.user_id), window=60, max_hits=AI_RATE_LIMIT_MAX)
    row = await db.fetchrow(
        """SELECT plan, persona, ep_type, nlp_coverage_pct, nods_counted,
           awaits_total, duration_s, tonalities_seen
           FROM session_runs WHERE id = $1 AND user_id = $2""",
        req.context_id, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Session not found")

    tonalities = json.loads(row["tonalities_seen"]) if row["tonalities_seen"] else []
    prompt = CoachingEngine.build_session_prompt(
        row["plan"], row["persona"], row["ep_type"] or "balanced",
        row["nlp_coverage_pct"] or 0, row["nods_counted"] or 0,
        row["awaits_total"] or 0, row["duration_s"], tonalities,
    )
    result = await coach.coach(prompt, "session_debrief")

    await db.execute(
        "UPDATE session_runs SET ai_debrief = $1, ai_debrief_model = $2, ai_debrief_generated_at = NOW() WHERE id = $3",
        result.text, result.model, req.context_id,
    )
    await db.execute(
        """INSERT INTO ai_coaching_logs
           (user_id, context_type, context_id, prompt, response, model, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        auth.user_id, "session_debrief", req.context_id, prompt,
        result.text, result.model, result.latency_ms,
    )
    return {"debrief": result.text, "source": result.source, "advisory": True}


@app.post("/ai/weak-areas")
async def ai_weak_areas(
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    coach: CoachingEngine = Depends(get_coach),
):
    await _rate_limit(cache, "ai:{}".format(auth.user_id), window=60, max_hits=AI_RATE_LIMIT_MAX)
    rows = await db.fetch(
        """SELECT drill_id, elem AS check_item, COUNT(*) AS miss_count
           FROM drill_attempts, jsonb_array_elements_text(missed) AS elem
           WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
           GROUP BY drill_id, elem
           ORDER BY miss_count DESC LIMIT 8""",
        auth.user_id,
    )
    if not rows:
        return {"advice": "No missed checkpoints found in the last 90 days. Keep up the great work!", "advisory": True}

    weak = [{"drill_id": r["drill_id"], "check": r["check_item"], "miss_count": r["miss_count"]} for r in rows]
    prompt = CoachingEngine.build_weak_area_prompt(weak)
    result = await coach.coach(prompt, "drill_debrief")

    await db.execute(
        """INSERT INTO ai_coaching_logs
           (user_id, context_type, prompt, response, model, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        auth.user_id, "weak_area", prompt, result.text, result.model, result.latency_ms,
    )
    return {"weak_areas": weak, "advice": result.text, "source": result.source, "advisory": True}


@app.post("/ai/study-plan")
async def ai_study_plan(
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    coach: CoachingEngine = Depends(get_coach),
):
    await _rate_limit(cache, "ai:{}".format(auth.user_id), window=60, max_hits=AI_RATE_LIMIT_MAX)
    drill_stats = await db.fetch(
        """SELECT drill_id, COUNT(*) AS attempts, ROUND(AVG(score)::numeric, 1) AS avg_score
           FROM drill_attempts WHERE user_id = $1
           GROUP BY drill_id ORDER BY attempts DESC LIMIT 10""",
        auth.user_id,
    )
    session_count = await db.fetchval(
        "SELECT COUNT(*) FROM session_runs WHERE user_id = $1", auth.user_id,
    ) or 0
    first_activity = await db.fetchval(
        """SELECT MIN(created_at) FROM (
             SELECT created_at FROM drill_attempts WHERE user_id = $1
             UNION ALL SELECT created_at FROM session_runs WHERE user_id = $1
           ) c""",
        auth.user_id,
    )
    days_since = (datetime.now() - first_activity).days if first_activity else 0

    gap = await db.fetchrow("SELECT * FROM gap_progress WHERE user_id = $1", auth.user_id)
    gap_behind = "no gap data"
    if gap and gap["hard_stop"]:
        days_left = max(0, (gap["hard_stop"] - date.today()).days)
        weeks_left = max(1, math.ceil(days_left / 7))
        behinds = []
        for cat, done_f, need_f in [("contacts", "contacts_done", "contacts_need"),
                                     ("conferences", "conferences_done", "conferences_need"),
                                     ("electives", "electives_done", "electives_need"),
                                     ("workshops", "workshops_done", "workshops_need")]:
            remaining = max(0, gap[need_f] - gap[done_f])
            pace = round(remaining / weeks_left, 1)
            behinds.append("{}: {}/{} (need {}/wk)".format(cat, gap[done_f], gap[need_f], pace))
        gap_behind = "; ".join(behinds)

    weak_rows = await db.fetch(
        """SELECT elem AS check_item
           FROM drill_attempts, jsonb_array_elements_text(missed) AS elem
           WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
           GROUP BY elem ORDER BY COUNT(*) DESC LIMIT 5""",
        auth.user_id,
    )
    weak_areas = [r["check_item"] for r in weak_rows]

    prompt = CoachingEngine.build_study_plan_prompt(
        [{"drill_id": r["drill_id"], "attempts": r["attempts"],
          "avg_score": float(r["avg_score"]) if r["avg_score"] else 0}
         for r in drill_stats],
        session_count, days_since, gap_behind, weak_areas,
    )
    result = await coach.coach(prompt, "study_plan")

    await db.execute(
        """INSERT INTO ai_coaching_logs
           (user_id, context_type, prompt, response, model, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        auth.user_id, "study_plan", prompt, result.text, result.model, result.latency_ms,
    )
    return {"plan": result.text, "source": result.source, "advisory": True}


# ---------------------------------------------------------------------------
# PREFERENCES
# ---------------------------------------------------------------------------
@app.get("/preferences")
async def get_preferences(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM user_preferences WHERE user_id = $1", auth.user_id)
    if not row:
        await db.execute("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING", auth.user_id)
        row = await db.fetchrow("SELECT * FROM user_preferences WHERE user_id = $1", auth.user_id)
    return {
        "default_profile": row["default_profile"],
        "default_plan": row["default_plan"],
        "default_persona": row["default_persona"],
        "default_mode": row["default_mode"],
        "show_nlp": row["show_nlp"],
        "show_prosody": row["show_prosody"],
        "theme": row["theme"],
    }


@app.put("/preferences")
async def update_preferences(
    req: UpdatePrefsRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    await db.execute("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING", auth.user_id)

    sets, vals, idx = [], [], 1
    for field in ("default_profile", "default_plan", "default_persona", "theme"):
        val = getattr(req, field, None)
        if val is not None:
            sets.append("{} = ${}".format(field, idx))
            vals.append(val)
            idx += 1
    if req.default_mode is not None:
        if req.default_mode not in ("literal", "inferred", "blended"):
            raise HTTPException(422, "default_mode must be literal, inferred, or blended")
        sets.append("default_mode = ${}::suggestibility_mode".format(idx))
        vals.append(req.default_mode)
        idx += 1
    for field in ("show_nlp", "show_prosody"):
        val = getattr(req, field, None)
        if val is not None:
            sets.append("{} = ${}".format(field, idx))
            vals.append(val)
            idx += 1

    if not sets:
        raise HTTPException(422, "No fields to update")

    vals.append(auth.user_id)
    await db.execute(
        "UPDATE user_preferences SET {} WHERE user_id = ${}".format(", ".join(sets), idx), *vals,
    )
    await audit.log(auth.user_id, "update_preferences", "user_preferences",
                    {"fields": [s.split(" = ")[0] for s in sets]},
                    get_client_ip(request))
    return await get_preferences(auth=auth, db=db)


# ---------------------------------------------------------------------------
# CSP -- Community Service Program
# ---------------------------------------------------------------------------
class SubmitIntakeRequest(BaseModel):
    full_name: str = Field(max_length=255)
    email: str = Field(max_length=255)
    phone: str | None = Field(None, max_length=50)
    tier: str = Field(default="free", max_length=20)
    concern: str = Field(max_length=5000)
    prior_hypnosis: str = Field(default="none", max_length=20)
    prior_detail: str | None = Field(None, max_length=2000)
    medical_conditions: str | None = Field(None, max_length=2000)
    medications: str | None = Field(None, max_length=2000)
    mental_health: str | None = Field(None, max_length=2000)
    seeing_provider: bool = False
    provider_name: str | None = Field(None, max_length=255)
    goals: str | None = Field(None, max_length=5000)
    consent_agreed: bool = False
    consent_signature: str | None = Field(None, max_length=255)
    consent_date: str | None = Field(None, max_length=10)

    @field_validator("tier")
    @classmethod
    def valid_tier(cls, v):
        if v not in ("free", "paid"):
            raise ValueError("tier must be free or paid")
        return v

    @field_validator("prior_hypnosis")
    @classmethod
    def valid_prior(cls, v):
        if v not in ("none", "positive", "negative", "neutral"):
            raise ValueError("prior_hypnosis must be none, positive, negative, or neutral")
        return v


class AddClientRequest(BaseModel):
    initials: str = Field(max_length=10)
    tier: str = Field(default="free", max_length=20)
    concern: str | None = Field(None, max_length=2000)
    referral_source: str | None = Field(None, max_length=255)
    sessions_planned: int = Field(default=6, ge=1, le=50)
    start_date: str | None = Field(None, max_length=10)
    intake_id: str | None = Field(None, max_length=50)

    @field_validator("tier")
    @classmethod
    def valid_tier(cls, v):
        if v not in ("free", "$35", "$55"):
            raise ValueError("tier must be free, $35, or $55")
        return v


class UpdateClientRequest(BaseModel):
    sessions_completed: int | None = Field(None, ge=0, le=9999)
    sessions_planned: int | None = Field(None, ge=1, le=50)
    next_session_date: str | None = Field(None, max_length=30)
    ccr_status: str | None = Field(None, max_length=20)
    status: str | None = Field(None, max_length=20)
    notes: str | None = Field(None, max_length=2000)

    @field_validator("ccr_status")
    @classmethod
    def valid_ccr(cls, v):
        if v is not None and v not in ("none", "filed", "due", "overdue"):
            raise ValueError("ccr_status must be none, filed, due, or overdue")
        return v

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v is not None and v not in ("active", "completed", "dropped", "referred"):
            raise ValueError("status must be active, completed, dropped, or referred")
        return v


class AddConferenceRequest(BaseModel):
    faculty_name: str = Field(max_length=255)
    conference_date: str = Field(max_length=10)
    notes: str | None = Field(None, max_length=2000)


# -- Intakes (public submit, auth for listing) --

@app.post("/csp/intakes")
async def submit_intake(
    req: SubmitIntakeRequest,
    request: Request,
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    ip = get_client_ip(request)
    await _rate_limit(cache, "csp_intake:{}".format(ip), window=300, max_hits=5)

    consent_dt = None
    if req.consent_date:
        try:
            consent_dt = date.fromisoformat(req.consent_date)
        except ValueError:
            raise HTTPException(422, "consent_date must be YYYY-MM-DD")

    row = await db.fetchrow(
        """INSERT INTO csp_intakes
           (full_name, email, phone, tier, concern, prior_hypnosis, prior_detail,
            medical_conditions, medications, mental_health, seeing_provider,
            provider_name, goals, consent_agreed, consent_signature, consent_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           RETURNING id, created_at""",
        req.full_name, req.email, req.phone, req.tier, req.concern,
        req.prior_hypnosis, req.prior_detail, req.medical_conditions,
        req.medications, req.mental_health, req.seeing_provider,
        req.provider_name, req.goals, req.consent_agreed,
        req.consent_signature, consent_dt,
    )
    return {"id": str(row["id"]), "status": "new", "created_at": str(row["created_at"])}


@app.get("/csp/intakes")
async def list_intakes(
    status: str | None = None,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    if status:
        if status not in ("new", "reviewed", "scheduled", "active", "completed", "declined"):
            raise HTTPException(422, "Invalid status filter")
        rows = await db.fetch(
            "SELECT * FROM csp_intakes WHERE status = $1 ORDER BY created_at DESC LIMIT 100",
            status,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM csp_intakes ORDER BY created_at DESC LIMIT 100",
        )
    return [
        {
            "id": str(r["id"]),
            "full_name": r["full_name"],
            "email": r["email"],
            "phone": r["phone"],
            "tier": r["tier"],
            "concern": r["concern"],
            "prior_hypnosis": r["prior_hypnosis"],
            "status": r["status"],
            "consent_agreed": r["consent_agreed"],
            "created_at": str(r["created_at"]),
        }
        for r in rows
    ]


@app.put("/csp/intakes/{intake_id}/status")
async def update_intake_status(
    intake_id: str,
    new_status: str,
    notes: str | None = None,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
    request: Request = None,
):
    if new_status not in ("new", "reviewed", "scheduled", "active", "completed", "declined"):
        raise HTTPException(422, "Invalid status")

    sets = ["status = $1"]
    vals = [new_status]
    idx = 2
    if notes is not None:
        sets.append("notes = ${}".format(idx))
        vals.append(notes)
        idx += 1
    vals.append(intake_id)

    result = await db.execute(
        "UPDATE csp_intakes SET {} WHERE id = ${}".format(", ".join(sets), idx),
        *vals,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Intake not found")

    await audit.log(auth.user_id, "update_intake_status", "csp_intakes",
                    {"intake_id": intake_id, "new_status": new_status},
                    get_client_ip(request))
    return {"intake_id": intake_id, "status": new_status}


# -- Clients (auth required) --

@app.get("/csp/clients")
async def list_clients(
    status: str | None = None,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    if status:
        if status not in ("active", "completed", "dropped", "referred"):
            raise HTTPException(422, "Invalid status filter")
        rows = await db.fetch(
            """SELECT * FROM csp_clients
               WHERE user_id = $1 AND status = $2
               ORDER BY created_at DESC""",
            auth.user_id, status,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM csp_clients WHERE user_id = $1 ORDER BY created_at DESC",
            auth.user_id,
        )
    return [
        {
            "id": str(r["id"]),
            "initials": r["initials"],
            "tier": r["tier"],
            "concern": r["concern"],
            "referral_source": r["referral_source"],
            "sessions_completed": r["sessions_completed"],
            "sessions_planned": r["sessions_planned"],
            "start_date": str(r["start_date"]) if r["start_date"] else None,
            "last_session_date": str(r["last_session_date"]) if r["last_session_date"] else None,
            "next_session_date": str(r["next_session_date"]) if r["next_session_date"] else None,
            "ccr_status": r["ccr_status"],
            "status": r["status"],
            "notes": r["notes"],
            "created_at": str(r["created_at"]),
        }
        for r in rows
    ]


@app.post("/csp/clients")
async def add_client(
    req: AddClientRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    await _rate_limit(cache, "write:{}".format(auth.user_id))

    start_dt = None
    if req.start_date:
        try:
            start_dt = date.fromisoformat(req.start_date)
        except ValueError:
            raise HTTPException(422, "start_date must be YYYY-MM-DD")

    intake_uuid = None
    if req.intake_id:
        try:
            import uuid
            intake_uuid = uuid.UUID(req.intake_id)
        except ValueError:
            raise HTTPException(422, "intake_id must be a valid UUID")

    row = await db.fetchrow(
        """INSERT INTO csp_clients
           (user_id, initials, tier, concern, referral_source,
            sessions_planned, start_date, intake_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, created_at""",
        auth.user_id, req.initials, req.tier, req.concern,
        req.referral_source, req.sessions_planned, start_dt, intake_uuid,
    )
    await audit.log(auth.user_id, "add_csp_client", "csp_clients",
                    {"initials": req.initials, "tier": req.tier},
                    get_client_ip(request))
    return {"id": str(row["id"]), "created_at": str(row["created_at"])}


@app.put("/csp/clients/{client_id}")
async def update_client(
    client_id: str,
    req: UpdateClientRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    sets, vals, idx = [], [], 1
    for field in ("sessions_completed", "sessions_planned", "ccr_status", "status", "notes"):
        val = getattr(req, field, None)
        if val is not None:
            sets.append("{} = ${}".format(field, idx))
            vals.append(val)
            idx += 1
    if req.next_session_date is not None:
        if req.next_session_date == "":
            sets.append("next_session_date = NULL")
        else:
            try:
                dt = datetime.fromisoformat(req.next_session_date)
                sets.append("next_session_date = ${}".format(idx))
                vals.append(dt)
                idx += 1
            except ValueError:
                raise HTTPException(422, "next_session_date must be ISO datetime")

    if not sets:
        raise HTTPException(422, "No fields to update")

    vals.extend([auth.user_id, client_id])
    result = await db.execute(
        "UPDATE csp_clients SET {} WHERE user_id = ${} AND id = ${}".format(
            ", ".join(sets), idx, idx + 1
        ),
        *vals,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Client not found")

    await audit.log(auth.user_id, "update_csp_client", "csp_clients",
                    {"client_id": client_id, "fields": [s.split(" = ")[0] for s in sets]},
                    get_client_ip(request))
    return {"client_id": client_id, "updated": True}


# -- Conferences (auth required) --

@app.get("/csp/conferences")
async def list_conferences(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT * FROM csp_conferences
           WHERE user_id = $1
           ORDER BY conference_date DESC LIMIT 100""",
        auth.user_id,
    )
    return [
        {
            "id": str(r["id"]),
            "faculty_name": r["faculty_name"],
            "conference_date": str(r["conference_date"]),
            "notes": r["notes"],
            "created_at": str(r["created_at"]),
        }
        for r in rows
    ]


@app.post("/csp/conferences")
async def add_conference(
    req: AddConferenceRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    await _rate_limit(cache, "write:{}".format(auth.user_id))

    try:
        conf_date = date.fromisoformat(req.conference_date)
    except ValueError:
        raise HTTPException(422, "conference_date must be YYYY-MM-DD")

    row = await db.fetchrow(
        """INSERT INTO csp_conferences (user_id, faculty_name, conference_date, notes)
           VALUES ($1,$2,$3,$4) RETURNING id, created_at""",
        auth.user_id, req.faculty_name, conf_date, req.notes,
    )
    await audit.log(auth.user_id, "add_csp_conference", "csp_conferences",
                    {"faculty_name": req.faculty_name, "date": req.conference_date},
                    get_client_ip(request))
    return {"id": str(row["id"]), "created_at": str(row["created_at"])}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
