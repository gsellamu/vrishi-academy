---
description: Author a new session plan (.session.yaml) for a presenting issue, wired to the delivery engine and lane/compliance rules.
argument-hint: <lane: vocational|avocational|referral_health> <slug> "<presenting issue>"
---

Create a new session plan **$2** in lane **$1**. Match the structure of the existing plans exactly.

## Read first
- All three existing plans in `packages/session-templates/templates/*.session.yaml` — copy their
  shape (id, lane, referral_required, presenting_issue, critical_mind{problem,why,what_changes,
  how}, pillar_plan, thinking_ahead, stages[], suggestions{literal,inferred,venting_dream},
  homework, contraindications, documentation_fields).
- `packages/session-templates/schema/axes.yaml` — the `issue_lane` gate rules.
- `.claude/reference/00-delivery-system.md` and `02-tonality-and-ep.md` — so the stages line up
  with real blocks/marks.

## Lane / compliance rules (hard)
- `referral_health` → `referral_required: true` + a `referral_gate` block; the renderer BLOCKS
  the session unless the profile carries `referral_doc_id`. Scope note must stay adjunctive:
  "the licensee directs care — not diagnosis or treatment." Contraindications MUST include
  "no active written referral → do not book" and "never suggest changing medication/medical care."
- `vocational` / `avocational` → `referral_required: false`.
- Avoid "therapy/counseling/clinical" framing for §2908-posture entities where the plan text is
  client-facing; keep it self-improvement language.
- Suggestions: provide BOTH `literal` and `inferred` variants (mode-matched) plus a
  `venting_dream` line. Use `{name}`, `{subj}`, `{poss}`, `{referrer}` tokens — they run through
  `pers`.

## Delivery wiring
- `stages:` must reference real blocks (intake, pre_talk, suggestibility_test, theory_of_mind,
  questionnaire, induction_arm_raising|auto_dual, deepener, progressive_relaxation, guided_imagery,
  suggestions, phs_rehypnosis, count_out, phs_verify, homework, self_hypnosis_teach). Keep timing
  realistic (~55 min first session).
- To use an alternative induction or optional blocks, set the plan-level flag (`induction:
  auto_dual`, `guided_imagery: true`, `teach_self_hypnosis: true`) AND reflect it in `stages:`.

## Verify
- `python3 render/render_session.py --profile <a matching profile> --plan templates/$2.session.yaml -o /tmp/x.ssml`
  renders OK on a mode-appropriate profile.
- For `referral_health`: confirm it BLOCKS a profile WITHOUT `referral_doc_id` (exit with the
  booking-gate message) and renders WITH one.
- If any flag is set, confirm the corresponding `stage_*` mark appears in the render.
- Run the WS E2E if the plan is added to the orchestrator's `PLANS` map.

## Report
List the file, the lane/gate posture, which delivery flags are on, and the verification results.
Terse.
