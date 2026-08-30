"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "academy_store";

/* Drill ID → Skill-tree node ID */
const DRILL_SKILL = {
  intake: "pretalk", settle: "pretalk", pretalk: "pretalk",
  tom: "tom", armraise: "arm", autodual: "arm",
  count50: "count", reactional: "count", heavylight: "count", progrelax: "count",
  staircase: "stair", suggestions: "ssf", countout: "countout",
  fingerspread: "finger", eyefascination: "finger",
  handforehead: "challenge", armrigidity: "challenge",
  guidedimagery: "imagery", selfhypnosis: "countout",
  nlp_rapport: "pretalk", nlp_outcome: "pretalk", abreaction: "regress",
  inferred_rapport: "pretalk", inferred_induction: "arm",
  inferred_deepening: "count", inferred_suggestions: "ssf",
  inferred_metaphor: "imagery", overload_7pm2: "arm", ericksonian_confusion: "arm",
  homework: "countout",
};

/* Skill node prerequisite graph (same as skill-tree page) */
const PREREQS = {
  tom: [], ep: [], pretalk: [],
  arm: ["tom", "ep"], finger: ["ep"],
  snap: ["arm"], phs: ["snap"],
  count: ["phs"], stair: ["phs"], challenge: ["snap"],
  ssf: ["count", "stair"], imagery: ["stair"],
  selfimg: ["imagery"], countout: ["ssf"],
  verify: ["phs", "countout"],
  regress: ["ssf"], child: ["countout"], pain: ["verify"],
};

/* XP per rep type (real reps — logbook) */
const REP_XP = { "Client contact": 240, "Case conference": 120, "401 elective": 80, "Practicum workshop": 300 };

const DEFAULTS = {
  drillLog: [],    // [{ id, drillId, date, score, passed, xp }]
  sessionLog: [],  // [{ id, date, profile, plan, persona, durationSec, turns, checkpoints, phsCount, xp }]
  repLog: [],      // [{ id, date, client, type, outcome, xp, verified }]
  gap: {
    contacts: { done: 0, need: 24 }, conferences: { done: 3, need: 24 },
    electives: { done: 57, need: 135 }, workshops: { done: 15, need: 24 },
    asOf: "2026-08-08", hardStop: "2026-12-10",
  },
};

const Ctx = createContext(null);

export function AcademyStoreProvider({ children }) {
  const [store, setStore] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  /* hydrate from localStorage once */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStore((prev) => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore corrupt data */ }
    setLoaded(true);
  }, []);

  /* persist on change (skip the first render before hydration) */
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota */ }
  }, [store, loaded]);

  /* ── writers ── */

  const logDrill = useCallback(({ drillId, score, passed, xp }) => {
    const entry = {
      id: crypto.randomUUID(), drillId,
      date: new Date().toISOString().slice(0, 10),
      score: score ?? 0,
      passed: passed ?? score >= 80,
      xp: xp ?? Math.round((score ?? 0) * 0.5),
    };
    setStore((s) => ({ ...s, drillLog: [entry, ...s.drillLog].slice(0, 500) }));
  }, []);

  const logSession = useCallback(({ profile, plan, persona, durationSec, turns, checkpoints, phsCount }) => {
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      profile, plan, persona,
      durationSec: durationSec ?? 0, turns: turns ?? 0,
      checkpoints: checkpoints ?? 0, phsCount: phsCount ?? 0, xp: 300,
    };
    setStore((s) => ({ ...s, sessionLog: [entry, ...s.sessionLog].slice(0, 200) }));
  }, []);

  const logRep = useCallback(({ client, type, outcome }) => {
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      client, type, outcome,
      xp: REP_XP[type] || 0,
      verified: "\u231B pending",
    };
    setStore((s) => ({ ...s, repLog: [entry, ...s.repLog].slice(0, 200) }));
    return entry;
  }, []);

  const updateGap = useCallback((updates) => {
    setStore((s) => ({
      ...s,
      gap: { ...s.gap, ...updates, asOf: new Date().toISOString().slice(0, 10) },
    }));
  }, []);

  /* ── computed ── */

  const simXp = useMemo(() => store.drillLog.reduce((s, d) => s + (d.xp || 0), 0), [store.drillLog]);
  const realXp = useMemo(() => store.repLog.reduce((s, d) => s + (d.xp || 0), 0), [store.repLog]);
  const sessionXp = useMemo(() => store.sessionLog.reduce((s, d) => s + (d.xp || 0), 0), [store.sessionLog]);

  /* per-drill stats */
  const drillStats = useMemo(() => {
    const m = {};
    for (const d of store.drillLog) {
      if (!m[d.drillId]) m[d.drillId] = { attempts: 0, passes: 0, total: 0, lastDate: null };
      const s = m[d.drillId];
      s.attempts++; if (d.passed) s.passes++; s.total += d.score;
      if (!s.lastDate || d.date > s.lastDate) s.lastDate = d.date;
    }
    for (const k of Object.keys(m)) {
      m[k].avg = Math.round(m[k].total / m[k].attempts);
      m[k].passRate = Math.round((m[k].passes / m[k].attempts) * 100);
    }
    return m;
  }, [store.drillLog]);

  /* week streak */
  const weekStreak = useMemo(() => {
    const dates = new Set([
      ...store.drillLog.map((d) => d.date),
      ...store.sessionLog.map((d) => d.date),
      ...store.repLog.map((d) => d.date),
    ]);
    if (dates.size === 0) return 0;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let w = 0; w < 52; w++) {
      const ws = new Date(now); ws.setDate(ws.getDate() - ws.getDay() - w * 7);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      const hit = [...dates].some((d) => { const dt = new Date(d + "T00:00:00"); return dt >= ws && dt <= we; });
      if (hit) streak++; else break;
    }
    return streak;
  }, [store.drillLog, store.sessionLog, store.repLog]);

  /* skill node states — aggregated from drill stats */
  const skillNodes = useMemo(() => {
    /* aggregate per-drill stats into per-skill */
    const ns = {};
    for (const [drillId, skill] of Object.entries(DRILL_SKILL)) {
      const ds = drillStats[drillId];
      if (!ds) continue;
      if (!ns[skill]) ns[skill] = { attempts: 0, passes: 0, total: 0, lastDate: null, simXp: 0 };
      const n = ns[skill];
      n.attempts += ds.attempts; n.passes += ds.passes; n.total += ds.total;
      if (!n.lastDate || ds.lastDate > n.lastDate) n.lastDate = ds.lastDate;
    }
    /* compute simXp from drillLog */
    for (const d of store.drillLog) {
      const skill = DRILL_SKILL[d.drillId];
      if (skill && ns[skill]) ns[skill].simXp += d.xp || 0;
    }
    /* compute mastery + state */
    const result = {};
    for (const nodeId of Object.keys(PREREQS)) {
      const n = ns[nodeId];
      if (n && n.attempts > 0) {
        const mastery = Math.round((n.passes / n.attempts) * 100);
        result[nodeId] = {
          attempts: n.attempts, mastery,
          simXp: n.simXp, lastDate: n.lastDate,
          state: mastery >= 85 && n.attempts >= 3 ? "mastered" : "inprogress",
        };
      } else {
        /* check prereqs to determine available vs locked */
        const prereqs = PREREQS[nodeId] || [];
        const allUnlocked = prereqs.length === 0 || prereqs.every((p) => {
          const ps = result[p];
          return ps && (ps.state === "mastered" || ps.state === "inprogress");
        });
        result[nodeId] = { attempts: 0, mastery: 0, simXp: 0, lastDate: null, state: allUnlocked ? "available" : "locked" };
      }
    }
    return result;
  }, [drillStats, store.drillLog]);

  /* refresher list — drills sorted by staleness */
  const refreshers = useMemo(() => {
    const all = Object.entries(drillStats)
      .map(([id, s]) => ({ drillId: id, lastDate: s.lastDate, passRate: s.passRate }))
      .sort((a, b) => (a.lastDate || "").localeCompare(b.lastDate || ""));
    return all.slice(0, 5);
  }, [drillStats]);

  const value = useMemo(() => ({
    store, loaded,
    simXp, realXp, sessionXp, drillStats, weekStreak, skillNodes, refreshers,
    logDrill, logSession, logRep, updateGap,
  }), [store, loaded, simXp, realXp, sessionXp, drillStats, weekStreak, skillNodes, refreshers, logDrill, logSession, logRep, updateGap]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAcademy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAcademy must be inside AcademyStoreProvider");
  return ctx;
}

export { DRILL_SKILL, PREREQS, REP_XP };
