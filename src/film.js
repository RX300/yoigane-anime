// The film: 1536 frames on a 12-frame beat grid. Each shot gets its local frame n and length N.
import { W, H, PAL, lerp, clamp, smooth, span, outCubic, inCubic, rng, noise1, layer, ink, shape, loop, spline, trace, contour, bokashi, textiles } from './core.js';
import { head } from './figure.js';
import { head3, bust3 } from './face.js';
import { lit, ground } from './light.js';
import { eyesCU } from './closeup.js';
import { VOWEL, VOICE, PHRASES } from './cues.js';
import { wave, fire } from './fx.js';
import { figure as rawFigure, hikui as rawHikui, tool, POSE, mix } from './body.js';
import { village, hearth, road, bridge, dawn, ferry, snow, glow, field } from './world.js';

// Scene light, chosen per shot in drawFrame.
const LIGHT = {
  night: { top: '#e4e4ef', bottom: '#b3b5d3', rim: '#cfe6ff', rimX: 6, rimY: -4 },
  hearth: { top: '#c98a5c', bottom: '#ffdcae', rim: '#ffb65e', rimX: 3, rimY: 6, y0: 300 },
  day: { top: '#ffffff', bottom: '#e9dcc6', rim: '#fff3d0', rimX: -4, rimY: -4, rimA: 0.6 },
  dread: { top: '#b79a94', bottom: '#6e4a4c', rim: '#ff8a4a', rimX: 5, rimY: 4 },
  wrath: { top: '#d2deea', bottom: '#8fa6c4', rim: '#8ff2f0', rimX: 6, rimY: -3 },
  bolt: { top: '#fff2dc', bottom: '#c98f74', rim: '#ffe7b8', rimX: 6, rimY: -3 },
  fire: { top: '#e2a27c', bottom: '#f0b083', rim: '#ffd271', rimX: -6, rimY: 3 },
  sea: { top: '#f2f6fa', bottom: '#9dbad6', rim: '#ffffff', rimX: 5, rimY: -5 },
  dawn: { top: '#f6e2d2', bottom: '#c9948a', rim: '#ffd7a0', rimX: 5, rimY: -5 },
};
const FIELD = {
  wrath: { sky: [[0, '#040916'], [0.5, '#142440'], [0.8, '#31547a']], far: '#223f63', mid: '#152a47', near: '#070f1d', rim: '#5d86aa', mist: '120,160,196', moon: [1500, 230, 78, '222,230,226'], deck: ['#3a4150', '#171d2a', '#6e2a22', '#c3d3e0'] },
  bolt: { sky: [[0, '#170d12'], [0.5, '#4a1f1e'], [0.8, '#9a4a30']], far: '#4a2422', mid: '#2d1618', near: '#12090b', rim: '#c97a4a', mist: '214,150,104', moon: [1500, 230, 70, '244,226,190'], deck: ['#4a3028', '#1c100e', '#8a2c20', '#e9d8bc'] },
  fire: { sky: [[0, '#0a0b18'], [0.5, '#1d1420'], [0.8, '#3a1c1a']], far: '#2c1a26', mid: '#1c1220', near: '#0a070e', rim: '#8a4a2c', mist: '120,60,44', deck: ['#3b2018', '#140907', '#7d2614', '#e08a48'] },
  cut: { sky: [[0, '#080f22'], [0.5, '#253050'], [0.8, '#6d6480']], far: '#39446a', mid: '#222c4b', near: '#0b1122', rim: '#8e98b8', mist: '170,160,180', moon: [1500, 220, 70, '236,226,206'], deck: ['#4b4a62', '#1d1e30', '#72333a', '#c4c2d6'] },
};
let L = LIGHT.night;
// What Shio's mouth is doing on this film frame, or null when she is not singing on screen.
let SING = null;
const voiceAt = (f, gain) => {
  if (!PHRASES.some(([a, b]) => f >= a && f <= b)) return null;
  const k = ((VOICE[f - 1] || 0) + 2 * (VOICE[f] || 0) + (VOICE[f + 1] || 0)) / 4;
  return { vowel: VOWEL[f], mouthK: k * gain };
};
const sung = (who, o) => (who === 'shio' && SING ? { ...o, e: { ...(o.e || {}), mouth: 'sing', ...SING } } : o);
const figure = (g, who, o0) => { const o = sung(who, o0); const k = clamp(0.45 * (o.s || 1), 0.25, 0.6); lit(g, q => rawFigure(q, who, o), { ...L, rimX: L.rimX * k, rimY: L.rimY * k, rimBlur: 0.8, rimA: 0.45 }); };
const hikui = (g, o) => lit(g, q => rawHikui(q, o), { top: '#ffffff', bottom: '#b9a6b4', rim: L.rim, rimX: L.rimX * 0.6, rimY: L.rimY * 0.6, rimA: 0.5 });
const bust = (g, who, o0) => { const o = sung(who, o0); lit(g, q => bust3(q, who, { ...o, dir: o.dir || ((o.yaw || 0) < 0 ? -1 : 1) }), L); };
const twos = n => Math.floor(n / 2) * 2;

// ---------- helpers ----------
function cam(g, { x = W / 2, y = H / 2, z = 1, rot = 0, shake = 0, f = 0 }, fn) {
  g.save();
  g.translate(W / 2 + shake * noise1(f * 0.9, 1), H / 2 + shake * noise1(f * 0.9, 2));
  g.rotate(rot); g.scale(z, z); g.translate(-x, -y);
  fn();
  g.restore();
}
const wash = (g, c, a = 1) => { g.save(); g.globalAlpha = a; g.fillStyle = c; g.fillRect(-200, -200, W + 400, H + 400); g.restore(); };

function radial(g, cx, cy, color, seed, { n = 110, inner = 330, wmax = 0.02 } = {}) {
  const r = rng(seed); g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, w = 0.003 + r() * wmax, r0 = inner * (0.8 + r() * 0.9);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7);
    g.lineTo(cx + Math.cos(a - w) * 1700, cy + Math.sin(a - w) * 1700); g.lineTo(cx + Math.cos(a + w) * 1700, cy + Math.sin(a + w) * 1700); g.fill();
  }
}
function streaks(g, color, seed, f, { n = 70, speed = 160, rot = 0 } = {}) {
  const r = rng(seed); g.save(); g.translate(W / 2, H / 2); g.rotate(rot);
  for (let i = 0; i < n; i++) {
    const y = (r() - 0.5) * H * 1.7, l = 200 + r() * 900, w = 1.5 + r() * 9, x = ((r() * 3200 - f * speed * (0.5 + r())) % 3200 + 3200) % 3200 - 1600;
    ink(g, [[x, y], [x + l / 2, y], [x + l, y]], { w, color, head: 0.5, tail: 0.5, curve: false, seed: i });
  }
  g.restore();
}
function embers(g, f, n, seed, { color = '255,190,90', up = 2.4, size = 1 } = {}) {
  const r = rng(seed);
  if (up > 3) { for (let i = 0; i < n; i++) { const z = 0.4 + r() * 1.6, x = r() * W + Math.sin(f / 16 + i) * 46 * z, y = H + 30 - ((r() * (H + 80) + f * up * z) % (H + 80)), l = 10 + 16 * z, a = -1.2 + 0.5 * Math.sin(f / 9 + i); ink(g, [[x, y], [x - Math.cos(a) * l * 0.5, y - Math.sin(a) * l * 0.5], [x - Math.cos(a) * l, y - Math.sin(a) * l]], { w: 2 + 2.4 * z, color: i % 4 ? '#ffb347' : '#fff1c0', head: 0.2, tail: 0.7, seed: i }); } return; }
  for (let i = 0; i < n; i++) {
    const z = 0.4 + r() * 1.6, x = r() * W + Math.sin(f / 22 + i) * 34 * z, y = H + 30 - ((r() * (H + 80) + f * up * z) % (H + 80)), k = (6 + 10 * z) * size;
    const q = g.createRadialGradient(x, y, 0, x, y, k); q.addColorStop(0, `rgba(255,246,214,.95)`); q.addColorStop(0.3, `rgba(${color},.7)`); q.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = q; g.fillRect(x - k, y - k, k * 2, k * 2);
  }
}
function drift(g, y0, color, seed) {
  const p = [[-240, H + 260]]; for (let x = -240; x <= W + 260; x += 40) p.push([x, y0 + noise1(x / 260, seed) * 34 + noise1(x / 70, seed + 1) * 9]);
  p.push([W + 260, H + 260]); trace(g, p); g.fillStyle = color; g.fill(); ink(g, p.slice(1, -1), { w: 5, color: '#8fb0c6', head: 0, tail: 0, seed });
}

// ---------- props ----------
export function bell(g, x, y, s, { swing = 0, crack = 1, ring = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(swing); g.scale(s, s);
  ink(g, [[-12, -8], [0, -34], [12, -8]], { w: 9, color: '#5a4420', head: 0.02, tail: 0.02 });
  const q = g.createLinearGradient(-60, 0, 60, 0); q.addColorStop(0, '#3f3a22'); q.addColorStop(0.3, '#b59a52'); q.addColorStop(0.42, '#f0dda0'); q.addColorStop(0.6, '#86713a'); q.addColorStop(1, '#2c2818');
  shape(g, [[-34, -2, 1], [0, -14], [34, -2, 1], [46, 40], [52, 92], [64, 122, 1], [0, 132], [-64, 122, 1], [-52, 92], [-46, 40]], q, { w: 6 });
  for (const yy of [16, 30, 84, 96]) ink(g, [[-41 - yy * 0.12, yy], [0, yy + 9], [41 + yy * 0.12, yy]], { w: 4, color: '#4a3d1c', head: 0.02, tail: 0.02 });
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 15, 45 - Math.abs(i) * 1.5, 4.4, 0, 7); g.fillStyle = '#e9d18a'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#3a3018'; g.stroke(); }
  if (crack) ink(g, [[18, 128], [10, 104], [24, 84], [12, 62], [22, 40]], { w: 7, color: crack > 1 ? '#f5d98a' : '#0e0b07', curve: false, head: 0.02, tail: 0.5 });
  g.restore();
  if (ring > 0) for (let i = 0; i < 3; i++) { const k = (ring + i * 0.33) % 1; g.beginPath(); g.arc(x, y + 70 * s, 70 * s + k * 330 * s, 0, 7); g.lineWidth = 5 * (1 - k); g.strokeStyle = `rgba(250,226,160,${(1 - k) * 0.6})`; g.stroke(); }
}
function suzu(g, x, y, s, swing = 0) { // the little round bell from Shio's cord
  g.save(); g.translate(x, y); g.rotate(swing); g.scale(s, s);
  const q = g.createRadialGradient(-12, -14, 4, 0, 0, 44); q.addColorStop(0, '#fff6cf'); q.addColorStop(0.4, '#e9bd52'); q.addColorStop(1, '#7a5a1c');
  shape(g, [[-10, -52], [10, -52], [8, -38], [-8, -38]], '#c79a3c', { w: 4 });
  shape(g, [[0, -40], [29, -29], [40, 0], [29, 29], [0, 40], [-29, 29], [-40, 0], [-29, -29]], q, { w: 5 });
  ink(g, [[-38, 6], [0, 18], [38, 6]], { w: 7, color: '#3a2a0c', head: 0.05, tail: 0.05 });
  g.beginPath(); g.arc(0, 15, 6, 0, 7); g.fillStyle = '#3a2a0c'; g.fill(); ink(g, [[0, 15], [0, 34]], { w: 5, color: '#3a2a0c', curve: false, head: 0, tail: 0 });
  g.restore();
}
function kite(g, x, y, s, f, dango = true, rot = 0, fold = false, gulp = -1) {
  const w = Math.sin(f * 1.1) * 60;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (!fold) for (const [far, ox] of [[1, 18], [0, 0]]) {
    const u = Math.sin(f * 1.1 + far * 0.4), tx = -40 + ox, ty = -118 * u - 14;
    for (let i = 0; i < 6; i++) { const q = i / 5, bx = lerp(tx + 20, tx - 20, q), by = lerp(ty * 0.62, ty, q); ink(g, [[bx, by], [bx - 34, by + 14 - u * 8], [bx - 74 + q * 10, by + 26 - u * 20 + q * 8]], { w: 21, color: far ? '#4d3018' : '#7a5230', head: 0.1, tail: 0.5, seed: i }); }
    if (!far) for (let i = 0; i < 5; i++) { const q = i / 5; ink(g, [[lerp(20, tx, q) - 20, lerp(0, ty, q) + 34], [lerp(20, tx, q) - 2, lerp(0, ty, q) + 20], [lerp(20, tx, q) + 14, lerp(0, ty, q) + 4]], { w: 5, color: '#d9b878', seed: i }); }
    shape(g, [[40 + ox, -10, 1], [6 + ox, ty * 0.5 - 18], [tx, ty, 1], [tx - 26, ty * 0.8 + 16], [-30 + ox, ty * 0.3 + 20], [6 + ox, 14, 1]], far ? '#4d3018' : '#7a5230', { w: 4, color: '#24160a' });
  }
  shape(g, [[-44, -8], [0, -26], [46, -12], [62, 8], [30, 30], [-30, 30], [-92, 46, 1], [-74, 20]], '#8f6538', { w: 4, color: '#24160a' });
  shape(g, [[52, -14], [78, -34], [102, -20], [98, 4], [70, 10]], '#8f6538', { w: 4, color: '#24160a' });
  shape(g, [[98, -20, 1], [138, -6, 1], [98, 2, 1]], '#d9a441', { w: 3.5 });
  g.beginPath(); g.arc(84, -14, 8, 0, 7); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.arc(87, -14, 3.6, 0, 7); g.fillStyle = '#000'; g.fill();
  if (fold) { // at rest: one closed wing, feet on the branch
    shape(g, [[34, -12], [-10, -24], [-60, -2], [-128, 44, 1], [-70, 34], [-10, 24], [30, 14]], '#7a5230', { w: 4, color: '#24160a' });
    for (let i = 0; i < 3; i++) ink(g, [[10 - i * 12, 2 + i * 6], [-40 - i * 10, 14 + i * 6], [-96 - i * 4, 34 + i * 3]], { w: 3, color: '#3a240f' });
    for (const q of [-6, 12]) ink(g, [[q, 28], [q + 2, 44], [q + 8, 50]], { w: 6, color: '#8a6d33', head: 0.05, tail: 0.1 });
  }
  if (gulp >= 0 && gulp <= 1) { g.beginPath(); g.ellipse(lerp(88, 40, gulp), lerp(6, 22, gulp), 17, 15, 0, 0, 7); g.fillStyle = '#8f6538'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#24160a'; g.stroke(); }
  if (dango) { g.save(); g.translate(128, 26); g.scale(0.62, 0.62); skewer(g, 30, 14, 0.35); g.restore(); }
  g.restore();
}
function skewer(g, x, y, a) {
  g.save(); g.translate(x, y); g.rotate(a);
  ink(g, [[-150, 0], [0, 0], [86, 0]], { w: 8, color: '#9b7342', head: 0.02, tail: 0.1, curve: false });
  ['#f3b6bd', '#fbf6e6', '#a9c57f'].forEach((c, i) => { g.beginPath(); g.arc(-46 + i * 46, 0, 26, 0, 7); g.fillStyle = c; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.sumi; g.stroke(); g.beginPath(); g.ellipse(-54 + i * 46, -9, 8, 5, -0.5, 0, 7); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill(); });
  g.restore();
}
function crane(g, x, y, s, f, rot = 0) {
  const u = Math.sin(f * 0.34), K = { w: 3.6, color: PAL.navy };
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const k of [-4, 4]) ink(g, [[-66, 8 + k], [-130, 16 + k], [-196, 12 + k * 2]], { w: 5, color: '#2a2f3a', head: 0.05, tail: 0.3 });
  const wing = (d, far) => {
    const ex = -18 - 26 * d, ey = -64 * u * d - 22, tx = -84 - 20 * d, ty = -176 * u * d - 8;
    for (let i = 0; i < 8; i++) { // primaries
      const q = i / 7, bx = lerp(ex, tx, 0.25 + q * 0.6), by = lerp(ey, ty, 0.25 + q * 0.6), a = Math.PI * (0.98 - 0.16 * q) - u * d * (0.5 + 0.5 * q);
      const L = 92 - q * 16; ink(g, [[bx, by], [bx + Math.cos(a) * L * 0.5, by - Math.sin(a) * L * 0.3 + 10], [bx + Math.cos(a) * L, by - Math.sin(a) * L * 0.6 + 14]], { w: 19, color: far ? '#233042' : '#14181f', head: 0.1, tail: 0.5, seed: i });
    }
    for (let i = 0; i < 9; i++) { // secondaries
      const q = i / 8, bx = lerp(36, ex, q), by = lerp(-8, ey, q); ink(g, [[bx, by], [bx - 34, by + 22 - u * d * 8], [bx - 74, by + 40 - u * d * 16]], { w: 18, color: far ? '#bcd3de' : '#f2eee0', head: 0.1, tail: 0.5, seed: i + 3 });
      ink(g, [[bx - 4, by + 4], [bx - 36, by + 26 - u * d * 8], [bx - 72, by + 42 - u * d * 16]], { w: 2.2, color: '#5f86a0', seed: i });
    }
    shape(g, [[40, -12, 1], [lerp(40, ex, 0.5), lerp(-14, ey, 0.5) - 12], [ex, ey - 8], [lerp(ex, tx, 0.6), lerp(ey, ty, 0.6) - 6], [tx, ty, 1], [lerp(ex, tx, 0.5) - 6, lerp(ey, ty, 0.5) + 20], [ex - 8, ey + 24], [lerp(40, ex, 0.5) - 8, lerp(-8, ey, 0.5) + 22], [16, 14, 1]], far ? '#c9dfe8' : '#fbf8ee', K);
  };
  wing(0.78, true);
  shape(g, [[-84, 10, 1], [-40, -16], [10, -24], [48, -20], [92, -44], [132, -62], [152, -66], [160, -56], [140, -46], [104, -24], [70, 2], [30, 22], [-30, 22]], '#fbf8ee', K);
  ink(g, [[70, -26], [104, -46], [140, -60]], { w: 9, color: '#14181f', head: 0.4, tail: 0.5 });
  ink(g, [[154, -62], [176, -60], [200, -56]], { w: 6, color: '#8a6d33', head: 0.05, tail: 0.8 });
  shape(g, [[144, -68], [154, -72], [160, -66], [150, -62]], PAL.vermilion, { w: 2 });
  g.beginPath(); g.arc(154, -60, 2, 0, 7); g.fillStyle = PAL.sumi; g.fill();
  wing(1, false);
  g.restore();
}
// Title strokes on a 100-unit grid: 宵 and 鐘, written brush stroke by brush stroke.
const KANJI = [
  [[[50, 2], [53, 12]], [[14, 16], [10, 30]], [[14, 18], [50, 17], [88, 17], [80, 30]], [[50, 24], [50, 44]], [[28, 28], [36, 40]], [[72, 27], [63, 40]],
    [[26, 48], [26, 70], [18, 96]], [[26, 48], [52, 47], [76, 47], [77, 92], [68, 88]], [[28, 63], [74, 62]], [[28, 78], [74, 77]]],
  [[[26, 4], [16, 20], [4, 30]], [[26, 8], [36, 18], [44, 24]], [[14, 34], [38, 33]], [[8, 50], [42, 48]], [[26, 34], [26, 86]], [[12, 60], [18, 74]], [[40, 58], [33, 74]], [[4, 92], [24, 87], [46, 82]],
    [[72, 2], [74, 10]], [[54, 14], [92, 13]], [[62, 18], [66, 27]], [[84, 18], [78, 28]], [[50, 32], [97, 31]], [[56, 40], [57, 64]], [[56, 41], [90, 40], [88, 64]], [[58, 52], [88, 51]], [[58, 63], [88, 62]], [[54, 76], [92, 75]], [[73, 41], [73, 92]], [[48, 94], [98, 92]]],
];
function title(g, x, y, s, prog, color) {
  const total = 30; let k = 0;
  KANJI.forEach((ch, c) => ch.forEach((st, i) => {
    const p = clamp(prog * total - k++); if (p <= 0) return;
    const sp = spline(st.length > 2 ? st : [st[0], [(st[0][0] + st[1][0]) / 2, (st[0][1] + st[1][1]) / 2], st[1]], 10);
    ink(g, sp.slice(0, Math.max(2, Math.ceil(sp.length * p))).map(v => [x + v[0] * s, y + c * 118 * s + v[1] * s]), { w: (c ? 5.8 : 8.6) * s, color, curve: false, head: 0.05, tail: 0.42, wobble: 0.14, seed: k });
  }));
}

// ---------- shots ----------
// Each element grows out of its bearer's trade.
const bellRings = (g, x, y, u) => { // bell-steel ringing
  for (let i = 0; i < 4; i++) { const k = clamp(u * 1.5 - i * 0.14); if (k <= 0 || k >= 1) continue; for (const [w, c] of [[9, '20,30,50'], [4.5, '250,224,150']]) { g.beginPath(); g.ellipse(x, y, 60 + k * 640, 46 + k * 480, 0, 0, 7); g.lineWidth = w * (1 - k); g.strokeStyle = `rgba(${c},${0.75 * (1 - k)})`; g.stroke(); } }
};
const drumHoop = (g, x, y, rad, a, tilt, front) => { // the laced hoop of a festival drum; back half first, front half over the target
  if (a <= 0) return;
  const h = Math.max(20, rad * 0.11), ry = rad * 0.26, a0 = front ? 0 : Math.PI, a1 = a0 + Math.PI, band = [], seg = 40;
  for (let k = 0; k <= seg; k++) { const q = lerp(a0, a1, k / seg); band.push([Math.cos(q) * rad, -h + Math.sin(q) * ry]); }
  for (let k = seg; k >= 0; k--) { const q = lerp(a0, a1, k / seg); band.push([Math.cos(q) * rad, h + Math.sin(q) * ry]); }
  g.save(); g.translate(x, y); g.rotate(tilt); g.globalAlpha *= a;
  trace(g, band); g.fillStyle = front ? 'rgba(150,52,34,.10)' : 'rgba(90,30,22,.08)'; g.fill();
  if (rad < 340) for (let k = 0; k < 9; k++) { const q = k2 => { const t = lerp(a0, a1, k2); return [Math.cos(t) * rad, Math.sin(t) * ry]; }, u = q(k / 9), v = q((k + 0.5) / 9), w = q((k + 1) / 9); ink(g, [[u[0], u[1] - h], [v[0], v[1] + h], [w[0], w[1] - h]], { w: 9, color: front ? '#d9583e' : '#8e3524', curve: false, head: 0.02, tail: 0.02, seed: k }); }
  for (const dy of [-h, h]) { const rim = []; for (let k = 0; k <= seg; k++) { const t = lerp(a0, a1, k / seg); rim.push([Math.cos(t) * rad, dy + Math.sin(t) * ry]); } ink(g, rim, { w: rad < 340 ? 20 : 11, color: '#1d0f0b', curve: false, head: 0.03, tail: 0.03 }); ink(g, rim, { w: rad < 340 ? 11 : 5, color: front ? '#efe6cf' : '#c9b48a', curve: false, head: 0.03, tail: 0.03 }); }
  g.restore();
};
const scaleArcs = (g, x, y, u, a0, a1) => { // seigaiha scales peel off Shio's coat and spread like a struck bell
  if (u <= 0 || u >= 1) return;
  for (let j = 5; j >= 0; j--) {
    const rad = 150 + j * 96 + outCubic(u) * (260 + j * 40), cnt = 7 + j * 3, al = clamp(1.5 * (1 - u)) * clamp(u * 9 - j * 0.5), sz = (58 - j * 4) * (0.7 + 0.5 * u);
    if (al <= 0) continue;
    g.save(); g.globalAlpha *= al;
    for (let i = 0; i < cnt; i++) {
      const q = a0 + (a1 - a0) * (i + (j % 2) * 0.5) / cnt;
      g.save(); g.translate(x + Math.cos(q) * rad, y + Math.sin(q) * rad * 0.86); g.rotate(q + Math.PI / 2);
      [[1, '#e9efee'], [0.76, '#1f4e79'], [0.52, '#e9efee'], [0.28, '#123a6b']].forEach(([k, c]) => { g.beginPath(); g.arc(0, 0, sz * k, Math.PI, 0); g.closePath(); g.fillStyle = c; g.fill(); g.lineWidth = 2.4; g.strokeStyle = PAL.navy; g.stroke(); });
      g.restore();
    }
    g.restore();
  }
};
const arrowFeathers = (g, n, n0, x0, x1) => { // a wall of yagasuri feathers driven by the drum
  const r = rng(91);
  for (let i = 0; i < 84; i++) {
    const s0 = r() * 15, u = span(n, n0 + s0, n0 + 15 + s0 + r() * 8), y = 180 + r() * 720, k = 0.7 + r() * 0.8, c = ['#e6e0ea', PAL.violet, '#3f3557', '#c9bfe0'][i % 4];
    if (u <= 0 || u >= 1) continue;
    const fan = outCubic(clamp(u * 2.4)), x = lerp(x0, x1, u), a = 0.05 * Math.sin(i * 2.1 + n / 3) + (y - 770) / 1500 * (1 - fan);
    g.save(); g.translate(x, lerp(770 + (y - 540) * 0.2, y, fan) + 24 * Math.sin(u * 5 + i) * fan); g.rotate(a); g.scale(k * (0.25 + 0.75 * fan), k * (0.25 + 0.75 * fan));
    for (const d of [-1, 1]) for (let m = 0; m < 2; m++) shape(g, [[-62 + m * 46, d * 2, 1], [-80 + m * 46, d * 26, 1], [-38 + m * 46, d * 26, 1], [-18 + m * 46, d * 2, 1]], m ? c : '#f4f0f8', { w: 3, color: '#1b1433', seed: i });
    ink(g, [[-96, 0], [0, 0], [64, 0]], { w: 5, color: '#1b1433', curve: false, head: 0.05, tail: 0.3 });
    g.restore();
  }
};
const lanternCage = (g, o) => { // a giant lantern frame built around the target: back half, then front half with paper
  const { cx, cy, k, front, paper = 0, light = 0, n = 0, sag = 0 } = o, rad = v => 350 * Math.sqrt(1 - v * v * 0.62), N = 9, H2 = 430;
  const at = (v, t) => [cx + Math.cos(t) * rad(v) * (1 + sag * 0.5 * v), cy + v * H2 + Math.sin(t) * rad(v) * 0.15 + sag * 120 * (v + 1)];
  g.save();
  if (front && paper > 0) {
    const L = [], Rr = []; for (let i = 0; i <= 16; i++) { const v = -1 + i / 8; L.push(at(v, Math.PI)); Rr.push(at(v, 0)); }
    const body = [...L, ...Rr.reverse()], q = g.createRadialGradient(cx, cy + 120, 30, cx, cy, 520); q.addColorStop(0, `rgba(255,236,176,${0.2 * paper + 0.3 * light})`); q.addColorStop(0.6, `rgba(255,176,84,${0.26 * paper + 0.3 * light})`); q.addColorStop(1, `rgba(170,66,24,${0.3 * paper + 0.25 * light})`);
    trace(g, body); g.fillStyle = q; g.fill();
  }
  for (let i = 0; i < N; i++) {
    const v = -0.94 + i / (N - 1) * 1.88, gr = outCubic(clamp(k * N - i)), pts = []; if (gr <= 0) continue;
    const t0 = front ? 0 : Math.PI; for (let m = 0; m <= 30; m++) pts.push(at(v, t0 + Math.PI * (0.5 + (m / 30 - 0.5) * gr)));
    ink(g, pts, { w: front ? 13 : 9, color: '#2a170c', curve: false, head: 0.03, tail: 0.03, wobble: 0.05, seed: i }); ink(g, pts, { w: front ? 7 : 5, color: light ? '#ffd58a' : '#b58a4c', curve: false, head: 0.03, tail: 0.03, wobble: 0.05, seed: i });
  }
  if (k > 0.75) for (const t of front ? [0.25, 0.5, 0.75] : [1.25, 1.75]) { const pts = []; for (let m = 0; m <= 20; m++) pts.push(at(-0.94 + m / 20 * 1.88, t * Math.PI)); ink(g, pts, { w: 5, color: '#5a3a1c', curve: false, head: 0.03, tail: 0.03 }); }
  if (k > 0.9) for (const v of [-1, 1]) { const pts = []; for (let m = 0; m <= 30; m++) pts.push(at(v * 0.98, (front ? 0 : Math.PI) + m / 30 * Math.PI)); ink(g, pts, { w: 24, color: '#171013', curve: false, head: 0.02, tail: 0.02 }); }
  g.restore();
};
const steamBands = (g, x, y, n, a) => { // Hota's tatewaku rising as real steam
  for (let i = 0; i < 5; i++) { const px = x + (i - 2) * 62, p = []; for (let m = 0; m <= 22; m++) { const u = m / 22; p.push([px + Math.sin(u * 7 + i * 1.3 + n / 9) * (10 + 26 * u), y - u * 260]); } ink(g, p, { w: 9, color: `rgba(244,226,190,${0.34 * a})`, curve: false, head: 0.4, tail: 0.7, seed: i }); }
};
const DRUM = {
  up: { hip: [0, -286], chest: [2, -416], neck: [6, -468], hr: [96, -572], hl: [-112, -560], fr: [110, 0], fl: [-110, 0], rot: -0.06, blade: [0, 'hr', -1.1], stick2: -2.2 },
  down: { hip: [4, -270], chest: [26, -398], neck: [40, -448], hr: [84, -268], hl: [44, -290], fr: [120, 0], fl: [-120, 0], rot: 0.14, blade: [0, 'hr', 0.32], stick2: 0.4 },
  low: { hip: [0, -292], chest: [6, -422], neck: [10, -474], hr: [104, -300], hl: [-126, -300], fr: [80, 0], fl: [-80, 0], rot: 0.02, blade: [0, 'hr', 1.25], stick2: 1.9 },
  tap: { hip: [0, -296], chest: [8, -428], neck: [12, -480], hr: [132, -330], hl: [62, -330], fr: [70, 0], fl: [-70, 0], rot: 0.02, blade: [0, 'hr', -2.0], stick2: -1.1 },
};
const boat = (g, x, y, rot, s, pose, e, o = {}) => { // Shio and her ferry as one group; the pole passes in front of the hull
  const { blade: bl, ...body } = pose, k = 0.8 * s, hx = -40 + k * pose.hr[0], hy = 14 + k * pose.hr[1];
  g.save(); g.translate(x, y); g.rotate(rot);
  figure(g, 'shio', { x: -40, y: 14, s: k, pose: { ...body, relaxed: false }, e, wind: o.wind ?? 0.6, t: o.t || 0 });
  lit(g, q => ferry(q, 0, 0, 0.74 * s), { ...L, rimA: 0.35 });
  if (bl) lit(g, q => { q.translate(hx, hy); q.scale(k, k); tool(q, 'shio', 0, 0, bl[2], { flash: o.flash || 0 }); }, { ...L, rimA: 0.35 });
  g.save(); g.translate(hx, hy); g.scale(k, k); for (const [a, b] of [[0, 0], [pose.hl[0] - pose.hr[0], pose.hl[1] - pose.hr[1]]]) { shape(g, [[a - 17, b - 13], [a - 2, b - 17], [a + 14, b - 15], [a + 19, b - 4], [a + 17, b + 12], [a + 2, b + 16], [a - 15, b + 13], [a - 20, b]], '#f0d8c4', { w: 3.2, color: '#3a1d1a' }); for (const q of [-9, 0, 9]) ink(g, [[a + q, b - 4], [a + q + 1, b + 4], [a + q - 1, b + 12]], { w: 2.2, color: '#7d4636', head: 0.1, tail: 0.4 }); } g.restore();
  g.restore();
};
const POLE = { ply: { ...POSE.stand, hip: [0, -292], chest: [14, -424], neck: [22, -476], hr: [196, -286], hl: [158, -342], fr: [70, 0], fl: [-70, 0], rot: 0.08, blade: [0, 'hr', 1.15] }, high: { ...POSE.stand, hip: [0, -280], chest: [6, -410], neck: [10, -460], hr: [150, -408], hl: [72, -400], fr: [86, 0], fl: [-86, 0], rot: -0.06, blade: [0, 'hr', -0.1] }, strike: { ...POSE.stand, hip: [6, -270], chest: [34, -394], neck: [50, -444], hr: [232, -304], hl: [204, -372], fr: [110, 0], fl: [-110, 0], rot: 0.14, blade: [0, 'hr', 1.18] } };
const barrelDrum = (g, x, y, k) => { // festival drum on a low stand, head toward the player
  for (const [a, b] of [[-70, -10], [120, 190]]) { ink(g, [[x + a, y + 60], [x + (a + b) / 2, y + 120], [x + b, y + 180]], { w: 20, color: '#1b100c', head: 0.02, tail: 0.02 }); ink(g, [[x + b, y + 60], [x + (a + b) / 2, y + 120], [x + a, y + 180]], { w: 20, color: '#1b100c', head: 0.02, tail: 0.02 }); }
  const body = loop([[x, y - 146, 1], [x + 90, y - 172], [x + 190, y - 172], [x + 270, y - 140, 1], [x + 290, y], [x + 270, y + 140, 1], [x + 190, y + 172], [x + 90, y + 172], [x, y + 146, 1], [x - 22, y]]), q = g.createLinearGradient(0, y - 170, 0, y + 170);
  q.addColorStop(0, '#5a1d16'); q.addColorStop(0.3, '#b23426'); q.addColorStop(0.5, '#d9583e'); q.addColorStop(1, '#3a120e'); trace(g, body); g.fillStyle = q; g.fill();
  g.save(); trace(g, body); g.clip(); for (let i = 0; i < 7; i++) ink(g, [[x - 20, y - 130 + i * 43], [x + 130, y - 136 + i * 45], [x + 290, y - 130 + i * 43]], { w: 3, color: 'rgba(30,8,6,.5)', head: 0, tail: 0, seed: i }); g.restore(); contour(g, body, { w: 7 });
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i + 0.5) / 12 * Math.PI; g.beginPath(); g.arc(x + 26 + Math.cos(a) * 34, y + Math.sin(a) * 148, 7, 0, 7); g.fillStyle = '#e3b04b'; g.fill(); g.lineWidth = 2; g.strokeStyle = PAL.sumi; g.stroke(); }
  g.beginPath(); g.ellipse(x, y, 52, 148, 0, 0, 7); g.fillStyle = '#efe6cf'; g.fill(); g.lineWidth = 7; g.strokeStyle = PAL.sumi; g.stroke();
  g.beginPath(); g.ellipse(x - 2 + 8 * k, y, 24, 70, 0, 0, 7); g.lineWidth = 5; g.strokeStyle = 'rgba(178,52,38,.8)'; g.stroke();
};
const PLANT = { haul: { ...POSE.stand, relaxed: false, hip: [-6, -294], chest: [10, -424], neck: [20, -474], hr: [86, -268], hl: [-34, -292], fr: [84, 0], fl: [-88, 0], rot: 0.1, blade: [0, 'hr', 0.34] }, lift: { ...POSE.stand, relaxed: false, hip: [0, -308], chest: [4, -442], neck: [8, -496], hr: [112, -420], hl: [96, -356], fr: [60, 0], fl: [-64, 0], rot: -0.04, blade: [0, 'hr', -1.57] }, set: { ...POSE.stand, relaxed: false, hip: [2, -284], chest: [14, -414], neck: [22, -466], hr: [120, -300], hl: [108, -236], fr: [92, 0], fl: [-92, 0], rot: 0.06, blade: [0, 'hr', -1.57] } };
const SPLIT = { up: { ...POSE.kneel, hr: [116, -420], hl: [104, -196], rot: 0.1, blade: [0, 'hr', -1.35] }, down: { ...POSE.kneel, hr: [150, -214], hl: [120, -186], rot: 0.34, blade: [0, 'hr', 0.5] }, watch: { ...POSE.kneel, hr: [70, -176], hl: [30, -172], rot: 0.04, relaxed: true } };
const seaFront = (g, n, fr, flat = 0.5) => {
  for (let i = 0; i < 12; i++) {
    const base = 880 + i * 52 - fr, amp = 24 + Math.min(i, 6) * 9, len = 250 + Math.min(i, 6) * 60, p = [];
    if (base - amp > H + 20) break;
    for (let x = -80; x <= W + 80; x += 20) { const q = ((x + n * (5 + i * 2) * (i % 2 ? -1 : 1) + i * 137) % len + len) % len / len; p.push([x, base - amp * Math.pow(Math.sin(Math.PI * q), 2.2)]); }
    trace(g, [...p, [W + 80, H + 120], [-80, H + 120]]); const q = g.createLinearGradient(0, base - amp, 0, base + 150); q.addColorStop(0, ['#4f8fb8', '#2f70a3', '#1f5a94', '#17477e', '#123a6b'][Math.min(i, 4)]); q.addColorStop(1, '#0a1d3d'); g.fillStyle = q; g.fill();
    for (const [dy, w, c] of [[16, 7, '#6a9fc0'], [34, 5, '#a9cbda'], [52, 9, '#0d2750']]) ink(g, p.map(v => [v[0], v[1] + dy + (v[1] - base) * -0.25]), { w: w + i, color: c, curve: false, head: 0, tail: 0, wobble: 0.5, seed: i * 7 + dy });
    ink(g, p, { w: 10 + i * 2, color: '#ece9da', curve: false, head: 0, tail: 0, wobble: 0.9, seed: i + 3 });
    ink(g, p.map(v => [v[0], v[1] - 6 - i]), { w: 3, color: PAL.navy, curve: false, head: 0, tail: 0, seed: i });
  }
};
const sadWide = (g, n, N) => {
  const off = [7, 2, 10, 5, 0, 8, 3, 11, 6, 1, 9, 4];
  village(g, n, { zoom: 1 + 0.07 * smooth(n / N), pan: 24 * n / N, lamps: i => 1 - smooth(span(n, 18 + off.indexOf(i) * 6, 24 + off.indexOf(i) * 6)) * (i === 8 ? 0 : 1) });
  // Foreground pine boughs: dark needle fans, each fan carrying its own cap of snow.
  for (const [bx, by, a, l, m] of [[-60, 10, 0.2, 560, 1], [-60, 190, 0.02, 360, 1], [1980, -10, Math.PI - 0.22, 440, -1]]) {
    const sw = Math.sin(n / 26 + by) * 5, ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l + sw, mid = [(bx + ex) / 2, (by + ey) / 2 - 22];
    ink(g, [[bx, by], mid, [ex, ey]], { w: 30, color: '#02050b', head: 0.02, tail: 0.75, wobble: 0.35 });
    for (let k = 0; k < 9; k++) {
      const r = rng(k * 7 + by + 900), u = 0.14 + k * 0.105, px = lerp(bx, ex, u), py = lerp(by, ey, u) - 22 * Math.sin(Math.PI * u) + (k % 2 ? 26 : -18) * (1 - u * 0.5), R = (74 - u * 34) * (0.85 + r() * 0.3);
      g.beginPath(); g.moveTo(px - R, py + R * 0.2);
      for (let q = 0; q <= 12; q++) { const t = Math.PI + q / 12 * Math.PI, d = q % 2 ? 1 : 0.8; g.lineTo(px + Math.cos(t) * R * d, py + Math.sin(t) * R * 0.55 * d); }
      g.lineTo(px + R, py + R * 0.2);
      for (let q = 8; q >= 0; q--) g.lineTo(px + R * (q / 4 - 1), py + R * (q % 2 ? 0.2 : 0.46));
      g.closePath(); g.fillStyle = '#040a15'; g.fill();
      g.strokeStyle = 'rgba(52,84,118,.55)'; g.lineWidth = 1.6; g.beginPath(); for (let q = 1; q < 10; q++) { const t = Math.PI + q / 10 * Math.PI; g.moveTo(px, py + 6); g.lineTo(px + Math.cos(t) * R * 0.8, py + Math.sin(t) * R * 0.42); } g.stroke();
      shape(g, [[px - R * 0.72, py - R * 0.2, 1], [px - R * 0.4, py - R * 0.5], [px + R * 0.05, py - R * 0.6], [px + R * 0.5, py - R * 0.46], [px + R * 0.74, py - R * 0.16, 1], [px + R * 0.36, py - R * 0.28], [px, py - R * 0.2], [px - R * 0.36, py - R * 0.3]], '#a9c0d3', { w: 2.4, color: '#27405c', seed: k });
      shape(g, [[px - R * 0.5 * m, py - R * 0.34, 1], [px - R * 0.1 * m, py - R * 0.54], [px + R * 0.4 * m, py - R * 0.42, 1], [px, py - R * 0.4]], '#dfe9f0', { w: 0 });
    }
  }
  snow(g, n, 460, 4, 0.5, 1.5);
  wash(g, '#02050c', 1 - smooth(n / 20));
};
const sadKneel = (g, n) => {
  const push = n * 0.0011;
  village(g, n + 96, { zoom: 1.12 + push * 0.35, pan: -60, lamps: i => (i === 8 ? 1 : 0) });
  { const q = g.createLinearGradient(0, 240, 0, 700); q.addColorStop(0, 'rgba(7,20,43,0)'); q.addColorStop(1, 'rgba(7,20,43,.45)'); g.fillStyle = q; g.fillRect(0, 0, W, H); } cam(g, { z: 1.04 + push, y: 620, x: 980 }, () => drift(g, 862, '#a9c1d4', 3)); { const q = g.createLinearGradient(0, 850, 0, H); q.addColorStop(0, 'rgba(38,70,116,0)'); q.addColorStop(1, 'rgba(38,70,116,.6)'); g.fillStyle = q; g.fillRect(0, 850, W, H - 850); }
  cam(g, { z: 1.04 + n * 0.0011, y: 620, x: 980 }, () => {
    g.beginPath(); g.ellipse(930, 972, 300, 34, 0, 0, 7); g.fillStyle = 'rgba(24,52,88,.45)'; g.fill();
    figure(g, 'shio', { x: 890, y: 960, s: 1.22, pose: POSE.kneel, e: { open: 0.12, mouth: 'sad', brow: -1.2 }, yaw: 0.6, wind: 0.2 + 0.1 * Math.sin(n / 14), t: twos(n) / 40 });
    lit(g, q => bell(q, 1102, 752, 1.15, { swing: 0.1 + 0.02 * Math.sin(n / 12) }), L);
    for (const [mx, my, mw] of [[700, 984, 190], [1010, 1000, 240], [1260, 988, 170]]) shape(g, [[mx - mw, my + 26], [mx - mw * 0.5, my - 10], [mx, my - 20], [mx + mw * 0.55, my - 8], [mx + mw, my + 26], [mx, my + 44]], '#c3d5e3', { w: 0 });
  });
  snow(g, n + 96, 420, 9, 0.6, 1.7);
};
const sadClose = (g, n) => {
  g.save(); g.filter = 'blur(7px)'; village(g, n + 144, { zoom: 1.9, pan: -60, moon: false, lamps: i => (i === 8 ? 1 : 0) }); g.restore(); wash(g, '#0a1c3a', 0.35);
  glow(g, 1560, 190, 560, '222,226,214', 0.6); g.save(); g.filter = 'blur(3px)'; g.beginPath(); g.arc(1560, 190, 120, 0, 7); g.fillStyle = '#efe8d6'; g.fill(); g.restore(); glow(g, 1490, 820, 150, '255,180,84', 0.6); snow(g, n, 140, 3, 0.5, 1.2);
  cam(g, { z: 1 + n * 0.0016, y: 560 }, () => bust(g, 'shio', { x: 900, y: 500, s: 2.25, yaw: 0.5, rot: 0.06, sway: 3 * Math.sin(n / 10), e: { open: 0.62 - 0.14 * smooth(n / 40), mouth: 'sad', brow: -1, browY: -2, look: [0.3, 0.6], tear: smooth(span(n, 12, 34)), blush: 0.4 } }));
  const q = g.createLinearGradient(0, 0, W, 0); q.addColorStop(0, 'rgba(4,10,30,.55)'); q.addColorStop(0.6, 'rgba(4,10,30,0)'); g.fillStyle = q; g.fillRect(0, 0, W, H);
  snow(g, n, 160, 12, 0.8, 2.6);
  wash(g, '#fff0cf', 0.85 * smooth(span(n, 41, 48)));
};
const warmWide = (g, n) => {
  const hopI = Math.min(2.999, span(n, 14, 50) * 3), hopK = hopI % 1, mx = lerp(1330, 860, (Math.floor(hopI) + smooth(hopK)) / 3), mq = smooth(span(n, 14, 50)), my = n > 14 && n < 50 ? -46 * Math.sin(Math.PI * hopK) : 0, cr = smooth(span(n, 50, 56)), rc = smooth(span(n, 58, 66));
  cam(g, { z: 1.04 + n * 0.0011, y: 560, x: lerp(960, 900, smooth(n / 72)) }, () => {
    hearth(g, n, { flame: false });
    figure(g, 'minato', { x: mx, y: lerp(950, 896, mq) + my + cr * 20, s: lerp(1.3, 1.18, mq), flip: true, pose: { ...POSE.stand, hip: [0, -312 + cr * 34], chest: [4 + cr * 12, -446 + cr * 30], neck: [8 + cr * 18, -500 + cr * 28], hr: [92 + rc * 46, -372 - rc * 60], hl: [52, -356], rot: 0.05 + cr * 0.08 }, sheath: false, e: { mouth: 'laugh', blush: 0.8, pupil: 1.15, mouthK: 0.6 + 0.3 * Math.abs(Math.sin(n / 5)) }, sway: 5 * Math.sin(n / 5), t: n / 60 });
    const tn = smooth(span(n, 28, 36));
    figure(g, 'shio', { x: 620, y: 960 + 2 * Math.sin(n / 11), s: 1.16, pose: { ...POSE.kneel, rot: lerp(0.36, 0.06, tn), hr: [120 - tn * 20, -178], hl: [98, -150], relaxed: true }, sheath: false, e: { open: n < 30 ? 0.8 : 0.05, happy: true, look: [0.4, 0.4], mouth: 'smile', blush: 0.7 }, sway: 3 * Math.sin(n / 9), t: n / 60 });
    fire(g, { x: 960, y: 1046, w: 210, h: 200, t: n / 24, seed: 6 });
  });
  glow(g, 990, 960, 900, '255,160,70', 0.35);
  wash(g, '#fff0cf', 1 - smooth(n / 14));
};
const warmClose = (g, n) => {
  g.save(); g.filter = 'blur(9px)'; cam(g, { z: 1.45, y: 520, x: 900 }, () => hearth(g, n + 72)); g.restore(); wash(g, '#7a3a17', 0.28); glow(g, 960, 1010, 1100, '255,186,92', 0.55);
  cam(g, { z: 1.02 + n * 0.0009 }, () => {
    const CINCH = 40, tie = n < 12 ? 0 : n < CINCH ? 0.75 * smooth(span(n, 12, 36)) : 1, jolt = n >= CINCH ? 14 * Math.exp(-(n - CINCH) / 7) * Math.cos((n - CINCH) * 0.8) : 0, drop = outCubic(span(n, CINCH + 2, CINCH + 8)), chime = n > CINCH + 4 ? 6 * Math.exp(-(n - CINCH - 4) / 16) * Math.sin((n - CINCH - 4) * 0.75) : 0;
    const reach = n < CINCH ? { x: -16 * Math.sin(span(n, 12, 36) * Math.PI * 4), y: 14 * Math.cos(span(n, 12, 36) * Math.PI * 4) } : { x: 120 * smooth(span(n, CINCH + 6, CINCH + 16)), y: 70 * smooth(span(n, CINCH + 6, CINCH + 16)) };
    bust(g, 'shio', { x: 700, y: 520, s: 1.85, yaw: 0.35, rot: -0.07 + jolt * 0.0016, sway: 2 * Math.sin(n / 9) + jolt * 0.6 + chime, tie, drop, e: { open: n < 8 ? lerp(0.7, 0.05, n / 8) : 0.05, happy: true, mouth: 'smile', blush: 0.75 } });
    bust(g, 'minato', { x: 1330, y: 600, s: 1.62, yaw: -0.5, rot: -0.1, sway: 3 * Math.sin(n / 5), e: { mouth: n > 48 ? 'laugh' : n > 10 && n < 40 ? 'line' : 'smile', mouthK: 0.55 + 0.35 * Math.abs(Math.sin(n / 4)), blush: 0.85, pupil: 1.2, look: [-0.7, -0.1], brow: -0.2 } });
    lit(g, q => {
      q.translate(reach.x, reach.y);
      const sl = shape(q, [[1290, 860], [1180, 770], [1090, 716], [1060, 790], [1150, 880], [1260, 990]], '#b0935a', { w: 6 }); q.save(); trace(q, sl); q.clip(); for (let i = 0; i < 70; i++) { const r = rng(i + 2), x = 1060 + r() * 240, y = 700 + r() * 270; ink(q, [[x, y], [x - 12, y + 22], [x - 30, y + 44]], { w: 6, color: i % 3 ? '#cdb27a' : '#7a6034', head: 0.1, tail: 0.6, seed: i }); } q.restore();
      ink(q, [[1250, 880], [1160, 806], [1096, 760]], { w: 4 });
      shape(q, [[1094, 716], [1040, 690], [988, 694], [962, 716], [980, 736], [968, 758], [1000, 784], [1062, 790]], '#f7e1cb', { w: 5, color: '#3a1d1a' });
      for (const [a, b] of [[[964, 718], [1008, 722]], [[970, 758], [1012, 748]], [[980, 737], [1016, 736]]]) ink(q, [a, [(a[0] + b[0]) / 2, a[1] + 3], b], { w: 3, color: '#3a1d1a' });
    }, L);
    if (n < CINCH + 4) ink(g, [[974 + reach.x, 736 + reach.y], [930 + reach.x * 0.5, 748 + 18 * (1 - tie) + 8 * Math.sin(n / 4)], [886, 712]], { w: 8, color: PAL.vermilion, head: 0.02, tail: 0.1 });
    if (n > CINCH + 3) for (let i = 0; i < 2; i++) { const q = span(n, CINCH + 4 + i * 9, CINCH + 24 + i * 9); if (q > 0 && q < 1) { g.beginPath(); g.arc(908, 780, 24 + q * 150, 0, 7); g.lineWidth = 4 * (1 - q); g.strokeStyle = `rgba(255,236,170,${0.7 * (1 - q)})`; g.stroke(); } }
  });
  glow(g, 960, 1060, 820, '255,190,96', 0.45); embers(g, n, 14, 5, { up: 1.2, size: 0.6 });
  wash(g, '#fff6e0', smooth(span(n, 60, 72)));
};
const roadWalk = (g, n) => {
  road(g, n, n * 13.5);
  const ph = k => (n + k) / 24 * Math.PI * 2;
  const st = k => {
    const a = ph(k), leg = b => [Math.cos(b) * 78, -Math.max(0, Math.sin(b)) * 30], up = -6 + 9 * Math.abs(Math.sin(a));
    return { hip: [0, -302 - up], chest: [10, -436 - up], neck: [16, -488 - up], hr: [40 - Math.cos(a) * 66, -262 - up], hl: [-26 + Math.cos(a) * 66, -264 - up], fr: leg(a + Math.PI), fl: leg(a), rot: 0.03 + 0.03 * Math.sin(a * 2), relaxed: true };
  };
  const HIT = 30, gone = n >= HIT, bite = n > 35 && n < 42, up = smooth(span(n, 46, 52));
  for (const [gx, gy] of [[480, 1004], [960, 1024], [1430, 1014]]) ground(g, gx, gy, 210, '70,48,20', 0.55);
  figure(g, 'narumi', { x: 480, y: 1000, s: 1.04, pose: st(4), e: { open: 0.5, look: [0.5, 0] }, t: n / 24, wind: 0.15 });
  const hp = st(0); hp.hr = [112, -470]; hp.gripR = true; hp.rot -= up * 0.3;
  figure(g, 'hota', { x: 960, y: 1020, s: 1.08, pose: hp, e: gone && n > 42 ? { open: 1.2, pupil: 0.5, mouth: 'o', look: [0.3, -0.8 * up], brow: -0.8, browY: -8 } : { open: 0.05, happy: true, mouth: bite ? 'grit' : 'laugh', blush: 0.7, mouthK: bite ? 0.2 : 0.5 + 0.5 * Math.abs(Math.sin(n / 4)) }, t: n / 24, wind: 0.15 });
  if (!gone) skewer(g, 1122, 474, -0.85);
  figure(g, 'shio', { x: 1430, y: 1010, s: 1, pose: st(8), e: { mouth: 'smile', blush: 0.5 }, t: n / 24, wind: 0.15 });
  const path = spline([[-220, 60], [420, 60], [860, 180], [1012, 352], [1060, 356], [1360, 230], [1720, 100], [2150, -40]], 12), u = n < HIT ? span(n, 10, HIT) * 0.5 : n < HIT + 2 ? 0.5 + (n - HIT) * 0.01 : 0.52 + 0.48 * outCubic(span(n, HIT + 2, 60));
  const c = path[Math.min(path.length - 1, Math.floor(u * (path.length - 1)))];
  const dip = n < HIT ? 0.95 * smooth(span(n, 18, HIT)) : 0.95 * (1 - smooth(span(n, HIT + 2, HIT + 10)));
  if (n > 9) kite(g, c[0], c[1], 1.1, n, gone, dip - 0.25 * smooth(span(n, HIT + 8, HIT + 16)));
  wash(g, '#fff6e0', 1 - smooth(n / 10));
};
const sd = (g, who, x, y, s, e, o = {}) => { // super-deformed: huge head, tiny body
  const C = { shio: ['#2a5a8a', '#e9efee'], hota: ['#57504a', '#c98a2c'], narumi: ['#e0d5bb', '#b23426'] }[who], arms = o.arms || 0, P = (a, b, k) => [x + a * s, y + b * s, k];
  for (const d of [-1, 1]) shape(g, [P(d * 12, 226), P(d * 50, 222), P(d * 62, 250), P(d * 10, 250)], '#e9dfc6', { w: 6 });
  shape(g, [P(-46, 96), P(46, 96), P(74, 226, 1), P(-74, 226, 1)], '#22344f', { w: 7 });
  for (const d of [-1, 1]) {
    const hx = d * (96 + 14 * arms), hy = 176 - 150 * arms;
    shape(g, [P(d * 30, 96), P(d * 64, 104), P(hx + d * 14, hy - 18), P(hx - d * 4, hy + (who === 'shio' ? 46 : 20), 1), P(d * 62, 196 - 40 * arms), P(d * 50, 160)], who === 'hota' ? '#eec39a' : C[0], { w: 7 });

    shape(g, [P(hx + d * 4, hy - 16), P(hx + d * 30, hy - 14), P(hx + d * 34, hy + 12), P(hx + d * 8, hy + 18)], { shio: '#f7e1cb', hota: '#eec39a', narumi: '#c48f69' }[who], { w: 6 });
    shape(g, [P(d * 14, 98, 1), P(d * 48, 98), P(d * 82, 214, 1), P(d * 26, 222, 1)], C[0], { w: 6 });
    ink(g, [P(d * 16, 98), P(d * 22, 160), P(d * 28, 220)], { w: 9, color: C[1], head: 0.02, tail: 0.05 });
  }
  if (who === 'hota') { shape(g, [P(-44, 132, 1), P(44, 132, 1), P(58, 222, 1), P(-58, 222, 1)], '#e8dcc0', { w: 6 }); g.beginPath(); g.ellipse(x, y + 178 * s, 18 * s, 22 * s, 0, 0, 7); g.lineWidth = 4; g.strokeStyle = '#3a342e'; g.stroke(); for (const q of [-9, 0, 9]) ink(g, [P(-14, 178 + q), P(0, 181 + q), P(14, 178 + q)], { w: 3, color: '#3a342e' }); for (const d of [-1, 1]) ink(g, [P(d * 46, 98), P(0, 116), P(-d * 40, 134)], { w: 9, color: '#c98a2c', head: 0.02, tail: 0.02 }); }
  if (who === 'narumi') { ink(g, [P(-46, 104), P(0, 122), P(46, 104)], { w: 22, color: '#1b1a1e', head: 0.1, tail: 0.1 }); ink(g, [P(-46, 104), P(0, 122), P(46, 104)], { w: 15, color: '#f4efe2', head: 0.1, tail: 0.1 }); ink(g, [P(-70, 196), P(0, 202), P(70, 196)], { w: 12, color: '#24406e', head: 0.02, tail: 0.02 }); }
  if (who === 'shio') for (let i = 0; i < 11; i++) ink(g, [P(-70 + i * 14, 190), P(-74 + i * 15, 214), P(-78 + i * 16, 236)], { w: 13, color: ['#b0935a', '#cdb27a', '#e0c88e'][i % 3], head: 0.04, tail: 0.4, seed: i });
  head(g, who, { x, y, s: s * 1.05, e, ...o });
};
const comedyPanels = (g, n) => {
  if (n > 12) wash(g, PAL.sumi); else roadWalk(g, 59);
  const cols = ['#f2c14a', '#e7806a', '#9db9d6'], who = ['narumi', 'hota', 'shio'];
  who.forEach((w, i) => {
    const k = outCubic(span(n, i * 4 - 4, i * 4 + 4)), x0 = i * 640, dy = (1 - k) * (i % 2 ? -1 : 1) * (H + 60);
    g.save(); g.translate(0, dy); const poly = [[x0 + 30 + (i ? 26 : -60), -20], [x0 + 640 + (i < 2 ? 26 : 60), -20], [x0 + 610 + (i < 2 ? -26 : 80), H + 20], [x0 + (i ? -26 : -60), H + 20]];
    trace(g, poly); g.strokeStyle = PAL.sumi; g.lineWidth = 26; g.stroke(); g.clip();
    wash(g, cols[i]); g.save(); g.translate(x0 + 320 - W / 2, 0); radial(g, W / 2, 520, 'rgba(255,255,255,.5)', 5 + i + Math.floor(n / 6), { n: 46, inner: 300, wmax: 0.06 }); g.restore();
    const jig = i === 1 ? 8 * Math.sin(n * 1.7) : 0;
    const e = [{ open: 0.55, look: [0, 0], mouth: 'line', pupil: 0.8 }, { open: 1.35, pupil: 0.16, mouth: 'shout', mouthK: 1.3, brow: -1.2, browY: -18, blush: 0.2, tear: 0.9 }, { open: 0.05, happy: true, mouth: 'laugh', mouthK: 0.5 + 0.5 * Math.abs(Math.sin(n / 3)), blush: 0.8, tear: 0.22 }][i];
    sd(g, w, x0 + 320 + jig, 470, 1.9, e, { sway: i === 1 ? jig : 0, rot: i === 2 ? 0.08 * Math.sin(n / 3) : 0, arms: [0, 1, 0.35][i] });
    if (i === 1) for (const [a, b] of [[150, 160], [500, 150], [530, 330]]) shape(g, [[x0 + a, b + (n * 5) % 40, 1], [x0 + a + 20, b + 44 + (n * 5) % 40], [x0 + a, b + 62 + (n * 5) % 40], [x0 + a - 20, b + 44 + (n * 5) % 40]], '#d8f0fa', { w: 5 });
    if (i === 0) for (let d = 0; d < 3; d++) { g.beginPath(); g.arc(x0 + 250 + d * 66, 130, 13, 0, 7); g.fillStyle = n > 10 + d * 6 ? PAL.sumi : 'rgba(0,0,0,0)'; g.fill(); }
    g.restore();
  });
};
const comedyEnd = (g, n) => { // the crow swallows; Hota wails; Narumi slides in a spare without looking; instant joy
  if (n >= 44) return wash(g, '#05070d');
  road(g, n + 120);
  const joy = n >= 36, give = outCubic(span(n, 24, 30)), land = outCubic(span(n, 0, 8)), gulp = n > 8 && n < 14 ? 8 : 0;
  cam(g, { z: 1.1 + 0.03 * smooth(span(n, 24, 36)), y: 620 }, () => {
    ink(g, [[1960, 372], [1700, 392], [1440, 404]], { w: 26, color: '#2a1c14', head: 0.02, tail: 0.6 }); kite(g, lerp(1800, 1560, land), lerp(110, 322, land) + gulp * 0.4, 1.5, n, n < 9, 0.05 * Math.sin(n / 5), n >= 8, span(n, 8, 18) < 1 && n >= 8 ? span(n, 8, 18) : -1);
    sd(g, 'narumi', 560, 700, 1.15, { open: 0.5, mouth: 'line', look: [-0.6, 0] }, { arms: 0.25 + 0.35 * give });
    sd(g, 'shio', 1400, 720, 1.1, { open: 0.05, happy: true, mouth: n > 30 ? 'laugh' : 'smile', blush: 0.8 }, { arms: 0.2 });
    sd(g, 'hota', 980, 700 + (joy ? -14 * Math.abs(Math.sin(n)) : n > 11 ? 6 * Math.sin(n * 0.9) : 0), 1.2, joy ? { open: 1.2, pupil: 1.3, mouth: 'laugh', blush: 0.9, browY: -10 } : n < 12 ? { open: 1.3, pupil: 0.2, mouth: 'o', look: [0.4, -0.6] } : { open: 0.05, happy: true, mouth: 'shout', mouthK: 0.9, tear: 1, brow: -1 }, { arms: joy ? 0.4 : n > 11 ? 0.9 : 0 });
    if (give > 0) skewer(g, lerp(640, 812, give), lerp(880, 800, give), -0.25);
    if (joy) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, r0 = 190 + (n - 36) * 12; if (Math.sin(a) > 0.3) continue; ink(g, [[980 + Math.cos(a) * r0, 660 + Math.sin(a) * r0], [980 + Math.cos(a) * (r0 + 50), 660 + Math.sin(a) * (r0 + 50)]], { w: 13, color: '#fff6d8', curve: false, head: 0.1, tail: 0.8 }); }
  });
};
const fearBridge = (g, n, N) => {
  const T = [78, 72, 66, 60, 48, 36, 12], z = 1 + 0.12 * n / N, lampAt = i => (n < T[i] ? (n > T[i] - 6 ? 0.55 + 0.35 * noise1(n * 1.7, i) : 1) : 0);
  cam(g, { z, y: 560, shake: n > 72 ? 5 : 1.5, f: n }, () => bridge(g, n, { fog: 0.5 + 0.5 * n / N, lamps: lampAt }));
  const d = span(n, 30, N); glow(g, 960, 470, 560, '255,110,44', 0.6 * d); g.save(); g.globalAlpha = 0.9 * d; cam(g, { z, y: 560 }, () => { const hs = 0.24 + 0.2 * d; lit(g, q => rawHikui(q, { x: 960, y: 640, s: hs, t: n / 24, lamps: 0 }), { flat: '#3a1a14', rim: '#ff9a50', rimX: 3, rimY: -2, rimA: 0.5 + 0.4 * d }); for (let k = 0; k < 7; k++) { const a = span(d, k / 7, (k + 1) / 7), lx = 960 + [-54, 60, -70, 46, 4, -38, 44][k] * hs, ly = 640 + [-60, -130, -240, -310, -180, -400, -455][k] * hs + 2 * Math.sin(n / 6 + k); if (a > 0) glow(g, lx, ly, 46, '255,170,70', a); } if (d > 0.7) glow(g, 960 + 46 * hs, 640 - 600 * hs, 34, '255,90,30', (d - 0.7) * 3); }); g.restore();
  for (let i = 0; i < 3; i++) { const y = 600 + i * 120, q = g.createLinearGradient(0, y - 60, 0, y + 60); q.addColorStop(0, 'rgba(150,172,192,0)'); q.addColorStop(0.5, `rgba(150,172,192,${0.1 + 0.03 * Math.sin(n / 17 + i)})`); q.addColorStop(1, 'rgba(150,172,192,0)'); g.fillStyle = q; g.fillRect(0, y - 60, W, 120); }
  g.save(); g.globalCompositeOperation = 'screen'; const ml = g.createLinearGradient(0, 380, 0, H); ml.addColorStop(0, 'rgba(70,110,160,0)'); ml.addColorStop(0.35, 'rgba(70,110,160,.3)'); ml.addColorStop(1, 'rgba(40,66,110,.24)'); g.fillStyle = ml; g.fillRect(0, 0, W, H); g.restore();
  // The three watch from the near end and give ground when the last lamps go.
  const st = outCubic(span(n, 72, 78)), tr = n > 60 ? 2 * noise1(n * 1.3, 7) : 0;
  [['hota', 330, 1.02], ['shio', 620, 0.94], ['narumi', 1590, 1]].forEach(([w, x, s], i) => lit(g, q => rawFigure(q, w, { x: x + tr - (i === 2 ? -1 : 1) * st * 40, y: 1250 + st * 40, s: s * 1.12, flip: i === 2, pose: { ...POSE.stand, hip: [-st * 20, -312], chest: [4 - st * 46, -440], neck: [8 - st * 60, -492], hr: [64, -320 - st * 40], hl: [-60, -270], rot: -0.14 * st, relaxed: false, blade: [0, 'hr', w === 'shio' ? -1.5 : -0.9], stick2: -2.2 }, e: {}, wind: 0.12, t: n / 40 }), { flat: '#050a16', rim: '#ff9a50', rimX: i === 2 ? -4 : 4, rimY: -2, rimA: 0.1 + 0.14 * d }));
  wash(g, '#01020a', 0.18 * n / N);
};
const fearBlack = (g, n) => {
  wash(g, '#070812'); const tr = 0.1 * noise1(n * 1.4, 3) * smooth(span(n, 4, 22));
  glow(g, 960, 600, 700 + n * 6, '190,84,40', 0.42 + 0.12 * Math.pow(0.5 + 0.5 * Math.cos(n / 12 * Math.PI * 2), 3));
  ink(g, [[960, -20], [962 + tr * 60, 200], [960 + tr * 120, 400]], { w: 15, color: '#6d1a14', head: 0, tail: 0 });
  lit(g, q => suzu(q, 960, 560, 4, tr), { top: '#5a4630', bottom: '#2a1a12', rim: '#ffcf8a', rimX: 8, rimY: -6, rimBlur: 2, rimA: 1 });
};
const fearEye = (g, n) => { // the maker's ring mark, lit from behind the paper
  wash(g, '#0a0708'); const rs = [[90, 2], [170, 8], [250, 14]], on = rs.map(([, f]) => outCubic(span(n, f, f + 5)));
  const lq = g.createRadialGradient(960, 540, 30, 960, 540, 900); const mixc = (a, d, k) => `rgb(${a.map((v, i) => Math.round(v + (d[i] - v) * k)).join(',')})`; lq.addColorStop(0, mixc([58, 28, 16], [255, 220, 150], 0.15 + 0.8 * on[0])); lq.addColorStop(0.35, mixc([44, 20, 12], [190, 104, 46], 0.1 + 0.2 * on[0] + 0.6 * on[2])); lq.addColorStop(1, '#140807'); g.fillStyle = lq; g.fillRect(0, 0, W, H);
  for (let y = -20; y < H + 40; y += 46) ink(g, [[-20, y - 10], [960, y + 24 + 3 * Math.sin(n / 6 + y)], [1940, y - 10]], { w: 9, color: 'rgba(44,16,8,.75)', head: 0, tail: 0, seed: y + 60 });
  rs.forEach(([r0, f], i) => { if (on[i] > 0) { g.beginPath(); g.arc(960, 540, r0 + 3 * noise1(n * 0.5, i), 0, 7); g.lineWidth = 34 * on[i]; g.strokeStyle = `rgba(140,28,18,${0.9 * on[i]})`; g.stroke(); g.lineWidth = 8 * on[i]; g.strokeStyle = `rgba(255,190,96,${0.7 * on[i]})`; g.stroke(); } });
};
const fearMask = (g, n, N) => {
  if (n >= N - 2) return wash(g, '#000');
  const cr = smooth(span(n, 0, 20)), rec = smooth(span(n, 20, 24)), lu = span(n, 24, 34), hit = n >= 34 ? 1 + 0.08 * Math.exp(-(n - 34) / 4) * Math.cos((n - 34) * 0.9) : inCubic(lu), z = lerp(lerp(1.4, 1.55, cr) - rec * 0.12, 3.1, n < 24 ? 0 : hit), y = lerp(1240, 2310, n < 24 ? 0 : hit);
  bokashi(g, 0, 0, W, H, [[0, '#02040b'], [0.6, '#0d1424'], [1, '#1c0d0c']]); if (n >= 24) radial(g, 960, 480, 'rgba(150,40,24,.3)', 3 + Math.floor(n / 4), { inner: 420 }); else glow(g, 960, 420, 760, '255,90,30', 0.16 + 0.05 * Math.sin(n / 4));
  cam(g, { shake: n > 34 ? 18 * (1 - span(n, 34, 43)) : 0, f: n, rot: 0.03 * Math.sin(n / 6) * (1 - lu) }, () => hikui(g, { x: 960, y, s: z, t: n / 24, glow: 0.9, split: smooth(span(n, 35, 39)) * 0.95, reach: 0.5 * lu, lean: 0.12 * Math.sin(n / 8) * (1 - lu) }));
};
const wrathBell = (g, n) => {
  bokashi(g, 0, 0, W, H, [[0, '#1b0706'], [0.5, '#8a2c12'], [1, '#2a0b06']]);
  for (let i = 0; i < 160; i++) { const r = rng(i + 400), x = r() * W, y = r() * H, a = r() * 6.28, l = 20 + r() * 90; ink(g, [[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.3 + 6], [x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6]], { w: 1.5 + r() * 2, color: i % 2 ? 'rgba(255,190,110,.16)' : 'rgba(40,8,4,.3)', seed: i }); }
  cam(g, { z: 1 + n * 0.002, shake: 4, f: n }, () => {
    for (let i = 0; i < 26; i++) ink(g, [[-40, -20 + i * 46], [960, 16 + i * 46 + Math.sin(n / 9 + i) * 5], [1960, -20 + i * 46]], { w: 11, color: '#240a06', head: 0, tail: 0, seed: i });
    glow(g, 960, 560, 780, '255,170,60', 0.95);
    lit(g, q => bust3(q, 'minato', { x: 900, y: 430, s: 1.35, dir: 1, rot: 0.2, e: { open: 0.02, mouth: 'line', blush: 0.3, brow: -0.4 } }), { top: '#ffd9a0', bottom: '#e0762c', rim: '#fff0c0', rimX: 4, rimY: -4 });
    for (let i = 0; i < 26; i += 2) ink(g, [[-40, 4 + i * 46], [960, 40 + i * 46 + Math.sin(n / 9 + i) * 5], [1960, 4 + i * 46]], { w: 6, color: 'rgba(52,16,8,.6)', head: 0, tail: 0, seed: i });
    wash(g, '#ff9b36', 0.2);
    shape(g, [[968, 640], [1004, 618], [1044, 626], [1056, 656], [1036, 684], [994, 684], [972, 666]], '#ffcf9a', { w: 5, color: '#5a2412' }); for (let i = 0; i < 3; i++) ink(g, [[1006 + i * 13, 630], [1014 + i * 13, 654], [1008 + i * 13, 678]], { w: 3, color: '#a3542a' });
    ink(g, [[1030, 668], [1056, 700], [1050, 736]], { w: 12, color: PAL.vermilion });
    suzu(g, 1050, 780, 1.7, 0.16 * Math.sin(n / 6));
    for (let i = 0; i < 3; i++) { const k = ((n % 24) / 24 + i * 0.33) % 1; g.beginPath(); g.arc(1050, 780, 70 + k * 340, 0, 7); g.lineWidth = 5 * (1 - k); g.strokeStyle = `rgba(255,240,190,${(1 - k) * 0.6})`; g.stroke(); }
  });
  embers(g, n, 16, 6, { up: 1.4, size: 0.8 });
  // The wall of the chest, torn open.
  const op = lerp(0.35, 1, outCubic(span(n, 0, 10))), hole = [], rr = rng(66);
  for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283, k = (i % 2 ? 500 : 440) + rr() * 70; hole.push([970 + Math.cos(a) * k * op * 1.28, 560 + Math.sin(a) * k * op]); }
  g.save(); g.beginPath(); g.rect(-20, -20, W + 40, H + 40); hole.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  const wg = g.createRadialGradient(970, 560, 300, 970, 560, 1150); wg.addColorStop(0, '#6d2818'); wg.addColorStop(0.5, '#2c100b'); wg.addColorStop(1, '#0c0605'); g.fillStyle = wg; g.fill('evenodd'); g.clip('evenodd');
  for (let y = -10; y < H + 40; y += 40) ink(g, [[-20, y - 10], [960, y + 26], [1940, y - 10]], { w: 9, color: '#120706', head: 0, tail: 0, seed: y + 50 });
  g.restore(); contour(g, hole, { w: 13, color: '#0a0403' });
};
const wrathEyes = (g, n) => {
  wash(g, '#16060c'); radial(g, 960, 540, '#8d1a1c', 4 + Math.floor(n / 6), { n: 150, inner: 420, wmax: 0.03 });
  const k = outCubic(span(n, 0, 10));
  g.save(); trace(g, [[-30, 540 - 310 * k], [W + 30, 540 - 310 * k], [W + 30, 540 + 310 * k], [-30, 540 + 310 * k]]); g.clip(); wash(g, '#2b1a2a');
  cam(g, { z: 1.02 + n * 0.0014 + 0.3 * inCubic(span(n, 36, 48)), shake: 3 + n * 0.08, f: n }, () => eyesCU(g, { n, t: n / 24, open: lerp(lerp(0.42, 0.95, smooth(span(n, 8, 18))), 0.6, smooth(span(n, 24, 36))), pupil: lerp(1.05, 0.5, smooth(span(n, 22, 32))), brim: 1 - smooth(span(n, 26, 36)), glowA: 0.35 * span(n, 24, 36) }));
  g.restore();
  for (const s of [-1, 1]) ink(g, [[-40, 540 - 310 * k * s], [960, 540 - 310 * k * s], [1960, 540 - 310 * k * s]], { w: 14, color: '#f1e6cf', head: 0, tail: 0 });
};
const wrathDraw = (g, n) => { // the pole is lifted and planted; the bell at its head rings
  field(g, n, 'wrath', { ...FIELD.wrath, drift: n * 0.4 });
  glow(g, 800, 620, 900, '60,150,190', 0.3);
  const o = { x: 760, y: 985, s: 1.12 }, up = smooth(span(n, 12, 21)), dn = inCubic(span(n, 21, 24)), p = n < 21 ? mix(PLANT.haul, PLANT.lift, up) : mix(PLANT.lift, PLANT.set, n >= 24 ? 1 : dn), hx = 760 + 1.12 * 120, hy = 985 - 1.12 * (300 + 392);
  cam(g, { z: n < 24 ? 1.04 + 0.05 * smooth(n / 22) : lerp(1.09, 0.98, outCubic(span(n, 24, 34))), shake: n >= 24 ? 10 * (1 - span(n, 24, 36)) : 0, f: n, y: 600 }, () => {
    if (n >= 24) { bellRings(g, hx, hy, span(n, 24, 48)); scaleArcs(g, hx, 640, span(n, 24, 52), -2.9, -0.2); }
    figure(g, 'shio', { ...o, pose: p, wind: 0.15 + (n < 24 ? 0.1 * up : lerp(0.7, 0.1, smooth(span(n, 24, 44)))), t: twos(n) / 24, flash: n >= 24 && n < 27 ? 1 : 0, e: { brow: 1.4, dark: 0.3, mouth: n > 20 ? 'shout' : 'grit', blush: 0 } });
    if (n >= 24 && n < 36) for (let i = 0; i < 12; i++) { const r = rng(i + 3), u = span(n, 24, 36), a = -Math.PI * r(); ink(g, [[hx + Math.cos(a) * 60 * u, 990], [hx + Math.cos(a) * 150 * u, 985 + Math.sin(a) * 70 * u]], { w: 7 * (1 - u) + 1, color: '#e9f1f5', curve: false, head: 0.05, tail: 0.7, seed: i }); }
  });
  if (n === 25) wash(g, '#fff6dc', 0.45);
};
const drumStroke = (g, n) => { // three strokes on a real drum, then the feathers
  field(g, n, 'bolt', { ...FIELD.bolt, drift: n * 0.2 });
  const S = [24, 36, 48], m = n - 48, hit = n >= 48, prev = S.filter(s => n >= s).pop(), since = prev === undefined ? 99 : n - prev;
  let q = 0; for (const s of S) { if (n < s) q = Math.max(q, inCubic(span(n, s - 5, s))); else if (s !== 48) q = Math.max(q, 1 - smooth(span(n, s, s + 7))); else q = 1; }
  const raise = smooth(span(n, 0, 16)), low = smooth(span(n, 60, 68)), tap = smooth(span(n, 80, 84));
  let pose = n < 60 ? mix(mix(DRUM.low, DRUM.up, raise), DRUM.down, q) : n < 78 ? mix(DRUM.down, DRUM.low, low) : mix(DRUM.low, DRUM.tap, tap);
  if (n < 43) { const left = n >= 30; const o = mix(DRUM.low, DRUM.up, raise); pose = left ? { ...pose, hr: o.hr, blade: o.blade } : { ...pose, hl: o.hl, stick2: o.stick2 }; }
  const react = 0.12 * Math.exp(-Math.max(0, since - 1) / 5) * (prev === undefined ? 0 : 1) + (m < 6 ? 0 : m < 12 ? outCubic(span(m, 6, 12)) : lerp(1, 0.55, smooth(span(m, 12, 26))));
  cam(g, { z: 1.02 + 0.04 * raise, x: 960, y: 570, shake: since < 12 ? (prev === 48 ? 18 : 7) * (1 - since / 12) : 0, f: n }, () => {
    glow(g, 720, 760, 620, '255,200,120', 0.2 + 0.2 * Math.exp(-since / 6));
    const ring = front => S.forEach((s, i) => { for (const d of i === 2 ? [0, 7] : [0]) { const u = span(n, s + d, s + d + 22 + i * 3); if (n >= s + d && u < 1) drumHoop(g, 760, 800, lerp(60, 520 + i * 330 - d * 20, outCubic(u)), Math.min(1, 1.5 * (1 - u)), -0.06, front); } });
    ring(false);
    hikui(g, { x: 1480, y: 1100, s: 0.95, t: n / 24, glow: 0.8, lean: 0.9 * react, split: 0.35 + 0.1 * Math.min(1, react), reach: n < 48 ? 0.3 + 0.2 * raise : 0.15, wounds: m >= 6 ? 1 : 0 });
    if (m >= 6 && m < 30) for (let i = 0; i < 14; i++) { const r = rng(i + 7), u = span(m, 6, 30), a = -2.4 + r() * 1.9, v = 120 + r() * 360; g.save(); g.translate(1470 + Math.cos(a) * v * u, 640 + Math.sin(a) * v * u + 420 * u * u); g.rotate(u * 6 * (r() - 0.5)); shape(g, [[-26, -4, 1], [26, -6, 1], [28, 4, 1], [-24, 5, 1]], i % 2 ? '#b58a4c' : '#8e3524', { w: 2.5 }); g.restore(); }
    lit(g, c => barrelDrum(c, 760, 800, Math.exp(-since / 4)), L);
    figure(g, 'narumi', { x: 520, y: 1000, s: 1.0, pose, wind: 0.15 + 0.5 * Math.exp(-since / 6), t: twos(n) / 24, e: { open: 0.85, brow: 0.8, mouth: since < 8 ? 'shout' : 'line', look: [0.6, 0] } });
    ring(true);
    arrowFeathers(g, n, 48, 800, 2350);
    if (n >= 84 && n < 92) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, r0 = 26 + (n - 84) * 8; ink(g, [[618 + Math.cos(a) * r0, 560 + Math.sin(a) * r0], [618 + Math.cos(a) * (r0 + 24), 560 + Math.sin(a) * (r0 + 24)]], { w: 6, color: '#f4e4b8', curve: false, head: 0.1, tail: 0.6 }); }
  });
  if (m === 1) wash(g, '#fff2d8', 0.45);
};
const lanternTrap = (g, n) => { // Hota splits bamboo on a block; every slat bends into a ring of the lantern
  field(g, n, 'fire', { ...FIELD.fire, drift: n * 0.3 });
  const HIT = 48, chops = [6, 13, 19, 24, 28, 31, 34], kk = chops.reduce((a, c) => a + smooth(span(n, c + 8, c + 13)), 0) / chops.length, paper = smooth(span(n, 36, 46)), light = n < HIT ? 0 : 0.55 + 0.45 * Math.exp(-(n - HIT) / 20), sag = 0, cx = 1400, cy = 590;
  let q = 0; for (const c of chops) q = Math.max(q, n < c ? inCubic(span(n, c - 3, c)) : 1 - smooth(span(n, c, c + 4)));
  const st = inCubic(span(n, 44, 48)), w = smooth(span(n, 63, 72)), pose = n < 40 ? mix(SPLIT.up, SPLIT.down, q) : n < 63 ? mix(SPLIT.up, SPLIT.down, n < HIT ? st : 1) : mix(SPLIT.down, SPLIT.watch, w);
  if (n >= 63) { pose.blade = undefined; pose.relaxed = true; }
  cam(g, { z: n < HIT ? 1.0 + 0.04 * paper : lerp(1.05, 1.0, span(n, HIT, 72)), shake: n >= HIT ? 8 * (1 - span(n, HIT, 60)) : 2 * q, f: n }, () => {
    if (light) glow(g, cx, cy + 60, 900, '255,150,50', 0.8 * light);
    lanternCage(g, { cx, cy, k: kk, front: false, light, n, sag });
    const HK = { x: cx, y: 1000, s: 0.82, t: n / 24, glow: n < HIT ? 0.8 : 0.5, lean: n < HIT ? -0.15 + 0.1 * Math.sin(n / 3) * kk : 0.45 * Math.sin(n / 3) * (1 - span(n, HIT, 96)), split: 0.48, reach: n < HIT ? 0.1 : 0.1 + 0.3 * Math.abs(Math.sin(n / 5)) * (1 - span(n, HIT, 96)), wounds: n >= HIT + 4 ? 2 : 1 };
    if (n < HIT + 2) hikui(g, HK);
    if (light) { g.save(); g.beginPath(); g.rect(cx - 330, cy - 400, 660, 800); g.clip(); fire(g, { x: cx, y: cy + 392, w: 300, h: 430 * light, t: n / 24, seed: 6 }); g.restore(); }
    if (n >= HIT + 2) { lanternCage(g, { cx, cy, k: kk, front: true, paper: 1.7, light: 0.9 * light, n, sag }); lit(g, q => rawHikui(q, { ...HK, lamps: 0 }), { flat: '#5a1f0c', alpha: 0.82 }); }
    lanternCage(g, { cx, cy, k: kk, front: true, paper: n >= HIT + 2 ? 0 : paper * 0.6, light: light * 0.6, n, sag });
    if (light) steamBands(g, cx, cy - 430, n, smooth(span(n, 54, 66)) * (1 - smooth(span(n, 88, 96))));
    shape(g, [[660, 930], [760, 922], [790, 940], [784, 1000], [664, 1002]], '#5a3a22', { w: 6 }); g.beginPath(); g.ellipse(724, 936, 62, 14, 0, 0, 7); g.fillStyle = '#b98a52'; g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.sumi; g.stroke();
    if (n < 38) { shape(g, [[704, 780 + 16 * q, 1], [738, 780 + 16 * q, 1], [738, 934, 1], [704, 934, 1]], '#b9a45a', { w: 5 }); for (const y of [820, 880]) ink(g, [[702, y + 8 * q], [721, y + 5 + 8 * q], [740, y + 8 * q]], { w: 5, color: '#6d5a2a', head: 0.05, tail: 0.05 }); }
    chops.forEach((c, i) => { const u = span(n, c, c + 8); if (n >= c && u < 1) { const v = -0.94 + i / 8 * 1.88, x1 = cx, y1 = cy + v * 430, bend = u * u * 120; const x0 = lerp(740, x1, outCubic(u)), y0 = lerp(840, y1, outCubic(u)) - 160 * Math.sin(Math.PI * u); const p = []; for (let k = 0; k <= 12; k++) { const t = k / 12 * 2 - 1; p.push([x0 + t * (150 + 150 * u), y0 + bend * (1 - t * t) * 0.6]); } ink(g, p, { w: 15, color: '#2a170c', curve: false, head: 0.03, tail: 0.03 }); ink(g, p, { w: 9, color: '#c9b468', curve: false, head: 0.03, tail: 0.03 }); } });
    figure(g, 'hota', { x: 480, y: 990, s: 1.16, pose, wind: 0.1 + 0.2 * q, t: twos(n) / 24, e: { mouth: n < HIT ? (q > 0.4 ? 'grit' : 'line') : n < 63 ? 'shout' : 'smile', brow: n < 63 ? 1 : 0, blush: 0.2, look: [0.6, n > 63 ? -0.3 : 0.2] } });
  });
  if (n >= HIT) embers(g, n, 14, 11, { up: 2, size: 0.7 });
  if (n === HIT + 1) wash(g, '#ffe2ae', 0.45);
};
const waveRise = (g, n) => {
  bokashi(g, 0, 0, W, H, [[0, '#06122b'], [0.4, '#1a4c7d'], [0.7, '#8fb6c8'], [1, '#e5ecdf']]); glow(g, 1500, 220, 620, '240,236,214', 0.6); g.beginPath(); g.arc(1500, 220, 92, 0, 7); g.fillStyle = '#f7f0dc'; g.fill();
  const k = smooth(span(n, 0, 62)), up = smooth(span(n, 36, 88)), ply = Math.sin(n / 24 * Math.PI * 2), px = lerp(520, 1010, up), py = lerp(846, 566, Math.pow(up, 1.1)) + 8 * Math.sin(n / 7) * (1 - up), rot = lerp(0.02, -0.42, smooth(span(n, 36, 64))) + 0.03 * Math.sin(n / 9);
  cam(g, { z: 1.06 - 0.06 * k, y: 552, shake: n > 36 ? 2 : 0, f: n }, () => {
    wave(g, { x: 300, y: 800, s: 0.95, rise: 0.3 + 0.4 * k, curl: 0.45 + 0.3 * k, t: n / 24, seed: 11, flip: true });
    wave(g, { x: 1620, y: 850, s: 0.8, rise: 0.28 + 0.3 * k, curl: 0.45 + 0.2 * k, t: n / 24 + 1, seed: 17 });
    wave(g, { x: 800, y: lerp(1120, 820, k), s: 1.5, rise: 0.5 + 0.65 * k, curl: 0.35 + 0.65 * k, t: n / 24, seed: 3, flip: true });
    const pose = n < 60 ? { ...POLE.ply, hr: [196, -286 + 18 * ply], hl: [158, -342 + 18 * ply], blade: [0, 'hr', 1.15 - 0.08 * ply] } : mix(POLE.ply, POLE.high, smooth(span(n, 66, 84)));
    boat(g, px, py, rot, 1.1, pose, { mouth: n > 48 ? 'shout' : 'line', brow: 1.2 }, { wind: 0.2 + 0.4 * up, t: twos(n) / 24 });
    seaFront(g, n, 10 + k * 6);
  });
};
const waveBreak = (g, n) => {
  bokashi(g, 0, 0, W, H, [[0, '#06122b'], [0.4, '#1a4c7d'], [0.7, '#8fb6c8'], [1, '#e5ecdf']]); glow(g, 1500, 200, 620, '240,236,214', 0.55); g.beginPath(); g.arc(1500, 200, 92, 0, 7); g.fillStyle = '#f7f0dc'; g.fill();
  const HIT = 36, dv = inCubic(span(n, 18, HIT)), fall = smooth(span(n, 34, 66)), af = span(n, HIT, 62), clear = smooth(span(n, 58, 82)), bx = n < HIT ? lerp(620, 1000, dv) : lerp(1000, 1090, outCubic(span(n, HIT, 60))), by = n < HIT ? lerp(640, 862, dv) : 862 + 6 * Math.sin(n / 8), rot = n < 18 ? -0.28 + 0.03 * Math.sin(n / 4) : n < HIT ? lerp(-0.28, 0.26, dv) : lerp(0.26, 0, outCubic(span(n, HIT, 52)));
  const pb = 1 - smooth(span(n, 4, 24)); cam(g, { x: 960 - 200 * pb, y: 540 - 70 * pb, z: 1.03 + 0.42 * pb + 0.05 * dv * (1 - af), shake: n >= HIT ? 10 * (1 - span(n, HIT, 48)) : 0, f: n }, () => {
    wave(g, { x: lerp(560, 1180, fall), y: 830 + 240 * fall, s: 1.55, rise: lerp(1.02, 0.22, fall), curl: 1, t: n / 18, seed: 3, flip: true });
    const bk = n < HIT, cageO = { cx: 0, cy: 0, k: 1, light: 0.5 }; if (bk) { g.save(); g.translate(1540, 690); g.scale(0.82, 0.82); lanternCage(g, { ...cageO, front: false }); g.restore(); }
    const th = span(n, 40, 62); if (n < 62) hikui(g, { x: 1540 + 620 * th, y: 1040 - 420 * Math.sin(Math.PI * 0.5 * th) + 60 * th, s: 0.86, t: n / 24, glow: 0.6, lean: n < HIT ? -0.3 : 1.2 * outCubic(af * 2), split: n < HIT ? 0.6 : 0.95, reach: n < HIT ? 0.6 : 0.2, wounds: n < HIT ? 2 : 3 });
    if (bk) { g.save(); g.translate(1540, 690); g.scale(0.82, 0.82); lanternCage(g, { ...cageO, front: true, paper: 0.7, light: 0.4 }); g.restore(); }
    else if (n < HIT + 26) for (let i = 0; i < 9; i++) { const u = span(n, HIT, HIT + 26), a = -0.4 - i * 0.28, v = 420 + 60 * (i % 3), p = []; for (let k = 0; k <= 10; k++) { const t = k / 10 - 0.5; p.push([1540 + Math.cos(a) * v * u + t * 260 * Math.cos(i + u * 4), 690 + Math.sin(a) * v * u + 500 * u * u + t * 260 * Math.sin(i + u * 4) + 60 * (0.25 - t * t)]); } ink(g, p, { w: 13, color: '#2a170c', curve: false, head: 0.03, tail: 0.03 }); ink(g, p, { w: 7, color: '#ffd58a', curve: false, head: 0.03, tail: 0.03 }); }
    const pose = n < 18 ? POLE.high : n < 60 ? mix(POLE.high, POLE.strike, outCubic(span(n, 26, HIT))) : mix(POLE.strike, POLE.ply, smooth(span(n, 60, 78)));
    if (n >= HIT) { bellRings(g, 1330, 880, span(n, HIT, 62)); for (let i = 0; i < 5; i++) { const u = span(n, HIT + i * 3, HIT + 30 + i * 4); if (u > 0 && u < 1) { const rp = []; for (let q = 0; q <= 40; q++) { const a = Math.PI + q / 40 * Math.PI; rp.push([1330 + Math.cos(a) * (80 + 900 * u), 900 + Math.sin(a) * (20 + 150 * u)]); } if (u < 0.9) ink(g, rp, { w: 22 * (1 - u), color: i % 2 ? '#7fb2cc' : '#f3f0e4', curve: false, head: 0.1, tail: 0.1, seed: i }); } } }
    for (let i = 0; i < 13; i++) { const u = span(n, 50 + i * 2, 108 + i * 3); if (u > 0) crane(g, lerp(300 + (i % 4) * 90, 500 + i * 150, u), lerp(780, -90 + (i % 5) * 104, Math.pow(u, 0.7)), (0.45 + (i % 3) * 0.22) * Math.min(1, u * 5), n + i * 4, -0.4 * (1 - u)); }
    boat(g, bx, by, rot, 1.14, pose, { mouth: n < 60 ? 'shout' : 'line', brow: n < 60 ? 1.3 : 0.2 }, { wind: n < 18 ? 0.4 : 0.6 - 0.5 * span(n, 50, 80), t: twos(n) / 24, flash: n >= HIT && n < HIT + 3 ? 1 : 0 });
    if (n >= HIT) { const r = rng(5), f0 = 1 - clear; for (let i = 0; i < 60; i++) { const a = -2.8 + r() * 2.5, v = 200 + r() * 760, x = 1330 + Math.cos(a) * v * af, y = 880 + Math.sin(a) * v * af + 700 * af * af, kz = (2 + r() * 6) * f0; if (kz < 1.6) continue; g.beginPath(); g.ellipse(x, y, kz * 1.4, kz, a, 0, 7); g.fillStyle = '#f3f0e4'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = PAL.navy; g.stroke(); } }
    seaFront(g, n, 6 + 9 * Math.sin(Math.PI * af));
  });
  if (n === HIT + 1) wash(g, '#fffdf2', 0.45);
};
const resolveThree = (g, n) => {
  wash(g, PAL.sumi);
  const cols = [['#0f2746', '#3a6a94'], ['#0f2746', '#3a6a94'], ['#0f2746', '#3a6a94']], who = ['shio', 'hota', 'narumi'], sq = inCubic(span(n, 43, 48));
  g.save(); g.translate(0, H / 2); g.scale(1, Math.max(0.004, 1 - sq)); g.translate(0, -H / 2);
  who.forEach((w, i) => {
    const t = span(n, i * 6, i * 6 + 6), k = t >= 1 ? 1 : outCubic(t) * 1.04, x0 = i * 640, ov = n - i * 6 === 6 ? 0.02 : 0;
    if (n < i * 6) return;
    g.save(); g.translate(0, (1 - Math.min(1, k) - ov) * (i % 2 ? -1 : 1) * 1.1 * H); trace(g, [[x0 + 10, 30], [x0 + 630, 30], [x0 + 630, H - 30], [x0 + 10, H - 30]]); g.clip();
    bokashi(g, x0 - 100, 0, 900, H, [[0, cols[i][0]], [1, cols[i][1]]]);
    g.save(); g.translate(x0 - 640, 0); radial(g, 960, 520, 'rgba(255,255,255,.14)', i + Math.floor(n / 4), { n: 60, inner: 320, wmax: 0.04 }); g.restore();
    const z = 1 + 0.12 * smooth(n / 48);
    L = LIGHT[['sea', 'fire', 'bolt'][i]];
    bust(g, w, { x: x0 + [330, 350, 380][i], y: [450, 470, 440][i], s: [2.1, 1.95, 2.15][i] * z, yaw: [0.4, 0.2, -0.4][i], rot: [-0.1, 0.06, 0.12][i], sway: 6 * Math.sin(n / 4 + i), e: { brow: [1.3, 1.5, 1][i], open: lerp(0.95, 0.6, smooth(span(n, 20, 38))), mouth: ['line', 'grit', 'line'][i], dark: 0.4, blush: 0 } });
    g.restore();
  });
  for (let i = 0; i < 3; i++) { const q = outCubic(span(n, 26 + i * 4, 44 + i * 4)); if (q > 0) for (const [w, c] of [[30, '#0b1526'], [16, '#f0dda0']]) { g.beginPath(); g.arc(960, 1560, 420 + q * (390 - i * 100), Math.PI * 1.02, Math.PI * 1.98); g.lineWidth = w * (1 - 0.6 * q); g.strokeStyle = c; g.globalAlpha = 1 - 0.5 * q; g.stroke(); g.globalAlpha = 1; } }
  g.restore();
};
const theCut = (g, n) => { // the last bell tone; the demon shivers, unravels, and gives back its lanterns
  if (n < 4) { wash(g, '#f6f0e0'); lit(g, c => rawHikui(c, { x: 1260, y: 1130, s: 0.98, t: 1, split: 0.8, lamps: 0, wounds: 3 }), { flat: PAL.sumi }); lit(g, c => rawFigure(c, 'shio', { x: 520, y: 1010, s: 1.02, pose: PLANT.set, wind: 0.25, e: {} }), { flat: PAL.sumi }); for (let i = 0; i < 4; i++) { const k = (n + 1) * 0.22 - i * 0.16; if (k <= 0) continue; const R2 = 60 + k * 900, p = []; for (let m = 0; m <= 60; m++) { const a = m / 60 * 6.283 + i; p.push([642 + Math.cos(a) * R2, 310 + Math.sin(a) * R2 * 0.8]); } ink(g, p, { w: 34 - i * 6, color: i % 2 ? '#1c3d74' : PAL.sumi, curve: false, head: 0.08, tail: 0.4, wobble: 0.4, seed: i }); } return; }
  if (n < 8) { wash(g, PAL.sumi); const k = (n - 4) / 4; g.beginPath(); g.ellipse(642, 310, 300 + k * 1200, 240 + k * 960, 0, 0, 7); g.lineWidth = 22 * (1 - k) + 2; g.strokeStyle = '#f6f0e0'; g.stroke(); return; }
  field(g, n, 'cut', { ...FIELD.cut, drift: n * 0.2 });
  const m = n - 8, c = smooth(span(m, 11, 38)), sh = m < 12 ? 10 * Math.exp(-m / 5) * Math.sin(m * 2.6) + 3 * Math.sin(m * 3.1) * span(m, 4, 11) : 0;
  cam(g, { z: 1.03, f: n }, () => {
    glow(g, 1260, 560, 900, '255,180,84', 0.35 + 0.5 * Math.sin(Math.PI * clamp(m / 40)));
    if (c < 0.98) hikui(g, { x: 1260 + sh, y: 1090, s: 1.02, wounds: 3, t: 1 + m * 0.01, glow: 1, split: 0.95, crumble: m < 11 ? 0 : 0.04 + c * 0.96, lamps: m < 14 ? 7 : 0, reach: 0.15 });
    for (let i = 0; i < 24; i++) {
      const r = rng(i + 31), u = span(m, 8 + r() * 12, 60 + r() * 20); if (u <= 0) continue;
      const x = 1260 + (r() - 0.5) * 240 + (r() - 0.5) * 1000 * u + 16 * Math.sin(m / 9 + i), y = 820 - r() * 380 - (420 + r() * 500) * u, z = (16 + r() * 16) * Math.min(1, u * 8);
      glow(g, x, y, z * 4.5, '255,176,80', 0.6); shape(g, [[x - z * 0.7, y - z], [x + z * 0.7, y - z], [x + z, y], [x + z * 0.7, y + z], [x - z * 0.7, y + z], [x - z, y]], '#ffd98a', { w: 3, color: '#5a2a12' }); for (const q of [-0.4, 0.2]) ink(g, [[x - z * 0.9, y + z * q], [x, y + z * (q + 0.16)], [x + z * 0.9, y + z * q]], { w: 2, color: '#a3542a', head: 0, tail: 0 });
    }
    ground(g, 520, 1004, 240); figure(g, 'shio', { x: 510, y: 1000, s: 1.08, pose: { ...PLANT.set, hl: [112, -420], gripL: true }, wind: 0.3 * (1 - span(m, 0, 24)) + 0.08, e: { open: m < 20 ? 0.8 : 0.55, look: [0.6, -0.2], brow: -0.3, mouth: 'line', blush: 0.1 }, t: twos(m) / 40 });
  });
};
const embersRise = (g, n) => {
  bokashi(g, 0, 0, W, H, [[0, '#0b1730'], [0.55, '#324c74'], [0.85, '#c98a63'], [1, '#e8b27c']]);
  const r = rng(9);
  for (let i = 0; i < 26; i++) { const z = 0.5 + r() * 1.5, x = r() * W + Math.sin(n / 20 + i) * 22, y = 1250 - ((r() * 1400 + n * 5 * z) % 1500), s = 22 * z; glow(g, x, y, s * 5, '255,176,80', 0.55); shape(g, [[x - s * 0.7, y - s], [x + s * 0.7, y - s], [x + s, y], [x + s * 0.7, y + s], [x - s * 0.7, y + s], [x - s, y]], '#ffd98a', { w: 4 * z, color: '#5a2a12' }); for (const k of [-0.4, 0.2]) ink(g, [[x - s * 0.9, y + s * k], [x, y + s * (k + 0.16)], [x + s * 0.9, y + s * k]], { w: 2.4 * z, color: '#a3542a' }); }
  embers(g, n, 90, 21, { up: 2 });
  const ly = lerp(600, 470, smooth(n / 48));
  glow(g, 1400, ly, 760, '255,190,96', 0.85);
  const lan = loop([[1240, ly - 330, 1], [1560, ly - 330, 1], [1672, ly - 150], [1690, ly], [1672, ly + 150], [1560, ly + 330, 1], [1240, ly + 330, 1], [1128, ly + 150], [1110, ly], [1128, ly - 150]]);
  const lq = g.createRadialGradient(1400, ly, 30, 1400, ly, 400); lq.addColorStop(0, '#fff3c8'); lq.addColorStop(0.6, '#ffcf7d'); lq.addColorStop(1, '#d9782f');
  trace(g, lan); g.fillStyle = lq; g.fill();
  g.save(); trace(g, lan); g.clip(); g.globalAlpha = 0.82;
  lit(g, q => bust3(q, 'minato', { x: 1400, y: ly - 30, s: 1.08, dir: -1, e: { open: 0.05, happy: true, mouth: 'smile', blush: 0.9 } }), { top: '#ffe9bd', bottom: '#f0a655', rim: '#ffffff', rimX: 4, rimY: -4 });
  g.globalAlpha = 1;
  for (let k = -4; k <= 4; k++) ink(g, [[1090, ly + k * 72 - 10], [1400, ly + k * 72 + 22], [1710, ly + k * 72 - 10]], { w: 5, color: 'rgba(150,72,28,.5)', head: 0, tail: 0 });
  g.restore(); contour(g, lan, { w: 8, color: '#5a2a12' });
  for (const yy of [-336, 322]) shape(g, [[1240, ly + yy], [1560, ly + yy], [1552, ly + yy + 24], [1248, ly + yy + 24]], '#3a1a10', { w: 5 });
  bust(g, 'shio', { x: 560, y: 560, s: 1.7, yaw: 0.6, sway: 4 * Math.sin(n / 8), e: { open: lerp(0.95, 0.75, smooth(n / 40)), look: [0.6, -0.4], mouth: n > 14 ? 'smile' : 'line', tear: 0.3 + 0.7 * smooth(span(n, 6, 34)), brow: -0.6, blush: 0.5 } });
  wash(g, '#fff3dc', 0.85 * smooth(span(n, 37, 48)));
};
const dawnWide = (g, n) => {
  cam(g, { z: 1.1 - 0.06 * smooth(n / 72), y: 560 }, () => {
    dawn(g, n, { sun: smooth(n / 66), lamps: i => smooth(span(n, 12 + (10 - i) * 5, 17 + (10 - i) * 5)) });
    const x = 930 + n * 0.8, y = 900 + 6 * Math.sin(n / 16), po = Math.sin(n / 24 * Math.PI * 2);
    figure(g, 'hota', { x: x - 180, y: y + 34, s: 0.56, pose: { ...POSE.stand, hr: [90, -440 + 14 * po] }, e: { open: 0.05, happy: true, mouth: 'laugh', mouthK: 0.6 + 0.3 * Math.abs(po), blush: 0.6 }, t: n / 30, wind: 0.2 });
    figure(g, 'narumi', { x, y: y + 40, s: 0.56, pose: { ...POSE.stand, rot: 0.03 * po }, e: { open: 0.6, mouth: 'smile' }, t: n / 30, wind: 0.2 });
    figure(g, 'shio', { x: x + 190, y: y + 36, s: 0.56, pose: { ...POSE.stand, chest: [4 + 14 * po, -446], neck: [8 + 18 * po, -500], hr: [86 + 18 * po, -386], hl: [72 + 14 * po, -330], gripR: true, gripL: true }, e: { mouth: 'smile' }, t: n / 30, wind: 0.2 });
    ferry(g, x, y + 20, 1); ink(g, [[x + 254 + 10 * po, y - 300], [x + 238 + 10 * po, y - 180], [x + 214 - 26 * po, y + 180]], { w: 11, color: '#a57f48', curve: false, head: 0.02, tail: 0.02 });
    for (const [fx, fy] of [[238 + 10 * po, -180], [231 + 8 * po, -149]]) { shape(g, [[x + fx - 9, y + fy - 8], [x + fx + 8, y + fy - 9], [x + fx + 11, y + fy], [x + fx + 7, y + fy + 9], [x + fx - 9, y + fy + 8]], '#e9bfa6', { w: 2.4, color: '#3a1d1a' }); ink(g, [[x + fx - 2, y + fy - 5], [x + fx + 3, y + fy], [x + fx - 1, y + fy + 6]], { w: 1.4, color: '#7d4636' }); }
    for (let i = 0; i < 5; i++) ink(g, [[x - 430 - i * 46, y + 62 + i * 8], [x - 300 - i * 46, y + 72 + i * 8], [x - 160 - i * 46, y + 64 + i * 8]], { w: 5, color: 'rgba(255,236,210,.6)', seed: i });
  });
  for (let i = 0; i < 5; i++) crane(g, -100 + n * 6 + i * 120, 250 + i * 34 + Math.sin(n / 10 + i) * 8, 0.4, n + i * 5);
  wash(g, '#fff3dc', 1 - smooth(n / 16));
};
const dawnClose = (g, n) => {
  g.save(); g.filter = 'blur(6px)'; cam(g, { z: 1.3, y: 520 }, () => dawn(g, n + 72, { sun: 1 })); g.restore(); wash(g, '#ffe2bd', 0.3); glow(g, 1500, 420, 900, '255,220,150', 0.5);
  const R = 12, d = Math.max(0, n - R), sw = n < R ? 0 : 0.26 * Math.exp(-d / 26) * Math.sin(d / 4.2), pull = smooth(span(n, 4, R)) - smooth(span(n, R, R + 6)), cl = smooth(span(n, 26, 31));
  cam(g, { z: 1 + n * 0.001 }, () => {
    shape(g, [[1090, 96, 1], [1960, 60, 1], [1960, 150, 1], [1090, 176, 1]], '#5a3c26', { w: 7 });
    for (let i = 0; i < 4; i++) ink(g, [[1110, 112 + i * 18], [1500, 98 + i * 18], [1940, 80 + i * 18]], { w: 3, color: '#2f1d10' });
    ink(g, [[1420, 130], [1424, 300], [1420, 470]], { w: 15, color: PAL.vermilion, head: 0, tail: 0 });
    for (let i = 0; i < 3; i++) ink(g, [[1400, 150 + i * 13], [1420, 157 + i * 13], [1442, 150 + i * 13]], { w: 11, color: PAL.vermilion, head: 0.05, tail: 0.05 });
    bell(g, 1420, 500, 2.2, { swing: sw, crack: 2, ring: 0 });
    for (const h of [0, 18]) { const k = span(d, h, h + 34); if (n >= R && k > 0 && k < 1) { g.beginPath(); g.arc(1420, 654, 160 + k * 720, 0, 7); g.lineWidth = 7 * (1 - k); g.strokeStyle = `rgba(255,240,190,${(1 - k) * 0.7})`; g.stroke(); } }
    bust(g, 'shio', { x: 700, y: 520, s: 1.95, yaw: 0.45, rot: 0.03 + 0.02 * pull, sway: 8 * Math.sin(n / 7), e: { open: lerp(0.85, 0.05, cl), happy: true, mouth: 'smile', blush: 0.6, look: [0.6, 0.1], tear: 0 } });
    ink(g, [[1400 + 20 * sw * 10, 780], [1290, 830 + 26 * pull], [1180, 790 + 34 * pull]], { w: 13, color: PAL.vermilion, head: 0.02, tail: 0.02 });
    lit(g, q => { q.save(); q.translate(0, 34 * pull); const sl = shape(q, [[860, 1120], [960, 930], [1080, 820], [1150, 800], [1170, 860], [1110, 960], [1090, 1130]], PAL.indigo, { w: 7 }); q.save(); trace(q, sl); q.clip(); const tp = q.createPattern(textiles.seigaiha(46, PAL.indigo, '#e9efee'), 'repeat'); tp.setTransform(new DOMMatrix().rotate(-38).scale(0.8)); q.fillStyle = tp; q.fillRect(800, 700, 460, 460); q.fillStyle = 'rgba(10,14,44,.3)'; trace(q, loop([[860, 1130, 1], [980, 960], [1110, 900], [1120, 980], [1090, 1130, 1]])); q.fill(); ink(q, [[1138, 792], [1168, 826], [1164, 872]], { w: 26, color: '#e9efee', head: 0, tail: 0 }); q.restore(); shape(q, [[1138, 776], [1180, 756], [1216, 770], [1222, 806], [1196, 834], [1150, 836], [1132, 810]], '#f7e1cb', { w: 5, color: '#3a1d1a' }); for (let i = 0; i < 3; i++) ink(q, [[1176 + i * 13, 766], [1186 + i * 13, 792], [1180 + i * 13, 822]], { w: 3, color: '#7d4636' }); q.restore(); }, L);
  });
  embers(g, n, 10, 31, { color: '255,220,160', up: 1, size: 0.7 });
};
const endCard = (g, n, N) => {
  bokashi(g, 0, 0, W, H, [[0, '#f4ead2'], [1, '#ecdcb9']]);
  g.save(); g.globalAlpha = 0.92; seaFront(g, n * 0.5 + 40, -70); g.restore();
  g.save(); g.translate(660, 64); g.scale(4.9, 5.2); ink(g, [[-10, 2], [0, -5], [10, 2]], { w: 3.4, color: '#c9b98c', head: 0.02, tail: 0.02 }); shape(g, [[-36, 8, 1], [0, 0], [36, 8, 1], [46, 46], [52, 96], [66, 126, 1], [0, 134], [-66, 126, 1], [-52, 96], [-46, 46]], '#e3d6b2', { w: 1.3, color: '#b7a474' }); for (const y of [9, 119]) ink(g, [[-(y > 50 ? 58 : 36), y], [0, y + 6], [(y > 50 ? 58 : 36), y]], { w: 0.9, color: '#c2b183', head: 0.02, tail: 0.02 }); g.restore();
  title(g, 532, 148, 2.55, smooth(span(n, 0, 26)), '#1c3d74');
  const k = outCubic(span(n, 30, 35)); if (k > 0) { g.save(); g.translate(1120, 640); g.scale(2 - k, 2 - k); g.globalAlpha = k; shape(g, [[-44, -44, 1], [44, -46, 1], [46, 44, 1], [-44, 46, 1]], PAL.vermilion, { w: 0 }); for (const q of [[[-14, -30], [0, -36], [14, -30]], [[-18, -24], [-22, 6], [-30, 26]], [[18, -24], [22, 6], [30, 26]], [[-18, -24], [0, -28], [18, -24]], [[-30, 26], [0, 31], [30, 26]], [[-21, 2], [0, 6], [21, 2]]]) ink(g, q, { w: 5, color: '#f4ead2', head: 0.05, tail: 0.05 }); g.restore(); }
  crane(g, 1180 + n * 3.2, 330 - n, 0.9, n); crane(g, 1300 + n * 2.8, 520 - n * 0.9, 0.6, n + 6);
  wash(g, '#000', smooth(span(n, N - 12, N - 1)));
};
export const SHOTS = [
  [0, 96, sadWide], [96, 48, sadKneel], [144, 48, sadClose], [192, 72, warmWide], [264, 72, warmClose],
  [336, 60, roadWalk], [396, 36, comedyPanels], [432, 48, comedyEnd], [480, 96, fearBridge], [576, 24, fearBlack],
  [600, 24, fearEye], [624, 48, fearMask], [672, 48, wrathBell], [720, 48, wrathEyes], [768, 48, wrathDraw],
  [816, 96, drumStroke], [912, 96, lanternTrap], [1008, 96, waveRise], [1104, 96, waveBreak], [1200, 48, resolveThree],
  [1248, 48, theCut], [1296, 48, embersRise], [1344, 72, dawnWide], [1416, 48, dawnClose], [1464, 72, endCard],
];
const LIT = new Map([[sadWide, 'night'], [sadKneel, 'night'], [sadClose, 'night'], [warmWide, 'hearth'], [warmClose, 'hearth'], [roadWalk, 'day'], [comedyPanels, 'day'], [comedyEnd, 'day'],
  [fearBridge, 'dread'], [fearMask, 'dread'], [wrathBell, 'hearth'], [wrathEyes, 'wrath'], [wrathDraw, 'wrath'], [drumStroke, 'bolt'], [lanternTrap, 'fire'], [waveRise, 'sea'], [waveBreak, 'sea'],
  [resolveThree, 'night'], [theCut, 'wrath'], [embersRise, 'dawn'], [dawnWide, 'dawn'], [dawnClose, 'dawn']]);
// Shots where Shio sings on screen, and how far her mouth opens.
const SINGS = new Map([[sadClose, 0.6], [wrathDraw, 1], [waveRise, 1], [waveBreak, 1], [resolveThree, 0.9], [dawnWide, 0.9], [dawnClose, 0.85]]);
export function drawFrame(g, f) {
  const s = SHOTS.find(([a, N]) => f >= a && f < a + N) || SHOTS[SHOTS.length - 1];
  L = LIGHT[LIT.get(s[2])] || LIGHT.night;
  SING = SINGS.has(s[2]) ? voiceAt(f, SINGS.get(s[2])) : null;
  g.save(); s[2](g, f - s[0], s[1]); g.restore();
}
