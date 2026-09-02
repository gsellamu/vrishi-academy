"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import gapSeed from "../../data/gap.json";
import { useAcademy } from "../../lib/academy-store";
import { cspApi } from "../../lib/api";

/* ── helpers ─────────────────────────────────────────────────── */
function daysTo(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

/* ── tier badge helper ───────────────────────────────────────── */
function tierInfo(t) {
  if (t === "Free") return { tier: "Free", tierColor: "#7fb98a", tierBorder: "rgba(127,185,138,.4)" };
  return { tier: t, tierColor: "#e0a458", tierBorder: "rgba(224,164,88,.4)" };
}

/* ── CCR status helper ───────────────────────────────────────── */
function ccrInfo(k) {
  const map = {
    filed:   { ccrColor: "#7fb98a", ccrShort: "Filed",  ccrLabel: "CCR filed with HMI" },
    due:     { ccrColor: "#e0a458", ccrShort: "Due",    ccrLabel: "CCR due" },
    overdue: { ccrColor: "#e0685e", ccrShort: "Late",   ccrLabel: "CCR overdue" },
  };
  return map[k];
}

/* ── status helper ───────────────────────────────────────────── */
function statusInfo(k) {
  const map = {
    active:    { status: "Active",    statusColor: "#7fb98a" },
    completed: { status: "Completed", statusColor: "#8b85a0" },
    dropped:   { status: "Dropped",   statusColor: "#5b566d" },
  };
  return map[k];
}

/* ── build a client row ──────────────────────────────────────── */
function makeRow(initials, t, sessions, last, next, c, st, concern) {
  return {
    initials, sessions, last, next, concern,
    nextColor: next === "Not booked" ? "#5b566d" : "#e9e4f2",
    ...tierInfo(t),
    ...ccrInfo(c),
    ...statusInfo(st),
  };
}

/* ── demo data ───────────────────────────────────────────────── */
const DEMO_CLIENTS = [
  makeRow("A.M.", "Free", "3 of 6",  "Aug 24", "Sep 1 \u00B7 10:00", "filed",   "active",    "Smoking cessation"),
  makeRow("R.K.", "$35",  "5 of 8",  "Aug 26", "Sep 2 \u00B7 14:00", "due",     "active",    "Public speaking"),
  makeRow("T.O.", "Free", "1 of 6",  "Aug 28", "Not booked",         "overdue", "active",    "Sleep onset"),
  makeRow("D.S.", "$55",  "9 of 12", "Aug 21", "Sep 3 \u00B7 09:00", "filed",   "active",    "Weight management"),
  makeRow("L.B.", "$35",  "6 of 6",  "Aug 12", "\u2014",             "filed",   "completed", "Exam confidence"),
  makeRow("M.V.", "Free", "2 of 6",  "Jul 30", "\u2014",             "filed",   "dropped",   "Stress reduction"),
];

const COLS = ["Client", "Tier", "Sessions", "Last session", "Next", "CCR", "Status"];

const DEMO_WEEK = [
  { initials: "A.M.", when: "Mon Sep 1 \u00B7 10:00", n: 4, stage: "Therapy" },
  { initials: "R.K.", when: "Tue Sep 2 \u00B7 14:00", n: 6, stage: "Deepening" },
  { initials: "D.S.", when: "Wed Sep 3 \u00B7 09:00", n: 10, stage: "Post-session" },
];

const DEMO_CONFERENCES = [
  { date: "Aug 21", faculty: "J. Aguilar", note: "Suggestibility scoring review" },
  { date: "Aug 07", faculty: "M. Reyes",   note: "CSP caseload plan, tier split" },
  { date: "Jul 24", faculty: "J. Aguilar", note: "Intake screening walkthrough" },
];

const TIER_OPTIONS = [
  "Free \u2014 HMI referred",
  "$35 \u2014 sessions 1\u20136",
  "$55 \u2014 sessions 7\u201312",
];

const GRID_COLS = "96px 132px 92px 116px 128px 64px minmax(0,1fr)";

/* ================================================================
   CSP Dashboard
   ================================================================ */
export default function CspDashboard() {
  const { store } = useAcademy();
  const gap = store.gap || gapSeed;

  const [addOpen, setAddOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clients, setClients] = useState(DEMO_CLIENTS);
  const [conferences, setConferences] = useState(DEMO_CONFERENCES);
  const [apiReady, setApiReady] = useState(false);

  /* form fields */
  const [fInitials, setFInitials] = useState("");
  const [fTier, setFTier] = useState(TIER_OPTIONS[0]);
  const [fConcern, setFConcern] = useState("");
  const [fReferral, setFReferral] = useState("");
  const [fStart, setFStart] = useState("");

  /* conference form */
  const [confOpen, setConfOpen] = useState(false);
  const [fFaculty, setFFaculty] = useState("");
  const [fConfDate, setFConfDate] = useState("");
  const [fConfNote, setFConfNote] = useState("");

  /* load real data on mount */
  const loadData = useCallback(async () => {
    try {
      const [cRes, confRes] = await Promise.all([
        cspApi.getClients(),
        cspApi.getConferences(),
      ]);
      if (cRes.ok && confRes.ok) {
        const cData = await cRes.json();
        const confData = await confRes.json();
        if (cData.length > 0 || confData.length > 0) {
          setApiReady(true);
          setClients(cData.map((c) => {
            const sessLabel = `${c.sessions_completed} of ${c.sessions_planned}`;
            const lastDate = c.last_session_date
              ? new Date(c.last_session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "\u2014";
            const nextDate = c.next_session_date
              ? new Date(c.next_session_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Not booked";
            return {
              ...makeRow(c.initials, c.tier === "free" ? "Free" : c.tier, sessLabel, lastDate, nextDate, c.ccr_status || "due", c.status, c.concern || "TBD"),
              id: c.id,
            };
          }));
          setConferences(confData.map((c) => ({
            date: new Date(c.conference_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            faculty: c.faculty_name,
            note: c.notes || "",
          })));
        }
      }
    } catch { /* fallback to demo data */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* computed values */
  const daysLeft = daysTo(gap.hardStop);
  const weeksLeft = Math.max(1, Math.round(daysLeft / 7));
  const contactsDone = gap.contacts ? gap.contacts.done : 0;
  const confDone = apiReady ? conferences.length : (gap.conferences ? gap.conferences.done : 3);
  const clientCount = clients.filter((c) => c.status === "Active").length;
  const isEmpty = clients.length === 0;

  /* copy intake link */
  function copyLink() {
    const url = "https://pocketsuite.io/book/vrishihypno";
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  /* add client */
  async function addClient() {
    if (!fInitials.trim()) {
      setAddOpen(false);
      return;
    }
    const tierLabel = fTier.startsWith("Free") ? "free" : fTier.split(" ")[0];
    try {
      const r = await cspApi.addClient({
        initials: fInitials.trim(),
        tier: tierLabel,
        concern: fConcern.trim() || null,
        referral_source: fReferral.trim() || null,
        sessions_planned: 6,
        start_date: fStart || null,
      });
      if (r.ok) {
        setApiReady(true);
        await loadData();
      }
    } catch { /* fallback: add locally */ }
    if (!apiReady) {
      const displayTier = fTier.startsWith("Free") ? "Free" : fTier.split(" ")[0];
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const newRow = makeRow(
        fInitials.trim(), displayTier, "0 of 6", dateStr, "Not booked", "due", "active",
        fConcern.trim() || "TBD"
      );
      setClients((prev) => [...prev, newRow]);
    }
    setFInitials("");
    setFTier(TIER_OPTIONS[0]);
    setFConcern("");
    setFReferral("");
    setFStart("");
    setAddOpen(false);
  }

  /* add conference */
  async function addConference() {
    if (!fFaculty.trim() || !fConfDate) {
      setConfOpen(false);
      return;
    }
    try {
      const r = await cspApi.addConference({
        faculty_name: fFaculty.trim(),
        conference_date: fConfDate,
        notes: fConfNote.trim() || null,
      });
      if (r.ok) {
        setApiReady(true);
        await loadData();
      }
    } catch { /* fallback: add locally */ }
    if (!apiReady) {
      const dateStr = new Date(fConfDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      setConferences((prev) => [{ date: dateStr, faculty: fFaculty.trim(), note: fConfNote.trim() }, ...prev]);
    }
    setFFaculty("");
    setFConfDate("");
    setFConfNote("");
    setConfOpen(false);
  }

  /* inline style shorthands */
  const monoLabel = {
    fontFamily: "ui-monospace,Menlo,monospace",
    fontSize: "10px",
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "#8b85a0",
  };

  const monoSmall = {
    fontFamily: "ui-monospace,Menlo,monospace",
    fontSize: "10px",
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "#8b85a0",
  };

  const inputStyle = {
    background: "#0e0d14",
    border: "1px solid #322c44",
    borderRadius: "8px",
    padding: "10px 11px",
    fontSize: "14px",
    color: "#e9e4f2",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* breadcrumb */}
      <Link
        href="/command-deck"
        style={{
          fontFamily: "ui-monospace,Menlo,monospace",
          fontSize: "10px",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "#8b85a0",
          textDecoration: "none",
        }}
      >
        &larr; Clinical
      </Link>

      {/* header row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end",
        justifyContent: "space-between", margin: "14px 0 32px",
      }}>
        <div>
          <h1 style={{
            fontFamily: "Fraunces,Georgia,serif", fontSize: "clamp(30px,3.6vw,42px)",
            lineHeight: 1.1, letterSpacing: "-.018em", color: "#e9e4f2",
            margin: 0, fontWeight: 340,
          }}>
            CSP Dashboard
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "15px", lineHeight: 1.6, color: "#8b85a0" }}>
            Practicum contacts, conferences, and program health toward the Dec 10, 2026 hard stop.
          </p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          style={{
            background: "transparent",
            color: copied ? "#7fb98a" : "#8b85a0",
            border: `1px solid ${copied ? "rgba(127,185,138,.4)" : "#322c44"}`,
            borderRadius: "8px",
            padding: "11px 18px",
            fontFamily: "ui-monospace,Menlo,monospace",
            fontSize: "11px",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            cursor: "pointer",
            flex: "none",
          }}
        >
          {copied ? "Copied \u2713" : "Copy booking link"}
        </button>
      </div>

      {/* ── ZONE 1 -- STATS GATE BAR ─────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
        gap: "1px", background: "#262234", border: "1px solid #262234",
        borderRadius: "16px", overflow: "hidden", marginBottom: 24,
      }}>
        {/* Contacts */}
        <div style={{ background: "#16141f", padding: 18 }}>
          <div style={monoLabel}>Contacts</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "12px 0 14px" }}>
            <span style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 34, lineHeight: 1, color: "#e9e4f2" }}>
              {contactsDone}
            </span>
            <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13, color: "#5b566d" }}>
              / 24
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 40, background: "#0e0d14", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.round((contactsDone / 24) * 100)}%`,
              background: "#e0a458",
              borderRadius: 40,
            }} />
          </div>
          <div style={{
            fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
            letterSpacing: ".06em", color: "#e0a458", marginTop: 11,
          }}>
            {Math.ceil((24 - contactsDone) / weeksLeft)} per week needed
          </div>
        </div>

        {/* Conferences */}
        <div style={{ background: "#16141f", padding: 18 }}>
          <div style={monoLabel}>Conferences</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "12px 0 14px" }}>
            <span style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 34, lineHeight: 1, color: "#e9e4f2" }}>
              {confDone}
            </span>
            <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13, color: "#5b566d" }}>
              / 24
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 40, background: "#0e0d14", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.round((confDone / 24) * 100)}%`,
              background: "#8b7fd4",
              borderRadius: 40,
            }} />
          </div>
          <div style={{
            fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
            letterSpacing: ".06em", color: "#8b7fd4", marginTop: 11,
          }}>
            {Math.ceil((24 - confDone) / weeksLeft)} per week needed
          </div>
        </div>

        {/* Days left */}
        <div style={{ background: "#16141f", padding: 18 }}>
          <div style={monoLabel}>Days left</div>
          <div style={{
            fontFamily: "Fraunces,Georgia,serif", fontSize: 44, lineHeight: 1,
            color: "#e9e4f2", margin: "10px 0 8px",
          }}>
            {daysLeft}
          </div>
          <div style={{
            fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
            letterSpacing: ".1em", textTransform: "uppercase", color: "#5b566d",
          }}>
            to Dec 10
          </div>
          <div style={{
            fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
            letterSpacing: ".06em", color: "#5b566d", marginTop: 11,
          }}>
            {weeksLeft} weeks remaining
          </div>
        </div>

        {/* Program status */}
        <div style={{ background: "#16141f", padding: 18 }}>
          <div style={monoLabel}>Program status</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "14px 0 10px" }}>
            <span style={{
              width: 9, height: 9, borderRadius: "50%", background: "#7fb98a",
              boxShadow: "0 0 0 4px rgba(127,185,138,.14)", flex: "none",
            }} />
            <span style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 24, color: "#e9e4f2" }}>
              Approved
            </span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#8b85a0" }}>
            {contactsDone === 0
              ? "CSP approved Sep 1, 2026. Ready to receive referrals. Begin scheduling contacts."
              : `${contactsDone} contacts logged. Keep the pace -- 2+/week to Dec 10.`}
          </div>
        </div>
      </div>

      {/* ── ZONE 2 -- CLIENT TRACKER ─────────────────────────── */}
      <div style={{
        border: "1px solid #262234", borderRadius: "16px", background: "#16141f",
        overflow: "hidden", marginBottom: 24,
      }}>
        {/* toolbar */}
        <div style={{
          background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px",
          display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={monoLabel}>Client contacts</span>
            <span style={{
              fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
              letterSpacing: ".1em", color: "#5b566d",
            }}>
              {clientCount} active
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(!addOpen)}
            style={{
              background: addOpen ? "transparent" : "#8b7fd4",
              color: addOpen ? "#8b85a0" : "#0e0d14",
              border: `1px solid ${addOpen ? "#322c44" : "#8b7fd4"}`,
              borderRadius: "8px",
              padding: "8px 14px",
              fontFamily: "ui-monospace,Menlo,monospace",
              fontSize: "10px",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {addOpen ? "Cancel" : "+ Add client"}
          </button>
        </div>

        {/* add client form */}
        {addOpen && (
          <div style={{
            borderBottom: "1px solid #262234", background: "#1b1826", padding: 18,
            display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 14, alignItems: "end",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="ci" style={monoSmall}>Initials</label>
              <input
                id="ci"
                placeholder="A.M."
                value={fInitials}
                onChange={(e) => setFInitials(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="ct" style={monoSmall}>Tier</label>
              <select
                id="ct"
                value={fTier}
                onChange={(e) => setFTier(e.target.value)}
                style={inputStyle}
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="cc" style={monoSmall}>Presenting concern</label>
              <input
                id="cc"
                placeholder="Smoking cessation"
                value={fConcern}
                onChange={(e) => setFConcern(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="cr" style={monoSmall}>Referral source</label>
              <input
                id="cr"
                placeholder="HMI CSP desk"
                value={fReferral}
                onChange={(e) => setFReferral(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="cs" style={monoSmall}>Start date</label>
              <input
                id="cs"
                type="date"
                value={fStart}
                onChange={(e) => setFStart(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              onClick={addClient}
              style={{
                background: "#8b7fd4",
                color: "#0e0d14",
                border: "none",
                borderRadius: "8px",
                padding: "11px 18px",
                fontFamily: "ui-monospace,Menlo,monospace",
                fontSize: "10px",
                fontWeight: 650,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Save client
            </button>
          </div>
        )}

        {/* data grid */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 880 }}>
            {/* column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: GRID_COLS,
              gap: 16, padding: "12px 18px", borderBottom: "1px solid #262234",
            }}>
              {COLS.map((c) => (
                <div key={c} style={{
                  fontFamily: "ui-monospace,Menlo,monospace", fontSize: "9.5px",
                  letterSpacing: ".14em", textTransform: "uppercase", color: "#5b566d",
                }}>
                  {c}
                </div>
              ))}
            </div>

            {/* data rows */}
            {clients.map((cl, i) => (
              <div
                key={`${cl.initials}-${i}`}
                style={{
                  display: "grid", gridTemplateColumns: GRID_COLS,
                  gap: 16, padding: "15px 18px", borderBottom: "1px solid #1b1826",
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 14, color: "#e9e4f2" }}>
                  {cl.initials}
                </div>
                <div>
                  <span style={{
                    fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
                    letterSpacing: ".08em", textTransform: "uppercase",
                    color: cl.tierColor, border: `1px solid ${cl.tierBorder}`,
                    borderRadius: 40, padding: "4px 10px", whiteSpace: "nowrap",
                  }}>
                    {cl.tier}
                  </span>
                </div>
                <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: "12.5px", color: "#8b85a0" }}>
                  {cl.sessions}
                </div>
                <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: "12.5px", color: "#8b85a0" }}>
                  {cl.last}
                </div>
                <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: "12.5px", color: cl.nextColor }}>
                  {cl.next}
                </div>
                <div
                  style={{ display: "flex", gap: 7, alignItems: "center" }}
                  title={cl.ccrLabel}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: cl.ccrColor, flex: "none",
                  }} />
                  <span style={{
                    fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px", color: "#5b566d",
                  }}>
                    {cl.ccrShort}
                  </span>
                </div>
                <div style={{
                  display: "flex", gap: 12, alignItems: "center",
                  justifyContent: "space-between", minWidth: 0,
                }}>
                  <span style={{
                    fontFamily: "ui-monospace,Menlo,monospace", fontSize: "11px",
                    letterSpacing: ".06em", textTransform: "uppercase", color: cl.statusColor,
                  }}>
                    {cl.status}
                  </span>
                  <span style={{
                    fontSize: 13, color: "#5b566d", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {cl.concern}
                  </span>
                </div>
              </div>
            ))}

            {/* empty state */}
            {isEmpty && (
              <div style={{ padding: "64px 18px", textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, margin: "0 auto 18px", borderRadius: "50%",
                  border: "1px dashed #322c44", display: "grid", placeItems: "center",
                  color: "#5b566d", fontSize: 16,
                }}>
                  &#9675;
                </div>
                <div style={{
                  fontFamily: "Fraunces,Georgia,serif", fontSize: 20,
                  color: "#8b85a0", marginBottom: 8,
                }}>
                  No clients yet
                </div>
                <div style={{ fontSize: 14, color: "#5b566d" }}>
                  Share your PocketSuite booking link to get started.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ZONE 3 -- WEEKLY PLAN + CONFERENCES ──────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16,
      }}>
        {/* This week */}
        <div style={{
          border: "1px solid #262234", borderRadius: "16px", background: "#16141f", overflow: "hidden",
        }}>
          <div style={{
            background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px",
            display: "flex", justifyContent: "space-between", gap: 12,
            fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
            letterSpacing: ".14em", textTransform: "uppercase", color: "#8b85a0",
          }}>
            <span>This week</span>
            <span style={{ color: "#5b566d" }}>Aug 31 &ndash; Sep 6</span>
          </div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {DEMO_WEEK.map((s, i) => (
              <div
                key={`${s.initials}-${i}`}
                style={{
                  border: "1px solid #262234", borderRadius: 12, background: "#1b1826",
                  padding: 14, display: "flex", flexWrap: "wrap", gap: 12,
                  alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                  <span style={{
                    fontFamily: "ui-monospace,Menlo,monospace", fontSize: 14,
                    color: "#e9e4f2", flex: "none",
                  }}>
                    {s.initials}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, color: "#8b85a0" }}>
                      {s.when}
                    </span>
                    <span style={{
                      fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
                      letterSpacing: ".1em", textTransform: "uppercase", color: "#5b566d",
                    }}>
                      Session {s.n} &middot; {s.stage}
                    </span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flex: "none" }}>
                  <button
                    type="button"
                    style={{
                      background: "transparent", color: "#8b7fd4", border: "1px solid #322c44",
                      borderRadius: "8px", padding: "7px 12px",
                      fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
                      letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    Prep
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "transparent", color: "#8b85a0", border: "1px solid #322c44",
                      borderRadius: "8px", padding: "7px 12px",
                      fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
                      letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    Log CCR
                  </button>
                </div>
              </div>
            ))}
            {DEMO_WEEK.length === 0 && (
              <div style={{ padding: "32px 0", textAlign: "center", fontSize: 14, color: "#5b566d" }}>
                No sessions scheduled this week
              </div>
            )}
          </div>
        </div>

        {/* Conferences */}
        <div style={{
          border: "1px solid #262234", borderRadius: "16px", background: "#16141f", overflow: "hidden",
        }}>
          <div style={{
            background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px",
            display: "flex", justifyContent: "space-between", gap: 12,
            fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
            letterSpacing: ".14em", textTransform: "uppercase", color: "#8b85a0",
          }}>
            <span>Conferences</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: "#8b7fd4" }}>{confDone} / 24</span>
              <button type="button" onClick={() => setConfOpen(!confOpen)} style={{ background: confOpen ? "transparent" : "#8b7fd4", color: confOpen ? "#8b85a0" : "#0e0d14", border: `1px solid ${confOpen ? "#322c44" : "#8b7fd4"}`, borderRadius: 8, padding: "5px 10px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>{confOpen ? "Cancel" : "+ Log"}</button>
            </div>
          </div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* progress bar */}
            <div style={{ height: 6, borderRadius: 40, background: "#0e0d14", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.round((confDone / 24) * 100)}%`,
                background: "#8b7fd4",
                borderRadius: 40,
              }} />
            </div>

            {/* add conference form */}
            {confOpen && (
              <div style={{ border: "1px solid #262234", borderRadius: 12, background: "#1b1826", padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, alignItems: "end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="cf" style={monoSmall}>Faculty</label>
                  <input id="cf" placeholder="J. Aguilar" value={fFaculty} onChange={(e) => setFFaculty(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="cd" style={monoSmall}>Date</label>
                  <input id="cd" type="date" value={fConfDate} onChange={(e) => setFConfDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="cn" style={monoSmall}>Notes</label>
                  <input id="cn" placeholder="Topic discussed" value={fConfNote} onChange={(e) => setFConfNote(e.target.value)} style={inputStyle} />
                </div>
                <button type="button" onClick={addConference} style={{ background: "#8b7fd4", color: "#0e0d14", border: "none", borderRadius: 8, padding: "10px 14px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px", fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>Save</button>
              </div>
            )}

            {/* next conference */}
            <div style={{
              border: "1px solid #262234", borderLeft: "3px solid #8b7fd4", borderRadius: 12,
              background: "#1b1826", padding: 14, display: "flex", flexWrap: "wrap",
              gap: 12, alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{
                  fontFamily: "ui-monospace,Menlo,monospace", fontSize: "10px",
                  letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d",
                  marginBottom: 6,
                }}>
                  Next conference
                </div>
                <div style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 20, color: "#e9e4f2" }}>
                  Sep 4, 2026 &middot; 11:00
                </div>
              </div>
              <button
                type="button"
                style={{
                  background: "#8b7fd4", color: "#0e0d14", border: "none", borderRadius: "8px",
                  padding: "10px 16px", fontFamily: "ui-monospace,Menlo,monospace",
                  fontSize: "10px", fontWeight: 650, letterSpacing: ".1em",
                  textTransform: "uppercase", cursor: "pointer", flex: "none",
                }}
              >
                Book Conference
              </button>
            </div>

            {/* recent log */}
            <div style={{
              display: "flex", flexDirection: "column", gap: "1px", background: "#262234",
              border: "1px solid #262234", borderRadius: 12, overflow: "hidden",
            }}>
              <div style={{
                background: "#1b1826", padding: "10px 14px",
                fontFamily: "ui-monospace,Menlo,monospace", fontSize: "9.5px",
                letterSpacing: ".14em", textTransform: "uppercase", color: "#5b566d",
              }}>
                Recent log
              </div>
              {conferences.map((c, i) => (
                <div
                  key={`conf-${i}`}
                  style={{
                    background: "#1b1826", padding: "13px 14px",
                    display: "grid", gridTemplateColumns: "78px 118px minmax(0,1fr)",
                    gap: 12, alignItems: "baseline",
                  }}
                >
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, color: "#8b85a0" }}>
                    {c.date}
                  </span>
                  <span style={{ fontSize: "13.5px", color: "#e9e4f2" }}>
                    {c.faculty}
                  </span>
                  <span style={{
                    fontSize: 13, color: "#5b566d", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {c.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
