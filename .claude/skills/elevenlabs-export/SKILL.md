---
name: elevenlabs-export
description: Generate the full ElevenLabs export pack for a VRishi hypnosis session — enriched SSML, expressive flatten, vendored flatten, and E11 request plan. Use this skill whenever the user wants to export a session for ElevenLabs, create a TTS pack, flatten SSML for synthesis, generate audio-ready text from a session plan or standalone script, or mentions ElevenLabs/HeyGen/Simli in the context of session audio. Also triggers on "/elevenlabs-export".
---

# ElevenLabs Export

Generate the complete ElevenLabs/synthesis pack from either a session plan render or a hand-authored SSML file. The pack includes enriched SSML, two flattened text variants (vendored parity + expressive read-aloud), and a per-segment TTS request plan.

## Arguments

```
/elevenlabs-export plan <profile> <plan> [--vak visual|auditory|kinesthetic]
/elevenlabs-export ssml <path-to-ssml> [--suggestibility physical|emotional|balanced] [--vak ...]
```

**Examples:**
- `/elevenlabs-export plan p1_physical_analyst vocational_presentation_confidence`
- `/elevenlabs-export plan p2_emotional_elder_caregiver referral_pain_comfort --vak kinesthetic`
- `/elevenlabs-export ssml out/anxiety_wealth.ssml --suggestibility balanced`

## Profile → suggestibility mapping

The profile name encodes the suggestibility type. Use this mapping:
- `p1_physical_analyst` → `physical`, default vak `visual`
- `p2_emotional_elder_caregiver` → `emotional`, default vak `kinesthetic`
- `p3_child_student` → `balanced`, default vak `auditory`

If the profile name doesn't match a known pattern, default to `balanced`.

## Procedure

### Step 1 — Render (plan source only)

```bash
cd packages/session-templates
python render/render_session.py \
  --profile examples/profiles/<profile>.yaml \
  --plan templates/<plan>.session.yaml \
  -o out/<profile>_<plan>.ssml
```

Must print `OK ...` with no traceback. For an SSML source, validate with lxml instead:
```bash
python -c "from lxml import etree; etree.fromstring(open('<path>','rb').read()); print('SSML OK')"
```

### Step 2 — Enrich + both flattens + E11 plan

```bash
python render/prosody.py \
  --in out/<name>.ssml \
  --suggestibility <physical|emotional|balanced> \
  --vak <vak> \
  --lexicon render/nlp_lexicon.yaml \
  -o out/<name>.enriched.ssml \
  --e11-plan out/<name>.e11-plan.json \
  --el-text out/<name>.vendored.txt \
  --el-text-expressive out/<name>.elevenlabs.txt
```

Must print `[OK] enriched -> ...`. The two flatten flags:
- `--el-text` writes the **vendored** flatten (production parity with `:8136`, never change behavior)
- `--el-text-expressive` writes the **expressive** flatten (blank-line dramatic silences, graded pauses capped at 6 dots, CAPS for strong emphasis — this is the file to feed ElevenLabs)

### Step 3 — Verify the pack

Run these checks and report results:

1. **Tonality routing** — print each segment's stage/tonality/pace from the E11 plan JSON. Confirm none routes to `_default` unexpectedly.

2. **Vendored flatten** — confirm no 4+ dot runs exist (parity constraint).

3. **Expressive flatten** — confirm:
   - Dramatic blank lines > 0 (from breaks >= 2s)
   - Max dot run <= 6
   - CAPS commands present (from strong emphasis)
   - No raw `<tags>` leaked

Use Python 3.11-compatible code (no backslashes in f-string expressions).

### Step 4 — Report

Output a summary table:

```
## ElevenLabs Export Pack — <name>

| File | Purpose |
|---|---|
| out/<name>.enriched.ssml | Engine-native enriched SSML |
| out/<name>.elevenlabs.txt | Expressive flatten (feed to ElevenLabs) |
| out/<name>.vendored.txt | Parity flatten (reference for :8136) |
| out/<name>.e11-plan.json | Per-segment TTS request plan |

**Segments:** N | **Tonality routing:** all correct, no _default fallbacks
**Vendored:** no 4+ dot runs | **Expressive:** N dramatic blanks, max M dots, K CAPS, no raw tags

**ElevenLabs settings:** Stability 80-85%, Similarity ~75%, Style Exaggeration 0%
**HeyGen:** Audio Input mode with generated WAV (never type text directly)
**Simli:** Stream ElevenLabs audio buffer into low-latency pipeline
```

## Key contracts (read `.claude/reference/07-elevenlabs-export.md` for full details)

- The vendored flattener (`ssml_to_elevenlabs`) is byte-identical to `ssml_router.py` — never change it
- The expressive flattener (`ssml_to_elevenlabs_expressive`) converts breaks >= 2s to blank lines and uses graded ellipsis capped at 6 dots
- Both are in `render/prosody.py` and wired to CLI flags
- The E11 plan carries per-segment `override_tonality` and `override_pace` for the `:8136` TTS service
