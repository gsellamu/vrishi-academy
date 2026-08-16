"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

/* ================================================================
   VRishi Academy -- Session Prep
   Pre-flight clinical readiness gate. Four gates must clear before
   any trance begins. Practice mode makes gates advisory.
   ================================================================ */

const S = {
  /* layout */
  page: { maxWidth: 1200 },
  bar: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px",
    background: "var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden",
    margin: "0 0 28px",
  },
  barCell: {
    background: "var(--panel)", padding: "16px 18px",
  },
  barLabel: {
    display: "block", fontFamily: "var(--mono)", fontSize: 10,
    letterSpacing: ".12em", textTransform: "uppercase", color: "var(--iris)",
    marginBottom: 6,
  },
  barText: { fontSize: 13.5, color: "#cfc9dd", lineHeight: 1.55 },

  /* toggle row */
  toggleRow: {
    display: "flex", alignItems: "center", gap: 14,
    margin: "0 0 24px", padding: "14px 18px",
    border: "1px solid var(--line)", borderRadius: "var(--r-md)",
    background: "var(--panel)",
  },
  toggleLabel: {
    fontSize: 14, color: "var(--ink)", flex: 1,
  },
  toggleTrack: (on) => ({
    width: 44, height: 24, borderRadius: 12, cursor: "pointer",
    background: on ? "var(--amber)" : "var(--line-2)",
    position: "relative", transition: "background .2s var(--ease)",
    border: "none", padding: 0,
  }),
  toggleThumb: (on) => ({
    position: "absolute", top: 3, left: on ? 23 : 3,
    width: 18, height: 18, borderRadius: "50%",
    background: on ? "#1a1408" : "var(--mist)",
    transition: "left .2s var(--ease)",
  }),
  chip: (variant) => ({
    fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".08em",
    textTransform: "uppercase", borderRadius: "var(--r-pill)",
    padding: "4px 12px",
    color: variant === "advisory" ? "var(--amber)" : "var(--ok)",
    border: `1px solid ${variant === "advisory" ? "rgba(224,164,88,.4)" : "rgba(127,185,138,.4)"}`,
    background: variant === "advisory" ? "rgba(224,164,88,.08)" : "rgba(127,185,138,.08)",
  }),

  /* two-column */
  columns: {
    display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start",
  },

  /* gate card */
  gate: (ok) => ({
    border: "1px solid var(--line)",
    borderLeft: `4px solid ${ok ? "var(--ok)" : "var(--line-2)"}`,
    borderRadius: "var(--r-lg)", background: "var(--panel)",
    padding: "20px 22px", marginBottom: 18,
    transition: "border-color .25s var(--ease)",
  }),
  gateHeader: {
    display: "flex", alignItems: "center", gap: 14, marginBottom: 14,
  },
  gateBadge: (ok) => ({
    width: 36, height: 36, borderRadius: "50%",
    border: `2px solid ${ok ? "var(--ok)" : "var(--line-2)"}`,
    display: "grid", placeItems: "center",
    fontFamily: "var(--mono)", fontSize: 15,
    color: ok ? "var(--ok)" : "var(--dim)",
    transition: "all .25s var(--ease)",
    flexShrink: 0,
  }),
  gateTitle: {
    fontFamily: "var(--mono)", fontSize: 13, letterSpacing: ".08em",
    textTransform: "uppercase", color: "var(--ink)",
  },
  gateSub: { fontSize: 12.5, color: "var(--mist)", marginTop: 2 },
  gateCount: {
    marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 12,
    color: "var(--mist)",
  },

  /* consent checkbox */
  checkRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 0", fontSize: 14, color: "#cfc9dd", cursor: "pointer",
  },
  checkBox: (checked) => ({
    width: 18, height: 18, borderRadius: 4, border: "1.5px solid",
    borderColor: checked ? "var(--ok)" : "var(--line-2)",
    background: checked ? "var(--ok)" : "transparent",
    display: "grid", placeItems: "center",
    color: checked ? "var(--void)" : "transparent",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    transition: "all .15s var(--ease)", flexShrink: 0,
  }),
  reqTag: {
    fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em",
    textTransform: "uppercase", color: "var(--amber)",
    border: "1px solid rgba(224,164,88,.3)",
    borderRadius: "var(--r-pill)", padding: "1px 7px", marginLeft: 6,
  },

  /* contraindication chips */
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" },
  riskChip: (active, isOk) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".04em",
    borderRadius: "var(--r-pill)", padding: "7px 14px",
    cursor: "pointer", border: "1px solid",
    transition: "all .15s var(--ease)",
    ...(active
      ? isOk
        ? { color: "var(--void)", background: "var(--ok)", borderColor: "var(--ok)" }
        : { color: "#fff", background: "var(--red)", borderColor: "var(--red)" }
      : { color: "var(--mist)", background: "transparent", borderColor: "var(--line-2)" }
    ),
  }),
  verdict: (state) => ({
    marginTop: 12, padding: "10px 14px",
    borderRadius: "var(--r-md)", fontSize: 13, lineHeight: 1.5,
    border: "1px solid",
    ...(state === "red"
      ? { color: "var(--red)", borderColor: "rgba(224,104,94,.35)", background: "rgba(224,104,94,.08)" }
      : state === "green"
        ? { color: "var(--ok)", borderColor: "rgba(127,185,138,.35)", background: "rgba(127,185,138,.08)" }
        : { color: "var(--mist)", borderColor: "var(--line)", background: "var(--panel-2)" }
    ),
  }),

  /* plan grid */
  planGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14, margin: "6px 0",
  },
  selectWrap: {
    display: "flex", flexDirection: "column", gap: 6,
  },
  selectLabel: {
    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em",
    textTransform: "uppercase", color: "var(--mist)",
  },
  select: {
    background: "var(--void)", color: "var(--ink)",
    border: "1px solid var(--line-2)", borderRadius: 8,
    padding: "9px 11px", fontFamily: "var(--body)", fontSize: 14,
  },
  seg: {
    display: "flex", gap: 0, border: "1px solid var(--line)",
    borderRadius: "var(--r-pill)", overflow: "hidden",
    background: "var(--panel)",
  },
  segBtn: (on) => ({
    flex: 1, padding: "8px 16px", border: "none", cursor: "pointer",
    fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".08em",
    textTransform: "uppercase",
    color: on ? "var(--amber)" : "var(--mist)",
    background: on ? "var(--panel-2)" : "transparent",
    transition: "all .15s var(--ease)",
  }),
  laneNote: {
    fontSize: 12, color: "var(--dim)", marginTop: 8, lineHeight: 1.55,
  },

  /* AV row */
  avRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "9px 0", borderBottom: "1px solid var(--line)",
    fontSize: 14, color: "#cfc9dd",
  },
  avDot: (status) => ({
    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
    background: status === "ok" ? "var(--ok)"
      : status === "warn" ? "var(--amber)"
        : status === "pending" ? "var(--mist)"
          : "var(--red)",
    transition: "background .3s var(--ease)",
  }),
  avLabel: { flex: 1, fontWeight: 500 },
  avStatus: (status) => ({
    fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em",
    textTransform: "uppercase",
    color: status === "ok" ? "var(--ok)"
      : status === "warn" ? "var(--amber)"
        : status === "pending" ? "var(--mist)"
          : "var(--red)",
  }),
  recheckBtn: {
    marginTop: 10, background: "transparent", color: "var(--iris)",
    border: "1px solid var(--line)", borderRadius: "var(--r-pill)",
    padding: "7px 16px", fontFamily: "var(--mono)", fontSize: 12,
    letterSpacing: ".06em", cursor: "pointer",
    transition: "border-color .18s var(--ease), color .18s var(--ease)",
  },

  /* sidebar */
  sidebar: { position: "sticky", top: 32 },
  readinessCard: (allClear) => ({
    border: "1px solid",
    borderColor: allClear ? "var(--ok)" : "var(--line)",
    borderRadius: "var(--r-lg)", background: "var(--panel)",
    padding: "22px 20px", marginBottom: 16,
    transition: "border-color .4s var(--ease), box-shadow .4s var(--ease)",
    ...(allClear ? { boxShadow: "0 0 24px rgba(127,185,138,.18)" } : {}),
  }),
  readinessNum: {
    fontFamily: "var(--mono)", fontSize: 48, lineHeight: 1,
    color: "var(--amber)",
  },
  readinessLabel: {
    fontSize: 12, color: "var(--mist)", textTransform: "uppercase",
    letterSpacing: ".08em", marginTop: 4, marginBottom: 12,
  },
  progressBar: {
    height: 8, borderRadius: 4, background: "var(--line)",
    overflow: "hidden",
  },
  progressFill: (pct) => ({
    display: "block", height: "100%", borderRadius: 4,
    background: "linear-gradient(90deg,var(--iris),var(--amber))",
    width: `${pct}%`, transition: "width .5s var(--ease)",
  }),
  readinessNote: {
    fontSize: 12.5, color: "var(--mist)", marginTop: 10, lineHeight: 1.5,
  },

  actionLink: (variant, disabled) => ({
    display: "block", textAlign: "center",
    padding: "12px 18px", borderRadius: "var(--r-pill)",
    fontWeight: 650, fontSize: 14, marginBottom: 8,
    transition: "filter .18s var(--ease), transform .18s var(--ease)",
    textDecoration: "none",
    ...(disabled
      ? { opacity: 0.4, pointerEvents: "none", cursor: "not-allowed" }
      : {}
    ),
    ...(variant === "primary"
      ? { background: "var(--amber)", color: "#1a1408", border: "none" }
      : { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" }
    ),
  }),

  linkCard: {
    border: "1px solid var(--line)", borderRadius: "var(--r-md)",
    background: "var(--panel)", padding: "14px 16px", marginBottom: 12,
    display: "block", fontSize: 13.5, color: "var(--mist)",
    transition: "border-color .18s var(--ease)",
    textDecoration: "none",
  },
  linkCardTitle: {
    fontWeight: 650, fontSize: 14, color: "var(--ink)", marginBottom: 4,
  },
};

const CONSENT_ITEMS = [
  { key: "referral", label: "Referral / intake on file where required", req: true },
  { key: "consent", label: "Informed consent acknowledged (guardian if minor)", req: true },
  { key: "recording", label: "Recording & data handling agreed", req: true },
];

const RISK_FLAGS = [
  { key: "none", label: "None present -- cleared", isOk: true },
  { key: "cardiac", label: "Cardiac / BP" },
  { key: "psychosis", label: "Psychosis hx" },
  { key: "epilepsy", label: "Epilepsy" },
  { key: "pregnancy", label: "Pregnancy" },
  { key: "substance", label: "Substance influence" },
];

const AV_CHECKS = [
  { key: "room", label: "Quiet room", delay: 600, result: "ok" },
  { key: "mic", label: "Microphone input", delay: 1100, result: "ok" },
  { key: "tts", label: "Voice service -- ElevenLabs", delay: 1800, result: "ok" },
  { key: "avatar", label: "Avatar service", delay: 2200, result: "warn" },
];

const AV_STATUS_TEXT = {
  pending: "checking...",
  ok: "connected",
  warn: "stub / degraded",
  fail: "offline",
};

export default function SessionPrep() {
  /* ---------- state ---------- */
  const [practiceMode, setPracticeMode] = useState(false);
  const [consent, setConsent] = useState({ referral: false, consent: false, recording: false });
  const [risks, setRisks] = useState({});
  const [persona, setPersona] = useState("");
  const [goal, setGoal] = useState("");
  const [lane, setLane] = useState("E");
  const [avStatus, setAvStatus] = useState(
    Object.fromEntries(AV_CHECKS.map((c) => [c.key, "pending"]))
  );

  /* ---------- AV simulation ---------- */
  function runAvChecks() {
    setAvStatus(Object.fromEntries(AV_CHECKS.map((c) => [c.key, "pending"])));
    AV_CHECKS.forEach((c) => {
      setTimeout(() => {
        setAvStatus((prev) => ({ ...prev, [c.key]: c.result }));
      }, c.delay);
    });
  }
  useEffect(() => { runAvChecks(); }, []);

  /* ---------- risk logic ---------- */
  function toggleRisk(key) {
    if (key === "none") {
      setRisks({ none: true });
    } else {
      setRisks((prev) => {
        const next = { ...prev };
        delete next.none;
        if (next[key]) { delete next[key]; } else { next[key] = true; }
        return next;
      });
    }
  }

  /* ---------- gate clearance ---------- */
  const consentCount = Object.values(consent).filter(Boolean).length;
  const consentClear = consentCount === 3;

  const hasRiskFlags = Object.keys(risks).some((k) => k !== "none" && risks[k]);
  const noneFlagged = !!risks.none;
  const safetyClear = noneFlagged && !hasRiskFlags;
  const safetyState = hasRiskFlags ? "red" : noneFlagged ? "green" : "neutral";

  const planClear = persona !== "";
  const avClear = avStatus.room === "ok" && avStatus.mic === "ok" && avStatus.tts === "ok";

  const gates = [consentClear, safetyClear, planClear, avClear];
  const gatesClear = gates.filter(Boolean).length;
  const allClear = gatesClear === 4;
  const canStart = allClear || practiceMode;

  /* ---------- render ---------- */
  return (
    <article style={S.page}>
      <span className="eyebrow">Pre-flight -- clinical readiness</span>
      <h1>Session <em>Prep</em></h1>

      {/* WHAT / WHY / HOW / VALUE bar */}
      <div style={S.bar}>
        {[
          ["What", "The pre-flight gate that clears a client before any trance begins."],
          ["Why", "Consent, safety and setup are clinical duty -- and muscle memory for real practice."],
          ["How", "Work four gates top to bottom; each must clear before the induction unlocks."],
          ["Value", "You walk into every real session already in the habit of clearing it."],
        ].map(([label, text]) => (
          <div key={label} style={S.barCell}>
            <span style={S.barLabel}>{label}</span>
            <span style={S.barText}>{text}</span>
          </div>
        ))}
      </div>

      {/* PRACTICE MODE TOGGLE */}
      <div style={S.toggleRow}>
        <span style={S.toggleLabel}>
          Practice mode — advisory gate
        </span>
        <span style={S.chip(practiceMode ? "advisory" : "required")}>
          {practiceMode ? "ADVISORY" : "REQUIRED"}
        </span>
        <button
          type="button"
          style={S.toggleTrack(practiceMode)}
          onClick={() => setPracticeMode((p) => !p)}
          aria-pressed={practiceMode}
          aria-label="Toggle practice mode"
        >
          <span style={S.toggleThumb(practiceMode)} />
        </button>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div style={S.columns}>
        {/* ---- LEFT: 4 gate cards ---- */}
        <div>
          {/* GATE 1 — Consent & scope */}
          <div style={S.gate(consentClear)}>
            <div style={S.gateHeader}>
              <div style={S.gateBadge(consentClear)}>
                {consentClear ? "\u2713" : "\u25CB"}
              </div>
              <div>
                <div style={S.gateTitle}>Gate 1 — Consent & scope</div>
                <div style={S.gateSub}>Intake, consent and data handling</div>
              </div>
              <span style={S.gateCount}>{consentCount}/3</span>
            </div>
            {CONSENT_ITEMS.map((item) => (
              <label key={item.key} style={S.checkRow}>
                <span
                  role="checkbox"
                  aria-checked={consent[item.key]}
                  tabIndex={0}
                  style={S.checkBox(consent[item.key])}
                  onClick={() => setConsent((p) => ({ ...p, [item.key]: !p[item.key] }))}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setConsent((p) => ({ ...p, [item.key]: !p[item.key] }));
                    }
                  }}
                >
                  {consent[item.key] ? "\u2713" : ""}
                </span>
                <span>{item.label}</span>
                {item.req && <span style={S.reqTag}>req</span>}
              </label>
            ))}
          </div>

          {/* GATE 2 — Contraindication screen */}
          <div style={S.gate(safetyClear)}>
            <div style={S.gateHeader}>
              <div style={S.gateBadge(safetyClear)}>
                {safetyClear ? "\u2713" : "\u25CB"}
              </div>
              <div>
                <div style={S.gateTitle}>Gate 2 — Contraindication screen</div>
                <div style={S.gateSub}>Risk flags and clearance</div>
              </div>
              <span style={S.gateCount}>
                {safetyClear ? "cleared" : hasRiskFlags ? "flagged" : "pending"}
              </span>
            </div>
            <div style={S.chipRow}>
              {RISK_FLAGS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  style={S.riskChip(!!risks[f.key], f.isOk)}
                  onClick={() => toggleRisk(f.key)}
                >
                  {f.isOk && risks[f.key] ? "\u2713 " : ""}{f.label}
                </button>
              ))}
            </div>
            <div style={S.verdict(safetyState)}>
              {safetyState === "red"
                ? "Risk flag raised -- review contraindication before proceeding. Document referral if clinical threshold met."
                : safetyState === "green"
                  ? "No contraindications present. Client cleared for hypnotherapy."
                  : "Select a clearance status above. Either confirm no contraindications or flag relevant risks."
              }
            </div>
          </div>

          {/* GATE 3 — Client & plan */}
          <div style={S.gate(planClear)}>
            <div style={S.gateHeader}>
              <div style={S.gateBadge(planClear)}>
                {planClear ? "\u2713" : "\u25CB"}
              </div>
              <div>
                <div style={S.gateTitle}>Gate 3 — Client & plan</div>
                <div style={S.gateSub}>Persona, goal and suggestibility lane</div>
              </div>
              <span style={S.gateCount}>
                {planClear ? "set" : "pending"}
              </span>
            </div>
            <div style={S.planGrid}>
              <div style={S.selectWrap}>
                <span style={S.selectLabel}>Persona</span>
                <select
                  style={S.select}
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                >
                  <option value="">-- select --</option>
                  <option value="maya">Maya -- emotional</option>
                  <option value="marcus">Marcus -- physical</option>
                  <option value="rosa">Rosa -- referral</option>
                </select>
              </div>
              <div style={S.selectWrap}>
                <span style={S.selectLabel}>Goal</span>
                <select
                  style={S.select}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  <option value="">-- select --</option>
                  <option value="vocational">Vocational</option>
                  <option value="referral">Referral</option>
                  <option value="avocational">Avocational</option>
                </select>
              </div>
              <div style={S.selectWrap}>
                <span style={S.selectLabel}>Lane</span>
                <div style={S.seg}>
                  <button
                    type="button"
                    style={S.segBtn(lane === "E")}
                    onClick={() => setLane("E")}
                  >E</button>
                  <button
                    type="button"
                    style={S.segBtn(lane === "P")}
                    onClick={() => setLane("P")}
                  >P</button>
                </div>
              </div>
            </div>
            <div style={S.laneNote}>
              {lane === "E"
                ? "E = Emotional / inferred -- permissive wording, eye-catalepsy deepener."
                : "P = Physical / literal -- direct wording, challenge deepeners."
              }
            </div>
          </div>

          {/* GATE 4 — Environment & AV */}
          <div style={S.gate(avClear)}>
            <div style={S.gateHeader}>
              <div style={S.gateBadge(avClear)}>
                {avClear ? "\u2713" : "\u25CB"}
              </div>
              <div>
                <div style={S.gateTitle}>Gate 4 — Environment & AV</div>
                <div style={S.gateSub}>Room, microphone, voice and avatar services</div>
              </div>
              <span style={S.gateCount}>
                {AV_CHECKS.filter((c) => avStatus[c.key] === "ok").length}/{AV_CHECKS.length}
              </span>
            </div>
            {AV_CHECKS.map((c) => (
              <div key={c.key} style={S.avRow}>
                <span style={S.avDot(avStatus[c.key])} />
                <span style={S.avLabel}>{c.label}</span>
                <span style={S.avStatus(avStatus[c.key])}>
                  {AV_STATUS_TEXT[avStatus[c.key]] || avStatus[c.key]}
                </span>
              </div>
            ))}
            <button
              type="button"
              style={S.recheckBtn}
              onClick={runAvChecks}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--iris)"; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
            >
              Re-check
            </button>
          </div>
        </div>

        {/* ---- RIGHT: Readiness rail ---- */}
        <div style={S.sidebar}>
          {/* Readiness card */}
          <div style={S.readinessCard(allClear)}>
            <div style={S.readinessNum}>{gatesClear}<span style={{ fontSize: 22, color: "var(--mist)" }}>/4</span></div>
            <div style={S.readinessLabel}>Gates cleared</div>
            <div style={S.progressBar}>
              <span style={S.progressFill((gatesClear / 4) * 100)} />
            </div>
            <div style={S.readinessNote}>
              {allClear
                ? "All gates cleared. Session is ready to begin."
                : practiceMode
                  ? "Practice mode active -- gates are advisory. You may proceed."
                  : `${4 - gatesClear} gate${4 - gatesClear > 1 ? "s" : ""} remaining before induction unlocks.`
              }
            </div>
          </div>

          {/* Action links */}
          <Link href="/room" style={S.actionLink("primary", !canStart)}>
            Begin in The Room &rarr;
          </Link>
          <Link href="/studio" style={S.actionLink("outline", !canStart)}>
            Begin in Studio &rarr;
          </Link>

          {/* Safety & Ethics */}
          <Link href="/safety" style={S.linkCard}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--iris)"; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
          >
            <div style={S.linkCardTitle}>Safety & Ethics</div>
            <span>Clinical duty of care, contraindication reference, and scope of practice.</span>
          </Link>

          {/* Guidebook PDF placeholder */}
          <div style={{
            ...S.linkCard,
            cursor: "default", opacity: 0.7,
          }}>
            <div style={S.linkCardTitle}>Clinical Hypnotherapy Session Guidebook</div>
            <span>PDF reference -- coming soon.</span>
          </div>
        </div>
      </div>
    </article>
  );
}
