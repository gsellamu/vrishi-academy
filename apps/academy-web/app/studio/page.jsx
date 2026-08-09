"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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
const PERSONAS = [
  { id: "maya", label: "Maya — analytical, literal (72% P)" },
  { id: "leo", label: "Leo — imaginative, inferred (68% E)" },
];

const pretty = (s) => (s || "").replace(/_/g, " ");

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
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const wsRef = useRef(null);
  const busyRef = useRef(false);
  const feedRef = useRef(null);

  const push = useCallback((item) => setFeed((f) => [...f, item]), []);

  const start = useCallback(async () => {
    setErr("");
    try {
      const r = await fetch(`${ORCH}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, plan, persona }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 300));
      const m = await r.json();
      setMeta(m);
      setFeed([]);
      setStage("pre");
      setIdx(0);
      setNods(0);
      setStats(null);
      const ws = new WebSocket(`${WS_BASE}/ws/${m.session_id}`);
      ws.onmessage = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.event === "error") { setErr(d.message); return; }
        const t = d.turn;
        if (t.type !== "done") setIdx(d.idx);
        if (t.type === "stage") { setStage(t.name); busyRef.current = false; }
        else if (t.type === "await") { busyRef.current = true; }
        else if (t.type === "reply") {
          busyRef.current = false;
          if (/nod/i.test(t.text)) setNods((n) => n + 1);
        } else if (t.type === "done") {
          setStats(t.stats);
          setPhase("done");
          busyRef.current = false;
          ws.close();
        } else { busyRef.current = false; }
        if (t.type !== "done") push(t);
      };
      ws.onclose = () => { wsRef.current = null; };
      ws.onerror = () => setErr("WebSocket error — is the orchestrator running on 8600?");
      wsRef.current = ws;
      setPhase("running");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }, [profile, plan, persona, push]);

  const next = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1 || busyRef.current) return;
    busyRef.current = true;
    ws.send(JSON.stringify({ cmd: "next" }));
  }, []);

  const reset = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setPhase("idle");
    setFeed([]);
    setMeta(null);
    setStats(null);
    setErr("");
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (phase !== "running") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (e.code === "Space" && !["input", "select", "textarea", "button"].includes(tag)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  useEffect(() => () => wsRef.current?.close(), []);

  return (
    <>
      <p className="eyebrow">Role-play studio</p>
      <h1>Session <em>Studio</em></h1>

      {phase === "idle" && (
        <>
          <p className="note">
            Pick a client profile, session plan, and persona. The orchestrator renders the full
            Kappasinian first-session script, then the persona answers every ideomotor checkpoint.
            Advance with <span className="mono">Space</span> or the Next button.
          </p>
          <div className="labform" style={{ marginTop: 18 }}>
            <label>Profile
              <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label>Plan
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label>Persona
              <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <button className="primary" onClick={start}>Start session</button>
          </div>
          {err && <p className="studioerr">{err}</p>}
        </>
      )}

      {phase !== "idle" && meta && (
        <>
          <div className="runhead">
            <div>
              <div className="runstep">{plan} · {persona} · {meta.turns} turns · {meta.awaits} checkpoints</div>
              <div className="stagechip">{pretty(stage)}</div>
            </div>
            <div className="studiometrics">
              <span className="mono">{idx + 1}/{meta.turns}</span>
              <span className="nodcount" title="ideomotor responses">☺ {nods}</span>
            </div>
          </div>

          <div className="transcript" ref={feedRef}>
            {feed.map((t, i) => {
              if (t.type === "stage") return <div key={i} className="t-stage">{pretty(t.name)}</div>;
              if (t.type === "await") return <div key={i} className="t-await">checkpoint · {pretty(t.name)}</div>;
              if (t.type === "reply") return (
                <div key={i} className="t-reply">
                  <span className="t-who">{t.persona}</span>{t.text}
                  {t.source?.startsWith("offline") && <span className="t-src"> · offline</span>}
                </div>
              );
              if (t.type === "snap") return <div key={i} className="t-snap">✳ snap</div>;
              return <div key={i} className="t-line">{t.text}</div>;
            })}
            {phase === "done" && stats && (
              <div className="t-done">
                Session complete — {stats.turns} turns · {stats.awaits} checkpoints ·
                {" "}{Math.floor(stats.duration_s / 60)}m {stats.duration_s % 60}s
              </div>
            )}
          </div>

          <div className="labrow">
            {phase === "running" && <button className="primary" onClick={next}>Next (Space)</button>}
            <button className="chip" onClick={reset}>{phase === "done" ? "New session" : "End & reset"}</button>
          </div>
          {err && <p className="studioerr">{err}</p>}
        </>
      )}
    </>
  );
}
