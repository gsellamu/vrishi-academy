"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import drillData from "../../data/drills.json";

const DRILLS = Object.fromEntries(drillData.drills.map((d) => [d.id, d]));

function buildPlan(minutes, focus) {
  const seq = drillData.sequences[focus] || [focus];
  const items = seq.map((id) => DRILLS[id]).filter(Boolean);
  const totalWeight = items.reduce((s, d) => s + d.weight, 0);
  let plan = items.map((d) => ({ id: d.id, name: d.name, mins: Math.max(d.min, Math.round((minutes * d.weight) / totalWeight)) }));
  // trim overflow from the largest items until the plan fits
  let overflow = plan.reduce((s, p) => s + p.mins, 0) - minutes;
  while (overflow > 0) {
    const reducible = [...plan].sort((a, b) => b.mins - a.mins)
      .find((p) => p.mins > DRILLS[p.id].min);
    if (!reducible) break;
    reducible.mins -= 1; overflow -= 1;
  }
  // distribute rounding shortfall to the weightiest drills
  let shortfall = minutes - plan.reduce((s, p) => s + p.mins, 0);
  const byWeight = [...plan].sort((a, b) => DRILLS[b.id].weight - DRILLS[a.id].weight);
  for (let i = 0; shortfall > 0; i = (i + 1) % byWeight.length) {
    byWeight[i].mins += 1; shortfall -= 1;
  }
  return plan;
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem("lab:attempts") || "[]"); } catch { return []; }
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
    tick.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick.current);
  }, [running]);

  const current = plan[step] ? DRILLS[plan[step].id] : null;
  const focusOptions = [
    ["first_session", "First session: Step 0 -> count out"],
    ["psr_core", "PSR core sequence"], ["psr_full", "PSR full 11-item walk"],
    ["moreno_blueprint", "Shadow: Moreno modern blueprint"], ["kappas_vintage", "Shadow: Kappas vintage blueprint"],
    ["var2_emotional", "Variation 2: Emotional lane"], ["var2_physical", "Variation 2: Physical lane"],
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
  function toggle(drillId, i) {
    const key = `${drillId}:${i}`;
    setChecks((c) => ({ ...c, [key]: !c[key] }));
  }
  function scoreOf() {
    const all = plan.flatMap((p) => DRILLS[p.id].check.map((_, i) => `${p.id}:${i}`));
    const hit = all.filter((k) => checks[k]).length;
    return all.length ? Math.round((100 * hit) / all.length) : 0;
  }
  function saveAttempt() {
    const attempt = { at: new Date().toISOString(), minutes, focus, mode, score: scoreOf(),
      missed: plan.flatMap((p) => DRILLS[p.id].check.filter((_, i) => !checks[`${p.id}:${i}`]).map((c) => `${DRILLS[p.id].name}: ${c}`)).slice(0, 6) };
    const next = [attempt, ...loadHistory()].slice(0, 30);
    localStorage.setItem("lab:attempts", JSON.stringify(next));
    setHistory(next); setPhase("plan");
  }
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <article>
      <span className="eyebrow">Lab · goal-oriented workbench</span>
      <h1>Practice <em>Lab</em></h1>

      {phase === "plan" && (
        <div>
          <p className="note">Name the goal, get a timed plan, run it with the prompter, score yourself against the PSR checklist. Sim reps only — real reps go in the Dojo ledger.</p>
          <div className="labrow">
            {drillData.presets.map((p) => (
              <button key={p.id} className="chip" onClick={() => { setMinutes(p.minutes); setFocus(p.focus); start(null, p.minutes, p.focus); }}>{p.label}</button>
            ))}
          </div>
          <div className="labform">
            <label>Minutes
              <input type="number" min="3" max="90" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 15)} />
            </label>
            <label>Focus
              <select value={focus} onChange={(e) => setFocus(e.target.value)}>
                {focusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>Client mode
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="inferred">Emotional / inferred</option>
                <option value="literal">Physical / literal</option>
              </select>
            </label>
            <button className="primary" onClick={() => start()}>Build plan &amp; start</button>
          </div>
          {history.length > 0 && (
            <div className="labhist">
              <h2 style={{ color: "var(--amber)", fontSize: 15 }}>Recent runs</h2>
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="histrow">
                  <span className="mono">{h.at.slice(0, 10)}</span>
                  <span>{h.minutes}m · {h.focus} · {h.mode}</span>
                  <span className="mono score">{h.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "run" && current && (
        <div>
          <div className="runhead">
            <div>
              <div className="runstep">Step {step + 1} / {plan.length} · {mode} mode</div>
              <h2 className="runname">{current.name}</h2>
            </div>
            <div className={"clock" + (left === 0 ? " done" : "")}>{mmss(left)}</div>
          </div>
          <ol className="prompter">
            {current.prompter.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
          <div className="labrow">
            <button className="chip" onClick={() => setRunning(!running)}>{running ? "Pause" : "Resume"}</button>
            <button className="primary" onClick={nextStep}>{step + 1 < plan.length ? "Next drill" : "Finish → debrief"}</button>
            <button className="chip" onClick={() => { setRunning(false); setPhase("plan"); }}>Abandon</button>
          </div>
          <p className="note">Plan: {plan.map((p, i) => `${i === step ? "▸" : ""}${p.name} ${p.mins}m`).join("  ·  ")}</p>
        </div>
      )}

      {phase === "debrief" && (
        <div>
          <h2 className="runname">Debrief — tick what you actually did</h2>
          {plan.map((p) => (
            <div key={p.id} className="debriefblock">
              <h3>{DRILLS[p.id].name}</h3>
              {DRILLS[p.id].check.map((c, i) => (
                <label key={i} className="checkline">
                  <input type="checkbox" checked={!!checks[`${p.id}:${i}`]} onChange={() => toggle(p.id, i)} /> {c}
                </label>
              ))}
            </div>
          ))}
          <div className="runhead">
            <div className="runname">Score: <span className="score">{scoreOf()}</span> / 100</div>
            <div className="labrow">
              <button className="primary" onClick={saveAttempt}>Save run</button>
              <button className="chip" onClick={() => start(plan)}>Re-run same plan</button>
            </div>
          </div>
          <p className="note">Misses become your next warm-up. Target: two clean 85+ runs before the real workshop.</p>
        </div>
      )}
    </article>
  );
}
