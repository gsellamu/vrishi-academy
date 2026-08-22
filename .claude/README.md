# .claude — Claude Code Guidance for VRishi Academy

Project rules live in the repo-root `CLAUDE.md` (auto-loaded). This directory holds the
**delivery-system doc set** and **slash commands** for building and extending the Kappasinian
session engine at 100% delivery efficacy.

## Reference (`reference/`) — the delivery contract
Read these before touching the SSML/tonality/pacing/NLP engine. Source-of-truth values, no memory.

| file | what |
|---|---|
| `00-delivery-system.md` | The contract + pipeline overview. Start here. |
| `01-ssml-dialect.md` | Exact SSML tags, macro primitives, mark grammar (the parse regex). |
| `02-tonality-and-ep.md` | EP params × tonality × stage → the full voice matrix (real numbers). |
| `03-pacing-and-pauses.md` | Rate/pitch/volume, pause multipliers, break-scaling math, legend map. |
| `04-nlp-marking.md` | The conversational-hypnosis layers and how each analog-marks. |
| `05-block-authoring.md` | The 7-step procedure to write/extend a block macro. |
| `06-verification.md` | The mechanical checklist + exact commands. DONE = all green. |
| `07-elevenlabs-export.md` | The two flatteners, ElevenLabs settings, HeyGen/Simli handoff. |
| `08-tonal-triggers.md` | `tonal_triggers` lexicon — maternal/paternal word phonetic anchoring. |
| `09-standalone-scripts.md` | Authoring a therapeutic SSML script directly (non-first-session). |

## Commands (`commands/`) — slash commands
Invoke as `/new-block`, `/verify-session`, etc.

| command | purpose |
|---|---|
| `/new-block` | Author a new block macro (induction/deepener/challenge/coaching) to spec + wire it. |
| `/new-plan` | Author a new `.session.yaml` plan with lane/compliance + delivery wiring. |
| `/new-script` | Author a standalone therapeutic SSML script (anxiety/sleep/wealth/etc.) + both deliverables. |
| `/add-drill` | Add a Practice Lab drill (+ preset/sequence + UI wiring), integrity-checked. |
| `/tune-delivery` | Change EP/tonality/stage/pause voice params safely across BOTH engines. |
| `/elevenlabs-export` | Generate the ElevenLabs pack — enriched SSML + expressive flatten + E11 plan. |
| `/verify-session` | Run the full delivery-verification checklist and report reds. |
| `/enrich-check` | Audit a render's NLP marking + prosody; find and fix coverage gaps. |

## Two rules that span everything

**Prosody contract is duplicated.** `EP_VOICE_PARAMS`, `TONALITY_MODS`, `STAGE_MAP` live in
`render/prosody.py` AND `services/academy-orchestrator/main.py`. **Edit both together,
identically.** Bump `PROSODY_CONTRACT_VERSION` when the contract changes.

**Two flatteners, don't cross them.** `ssml_to_elevenlabs()` is vendored — byte-identical to
`ssml_router.py`, feeds the production `:8136` path, **never change its behavior**.
`ssml_to_elevenlabs_expressive()` is the opt-in read-aloud/ElevenLabs flatten (blank-line dramatic
silences, graded pauses). The CLI `--el-text` flag writes the **vendored** one. See
`07-elevenlabs-export.md`.

Everything else is in the reference set.
