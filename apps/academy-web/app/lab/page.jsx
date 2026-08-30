"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import drillData from "../../data/drills.json";

const DRILLS = Object.fromEntries(drillData.drills.map((d) => [d.id, d]));

/* preset → group + flags for the grouped board */
const GROUP_OF = {
  first55: "First session",
  psr15: "PSR", full25: "PSR", mock50: "PSR",
  moreno34: "Shadows", kappas22: "Shadows",
  var2e30: "Variations", var2p30: "Variations",
  autodual20: "Self-work", imagery18: "Self-work", selfhyp10: "Self-work",
  inferred30: "Inferred", inferredadv35: "Inferred",
  tom5: "Singles", abreact8: "Singles",
};
const GROUP_ORDER = ["First session", "PSR", "Shadows", "Variations", "Inferred", "Self-work", "Singles"];
const GROUP_COLOR = { "First session": "var(--teal)", PSR: "var(--amber)", Shadows: "var(--iris)", Variations: "#b57fd4", Inferred: "#d49aba", "Self-work": "var(--ok)", Singles: "var(--mist)" };
const GRADED = { mock50: true };
/* a few single-skill quick starts appended to the Singles lane */
const SINGLE_SKILLS = ["armraise", "progrelax", "tom"];

function buildPlan(minutes, focus) {
  const seq = drillData.sequences[focus] || [focus];
  const items = seq.map((id) => DRILLS[id]).filter(Boolean);
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  let plan = items.map((d) => ({ id: d.id, name: d.name, mins: Math.max(d.min, Math.round((minutes * d.weight) / totalWeight)) }));
  let overflow = plan.reduce((s, p) => s + p.mins, 0) - minutes;
  while (overflow > 0) {
    const reducible = [...plan].sort((a, b) => b.mins - a.mins).find((p) => p.mins > DRILLS[p.id].min);
    if (!reducible) break;
    reducible.mins -= 1; overflow -= 1;
  }
  let shortfall = minutes - plan.reduce((s, p) => s + p.mins, 0);
  const byWeight = [...plan].sort((a, b) => DRILLS[b.id].weight - DRILLS[a.id].weight);
  for (let i = 0; shortfall > 0 && byWeight.length > 0; i = (i + 1) % byWeight.length) { byWeight[i].mins += 1; shortfall -= 1; }
  return plan;
}
function loadHistory() { try { return JSON.parse(localStorage.getItem("lab:attempts") || "[]"); } catch { return []; } }
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* sparkline points from a list of scores (oldest→newest) */
function sparkPoints(scores, w, h) {
  if (!scores.length) return "";
  const min = 55, max = 95, n = scores.length;
  return scores.map((v, i) => {
    const x = n === 1 ? w : (i / (n - 1)) * w;
    const y = h - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export default function Lab() {
  const [minutes, setMinutes] = useState(15);
  const [focus, setFocus] = useState("psr_core");
  const [mode, setMode] = useState("inferred");
  const [phase, setPhase] = useState("plan"); // plan | run | debrief
  const [plan, setPlan] = useState([]);
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState({});
  const [history, setHistory] = useState([]);
  const tick = useRef(null);

  useEffect(() => { setHistory(loadHistory()); }, []);
  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { clearInterval(tick.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running]);

  const current = plan[step] ? DRILLS[plan[step].id] : null;
  const stepMins = plan[step]?.mins || 1;
  const focusOptions = [
    ["first_session", "First session: Step 0 → count out"],
    ["psr_core", "PSR core sequence"], ["psr_full", "PSR full 11-item walk"],
    ["moreno_blueprint", "Shadow: Moreno modern blueprint"], ["kappas_vintage", "Shadow: Kappas vintage blueprint"],
    ["var2_emotional", "Variation 2: Emotional lane"], ["var2_physical", "Variation 2: Physical lane"],
    ["inferred_mastery", "Inferred: Mastery sequence"], ["inferred_advanced", "Inferred: Advanced (overload + confusion)"],
    ["auto_dual_path", "Self-work: Auto Dual induction path"], ["imagery_path", "Self-work: Guided Imagery secondary"], ["self_hypnosis", "Self-work: Self-Hypnosis teach-back"],
    ...drillData.drills.map((d) => [d.id, `Single skill: ${d.name}`]),
  ];

  function start(p = null, m = minutes, f = focus) {
    const built = p || buildPlan(m, f);
    setPlan(built); setStep(0); setChecks({});
    setLeft(built[0].mins * 60); setRunning(true); setPhase("run");
  }
  function nextStep() {
    if (step + 1 < plan.length) { setStep(step + 1); setLeft(plan[step + 1].mins * 60); }
    else { setRunning(false); setPhase("debrief"); }
  }
  function toggle(drillId, i) { const key = `${drillId}:${i}`; setChecks((c) => ({ ...c, [key]: !c[key] })); }
  function scoreOf() {
    const all = plan.flatMap((p) => DRILLS[p.id].check.map((_, i) => `${p.id}:${i}`));
    const hit = all.filter((k) => checks[k]).length;
    return all.length ? Math.round((100 * hit) / all.length) : 0;
  }
  function saveAttempt() {
    const attempt = {
      at: new Date().toISOString(), minutes, focus, mode, score: scoreOf(),
      missed: plan.flatMap((p) => DRILLS[p.id].check.filter((_, i) => !checks[`${p.id}:${i}`]).map((c) => `${DRILLS[p.id].name}: ${c}`)).slice(0, 6),
    };
    const nextH = [attempt, ...loadHistory()].slice(0, 30);
    localStorage.setItem("lab:attempts", JSON.stringify(nextH));
    setHistory(nextH); setPhase("plan");
  }

  /* grouped presets */
  const groups = useMemo(() => {
    const g = {}; GROUP_ORDER.forEach((k) => (g[k] = []));
    drillData.presets.forEach((p) => { const grp = GROUP_OF[p.id] || "Singles"; (g[grp] ||= []).push(p); });
    return g;
  }, []);

  const progress = current ? Math.round(((stepMins * 60 - left) / (stepMins * 60)) * 100) : 0;
  const activeLine = current ? Math.min(current.prompter.length - 1, Math.floor((progress / 100) * current.prompter.length)) : 0;
  const score = phase === "debrief" ? scoreOf() : 0;
  const gaugeOffset = (326.7 * (1 - score / 100)).toFixed(1);
  const histScores = history.map((h) => h.score).reverse(); // oldest→newest

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Lab · goal-oriented workbench</span>
          <h1 style={{ margin: "8px 0 0" }}>Practice <em>Lab</em></h1>
        </div>
        <div className="seg">
          <button type="button" className={phase === "plan" ? "on" : ""} onClick={() => setPhase("plan")}>Plan</button>
          <button type="button" className={phase === "run" ? "on" : ""} onClick={() => plan.length && setPhase("run")}>Run</button>
          <button type="button" className={phase === "debrief" ? "on" : ""} onClick={() => plan.length && setPhase("debrief")}>Debrief</button>
        </div>
      </div>

      {/* ---------- PLAN ---------- */}
      {phase === "plan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 26, maxWidth: 940 }}>
          <p className="note">Name the goal, get a timed plan, run it with the prompter, score yourself against the PSR checklist. Sim reps only — real reps go in the Dojo ledger.</p>

          <div className="presets">
            {GROUP_ORDER.map((grp) => (
              (groups[grp]?.length || (grp === "Singles")) && (
                <div className="presetgroup" key={grp}>
                  <div className="glabel" style={{ color: GROUP_COLOR[grp] }}>{grp}</div>
                  <div className="row">
                    {groups[grp]?.map((p) => (
                      <button key={p.id} className={`preset${p.id === "first55" ? " feature" : ""}${GROUP_OF[p.id] === "Singles" ? " single" : ""}`}
                        onClick={() => { setMinutes(p.minutes); setFocus(p.focus); start(null, p.minutes, p.focus); }}>
                        {p.label.replace(/ \(.*\)$/, "").replace(/ - /g, " · ")}
                        {GRADED[p.id] && <span className="graded">GRADED</span>}
                      </button>
                    ))}
                    {grp === "Singles" && SINGLE_SKILLS.map((id) => (
                      <button key={id} className="preset single" onClick={() => { setFocus(id); start(null, DRILLS[id].min + 1, id); }}>{DRILLS[id].name}</button>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          <div className="labform">
            <label style={{ flex: 1, minWidth: 180 }}>Minutes · <span style={{ color: "var(--amber)" }}>{minutes}</span>
              <input type="range" min="3" max="90" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 15)} />
            </label>
            <label style={{ minWidth: 220 }}>Focus
              <select value={focus} onChange={(e) => setFocus(e.target.value)}>
                {focusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)" }}>
              Client mode
              <div className="modeseg">
                <button className={mode === "inferred" ? "on" : ""} onClick={() => setMode("inferred")}>Emotional</button>
                <button className={mode === "literal" ? "on" : ""} onClick={() => setMode("literal")}>Physical</button>
              </div>
            </div>
            <button type="button" className="primary" onClick={() => start()}>Build plan &amp; start →</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(200px,300px)", gap: 18, alignItems: "start" }}>
            <div className="panel" style={{ padding: 18 }}>
              <div style={{ font: "560 14px var(--body)", color: "var(--amber)", marginBottom: 10 }}>Recent runs</div>
              {history.length === 0 && <p className="note" style={{ margin: 0 }}>No runs yet — your first debrief lands here.</p>}
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="histrow">
                  <span className="mono">{h.at.slice(0, 10)}</span>
                  <span>{h.minutes}m · {h.focus} · {h.mode === "literal" ? "Physical" : "Emotional"}</span>
                  <span className={`score${h.score >= 85 ? " hi" : ""}`}>{h.score}</span>
                </div>
              ))}
            </div>
            <div className="panel" style={{ padding: 18 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 6 }}>Trend · {Math.min(history.length, 30)} runs</div>
              <svg viewBox="0 0 240 60" width="100%" height="60" preserveAspectRatio="none">
                <polyline fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinejoin="round" points={sparkPoints(histScores, 240, 60)} />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ---------- RUN ---------- */}
      {phase === "run" && current && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--iris)" }}>Step {step + 1} / {plan.length} · {mode === "literal" ? "Physical" : "Emotional"} mode</div>
              <h2 style={{ font: "340 28px/1.1 var(--display)", margin: "6px 0 0" }}>{current.name}</h2>
            </div>
            <div className={"clock" + (left === 0 ? " done" : "")}>{mmss(left)}</div>
          </div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>

          <ol className="prompter">
            {current.prompter.map((line, i) => (
              <li key={i} className={i === activeLine ? "active" : i < activeLine ? "dim" : ""}>{line}</li>
            ))}
          </ol>

          <div className="checks">
            {current.check.map((c, i) => {
              const on = !!checks[`${current.id}:${i}`];
              return <button key={i} className={`checkchip${on ? " on" : ""}`} onClick={() => toggle(current.id, i)}>{on ? "✓ " : ""}{c}</button>;
            })}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="chip" onClick={() => setRunning(!running)}>{running ? "Pause" : "Resume"}</button>
            <button type="button" className="primary" onClick={nextStep}>{step + 1 < plan.length ? "Next drill" : "Finish → debrief"}</button>
            <button type="button" className="ghost" onClick={() => { setRunning(false); setPhase("plan"); }}>Abandon</button>
          </div>
          <p className="note">Plan: {plan.map((p, i) => `${i === step ? "▸ " : ""}${p.name} ${p.mins}m`).join("  ·  ")}</p>
        </div>
      )}

      {/* ---------- DEBRIEF ---------- */}
      {phase === "debrief" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 900 }}>
          <div className="panel" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 26, alignItems: "center", padding: "24px 28px" }}>
            <div className="gaugewrap">
              <svg width="132" height="132" viewBox="0 0 132 132">
                <circle cx="66" cy="66" r="52" fill="none" stroke="var(--line)" strokeWidth="9" />
                <circle cx="66" cy="66" r="52" fill="none" stroke={score >= 85 ? "var(--ok)" : "var(--amber)"} strokeWidth="9" strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset={gaugeOffset} />
              </svg>
              <div className="v"><b style={{ color: score >= 85 ? "var(--ok)" : "var(--amber)" }}>{score}</b><span>/ 100</span></div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)" }}>Debrief · self-scored</div>
              <h2 style={{ font: "340 28px/1.1 var(--display)", margin: "8px 0 6px" }}>{focus} · {minutes}m · <em>{mode === "literal" ? "Physical" : "Emotional"}</em></h2>
              <div style={{ fontSize: 14, color: "#cfc9dd" }}>Misses become your next warm-up. Target: two clean 85+ runs before the workshop.</div>
            </div>
          </div>

          <div className="breakdown">
            {plan.map((p) => {
              const d = DRILLS[p.id];
              const hit = d.check.filter((_, i) => checks[`${p.id}:${i}`]).length;
              return (
                <div className="bd" key={p.id}>
                  <div className="h"><b>{d.name}</b><span className="frac" style={{ color: hit === d.check.length ? "var(--ok)" : "var(--amber)" }}>{hit}/{d.check.length}</span></div>
                  <ul>
                    {d.check.map((c, i) => (
                      <li key={i} className={checks[`${p.id}:${i}`] ? "hit" : "miss"}>{checks[`${p.id}:${i}`] ? "✓ " : "✕ "}{c}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="panel" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)" }}>History · last {Math.min(history.length, 30)} runs</span>
            </div>
            <svg viewBox="0 0 480 80" width="100%" height="80" preserveAspectRatio="none">
              <line x1="0" y1="24" x2="480" y2="24" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />
              <polyline fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinejoin="round" points={sparkPoints([...histScores, score], 480, 80)} />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)", marginTop: 4 }}>
              <span>older</span><span style={{ color: "var(--amber)" }}>— 85 target</span><span>this run</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="primary" onClick={saveAttempt}>Save run</button>
            <button type="button" className="chip" onClick={() => start(plan)}>Re-run same plan</button>
          </div>
        </div>
      )}
    </article>
  );
}
