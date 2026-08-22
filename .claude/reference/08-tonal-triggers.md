# Tonal Word-Triggers — Phonetic Anchoring

Neural voices (ElevenLabs) infer pitch, throat resonance, and articulation from the **emotional
weight of the vocabulary** around a phrase — not from SSML alone. `STAGE_MAP` already *assigns* a
tonality per stage (maternal/paternal/authority/theta/conversational); the `tonal_triggers`
lexicon lets you choose **words that compound that read** so the voice actually lands where the
stage intends. This is the bridge between the engine's tonality system and the neural TTS.

## The lexicon block (`render/nlp_lexicon.yaml → tonal_triggers`)

```yaml
tonal_triggers:
  maternal:  [soften, dissolve, melting, drifting, gentle, allow, wrap, blanket, held, home,
              ease, flowing, warm, soothing, calm, rest, safe, secure, cradle, comfort, tender,
              quiet, peaceful, breathe, sway, floating, cared for, welcome, receive, worthy, ...]
  paternal:  [strength, lock, solid, granite, steel, anchor, authority, command, claim, build,
              create, architect, decisive, unshakeable, unbreakable, resilient, structure,
              foundation, execute, power, dominion, standing firm, sharp, steady, certain, ...]
```

- **maternal** = soft open vowels + liquid/nasal consonants (l, m, n, w) → the voice softens, goes
  breathier, lifts pitch a touch. Use for nurturing, permissive, receptive passages.
- **paternal** = hard plosives (P/T/K/B/D/G/ST) → the voice tightens, deepens, gets crisp and
  certain. Use for command, structure, challenge, claiming passages.

## Important: these are NOT analog-marked

`tonal_triggers` is **authoring guidance + neural-flatten anchoring**, not a `_mark_phrases` class.
The enricher only analog-marks `embedded_commands`, `presuppositions`, and (in therapy/PR) VAK.
Tonal triggers work by their **phonetics in the flattened text**, so they influence the ElevenLabs
read whether or not they carry `<emphasis>`. Do not add them to the marking pass — over-marking
dulls the real embedded commands.

## How they line up with STAGE_MAP

Choose vocabulary from the list that matches the stage's assigned tonality (see `02-tonality-and-ep.md`):

| stage tonality | pull words from | typical stages |
|---|---|---|
| maternal | `tonal_triggers.maternal` | prog_relax, physio(E), conversion(E), suggestions(E) |
| paternal / authority | `tonal_triggers.paternal` | reactional, hand-forehead, arm-rigidity, emerge, conversion(P) |
| theta_hypnotic | maternal-leaning (soft) | count, deepeners, guided imagery, suggestions |
| conversational | neutral (either, sparingly) | pre_talk, ToM, homework |

For a standalone script that alternates archetypes (e.g. anxiety→health→wealth), let each movement
sit in a stage whose tonality matches, and saturate that movement with the matching trigger words.
The anxiety/wealth script does exactly this: maternal-worded blocks under `stage_prog_relax` /
`stage_suggestions`, paternal-worded blocks under `stage_reactional` (authority).

## Authoring rule

When writing or editing a block/script, after you've picked the stage (which fixes the tonality),
**scan your draft against the matching trigger list** and swap flat/clinical words for the
phonetically-loaded ones where it doesn't distort meaning:

- maternal draft: "let the tension go" → "let the tension **dissolve** / **melt** / **soften**"
- paternal draft: "you are in charge of your health" → "you are the **authority**; **solid as
  granite**; **anchoring** you; **unshakeable**"

Keep it natural — a wall of trigger words reads as purple prose. A few well-placed ones per breath
group are enough to move the neural voice.

## Extending the lists

Add words freely (original wording). Group by phonetic class, not just meaning: a new maternal
word should have soft onsets and open vowels; a new paternal word should carry a hard plosive on
the stressed syllable. If a word is emotionally "firm" but phonetically soft (e.g. "resolve"), it
won't move the voice much — prefer the plosive-forward synonym.

## Verifying the effect

There's no mechanical assertion for tonal triggers (they're phonetic, not marked). Verify by ear:
flatten the script (`ssml_to_elevenlabs_expressive`), synthesize a maternal block and a paternal
block in ElevenLabs at Stability 80%, and confirm the voice audibly softens vs. tightens across
the two. If both read flat, the vocabulary isn't loaded enough — pull more from the lists.
