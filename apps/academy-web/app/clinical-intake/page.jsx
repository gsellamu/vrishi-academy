"use client";
import { useState } from "react";
import Link from "next/link";

/* ================================================================
   VRishi Academy -- Clinical Intake
   Full first-session assessment: concern, history, goal, health,
   and a mental-status exam that derives E/P profile + rep-system.
   ================================================================ */

/* ---------- helpers ---------- */
const S = {
  card: {
    border: "1px solid var(--line)", borderRadius: 16,
    background: "var(--panel)", overflow: "hidden", marginBottom: 18,
  },
  cardHead: (color = "var(--amber)") => ({
    padding: "11px 18px", fontFamily: "var(--mono)", fontSize: 11,
    letterSpacing: ".1em", textTransform: "uppercase", color,
    borderBottom: "1px solid var(--line)", background: "var(--panel-2)",
  }),
  cardBody: { padding: "18px 18px 20px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  label: {
    display: "flex", flexDirection: "column", gap: 6,
    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
    textTransform: "uppercase", color: "var(--mist)",
  },
  input: {
    background: "var(--void)", color: "var(--ink)",
    border: "1px solid var(--line-2)", borderRadius: 8,
    padding: "10px 11px", font: "400 14px var(--body)", width: "100%",
  },
  textarea: {
    background: "var(--void)", color: "var(--ink)",
    border: "1px solid var(--line-2)", borderRadius: 8,
    padding: "10px 11px", font: "400 14px var(--body)", width: "100%",
    minHeight: 72, resize: "vertical",
  },
  select: {
    background: "var(--void)", color: "var(--ink)",
    border: "1px solid var(--line-2)", borderRadius: 8,
    padding: "10px 11px", font: "400 14px var(--body)", width: "100%",
    cursor: "pointer",
  },
};

/* ---------- rep-system hints ---------- */
const REP_HINTS = {
  visual: "Use see / picture / clear / bright imagery",
  auditory: "Use hear / tells you / sounds / rhythm",
  kinesthetic: "Use feel / grasp / heavy-light / warmth",
};

/* ---------- component ---------- */
export default function ClinicalIntake() {
  /* MSE-driven state */
  const [pred, setPred] = useState("kinesthetic");
  const [eye, setEye] = useState("down");
  const [speech, setSpeech] = useState("slow");
  const [decide, setDecide] = useState("feeling");
  const [si, setSi] = useState(false);
  const [med, setMed] = useState(false);

  /* E/P derivation */
  const pPts =
    (pred === "visual" ? 1 : pred === "auditory" ? 0.5 : 0) +
    (eye === "up" ? 1 : eye === "lateral" ? 0.5 : 0) +
    (speech === "crisp" ? 1 : speech === "melodic" ? 0.5 : 0) +
    (decide === "literal" ? 1 : 0);
  const pPct = Math.round((pPts / 4) * 100);
  const ePct = 100 - pPct;
  const physical = pPct >= 50;

  /* rep system label */
  const repLabel =
    pred === "visual" ? "Visual"
    : pred === "auditory" ? "Auditory"
    : "Kinesthetic";

  return (
    <article>
      <span className="eyebrow">Clinical intake &middot; assessment &amp; history</span>
      <h1>Clinical <em>Intake</em></h1>

      {/* -------- WHAT / WHY / HOW / VALUE bar -------- */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", marginBottom: 24,
      }}>
        {[
          { k: "What", c: "var(--teal)",  t: "A full first-session assessment \u2014 concern, history, goal, health, and a mental-status exam." },
          { k: "Why",  c: "var(--iris)",  t: "The chair-side data that sets suggestibility, wording, safety flags, and the suggestion." },
          { k: "How",  c: "var(--amber)", t: "Observe & record; the mental-status cues derive the E/P profile and rep-system live." },
          { k: "Value",c: "var(--ok)",    t: "Feeds Persona Builder, the Room lane, the Safety gate, and the suggestion script." },
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

      {/* -------- TWO-COLUMN LAYOUT -------- */}
      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 22, alignItems: "start",
      }}>

        {/* ======== LEFT: stacked form cards ======== */}
        <div>

          {/* 1. Client & case */}
          <div style={S.card}>
            <div style={S.cardHead()}>Client &amp; case</div>
            <div style={S.cardBody}>
              <div style={S.grid3}>
                <label style={S.label}>
                  Case #
                  <input style={S.input} placeholder="VA-0000" />
                </label>
                <label style={S.label}>
                  Client name
                  <input style={S.input} placeholder="Full name" />
                </label>
                <label style={S.label}>
                  Session date
                  <input style={S.input} type="date" />
                </label>
                <label style={S.label}>
                  Date of birth
                  <input style={S.input} type="date" />
                </label>
                <label style={S.label}>
                  Age / minor?
                  <input style={S.input} placeholder="e.g. 34" />
                </label>
                <label style={S.label}>
                  Referral source
                  <input style={S.input} placeholder="Self / MD / other" />
                </label>
              </div>
            </div>
          </div>

          {/* 2. Chief concern & presenting issues */}
          <div style={S.card}>
            <div style={S.cardHead()}>Chief concern &amp; presenting issues</div>
            <div style={S.cardBody}>
              <label style={{ ...S.label, marginBottom: 14 }}>
                Chief concern
                <textarea
                  style={S.textarea}
                  rows={3}
                  placeholder="I freeze when I have to present at work\u2026"
                />
              </label>
              <div style={S.grid2}>
                <label style={S.label}>
                  Presenting issues
                  <textarea style={S.textarea} rows={2} placeholder="List observable issues" />
                </label>
                <label style={S.label}>
                  Impact on daily life
                  <textarea style={S.textarea} rows={2} placeholder="Work, sleep, relationships..." />
                </label>
              </div>
            </div>
          </div>

          {/* 3. Onset, triggers, patterns */}
          <div style={S.card}>
            <div style={S.cardHead()}>Onset &middot; triggers &middot; patterns</div>
            <div style={S.cardBody}>
              <div style={S.grid2}>
                <label style={S.label}>
                  Onset (when / event)
                  <textarea style={S.textarea} rows={2} placeholder="When did this begin?" />
                </label>
                <label style={S.label}>
                  Triggers
                  <textarea style={S.textarea} rows={2} placeholder="Situations, people, contexts" />
                </label>
                <label style={S.label}>
                  Recurring patterns
                  <textarea style={S.textarea} rows={2} placeholder="Cycles, frequency, escalation" />
                </label>
                <label style={S.label}>
                  Automatic thoughts
                  <textarea style={S.textarea} rows={2} placeholder={'"I always fail," "They will judge me"'} />
                </label>
              </div>
            </div>
          </div>

          {/* 4. Defense & coping mechanisms */}
          <div style={S.card}>
            <div style={S.cardHead()}>Defense &amp; coping mechanisms</div>
            <div style={S.cardBody}>
              <div style={S.grid2}>
                <label style={S.label}>
                  Defense mechanisms
                  <textarea style={S.textarea} rows={2} placeholder="Avoidance, rationalization, projection..." />
                </label>
                <label style={S.label}>
                  Current coping
                  <textarea style={S.textarea} rows={2} placeholder="Exercise, substances, distraction..." />
                </label>
              </div>
            </div>
          </div>

          {/* 5. Therapy history */}
          <div style={S.card}>
            <div style={S.cardHead()}>Therapy history</div>
            <div style={S.cardBody}>
              <label style={S.label}>
                Prior therapy / hypnosis / outcomes
                <textarea
                  style={S.textarea}
                  rows={3}
                  placeholder="Previous modalities, duration, and what helped or did not"
                />
              </label>
            </div>
          </div>

          {/* 6. Therapeutic goal -- "magic wand" (teal) */}
          <div style={{ ...S.card, borderLeft: "3px solid var(--teal)" }}>
            <div style={S.cardHead("var(--teal)")}>
              Therapeutic goal &middot; &ldquo;magic wand&rdquo;
            </div>
            <div style={S.cardBody}>
              <label style={{ ...S.label, marginBottom: 14 }}>
                If a wand made it exactly right, what would be different?
                <textarea
                  style={S.textarea}
                  rows={3}
                  placeholder="In the client's own words..."
                />
              </label>
              <label style={S.label}>
                Positive words
                <input
                  style={S.input}
                  placeholder="calm, steady, confident, grounded, clear"
                />
              </label>
            </div>
          </div>

          {/* 7. General health, medications, coordination (red) */}
          <div style={{ ...S.card, borderLeft: "3px solid var(--red)" }}>
            <div style={S.cardHead("var(--red)")}>
              General health &middot; medications &middot; coordination
            </div>
            <div style={S.cardBody}>
              <div style={{ ...S.grid2, marginBottom: 14 }}>
                <label style={S.label}>
                  General health
                  <textarea style={S.textarea} rows={2} placeholder="Conditions, surgeries, chronic issues" />
                </label>
                <label style={S.label}>
                  Medications
                  <textarea style={S.textarea} rows={2} placeholder="Current prescriptions & supplements" />
                </label>
              </div>
              <button
                type="button"
                onClick={() => setMed((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                  font: "400 13.5px var(--body)", width: "100%",
                  border: `1px solid ${med ? "rgba(127,185,138,.45)" : "var(--line)"}`,
                  background: med ? "rgba(127,185,138,.08)" : "var(--panel-2)",
                  color: med ? "var(--ink)" : "var(--mist)",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, flex: "none" }}>
                  {med ? "\u2713" : "\u25CB"}
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  Physician coordination consent obtained
                </span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: med ? "var(--ok)" : "var(--red)",
                }}>
                  {med ? "synced" : "pending"}
                </span>
              </button>
            </div>
          </div>

          {/* 8. Mental status exam */}
          <div style={{ ...S.card, borderLeft: "3px solid var(--amber)" }}>
            <div style={S.cardHead()}>
              Mental status exam &mdash; drives the derived profile
            </div>
            <div style={S.cardBody}>
              {/* observation grid */}
              <div style={{ ...S.grid3, marginBottom: 18 }}>
                <label style={S.label}>
                  Appearance
                  <input style={S.input} placeholder="Grooming, dress, posture" />
                </label>
                <label style={S.label}>
                  Behavior
                  <input style={S.input} placeholder="Eye contact, fidgeting, pace" />
                </label>
                <label style={S.label}>
                  Attitude
                  <input style={S.input} placeholder="Cooperative, guarded, open" />
                </label>
                <label style={S.label}>
                  Mood / affect
                  <input style={S.input} placeholder="Anxious, flat, congruent" />
                </label>
                <label style={S.label}>
                  Focus / attention
                  <input style={S.input} placeholder="Sustained, distractible" />
                </label>
                <label style={S.label}>
                  Sleep / dreams
                  <input style={S.input} placeholder="Quality, recurring themes" />
                </label>
              </div>

              {/* 4 selects -- drive the derived profile */}
              <div style={{ ...S.grid2, marginBottom: 18 }}>
                <label style={S.label}>
                  Predicates
                  <select
                    style={S.select}
                    value={pred}
                    onChange={(e) => setPred(e.target.value)}
                  >
                    <option value="visual">Visual</option>
                    <option value="auditory">Auditory</option>
                    <option value="kinesthetic">Kinesthetic</option>
                  </select>
                </label>
                <label style={S.label}>
                  Eye movement
                  <select
                    style={S.select}
                    value={eye}
                    onChange={(e) => setEye(e.target.value)}
                  >
                    <option value="up">Up (visual)</option>
                    <option value="lateral">Lateral (auditory)</option>
                    <option value="down">Down (kinesthetic)</option>
                  </select>
                </label>
                <label style={S.label}>
                  Speech
                  <select
                    style={S.select}
                    value={speech}
                    onChange={(e) => setSpeech(e.target.value)}
                  >
                    <option value="crisp">Fast crisp literal</option>
                    <option value="melodic">Even melodic</option>
                    <option value="slow">Slow low feeling-led</option>
                  </select>
                </label>
                <label style={S.label}>
                  Decision style
                  <select
                    style={S.select}
                    value={decide}
                    onChange={(e) => setDecide(e.target.value)}
                  >
                    <option value="literal">Literal (wants proof)</option>
                    <option value="feeling">Feeling (goes on intuition)</option>
                  </select>
                </label>
              </div>

              {/* SI checkbox */}
              <button
                type="button"
                onClick={() => setSi((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                  font: "400 13.5px var(--body)", width: "100%",
                  border: `1px solid ${si ? "rgba(224,104,94,.7)" : "var(--line)"}`,
                  background: si ? "rgba(224,104,94,.12)" : "var(--panel-2)",
                  color: si ? "var(--red)" : "var(--mist)",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, flex: "none" }}>
                  {si ? "\u2717" : "\u25CB"}
                </span>
                <span style={{ flex: 1, textAlign: "left", fontWeight: si ? 650 : 400 }}>
                  Suicidal ideation screen
                </span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: si ? "var(--red)" : "var(--ok)",
                }}>
                  {si ? "flagged -- blocks induction" : "clear"}
                </span>
              </button>
            </div>
          </div>

        </div>{/* end left column */}

        {/* ======== RIGHT: sticky sidebar ======== */}
        <div style={{ position: "sticky", top: 20 }}>

          {/* Derived profile */}
          <div style={{
            border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden",
            background: "linear-gradient(180deg, var(--raise), var(--panel))",
            marginBottom: 18,
          }}>
            <div style={{
              padding: "11px 18px", fontFamily: "var(--mono)", fontSize: 11,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: "var(--iris)", borderBottom: "1px solid var(--line)",
              background: "var(--panel-2)",
            }}>Derived profile</div>
            <div style={{ padding: "18px 18px 20px" }}>

              {/* E / P bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontFamily: "var(--mono)", fontSize: 11, marginBottom: 6,
                }}>
                  <span style={{ color: "var(--teal)" }}>E {ePct}%</span>
                  <span style={{ color: "var(--amber)" }}>P {pPct}%</span>
                </div>
                <div style={{
                  display: "flex", height: 10, borderRadius: 5, overflow: "hidden",
                  background: "var(--line)",
                }}>
                  <div style={{
                    width: `${ePct}%`, background: "var(--teal)",
                    transition: "width .35s cubic-bezier(.16,1,.3,1)",
                  }} />
                  <div style={{
                    width: `${pPct}%`, background: "var(--amber)",
                    transition: "width .35s cubic-bezier(.16,1,.3,1)",
                  }} />
                </div>
              </div>

              {/* Rep system */}
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
                  textTransform: "uppercase", color: "var(--mist)", marginBottom: 5,
                }}>Representational system</div>
                <div style={{
                  fontSize: 16, fontWeight: 650, color: "var(--ink)", marginBottom: 6,
                }}>{repLabel}</div>
                <div style={{
                  fontSize: 12, color: "var(--mist)", lineHeight: 1.5,
                  borderLeft: "2px solid var(--iris)", paddingLeft: 10,
                }}>{REP_HINTS[pred]}</div>
              </div>

              {/* Recommended lane chip */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".08em",
                textTransform: "uppercase", marginBottom: 16,
                color: physical ? "var(--amber)" : "var(--teal)",
                border: `1px solid ${physical ? "rgba(224,164,88,.4)" : "rgba(45,212,191,.4)"}`,
                borderRadius: 999, padding: "5px 14px",
                background: physical ? "rgba(224,164,88,.08)" : "rgba(45,212,191,.08)",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: physical ? "var(--amber)" : "var(--teal)",
                }} />
                {physical ? "P-lane" : "E-lane"}
              </div>

              <br />

              {/* Send to Persona Builder */}
              <Link href="/persona-builder" style={{
                display: "inline-block", marginTop: 4,
                background: "var(--amber)", color: "#1a1408", border: 0,
                borderRadius: 999, padding: "11px 22px",
                font: "650 13px var(--body)", textDecoration: "none",
                cursor: "pointer", transition: "filter .18s, transform .18s",
              }}>
                Send to Persona Builder &amp; Room &rarr;
              </Link>
            </div>
          </div>

          {/* Safety handoff */}
          <div style={{
            border: `1px solid ${si ? "rgba(224,104,94,.5)" : "var(--line)"}`,
            borderLeft: `3px solid ${si ? "var(--red)" : "var(--teal)"}`,
            borderRadius: 16, overflow: "hidden",
            background: si
              ? "linear-gradient(180deg, #1a1520, var(--panel))"
              : "var(--panel)",
          }}>
            <div style={{
              padding: "11px 18px", fontFamily: "var(--mono)", fontSize: 11,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: si ? "var(--red)" : "var(--teal)",
              borderBottom: "1px solid var(--line)", background: "var(--panel-2)",
            }}>Safety handoff</div>
            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* SI screen */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: si ? "var(--red)" : "var(--ok)",
                }} />
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: si ? "var(--red)" : "var(--ok)",
                }}>
                  SI screen: {si ? "flagged" : "clear"}
                </span>
              </div>

              {/* Physician coordination */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: med ? "var(--ok)" : "var(--amber)",
                }} />
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: med ? "var(--ok)" : "var(--amber)",
                }}>
                  Physician coordination: {med ? "obtained" : "not obtained"}
                </span>
              </div>

              {/* Safety note */}
              <div style={{
                fontSize: 12.5, color: "var(--mist)", lineHeight: 1.5,
                borderTop: "1px solid var(--line)", paddingTop: 10,
              }}>
                {si
                  ? "Suicidal ideation flagged. Induction is blocked. Refer to licensed mental-health professional and document the referral."
                  : med
                    ? "No contraindications detected. Physician coordination on file. Gate is clear for induction."
                    : "No SI detected. Obtain physician coordination consent if client is on medications or has health flags."
                }
              </div>

              {/* Open Safety gate link */}
              <Link href="/safety" style={{
                fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".06em",
                color: si ? "var(--red)" : "var(--teal)",
                textDecoration: "none",
              }}>
                Open Safety gate &rarr;
              </Link>
            </div>
          </div>

        </div>{/* end right sidebar */}

      </div>{/* end two-column grid */}
    </article>
  );
}
