---
description: Audit a rendered session's NLP analog-marking + prosody — confirm embedded commands, presuppositions, pacing, and VAK are marking as intended.
argument-hint: [profile: p1|p2|p3] [plan] [vak: visual|auditory|kinesthetic|auditory_digital]
---

Audit the conversational-hypnosis marking on a rendered session. This checks that the delivery
layers (04-nlp-marking) actually fire in the enriched output — the difference between a flat read
and a hypnotically effective one.

## Read first
- `.claude/reference/04-nlp-marking.md` — the layers + marking rules.
- `packages/session-templates/render/nlp_lexicon.yaml` — the phrase lists (source of truth for
  what CAN be marked).
- `packages/session-templates/render/prosody.py::_mark_phrases` / `detect_nlp` — the marking logic.

## Procedure
1. Render the profile/plan (default p1 / vocational) to `/tmp/x.ssml`.
2. Enrich with the requested `--vak` (default visual):
   `python3 render/prosody.py --in /tmp/x.ssml --suggestibility <ep> --vak <vak> --lexicon render/nlp_lexicon.yaml -o /tmp/x.enriched.ssml --e11-plan /tmp/x.e11.json`
3. Audit the enriched SSML:
   - **Embedded commands**: `grep -o '<emphasis level="strong">[^<]*' /tmp/x.enriched.ssml | sort | uniq -c`
     — expect the induction/deepener/anchor commands (deep sleep, go deeper, lighter and lighter,
     let go, …). Each should also carry a 350ms pause envelope around it.
   - **Presuppositions / milton / tag / bind**: `grep -o '<emphasis level="moderate">[^<]*'` —
     confirm the pacing/assumption phrases are marked.
   - **VAK**: confirm the chosen system's predicates are marked in `stage_suggestions` and
     `stage_prog_relax` ONLY (not elsewhere).
   - **Pace→lead**: in `stage_pre_talk`, confirm ~3 pace truisms precede a lead connector.
4. Coverage gaps: list any line you'd EXPECT to carry an embedded command/presupposition but that
   isn't marked — the cause is almost always the phrasing isn't in `nlp_lexicon.yaml`. Propose the
   exact lexicon additions (original wording).
5. Density sanity: no stage should be over-marked (≤3 marks per phrase per stage is enforced;
   flag any stage that reads as a wall of emphasis — that dulls the effect).

## Report
Per stage: what marked (counts by layer), what's missing that should mark, and proposed
`nlp_lexicon.yaml` additions. Confirm VAK is scoped to therapy/PR only. Terse — this is an audit,
lead with the gaps.
