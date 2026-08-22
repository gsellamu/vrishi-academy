# Standalone Therapeutic Scripts

Most VRishi output is a **first-session flow** rendered from the block library via a `.session.yaml`
plan (see `05-block-authoring.md`). But some deliverables are **standalone therapeutic scripts** —
a suggestion-phase session for a specific outcome (anxiety relief, health, wealth, sleep, etc.)
that assumes the client is already relaxed/receptive, or is paired after a separate induction.
These are authored **directly as house-dialect SSML**, not rendered from a plan. This file is the
procedure.

## When to hand-author SSML vs. render from a plan

| Situation | Approach |
|---|---|
| Full first session (induction → count-out) | Render from a `.session.yaml` plan. Never hand-write. |
| Subsequent-session suggestion set tied to profiles | Extend the block library + plan. |
| One-off therapeutic script for a specific outcome | **Hand-author SSML** (this file). |
| Script whose structure doesn't match the block stages | Hand-author SSML. |

Hand-authoring is the exception. If the script reuses induction/deepener/emergence mechanics,
prefer blocks so it inherits the tonality/pacing/PHS contract automatically.

## Reuse the stage marks (this is what makes it work)

Even hand-authored, the script MUST use real `stage_*` marks so `prosody.py` routes each segment
to the right zone/tonality/pace and the E11 plan comes out correct. Pick the stage whose tonality
matches each movement's intent (see `02-tonality-and-ep.md` and `08-tonal-triggers.md`):

- nurturing / anxiety-relief / receptive → `stage_prog_relax` (maternal) or `stage_suggestions`
  (theta, E-override maternal)
- command / structure / claiming → `stage_reactional` (authority) or `stage_physio`/`stage_conversion`
- deep suggestion install → `stage_suggestions` (theta_hypnotic)
- emergence → `stage_emerge` (authority, brightening)

The mark is what gives a hand-written block its voice. A segment with no stage mark falls to
`_default` (therapy/conversational) — wrong for most movements.

## The authoring procedure

1. **Outline the movements** and assign each a stage mark by tonality. Alternating archetypes
   (maternal↔paternal) is fine and effective — just alternate the stage accordingly.
2. **Write each movement** wrapped in its `<mark>` + `<prosody>` + `<p>`:
   ```xml
   <mark name="stage_prog_relax"/>
   <prosody rate="85%" pitch="-2%" volume="soft"><p>...maternal-worded passage...
   <break time="800ms"/> ... <break time="2s"/></p></prosody>
   ```
   - Set `rate`/`pitch`/`volume` to roughly the stage's effective values (02-tonality gives the
     numbers) — or omit and let a re-enrich pass set them. Explicit is fine for a fixed script.
   - Use `<break>` for pacing; a `2s`+ break becomes a dramatic blank-line silence in the
     expressive flatten (see 03-pacing and 07-elevenlabs-export).
   - Mark true embedded commands with `<emphasis level="strong">` (→ CAPS in the flatten); keep
     them sparse.
3. **Saturate vocabulary** from `tonal_triggers` matching each movement's tonality (08-tonal-triggers).
4. **Wrap the whole thing** in one `<speak>…</speak>`.
5. **Validate + flatten + plan** (see below).
6. **Two audiences:** produce a human read-aloud doc (mode-cued) AND the Claude Code pack (SSML +
   expressive flatten + E11 plan). See `/elevenlabs-export`.

## Safety / compliance (still applies to standalone scripts)

- All wording ORIGINAL — nothing verbatim from copyrighted workbooks.
- No "cure" language — use improve / modify / positively change (`forbidden_claims` in the lexicon).
- If the script is health-adjacent, keep it self-improvement framing; a health *condition* needs the
  referral-lane posture (see `/new-plan` and axes `issue_lane`).
- Standalone suggestion scripts assume prior induction — say so in the read-aloud notes so the
  practitioner doesn't deliver it cold.

## Validate + generate

```bash
# 1) well-formed?
python3 -c "from lxml import etree; etree.fromstring(open('out/x.ssml','rb').read()); print('SSML OK')"

# 2) enrich -> E11 plan (confirms every stage mark routes, not _default)
python render/prosody.py --in out/x.ssml --suggestibility balanced \
  --lexicon render/nlp_lexicon.yaml -o out/x.enriched.ssml --e11-plan out/x.e11.json

# 3) expressive flatten for ElevenLabs
python3 -c "
from render.prosody import ssml_to_elevenlabs_expressive as ex
open('out/x.eleven.txt','w',encoding='utf-8').write(ex(open('out/x.enriched.ssml',encoding='utf-8').read()))
print('flattened')
"

# 4) confirm tonality routing per movement
python3 -c "
import json;p=json.load(open('out/x.e11.json'))
[print(s['meta']['stage'], s['body']['override_tonality'], s['body']['override_pace']) for s in p]
"
```

DONE when: SSML is well-formed, every movement's stage mark routes to the intended tonality (none
unexpectedly `_default`), the expressive flatten shows the dramatic blank-lines where you placed
`≥2s` breaks, and the read-aloud + pack are produced.

## Reference example

The anxiety/health/wealth script (`anxiety_wealth.ssml` + pack) is the canonical worked example:
7 movements alternating maternal (prog_relax/suggestions) and paternal (reactional/authority),
closing on `stage_emerge`. Study it before authoring a new one.
