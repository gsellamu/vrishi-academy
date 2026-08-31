"use client";

/* ── API client for VRishi Academy backend ──
   user-svc :8602 — auth, users
   progress-svc :8603 — drills, sessions, gap, preferences

   Tokens: access in memory, refresh in localStorage.
   Auto-refresh on 401. Falls back gracefully when backend is down.
*/

const USER_SVC = process.env.NEXT_PUBLIC_USER_SVC || "http://localhost:8602";
const PROGRESS_SVC = process.env.NEXT_PUBLIC_PROGRESS_SVC || "http://localhost:8603";

const REFRESH_KEY = "academy_refresh";

let accessToken = null;

export function setAccessToken(t) { accessToken = t; }
export function getAccessToken() { return accessToken; }

export function getRefreshToken() {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}
export function setRefreshToken(t) {
  try {
    if (t) localStorage.setItem(REFRESH_KEY, t);
    else localStorage.removeItem(REFRESH_KEY);
  } catch { /* SSR or quota */ }
}

export function clearTokens() {
  accessToken = null;
  setRefreshToken(null);
}

async function refreshAccess() {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const r = await fetch(`${USER_SVC}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!r.ok) { clearTokens(); return false; }
    const data = await r.json();
    accessToken = data.access_token;
    setRefreshToken(data.refresh_token);
    return true;
  } catch { clearTokens(); return false; }
}

async function apiFetch(base, path, opts = {}) {
  const url = `${base}${path}`;
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let r = await fetch(url, { ...opts, headers });

  if (r.status === 401 && getRefreshToken()) {
    const ok = await refreshAccess();
    if (ok) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      r = await fetch(url, { ...opts, headers });
    }
  }
  return r;
}

/* ── User service (auth) ── */
export const userApi = {
  login: (email, password) =>
    fetch(`${USER_SVC}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  register: (data) =>
    fetch(`${USER_SVC}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  logout: () => {
    const rt = getRefreshToken();
    if (!rt) return Promise.resolve();
    return apiFetch(USER_SVC, "/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: rt }),
    });
  },

  me: () => apiFetch(USER_SVC, "/auth/me"),
};

/* ── Progress service ── */
export const progressApi = {
  getDrills: (params) =>
    apiFetch(PROGRESS_SVC, `/drills${params ? "?" + params : ""}`),

  getDrillStats: () =>
    apiFetch(PROGRESS_SVC, "/drills/stats"),

  saveDrill: (data) =>
    apiFetch(PROGRESS_SVC, "/drills", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSessions: (params) =>
    apiFetch(PROGRESS_SVC, `/sessions${params ? "?" + params : ""}`),

  saveSession: (data) =>
    apiFetch(PROGRESS_SVC, "/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getGap: () => apiFetch(PROGRESS_SVC, "/gap"),

  updateGap: (data) =>
    apiFetch(PROGRESS_SVC, "/gap", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getPreferences: () => apiFetch(PROGRESS_SVC, "/preferences"),

  updatePreferences: (data) =>
    apiFetch(PROGRESS_SVC, "/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

/* ── CSP (Community Service Program) ── */
export const cspApi = {
  /* public -- no auth required */
  submitIntake: (data) =>
    fetch(`${PROGRESS_SVC}/csp/intakes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  /* auth required */
  getIntakes: (status) =>
    apiFetch(PROGRESS_SVC, `/csp/intakes${status ? "?status=" + status : ""}`),

  updateIntakeStatus: (id, newStatus, notes) =>
    apiFetch(PROGRESS_SVC, `/csp/intakes/${id}/status?new_status=${encodeURIComponent(newStatus)}${notes ? "&notes=" + encodeURIComponent(notes) : ""}`, {
      method: "PUT",
    }),

  getClients: (status) =>
    apiFetch(PROGRESS_SVC, `/csp/clients${status ? "?status=" + status : ""}`),

  addClient: (data) =>
    apiFetch(PROGRESS_SVC, "/csp/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateClient: (id, data) =>
    apiFetch(PROGRESS_SVC, `/csp/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getConferences: () =>
    apiFetch(PROGRESS_SVC, "/csp/conferences"),

  addConference: (data) =>
    apiFetch(PROGRESS_SVC, "/csp/conferences", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
