---
description: Generate the ElevenLabs export pack for a script — enriched SSML, expressive flatten, E11 request plan, and settings — from a plan render or a hand-authored SSML file.
argument-hint: <source: plan <profile> <plan> | ssml <path>> [--vak visual|auditory|kinesthetic]
---

Produce the full ElevenLabs/synthesis pack for a hypnosis script. Two sources: render from a
session plan, or flatten a hand-authored standalone SSML file. Follow the flatten contract exactly
— read the reference first, do not improvise the flattening rules.

## Read first
- `.claude/reference/07-elevenlabs-export.md` — the two flatteners, which text goes where, settings.
- `.claude/reference/03-pacing-and-pauses.md` — break-scaling + the ≥2s dramatic-silence rule.
- `.claude/reference/09-standalone-scripts.md` — if the source is a hand-authored SSML file.
- The real `render/prosody.py` on disk — confirm function names (`ssml_to_elevenlabs`,
  `ssml_to_elevenlabs_expressive`) and that `--el-text` writes the VENDORED flatten. Never assume.

## Step 1 — get enriched SSML + E11 plan

**Source = plan:**
```bash
cd packages/session-templates
python render/render_session.py --profile examples/profiles/<profile>.yaml \
  --plan templates/<plan>.session.yaml -o out/x.ssml
python render/prosody.py --in out/x.ssml --suggestibility <physical|emotional|balanced> [--vak <vak>] \
  --lexicon render/nlp_lexicon.yaml -o out/x.enriched.ssml --e11-plan out/x.e11.json \
  --el-text out/x.eleven.vendored.txt --el-text-expressive out/x.eleven.txt
```

**Source = hand-authored SSML:**
```bash
cd packages/session-templates
python3 -c "from lxml import etree; etree.fromstring(open('<path>','rb').read()); print('SSML OK')"   # must pass
python render/prosody.py --in <path> --suggestibility balanced --lexicon render/nlp_lexicon.yaml \
  -o out/x.enriched.ssml --e11-plan out/x.e11.json \
  --el-text out/x.eleven.vendored.txt --el-text-expressive out/x.eleven.txt
```

## Step 2 — verify the pack (both flattens already written)

`--el-text` gives the vendored (parity) flatten. `--el-text-expressive` gives the expressive
(blank-line silences, graded pauses) flatten. Both are written in Step 1 above.

## Step 2b — verify the pack
- SSML well-formed (Step 1 passed).
- E11 plan: every segment routes to the intended tonality — print `stage / override_tonality /
  override_pace` per segment and confirm none is an unexpected `_default`.
- Expressive flatten: blank-line count > 0 where `≥2s` breaks exist; CAPS present for any strong
  emphasis; no raw `<...>` tags left.
- Vendored flatten: no 4+ dot runs (parity preserved).

## Step 3 — assemble the pack (mirror the anxiety_wealth pack)
Deliver, in `/mnt/user-data/outputs/` (or the repo `out/`):
- `<name>.ssml` (or `.enriched.ssml`) — engine-native SSML
- `<name>.elevenlabs.txt` — **expressive** flatten (feed to ElevenLabs)
- `<name>.vendored.txt` — parity flatten (reference)
- `<name>.e11-plan.json` — per-segment TTS request plan
- a short README: which file goes where + ElevenLabs settings (Stability 80–85%, Similarity ~75%,
  Style Exaggeration 0%) + HeyGen Audio-Input / Simli stream note.

## Report
State the source, segment count + tonality routing, the flatten stats (dramatic breaks, CAPS), and
the file list. Terse.
