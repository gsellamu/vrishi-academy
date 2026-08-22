# CLAUDE.md — VRishi Academy

## Project
Kappasinian hypnotherapy practice drill + role-play platform for Jeeth (Jithendran Sellamuthu), C.MH., AHA #007913, HMI student (Semester 2, grad deadline Dec 10 2026). Separate repo from client-facing VRishiHypno (compliance boundary).

## Repo root
`D:\ChatGPT Projects\genai-portfolio\projects\Jeeth.ai\Business\VRishiHypno\PrepPractices\`

## Stack
- **Frontend**: Next.js 14 App Router, port 3070. `apps/academy-web/`.
- **Backend**: Python FastAPI microservices in Docker overlay on `jeethhypno-shared-network`, ports 8600-8605. `services/academy-compose.yml`.
- **Session engine**: Jinja2 SSML renderer + prosody/NLP enrichment. `packages/session-templates/`.
- **Infra**: Postgres (pgbouncer:6432), Redis, MinIO, Ollama (gemma3:4b), LiveKit. All shared with parent Jeeth.ai stack.
- **Scripts**: PowerShell 7. `academy.ps1` (master CLI), `services/Academy-Start-All-Services.ps1`.

## Commands
```bash
./academy.ps1 setup       # npm install + pip deps
./academy.ps1 infra       # preflight shared containers
./academy.ps1 db-init     # idempotent create role+db 'academy'
./academy.ps1 web         # Next.js dev :3070
./academy.ps1 backend     # docker compose --profile p0 up -d
./academy.ps1 all         # infra + backend + web
./academy.ps1 render      # smoke-test session-template engine
./academy.ps1 gap         # interactive HMI progress updater
./academy.ps1 status      # health check without restart

# Session template pipeline
cd packages/session-templates
python render/render_session.py --profile examples/profiles/p1_physical_analyst.yaml --plan templates/vocational_presentation_confidence.session.yaml -o out/p1.ssml
python render/prosody.py --in out/p1.ssml --suggestibility physical --vak visual --lexicon render/nlp_lexicon.yaml -o out/p1.enriched.ssml --e11-plan out/p1.e11.json

# Services (local dev, no docker)
cd services/persona-svc
$env:PERSONA_DIR="personas"; $env:OLLAMA_URL="http://localhost:11434"; $env:PORT="8601"
python main.py

cd services/academy-orchestrator
$env:SESSION_TEMPLATE_DIR="..\..\packages\session-templates"
$env:PERSONA_URL="http://localhost:8601"; $env:PORT="8600"
python main.py
```

## Architecture
```
academy.ps1 (CLI)
  apps/academy-web/             Next.js 14 (:3070)
    /plan/[slug]                9-page plan viewer
    /dojo                       gap dials + Dec 10 countdown
    /lab                        Practice Lab (22 drills, 10 sequences, 12 presets)
    /studio                     [NOT YET BUILT] WS role-play console
  packages/session-templates/
    templates/_blocks/blocks.ssml.j2   v1.2 woven Kappasinian scripts (22 macros)
    render/render_session.py           Jinja2 renderer (resolve() delivery flags)
    render/prosody.py                  SSML+NLP enrichment -> E11 plan
    render/nlp_lexicon.yaml            NLP vocab (grounded in HMI workbooks)
    schema/axes.yaml                   age/sex/occupation config
  .claude/                      Claude Code delivery-system docs + slash commands
    reference/00..06                   SSML/tonality/pacing/NLP/authoring/verification contract
    commands/                          /new-block /new-plan /add-drill /tune-delivery /verify-session /enrich-check
  services/
    academy-compose.yml         docker overlay (6 services, 8600-8605)
    .env                        secrets (auto-loaded by scripts)
    academy-orchestrator/       [BUILT] marks->turns state machine, WS driver
    persona-svc/                [BUILT] fictional client avatars, Ollama + fallback
    academy_shared/             [BUILT] OOP service layer: config (fail-fast secrets), database (SSL-configurable),
                                         cache, coaching, events, audit, health, logging,
                                         middleware (security headers, body size limit, request ID, timing),
                                         service_factory (conditional Swagger, tightened CORS), auth (no hardcoded secrets)
    academy-user-svc/           [BUILT] auth, users, rate limit, lockout. :8602. OOP DI. Security-hardened.
    academy-progress-svc/       [BUILT] drills, sessions, gap, analytics, AI coaching. :8603. OOP DI. Rate-limited AI, parameterized SQL.
    academy-grader-svc/         [BUILT] rubric grading (AI + manual), grade history. :8604. OOP DI. Rate-limited AI.
    academy-content-svc/        [NOT BUILT] P2 future
    db/001_schema.sql           [APPLIED] 10 tables, 3 views, triggers
    db/002_grader_schema.sql    [APPLIED] rubrics, rubric_dimensions, grades, grade_dimensions + seed
```

## Current state and what to do next
1. **Backend hardened to FAANG + Healthcare level** -- All 3 services (user/progress/grader) security-audited and hardened:
   - No hardcoded secrets in source code (fail-fast at startup, insecure-default detection)
   - OWASP security headers (X-Content-Type-Options, X-Frame-Options, CSP-adjacent, HSTS behind TLS)
   - Request body size limit (1 MB default, 413 on violation)
   - Rate limiting on all AI endpoints (10 req/min/user)
   - SQL injection eliminated (parameterized INTERVAL queries)
   - JWT error messages sanitized (no internal detail leaking)
   - DB SSL configurable via DB_SSL env var
   - Swagger/OpenAPI auto-disabled in production (ACADEMY_ENV=production)
   - CORS tightened (explicit methods/headers instead of wildcards)
   - Compose: JWT_SECRET_KEY required (no default fallback)
2. **AWS deployment next** -- ECS task definitions, ALB, ECR, Terraform/IaC, SSL certs.
3. **vrishihypno.com integration** -- DNS, load balancer, API gateway.
4. **Build `/studio` page** -- Wire auth + progress + grading APIs, WS role-play console (awaiting Claude Design handoff).
5. **Wire academy-web to auth** -- Replace localStorage with API-backed persistence.
6. Rotate ElevenLabs key (compromised at `AI_Pipeline_Code/services/tts_service.py:482`), paste into `services/.env`.

## Hard rules
- `encoding="utf-8"` on EVERY Python file read/write (Windows cp1252 default breaks em-dashes).
- `Path.parent.mkdir(parents=True, exist_ok=True)` before every file write.
- All session script wording is ORIGINAL -- nothing verbatim from HMI/Panorama copyrighted workbooks.
- Port governance: 123 ports occupied. Academy = 8600-8605 + 3070. Check census before claiming new.
- Never print secret values. ELEVENLABS_API_KEY in tts_service.py is compromised.
- PSR sequence (`psr_full` in drills.json) = Denise's exam order -- untouched.
- Constraint C3: personas are fictional archetypes only, never real people.
- PHS anatomy after every conversion/deepener: cue + "for the purpose of hypnosis" + "with your permission" + quickly/calmly/deeply + body relaxes.
- Session-template contract version: `e11-2026-08-08`.

## Key data
- **22 drills / 12 presets / 10 sequences** in `apps/academy-web/data/drills.json`.
- **3 client profiles**: p1 (physical/visual), p2 (emotional/kinesthetic), p3 (child/balanced).
- **3 session plans**: vocational (teach_self_hypnosis on), referral (guided_imagery on), avocational.
- **2 persona cards**: maya (physical), leo (emotional).
- **16 ideomotor checkpoints** per first session (baseline; +3 when self_hypnosis_teach is on).
- **22 block macros** incl. 3 newest: `auto_dual_induction`, `guided_imagery`, `self_hypnosis_teach`.
- **Delivery flags** (in `resolve()`, default off): `induction: arm_raising|auto_dual`, `guided_imagery: bool`, `teach_self_hypnosis: bool` — set in profile.vars or plan.
- **Delivery contract docs**: see `.claude/reference/` (SSML/tonality/pacing/NLP/authoring/verification) and `.claude/commands/` slash commands.
- **HMI gap**: 24 contacts, 21 conferences, 78 elective hrs, 9 workshops before Dec 10 2026.
