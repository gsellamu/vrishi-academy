# ElevenLabs Export & Synthesis

The engine produces SSML in the house dialect. ElevenLabs does **not** parse SSML — raw tags get
read aloud ("less than break time..."). So for any ElevenLabs (or HeyGen/Simli-over-ElevenLabs)
delivery, the pipeline flattens SSML to plain text with punctuation cues. This file is the
authority on that flatten and the synthesis handoff.

## Two flatteners, two purposes (both in `render/prosody.py`)

### `ssml_to_elevenlabs(ssml_text)` — vendored, production parity
Byte-identical to `AI_Pipeline_Code/services/ssml_router.py`. **Do not change its behavior** — the
production TTS path at `:8136` depends on that parity. Rules:
- `<break time="Nms"/>` → `"." × (N // 300 + 1)`
- `<break time="Ns"/>` → `"." × (int(N × 3) + 1)`
- runs of 4+ dots collapse to `...` (so a 3s break and a 0.9s break look the same)
- `<emphasis level="strong">X</emphasis>` → `X` uppercased; `moderate` → `X` unchanged
- all other tags stripped; all whitespace (incl. blank lines) collapsed to single spaces

`enrich()` uses THIS flatten for each E11-plan segment's `text` — correct, because the plan feeds
the production `:8136` service which expects parity behavior.

### `ssml_to_elevenlabs_expressive(ssml_text)` — opt-in, read-aloud fidelity
For standalone script export where neural-voice pacing matters more than parity. Differences:
- `<break>` **≥ 2s (or 2000ms)** → a **blank line** (paragraph break = a 1.5–3s dramatic silence,
  which ElevenLabs reads far better than a run of inline dots)
- shorter breaks → graded ellipsis, `1 dot / 300ms`, **capped at 6 dots** so the line stays legible
- `strong` → CAPS; `moderate` → unchanged (same as vendored)
- blank lines are **preserved** (single spaces still collapsed within a line)

This is the flatten to feed ElevenLabs for hypnosis scripts. It is **not** wired into the CLI yet
(see below) — call it programmatically or via `/elevenlabs-export`.

## The CLI today (accurate)

```bash
python render/prosody.py --in out/x.ssml --suggestibility physical --vak visual \
  --lexicon render/nlp_lexicon.yaml \
  -o out/x.enriched.ssml --e11-plan out/x.e11.json \
  --el-text out/x.vendored.txt --el-text-expressive out/x.eleven.txt
```

- `--el-text` writes the **vendored** flatten (joins E11-plan segment texts). Production parity —
  never change its behavior.
- `--el-text-expressive` writes the **expressive** flatten of the full enriched SSML
  (`ssml_to_elevenlabs_expressive(enriched)`). Blank-line dramatic silences, graded pauses, CAPS.
  This is the file to feed ElevenLabs for hypnosis scripts.

Both flags are optional and independent — use either or both.

## Which text goes where

| Target | Feed it | Why |
|---|---|---|
| ElevenLabs standalone (highest fidelity) | **expressive** flatten | blank-line silences + graded pauses read naturally |
| VRishi `:8136` hypnotic TTS service | the **E11 plan** (per-segment) | each segment carries `override_tonality`/`override_pace` — cleaner archetype separation |
| A true-SSML engine (Polly/Google) | the **enriched SSML** | they parse `<prosody>`/`<break>`/`<emphasis>` directly |
| HeyGen / Simli | **WAV** produced from one of the above | never feed raw text/SSML to the visual agent |

## ElevenLabs voice settings for hypnosis (Ericksonian monotone)

- **Stability 80–85%** — holds the flat, rhythmic cadence; kills erratic emotional jumps.
- **Similarity / Clarity ~75%** — crisp, grounded, deep-register.
- **Style Exaggeration 0%** — no drama; a smooth verbal pendulum.
- Deep, mature male voice for the maternal↔paternal work (rich low frequencies carry both modes).

## Synthesis handoff

- **HeyGen (pre-rendered):** generate the WAV in ElevenLabs, then use HeyGen **Audio Input mode** —
  upload the WAV so the lip-sync maps to the real breath pauses. Never type text into HeyGen for
  these scripts.
- **Simli (real-time):** stream the ElevenLabs audio buffer into Simli's low-latency pipeline.
- **In-pipeline:** POST each E11-plan segment to `:8136` and let LiveKit handle playback; the
  per-segment tonality shifts land as distinct synthesis calls.

## Verifying a flatten

```bash
python3 -c "
from render.prosody import ssml_to_elevenlabs, ssml_to_elevenlabs_expressive as ex
s=open('out/x.enriched.ssml',encoding='utf-8').read()
v=ssml_to_elevenlabs(s); e=ex(s)
print('vendored 3s-collapse OK:', '....' not in v)          # parity: no long dot-runs
print('expressive dramatic breaks:', e.count(chr(10)+chr(10)))  # blank-line silences
print('CAPS commands present:', any(w.isupper() and len(w)>2 for w in e.split()))
"
```

Rule of thumb: if ElevenLabs over-pauses on the inline dots, thin them — the **blank lines** carry
the major silences on their own, so the dots are a secondary, tunable layer.
