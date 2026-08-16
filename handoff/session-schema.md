# Session Script Schema — SSML · NLP · Conversational Hypnosis

The data contract for the Teleprompter / Room script line. Designed to drop onto your
existing pipeline: `04_hypnollm_script_generator` (authoring) → `audio_mixer.add_ssml_pacing`
(SSML) → `tts_client` → ElevenLabs (`xi-api-key`, `model_id: eleven_turbo_v2`) → visemes.
The UI (`Teleprompter.dc.html`) renders every field below; Claude Code wires the values to
the backend.

## ⚠ Video stage integration note for Claude Code (Room.dc.html)

**The Room's centre "video-gen slot" is a real `<video>` element hosting a per-step cinematic
clip — I do NOT generate the clips.** Right now it shows a labelled placeholder (the step's
action + a `clipId`); the dimmed particle field behind it is only ambient fallback. Wire your
media stack to fill it:

- Each step exposes `clipId` (e.g. `e-ind-s2`), `clipCaption`, `clipAction`, `stage`, `lane`,
  and the current `react` (`nod|arm|snap|deepen|null`). Use these to select/generate the clip.
- Set `this._video.src = <url>` and flip `videoDisplay:'block'` / `placeholderDisplay:'none'`
  in `renderVals()` once a clip resolves; keep the placeholder as the loading/degrade state.
- **Pre-render** path (Gemini Veo / Runway / Kling / Replicate): generate one clip per
  `clipId` per lane offline, cache by id, stream on step change. Best quality, no latency.
- **Live avatar** path (HeyGen / Simli + LiveKit): mount the avatar video track in this same
  frame; drive lip-sync from the TTS audio (see TTS note below) and trigger gesture presets on
  `react` (nod / arm-raise / settle). Snap already plays a WebAudio transient locally.
- Keys/config in `AI_Pipeline_Code/.env` (VIDEO_GEN, AVATAR_HOST, RUNWAY, KLING, HEYGEN,
  REPLICATE, SIMLI, LIVEKIT). The UI never changes — only the clip-resolution step does.

## Line object

```ts
type Lane = 'E' | 'P';          // Emotional/inferred · Physical/literal
type Stage = 'pre' | 'induction' | 'deepening' | 'therapy' | 'emergence' | 'post';
type Cue   = null | 'await' | 'snap' | 'phs';

interface ScriptLine {
  id: string;
  stage: Stage;
  lane: 'both' | Lane;          // 'both' = spoken identically in either lane
  step: number;                 // position within the resolved lane sequence

  text: string;                 // word-for-word, therapist voice. '…' marks a paced pause

  // ---- SSML (matches audio_mixer.add_ssml_pacing output) ----
  ssml: {
    rate: 'x-slow' | 'slow' | 'medium' | string;  // string allows '85%'
    pitch: string;              // e.g. '-12%', '-5%', '0%'
    breakMs: number;            // default inter-clause pause; '…' expands to <break>
    emphasis?: string[];        // grounding words → <emphasis level="moderate">
  };

  // ---- Tonality → ElevenLabs voice_settings (NOT SSML) ----
  voice: {
    tone: 'maternal' | 'paternal' | 'neutral';
    stability: number;          // maternal ~0.55 (steady/warm) · paternal ~0.35 (expressive/firm)
    style: number;              // maternal ~0.15 · paternal ~0.45
    speed: number;              // x-slow 0.75 · slow 0.85 · medium 1.0
  };

  // ---- Coaching / grading tags ----
  nlp: string[];                // 'Pacing','Leading','Embedded command','Presupposition',
                                // 'Double-bind','Anchor','Fractionation','VAK · Visual|Auditory|Kinesthetic',
                                // 'Analog marking','Reframe'
  conversational: string[];     // 'Yes-set','Truism chain','Inference','Utilization','Convincer',
                                // 'Challenge','Misdirection','Ideomotor cue'
  lexicon?: string[];           // literal exemplars of E/P wording used in this line

  // ---- Session-loop events ----
  cue: Cue;                     // 'await' → wait for ideomotor nod; 'snap' → deep-sleep transient;
                                // 'phs' → re-hypnosis post-hypnotic suggestion (re-seat every deepener)
  awaitName?: string;           // e.g. 'visualize', 'weight_difference', 'eye_closure'
}
```

## Rendered SSML (what the UI shows, what TTS receives)

```
<speak><prosody rate="{ssml.rate}" pitch="{ssml.pitch}">
  {text, with '…' replaced by <break time="{breakMs/1000}s"/>}
  <break time="{breakMs/1000}s"/>
</prosody></speak>
```
Grounding words in `emphasis[]` wrap as `<emphasis level="moderate">word</emphasis>`.
This is byte-compatible with `audio_mixer.add_ssml_pacing` — reuse it rather than re-implement.

### ElevenLabs request (per line or per merged block)
```
POST {TTS 8136}/text_to_speech        headers: { "xi-api-key": ELEVENLABS_API_KEY }
body: { text: <ssml>, model_id: "eleven_turbo_v2",
        voice_settings: { stability, style, speed, similarity_boost } }
```
Tonality is carried by `voice_settings` + optional per-tone `voice_id`
(e.g. a warmer maternal voice, a firmer paternal voice), NOT by SSML.

## Variation #2 — the E/P lane model

Same `sequence` skeleton, two resolved lanes. Lines tagged `lane:'both'` are shared;
`lane:'E'` / `lane:'P'` are the divergences. Resolve with:
`sequence.filter(l => l.lane === 'both' || l.lane === activeLane)`.

| step | E-lane (inferred) | P-lane (literal) |
|---|---|---|
| Induction | Arm-raising, permissive ("allow", balloons) | Arm-raising, direct ("it IS lifting") |
| after conversion | **PHS to re-hypnosis** (both) | **PHS to re-hypnosis** (both) |
| deepener 1 | 5-to-0 count (hand down) | **Hand-to-Forehead challenge** (hand already up) |
| deepener 2 | Reactional | 5-to-0 count |
| deepener 3 | Heavy/Light (inference) | Arm Rigidity (challenge) |
| PR → Staircase → Suggestion → Count-out → Finger-spread verify | shared, wording leans to lane | shared, wording leans to lane |

Placement rules encoded as validation: **challenges (Hand-to-Forehead, Arm Rigidity) only in
P-lane** (felt proof convinces physicals; risks feeling like control for emotionals);
**Hand-to-Forehead must precede the 5-to-0** (hand position); **every deepener re-seats the PHS**
in a first session.

## E/P lexicon (grader: "E/P lexicon 20 pts")

- **Emotional / inferred:** allow · tendency · giving yourself permission · you may notice ·
  a greater sense of control · peaceful · safe · imagine · it's like…
- **Physical / literal:** it IS · feel it now · lighter · rigid · your body does this ·
  present tense · concrete · direct command

## ⚠ TTS integration note for Claude Code (READ THIS)

**The Teleprompter's ♪ Speak button currently uses the browser Web Speech API
(`window.speechSynthesis`) — NOT ElevenLabs.** It is a local, no-key practice preview so
the design runs standalone. It was written to read the *same* `ssml.rate`, `ssml.pitch`,
`ssml.breakMs` and `voice.tone` fields the production path uses, so replacing it is a
drop-in, not a rewrite.

To wire the real backend, replace the `_speak()` method's synthesis step with your pipeline:

1. **Render SSML** — reuse `audio_mixer.add_ssml_pacing(text, zone, ep_type, client_name)`
   (do not re-implement; the UI already shows its exact output).
2. **Synthesize** — `POST {TTS 8136}/text_to_speech` (or `tts_client.synthesize`) with
   `{ text: <ssml>, model_id: "eleven_turbo_v2", voice_settings: { stability, style, speed,
   similarity_boost } }`, header `xi-api-key: ELEVENLABS_API_KEY`. Map `voice.tone` →
   `voice_settings` (maternal ≈ stability .55 / style .15; paternal ≈ .35 / .45) and, ideally,
   a per-tone `voice_id` (warm maternal voice, firm paternal voice).
3. **Play** — stream/await the returned audio (MP3) and `audio.play()`; drive line
   auto-advance off the audio `ended` event instead of the current Web-Speech `utterance.onend`.
   Feed visemes to the avatar in parallel (`tts_client` already returns them).
4. **Env / services** — `ELEVENLABS_API_KEY` (+ `ELEVENLABS_MODEL_ID`) from `Jeeth.ai/.env`;
   services started by `Jeeth-AI-Start-All-Services.ps1` (TTS 8136, Voice-Enhance 9041,
   orchestrator 8600, persona 8601). The browser fallback should remain as an offline/no-key
   degrade path.

**Same contract, two backends:** keep the abstract line fields authoritative; `speechSynthesis`
is the dev preview, ElevenLabs (8136) is production. Nothing in the UI needs to change when you
switch — only `_speak()`'s synth call.

## Events the Studio/Room consume (WS turns, orchestrator :8600)

- `stage` → color-coded divider + teleprompter section change.
- `await{name}` → pulsing amber checkpoint; persona nod latency keyed to suggestibility.
- `snap` → 200ms amber flash; deep-sleep transient (audio) or button fallback.
- `phs` → ⚓ marker; grader counts PHS reps ("PHS reps 10 pts").
- `reply` → persona bubble; `source` = ollama | fallback.
