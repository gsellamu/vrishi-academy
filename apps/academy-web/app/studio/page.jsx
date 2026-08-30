"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAcademy } from "../../lib/academy-store";

const ORCH = process.env.NEXT_PUBLIC_ORCH_URL || "http://localhost:8600";
const WS_BASE = ORCH.replace(/^http/, "ws");

const PROFILES = [
  { id: "p1", label: "Marcus — adult analyst, 72% physical, visual" },
  { id: "p2", label: "Rosa — elder caregiver, 70% emotional, kinesthetic (referral on file)" },
  { id: "p3", label: "Anya — child student, 50/50, guardian present" },
];
const PLANS = [
  { id: "vocational", label: "Vocational — presentation confidence" },
  { id: "referral", label: "Referral — pain comfort adjunct (gate)" },
  { id: "avocational", label: "Avocational — sports performance" },
];
const PERSONAS = {
  maya: { name: "Maya Ellison", initials: "MA", arch: "The Analyst · literal lexicon",
    issue: "Presentation confidence — vocational goal. Responds to concrete, physical suggestion; resists abstraction.", ep: "72% Physical" },
  leo: { name: "Leo Marchetti", initials: "LE", arch: "The Dreamer · inferred lexicon",
    issue: "Sports performance — avocational goal. Rides imagery and metaphor; drifts under over-direct language.", ep: "68% Emotional" },
};

// NLP type → CSS class (maps orchestrator detect_nlp types to globals.css)
const NLP_CLASS = {
  embed: "nlp-embed", presup: "nlp-presup", vak: "nlp-vak",
  lead: "nlp-lead", pace: "nlp-pace", tag: "nlp-tag",
  bind: "nlp-bind", milton: "nlp-milton",
};
const NLP_LABEL = {
  embed: "Embedded cmd", presup: "Presupposition", vak: "VAK",
  lead: "Lead", pace: "Pace", tag: "Tag question",
  bind: "Double bind", milton: "Milton",
};

// Tonality display colors
const TONE_COLOR = {
  authority: "var(--red)", paternal: "var(--amber)", maternal: "var(--teal)",
  conversational: "var(--mist)", theta_hypnotic: "var(--iris)",
};

// Coaching tips per major step — delivery guidance for the student
const MAJOR_TIP = {
  "Theory of Mind": "Personalize the 88/12 model to THEIR problem — trace it on the drawing.",
  "Partnership": "Land the contract line and get an anchored yes before moving on.",
  "E/P Test": "Note the last two answers — they set literal vs inferred wording for the whole session.",
  "Physio onset": "Name each change as you SEE it (breath, swallow, flutter) — convincer loop.",
  "Arm levitation": "Physical: \"it IS lighter.\" Emotional: \"you may allow it to lighten.\" Pace to the breath.",
  "Peak": "Wait for real skin contact + the nod — don't rush the conversion.",
  "Snap": "Snap immediately before \"deep sleep\"; voice drops hard.",
  "PHS": "Full anatomy: cue + purpose + consent + speed triple + somatic tag.",
  "Bicep challenge": "A felt, failed challenge is conviction for a physical — let them test it.",
  "Count 5-0": "One voice-step down per number; ~1s gaps.",
  "Eye catalepsy": "Test that the eyes stay closed — this is a felt challenge, not a verbal one.",
  "Progressive relaxation": "Slowest pacing of the session; long pauses, top-down.",
  "Staircase": "Wait for the finger signal before descending.",
  "New self-image": "Mold in THEIR words from intake.",
  "Suggestive therapy": "Say-See-Feel; land the See on a real upcoming situation.",
  "PHS verify": "Re-seat the PHS after every deepener in a first session.",
  "Venting dream": "Brief and permissive — plant the suggestion without elaborating.",
  "Count 0-5": "Reverse the energy curve — start low, end bright.",
  "Wide awake": "Crisp, energetic close; confirm fully alert.",
  "Finger-spread verify": "Proves the cue installed — the default induction next session.",
};

// Render text with NLP phrase highlights using character offsets from the orchestrator
function NlpText({ text, nlp }) {
  if (!nlp || nlp.length === 0) return <>{text}</>;
  const parts = [];
  let cursor = 0;
  for (const mark of nlp) {
    if (mark.start > cursor) parts.push(<span key={cursor}>{text.slice(cursor, mark.start)}</span>);
    const cls = NLP_CLASS[mark.type] || "";
    parts.push(
      <span key={mark.start} className={cls} title={NLP_LABEL[mark.type] || mark.type}>
        {text.slice(mark.start, mark.end)}
      </span>
    );
    cursor = mark.end;
  }
  if (cursor < text.length) parts.push(<span key={cursor}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

function stageColor(name = "") {
  const n = name.toLowerCase();
  if (n.includes("pre")) return "var(--stage-pre)";
  if (n.includes("induc")) return "var(--stage-induction)";
  if (n.includes("deep")) return "var(--stage-deepening)";
  if (n.includes("therap") || n.includes("suggest")) return "var(--stage-therapy)";
  if (n.includes("emerg") || n.includes("count") || n.includes("out")) return "var(--stage-emergence)";
  if (n.includes("post") || n.includes("home")) return "var(--stage-post)";
  return "var(--stage-pre)";
}
const pretty = (s) => (s || "").replace(/_/g, " ");
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const CUE = {
  snap: { label: "SNAP", note: "anchor set · transient detected" },
  forehead: { label: "TOUCH FOREHEAD + SNAP", note: "light contact on close, then Deep Sleep" },
  limpness: { label: "LIFT & DROP HANDS", note: "prove limpness · hands fall dead-weight" },
};
const RING = 163.4; // 2πr, r=26

// Stage keys for timeline — order matters
const STAGE_KEYS = ["pre", "induction", "deepening", "therapy", "emergence", "post"];
const STAGE_LABELS = { pre: "pre-talk & test", induction: "induction", deepening: "deepening", therapy: "therapy", emergence: "emergence", post: "verify" };
const STAGE_COLORS = {
  pre: "var(--stage-pre)", induction: "var(--stage-induction)", deepening: "var(--stage-deepening)",
  therapy: "var(--stage-therapy)", emergence: "var(--stage-emergence)", post: "var(--stage-post)",
};

export default function Studio() {
  const { logSession } = useAcademy();
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [profile, setProfile] = useState("p1");
  const [plan, setPlan] = useState("vocational");
  const [persona, setPersona] = useState("maya");
  const [meta, setMeta] = useState(null);
  const [feed, setFeed] = useState([]);
  const [stage, setStage] = useState("pre");
  const [idx, setIdx] = useState(0);
  const [nods, setNods] = useState(0);
  const [phsCount, setPhsCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sec, setSec] = useState(0);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const [showNlp, setShowNlp] = useState(true);
  const [showProsody, setShowProsody] = useState(true);
  const [showCoach, setShowCoach] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsAvail, setTtsAvail] = useState(null); // null=unknown, true/false
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [stageLog, setStageLog] = useState([]); // [{name, startIdx}] for timeline
  const wsRef = useRef(null);
  const busyRef = useRef(false);
  const tRef = useRef(null);
  const rRef = useRef(null);
  const retryRef = useRef(0);
  const closedByUserRef = useRef(false);
  const audioRef = useRef(null);

  const push = useCallback((item) => setFeed((f) => [...f, item]), []);
  const pmeta = PERSONAS[persona] || PERSONAS.maya;
  const sessionIdRef = useRef(null);

  // session timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Check TTS availability once on mount
  useEffect(() => {
    fetch(`${ORCH}/tts/health`).then((r) => r.json())
      .then((d) => setTtsAvail(d.ok === true))
      .catch(() => setTtsAvail(false));
  }, []);

  // Play TTS audio for a line turn
  const playTts = useCallback(async (turnIdx) => {
    if (!sessionIdRef.current) return;
    setTtsPlaying(true);
    try {
      const r = await fetch(`${ORCH}/tts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionIdRef.current, turn_idx: turnIdx }),
      });
      if (!r.ok) { setTtsPlaying(false); return; }
      const d = await r.json();
      if (d.audio_url) {
        const audio = new Audio(d.audio_url);
        audioRef.current = audio;
        audio.onended = () => setTtsPlaying(false);
        audio.onerror = () => setTtsPlaying(false);
        audio.play().catch(() => setTtsPlaying(false));
      } else { setTtsPlaying(false); }
    } catch { setTtsPlaying(false); }
  }, []);

  const start = useCallback(async () => {
    setErr("");
    try {
      const r = await fetch(`${ORCH}/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, plan, persona }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 300));
      const m = await r.json();
      sessionIdRef.current = m.session_id;
      setMeta(m); setFeed([]); setStage("pre"); setIdx(0); setNods(0); setPhsCount(0);
      setWaiting(false); setTyping(false); setSec(0); setStats(null); setStageLog([]);
      closedByUserRef.current = false;
      retryRef.current = 0;
      function connectWs(sessionId) {
        const ws = new WebSocket(`${WS_BASE}/ws/${sessionId}`);
        ws.onopen = () => { retryRef.current = 0; setErr(""); };
        ws.onmessage = (ev) => {
          const d = JSON.parse(ev.data);
          if (d.event === "error") { setErr(d.message); return; }
          const t = d.turn;
          if (t.type !== "done") setIdx(d.idx);
          if (t.type === "stage") {
            setStage(t.name); setWaiting(false); busyRef.current = false;
            setStageLog((sl) => [...sl, { name: t.name, idx: d.idx }]);
          }
          else if (t.type === "await") { setWaiting(true); setTyping(true); busyRef.current = true; }
          else if (t.type === "reply") {
            setWaiting(false); setTyping(false); busyRef.current = false;
            if (/nod/i.test(t.text)) setNods((n) => n + 1);
          } else if (t.type === "done") {
            closedByUserRef.current = true;
            setStats(t.stats); setPhase("done"); busyRef.current = false; ws.close();
            logSession({ profile, plan, persona, durationSec: t.stats?.duration_s, turns: t.stats?.turns, checkpoints: t.stats?.awaits, phsCount: 0 });
          } else { busyRef.current = false; }
          // Track PHS lines
          if (t.type === "line" && t.phs) setPhsCount((c) => c + 1);
          if (t.type !== "done") push({ ...t, _idx: d.idx });
        };
        ws.onclose = () => {
          wsRef.current = null;
          if (!closedByUserRef.current && retryRef.current < 3) {
            const delay = Math.pow(2, retryRef.current) * 1000;
            retryRef.current += 1;
            setErr("Reconnecting...");
            setTimeout(() => connectWs(sessionId), delay);
          }
        };
        ws.onerror = () => {
          if (retryRef.current >= 3) {
            setErr("WebSocket error — is the orchestrator running on 8600?");
          }
        };
        wsRef.current = ws;
      }
      connectWs(m.session_id);
      setPhase("running");
    } catch (e) { setErr(String(e.message || e)); }
  }, [profile, plan, persona, push]);

  const next = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1 || busyRef.current) return;
    busyRef.current = true;
    ws.send(JSON.stringify({ cmd: "next" }));
  }, []);

  const reset = useCallback(() => {
    closedByUserRef.current = true;
    wsRef.current?.close(); wsRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    sessionIdRef.current = null;
    setPhase("idle"); setFeed([]); setMeta(null); setStats(null); setErr("");
    setTtsPlaying(false); setStageLog([]);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (phase !== "running") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (e.code === "Space" && !["input", "select", "textarea", "button"].includes(tag)) {
        e.preventDefault(); next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next]);

  // autoscroll each column
  useEffect(() => { tRef.current?.scrollTo({ top: tRef.current.scrollHeight, behavior: "smooth" }); }, [feed, waiting]);
  useEffect(() => { rRef.current?.scrollTo({ top: rRef.current.scrollHeight, behavior: "smooth" }); }, [feed, typing]);
  useEffect(() => () => {
    closedByUserRef.current = true;
    wsRef.current?.close();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, []);

  // split the interleaved feed into therapist (left) and persona (right)
  const left = feed.filter((t) => t.type !== "reply");
  const replies = feed.filter((t) => t.type === "reply");
  const sc = stageColor(stage);
  const ringOffset = (RING * (1 - Math.min(sec / 1200, 1))).toFixed(1);

  // Compute stage timeline weights for debrief
  const stageWeights = {};
  if (stageLog.length > 0) {
    const totalTurns = meta?.turns || idx + 1;
    for (let i = 0; i < stageLog.length; i++) {
      const startIdx = stageLog[i].idx;
      const endIdx = i + 1 < stageLog.length ? stageLog[i + 1].idx : totalTurns;
      const key = stageLog[i].name?.toLowerCase().replace(/[^a-z]/g, "") || "pre";
      const mapped = STAGE_KEYS.find((k) => key.includes(k)) || "pre";
      stageWeights[mapped] = (stageWeights[mapped] || 0) + (endIdx - startIdx);
    }
  }

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Role-play studio · first session</span>
          <h1 style={{ margin: "8px 0 0" }}>Session <em>Studio</em></h1>
        </div>
        <div className="seg">
          <button type="button" className={phase === "idle" ? "on" : ""} onClick={() => reset()}>Setup</button>
          <button type="button" className={phase === "running" ? "on" : ""} onClick={() => phase === "done" && start()}>Live</button>
          <button type="button" className={phase === "done" ? "on" : ""} onClick={() => phase === "running" && setPhase("done")}>Debrief</button>
        </div>
      </div>

      {/* ---------- INFO BAR ---------- */}
      <div className="info-bar">
        <div><div className="info-label" style={{ color: "var(--teal)" }}>What</div><div className="info-text">AI role-play of a full first session — you deliver each line, the client persona responds and nods.</div></div>
        <div><div className="info-label" style={{ color: "var(--iris)" }}>Why</div><div className="info-text">Rehearse the whole Kappasinian arc with a client that answers every ideomotor checkpoint.</div></div>
        <div><div className="info-label" style={{ color: "var(--amber)" }}>How</div><div className="info-text">Set profile, plan and persona, then advance with Next or Space; watch the stage, checkpoints and PHS.</div></div>
        <div><div className="info-label" style={{ color: "var(--ok)" }}>Value</div><div className="info-text">Unlimited reps with no live client — build fluency and timing before the workshop.</div></div>
      </div>

      {/* ---------- SETUP ---------- */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <p className="note">
            Pick a client profile, session plan, and persona. The orchestrator renders the full Kappasinian
            first-session script across all six stages; the persona answers every ideomotor checkpoint. Advance with{" "}
            <span className="kbd">Space</span> once live.
          </p>
          <div className="labform" style={{ flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 220 }}>Profile
              <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label style={{ flex: 1, minWidth: 220 }}>Plan
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label style={{ minWidth: 200 }}>Persona
              <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                <option value="maya">Maya — analytical, literal (72% P)</option>
                <option value="leo">Leo — imaginative, inferred (68% E)</option>
              </select>
            </label>
          </div>
          <div className="persona" style={{ maxWidth: 900 }}>
            <div className="top">
              <div className="avatar">{pmeta.initials}</div>
              <div><div className="name">{pmeta.name}</div><div className="arch">{pmeta.arch}</div></div>
              <span className="badge ep" style={{ marginLeft: "auto" }}>{pmeta.ep}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button type="button" className="primary" onClick={start}>Begin Session →</button>
            <span className="note" style={{ margin: 0 }}>6 stages · est. 15 min · advance with <span className="kbd">Space</span></span>
          </div>
          {err && <p style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 13 }}>{err}</p>}
        </div>
      )}

      {/* ---------- LIVE ---------- */}
      {phase === "running" && meta && (
        <div className="studio-grid">
          {/* LEFT — therapist */}
          <section className="panel studio-left">
            <div className="head">
              <div style={{ minWidth: 0 }}>
                <div className="runmeta">{plan} · {persona} · {meta.turns} turns</div>
                <div className="stagechip" style={{ "--sc": sc }}><span className="dot" />{pretty(stage)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                <div className="timerwrap">
                  <svg width="58" height="58" viewBox="0 0 58 58">
                    <circle cx="29" cy="29" r="26" fill="none" stroke="var(--line)" strokeWidth="4" />
                    <circle cx="29" cy="29" r="26" fill="none" stroke="var(--amber)" strokeWidth="4" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={ringOffset} />
                  </svg>
                  <div className="t">{mmss(sec)}</div>
                </div>
                <div className="turns"><b>{idx + 1}/{meta.turns}</b><span>turns</span></div>
              </div>
            </div>

            <div className="tsel" ref={tRef}>
              {left.map((t, i) => {
                if (t.type === "stage") {
                  return (
                    <div key={i} className="t-stage" style={{ "--sc": stageColor(t.name) }}>
                      <span>{pretty(t.name)}</span>
                      {showProsody && t.tonality && (
                        <span className="t-stage-tone" style={{ color: TONE_COLOR[t.tonality] || "var(--mist)" }}>
                          {t.tonality.replace(/_/g, " ")} · z{t.zone}
                        </span>
                      )}
                    </div>
                  );
                }
                if (t.type === "await")
                  return <div key={i} className="t-await done"><span>✓ checkpoint · {pretty(t.name)} confirmed</span></div>;
                if (t.type === "snap") {
                  const c = CUE[t.name] || CUE.snap;
                  return <div key={i} className="t-snap"><b>✳ {c.label}</b><span>{t.note || c.note}</span></div>;
                }
                if (t.type === "phs" || t.phs) {
                  return <div key={i} className="t-phs"><span>⚓</span>PHS re-hypnosis seated</div>;
                }
                const p = t.prosody || {};
                const tipKey = t.major || t.stage || "";
                const tip = showCoach ? (MAJOR_TIP[tipKey] || "") : "";
                return (
                  <div key={i} className="t-line" style={showProsody && p.tonality ? { borderLeftColor: TONE_COLOR[p.tonality] || "var(--line)", borderLeftWidth: 3 } : undefined}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <span className="who">You{t.major ? ` · ${t.major}` : ""}</span>
                      {showProsody && p.tonality && (
                        <>
                          <span className="tonality-chip" style={{ color: TONE_COLOR[p.tonality] || "var(--mist)", borderColor: TONE_COLOR[p.tonality] || "var(--line)" }}>
                            {p.tonality.replace(/_/g, " ")}
                          </span>
                          <span className="prosody-badge" style={{ color: "var(--mist)", borderColor: "var(--line)" }}>
                            {p.rate ?? "—"}wpm
                          </span>
                          <span className="prosody-badge" style={{ color: "var(--mist)", borderColor: "var(--line)" }}>
                            ×{p.pace ?? 1}
                          </span>
                        </>
                      )}
                      {ttsEnabled && ttsAvail && (
                        <button type="button" className="tts-btn" disabled={ttsPlaying}
                          onClick={(e) => { e.stopPropagation(); playTts(t._idx); }}
                          title="Play TTS audio">▶</button>
                      )}
                    </div>
                    <span className="txt">
                      {showNlp ? <NlpText text={t.text} nlp={t.nlp} /> : t.text}
                    </span>
                    {tip && <div className="t-tip"><span>◉</span>{tip}</div>}
                  </div>
                );
              })}
              {waiting && <div className="t-await"><span className="dot" /><span>waiting for ideomotor response…</span></div>}
            </div>

            <div className="studio-bar">
              <button type="button" className="primary" onClick={next}>Next</button>
              <span className="hint">or press <span className="kbd">Space</span> to advance</span>
              <button type="button" className={`coach-btn${showCoach ? " on" : ""}`} onClick={() => setShowCoach(!showCoach)}>
                ◉ Model notes{showCoach ? " on" : ""}
              </button>
              <label className="prosody-toggle" title="Highlight NLP phrases">
                <input type="checkbox" checked={showNlp} onChange={(e) => setShowNlp(e.target.checked)} />NLP
              </label>
              <label className="prosody-toggle" title="Show delivery cues">
                <input type="checkbox" checked={showProsody} onChange={(e) => setShowProsody(e.target.checked)} />Prosody
              </label>
              {ttsAvail && (
                <label className="prosody-toggle" title="Play lines via ElevenLabs TTS">
                  <input type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />TTS
                </label>
              )}
              <button type="button" className="ghost" style={{ marginLeft: "auto" }} onClick={reset}>End session</button>
            </div>
          </section>

          {/* RIGHT — client persona */}
          <section className="studio-right">
            <div className="persona">
              <div className="top">
                <div className="avatar">{pmeta.initials}</div>
                <div><div className="name">{pmeta.name}</div><div className="arch">{pmeta.arch}</div></div>
              </div>
              <div className="issue">{pmeta.issue}</div>
              <div className="badges">
                <span className="badge ep">EP · {pmeta.ep}</span>
                <span className="badge nods">☺ {nods} nods</span>
              </div>
            </div>
            {showNlp && (
              <div className="nlp-legend">
                <span><span className="nlp-embed">embed</span></span>
                <span><span className="nlp-presup">presup</span></span>
                <span><span className="nlp-vak">vak</span></span>
                <span><span className="nlp-bind">bind</span></span>
                <span><span className="nlp-tag">tag</span></span>
                <span><span className="nlp-lead">lead</span></span>
                <span><span className="nlp-pace">pace</span></span>
                <span><span className="nlp-milton">milton</span></span>
              </div>
            )}
            <div className="rsel" ref={rRef}>
              {replies.map((t, i) => {
                const fallback = (t.source || "").startsWith("offline") || (t.source || "") === "fallback";
                const nod = /nod/i.test(t.text);
                return (
                  <div key={i} className="bubble">
                    <span className="txt">{t.text}</span>
                    <div className="srcrow">
                      <span className={`srcdot ${fallback ? "fallback" : "ollama"}`} />
                      <span className="srclabel">{fallback ? "fallback" : "ollama"}</span>
                      {nod && <span className="nodtag">· nod</span>}
                    </div>
                  </div>
                );
              })}
              {typing && <div className="typing"><span /><span /><span /></div>}
            </div>
          </section>
        </div>
      )}

      {/* ---------- DONE SUMMARY ---------- */}
      {phase === "done" && (
        <div className="summary">
          <div className="top">
            <div>
              <span className="eyebrow" style={{ color: "var(--ok)" }}>✓ Session complete</span>
              <h2>{pmeta.name} · {plan} <em>first session</em></h2>
            </div>
            <div className="stagechip" style={{ "--sc": "var(--stage-post)", marginTop: 0 }}><span className="dot" />post · emerged</div>
          </div>
          <div className="statrow">
            <div className="stat"><div className="n" style={{ color: "var(--amber)" }}>{mmss(stats?.duration_s ?? sec)}</div><div className="l">Duration</div></div>
            <div className="stat"><div className="n">{stats?.turns ?? meta?.turns ?? idx + 1}</div><div className="l">Turns</div></div>
            <div className="stat"><div className="n" style={{ color: "var(--ok)" }}>{stats?.awaits ?? nods}/{meta?.awaits ?? stats?.awaits ?? nods}</div><div className="l">Checkpoints</div></div>
            <div className="stat"><div className="n" style={{ color: "var(--iris)" }}>{phsCount}</div><div className="l">PHS seats</div></div>
          </div>

          {/* Stage timeline */}
          <div style={{ padding: "22px 28px", borderTop: "1px solid var(--line)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 12 }}>Stage timeline</div>
            <div className="timeline">
              {STAGE_KEYS.map((k) => (
                <span key={k} style={{ flex: stageWeights[k] || 1, background: STAGE_COLORS[k] }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--mist)" }}>
              {STAGE_KEYS.map((k) => (
                <span key={k} style={{ color: STAGE_COLORS[k] }}>{STAGE_LABELS[k]}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, padding: "20px 28px", borderTop: "1px solid var(--line)", background: "var(--panel-2)" }}>
            <button type="button" className="primary" onClick={start}>Run Again</button>
            <button type="button" className="chip" onClick={reset}>New Session</button>
          </div>
        </div>
      )}
      {err && phase !== "idle" && <p style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 13, marginTop: 14 }}>{err}</p>}
    </article>
  );
}
