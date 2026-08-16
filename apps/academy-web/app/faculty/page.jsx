"use client";
import { useState } from "react";

/* ── inline data ── */
const PANEL = [
  { initials: "DD", name: "Denise Delahoussaye", spec: "Lead examiner \u00b7 PSR", color: "#8b7fd4" },
  { initials: "BB", name: "Bruce Bonnett", spec: "Child & anxiety cases", color: "#2dd4bf" },
  { initials: "JK", name: "Dr. Kappas (method)", spec: "E/P theory & suggestibility", color: "#e0a458" },
];

const CONF_MSGS = [
  { who: "DD", text: "Marcus is 72% physical with presentation anxiety. Start literal \u2014 body convincers before any imagery, or you\u2019ll lose him in abstraction." },
  { who: "JK", text: "Agreed. His anxiety is situational, not characterological \u2014 a vocational goal. Frame the fight/flight response in daily-life terms during Theory of Mind." },
  { who: "BB", text: "Give him a felt win early. An arm-rigidity challenge that he can\u2019t beat is worth ten reassurances for a physical suggestible." },
  { who: "DD", text: "For therapy: Say-See-Feel, but land the See on a real upcoming presentation. Rehearse the walk to the podium, then anchor the calm to the first slide." },
];

const TAKEAWAYS = [
  "Open literal; earn a body convincer before imagery.",
  "Theory of Mind in daily-life fight/flight terms.",
  "Situational rehearsal on a real upcoming talk.",
  "Anchor calm to a concrete cue (first slide).",
];

const EXAM_MSGS = [
  { who: "DD", role: "examiner", text: "Walk me through your pre-talk for Marcus. What do you cover in the first five minutes?" },
  { who: "You", role: "student", text: "I\u2019d start with rapport \u2014 confirm his name, occupation, verify the presenting issue is presentation anxiety. Then I explain what hypnosis is and isn\u2019t, cover the four brain-wave states, and set expectations for today\u2019s session." },
  { who: "DD", role: "examiner", text: "Good structure. Now, how would you determine his suggestibility, and what test would you use first?" },
  { who: null, role: "checkpoint", label: "Rubric checkpoint", text: "Pre-talk: rapport + brain-wave explanation \u2014 partial credit. Missing: consent language." },
];

const RUBRIC = [
  { name: "Pre-talk & consent", status: "done" },
  { name: "Theory of Mind", status: "done" },
  { name: "Suggestibility testing", status: "partial" },
  { name: "Arm-raising + PHS", status: "partial" },
  { name: "Deepeners", status: "pending" },
  { name: "Say-See-Feel therapy", status: "pending" },
  { name: "Count-out & verify", status: "pending" },
];

const COHORT = [
  { name: "Ana Reyes", ready: "92%", color: "var(--ok)", mock: "89", reps: "6/24" },
  { name: "Jeeth S.", ready: "78%", color: "var(--amber)", mock: "82", reps: "0/24" },
  { name: "Tom Frey", ready: "71%", color: "var(--amber)", mock: "74", reps: "2/24" },
  { name: "Priya N.", ready: "64%", color: "var(--red)", mock: "68", reps: "1/24" },
  { name: "Marcus L.", ready: "58%", color: "var(--red)", mock: "61", reps: "0/24" },
  { name: "Dana Ok.", ready: "85%", color: "var(--ok)", mock: "86", reps: "4/24" },
];

const REPS_VERIFY = [
  { student: "Ana Reyes", drill: "Arm-raising + PHS", when: "2h ago" },
  { student: "Tom Frey", drill: "Pre-talk consent", when: "5h ago" },
  { student: "Dana Ok.", drill: "Count-out sequence", when: "1d ago" },
];

const AUDIT = [
  { when: "Aug 14, 09:12", event: "Ana Reyes mock graded 89 by DD" },
  { when: "Aug 13, 16:40", event: "Tom Frey rep flagged \u2014 missing PHS cue" },
  { when: "Aug 13, 11:05", event: "Jeeth S. case conference opened (Marcus)" },
  { when: "Aug 12, 14:22", event: "Dana Ok. mock graded 86 by BB" },
];

const TABS = ["Case Conference", "Mock PSR Exam", "Faculty Console"];

/* ── helpers ── */
function panelMember(p) {
  return PANEL.find((m) => m.initials === p) || PANEL[0];
}

const statusIcon = (s) => s === "done" ? "\u2713" : s === "partial" ? "\u25d1" : "\u25cb";
const statusColor = (s) => s === "done" ? "var(--ok)" : s === "partial" ? "var(--amber)" : "var(--dim)";

/* ── component ── */
export default function Faculty() {
  const [tab, setTab] = useState(0);

  return (
    <article>
      {/* header */}
      <span className="eyebrow">Faculty \u00b7 AI panel + examination</span>
      <h1>Faculty <em>Room</em></h1>

      {/* 4-column info grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18,
        marginBottom: 24, maxWidth: 900,
      }}>
        {[
          { label: "What", value: "AI faculty panel simulating HMI case conferences, PSR mock exams, and cohort oversight." },
          { label: "Why", value: "Build exam confidence with realistic feedback before the real PSR certification." },
          { label: "How", value: "Three AI panelists debate cases; a mock examiner scores you against the 7-item rubric." },
          { label: "Value", value: "Unlimited practice exams with instant rubric scoring \u2014 no scheduling, no waiting." },
        ].map((item) => (
          <div key={item.label} style={{
            background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--r-md)",
            padding: "14px 16px",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em",
              textTransform: "uppercase", color: "var(--iris)", marginBottom: 6,
            }}>{item.label}</div>
            <div style={{ fontSize: 13, color: "#cfc9dd", lineHeight: 1.55 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* segmented tab control */}
      <div className="seg" style={{ marginBottom: 24, alignSelf: "flex-start" }}>
        {TABS.map((t, i) => (
          <button key={t} type="button" className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* ════════════ TAB 1: Case Conference ════════════ */}
      {tab === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 340px", gap: 22, alignItems: "start" }}>
          {/* left: chat feed */}
          <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
            }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)" }}>Case Conference</div>
                <div style={{ fontSize: 14, color: "var(--ink)", marginTop: 2 }}>Marcus \u00b7 72% physical \u00b7 presentation anxiety</div>
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, color: "var(--amber)",
                border: "1px solid rgba(224,164,88,.4)", borderRadius: "var(--r-pill)",
                padding: "4px 12px",
              }}>LIVE</div>
            </div>

            <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              {CONF_MSGS.map((msg, i) => {
                const m = panelMember(msg.who);
                return (
                  <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      display: "grid", placeItems: "center",
                      fontFamily: "var(--mono)", fontSize: 13, color: "var(--void)",
                      background: m.color,
                    }}>{m.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
                        textTransform: "uppercase", color: m.color, marginBottom: 4,
                      }}>{m.name}</div>
                      <div style={{
                        background: "var(--panel-2)", border: "1px solid var(--line)",
                        borderRadius: "12px", padding: "11px 14px",
                        fontSize: 14.5, lineHeight: 1.55, color: "#d8d3e6",
                      }}>{msg.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* input bar */}
            <div style={{
              display: "flex", gap: 8, padding: "14px 18px",
              borderTop: "1px solid var(--line)", background: "var(--panel-2)",
            }}>
              <input
                type="text"
                placeholder="Ask the panel about this case..."
                readOnly
                style={{
                  flex: 1, background: "var(--void)", color: "var(--ink)",
                  border: "1px solid var(--line)", borderRadius: 8,
                  padding: "10px 14px", font: "400 14px var(--body)",
                }}
              />
              <button type="button" className="primary">Ask</button>
            </div>
          </div>

          {/* right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* The Panel card */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--mist)", marginBottom: 12,
              }}>The Panel</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {PANEL.map((p) => (
                  <div key={p.initials} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      display: "grid", placeItems: "center",
                      fontFamily: "var(--mono)", fontSize: 12, color: "var(--void)",
                      background: p.color,
                    }}>{p.initials}</div>
                    <div>
                      <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--mist)" }}>{p.spec}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consensus Takeaways card */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--amber)", marginBottom: 12,
              }}>Consensus Takeaways</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {TAKEAWAYS.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13.5, color: "#cfc9dd", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--ok)", flexShrink: 0 }}>{"\u2713"}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB 2: Mock PSR Exam ════════════ */}
      {tab === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 340px", gap: 22, alignItems: "start" }}>
          {/* left: examiner chat + timer */}
          <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
            }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist)" }}>Mock PSR Exam</div>
                <div style={{ fontSize: 14, color: "var(--ink)", marginTop: 2 }}>Examiner: Denise Delahoussaye</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="clock" style={{ fontSize: 28 }}>28:14</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)", letterSpacing: ".08em" }}>OF 50:00</div>
              </div>
            </div>

            <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              {EXAM_MSGS.map((msg, i) => {
                if (msg.role === "checkpoint") {
                  return (
                    <div key={i} style={{
                      alignSelf: "stretch", display: "flex", alignItems: "center", gap: 10,
                      border: "1px solid rgba(224,164,88,.28)", borderRadius: 10,
                      padding: "9px 14px", background: "rgba(224,164,88,.07)",
                    }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", letterSpacing: ".06em", fontWeight: 400 }}>{msg.label}</span>
                      <span style={{ fontSize: 13, color: "var(--mist)" }}>{msg.text}</span>
                    </div>
                  );
                }
                const isStudent = msg.role === "student";
                const m = isStudent ? null : panelMember(msg.who);
                return (
                  <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    flexDirection: isStudent ? "row-reverse" : "row",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      display: "grid", placeItems: "center",
                      fontFamily: "var(--mono)", fontSize: 13,
                      color: isStudent ? "#fff" : "var(--void)",
                      background: isStudent ? "var(--line-2)" : m.color,
                    }}>{isStudent ? "You" : m.initials}</div>
                    <div style={{
                      maxWidth: "85%",
                      background: isStudent ? "#1d2430" : "var(--panel-2)",
                      border: isStudent ? "1px solid #2b3648" : "1px solid var(--line)",
                      borderRadius: isStudent ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                      padding: "11px 14px", fontSize: 14.5, lineHeight: 1.55,
                      color: isStudent ? "#d9e2ef" : "#d8d3e6",
                    }}>
                      {!isStudent && (
                        <div style={{
                          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
                          textTransform: "uppercase", color: m.color, marginBottom: 4,
                        }}>{m.name}</div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* input bar */}
            <div style={{
              display: "flex", gap: 8, alignItems: "center", padding: "14px 18px",
              borderTop: "1px solid var(--line)", background: "var(--panel-2)",
            }}>
              <button type="button" className="primary">Respond</button>
              <span style={{ fontSize: 12.5, color: "var(--mist)" }}>
                press <span className="kbd">Space</span> to continue
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" className="ghost">End exam</button>
            </div>
          </div>

          {/* right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Live score card */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--mist)", marginBottom: 12,
              }}>Live Score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 38, color: "var(--amber)", lineHeight: 1 }}>72</span>
                <span style={{ fontSize: 13, color: "var(--mist)" }}>/ 100</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mist)", marginBottom: 6 }}>
                <span>Current</span>
                <span>Pass line: 85</span>
              </div>
              <div className="progress">
                <span style={{
                  width: "72%",
                  background: "linear-gradient(90deg, var(--iris), var(--amber))",
                }} />
              </div>
              <div style={{
                position: "relative", height: 12, marginTop: -8,
              }}>
                <div style={{
                  position: "absolute", left: "85%", top: 0,
                  width: 2, height: 12, background: "var(--ok)", opacity: 0.7,
                }} />
              </div>
            </div>

            {/* Rubric live card */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--amber)", marginBottom: 12,
              }}>Rubric Live</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {RUBRIC.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "center",
                    fontSize: 13.5, color: r.status === "pending" ? "var(--dim)" : "#cfc9dd",
                  }}>
                    <span style={{
                      width: 20, textAlign: "center", flexShrink: 0,
                      color: statusColor(r.status), fontSize: 14,
                    }}>{statusIcon(r.status)}</span>
                    <span>{r.name}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: statusColor(r.status) }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB 3: Faculty Console ════════════ */}
      {tab === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 340px", gap: 22, alignItems: "start" }}>
          {/* left: cohort table */}
          <div className="panel" style={{ overflow: "hidden" }}>
            <div style={{
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
              fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
              textTransform: "uppercase", color: "var(--mist)",
            }}>Cohort Readiness</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--amber)" }}>
                  {["Student", "Readiness", "Last Mock", "Real Reps"].map((h) => (
                    <th key={h} style={{
                      textAlign: "left", fontWeight: 650, padding: "10px 18px",
                      fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase",
                      color: "var(--ink)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COHORT.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 18px", color: "var(--ink)", fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: "12px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          flex: 1, height: 7, borderRadius: 4,
                          background: "var(--line)", overflow: "hidden", maxWidth: 120,
                        }}>
                          <div style={{
                            width: s.ready, height: "100%",
                            background: s.color, borderRadius: 4,
                          }} />
                        </div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: s.color }}>{s.ready}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 18px", fontFamily: "var(--mono)", color: parseInt(s.mock) >= 85 ? "var(--ok)" : "var(--amber)" }}>{s.mock}</td>
                    <td style={{ padding: "12px 18px", fontFamily: "var(--mono)", color: "var(--mist)" }}>{s.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Reps to verify card */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--amber)", marginBottom: 12,
              }}>Reps to Verify</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {REPS_VERIFY.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    paddingBottom: i < REPS_VERIFY.length - 1 ? 12 : 0,
                    borderBottom: i < REPS_VERIFY.length - 1 ? "1px solid var(--line)" : "none",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{r.student}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)" }}>{r.when}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--mist)" }}>{r.drill}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="chip" style={{ padding: "5px 12px", fontSize: 12 }}>Verify</button>
                      <button type="button" className="ghost" style={{ padding: "5px 12px", fontSize: 12 }}>Flag</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit trail card */}
            <div className="panel" style={{ padding: 18 }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
                textTransform: "uppercase", color: "var(--mist)", marginBottom: 12,
              }}>Audit Trail</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {AUDIT.map((a, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "baseline", fontSize: 12.5,
                    paddingBottom: 8,
                    borderBottom: i < AUDIT.length - 1 ? "1px solid var(--line)" : "none",
                  }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)", flexShrink: 0, minWidth: 100 }}>{a.when}</span>
                    <span style={{ color: "#cfc9dd" }}>{a.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
