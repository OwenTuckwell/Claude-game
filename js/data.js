// ============================================================
//  AstroForge — game data / balance
//  Everything here is data-driven so the game is easy to extend.
//  Tweak numbers freely; the engine reads from these tables.
// ============================================================

// ---- Resources shown in the top bar (order matters) ----
export const RESOURCES = [
  { id: "ore",     name: "Ore",     icon: "⛏️" },
  { id: "alloy",   name: "Alloy",   icon: "🔩" },
  { id: "fuel",    name: "Fuel",    icon: "⛽" },
  { id: "funds",   name: "Funds",   icon: "💲" },
  { id: "science", name: "Science", icon: "🔬" },
];

// ---- Eras: completing a milestone advances the era. ----
// Each era multiplies ALL production by eraMult^era (set in engine).
export const ERAS = [
  { name: "Garage Program",   tag: "Era I" },
  { name: "Suborbital",       tag: "Era II" },
  { name: "Orbital",          tag: "Era III" },
  { name: "Lunar",            tag: "Era IV" },
  { name: "Interplanetary",   tag: "Era V" },
  { name: "Asteroid Belt",    tag: "Era VI" },
  { name: "Outer Planets",    tag: "Era VII" },
  { name: "Interstellar",     tag: "Era VIII" },
];
export const ERA_MULT = 2.1; // global production multiplier per era reached

// ---- Generators -------------------------------------------------
// produces: resource id   |  out: units / sec per generator
// costRes:  resource spent to buy  |  cost: base cost  | growth: cost multiplier per owned
// cat: category used by research multipliers (== produced resource)
// era: era index at which this unlocks
export const GENERATORS = [
  // ----- ORE line -----
  { id: "prospector",     name: "Prospector",        icon: "⛏️", produces: "ore",   out: 0.5,   costRes: "funds", cost: 10,    growth: 1.13, cat: "ore",   era: 0,
    desc: "A grizzled rockhound chipping ore by hand. Where every empire starts." },
  { id: "mining_rig",     name: "Auto Mining Rig",   icon: "🚜", produces: "ore",   out: 9,     costRes: "funds", cost: 2600,  growth: 1.14, cat: "ore",   era: 2,
    desc: "Tracked rigs that tear through regolith around the clock." },
  { id: "asteroid_miner", name: "Asteroid Miner",    icon: "☄️", produces: "ore",   out: 140,   costRes: "funds", cost: 1.1e6, growth: 1.15, cat: "ore",   era: 5,
    desc: "Captures and digests metal-rich near-earth asteroids." },
  { id: "dyson_harvester",name: "Dyson Harvester",   icon: "🛰️", produces: "ore",   out: 6000,  costRes: "funds", cost: 6e9,   growth: 1.15, cat: "ore",   era: 7,
    desc: "Star-scale collectors stripping raw matter from a sun." },

  // ----- ALLOY line -----
  { id: "foundry",        name: "Foundry",           icon: "🔥", produces: "alloy", out: 0.3,   costRes: "ore",   cost: 8,     growth: 1.14, cat: "alloy", era: 0,
    desc: "Smelts raw ore into structural alloy." },
  { id: "alloy_plant",    name: "Alloy Plant",       icon: "🏭", produces: "alloy", out: 6,     costRes: "ore",   cost: 5200,  growth: 1.15, cat: "alloy", era: 3,
    desc: "Industrial-scale metallurgy with active cooling." },
  { id: "nanoforge",      name: "Nanoforge",         icon: "⚛️", produces: "alloy", out: 260,   costRes: "ore",   cost: 5.5e6, growth: 1.15, cat: "alloy", era: 6,
    desc: "Assembles alloy atom by atom. Near-perfect yield." },

  // ----- FUEL line -----
  { id: "refinery",       name: "Fuel Refinery",     icon: "⛽", produces: "fuel",  out: 0.2,   costRes: "alloy", cost: 12,    growth: 1.14, cat: "fuel",  era: 0,
    desc: "Cracks volatiles into rocket-grade propellant." },
  { id: "fusion_plant",   name: "Fusion Plant",      icon: "☢️", produces: "fuel",  out: 5,     costRes: "alloy", cost: 11000, growth: 1.15, cat: "fuel",  era: 4,
    desc: "Net-positive fusion. Bottles a tiny star for thrust." },
  { id: "antimatter_pod", name: "Antimatter Pod",    icon: "💥", produces: "fuel",  out: 220,   costRes: "alloy", cost: 1.2e7, growth: 1.15, cat: "fuel",  era: 7,
    desc: "Magnetically caged antimatter. Absurd energy density." },

  // ----- FUNDS line -----
  { id: "contracts",      name: "Contracts Office",  icon: "📈", produces: "funds", out: 1,     costRes: "alloy", cost: 10,    growth: 1.13, cat: "funds", era: 0,
    desc: "Sells alloy and services to fund operations." },
  { id: "quantum_market", name: "Quantum Market",    icon: "💹", produces: "funds", out: 45,    costRes: "alloy", cost: 9000,  growth: 1.14, cat: "funds", era: 4,
    desc: "Algorithmic trading desk that never sleeps." },
  { id: "galactic_exchange",name:"Galactic Exchange",icon: "🌐", produces: "funds", out: 1700,  costRes: "alloy", cost: 6e6,   growth: 1.15, cat: "funds", era: 6,
    desc: "An interstellar commodities exchange you own." },

  // ----- SCIENCE line -----
  { id: "lab",            name: "Research Lab",      icon: "🔬", produces: "science", out: 0.15, costRes: "funds", cost: 120,   growth: 1.15, cat: "science", era: 0,
    desc: "White-coats turning data into breakthroughs." },
  { id: "megalab",        name: "Mega-Lab",          icon: "🧪", produces: "science", out: 4,    costRes: "funds", cost: 6e4,    growth: 1.15, cat: "science", era: 3,
    desc: "A campus-sized lab complex running thousands of experiments." },
  { id: "ai_core",        name: "AI Research Core",  icon: "🧠", produces: "science", out: 160,  costRes: "funds", cost: 6e7,    growth: 1.16, cat: "science", era: 6,
    desc: "A superintelligent core that researches faster than any human team." },
];

// ---- Research / Tech tree (spends Science) -----------------------
// effect kinds:
//   mult   -> multiplies a category (cat) of generators by `value`
//   global -> multiplies ALL production by `value`
//   click  -> multiplies manual click power by `value`
//   feature-> unlocks a feature flag (autobuy / autolaunch / offline)
//   synergy-> +`value` global per distinct generator type that has >=1 owned
//   offline-> sets offline efficiency to `value` (0..1)
// req: array of tech ids required first.  era: era required to appear.
export const TECHS = [
  // Ore
  { id: "drills1", name: "Tungsten Drills",   icon: "⛏️", cost: 60,   kind: "mult", cat: "ore",   value: 2, desc: "Ore production ×2.", era: 0 },
  { id: "drills2", name: "Laser Drills",      icon: "⛏️", cost: 4000, kind: "mult", cat: "ore",   value: 3, desc: "Ore production ×3.", req: ["drills1"], era: 2 },
  { id: "drills3", name: "Plasma Boring",     icon: "⛏️", cost: 9e5,  kind: "mult", cat: "ore",   value: 4, desc: "Ore production ×4.", req: ["drills2"], era: 5 },

  // Alloy
  { id: "metal1", name: "Vacuum Smelting",    icon: "🔩", cost: 90,   kind: "mult", cat: "alloy", value: 2, desc: "Alloy production ×2.", era: 0 },
  { id: "metal2", name: "Crystalline Lattice",icon: "🔩", cost: 6000, kind: "mult", cat: "alloy", value: 3, desc: "Alloy production ×3.", req: ["metal1"], era: 3 },
  { id: "metal3", name: "Metamaterials",      icon: "🔩", cost: 1.4e6,kind: "mult", cat: "alloy", value: 4, desc: "Alloy production ×4.", req: ["metal2"], era: 6 },

  // Fuel
  { id: "fuel1", name: "Cryo Propellant",     icon: "⛽", cost: 150,  kind: "mult", cat: "fuel",  value: 2, desc: "Fuel production ×2.", era: 0 },
  { id: "fuel2", name: "Ion Catalysis",       icon: "⛽", cost: 12000,kind: "mult", cat: "fuel",  value: 3, desc: "Fuel production ×3.", req: ["fuel1"], era: 4 },
  { id: "fuel3", name: "Zero-Point Tap",      icon: "⛽", cost: 2.2e6,kind: "mult", cat: "fuel",  value: 4, desc: "Fuel production ×4.", req: ["fuel2"], era: 7 },

  // Funds
  { id: "money1", name: "Futures Desk",       icon: "💲", cost: 120,  kind: "mult", cat: "funds", value: 2, desc: "Funds production ×2.", era: 0 },
  { id: "money2", name: "HFT Algorithms",     icon: "💲", cost: 9000, kind: "mult", cat: "funds", value: 3, desc: "Funds production ×3.", req: ["money1"], era: 4 },
  { id: "money3", name: "Monopoly Charter",   icon: "💲", cost: 1.8e6,kind: "mult", cat: "funds", value: 4, desc: "Funds production ×4.", req: ["money2"], era: 6 },

  // Science
  { id: "sci1", name: "Peer Review",          icon: "🔬", cost: 300,  kind: "mult", cat: "science", value: 2, desc: "Science production ×2.", era: 0 },
  { id: "sci2", name: "Quantum Computing",    icon: "🔬", cost: 2.5e4,kind: "mult", cat: "science", value: 3, desc: "Science production ×3.", req: ["sci1"], era: 3 },
  { id: "sci3", name: "Mind-Machine Link",    icon: "🔬", cost: 4e6,  kind: "mult", cat: "science", value: 4, desc: "Science production ×4.", req: ["sci2"], era: 6 },

  // Global / synergy
  { id: "logistics", name: "Supply Logistics", icon: "📦", cost: 800,  kind: "global", value: 1.5, desc: "ALL production ×1.5.", era: 1 },
  { id: "synergy",   name: "Synergy Protocols",icon: "🔗", cost: 5e4,  kind: "synergy", value: 0.03, desc: "+3% to ALL production for each generator type you own.", era: 3 },
  { id: "overdrive", name: "Industrial Overdrive", icon: "⚡", cost: 3e6, kind: "global", value: 2, desc: "ALL production ×2.", req: ["logistics"], era: 5 },

  // Click power
  { id: "click1", name: "Hydraulic Press",    icon: "👆", cost: 40,   kind: "click", value: 5,  desc: "Manual scavenging ×5.", era: 0 },
  { id: "click2", name: "Robotic Arms",       icon: "👆", cost: 1.5e4,kind: "click", value: 10, desc: "Manual scavenging ×10.", req: ["click1"], era: 3 },

  // Automation & quality of life
  { id: "autobuy",   name: "Procurement AI",   icon: "🤖", cost: 2e5, kind: "feature", flag: "autobuy",   desc: "Unlocks Auto-Buy: repeatedly buys the best generator you can afford.", era: 4 },
  { id: "autolaunch",name: "Mission Control AI",icon: "🛰️", cost: 1e6, kind: "feature", flag: "autolaunch",desc: "Unlocks Auto-Launch: repeatable missions fire automatically when affordable.", era: 5 },
  { id: "telemetry", name: "Deep Telemetry",   icon: "📡", cost: 1.2e4,kind: "offline", value: 1.0, desc: "Offline progress runs at 100% efficiency (from 50%).", era: 2 },
];

// ---- Milestone missions (one-time) advance the era ---------------
// index i advances from era i to era i+1.  Requires current era == i.
export const MILESTONES = [
  { id: "m0", name: "First Launch",         icon: "🚀", cost: { fuel: 40,    alloy: 120,   funds: 600 },   reward: { science: 80 },
    desc: "Strap a homemade rocket to a test stand and light it. Reaches the edge of space." },
  { id: "m1", name: "Reach Orbit",          icon: "🛰️", cost: { fuel: 600,   alloy: 1500,  funds: 1.2e4 }, reward: { science: 1500 },
    desc: "Achieve a stable orbit. Your agency is now a spacefaring power." },
  { id: "m2", name: "Land on the Moon",     icon: "🌙", cost: { fuel: 8000,  alloy: 2e4,   funds: 1.5e5 }, reward: { science: 2.5e4 },
    desc: "Crewed landing on the lunar surface. One small step." },
  { id: "m3", name: "Colonize Mars",        icon: "🔴", cost: { fuel: 1.2e5, alloy: 3e5,   funds: 2.5e6 }, reward: { science: 4e5 },
    desc: "Establish a self-sustaining base on Mars." },
  { id: "m4", name: "Mine the Asteroid Belt",icon: "☄️", cost: { fuel: 2e6,   alloy: 5e6,   funds: 4e7 },   reward: { science: 7e6 },
    desc: "Industrialize the belt. Trillions of tons of metal, yours." },
  { id: "m5", name: "Reach the Outer Planets",icon: "🪐",cost: { fuel: 3e7,   alloy: 8e7,   funds: 6e8 },   reward: { science: 1.2e8 },
    desc: "Establish outposts around Jupiter and Saturn." },
  { id: "m6", name: "Build a Starship",     icon: "🌌", cost: { fuel: 5e8,   alloy: 1.2e9, funds: 1e10 },  reward: { science: 2e9 },
    desc: "Construct a vessel capable of crossing interstellar space." },
];

// ---- Repeatable missions (ongoing fuel/funds sink → rewards) -----
// cost/reward scale by growth^launches.
export const MISSIONS = [
  { id: "satellite", name: "Deploy Satellite", icon: "📡", era: 2,
    cost: { fuel: 60, funds: 800 }, reward: { science: 200, funds: 0 },
    costGrowth: 1.25, rewardGrowth: 1.22,
    desc: "Loft a comms/imaging satellite. Sells data for science." },
  { id: "expedition", name: "Mining Expedition", icon: "🛻", era: 3,
    cost: { fuel: 1200, funds: 2e4 }, reward: { ore: 5e4, funds: 8e4 },
    costGrowth: 1.24, rewardGrowth: 1.2,
    desc: "Send a crew to a rich body. Returns ore and a fat contract." },
  { id: "probe", name: "Deep Space Probe", icon: "🛸", era: 5,
    cost: { fuel: 2e6, funds: 5e6 }, reward: { science: 5e7 },
    costGrowth: 1.23, rewardGrowth: 1.2,
    desc: "Fling a probe into the dark. Pure scientific payoff." },
];

// ---- Legacy (prestige) upgrades — spend Legacy points ------------
// Repeatable upgrades use `repeatable:true` with per-level cost growth.
export const LEGACY_UPGRADES = [
  { id: "veterans", name: "Veteran Engineers", icon: "🎖️", repeatable: true, baseCost: 1, costGrowth: 1.6, maxLevel: 50,
    kind: "global_per_level", value: 0.10, desc: "+10% to ALL production per level. Stacks forever." },
  { id: "headstart", name: "Head Start", icon: "🎁", repeatable: true, baseCost: 2, costGrowth: 2, maxLevel: 15,
    kind: "startfunds", value: 500, desc: "Begin each new agency with more starting Funds (×10 per level)." },
  { id: "clickmaster", name: "Click Mastery", icon: "💪", repeatable: true, baseCost: 2, costGrowth: 1.8, maxLevel: 20,
    kind: "click_per_level", value: 2, desc: "Manual scavenging ×2 per level (permanent)." },
  { id: "fasttrack", name: "Fast Track", icon: "⏩", repeatable: true, baseCost: 5, costGrowth: 4, maxLevel: 4,
    kind: "startera", value: 1, desc: "Start each new agency one era further along." },
  { id: "warpcore", name: "Warp Core", icon: "🌀", repeatable: false, baseCost: 25,
    kind: "global", value: 5, desc: "A one-time ×5 to ALL production, forever." },
];

// Each Legacy point also grants a passive +2% global (handled in engine).
export const LEGACY_PASSIVE = 0.02;

// Soft cost of prestige: Legacy gained = floor( (lifetimeScienceThisRun / DIVISOR) ^ EXP )
export const PRESTIGE = { divisor: 1e6, exp: 0.5, minScienceToPrestige: 4e6 };
