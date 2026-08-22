---
description: Run the full delivery-verification checklist on the session engine and report reds. Use before calling any delivery change DONE.
argument-hint: [profile: p1|p2|p3|all] [plan: vocational|referral|avocational|all]
---

Run the mechanical verification in `.claude/reference/06-verification.md` end to end and report.
Do not skip steps; do not declare pass without running them.

## Procedure
1. **Sync**: copy the current disk engine files into the sandbox mirror (`Filesystem:copy_file_user_to_claude`)
   — disk is source of truth. Never test stale sandbox copies.
2. **Render** the requested profile(s)/plan(s) (default: all three canonical pairs). Every render
   must print `OK …`, no traceback (lxml validates inside the renderer).
3. **Baseline diff**: confirm word counts for un-opted plans match the last known-good numbers.
4. **STAGE_MAP parity**: every `stage_*` mark used in the renders resolves in BOTH
   `render/prosody.py` and `academy-orchestrator/main.py` — none falls to `_default` unexpectedly.
5. **Enrich**: run `render/prosody.py` on each render; must print `[OK] … segments: N`; spot-check
   `<prosody>` count > stage count and that embedded commands are `strong`-marked.
6. **drills.json**: parse + referential integrity (no dup ids; every preset focus resolves to a
   sequence or bare drill id; every sequence step is a real drill; every drill well-formed).
7. **Lab page**: esbuild-bundle `apps/academy-web/app/lab/page.jsx` (copy to /tmp first — uploads
   is read-only); exit 0.
8. **Orchestrator**: `ast.parse` OK, then full WS E2E (`wswalk.py`) → `ALL E2E TESTS PASSED`.
9. **Delivery spot checks**: `deep_sleep()` at every induction/deepener terminal; PHS after each in
   a first session (6–8 total); no `await` without a preceding line; mode wording correct
   (literal render has no "you might allow"; inferred has no "it IS lifting" in the induction).

## Report format
A short table: check # · pass/fail · one-line evidence (the command's key output). For any FAIL,
name the file and the exact fix. End with an overall PASS/FAIL and, if PASS, the DONE statement.
Terse — evidence over prose.
