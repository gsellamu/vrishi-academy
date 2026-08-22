---
description: Add a Practice Lab drill (+ preset/sequence + UI wiring) to drills.json and lab/page.jsx, validated for referential integrity.
argument-hint: <drill-id> "<drill name>" [group: First session|PSR|Shadows|Variations|Self-work|Singles]
---

Add a new Practice Lab drill **$1** ("$2"). Match the existing drill shape exactly and keep the
Lab page consumable.

## Read first
- `apps/academy-web/data/drills.json` — the full structure (presets[], sequences{}, drills[]).
  Copy an existing drill's shape: `id`, `name`, `weight` (int), `min` (int), `prompter[]` (delivery
  cue lines, terse, arrow/`->` notation ok), `check[]` (self-score items, observable).
- `apps/academy-web/app/lab/page.jsx` — `GROUP_OF`, `GROUP_ORDER`, `GROUP_COLOR`, `focusOptions`,
  and `buildPlan` (focus resolves to `sequences[focus] || [focus]`).
- `.claude/reference/06-verification.md` §5–6 for the exact integrity + esbuild checks.
- If the drill mirrors a session block, keep the prompter's delivery cues consistent with that
  block's tonality/pacing (see 02/03).

## Build
1. Add the drill object to `drills.json > drills[]`. Weights drive time allocation in `buildPlan`;
   `min` is the floor minutes. Prompter lines are the practitioner's cue list; check lines are the
   PSR-style self-score. All wording ORIGINAL.
2. If it needs a runnable preset: add a `preset` (`id`, `label`, `minutes`, `focus`) whose `focus`
   is EITHER a new sequence OR the bare drill id (single-drill fallback, the `tom5` pattern).
   Prefer a real sequence for multi-step; a bare-id focus for a single-drill quick start.
3. If a sequence: add it to `sequences{}` with steps that are all real drill ids.
4. Wire the UI in `lab/page.jsx`: tag the preset in `GROUP_OF` ($3 or a sensible lane), ensure the
   group is in `GROUP_ORDER`/`GROUP_COLOR`, and add a `focusOptions` entry for any new sequence.
   (Drills auto-appear as "Single skill: …"; sequences need an explicit `focusOptions` line.)

## Verify (MANDATORY)
- JSON parses; referential integrity (06-verification §5): no dup ids; every preset focus resolves
  to a sequence or bare drill id; every sequence step is a real drill; drill well-formed.
- esbuild-bundle `lab/page.jsx` (copy to /tmp first — uploads is read-only) → exit 0.
- Simulate `buildPlan(minutes, focus)` for the new focus in node: it must produce a fully-resolved
  plan summing to the requested minutes.
- The drill does NOT need the WS E2E (it's Lab-only) unless it also became a session block.

## Report
State the drill id, its preset/sequence/group wiring, and the integrity + esbuild + buildPlan
results. Terse.
