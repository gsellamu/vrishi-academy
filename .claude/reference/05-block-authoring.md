# Block Authoring — Writing a Macro to Spec

How to add or change a block macro in `templates/_blocks/blocks.ssml.j2` so it delivers at 100%
efficacy and passes verification. Follow this order; skipping steps is how silent breakage ships.

## Canonical block inventory (current)

Primitives: `brk`, `await`, `snap`, `deep_sleep`, `phs_short`.
Stages: `pre_talk`, `theory_of_mind`, `suggestibility_questions`, `induction_arm_raising`,
`auto_dual_induction`, `count_5_0`, `deepener_reactional`, `deepener_heavy_light`, `deepener`
(staircase/path/slide by age), `eye_fascination`, `guided_imagery`, `self_hypnosis_teach`,
`progressive_relaxation`, `suggestions`, `count_out`, `finger_spread_conversion`, `homework`.

Role classes:
- **Primary inductions** — `induction_arm_raising` (default), `auto_dual_induction` (alt).
  Selected by `p.induction` in `session_first`.
- **Secondary inductions / deepeners** — `eye_fascination`, `guided_imagery`, `count_5_0`,
  `deepener_*`, `deepener`. Ride on the anchor the primary set.
- **Challenges** (in `drills.json`, and hand-forehead/arm-rigidity as drill content) — use
  paternal/authority tonality and reverse-action wording.
- **Coaching** — `self_hypnosis_teach` (client awake, no snap/PHS).

## Step 1 — Decide the role and the stage mark

Pick the block's role (primary/secondary/deepener/challenge/coaching). That fixes:
- the **stage mark** name (`stage_<something>`, snake_case),
- its **zone/phase/tonality** row (add to `STAGE_MAP` in BOTH `prosody.py` and
  `academy-orchestrator/main.py` — identical),
- whether it ends on `deep_sleep()` + PHS (every induction/deepener does; coaching does not).

## Step 2 — Write the macro (dialect rules)

```jinja
{%- macro my_block(p) -%}
{#- One-line purpose + source (e.g. Practicum 101-5 item N). Original wording. -#}
<mark name="stage_my_block"/>
<p>First breath group. {{ brk('600ms') }}
A line with an embedded command like go deeper, and a presupposition as you begin to notice…
{{ brk('900ms') }}
When something observable happens, nod. {{ await('my_checkpoint') }}</p>
{% if p.mode == 'literal' -%}
<p>Direct, present-tense, paternal words: it IS happening. {{ brk('700ms') }}</p>
{%- else -%}
<p>Permissive, Milton words: you might allow it to happen. {{ brk('900ms') }}</p>
{%- endif %}
<p>… {{ deep_sleep() }} {{ brk('1500ms') }}</p>
{{ phs_short(p) }}
{%- endmacro -%}
```

Rules:
- Only in-dialect tags (see `01-ssml-dialect.md`). Balanced `<p>`. ms/s breaks.
- Use canonical NLP phrasings so they analog-mark (see `04-nlp-marking.md`); add new phrases to
  `nlp_lexicon.yaml` if you invent wording you want marked.
- Match words to `p.mode` (literal → `if`; inferred/blended → `else`). If the block is inherently
  one-lane (imagery, auto-dual), you may skip branching — voice still adapts via EP/E-override.
- Personalize with `{{ p.vars.get('key','default') }}` and `s.*` plan fields; don't double-run
  `pers`.
- End inductions/deepeners with `deep_sleep()` then `phs_short(p)` (first-session PHS). Coaching
  blocks end awake — no snap, no PHS.
- Ideomotor: one `await()` per real checkpoint, each preceded by a line to respond to.

## Step 3 — Register the stage in BOTH STAGE_MAPs

`render/prosody.py` and `services/academy-orchestrator/main.py` each hold a `STAGE_MAP`. Add the
same row to both (note the key spelling differs: prosody uses the full `stage_my_block`, the
orchestrator uses the bare `my_block` — match the existing pattern in each file):

```python
# prosody.py
"stage_my_block": (4, "deepening", "theta_hypnotic", None),
# academy-orchestrator/main.py
"my_block":       (4, "deepening", "theta_hypnotic", None),
```

Miss this and the block renders but delivers in the `_default` therapy voice — wrong for an
induction/emergence.

## Step 4 — Wire it into a template (gated)

In `session_first.ssml.j2` / `session_subsequent.ssml.j2`, add the call behind a flag so existing
renders don't change:

```jinja
{% if p.my_flag %}{{ b.my_block(p) }}{% endif %}
```

Add the flag to `resolve()` in `render_session.py` with a safe default, reading profile then plan:

```python
"my_flag": bool(profile.get("vars", {}).get("my_flag", plan.get("my_flag", False))),
```

For an alternative primary induction, branch instead of gate:
`{% if p.induction == 'my_induction' %}{{ b.my_block(p) }}{% else %}{{ b.induction_arm_raising(p) }}{% endif %}`.

## Step 5 — Enable it on a real plan (make it reachable)

Set the flag in a `.session.yaml` and reflect it in that plan's `stages:` list (documentation for
the orchestrator's timing view):

```yaml
my_flag: true
stages:
  - {stage: my_block, block: my_block, minutes: 4}
```

## Step 6 — (If it's a drill too) add to `drills.json`

New drill object (`id`, `name`, `weight`, `min`, `prompter[]`, `check[]`), plus a preset + a
sequence, plus a `GROUP_OF` tag in `apps/academy-web/app/lab/page.jsx` and a `focusOptions` entry.
See `06-verification.md` for the JSON integrity checks.

## Step 7 — Verify (never skip)

Run the full `/verify-session` checklist (`06-verification.md`). A block is DONE only when it
renders on all three profiles, both mode branches fire, the stage resolves in both maps, awaits
parse, NLP phrases mark, and the full WS E2E stays green.

## Common mistakes (all caught by verification)

- Mark name not snake_case → orchestrator regex misses it.
- Stage added to prosody map only, not orchestrator (or vice versa) → half-wrong voice / missing
  turn.
- `deep_sleep()` omitted at a deepener terminal → no anchor reinforcement.
- PHS omitted after a first-session conversion/deepener → breaks the 6–8× repetition contract.
- New wording not in `nlp_lexicon.yaml` → intended embedded commands aren't marked.
- Unbalanced `<p>` / unclosed `<emphasis>` → lxml raises at render.
- Flag added to template but not to `resolve()` → StrictUndefined error at render.
- Coaching block given a `deep_sleep()`/PHS → client "asleep" during awake homework coaching.
