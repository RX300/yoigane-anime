// Three-quarter heads and busts. Drawn facing screen right; dir = -1 mirrors to face left.
import { PAL, lerp, clamp, ink, shape, loop, trace, contour, layer, setLine } from './core.js';
import { CAST, NEUTRAL } from './figure.js';

const LINE = '#3a1d1a';

function eye3(g, cx, cy, d, wx, C, E) {
  const L = C.lash || C.hairS, P = (x, y, k) => [cx + d * x * wx, cy + y, k], h = 25 * E.open;
  if (E.open < 0.14) {
    const k = E.happy ? -14 : 9;
    ink(g, [P(-21, 4), P(-6, 4 + k), P(10, 3 + k), P(26, 1)], { w: 6.5, color: L, head: 0.5, tail: 0.25 });
    if (!E.happy) for (const x of [10, 17, 23]) ink(g, [P(x, 8), P(x + 4, 16)], { w: 2.6, color: L, curve: false });
    return;
  }
  const an = Math.max(0, E.brow) * 5; const up = [P(-21, 6 + an * 0.5), P(-12, -h * 0.66 + an * 1.5), P(3, -h + an), P(17, -h * 0.74 + an * 0.2), P(26, -3)], lo = [P(20, h * 0.56), P(4, h * 0.74), P(-11, h * 0.54)];
  const s = loop([[...up[0].slice(0, 2), 1], up[1], up[2], up[3], [...up[4].slice(0, 2), 1], ...lo]);
  g.save(); trace(g, s); g.fillStyle = '#fcf6ea'; g.fill(); g.clip();
  const ix = cx + E.look[0] * 8 * wx + 1, iy = cy + E.look[1] * 6 - 2, r = 16.5 * wx, ry = 21;
  const el = (x, y, a, b, f) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fillStyle = f; g.fill(); };
  const gr = g.createLinearGradient(0, iy - ry, 0, iy + ry);
  gr.addColorStop(0, C.iris[0]); gr.addColorStop(0.42, C.iris[0]); gr.addColorStop(0.62, C.iris[1]); gr.addColorStop(1, C.iris[2]);
  el(ix, iy, r + 1.8, ry + 1.8, L); el(ix, iy, r, ry, gr);
  g.lineWidth = 1.3; g.strokeStyle = 'rgba(255,255,255,.42)';
  for (const k of [0.8, 0.6]) { g.beginPath(); g.ellipse(ix, iy + 2, r * k, ry * k, 0, 0.25, Math.PI - 0.25); g.stroke(); }
  el(ix, iy + 1, 7 * E.pupil * wx, 10 * E.pupil, '#0a0d16');
  ink(g, up.map(q => [q[0], q[1] + 3]), { w: 15, color: 'rgba(30,24,56,.42)', head: 0, tail: 0, wobble: 0 });
  el(ix - 6 * wx, iy - 9, 5.2 * wx, 6.4, '#ffffff'); el(ix + 6 * wx, iy + 9, 2.6, 3.2, 'rgba(255,255,255,.9)');
  g.restore();
  ink(g, [P(-23, 8), ...up.slice(1, 4), P(27, -4), P(38, -8)], { w: 7.5, color: L, head: 0.6, tail: 0.34, wobble: 0.04 });
  ink(g, [P(24, h * 0.4), P(12, h * 0.7), P(0, h * 0.76)], { w: 2.4, color: L, head: 0.1, tail: 0.7 });
  ink(g, [P(-13, -h - 6), P(4, -h - 10), P(21, -h - 3)], { w: 2.2, color: C.shade });
}

function mouth3(g, E, C) {
  const k = E.mouthK;
  const cav = (pts, teeth, tongue) => {
    const s = loop(pts); g.save(); trace(g, s); g.fillStyle = '#4d1119'; g.fill(); g.clip();
    if (tongue) { g.beginPath(); g.ellipse(3, 30 * k, 20, 13, 0, 0, 7); g.fillStyle = '#cf5a63'; g.fill(); }
    if (teeth) { g.fillStyle = '#fffaf0'; g.fillRect(-40, -16, 80, 18); }
    g.restore(); ink(g, [...s, s[0]], { w: 3.4, curve: false, head: 0, tail: 0, color: LINE });
  };
  const t = E.mouth;
  if (t === 'sing') {
    const V = E.vowel, o = Math.pow(Math.max(0, Math.min(1, k)), 0.8), sh = { a: [19, 25], i: [20, 9], u: [9, 12], e: [18, 16], o: [13, 22], N: [12, 6] }[V];
    if (!sh || o < 0.12) { ink(g, [[-12, 0], [0, 1.5], [11, -1]], { w: 3.6, color: LINE }); return; }
    const [w, h0] = sh, h = h0 * (0.35 + 0.65 * o);
    cav([[-w, -h * 0.3], [0, -h * 0.5], [w, -h * 0.34], [w * 0.8, h * 0.5], [1, h * 0.86], [-w * 0.8, h * 0.52]], V !== 'u' && V !== 'o', V === 'a' || V === 'e');
    ink(g, [[-5, h * 0.86 + 9], [2, h * 0.86 + 10], [8, h * 0.86 + 9]], { w: 2, color: C.shade });
    return;
  }
  if (t === 'line') { ink(g, [[-13, 0], [0, 1.5], [12, -1]], { w: 3.6, color: LINE }); ink(g, [[-5, 10], [2, 11], [8, 10]], { w: 2, color: C.shade }); }
  else if (t === 'sad') ink(g, [[-13, 5], [0, -2], [12, 4]], { w: 3.6, color: LINE });
  else if (t === 'smile') ink(g, [[-18, -4], [0, 6], [17, -5]], { w: 4, color: LINE });
  else if (t === 'laugh') cav([[-25, -7, 1], [0, -3], [23, -8, 1], [15, 20 * k], [0, 28 * k], [-16, 21 * k]], true, true);
  else if (t === 'shout') cav([[-21, -8], [0, -14], [20, -9], [19, 18 * k], [2, 28 * k], [-19, 20 * k]], true, true);
  else if (t === 'o') cav([[-7, -6], [7, -6], [8, 8], [-8, 8]], false, false);
  else if (t === 'grit') {
    const s = loop([[-24, -5, 1], [0, -8], [23, -6, 1], [18, 9], [0, 7], [-19, 10]]);
    g.save(); trace(g, s); g.fillStyle = '#fffaf0'; g.fill(); g.clip();
    ink(g, [[-26, 1], [0, 0], [26, 0]], { w: 2.2, head: 0, tail: 0, color: LINE });
    for (let x = -18; x <= 18; x += 9) ink(g, [[x, -10], [x, 12]], { w: 1.3, curve: false, head: 0, tail: 0, color: '#7d5a52' });
    g.restore(); ink(g, [...s, s[0]], { w: 3.4, curve: false, head: 0, tail: 0, color: LINE });
  }
}

// Broken brush highlight that follows the skull.
function halo(g, color, pts, w = 6, seed = 1) {
  pts.forEach(([x, y, l, lean], i) => ink(g, [[x, y], [x + lean * 0.4, y + l * 0.5], [x + lean, y + l]], { w: w * (0.6 + 0.5 * ((i * 7 + seed) % 5) / 4), color, head: 0.35, tail: 0.6, seed: seed + i }));
}
function strands(g, list, color, w = 3) { list.forEach((p, i) => ink(g, p, { w, color, seed: i + 5, head: 0.1, tail: 0.6 })); }
function hairFill(g, C, y0 = -140, y1 = 140) { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, C.hair); q.addColorStop(0.6, C.hair); q.addColorStop(1, C.hairS); return q; }

let tieK = 1, bellK = 1;
function sideLock(g, C, x, y, sw, k = 1) { // Shio's bound lock, cord and bell
  const w = 1 + (1 - tieK) * 0.9, wind = Math.round(4 * tieK);
  shape(g, [[x - 11, y, 1], [x + 8, y + 4], [x + 13 * w + sw * 0.6, y + 70], [x + 10 * w + sw * 1.4, y + 138 + (1 - tieK) * 10, 1], [x - 4 + sw * 1.1, y + 112 + (1 - tieK) * 16], [x - 9 * w + sw * 0.5, y + 60]], C.hair, { w: 4 });
  if (tieK < 1) for (const q of [-5, 2, 8]) ink(g, [[x + q * 0.5, y + 14], [x + q * w + sw * 0.5, y + 70], [x + q * w * 0.8 + sw * 1.2, y + 126]], { w: 2.6, color: C.hairS });
  for (let i = 0; i < wind; i++) ink(g, [[x - 12 * w + sw * 0.5, y + 56 + i * 7], [x + 1 + sw * 0.5, y + 60 + i * 7], [x + 14 * w + sw * 0.5, y + 55 + i * 7]], { w: 6.5, color: PAL.vermilion, head: 0.05, tail: 0.05 });
  if (bellK <= 0) return;
  const bx = x + 20 * k + sw, by = y + 84 + 32 * bellK;
  ink(g, [[x + 11 + sw * 0.5, y + 72], [x + 22 * k + sw * 0.8, y + 72 + 16 * bellK], [bx, by - 10]], { w: 3.4, color: PAL.vermilion });
  shape(g, [[bx, by - 11], [bx + 11, by], [bx, by + 12], [bx - 11, by]], '#e3b04b', { w: 3.4 });
  ink(g, [[bx - 9, by + 3], [bx, by + 6], [bx + 9, by + 3]], { w: 2.4 }); g.beginPath(); g.arc(bx - 3, by - 4, 2.6, 0, 7); g.fillStyle = '#fff3c4'; g.fill();
}

const HAIR3 = {
  shio: {
    back(g, C, sw, near) {
      shape(g, [[-30, -134], [-94, -106], [-126, -30], [-128, 58], [-114, 126], [-96 + sw, 152, 1], [-74, 130], [-50 + sw, 144, 1], [-10, 112], [40, 100], [70, 116], [88 + sw, 126, 1], [95, 60], [92, -20], [80, -90], [30, -136]], C.hairS, { w: 6 });
      if (!near) sideLock(g, C, 92, 20, sw);
    },
    front(g, C, sw, near) {
      shape(g, [[-84, -74], [-110, -10], [-114, 60], [-100, 116], [-82 + sw, 140, 1], [-70, 96], [-66, 30], [-58, -22], [-40, -62]], hairFill(g, C), { w: 4 });
      shape(g, [[-70, -94], [-62, -50], [-48 + sw * 0.4, -14, 1], [-30, -44], [-8, -70], [-2 + sw * 0.4, -28, 1], [20, -52], [34, -70], [43 + sw * 0.4, -30, 1], [58, -54], [66, -70], [77 + sw * 0.4, -22, 1], [84, 12], [88 + sw * 0.6, 66, 1], [96, 10], [94, -52], [70, -110], [20, -140], [-40, -136], [-86, -106]], hairFill(g, C, -140, 40), { w: 5 });
      strands(g, [[[-52, -116], [-76, -70], [-92, 10], [-88, 84]], [[-34, -124], [-54, -84], [-56, -40]], [[0, -128], [-10, -98], [-12, -62]], [[34, -126], [34, -94], [30, -62]], [[58, -110], [68, -84], [72, -54]]], C.hairS);
      { const band = loop([[-92, -46, 1], [-66, -92], [-20, -116], [30, -112], [72, -84, 1], [62, -80, 1], [50, -90, 1], [38, -84, 1], [24, -98, 1], [8, -86, 1], [-8, -100, 1], [-26, -88, 1], [-40, -98, 1], [-56, -72, 1], [-66, -78, 1], [-78, -44, 1]]); g.save(); g.globalAlpha = 0.5; trace(g, band); g.fillStyle = C.hairH; g.fill(); g.restore(); }
      halo(g, C.hairH, [[-86, -58, 34, -10], [-70, -84, 34, -12], [-52, -98, 30, -10], [-32, -106, 38, -8], [-12, -110, 28, -4], [8, -110, 36, -2], [28, -108, 28, 2], [46, -102, 30, 5], [62, -92, 24, 6]]);
      if (near) sideLock(g, C, -92, 22, sw, -1);
    },
  },
  hota: {
    back(g, C, sw) {
      shape(g, [[-44, -118], [-56, -146], [-84 + sw, -170], [-70 + sw, -182, 1], [-54 + sw, -178], [-46 + sw, -202, 1], [-28 + sw, -184], [-10 + sw, -200, 1], [-4 + sw, -176], [14 + sw, -178, 1], [0, -146], [-6, -120]], C.hair, { w: 5 });
      strands(g, [[[-34, -124], [-44, -150], [-60 + sw, -172]], [[-24, -124], [-26, -154], [-30 + sw, -180]], [[-14, -126], [-10, -150], [-4 + sw, -172]]], C.hairS, 3.4);
      for (let i = 0; i < 3; i++) ink(g, [[-50, -120 - i * 8], [-26, -115 - i * 8], [-2, -122 - i * 8]], { w: 8, color: i % 2 ? PAL.amber : PAL.vermilion, head: 0.05, tail: 0.05 });
      shape(g, [[-20, -132], [-92, -106], [-116, -40], [-112, 30], [-94, 70, 1], [-72, 62], [-58, 30], [-40, -40], [60, -100]], C.hairS, { w: 5 });
    },
    front(g, C, sw) {
      shape(g, [[-78, -84], [-96, -20], [-88, 20], [-70, 34, 1], [-60, -10], [-54, -60]], C.hair, { w: 4 });
      shape(g, [[-74, -86], [-70, -30], [-58, 12, 1], [-46, -36], [-28 + sw * 0.4, -28, 1], [-10, -66], [12 + sw * 0.4, -42, 1], [30, -68], [50 + sw * 0.4, -38, 1], [62, -62], [80 + sw * 0.4, -28, 1], [87, -60], [64, -114], [10, -134], [-50, -126], [-88, -98]], hairFill(g, C, -140, 30), { w: 5 });
      strands(g, [[[-50, -114], [-66, -74], [-66, -30]], [[-14, -120], [-24, -94], [-24, -66]], [[26, -120], [26, -96], [26, -72]], [[54, -106], [62, -84], [66, -60]]], C.hairS);
      halo(g, C.hairH, [[-62, -84, 24, -8], [-42, -98, 28, -8], [-20, -106, 24, -5], [4, -108, 28, -1], [28, -104, 24, 3], [50, -94, 22, 6]], 7);
    },
  },
  narumi: {
    back(g, C, sw) {
      shape(g, [[-20, -126], [-78, -108], [-112, -44], [-110, 18], [-92, 52, 1], [-64, 54], [-50, 6]], C.hairS, { w: 5 });
    },
    front(g, C) {
      shape(g, [[-80, -34], [-84, 22, 1], [-72, -10], [-66, -46], [-40, -60, 1], [-24, -50], [-4, -64, 1], [16, -52], [36, -62, 1], [54, -50], [68, -54, 1], [78, -30], [86, 10, 1], [95, -34], [84, -88], [50, -126], [0, -138], [-60, -122], [-100, -72], [-104, -8], [-92, 34, 1]], hairFill(g, C, -140, 60), { w: 5 });
      strands(g, [[[-56, -116], [-76, -96], [-84, -76]], [[-10, -126], [-18, -106], [-20, -92]], [[34, -122], [40, -104], [40, -90]], [[-92, -30], [-92, -6], [-88, 16]]], C.hairS);
      halo(g, C.hairH, [[-58, -112, 14, -8], [-34, -120, 14, -6], [-8, -124, 13, -3], [20, -122, 13, 2], [46, -112, 13, 5]], 5);
    },
  },
  minato: {
    back(g, C, sw) {
      ink(g, [[-14, -128], [-26 + sw, -150], [-50 + sw, -154]], { w: 12, color: C.hair, head: 0.02, tail: 0.8 });
      shape(g, [[-20, -132], [-90, -108], [-116, -36], [-114, 34], [-96, 76, 1], [-70, 64], [-56, 20], [0, -60], [70, -100]], C.hairS, { w: 5 });
    },
    front(g, C, sw) {
      shape(g, [[-78, -84], [-98, -24], [-90, 18], [-70, 34, 1], [-60, -10], [-54, -60]], C.hair, { w: 4 });
      shape(g, [[-76, -84], [-74, -20], [-62, 22, 1], [-50, -20], [-34 + sw * 0.4, 0, 1], [-20, -40], [-2 + sw * 0.4, -4, 1], [16, -42], [34 + sw * 0.4, -6, 1], [50, -42], [66 + sw * 0.4, -8, 1], [78, -30], [87, 8, 1], [93, -50], [66, -112], [14, -136], [-46, -130], [-88, -100]], hairFill(g, C, -140, 30), { w: 5 });
      strands(g, [[[-50, -116], [-68, -70], [-64, -20]], [[-8, -124], [-18, -90], [-14, -50]], [[34, -118], [38, -88], [38, -52]]], C.hairS);
      halo(g, C.hairH, [[-66, -80, 26, -9], [-46, -96, 30, -9], [-22, -104, 26, -6], [4, -106, 30, -2], [30, -102, 24, 3], [52, -92, 22, 6]], 6);
    },
  },
};

export function head3(g, who, { x, y, s = 1, rot = 0, dir = 1, sway = 0, e = {}, tie = 1, drop = 1 }) {
  tieK = tie; bellK = drop;
  const C = CAST[who], E = { ...NEUTRAL, ...e }, kid = who === 'minato', broad = who === 'hota', near = dir < 0;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(dir * s, s); setLine(Math.min(1, Math.pow(s, -0.4)));
  HAIR3[who].back(g, C, sway, near);
  const jy = kid ? -16 : 0, jw = broad ? 15 : kid ? 5 : 0;
  const face = loop([[-78, -56], [-78, 22], [-66 - jw, 62], [-34 - jw, 98 + jy], [2, 117 + jy], [20, 121 + jy], [38, 114 + jy], [60 + jw * 0.6, 84 + jy], [75 + jw * 0.4, 48], [78, 28], [73, 8], [80, -20], [76, -80], [0, -122]]);
  // near ear
  shape(g, [[-66, 4], [-84, -10], [-98, 2], [-92, 34], [-72, 46]], C.skin, { w: 4, color: LINE });
  ink(g, [[-76, 4], [-88, 8], [-84, 26], [-76, 32]], { w: 2.6, color: C.shade });
  trace(g, face); g.fillStyle = C.skin; g.fill();
  g.save(); trace(g, face); g.clip();
  g.fillStyle = C.shade; g.globalAlpha = 0.72;
  trace(g, loop([[-100, -140, 1], [110, -140, 1], [104, 0], [84, -26], [78, 2], [60, -30], [44, -4], [28, -38], [0, 0], [-24, -24], [-46, 14], [-74, -10]])); g.fill();
  trace(g, loop([[-96, 10, 1], [-58, 30], [-46, 72], [-4, 104], [24, 112], [40, 140, 1], [-110, 140, 1]])); g.fill();
  trace(g, loop([[46, 54], [56, 52], [50, 62]])); g.fill();
  g.globalAlpha = E.blush * 0.8;
  for (const [bx, w] of [[-28, 24], [62, 15]]) { const q = g.createRadialGradient(bx, 50, 1, bx, 50, w); q.addColorStop(0, C.blush); q.addColorStop(1, 'rgba(229,141,124,0)'); g.fillStyle = q; g.fillRect(bx - w, 50 - w, w * 2, w * 2); }
  g.globalAlpha = Math.min(1, E.blush * 1.2);
  for (const bx of [-40, -30, -20, 56, 64]) ink(g, [[bx, 54], [bx + 6, 45]], { w: 2, color: C.blush, curve: false });
  g.globalAlpha = 1;
  if (E.dark) { const q = g.createLinearGradient(0, -110, 0, 64); q.addColorStop(0, `rgba(10,8,32,${E.dark})`); q.addColorStop(0.6, `rgba(10,8,32,${E.dark * 0.6})`); q.addColorStop(1, 'rgba(10,8,32,0)'); g.fillStyle = q; g.fillRect(-120, -140, 240, 220); }
  const ey = kid ? 24 : 15, ek = kid ? 1.14 : 1;
  g.save(); g.translate(59, ey); g.scale(ek, ek); eye3(g, 0, 0, 1, 0.66, C, E); g.restore();
  g.restore();
  contour(g, face, { w: 4.2, color: LINE });
  g.save(); g.translate(-10, ey + 1); g.scale(ek, ek); eye3(g, 0, 0, -1, 1.04, C, E); g.restore();
  ink(g, [[47, 26], [53, 42], [56, 49], [48, 53]], { w: 2.6, color: LINE, head: 0.6, tail: 0.3 });
  g.save(); g.translate(33, 80 + jy * 0.6); g.scale(0.9, 0.95); mouth3(g, E, C); g.restore();
  if (E.tear) {
    const k = E.tear, path = [[-20, 38], [-27, 56], [-31, 76], [-29, 96]], sp = [];
    for (let i = 0; i <= 18; i++) { const u = i / 18 * k * 3, n = Math.min(2, Math.floor(u)), f = u - n; sp.push([lerp(path[n][0], path[n + 1][0], f), lerp(path[n][1], path[n + 1][1], f)]); }
    ink(g, [[8, 33], [-10, 37], [-24, 32]], { w: 5, color: 'rgba(226,246,252,.95)' });
    ink(g, sp, { w: 5, color: 'rgba(206,234,246,.8)', curve: false, head: 0.1, tail: 0 });
    const e2 = sp[sp.length - 1]; g.beginPath(); g.ellipse(e2[0], e2[1], 4.6, 6.4, 0, 0, 7); g.fillStyle = 'rgba(224,245,253,.95)'; g.fill(); g.beginPath(); g.arc(e2[0] - 1.4, e2[1] - 2, 1.6, 0, 7); g.fillStyle = '#fff'; g.fill();
  }
  HAIR3[who].front(g, C, sway, near);
  const bw = broad ? 10 : 6, a = E.brow * 11, yb = -30 + E.browY, bc = C.lash || C.hairS;
  ink(g, [[14, yb + a], [-10, yb - 9], [-42, yb - a * 0.5 + 3]], { w: bw, color: bc, head: 0.12, tail: 0.65 });
  ink(g, [[46, yb + a + 1], [62, yb - 7], [78, yb - a * 0.5 + 1]], { w: bw * 0.85, color: bc, head: 0.12, tail: 0.6 });
  setLine(1);
  g.restore();
}

const tileCache = {};
export function bust3(g, who, o) {
  const C = CAST[who], { x, y, s = 1, dir = 1 } = o, b = who === 'hota' ? 1.22 : who === 'minato' ? 0.68 : 1, near = dir < 0;
  g.save(); g.translate(x, y); g.scale(dir * s, s);
  const P = (px, py, k) => [px * b, py, k];
  const back = loop([P(-60, 118), P(-10, 104), P(64, 122), P(84, 200), P(-90, 200)]);
  trace(g, back); g.fillStyle = C.lapel; g.fill(); g.fillStyle = 'rgba(8,10,34,.5)'; g.fill(); contour(g, back, { w: 4 });
  shape(g, [[-34, 70], [-38, 140], [-56, 162, 1], [12, 214, 1], [56, 160, 1], [42, 138], [44, 92]], C.skin, { w: 4, color: LINE });
  g.save(); g.globalAlpha = 0.8; g.fillStyle = C.shade; trace(g, loop([[-34, 86, 1], [46, 96, 1], [42, 140], [14, 170], [-16, 150], [-36, 130]])); g.fill(); g.restore();
  ink(g, [[4, 150], [9, 164], [12, 178]], { w: 2.2, color: C.shade });
  shape(g, [[-48, 142, 1], [-104 * b, 190], [-120 * b, 520, 1], [150 * b, 520, 1], [104 * b, 190], [56, 142, 1], [34, 176], [12, 216, 1], [-10, 180]], C.under, { w: 4.5 });
  // Kimono collars: the wearer's left always lies on top.
  const nearC = () => shape(g, [[-46, 120, 1], [-72, 138, 1], [-44, 216], [58, 372, 1], [88, 344, 1], [-4, 174]], '#f7f0e0', { w: 3.6 });
  const farC = () => shape(g, [[50, 124, 1], [72, 138, 1], [58, 206], [-32, 380, 1], [-62, 352, 1], [20, 180]], '#f7f0e0', { w: 3.6 });
  if (near) { farC(); nearC(); } else { nearC(); farC(); }
  const panel = (pts, rot, shades, folds, lap) => {
    const c = loop(pts);
    g.save(); trace(g, c); g.clip();
    if (who !== 'minato') { g.fillStyle = C.base; } else if (C.tile) { tileCache[who] ||= C.tile(); const p = g.createPattern(tileCache[who], 'repeat'); p.setTransform(new DOMMatrix().rotate(rot).scale(0.8)); g.fillStyle = p; } else g.fillStyle = C.lapel;
    g.fillRect(-460, 60, 920, 520);
    g.fillStyle = 'rgba(10,14,44,.36)'; for (const q of shades) { trace(g, loop(q)); g.fill(); }
    g.restore();
    contour(g, c, { w: 5.5 });
    folds.forEach((f, i) => ink(g, f, { w: 3.4, seed: i + 2 }));
    if (who === 'shio') { tileCache.shio ||= C.tile(); const lp = g.createPattern(tileCache.shio, 'repeat'); lp.setTransform(new DOMMatrix().rotate(rot).scale(0.5)); shape(g, lap, lp, { w: 4 }); } else shape(g, lap, C.lapel, { w: 4 });
    g.save(); trace(g, loop(lap)); g.clip();
    const lg = g.createLinearGradient(0, 200, 0, 540); lg.addColorStop(0, 'rgba(10,14,44,0)'); lg.addColorStop(1, 'rgba(10,14,44,.38)');
    g.fillStyle = lg; g.fillRect(-460, 60, 920, 520); g.restore();
  };
  panel([P(60, 130, 1), P(116, 158), P(166, 206), P(190, 330), P(196, 540, 1), P(96, 540, 1), P(82, 340), P(78, 210)], 7,
    [[P(176, 230, 1), P(210, 540, 1), P(130, 540, 1), P(160, 380)], [P(86, 200, 1), P(112, 340), P(106, 540, 1), P(84, 540, 1)]],
    [[P(128, 184), P(144, 270), P(138, 420)], [P(160, 250), P(152, 330), P(166, 440)]],
    [P(54, 118, 1), P(74, 128, 1), P(92, 220), P(100, 540, 1), P(72, 540, 1), P(68, 230)]);
  panel([P(-50, 124, 1), P(-134, 158), P(-236, 214), P(-288, 340), P(-306, 540, 1), P(-34, 540, 1), P(-22, 340), P(-56, 214)], -7,
    [[P(-276, 250, 1), P(-320, 540, 1), P(-190, 540, 1), P(-226, 400), P(-214, 300)], [P(-62, 210, 1), P(-74, 320), P(-60, 540, 1), P(-24, 540, 1), P(-30, 340)], [P(-150, 300, 1), P(-120, 400), P(-136, 540, 1), P(-176, 540, 1), P(-160, 410)]],
    [[P(-152, 186), P(-188, 270), P(-196, 420), P(-186, 520)], [P(-92, 170), P(-112, 220), P(-116, 290)], [P(-242, 300), P(-230, 390), P(-244, 500)], [P(-150, 320), P(-140, 400), P(-150, 490)]],
    [P(-46, 112, 1), P(-74, 126, 1), P(-82, 220), P(-58, 340), P(-70, 540, 1), P(-30, 540, 1), P(-18, 336), P(-48, 220)]);
  if (who === 'hota') for (const d of [-1, 1]) { ink(g, [P(d * 70, 130), P(d * 30, 260), P(-d * 60, 420)], { w: 24, color: '#1d1916', head: 0.02, tail: 0.02 }); ink(g, [P(d * 70, 130), P(d * 30, 260), P(-d * 60, 420)], { w: 16, color: '#c98a2c', head: 0.02, tail: 0.02 }); } // tasuki cords
  if (who === 'narumi') { shape(g, [P(-70, 122), P(-20, 150), P(24, 156), P(66, 128), P(82, 150), P(60, 190), P(20, 200), P(-30, 194), P(-78, 152)], '#f4efe2', { w: 4 }); for (const x of [-46, -8, 36]) ink(g, [P(x, 146), P(x + 8, 172), P(x + 4, 192)], { w: 5, color: '#24406e' }); for (const d of [-1, 1]) for (let m = 0; m < 2; m++) shape(g, [P(-168 + m * 20, 330 + d * 2, 1), P(-176 + m * 20, 330 + d * 16, 1), P(-156 + m * 20, 330 + d * 16, 1), P(-146 + m * 20, 330 + d * 2, 1)], '#b23426', { w: 2 }); } // drummer's towel and one feather crest
  // jacket cord
  if (who === 'shio') {
  ink(g, [P(-40, 366), P(18, 392), P(86, 366)], { w: 6, color: PAL.vermilion, head: 0.02, tail: 0.02 });
  shape(g, [P(10, 382), P(24, 376), P(36, 384), P(24, 398)], PAL.vermilion, { w: 3 });
  for (const d of [-1, 1]) ink(g, [P(24, 392), P(24 + d * 10, 430), P(24 + d * 16, 474)], { w: 7, color: PAL.vermilion, head: 0.04, tail: 0.1 });
  }
  g.restore();
  head3(g, who, o);
}
