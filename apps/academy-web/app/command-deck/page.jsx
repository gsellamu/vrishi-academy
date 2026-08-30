"use client";
import { useState } from "react";
import Link from "next/link";
import gapSeed from "../../data/gap.json";
import { useAcademy } from "../../lib/academy-store";

/* ── role definitions ─────────────────────────────────────────── */
const ROLES = {
  client:  { label: "Client",   eyebrow: "Welcome",      title: "A calmer mind,",        accent: "guided",   sub: "See and hear what a session feels like before you begin." },
  student: { label: "Student",  eyebrow: "Command Deck",  title: "Ready when you are,",   accent: "Jeeth",    sub: "The loop runs continuously \u2014 Learn, Drill, Role-play, Get graded, Review." },
  grad:    { label: "New grad", eyebrow: "Command Deck",  title: "Build the practice,",   accent: "Jeeth",    sub: "Sim reps keep skills sharp; real reps grow the business." },
  pro:     { label: "Pro",      eyebrow: "Command Deck",  title: "Refine the craft,",     accent: "Jeeth",    sub: "Author your own scripts, build custom client personas." },
  faculty: { label: "Faculty",  eyebrow: "Command Deck",  title: "Oversee &",             accent: "evaluate", sub: "Cohort progress, verified reps, and rubric-aligned mock exams." },
};

/* ── focus card per role ──────────────────────────────────────── */
const FOCUS = {
  student: {
    heading: "Your first-week path",
    href: "/lab",
    bullets: ["Theory of Mind + E/P suggestibility test", "Arm-raising induction drill", "Full first-session run", "Mock PSR (Professionally Supervised Requirement)"],
  },
  client: {
    heading: "Preview a session",
    href: "/client-preview",
    bullets: ["Hear what guided hypnosis sounds like", "Understand the Kappasinian model", "No commitment \u2014 just explore"],
  },
  grad: {
    heading: "Practice-builder",
    href: "/logbook",
    bullets: ["Log practice hours and contacts", "Sim reps count toward elective credit", "Build your professional portfolio"],
  },
  pro: {
    heading: "Persona builder & scripts",
    href: "/persona-builder",
    bullets: ["Create custom client personas", "Author original session scripts", "Export SSML for production TTS"],
  },
  faculty: {
    heading: "Faculty console",
    href: "/faculty",
    bullets: ["View cohort progress dashboards", "Grade mock PSR submissions", "Manage rubrics and scoring"],
  },
};

/* ── quick-launch cards (status is computed at render time) ──── */
const CARDS_BASE = [
  { icon: "\u25C9", label: "Session Studio",  href: "/studio",     border: "var(--amber)" },
  { icon: ">_",     label: "Practice Lab",    href: "/lab",        border: "var(--line)" },
  { icon: "\u25CE", label: "The Room",         href: "/room",       border: "var(--teal)" },
  { icon: "\u2726", label: "Skill Tree",       href: "/skill-tree", border: "var(--line)" },
  { icon: "\u25C7", label: "Faculty",          href: "/faculty",    border: "var(--line)" },
];

/* ── season-pass categories ───────────────────────────────────── */
const SEASON = [
  { key: "contacts",    label: "Client Contacts",  color: "var(--amber)" },
  { key: "conferences", label: "Conferences",       color: "var(--iris)" },
  { key: "electives",   label: "Elective Hours",    color: "var(--teal)" },
  { key: "workshops",   label: "Workshops",         color: "var(--ok)" },
];

/* ── helpers ──────────────────────────────────────────────────── */
function daysTo(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

function pct(done, need) {
  if (!need) return 0;
  return Math.min(100, Math.round((done / need) * 100));
}

function weeklyRate(done, need, daysLeft) {
  if (daysLeft <= 0) return 0;
  const remaining = need - done;
  if (remaining <= 0) return 0;
  return (remaining / (daysLeft / 7)).toFixed(1);
}

/* ================================================================
   Command Deck
   ================================================================ */
export default function CommandDeck() {
  const { store, simXp, skillNodes } = useAcademy();
  const gap = store.gap || gapSeed;
  const [role, setRole] = useState("student");
  const r = ROLES[role];
  const focus = FOCUS[role];
  const remaining = daysTo(gap.hardStop);

  /* countdown color */
  const cdColor = remaining > 180 ? "var(--ok)" : remaining > 90 ? "var(--amber)" : "var(--red)";

  return (
    <article>
      {/* ── role switcher ───────────────────────────────────── */}
      <div className="seg" style={{ marginBottom: 28, width: "fit-content" }}>
        {Object.entries(ROLES).map(([k, v]) => (
          <button
            key={k}
            type="button"
            className={role === k ? "on" : ""}
            onClick={() => setRole(k)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── welcome ─────────────────────────────────────────── */}
      <span className="eyebrow">{r.eyebrow}</span>
      <h1>{r.title} <em>{r.accent}</em></h1>
      <p className="note" style={{ marginBottom: 32 }}>{r.sub}</p>

      {/* ── focus card ──────────────────────────────────────── */}
      <Link href={focus.href} style={{ textDecoration: "none", display: "block" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--raise), var(--panel))",
            border: "1px solid var(--amber)",
            borderRadius: "var(--r-lg)",
            padding: "24px 28px",
            marginBottom: 32,
            transition: "transform .18s var(--ease), border-color .18s var(--ease)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--amber)" }}>
              Recommended
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--mist)" }}>
              {focus.href} &rarr;
            </span>
          </div>
          <h2 style={{ font: "340 22px/1.15 var(--display)", margin: "0 0 14px", color: "var(--ink)" }}>
            {focus.heading}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {focus.bullets.map((b, i) => (
              <li key={i} style={{ fontSize: 14, color: "#cfc9dd", lineHeight: 1.55 }}>{b}</li>
            ))}
          </ul>
        </div>
      </Link>

      {/* ── quick-launch grid ───────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14,
        marginBottom: 36,
      }}>
        {(() => {
          const masteredN = Object.values(skillNodes).filter((n) => n.state === "mastered").length;
          const sessions = store.sessionLog?.length || 0;
          const drills = store.drillLog?.length || 0;
          const statuses = {
            "/studio": sessions ? `${sessions} session${sessions > 1 ? "s" : ""} logged \u2192` : "Begin a session \u2192",
            "/lab": drills ? `${drills} drill${drills > 1 ? "s" : ""} \u00B7 ${simXp} sim XP \u2192` : "Start drilling \u2192",
            "/room": "Enter the Room \u2192",
            "/skill-tree": `${masteredN} of 18 nodes \u2192`,
            "/faculty": "Sit a mock PSR \u2192",
          };
          return CARDS_BASE.map((c) => ({ ...c, status: statuses[c.href] || "\u2192" }));
        })().map(c => (
          <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div
              className="panel"
              style={{
                padding: "20px 18px",
                borderTop: `3px solid ${c.border}`,
                transition: "transform .18s var(--ease), border-color .18s var(--ease)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--iris)", lineHeight: 1 }}>
                {c.icon}
              </span>
              <span style={{ font: "560 15px var(--body)", color: "var(--ink)" }}>
                {c.label}
              </span>
              <span style={{ fontSize: 13, color: "var(--mist)", marginTop: "auto" }}>
                {c.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── season pass ─────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--iris)" }}>
            Season Pass \u2014 HMI Gap
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--mist)" }}>
            as of {gap.asOf}
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}>
          {SEASON.map(s => {
            const d = gap[s.key];
            const p = pct(d.done, d.need);
            const rate = weeklyRate(d.done, d.need, remaining);
            return (
              <div
                key={s.key}
                className="panel"
                style={{ padding: "18px 20px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 560, color: "var(--ink)" }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--mist)" }}>
                    {d.done}/{d.need} {d.unit}
                  </span>
                </div>
                <div style={{
                  height: 8,
                  borderRadius: 4,
                  background: "var(--line)",
                  overflow: "hidden",
                  marginBottom: 6,
                }}>
                  <div style={{
                    height: "100%",
                    width: `${p}%`,
                    background: s.color,
                    borderRadius: 4,
                    transition: "width .6s var(--ease)",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: s.color }}>
                    {p}%
                  </span>
                  {d.done < d.need && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)" }}>
                      {rate}/wk needed
                    </span>
                  )}
                  {d.done >= d.need && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ok)" }}>
                      complete
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dec 10 countdown ────────────────────────────────── */}
      <div
        className="panel"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "22px 26px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 48, lineHeight: 1, color: cdColor }}>
            {remaining}
          </span>
          <span style={{ display: "block", fontSize: 12, color: "var(--mist)", textTransform: "uppercase", letterSpacing: ".1em" }}>
            days left
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <span style={{ fontSize: 14, color: "#cfc9dd", display: "block", marginBottom: 8 }}>
            Hard stop: Dec 10, 2026 &mdash; HMI graduation deadline
          </span>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: "var(--line)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, Math.round(((365 - remaining) / 365) * 100))}%`,
              background: cdColor,
              borderRadius: 4,
              transition: "width .6s var(--ease)",
            }} />
          </div>
        </div>
      </div>
    </article>
  );
}
