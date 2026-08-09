---
title: Architecture & Data
order: 06
---
```
apps/academy-web            Next.js 14 (this site) — /plan · /dojo · /studio (P0) · /room (P1) — dev :3070
packages/session-templates  v1.1 engine, consumed as-is
services/ (FastAPI, join the EXISTING jeethhypno-shared-network — see services/academy-compose.yml)
  academy-orchestrator :8600  marks → turns state machine · difficulty · WS bus (redis pub/sub)
  persona-svc          :8601  personas from YAML cards → jeethhypno-ollama:11434
  asr-svc              :8602  faster-whisper streaming
  tts-svc              :8603  Piper/XTTS local · ElevenLabs flavor optional
  grader-svc           :8604  aligner + rubric + lexicon classifier + report writer
  progress-svc         :8605  dual ledger · skill tree · real-gap tracker
storage                     Postgres db `academy` via jeethhypno-pgbouncer:6432 ·
                            MinIO bucket `academy-takes` (:9000) · Redis :6379 · LiveKit :7880 (P3 duet)
```

**Port governance.** A full census (2026-08-08) across THREE sources — the docker infra compose
(22 services), `Jeeth-AI-Start-All-Services.ps1`, and `VRishiHypno-Start-All-Services.ps1` — shows
**123 occupied host ports**, including dense app-layer clusters 8001–8138, KnowledgeFactory
**8201–8212**, 8300–8500, and web ports 3000–3060/5173/5180. Academy therefore claims
**8600–8605** (services) and **3070** (web) — verified absent from all three sources. Any new
port must be checked against all three, then `Invoke-InfraAudit.ps1` re-run.

Avatar pipeline (P1): Ready Player Me GLB → Babylon loader → viseme morphs from TTS phoneme timings →
animation graph {idle · nod · arm-raise(t) · eyes-close · emerge} driven by orchestrator events.

**Core tables** (schema `academy`): learner · skill_node · skill_state · persona ·
scenario(plan, profile, difficulty, lane) · attempt(transcript_uri, audio_uri, rubric_json, score) ·
ledger(kind sim|real, xp, evidence_uri) · real_gap(contacts, conferences, elective_hrs, workshops) ·
drill_queue(node, due_at, interval).
