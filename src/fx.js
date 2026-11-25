// Woodblock effects: the wave and lantern fire.
import { PAL, lerp, clamp, smooth, rng, noise1, ink, shape, spline, loop, trace, contour } from './core.js';

const at = (c, t) => { const i = clamp(t) * (c.length - 1), k = Math.min(c.length - 2, Math.floor(i)), f = i - k; return [lerp(c[k][0], c[k + 1][0], f), lerp(c[k][1], c[k + 1][1], f)]; };
const tangent = (c, t) => { const a = at(c, t - 0.01), b = at(c, t + 0.01), m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / m, (b[1] - a[1]) / m]; };

// A foam finger: a hooked, forked claw of bare paper.
function claw(list, x, y, a, len, curl, depth) {
  const p = []; let cx = x, cy = y, d = a;
  for (let i = 0; i <= 6; i++) { p.push([cx, cy]); cx += Math.cos(d) * len / 6; cy += Math.sin(d) * len / 6; d += curl / 6 * (0.4 + i * 0.28); }
  list.push({ p, w: len * 0.36 });
  if (depth > 0) for (const [k, off] of [[2, -0.85], [4, 0.7]]) claw(list, p[k][0], p[k][1], a + curl * k / 6 + off, len * 0.56, curl * 1.15, depth - 1);
}
function drawFoam(g, claws, blobs, edge) {
  for (const b of blobs) { g.beginPath(); g.arc(b[0], b[1], b[2] + edge, 0, 7); g.fillStyle = PAL.navy; g.fill(); }
  claws.forEach((c, i) => ink(g, c.p, { w: c.w + edge * 2, color: PAL.navy, head: 0, tail: 0.85, wobble: 0, seed: i }));
  for (const b of blobs) { g.beginPath(); g.arc(b[0], b[1], b[2], 0, 7); g.fillStyle = '#f7f2e4'; g.fill(); }
  claws.forEach((c, i) => ink(g, c.p, { w: c.w, color: '#f7f2e4', head: 0, tail: 0.85, wobble: 0, seed: i }));
  for (const b of blobs) if (b[2] > 12) { g.beginPath(); g.arc(b[0] + b[2] * 0.15, b[1] + b[2] * 0.2, b[2] * 0.6, 0.3, 2.2); g.lineWidth = Math.max(1.5, b[2] * 0.09); g.strokeStyle = '#8fb7cc'; g.stroke(); }
}

// Breaking wave, curling to the left; flip mirrors it. rise and curl run 0..1.
export function wave(g, { x, y, s = 1, rise = 1, curl = 1, t = 0, seed = 1, flip = false, stripes = 19 }) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const r = rng(seed), k = rise, c = curl, wob = i => Math.sin(t * 2.1 + i * 1.7) * 7;
  const tip = [lerp(60, -330, c), lerp(-420, -220, c) * k + wob(1)];
  const A = spline([[-560, 330], [-330, 250], [-120, 110], [-30, -60 * k], [-70 * c, -240 * k + wob(2)], [-200 * c, -318 * k], [-296 * c - 8, -282 * k], tip], 22);
  const B = spline([[760, 330], [560, 200], [390, 10 * k], [250, -220 * k + wob(3)], [60, -410 * k], [-150 * c, -470 * k + wob(4)], [-300 * c - 10, -392 * k], tip], 22);
  const body = [...A, ...B.slice().reverse()];
  const gr = g.createLinearGradient(0, -460 * k, 0, 330);
  gr.addColorStop(0, '#2d6a9a'); gr.addColorStop(0.45, PAL.prussian); gr.addColorStop(1, '#0a1d3d');
  trace(g, body); g.fillStyle = gr; g.fill();
  g.save(); trace(g, body); g.clip();
  const cols = ['#dcecf0', '#0d2750', '#7fb2cc', '#17477e', '#f3f0e2', '#0d2750', '#5c98bb', '#17477e'];
  for (let i = 1; i < stripes; i++) {
    const q = i / stripes, pts = [];
    for (let j = 0; j <= 46; j++) {
      const u = j / 46, a = at(A, u), b = at(B, u), m = q + 0.018 * Math.sin(u * 9 + i + t * 2);
      pts.push([lerp(a[0], b[0], m), lerp(a[1], b[1], m)]);
    }
    ink(g, pts, { w: (i % 4 === 0 ? 24 : i % 2 ? 9 : 15) * (1.1 - q * 0.3), color: cols[i % cols.length], curve: false, head: 0.3, tail: 0.45, wobble: 0.1, seed: seed + i });
  }
  g.restore();
  contour(g, body, { w: 8, color: PAL.navy, seed });
  const claws = [], blobs = [];
  for (let u = 0.42; u <= 1; u += 0.014) {
    const p = at(A, u), v = tangent(A, u), a = Math.atan2(v[1], v[0]), big = r() > 0.6;
    claw(claws, p[0], p[1], a - 1.75 + (r() - 0.5) * 0.9 + wob(u * 20) * 0.012, (big ? 62 + r() * 46 : 26 + r() * 22) * (0.45 + u * 0.75), -1.7 - r() * 0.6, big ? 2 : 1);
    blobs.push([p[0] + (r() - 0.5) * 14, p[1] + (r() - 0.5) * 14, 6 + r() * 8]);
  }
  for (let u = 0.6; u <= 1; u += 0.013) {
    const p = at(B, u);
    for (let j = 0; j < 2; j++) blobs.push([p[0] + (r() - 0.5) * 20, p[1] + 2 + r() * 34 * (0.4 + u * 0.6), 6 + r() * 9]);
    if (r() > 0.3) claw(claws, p[0], p[1], -2.5 + (r() - 0.5) * 0.9, 24 + r() * 36, -1.6, 1);
  }
  drawFoam(g, claws, blobs, 4);
  for (let i = 0; i < 60; i++) {
    const u = r(), px = tip[0] - 190 + r() * 520, py = tip[1] - 130 + ((r() * 400 + t * 120 * (0.4 + u)) % 400);
    g.beginPath(); g.arc(px, py, 1.5 + r() * 5, 0, 7); g.fillStyle = '#f7f2e4'; g.fill();
  }
  g.restore();
}

// One flame tongue with the hooked tip of carved flames.
export function tongue(g, x, y, a, len, w, fill) {
  if (len < 3) return;
  const ca = Math.cos(a), sa = Math.sin(a), P = (u, v, k) => [x + ca * u * len - sa * v * w, y + sa * u * len + ca * v * w, k];
  trace(g, loop([P(0, -0.5), P(0.32, -0.62), P(0.62, -0.22), P(1, -0.55, 1), P(0.86, 0.06), P(0.56, 0.4), P(0.24, 0.62), P(0, 0.5)], 8));
  g.fillStyle = fill; g.fill();
}

export function fire(g, { x, y, w, h, t = 0, seed = 1 }) {
  for (const [k, col] of [[1, '#4d0f0c'], [0.88, PAL.vermilion], [0.68, PAL.ember], [0.46, PAL.amber], [0.24, '#fff3c4']])
    for (let i = 0; i < 13; i++) {
      const u = (i + 0.5) / 13 - 0.5, n = noise1(i * 1.9 + t * 4, seed);
      tongue(g, x + u * w * k, y, -Math.PI / 2 + u * 0.5 + n * 0.22, h * k * (0.55 + 0.45 * Math.cos(u * 2.6)) * (1 + 0.3 * n), w * 0.17 * k, col);
    }
}
