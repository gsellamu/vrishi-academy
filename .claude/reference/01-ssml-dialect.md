# SSML Dialect & Mark Grammar

The house SSML dialect is deliberately small. The renderer emits only these constructs; the
enricher adds `<prosody>`; the ElevenLabs flattener maps them to plain text + ellipses. Do not
introduce tags outside this set — the flattener and both `STAGE_MAP` consumers only understand
these.

## Tag vocabulary (rendered SSML)

| Tag | Emitted by | Meaning | E11 flatten rule |
|---|---|---|---|
| `<speak>…</speak>` | template root | document wrapper | stripped |
| `<prosody rate pitch volume>` | template root + enricher | voice params for a span | stripped (params → per-segment TTS call) |
| `<break time="Nms\|Ns"/>` | `brk()` macro | silent pause | `Nms` → one "." per 300ms; `Ns` → one "." per ⅓s |
| `<emphasis level="strong\|moderate">` | `deep_sleep()`, enricher | analog-marked phrase | `strong` → UPPERCASE; `moderate` → unchanged text |
| `<p>…</p>` | block macros | breath group / paragraph | stripped |
| `<mark name="stage_*"/>` | every block | stage boundary + prosody switch | stripped |
| `<mark name="await_*"/>` | `await()` macro | ideomotor checkpoint | stripped |
| `<mark name="cue_snap"/>` | `snap()` macro | snap / action-cue slot | stripped |

Nothing else. No `<say-as>`, no `<phoneme>`, no `<audio>`, no `<sub>`. The ElevenLabs stack does
not support them and the flattener will leave raw tags in the text.

## The core macros (from `blocks.ssml.j2` header)

```jinja
{%- macro brk(t) -%}<break time="{{ t }}"/>{%- endmacro -%}
{%- macro await(name) -%}<mark name="await_{{ name }}"/>{{ brk('4s') }}{%- endmacro -%}
{%- macro snap() -%}<mark name="cue_snap"/>{%- endmacro -%}
{%- macro deep_sleep(level='strong') -%}{{ snap() }}<emphasis level="{{ level }}">Deep sleep.</emphasis>{%- endmacro -%}
```

- `brk('700ms')` / `brk('1.2s')` — a pause. Always ms or s with the unit. Enricher scales it.
- `await('skin_contact')` — emits `<mark name="await_skin_contact"/>` + a 4s hold. The 4s is a
  visual placeholder; live delivery waits for the actual nod. Name it in snake_case; the
  orchestrator turns it into a role-play checkpoint.
- `snap()` — the action-cue slot. On its own it's silent; `deep_sleep()` pairs it with the
  spoken cue. For a forehead touch or limpness cue, emit a named cue mark (see below).
- `deep_sleep()` — the anchor. Snap + emphasized "Deep sleep." Use `deep_sleep('moderate')` for
  the softer, inferred-friendly variant used in guided imagery and some deepener terminals.

## Mark grammar — the regex both consumers use

The orchestrator parses marks with exactly:

```python
TAG = re.compile(r'<mark name="(stage|await|cue)_([a-z_0-9]+)"/>')
```

So every mark name MUST match `(stage|await|cue)_[a-z0-9_]+`:
- **stage** marks: `stage_pre_talk`, `stage_induction`, `stage_auto_dual`, `stage_guided_imagery`,
  `stage_self_hypnosis_teach`, … — a stage boundary. Switches prosody (enricher) and emits a
  stage turn with zone/phase/tonality (orchestrator). MUST have an entry in both `STAGE_MAP`s.
- **await** marks: `await_skin_contact`, `await_weight_diff`, `await_pulse`, `await_sh_steps_ok`,
  … — an ideomotor checkpoint. Emits an await turn; the orchestrator then calls persona-svc for
  the client's reply. No `STAGE_MAP` entry needed.
- **cue** marks: `cue_snap`, `cue_forehead`, `cue_limpness` — an action-cue slot. Emits a `snap`
  turn `{type:"snap","name":name}`. Used for the physical anchor moment and paternal-lane touch
  cues.

Uppercase, camelCase, or hyphens in a mark name will silently fail to parse. snake_case only.

## Prosody wrapping (enricher output)

The enricher splits the rendered SSML on `stage_*` marks and wraps each inter-mark segment:

```xml
<mark name="stage_conversion"/>
<prosody rate="95%" pitch="-9%" volume="medium">…segment body with analog marks…</prosody>
```

- `rate` is a percentage; `pitch` is a signed percentage (`-9%`, `+1%`); `volume` is a keyword
  (`soft`/`medium`). Values come from `EP_VOICE_PARAMS[ep] + TONALITY_MODS[tonality]` — see
  `03-pacing-and-pauses.md`. You never write `<prosody>` by hand in a macro; the enricher owns it.
- The macro's job is the TEXT, the `<p>` breath groups, the `<break>` pauses, the `deep_sleep()`
  anchors, and the `await`/stage/cue marks. Prosody is layered on afterward per stage.

## Breath groups (`<p>`)

Wrap each coherent delivery unit in `<p>…</p>`. A paragraph is a breath group: the practitioner
inhales between them. Keep them to one idea. The renderer and flattener both rely on well-formed,
balanced `<p>` tags — an unclosed `<p>` fails lxml validation at render time.

## Personalization filter (`pers` / `{name}` etc.)

Plan text (presenting issue, suggestions, critical-mind lines) is run through the `pers` filter,
which substitutes `{name}`, `{subj}`, `{obj}`, `{poss}`, `{referrer}`, and any `profile.vars`.
Inside a macro you interpolate profile context with normal Jinja: `{{ p.vars.get('induction_arm','left') }}`.
Session-plan strings arrive already personalized via `s.*` (e.g. `s.presenting_issue`,
`s.critical_mind.why`). Do not double-substitute.

## Worked example (the auto-dual induction, abridged)

```jinja
{%- macro auto_dual_induction(p) -%}
<mark name="stage_auto_dual"/>
<p>Sit up straight, feet flat on the floor. {{ brk('600ms') }}
Hold your {{ p.vars.get('induction_arm','left') }} arm out, and place the index finger of the
other hand on that wrist — feel for your pulse. When you have it, nod. {{ await('pulse') }}
… {{ brk('800ms') }}
Nod if that's clear. {{ await('repeat_ok') }}</p>
<p>Five — my breathing growing deep, gentle, and rhythmic. {{ brk('700ms') }}
…
Zero — {{ deep_sleep() }} {{ brk('1500ms') }}</p>
{{ phs_short(p) }}
{%- endmacro -%}
```

Everything here is in-dialect: one stage mark, two await checkpoints, ms/s breaks, a
`deep_sleep()` anchor, breath-grouped `<p>`, a profile var, and the PHS macro at the end.
