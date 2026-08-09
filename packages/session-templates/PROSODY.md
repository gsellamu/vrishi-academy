# Prosody + NLP Enrichment (render/prosody.py)

Second pass over the v1.1 renderer output. Emits the HOUSE SSML dialect
(ssml_router.py: prosody/break/emphasis) and an ElevenLabs request plan for the
E11 TTS Service (:8136).

## Pipeline
```powershell
# 1) render (unchanged)
python render\render_session.py --profile examples\profiles\p1_physical_analyst.yaml `
  --plan templates\vocational_presentation_confidence.session.yaml -o out\p1.ssml

# 2) enrich: prosody + tonality + NLP analog marking
python render\prosody.py --in out\p1.ssml --suggestibility physical `
  --lexicon render\nlp_lexicon.yaml -o out\p1.enriched.ssml `
  --e11-plan out\p1.e11.json --el-text out\p1.el.txt

# 3) synthesize on your stack (per segment; tonality shifts = separate calls)
#    POST each out\p1.e11.json[i].body to http://localhost:8136/api/v1/hypnotic-tts
```

## What the enricher does
- **Tonality per stage** (HMI VoiceTonality): pre-talk conversational -> ToM paternal ->
  conversion paternal (P) / maternal (E) -> counts + suggestions theta_hypnotic ->
  PR maternal -> emergence authority -> finger-spread anchoring. E-clients auto-swap
  challenge-adjacent stages to maternal.
- **Pace/pitch/volume**: EP base (physical 95%/-5, emotional 85%/-2, balanced 90%/-3)
  x tonality modifier (theta -10 rate, authority +5). Pauses scaled by EP
  pause_multiplier (emotional 1.3) and +25% inside theta stages.
- **NLP layers** (lexicon-driven, original wording): embedded commands analog-marked
  (`<emphasis level="strong">` + 350 ms pause envelope -> survives ElevenLabs as
  CAPS + ellipses via the vendored `ssml_to_elevenlabs`); presuppositions get
  moderate emphasis; connectors reserved for future pacing-and-leading pass.
- **Zones**: stages mapped to your SessionPhase zones (pre 1-2, induction 3,
  deepening 4, therapy 5, anchoring 7, emergence 8, post 9).

## Contract
`PROSODY_CONTRACT_VERSION = e11-2026-08-08`, aligned to
`AI_Pipeline_Code/services/ssml_router.py` + `tts_service.py`. If those enums or
`EP_VOICE_PARAMS` change, bump the contract and re-verify.

## Verified 2026-08-08
Rates absolute and sane (85-100%) - fixed a v1.1 bug (axes.yaml had relative
"0%/-8%" rates, invalid SSML). Emotional pause scaling confirmed on identical
text (dot count rises). E/P tonality swap at conversion confirmed. DEEP SLEEP
analog-marks to CAPS in EL text.

## Authored weave (v1.2, 2026-08-08)
The block library itself now intertwines the techniques - not just the enricher:
- Pre-talk opens on a yes-set (three verifiable truisms -> lead: "and that means...").
- ToM closes on a tag-question yes-anchor with its own nod checkpoint (await_tom_yes).
- Conversion carries authored strong emphasis on the pivotal lightness line and a
  comparable-alternatives bind in BOTH modes (fingers-or-wrist / hand-to-face-or-face-to-hand).
- Progressive Relaxation opens with a VAK tri-weave ordered by the client's `vak`
  profile field (visual|auditory|kinesthetic; default balanced) - new axis, wired
  through render_session.py; example profiles p1=visual, p2=kinesthetic, p3=default.
- Suggestions coda: alternatives bind (tonight / tomorrow / unexpected moment) +
  presupposed change + embedded "trust yourself now" (moderate emphasis).
- Homework future-paces next week's win.
Nod checkpoints per first session: 16. Enricher verified non-double-marking over
authored emphasis (guard on preceding '>'), and authored strongs survive the EL
conversion as CAPS (e.g., LIGHTER AND LIGHTER).

## Security notes (action items)
- `tts_service.py:482` ships the REAL ElevenLabs key as the env fallback (verified
  byte-identical to `AI_Pipeline_Code\.env` ELEVENLABS_API_KEY). Rotate the key at
  ElevenLabs, update ONLY `AI_Pipeline_Code\.env`, delete the source fallback, and
  make the code fail hard when unset. Key location note: the root `Jeeth.ai\.env`
  does not carry it; `AI_Pipeline_Code\.env` is the source of truth (also holds
  ELEVENLABS_VOICE_ID + 3 Sophia voice IDs).
- Key scope verified live 2026-08-08: TTS permission works (200, mp3 returned);
  `user_read` denied - a scoped key, good. Keep the rotated key equally scoped.
- NLP Speech Enrichment port drift: registry says 8416, service source defaults
  8417 (WS18 fix), docstring mentions 8415. Reconcile in the canonical port map.
