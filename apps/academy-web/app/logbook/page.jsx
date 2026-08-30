"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAcademy } from "../../lib/academy-store";

const XP_MAP = {
  "Client contact": 240,
  "Case conference": 120,
  "401 elective": 80,
  "Practicum workshop": 300,
};

const TYPE_OPTIONS = ["Client contact", "Case conference", "401 elective", "Practicum workshop"];
const OUTCOME_OPTIONS = [
  "Completed \u00B7 good depth",
  "Completed \u00B7 partial",
  "Referred out",
  "No-show",
];

/* INITIAL_REPS removed — now read from academy store */

const GROW_CARDS = [
  { icon: "\u270E", color: "var(--amber)", title: "Referral-getter post", body: "Draft a first social post from the template \u2014 story + one clear call to book.", status: "draft", src: "Social Media Marketing 1" },
  { icon: "\u25C8", color: "var(--teal)", title: "Google Business Profile", body: "Stand up your profile so local searches find you; add hours and services.", status: "to do", src: "Business Practices 1" },
  { icon: "\u263A", color: "var(--ok)", title: "Testimonial kit", body: "Ask your first completed clients for a review \u2014 unlocks at 3 real contacts.", status: "locked", src: "Turning First-Time Clients into Referrers" },
  { icon: "\u25A4", color: "var(--iris)", title: "Booking + intake live", body: "Publish a booking link and intake form so a lead can self-schedule.", status: "to do", src: "Business Practices 2" },
  { icon: "\u25C9", color: "var(--amber)", title: "5 discovery calls", body: "Book five 15-minute discovery calls this month \u2014 the top of the funnel.", status: "1/5", src: "Introduction to Business" },
];

/* REFRESHERS removed — now computed from academy store drill stats */

export default function Logbook() {
  const { store, simXp, realXp, weekStreak, drillStats, logRep } = useAcademy();
  const [fClient, setFClient] = useState("");
  const [fType, setFType] = useState(TYPE_OPTIONS[0]);
  const [fOutcome, setFOutcome] = useState(OUTCOME_OPTIONS[0]);

  const reps = store.repLog || [];
  const contactCount = reps.filter((r) => r.type === "Client contact").length;

  /* refreshers — drills sorted by staleness */
  const refreshers = useMemo(() => {
    const NAMES = { count50: "Count 5\u21920 pacing", fingerspread: "Finger-spread verify", phs_anatomy: "PHS full anatomy", staircase: "Staircase deepener", armraise: "Arm-raising induction" };
    const candidates = ["count50", "fingerspread", "staircase", "armraise", "pretalk"];
    return candidates.map((id) => {
      const s = drillStats[id];
      const label = NAMES[id] || id;
      if (!s) return { label, ago: "never drilled" };
      const days = Math.round((Date.now() - new Date(s.lastDate + "T00:00:00").getTime()) / 86400000);
      return { label, ago: `last drilled ${days} day${days !== 1 ? "s" : ""} ago` };
    }).sort((a, b) => (a.ago === "never drilled" ? -1 : 0) - (b.ago === "never drilled" ? -1 : 0)).slice(0, 3);
  }, [drillStats]);

  function addRep() {
    if (!fClient.trim()) return;
    logRep({ client: fClient.trim(), type: fType, outcome: fOutcome });
    setFClient("");
  }

  /* shared inline-style helpers */
  const mono9 = {
    fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em",
    textTransform: "uppercase",
  };
  const panelBox = {
    background: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: 12, padding: "18px 20px",
  };

  return (
    <article>
      <span className="eyebrow">Practice-builder &middot; the real ledger</span>
      <h1 style={{ margin: "8px 0 0" }}>Real-Rep <em>Logbook</em></h1>
      <p className="note" style={{ marginBottom: 8 }}>
        Every real session, conference and workshop logged in one place &mdash;
        the reps that actually close the gap to CHt.
      </p>

      {/* ---- WHAT / WHY / HOW / VALUE ---- */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", margin: "18px 0 4px",
      }}>
        {[
          { k: "What", c: "var(--teal)", t: "Log every real session, conference and workshop \u2014 the reps that actually graduate you." },
          { k: "Why", c: "var(--iris)", t: "Sim reps sharpen skill; only real reps close the gap to CHt. Real reps count 10\u00D7." },
          { k: "How", c: "var(--amber)", t: "Log a rep with its SOAP outcome; it feeds the ledger, milestones, and faculty verification." },
          { k: "Value", c: "var(--ok)", t: "Turns anxiety about revenue into a visible countdown you can act on this week." },
        ].map((b) => (
          <div key={b.k} style={{ background: "var(--panel)", padding: "14px 16px" }}>
            <div style={{ ...mono9, color: b.c, marginBottom: 5 }}>{b.k}</div>
            <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45 }}>{b.t}</div>
          </div>
        ))}
      </div>

      {/* ---- LEDGER SUMMARY ---- */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", margin: "22px 0 26px",
      }}>
        {[
          { label: "Sim XP", value: simXp.toLocaleString(), color: "var(--teal)" },
          { label: "Real XP \u00B710\u00D7", value: (realXp * 10).toLocaleString(), color: "var(--amber)" },
          { label: "Real reps", value: reps.length, color: "var(--ink)" },
          { label: "Week streak", value: weekStreak, color: "var(--ok)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--panel)", padding: "16px 18px", textAlign: "center" }}>
            <div style={{ ...mono9, color: "var(--mist)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ font: "560 28px var(--display)", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ---- TWO-COLUMN LAYOUT ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>

        {/* ==== LEFT COLUMN ==== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Log a real rep */}
          <div style={panelBox}>
            <div style={{ ...mono9, color: "var(--amber)", marginBottom: 14 }}>Log a real rep</div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12, marginBottom: 14,
            }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--mist)" }}>
                Client (initials)
                <input
                  type="text"
                  value={fClient}
                  onChange={(e) => setFClient(e.target.value)}
                  placeholder="e.g. M.V."
                  style={{
                    background: "var(--void)", border: "1px solid var(--line-2)",
                    borderRadius: 6, padding: "7px 10px", color: "var(--ink)",
                    fontFamily: "var(--body)", fontSize: 13,
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--mist)" }}>
                Type
                <select
                  value={fType}
                  onChange={(e) => setFType(e.target.value)}
                  style={{
                    background: "var(--void)", border: "1px solid var(--line-2)",
                    borderRadius: 6, padding: "7px 10px", color: "var(--ink)",
                    fontFamily: "var(--body)", fontSize: 13,
                  }}
                >
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--mist)" }}>
                Outcome
                <select
                  value={fOutcome}
                  onChange={(e) => setFOutcome(e.target.value)}
                  style={{
                    background: "var(--void)", border: "1px solid var(--line-2)",
                    borderRadius: 6, padding: "7px 10px", color: "var(--ink)",
                    fontFamily: "var(--body)", fontSize: 13,
                  }}
                >
                  {OUTCOME_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={addRep}
              style={{
                background: "var(--amber)", color: "#1a1722", border: "none",
                borderRadius: 20, padding: "9px 22px", fontFamily: "var(--body)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              + Log rep &amp; draft SOAP
            </button>
          </div>

          {/* Ledger table */}
          <div style={panelBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div style={{ ...mono9, color: "var(--amber)" }}>Ledger &middot; {reps.length} reps</div>
              <span style={{ ...mono9, color: "var(--iris)", cursor: "pointer", fontSize: 9 }}>export CSV / PDF</span>
            </div>

            {/* column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "90px 1fr 110px 60px",
              gap: 8, padding: "0 0 8px", borderBottom: "1px solid var(--line)",
              marginBottom: 6,
            }}>
              {["Date", "Client \u00B7 Type", "Verified", "XP"].map((h) => (
                <div key={h} style={{ ...mono9, color: "var(--dim)", fontSize: 9 }}>{h}</div>
              ))}
            </div>

            {reps.map((r, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "90px 1fr 110px 60px",
                gap: 8, padding: "8px 0",
                borderBottom: i < reps.length - 1 ? "1px solid var(--line)" : "none",
                alignItems: "center",
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--mist)" }}>{r.date}</span>
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{r.client} &middot; {r.type}</div>
                  <div style={{ fontSize: 11.5, color: "var(--mist)", marginTop: 2 }}>{r.outcome}</div>
                </div>
                <span style={{
                  display: "inline-block", fontSize: 10.5, fontFamily: "var(--mono)",
                  padding: "3px 10px", borderRadius: 12,
                  background: r.verified.startsWith("\u2713") ? "rgba(127,185,138,0.13)" : "rgba(224,164,88,0.13)",
                  color: r.verified.startsWith("\u2713") ? "var(--ok)" : "var(--amber)",
                }}>{r.verified}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--amber)", fontWeight: 600 }}>+{r.xp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ==== RIGHT SIDEBAR ==== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Business milestones */}
          <div style={panelBox}>
            <div style={{ ...mono9, color: "var(--amber)", marginBottom: 14 }}>Business milestones</div>
            {[
              { label: "First 3 client contacts", done: contactCount, need: 3 },
              { label: "Unlock testimonial kit", done: Math.min(contactCount, 3), need: 3 },
              { label: "24 contacts \u2192 CHt gate", done: contactCount, need: 24 },
            ].map((m) => {
              const frac = Math.min(1, m.done / m.need);
              return (
                <div key={m.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--mist)", marginBottom: 5 }}>
                    <span>{m.label}</span>
                    <span style={{ fontFamily: "var(--mono)", color: frac >= 1 ? "var(--ok)" : "var(--amber)" }}>{m.done}/{m.need}</span>
                  </div>
                  <div style={{
                    height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${frac * 100}%`, borderRadius: 3,
                      background: frac >= 1 ? "var(--ok)" : "var(--amber)",
                      transition: "width .3s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Due for refresher */}
          <div style={panelBox}>
            <div style={{ ...mono9, color: "var(--iris)", marginBottom: 12 }}>Due for refresher</div>
            {refreshers.map((r) => (
              <Link
                key={r.label}
                href="/lab"
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--line)",
                  textDecoration: "none", color: "var(--ink)", fontSize: 13,
                }}
              >
                <span>{r.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--mist)" }}>{r.ago}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ---- GROW THE PRACTICE ---- */}
      <div style={{ ...panelBox, marginTop: 26 }}>
        <div style={{ ...mono9, color: "var(--amber)", marginBottom: 16 }}>Grow the practice</div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {GROW_CARDS.map((c) => (
            <div key={c.title} style={{
              background: "var(--panel-2)", border: "1px solid var(--line)",
              borderRadius: 10, padding: "16px 18px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 22, color: c.color }}>{c.icon}</span>
                <span style={{
                  ...mono9, fontSize: 9, padding: "2px 8px", borderRadius: 10,
                  background: c.status === "locked" ? "rgba(91,86,109,0.25)" : "rgba(224,164,88,0.13)",
                  color: c.status === "locked" ? "var(--dim)" : "var(--amber)",
                }}>{c.status}</span>
              </div>
              <div style={{ font: "560 17px var(--display)", color: "var(--ink)" }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45, flex: 1 }}>{c.body}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--dim)", marginTop: 2 }}>{c.src}</div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
