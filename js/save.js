// ============================================================
//  AstroForge — save / load / offline
// ============================================================
import { newState } from "./game.js";

const KEY = "astroforge.save.v3";

export function save(s) {
  try {
    s.lastTick = Date.now();
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    console.warn("save failed", e);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return migrate(s);
  } catch (e) {
    console.warn("load failed", e);
    return null;
  }
}

// Fill in any fields added in newer versions so old saves keep working.
function migrate(s) {
  const fresh = newState();
  const merged = { ...fresh, ...s };
  merged.settings = { ...fresh.settings, ...(s.settings || {}) };
  merged.run = { ...fresh.run, ...(s.run || {}) };
  merged.run.res = { ...fresh.run.res, ...(s.run?.res || {}) };
  merged.run.gens = { ...fresh.run.gens, ...(s.run?.gens || {}) };
  merged.run.techs = s.run?.techs || {};
  merged.run.missionLaunches = s.run?.missionLaunches || {};
  merged.run.milestonesDone = s.run?.milestonesDone || {};
  merged.legacyUpg = s.legacyUpg || {};
  return merged;
}

export function hardReset() {
  localStorage.removeItem(KEY);
}

// ---- export / import as a shareable string (base64 of JSON) ----
export function exportSave(s) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}
export function importSave(str) {
  const obj = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
  return migrate(obj);
}
