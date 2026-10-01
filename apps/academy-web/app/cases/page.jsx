"use client";
import { useState } from "react";
import Link from "next/link";
import caseData from "../../data/cases.json";

const CATS = Object.fromEntries(caseData.categories.map((c) => [c.id, c]));

export default function Cases() {
  const [activeCase, setActiveCase] = useState(null);
  const [tab, setTab] = useState("intake");
  const c = activeCase ? caseData.cases.find((x) => x.id === activeCase) : null;
  const cat = c ? CATS[c.category] : null;

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
                {c.intake_dialogue.map((line, i) => (
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
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: cat?.color, marginBottom: 18 }}>Full Session Script &middot; {c.id}</div>
              {c.session_script.map((para, i) => {
                if (!para) return <div key={i} style={{ height: 16 }} />;
                const isNote = para.startsWith("[");
                return (
                  <p key={i} style={{ fontSize: 14.5, lineHeight: 1.75, color: isNote ? "var(--mist)" : "#e0dced", margin: "0 0 14px", fontStyle: isNote ? "italic" : "normal" }}>{para}</p>
                );
              })}
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
        </div>
      )}
    </article>
  );
}
