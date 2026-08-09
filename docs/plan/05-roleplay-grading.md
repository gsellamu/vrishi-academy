---
title: Role-play & Grading Engine
order: 05
---
The v1.1 SSML **is** the protocol.

1. Student speaks → streaming ASR → aligner maps utterances to expected `stage_*` sequence
   (embeddings + per-stage keyword anchors).
2. At each `await_*` the client's responsiveness model chooses latency + response
   (nod animation · verbal answer · non-response forcing a re-cue).
3. `cue_snap` → snap detected (audio transient) or button fallback.
4. Grader scores live: order errors · skipped PHS · break-pacing deviation (template `<break>` ±40%) ·
   literal/inferred lexicon classifier · guardrail violations (diagnosis terms, med advice, lane breach).
5. Debrief: timeline replay, per-mark scores, examiner narrative, 3 drills queued (SM-2 intervals).

Golden-transcript test set is built from Jeeth's own recorded runs to harden the aligner against
trance-paced speech.
