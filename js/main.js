// ============================================================
//  AstroForge — bootstrap & game loop
// ============================================================
import * as G from "./game.js";
import * as SaveMod from "./save.js";
import * as UI from "./ui.js";

let S = SaveMod.load() || G.newState();

// ---- offline progress ----
const OFFLINE_THRESHOLD = 20; // seconds away before we bother showing a recap
function handleOffline() {
  const now = Date.now();
  const away = (now - (S.lastTick || now)) / 1000;
  S.lastTick = now;
  if (away > OFFLINE_THRESHOLD) {
    const report = G.applyOffline(S, away);
    UI.showOfflineModal(report);
  } else if (away > 0) {
    G.tick(S, away); // brief gap, just catch up silently
  }
}

// ---- save helpers exposed to UI ----
let saveQueued = false;
function requestSave() { saveQueued = true; }
function flushSave() { if (saveQueued) { SaveMod.save(S); saveQueued = false; } }

window.__exportSave = () => SaveMod.exportSave(S);
window.__importSave = (code) => {
  try {
    const ns = SaveMod.importSave(code);
    if (!ns || !ns.run) return false;
    S = ns; UI.setState(S); SaveMod.save(S); UI.buildTab("build"); UI.toast("Loaded.");
    return true;
  } catch (e) { return false; }
};
window.__hardReset = () => {
  SaveMod.hardReset();
  S = G.newState(); UI.setState(S); SaveMod.save(S); UI.buildTab("build");
};

// ---- init ----
UI.init(S, { requestSave });
handleOffline();
SaveMod.save(S);

// ---- main loop ----
let lastTickTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTickTime) / 1000, 1); // clamp to avoid huge jumps on lag
  lastTickTime = now;
  G.tick(S, dt);
  UI.refresh();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- periodic + lifecycle saves ----
setInterval(() => { requestSave(); flushSave(); }, 8000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { requestSave(); flushSave(); }
});
window.addEventListener("pagehide", () => { requestSave(); flushSave(); });

// flush queued saves a few times a second (cheap)
setInterval(flushSave, 1000);

// ---- service worker (offline / installable) ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
