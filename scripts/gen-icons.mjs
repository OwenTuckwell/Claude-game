// Generates AstroForge PNG app icons with zero dependencies (Node zlib only).
// Run: node scripts/gen-icons.mjs
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

// ---------- tiny PNG encoder (RGBA, 8-bit) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- drawing helpers (normalized 0..1 coords) ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const px = 1 / size; // antialias edge width in normalized units (~1px)

  // shapes return coverage 0..1 for a given (x,y)
  const circle = (x, y, cx, cy, r) => 1 - smooth(r - px, r + px, Math.hypot(x - cx, y - cy));
  const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
  const tri = (x, y, P) => {
    const d1 = sign(x, y, P[0], P[1], P[2], P[3]);
    const d2 = sign(x, y, P[2], P[3], P[4], P[5]);
    const d3 = sign(x, y, P[4], P[5], P[0], P[1]);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos) ? 1 : 0;
  };
  const capsule = (x, y, x0, y0, x1, y1, r) => {
    const dx = x1 - x0, dy = y1 - y0;
    const t = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0, 1);
    const px2 = x0 + dx * t, py2 = y0 + dy * t;
    return 1 - smooth(r - px, r + px, Math.hypot(x - px2, y - py2));
  };

  // palette
  const NAVY_T = [0x16, 0x24, 0x52], NAVY_B = [0x09, 0x0d, 0x1c];
  const CYAN = [0x46, 0xe0, 0xff], CYAN_D = [0x1f, 0x9a, 0xd6];
  const LIGHT = [0xdf, 0xf3, 0xff];
  const ORANGE = [0xff, 0x9d, 0x4d], ORANGE_D = [0xff, 0x6b, 0x2b];
  const YELLOW = [0xff, 0xd2, 0x4a];

  // fixed star field
  const stars = [[0.16, 0.2], [0.82, 0.16], [0.24, 0.78], [0.8, 0.74], [0.12, 0.52], [0.88, 0.46], [0.5, 0.1]];

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size, y = (j + 0.5) / size;
      // background: vertical gradient + soft radial glow
      let col = mix(NAVY_T, NAVY_B, smooth(0, 1, y));
      const glow = (1 - clamp(Math.hypot(x - 0.5, y - 0.32) / 0.6, 0, 1)) * 0.18;
      col = [clamp(col[0] + glow * 90, 0, 255), clamp(col[1] + glow * 120, 0, 255), clamp(col[2] + glow * 160, 0, 255)];

      // stars
      for (const s of stars) {
        const c = circle(x, y, s[0], s[1], 0.012) * 0.9;
        if (c > 0) col = mix(col, [255, 255, 255], c);
      }

      // ---- rocket ----
      // fins (orange) behind body
      const finL = tri(x, y, [0.39, 0.55, 0.29, 0.71, 0.40, 0.66]);
      const finR = tri(x, y, [0.61, 0.55, 0.71, 0.71, 0.60, 0.66]);
      if (finL) col = mix(col, mix(ORANGE, ORANGE_D, smooth(0.55, 0.71, y)), 1);
      if (finR) col = mix(col, mix(ORANGE, ORANGE_D, smooth(0.55, 0.71, y)), 1);

      // flame (below body)
      const flame = tri(x, y, [0.44, 0.66, 0.56, 0.66, 0.5, 0.86]);
      if (flame) col = mix(col, mix(YELLOW, ORANGE_D, smooth(0.66, 0.86, y)), 1);
      const flameInner = tri(x, y, [0.47, 0.66, 0.53, 0.66, 0.5, 0.79]);
      if (flameInner) col = mix(col, [255, 245, 200], 1);

      // body (cyan capsule)
      const body = capsule(x, y, 0.5, 0.34, 0.5, 0.64, 0.105);
      if (body > 0) col = mix(col, mix(CYAN, CYAN_D, smooth(0.0, 1.0, x - 0.45 + 0.5)), body);

      // nose cone (light triangle)
      const nose = tri(x, y, [0.5, 0.17, 0.395, 0.35, 0.605, 0.35]);
      if (nose) col = mix(col, LIGHT, 1);

      // window (navy with cyan rim)
      const rim = circle(x, y, 0.5, 0.43, 0.058);
      if (rim > 0) col = mix(col, CYAN_D, rim);
      const win = circle(x, y, 0.5, 0.43, 0.042);
      if (win > 0) col = mix(col, [0x0a, 0x16, 0x33], win);
      const glint = circle(x, y, 0.485, 0.415, 0.014);
      if (glint > 0) col = mix(col, [200, 240, 255], glint * 0.8);

      const o = (j * size + i) * 4;
      buf[o] = col[0] | 0; buf[o + 1] = col[1] | 0; buf[o + 2] = col[2] | 0; buf[o + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

mkdirSync(new URL("../icons/", import.meta.url), { recursive: true });
const out = (name, size) => {
  const png = draw(size);
  writeFileSync(new URL("../icons/" + name, import.meta.url), png);
  console.log("wrote icons/" + name, "(" + png.length + " bytes)");
};
out("icon-192.png", 192);
out("icon-512.png", 512);
out("icon-maskable-512.png", 512); // same art; content sits within the safe zone
