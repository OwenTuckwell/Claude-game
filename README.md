# 🚀 AstroForge — Idle Space Agency

An addictive, deep idle/clicker game for you and your crew. Build a rival space
agency from a single mining drone to an interstellar empire — then prestige and
do it faster. Installable to the Home Screen on **iPhone and Android** (it's a
PWA), and you three compete on a shared leaderboard.

Built with plain HTML/CSS/JS — **no build step, no dependencies**. Just static
files you can host anywhere.

---

## The game at a glance

- **Interlocking economy:** Ore → Alloy → Fuel → Funds → Science. Each feeds the
  others, so there's always a bottleneck to optimize.
- **17 generators** across 8 eras, each a new tier of the same resource lines.
- **Research tree** (spend Science) — production multipliers, automation
  (auto-buy, auto-launch), better offline efficiency, click power.
- **Rocket missions:** one-time **milestone** launches advance your era (Garage →
  Suborbital → Orbital → Lunar → Mars → Asteroid Belt → Outer Planets →
  Interstellar), plus repeatable missions for ongoing rewards.
- **Prestige ("Refound Agency"):** reset for **Legacy** points that permanently
  boost every future run, plus a meta-upgrade tree.
- **Offline progress:** the agency keeps earning while you're away.
- **Leaderboard:** compete with your dad and brother on score (lifetime science +
  prestige).

---

## Run it locally

ES modules need to be served over HTTP (opening `index.html` directly won't
work). Any static server is fine:

```bash
# Python
python3 -m http.server 8000
# or Node
npx serve .
```

Then open `http://localhost:8000`.

## Deploy it (free)

**GitHub Pages:** push this repo, then Settings → Pages → deploy from branch.
Your game will be live at `https://<user>.github.io/<repo>/`.

Other one-click options: Netlify, Cloudflare Pages, Vercel — drag-and-drop the
folder or point them at the repo. All static, all free.

## Install on your phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** open the site → menu → **Install app** / **Add to Home
  Screen**.

It launches full-screen with its own icon, and works offline thanks to the
service worker.

---

## Multiplayer leaderboard (5-minute setup)

The game works solo immediately. To share a board with your crew, deploy the
tiny included Cloudflare Worker (free tier is plenty):

```bash
npm i -g wrangler
wrangler login
cd server
wrangler kv namespace create SCORES   # paste the returned id into wrangler.toml
wrangler deploy                        # prints your Worker URL
```

Then, in the game's **Ranks** tab on each phone, paste the same Worker URL and
hit **Save URL**. Tap **Submit my score** to appear on the board. (You can also
hard-code the URL in `js/leaderboard.js` → `DEFAULT_ENDPOINT` so nobody has to
paste it.)

See `server/worker.js` for the full setup notes.

---

## Tuning the game

All balance lives in **`js/data.js`** — generators, research, missions, eras,
prestige, and legacy upgrades are plain data tables. Tweak numbers, add new
generators/techs/eras, and the engine (`js/game.js`) and UI (`js/ui.js`) pick
them up automatically. Bump the `CACHE` version in `service-worker.js` and the
`v3` suffixes when you ship changes so installed players get the update.

Regenerate the app icons after editing the art: `node scripts/gen-icons.mjs`.

## Project layout

```
index.html              app shell
manifest.webmanifest    PWA manifest (Home Screen install)
service-worker.js       offline caching
css/style.css           styles (mobile-first, dark space theme)
js/
  data.js               ALL game balance/content (edit me to tune)
  game.js               engine: production, costs, prestige, offline
  ui.js                 rendering + interactions
  save.js               localStorage save/load, export/import
  leaderboard.js        pluggable leaderboard client
  main.js               bootstrap + game loop
server/
  worker.js             Cloudflare Worker leaderboard backend
  wrangler.toml         Worker config
scripts/gen-icons.mjs   zero-dependency PNG icon generator
icons/                  generated app icons
```

Have fun out there, Commander. 🛰️
