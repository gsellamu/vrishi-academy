"use client";
import React, { useState } from "react";
import Link from "next/link";
import caseData from "../../data/cases.json";

const CATS = Object.fromEntries(caseData.categories.map((c) => [c.id, c]));

function openSessionWindow(cs, cat) {
  const w = window.open("", "_blank", "width=700,height=900,scrollbars=yes,resizable=yes");
  if (!w) return;
  const lines = cs.session_script.map((p) => {
    if (!p) return '<div style="height:18px"></div>';
    const isNote = p.startsWith("[");
    return `<p style="font-size:16px;line-height:1.85;color:${isNote ? "#8b85a0" : "#e0dced"};margin:0 0 16px;font-style:${isNote ? "italic" : "normal"}">${p.replace(/</g, "&lt;")}</p>`;
  }).join("\n");
  w.document.write(`<!DOCTYPE html><html><head><title>${cs.id} - Full Session Script</title>
<style>body{background:#0e0d14;margin:0;padding:40px 48px 80px;font-family:Georgia,serif}
.hdr{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${cat?.color || "#7fb8d4"};margin-bottom:8px}
h1{font-weight:340;font-size:28px;color:#e9e4f2;margin:0 0 6px}
.sub{font-size:14px;color:#8b85a0;margin-bottom:32px}
.divider{border:none;border-top:1px solid #28243a;margin:28px 0}
@media print{body{background:#fff;color:#222;padding:20px}p{color:#222!important}}</style></head>
<body><div class="hdr">${cs.id} &middot; ${cat?.label || "Case"} &middot; Full Session Script</div>
<h1>${cs.title}</h1>
<div class="sub">${cs.client.name} &middot; ${cs.client.ep} &middot; ${cs.client.vak}</div>
${lines}</body></html>`);
  w.document.close();
}

export default function Cases() {
  const [activeCase, setActiveCase] = useState(null);
  const [tab, setTab] = useState("intake");
  const [sessionNum, setSessionNum] = useState(1);
  const c = activeCase ? caseData.cases.find((x) => x.id === activeCase) : null;
  const cat = c ? CATS[c.category] : null;
  const jp = c?.journey_plan || null;
  const availSessions = jp ? jp.sessions.filter((s) => s.status !== "not_built").map((s) => s.num) : [1];
  const activeScript = c ? (sessionNum === 1 ? c.session_script : c[`session_${sessionNum}_script`]) : null;

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Case Practice Sessions</span>
          <h1 style={{ margin: "8px 0 0" }}>Case <em>Library</em></h1>
        </div>
        {c && (
          <div className="seg">
            <button type="button" className={tab === "intake" ? "on" : ""} onClick={() => setTab("intake")}>Intake</button>
            <button type="button" className={tab === "plan" ? "on" : ""} onClick={() => setTab("plan")}>Session Plan</button>
            <button type="button" className={tab === "script" ? "on" : ""} onClick={() => setTab("script")}>Full Script</button>
            <button type="button" className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>Clinical Notes</button>
            {c.client_plan && <button type="button" className={tab === "clientplan" ? "on" : ""} onClick={() => setTab("clientplan")}>Client Plan</button>}
            {c.therapist_runbook && <button type="button" className={tab === "runbook" ? "on" : ""} onClick={() => setTab("runbook")}>Runbook</button>}
          </div>
        )}
      </div>

      {/* ═══════ CASE INDEX ═══════ */}
      {!c && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 960 }}>
          <p className="note">Realistic client scenarios with presenting issues, intake dialogues, session plans, and full delivery scripts. Practice the entire therapeutic arc from first contact to homework assignment.</p>

          {caseData.categories.map((cat) => {
            const cases = caseData.cases.filter((x) => x.category === cat.id);
            if (!cases.length) return (
              <div key={cat.id} className="panel" style={{ padding: "18px 22px", opacity: 0.5 }}>
                <div style={{ font: "560 15px var(--body)", color: cat.color }}>{cat.label}</div>
                <p className="note" style={{ margin: "8px 0 0" }}>Coming soon</p>
              </div>
            );
            return (
              <div key={cat.id}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: cat.color, marginBottom: 8 }}>{cat.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cases.map((cs) => (
                    <button key={cs.id} className="panel" style={{ padding: "16px 22px", cursor: "pointer", textAlign: "left", border: "none", borderLeft: `3px solid ${cat.color}` }}
                      onClick={() => { setActiveCase(cs.id); setTab("intake"); }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                        <div>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: cat.color, marginRight: 10 }}>{cs.id}</span>
                          <span style={{ font: "560 15px var(--body)", color: "#e9e4f2" }}>{cs.title}</span>
                        </div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--mist)", whiteSpace: "nowrap" }}>{cs.difficulty}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#8b85a0", margin: "8px 0 0", lineHeight: 1.5 }}>&ldquo;{cs.presenting}&rdquo;</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ ACTIVE CASE ═══════ */}
      {c && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <button type="button" className="ghost" style={{ marginBottom: 8, fontSize: 12 }} onClick={() => setActiveCase(null)}>&larr; Back to cases</button>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: cat?.color, letterSpacing: ".12em", textTransform: "uppercase" }}>{c.id} &middot; {cat?.label}</div>
              <h2 style={{ font: "340 28px/1.1 var(--display)", margin: "6px 0 0" }}>{c.title}</h2>
            </div>
            <div className="panel" style={{ padding: "12px 16px", minWidth: 220 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 8 }}>Client Profile</div>
              <div style={{ fontSize: 13, color: "#cfc9dd", lineHeight: 1.6 }}>
                <div><b>{c.client.name}</b> &middot; {c.client.age} &middot; {c.client.occupation}</div>
                <div style={{ color: cat?.color }}>{c.client.ep} &middot; {c.client.vak}</div>
              </div>
            </div>
          </div>

          {/* Presenting issue quote */}
          <div className="panel" style={{ padding: "18px 22px", borderLeft: `3px solid ${cat?.color}` }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: cat?.color, marginBottom: 8 }}>Presenting Issue</div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "#e9e4f2", fontStyle: "italic", margin: 0 }}>&ldquo;{c.presenting}&rdquo;</p>
          </div>

          {/* ── INTAKE TAB ── */}
          {tab === "intake" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(250px, 340px)", gap: 18, alignItems: "start" }}>
              {/* Dialogue */}
              <div className="panel" style={{ padding: "18px 22px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--iris)", marginBottom: 14 }}>Intake Conversation</div>
                {(c.intake_dialogue || []).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: line.role === "therapist" ? "var(--teal)" : cat?.color, minWidth: 65, paddingTop: 2 }}>
                      {line.role === "therapist" ? "You" : "Client"}
                    </span>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: line.role === "therapist" ? "var(--teal)" : "#e0dced", margin: 0 }}>{line.text}</p>
                  </div>
                ))}
              </div>
              {/* Client history sidebar */}
              <div className="panel" style={{ padding: "16px 18px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 10 }}>History</div>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "#8b85a0", margin: 0 }}>{c.client.history}</p>
              </div>
            </div>
          )}

          {/* ── SESSION PLAN TAB ── */}
          {tab === "plan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="panel" style={{ padding: "18px 22px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--teal)", marginBottom: 10 }}>Pre-Talk Focus</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "#cfc9dd", margin: 0 }}>{c.session_plan.pretalk_focus}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="panel" style={{ padding: "16px 18px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 10 }}>Induction</div>
                  <p style={{ fontSize: 14, color: "#cfc9dd", margin: 0 }}>{c.session_plan.induction}</p>
                </div>
                <div className="panel" style={{ padding: "16px 18px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#5bb89a", marginBottom: 10 }}>Deepeners</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#cfc9dd", lineHeight: 1.6 }}>
                    {c.session_plan.deepeners.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              </div>
              <div className="panel" style={{ padding: "18px 22px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--iris)", marginBottom: 10 }}>Therapeutic Interventions</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.session_plan.therapy.map((t, i) => (
                    <li key={i} style={{ fontSize: 14, lineHeight: 1.65, color: "#cfc9dd" }}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="panel" style={{ padding: "16px 18px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ok)", marginBottom: 10 }}>Count Out</div>
                <p style={{ fontSize: 14, color: "#cfc9dd", margin: 0 }}>{c.session_plan.countout}</p>
              </div>
              {/* Journey Plan Overview */}
              {jp && (
                <div className="panel" style={{ padding: "18px 22px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: cat?.color, marginBottom: 12 }}>8-Session Treatment Arc</div>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 80px", gap: "4px 10px", fontSize: 12, color: "#cfc9dd" }}>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 10 }}>#</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 10 }}>Focus</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 10 }}>Key Techniques</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 10 }}>Status</div>
                    {jp.sessions.map((s) => (
                      <React.Fragment key={s.num}>
                        <div style={{ color: cat?.color, fontFamily: "var(--mono)" }}>{s.num}</div>
                        <div>{s.title}</div>
                        <div style={{ fontSize: 11, color: "#8b85a0" }}>{(s.techniques || []).slice(0, 3).join(", ")}{(s.techniques || []).length > 3 ? "..." : ""}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: s.status === "completed" ? "var(--ok)" : s.status === "script_ready" ? "var(--amber)" : "var(--dim)" }}>{s.status.replace("_", " ")}</div>
                      </React.Fragment>
                    ))}
                  </div>
                  {/* SMART Goals */}
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--amber)", marginTop: 16, marginBottom: 8 }}>SMART Goals</div>
                  <div style={{ display: "grid", gridTemplateColumns: "120px repeat(4, 1fr)", gap: "2px 8px", fontSize: 11 }}>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>Metric</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>Baseline</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>S2 Target</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>S4 Target</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>Graduation</div>
                    {Object.entries(jp.smart_goals).map(([key, vals]) => (
                      <React.Fragment key={key}>
                        <div style={{ color: "#cfc9dd" }}>{key.replace(/_/g, " ")}</div>
                        <div style={{ color: "var(--red)" }}>{vals.baseline}</div>
                        <div style={{ color: "var(--amber)" }}>{vals.s2}</div>
                        <div style={{ color: "var(--iris)" }}>{vals.s4}</div>
                        <div style={{ color: "var(--ok)" }}>{vals.graduation}</div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Practice drills link */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/lab" className="primary" style={{ padding: "10px 18px", fontSize: 13, textDecoration: "none", display: "inline-block", borderRadius: 8 }}>
                  Open Practice Lab &rarr;
                </Link>
                <span className="note" style={{ margin: "auto 0" }}>Drills: {c.practice_drills.join(", ")}</span>
              </div>
            </div>
          )}

          {/* ── FULL SCRIPT TAB ── */}
          {tab === "script" && (
            <div className="panel" style={{ padding: "22px 26px", maxHeight: "70vh", overflowY: "auto", borderLeft: `3px solid ${cat?.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {availSessions.length > 1 && (
                    <div className="seg" style={{ marginRight: 6 }}>
                      {availSessions.map((sn) => (
                        <button key={sn} type="button" className={sessionNum === sn ? "on" : ""} onClick={() => setSessionNum(sn)} style={{ fontSize: 11, padding: "4px 10px" }}>S{sn}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: cat?.color }}>
                    Session {sessionNum} Script &middot; {c.id} &middot; {(activeScript || []).length} paragraphs
                  </div>
                </div>
                <button type="button" className="chip" onClick={() => {
                  const scriptData = { ...c, session_script: activeScript || c.session_script };
                  openSessionWindow(scriptData, cat);
                }} style={{ fontSize: 11 }}>Open in Session Window</button>
              </div>
              {(activeScript || c.session_script || []).map((para, i) => {
                if (!para) return <div key={i} style={{ height: 16 }} />;
                const isNote = para.startsWith("[");
                return (
                  <p key={i} style={{ fontSize: 14.5, lineHeight: 1.75, color: isNote ? "var(--mist)" : "#e0dced", margin: "0 0 14px", fontStyle: isNote ? "italic" : "normal" }}>{para}</p>
                );
              })}
              {!activeScript && sessionNum > 1 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--mist)" }}>Session {sessionNum} script not yet built. Check the journey plan for the outline.</div>
              )}
            </div>
          )}

          {/* ── CLINICAL NOTES TAB ── */}
          {tab === "notes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries(c.clinical_notes).map(([key, value]) => (
                <div key={key} className="panel" style={{ padding: "16px 20px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 8 }}>
                    {key.replace(/_/g, " ")}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "#cfc9dd", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── CLIENT PLAN TAB ── */}
          {tab === "clientplan" && c.client_plan && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="info-bar">
                <div><div className="info-label" style={{ color: "var(--teal)" }}>For</div><div className="info-text">Client &middot; shareable &middot; no scripts or clinical details</div></div>
                <div><div className="info-label" style={{ color: "var(--amber)" }}>Goal</div><div className="info-text">Set expectations, show the arc, define commitments</div></div>
              </div>

              <div className="panel" style={{ padding: "18px 22px" }}>
                <h2 style={{ font: "340 24px/1.1 var(--display)", margin: "0 0 6px" }}>{c.client_plan.title}</h2>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "#cfc9dd" }}>{c.client_plan.overview}</p>
              </div>

              <div className="panel" style={{ padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 10 }}>Your Commitments</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "#cfc9dd" }}>
                  {c.client_plan.your_commitment.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              {c.client_plan.sessions.map((s) => (
                <div key={s.num} className="panel" style={{ padding: "14px 18px", borderLeft: `3px solid ${s.status === "completed" ? "var(--ok)" : s.status === "contingency" ? "var(--dim)" : "var(--amber)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ font: "560 14px var(--body)", color: "#e9e4f2" }}>Session {s.num}: {s.title}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: s.status === "completed" ? "var(--ok)" : s.status === "contingency" ? "var(--dim)" : "var(--amber)" }}>{s.status}{s.date ? ` (${s.date})` : ""}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "#cfc9dd", margin: "0 0 6px" }}>{s.what_you_will_experience}</p>
                  <div style={{ fontSize: 12, color: "#8b85a0" }}><b>Takeaway:</b> {s.your_takeaway}</div>
                  {s.target_outcome && <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>Target: {s.target_outcome}</div>}
                </div>
              ))}

              {c.client_plan.measurement && (
                <div className="panel" style={{ padding: "16px 20px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ok)", marginBottom: 10 }}>How We Measure Progress</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 12px", fontSize: 12, marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>Metric</div>
                    <div style={{ fontWeight: 600, color: "var(--red)", fontSize: 9 }}>Baseline</div>
                    <div style={{ fontWeight: 600, color: "var(--ok)", fontSize: 9 }}>Graduation</div>
                    {Object.entries(c.client_plan.measurement.your_baseline).map(([key, val]) => (
                      <React.Fragment key={key}>
                        <div style={{ color: "#cfc9dd" }}>{key.replace(/_/g, " ")}</div>
                        <div style={{ color: "var(--red)" }}>{val}</div>
                        <div style={{ color: "var(--ok)" }}>{c.client_plan.measurement.graduation_targets[key]}</div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RUNBOOK TAB ── */}
          {tab === "runbook" && c.therapist_runbook && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="info-bar">
                <div><div className="info-label" style={{ color: "var(--red)" }}>Access</div><div className="info-text">THERAPIST ONLY &mdash; do not share with client</div></div>
                <div><div className="info-label" style={{ color: "var(--iris)" }}>Purpose</div><div className="info-text">Execution guide, checklists, decision trees, drift tracking</div></div>
              </div>

              {/* Pre-Session Checklist */}
              <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--amber)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 10 }}>Pre-Session Checklist</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: "#cfc9dd" }}>
                  {c.therapist_runbook.pre_session_checklist.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              {/* Per-Session Guides */}
              {Object.entries(c.therapist_runbook.session_execution.sessions).map(([sKey, sVal]) => (
                <div key={sKey} className="panel" style={{ padding: "14px 18px", borderLeft: `3px solid ${sVal.status === "COMPLETED" ? "var(--ok)" : sVal.status === "SCRIPT READY" ? "var(--iris)" : sVal.status === "CONTINGENCY" ? "var(--dim)" : "var(--amber)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ font: "560 14px var(--body)", color: "#e9e4f2" }}>{sKey}: {sVal.focus}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: sVal.status === "COMPLETED" ? "var(--ok)" : "var(--amber)" }}>{sVal.status}</span>
                  </div>
                  {sVal.duration_split && <div style={{ fontSize: 11, color: "var(--amber)", marginBottom: 4 }}>{sVal.duration_split}</div>}
                  {sVal.critical_notes && (
                    <ul style={{ margin: "6px 0", paddingLeft: 16, fontSize: 11, color: "var(--red)", lineHeight: 1.5 }}>
                      {sVal.critical_notes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  )}
                  {sVal.decision_points && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--iris)", marginBottom: 4 }}>DECISION POINTS</div>
                      {sVal.decision_points.map((dp, i) => (
                        <div key={i} style={{ fontSize: 11, color: "#8b85a0", marginBottom: 2 }}>IF {dp.split(": ")[0]?.replace("IF ", "")} → <span style={{ color: "var(--ok)" }}>{dp.split(": ").slice(1).join(": ") || dp}</span></div>
                      ))}
                    </div>
                  )}
                  {sVal.target_metrics && (
                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                      {Object.entries(sVal.target_metrics).map(([k, v]) => (
                        <span key={k} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ok)", background: "rgba(91,184,154,.08)", padding: "2px 8px", borderRadius: 3 }}>{k}: {v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Post-Session Checklist */}
              <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--teal)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--teal)", marginBottom: 10 }}>Post-Session Checklist</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: "#cfc9dd" }}>
                  {c.therapist_runbook.post_session_checklist.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              {/* Drift Tracking */}
              {c.therapist_runbook.drift_tracking && (
                <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--iris)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--iris)", marginBottom: 10 }}>Drift Tracking (Planned vs Actual)</div>
                  <p style={{ fontSize: 12, color: "#8b85a0", margin: "0 0 10px" }}>{c.therapist_runbook.drift_tracking.purpose}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 70px 70px 70px 60px", gap: "2px 8px", fontSize: 11 }}>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>Metric</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>S1 Actual</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>S2 Planned</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>S2 Actual</div>
                    <div style={{ fontWeight: 600, color: "var(--mist)", fontSize: 9 }}>Drift</div>
                    {c.therapist_runbook.drift_tracking.metrics_to_track.map((m, i) => (
                      <React.Fragment key={i}>
                        <div style={{ color: "#cfc9dd" }}>{m.metric}</div>
                        <div style={{ color: "var(--red)" }}>{m.s1_actual}</div>
                        <div style={{ color: "var(--amber)" }}>{m.s2_planned}</div>
                        <div style={{ color: m.s2_actual === "TBD" ? "var(--dim)" : "var(--ok)" }}>{m.s2_actual}</div>
                        <div style={{ color: m.drift === "TBD" ? "var(--dim)" : "var(--ok)" }}>{m.drift}</div>
                      </React.Fragment>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: "var(--red)", marginTop: 8 }}>{c.therapist_runbook.drift_tracking.review_cadence}</p>
                </div>
              )}

              {/* General Execution Notes */}
              <div className="panel" style={{ padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 10 }}>General Execution Notes</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: "#cfc9dd" }}>
                  {c.therapist_runbook.session_execution.general.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
