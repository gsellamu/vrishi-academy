#!/usr/bin/env python3
"""
Session prep mega-prompt generator.

Usage:
    python scripts/session_prep.py data/clients/DS-001.json --session 2
    python scripts/session_prep.py data/clients/DS-001.json --mode intake
    python scripts/session_prep.py data/clients/DS-001.json --mode post-session --soap soap.json

Modes:
    intake       - Generate treatment plan from intake data (new client)
    pre-session  - Generate session prep notes (returning client, default)
    post-session - Generate AVS + email draft from SOAP notes
"""
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

PRACTITIONER_CONTEXT = """You are a clinical hypnotherapy session preparation assistant for VRishi Hypnotherapy.
Practitioner: Jithendran Sellamuthu, C.MH., AHA #007913.
Approach: Kappasinian model. Physical/Emotional suggestibility lanes. Direct language for Physical, permissive for Emotional.
Scope: CA B&P 2908 (vocational/avocational self-improvement). NOT licensed healthcare. Advisory only.
Rules:
- SMART goals must be SUBJECTIVE (1-10 scales, Difficult->Effortless). No biometric targets.
- Tracker data is for client's personal reference only, never primary outcome measure.
- All script wording must be ORIGINAL. Nothing verbatim from HMI/Panorama copyrighted workbooks.
- No HMI branding in client-facing materials. Only credential statement allowed.
"""


def build_intake_prompt(client):
    """Build prompt for new client intake -> treatment plan."""
    return f"""{PRACTITIONER_CONTEXT}

=== CLIENT INTAKE DATA ===
Name: {client['name']}
Age: {client['age']}
Occupation: {client['occupation']}
Suggestibility: {client['ep']}
VAK: {client.get('vak', 'Unknown')}
Presenting: {client['presenting']}
History: {client.get('history', 'None provided')}
Contraindications: {json.dumps(client.get('contraindications', []))}
Medications: {json.dumps(client.get('medications', []))}
=== END INTAKE ===

Generate a complete treatment plan with:
1. Clinical assessment (EP approach, key reframe, contraindication screen)
2. 6-8 session arc with focus areas and techniques for each session
3. SUBJECTIVE SMART goals (1-10 scales, Difficult->Effortless) - NO biometric targets
4. Homework assignments (nightly ceremony, dream journal, etc.)
5. 8-10 post-hypnotic suggestions tailored to their suggestibility lane and presenting issue
6. Progress indicators (all subjective)

Output as structured JSON matching the client data schema.
"""


def build_pre_session_prompt(client, session_num):
    """Build prompt for returning client session prep."""
    prev_sessions = [s for s in client["sessions"] if s["num"] < session_num]
    latest = prev_sessions[-1] if prev_sessions else None

    return f"""{PRACTITIONER_CONTEXT}

=== CLIENT: {client['name']} ({client['id']}) ===
Age: {client['age']} | EP: {client['ep']} | VAK: {client.get('vak', '')}
Presenting: {client['presenting']}
Session {session_num} of {client.get('treatment_plan', {}).get('total_sessions', '6-8')}

=== PREVIOUS SESSION ({latest['num'] if latest else 'N/A'}) ===
{json.dumps(latest, indent=2, ensure_ascii=False) if latest else 'First session'}

=== SMART GOALS ===
{json.dumps(client.get('smart_goals', []), indent=2)}

=== TREATMENT PLAN ===
{json.dumps(client.get('treatment_plan', {}).get('sessions', []), indent=2)}
=== END ===

Generate a concise Session {session_num} prep sheet:
1. KEY FOCUS (what this session must accomplish)
2. TECHNIQUES to use (matched to EP lane + session goals)
3. REVIEW POINTS (what to check from previous session: homework compliance, feedback, dreams)
4. PHS to reinforce or install
5. HOMEWORK to assign
6. RED FLAGS to watch for
7. TIME ALLOCATION (rough breakdown of the session)

Keep it to 1 page. Direct, actionable. No fluff.
"""


def build_post_session_prompt(client, session_num, soap=None):
    """Build prompt for post-session documentation."""
    return f"""{PRACTITIONER_CONTEXT}

=== CLIENT: {client['name']} ({client['id']}) ===
Session {session_num} completed.

=== SOAP NOTES ===
Subjective: {soap.get('subjective', '[TO FILL]') if soap else '[TO FILL]'}
Objective: {soap.get('objective', '[TO FILL]') if soap else '[TO FILL]'}
Assessment: {soap.get('assessment', '[TO FILL]') if soap else '[TO FILL]'}
Plan: {soap.get('plan', '[TO FILL]') if soap else '[TO FILL]'}

=== SMART GOALS ===
{json.dumps(client.get('smart_goals', []), indent=2)}
=== END ===

Generate:
1. UPDATED CLIENT JSON session entry (structured data for the client file)
2. EMAIL DRAFT to client (warm, professional, includes homework reminders + next session info)
3. NEXT SESSION PREP NOTES (brief, for therapist reference)

Output as JSON with keys: session_entry, email_draft, next_session_notes.
"""


def main():
    parser = argparse.ArgumentParser(description="Session prep mega-prompt generator")
    parser.add_argument("client_json", help="Path to client JSON file")
    parser.add_argument("--mode", "-m", choices=["intake", "pre-session", "post-session"],
                        default="pre-session", help="Prompt mode")
    parser.add_argument("--session", "-s", type=int, default=2, help="Session number")
    parser.add_argument("--soap", help="Path to SOAP notes JSON (for post-session mode)")
    parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    args = parser.parse_args()

    with open(args.client_json, "r", encoding="utf-8") as f:
        client = json.load(f)

    if args.mode == "intake":
        prompt = build_intake_prompt(client)
    elif args.mode == "post-session":
        soap = None
        if args.soap:
            with open(args.soap, "r", encoding="utf-8") as f:
                soap = json.load(f)
        prompt = build_post_session_prompt(client, args.session, soap)
    else:
        prompt = build_pre_session_prompt(client, args.session)

    if args.output:
        Path(args.output).write_text(prompt, encoding="utf-8")
        print(f"Prompt written to {args.output}")
    else:
        print(prompt)

    # Print token estimate
    tokens_est = len(prompt.split()) * 1.3
    print(f"\n--- Estimated tokens: ~{int(tokens_est)} (prompt only) ---", file=sys.stderr)


if __name__ == "__main__":
    main()
