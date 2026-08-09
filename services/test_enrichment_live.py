"""
Live enrichment verification: hits the already-running orchestrator (:8600)
and persona-svc (:8601), creates a session with enrich=True, walks the WS,
and validates prosody + NLP annotations on every turn.

Run:  python services/test_enrichment_live.py
"""
from __future__ import annotations
import json, sys
import httpx
from websockets.sync.client import connect as ws_connect

ORCH = "http://127.0.0.1:8600"
WS_BASE = "ws://127.0.0.1:8600"

COMBOS = [
    ("p1", "vocational", "maya"),
    ("p2", "referral", "leo"),
    ("p3", "avocational", "maya"),
]


def ws_walk(session_id: str, total_turns: int) -> dict:
    url = f"{WS_BASE}/ws/{session_id}"
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


def main():
    print("=" * 60)
    print("VRishi Academy — Live Enrichment Verification")
    print("=" * 60)

    # Health check
    with httpx.Client() as cli:
        r = cli.get(f"{ORCH}/health", timeout=5)
        r.raise_for_status()
        print(f"\n[1] Orchestrator healthy: {r.json()}")

    # Create sessions for all 3 combos
    print("\n[2] Creating sessions (enrich=True) ...")
    sessions = []
    with httpx.Client() as cli:
        for prof, plan, pers in COMBOS:
            r = cli.post(f"{ORCH}/sessions",
                         json={"profile": prof, "plan": plan, "persona": pers, "enrich": True})
            r.raise_for_status()
            s = r.json()
            sessions.append(s)
            print(f"    {prof}/{plan}/{pers}: turns={s['turns']} awaits={s['awaits']} "
                  f"ep={s.get('ep_type')} vak={s.get('vak')}")
            assert s["awaits"] == 16, f"Expected 16 awaits for {prof}, got {s['awaits']}"

    # Full WS walk on first combo
    sid = sessions[0]["session_id"]
    total = sessions[0]["turns"]
    expected_awaits = sessions[0]["awaits"]
    print(f"\n[3] Walking {total} turns via WS (p1/vocational/maya, sid={sid}) ...")
    results = ws_walk(sid, total)

    # Core results
    print(f"\n{'=' * 60}")
    print("CORE RESULTS")
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

    # Enrichment analysis
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

    # Sample prosody
    if lines_with_prosody:
        sample = lines_with_prosody[0]["prosody"]
        print(f"  Sample prosody       : {sample}")

    # Sample NLP
    if lines_with_nlp:
        s = lines_with_nlp[0]
        print(f"  Sample NLP line      : \"{s['text'][:80]}...\"")
        print(f"  Sample NLP marks     : {s['nlp'][:3]}")

    # Assertions
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

    # Check NLP type diversity
    expected_nlp_types = {"embed", "lead"}
    missing_nlp = expected_nlp_types - set(nlp_types_seen)
    if missing_nlp:
        print(f"\nFAIL: expected NLP types {missing_nlp} not seen")
        ok = False

    if ok:
        print(f"\nPASS: All {expected_awaits} awaits got fallback replies, done event fired.")
        print(f"      All 3 session combos created successfully (16 awaits each).")
        print(f"      Enrichment: {len(lines_with_prosody)}/{len(line_turns)} prosody, "
              f"{len(lines_with_nlp)} NLP-annotated lines, {len(tonalities_seen)} tonalities.")
        print(f"      NLP types: {nlp_types_seen}")
    else:
        print("\nFAILED: See above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
