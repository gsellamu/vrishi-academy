"""
E2E WebSocket test: boots persona-svc (:8601) and orchestrator (:8600)
in-process, creates sessions for all 3 profile/plan combos, walks the
full WS turn sequence for p1/vocational/maya, verifies all 16 awaits
get fallback replies and the done event fires.

Run:  python services/test_e2e_ws.py
"""
from __future__ import annotations
import asyncio, importlib, json, os, sys, time
from pathlib import Path

# Set env BEFORE importing the FastAPI apps
ROOT = Path(__file__).resolve().parents[1]
os.environ["SESSION_TEMPLATE_DIR"] = str(ROOT / "packages" / "session-templates")
os.environ["PERSONA_DIR"] = str(ROOT / "services" / "persona-svc" / "personas")
os.environ["OLLAMA_URL"] = "http://localhost:11434"  # may be offline; fallback is fine
os.environ["PERSONA_URL"] = "http://127.0.0.1:8601"
os.environ["CORS_ORIGINS"] = "http://localhost:3070"

# Import persona-svc first, then orchestrator (both named main.py)
sys.path.insert(0, str(ROOT / "services" / "persona-svc"))
persona_mod = importlib.import_module("main")
PERSONA_APP = persona_mod.app

sys.path.remove(str(ROOT / "services" / "persona-svc"))
sys.path.insert(0, str(ROOT / "services" / "academy-orchestrator"))
del sys.modules["main"]
orch_mod = importlib.import_module("main")
ORCH_APP = orch_mod.app

import uvicorn
import httpx
from websockets.sync.client import connect as ws_connect

PERSONA_PORT = 8601
ORCH_PORT = 8600

COMBOS = [
    ("p1", "vocational", "maya"),
    ("p2", "referral", "leo"),
    ("p3", "avocational", "maya"),
]


async def run_server(app, port: int, started: asyncio.Event):
    config = uvicorn.Config(app, host="127.0.0.1", port=port,
                            log_level="warning", access_log=False)
    server = uvicorn.Server(config)
    original_startup = server.startup

    async def patched_startup(*a, **kw):
        await original_startup(*a, **kw)
        started.set()

    server.startup = patched_startup
    await server.serve()


async def wait_healthy(port: int, timeout: float = 15.0):
    url = f"http://127.0.0.1:{port}/health"
    deadline = time.monotonic() + timeout
    async with httpx.AsyncClient() as cli:
        while time.monotonic() < deadline:
            try:
                r = await cli.get(url, timeout=2.0)
                if r.status_code == 200:
                    return r.json()
            except Exception:
                pass
            await asyncio.sleep(0.3)
    raise TimeoutError(f"Service on :{port} did not become healthy in {timeout}s")


def ws_walk(session_id: str, total_turns: int) -> dict:
    url = f"ws://127.0.0.1:{ORCH_PORT}/ws/{session_id}"
    results = {
        "turns": [], "awaits_seen": [], "replies_seen": [],
        "stages_seen": [], "snaps": 0, "done": None, "errors": [],
    }
    with ws_connect(url) as ws:
        sends = 0
        max_sends = total_turns + 50
        while sends < max_sends:
            ws.send(json.dumps({"cmd": "next"}))
            sends += 1
            raw = ws.recv(timeout=15)
            msg = json.loads(raw)
            if msg.get("event") == "error":
                results["errors"].append(msg["message"])
                break
            t = msg["turn"]
            results["turns"].append(t)
            if t["type"] == "stage":
                results["stages_seen"].append(t["name"])
            elif t["type"] == "await":
                results["awaits_seen"].append(t["name"])
                raw2 = ws.recv(timeout=15)
                msg2 = json.loads(raw2)
                t2 = msg2["turn"]
                results["turns"].append(t2)
                if t2["type"] == "reply":
                    results["replies_seen"].append(t2)
            elif t["type"] == "snap":
                results["snaps"] += 1
            elif t["type"] == "done":
                results["done"] = t.get("stats")
                break
    return results


async def main():
    print("=" * 60)
    print("VRishi Academy E2E WS Test")
    print("=" * 60)

    persona_ready = asyncio.Event()
    orch_ready = asyncio.Event()
    persona_task = asyncio.create_task(run_server(PERSONA_APP, PERSONA_PORT, persona_ready))
    orch_task = asyncio.create_task(run_server(ORCH_APP, ORCH_PORT, orch_ready))

    try:
        print("\n[1] Waiting for persona-svc :8601 ...")
        h1 = await wait_healthy(PERSONA_PORT)
        print(f"    OK: {h1}")

        print("[2] Waiting for orchestrator :8600 ...")
        h2 = await wait_healthy(ORCH_PORT)
        print(f"    OK: {h2}")

        # Test all 3 combos: create session + verify turn counts
        print("\n[3] Creating sessions for all 3 combos ...")
        sessions = []
        async with httpx.AsyncClient() as cli:
            for prof, plan, pers in COMBOS:
                r = await cli.post(f"http://127.0.0.1:{ORCH_PORT}/sessions",
                                   json={"profile": prof, "plan": plan, "persona": pers})
                r.raise_for_status()
                s = r.json()
                sessions.append(s)
                print(f"    {prof}/{plan}/{pers}: turns={s['turns']} awaits={s['awaits']} stages={len(s['stages'])}")
                assert s["awaits"] == 16, f"Expected 16 awaits for {prof}, got {s['awaits']}"

        # Full WS walk on first combo (p1/vocational/maya)
        sid = sessions[0]["session_id"]
        total = sessions[0]["turns"]
        expected_awaits = sessions[0]["awaits"]
        print(f"\n[4] Walking {total} turns via WS (p1/vocational/maya, sid={sid}) ...")
        results = await asyncio.to_thread(ws_walk, sid, total)

        # Report
        print(f"\n{'=' * 60}")
        print("RESULTS")
        print(f"{'=' * 60}")
        print(f"  Total events received : {len(results['turns'])}")
        print(f"  Stages               : {len(results['stages_seen'])} -> {results['stages_seen']}")
        print(f"  Awaits               : {len(results['awaits_seen'])} -> {results['awaits_seen']}")
        print(f"  Replies              : {len(results['replies_seen'])}")
        print(f"  Snaps                : {results['snaps']}")
        print(f"  Done event           : {'YES' if results['done'] else 'NO'}")
        if results["done"]:
            print(f"  Stats                : {results['done']}")
        if results["errors"]:
            print(f"  ERRORS               : {results['errors']}")

        # --- Enrichment checks (prosody + NLP) ---
        line_turns = [t for t in results["turns"] if t.get("type") == "line"]
        lines_with_prosody = [t for t in line_turns if t.get("prosody")]
        lines_with_nlp = [t for t in line_turns if t.get("nlp")]
        stage_turns = [t for t in results["turns"] if t.get("type") == "stage"]
        stages_with_tonality = [t for t in stage_turns if t.get("tonality")]
        tonalities_seen = sorted(set(t["tonality"] for t in stages_with_tonality))
        nlp_types_seen = sorted(set(n["type"] for t in lines_with_nlp for n in t["nlp"]))

        print(f"\n{'=' * 60}")
        print("ENRICHMENT")
        print(f"{'=' * 60}")
        print(f"  Lines total          : {len(line_turns)}")
        print(f"  Lines with prosody   : {len(lines_with_prosody)}")
        print(f"  Lines with NLP marks : {len(lines_with_nlp)}")
        print(f"  NLP types seen       : {nlp_types_seen}")
        print(f"  Stages with tonality : {len(stages_with_tonality)}/{len(stage_turns)}")
        print(f"  Tonalities seen      : {tonalities_seen}")

        # Spot-check one prosody dict
        if lines_with_prosody:
            sample = lines_with_prosody[0]["prosody"]
            print(f"  Sample prosody       : {sample}")

        ok = True
        if len(results["awaits_seen"]) != expected_awaits:
            print(f"\nFAIL: expected {expected_awaits} awaits, got {len(results['awaits_seen'])}")
            ok = False
        if len(results["replies_seen"]) != expected_awaits:
            print(f"\nFAIL: expected {expected_awaits} replies, got {len(results['replies_seen'])}")
            ok = False
        if not results["done"]:
            print("\nFAIL: done event never fired")
            ok = False
        empty_replies = [r for r in results["replies_seen"] if not r.get("text")]
        if empty_replies:
            print(f"\nFAIL: {len(empty_replies)} replies had empty text")
            ok = False
        # Enrichment assertions
        if len(lines_with_prosody) != len(line_turns):
            print(f"\nFAIL: {len(line_turns) - len(lines_with_prosody)} lines missing prosody")
            ok = False
        if len(lines_with_nlp) == 0:
            print("\nFAIL: no NLP highlights detected in any line")
            ok = False
        if len(stages_with_tonality) != len(stage_turns):
            print(f"\nFAIL: {len(stage_turns) - len(stages_with_tonality)} stages missing tonality")
            ok = False
        expected_tonalities = {"conversational", "paternal"}
        missing_ton = expected_tonalities - set(tonalities_seen)
        if missing_ton:
            print(f"\nFAIL: expected tonalities {missing_ton} not seen")
            ok = False
        for p_field in ("rate", "pitch", "volume", "tonality", "pause_mult"):
            if lines_with_prosody and p_field not in lines_with_prosody[0]["prosody"]:
                print(f"\nFAIL: prosody missing field '{p_field}'")
                ok = False

        if ok:
            print(f"\nPASS: All {expected_awaits} awaits got fallback replies, done event fired.")
            print(f"      All 3 session combos created successfully (16 awaits each).")
            print(f"      Enrichment: {len(lines_with_prosody)}/{len(line_turns)} prosody, "
                  f"{len(lines_with_nlp)} NLP-annotated lines, {len(tonalities_seen)} tonalities.")
        else:
            print("\nFAILED: See above.")
            sys.exit(1)

    finally:
        persona_task.cancel()
        orch_task.cancel()
        try:
            await persona_task
        except asyncio.CancelledError:
            pass
        try:
            await orch_task
        except asyncio.CancelledError:
            pass


if __name__ == "__main__":
    asyncio.run(main())
