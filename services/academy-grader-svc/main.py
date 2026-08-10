"""
academy-grader-svc (:8604) -- P2 slice
AI-assisted rubric grading for drill attempts and studio sessions.

Rubric management:
  GET    /rubrics              -- list rubrics (with dimensions)
  GET    /rubrics/{rid}        -- single rubric detail
  POST   /rubrics              -- create rubric (instructor/admin)
  PUT    /rubrics/{rid}        -- update rubric (instructor/admin)

Grading:
  POST   /grades               -- grade an attempt/session (AI or manual)
  GET    /grades               -- list grades for user (paginated)
  GET    /grades/{gid}         -- single grade detail (with dimension scores)
  GET    /grades/summary       -- grade summary stats per rubric

Health:
  GET    /healthz              -- liveness (from service_factory)
  GET    /readyz               -- readiness (from service_factory)
  GET    /health               -- readiness alias (from service_factory)
"""
from __future__ import annotations
import os, sys, json, math, re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy_shared.service_factory import (
    create_app, get_db, get_cache, get_audit, get_coach,
)
from academy_shared.database import DatabasePool
from academy_shared.cache import CacheService
from academy_shared.audit import AuditService
from academy_shared.coaching import CoachingEngine
from academy_shared.auth import (
    require_auth, require_instructor_or_admin, TokenPayload, get_client_ip,
)

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# App + rate limiting
# ---------------------------------------------------------------------------
AI_RATE_LIMIT_MAX = int(os.getenv("AI_RATE_LIMIT_MAX", "10"))

app = create_app(
    "academy-grader-svc", "1.0.0",
    include_coaching=True,
)


async def _rate_limit(
    cache: CacheService, key: str,
    window: int = 60, max_hits: int = AI_RATE_LIMIT_MAX,
):
    hits = await cache.incr("rl:{}".format(key), window)
    if hits > max_hits:
        raise HTTPException(429, "Too many requests. Try again later.")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class DimensionInput(BaseModel):
    name: str = Field(max_length=100)
    criteria: str = Field(max_length=1000)
    weight: float = Field(gt=0, le=100, default=1.0)
    max_score: int = Field(gt=0, le=100, default=100)
    sort_order: int = Field(default=0, ge=0, le=50)


class CreateRubricRequest(BaseModel):
    name: str = Field(max_length=200)
    description: str | None = Field(None, max_length=2000)
    target_type: str = Field(max_length=50)
    dimensions: list[DimensionInput] = Field(min_length=1, max_length=20)


class UpdateRubricRequest(BaseModel):
    description: str | None = Field(None, max_length=2000)
    is_active: bool | None = None
    dimensions: list[DimensionInput] | None = Field(None, max_length=20)


class ManualDimensionScore(BaseModel):
    dimension_name: str = Field(max_length=100)
    score: float = Field(ge=0, le=100)
    justification: str | None = Field(None, max_length=500)


class GradeRequest(BaseModel):
    rubric_name: str = Field(max_length=200)
    target_type: str = Field(max_length=50)
    target_id: str = Field(max_length=100)
    use_ai: bool = True
    manual_scores: list[ManualDimensionScore] | None = Field(None, max_length=20)


# ---------------------------------------------------------------------------
# RUBRICS
# ---------------------------------------------------------------------------
@app.get("/rubrics")
async def list_rubrics(
    target_type: str | None = None,
    active_only: bool = True,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    cache_key = "rubrics:list:{}:{}".format(target_type, active_only)
    cached = await cache.get(cache_key)
    if cached:
        return cached

    where = []
    args = []
    idx = 1
    if target_type:
        where.append("r.target_type = ${}".format(idx))
        args.append(target_type)
        idx += 1
    if active_only:
        where.append("r.is_active = TRUE")

    where_sql = " AND ".join(where) if where else "TRUE"
    rows = await db.fetch(
        "SELECT r.* FROM rubrics r WHERE {} ORDER BY r.name".format(where_sql), *args,
    )

    rubrics = []
    for r in rows:
        dims = await db.fetch(
            "SELECT * FROM rubric_dimensions WHERE rubric_id = $1 ORDER BY sort_order", r["id"],
        )
        rubrics.append({
            "id": str(r["id"]),
            "name": r["name"],
            "description": r["description"],
            "target_type": r["target_type"],
            "is_active": r["is_active"],
            "dimensions": [
                {
                    "id": str(d["id"]),
                    "name": d["name"],
                    "criteria": d["criteria"],
                    "weight": d["weight"],
                    "max_score": d["max_score"],
                    "sort_order": d["sort_order"],
                }
                for d in dims
            ],
        })

    result = {"rubrics": rubrics}
    await cache.set(cache_key, result, 600)
    return result


@app.get("/rubrics/{rid}")
async def get_rubric(
    rid: str,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM rubrics WHERE id = $1", rid)
    if not row:
        raise HTTPException(404, "Rubric not found")
    dims = await db.fetch(
        "SELECT * FROM rubric_dimensions WHERE rubric_id = $1 ORDER BY sort_order", row["id"],
    )
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "description": row["description"],
        "target_type": row["target_type"],
        "is_active": row["is_active"],
        "created_at": row["created_at"].isoformat(),
        "dimensions": [
            {
                "id": str(d["id"]),
                "name": d["name"],
                "criteria": d["criteria"],
                "weight": d["weight"],
                "max_score": d["max_score"],
                "sort_order": d["sort_order"],
            }
            for d in dims
        ],
    }


@app.post("/rubrics")
async def create_rubric(
    req: CreateRubricRequest,
    request: Request,
    auth: TokenPayload = Depends(require_instructor_or_admin),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    if req.target_type not in ("drill", "session"):
        raise HTTPException(422, "target_type must be 'drill' or 'session'")

    existing = await db.fetchval("SELECT id FROM rubrics WHERE name = $1", req.name)
    if existing:
        raise HTTPException(409, "A rubric with this name already exists")

    row = await db.fetchrow(
        """INSERT INTO rubrics (name, description, target_type, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id, created_at""",
        req.name, req.description, req.target_type, auth.user_id,
    )
    rubric_id = row["id"]

    await db.executemany(
        """INSERT INTO rubric_dimensions (rubric_id, name, criteria, weight, max_score, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        [
            (rubric_id, d.name, d.criteria, d.weight, d.max_score, d.sort_order)
            for d in req.dimensions
        ],
    )

    await cache.invalidate("rubrics:*")
    await audit.log(auth.user_id, "create_rubric", "rubrics/{}".format(str(rubric_id)),
                    {"name": req.name}, get_client_ip(request))

    return {"id": str(rubric_id), "name": req.name, "created_at": row["created_at"].isoformat()}


@app.put("/rubrics/{rid}")
async def update_rubric(
    rid: str,
    req: UpdateRubricRequest,
    request: Request,
    auth: TokenPayload = Depends(require_instructor_or_admin),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    row = await db.fetchrow("SELECT * FROM rubrics WHERE id = $1", rid)
    if not row:
        raise HTTPException(404, "Rubric not found")

    sets, vals, idx = [], [], 1
    if req.description is not None:
        sets.append("description = ${}".format(idx))
        vals.append(req.description)
        idx += 1
    if req.is_active is not None:
        sets.append("is_active = ${}".format(idx))
        vals.append(req.is_active)
        idx += 1

    if sets:
        vals.append(rid)
        await db.execute(
            "UPDATE rubrics SET {} WHERE id = ${}".format(", ".join(sets), idx), *vals,
        )

    if req.dimensions is not None:
        await db.execute("DELETE FROM rubric_dimensions WHERE rubric_id = $1", rid)
        await db.executemany(
            """INSERT INTO rubric_dimensions (rubric_id, name, criteria, weight, max_score, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6)""",
            [(rid, d.name, d.criteria, d.weight, d.max_score, d.sort_order) for d in req.dimensions],
        )

    await cache.invalidate("rubrics:*")
    await audit.log(auth.user_id, "update_rubric", "rubrics/{}".format(rid),
                    None, get_client_ip(request))

    return await get_rubric(rid=rid, auth=auth, db=db)


# ---------------------------------------------------------------------------
# GRADING
# ---------------------------------------------------------------------------
@app.post("/grades")
async def create_grade(
    req: GradeRequest,
    request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    coach: CoachingEngine = Depends(get_coach),
    audit: AuditService = Depends(get_audit),
):
    if req.use_ai:
        await _rate_limit(cache, "ai:grade:{}".format(auth.user_id))

    if req.target_type not in ("drill", "session"):
        raise HTTPException(422, "target_type must be 'drill' or 'session'")

    # Verify rubric exists
    rubric = await db.fetchrow(
        "SELECT * FROM rubrics WHERE name = $1 AND is_active = TRUE", req.rubric_name,
    )
    if not rubric:
        raise HTTPException(404, "Rubric '{}' not found or inactive".format(req.rubric_name))
    if rubric["target_type"] != req.target_type:
        raise HTTPException(422, "Rubric target_type '{}' does not match '{}'".format(
            rubric["target_type"], req.target_type))

    # Verify target exists and belongs to user
    if req.target_type == "drill":
        target = await db.fetchrow(
            "SELECT * FROM drill_attempts WHERE id = $1 AND user_id = $2",
            req.target_id, auth.user_id,
        )
    else:
        target = await db.fetchrow(
            "SELECT * FROM session_runs WHERE id = $1 AND user_id = $2",
            req.target_id, auth.user_id,
        )
    if not target:
        raise HTTPException(404, "{} not found".format(req.target_type.capitalize()))

    # Load rubric dimensions
    dims = await db.fetch(
        "SELECT * FROM rubric_dimensions WHERE rubric_id = $1 ORDER BY sort_order",
        rubric["id"],
    )
    if not dims:
        raise HTTPException(422, "Rubric has no dimensions defined")

    ai_result = None
    dimension_scores = []

    if req.use_ai:
        # Build attempt data for AI grading
        data = _build_grading_data(target, req.target_type)
        dim_list = [
            {"name": d["name"], "weight": d["weight"], "criteria": d["criteria"]}
            for d in dims
        ]
        ai_result = await coach.grade(req.rubric_name, dim_list, data)

        # Parse AI response into dimension scores
        dimension_scores = _parse_ai_scores(ai_result.text, dims)

        await db.execute(
            """INSERT INTO ai_coaching_logs
               (user_id, context_type, context_id, prompt, response, model, latency_ms)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            auth.user_id, "grading", req.target_id,
            CoachingEngine.build_grading_prompt(req.rubric_name, dim_list, data),
            ai_result.text, ai_result.model, ai_result.latency_ms,
        )
    elif req.manual_scores:
        # Use manual scores
        dim_map = {d["name"]: d for d in dims}
        for ms in req.manual_scores:
            if ms.dimension_name not in dim_map:
                raise HTTPException(422, "Unknown dimension: {}".format(ms.dimension_name))
            dimension_scores.append({
                "dimension_id": str(dim_map[ms.dimension_name]["id"]),
                "score": ms.score,
                "justification": ms.justification,
            })
    else:
        raise HTTPException(422, "Either use_ai=true or provide manual_scores")

    # Calculate overall weighted score
    total_weight = sum(d["weight"] for d in dims)
    dim_id_to_weight = {str(d["id"]): d["weight"] for d in dims}
    weighted_sum = 0.0
    for ds in dimension_scores:
        w = dim_id_to_weight.get(ds["dimension_id"], 1.0)
        weighted_sum += ds["score"] * w
    overall_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0

    narrative = ai_result.text if ai_result else None

    # Insert grade
    grade_row = await db.fetchrow(
        """INSERT INTO grades
           (user_id, rubric_id, target_type, target_id, overall_score, narrative,
            ai_generated, ai_model, ai_latency_ms, graded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, created_at""",
        auth.user_id, rubric["id"], req.target_type, req.target_id,
        overall_score, narrative,
        req.use_ai, ai_result.model if ai_result else None,
        ai_result.latency_ms if ai_result else None,
        None if req.use_ai else auth.user_id,
    )

    # Insert dimension scores
    if dimension_scores:
        await db.executemany(
            """INSERT INTO grade_dimensions (grade_id, dimension_id, score, justification)
               VALUES ($1, $2, $3, $4)""",
            [
                (grade_row["id"], ds["dimension_id"], ds["score"], ds.get("justification"))
                for ds in dimension_scores
            ],
        )

    await cache.invalidate("grades:{}:*".format(auth.user_id))
    await audit.log(auth.user_id, "grade_created", "grades/{}".format(str(grade_row["id"])),
                    {"rubric": req.rubric_name, "target": req.target_id, "score": overall_score},
                    get_client_ip(request))

    return {
        "id": str(grade_row["id"]),
        "overall_score": overall_score,
        "narrative": narrative,
        "ai_generated": req.use_ai,
        "source": ai_result.source if ai_result else "manual",
        "advisory": True,
        "dimensions": dimension_scores,
        "created_at": grade_row["created_at"].isoformat(),
    }


@app.get("/grades/summary")
async def grade_summary(
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
):
    cached = await cache.get("grades:{}:summary".format(auth.user_id))
    if cached:
        return cached

    rows = await db.fetch(
        """SELECT r.name AS rubric_name, g.target_type,
           COUNT(*) AS total_grades,
           ROUND(AVG(g.overall_score)::numeric, 1) AS avg_score,
           MAX(g.overall_score) AS best_score,
           MIN(g.overall_score) AS worst_score,
           MAX(g.created_at) AS last_graded
           FROM grades g JOIN rubrics r ON g.rubric_id = r.id
           WHERE g.user_id = $1
           GROUP BY r.name, g.target_type
           ORDER BY total_grades DESC""",
        auth.user_id,
    )
    result = {
        "by_rubric": [
            {
                "rubric_name": r["rubric_name"],
                "target_type": r["target_type"],
                "total_grades": r["total_grades"],
                "avg_score": float(r["avg_score"]) if r["avg_score"] else 0,
                "best_score": float(r["best_score"]) if r["best_score"] else 0,
                "worst_score": float(r["worst_score"]) if r["worst_score"] else 0,
                "last_graded": r["last_graded"].isoformat() if r["last_graded"] else None,
            }
            for r in rows
        ],
        "total_grades": sum(r["total_grades"] for r in rows),
    }
    await cache.set("grades:{}:summary".format(auth.user_id), result, 300)
    return result


@app.get("/grades")
async def list_grades(
    page: int = 1, per_page: int = 20,
    target_type: str | None = None,
    rubric_name: str | None = None,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    page = max(1, page)
    per_page = max(1, min(100, per_page))
    offset = (page - 1) * per_page

    where = ["g.user_id = $1"]
    args: list = [auth.user_id]
    idx = 2

    if target_type:
        where.append("g.target_type = ${}".format(idx))
        args.append(target_type)
        idx += 1
    if rubric_name:
        where.append("r.name = ${}".format(idx))
        args.append(rubric_name)
        idx += 1

    where_sql = " AND ".join(where)
    total = await db.fetchval(
        "SELECT COUNT(*) FROM grades g JOIN rubrics r ON g.rubric_id = r.id WHERE {}".format(where_sql),
        *args,
    )

    args.extend([per_page, offset])
    rows = await db.fetch(
        """SELECT g.*, r.name AS rubric_name
           FROM grades g JOIN rubrics r ON g.rubric_id = r.id
           WHERE {} ORDER BY g.created_at DESC
           LIMIT ${} OFFSET ${}""".format(where_sql, idx, idx + 1),
        *args,
    )
    return {
        "grades": [
            {
                "id": str(r["id"]),
                "rubric_name": r["rubric_name"],
                "target_type": r["target_type"],
                "target_id": str(r["target_id"]),
                "overall_score": float(r["overall_score"]),
                "ai_generated": r["ai_generated"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, math.ceil(total / per_page)),
    }


@app.get("/grades/{gid}")
async def get_grade(
    gid: str,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
):
    row = await db.fetchrow(
        """SELECT g.*, r.name AS rubric_name
           FROM grades g JOIN rubrics r ON g.rubric_id = r.id
           WHERE g.id = $1 AND g.user_id = $2""",
        gid, auth.user_id,
    )
    if not row:
        raise HTTPException(404, "Grade not found")

    dim_scores = await db.fetch(
        """SELECT gd.*, rd.name AS dimension_name, rd.weight, rd.criteria
           FROM grade_dimensions gd
           JOIN rubric_dimensions rd ON gd.dimension_id = rd.id
           WHERE gd.grade_id = $1
           ORDER BY rd.sort_order""",
        row["id"],
    )
    return {
        "id": str(row["id"]),
        "rubric_name": row["rubric_name"],
        "target_type": row["target_type"],
        "target_id": str(row["target_id"]),
        "overall_score": float(row["overall_score"]),
        "narrative": row["narrative"],
        "ai_generated": row["ai_generated"],
        "ai_model": row["ai_model"],
        "created_at": row["created_at"].isoformat(),
        "dimensions": [
            {
                "name": d["dimension_name"],
                "weight": d["weight"],
                "criteria": d["criteria"],
                "score": float(d["score"]),
                "justification": d["justification"],
            }
            for d in dim_scores
        ],
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_grading_data(target, target_type: str) -> dict:
    """Extract grading-relevant data from a drill attempt or session run."""
    if target_type == "drill":
        return {
            "drill_id": target["drill_id"],
            "mode": target["mode"],
            "score": target["score"],
            "duration_s": target["duration_s"],
            "minutes_planned": target["minutes_planned"],
            "missed": json.loads(target["missed"]) if target["missed"] else [],
            "checks": json.loads(target["checks"]) if target["checks"] else {},
        }
    return {
        "plan": target["plan"],
        "persona": target["persona"],
        "ep_type": target["ep_type"],
        "vak": target["vak"],
        "turns_total": target["turns_total"],
        "awaits_total": target["awaits_total"],
        "nods_counted": target["nods_counted"],
        "nlp_coverage_pct": target["nlp_coverage_pct"],
        "duration_s": target["duration_s"],
        "stages_seen": json.loads(target["stages_seen"]) if target["stages_seen"] else [],
        "tonalities_seen": json.loads(target["tonalities_seen"]) if target["tonalities_seen"] else [],
        "nlp_types_seen": json.loads(target["nlp_types_seen"]) if target["nlp_types_seen"] else [],
    }


def _parse_ai_scores(ai_text: str, dims) -> list[dict]:
    """Best-effort parse of AI grading output into dimension scores.

    The AI response may not be perfectly structured, so we assign
    a default score of 70 for any dimension we can't parse.
    """
    scores = []
    for d in dims:
        score = 70.0  # default if we can't parse
        name_lower = d["name"].lower()
        # Look for patterns like "Technique Accuracy: 85" or "score: 85/100"
        for line in ai_text.split("\n"):
            if name_lower in line.lower():
                nums = re.findall(r'(\d+(?:\.\d+)?)\s*(?:/\s*100|%)?', line)
                for n in nums:
                    val = float(n)
                    if 0 <= val <= 100:
                        score = val
                        break
                break
        justification = None
        for line in ai_text.split("\n"):
            if name_lower in line.lower() and ":" in line:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    justification = parts[1].strip()[:500]
                break
        scores.append({
            "dimension_id": str(d["id"]),
            "score": score,
            "justification": justification,
        })
    return scores


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
