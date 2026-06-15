// ============================================================
//  AstroForge — leaderboard client (pluggable)
//
//  Phase 1: works locally with no backend (shows just you).
//  Phase 2: set an endpoint (a tiny Cloudflare Worker — see
//           /server/worker.js) and the three of you share a board.
//
//  The endpoint must support:
//    POST  {endpoint}/submit   body: {id, name, score, era, prestiges}
//    GET   {endpoint}/top      -> [{id,name,score,era,prestiges,ts}, ...]
// ============================================================

const ENDPOINT_KEY = "astroforge.lb.endpoint";
const PLAYERID_KEY = "astroforge.lb.playerid";

// Optional: hard-code your deployed Worker URL here so your crew doesn't
// have to paste it. Leave "" to configure in-app on the Ranks tab.
const DEFAULT_ENDPOINT = "";

export function getEndpoint() {
  return localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT || "";
}
export function setEndpoint(url) {
  if (url) localStorage.setItem(ENDPOINT_KEY, url.replace(/\/+$/, ""));
  else localStorage.removeItem(ENDPOINT_KEY);
}
export function hasRemote() { return !!getEndpoint(); }

export function playerId() {
  let id = localStorage.getItem(PLAYERID_KEY);
  if (!id) {
    id = "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem(PLAYERID_KEY, id);
  }
  return id;
}

async function withTimeout(promise, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await promise(ctrl.signal); }
  finally { clearTimeout(t); }
}

export async function submitScore({ name, score, era, prestiges }) {
  const endpoint = getEndpoint();
  if (!endpoint) return { ok: false, reason: "no-endpoint" };
  const body = { id: playerId(), name: name || "Unnamed Agency", score, era, prestiges };
  try {
    const res = await withTimeout(signal => fetch(endpoint + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }));
    if (!res.ok) return { ok: false, reason: "http-" + res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}

export async function fetchTop() {
  const endpoint = getEndpoint();
  if (!endpoint) return { ok: false, reason: "no-endpoint", rows: [] };
  try {
    const res = await withTimeout(signal => fetch(endpoint + "/top", { signal }));
    if (!res.ok) return { ok: false, reason: "http-" + res.status, rows: [] };
    const rows = await res.json();
    return { ok: true, rows: Array.isArray(rows) ? rows : [] };
  } catch (e) {
    return { ok: false, reason: "network", rows: [] };
  }
}
