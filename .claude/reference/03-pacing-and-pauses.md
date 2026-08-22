# Pacing & Pauses — Rate, Rhythm, Silence

Pace and silence are half the induction. This file gives the exact numbers and the exact scaling
math so pauses land identically every render.

## Two speed knobs, don't confuse them

- **rate** — the SSML `<prosody rate="N%">` percentage. Set by EP base + tonality Δrate, clamped
  to `[70, 110]`. This is the literal speech tempo the TTS reads at.
- **pace** — the `override_pace` float in the TTS request (0.82–1.05). A second, engine-level
  delivery multiplier from the tonality. theta_hypnotic = 0.82 (slowest), authority = 1.05.

Both are applied. A theta suggestion stage on an emotional client reads at rate 75% AND pace
0.82 — deliberately, dreamily slow.

## Age also sets base rate (before EP/tonality)

`resolve()` reads `age_band` for the top-level prosody rate on the `<speak>` wrapper:
child 92% · teen 96% · adult 100% · elder 85%. (These are the outer document rate; the enricher's
per-stage `<prosody>` rates layer inside.) Elder also gets `volume="+2dB"`.

## Pause vocabulary (what to write in a macro)

Use `brk('Nms')` or `brk('N.Ns')`. Typical values and their delivery intent:

| written | intent |
|---|---|
| `brk('300–500ms')` | comma-beat inside a sentence; between yes-set truisms |
| `brk('600–800ms')` | between breath groups / ideas |
| `brk('900ms–1.2s')` | after a suggestion lands; let it install |
| `brk('1.5s')` | after `deep_sleep()` / a major anchor |
| `await('…')` | 4s placeholder hold at an ideomotor checkpoint |

Never go below ~300ms written (the enricher floors any scaled break at 120ms anyway, but writing
sub-300 defeats the rhythm). The `await()` macro's 4s is intentional — a real nod takes seconds.

## The scaling math (`_scale_breaks`)

Every written break is multiplied at enrich time by:

```
multiplier = EP.pause_multiplier × (1.25 if tonality == theta_hypnotic else 1.0)
ms breaks:  scaled = max(120, int(written_ms × multiplier))
s  breaks:  scaled = round(written_s × multiplier, 2)
```

So the SAME written `brk('900ms')` becomes different real silence per client and stage:

| written | physical non-theta | physical theta | emotional non-theta | emotional theta | balanced non-theta |
|---|---|---|---|---|---|
| 700ms | 700ms | 875ms | 910ms | 1137ms | 804ms |
| 900ms | 900ms | 1125ms | 1170ms | 1462ms | 1035ms |
| 1200ms | 1200ms | 1500ms | 1560ms | 1950ms | 1380ms |
| 1.5s | 1.5s | 1.88s | 1.95s | 2.44s | 1.72s |
| 4s (await) | 4.0s | 5.0s | 5.2s | 6.5s | 4.6s |

Takeaway: you write ONE set of breaks in the macro tuned for a neutral read; the engine
automatically opens them up for emotional clients (×1.3) and for deep theta stages (×1.25,
compounding to ×1.62 for an emotional client in trance). Do not hand-tune per client — write the
neutral rhythm and let the multipliers do the adaptation.

## ElevenLabs ellipsis mapping

When flattened to ElevenLabs text, breaks become ellipses (after scaling), which the voice reads
as pauses:

- `ms` break → `"." × (scaled_ms // 300 + 1)`
- `s` break → `"." × (int(scaled_s × 3) + 1)`
- runs of 4+ dots are collapsed to `...`

Post-scale (physical, non-theta) examples: 700ms → `...` (3), 900ms → `....` (4), 1.2s → `.....`
(5), the 4s await → 13 dots (collapsed to `...`). `<emphasis level="strong">` becomes UPPERCASE;
`moderate` stays as-is. This is why `deep_sleep()` reads as "DEEP SLEEP." in the flattened text —
the strong emphasis caps it.

## Reading-pace craft (the up/down/pause/resume the client model prescribes)

The delivery legend used throughout the session guides maps onto the engine like this:

| legend cue | engine equivalent |
|---|---|
| (slow) / (very slow) | theta_hypnotic tonality (rate −10, pace 0.82) |
| (voice ↓) | paternal/theta pitch drop (−4 to −9% effective); land it on the operative verb |
| (voice ↑) | authority/conversational at emergence (rate +5, brighter) |
| (paternal) | paternal tonality — physical stages, challenges |
| (maternal) | maternal tonality — E-clients, PR, comfort |
| (pause Ns) | `brk('Ns')` |
| (WAIT) | `await('…')` — hard ideomotor stop |
| (SNAP) | `snap()` / `deep_sleep()` |

So when a guide says "(voice ↓) deep sleep (SNAP)", the macro expresses it as
`{{ deep_sleep() }}` inside a paternal/theta stage — the pitch drop and emphasis are automatic
from the stage's tonality, and the snap is in the `deep_sleep()` macro.

## Rhythm rules for authoring

1. One idea per `<p>` breath group; a pause at every group boundary.
2. Sync "lighter/deeper" repetitions to the client's inhale — write them as separate short
   clauses with 400–600ms breaks so the practitioner (or TTS) can time them to breath.
3. After any `deep_sleep()`, always a ≥1.2s break before the next line — the anchor needs air.
4. In the count (5→0), one number per short clause, ~1s between — the theta ×1.25 boost widens
   these to the dreamy cadence automatically.
5. Never stack two `await()`s without a line between — the client has nothing to respond to.
