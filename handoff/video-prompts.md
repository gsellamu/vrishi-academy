# VRishi Academy — Video-Gen Prompt Library

Text-to-video / avatar prompts for the Room's **Video-Gen Slot**, one per first-session step.
Keyed to the same step IDs the Room/Studio arrays use, so Claude Code can pass the matching
prompt straight to the generator when a step becomes active.

## Two clip types per step
- **Ambient / B-roll** (setting, hands, symbolic imagery) → **Veo · Runway · Kling**.
- **Client avatar** (the seated client reacting/speaking) → **HeyGen · Simli** (lip-synced to the
  ElevenLabs audio; visemes from `tts_client`). Use LiveKit only for live two-way.

## Global style block (prepend to every ambient prompt for continuity)
```
STYLE: cinematic clinical-calm, warm low-key lighting, soft volumetric haze, shallow depth of field,
teal-and-amber palette (#2dd4bf key, #e0a458 accent) on charcoal (#0e0d14), 24fps, gentle slow motion,
no text, no captions, no logos. Setting: a quiet modern hypnotherapy office — recliner, warm lamp,
plant, blurred window light. Client: adult, relaxed, natural clothing, no exaggerated expressions.
NEGATIVE: cartoon, horror, uncanny face, fast cuts, flashing, watermark, subtitles, distorted hands.
```

## Client identity (lock per session, feed to HeyGen/Simli)
```
E-lane persona "Maya Ellison" — 30s, warm, expressive; soft features.
P-lane persona "Marcus Vale"  — 40s, composed, analytical; steady gaze.
Keep the SAME avatar seed across all steps of one session for continuity.
```

---

## PRE-TALK & TEST

**`pre.intro` — Settling in**
- Ambient (Veo/Runway): "Client easing back into a recliner, shoulders dropping, one slow exhale; camera slow push-in on the face, lamp glow warming, dust motes drifting. 6s."
- Avatar (HeyGen): neutral-warm, listening; slight nod. Lip-sync to intro line.

**`pre.tom` — Theory of Mind**
- Ambient (Kling): "Abstract split-brain light metaphor — a calm luminous sphere (conscious) resting over a deeper glowing field (subconscious), gentle 88/12 ratio implied by two light volumes; teal to amber. 6s."

**`pre.partnership` — Partnership / do-with**
- Ambient (Runway): "Two soft light-streams merging into one and moving the same direction; unhurried. 5s."

**`pre.test` — E/P suggestibility test**
- Avatar (Simli): client eyes closed, subtle micro-reactions as if imagining; small honest responses. 6s.

---

## INDUCTION

**`ind.physio` — Physiological onset**
- Ambient (Veo): "Extreme close-up: eyelids fluttering and softening, breathing slowing, lips parting slightly to swallow; intimate, tender. 6s."

**`ind.arm.E` — Arm levitation (permissive)**
- Ambient (Runway): "A relaxed hand on the armrest drifting upward as if lifted by invisible balloons, feather-light, dreamy slow motion, wisps of light under the wrist. 7s."

**`ind.arm.P` — Arm levitation (literal)**
- Ambient (Runway): "A forearm rising steadily and mechanically off the armrest, tendons visible, deliberate and real, firm directional light. 7s."

**`ind.peak` — Peak / hand approaches face**
- Ambient (Kling): "The lifting hand slowly nearing the face, head tilting to meet it, magnetic inevitability. 6s."

**`ind.snap` — Snap / Deep Sleep**
- Ambient (Veo): "On a finger-snap the head drops gently to the chest, whole body releasing into the chair, a soft pulse of amber light radiating outward once. Sharp-then-soft. 4s."
- Avatar (HeyGen): head-drop on cue; then still, deeply relaxed.

---

## DEEPENING

**`deep.phs` — Post-hypnotic suggestion (re-hypnosis anchor)**
- Ambient (Kling): "A single glowing anchor-glyph settling and locking into a calm field of light; quiet, certain. 5s."

**`deep.eyecat.E` — Eye catalepsy (E-lane)**
- Ambient (Runway): "Eyelids so relaxed they simply rest, a gentle test-flutter that gives way to deeper stillness. 5s."

**`deep.challenge.P` — Hand-to-forehead / arm rigidity (P-lane)**
- Ambient (Veo): "A forearm held rigid like a steel bar, faint metallic sheen, unmoving against gentle test pressure; conviction. 6s."

**`deep.count` — Count 5→0**
- Ambient (Kling): "Descending numerals 5,4,3,2,0 dissolving downward through layered light strata, each deeper and dimmer. 6s."

**`deep.pr` — Progressive relaxation**
- Ambient (Runway): "A wave of soft light travelling from crown to toes, each region releasing as it passes; slow, top-down. 8s."

**`deep.staircase` — Staircase**
- Ambient (Veo): "First-person gentle descent down a warm luminous staircase into deepening calm, steps fading below. 7s."

---

## SUGGESTIVE THERAPY

**`ther.selfimage` — New self-image**
- Ambient (Kling): "A confident figure of the client formed from warm light, standing tall, calm and capable; aspirational. 7s. (Feed the intake 'magic wand' goal + positive words as extra prompt terms.)"

**`ther.suggestion` — Suggestive therapy**
- Avatar (HeyGen): serene, receptive micro-expressions; occasional slow affirmative nod. 8s.

**`ther.phsverify` — PHS verify**
- Ambient (Runway): "The anchor-glyph pulses once and holds, confirming it is set. 4s."

**`ther.venting` — Venting dream**
- Ambient (Kling): "Soft turbulent imagery gently released and dissolving into calm clear light; catharsis without distress. 6s."

---

## EMERGENCE & CLOSE

**`emg.count` — Count 0→5**
- Ambient (Kling): "Ascending numerals 1→5 rising through brightening light, energy returning. 6s."

**`emg.awake` — Wide awake**
- Ambient (Veo): "Eyes opening softly to warm daylight, a refreshed easy smile, a full waking breath. 5s."
- Avatar (HeyGen): natural wake, alert-and-well.

**`post.fingerspread` — Finger-spread verify**
- Ambient (Runway): "Fingers spreading and holding as the re-induction cue proves installed; quiet confirmation. 4s."

---

## Wiring — optional `videoPrompt` field on each step
Add to each step object so the generator call is a lookup, not a rewrite:
```js
{ stage:'induction', major:'Arm levitation', text:"…", tone:'maternal', rate:'x-slow',
  videoStepId:'ind.arm.E',
  videoPrompt:"<global style block> + A relaxed hand … balloons, dreamy slow motion. 7s.",
  avatar:{ engine:'heygen', persona:'maya', lipSyncToTts:true } }
```
Generation strategy: **pre-render** each step's ambient clip once (cache by `videoStepId`) and loop it
while the step is active; reserve **live** HeyGen/Simli for the avatar layer. Ambient (Veo/Runway/Kling)
is deterministic per step, so batch-generate the full library ahead of a session and stream from cache.
```
POST {video-gen}/generate { engine, prompt: videoPrompt, seed, durationS }  → cache → Room slot
POST {avatar 8xxx}/stream { engine, persona, audioUrl(ttsMp3), visemes }     → Room slot overlay
```
Keys/engines live in `Jeeth.ai/AI_Pipeline_Code/.env` (VIDEO_GEN, AVATAR_HOST, RUNWAY, KLING,
HEYGEN, REPLICATE, SIMLI, LIVEKIT). Start via `Jeeth-AI-Start-All-Services.ps1`.
