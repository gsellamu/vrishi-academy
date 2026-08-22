---
description: Author a standalone therapeutic SSML script for a specific outcome (anxiety, sleep, confidence, wealth, etc.) as house-dialect SSML, with tonal-trigger vocabulary and both deliverables.
argument-hint: <outcome> [archetype: maternal|paternal|alternating] [--pair-induction]
---

Write a standalone therapeutic script for **$1** directly as house-dialect SSML (not rendered from
a plan). Use real stage marks so it routes to the correct tonality; saturate each movement with the
matching tonal-trigger vocabulary; produce both the human read-aloud and the Claude Code pack.

## Read first
- `.claude/reference/09-standalone-scripts.md` — the authoring procedure. Follow it.
- `.claude/reference/02-tonality-and-ep.md` — pick the stage whose tonality matches each movement.
- `.claude/reference/08-tonal-triggers.md` — the maternal/paternal word lists to saturate with.
- `.claude/reference/01-ssml-dialect.md` — legal tags + mark grammar.
- The canonical worked example: `anxiety_wealth.ssml` (7 movements, maternal↔paternal). Match its shape.

## Decide the shape
- **maternal** ($2): nurturing/receptive throughout (anxiety relief, sleep, self-compassion) →
  `stage_prog_relax` / `stage_suggestions` movements, maternal vocabulary.
- **paternal** ($2): command/structure throughout (discipline, drive, boundary-setting) →
  `stage_reactional` (authority) movements, paternal vocabulary.
- **alternating** ($2): outcome has both a receiving and a commanding side (wealth, health,
  performance) → alternate stages movement-by-movement.
- `--pair-induction`: this script is the SUGGESTION PHASE only; note in the read-aloud that a full
  induction (the first-session script) must precede it. Do NOT prepend an induction here.

## Author the SSML
For each movement:
```xml
<mark name="stage_<by-tonality>"/>
<prosody rate="<from 02-tonality>%" pitch="<...>%" volume="<soft|medium>"><p>
  ...passage saturated with matching tonal_triggers...
  <break time="700ms"/> ...pacing... <break time="2s"/>   <!-- >=2s = dramatic silence -->
</p></prosody>
```
Rules: one `<speak>` wrapper; real `stage_*` marks only; `<break>` for pacing (≥2s between
movements for the dramatic drop); `<emphasis level="strong">` on true embedded commands (sparse →
CAPS in flatten); ALL wording original; no "cure" (use improve/modify/positively change); keep
health-condition claims out (self-improvement framing).

## Validate + generate (per 09-standalone-scripts)
```bash
cd packages/session-templates
python3 -c "from lxml import etree; etree.fromstring(open('out/$1.ssml','rb').read()); print('SSML OK')"
python render/prosody.py --in out/$1.ssml --suggestibility balanced --lexicon render/nlp_lexicon.yaml \
  -o out/$1.enriched.ssml --e11-plan out/$1.e11.json
python3 -c "import json;[print(s['meta']['stage'],s['body']['override_tonality']) for s in json.load(open('out/$1.e11.json'))]"
```
Confirm every movement routes to the intended tonality (none unexpectedly `_default`).

## Deliver BOTH audiences
1. **Human read-aloud** (PDF/DOCX or md): mode-cued — (maternal)/(paternal) headers, pause cues,
   dramatic-silence markers, analog commands in bold caps. Mirror `anxiety-wealth-readaloud`.
2. **Claude Code pack** via `/elevenlabs-export` on the SSML: enriched SSML + expressive flatten +
   E11 plan + settings README.

## Report
Movement list with stage/tonality, confirmation the SSML is well-formed and routes correctly, and
the two deliverables. Terse.
