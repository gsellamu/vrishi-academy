"use client";
import { useState } from "react";
/* ================================================================
   Safety & Ethics — pre-session gate, contraindications, abreaction
   Interactive checklist with gate clearance logic.
   ================================================================ */

const INIT_GATES = [
  { id: "consent", label: "Informed consent signed", req: true, def: true },
  { id: "intake", label: "Intake & health-appraisal reviewed", req: true, def: true },
  { id: "contra", label: "Contraindication screen clear", req: true, def: true },
  { id: "si", label: "Suicidal-ideation screen clear", req: true, def: true },
  { id: "medical", label: "Physician coordination consent (meds / health flag)", req: false, def: false },
  { id: "referral", label: "Written referral on file (referral lane)", req: false, def: false },
  { id: "guardian", label: "Guardian consent & presence (minor)", req: false, def: false },
  { id: "scope", label: "Goal within scope of practice", req: true, def: true },
];

const CONTRA = [
  "Epilepsy / seizure", "Active psychosis", "Active suicidal ideation",
  "On psychiatric meds (no MD sign-off)", "Under influence", "Dissociative disorder",
];

const ABREACTION = [
  { n: "1", text: "Stay calm; keep a steady, low voice \u2014 the client takes their cue from you." },
  { n: "2", text: "Reassure safety and control: \u201Cyou are safe, you are in my office, you are in control\u201D." },
  { n: "3", text: "Reframe the release as healthy; guide to a calm, detached observer position." },
  { n: "4", text: "Ground and re-orient, count out gently, debrief \u2014 and note it for supervision." },
];

export default function Safety() {
  const [checked, setChecked] = useState(() => {
    const m = {};
    INIT_GATES.forEach((g) => { m[g.id] = g.def; });
    return m;
  });

  const toggle = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const reqCount = INIT_GATES.filter((g) => g.req).length;
  const reqDone = INIT_GATES.filter((g) => g.req && checked[g.id]).length;
  const allReqCleared = reqDone === reqCount;

  const gateColor = allReqCleared ? "var(--ok)" : "var(--amber)";
  const gateBorder = allReqCleared ? "rgba(127,185,138,.4)" : "rgba(224,164,88,.4)";
  const gateBg = allReqCleared ? "rgba(127,185,138,.08)" : "rgba(224,164,88,.06)";

  return (
    <article>
      <span className="eyebrow">Clinical safety &middot; scope of practice</span>
      <h1>Safety &amp; <em>Ethics</em></h1>

      {/* what / why / how / value */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", marginBottom: 22,
      }}>
        {[
          { k: "What", c: "var(--teal)", t: "The pre-session gate, contraindication screen, abreaction protocol, and supervisor sign-off." },
          { k: "Why", c: "var(--iris)", t: "Scope of practice and client safety are what make this fit for a clinic and a classroom." },
          { k: "How", c: "var(--amber)", t: "Clear each gate item before a session unlocks; flag contraindications to refer out." },
          { k: "Value", c: "var(--ok)", t: "Protects the client, the student, and the school \u2014 table stakes for institutional adoption." },
        ].map((b) => (
          <div key={b.k} style={{ background: "var(--panel)", padding: "13px 16px" }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em",
              textTransform: "uppercase", color: b.c, marginBottom: 5,
            }}>{b.k}</div>
            <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45 }}>{b.t}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px",
        gap: 20, alignItems: "start",
      }}>
        {/* gate checklist */}
        <section style={{
          border: "1px solid var(--line)", borderRadius: 16,
          background: "var(--panel)", padding: 20,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 14,
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--amber)",
            }}>Pre-session gate</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--mist)" }}>
              tap to clear &middot; required marked *
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {INIT_GATES.map((g) => {
              const on = !!checked[g.id];
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 11, width: "100%",
                    padding: "11px 13px", borderRadius: 10, cursor: "pointer",
                    font: "400 13.5px var(--body)",
                    border: `1px solid ${on ? "rgba(127,185,138,.45)" : "var(--line)"}`,
                    background: on ? "rgba(127,185,138,.08)" : "var(--panel-2)",
                    color: on ? "var(--ink)" : "var(--mist)",
                  }}
                >
                  <span style={{ fontFamily: "var(--mono)", fontSize: 14, flex: "none" }}>
                    {on ? "\u2713" : "\u25CB"}
                  </span>
                  <span style={{ textAlign: "left", flex: 1 }}>{g.label}</span>
                  {g.req && <span style={{ color: "var(--amber)", flex: "none" }}>*</span>}
                </button>
              );
            })}
          </div>

          {/* gate verdict */}
          <div style={{
            marginTop: 16, padding: "13px 15px",
            border: `1px solid ${gateBorder}`, borderRadius: 12,
            background: gateBg, display: "flex", alignItems: "center", gap: 11,
          }}>
            <span style={{ fontSize: 18 }}>{allReqCleared ? "\u2713" : "\u26A0"}</span>
            <div>
              <div style={{ font: "600 14px var(--body)", color: gateColor }}>
                {allReqCleared ? "Cleared to proceed" : "Gate not cleared"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--mist)" }}>
                {allReqCleared
                  ? "All required checks complete \u2014 session may begin."
                  : "Complete the required (*) checks to unlock the session."}
              </div>
            </div>
          </div>
        </section>

        {/* contraindications + abreaction + signoff */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* contraindications */}
          <div style={{
            border: "1px solid var(--line)", borderLeft: "3px solid var(--red)",
            borderRadius: 14, background: "var(--panel)", padding: 18,
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--red)", marginBottom: 10,
            }}>Contraindications &middot; refer out</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {CONTRA.map((c) => (
                <span key={c} style={{
                  fontSize: 12, color: "#e6c9c5",
                  border: "1px solid rgba(224,104,94,.35)",
                  borderRadius: 999, padding: "4px 11px",
                }}>{c}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--mist)", lineHeight: 1.45, marginTop: 11 }}>
              Any flag &rarr; do not induce; refer to a licensed provider and note it in the file.
            </div>
          </div>

          {/* abreaction protocol */}
          <div style={{
            border: "1px solid var(--line)", borderLeft: "3px solid var(--amber)",
            borderRadius: 14, background: "var(--panel)", padding: 18,
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--amber)", marginBottom: 10,
            }}>Abreaction protocol</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ABREACTION.map((a) => (
                <div key={a.n} style={{
                  display: "flex", gap: 9, alignItems: "flex-start",
                  fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45,
                }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11,
                    color: "var(--amber)", flex: "none",
                  }}>{a.n}</span>
                  {a.text}
                </div>
              ))}
            </div>
          </div>

          {/* supervisor sign-off */}
          <div style={{
            border: "1px solid var(--line)", borderRadius: 14,
            background: "linear-gradient(180deg, var(--raise), var(--panel))",
            padding: 18,
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--teal)", marginBottom: 8,
            }}>Supervisor sign-off</div>
            <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45 }}>
              Referral-lane and minor sessions require faculty co-sign before and after.
            </div>
            <button type="button" style={{
              marginTop: 12, width: "100%", background: "transparent",
              color: "var(--ink)", border: "1px solid var(--line-2)",
              borderRadius: 10, padding: 10, font: "500 13px var(--body)", cursor: "pointer",
            }}>
              Request supervisor review &rarr;
            </button>
          </div>
        </aside>
      </div>
    </article>
  );
}
