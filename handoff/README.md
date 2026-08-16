# VRishi Academy — Claude Code Handoff (complete project)

Master index for merging the approved design prototype into the full-stack app
(`PrepPractices/apps/academy-web`, Next.js App Router). **Read this first**, then the
companion docs. The design is the source of truth for look/behavior; you own routing,
state, sockets, and service calls — port, don't redesign.

- **What this is** — VRishi Academy: a 3D-cinematic, gamified, real-time practice portal for a
  hypnotherapist (Jeeth) prepping for HMI certification (C.MH → CHt → CCHt; PSR exam, hard stop
  **Dec 10**). A training flight-simulator: Learn → Drill → Role-play with AI client avatars →
  Get graded → Review.
- **Design source of truth** — the `*.dc.html` Design Components at the design project root (21
  files). Lift exact visuals/behavior from these; the `academy-web/app/**` here is the
  production-shaped port.
- **Launch** — portal `PrepPractices/academy.ps1`; full stack `Jeeth-AI-Start-All-Services.ps1`.

---

## Companion docs (read in this order)

| Doc | What it gives you |
|---|---|
| `README.md` (this) | Screen→route→design→service matrix, service map, merge order. |
| `portal-contract.md` | Per-screen props / state / events, incl. the global AI dock + `/assistant/chat`. |
| `session-schema.md` | `ScriptLine` SSML/NLP/tonality contract; TTS-swap + video-slot notes. |
| `HANDOFF.md` | Paste-in steps + PowerShell copy for the drop-in files. |
| `HANDOFF-READINESS.md` | Per-screen readiness + backend integration points. |
| `SESSION-CONTINUATION.md` | Full project brief (conventions, clinical canon, sources). |
| `video-prompts.md` | Per-step clip prompts for the Room video-gen slot. |

## Drop-in production source (in this folder)

| File | Role |
|---|---|
| `academy-web/app/globals.css` | Production token set + every component class. Drop-in. |
| `academy-web/app/components/AssistantDock.jsx` | **Global AI + Voice dock** — mount once in `app/layout.jsx`. |
| `academy-web/app/{studio,lab,dojo}/page.jsx` | Wired reference pages (WS / data-driven). |
| `academy-web/app/**/page.jsx` | 17 route stubs shaped for the merge. |

---

## Design system (every screen; defined in each DC `<helmet>`, mirrored in `globals.css`)

Dark clinical + warm. **NOT** the VRishi marketing system — the Academy's own console theme.
```
--void:#0e0d14  --panel:#16141f  --panel-2:#1b1826  --raise:#211d2e
--line:#262234  --line-2:#322c44  --ink:#e9e4f2  --mist:#8b85a0  --dim:#5b566d
--iris:#8b7fd4  --amber:#e0a458   --ok:#7fb98a     --teal:#2dd4bf --red:#e0685e
```
Stage colors: pre `#8b85a0` · induction `#5b8def` · deepening `#8b7fd4` · therapy `#b57fd4` ·
emergence `#e0a458` · post `#7fb98a`. Fonts: **Fraunces** (display), **Inter** (body),
**ui-monospace** (labels/timers). Radii 8/12/16/999.
Shell: 264px sidebar (brand, grouped nav, bottom "Real gap to CHt · Dec 10 · 29%" gauge) +
scrolling main; tool pages carry a What/Why/How/Value strip. Room / SessionPrep / ClientPreview /
Review are full-bleed by design.

---

## Screen → route → design → services (21 screens)

| Screen | Route | Design (DC) | Wire to |
|---|---|---|---|
| Command Deck / Portal | `/command-deck` (`/`) | `Portal.dc.html` | Progress store (role, XP, rank, streak, quota); 3D entry. |
| Session Studio | `/studio` | `Studio.dc.html` | `POST /sessions` → `WS /ws/{sid}` orchestrator (:8600). |
| The Room | `/room` | `Room.dc.html` | Same WS + TTS (:8136) + avatar/video slot + SOAP debrief. |
| Teleprompter | `/teleprompter` | `Teleprompter.dc.html` | `ScriptLine[]` (session-schema); TTS `_speak()` swap. |
| Practice Lab | `/lab` | `Lab.dc.html` | `drills.json`; `lab:attempts` localStorage. Prod jsx ✓. |
| The Sessions | `/sessions` | `Sessions.dc.html` | Static (first-session overview, L.O.V.E., 11 pillars). |
| Skill Tree | `/skill-tree` | `SkillTree.dc.html` | Mastery/XP store; prereqs, drill queue. |
| Faculty Console | `/faculty` | `Faculty.dc.html` | Roster/LMS; case conference, mock-PSR examiner, audit. |
| Technique Library | `/techniques` | `Techniques.dc.html` | Static + first-session timeline. |
| Session Prep | `/session-prep` | `SessionPrep.dc.html` | Gate checklist + AV pings; **guidebook PDF viewer**. |
| Clinical Intake | `/clinical-intake` | `ClinicalIntake.dc.html` | Assessment store; mental-status → E/P derivation. |
| Safety & Ethics | `/safety` | `Safety.dc.html` | Gate state (consent/contra/abreaction/SI+med/sign-off). |
| Logbook | `/logbook` | `Logbook.dc.html` | Real-rep records store; milestones, spaced repetition. |
| Persona Builder | `/persona-builder` | `PersonaBuilder.dc.html` | Persona object → Room/Studio; persona svc (:8601). |
| Client Preview | `/client-preview` | `ClientPreview.dc.html` | Static (client-facing "what a session feels like"). |
| Public Media | `/public-media` | `PublicMedia.dc.html` | CMS/starter rows to populate. |
| Resources | `/resources` | `Resources.dc.html` | Document library; canonical guidebook copy. |
| VRishi's Blog | `/blog` | `Blog.dc.html` | CMS/static (incl. "Creative Wisdom" post). |
| Support | `/support` | `Support.dc.html` | Static/starter rows. |
| Persona Review | `/review` | `Review.dc.html` | Reference doc (5-persona v2 gap/risk/fix). |
| **Ask VRishi dock** | *(all routes)* | `Assistant.dc.html` | Orchestrator `/assistant/chat` (Claude); TTS :8136; ASR. |

---

## Global AI Assistant + Voice dock (`Assistant.dc.html` → `AssistantDock.jsx`)

Floating "Ask VRishi" FAB, bottom-right on **every** route. Opens to **Chat**, **Read aloud**,
an engine selector (ElevenLabs | browser), and mic. Route-aware `context` (screen label) is
sent with every request.

- **Mount** — `AssistantDock.jsx` is a `'use client'` component. Add **once** to `app/layout.jsx`:
  ```jsx
  import AssistantDock from './components/AssistantDock';
  // inside <body>:  {children} <AssistantDock />
  ```
  It reads the route via `usePathname()` and maps it through `ROUTE_CONTEXT`.
- **Chat** → `POST :8600/assistant/chat` `{ context, system, messages:[{role,content}] }` → `{ text }`.
  The orchestrator proxies Claude (API key server-side; SSE optional — client reads one `{text}`
  today). `system` is built per-screen: clinical guide grounded in the guidebook + first-session
  arc + safety rules (flag cardiac/psychosis/epilepsy/pregnancy/substance; recommend referral).
- **Read aloud** — assistant replies + the six first-session-arc sections → ElevenLabs (:8136),
  browser Web Speech fallback. (In the DC, chat runs on `window.claude.complete` for preview only;
  the `.jsx` already points at the orchestrator.)
- **Mic** — Web Speech ASR in preview; swap to a server ASR endpoint for production parity.
- **Guidebook** — on `/session-prep` fires `vr-open-guidebook` (opens the in-page viewer);
  elsewhere navigates to `/session-prep`.
- **Preview-safe** — with no backend it shows a graceful "service unavailable" message and the
  browser voice still speaks.

**One backend route to build fresh:** `POST /assistant/chat` on the orchestrator (Claude proxy,
key server-side, returns `{text}`). Everything client-side is wired to it. (Optional: server ASR.)

### Therapist's Session Guidebook (PDF)
Lives on **Session Prep** as a "Therapist reference" card → in-page viewer with Download / Open-in-
new-tab fallback (some browsers block embedded PDF). In the design prototype it is embedded as a
base64 blob (`guidebook-b64.js`) so it works with no server; **in production serve it as a normal
static asset** (`/docs/Clinical-Hypnotherapy-Session-Guidebook.pdf`) and point the viewer/link
there — drop the base64 shim. Optionally mirror the canonical copy on **Resources**.

---

## Clinical canon (must preserve — identical across Room E+P lanes and Studio)

**Pre-talk** (Theory of Mind → Partnership → E/P suggestibility Test) **→ Induction** (physio
onset → arm-raising → peak → snap) **→ Deepening** (PHS → lane deepener → 5-to-0 → Progressive
Relaxation → Staircase) **→ Suggestive Therapy** (new self-image → suggestion → PHS verify →
venting dream) **→ Emergence** (0-5 count → wide awake) **→ Verify & Close** (finger-spread).
Rules: ToM precedes suggestibility testing. Challenges (bicep, hand-to-forehead, arm rigidity) are
**P-lane only**; E-lane uses eye-catalepsy + inference. Every deepener re-seats the PHS. Verbatim
wording is transcribed from HMI Practicum/PSR workbooks — do not paraphrase.

---

## Services (from `Jeeth.ai/**`; keys in `Jeeth.ai/.env` + `AI_Pipeline_Code/.env`)

orchestrator **:8600** · persona/Ollama **:8601** · TTS ElevenLabs **:8136** ·
Voice-Enhance **:9041** · Next.js **:3070**.

Backend integration points (all documented in `portal-contract.md` / `session-schema.md`):
1. **Orchestrator WS** (:8600) — Studio/Room consume `stage | await | snap | phs | reply` turns.
2. **Assistant chat** (:8600 `/assistant/chat`) — Claude proxy for the global dock. **New route.**
3. **TTS — ElevenLabs** (:8136) — swap `_speak()` synth only; render SSML via
   `audio_mixer.add_ssml_pacing`; map tone → `voice_settings`. Browser Web Speech is the fallback.
4. **Live avatar — HeyGen/Simli (+ LiveKit)** — mount into the Room video-gen slot; visemes from TTS.
5. **Video-gen** (Veo/Runway/Kling/Replicate) — pre-render one clip per `clipId`/lane (see
   `video-prompts.md`); stream on step change.
6. **Stores** — XP/mastery/real-reps/logbook/safety (Portal, SkillTree, Logbook, Faculty).
7. **Institutional** — SSO / roster / LMS (Faculty); booking / CRM / payments (Logbook).

---

## Recommended merge order

1. Drop `globals.css` + Studio/Lab/Dojo prod jsx (already written).
2. Add `components/AssistantDock.jsx`, mount in `app/layout.jsx`, and build the orchestrator
   `/assistant/chat` route (Claude proxy). Serve the guidebook PDF as a static asset.
3. Wire orchestrator WS to Studio, then Room.
4. TTS swap (ElevenLabs), then the avatar/video slot in the Room.
5. Stores: XP/mastery/real-reps → Portal, SkillTree, Logbook, Faculty.
6. Institutional: SSO/roster/LMS; booking/CRM.

Keep the shared sidebar shell and the clinical flow intact throughout.
