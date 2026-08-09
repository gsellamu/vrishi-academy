"""
academy-orchestrator (:8600) - P0 slice 1
Renders a Kappasinian session via packages/session-templates, parses the SSML
marks into a turn sequence, and drives a role-play over WebSocket.

Turn types:
  stage  {name}                  - stage boundary (UI chip)
  line   {text, stage}           - therapist prompter line (plain text)
  await  {name, stage}           - ideomotor/verbal checkpoint -> persona replies
  reply  {text, persona, name}   - client (persona-svc) response to an await
  snap   {}                      - snap cue slot
  done   {stats}                 - session complete

WS protocol (client -> server): {"cmd":"next"}  advance one step
Server pushes one or two events per "next" (await is followed by its reply).
"""
from __future__ import annotations
import os, re, sys, subprocess, tempfile, uuid, time, json
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

TEMPLATE_DIR = Path(os.getenv("SESSION_TEMPLATE_DIR", "/app/packages/session-templates"))
PERSONA_URL = os.getenv("PERSONA_URL", "http://academy-persona:8000")
CORS = os.getenv("CORS_ORIGINS", "http://localhost:3070").split(",")

app = FastAPI(title="academy-orchestrator", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

SESSIONS: dict[str, dict[str, Any]] = {}

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


def parse_turns(ssml: str) -> list[dict]:
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
                    turns.append({"type": "line", "text": line, "stage": stage})
        kind, name = m.group(1), m.group(2)
        if kind == "stage":
            stage = name
            turns.append({"type": "stage", "name": name})
        elif kind == "await":
            turns.append({"type": "await", "name": name, "stage": stage})
        elif kind == "cue":
            turns.append({"type": "snap"})
        pos = m.end()
    tail = re.sub(r"<[^>]+>", " ", ssml[pos:])
    tail = re.sub(r"\s+", " ", tail).strip()
    if tail:
        turns.append({"type": "line", "text": tail, "stage": stage})
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


@app.get("/health")
def health():
    return {"ok": True, "service": "academy-orchestrator",
            "templates": TEMPLATE_DIR.exists(), "sessions": len(SESSIONS)}


@app.post("/sessions")
def create_session(req: CreateSession):
    if req.profile not in PROFILES or req.plan not in PLANS:
        raise HTTPException(400, "unknown profile or plan")
    ssml = render_session(req.profile, req.plan)
    turns = parse_turns(ssml)
    sid = uuid.uuid4().hex[:12]
    SESSIONS[sid] = {"turns": turns, "idx": 0, "persona": req.persona,
                     "profile": req.profile, "plan": req.plan,
                     "started": time.time(), "awaits": 0, "nods": 0}
    stages = [t["name"] for t in turns if t["type"] == "stage"]
    return {"session_id": sid, "turns": len(turns), "stages": stages,
            "awaits": sum(1 for t in turns if t["type"] == "await")}


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
