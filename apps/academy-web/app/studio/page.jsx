"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
// Persona display metadata — feeds the pinned client card.
const PERSONAS = {
  maya: { name: "Maya Ellison", initials: "MA", arch: "The Analyst · literal lexicon",
    issue: "Presentation confidence — vocational goal. Responds to concrete, physical suggestion; resists abstraction.", ep: "72% Physical" },
  leo: { name: "Leo Marchetti", initials: "LE", arch: "The Dreamer · inferred lexicon",
    issue: "Sports performance — avocational goal. Rides imagery and metaphor; drifts under over-direct language.", ep: "68% Emotional" },
};

// Map an orchestrator stage name to its chip color token.
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
const RING = 163.4; // 2πr, r=26

export default function Studio() {
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [profile, setProfile] = useState("p1");
  const [plan, setPlan] = useState("vocational");
  const [persona, setPersona] = useState("maya");
  const [meta, setMeta] = useState(null);
  const [feed, setFeed] = useState([]);
  const [stage, setStage] = useState("pre");
  const [idx, setIdx] = useState(0);
  const [nods, setNods] = useState(0);
  const [waiting, setWaiting] = useState(false); // await checkpoint pending
  const [typing, setTyping] = useState(false);    // persona composing a reply
  const [sec, setSec] = useState(0);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const wsRef = useRef(null);
  const busyRef = useRef(false);
  const tRef = useRef(null);
  const rRef = useRef(null);

  const push = useCallback((item) => setFeed((f) => [...f, item]), []);
  const pmeta = PERSONAS[persona] || PERSONAS.maya;

  // session timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const start = useCallback(async () => {
    setErr("");
    try {
      const r = await fetch(`${ORCH}/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, plan, persona }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 300));
      const m = await r.json();
      setMeta(m); setFeed([]); setStage("pre"); setIdx(0); setNods(0);
      setWaiting(false); setTyping(false); setSec(0); setStats(null);
      const ws = new WebSocket(`${WS_BASE}/ws/${m.session_id}`);
      ws.onmessage = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.event === "error") { setErr(d.message); return; }
        const t = d.turn;
        if (t.type !== "done") setIdx(d.idx);
        if (t.type === "stage") { setStage(t.name); setWaiting(false); busyRef.current = false; }
        else if (t.type === "await") { setWaiting(true); setTyping(true); busyRef.current = true; }
        else if (t.type === "reply") {
          setWaiting(false); setTyping(false); busyRef.current = false;
          if (/nod/i.test(t.text)) setNods((n) => n + 1);
        } else if (t.type === "done") {
          setStats(t.stats); setPhase("done"); busyRef.current = false; ws.close();
        } else { busyRef.current = false; }
        if (t.type !== "done") push(t);
      };
      ws.onclose = () => { wsRef.current = null; };
      ws.onerror = () => setErr("WebSocket error — is the orchestrator running on 8600?");
      wsRef.current = ws;
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
    wsRef.current?.close(); wsRef.current = null;
    setPhase("idle"); setFeed([]); setMeta(null); setStats(null); setErr("");
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
  useEffect(() => () => wsRef.current?.close(), []);

  // split the interleaved feed into therapist (left) and persona (right)
  const left = feed.filter((t) => t.type !== "reply");
  const replies = feed.filter((t) => t.type === "reply");
  const sc = stageColor(stage);
  const ringOffset = (RING * (1 - Math.min(sec / 1200, 1))).toFixed(1);

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Role-play studio</span>
          <h1 style={{ margin: "8px 0 0" }}>Session <em>Studio</em></h1>
        </div>
        {phase !== "idle" && (
          <div className="seg">
            <button className={phase === "running" ? "on" : ""} onClick={() => phase === "done" && start()}>Live</button>
            <button className={phase === "done" ? "on" : ""} onClick={() => phase === "running" && setPhase("done")}>Debrief</button>
          </div>
        )}
      </div>

      {/* ---------- SETUP ---------- */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <p className="note">
            Pick a client profile, session plan, and persona. The orchestrator renders the full Kappasinian
            first-session script, then the persona answers every ideomotor checkpoint. Advance with{" "}
            <span className="kbd">Space</span> or the Next button once live.
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
            <button className="primary" onClick={start}>Begin Session →</button>
            <span className="note" style={{ margin: 0 }}>Advance with <span className="kbd">Space</span> once live.</span>
          </div>
          {err && <p style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 13 }}>{err}</p>}
        </div>
      )}

      {/* ---------- LIVE / DONE ---------- */}
      {phase !== "idle" && meta && phase !== "done" && (
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
                if (t.type === "stage")
                  return <div key={i} className="t-stage" style={{ "--sc": stageColor(t.name) }}><span>{pretty(t.name)}</span></div>;
                if (t.type === "await")
                  return <div key={i} className="t-await done"><span>✓ checkpoint · {pretty(t.name)} confirmed</span></div>;
                if (t.type === "snap")
                  return <div key={i} className="t-snap"><b>✳ SNAP</b><span>{t.note || "anchor set · transient detected"}</span></div>;
                return <div key={i} className="t-line"><span className="who">You</span><span className="txt">{t.text}</span></div>;
              })}
              {waiting && <div className="t-await"><span className="dot" /><span>waiting for ideomotor response…</span></div>}
            </div>

            <div className="studio-bar">
              <button className="primary" onClick={next}>Next</button>
              <span className="hint">or press <span className="kbd">Space</span> to advance</span>
              <button className="ghost" style={{ marginLeft: "auto" }} onClick={reset}>End session</button>
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
      {phase === "done" && stats && (
        <div className="summary">
          <div className="top">
            <div>
              <span className="eyebrow" style={{ color: "var(--ok)" }}>✓ Session complete</span>
              <h2>{pmeta.name} · {plan} <em>first session</em></h2>
            </div>
            <div className="stagechip" style={{ "--sc": "var(--stage-post)", marginTop: 0 }}><span className="dot" />post · emerged</div>
          </div>
          <div className="statrow">
            <div className="stat"><div className="n" style={{ color: "var(--amber)" }}>{mmss(stats.duration_s ?? sec)}</div><div className="l">Duration</div></div>
            <div className="stat"><div className="n">{stats.turns ?? meta?.turns}</div><div className="l">Turns</div></div>
            <div className="stat"><div className="n" style={{ color: "var(--ok)" }}>{stats.awaits ?? 0}/{meta?.awaits ?? stats.awaits ?? 0}</div><div className="l">Checkpoints</div></div>
            <div className="stat"><div className="n" style={{ color: "var(--iris)" }}>{nods}</div><div className="l">Nods</div></div>
          </div>
          <div style={{ display: "flex", gap: 12, padding: "20px 28px", borderTop: "1px solid var(--line)", background: "var(--panel-2)" }}>
            <button className="primary" onClick={start}>Run Again</button>
            <button className="chip" onClick={reset}>New Session</button>
          </div>
        </div>
      )}
      {err && phase !== "idle" && <p style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 13, marginTop: 14 }}>{err}</p>}
    </article>
  );
}
