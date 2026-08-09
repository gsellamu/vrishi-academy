# vrishi-session-templates v1.1

Kappasinian session-planning + scripting engine derived from Jeeth's HMI workbooks
(201-9 First Consultation, Practicum Scripts, ToM, Modalities, Clinical Note Taking,
E&P scoring) and the PSR mentor guide. All script wording is **original** — no Panorama/HMI
text is reproduced. For Jeeth's private practicum + VRishi platform use only.

## Layout
```
docs/hmi-session-anatomy.md      canonical sections → stages → steps (first + subsequent)
schema/axes.yaml                 tagging axes: sex, age_band, occupation_class,
                                 suggestibility (E/P), relationship_type (E/P), issue_lane
schema/session_plan.schema.json  plan contract (critical_mind 4Q, pillars, suggestions, homework)
templates/_blocks/blocks.ssml.j2 stage macros with E/P + age branching, <mark/> sync points
templates/session_first.ssml.j2  first-session composition (PSR-canonical order)
templates/session_subsequent.ssml.j2 subsequent sessions (finger-spread rapid re-induction)
templates/*.session.yaml         issue plans: vocational | avocational | referral_health
render/render_session.py         profile + plan → validated SSML (or ElevenLabs flavor)
examples/profiles/               3 test client profiles
```

## Render
```bash
pip install jinja2 pyyaml lxml
python3 render/render_session.py \
  --profile examples/profiles/p1_physical_analyst.yaml \
  --plan templates/vocational_presentation_confidence.session.yaml \
  [--template session_subsequent.ssml.j2] [--flavor elevenlabs] -o out.ssml
```
Axis resolution: physical_pct ≥ 60 → **literal**; ≤ 40 → **inferred**; else **blended**
(inferred open, literal close). Elder → −15% rate, +2dB, staircase→garden_path, heavy/light skipped.
Child → −8% rate, counts 3→0, staircase→slide; heavy/light adults only.
`<mark name="stage_*"/>` = stage anchors · `<mark name="await_*"/>` = ideomotor nod checkpoints ·
`<mark name="cue_snap"/>` = snap cue. These drive XR scene transitions, avatar animation, and grading.
`{limb}` is an intentional runtime slot filled from the client's hand-or-arm answer.

## Hard gates (renderer exits non-zero)
- `referral_health` lane without `referral_doc_id` → **BLOCKED** (mirrors the platform booking gate)
- `child`/`teen` without `guardian_consent`; `child` without `guardian_present` → **BLOCKED**
- Malformed SSML → lxml raises

## v1.1 (PSR alignment — mentor guide)
First session follows the PSR canonical sequence: pre-talk → ToM (primitive/fight-flight, 0–8 window,
88/12, partnership close) → arm-raising with eyes-closed suggestibility questions, physiological
ideomotor checkpoints (breath/swallow/eye-flutter nods), misdirection interleave, skin-contact
conversion + snap cue → PHS → 5→0 count → reactional → heavy/light (adults) → staircase-family →
PR (+outside-sounds reframe, terminal 5→0) → suggestions (+permissive coda) → count-out (door-close
line + rapid 1-5) → finger-spread PHS verify → homework. PHS repeats after induction and after every
deepener (×5). Subsequent-session template uses finger-spread conversion as the secondary induction.

## Compliance posture
B&P §2908 / SB 577 lanes are structural: vocational/avocational need no referral; referral_health
requires a written CA-licensee referral on file **before booking**. No diagnostic/treatment language;
referral-lane suggestions defer to the referring licensee. Risk triggers → stop and refer. Rendered
scripts naming a real client are clinical records → CMIA handling on the practice platform, not here.
