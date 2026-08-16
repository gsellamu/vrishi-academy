"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
   Line data — Variation #2 E/P lane induction + deepening script
   --------------------------------------------------------------------------- */
const ALL = [
  { stage:"induction", lane:"both", text:"Take a look at your arm, elbow to fingertips. Get a good picture\u2026 and let your eyes close.", rate:"slow", pitch:"-5%", brk:1200, tone:"maternal", tags:[["nlp","Pacing"],["nlp","VAK \u00B7 Visual"],["conv","Yes-set"]] },
  { stage:"induction", lane:"both", cue:"await", awaitName:"visualize", text:"When you can picture your hand clearly\u2026 nod your head, yes.", rate:"slow", pitch:"-5%", brk:1500, tone:"maternal", tags:[["nlp","Presupposition"],["conv","Ideomotor cue"]] },
  { stage:"induction", lane:"E", text:"You may allow that hand to grow lighter\u2026 because you choose to allow it\u2026 light as a feather, and lighter still.", rate:"x-slow", pitch:"-10%", brk:1500, tone:"maternal", tags:[["nlp","Embedded command"],["lex","Permissive"],["conv","Inference"]] },
  { stage:"induction", lane:"P", text:"That hand IS getting lighter. Lighter and lighter. It lifts now \u2014 feel it rise.", rate:"slow", pitch:"-5%", brk:1200, tone:"paternal", tags:[["nlp","Embedded command"],["lex","Direct"],["conv","Analog marking"]] },
  { stage:"induction", lane:"both", cue:"snap", text:"Skin contact \u2014 DEEP SLEEP.", rate:"medium", pitch:"-5%", brk:800, tone:"paternal", tags:[["conv","Convincer"]] },
  { stage:"induction", lane:"both", cue:"phs", text:"Each and every time I suggest the words \u2018deep sleep\u2019, for the purpose of hypnosis and with your permission, you enter this state very quickly, calmly and deeply, and the physical body relaxes.", rate:"slow", pitch:"-8%", brk:1500, tone:"paternal", tags:[["nlp","Anchor"],["nlp","Presupposition"],["conv","Utilization"]] },
  { stage:"deepening", lane:"P", text:"Your hand and forehead are one solid piece of marble. The more you try to lift it, the tighter it holds.", rate:"slow", pitch:"-8%", brk:1200, tone:"paternal", tags:[["nlp","Double-bind"],["conv","Challenge"]] },
  { stage:"deepening", lane:"E", text:"Five\u2026 drifting down\u2026 four, a wave of calm\u2026 three\u2026 two\u2026 one\u2026 deeper now.", rate:"x-slow", pitch:"-12%", brk:1800, tone:"maternal", tags:[["nlp","Fractionation"],["lex","wave of calm"]] },
  { stage:"deepening", lane:"E", text:"A heavy book resting on one open palm\u2026 helium balloons lifting the other\u2026 let them respond.", rate:"x-slow", pitch:"-12%", brk:1500, tone:"maternal", tags:[["conv","Inference"],["nlp","VAK \u00B7 Kinesthetic"]] },
  { stage:"deepening", lane:"P", text:"That arm is a steel bar, shoulder to wrist. Five\u2026 four\u2026 rigid\u2026 so rigid it will not bend.", rate:"slow", pitch:"-8%", brk:1200, tone:"paternal", tags:[["conv","Challenge"],["nlp","Convincer"]] },
  { stage:"deepening", lane:"both", text:"From the top of your head\u2026 the muscles around your eyes softening\u2026 letting go, all the way down.", rate:"x-slow", pitch:"-10%", brk:1500, tone:"maternal", tags:[["nlp","Pacing"],["conv","Truism chain"]] },
];

/* E-lane vocabulary */
const E_VOCAB = [
  "allow", "permit", "imagine", "drift", "float", "sense", "feel", "notice",
  "gentle", "soft", "warm", "calm", "easy", "willing", "choose", "let",
];
/* P-lane vocabulary */
const P_VOCAB = [
  "now", "rigid", "solid", "steel", "lock", "tight", "firm", "strong",
  "immediately", "deeper", "heavier", "stuck", "fixed", "cannot", "will not",
];

/* Tag type colors */
const TAG_COLORS = { nlp: "var(--iris)", conv: "var(--teal)", lex: "var(--amber)" };

/* Stage colors */
const STAGE_COLORS = { induction: "var(--stage-induction)", deepening: "var(--stage-deepening)" };

/* Tone display */
const TONE_META = {
  maternal: { label: "\u2640 maternal \u00B7 warm", color: "var(--teal)" },
  paternal: { label: "\u2642 paternal \u00B7 firm", color: "var(--amber)" },
};

/* Rate to approximate WPM for auto-advance timing */
const RATE_WPM = { "x-slow": 80, slow: 110, medium: 140, fast: 170 };

/* Build SSML from a line object */
function buildSSML(line) {
  const rateAttr = line.rate ? ` rate="${line.rate}"` : "";
  const pitchAttr = line.pitch ? ` pitch="${line.pitch}"` : "";
  const brkTag = line.brk ? `\n  <break time="${line.brk}ms"/>` : "";
  return `<speak>\n  <prosody${rateAttr}${pitchAttr}>\n    ${line.text}\n  </prosody>${brkTag}\n</speak>`;
}

/* Tag descriptions (for the coach panel) */
const TAG_DESC = {
  "Pacing": "Match the client\u2019s current reality before leading.",
  "VAK \u00B7 Visual": "Visual representational system cue.",
  "VAK \u00B7 Kinesthetic": "Kinesthetic representational system cue.",
  "Yes-set": "Series of truisms the client agrees with.",
  "Presupposition": "Language that presupposes the desired outcome.",
  "Ideomotor cue": "Involuntary motor signal confirming trance depth.",
  "Embedded command": "Marked-out command within a larger sentence.",
  "Permissive": "Ericksonian permissive language style.",
  "Direct": "Kappasinian literal/direct suggestion style.",
  "Inference": "Indirect suggestion via logical implication.",
  "Analog marking": "Tonal or gestural emphasis on embedded commands.",
  "Convincer": "Test that confirms hypnotic state to both parties.",
  "Anchor": "Associative link between stimulus and state.",
  "Utilization": "Using the client\u2019s own responses therapeutically.",
  "Double-bind": "Choice between two outcomes that both deepen trance.",
  "Challenge": "Dare-style suggestion that deepens via attempted resistance.",
  "Fractionation": "Repeated induction/emergence cycles to deepen state.",
  "wave of calm": "Kinesthetic metaphor for progressive relaxation.",
  "Truism chain": "String of undeniable truths leading to suggestion.",
};

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */
export default function Teleprompter() {
  /* State */
  const [lane, setLane] = useState("E");
  const [blend, setBlend] = useState(30);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [speakOn, setSpeakOn] = useState(false);

  const timerRef = useRef(null);
  const activeLineRef = useRef(null);
  const utterRef = useRef(null);

  /* Filter lines by lane */
  const lines = useMemo(
    () => ALL.filter((l) => l.lane === "both" || l.lane === lane),
    [lane]
  );

  /* Clamp activeIdx when lane changes */
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, lines.length - 1));
  }, [lines.length]);

  /* Scroll active line into view */
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIdx]);

  /* Cancel speech on unmount or toggle off */
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* Speak the current line via browser TTS */
  const speakLine = useCallback((line) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(line.text);
    /* Map rate strings to numeric SpeechSynthesis rates */
    const rateMap = { "x-slow": 0.5, slow: 0.7, medium: 1.0, fast: 1.3 };
    utter.rate = (rateMap[line.rate] || 1.0) * speed;

    /* Parse pitch like "-10%" to a numeric offset */
    const pitchMatch = (line.pitch || "0%").match(/^([+-]?\d+)%$/);
    const pitchOffset = pitchMatch ? parseInt(pitchMatch[1], 10) : 0;
    utter.pitch = Math.max(0, Math.min(2, 1 + pitchOffset / 50));

    /* Try to pick a gendered voice */
    const voices = window.speechSynthesis.getVoices();
    const wantFemale = line.tone === "maternal";
    const match = voices.find((v) => {
      const n = v.name.toLowerCase();
      return wantFemale
        ? (n.includes("female") || n.includes("zira") || n.includes("samantha") || n.includes("karen"))
        : (n.includes("male") || n.includes("david") || n.includes("daniel") || n.includes("james"));
    });
    if (match) utter.voice = match;

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    return utter;
  }, [speed]);

  /* Auto-advance logic */
  useEffect(() => {
    if (!playing) {
      clearTimeout(timerRef.current);
      return;
    }

    const line = lines[activeIdx];
    if (!line) { setPlaying(false); return; }

    if (speakOn) {
      const utter = speakLine(line);
      if (utter) {
        utter.onend = () => {
          /* Wait for the break duration, then advance */
          timerRef.current = setTimeout(() => {
            setActiveIdx((i) => {
              if (i + 1 >= lines.length) { setPlaying(false); return i; }
              return i + 1;
            });
          }, (line.brk || 800) / speed);
        };
      }
    } else {
      /* Calculate duration from word count and rate */
      const words = line.text.split(/\s+/).length;
      const wpm = RATE_WPM[line.rate] || 130;
      const readMs = ((words / wpm) * 60 * 1000 + (line.brk || 800)) / speed;
      timerRef.current = setTimeout(() => {
        setActiveIdx((i) => {
          if (i + 1 >= lines.length) { setPlaying(false); return i; }
          return i + 1;
        });
      }, readMs);
    }

    return () => clearTimeout(timerRef.current);
  }, [playing, activeIdx, speakOn, speed, lines, speakLine]);

  /* Transport controls */
  const togglePlay = useCallback(() => {
    if (playing) {
      window.speechSynthesis?.cancel();
    }
    setPlaying((p) => !p);
  }, [playing]);

  const goPrev = useCallback(() => {
    window.speechSynthesis?.cancel();
    setActiveIdx((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    window.speechSynthesis?.cancel();
    setActiveIdx((i) => Math.min(lines.length - 1, i + 1));
  }, [lines.length]);

  const adjustPace = useCallback((delta) => {
    setSpeed((s) => Math.max(0.4, Math.min(2.0, +(s + delta).toFixed(1))));
  }, []);

  const toggleSpeak = useCallback(() => {
    if (speakOn) window.speechSynthesis?.cancel();
    setSpeakOn((s) => !s);
  }, [speakOn]);

  const currentLine = lines[activeIdx] || lines[0];
  const vocab = lane === "E" ? E_VOCAB : P_VOCAB;

  /* Stage divider tracking for the feed */
  let lastStage = null;

  return (
    <article>
      {/* -------- HEADER -------- */}
      <div className="studio-head" style={{ marginBottom: 18 }}>
        <div>
          <span className="eyebrow">Teleprompter \u00B7 SSML-paced</span>
          <h1 style={{ margin: "8px 0 0" }}>
            Variation #2 \u00B7 <em>{lane === "E" ? "Emotional" : "Physical"} lane</em>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* E/P blend slider */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)", minWidth: 130 }}>
            E/P blend \u00B7 {blend}
            <input
              type="range" min="0" max="100" value={blend}
              style={{ accentColor: "var(--iris)" }}
              onChange={(e) => setBlend(Number(e.target.value))}
            />
          </label>
          {/* Lane segmented control */}
          <div className="seg">
            <button type="button" className={lane === "E" ? "on" : ""} onClick={() => setLane("E")}>E-lane</button>
            <button type="button" className={lane === "P" ? "on" : ""} onClick={() => setLane("P")}>P-lane</button>
          </div>
        </div>
      </div>

      {/* -------- WHAT / WHY / HOW / VALUE -------- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { h: "What", body: "E/P lane teleprompter with SSML prosody tags and browser TTS for paced script practice." },
          { h: "Why", body: "Kappasinian inductions require different pacing for emotional vs. physical suggestibility types." },
          { h: "How", body: "Lines are filtered by lane, rendered with prosody metadata, and optionally spoken via SpeechSynthesis." },
          { h: "Value", body: "Build muscle memory for tone shifts, embedded commands, and PHS placement before live sessions." },
        ].map((c) => (
          <div key={c.h} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 6 }}>{c.h}</div>
            <div style={{ fontSize: 13, color: "#cfc9dd", lineHeight: 1.55 }}>{c.body}</div>
          </div>
        ))}
      </div>

      {/* -------- MAIN GRID -------- */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 22, alignItems: "start" }}>

        {/* ---- SCRIPT FEED (left) ---- */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", maxHeight: "min(680px,74dvh)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)" }}>Script feed \u00B7 {lines.length} lines</span>
            <div className="stagechip" style={{ "--sc": STAGE_COLORS[currentLine?.stage] || "var(--iris)" }}>
              <span className="dot" />
              <span>{currentLine?.stage || "---"}</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "thin", scrollbarColor: "var(--line-2) transparent" }}>
            {lines.map((line, idx) => {
              const isActive = idx === activeIdx;
              /* Stage divider */
              let divider = null;
              if (line.stage !== lastStage) {
                divider = (
                  <div key={`stage-${line.stage}-${idx}`} className="t-stage" style={{ "--sc": STAGE_COLORS[line.stage] }}>
                    <span>{line.stage}</span>
                  </div>
                );
                lastStage = line.stage;
              }

              return (
                <div key={idx}>
                  {divider}
                  <div
                    ref={isActive ? activeLineRef : null}
                    onClick={() => { window.speechSynthesis?.cancel(); setActiveIdx(idx); }}
                    style={{
                      border: "1px solid " + (isActive ? "var(--amber)" : "var(--line)"),
                      borderLeft: isActive ? "3px solid var(--amber)" : "1px solid var(--line)",
                      borderRadius: "var(--r-md)",
                      background: isActive ? "rgba(224,164,88,.10)" : "var(--panel-2)",
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "border-color .18s var(--ease), background .18s var(--ease)",
                    }}
                  >
                    {/* Top row: stage chip + step + cue badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase",
                        color: STAGE_COLORS[line.stage], border: "1px solid", borderRadius: "var(--r-pill)",
                        padding: "2px 8px", background: "transparent",
                      }}>{line.stage}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)" }}>#{idx + 1}</span>
                      {line.lane !== "both" && (
                        <span style={{
                          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase",
                          color: line.lane === "E" ? "var(--teal)" : "var(--amber)",
                          border: "1px solid", borderRadius: "var(--r-pill)", padding: "2px 8px",
                        }}>{line.lane}-lane</span>
                      )}
                      {line.cue === "await" && (
                        <span style={{
                          fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)",
                          border: "1px solid rgba(224,164,88,.5)", borderRadius: "var(--r-pill)",
                          padding: "2px 8px", background: "rgba(224,164,88,.08)",
                        }}>AWAIT \u00B7 {line.awaitName}</span>
                      )}
                      {line.cue === "snap" && (
                        <span style={{
                          fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)",
                          border: "1px solid rgba(224,164,88,.5)", borderRadius: "var(--r-pill)",
                          padding: "2px 8px", background: "rgba(224,164,88,.12)",
                        }}>SNAP</span>
                      )}
                      {line.cue === "phs" && (
                        <span style={{
                          fontFamily: "var(--mono)", fontSize: 10, color: "var(--ok)",
                          border: "1px solid rgba(127,185,138,.5)", borderRadius: "var(--r-pill)",
                          padding: "2px 8px", background: "rgba(127,185,138,.08)",
                        }}>PHS</span>
                      )}
                    </div>

                    {/* Script text */}
                    <div style={{
                      fontSize: isActive ? 16 : 14.5, lineHeight: 1.55,
                      color: isActive ? "var(--ink)" : "#d8d3e6",
                      transition: "font-size .18s var(--ease)",
                    }}>{line.text}</div>

                    {/* Bottom row: tone + rate + pitch + break badges + NLP tags */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {/* Tone */}
                      <span style={{
                        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".06em",
                        color: TONE_META[line.tone]?.color || "var(--mist)",
                        border: "1px solid", borderRadius: "var(--r-pill)", padding: "2px 8px",
                      }}>{TONE_META[line.tone]?.label || line.tone}</span>
                      {/* Prosody badges */}
                      <span className="prosody-badge" style={{ color: "var(--iris)", borderColor: "var(--iris)" }}>rate:{line.rate}</span>
                      <span className="prosody-badge" style={{ color: "var(--iris)", borderColor: "var(--iris)" }}>pitch:{line.pitch}</span>
                      <span className="prosody-badge" style={{ color: "var(--mist)", borderColor: "var(--line-2)" }}>brk:{line.brk}ms</span>
                      {/* NLP/conv/lex tags */}
                      {line.tags.map(([type, label], ti) => (
                        <span key={ti} style={{
                          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".04em",
                          color: TAG_COLORS[type] || "var(--mist)",
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: TAG_COLORS[type] || "var(--mist)", flexShrink: 0 }} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- PATTERN COACH (right sidebar) ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Now speaking */}
          <div className="panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 8 }}>Now speaking</div>
            <div style={{ font: "340 18px/1.35 var(--display)", color: "var(--ink)" }}>
              {currentLine?.text || "\u2014"}
            </div>
          </div>

          {/* Rendered SSML */}
          <div className="panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 8 }}>Rendered SSML</div>
            <pre style={{
              fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.5,
              color: "#cfc9dd", background: "var(--void)", border: "1px solid var(--line)",
              borderRadius: 8, padding: "12px 14px", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap",
            }}>
              {currentLine ? buildSSML(currentLine) : ""}
            </pre>
          </div>

          {/* Techniques active */}
          <div className="panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 8 }}>Techniques active</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(currentLine?.tags || []).map(([type, label], i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: TAG_COLORS[type] || "var(--mist)", flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: TAG_COLORS[type] || "var(--mist)", letterSpacing: ".04em" }}>{label}</div>
                    <div style={{ fontSize: 12, color: "var(--mist)", lineHeight: 1.45 }}>{TAG_DESC[label] || ""}</div>
                  </div>
                </div>
              ))}
              {(!currentLine?.tags || currentLine.tags.length === 0) && (
                <div style={{ fontSize: 12, color: "var(--dim)" }}>No tagged techniques on this line.</div>
              )}
            </div>
          </div>

          {/* E/P lexicon */}
          <div className="panel" style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 8 }}>
              {lane === "E" ? "E-lane" : "P-lane"} lexicon
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {vocab.map((w) => (
                <span key={w} style={{
                  fontFamily: "var(--mono)", fontSize: 11,
                  color: lane === "E" ? "var(--teal)" : "var(--amber)",
                  border: "1px solid", borderRadius: "var(--r-pill)", padding: "3px 9px",
                  opacity: currentLine?.text?.toLowerCase().includes(w) ? 1 : 0.4,
                  transition: "opacity .18s var(--ease)",
                }}>{w}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -------- TRANSPORT BAR -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        marginTop: 18, padding: "14px 18px",
        background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)",
      }}>
        {/* Play / Pause */}
        <button type="button" className="primary" onClick={togglePlay} style={{ minWidth: 90 }}>
          {playing ? "Pause" : "Play"}
        </button>

        {/* Speak toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 11, color: speakOn ? "var(--amber)" : "var(--mist)", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={speakOn} onChange={toggleSpeak} style={{ accentColor: "var(--amber)" }} />
          Speak
        </label>

        {/* Prev / Next */}
        <button type="button" className="chip" onClick={goPrev} disabled={activeIdx === 0}>Prev</button>
        <button type="button" className="chip" onClick={goNext} disabled={activeIdx >= lines.length - 1}>Next</button>

        {/* Pace -/+ */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="chip" onClick={() => adjustPace(-0.1)} disabled={speed <= 0.4} style={{ padding: "6px 10px" }}>&minus;</button>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)", minWidth: 40, textAlign: "center" }}>{speed.toFixed(1)}x</span>
          <button type="button" className="chip" onClick={() => adjustPace(0.1)} disabled={speed >= 2.0} style={{ padding: "6px 10px" }}>+</button>
        </div>

        {/* Progress label */}
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--mist)", marginLeft: "auto" }}>
          Line {activeIdx + 1} / {lines.length} \u00B7 {currentLine?.stage || "---"} \u00B7 {lane === "E" ? "Emotional" : "Physical"}
        </span>
      </div>
    </article>
  );
}
