# NLP Marking — Conversational-Hypnosis Layers

The enricher analog-marks specific phrase classes so the TTS drops pitch, slows, and envelopes
them in micro-pauses — the audio equivalent of the tonal shifts a skilled practitioner uses to
mark embedded commands and pace-lead a client. Every phrase class is a list in
`render/nlp_lexicon.yaml`; the marking rules are in `render/prosody.py::_mark_phrases`. All
wording is original, grounded in the HMI NLP 1 & 2 workbooks (201-2 / 201-3, Tabbanella).

## How marking works (`_mark_phrases`)

For each phrase in a class, longest-match-first, case-insensitive, word-bounded, **max 3 marks
per phrase per stage segment**:

```python
<emphasis level="{level}">phrase</emphasis>            # moderate classes
<break time="350ms"/><emphasis level="strong">phrase</emphasis><break time="350ms"/>   # embedded commands
```

- **Embedded commands** get `strong` emphasis + a **350ms pause envelope** on both sides — the
  voice sets them apart (drop, slow, silence-frame). In flattened E11 text they become UPPERCASE.
- **Presuppositions, pace, lead, tag, bind, milton, VAK** get `moderate` emphasis (no envelope) —
  a subtler lean, smooth flow.

The orchestrator's `detect_nlp()` also scans these same lists to attach highlight spans to each
role-play line (so the Studio UI can color embedded commands vs presuppositions vs VAK live).
Same lexicon, two uses: audio marking (prosody) and visual highlighting (orchestrator).

## The layers (each is a lexicon key)

### 1. Embedded commands — `embedded_commands`
Imperatives hidden inside longer sentences; the mark makes the subconscious hear the command.
Delivery: lower pitch, pause before/after, increased certainty. Examples in the lexicon:
`deep sleep`, `let go`, `go deeper`, `close your eyes`, `lighter and lighter`, `twice as deep`,
`drift down`, `allow yourself`. **This is the highest-value layer** — every induction and deepener
should contain several, and they must be present in the lexicon to be marked.

### 2. Presuppositions — `presuppositions`
Phrases that assume the change is already occurring (NLP 1 p.11, "convenient assumptions").
Delivery: smooth, stated as fact, no pause. e.g. `as you begin to`, `when you notice`,
`the moment you`, `the deeper you go`, `you may begin to wonder`, `the part of you that`.

### 3. Pace statements — `pace_statements`
Verifiable truisms about the client's present experience — the 7/38/55 rapport base (NLP 1 p.12).
Must be literally true NOW. Three truisms then one lead. e.g. `you are sitting in that chair`,
`you can hear the sound of my voice`, `your breath is moving in its own rhythm`.

### 4. Lead connectors — `lead_connectors`
The bridge from a paced truism to a suggestion. e.g. `and that means`, `which allows`,
`so you can begin to`, `and as that happens`. Pattern: `[pace][pace][pace] + [lead] + [suggestion]`.

### 5. Tag questions — `tag_questions`
Yes-anchors that bypass the critical filter (ToM yes-sets). Delivery: rising intonation, brief
pause after. e.g. `doesn't it`, `isn't that right`, `makes sense`, `can you feel that`.

### 6. Double binds — `double_binds`
Illusion of choice; both options lead to trance (Erickson). Used in conversion + suggestions.
Delivery: equal emphasis on both options, slight pause between. e.g. `the hand or the arm`,
`whether the lifting begins in the fingers first, or in the wrist`, `now or in a moment`.

### 7. Milton model — `milton_model`
Indirect suggestion patterns. Delivery: softer, wondering, slightly slower. e.g. `I wonder if you`,
`you might notice`, `perhaps you can`, `some people find that`, `you can allow`.

### 8. VAK predicates — `vak_predicates` (visual / auditory / kinesthetic / auditory_digital)
Rep-system words (NLP 2 p.8). **Only marked in `stage_suggestions` and `stage_prog_relax`**, and
only for the client's `p.vak` system. This is the tri-weave: lead with their primary system, then
fold in the others. Physical clients skew kinesthetic; a "visual" profile gets `see/picture/
clear/bright` leaned into during suggestions.

## Authoring to be marked

A macro line is only marked if its phrases are IN the lexicon. So when you write a new induction
line, use the canonical phrasings from the lists above, or ADD your new phrasing to the lexicon.
Example — this line carries four markable layers:

> "And **as you begin to** notice the breath, **you might** feel the hand **growing lighter** —
> **that makes sense**, **doesn't it**?"

- `as you begin to` → presupposition (moderate)
- `you might` → milton (moderate)
- `growing lighter`/`lighter and lighter` → embedded (strong + envelope) *(add if not present)*
- `that makes sense` / `doesn't it` → tag question (moderate)

If you want a phrase marked and it isn't firing, check the lexicon first — the enricher only knows
what's in the YAML.

## The deeper NLP scaffolding (used by personas/grader, not audio)

The lexicon also carries the NLP theory the grader and personas use — not analog-marked, but part
of the same file so the whole NLP model lives in one place: the 13 Presuppositions (RESPECT
UR-WORLD), the rapport model (7/38/55, match→mirror→pace→lead), the communication model
(delete/distort/generalize), well-formed-outcome keys, sensory-acuity checklist, eye-accessing
patterns, and strategy steps (elicitation→utilization→change→installation). When building the
`nlp_rapport` / `nlp_outcome` drills or grader rubrics, pull the canonical items from here.

## Marking priority + overlap

`detect_nlp()` de-dupes overlapping spans longest-first (a phrase inside a longer marked phrase is
dropped). So prefer specific, longer canonical phrases in the lexicon — they win and read more
naturally than a pile of short overlapping marks. Keep the ≤3-per-phrase-per-stage cap in mind:
don't repeat the same embedded command five times in one stage expecting five marks — only the
first three mark.
