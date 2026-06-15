// ============================================================
//  AstroForge leaderboard — Cloudflare Worker
//  A free, tiny backend so you, your dad and your brother share a board.
//
//  Setup (once, ~5 min):
//    1. Install Wrangler:        npm i -g wrangler
//    2. Login:                   wrangler login
//    3. Create a KV namespace:   wrangler kv namespace create SCORES
//       -> copy the returned id into wrangler.toml
//    4. Deploy:                  wrangler deploy
//    5. Copy the printed URL (e.g. https://astroforge-lb.<you>.workers.dev)
//       and paste it into the game's Ranks tab on each phone.
//
//  Endpoints:
//    GET  /top              -> [{id,name,score,era,prestiges,ts}, ...]  (top 50)
//    POST /submit  {id,name,score,era,prestiges}
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

const BOARD_KEY = "board"; // single JSON blob: { [id]: entry }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (url.pathname === "/top" && request.method === "GET") {
      const board = JSON.parse((await env.SCORES.get(BOARD_KEY)) || "{}");
      const rows = Object.values(board).sort((a, b) => b.score - a.score).slice(0, 50);
      return json(rows);
    }

    if (url.pathname === "/submit" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const id = String(body.id || "").slice(0, 40);
      if (!id) return json({ error: "missing id" }, 400);
      const entry = {
        id,
        name: String(body.name || "Agency").slice(0, 24),
        score: Math.max(0, Math.floor(Number(body.score) || 0)),
        era: Math.max(0, Math.floor(Number(body.era) || 0)),
        prestiges: Math.max(0, Math.floor(Number(body.prestiges) || 0)),
        ts: Date.now(),
      };
      const board = JSON.parse((await env.SCORES.get(BOARD_KEY)) || "{}");
      const prev = board[id];
      // keep the best score the player has ever reported
      if (!prev || entry.score >= prev.score) board[id] = entry;
      else { prev.name = entry.name; prev.ts = entry.ts; board[id] = prev; }
      await env.SCORES.put(BOARD_KEY, JSON.stringify(board));
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};
