---
title: Decisions & Risks
order: 08
---
**Decisions — LOCKED 2026-08-08** (recommendations accepted):

| # | Decision | Choice |
|---|---|---|
| D1 | 3D engine | Babylon.js 8 (incumbent, WebXR proven) |
| D2 | Avatars | Ready Player Me GLB + viseme morphs |
| D3 | Voice | Local-first (faster-whisper + Piper/XTTS); ElevenLabs flavor optional |
| D4 | Persona LLM | Ollama local (jeethhypno-ollama:11434) + deterministic responsiveness model; grader rules-first, LLM commentary second |
| D5 | Repo home | This monorepo at PrepPractices root; services join `jeethhypno-shared-network` on ports **8600–8605**, web **:3070** (revised after full 123-port census — 8200-block collided with KnowledgeFactory 8201–8212) |
| D6 | P0 scope | 2D voice console first; 3D at P1 |

**Risks:**

| Risk | Mitigation |
|---|---|
| 3D polish eats the calendar while the real gap ages | P0 is 2D and ships first; gap on every screen |
| ASR brittle on trance-paced speech | Golden transcripts from Jeeth's own runs; keyword anchors per stage |
| Persona drift | Card-level refusal rules + orchestrator output filters + cite-or-decline |
| Local TTS too flat for trance | EL flavor switch retained; pacing lives in template breaks regardless |
| Over-training on compliant clients | Node mastery requires ≥1 pass at difficulty ≥3 |
| Port/secret drift against shared infra | Docker compose alone is NOT the port truth — census must include both start scripts; academy-compose declares the network `external`; re-run Invoke-InfraAudit.ps1 after every service addition |
