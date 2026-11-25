// Original cast: heads, expressions and busts. Head units: face is about 170 wide and 215 tall around (0,0).
import { PAL, lerp, clamp, ink, shape, loop, trace, textiles } from './core.js';

export const CAST = {
  shio: {
    skin: '#f7e1cb', shade: '#d8a893', blush: '#e58d7c', hair: '#20242e', hairS: '#0f1218', hairH: '#6f7480',
    iris: ['#0c3d50', '#2f9aa3', '#c6f1e4'], under: '#22344f', lapel: '#e9efee', base: '#2a5a8a',
    tile: () => textiles.seigaiha(46, PAL.indigo, '#e9efee'),
  },
  hota: {
    skin: '#eec39a', shade: '#bf8459', blush: '#d9694a', hair: '#2b211c', hairS: '#140f0c', hairH: '#6a5446',
    iris: ['#2a1a10', '#6b4426', '#d9b48a'], under: '#4a443e', lapel: '#e8dcc0', base: '#57504a',
    tile: () => textiles.tatewaku(34, PAL.brick, '#f0d9b0'),
  },
  narumi: {
    skin: '#c48f69', shade: '#8d5c42', blush: '#a5523f', lash: '#2a1c33', hair: '#23252b', hairS: '#111318', hairH: '#5a606c',
    iris: ['#20140e', '#5a3a24', '#c9a27c'], under: '#3a2f2a', lapel: '#b23426', base: '#e0d5bb',
    tile: () => textiles.yagasuri(44, '#e6e0ea', PAL.violet, '#3f3557'),
  },
  minato: {
    skin: '#f7e1cb', shade: '#dba993', blush: '#ef8f7c', hair: '#22384a', hairS: '#11202d', hairH: '#5b97ad',
    iris: ['#0c3d50', '#2f9aa3', '#c6f1e4'], under: '#6d5a3a', lapel: '#8f7440', tile: () => textiles.straw(52, '#7a6034', '#c9ad74', '#e2cc96'),
  },
};

function eye(g, cx, cy, d, C, e, w = 1) {
  const h = 25 * e.open, P = (x, y) => [cx + d * x * w, cy + y];
  if (e.open < 0.14) {
    const k = e.happy ? -13 : 11;
    ink(g, [P(-25, 4), P(-6, 4 + k), P(12, 3 + k), P(29, 0)], { w: 8, color: (C.lash || C.hairS), head: 0.25, tail: 0.3 });
    if (!e.happy) for (const x of [8, 17, 25]) ink(g, [P(x, 11), P(x + 5, 20)], { w: 3.5, color: (C.lash || C.hairS), curve: false });
    return;
  }
  const up = [P(-25, 5), P(-14, -h * 0.72), P(4, -h), P(20, -h * 0.66), P(30, -3)];
  const lo = [P(23, h * 0.62), P(4, h * 0.82), P(-14, h * 0.6)];
  const s = loop([[...up[0], 1], up[1], up[2], up[3], [...up[4], 1], ...lo]);
  g.save();
  trace(g, s); g.fillStyle = '#fdf8ee'; g.fill(); g.clip();
  const ix = cx + e.look[0] * 9 + d * 2, iy = cy + e.look[1] * 7 - 2, r = 18.5, ry = 23;
  const gr = g.createLinearGradient(0, iy - ry, 0, iy + ry);
  gr.addColorStop(0, C.iris[0]); gr.addColorStop(0.5, C.iris[1]); gr.addColorStop(1, C.iris[2]);
  const el = (x, y, a, b, f) => { g.beginPath(); g.ellipse(x, y, a * w, b, 0, 0, 7); g.fillStyle = f; g.fill(); };
  el(ix, iy, r + 2, ry + 2, C.iris[0]); el(ix, iy, r, ry, gr);
  g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,.38)';
  for (const k of [0.78, 0.58]) { g.beginPath(); g.ellipse(ix, iy + 3, r * k * w, ry * k, 0, 0.15, Math.PI - 0.15); g.stroke(); }
  el(ix, iy + 1, 8.5 * e.pupil, 11.5 * e.pupil, (C.lash || C.hairS));
  el(ix - 7 * w, iy - 10, 6, 7, '#ffffff'); el(ix + 7 * w, iy + 10, 3, 3.6, 'rgba(255,255,255,.85)');
  g.fillStyle = 'rgba(60,40,70,.28)'; g.fillRect(cx - 45, cy - h - 4, 90, h * 0.55);
  g.restore();
  ink(g, [P(-27, 8), ...up.slice(1, 4), P(31, -5), P(37, -13)], { w: 8.5, color: (C.lash || C.hairS), head: 0.62, tail: 0.16 });
  ink(g, [P(27, h * 0.4), P(8, h * 0.84), P(-12, h * 0.66)], { w: 3, color: (C.lash || C.hairS), head: 0.1, tail: 0.6 });
  ink(g, [P(-16, -h - 6), P(4, -h - 11), P(24, -h - 3)], { w: 3, color: C.shade });
}

function mouth(g, type, C, k = 1) {
  const y = 72;
  const cav = (pts, teeth, tongue) => {
    const s = loop(pts); g.save(); trace(g, s); g.fillStyle = '#5a1620'; g.fill(); g.clip();
    if (tongue) { g.beginPath(); g.ellipse(0, y + 34 * k, 24, 16, 0, 0, 7); g.fillStyle = '#d9606a'; g.fill(); }
    if (teeth) { g.fillStyle = '#fffaf0'; g.fillRect(-50, y - 20, 100, 24); }
    g.restore(); ink(g, [...s, s[0]], { w: 4.5, curve: false, head: 0, tail: 0 });
  };
  if (type === 'line') ink(g, [[-14, y], [0, y + 2], [15, y - 1]], { w: 4.5 });
  else if (type === 'sad') ink(g, [[-15, y + 5], [0, y - 2], [15, y + 5]], { w: 4.5 });
  else if (type === 'smile') ink(g, [[-20, y - 4], [0, y + 8], [21, y - 5]], { w: 5 });
  else if (type === 'laugh') cav([[-30, y - 8, 1], [0, y - 4], [30, y - 8, 1], [18, y + 26 * k], [0, y + 34 * k], [-18, y + 26 * k]], true, true);
  else if (type === 'shout') cav([[-26, y - 10], [0, y - 16], [26, y - 10], [24, y + 24 * k], [0, y + 34 * k], [-24, y + 24 * k]], true, true);
  else if (type === 'o') cav([[-9, y - 8], [9, y - 8], [10, y + 10], [-10, y + 10]], false, false);
  else if (type === 'grit') {
    const s = loop([[-30, y - 6, 1], [0, y - 9], [30, y - 6, 1], [24, y + 13], [0, y + 10], [-24, y + 13]]);
    g.save(); trace(g, s); g.fillStyle = '#fffaf0'; g.fill(); g.clip();
    for (let x = -24; x <= 24; x += 9) ink(g, [[x, y - 12], [x, y + 18]], { w: 2, curve: false, head: 0, tail: 0 });
    ink(g, [[-32, y + 2], [0, y], [32, y + 2]], { w: 3, head: 0, tail: 0 });
    g.restore(); ink(g, [...s, s[0]], { w: 4.5, curve: false, head: 0, tail: 0 });
  }
}

function strands(g, list, color, w) { list.forEach((p, i) => ink(g, p, { w, color, seed: i + 3 })); }

const HAIR = {
  shio: {
    back(g, C, sw) {
      shape(g, [[-96, -50], [-112, 20], [-106, 92], [-92 + sw, 132, 1], [-58, 112], [0, 96], [58, 112], [94 + sw, 134, 1],
        [108, 92], [112, 20], [96, -50], [66, -112], [0, -134], [-66, -112]], C.hairS, { w: 7 });
    },
    front(g, C, sw) {
      shape(g, [[-100, 34], [-94 + sw, 118, 1], [-78, 60], [-72, -12], [-58 + sw * 0.5, 4, 1], [-40, -52], [-22 + sw * 0.5, -8, 1],
        [2, -58], [24 + sw * 0.5, -14, 1], [44, -58], [60 + sw * 0.5, -2, 1], [74, -20], [82, 56], [96 + sw, 112, 1], [102, 30],
        [98, -56], [64, -116], [0, -136], [-64, -116], [-98, -56]], C.hair, { w: 6 });
      strands(g, [[[-58, -100], [-74, -60], [-80, 10]], [[-20, -116], [-40, -88], [-46, -54]], [[14, -118], [8, -86], [4, -58]],
        [[50, -106], [62, -70], [66, -30]]], C.hairS, 4);
      for (const [x, y, l, k] of [[-58, -84, 30, 5], [-40, -94, 42, 8], [-18, -99, 36, 7], [10, -100, 44, 9], [34, -96, 34, 6], [54, -86, 26, 5]])
        ink(g, [[x, y], [x - 4, y + l * 0.5], [x - 8 + x * 0.04, y + l]], { w: k, color: C.hairH, head: 0.3, tail: 0.6 });
      // The side lock Minato tied: vermilion cord and bell.
      shape(g, [[84, 34], [100, 40], [108 + sw, 110], [112 + sw * 1.6, 176, 1], [94 + sw * 1.3, 150], [86 + sw, 100]], C.hair, { w: 5 });
      for (let i = 0; i < 4; i++) ink(g, [[82 + sw * 0.5, 92 + i * 8], [97 + sw * 0.5, 96 + i * 8], [111 + sw * 0.5, 90 + i * 8]], { w: 7, color: PAL.vermilion });
      ink(g, [[110 + sw * 0.5, 108], [124 + sw * 0.8, 124], [122 + sw, 146]], { w: 4, color: PAL.vermilion });
      shape(g, [[122 + sw, 144], [134 + sw, 156], [122 + sw, 169], [110 + sw, 156]], '#e3b04b', { w: 4 });
      ink(g, [[112 + sw, 159], [122 + sw, 163], [132 + sw, 159]], { w: 3 });
    },
  },
  hota: {
    back(g, C, sw) {
      shape(g, [[-20, -112], [-30, -140], [-52 + sw, -172], [-34 + sw, -182, 1], [-22 + sw, -176], [-10 + sw, -200, 1], [6 + sw, -180], [26 + sw, -194, 1], [34 + sw, -172], [54 + sw, -168, 1], [30, -138], [20, -112]], C.hair, { w: 5 });
      strands(g, [[[-8, -118], [-16, -146], [-28 + sw, -172]], [[4, -118], [6, -150], [2 + sw, -176]], [[14, -120], [24, -146], [36 + sw, -166]]], C.hairS, 4);
      for (let i = 0; i < 3; i++) ink(g, [[-26, -118 - i * 9], [0, -113 - i * 9], [26, -118 - i * 9]], { w: 9, color: i % 2 ? PAL.amber : PAL.vermilion, head: 0.05, tail: 0.05 });
      shape(g, [[-100, -40], [-104, 22], [-92, 48, 1], [92, 48, 1], [104, 22], [100, -40], [62, -108], [0, -122], [-62, -108]], C.hairS, { w: 6 });
    },
    front(g, C, sw) {
      shape(g, [[-98, 26, 1], [-84, -6], [-88, -24], [-70 + sw * 0.4, -20, 1], [-54, -58], [-30 + sw * 0.4, -40, 1], [-8, -72], [10 + sw * 0.4, -46, 1],
        [34, -70], [52 + sw * 0.4, -36, 1], [72, -50], [84, -8], [98, 26, 1], [102, -38], [64, -110], [0, -126], [-64, -110], [-102, -38]], C.hair, { w: 6 });
      strands(g, [[[-52, -98], [-66, -64], [-72, -34]], [[-6, -112], [-14, -90], [-12, -72]], [[40, -104], [50, -80], [56, -52]]], C.hairS, 4);
      shape(g, [[-60, -88, 1], [-20, -104], [26, -104], [62, -86, 1], [28, -92], [-2, -86], [-28, -93]], C.hairH, { w: 0 });
    },
  },
  narumi: {
    back(g, C, sw) {
      shape(g, [[-92, -48], [-96, 14], [-84, 46, 1], [84, 46, 1], [96, 14], [92, -48], [60, -114], [0, -130], [-60, -114]], C.hairS, { w: 6 });
    },
    front(g, C) {
      shape(g, [[-94, 30, 1], [-86, -10], [-82, -44], [-54, -62, 1], [-36, -52], [-14, -66, 1], [6, -54], [28, -66, 1], [48, -52], [66, -60, 1], [82, -40], [88, -8], [94, 30, 1], [98, -40], [64, -116], [0, -134], [-64, -116], [-98, -40]], C.hair, { w: 6 });
      strands(g, [[[-50, -112], [-64, -90], [-70, -74]], [[-8, -120], [-14, -100], [-14, -84]], [[40, -112], [48, -94], [50, -78]]], C.hairS, 4);
    },
  },
  minato: {
    back(g, C) { shape(g, [[-96, -40], [-100, 30], [-80, 64, 1], [80, 64, 1], [100, 30], [96, -40], [62, -108], [0, -124], [-62, -108]], C.hairS, { w: 6 }); },
    front(g, C, sw) {
      shape(g, [[-98, 20, 1], [-84, -10], [-66, 0, 1], [-46, -34], [-24, -4, 1], [0, -40], [22, -4, 1], [46, -36], [64, 0, 1], [84, -10], [98, 20, 1], [100, -36], [64, -110], [0, -128], [-64, -110], [-100, -36]],
        C.hair, { w: 6 });
      shape(g, [[-58, -88, 1], [-14, -102], [34, -100], [62, -84, 1], [26, -90], [-6, -84], [-30, -92]], C.hairH, { w: 0 });
    },
  },
};

export const NEUTRAL = { open: 1, happy: false, look: [0, 0], pupil: 1, brow: 0, browY: 0, mouth: 'line', mouthK: 1, blush: 0.25, tear: 0, dark: 0 };

export function head(g, who, { x, y, s = 1, rot = 0, yaw = 0, sway = 0, e = {} }) {
  const C = CAST[who], E = { ...NEUTRAL, ...e }, broad = who === 'hota' ? 1.08 : 1, ax = yaw * 20;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  HAIR[who].back(g, C, sway);
  for (const d of [-1, 1]) shape(g, [[d * 82, -12], [d * 102, -18], [d * 98, 18], [d * 80, 26]], C.skin, { w: 5 });
  const jaw = [[-86 * broad, -60], [-85 * broad, 12], [-80 * broad, 54], [-62 * broad + ax * 0.2, 88], [-30 + ax * 0.6, 109], [ax * 0.9, 114], [30 + ax * 0.6, 109], [62 * broad + ax * 0.2, 88], [80 * broad, 54], [85 * broad, 12], [86 * broad, -60], [0, -118]];
  const f = shape(g, jaw, C.skin, { w: 4.5, color: '#3a1d1a' });
  g.save(); trace(g, f); g.clip();
  g.fillStyle = C.shade;
  g.globalAlpha = 0.75;
  trace(g, loop([[-120, -140, 1], [120, -140, 1], [112, -6], [70, -28], [52, 4], [20, -30], [-8, -2], [-44, -30], [-66, 6], [-112, -10]])); g.fill();
  trace(g, loop([[58, 10, 1], [130, -20, 1], [130, 150, 1], [10, 150, 1], [52, 88]])); g.fill();
  g.globalAlpha = E.blush;
  for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * 52 + ax, 42, 20, 10, 0, 0, 7); g.fillStyle = C.blush; g.fill(); }
  g.globalAlpha = 1;
  if (E.dark) { const q = g.createLinearGradient(0, -120, 0, 70); q.addColorStop(0, `rgba(12,10,34,${E.dark})`); q.addColorStop(1, 'rgba(12,10,34,0)'); g.fillStyle = q; g.fillRect(-130, -140, 260, 280); }
  g.restore();
  g.save(); g.translate(ax, 0);
  for (const d of [-1, 1]) { g.save(); g.translate(d * 43, 17); g.scale(1.12, 1.14); eye(g, 0, 0, d, C, E, d * yaw > 0 ? 1 - Math.abs(yaw) * 0.24 : 1); g.restore(); }
  ink(g, [[3 + ax * 0.3, 44], [7 + ax * 0.3, 52], [1, 55]], { w: 3, color: '#7d4636' });
  mouth(g, E.mouth, C, E.mouthK);
  if (E.tear) for (const d of [-1, 1]) {
    const L = 78 * E.tear;
    shape(g, [[d * 42, 34, 1], [d * 50, 40 + L * 0.5], [d * 52, 36 + L], [d * 46, 44 + L], [d * 40, 36 + L], [d * 40, 40 + L * 0.5]], 'rgba(214,240,250,.9)', { w: 2.5, color: '#5f93ad' });
  }
  g.restore();
  HAIR[who].front(g, C, sway);
  for (const d of [-1, 1]) {
    const a = E.brow * 13, yb = -34 + E.browY;
    ink(g, [[d * 22 + ax, yb + a], [d * 46 + ax, yb - 9], [d * 72 + ax, yb - a * 0.5 + 2]], { w: who === 'hota' ? 12 : 7, color: C.lash || C.hairS, head: 0.15, tail: 0.6 });
  }
  g.restore();
}

export function bust(g, who, o) {
  const C = CAST[who], { x, y, s = 1 } = o, b = who === 'hota' ? 1.28 : who === 'minato' ? 0.82 : 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, [[-34, 70], [-40, 140], [-60, 160, 1], [0, 236, 1], [60, 160, 1], [40, 140], [34, 70]], C.skin, { w: 4.5, color: '#3a1d1a' });
  g.save(); g.globalAlpha = 0.8; trace(g, loop([[-34, 84, 1], [34, 84, 1], [40, 146], [8, 160], [-34, 122]])); g.fillStyle = C.shade; g.fill(); g.restore();
  shape(g, [[-44, 142, 1], [-62, 190], [-90, 466, 1], [90, 466, 1], [62, 190], [44, 142, 1], [26, 190], [0, 236, 1], [-26, 190]], C.under, { w: 5 });
  shape(g, [[44, 124, 1], [66, 136, 1], [44, 214], [-36, 330, 1], [-58, 306, 1], [22, 196]], '#efe7d6', { w: 4 });
  shape(g, [[-44, 124, 1], [-66, 136, 1], [-44, 214], [40, 336, 1], [62, 310, 1], [-22, 196]], '#f7f0e0', { w: 4 });
  for (const d of [-1, 1]) {
    const pts = [[d * 44, 128, 1], [d * 120 * b, 158], [d * 206 * b, 206], [d * 246 * b, 330], [d * 258 * b, 470, 1], [d * 60, 470, 1], [d * 40, 300], [d * 58, 180]];
    const c = loop(pts);
    g.save(); trace(g, c); g.clip();
    if (C.tile) { const p = g.createPattern(C.tile(), 'repeat'); p.setTransform(new DOMMatrix().rotate(d * 8).scale(0.8)); g.fillStyle = p; }
    else g.fillStyle = C.lapel;
    g.fillRect(-400, 60, 800, 460);
    g.fillStyle = 'rgba(10,14,40,.34)';
    trace(g, loop([[d * 250 * b, 220, 1], [d * 270 * b, 480, 1], [d * 150 * b, 480, 1], [d * 206 * b, 350]])); g.fill();
    trace(g, loop([[d * 64, 190, 1], [d * 92, 300], [d * 84, 480, 1], [d * 46, 480, 1]])); g.fill();
    g.restore();
    shape(g, pts, null, { w: 7, seed: d + 4 });
    ink(g, [[d * 150 * b, 190], [d * 168 * b, 270], [d * 160 * b, 400]], { w: 4.5 });
    shape(g, [[d * 40, 118, 1], [d * 62, 126, 1], [d * 74, 220], [d * 66, 470, 1], [d * 38, 470, 1], [d * 46, 230]], C.lapel, { w: 5 });
  }
  g.restore();
  head(g, who, { ...o, x: x, y: y });
}
