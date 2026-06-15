// ============================================================
//  AstroForge — UI rendering
// ============================================================
import {
  RESOURCES, GENERATORS, TECHS, MISSIONS, MILESTONES, LEGACY_UPGRADES, ERAS,
} from "./data.js";
import * as G from "./game.js";
import * as LB from "./leaderboard.js";

let S = null;
let requestSave = () => {};
let activeTab = "build";
let activeUpdater = null;
let ranksCache = { rows: [], status: "" };

const $ = sel => document.querySelector(sel);
const elFrom = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export function init(state, opts = {}) {
  S = state;
  requestSave = opts.requestSave || (() => {});
  buildResourceBar();
  bindTabs();
  bindContentDelegation();
  switchTab("build");
}
export function setState(state) { S = state; }

// ---------------- resource bar ----------------
function buildResourceBar() {
  $("#agency-name").textContent = S.company || "Unnamed Agency";
  const host = $("#resources");
  host.innerHTML = RESOURCES.map(r => `
    <div class="res" data-res="${r.id}">
      <div class="res-top"><span class="res-icon">${r.icon}</span><span class="res-name">${r.name}</span></div>
      <span class="res-val" id="resval-${r.id}">0</span>
      <span class="res-rate" id="resrate-${r.id}"></span>
    </div>`).join("");
}

function updateResourceBar() {
  const prod = G.production(S);
  for (const r of RESOURCES) {
    $("#resval-" + r.id).textContent = G.fmt(S.run.res[r.id]);
    const rateEl = $("#resrate-" + r.id);
    const rate = prod[r.id];
    rateEl.textContent = (rate > 0 ? "+" : "") + G.fmt(rate) + "/s";
    rateEl.classList.toggle("neg", rate < 0);
  }
  $("#agency-name").textContent = S.company || "Unnamed Agency";
  $("#era-badge").textContent = ERAS[S.run.era].tag + " · " + ERAS[S.run.era].name;
}

// ---------------- tabs ----------------
function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  buildTab(tab);
  $("#content").scrollTop = 0;
}

function buildTab(tab) {
  const c = $("#content");
  if (tab === "build") activeUpdater = buildBuildTab(c);
  else if (tab === "research") activeUpdater = buildResearchTab(c);
  else if (tab === "missions") activeUpdater = buildMissionsTab(c);
  else if (tab === "prestige") activeUpdater = buildPrestigeTab(c);
  else if (tab === "ranks") activeUpdater = buildRanksTab(c);
}

// called every frame by main loop
export function refresh() {
  updateResourceBar();
  updateTabBadges();
  if (activeUpdater) activeUpdater();
}

function updateTabBadges() {
  const research = TECHS.some(t => G.techAvailable(S, t) && S.run.res.science >= t.cost);
  const missions = G.canDoMilestone(S) || MISSIONS.some(m => G.canLaunch(S, m));
  const prestige = G.canPrestige(S);
  setBadge("research", research);
  setBadge("missions", missions);
  setBadge("prestige", prestige);
}
function setBadge(tab, on) {
  const b = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (b) b.classList.toggle("has-badge", on);
}

// ---------------- BUILD tab ----------------
function buildBuildTab(c) {
  const amt = S.settings.buyAmount;
  c.innerHTML = `
    <div class="tap-zone">
      <button class="tap-btn" data-action="scavenge">⛏️ Scavenge
        <small id="click-yield">+0 funds</small>
      </button>
    </div>
    <div class="section-title">Operations
      <span class="buy-toggle">
        <button data-action="set-buy" data-amt="1" class="${amt===1?'active':''}">×1</button>
        <button data-action="set-buy" data-amt="10" class="${amt===10?'active':''}">×10</button>
        <button data-action="set-buy" data-amt="max" class="${amt==='max'?'active':''}">MAX</button>
      </span>
    </div>
    <div id="gen-list">
      ${GENERATORS.map(genCardHTML).join("")}
    </div>`;

  return () => {
    $("#click-yield").textContent = "+" + G.fmt(G.clickPower(S) * G.eraMult(S) * (1 + S.legacyPoints * 0.02)) + " funds";
    for (const g of GENERATORS) updateGenCard(g);
    // keep buy toggle in sync
    document.querySelectorAll('[data-action="set-buy"]').forEach(b => {
      const v = b.dataset.amt === "max" ? "max" : Number(b.dataset.amt);
      b.classList.toggle("active", v === S.settings.buyAmount);
    });
  };
}

function genCardHTML(g) {
  return `
  <div class="card" data-gen="${g.id}">
    <div class="card-head">
      <div>
        <div class="card-title">${g.icon} ${g.name}</div>
        <div class="card-sub" data-field="sub"></div>
      </div>
      <div class="card-count" data-field="count">0</div>
    </div>
    <div class="card-desc">${g.desc}</div>
    <div class="card-output" data-field="output"></div>
    <div class="buy-row">
      <button class="buy-btn" data-action="buy-gen" data-id="${g.id}">
        <span data-field="buylabel">Buy</span>
        <span class="cost" data-field="cost"></span>
      </button>
    </div>
  </div>`;
}

function updateGenCard(g) {
  const card = document.querySelector(`.card[data-gen="${g.id}"]`);
  if (!card) return;
  const unlocked = G.genUnlocked(S, g);
  card.classList.toggle("locked", !unlocked);
  const count = S.run.gens[g.id];
  card.querySelector('[data-field="count"]').textContent = count;
  const costRes = RESOURCES.find(r => r.id === g.costRes);
  card.querySelector('[data-field="sub"]').textContent =
    `Each makes ${G.fmt(g.out)} ${g.produces}/s · costs ${costRes.icon}`;
  card.querySelector('[data-field="output"]').textContent =
    count ? `▲ producing ${G.fmt(G.genRate(S, g))} ${g.produces}/s` : "";

  const btn = card.querySelector('[data-action="buy-gen"]');
  const label = card.querySelector('[data-field="buylabel"]');
  const cost = card.querySelector('[data-field="cost"]');
  if (!unlocked) {
    btn.disabled = true;
    label.textContent = "🔒 Unlocks";
    cost.textContent = `${ERAS[g.era].tag} · ${ERAS[g.era].name}`;
    return;
  }
  const { amount, cost: price } = G.resolveBuy(S, g);
  label.textContent = `Buy ×${Math.max(amount, 1)}`;
  cost.textContent = `${costRes.icon} ${G.fmt(price)}`;
  btn.disabled = amount < 1 || S.run.res[g.costRes] < price;
}

// ---------------- RESEARCH tab ----------------
function buildResearchTab(c) {
  c.innerHTML = `
    <div class="section-title">Research Lab</div>
    <p class="empty-hint" id="research-empty" style="display:none">
      No research available yet. Build a Research Lab to start generating 🔬 Science,
      then advance eras to unlock deeper tech.</p>
    <div id="tech-list">${TECHS.map(techCardHTML).join("")}</div>`;
  return () => { for (const t of TECHS) updateTechCard(t); updateResearchEmpty(); };
}
function updateResearchEmpty() {
  const anyVisible = TECHS.some(t => G.techAvailable(S, t) || S.run.techs[t.id]);
  $("#research-empty").style.display = anyVisible ? "none" : "block";
}
function techCardHTML(t) {
  return `
  <div class="card" data-tech="${t.id}">
    <div class="card-head">
      <div><div class="card-title">${t.icon} ${t.name}</div></div>
    </div>
    <div class="card-desc">${t.desc}</div>
    <div data-field="tags"></div>
    <div class="buy-row" data-field="buyrow">
      <button class="buy-btn tech-btn" data-action="buy-tech" data-id="${t.id}">
        Research <span class="cost" data-field="cost"></span>
      </button>
    </div>
  </div>`;
}
function updateTechCard(t) {
  const card = document.querySelector(`.card[data-tech="${t.id}"]`);
  if (!card) return;
  const owned = !!S.run.techs[t.id];
  const avail = G.techAvailable(S, t);
  const locked = !owned && !avail;
  // Hide tech entirely until it's at least one era away of being relevant
  const visible = owned || avail || (t.era || 0) <= S.run.era + 1;
  card.style.display = visible ? "" : "none";
  card.classList.toggle("locked", locked && !owned);

  const tags = card.querySelector('[data-field="tags"]');
  const buyrow = card.querySelector('[data-field="buyrow"]');
  if (owned) {
    tags.innerHTML = `<span class="tag owned">✓ Researched</span>`;
    buyrow.style.display = "none";
    return;
  }
  buyrow.style.display = "";
  let tg = "";
  if (t.era > S.run.era) tg += `<span class="tag req">Needs ${ERAS[t.era].tag}</span>`;
  if (t.req) for (const r of t.req) if (!S.run.techs[r]) tg += `<span class="tag req">Needs ${G.TECH[r].name}</span>`;
  tags.innerHTML = tg;

  const btn = card.querySelector('[data-action="buy-tech"]');
  card.querySelector('[data-field="cost"]').textContent = "🔬 " + G.fmt(t.cost);
  btn.disabled = !avail || S.run.res.science < t.cost;
}

// ---------------- MISSIONS tab ----------------
function buildMissionsTab(c) {
  c.innerHTML = `
    <div class="section-title">Next Milestone</div>
    <div id="milestone-host"></div>
    <div class="section-title">Repeatable Missions</div>
    <div id="mission-list">${MISSIONS.map(missionCardHTML).join("")}</div>`;
  return () => { updateMilestone(); for (const m of MISSIONS) updateMissionCard(m); };
}
function updateMilestone() {
  const host = $("#milestone-host");
  const m = G.currentMilestone(S);
  if (!m) { host.innerHTML = `<div class="card"><div class="card-title">🏁 Maximum Era reached</div>
    <div class="card-desc">You've taken your agency to the stars. Prestige for Legacy and go again — faster.</div></div>`; return; }
  const costStr = Object.entries(m.cost).map(([r, v]) => {
    const res = RESOURCES.find(x => x.id === r);
    const have = S.run.res[r] >= v;
    return `<span class="tag ${have ? 'bonus' : 'req'}">${res.icon} ${G.fmt(v)}</span>`;
  }).join("");
  const can = G.canDoMilestone(S);
  host.innerHTML = `
  <div class="card">
    <div class="card-head"><div class="card-title">${m.icon} ${m.name}</div></div>
    <div class="card-desc">${m.desc}</div>
    <div class="card-output">Reward: 🔬 ${G.fmt(m.reward.science)} Science · advances to ${ERAS[Math.min(ERAS.length-1, S.run.era+1)].name}, ×${G.fmt(2.1)} all production</div>
    <div style="margin-top:8px">${costStr}</div>
    <div class="buy-row">
      <button class="buy-btn mission-btn" data-action="milestone" ${can ? "" : "disabled"}>🚀 Launch Milestone Mission</button>
    </div>
  </div>`;
}
function missionCardHTML(m) {
  return `
  <div class="card" data-mission="${m.id}">
    <div class="card-head"><div class="card-title">${m.icon} ${m.name}</div>
      <div class="card-count" data-field="launches">0</div></div>
    <div class="card-desc">${m.desc}</div>
    <div data-field="costtags" style="margin-top:6px"></div>
    <div class="card-output" data-field="reward"></div>
    <div class="buy-row">
      <button class="buy-btn mission-btn" data-action="launch" data-id="${m.id}">Launch <span class="cost" data-field="cost"></span></button>
    </div>
  </div>`;
}
function updateMissionCard(m) {
  const card = document.querySelector(`.card[data-mission="${m.id}"]`);
  if (!card) return;
  const avail = G.missionAvailable(S, m);
  card.classList.toggle("locked", !avail);
  card.querySelector('[data-field="launches"]').textContent = (S.run.missionLaunches[m.id] || 0) + "×";
  if (!avail) {
    card.querySelector('[data-field="costtags"]').innerHTML = `<span class="tag req">Unlocks in ${ERAS[m.era].tag}</span>`;
    card.querySelector('[data-field="reward"]').textContent = "";
    const btn = card.querySelector('[data-action="launch"]'); btn.disabled = true;
    card.querySelector('[data-field="cost"]').textContent = "🔒";
    return;
  }
  const cost = G.missionCost(S, m), reward = G.missionReward(S, m);
  card.querySelector('[data-field="costtags"]').innerHTML = Object.entries(cost).map(([r, v]) => {
    const res = RESOURCES.find(x => x.id === r); const have = S.run.res[r] >= v;
    return `<span class="tag ${have ? 'bonus' : 'req'}">${res.icon} ${G.fmt(v)}</span>`;
  }).join("");
  card.querySelector('[data-field="reward"]').textContent =
    "Reward: " + Object.entries(reward).map(([r, v]) => `${RESOURCES.find(x => x.id === r).icon} ${G.fmt(v)}`).join("  ");
  const btn = card.querySelector('[data-action="launch"]');
  btn.disabled = !G.canLaunch(S, m);
  card.querySelector('[data-field="cost"]').textContent = "";
}

// ---------------- PRESTIGE (Legacy) tab ----------------
function buildPrestigeTab(c) {
  c.innerHTML = `
    <div class="section-title">Refound Your Agency</div>
    <div id="prestige-host"></div>
    <div class="section-title">Legacy Upgrades — Permanent</div>
    <div id="legacy-list">${LEGACY_UPGRADES.map(legacyCardHTML).join("")}</div>
    <div class="section-title">Agency</div>
    <div class="row"><span>Agency name</span>
      <input type="text" id="company-input" maxlength="22" placeholder="Name your agency" value="${escapeAttr(S.company)}"/></div>
    <div class="row"><span>Save data</span>
      <span><button class="mini-btn" data-action="export">Export</button>
      <button class="mini-btn" data-action="import">Import</button></span></div>
    <div class="row"><span style="color:var(--bad)">Danger zone</span>
      <button class="mini-btn" data-action="hardreset" style="color:var(--bad)">Wipe save</button></div>
    <p class="empty-hint">Tip: install AstroForge to your Home Screen (Share → Add to Home Screen on iPhone, or the install prompt on Android) to play it like a real app.</p>`;
  return () => { updatePrestigeHost(); for (const u of LEGACY_UPGRADES) updateLegacyCard(u); };
}
function updatePrestigeHost() {
  const host = $("#prestige-host");
  const gain = G.prestigeGain(S);
  const can = gain > 0;
  host.innerHTML = `
  <div class="card">
    <div class="card-head"><div class="card-title">🌌 Legacy Reset</div>
      <div class="card-count">⭐ ${G.fmt(S.legacyPoints)}</div></div>
    <div class="card-desc">
      Disband and rebuild your agency. You lose generators, research and resources, but keep
      <b>Legacy points</b> (and everything you buy with them). Each Legacy point gives a permanent
      <b>+2%</b> to all production.</div>
    <div class="card-output">Reset now to gain <b>⭐ ${G.fmt(gain)}</b> Legacy &nbsp;·&nbsp; lifetime science this run: 🔬 ${G.fmt(S.run.runScience)}</div>
    <div class="buy-row">
      <button class="buy-btn prestige-btn" data-action="prestige" ${can ? "" : "disabled"}>
        ${can ? `Refound for ⭐ ${G.fmt(gain)}` : `Need 🔬 ${G.fmt(4e6)} science this run`}
      </button>
    </div>
  </div>`;
}
function legacyCardHTML(u) {
  return `
  <div class="card" data-legacy="${u.id}">
    <div class="card-head"><div class="card-title">${u.icon} ${u.name}</div>
      <div class="card-count" data-field="level"></div></div>
    <div class="card-desc">${u.desc}</div>
    <div class="buy-row">
      <button class="buy-btn prestige-btn" data-action="buy-legacy" data-id="${u.id}">
        Buy <span class="cost" data-field="cost"></span></button>
    </div>
  </div>`;
}
function updateLegacyCard(u) {
  const card = document.querySelector(`.card[data-legacy="${u.id}"]`);
  if (!card) return;
  const lvl = G.legacyLevel(S, u.id);
  card.querySelector('[data-field="level"]').textContent = u.repeatable ? `Lv ${lvl}/${u.maxLevel}` : (lvl ? "✓" : "—");
  const btn = card.querySelector('[data-action="buy-legacy"]');
  const costEl = card.querySelector('[data-field="cost"]');
  if (G.legacyMaxed(S, u)) { btn.disabled = true; btn.firstChild.textContent = "Maxed "; costEl.textContent = ""; return; }
  const cost = G.legacyCost(S, u);
  costEl.textContent = "⭐ " + G.fmt(cost);
  btn.disabled = S.legacyPoints < cost;
}

// ---------------- RANKS tab ----------------
function buildRanksTab(c) {
  const hasRemote = LB.hasRemote();
  c.innerHTML = `
    <div class="section-title">Agency Rankings</div>
    <div class="row"><span>Your score</span><b id="my-score">${G.fmt(G.score(S))}</b></div>
    <div id="ranks-host"></div>
    <div class="section-title">Leaderboard server</div>
    <div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
      <span style="color:var(--muted);font-size:12px">Paste your crew's shared leaderboard URL (a Cloudflare Worker — see server/worker.js). Everyone enters the same URL to compete.</span>
      <input type="text" id="endpoint-input" placeholder="https://astroforge-lb.yourname.workers.dev" value="${escapeAttr(LB.getEndpoint())}"/>
      <span><button class="mini-btn" data-action="save-endpoint">Save URL</button>
      <button class="mini-btn" data-action="refresh-ranks">Refresh</button>
      <button class="mini-btn" data-action="submit-score">Submit my score</button></span>
    </div>
    ${hasRemote ? "" : `<p class="empty-hint">No server set yet — you're seeing only your own score. Deploy the included Worker and paste its URL to play against your dad and brother.</p>`}`;
  renderRanksList();
  // auto refresh on open
  if (LB.hasRemote()) refreshRanks();
  return () => { const ms = $("#my-score"); if (ms) ms.textContent = G.fmt(G.score(S)); };
}
function renderRanksList() {
  const host = $("#ranks-host");
  if (!host) return;
  const myId = LB.playerId();
  let rows = ranksCache.rows.slice();
  if (!LB.hasRemote() || rows.length === 0) {
    rows = [{ id: myId, name: S.company || "You", score: G.score(S), era: S.run.era, prestiges: S.prestiges }];
  }
  rows.sort((a, b) => b.score - a.score);
  host.innerHTML = `<ul class="rank-list">${rows.slice(0, 25).map((r, i) => `
    <li class="${r.id === myId ? "me" : ""}">
      <span class="rank-pos">${i + 1}</span>
      <span class="rank-name">${escapeHtml(r.name || "Agency")}<small>${ERAS[Math.min(ERAS.length-1, r.era || 0)].name} · ${r.prestiges || 0} prestiges</small></span>
      <span class="rank-score">${G.fmt(r.score)}</span>
    </li>`).join("")}</ul>
    ${ranksCache.status ? `<p class="empty-hint">${ranksCache.status}</p>` : ""}`;
}
async function refreshRanks() {
  ranksCache.status = "Loading…"; renderRanksList();
  const res = await LB.fetchTop();
  if (res.ok) { ranksCache.rows = res.rows; ranksCache.status = res.rows.length ? "" : "No scores yet — submit yours!"; }
  else ranksCache.status = res.reason === "no-endpoint" ? "" : "Couldn't reach the leaderboard server.";
  renderRanksList();
}
async function submitScore() {
  if (!LB.hasRemote()) { toast("Set a server URL first"); return; }
  toast("Submitting…");
  const res = await LB.submitScore({ name: S.company || "Unnamed Agency", score: G.score(S), era: S.run.era, prestiges: S.prestiges });
  toast(res.ok ? "Score submitted!" : "Submit failed: " + res.reason);
  if (res.ok) refreshRanks();
}

// ---------------- click delegation ----------------
function bindContentDelegation() {
  $("#content").addEventListener("click", e => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.dataset.action, id = t.dataset.id;
    handleAction(a, id, t);
  });
}

function handleAction(a, id, el) {
  switch (a) {
    case "scavenge": {
      const y = G.manualClick(S); bump(el); requestSave(); break;
    }
    case "set-buy": {
      const v = el.dataset.amt === "max" ? "max" : Number(el.dataset.amt);
      S.settings.buyAmount = v; requestSave(); break;
    }
    case "buy-gen": if (G.buyGenerator(S, id)) { requestSave(); } else toast("Can't afford that"); break;
    case "buy-tech": if (G.buyTech(S, id)) { toast("Researched: " + G.TECH[id].name); requestSave(); } break;
    case "launch": if (G.launchMission(S, id)) { requestSave(); } else toast("Not enough resources"); break;
    case "milestone": {
      const m = G.doMilestone(S);
      if (m) { toast("🚀 " + m.name + " complete! New era unlocked."); buildTab("missions"); requestSave(); }
      break;
    }
    case "prestige": confirmPrestige(); break;
    case "buy-legacy": if (G.buyLegacy(S, id)) { requestSave(); } else toast("Not enough Legacy"); break;
    case "export": doExport(); break;
    case "import": doImport(); break;
    case "hardreset": confirmReset(); break;
    case "save-endpoint": { LB.setEndpoint($("#endpoint-input").value.trim()); toast("Server saved"); buildTab("ranks"); break; }
    case "refresh-ranks": refreshRanks(); break;
    case "submit-score": submitScore(); break;
  }
}

// ---------------- helpers: toast / modal ----------------
export function toast(msg) {
  const host = $("#toasts");
  const t = elFrom(`<div class="toast">${escapeHtml(msg)}</div>`);
  host.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function bump(el) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }

function modal(html) {
  const host = $("#modal-host");
  host.innerHTML = `<div class="modal-overlay">${html}</div>`;
  return host.querySelector(".modal");
}
function closeModal() { $("#modal-host").innerHTML = ""; }

export function showOfflineModal(report, onClose) {
  const lines = RESOURCES.filter(r => report.gained[r.id] > 0)
    .map(r => `<div><span>${r.icon} ${r.name}</span><b>+${G.fmt(report.gained[r.id])}</b></div>`).join("");
  const m = modal(`
    <div class="modal">
      <h2>🛰️ Welcome back, Commander</h2>
      <p>Your agency ran for <b>${G.fmtTime(report.seconds)}</b> while you were away
      (offline efficiency ${Math.round(report.eff * 100)}%).</p>
      <div class="modal-stats">${lines || "<div>Build some generators to earn while away!</div>"}</div>
      <button class="modal-btn" data-close>Collect</button>
    </div>`);
  m.querySelector("[data-close]").addEventListener("click", () => { closeModal(); onClose && onClose(); });
}

function confirmPrestige() {
  const gain = G.prestigeGain(S);
  const m = modal(`
    <div class="modal">
      <h2>🌌 Refound Agency?</h2>
      <p>You'll restart your operations but gain <b>⭐ ${G.fmt(gain)} Legacy</b>, boosting every future run.
      Generators, research, missions and resources reset.</p>
      <button class="modal-btn" data-yes>Refound for ⭐ ${G.fmt(gain)}</button>
      <button class="modal-btn secondary" data-no>Not yet</button>
    </div>`);
  m.querySelector("[data-yes]").addEventListener("click", () => {
    const g = G.doPrestige(S); closeModal();
    toast(`Refounded! Gained ⭐ ${G.fmt(g)} Legacy`); buildTab("prestige"); requestSave();
  });
  m.querySelector("[data-no]").addEventListener("click", closeModal);
}
function confirmReset() {
  const m = modal(`
    <div class="modal">
      <h2>⚠️ Wipe everything?</h2>
      <p>This permanently deletes your entire save — Legacy included. There is no undo.
      Consider Export first.</p>
      <button class="modal-btn secondary" data-no>Cancel</button>
      <button class="modal-btn" style="background:linear-gradient(135deg,#ff6b6b,#d63b3b);margin-top:8px" data-yes>Wipe save</button>
    </div>`);
  m.querySelector("[data-yes]").addEventListener("click", () => { closeModal(); window.__hardReset(); });
  m.querySelector("[data-no]").addEventListener("click", closeModal);
}
function doExport() {
  const code = window.__exportSave();
  const m = modal(`
    <div class="modal">
      <h2>Export save</h2>
      <p>Copy this code and keep it safe. Paste it on another device to continue there.</p>
      <textarea readonly style="width:100%;height:120px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:11px">${code}</textarea>
      <button class="modal-btn" data-copy>Copy</button>
      <button class="modal-btn secondary" data-close>Close</button>
    </div>`);
  m.querySelector("[data-copy]").addEventListener("click", () => {
    const ta = m.querySelector("textarea"); ta.select();
    navigator.clipboard?.writeText(code).then(() => toast("Copied!"), () => toast("Select & copy manually"));
  });
  m.querySelector("[data-close]").addEventListener("click", closeModal);
}
function doImport() {
  const m = modal(`
    <div class="modal">
      <h2>Import save</h2>
      <p>Paste a save code below. This overwrites your current game.</p>
      <textarea placeholder="Paste code…" style="width:100%;height:120px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:11px"></textarea>
      <button class="modal-btn" data-go>Import</button>
      <button class="modal-btn secondary" data-close>Cancel</button>
    </div>`);
  m.querySelector("[data-go]").addEventListener("click", () => {
    const code = m.querySelector("textarea").value.trim();
    if (!code) return;
    if (window.__importSave(code)) { closeModal(); toast("Imported!"); }
    else toast("Invalid save code");
  });
  m.querySelector("[data-close]").addEventListener("click", closeModal);
}

// company name input (bound after build via delegation won't catch input) — use a global listener
document.addEventListener("input", e => {
  if (e.target && e.target.id === "company-input") {
    S.company = e.target.value; $("#agency-name").textContent = S.company || "Unnamed Agency"; requestSave();
  }
});

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s || ""); }

export { buildTab };
