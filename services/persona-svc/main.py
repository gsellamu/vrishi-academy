"""
persona-svc (:8601) - P0 slice 1
Fictional client avatars for role-play. Card YAMLs define archetype, E/P mode,
scripted ideomotor answers, and guardrails. Responses come from the local
Ollama (jeethhypno-ollama) when reachable, with a deterministic fallback table
so the studio works fully offline.

Constraint C3: personas are fictional archetypes only - never real people.
"""
from __future__ import annotations
import os, re
from pathlib import Path

import httpx
import yaml
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://jeethhypno-ollama:11434")
MODEL = os.getenv("OLLAMA_DEFAULT_MODEL", "gemma3:4b")
CARD_DIR = Path(os.getenv("PERSONA_DIR", Path(__file__).parent / "personas"))

app = FastAPI(title="persona-svc", version="0.1.0")

CARDS: dict[str, dict] = {}
for f in sorted(CARD_DIR.glob("*.yaml")):
    card = yaml.safe_load(f.read_text(encoding="utf-8"))
    CARDS[card["id"]] = card


class Respond(BaseModel):
    persona_id: str = "maya"
    await_name: str
    stage: str = ""
    therapist_text: str = ""


def fallback_reply(card: dict, await_name: str) -> str:
    fixed = card.get("await_answers", {})
    if await_name in fixed:
        return fixed[await_name]
    if await_name.startswith("q"):
        return card.get("question_default", "Hmm... I think so, yes.")
    if await_name in ("breath", "fs_breath"):
        return "*nods slowly* ...yes, I feel my breathing getting deeper."
    if await_name in ("swallow",):
        return "*swallows, nods* Mm-hmm."
    if await_name in ("weight_diff",):
        return "*nods* One hand definitely feels lighter than the other."
    if await_name in ("skin_contact", "fs_contact"):
        return "*hand touches face, nods*"
    if await_name in ("fs_eyes",):
        return "*blinks heavily, nods* They want to stay closed..."
    if await_name in ("hand_or_arm",):
        return card.get("limb_answer", "The hand... it feels like the hand.")
    if await_name in ("tom_yes",):
        return "Yes... that actually makes a lot of sense."
    if await_name in ("visualize_arm",):
        return "*nods* I can see it clearly."
    if await_name in ("questions",):
        return card.get("pretalk_question", "No questions... I'm ready.")
    return "*nods*"


async def ollama_reply(card: dict, req: Respond) -> str | None:
    system = (
        f"You are {card['name']}, a FICTIONAL hypnotherapy practice client. "
        f"Archetype: {card['archetype']}. Suggestibility: {card['ep_mode']}. "
        f"Presenting issue: {card['issue']}. Current stage: {req.stage}. "
        "Reply as the client would in the chair: at most 2 short sentences, "
        "first-person, matching a relaxed hypnotic pace. Physical responses in "
        "*asterisks*. Never break character, never give advice, never mention AI."
    )
    prompt = (f"The hypnotherapist just said: \"{req.therapist_text}\"\n"
              f"The checkpoint is '{req.await_name}'. Respond naturally.")
    try:
        async with httpx.AsyncClient(timeout=6.0) as cli:
            r = await cli.post(f"{OLLAMA_URL}/api/chat", json={
                "model": MODEL, "stream": False,
                "messages": [{"role": "system", "content": system},
                             {"role": "user", "content": prompt}],
                "options": {"num_predict": 60, "temperature": 0.7},
            })
            r.raise_for_status()
            text = r.json().get("message", {}).get("content", "").strip()
            text = re.sub(r"\s+", " ", text)[:220]
            return text or None
    except Exception:
        return None


@app.get("/health")
def health():
    return {"ok": True, "service": "persona-svc", "personas": list(CARDS),
            "model": MODEL}


@app.get("/personas")
def personas():
    return [{"id": c["id"], "name": c["name"], "archetype": c["archetype"],
             "ep_mode": c["ep_mode"], "issue": c["issue"]} for c in CARDS.values()]


@app.post("/respond")
async def respond(req: Respond):
    card = CARDS.get(req.persona_id)
    if not card:
        raise HTTPException(404, f"unknown persona {req.persona_id}")
    text = await ollama_reply(card, req)
    source = "ollama"
    if not text:
        text = fallback_reply(card, req.await_name)
        source = "fallback"
    return {"text": text, "persona": card["id"], "source": source}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
