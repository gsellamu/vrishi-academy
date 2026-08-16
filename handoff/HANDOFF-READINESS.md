# VRishi Academy — Claude Code Handoff Readiness

Status of the design prototype for merge/integration into `apps/academy-web`.
Companion docs in this folder: `HANDOFF.md` (paste steps), `session-schema.md`
(line/SSML/NLP contract + **TTS integration note**), `portal-contract.md` (per-screen
props/state/events), `globals.css` + `app/*` (production drop-ins for Studio/Lab/Dojo).

## Screen inventory & readiness

| Screen (DC) | Purpose | Data/events | Wiring status |
|---|---|---|---|
| Portal | Command Deck, role modes, XP/rank, season pass | role, xp, streak, weekly quota | Design ✓ · needs progress store |
| Studio | Role-play console (22-step first session) | `POST /sessions` → `WS /ws/{sid}` → `{cmd:next}` | Contract ✓ · WS wired in prod jsx |
| Room | 3D reactive console + teleprompter + voice | same WS + TTS + avatar events | Design ✓ · TTS/avatar are stubs |
| Teleprompter | Variation #2 E/P lanes, SSML/NLP tags, voice | `ScriptLine[]` (see session-schema) | Design ✓ · browser TTS placeholder |
| Lab | Timed drills, prompter, self-score | `drills.json`, `lab:attempts` localStorage | Prod jsx ✓ (data-driven) |
| SkillTree | 18-node constellation, dual-XP, drill queue | node states, prereqs, XP ledger | Design ✓ · needs mastery store |
| Faculty | Case conference, mock-PSR examiner, console | cohort, verified-reps, audit | Design ✓ · needs roster/LMS |
| Sessions | First-session overview, L.O.V.E., 11 pillars | static content | Design ✓ |
| Techniques | Technique library + first-session timeline | static content | Design ✓ |
| SessionPrep | Pre-flight readiness gate (consent/contra/AV) | gate checklist, av-check | Design ✓ · needs service pings |
| Safety | Consent, contraindications, abreaction, sign-off | gate state | Design ✓ |
| Logbook | Real-rep ledger, milestones, refreshers | real-rep records | Design ✓ · needs records store |
| PersonaBuilder | Compose client (age/issue/E-P/resistance) | persona object → Room/Studio | Design ✓ |
| ClientPreview | Public "what a session feels like" | static content | Design ✓ |
| Review | 5-persona evaluation + gap/risk/fix | static content | Reference doc |

## Backend integration points (all documented, none live)

1. **TTS — ElevenLabs :8136** — replace `_speak()` synth call only; render SSML via
   `audio_mixer.add_ssml_pacing`; map tone → `voice_settings`. Browser Web Speech is the
   offline fallback. (Full steps in `session-schema.md`.)
2. **Live avatar — HeyGen/Simli** — mount into the Room "Video-Gen Slot"; drive visemes
   from TTS. Slot + handoff note in place.
3. **Orchestrator — :8600 / persona :8601** — Studio/Room consume `stage|await|snap|phs|reply`
   WS turns; `portal-contract.md` maps each to UI.
4. **LiveKit** — optional in-session Zoom co-pilot reusing the teleprompter.
5. **LMS / SSO / roster** — Faculty Console + progress stores (XP, mastery, real-reps, logbook).
6. **Booking / CRM / payments** — Logbook real-rep capture.

## Design-owned (no backend) — remaining

- P-lane verbatim depth: arm-raising + full deepeners transcribed ✓; deeper repetition loops optional.
- Editable script authoring / own-wording capture — not built.

## Known constraints / notes

- **3D & WebGL** (Portal entry, Room) can't be DOM-screenshot-verified; verified by hand.
- **Voice** is browser SpeechSynthesis (practice preview), not ElevenLabs — see note #1.
- **Placeholder directories** (Public Media, Resources, Support) ship as starter rows to populate.
- Tokens live in `globals.css`; all screens share the sidebar shell + What/Why/How/Value strip.
- Room/SessionPrep/ClientPreview/Review use full-bleed layouts (no sidebar) by design.

## Recommended merge order

1. Drop `globals.css` + Studio/Lab/Dojo prod jsx (already written).
2. Wire orchestrator WS to Studio, then Room.
3. TTS swap (#1), then avatar slot (#2).
4. Stores: XP/mastery/real-reps → Portal, SkillTree, Logbook, Faculty.
5. Institutional: SSO/roster/LMS; booking/CRM.
