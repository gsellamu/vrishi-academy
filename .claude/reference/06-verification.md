# Verification — Prove It Before DONE

No delivery change is DONE until it passes every check here. These are mechanical — run them, read
the output, fix reds. Ground-truth-first, test-before-deliver.

## Paths

```
ENGINE=packages/session-templates
BLOCKS=$ENGINE/templates/_blocks/blocks.ssml.j2
DRILLS=apps/academy-web/data/drills.json
LAB=apps/academy-web/app/lab/page.jsx
ORCH=services/academy-orchestrator/main.py
```

Sandbox mirror for tests (disk is source of truth — never edit sandbox as the deliverable):
`/home/claude/academy/…`. Always copy disk → sandbox before testing (`Filesystem:copy_file_user_to_claude`).

## 1. SSML renders on all three profiles, both mode branches

```bash
cd $ENGINE
python3 render/render_session.py --profile examples/profiles/p1_physical_analyst.yaml   --plan templates/vocational_presentation_confidence.session.yaml -o /tmp/p1.ssml   # literal
python3 render/render_session.py --profile examples/profiles/p2_emotional_elder_caregiver.yaml --plan templates/referral_pain_comfort.session.yaml       -o /tmp/p2.ssml   # inferred/emotional
python3 render/render_session.py --profile examples/profiles/p3_child_student.yaml       --plan templates/avocational_sports_performance.session.yaml     -o /tmp/p3.ssml   # blended/child
```

All three must print `OK …` with no traceback. `render_session.py` runs `lxml.etree.fromstring`
internally, so a malformed SSML fails here. Confirm your new `stage_*` mark and the correct mode
branch appear:

```bash
grep -c 'stage_my_block' /tmp/p1.ssml        # expect 1 when the flag/branch is on
grep -c 'DIRECT_LITERAL_MARKER' /tmp/p1.ssml  # literal branch fired
grep -c 'PERMISSIVE_MARKER'     /tmp/p2.ssml  # else branch fired
```

## 2. Baseline unchanged (flags default off)

A render with no new flags set MUST match the pre-change word counts. Reference baselines
(p1/p2/p3): the current numbers print in the `OK` line — capture them before your change and diff
after. Flags default to off in `resolve()`, so a plan that doesn't opt in renders identically.

## 3. Stage resolves in BOTH STAGE_MAPs (right voice)

```bash
grep -n 'stage_my_block' $ENGINE/render/prosody.py     # prosody map row present
grep -n '"my_block"'     $ORCH                          # orchestrator map row present
```

Both must return a row with the intended (zone, phase, tonality). If only one is present, the
voice is half-wrong or a turn is missing.

## 4. Enricher marks the segment + NLP layers

```bash
cd $ENGINE
python3 render/prosody.py --in /tmp/p1.ssml --suggestibility physical --vak visual \
        --lexicon render/nlp_lexicon.yaml -o /tmp/p1.enriched.ssml --e11-plan /tmp/p1.e11.json
```

Must print `[OK] enriched -> … | segments: N …`. Then confirm your stage produced a prosody
segment and that intended NLP phrases marked:

```bash
grep -c '<prosody' /tmp/p1.enriched.ssml                       # > number of stages
grep -o '<emphasis level="strong">[^<]*' /tmp/p1.enriched.ssml # embedded commands marked
python3 -c "import json;p=json.load(open('/tmp/p1.e11.json'));print([b['meta']['stage'] for b in p])"  # your stage in the plan
```

Enriched SSML is lxml-validated inside `prosody.py`; a failure prints `[FAIL] … not well-formed`.

## 5. `drills.json` parses + full referential integrity (if you touched it)

```bash
python3 - <<'PY'
import json
d=json.load(open("apps/academy-web/data/drills.json",encoding="utf-8"))
drills={x['id'] for x in d['drills']}; seqs=d['sequences']
ids=[x['id'] for x in d['drills']]; assert len(ids)==len(set(ids)),"dup drill id"
pids=[p['id'] for p in d['presets']]; assert len(pids)==len(set(pids)),"dup preset id"
for p in d['presets']:                       # focus resolves to a sequence OR a bare drill id (tom5 pattern)
    assert p['focus'] in seqs or p['focus'] in drills, f"preset {p['id']} focus {p['focus']} unresolved"
for name,steps in seqs.items():
    for st in steps: assert st in drills, f"seq {name} -> unknown drill {st}"
for x in d['drills']: assert x['prompter'] and x['check'] and isinstance(x['weight'],int) and isinstance(x['min'],int)
print(f"OK drills={len(drills)} presets={len(d['presets'])} sequences={len(seqs)}")
PY
```

## 6. Lab page still compiles (if you touched `lab/page.jsx`)

```bash
mkdir -p /tmp/labchk/app/lab /tmp/labchk/data
cp $LAB /tmp/labchk/app/lab/page.jsx
cp $DRILLS /tmp/labchk/data/drills.json
cd /tmp/labchk && npx -y esbuild app/lab/page.jsx --loader:.jsx=jsx --jsx=automatic \
   --bundle --external:react --outfile=/tmp/lab_out.js
echo "esbuild exit: $?"   # must be 0
```

(Note: `/mnt/user-data/uploads` is read-only — copy to `/tmp` before writing.)

## 7. Orchestrator syntax + full WS E2E (the integration test)

```bash
python3 -c "import ast;ast.parse(open('services/academy-orchestrator/main.py').read());print('syntax OK')"
```

Then the end-to-end WS walk (persona-svc + orchestrator up, offline Ollama forces deterministic
fallback so counts are stable):

```bash
cd /home/claude/academy
export PERSONA_DIR=services/persona-svc/personas OLLAMA_URL=http://127.0.0.1:1
PORT=8601 python3 services/persona-svc/main.py >/tmp/persona.log 2>&1 &
export SESSION_TEMPLATE_DIR=$PWD/packages/session-templates PERSONA_URL=http://127.0.0.1:8601
PORT=8600 python3 services/academy-orchestrator/main.py >/tmp/orch.log 2>&1 &
# wait for both /health, then:
python3 wswalk.py     # must end 'ALL E2E TESTS PASSED'
```

`wswalk.py` asserts, per profile: turns render, stages parse, every `await` gets a persona reply,
cues fire on the right lane (paternal touch cues literal-only), the booking gate blocks referral
without `referral_doc_id`, and an unknown plan returns 400. When you ADD a stage, its mark shows
up in the `stages=` count and its awaits in the `awaits=` count — confirm the deltas match what
you added (e.g. self_hypnosis_teach = +1 stage, +3 awaits).

## 8. The delivery-contract spot checks

- `deep_sleep()` present at every induction/deepener terminal (not coaching):
  `grep -c 'Deep sleep' /tmp/p1.ssml` — should equal conversions + deepeners.
- PHS after each of those in a first session (6–8 total):
  `grep -c 'for the purpose of hypnosis' /tmp/p1.ssml`.
- No `await` without a preceding line; no two `await`s back-to-back (read the macro).
- Mode wording correct: literal render has no "you might allow"; inferred render has no
  "it IS lifting" in the induction.

## Definition of DONE

All of 1–8 green, baseline word counts unchanged for un-opted plans, and the WS E2E deltas match
the intended additions. Then — and only then — report DONE, listing exactly what changed and the
verification results.
