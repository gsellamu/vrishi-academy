# Tonality & EP — The Voice Matrix

Delivery voice = **EP base params** (per client suggestibility type) + **tonality modifier**
(per stage), with an **E-override** that softens paternal stages for emotional clients. All
values below are the real numbers from `render/prosody.py` (mirrored in `academy-orchestrator/
main.py`). Do not paraphrase them — they are the contract.

## EP base params (`EP_VOICE_PARAMS`)

Set from the client's suggestibility. `resolve_ep(physical_pct)`: ≥60 → physical, ≤40 →
emotional, else balanced. (`somnambulist` is available for a true 50/50 but is not auto-selected.)

| EP type | rate | pitch | volume | pause × | emphasis |
|---|---|---|---|---|---|
| physical | 95 | −5 | medium | 1.0 | strong |
| emotional | 85 | −2 | soft | 1.3 | moderate |
| somnambulist | 90 | −3 | medium | 1.0 | moderate |
| balanced | 90 | −3 | medium | 1.15 | moderate |

Reading: a physical client is delivered faster and lower with tight pauses and strong analog
marks (they need to FEEL the induction — crisp, certain, body-anchored). An emotional client is
slower, softer, with 30% longer pauses and gentler emphasis (they need to feel UNDERSTOOD —
spacious, permissive, imagery-led).

## Tonality modifiers (`TONALITY_MODS`)

Added on top of the EP base for each stage's tonality.

| tonality | Δrate | Δpitch | volume | pace |
|---|---|---|---|---|
| authority | +5 | −3 | medium | 1.05 |
| paternal | 0 | −4 | medium | 1.00 |
| maternal | −5 | +1 | soft | 0.92 |
| conversational | +3 | 0 | medium | 1.00 |
| theta_hypnotic | −10 | −4 | soft | 0.82 |

`pace` is a separate multiplier passed to the TTS call (`override_pace`) — it is NOT the same as
rate. Rate is the SSML prosody percentage; pace tunes the synthesis engine's delivery speed on
top. theta_hypnotic is the deepest register: −10 rate, −4 pitch, soft, 0.82 pace — used for the
count, deepeners, guided imagery, and the therapeutic suggestions.

## Stage → zone / phase / tonality (`STAGE_MAP`)

The 4th column is the **E-override**: when the client is emotional, that stage's tonality is
replaced. This is why a paternal physio/conversion becomes maternal for an emotional client —
you never bark body-commands at someone who needs permission.

| stage mark | zone | phase | tonality | E-override |
|---|---|---|---|---|
| stage_pre_talk | 1 | pre_induction | conversational | — |
| stage_tom | 2 | pre_induction | paternal | — |
| stage_sugg_questions | 3 | induction | conversational | — |
| stage_induction | 3 | induction | conversational | — |
| stage_auto_dual | 3 | induction | authority | — |
| stage_physio | 3 | induction | paternal | maternal |
| stage_conversion | 3 | induction | paternal | maternal |
| stage_count_5_0 | 4 | deepening | theta_hypnotic | — |
| stage_reactional | 4 | deepening | authority | paternal |
| stage_heavy_light | 4 | deepening | paternal | maternal |
| stage_deepener | 4 | deepening | theta_hypnotic | — |
| stage_guided_imagery | 4 | deepening | theta_hypnotic | — |
| stage_prog_relax | 4 | deepening | maternal | maternal |
| stage_suggestions | 5 | therapy | theta_hypnotic | — |
| stage_finger_spread | 7 | anchoring | paternal | maternal |
| stage_emerge | 8 | emergence | authority | — |
| stage_self_hypnosis_teach | 9 | post_session | conversational | — |
| stage_homework | 9 | post_session | conversational | — |

Any new stage mark you add MUST get a row here in BOTH files, or it falls to `_default`
(zone 5, therapy, conversational) — which is almost always the wrong voice for an induction or
emergence block.

## Effective voice per stage — physical (literal) client

This is what actually reaches the TTS after EP + tonality + E-override + theta pause-boost:

| stage | zone | tonality | rate | pitch | vol | pace | pauseX |
|---|---|---|---|---|---|---|---|
| pre_talk | 1 | conversational | 98% | −5% | medium | 1.0 | 1.0× |
| tom | 2 | paternal | 95% | −9% | medium | 1.0 | 1.0× |
| sugg_questions | 3 | conversational | 98% | −5% | medium | 1.0 | 1.0× |
| induction | 3 | conversational | 98% | −5% | medium | 1.0 | 1.0× |
| auto_dual | 3 | authority | 100% | −8% | medium | 1.05 | 1.0× |
| physio | 3 | paternal | 95% | −9% | medium | 1.0 | 1.0× |
| conversion | 3 | paternal | 95% | −9% | medium | 1.0 | 1.0× |
| count_5_0 | 4 | theta_hypnotic | 85% | −9% | soft | 0.82 | 1.25× |
| reactional | 4 | authority | 100% | −8% | medium | 1.05 | 1.0× |
| heavy_light | 4 | paternal | 95% | −9% | medium | 1.0 | 1.0× |
| deepener | 4 | theta_hypnotic | 85% | −9% | soft | 0.82 | 1.25× |
| guided_imagery | 4 | theta_hypnotic | 85% | −9% | soft | 0.82 | 1.25× |
| prog_relax | 4 | maternal | 90% | −4% | soft | 0.92 | 1.0× |
| suggestions | 5 | theta_hypnotic | 85% | −9% | soft | 0.82 | 1.25× |
| finger_spread | 7 | paternal | 95% | −9% | medium | 1.0 | 1.0× |
| emerge | 8 | authority | 100% | −8% | medium | 1.05 | 1.0× |
| self_hypnosis_teach | 9 | conversational | 98% | −5% | medium | 1.0 | 1.0× |
| homework | 9 | conversational | 98% | −5% | medium | 1.0 | 1.0× |

## Effective voice per stage — emotional (inferred) client

Note the E-overrides fire on physio, conversion, reactional, heavy_light, finger_spread; and the
1.3× EP pause multiplier compounds with the theta boost to **1.62×** on the deep stages.

| stage | zone | tonality | rate | pitch | vol | pace | pauseX |
|---|---|---|---|---|---|---|---|
| pre_talk | 1 | conversational | 88% | −2% | soft | 1.0 | 1.3× |
| tom | 2 | paternal | 85% | −6% | soft | 1.0 | 1.3× |
| sugg_questions | 3 | conversational | 88% | −2% | soft | 1.0 | 1.3× |
| induction | 3 | conversational | 88% | −2% | soft | 1.0 | 1.3× |
| auto_dual | 3 | authority | 90% | −5% | soft | 1.05 | 1.3× |
| physio | 3 | maternal | 80% | −1% | soft | 0.92 | 1.3× |
| conversion | 3 | maternal | 80% | −1% | soft | 0.92 | 1.3× |
| count_5_0 | 4 | theta_hypnotic | 75% | −6% | soft | 0.82 | 1.62× |
| reactional | 4 | paternal | 85% | −6% | soft | 1.0 | 1.3× |
| heavy_light | 4 | maternal | 80% | −1% | soft | 0.92 | 1.3× |
| deepener | 4 | theta_hypnotic | 75% | −6% | soft | 0.82 | 1.62× |
| guided_imagery | 4 | theta_hypnotic | 75% | −6% | soft | 0.82 | 1.62× |
| prog_relax | 4 | maternal | 80% | −1% | soft | 0.92 | 1.3× |
| suggestions | 5 | theta_hypnotic | 75% | −6% | soft | 0.82 | 1.62× |
| finger_spread | 7 | maternal | 80% | −1% | soft | 0.92 | 1.3× |
| emerge | 8 | authority | 90% | −5% | soft | 1.05 | 1.3× |
| self_hypnosis_teach | 9 | conversational | 88% | −2% | soft | 1.0 | 1.3× |
| homework | 9 | conversational | 88% | −2% | soft | 1.0 | 1.3× |

## Content-side mode branching (in the macro)

The tables above are the VOICE. The macro also branches its WORDS on `p.mode`:

```jinja
{% if p.mode == 'literal' -%}
  … direct, present-tense, commanding: "the hand IS lifting" …
{%- else -%}
  … permissive, Milton-model: "you might allow the hand to rise" …
{%- endif %}
```

- `literal` → the `if` branch (paternal words).
- `inferred` AND `blended` → the `else` branch (permissive words). Blended deliberately rides
  the permissive lane and converts to direct only at the deepening stages.
- Where a block is inherently one-sided (e.g. `auto_dual` is always authority-paced, guided
  imagery is always permissive imagery), it need not branch — but its VOICE still adapts through
  the EP + E-override tables above.

## The Five Laws in the voice

- **Dominance** is why paternal/authority exist at all: challenges (reactional, arm-rigidity,
  hand-forehead) and emphasis words get the firmer register; everything else defaults to the
  lulling maternal/theta voice.
- **Association / Repetition** are why `deep_sleep()` + PHS recur 6–8× — the cue is welded to the
  state by repetition in a consistent voice.
- **Reverse action** governs challenge wording ("try… but cannot"); deliver the weak verb light
  and the strong verb with strong emphasis + a pause envelope so the stronger one dominates.
