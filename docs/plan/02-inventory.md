---
title: Inventory & Reuse
order: 02
---
Ground truth first. Everything below exists today and is reused, not rebuilt.

| Asset | State | Becomes |
|---|---|---|
| `xr-vr-hypnotherapy-room` — Next 14 + Babylon.js 8 + WebXR, session orchestrator (scripted/LLM), moderation gate, JSONL audit | Running MVP | Frontend base: room scene → practice studio; orchestrator → role-play conductor |
| `vrishi-session-templates` v1.1 — axes, blocks, renderer, booking/guardian gates, `await_*` + `cue_snap` marks | Shipped & tested (in `packages/`) | The session **protocol**: marks = turn-taking + scoring checkpoints |
| `vrishi-platform` — TS monorepo, Prisma, vitest | Scaffolded | Data-model conventions; P4 multi-tenant home |
| Jeeeth.ai stack — FastAPI ×73, LiveKit, MinIO, Ollama, Postgres/Timescale, Compose | Live | Host for persona/ASR/TTS/grader services (after port audit) |
| Workbook corpus (34 PDFs) + progress report + PSR mentor guide | On disk | Curriculum graph, scenario decks, rubric source (structure only) |

Sprint-0: re-run `Invoke-InfraAudit.ps1`, confirm free ports before composing new services.
