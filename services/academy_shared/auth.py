"""JWT utilities and FastAPI auth dependencies for academy services."""
from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Read from env -- no insecure hardcoded defaults.  Services that use
# create_app() get these values validated at startup via AcademyConfig.
JWT_SECRET = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or ""
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))

bearer = HTTPBearer(auto_error=False)


# -- password hashing (bcrypt direct, no passlib) ----------------------------

def hash_password(plain: str) -> str:
    pw = plain.encode("utf-8")[:72]
    return _bcrypt.hashpw(pw, _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw = plain.encode("utf-8")[:72]
    return _bcrypt.checkpw(pw, hashed.encode("utf-8"))


# -- JWT tokens --------------------------------------------------------------

def create_access_token(user_id: str, role: str, extra: dict | None = None) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET_KEY not configured")
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> tuple[str, datetime]:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET_KEY not configured")
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=REFRESH_TOKEN_DAYS)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": exp,
        "iat": now,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    # Return naive UTC for asyncpg (TIMESTAMP WITHOUT TIME ZONE columns)
    return token, exp.replace(tzinfo=None)


def decode_token(token: str) -> dict:
    if not JWT_SECRET:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Authentication not configured")
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


# -- FastAPI dependencies ----------------------------------------------------

class TokenPayload:
    """Parsed JWT claims."""
    __slots__ = ("user_id", "role", "token_type")

    def __init__(self, sub: str, role: str, token_type: str):
        self.user_id = sub
        self.role = role
        self.token_type = token_type


async def require_auth(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> TokenPayload:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing authorization header")
    claims = decode_token(creds.credentials)
    if claims.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not an access token")
    return TokenPayload(sub=claims["sub"], role=claims.get("role", "student"), token_type="access")


async def optional_auth(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> TokenPayload | None:
    """Returns TokenPayload if valid token present, None otherwise (no 401)."""
    if not creds:
        return None
    try:
        claims = decode_token(creds.credentials)
        if claims.get("type") != "access":
            return None
        return TokenPayload(sub=claims["sub"], role=claims.get("role", "student"), token_type="access")
    except Exception:
        return None


async def require_admin(auth: TokenPayload = Depends(require_auth)) -> TokenPayload:
    if auth.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return auth


async def require_instructor_or_admin(auth: TokenPayload = Depends(require_auth)) -> TokenPayload:
    if auth.role not in ("instructor", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Instructor or admin access required")
    return auth


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
