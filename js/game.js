// ============================================================
//  AstroForge — engine / game logic
// ============================================================
import {
  RESOURCES, GENERATORS, TECHS, MILESTONES, MISSIONS, LEGACY_UPGRADES,
  ERAS, ERA_MULT, LEGACY_PASSIVE, PRESTIGE,
} from "./data.js";

export const GEN = Object.fromEntries(GENERATORS.map(g => [g.id, g]));
export const TECH = Object.fromEntries(TECHS.map(t => [t.id, t]));
export const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
export const LEGACY = Object.fromEntries(LEGACY_UPGRADES.map(l => [l.id, l]));

// ---------- number formatting ----------
const SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
  "UD", "DD", "TD", "QaD", "QiD", "SxD", "SpD", "OcD", "NoD", "Vg"];
export function fmt(n) {
  if (n === Infinity) return "∞";
  if (n == null || isNaN(n)) return "0";
  const neg = n < 0; n = Math.abs(n);
  if (n < 1000) {
    const s = n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
    return (neg ? "-" : "") + s;
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIX.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return (neg ? "-" : "") + scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIX[tier];
  }
  return (neg ? "-" : "") + n.toExponential(2).replace("e+", "e");
}
export function fmtTime(s) {
  s = Math.floor(s);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// ---------- state ----------
export function newRunState(startEra, startFunds) {
  const gens = {};
  for (const g of GENERATORS) gens[g.id] = 0;
  return {
    res: { ore: 0, alloy: 0, fuel: 0, funds: startFunds, science: 0 },
    gens,
    techs: {},                    // id -> true
    missionLaunches: {},          // id -> count
    milestonesDone: {},           // id -> true
    era: startEra,
    runScience: 0,                // lifetime science earned THIS run (drives prestige)
    runStart: Date.now(),
  };
}

export function newState() {
  const s = {
    version: 3,
    company: "",
    legacyPoints: 0,
    legacyUpg: {},                // id -> level
    legacyEarnedTotal: 0,         // all-time legacy earned (leaderboard tie-break)
    allTimeScience: 0,            // all-time science across every run (leaderboard score)
    prestiges: 0,
    settings: { buyAmount: 1, autobuy: false, autolaunch: false },
    createdAt: Date.now(),
    lastTick: Date.now(),
    run: null,
  };
  s.run = newRunState(startEraFromLegacy(s), startFundsFromLegacy(s));
  return s;
}

// ---------- legacy-derived starting conditions ----------
export function startEraFromLegacy(s) {
  return Math.min(ERAS.length - 1, (s.legacyUpg.fasttrack || 0) * LEGACY.fasttrack.value);
}
export function startFundsFromLegacy(s) {
  const lvl = s.legacyUpg.headstart || 0;
  let f = 10;
  for (let i = 0; i < lvl; i++) f += LEGACY.headstart.value * Math.pow(10, i);
  return f;
}

// ---------- multipliers ----------
export function eraMult(s) { return Math.pow(ERA_MULT, s.run.era); }

export function categoryMult(s, cat) {
  let m = 1;
  for (const t of TECHS) {
    if (t.kind === "mult" && t.cat === cat && s.run.techs[t.id]) m *= t.value;
  }
  return m;
}

export function distinctGensOwned(s) {
  let c = 0;
  for (const g of GENERATORS) if (s.run.gens[g.id] > 0) c++;
  return c;
}

export function globalMult(s) {
  let m = 1;
  for (const t of TECHS) {
    if (!s.run.techs[t.id]) continue;
    if (t.kind === "global") m *= t.value;
    if (t.kind === "synergy") m *= (1 + t.value * distinctGensOwned(s));
  }
  // Legacy passive + upgrades (persist across prestige)
  m *= (1 + s.legacyPoints * LEGACY_PASSIVE);
  const vet = s.legacyUpg.veterans || 0;
  if (vet) m *= (1 + LEGACY.veterans.value * vet);
  if (s.legacyUpg.warpcore) m *= LEGACY.warpcore.value;
  return m;
}

export function clickPower(s) {
  let p = 1;
  for (const t of TECHS) if (t.kind === "click" && s.run.techs[t.id]) p *= t.value;
  const cm = s.legacyUpg.clickmaster || 0;
  if (cm) p *= Math.pow(LEGACY.clickmaster.value, cm);
  return p;
}

export function offlineEfficiency(s) {
  for (const t of TECHS) if (t.kind === "offline" && s.run.techs[t.id]) return t.value;
  return 0.5;
}

// per-generator output/sec (already includes count & all multipliers)
export function genRate(s, gen) {
  const count = s.run.gens[gen.id];
  if (!count) return 0;
  return gen.out * count * categoryMult(s, gen.cat) * globalMult(s) * eraMult(s);
}

// net production per second for each resource (generators only)
export function production(s) {
  const out = { ore: 0, alloy: 0, fuel: 0, funds: 0, science: 0 };
  for (const g of GENERATORS) out[g.produces] += genRate(s, g);
  return out;
}

// ---------- costs ----------
export function genUnlocked(s, gen) { return s.run.era >= gen.era; }

// cost to buy `amount` of a generator (geometric series)
export function genCost(s, gen, amount) {
  const owned = s.run.gens[gen.id];
  const g = gen.growth;
  const base = gen.cost * Math.pow(g, owned);
  if (amount === 1) return base;
  return base * (Math.pow(g, amount) - 1) / (g - 1);
}

export function maxAffordable(s, gen) {
  const owned = s.run.gens[gen.id];
  const g = gen.growth;
  const budget = s.run.res[gen.costRes];
  const base = gen.cost * Math.pow(g, owned);
  if (budget < base) return 0;
  const n = Math.floor(Math.log(1 + (budget * (g - 1)) / base) / Math.log(g));
  return Math.max(0, n);
}

// resolve buy amount setting -> concrete count + cost
export function resolveBuy(s, gen) {
  const setting = s.settings.buyAmount;
  let amount = setting === "max" ? maxAffordable(s, gen) : setting;
  if (amount < 1) amount = setting === "max" ? 0 : 1; // show x1 cost even if unaffordable
  const cost = amount >= 1 ? genCost(s, gen, amount) : genCost(s, gen, 1);
  return { amount, cost };
}

export function buyGenerator(s, genId) {
  const gen = GEN[genId];
  if (!genUnlocked(s, gen)) return false;
  let amount = s.settings.buyAmount === "max" ? maxAffordable(s, gen) : s.settings.buyAmount;
  if (amount < 1) return false;
  const cost = genCost(s, gen, amount);
  if (s.run.res[gen.costRes] < cost) return false;
  s.run.res[gen.costRes] -= cost;
  s.run.gens[genId] += amount;
  return true;
}

// ---------- research ----------
export function techAvailable(s, tech) {
  if (s.run.techs[tech.id]) return false;
  if (s.run.era < (tech.era || 0)) return false;
  if (tech.req) for (const r of tech.req) if (!s.run.techs[r]) return false;
  return true;
}
export function buyTech(s, techId) {
  const t = TECH[techId];
  if (!techAvailable(s, t)) return false;
  if (s.run.res.science < t.cost) return false;
  s.run.res.science -= t.cost;
  s.run.techs[techId] = true;
  if (t.kind === "feature") s.settings[t.flag] = true;
  return true;
}

// ---------- milestones (advance era) ----------
export function currentMilestone(s) {
  // the milestone that advances FROM the current era
  return MILESTONES[s.run.era] || null;
}
export function canDoMilestone(s) {
  const m = currentMilestone(s);
  if (!m || s.run.milestonesDone[m.id]) return false;
  for (const r in m.cost) if (s.run.res[r] < m.cost[r]) return false;
  return true;
}
export function doMilestone(s) {
  const m = currentMilestone(s);
  if (!canDoMilestone(s)) return null;
  for (const r in m.cost) s.run.res[r] -= m.cost[r];
  for (const r in (m.reward || {})) { s.run.res[r] += m.reward[r]; if (r === "science") gainScience(s, m.reward[r]); }
  s.run.milestonesDone[m.id] = true;
  s.run.era = Math.min(ERAS.length - 1, s.run.era + 1);
  return m;
}

// ---------- repeatable missions ----------
export function missionAvailable(s, m) { return s.run.era >= m.era; }
export function missionCost(s, m) {
  const launches = s.run.missionLaunches[m.id] || 0;
  const c = {};
  for (const r in m.cost) c[r] = m.cost[r] * Math.pow(m.costGrowth, launches);
  return c;
}
export function missionReward(s, m) {
  const launches = s.run.missionLaunches[m.id] || 0;
  const r = {};
  for (const k in m.reward) r[k] = m.reward[k] * Math.pow(m.rewardGrowth, launches);
  return r;
}
export function canLaunch(s, m) {
  if (!missionAvailable(s, m)) return false;
  const c = missionCost(s, m);
  for (const r in c) if (s.run.res[r] < c[r]) return false;
  return true;
}
export function launchMission(s, mId) {
  const m = MISSION[mId];
  if (!canLaunch(s, m)) return false;
  const c = missionCost(s, m), rw = missionReward(s, m);
  for (const r in c) s.run.res[r] -= c[r];
  for (const r in rw) { s.run.res[r] += rw[r]; if (r === "science") gainScience(s, rw[r]); }
  s.run.missionLaunches[mId] = (s.run.missionLaunches[mId] || 0) + 1;
  return true;
}

// ---------- science bookkeeping ----------
export function gainScience(s, amt) {
  s.run.runScience += amt;
  s.allTimeScience += amt;
}

// ---------- manual click ----------
export function manualClick(s) {
  const yield_ = clickPower(s) * eraMult(s) * (1 + s.legacyPoints * LEGACY_PASSIVE);
  s.run.res.funds += yield_;
  return yield_;
}

// ---------- prestige ----------
export function prestigeGain(s) {
  if (s.run.runScience < PRESTIGE.minScienceToPrestige) return 0;
  return Math.floor(Math.pow(s.run.runScience / PRESTIGE.divisor, PRESTIGE.exp));
}
export function canPrestige(s) { return prestigeGain(s) > 0; }
export function doPrestige(s) {
  const gain = prestigeGain(s);
  if (gain <= 0) return 0;
  s.legacyPoints += gain;
  s.legacyEarnedTotal += gain;
  s.prestiges += 1;
  s.run = newRunState(startEraFromLegacy(s), startFundsFromLegacy(s));
  return gain;
}

// ---------- legacy upgrades ----------
export function legacyLevel(s, id) { return s.legacyUpg[id] || 0; }
export function legacyCost(s, upg) {
  const lvl = legacyLevel(s, upg.id);
  if (!upg.repeatable) return upg.baseCost;
  return Math.ceil(upg.baseCost * Math.pow(upg.costGrowth, lvl));
}
export function legacyMaxed(s, upg) {
  if (!upg.repeatable) return !!s.legacyUpg[upg.id];
  return legacyLevel(s, upg.id) >= upg.maxLevel;
}
export function buyLegacy(s, id) {
  const upg = LEGACY[id];
  if (legacyMaxed(s, upg)) return false;
  const cost = legacyCost(s, upg);
  if (s.legacyPoints < cost) return false;
  s.legacyPoints -= cost;
  s.legacyUpg[id] = (s.legacyUpg[id] || 0) + 1;
  return true;
}

// ---------- leaderboard score ----------
// Monotonic measure of total progress; survives prestige.
export function score(s) {
  return Math.floor(s.allTimeScience + s.legacyEarnedTotal * PRESTIGE.divisor);
}

// ---------- the tick ----------
export function tick(s, dt) {
  if (dt <= 0) return;
  const prod = production(s);
  for (const r in prod) {
    s.run.res[r] += prod[r] * dt;
    if (r === "science") gainScience(s, prod[r] * dt);
  }
  // automation
  if (s.settings.autobuy) autoBuy(s);
  if (s.settings.autolaunch) for (const m of MISSIONS) if (canLaunch(s, m)) launchMission(s, m.id);
}

// auto-buy: buy the single most "valuable" affordable generator (highest cost we can afford)
export function autoBuy(s) {
  let best = null, bestCost = -1;
  const prev = s.settings.buyAmount;
  s.settings.buyAmount = 1;
  for (const g of GENERATORS) {
    if (!genUnlocked(s, g)) continue;
    const cost = genCost(s, g, 1);
    if (s.run.res[g.costRes] >= cost && cost > bestCost) { best = g; bestCost = cost; }
  }
  if (best) buyGenerator(s, best.id);
  s.settings.buyAmount = prev;
}

// offline catch-up: simulate in coarse steps so automation/era logic still roughly applies
export function applyOffline(s, seconds) {
  const eff = offlineEfficiency(s);
  const effective = seconds * eff;
  const before = { ...s.run.res };
  // simulate in chunks (cap total simulated to avoid runaway loops)
  const STEP = 5;
  let remaining = Math.min(effective, 60 * 60 * 24 * 30); // cap 30 days
  while (remaining > 0) {
    const dt = Math.min(STEP, remaining);
    tick(s, dt);
    remaining -= dt;
  }
  const gained = {};
  for (const r of RESOURCES) gained[r.id] = s.run.res[r.id] - before[r.id];
  return { seconds, eff, gained };
}
