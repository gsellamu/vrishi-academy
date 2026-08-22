---
description: Adjust delivery voice — EP params, tonality modifiers, a stage's tonality/zone, or pause scaling — safely and in sync across both engines.
argument-hint: <target: ep|tonality|stage|pause> <what> "<change>"
---

You are changing the delivery voice contract. These numbers are duplicated across two files ON
PURPOSE — the whole system breaks if they drift. Change them together, verify audibly and
mechanically.

## Read first
- `.claude/reference/02-tonality-and-ep.md` — the current matrices and how they compose.
- `.claude/reference/03-pacing-and-pauses.md` — the pause-scaling math.
- Both source-of-truth tables:
  - `packages/session-templates/render/prosody.py` — `EP_VOICE_PARAMS`, `TONALITY_MODS`, `STAGE_MAP`.
  - `services/academy-orchestrator/main.py` — the SAME `EP_VOICE_PARAMS`, `TONALITY_MODS`, `STAGE_MAP`
    (bare stage keys, otherwise identical values).

## Rules (hard)
- **Any edit to `EP_VOICE_PARAMS`, `TONALITY_MODS`, or `STAGE_MAP` MUST be applied to BOTH files,
  identically.** Prosody uses `stage_*` keys; the orchestrator uses bare keys — match each file's
  existing convention but keep the (zone, phase, tonality, e_override) tuple identical.
- If the change alters the contract's behavior (params/mods/map), **bump `PROSODY_CONTRACT_VERSION`**
  in `prosody.py` AND the `Session-template contract version` note in root `CLAUDE.md`.
- Rate is clamped to `[70, 110]` after EP+tonality — check your change doesn't push a stage out of
  range (it'll silently clamp).
- theta_hypnotic carries a hardcoded ×1.25 pause boost in `_scale_breaks`; account for it when
  tuning pauses.
- Keep the E-override philosophy intact: emotional clients never get a paternal/authority
  body-command voice on physio/conversion/challenge stages.

## Target-specific
- `ep <type> "<change>"` — e.g. slow the emotional base: edit `EP_VOICE_PARAMS["emotional"]` in
  both files. Re-derive the effective per-stage table (02-tonality) to confirm intent.
- `tonality <name> "<change>"` — edit `TONALITY_MODS[name]` in both files; affects every stage
  using it.
- `stage <stage> "<change>"` — change a stage's tonality/zone/e_override row in both maps.
- `pause "<change>"` — pause changes are usually per-EP `pause_multiplier` (both files) or the
  theta boost constant in `prosody._scale_breaks`. Prefer the multiplier; touch the constant only
  deliberately.

## Verify
- Re-render p1 (physical) and p2 (emotional) and re-enrich; confirm the changed stage's
  `<prosody rate/pitch/volume>` matches the new intended values (grep the enriched SSML).
- Recompute and eyeball the effective table for the affected stage(s) against 02-tonality.
- Full WS E2E must stay green (voice changes shouldn't alter turn counts).
- If pauses changed, spot-check a couple of scaled `<break>` values against the 03-pacing math.

## Report
Show the before→after values, confirm BOTH files were edited, whether the contract version was
bumped, and the verification evidence. Terse.
