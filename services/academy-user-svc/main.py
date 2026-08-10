"""
academy-user-svc (:8602) -- P1 slice
Authentication, authorization, and user management for VRishi Academy.

Cloud-ready: lifespan, structured logging, DI, /healthz + /readyz.
"""
from __future__ import annotations
import os, re, sys, hashlib, json
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy_shared.service_factory import create_app, get_db, get_cache, get_audit
from academy_shared.database import DatabasePool
from academy_shared.cache import CacheService
from academy_shared.audit import AuditService
from academy_shared.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    require_auth, require_admin, require_instructor_or_admin,
    TokenPayload, get_client_ip, JWT_SECRET,
)

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
INVITE_CODE = os.getenv("ACADEMY_INVITE_CODE", "")
OPEN_REGISTRATION = os.getenv("ACADEMY_OPEN_REGISTRATION", "false").lower() == "true"
MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
LOCKOUT_MINUTES = int(os.getenv("LOCKOUT_MINUTES", "15"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "20"))

app = create_app("academy-user-svc", "1.0.0")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
PASSWORD_MIN_LENGTH = 8


def validate_email_format(email: str) -> str:
    email = email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Invalid email format")
    return email


def validate_password_strength(pw: str):
    if len(pw) < PASSWORD_MIN_LENGTH:
        raise HTTPException(422, "Password must be at least {} characters".format(PASSWORD_MIN_LENGTH))
    if not re.search(r"[A-Z]", pw):
        raise HTTPException(422, "Password must contain at least one uppercase letter")
    if not re.search(r"[0-9]", pw):
        raise HTTPException(422, "Password must contain at least one digit")


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _user_dict(row) -> dict:
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "name": row["name"],
        "display_name": row["display_name"],
        "role": row["role"],
        "hmi_student_id": row["hmi_student_id"],
        "aha_number": row["aha_number"],
        "semester": row["semester"],
        "graduation_target": str(row["graduation_target"]) if row["graduation_target"] else None,
        "mentor_name": row["mentor_name"],
        "avatar_url": row["avatar_url"],
        "is_active": row["is_active"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "last_login": row["last_login"].isoformat() if row["last_login"] else None,
    }


async def _rate_limit(cache: CacheService, key: str, window: int = RATE_LIMIT_WINDOW, max_hits: int = RATE_LIMIT_MAX):
    hits = await cache.incr("rl:{}".format(key), window)
    if hits > max_hits:
        raise HTTPException(429, "Too many requests. Try again later.")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    invite_code: str = ""
    hmi_student_id: str = ""
    semester: int = 1
    graduation_target: str = ""
    mentor_name: str = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(None, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    hmi_student_id: str | None = Field(None, max_length=50)
    aha_number: str | None = Field(None, max_length=50)
    semester: int | None = None
    graduation_target: str | None = Field(None, max_length=10)
    mentor_name: str | None = Field(None, max_length=200)
    avatar_url: str | None = Field(None, max_length=2048)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v):
        if v and not v.startswith(("https://", "http://", "/")):
            raise ValueError("avatar_url must be an HTTP(S) URL or relative path")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ("student", "instructor", "admin"):
            raise ValueError("Role must be student, instructor, or admin")
        return v


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/auth/register")
async def register(
    req: RegisterRequest, request: Request,
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    await _rate_limit(cache, get_client_ip(request), window=300, max_hits=5)

    if not OPEN_REGISTRATION:
        if not req.invite_code or req.invite_code.strip() != INVITE_CODE:
            raise HTTPException(403, "Invalid invite code. Contact your instructor.")

    email = validate_email_format(req.email)
    validate_password_strength(req.password)

    existing = await db.fetchval("SELECT id FROM users WHERE email = $1", email)
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    pw_hash = hash_password(req.password)
    grad_target = None
    if req.graduation_target:
        try:
            grad_target = datetime.strptime(req.graduation_target, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(422, "graduation_target must be YYYY-MM-DD")

    row = await db.fetchrow(
        """INSERT INTO users (email, password_hash, name, hmi_student_id, semester,
           graduation_target, mentor_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, email, name, role, created_at""",
        email, pw_hash, req.name.strip(), req.hmi_student_id or None,
        max(1, min(4, req.semester)), grad_target, req.mentor_name or None,
    )

    uid = str(row["id"])
    await db.execute("INSERT INTO gap_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING", row["id"])
    await db.execute("INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING", row["id"])

    await audit.log(uid, "register", "users", {"email": email},
                    get_client_ip(request), request.headers.get("user-agent", ""))

    access = create_access_token(uid, "student")
    refresh, refresh_exp = create_refresh_token(uid)
    await db.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        row["id"], _token_hash(refresh), refresh_exp,
    )

    return {
        "user": {"id": uid, "email": email, "name": req.name.strip(), "role": "student"},
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


@app.post("/auth/login")
async def login(
    req: LoginRequest, request: Request,
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    ip = get_client_ip(request)
    await _rate_limit(cache, "login:{}".format(ip), window=300, max_hits=15)

    email = validate_email_format(req.email)

    row = await db.fetchrow(
        "SELECT id, email, name, password_hash, role, is_active, login_attempts, locked_until "
        "FROM users WHERE email = $1",
        email,
    )
    if not row:
        raise HTTPException(401, "Invalid email or password")

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if row["locked_until"] and row["locked_until"] > now_utc:
        remaining = int((row["locked_until"] - now_utc).total_seconds() / 60) + 1
        raise HTTPException(
            423, "Account locked due to too many failed attempts. Try again in {} minutes.".format(remaining)
        )

    if not row["is_active"]:
        raise HTTPException(403, "Account is deactivated. Contact your administrator.")

    if not verify_password(req.password, row["password_hash"]):
        attempts = (row["login_attempts"] or 0) + 1
        if attempts >= MAX_LOGIN_ATTEMPTS:
            lock_until = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=LOCKOUT_MINUTES)
            await db.execute(
                "UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3",
                attempts, lock_until, row["id"],
            )
            await audit.log(str(row["id"]), "login_lockout", "users",
                            {"attempts": attempts, "ip": ip}, ip)
            raise HTTPException(
                423, "Account locked for {} minutes after {} failed attempts.".format(
                    LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS)
            )
        else:
            await db.execute("UPDATE users SET login_attempts = $1 WHERE id = $2", attempts, row["id"])
            remaining = MAX_LOGIN_ATTEMPTS - attempts
            raise HTTPException(401, "Invalid email or password. {} attempts remaining.".format(remaining))

    uid = str(row["id"])
    await db.execute(
        "UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1",
        row["id"],
    )

    access = create_access_token(uid, row["role"])
    refresh, refresh_exp = create_refresh_token(uid)
    await db.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        row["id"], _token_hash(refresh), refresh_exp,
    )

    await audit.log(uid, "login", "users", {"ip": ip}, ip)

    await cache.setex_raw("user:{}".format(uid), 3600, json.dumps({
        "id": uid, "role": row["role"], "is_active": row["is_active"],
    }))

    return {
        "user": {"id": uid, "email": row["email"], "name": row["name"], "role": row["role"]},
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


@app.post("/auth/refresh")
async def refresh_token(
    req: RefreshRequest, request: Request,
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    await _rate_limit(cache, get_client_ip(request), window=60, max_hits=10)

    claims = decode_token(req.refresh_token)
    if claims.get("type") != "refresh":
        raise HTTPException(401, "Not a refresh token")

    th = _token_hash(req.refresh_token)
    row = await db.fetchrow(
        "SELECT id, user_id FROM refresh_tokens WHERE token_hash = $1 AND NOT revoked AND expires_at > NOW()",
        th,
    )
    if not row:
        reused = await db.fetchrow("SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked", th)
        if reused:
            await db.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1", reused["user_id"])
            await audit.log(str(reused["user_id"]), "token_reuse_detected", "refresh_tokens",
                            {"ip": get_client_ip(request)}, get_client_ip(request))
        raise HTTPException(401, "Refresh token expired or revoked")

    user = await db.fetchrow("SELECT id, role, is_active FROM users WHERE id = $1", row["user_id"])
    if not user or not user["is_active"]:
        raise HTTPException(403, "Account is deactivated")

    uid = str(user["id"])
    new_access = create_access_token(uid, user["role"])
    new_refresh, new_exp = create_refresh_token(uid)
    new_row = await db.fetchrow(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
        user["id"], _token_hash(new_refresh), new_exp,
    )
    await db.execute(
        "UPDATE refresh_tokens SET revoked = TRUE, replaced_by = $1 WHERE id = $2",
        new_row["id"], row["id"],
    )

    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@app.post("/auth/logout")
async def logout(
    req: RefreshRequest, request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    audit: AuditService = Depends(get_audit),
):
    th = _token_hash(req.refresh_token)
    await db.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1", th)
    await cache.delete("user:{}".format(auth.user_id))
    await audit.log(auth.user_id, "logout", "users", None, get_client_ip(request))
    return {"ok": True}


@app.post("/auth/change-password")
async def change_password(
    req: ChangePasswordRequest, request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    validate_password_strength(req.new_password)
    row = await db.fetchrow("SELECT password_hash FROM users WHERE id = $1", auth.user_id)
    if not row or not verify_password(req.current_password, row["password_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    new_hash = hash_password(req.new_password)
    await db.execute("UPDATE users SET password_hash = $1 WHERE id = $2", new_hash, auth.user_id)
    await db.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1", auth.user_id)
    await audit.log(auth.user_id, "change_password", "users", None, get_client_ip(request))
    return {"ok": True, "message": "Password changed. Please log in again."}


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------
@app.get("/auth/me")
async def get_me(auth: TokenPayload = Depends(require_auth), db: DatabasePool = Depends(get_db)):
    row = await db.fetchrow("SELECT * FROM users WHERE id = $1", auth.user_id)
    if not row:
        raise HTTPException(404, "User not found")
    return _user_dict(row)


@app.patch("/auth/me")
async def update_me(
    req: UpdateProfileRequest, request: Request,
    auth: TokenPayload = Depends(require_auth),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    sets, vals, idx = [], [], 1
    for field in ("name", "display_name", "hmi_student_id", "aha_number",
                  "semester", "mentor_name", "avatar_url"):
        val = getattr(req, field, None)
        if val is not None:
            if field == "semester":
                val = max(1, min(4, val))
            elif field == "name" and not val.strip():
                raise HTTPException(422, "Name cannot be empty")
            sets.append("{} = ${}".format(field, idx))
            vals.append(val)
            idx += 1

    if req.graduation_target is not None:
        try:
            gd = datetime.strptime(req.graduation_target, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(422, "graduation_target must be YYYY-MM-DD")
        sets.append("graduation_target = ${}".format(idx))
        vals.append(gd)
        idx += 1

    if not sets:
        raise HTTPException(422, "No fields to update")

    vals.append(auth.user_id)
    await db.execute(
        "UPDATE users SET {} WHERE id = ${}".format(", ".join(sets), idx), *vals,
    )
    await audit.log(auth.user_id, "update_profile", "users",
                    {"fields": [s.split(" = ")[0] for s in sets]},
                    get_client_ip(request))

    row = await db.fetchrow("SELECT * FROM users WHERE id = $1", auth.user_id)
    return _user_dict(row)


# ---------------------------------------------------------------------------
# Admin user management
# ---------------------------------------------------------------------------
@app.get("/users")
async def list_users(
    page: int = 1, per_page: int = 20, role: str | None = None,
    search: str | None = None, active_only: bool = True,
    auth: TokenPayload = Depends(require_instructor_or_admin),
    db: DatabasePool = Depends(get_db),
):
    page = max(1, page)
    per_page = max(1, min(100, per_page))
    offset = (page - 1) * per_page

    where, args, idx = ["TRUE"], [], 1
    if role:
        where.append("role = ${}::user_role".format(idx))
        args.append(role)
        idx += 1
    if active_only:
        where.append("is_active = TRUE")
    if search:
        where.append("(name ILIKE ${0} OR email ILIKE ${0})".format(idx))
        args.append("%{}%".format(search))
        idx += 1

    where_sql = " AND ".join(where)
    total = await db.fetchval("SELECT COUNT(*) FROM users WHERE {}".format(where_sql), *args)

    args.extend([per_page, offset])
    rows = await db.fetch(
        "SELECT * FROM users WHERE {} ORDER BY created_at DESC LIMIT ${} OFFSET ${}".format(
            where_sql, idx, idx + 1),
        *args,
    )
    return {
        "users": [_user_dict(r) for r in rows],
        "total": total, "page": page, "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@app.get("/users/{uid}")
async def get_user(uid: str, auth: TokenPayload = Depends(require_auth), db: DatabasePool = Depends(get_db)):
    if auth.role not in ("instructor", "admin") and auth.user_id != uid:
        raise HTTPException(403, "Access denied")
    row = await db.fetchrow("SELECT * FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(404, "User not found")
    return _user_dict(row)


@app.patch("/users/{uid}/role")
async def change_role(
    uid: str, req: ChangeRoleRequest, request: Request,
    auth: TokenPayload = Depends(require_admin),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    if uid == auth.user_id:
        raise HTTPException(400, "Cannot change your own role")
    row = await db.fetchrow("SELECT id, role FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(404, "User not found")
    old_role = row["role"]
    await db.execute("UPDATE users SET role = $1::user_role WHERE id = $2", req.role, uid)
    await audit.log(auth.user_id, "change_role", "users/{}".format(uid),
                    {"old_role": old_role, "new_role": req.role}, get_client_ip(request))
    return {"ok": True, "user_id": uid, "old_role": old_role, "new_role": req.role}


@app.delete("/users/{uid}")
async def deactivate_user(
    uid: str, request: Request,
    auth: TokenPayload = Depends(require_admin),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    if uid == auth.user_id:
        raise HTTPException(400, "Cannot deactivate yourself")
    row = await db.fetchrow("SELECT id, is_active FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(404, "User not found")
    await db.execute("UPDATE users SET is_active = FALSE WHERE id = $1", uid)
    await db.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1", uid)
    await audit.log(auth.user_id, "deactivate_user", "users/{}".format(uid), None, get_client_ip(request))
    return {"ok": True, "user_id": uid}


@app.post("/users/{uid}/reactivate")
async def reactivate_user(
    uid: str, request: Request,
    auth: TokenPayload = Depends(require_admin),
    db: DatabasePool = Depends(get_db),
    audit: AuditService = Depends(get_audit),
):
    row = await db.fetchrow("SELECT id, is_active FROM users WHERE id = $1", uid)
    if not row:
        raise HTTPException(404, "User not found")
    await db.execute(
        "UPDATE users SET is_active = TRUE, login_attempts = 0, locked_until = NULL WHERE id = $1", uid,
    )
    await audit.log(auth.user_id, "reactivate_user", "users/{}".format(uid), None, get_client_ip(request))
    return {"ok": True, "user_id": uid}


# ---------------------------------------------------------------------------
# Audit log endpoint (admin only)
# ---------------------------------------------------------------------------
@app.get("/audit")
async def get_audit_log(
    page: int = 1, per_page: int = 50, user_id: str | None = None,
    action: str | None = None,
    auth: TokenPayload = Depends(require_admin),
    db: DatabasePool = Depends(get_db),
):
    page = max(1, page)
    per_page = max(1, min(200, per_page))
    offset = (page - 1) * per_page

    where, args, idx = ["TRUE"], [], 1
    if user_id:
        where.append("user_id = ${}::uuid".format(idx))
        args.append(user_id)
        idx += 1
    if action:
        where.append("action = ${}".format(idx))
        args.append(action)
        idx += 1

    where_sql = " AND ".join(where)
    total = await db.fetchval("SELECT COUNT(*) FROM audit_log WHERE {}".format(where_sql), *args)

    args.extend([per_page, offset])
    rows = await db.fetch(
        "SELECT * FROM audit_log WHERE {} ORDER BY created_at DESC LIMIT ${} OFFSET ${}".format(
            where_sql, idx, idx + 1),
        *args,
    )
    return {
        "entries": [
            {
                "id": r["id"],
                "user_id": str(r["user_id"]) if r["user_id"] else None,
                "action": r["action"],
                "resource": r["resource"],
                "detail": json.loads(r["detail"]) if r["detail"] else None,
                "ip": r["ip"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ],
        "total": total, "page": page, "per_page": per_page,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
