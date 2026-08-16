# VRishi Academy — Portal Handoff Contract (for Claude Code)

Per-screen wiring reference. Every screen is a self-contained `*.dc.html` design prototype
(dark theme, tokens in each `<helmet>`; canonical set in `studio-tokens.css`). This doc maps
each screen's props/state to the backend so wiring is mechanical. Nothing here needs a redesign —
only data/event binding.

Services (from `Jeeth.ai/**` and `AI_Pipeline_Code/.env`):
orchestrator :8600 · persona :8601 · TTS(ElevenLabs) :8136 · voice-enhance :9041 · Next.js :3070.
Global AI dock adds one endpoint on the orchestrator: `POST :8600/assistant/chat` (Claude proxy).

---

## Assistant.dc.html — Global AI dock (every screen)  ⟵ NEW
- **Design:** floating "Ask VRishi" FAB bottom-right → panel with **Chat**, **Read aloud**, engine selector, mic. Mounted on all routes.
- **Prod port:** `academy-web/app/components/AssistantDock.jsx` — a `'use client'` component. Mount **once** in `app/layout.jsx` (`{children}<AssistantDock/>`); it reads the route via `usePathname()` and sets `context` from the `ROUTE_CONTEXT` map.
- **Props (DC):** `context` (screen label), `onOpenGuidebook` (fn). **State:** `open`, `tab`, `engine` (eleven|browser), `messages`, `autoRead`, `listening`, `speakingId`.
- **Wire:** (1) **Chat** → `POST :8600/assistant/chat` `{ context, system, messages:[{role,content}] }` → `{ text }` (orchestrator proxies Claude, key server-side; SSE optional). (2) **Read aloud** replies + the 6 first-session-arc sections → ElevenLabs `:8136` (`_speak()`), browser Web Speech fallback. (3) **Mic** → Web Speech ASR in preview; swap to server ASR endpoint for parity. (4) **Guidebook** → on `/session-prep` fires `vr-open-guidebook` (opens the in-page viewer); elsewhere navigates to `/session-prep`.
- In the DC, chat runs on `window.claude.complete` (preview only); the `.jsx` replaces that with the orchestrator endpoint.

## Portal.dc.html — Command Deck (hub)
- **Props:** `startEntered` (bool), `difficulty` (1–5). **State:** `role` (client|student|grad|pro|faculty), `entered`.
- **Wire:** role → user profile/claim; HUD (XP, streak, level ladder) ← progress-svc; season-pass quotas ← `data/gap.json`; countdown ← `gap.hardStop`. Cards deep-link to each screen.
- Role switch should gate nav/surfaces server-side too (client role hides practitioner tools).

## Studio.dc.html — Session Studio (role-play)
- **Props:** `startPhase` (setup|live|debrief), `personaSource` (ollama|fallback).
- **State:** `phase`, `idx`, `sec`. Feed built from a 20-step `STEPS[]` (stage/major/text/react/reply/phs).
- **Wire:** replace `STEPS` with orchestrator stream — `POST /sessions` → `WS /ws/{sid}`; each `turn` maps to a feed row (line/await/snap/phs) + persona `reply` (source dot = ollama|fallback). `Next`/Space → `{cmd:"next"}`. Debrief tallies (checkpoints, PHS) come from the `done` turn's `stats`.

## Room.dc.html — The Room (3D + voice)
- **Props:** `startLane` (E|P), `resistance` (compliant|realistic|difficult).
- **State:** `phase`, `idx`, `nods`, `paused`, `speakOn`. Full first-session `E_STEPS`/`P_STEPS` (22 lines, 6 stages).
- **Wire:** (1) **TTS** — `_speak()` currently Web Speech; swap to ElevenLabs :8136 per SSML note below. (2) **Video slot** — `<video ref>` per-step; fill from media pipeline (see below), keyed by `clipId`. (3) **Rubric/SOAP** — `rubricItems`/`soap*` derived client-side; persist SOAP to case file on `done`. (4) **Reactions** — `_avatar.nod/arm/snap/depth` are the hooks for a real avatar's visemes/gestures.

## Teleprompter.dc.html — SSML/NLP script
- **Props:** `startLane`. **State:** `blend` (0–100 E→P), `active`, `playing`, `speakOn`, `speed`.
- **Wire:** `ALL[]` lines carry `rate/pitch/brk/tone/tags`; the rendered `<speak><prosody><break>` string is byte-compatible with `audio_mixer.add_ssml_pacing`. `blend` slider drives lane selection (→ wording). Glossary tooltips come from `NOTES`.

## Lab.dc.html — Practice Lab (drills)
- **Props:** `startPhase`, `clientMode`, `scoreValue`. **State:** plan/step/checks/history.
- **Wire:** `buildPlan()` + `drills.json` already match your data; `lab:attempts` localStorage → progress-svc. Self-score checklist = the PSR grade sheet; import exact rubric weights.

## SkillTree.dc.html — gamified progression
- **Props:** `$preview` only. **State:** `sel`, pan/zoom `tx/ty/k`.
- **Wire:** `NODES[]` (id/tier/state/prereq/xp) ← curriculum service; `state` (mastered/inprogress/available/locked) computed from Lab scores + prereqs. Detail panel shows `CITE`/`EXAM` provenance — map to real workbook sections. Drill queue ← rubric misses.

## Faculty.dc.html — panel · exam · console
- **Props:** `startTab` (conf|exam|console).
- **Wire:** conf/exam feeds ← persona-svc (faculty personas) + orchestrator (graded exam, live rubric+score). **Console** tab: `COHORT`/`PENDING`/`AUDIT` ← analytics + verification service (roster, verified reps, audit log). Verify/Flag buttons → real-rep verification endpoint.

## PersonaBuilder.dc.html — custom client
- **State:** name/goal/age/bg/issue/`blend`/`resist`. Derives archetype + recommended induction/deepeners/lexicon.
- **Wire:** "Rehearse in Room / Role-play" pass the persona to the session via URL params / persona-svc create.

## Logbook.dc.html — real-rep ledger
- **State:** `reps[]`, form fields. `addRep()` prepends. **Wire:** persist to progress-svc; real XP ×10 feeds the dual ledger and `gap.json`; SOAP export → PDF/EHR; faculty verification sets `verified`.

## Safety.dc.html — gate · contraindications · abreaction
- **State:** `checked` gate map. Required (*) items must clear before a session unlocks.
- **Wire:** gate + contraindication flags should hard-block session start server-side; supervisor sign-off → Faculty console; log to audit trail.

---

## Integration notes (backend)

### Assistant chat — Claude via orchestrator (:8600)  [global dock]
`AssistantDock.jsx` posts `{ context, system, messages:[{role,content}] }` to
`POST :8600/assistant/chat`; the orchestrator calls Claude (key server-side) and returns
`{ text }`. `system` is built per-screen (clinical guide grounded in the guidebook + first-session
arc + safety rules) — the orchestrator may override/augment it. Rate-limit and log like other turns.
Streaming (SSE) is optional; the client reads a single `{ text }` today. Read-aloud of replies and of
the six arc sections routes through the same ElevenLabs path below; mic uses Web Speech ASR in preview
(swap to the server ASR endpoint for production parity). The dock is preview-safe: with no backend it
shows a graceful "service unavailable" message and the browser voice still speaks.


Web Speech is the offline preview. Production: render SSML via `audio_mixer.add_ssml_pacing`
→ `POST /text_to_speech` `{ text:<ssml>, model_id:"eleven_turbo_v2", voice_settings:{stability,style,speed,similarity_boost} }`,
header `xi-api-key`. Map `tone` → voice_settings (+ per-tone `voice_id`). Drive line auto-advance
off the audio `ended` event; feed visemes to the avatar. Keep Web Speech as offline degrade.

### Video / live avatar — Veo · Runway · Kling · Replicate · HeyGen · Simli · LiveKit  [Room]
The centre `<video>` "video-gen slot" is keyed by `clipId` (e.g. `e-ind-s2`), `stage`, `lane`, `react`.
- **Pre-render:** generate one clip per `clipId` per lane offline (Veo/Runway/Kling/Replicate), cache by id, stream on step change.
- **Live avatar:** mount HeyGen/Simli video track in the same frame via LiveKit; lip-sync from TTS audio; trigger gesture presets on `react` (nod/arm/snap/settle). Set `videoDisplay:'block'`, keep placeholder as loading/degrade. Keys in `AI_Pipeline_Code/.env` (VIDEO_GEN, AVATAR_HOST, RUNWAY, KLING, HEYGEN, REPLICATE, SIMLI, LIVEKIT).

### Zoom / telehealth co-pilot  [Pro, future]
Reuse the Teleprompter + Room rubric as an overlay on a live LiveKit/Zoom session — prompter + live PSR score beside the real client. No UI rebuild; mount the existing panels over the call.

### LMS / SSO / roster  [Faculty adoption]
Add LTI 1.3 / SSO for roster sync + grade passback so the Faculty console reads real cohorts and
writes practicum grades back to the school LMS. Verified reps carry an audit trail for academic integrity.

### Client-facing mode  [Portal role=client]
Gate all practitioner UI behind the role claim; expose only the Room "preview" (voice + visual) and the
expectations/safety/credentials explainer. Never surface rubric/PHS/orchestrator internals to a client.
