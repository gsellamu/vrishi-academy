---
description: Author a new Kappasinian block macro (induction/deepener/challenge/coaching) to full delivery spec and wire it in.
argument-hint: <block-name> [role: primary|secondary|deepener|challenge|coaching] [source: e.g. "Practicum 101-5 item N"]
---

You are extending the VRishi session engine. Add a new block macro **$1** to spec. Follow the
delivery contract exactly — read the reference set first, do not work from memory.

## Read before doing anything
1. `.claude/reference/00-delivery-system.md` — the contract + pipeline.
2. `.claude/reference/01-ssml-dialect.md` — tag/mark grammar.
3. `.claude/reference/02-tonality-and-ep.md` — which zone/tonality this block's stage needs.
4. `.claude/reference/04-nlp-marking.md` — canonical NLP phrasings to use.
5. `.claude/reference/05-block-authoring.md` — the 7-step authoring procedure. Follow it.
6. The actual disk file `packages/session-templates/templates/_blocks/blocks.ssml.j2` — match the
   existing macro style; NEVER clobber; disk is source of truth.

## Grounding
- If a source workbook item is named ($3), extract/confirm the actual technique from the PDF
  first (copy-to-sandbox then read). Reproduce STRUCTURE and TECHNIQUE only — all wording
  ORIGINAL, nothing verbatim from HMI/Panorama copyrighted material.
- Check the block doesn't already exist or duplicate one (list current macros first).

## Build (per 05-block-authoring.md)
1. Decide role ($2) → stage mark name (`stage_$1`, snake_case) + its zone/phase/tonality row.
2. Write the macro: in-dialect tags only, balanced `<p>`, ms/s breaks, canonical NLP phrasings
   (add any new ones to `nlp_lexicon.yaml`), `p.mode` word-branching (literal `if` / else),
   personalize via `p.vars`/`s.*`. End inductions & deepeners with `deep_sleep()` + `phs_short(p)`;
   coaching blocks end AWAKE (no snap/PHS).
3. Add the stage row to BOTH `STAGE_MAP`s — `render/prosody.py` (`stage_$1`) and
   `services/academy-orchestrator/main.py` (`$1`) — identical zone/phase/tonality.
4. If it should appear in a session: gate it in the template with a `resolve()` flag (safe default
   off), or branch it for an alternative primary induction.
5. If enabling on a plan: set the flag in the `.session.yaml` and reflect it in `stages:`.

## Verify (MANDATORY — see 06-verification.md)
Run the full checklist. At minimum:
- renders on p1/p2/p3 with the correct mode branch firing;
- stage resolves in both maps (not `_default`);
- enricher marks the segment + intended embedded commands;
- orchestrator syntax OK + full WS E2E `ALL E2E TESTS PASSED` with the expected stage/await delta;
- delivery spot checks (deep_sleep + PHS where required).

## Report
State exactly what you added (files + line intent), the verification results, and — if you added a
flag — how to enable the block on a profile/plan. Terse. No DONE without green verification.
