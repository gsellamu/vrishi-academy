#!/usr/bin/env python3
"""
prosody.py - Kappasinian prosody + NLP enrichment for rendered session SSML.

Consumes the v1.1 renderer output (plain <speak> with <mark stage_*/> checkpoints)
and produces:
  1) Enriched SSML in the HOUSE DIALECT used by AI_Pipeline_Code/services/ssml_router.py
     (<prosody rate/pitch/volume>, <break time/>, <emphasis level>), tonality- and
     E&P-adapted per stage.
  2) An ElevenLabs-ready text via the SAME conversion rules as ssml_router.ssml_to_elevenlabs
     (vendored below, credited) - breaks become ellipses, strong emphasis becomes CAPS.
  3) An E11 request plan: one HypnoticTTSRequest-shaped JSON object per stage segment
     for POST http://localhost:8136 (zone, suggestibility_type, override_tonality,
     override_pace) so tonality shifts land as separate synthesis calls.

NLP layers applied (all original wording; lexicon-driven):
  - Analog marking of embedded commands  -> <emphasis level="strong"> + pause envelope
  - Pacing-and-leading connectors       -> soft prosody on truisms, breath pause before lead
  - Presupposition highlighting          -> moderate emphasis
  - Tonality: maternal / paternal / authority / conversational / theta_hypnotic per stage
  - Pace: EP base rate x tonality modifier; pauses scaled by EP pause_multiplier

Alignment contract (DO NOT DRIFT):
  EPType, TherapeuticPhase, EP_VOICE_PARAMS follow ssml_router.py; VoiceTonality and
  SessionPhase zones follow tts_service.py. If those change, update PROSODY_CONTRACT_VERSION.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

PROSODY_CONTRACT_VERSION = "e11-2026-08-08"

# ----------------------------------------------------------------- EP params --
EP_VOICE_PARAMS = {
    "physical":     {"rate": 95, "pitch": -5, "volume": "medium", "pause_multiplier": 1.0, "emphasis_style": "strong"},
    "emotional":    {"rate": 85, "pitch": -2, "volume": "soft",   "pause_multiplier": 1.3, "emphasis_style": "moderate"},
    "somnambulist": {"rate": 90, "pitch": -3, "volume": "medium", "pause_multiplier": 1.0, "emphasis_style": "moderate"},
    "balanced":     {"rate": 90, "pitch": -3, "volume": "medium", "pause_multiplier": 1.15, "emphasis_style": "moderate"},
}

# Tonality modifiers on top of EP base (HMI VoiceTonality)
TONALITY_MODS = {
    "authority":       {"rate": +5,  "pitch": -3, "volume": "medium", "pace": 1.05},
    "paternal":        {"rate": 0,   "pitch": -4, "volume": "medium", "pace": 1.0},
    "maternal":        {"rate": -5,  "pitch": +1, "volume": "soft",   "pace": 0.92},
    "conversational":  {"rate": +3,  "pitch": 0,  "volume": "medium", "pace": 1.0},
    "theta_hypnotic":  {"rate": -10, "pitch": -4, "volume": "soft",   "pace": 0.82},
}

# stage -> (zone, SessionPhase, default tonality, E-override tonality)
# Zones per tts_service.SessionPhase comments: pre 0-2, induction 3, deepening 4,
# therapy 5, integration 6, anchoring 7, emergence 8, post 9-10.
STAGE_MAP = {
    "stage_pre_talk":       (1, "pre_induction", "conversational", None),
    "stage_tom":            (2, "pre_induction", "paternal",       None),
    "stage_induction":      (3, "induction",     "conversational", None),
    "stage_sugg_questions": (3, "induction",     "conversational", None),
    "stage_physio":         (3, "induction",     "paternal",       "maternal"),
    "stage_conversion":     (3, "induction",     "paternal",       "maternal"),
    "stage_count_5_0":      (4, "deepening",     "theta_hypnotic", None),
    "stage_reactional":     (4, "deepening",     "authority",      "paternal"),
    "stage_heavy_light":    (4, "deepening",     "paternal",       "maternal"),
    "stage_deepener":       (4, "deepening",     "theta_hypnotic", None),
    "stage_prog_relax":     (4, "deepening",     "maternal",       "maternal"),
    "stage_suggestions":    (5, "therapy",       "theta_hypnotic", None),
    "stage_emerge":         (8, "emergence",     "authority",      None),
    "stage_finger_spread":  (7, "anchoring",     "paternal",       "maternal"),
    "stage_homework":       (9, "post_session",  "conversational", None),
    "_default":             (5, "therapy",       "conversational", None),
}

# ------------------------------------------------------------ vendored E11 ----
def ssml_to_elevenlabs(ssml_text: str) -> str:
    """Vendored from AI_Pipeline_Code/services/ssml_router.py (keep behavior identical)."""
    text = re.sub(r"</?speak>", "", ssml_text)
    text = re.sub(r'<break time="(\d+)ms"/>', lambda m: "." * (int(m.group(1)) // 300 + 1), text)
    text = re.sub(r'<break time="(\d+\.?\d*)s"/>', lambda m: "." * (int(float(m.group(1)) * 3) + 1), text)
    text = re.sub(r"<break[^>]*/>", "...", text)

    def emphasis_caps(m):
        level, content = m.group(1), m.group(2)
        return content.upper() if level == "strong" else content
    text = re.sub(r'<emphasis level="([^"]+)">([^<]+)</emphasis>', emphasis_caps, text)
    text = re.sub(r"<prosody[^>]*>([^<]*)</prosody>", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\.{4,}", "...", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def ssml_to_elevenlabs_expressive(ssml_text: str) -> str:
    """Enhanced ElevenLabs flatten for hypnosis read-aloud fidelity. OPT-IN only.

    The vendored ssml_to_elevenlabs() above stays byte-identical to ssml_router.py
    (production TTS path). This variant is for standalone hypnosis-script export where
    neural-voice pacing matters more than parity, per the ElevenLabs pacing guidance:
      - graded ellipsis by pause length (short comma-beat vs deep dramatic drop),
      - BLANK LINE between segments for a long (1.5-3s) integration silence
        (a paragraph break reads as dramatic silence in ElevenLabs, unlike inline dots),
      - <emphasis strong> -> CAPS (subconscious analog-mark), moderate -> unchanged.
    A <break> at or above 2s (or 2000ms) becomes a paragraph break; shorter breaks become
    proportional ellipses (1 dot / 300ms, capped at 6 so the line stays readable).
    """
    def dots(n: int) -> str:
        return "." * max(1, min(6, n))
    text = re.sub(r"</?speak>", "", ssml_text)
    # long pauses -> paragraph break (dramatic silence); else graded ellipsis
    def ms_break(m):
        ms = int(m.group(1))
        return "\n\n" if ms >= 2000 else dots(ms // 300 + 1)
    def s_break(m):
        s = float(m.group(1))
        return "\n\n" if s >= 2.0 else dots(int(s * 3) + 1)
    text = re.sub(r'<break time="(\d+)ms"/>', ms_break, text)
    text = re.sub(r'<break time="(\d+\.?\d*)s"/>', s_break, text)
    text = re.sub(r"<break[^>]*/>", "\n\n", text)

    def emphasis_caps(m):
        level, content = m.group(1), m.group(2)
        return content.upper() if level == "strong" else content
    text = re.sub(r'<emphasis level="([^"]+)">([^<]+)</emphasis>', emphasis_caps, text)
    text = re.sub(r"<prosody[^>]*>([^<]*)</prosody>", r"\1", text)
    text = re.sub(r"<mark[^>]*/>", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    # tidy: collapse >6 dots, collapse spaces within a line, keep paragraph breaks
    text = re.sub(r"\.{7,}", "......", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# ------------------------------------------------------------- enrichment ----
DEFAULT_LEXICON = {
    "embedded_commands": [
        "deep sleep", "let go", "drift down", "relax now", "go deeper",
        "feel comfortable", "feel that comfort", "close your eyes",
        "trust yourself", "calm and relaxed", "eyes open", "wide awake",
    ],
    "presuppositions": [
        "as you begin to", "when you notice", "the moment you", "each time you",
        "before you realize", "while your body",
    ],
    "pace_lead_connectors": ["and", "as", "which means", "so that", "because"],
}

def load_lexicon(path: Path | None) -> dict:
    if path and path.exists() and yaml:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return {**DEFAULT_LEXICON, **data}
    return DEFAULT_LEXICON

def _scale_breaks(segment: str, mult: float) -> str:
    def ms(m): return f'<break time="{max(120, int(int(m.group(1)) * mult))}ms"/>'
    def s(m):  return f'<break time="{round(float(m.group(1)) * mult, 2)}s"/>'
    segment = re.sub(r'<break time="(\d+)ms"/>', ms, segment)
    segment = re.sub(r'<break time="(\d+\.?\d*)s"/>', s, segment)
    return segment

def _mark_phrases(segment: str, phrases: list[str], level: str, envelope_ms: int = 0) -> str:
    for ph in sorted(phrases, key=len, reverse=True):
        pat = re.compile(rf"(?i)(?<![>\w])({re.escape(ph)})(?![\w<])")
        pre = f'<break time="{envelope_ms}ms"/>' if envelope_ms else ""
        post = f'<break time="{envelope_ms}ms"/>' if envelope_ms else ""
        segment = pat.sub(lambda m: f'{pre}<emphasis level="{level}">{m.group(1)}</emphasis>{post}', segment, count=3)
    return segment

def _vak_counts(text: str, lexicon: dict) -> dict:
    preds = lexicon.get("vak_predicates", {})
    plain = re.sub(r"<[^>]+>", " ", text).lower()
    return {sys_: sum(len(re.findall(rf"(?<!\w){re.escape(p)}(?!\w)", plain)) for p in ps)
            for sys_, ps in preds.items()}

def enrich(ssml_in: str, ep_type: str, lexicon: dict, vak: str | None = None) -> tuple[str, list[dict]]:
    ep = EP_VOICE_PARAMS.get(ep_type, EP_VOICE_PARAMS["balanced"])
    parts = re.split(r'(<mark name="stage_[a-z_0-9]+"/>)', ssml_in)
    out: list[str] = []
    plan: list[dict] = []
    current = "_default"

    for part in parts:
        m = re.match(r'<mark name="(stage_[a-z_0-9]+)"/>', part)
        if m:
            current = m.group(1)
            out.append(part)
            continue
        if not part.strip():
            out.append(part)
            continue

        zone, phase, tonality, e_override = STAGE_MAP.get(current, STAGE_MAP["_default"])
        if ep_type == "emotional" and e_override:
            tonality = e_override
        mods = TONALITY_MODS[tonality]

        seg = part
        seg = _scale_breaks(seg, ep["pause_multiplier"] * (1.25 if tonality == "theta_hypnotic" else 1.0))
        seg = _mark_phrases(seg, lexicon["embedded_commands"], "strong", envelope_ms=350)
        seg = _mark_phrases(seg, lexicon["presuppositions"], "moderate")
        if vak and current in ("stage_suggestions", "stage_prog_relax"):
            seg = _mark_phrases(seg, lexicon.get("vak_predicates", {}).get(vak, []), "moderate")

        rate = max(70, min(110, ep["rate"] + mods["rate"]))
        pitch = ep["pitch"] + mods["pitch"]
        volume = mods["volume"] if ep["volume"] == "medium" else ep["volume"]
        seg_body = seg.strip()
        wrapped = f'<prosody rate="{rate}%" pitch="{pitch:+d}%" volume="{volume}">{seg_body}</prosody>'
        out.append(wrapped)

        el_text = ssml_to_elevenlabs(wrapped)
        if el_text:
            plan.append({
                "endpoint": "http://localhost:8136/api/v1/tts/hypnotic/generate",
                "body": {
                    "text": el_text,
                    "zone": zone,
                    "suggestibility_type": "physical" if ep_type == "physical" else ("emotional" if ep_type == "emotional" else "physical"),
                    "override_tonality": tonality,
                    "override_pace": round(mods["pace"], 2),
                    "use_cache": True,
                },
                "meta": {"stage": current, "phase": phase, "contract": PROSODY_CONTRACT_VERSION,
                         "vak_counts": _vak_counts(part, lexicon)},
            })

    enriched = "".join(out)
    if "<speak>" not in enriched:
        enriched = f"<speak>{enriched}</speak>"
    return enriched, plan

# -------------------------------------------------------------------- CLI ----
def main() -> int:
    ap = argparse.ArgumentParser(description="Enrich rendered session SSML with prosody + NLP layers")
    ap.add_argument("--in", dest="inp", required=True, help="rendered .ssml from render_session.py")
    ap.add_argument("--suggestibility", choices=list(EP_VOICE_PARAMS), default="balanced")
    ap.add_argument("--lexicon", default=None, help="optional nlp_lexicon.yaml override")
    ap.add_argument("--vak", choices=["visual", "auditory", "kinesthetic", "auditory_digital"], default=None,
                    help="weave emphasis onto this rep system's predicates in therapy stages (NLP 2 predicates table)")
    ap.add_argument("-o", "--out", required=True, help="enriched .ssml output")
    ap.add_argument("--e11-plan", default=None, help="write ElevenLabs request plan JSON here")
    ap.add_argument("--el-text", default=None, help="write flattened ElevenLabs text here (vendored parity)")
    ap.add_argument("--el-text-expressive", default=None,
                    help="write expressive ElevenLabs text here (blank-line silences, graded pauses)")
    args = ap.parse_args()

    ssml_in = Path(args.inp).read_text(encoding="utf-8")
    lex = load_lexicon(Path(args.lexicon) if args.lexicon else None)
    enriched, plan = enrich(ssml_in, args.suggestibility, lex, vak=args.vak)

    try:
        from lxml import etree
        etree.fromstring(enriched.encode("utf-8"))
    except ImportError:
        pass
    except Exception as e:
        print(f"[FAIL] enriched SSML not well-formed: {e}", file=sys.stderr)
        return 2

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(enriched, encoding="utf-8")
    if args.e11_plan:
        Path(args.e11_plan).parent.mkdir(parents=True, exist_ok=True)
        Path(args.e11_plan).write_text(json.dumps(plan, indent=2), encoding="utf-8")
    if args.el_text:
        Path(args.el_text).parent.mkdir(parents=True, exist_ok=True)
        Path(args.el_text).write_text("\n\n".join(p["body"]["text"] for p in plan), encoding="utf-8")
    if args.el_text_expressive:
        Path(args.el_text_expressive).parent.mkdir(parents=True, exist_ok=True)
        Path(args.el_text_expressive).write_text(ssml_to_elevenlabs_expressive(enriched), encoding="utf-8")
    print(f"[OK] enriched -> {args.out} | segments: {len(plan)} | ep={args.suggestibility} | contract {PROSODY_CONTRACT_VERSION}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
