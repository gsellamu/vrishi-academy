"""
academy-orchestrator (:8600) - P0 slice 1
Renders a Kappasinian session via packages/session-templates, parses the SSML
marks into a turn sequence, and drives a role-play over WebSocket.

Turn types:
  stage  {name, zone, phase, tonality}  - stage boundary (UI chip + delivery cues)
  line   {text, stage, prosody, nlp}    - therapist prompter line + delivery metadata
  await  {name, stage}                  - ideomotor/verbal checkpoint -> persona replies
  reply  {text, persona, name}          - client (persona-svc) response to an await
  snap   {}                             - snap cue slot
  done   {stats}                        - session complete

prosody = {rate, pitch, volume, tonality, pause_mult}
nlp = [{type: "embed"|"presup"|"vak", phrase, start, end}]  (highlight spans)

WS protocol (client -> server): {"cmd":"next"}  advance one step
Server pushes one or two events per "next" (await is followed by its reply).
"""
from __future__ import annotations
import os, re, sys, subprocess, tempfile, uuid, time, json
from pathlib import Path
from typing import Any

import httpx
import yaml
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

TEMPLATE_DIR = Path(os.getenv("SESSION_TEMPLATE_DIR", "/app/packages/session-templates"))
PERSONA_URL = os.getenv("PERSONA_URL", "http://academy-persona:8000")
TTS_URL = os.getenv("TTS_URL", "http://localhost:8136")
CORS = os.getenv("CORS_ORIGINS", "http://localhost:3070").split(",")

# ── Assistant chat (Claude proxy — key stays server-side) ─────────────────
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ASSISTANT_MODEL = os.getenv("ASSISTANT_MODEL", "claude-sonnet-4-6")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_chat_rate: dict[str, list[float]] = {}
CHAT_RATE_LIMIT = int(os.getenv("CHAT_RATE_LIMIT", "10"))
CHAT_RATE_WINDOW = int(os.getenv("CHAT_RATE_WINDOW", "60"))

SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "7200"))  # 2h TTL
SESSION_MAX_COUNT = int(os.getenv("SESSION_MAX_COUNT", "100"))

app = FastAPI(title="academy-orchestrator", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS, allow_credentials=True,
                   allow_methods=["GET", "POST", "OPTIONS"],
                   allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
                   expose_headers=["X-Request-ID"])

# ---------- Prosody engine (inline from prosody.py, avoids subprocess) ----------
EP_VOICE_PARAMS = {
    "physical":     {"rate": 95, "pitch": -5, "volume": "medium", "pause_mult": 1.0},
    "emotional":    {"rate": 85, "pitch": -2, "volume": "soft",   "pause_mult": 1.3},
    "somnambulist": {"rate": 90, "pitch": -3, "volume": "medium", "pause_mult": 1.0},
    "balanced":     {"rate": 90, "pitch": -3, "volume": "medium", "pause_mult": 1.15},
}

TONALITY_MODS = {
    "authority":       {"rate": +5,  "pitch": -3, "volume": "medium", "pace": 1.05},
    "paternal":        {"rate": 0,   "pitch": -4, "volume": "medium", "pace": 1.0},
    "maternal":        {"rate": -5,  "pitch": +1, "volume": "soft",   "pace": 0.92},
    "conversational":  {"rate": +3,  "pitch": 0,  "volume": "medium", "pace": 1.0},
    "theta_hypnotic":  {"rate": -10, "pitch": -4, "volume": "soft",   "pace": 0.82},
}

# stage -> (zone, phase, default tonality, E-override tonality)
STAGE_MAP = {
    "pre_talk":       (1, "pre_induction", "conversational", None),
    "tom":            (2, "pre_induction", "paternal",       None),
    "induction":      (3, "induction",     "conversational", None),
    "sugg_questions": (3, "induction",     "conversational", None),
    "physio":         (3, "induction",     "paternal",       "maternal"),
    "conversion":     (3, "induction",     "paternal",       "maternal"),
    "count_5_0":      (4, "deepening",     "theta_hypnotic", None),
    "reactional":     (4, "deepening",     "authority",      "paternal"),
    "heavy_light":    (4, "deepening",     "paternal",       "maternal"),
    "deepener":       (4, "deepening",     "theta_hypnotic", None),
    "prog_relax":     (4, "deepening",     "maternal",       "maternal"),
    "suggestions":    (5, "therapy",       "theta_hypnotic", None),
    "emerge":         (8, "emergence",     "authority",      None),
    "finger_spread":  (7, "anchoring",     "paternal",       "maternal"),
    "homework":       (9, "post_session",  "conversational", None),
}
DEFAULT_STAGE = (5, "therapy", "conversational", None)

# NLP lexicon (loaded once at startup)
_LEX_PATH = TEMPLATE_DIR / "render" / "nlp_lexicon.yaml"
NLP_LEXICON: dict = {}
if _LEX_PATH.exists():
    NLP_LEXICON = yaml.safe_load(_LEX_PATH.read_text(encoding="utf-8")) or {}
NLP_EMBEDDED = NLP_LEXICON.get("embedded_commands", [])
NLP_PRESUP = NLP_LEXICON.get("presuppositions", [])
NLP_VAK_PREDS = NLP_LEXICON.get("vak_predicates", {})
NLP_PACE = NLP_LEXICON.get("pace_statements", [])
NLP_LEAD = NLP_LEXICON.get("lead_connectors", [])
NLP_TAG_Q = NLP_LEXICON.get("tag_questions", [])
NLP_DOUBLE = NLP_LEXICON.get("double_binds", [])
NLP_MILTON = NLP_LEXICON.get("milton_model", [])


def resolve_ep(physical_pct: int) -> str:
    if physical_pct >= 60:
        return "physical"
    if physical_pct <= 40:
        return "emotional"
    return "balanced"


def stage_prosody(stage_name: str, ep_type: str) -> dict:
    """Compute prosody params for a stage + EP type."""
    zone, phase, tonality, e_override = STAGE_MAP.get(stage_name, DEFAULT_STAGE)
    if ep_type == "emotional" and e_override:
        tonality = e_override
    ep = EP_VOICE_PARAMS.get(ep_type, EP_VOICE_PARAMS["balanced"])
    mods = TONALITY_MODS[tonality]
    return {
        "zone": zone, "phase": phase, "tonality": tonality,
        "rate": max(70, min(110, ep["rate"] + mods["rate"])),
        "pitch": ep["pitch"] + mods["pitch"],
        "volume": mods["volume"] if ep["volume"] == "medium" else ep["volume"],
        "pause_mult": round(ep["pause_mult"] * (1.25 if tonality == "theta_hypnotic" else 1.0), 2),
        "pace": round(mods["pace"], 2),
    }


def _scan(phrases: list, typ: str, text: str, lower: str, marks: list, word_boundary: bool = False):
    """Scan text for phrase matches and append to marks list."""
    for phrase in sorted(phrases, key=len, reverse=True):
        pat = rf"(?<!\w){re.escape(phrase.lower())}(?!\w)" if word_boundary else re.escape(phrase.lower())
        for m in re.finditer(pat, lower):
            marks.append({"type": typ, "phrase": text[m.start():m.end()], "start": m.start(), "end": m.end()})


def detect_nlp(text: str, vak: str | None = None) -> list[dict]:
    """Find NLP phrases in text, return highlight spans.
    Types: embed, presup, pace, lead, vak, tag, bind, milton."""
    marks = []
    lower = text.lower()
    _scan(NLP_EMBEDDED, "embed", text, lower, marks)
    _scan(NLP_PRESUP, "presup", text, lower, marks)
    _scan(NLP_PACE, "pace", text, lower, marks)
    _scan(NLP_LEAD, "lead", text, lower, marks)
    _scan(NLP_TAG_Q, "tag", text, lower, marks)
    _scan(NLP_DOUBLE, "bind", text, lower, marks)
    _scan(NLP_MILTON, "milton", text, lower, marks)
    if vak:
        for pred in NLP_VAK_PREDS.get(vak, []):
            for m in re.finditer(rf"(?<!\w){re.escape(pred.lower())}(?!\w)", lower):
                marks.append({"type": "vak", "phrase": text[m.start():m.end()], "start": m.start(), "end": m.end()})
    # Remove overlaps (longest match wins)
    marks.sort(key=lambda x: (-len(x["phrase"]), x["start"]))
    used = set()
    deduped = []
    for mk in marks:
        span = set(range(mk["start"], mk["end"]))
        if not span & used:
            deduped.append(mk)
            used |= span
    deduped.sort(key=lambda x: x["start"])
    return deduped

SESSIONS: dict[str, dict[str, Any]] = {}


def _evict_sessions():
    """Remove expired sessions and enforce max count."""
    now = time.time()
    expired = [sid for sid, s in SESSIONS.items() if now - s.get("started", 0) > SESSION_MAX_AGE]
    for sid in expired:
        del SESSIONS[sid]
    # Evict oldest if still over limit
    while len(SESSIONS) > SESSION_MAX_COUNT:
        oldest = min(SESSIONS, key=lambda k: SESSIONS[k].get("started", 0))
        del SESSIONS[oldest]
    # Also clean stale rate-limit entries
    stale_ips = [ip for ip, hits in _chat_rate.items() if not hits or now - hits[-1] > CHAT_RATE_WINDOW * 10]
    for ip in stale_ips:
        del _chat_rate[ip]


PROFILES = {
    "p1": "examples/profiles/p1_physical_analyst.yaml",
    "p2": "examples/profiles/p2_emotional_elder_caregiver.yaml",
    "p3": "examples/profiles/p3_child_student.yaml",
}
PLANS = {
    "vocational": "templates/vocational_presentation_confidence.session.yaml",
    "referral": "templates/referral_pain_comfort.session.yaml",
    "avocational": "templates/avocational_sports_performance.session.yaml",
}


class CreateSession(BaseModel):
    profile: str = "p1"
    plan: str = "vocational"
    persona: str = "maya"
    enrich: bool = True  # include prosody/NLP annotations


def load_profile(profile_key: str) -> dict:
    path = TEMPLATE_DIR / PROFILES[profile_key]
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def render_session(profile_key: str, plan_key: str) -> str:
    prof = TEMPLATE_DIR / PROFILES[profile_key]
    plan = TEMPLATE_DIR / PLANS[plan_key]
    out = Path(tempfile.gettempdir()) / f"orch-{uuid.uuid4().hex}.ssml"
    cmd = [sys.executable, str(TEMPLATE_DIR / "render/render_session.py"),
           "--profile", str(prof), "--plan", str(plan), "-o", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=str(TEMPLATE_DIR))
    if r.returncode != 0:
        raise HTTPException(500, f"render failed: {r.stderr[-400:]}")
    return out.read_text(encoding="utf-8")


TAG = re.compile(r'<mark name="(stage|await|cue)_([a-z_0-9]+)"/>')


def parse_turns(ssml: str, ep_type: str = "balanced", vak: str | None = None,
                do_enrich: bool = True) -> list[dict]:
    turns: list[dict] = []
    stage = "pre"
    pos = 0
    for m in TAG.finditer(ssml):
        chunk = ssml[pos:m.start()]
        text = re.sub(r"<[^>]+>", " ", chunk)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            for line in re.split(r"(?<=[.!?])\s+(?=[A-Z])", text):
                line = line.strip()
                if line:
                    turn = {"type": "line", "text": line, "stage": stage}
                    if do_enrich:
                        turn["prosody"] = stage_prosody(stage, ep_type)
                        nlp = detect_nlp(line, vak=vak)
                        if nlp:
                            turn["nlp"] = nlp
                    turns.append(turn)
        kind, name = m.group(1), m.group(2)
        if kind == "stage":
            stage = name
            turn = {"type": "stage", "name": name}
            if do_enrich:
                p = stage_prosody(name, ep_type)
                turn["zone"] = p["zone"]
                turn["phase"] = p["phase"]
                turn["tonality"] = p["tonality"]
            turns.append(turn)
        elif kind == "await":
            turns.append({"type": "await", "name": name, "stage": stage})
        elif kind == "cue":
            turns.append({"type": "snap"})
        pos = m.end()
    tail = re.sub(r"<[^>]+>", " ", ssml[pos:])
    tail = re.sub(r"\s+", " ", tail).strip()
    if tail:
        turn = {"type": "line", "text": tail, "stage": stage}
        if do_enrich:
            turn["prosody"] = stage_prosody(stage, ep_type)
            nlp = detect_nlp(tail, vak=vak)
            if nlp:
                turn["nlp"] = nlp
        turns.append(turn)
    return turns


async def persona_reply(persona: str, await_name: str, stage: str, last_line: str) -> dict:
    payload = {"persona_id": persona, "await_name": await_name,
               "stage": stage, "therapist_text": last_line}
    try:
        async with httpx.AsyncClient(timeout=8.0) as cli:
            r = await cli.post(f"{PERSONA_URL}/respond", json=payload)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"text": "*nods*", "persona": persona, "source": f"offline:{type(e).__name__}"}


EP_TO_SUGG = {"physical": "physical", "emotional": "emotional", "balanced": "physical"}


class TTSRequest(BaseModel):
    session_id: str
    turn_idx: int


@app.post("/tts")
async def tts_proxy(req: TTSRequest):
    """Proxy a single line turn to tts_service (:8136) for audio generation."""
    s = SESSIONS.get(req.session_id)
    if not s:
        raise HTTPException(404, "unknown session")
    if req.turn_idx < 0 or req.turn_idx >= len(s["turns"]):
        raise HTTPException(400, "turn_idx out of range")
    t = s["turns"][req.turn_idx]
    if t.get("type") != "line":
        raise HTTPException(400, "turn is not a line")
    prosody = t.get("prosody", {})
    payload = {
        "text": t["text"],
        "zone": prosody.get("zone", 0),
        "suggestibility_type": EP_TO_SUGG.get(s.get("ep_type", "balanced"), "physical"),
        "override_tonality": prosody.get("tonality"),
        "override_pace": prosody.get("pace", 1.0),
        "use_cache": True,
        "session_id": req.session_id,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.post(f"{TTS_URL}/api/v1/tts/hypnotic/generate", json=payload)
            r.raise_for_status()
            data = r.json()
            return {"audio_url": f"{TTS_URL}{data.get('audio_url', '')}", "duration": data.get("duration_seconds")}
    except httpx.ConnectError:
        raise HTTPException(503, "TTS service not available at " + TTS_URL)
    except Exception as e:
        raise HTTPException(502, f"TTS error: {type(e).__name__}: {str(e)[:200]}")


@app.get("/tts/health")
async def tts_health():
    """Check if TTS service is reachable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as cli:
            r = await cli.get(f"{TTS_URL}/api/v1/tts/health")
            return {"ok": r.status_code == 200, "tts_url": TTS_URL}
    except Exception:
        return {"ok": False, "tts_url": TTS_URL}


class AssistantChatRequest(BaseModel):
    context: str = "Portal"
    system: str = ""
    messages: list[dict] = []


@app.post("/assistant/chat")
async def assistant_chat(req: AssistantChatRequest, request: Request):
    """Claude proxy for the AssistantDock. Keeps the API key server-side."""
    if not ANTHROPIC_KEY:
        raise HTTPException(503, "ANTHROPIC_API_KEY not configured")

    # Per-IP rate limit
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = _chat_rate.setdefault(ip, [])
    hits[:] = [t for t in hits if now - t < CHAT_RATE_WINDOW]
    if len(hits) >= CHAT_RATE_LIMIT:
        raise HTTPException(429, "Rate limit exceeded")
    hits.append(now)

    # Sanitize messages: only role + content, enforce valid roles
    clean = []
    for m in req.messages:
        role = m.get("role", "user")
        if role not in ("user", "assistant"):
            role = "user"
        content = str(m.get("content", ""))[:4000]
        if content:
            clean.append({"role": role, "content": content})
    if not clean:
        raise HTTPException(400, "No messages provided")

    payload = {
        "model": ASSISTANT_MODEL,
        "max_tokens": 512,
        "system": (req.system or "You are a clinical hypnotherapy assistant.")[:2000],
        "messages": clean,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as cli:
            r = await cli.post(ANTHROPIC_URL, json=payload, headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            })
            r.raise_for_status()
            data = r.json()
            text = "".join(
                b.get("text", "") for b in data.get("content", [])
                if b.get("type") == "text"
            )
            return {"text": text.strip() or "No response from the model."}
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 401:
            raise HTTPException(502, "Claude API: invalid API key")
        if status == 429:
            raise HTTPException(429, "Claude API rate limit — try again shortly")
        raise HTTPException(502, f"Claude API error: {status}")
    except httpx.ConnectError:
        raise HTTPException(503, "Cannot reach Claude API")
    except Exception as e:
        raise HTTPException(502, f"Assistant error: {type(e).__name__}")


@app.get("/health")
def health():
    return {"ok": True, "service": "academy-orchestrator",
            "templates": TEMPLATE_DIR.exists(), "sessions": len(SESSIONS)}


@app.post("/sessions")
def create_session(req: CreateSession):
    _evict_sessions()
    if req.profile not in PROFILES or req.plan not in PLANS:
        raise HTTPException(400, "unknown profile or plan")
    profile_data = load_profile(req.profile)
    ppct = int(profile_data.get("suggestibility", {}).get("physical_pct", 50))
    ep_type = resolve_ep(ppct)
    vak = profile_data.get("vak")
    ssml = render_session(req.profile, req.plan)
    turns = parse_turns(ssml, ep_type=ep_type, vak=vak, do_enrich=req.enrich)
    sid = uuid.uuid4().hex[:12]
    SESSIONS[sid] = {"turns": turns, "idx": 0, "persona": req.persona,
                     "profile": req.profile, "plan": req.plan,
                     "ep_type": ep_type, "vak": vak,
                     "started": time.time(), "awaits": 0, "nods": 0}
    stages = [t["name"] for t in turns if t["type"] == "stage"]
    return {"session_id": sid, "turns": len(turns), "stages": stages,
            "awaits": sum(1 for t in turns if t["type"] == "await"),
            "ep_type": ep_type, "vak": vak}


@app.websocket("/ws/{sid}")
async def ws_session(ws: WebSocket, sid: str):
    await ws.accept()
    s = SESSIONS.get(sid)
    if not s:
        await ws.send_json({"event": "error", "message": "unknown session"})
        await ws.close()
        return
    try:
        while True:
            msg = await ws.receive_json()
            if msg.get("cmd") != "next":
                continue
            turns, i = s["turns"], s["idx"]
            if i >= len(turns):
                dur = round(time.time() - s["started"])
                await ws.send_json({"event": "turn", "turn": {"type": "done",
                    "stats": {"duration_s": dur, "awaits": s["awaits"], "turns": len(turns)}},
                    "idx": i, "total": len(turns)})
                continue
            t = turns[i]
            s["idx"] = i + 1
            await ws.send_json({"event": "turn", "turn": t, "idx": i, "total": len(turns)})
            if t["type"] == "await":
                s["awaits"] += 1
                last_line = next((x["text"] for x in reversed(turns[:i]) if x["type"] == "line"), "")
                rep = await persona_reply(s["persona"], t["name"], t.get("stage", ""), last_line)
                await ws.send_json({"event": "turn", "turn": {"type": "reply",
                    "text": rep.get("text", "*nods*"), "persona": rep.get("persona", s["persona"]),
                    "name": t["name"], "source": rep.get("source", "persona")},
                    "idx": i, "total": len(turns)})
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
