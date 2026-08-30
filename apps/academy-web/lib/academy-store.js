"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  userApi, progressApi,
  setAccessToken, getAccessToken, getRefreshToken, setRefreshToken, clearTokens,
} from "./api";

const KEY = "academy_store";

/* Drill ID -> Skill-tree node ID */
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

/* XP per rep type (real reps -- logbook) */
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
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const isAuthenticated = !!user;

  /* fetch drill/session/gap from API and replace local store */
  async function syncFromApi() {
    try {
      const [drillsR, sessionsR, gapR] = await Promise.all([
        progressApi.getDrills("per_page=500"),
        progressApi.getSessions("per_page=200"),
        progressApi.getGap(),
      ]);
      const updates = {};
      if (drillsR.ok) {
        const data = await drillsR.json();
        updates.drillLog = data.drills.map((d) => ({
          id: d.id, drillId: d.drill_id,
          date: d.created_at.slice(0, 10),
          score: d.score, passed: d.score >= 80,
          xp: Math.round(d.score * 0.5),
        }));
      }
      if (sessionsR.ok) {
        const data = await sessionsR.json();
        updates.sessionLog = data.sessions.map((s) => ({
          id: s.id, date: s.created_at.slice(0, 10),
          profile: s.profile, plan: s.plan, persona: s.persona,
          durationSec: s.duration_s, turns: s.turns_total,
          checkpoints: s.awaits_total, phsCount: 0, xp: 300,
        }));
      }
      if (gapR.ok) {
        const g = await gapR.json();
        updates.gap = {
          contacts: { done: g.contacts.done, need: g.contacts.need },
          conferences: { done: g.conferences.done, need: g.conferences.need },
          electives: { done: g.electives.done, need: g.electives.need },
          workshops: { done: g.workshops.done, need: g.workshops.need },
          asOf: g.updated_at ? g.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          hardStop: g.hard_stop || "2026-12-10",
        };
      }
      if (Object.keys(updates).length) {
        setStore((s) => ({ ...s, ...updates }));
      }
    } catch { /* API unavailable -- keep localStorage data */ }
  }

  /* hydrate from localStorage + restore auth session */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStore((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {}
    setLoaded(true);

    /* try to restore auth from refresh token */
    const rt = getRefreshToken();
    if (!rt) { setAuthReady(true); return; }
    (async () => {
      try {
        const r = await userApi.me();
        if (r.ok) {
          const u = await r.json();
          setUser(u);
          await syncFromApi();
        } else {
          clearTokens();
        }
      } catch { clearTokens(); }
      setAuthReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* persist on change */
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
  }, [store, loaded]);

  /* ---- auth methods ---- */

  const login = useCallback(async (email, password) => {
    const r = await userApi.login(email, password);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed");
    }
    const data = await r.json();
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setUser(data.user);
    await syncFromApi();
    return data.user;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async ({ email, password, name }) => {
    const r = await userApi.register({ email, password, name });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed");
    }
    const data = await r.json();
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await userApi.logout(); } catch {}
    clearTokens();
    setUser(null);
    setStore(DEFAULTS);
  }, []);

  /* ---- writers ---- */

  const logDrill = useCallback(({ drillId, score, passed, xp, mode, minutesPlanned, durationS, checks, missed, notes }) => {
    const entry = {
      id: crypto.randomUUID(), drillId,
      date: new Date().toISOString().slice(0, 10),
      score: score ?? 0,
      passed: passed ?? score >= 80,
      xp: xp ?? Math.round((score ?? 0) * 0.5),
    };
    setStore((s) => ({ ...s, drillLog: [entry, ...s.drillLog].slice(0, 500) }));

    if (getAccessToken()) {
      progressApi.saveDrill({
        drill_id: drillId,
        mode: mode || "inferred",
        minutes_planned: minutesPlanned || 5,
        duration_s: durationS || 0,
        score: score ?? 0,
        checks: checks || {},
        missed: missed || [],
        notes: notes || null,
        request_ai_debrief: !!(missed && missed.length),
      }).catch(() => {});
    }
  }, []);

  const logSession = useCallback(({ profile, plan, persona, durationSec, turns, checkpoints, phsCount, epType, vak, stagesSeen, tonalitiesSeen, nlpTypesSeen, nlpCoveragePct, turnData }) => {
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      profile, plan, persona,
      durationSec: durationSec ?? 0, turns: turns ?? 0,
      checkpoints: checkpoints ?? 0, phsCount: phsCount ?? 0, xp: 300,
    };
    setStore((s) => ({ ...s, sessionLog: [entry, ...s.sessionLog].slice(0, 200) }));

    if (getAccessToken()) {
      progressApi.saveSession({
        profile, plan, persona,
        turns_total: turns ?? 0,
        awaits_total: checkpoints ?? 0,
        duration_s: durationSec ?? 0,
        ep_type: epType || null,
        vak: vak || null,
        nods_counted: 0,
        stages_seen: stagesSeen || [],
        tonalities_seen: tonalitiesSeen || [],
        nlp_types_seen: nlpTypesSeen || [],
        nlp_coverage_pct: nlpCoveragePct || 0,
        enrichment_stats: {},
        turns: turnData || [],
        request_ai_debrief: true,
      }).catch(() => {});
    }
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

    if (getAccessToken()) {
      const p = {};
      if (updates.contacts) { p.contacts_done = updates.contacts.done; p.contacts_need = updates.contacts.need; }
      if (updates.conferences) { p.conferences_done = updates.conferences.done; p.conferences_need = updates.conferences.need; }
      if (updates.electives) { p.electives_done = updates.electives.done; p.electives_need = updates.electives.need; }
      if (updates.workshops) { p.workshops_done = updates.workshops.done; p.workshops_need = updates.workshops.need; }
      if (updates.hardStop) p.hard_stop = updates.hardStop;
      if (Object.keys(p).length) progressApi.updateGap(p).catch(() => {});
    }
  }, []);

  /* ---- computed ---- */

  const simXp = useMemo(() => store.drillLog.reduce((s, d) => s + (d.xp || 0), 0), [store.drillLog]);
  const realXp = useMemo(() => store.repLog.reduce((s, d) => s + (d.xp || 0), 0), [store.repLog]);
  const sessionXp = useMemo(() => store.sessionLog.reduce((s, d) => s + (d.xp || 0), 0), [store.sessionLog]);

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

  const skillNodes = useMemo(() => {
    const ns = {};
    for (const [drillId, skill] of Object.entries(DRILL_SKILL)) {
      const ds = drillStats[drillId];
      if (!ds) continue;
      if (!ns[skill]) ns[skill] = { attempts: 0, passes: 0, total: 0, lastDate: null, simXp: 0 };
      const n = ns[skill];
      n.attempts += ds.attempts; n.passes += ds.passes; n.total += ds.total;
      if (!n.lastDate || ds.lastDate > n.lastDate) n.lastDate = ds.lastDate;
    }
    for (const d of store.drillLog) {
      const skill = DRILL_SKILL[d.drillId];
      if (skill && ns[skill]) ns[skill].simXp += d.xp || 0;
    }
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

  const refreshers = useMemo(() => {
    const all = Object.entries(drillStats)
      .map(([id, s]) => ({ drillId: id, lastDate: s.lastDate, passRate: s.passRate }))
      .sort((a, b) => (a.lastDate || "").localeCompare(b.lastDate || ""));
    return all.slice(0, 5);
  }, [drillStats]);

  const value = useMemo(() => ({
    store, loaded, user, isAuthenticated, authReady,
    simXp, realXp, sessionXp, drillStats, weekStreak, skillNodes, refreshers,
    logDrill, logSession, logRep, updateGap,
    login, register, logout,
  }), [store, loaded, user, isAuthenticated, authReady, simXp, realXp, sessionXp, drillStats, weekStreak, skillNodes, refreshers, logDrill, logSession, logRep, updateGap, login, register, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAcademy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAcademy must be inside AcademyStoreProvider");
  return ctx;
}

export { DRILL_SKILL, PREREQS, REP_XP };
