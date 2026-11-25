// Extreme close-up of Shio's eyes, drawn at final size so the line stays fine.
import { W, H, PAL, lerp, clamp, rng, noise1, ink, loop, spline, trace, contour } from './core.js';
import { CAST } from './figure.js';

function bigEye(g, cx, cy, d, o) {
  const C = CAST.shio, P = (x, y, k) => [cx + d * x, cy + y, k], h = 112 * o.open, r = rng(d > 0 ? 5 : 9);
  const up = [P(-196, 44, 1), P(-140, -h * 0.16), P(-40, -h * 0.82), P(70, -h), P(160, -h * 0.62), P(214, -26, 1)];
  const lo = [P(168, h * 0.5), P(60, h * 0.84), P(-80, h * 0.72)], s = loop([...up, ...lo], 22);
  g.save(); trace(g, s); g.fillStyle = '#f6f1e8'; g.fill(); g.clip();
  for (let i = 0; i < 9; i++) { const y = -20 + r() * 80; ink(g, [P(-190 + r() * 30, y), P(-150 + r() * 20, y - 6 + r() * 12), P(-110 + r() * 30, y - 14 + r() * 28)], { w: 2, color: 'rgba(200,70,70,.45)', seed: i }); }
  const ix = cx + d * 14 + o.look * 10, iy = cy - 4, rx = 104, ry = 116;
  const el = (x, y, a, b, f) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fillStyle = f; g.fill(); };
  el(ix, iy, rx + 5, ry + 5, '#06222e');
  const q = g.createLinearGradient(0, iy - ry, 0, iy + ry); q.addColorStop(0, '#062a38'); q.addColorStop(0.45, '#14687a'); q.addColorStop(0.75, '#37b3b5'); q.addColorStop(1, '#cdf6e6'); el(ix, iy, rx, ry, q);
  g.save(); g.beginPath(); g.ellipse(ix, iy, rx, ry, 0, 0, 7); g.clip();
  for (let row = 0; row < 7; row++) for (let col = -3; col <= 3; col++) { // wave scales rising in the iris
    const x = ix + col * 52 + (row % 2 ? 26 : 0), y = iy + 118 - row * 27 + Math.sin(o.t * 3 + col + row) * 3;
    for (const k of [26, 18, 10]) { g.beginPath(); g.arc(x, y, k, Math.PI, 0); g.lineWidth = 2.2; g.strokeStyle = `rgba(214,250,240,${0.5 - row * 0.065})`; g.stroke(); }
  }
  for (let i = 0; i < 84; i++) { const a = i / 84 * 6.283; ink(g, [[ix + Math.cos(a) * 40, iy + Math.sin(a) * 46], [ix + Math.cos(a + 0.03) * 70, iy + Math.sin(a + 0.03) * 80], [ix + Math.cos(a) * 102, iy + Math.sin(a) * 114]], { w: 2.4, color: i % 3 ? 'rgba(4,34,46,.4)' : 'rgba(180,250,240,.28)', head: 0.1, tail: 0.6, seed: i }); }
  g.restore();
  el(ix, iy, 46 * o.pupil, 62 * o.pupil, '#030a10');
  el(ix - 38, iy - 50, 27, 33, '#ffffff'); el(ix + 42, iy + 46, 11, 14, 'rgba(255,255,255,.9)');
  el(ix + 30, iy - 26, 9, 15, '#ffb65e'); el(ix + 30, iy - 28, 4, 8, '#fff3c4'); // the lantern reflected
  const sh = g.createLinearGradient(0, cy - h, 0, cy - h * 0.1); sh.addColorStop(0, 'rgba(30,22,60,.75)'); sh.addColorStop(1, 'rgba(30,22,60,0)'); g.fillStyle = sh; g.fillRect(cx - 260, cy - h - 10, 520, h + 20);
  if (o.brim > 0) { ink(g, [P(150, h * 0.5), P(60, h * 0.8), P(-70, h * 0.68)], { w: 20 * o.brim, color: 'rgba(214,244,252,.85)', head: 0.4, tail: 0.4 }); ink(g, [P(110, h * 0.62), P(60, h * 0.74), P(10, h * 0.74)], { w: 5, color: '#ffffff' }); }
  g.restore();
  ink(g, [P(-206, 52), ...up.slice(1, 5), P(220, -32), P(258, -62)], { w: 30, color: '#0a1622', head: 0.8, tail: 0.16, wobble: 0.06 });
  for (let i = 0; i < 9; i++) { const u = i / 8, b = up[2 + Math.min(2, Math.floor(u * 3))], t = u * 3 % 1, e = up[Math.min(5, 3 + Math.min(2, Math.floor(u * 3)))]; const x = lerp(b[0], e[0], t), y = lerp(b[1], e[1], t); ink(g, [[x, y + 2], [x + d * (12 + u * 16), y - 16 - u * 4], [x + d * (34 + u * 34), y - 34 + u * 10]], { w: 11, color: '#0a1622', head: 0.02, tail: 0.95, seed: i }); }
  ink(g, [P(200, 0), P(160, h * 0.54), P(60, h * 0.88), P(-70, h * 0.76)], { w: 6, color: '#3a1d1a', head: 0.1, tail: 0.7 });
  for (let i = 0; i < 6; i++) ink(g, [P(168 - i * 24, h * (0.5 + i * 0.06)), P(176 - i * 24, h * (0.5 + i * 0.06) + 16), P(190 - i * 22, h * (0.5 + i * 0.06) + 26)], { w: 4, color: '#1b1a24', head: 0.02, tail: 0.9, seed: i });
  ink(g, [P(-160, -h * 0.3 - 22), P(-30, -h - 22), P(90, -h - 32), P(206, -h * 0.5 - 24)], { w: 5, color: '#a8705c' });
}

export function eyesCU(g, { n = 0, open = 1, pupil = 1, glowA = 0, brim = 0, t = 0 }) {
  const C = CAST.shio, cy = 570;
  const sk = g.createLinearGradient(0, 250, 0, 860); sk.addColorStop(0, '#6a5566'); sk.addColorStop(0.35, '#c9a797'); sk.addColorStop(0.7, '#f3dcc8'); sk.addColorStop(1, '#e9c9b4');
  g.fillStyle = sk; g.fillRect(-60, 180, W + 120, 760);
  g.fillStyle = 'rgba(120,70,70,.34)'; g.save(); g.globalAlpha = 0.45; trace(g, loop([[968, 520, 1], [984, 600], [990, 690], [1010, 762, 1], [978, 748], [966, 640]])); g.fill(); g.restore();
  g.fillStyle = 'rgba(120,64,64,.3)'; trace(g, loop([[1560, 300, 1], [2000, 240, 1], [2000, 900, 1], [1640, 900, 1], [1600, 640]])); g.fill();
  for (const d of [-1, 1]) {
    const cx = 960 + d * 400;
    for (let i = 0; i < 9; i++) ink(g, [[cx - 60 + i * 26, 730 + (i % 2) * 8], [cx - 40 + i * 26, 712]], { w: 3, color: 'rgba(200,80,70,.4)', curve: false, seed: i });
    bigEye(g, cx, cy, d, { open, pupil, brim, t, look: 0 });
    // Brow: overlapping hair strokes, driven down at the bridge.
    for (let i = 0; i < 26; i++) { const u = i / 25, x = 960 + d * lerp(150, 640, u), y = lerp(500, 352, Math.pow(u, 0.7)) + u * u * 54; ink(g, [[x - d * 34, y + 18 - u * 6], [x, y], [x + d * (54 + 12 * noise1(i, 4)), y - 12 + u * 24]], { w: 19 * (1 - u * 0.55), color: i % 3 ? '#14161c' : '#30343e', head: 0.3, tail: 0.7, seed: i }); }
    ink(g, [[960 + d * 44, 396], [960 + d * 34, 440], [960 + d * 50, 486]], { w: 6, color: '#7d4a44' }); ink(g, [[960 + d * 78, 410], [960 + d * 66, 444], [960 + d * 74, 474]], { w: 4, color: '#7d4a44' });
  }
  ink(g, [[990, 690], [1006, 746], [984, 772]], { w: 5, color: '#7d4636' });
  const dk = g.createLinearGradient(0, 240, 0, 620); dk.addColorStop(0, 'rgba(14,8,34,.8)'); dk.addColorStop(1, 'rgba(14,8,34,0)'); g.fillStyle = dk; g.fillRect(-60, 180, W + 120, 460);
  // Fringe in front, moving on a slow wind.
  const locks = [[-40, 210, 60, 880], [150, 200, 210, 800], [330, 190, 300, 560], [520, 190, 560, 470], [720, 190, 690, 540], [900, 190, 930, 430], [1080, 190, 1110, 520], [1290, 190, 1270, 470], [1480, 190, 1550, 600], [1700, 200, 1690, 820], [1900, 200, 1850, 900]];
  locks.forEach(([x0, y0, x1, y1], i) => {
    const sw = 16 * Math.sin(n / 7 + i * 0.8), w = 92 + (i % 3) * 16, q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, '#0f1218'); q.addColorStop(0.5, '#20242e'); q.addColorStop(1, '#2f3440');
    const c = loop([[x0 - w, y0 - 20, 1], [x0 + w, y0 - 20, 1], [lerp(x0, x1, 0.55) + w * 0.5 + sw * 0.4, lerp(y0, y1, 0.55)], [x1 + sw, y1, 1], [lerp(x0, x1, 0.5) - w * 0.45 + sw * 0.4, lerp(y0, y1, 0.5)]]);
    trace(g, c); g.fillStyle = q; g.fill(); contour(g, c, { w: 5, seed: i });
    for (let k = -1; k <= 1; k++) ink(g, [[x0 + k * w * 0.5, y0], [lerp(x0, x1, 0.5) + k * w * 0.26 + sw * 0.4, lerp(y0, y1, 0.5)], [x1 + sw + k * 3, y1 - 26]], { w: 3.5, color: k ? '#0a1622' : '#6f7480', head: 0.3, tail: 0.6, seed: i + k });
  });
  if (glowA > 0) for (const d of [-1, 1]) {
    const x = 960 + d * 414, q = g.createRadialGradient(x, cy, 0, x, cy, 420);
    q.addColorStop(0, `rgba(120,250,240,${0.75 * glowA})`); q.addColorStop(0.3, `rgba(60,200,220,${0.3 * glowA})`); q.addColorStop(1, 'rgba(20,120,180,0)');
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = q; g.fillRect(x - 420, cy - 420, 840, 840); g.restore();
  }
}
