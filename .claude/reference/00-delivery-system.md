# Delivery System — The Efficacy Contract

This is the authority on HOW a VRishi session is delivered: SSML dialect, tonality, pacing,
pauses, and NLP marking. Every block macro, every render, every TTS call must conform. The
goal is 100% delivery efficacy — the spoken output reproduces a Kappasinian first session as
a skilled HMI practitioner would deliver it, adapted live to the client's suggestibility.

Contract version: **e11-2026-08-08** (`PROSODY_CONTRACT_VERSION` in `render/prosody.py`).
If any EP param, tonality modifier, or stage→zone mapping below changes, bump the version in
`prosody.py` AND `academy-orchestrator/main.py` together — they are duplicated on purpose and
MUST stay identical.

## The pipeline (three stages, one source of truth)

```
profile.yaml + plan.yaml
        │
        ▼  render/render_session.py   (Jinja2 + macro library, lxml-validated)
   plain SSML   ── <mark name="stage_*"/> checkpoints, <break>, <emphasis>, <p>
        │
        ├──▶ academy-orchestrator/main.py  parse_turns() → role-play turns (live drill)
        │
        ▼  render/prosody.py   (per-stage prosody + NLP analog-marking)
   enriched SSML  ── <prosody rate/pitch/volume> per stage segment
        │
        ├──▶ E11 request plan (one HypnoticTTSRequest per stage segment)
        └──▶ flattened ElevenLabs text (breaks→ellipses, strong→CAPS)
```

Two consumers read the SAME rendered SSML:
- **Orchestrator** turns marks into a role-play turn stream (the Practice Lab / Studio drill).
- **Prosody** wraps each stage segment in prosody and analog-marks NLP, then emits TTS calls.

They share `STAGE_MAP`, `EP_VOICE_PARAMS`, `TONALITY_MODS` — byte-identical tables in both files.

## The three inputs that drive delivery

1. **Suggestibility mode** (`p.mode`, from `physical_pct`): `literal` (≥60) → paternal/direct;
   `inferred` (≤40) → maternal/permissive; `blended` (41–59) → open permissive, convert direct
   at deepening. This is the single biggest lever. See `02-tonality-and-ep.md`.
2. **EP voice type** (`ep_type`, physical/emotional/somnambulist/balanced): sets base rate,
   pitch, volume, and the pause multiplier. See `03-pacing-and-pauses.md`.
3. **Stage** (`stage_*` mark): sets zone, therapeutic phase, and tonality (with an E-override
   for emotional clients on paternal stages). See `02-tonality-and-ep.md` for the full map.

VAK (`p.vak`) is a fourth, narrower lever: it weaves rep-system predicates into the therapy
and progressive-relaxation stages only. See `04-nlp-marking.md`.

## Non-negotiable delivery rules (the "100% efficacy" checklist)

1. **PHS after every conversion and every deepener** in a first session — full anatomy, never
   abbreviated: cue words → "for the purpose of hypnosis" → "with your permission" →
   "quickly, calmly, and deeply" → "and the physical body relaxes." 6–8 reps across the session.
2. **Every deepener and conversion ends on `deep_sleep()`** (snap mark + emphasized "Deep sleep")
   EXCEPT `self_hypnosis_teach` (client is awake — a coaching block, no snap/PHS).
3. **Ideomotor checkpoints are hard stops.** Each `await_*` mark = the practitioner waits for a
   nod/finger/verbal before the next line. In auto/XR playback it is a fixed pause or gesture
   detect. Never write a line that assumes the response before the await resolves.
4. **Pace the body, never lead it.** In induction/conversion, lines describe what IS happening
   or MIGHT be happening — never "your hand is now at your forehead" before contact. The arm-
   raising and eye-fascination macros already encode this; keep it when extending.
5. **Escalate only after movement.** Direct/commanding language ("lifting, rising, twisting")
   comes only once the hand has actually left the surface. Before that: permissive priming.
6. **Match wording to mode.** literal = "it IS lifting"; inferred = "you might allow it to
   rise." Blended follows the `literal`/`else` split (blended renders through the `else`/
   permissive branch). Never mix a paternal command into an inferred client's induction.
7. **All wording original.** Nothing verbatim from HMI/Panorama copyrighted workbooks. Reproduce
   the STRUCTURE and TECHNIQUE, never the text.
8. **Every render is lxml-validated.** Malformed SSML raises at render time — a broken `<p>` or
   unclosed `<emphasis>` fails the build. Never ship a macro that doesn't round-trip through
   `render_session.py` on all three profiles.
9. **`encoding="utf-8"` on every file IO; `mkdir(parents=True, exist_ok=True)` before writes.**
   The em-dashes and curly quotes in the scripts serialize as cp1252 garbage otherwise.

## What "efficacy" means operationally

A block delivers at 100% efficacy when:
- It renders to valid SSML on p1 (literal), p2 (inferred/emotional), p3 (blended/child) without
  error, and the mode branch fires correctly on each.
- Its stage mark resolves in BOTH `STAGE_MAP` tables (prosody + orchestrator) to the right zone
  and tonality — not the `_default` therapy fallback.
- Its ideomotor `await_*` marks are matched by the orchestrator regex and produce role-play
  turns.
- Its embedded commands, presuppositions, and (in therapy/PR) VAK predicates are present in
  `nlp_lexicon.yaml` so the enricher analog-marks them (emphasis + pause envelope).
- Its pauses scale correctly under the EP pause multiplier and the theta 1.25× deepening boost.
- The PHS / deep-sleep / await rules above hold.

The verification command (`/verify-session`) checks all of these mechanically. Run it before
calling any delivery change DONE.

## File map (this reference set)

- `00-delivery-system.md` — this file: the contract and pipeline overview.
- `01-ssml-dialect.md` — the exact SSML tag vocabulary, macro conventions, mark grammar.
- `02-tonality-and-ep.md` — mode/EP/stage → tonality matrix with all real values.
- `03-pacing-and-pauses.md` — rate, pitch, volume, pause multipliers, break-scaling math.
- `04-nlp-marking.md` — the conversational-hypnosis layers and how each is analog-marked.
- `05-block-authoring.md` — how to write or extend a block macro to spec.
- `06-verification.md` — the mechanical checklist + exact commands.
