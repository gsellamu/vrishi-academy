# VRishi Academy — Session Continuation Brief (for a new Claude Design chat)

Paste this into a new chat to resume seamlessly. It captures the whole project state,
decisions, conventions, and what's next. The design work lives in this same project.

---

## 1. What this project is
**VRishi Academy** — a 3D cinematic, gamified, real-time practice portal for a hypnotherapist
(Jeeth) prepping for HMI certification (C.MH → CHt → CCHt; PSR exam, hard stop **Dec 10**).
It's a training flight-simulator: Learn → Drill → Role-play with AI client avatars → Get graded
→ Review. The visual design is built here as **Design Components**; the real full-stack app is a
separate Next.js codebase (`apps/academy-web`) that **Claude Code** wires up. We produce the
UI/UX; Claude Code merges + integrates backend.

## 2. How the work is built (conventions — follow exactly)
- Every screen is a single **`Name.dc.html`** Design Component (dc_write / dc_html_str_replace /
  dc_js_str_replace). Inline styles only; no CSS classes in templates. Logic class named
  `Component extends DCLogic`, `renderVals()` exposes template values.
- **Design system / tokens** (dark clinical + warm, used on every page, defined in each DC's
  `<helmet>`): `--void:#0e0d14 --panel:#16141f --panel-2:#1b1826 --raise:#211d2e
  --line:#262234 --line-2:#322c44 --ink:#e9e4f2 --mist:#8b85a0 --dim:#5b566d
  --iris:#8b7fd4 --amber:#e0a458 --ok:#7fb98a --teal:#2dd4bf --red:#e0685e`.
  Stage colors: pre `#8b85a0`, induction `#5b8def`, deepening `#8b7fd4`, therapy `#b57fd4`,
  emergence `#e0a458`, post `#7fb98a`. Fonts: Fraunces (display), Inter (body),
  ui-monospace (labels/timers). Radii 8/12/16/999. This is NOT the VRishi Hypno marketing
  system — it's the Academy's own dark console theme.
- **Shared shell**: 264px sidebar (brand, nav, bottom "Real gap to CHt · Dec 10 · 29%" gauge) +
  scrolling main. Nav groups: main (Command Deck, Session Studio, The Sessions, Practice Lab,
  The Room, Teleprompter, Skill Tree, Faculty, Technique Library), **Clinical** (Session Prep,
  Clinical Intake, Safety & Ethics), **content** (Public Media, Resources, VRishi's Blogs,
  Support). Each page's header uses an eyebrow (mono, tracked) + Fraunces H1 with an amber
  italic accent word, then a What/Why/How/Value strip on tool pages.
- **3D**: three.js `PointsMaterial` shells forming a breathing "light-form" avatar (2s breath
  cycle). NOTE: `backdrop-filter` renders transparent over WebGL in Chromium → use solid opaque
  panel fills over 3D, never blur. WebGL can't be DOM-screenshot-verified → verify by hand
  (skip_verifier_agent) for Portal/Room.
- **Voice**: browser `speechSynthesis` is a PRACTICE PREVIEW that reads the same tone/rate/pitch
  fields ElevenLabs will use. maternal→warmer voice/higher pitch, paternal→firmer/lower.

## 3. Screens built (20, all in project root as *.dc.html)
Portal (Command Deck + cinematic entry + role switcher Client/Student/New-grad/Pro/Faculty),
Studio (role-play console, orchestrator-shaped), Room (3D reactive-avatar practice + teleprompter
+ voice + PSR rubric + REC/timeline + SOAP debrief + video-gen/avatar slot), Teleprompter
(Variation #2 E/P lanes, SSML+NLP+tonality per line, blend slider, hover glossary, speak toggle),
Lab (timed drills from drills.json, gauge debrief), Sessions (first-session overview + L.O.V.E. +
11 pillars), SkillTree (18 numbered nodes HMI course order, edges, dual-XP, citations, exam
markers), Faculty (case conference + mock-PSR examiner + console), Techniques (technique library +
first-session timeline), SessionPrep (pre-flight readiness gate), ClinicalIntake (full assessment
+ mental-status→E/P derivation), Safety (consent/contraindication/abreaction/SI+med flags/
supervisor sign-off), Logbook (real-rep ledger + practice-builder marketing track + spaced
repetition), PersonaBuilder, ClientPreview (client-facing), PublicMedia, Resources, Blog
(incl. "Creative Wisdom" post), Support, Review (5-persona v2 gap analysis + gap·risk·fix table).

## 4. Clinical canon (must preserve)
First-session arc, identical across Room (E+P lanes) and Studio:
**Pre-talk (Theory of Mind → Partnership → E/P suggestibility Test) → Induction (physio onset →
arm-raising → peak → snap) → Deepening (PHS → lane deepener → 5-to-0 count → Progressive
Relaxation → Staircase) → Suggestive Therapy (new self-image → suggestion → PHS verify → venting
dream) → Emergence (0-5 count → wide awake) → Verify & Close (finger-spread).**
Rules: ToM precedes suggestibility testing (canonical — resolved). Challenges (bicep, hand-to-
forehead, arm rigidity) are **P-lane only**; E-lane uses eye-catalepsy + inference. Every deepener
re-seats the PHS. Verbatim wording is transcribed from HMI Practicum/PSR workbooks; pre-talk
carries "do-with not do-to", "can't pass or fail the tests", "hear everything / in control",
"mind may wander → subconscious returns to my voice". Scripts quote one signature verbatim
passage per technique, not the full repeated litany (intentional, for legibility).

## 5. Source material (user's local folders, re-attach in new chat if needed)
- `Jeeth.ai/` — the master platform: `avatar-tts-service` (ElevenLabs), `AI_Pipeline_Code`
  (04_hypnollm_script_generator, audio_mixer.add_ssml_pacing, tts_client), services started by
  `Jeeth-AI-Start-All-Services.ps1`; keys in `Jeeth.ai/.env` + `AI_Pipeline_Code/.env`.
  Services: orchestrator :8600, persona/Ollama :8601, TTS ElevenLabs :8136, Voice-Enhance :9041.
- `PrepPractices/apps/academy-web` — the Next.js app to merge into (App Router, data/*.json:
  drills.json, gap.json; studio/lab/dojo pages already existed).
- Workbooks: NLP 1 & 2, PSR Scripts, Practicum Scripts, first-session stage guide,
  Clinical-Intake-Form.docx, "Unlocking Effective Hypnotherapy Sessions".docx (all read/used).
- Subscriptions available for backend media: Gemini/DALL·E/Veo, Runway, Kling, HeyGen, Replicate,
  Simli, LiveKit (for avatar/video-gen slot in the Room).

## 6. Handoff artifacts (in `handoff/`)
`README.md` (master: screen→route→design→services matrix, clinical flow, merge checklist),
`session-schema.md` (per-line SSML/NLP/tonality contract + the TTS-swap note: browser→ElevenLabs
only touches Room/Teleprompter `_speak()`), `portal-contract.md` (per-screen props/state/events),
`HANDOFF.md` (first-3-screens paste guide), production `academy-web/app/globals.css` + wired
studio/lab/dojo `page.jsx` + 17 route stubs.

## 7. Status & what's next
All 32 tracked build items complete; portal is handoff-ready. Not yet done / natural next steps:
- Live-service smoke test with Claude Code (wire orchestrator + persona for Studio/Room first,
  then swap TTS to ElevenLabs, then mount HeyGen/Simli in the Room video slot).
- Full nav unification on the 4 bespoke-sidebar pages (ClientPreview, Review, Room, SessionPrep).
- Optional: expand any single technique to its full repeated litany; refresh 5-persona review
  scores against the final build; propagate role-mode depth beyond copy.

## 8. User working style (honor these)
Concise, direct answers; minimal preamble. Reviews page-by-page and gives targeted change
requests — make ONLY what's asked, don't redesign unprompted. Wants commercial clinical-grade
fidelity and differentiation vs HMI/other schools. Do targeted dc_*_str_replace edits over
rewrites. Verify (hand-verify WebGL pages), then a 1-2 sentence summary.
