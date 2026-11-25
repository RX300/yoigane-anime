// Full-body cast in action poses, the bell-steel blades, and the Hikui. Figure units: about 620 tall, feet at y=0.
import { PAL, lerp, clamp, rng, noise1, ink, shape, spline, loop, trace, contour, layer, textiles } from './core.js';
import { CAST } from './figure.js';
import { head3 } from './face.js';

const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function trim(g) { // seigaiha, used only as a border
  tiles.trim ||= textiles.seigaiha(26, PAL.indigo, '#e9efee');
  const p = g.createPattern(tiles.trim, 'repeat'); p.setTransform(new DOMMatrix().scale(0.5)); return p;
}
function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 1);
  const k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k)) * bend, m = Math.hypot(dx, dy) || 1;
  return [a[0] + dx / m * k - dy / m * h, a[1] + dy / m * k + dx / m * h];
}
function tube(pts, widths) {
  const s = spline(pts, 12), L = [], R = [], n = s.length;
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)], m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const u = i / (n - 1) * (widths.length - 1), k = Math.min(widths.length - 2, Math.floor(u)), w = lerp(widths[k], widths[k + 1], u - k) / 2;
    L.push([s[i][0] - (b[1] - a[1]) / m * w, s[i][1] + (b[0] - a[0]) / m * w]);
    R.push([s[i][0] + (b[1] - a[1]) / m * w, s[i][1] - (b[0] - a[0]) / m * w]);
  }
  return [...L, ...R.reverse()];
}
function solid(g, poly, fill, w = 4, color) { trace(g, poly); g.fillStyle = fill; g.fill(); contour(g, poly, { w, color }); }
const tiles = {};
function cloth(g, who, rot = 0, k = 0.42) {
  const C = CAST[who];
  if (who !== 'minato' || !C.tile) return C.base || C.lapel;
  tiles[who] ||= C.tile();
  const p = g.createPattern(tiles[who], 'repeat');
  p.setTransform(new DOMMatrix().rotate(rot).scale(k));
  return p;
}

function bronze(g, y0, y1) {
  const q = g.createLinearGradient(0, y0, 0, y1);
  q.addColorStop(0, '#3f3a22'); q.addColorStop(0.28, '#b59a52'); q.addColorStop(0.42, '#f0dda0'); q.addColorStop(0.62, '#86713a'); q.addColorStop(1, '#2c2818');
  return q;
}
// Working tools whose heads were recast from the broken temple bell.
export function tool(g, who, x, y, a, { flash = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(a);
  if (who === 'hota') { // bamboo-splitting hatchet
    shape(g, [[-74, -9, 1], [60, -9, 1], [60, 9, 1], [-74, 10, 1]], '#7a5230', { w: 4 });
    for (let i = 0; i < 5; i++) ink(g, [[-64 + i * 14, -10], [-58 + i * 14, 10]], { w: 5, color: PAL.amber, curve: false, head: 0.05, tail: 0.05 });
    shape(g, [[42, -14, 1], [52, -30], [140, -32, 1], [164, -8], [160, 22, 1], [52, 16, 1]], bronze(g, -32, 22), { w: 4.5 });
    ink(g, [[60, -20], [104, -24], [140, -20]], { w: 2.6, color: '#4a3d1c', head: 0.05, tail: 0.05 });
  } else if (who === 'narumi') { // festival drumstick with a bell-bronze cap
    shape(g, [[-46, -7, 1], [40, -8], [138, -9], [146, 0], [138, 9], [40, 8], [-46, 7, 1]], '#d9c08a', { w: 3.6 });
    ink(g, [[-30, -3], [40, -4], [130, -4]], { w: 2.4, color: '#f4e4b8', head: 0.1, tail: 0.3 });
    shape(g, [[128, -10, 1], [150, -10], [160, 0], [150, 10], [128, 10, 1]], bronze(g, -10, 10), { w: 3.2 });
    for (let i = 0; i < 4; i++) ink(g, [[-40 + i * 10, -8], [-36 + i * 10, 8]], { w: 4, color: '#24406e', curve: false, head: 0.05, tail: 0.05 });
  } else { // ferry pole: long bamboo, vermilion cord, bell-lip head
    const L = loop([[-290, -5, 1], [0, -8], [300, -7, 1], [300, 7, 1], [0, 8], [-290, 6, 1]]);
    trace(g, L); g.fillStyle = '#a57f48'; g.fill(); contour(g, L, { w: 4 });
    ink(g, [[-280, -2], [0, -4], [290, -3]], { w: 3, color: '#dcbc7e', head: 0.02, tail: 0.05 });
    for (const q of [-230, -150, -70, 90, 170, 240]) ink(g, [[q, -10], [q + 2, 10]], { w: 5, color: '#6b4a24', curve: false, head: 0.05, tail: 0.05 });
    for (let i = 0; i < 6; i++) ink(g, [[268 + i * 7, -10], [272 + i * 7, 10]], { w: 6, color: PAL.vermilion, curve: false, head: 0.05, tail: 0.05 });
    shape(g, [[300, -13, 1], [316, -24], [372, -28], [404, -42, 1], [414, 0], [404, 42, 1], [372, 28], [316, 24], [300, 13, 1]], bronze(g, -40, 40), { w: 5 });
    for (const q of [318, 332]) ink(g, [[q, -27], [q + 4, 0], [q, 25]], { w: 3, color: '#4a3d1c', head: 0.05, tail: 0.05 });
    for (const q of [-14, 0, 14]) { g.beginPath(); g.arc(350, q, 4, 0, 7); g.fillStyle = '#e9d18a'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#3a3018'; g.stroke(); }
    ink(g, [[306, 10], [312, 34], [300, 62]], { w: 5, color: PAL.vermilion, head: 0.05, tail: 0.5 });
  }
  if (flash) { g.globalCompositeOperation = 'screen'; g.globalAlpha = flash; ink(g, [[200, 0], [320, 0], [440, 0]], { w: 10, wobble: 0, color: '#fff3c4' }); }
  g.restore();
}

export const POSE = {
  stand: { hip: [0, -312], chest: [4, -446], neck: [8, -500], hr: [62, -268], hl: [-58, -272], fr: [34, 0], fl: [-34, 0], rot: 0, relaxed: true },
  draw: { hip: [-10, -238], chest: [36, -356], neck: [64, -400], hr: [-26, -262], hl: [-118, -222], fr: [150, 0], fl: [-214, 0], rot: 0.18, blade: [0.0, 'hr', Math.PI * 0.94] },
  dash: { hip: [-40, -200], chest: [90, -262], neck: [140, -286], hr: [-70, -214], hl: [-120, -176], fr: [130, -30], fl: [-310, -70], rot: 0.34, blade: [0, 'hr', Math.PI * 0.97] },
  swing: { hip: [0, -262], chest: [22, -388], neck: [32, -436], hr: [196, -430], hl: [168, -398], fr: [140, 0], fl: [-178, 0], rot: -0.06, blade: [0, 'hr', -0.5] },
  over: { hip: [0, -276], chest: [10, -404], neck: [14, -452], hr: [104, -592], hl: [76, -572], fr: [96, 0], fl: [-120, 0], rot: -0.12, blade: [0, 'hr', -2.25] },
  kneel: { hip: [-30, -150], chest: [-2, -276], neck: [24, -322], hr: [150, -178], hl: [128, -150], fr: [100, 0], kr: [104, -150], fl: [-184, -8], kl: [-20, -14], rot: 0.34 },
  leap: { hip: [0, -270], chest: [30, -392], neck: [48, -438], hr: [150, -540], hl: [118, -514], fr: [96, -150], fl: [-170, -90], rot: 0.1, blade: [0, 'hr', -1.0] },
};
export function mix(a, b, t) {
  const o = {};
  for (const k of ['hip', 'chest', 'neck', 'hr', 'hl', 'fr', 'fl']) o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  o.rot = lerp(a.rot, b.rot, t);
  if (b.stick2 !== undefined) o.stick2 = lerp(a.stick2 === undefined ? b.stick2 : a.stick2, b.stick2, t);
  if (b.blade) o.blade = a.blade ? [0, 'hr', lerp(a.blade[2], b.blade[2], t)] : b.blade;
  return o;
}

// wind pushes cloth toward -x when positive.
export function figure(g, who, { x, y, s = 1, flip = false, pose = POSE.stand, e = {}, yaw = 0.5, sway = 0, wind = 0, t = 0, bladeLen = 330, flash = 0, sheath = false }) {
  const C = CAST[who], p = pose, big = who === 'hota' ? 1.36 : 1, slim = who === 'narumi' ? 0.52 : 1, tall = who === 'narumi' ? 1.08 : who === 'minato' ? 0.66 : 1;
  g.save(); g.translate(x, y); g.scale(flip ? -s * tall : s * tall, s * tall);
  const fl = k => Math.sin(t * 8 + k) * (8 + Math.abs(wind) * 14), W = wind * 120;
  const sh = [p.chest[0], p.chest[1] - 18], shR = [sh[0] + 44 * big, sh[1] + 20], shL = [sh[0] - 44 * big, sh[1] + 20];
  const leg = (foot, dx, bend, dark, knee) => {
    const hp = [p.hip[0] + dx, p.hip[1]], kn = knee || ik(hp, foot, 158, 158, bend);
    solid(g, tube([kn, [lerp(kn[0], foot[0], 0.6), lerp(kn[1], foot[1], 0.6)], foot], [46, 38, 30]), '#d9d0ba', 4);
    for (let i = 1; i < 5; i++) { const q = [lerp(kn[0], foot[0], i / 5), lerp(kn[1], foot[1], i / 5)]; ink(g, [[q[0] - 19, q[1] - 5], [q[0], q[1] + 3], [q[0] + 19, q[1] - 5]], { w: 2.5, color: '#8a7a58' }); }
    shape(g, [[foot[0] - 22, foot[1] - 16], [foot[0] + 10, foot[1] - 22], [foot[0] + 54, foot[1] - 5], [foot[0] + 50, foot[1] + 5], [foot[0] - 24, foot[1] + 5]], '#e9dfc6', { w: 4 });
    ink(g, [[foot[0] - 26, foot[1] + 5], [foot[0] + 10, foot[1] + 8], [foot[0] + 54, foot[1] + 4]], { w: 7, color: '#8a6d33' });
    const U = (p1, p2) => { const m = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1; return [(p2[0] - p1[0]) / m, (p2[1] - p1[1]) / m]; };
    const hem = [lerp(kn[0], foot[0], 0.86) - W * 0.1, lerp(kn[1], foot[1], 0.86)], u1 = U(hp, kn), u2 = U(kn, hem);
    const side = Math.sign(u1[0] * u2[1] - u1[1] * u2[0]) || 1, N = u => [u[1] * side, -u[0] * side], n1 = N(u1), n2 = N(u2), nb = U([0, 0], [n1[0] + n2[0], n1[1] + n2[1]]);
    const A = (o, n, k) => [o[0] + n[0] * k, o[1] + n[1] * k];
    const bent = Math.abs(u1[0] * u2[1] - u1[1] * u2[0]);
    const hip1 = A(hp, n1, 40 * big * Math.max(slim, 0.8)), hip2 = A(hp, n1, -40 * big * Math.max(slim, 0.8)), k1 = A(kn, nb, 46 * slim), k2 = A(kn, nb, -(44 - 18 * bent) * slim), h1 = A(hem, n2, 50 * slim), h2 = A(hem, n2, -54 * slim), hm = A(hem, u2, 12);
    const poly = loop([hip1, A([lerp(hp[0], kn[0], 0.6), lerp(hp[1], kn[1], 0.6)], n1, 48 * big * slim), k1, [...h1, 1], hm, [...h2, 1], k2, A([lerp(hp[0], kn[0], 0.6), lerp(hp[1], kn[1], 0.6)], n1, -44 * big * slim), hip2]);
    solid(g, poly, C.under, 5); if (dark) { trace(g, poly); g.fillStyle = 'rgba(4,6,18,.45)'; g.fill(); }
    g.save(); trace(g, poly); g.clip();
    g.fillStyle = 'rgba(4,8,24,.38)'; trace(g, loop([A(hp, n1, -6), A(kn, nb, -10), [...A(hem, n2, -14), 1], [...A(A(hem, n2, -80), u2, 30), 1], A(kn, nb, -90), A(hp, n1, -90)])); g.fill();
    for (const k of [-0.5, 0.05, 0.6]) ink(g, [A(hp, n1, 34 * k), A(kn, nb, 38 * k), A(hem, n2, 46 * k)], { w: 3, color: '#0a0f1a', head: 0.05, tail: 0.25 });
    g.restore();
    ink(g, [A(hem, n2, 50 * slim), hm, A(hem, n2, -54 * slim)], { w: 6, color: C.lapel, head: 0.05, tail: 0.05 });
  };
  const arm = (a, hand, bend, rot) => {
    const el = ik(a, hand, 98, 96, hand[0] < a[0] - 10 && a === shR ? -bend : bend), bare = who === 'hota', half = who === 'narumi';
    const knob = (r0, stroke) => { g.beginPath(); g.arc(a[0], a[1], r0, 0, 7); g.fillStyle = C.base || C.lapel; g.fill(); if (stroke) { g.lineWidth = 5; g.strokeStyle = PAL.sumi; g.stroke(); } };
    const at2 = (u, v) => [lerp(u[0], v[0], 0.5), lerp(u[1], v[1], 0.5)], fore = solidArm => solid(g, tube([el, at2(el, hand), hand], solidArm), C.skin, 4, '#3a1d1a');
    const cap = (rad, st) => { g.beginPath(); g.arc(el[0], el[1], rad, 0, 7); g.fillStyle = C.skin; g.fill(); if (st) { g.lineWidth = 4; g.strokeStyle = '#3a1d1a'; g.stroke(); } };
    if (bare) { cap(24, true); solid(g, tube([a, at2(a, el), el], [58, 60, 48]), C.skin, 4.5, '#3a1d1a'); fore([48, 46, 32]); cap(21.5, false); ink(g, [[lerp(el[0], hand[0], 0.62) - 14, lerp(el[1], hand[1], 0.62) - 12], [lerp(el[0], hand[0], 0.7) + 14, lerp(el[1], hand[1], 0.7) + 12]], { w: 22, color: '#e8dcc0', curve: false, head: 0.02, tail: 0.02 }); }
    else if (half) { cap(18, true); fore([36, 32, 26]); cap(15.5, false); ink(g, [[lerp(el[0], hand[0], 0.7) - 11, lerp(el[1], hand[1], 0.7) - 8], [lerp(el[0], hand[0], 0.78) + 11, lerp(el[1], hand[1], 0.78) + 8]], { w: 16, color: '#f4efe2', curve: false, head: 0.02, tail: 0.02 }); }
    else solid(g, tube([at2(el, hand), hand], [34, 26]), '#efe7d6', 4);
    { const h = hand, ba = p.blade ? p.blade[2] : Math.atan2(hand[1] - el[1], hand[0] - el[0]) + 1.57;
      g.save(); g.translate(h[0], h[1]); g.rotate(ba);
      if (!p.blade && p.relaxed && !(a === shR ? p.gripR : p.gripL)) {
        shape(g, [[10, 2], [19, -9], [19, -21], [13, -18]], C.skin, { w: 2.6, color: '#3a1d1a' });
        shape(g, [[-11, 13], [-14, -4], [-13, -21], [-7, -35], [2, -38], [9, -33], [12, -18], [13, -2], [10, 13]], C.skin, { w: 3, color: '#3a1d1a' });
        for (const [q, y] of [[-6, -33], [1, -36], [6, -31]]) ink(g, [[q, y], [q + 0.5, y + 12], [q, y + 22]], { w: 1.9, color: '#7d4636', head: 0.1, tail: 0.6 });
      } else {
        shape(g, [[-17, -13], [-2, -17], [14, -15], [19, -4], [17, 12], [2, 16], [-15, 13], [-20, 0]], C.skin, { w: 3.2, color: '#3a1d1a' });
        for (const q of [-9, 0, 9]) ink(g, [[q, -2], [q + 1, 6], [q - 1, 14]], { w: 2.2, color: '#7d4636', head: 0.1, tail: 0.4 });
        ink(g, [[-16, -3], [0, -6], [17, -4]], { w: 2.2, color: '#7d4636', head: 0.1, tail: 0.3 });
        shape(g, [[2, -15], [14, -19], [22, -11], [15, -5], [4, -8]], C.skin, { w: 2.6, color: '#3a1d1a' });
      }
      g.restore(); }
    if (bare) { knob(31, true); solid(g, tube([a, lerp2(a, el, 0.3)], [62, 60]), C.base, 5); knob(29, false); return; }
    if (half) { const c1 = lerp2(a, el, 0.95), sl = tube([a, lerp2(a, el, 0.5), c1], [54, 62, 74]); knob(27, true); solid(g, sl, C.base, 5.5); knob(25, false); g.save(); trace(g, sl); g.clip(); ink(g, [[c1[0] - 60, c1[1] - 8], c1, [c1[0] + 60, c1[1] + 8]], { w: 20, color: C.lapel, head: 0, tail: 0 }); g.fillStyle = 'rgba(40,20,20,.2)'; g.fillRect(a[0] - 90, lerp(a[1], c1[1], 0.5), 180, 14); g.restore(); return; }
    const cuff = lerp2(el, hand, 0.62), dx = -W * 0.3 + fl(rot) * 0.3, sl = tube([a, lerp2(a, el, 0.5), el, cuff], [50, 60, 66, 76]); // full sleeve, close cut
    if (who !== 'minato') knob(25, true);
    solid(g, sl, cloth(g, who, rot * 9), 5.5);
    if (who !== 'minato') knob(23, false);
    g.save(); trace(g, sl); g.clip(); g.fillStyle = 'rgba(8,12,38,.28)'; trace(g, loop([[a[0] - 60, a[1] + 34], [el[0], el[1] + 14], [cuff[0] + 50, cuff[1] + 16], [cuff[0] + 40, cuff[1] + 90], [el[0] - 20, el[1] + 100], [a[0] - 70, a[1] + 90]])); g.fill();
    if (who === 'shio') { const u = Math.atan2(cuff[1] - el[1], cuff[0] - el[0]); g.translate(cuff[0], cuff[1]); g.rotate(u); g.fillStyle = trim(g); g.fillRect(-28, -60, 40, 120); ink(g, [[-28, -60], [-28, 60]], { w: 4, curve: false, head: 0, tail: 0 }); }
    g.restore();
    ink(g, [[el[0] - 4, el[1] - 20], [el[0] + 6 + dx * 0.2, el[1] + 4], [el[0], el[1] + 26]], { w: 3.5 });
  };
  const drawBlade = () => { if (p.blade) tool(g, who, p.hr[0], p.hr[1], p.blade[2], { flash }); };
  // Cloth behind the body.
  const hem = [p.hip[0] - W, p.hip[1] + 104];
  if (who === 'minato') {
    const back = loop([[shL[0], shL[1], 1], [shR[0], shR[1], 1], [p.hip[0] + 72 * big - W * 0.3, p.hip[1]], [hem[0] + 92 * big + fl(1), hem[1] + 8 + fl(2) * 0.6, 1], [hem[0] + 20, hem[1] + 20 + fl(3)], [hem[0] - 60, hem[1] + 2 + fl(4)], [hem[0] - 112 * big + fl(5), hem[1] - 4 - Math.abs(wind) * 46, 1], [p.hip[0] - 80 * big - W * 0.5, p.hip[1] - 20]]);
  trace(g, back); g.fillStyle = cloth(g, who, -4); g.fill(); g.fillStyle = 'rgba(6,10,34,.42)'; g.fill(); contour(g, back, { w: 6 });
  }
  if (p.blade && who === 'narumi') tool(g, who, p.hl[0], p.hl[1], p.stick2 === undefined ? p.blade[2] : p.stick2);
  arm(shL, p.hl, p.hl[0] > shL[0] + 60 ? -1 : 1, 2);
  leg(p.fl, -24, -1, true, p.kl); leg(p.fr, 24, -1, false, p.kr);
  {
    const nw = { hota: 26, narumi: 20, minato: 14 }[who] || 18, n0 = [p.neck[0] - 3, p.neck[1] + 30], n1 = [p.neck[0], p.neck[1] - 8];
    trace(g, [[n0[0] - nw - 4, n0[1]], [n1[0] - nw + 2, n1[1]], [n1[0] + nw - 2, n1[1]], [n0[0] + nw + 4, n0[1]]]); g.fillStyle = C.shade; g.fill();
    for (const d of [-1, 1]) ink(g, [[n1[0] + d * (nw - 2), n1[1]], [n0[0] + d * nw, (n0[1] + n1[1]) / 2], [n0[0] + d * (nw + 6), n0[1]]], { w: 4, color: '#3a1d1a', head: 0.1, tail: 0.1 });
  }
  const torso = loop([[shL[0], shL[1]], [sh[0], sh[1] - 12], [shR[0], shR[1]], [p.hip[0] + 60 * big, p.hip[1] + 16], [p.hip[0], p.hip[1] + 30], [p.hip[0] - 60 * big, p.hip[1] + 16]]);
  solid(g, torso, C.under, 5);
  const vx = lerp(sh[0], p.hip[0], 0.03), vy = lerp(sh[1], p.hip[1], 0.03), nk = [p.neck[0], p.neck[1] + 10], ob = [p.hip[0], p.hip[1] - 14];
  shape(g, [[nk[0] - 18, nk[1] - 2, 1], [nk[0] + 18, nk[1] - 2, 1], [vx + 9, vy - 8], [vx, vy, 1], [vx - 8, vy - 8]], C.skin, { w: 3, color: '#3a1d1a' });
  const cA = () => ink(g, [[nk[0] - 25, nk[1] - 2], [lerp(nk[0], vx, 0.6) - 12, lerp(nk[1], vy, 0.6)], [vx + 14, vy + 24], [lerp(vx, ob[0], 0.6) + 34, lerp(vy, ob[1], 0.6)], [ob[0] + 44, ob[1]]], { w: 15, color: '#f7f0e0', head: 0.03, tail: 0.12 });
  const cB = () => ink(g, [[nk[0] + 25, nk[1] - 2], [lerp(nk[0], vx, 0.6) + 12, lerp(nk[1], vy, 0.6)], [vx - 12, vy + 24], [lerp(vx, ob[0], 0.6) - 34, lerp(vy, ob[1], 0.6)], [ob[0] - 44, ob[1]]], { w: 15, color: '#f7f0e0', head: 0.03, tail: 0.12 });
  const eA = () => ink(g, [[nk[0] - 33, nk[1]], [lerp(nk[0], vx, 0.6) - 20, lerp(nk[1], vy, 0.6) + 2], [vx + 6, vy + 30], [lerp(vx, ob[0], 0.6) + 25, lerp(vy, ob[1], 0.6)], [ob[0] + 34, ob[1]]], { w: 3 });
  const eB = () => ink(g, [[nk[0] + 33, nk[1]], [lerp(nk[0], vx, 0.6) + 20, lerp(nk[1], vy, 0.6) + 2], [vx - 5, vy + 30], [lerp(vx, ob[0], 0.6) - 25, lerp(vy, ob[1], 0.6)], [ob[0] - 34, ob[1]]], { w: 3 });
  if (flip) { cB(); eB(); cA(); eA(); } else { cA(); eA(); cB(); eB(); }
  shape(g, [[p.hip[0] - 60 * Math.min(big, 1.12), p.hip[1] - 18], [p.hip[0] + 60 * Math.min(big, 1.12), p.hip[1] - 18], [p.hip[0] + 62 * Math.min(big, 1.12), p.hip[1] + 12], [p.hip[0] - 62 * Math.min(big, 1.12), p.hip[1] + 12]], who === 'shio' ? PAL.vermilion : who === 'hota' ? PAL.amber : PAL.violet, { w: 4 });
  if (sheath) {
    g.save(); g.translate(p.hip[0] + 34, p.hip[1] - 10); g.rotate(Math.PI - 0.3);
    const sc = loop([[0, -8, 1], [140, -12], [268, -6], [284, 2, 1], [270, 10], [140, 4], [0, 8, 1]]);
    trace(g, sc); g.fillStyle = '#1b1a20'; g.fill(); contour(g, sc, { w: 3.5 });
    ink(g, [[8, -4], [140, -8], [262, -2]], { w: 2.6, color: '#5d6270', head: 0.05, tail: 0.3 });
    shape(g, [[262, -8, 1], [284, 0, 1], [270, 11, 1], [258, 8, 1]], '#8a6d33', { w: 2.5 });
    shape(g, [[52, -14, 1], [66, -14, 1], [66, 9, 1], [52, 9, 1]], PAL.vermilion, { w: 2.5 });
    if (!p.blade) { shape(g, [[-6, -16], [4, -14], [4, 14], [-6, 16]], '#8a6d33', { w: 3 }); shape(g, [[-4, -8, 1], [-84, -2, 1], [-88, 4], [-82, 12, 1], [-4, 8, 1]], '#23303f', { w: 3 }); for (let i = 0; i < 5; i++) shape(g, [[-18 - i * 13, -5, 1], [-12 - i * 13, 2, 1], [-18 - i * 13, 9, 1], [-24 - i * 13, 2, 1]], '#c8bfa8', { w: 1.2 }); }
    g.restore();
  }
  const hipx = p.hip[0], hipy = p.hip[1];
  if (who === 'minato') for (const d of [-1, 1]) {
    const a = d < 0 ? shL : shR, hx = hipx + d * 74 - W * 0.4 + fl(6 + d) * 0.7, hy = hipy + 96;
    const c = loop([[nk[0] + d * 28, nk[1] - 8, 1], [a[0] + d * 2, a[1] - 20], [a[0] + d * 20, a[1] + 8], [a[0] + d * 16, a[1] + 74], [hipx + d * 80, hipy - 10], [hx + d * 20, hy, 1], [hx, hy + 14, 1], [hx - d * 42, hy + 2, 1], [hipx + d * 34, hipy - 20], [vx + d * 34, vy + 20]]);
    trace(g, c); g.fillStyle = cloth(g, who, d * 6); g.fill(); contour(g, c, { w: 5 });
  }
  if (who === 'shio') { // short closed jacket with a scale border, straw rain skirt
    for (let row = 0; row < 2; row++) for (let i = 0; i < 26; i++) { const u = i / 25 * 2 - 1, x0 = hipx + u * 64, l = (row ? 96 : 130) + 18 * Math.sin(i * 2.3); ink(g, [[x0, hipy + 2], [x0 + u * 18 - W * 0.12 + fl(i * 0.4) * 0.2, hipy + l * 0.55], [x0 + u * 30 - W * 0.3 + fl(i * 0.4) * 0.5, hipy + l]], { w: 15, color: ['#b0935a', '#cdb27a', '#8f7440', '#e0c88e'][(i + row) % 4], head: 0.04, tail: 0.4, seed: i + row * 30 }); }
    const j2 = loop([[nk[0] - 34, nk[1] - 4, 1], [shL[0] - 4, shL[1] - 14], [shL[0] - 8, shL[1] + 70], [hipx - 68 - W * 0.1, hipy + 34 + fl(1) * 0.3, 1], [hipx + 70 - W * 0.06, hipy + 34 + fl(2) * 0.3, 1], [shR[0] + 8, shR[1] + 70], [shR[0] + 4, shR[1] - 14], [nk[0] + 34, nk[1] - 4, 1], [vx, vy + 10, 1]]);
    solid(g, j2, C.base, 5.5);
    g.save(); trace(g, j2); g.clip(); g.fillStyle = trim(g); g.fillRect(hipx - 140, hipy + 6, 280, 40); ink(g, [[hipx - 130, hipy + 6], [hipx, hipy + 10], [hipx + 130, hipy + 6]], { w: 4, head: 0, tail: 0 });
    g.fillStyle = 'rgba(8,12,38,.26)'; trace(g, loop([[shL[0] - 20, shL[1] + 10, 1], [shL[0] + 30, shL[1] + 60], [hipx - 30, hipy + 50, 1], [hipx - 110, hipy + 50, 1]])); g.fill();
    ink(g, [[vx + 8, vy + 10], [lerp(vx, hipx, 0.6) + 24, lerp(vy, hipy, 0.6)], [hipx + 34, hipy + 34]], { w: 13, color: '#f7f0e0', head: 0.02, tail: 0.02 }); ink(g, [[vx - 2, vy + 12], [lerp(vx, hipx, 0.6) + 14, lerp(vy, hipy, 0.6)], [hipx + 24, hipy + 34]], { w: 3 }); g.restore();
    ink(g, [[hipx - 66, hipy - 4], [hipx, hipy + 4], [hipx + 68, hipy - 4]], { w: 12, color: PAL.vermilion, head: 0.02, tail: 0.02 }); for (const d of [-1, 1]) ink(g, [[hipx + 14, hipy + 2], [hipx + 16 + d * 8, hipy + 30], [hipx + 14 + d * 12, hipy + 60]], { w: 7, color: PAL.vermilion, head: 0.05, tail: 0.1 });
  }
  if (who === 'narumi') { // open-fronted short happi with one feather crest, towel at the neck
    const j2 = loop([[nk[0] - 32, nk[1] - 4, 1], [shL[0] - 6, shL[1] - 14], [shL[0] - 4, shL[1] + 70], [hipx - 66 - W * 0.14, hipy + 40 + fl(1) * 0.4, 1], [hipx - 8, hipy + 44, 1], [vx - 4, vy + 30], [vx + 8, vy + 30], [hipx + 12, hipy + 44, 1], [hipx + 68 - W * 0.08, hipy + 40 + fl(2) * 0.4, 1], [shR[0] + 4, shR[1] + 70], [shR[0] + 6, shR[1] - 14], [nk[0] + 32, nk[1] - 4, 1]]);
    solid(g, j2, C.base, 5.5);
    g.save(); trace(g, j2); g.clip(); for (const d of [-1, 1]) ink(g, [[nk[0] + d * 26, nk[1] - 6], [vx + d * 14, vy + 40], [hipx + d * 12, hipy + 50]], { w: 22, color: C.lapel, head: 0, tail: 0 }); ink(g, [[hipx - 90, hipy + 34], [hipx, hipy + 38], [hipx + 90, hipy + 34]], { w: 14, color: C.lapel, head: 0, tail: 0 }); g.restore();
    const fx = lerp(shR[0], hipx + 60, 0.3), fy = lerp(shR[1], hipy, 0.4); for (const d of [-1, 1]) for (let m = 0; m < 2; m++) shape(g, [[fx - 16 + m * 12, fy + d, 1], [fx - 22 + m * 12, fy + d * 10, 1], [fx - 10 + m * 12, fy + d * 10, 1], [fx - 4 + m * 12, fy + d, 1]], C.lapel, { w: 1.4 });
    ink(g, [[hipx - 62, hipy - 6], [hipx, hipy + 2], [hipx + 62, hipy - 6]], { w: 15, color: '#24406e', head: 0.02, tail: 0.02 });
    ink(g, [[nk[0] - 34, nk[1] + 6], [nk[0] - 4, nk[1] + 26], [nk[0] + 34, nk[1] + 4]], { w: 24, color: '#1b1a1e', head: 0.1, tail: 0.1 }); ink(g, [[nk[0] - 34, nk[1] + 6], [nk[0] - 4, nk[1] + 26], [nk[0] + 34, nk[1] + 4]], { w: 17, color: '#f4efe2', head: 0.1, tail: 0.1 });
  }
  if (who === 'hota') { // craftsman's long apron with the lantern-maker's mark, crossed tasuki cords
    for (const d of [-1, 1]) { const pth = [[sh[0] + d * 48 * big * 0.8, sh[1] + 4], [sh[0] + d * 10, lerp(sh[1], hipy, 0.5)], [hipx - d * 56, hipy - 20]]; ink(g, pth, { w: 17, color: '#1d1916', head: 0.02, tail: 0.02 }); ink(g, pth, { w: 11, color: '#c98a2c', head: 0.02, tail: 0.02 }); }
    const kneel = hipy > -220, ap = kneel ? loop([[hipx - 67, hipy - 18, 1], [hipx + 67, hipy - 18, 1], [hipx + 150, hipy - 30], [hipx + 214, hipy - 22], [hipx + 218, hipy + 24], [hipx + 176, hipy + 96, 1], [hipx + 60, hipy + 118], [hipx - 70, hipy + 138, 1], [hipx - 82, hipy + 60]]) : loop([[hipx - 62 * big * 0.8, hipy - 18, 1], [hipx + 62 * big * 0.8, hipy - 18, 1], [hipx + 74 - W * 0.2, hipy + 100], [hipx + 64 - W * 0.4 + fl(1) * 0.6, hipy + 196, 1], [hipx - 60 - W * 0.4 + fl(3) * 0.6, hipy + 198, 1], [hipx - 76 - W * 0.2, hipy + 100]]);
    solid(g, ap, '#e8dcc0', 5.5); g.save(); trace(g, ap); g.clip(); g.fillStyle = 'rgba(60,44,30,.22)'; trace(g, loop([[hipx - 90, hipy - 20, 1], [hipx - 30, hipy, 1], [hipx - 40, hipy + 200, 1], [hipx - 110, hipy + 200, 1]])); g.fill(); if (kneel) ink(g, [[hipx - 100, hipy + 126], [hipx + 60, hipy + 104], [hipx + 200, hipy + 80]], { w: 12, color: '#3a342e', head: 0, tail: 0 }); else ink(g, [[hipx - 100, hipy + 178], [hipx, hipy + 184], [hipx + 100, hipy + 176]], { w: 12, color: '#3a342e', head: 0, tail: 0 }); g.restore();
    g.save(); if (kneel) g.translate(44, -38);
    g.beginPath(); g.ellipse(hipx - W * 0.16, hipy + 86, 30, 36, 0, 0, 7); g.lineWidth = 6; g.strokeStyle = '#3a342e'; g.stroke(); for (const q of [-16, 0, 16]) ink(g, [[hipx - 24 - W * 0.16, hipy + 86 + q], [hipx - W * 0.16, hipy + 91 + q], [hipx + 24 - W * 0.16, hipy + 86 + q]], { w: 3.4, color: '#3a342e', head: 0.05, tail: 0.05 });
    g.restore();
  }
  head3(g, who, { x: p.neck[0] + Math.sin(p.rot) * 46 - 4, y: p.neck[1] - 48, s: 0.43 * (who === 'minato' ? 1.36 : 1 / tall), rot: p.rot, dir: 1, sway: sway - wind * 26, e });
  drawBlade();
  arm(shR, p.hr, 1, 1);
  g.restore();
}

// Hikui: a stack of lantern ribs that swallowed the lamps of a valley.
export function hikui(g, { x, y, s = 1, t = 0, glow = 1, split = 0, lean = 0, reach = 0, lamps = 7, crumble = 0, carry = [0, 0], wounds = 0, seed = 3 }) {
  const r = rng(seed);
  g.save(); g.translate(x, y); g.scale(s, s);
  const spine = i => [lean * i * i * 2.2 + Math.sin(t * 1.7 + i * 0.7) * 6, -i * 62];
  g.save(); g.globalAlpha *= clamp(1 - 2.2 * crumble);
  if (crumble < 0.45) for (const d of [-1, 1]) {
    if (wounds >= 2 && d > 0) { const q = spine(7); shape(g, [[q[0] + 56, q[1] - 30], [q[0] + 120, q[1] - 22, 1], [q[0] + 104, q[1] - 4, 1], [q[0] + 128, q[1] + 8, 1], [q[0] + 100, q[1] + 20, 1], [q[0] + 56, q[1] + 34]], '#1b1418', { w: 5 }); continue; }
    const a = spine(7), el = [a[0] + d * (210 + reach * 60), a[1] + 70 - reach * 90 + Math.sin(t * 2 + d) * 10], hd = [a[0] + d * (250 + reach * 210) + (d < 0 ? lean * 160 : lean * 30), a[1] + 300 - reach * 250];
    solid(g, tube([[a[0] + d * 60, a[1]], el, hd], [64, 40, 24]), '#1b1418', 5);
    const cv = spline([[a[0] + d * 60, a[1]], el, hd], 14);
    for (let k = 3; k < cv.length - 2; k += 3) {
      const q = cv[k], v = cv[k + 1], m = Math.hypot(v[0] - q[0], v[1] - q[1]) || 1, nx = -(v[1] - q[1]) / m, ny = (v[0] - q[0]) / m, h = lerp(31, 13, k / cv.length);
      ink(g, [[q[0] - nx * h, q[1] - ny * h], [q[0] + ny * 4, q[1] - nx * 4], [q[0] + nx * h, q[1] + ny * h]], { w: 4.5, color: '#9a6a3c', head: 0.05, tail: 0.05 });
    }
    for (let k = 0; k < 4; k++) { const an = Math.PI / 2 - d * (0.7 - k * 0.42) - reach * d * 0.6; ink(g, [hd, [hd[0] + Math.cos(an) * 64, hd[1] + Math.sin(an) * 64], [hd[0] + Math.cos(an + d * 0.35) * 136, hd[1] + Math.sin(an + d * 0.35) * 136]], { w: 17, color: '#1b1418', head: 0.02, tail: 0.9 }); }
  }
  g.restore();
  if (crumble > 0.02) {
    const prof = [60, 150, 176, 150, 62, 132, 158, 132, 58, 150, 120, 56];
    for (let i = 0; i < 11; i++) {
      const c = spine(i * 0.8), w0 = prof[i], w1 = prof[i + 1], side = i % 2 ? 1 : -1, k = crumble, z = clamp(1.3 - k * 1.25);
      const dx = side * k * k * (40 + r() * 240), dy = k * k * (160 + r() * 520), rot = side * k * (0.1 + r() * 0.9);
      if (z <= 0.02) continue;
      g.save(); g.translate(c[0] + dx + (i > 5 ? carry[0] : 0), c[1] + 30 + dy + (i > 5 ? carry[1] : 0)); g.rotate(rot); g.scale(z, z);
      const q = g.createLinearGradient(-180, 0, 180, 0); q.addColorStop(0, '#4a3018'); q.addColorStop(0.2, '#b98a52'); q.addColorStop(0.5, `rgb(${Math.min(255, Math.round(226 + 22 * glow))},${Math.round(196 + 30 * glow)},${Math.round(140 + 36 * glow)})`); q.addColorStop(0.8, '#c79a62'); q.addColorStop(1, '#4a3018');
      const sl = shape(g, [[-w0, 2, 1], [0, 10], [w0, 2, 1], [w1, -50, 1], [0, -42], [-w1, -50, 1]], q, { w: 5 });
      g.save(); trace(g, sl); g.clip(); for (const yy of [-44, -27, -10, 6]) ink(g, [[-190, yy - 6], [0, yy + 8], [190, yy - 6]], { w: 4.6, color: '#1d0d09', head: 0, tail: 0 }); g.restore();
      g.restore();
    }
  } else {
    const prof = [60, 150, 176, 150, 62, 132, 158, 132, 58, 150, 120, 56], L = [], R = [];
    prof.forEach((w, i) => { const c = spine(i * 0.8); L.push([c[0] - w, c[1] + 30]); R.push([c[0] + w, c[1] + 30]); });
    const body = loop([...L, ...R.reverse()]), q = g.createLinearGradient(-180, 0, 180, 0);
    q.addColorStop(0, '#4a3018'); q.addColorStop(0.2, '#b98a52');
    q.addColorStop(0.5, `rgb(${Math.min(255, Math.round(226 + 22 * glow))},${Math.round(196 + 30 * glow)},${Math.round(140 + 36 * glow)})`);
    q.addColorStop(0.8, '#c79a62'); q.addColorStop(1, '#4a3018');
    trace(g, body); g.fillStyle = q; g.fill();
    g.save(); trace(g, body); g.clip();
    for (let yy = 60; yy > -640; yy -= 17) { const c = spine(-yy / 62); ink(g, [[c[0] - 190, yy - 6], [c[0], yy + 12], [c[0] + 190, yy - 6]], { w: 4.6, color: '#1d0d09', head: 0, tail: 0, seed: -yy }); }
    for (let k = 0; k < 7; k++) { // torn paper
      const cy = -40 - r() * 480, cx = (r() - 0.5) * 210 + spine(-cy / 62)[0], z = 18 + r() * 24;
      shape(g, [[cx, cy - z, 1], [cx + z * 0.7, cy - z * 0.2], [cx + z * 0.3, cy + z * 0.4, 1], [cx + z * 0.1, cy + z * 1.3, 1], [cx - z * 0.5, cy + z * 0.3], [cx - z * 0.8, cy - z * 0.1, 1]], k % 2 ? '#ffd27a' : '#120809', { w: 4 });
    }
    for (const [cx0, cy, d] of [[-92, -210, 1], [88, -330, -1]]) for (let k = 0, cx = cx0 + spine(-cy / 62)[0]; k < 4; k++)
      ink(g, [[cx + k * 13 * d, cy - 40], [cx + k * 13 * d + 4, cy], [cx + k * 13 * d - 5, cy + 44 - k * 6]], { w: 7, color: 'rgba(16,6,6,.75)', seed: k });
    for (let k = 0; k < Math.min(7, lamps); k++) { // the stolen lamps, each still a lantern
      const ly = [-60, -130, -240, -310, -180, -400, -455][k], lx = [-54, 60, -70, 46, 4, -38, 44][k] + spine(-ly / 62)[0] + Math.sin(t * 1.6 + k) * 4, c = glow;
      shape(g, [[lx - 15, ly - 30], [lx + 15, ly - 30], [lx + 25, ly], [lx + 15, ly + 30], [lx - 15, ly + 30], [lx - 25, ly]], `rgb(255,${Math.round(150 + 80 * c)},${Math.round(60 + 80 * c)})`, { w: 3.5, color: '#2a0f08' });
      for (const q of [-14, 0, 14]) ink(g, [[lx - 23, ly + q], [lx, ly + q + 5], [lx + 23, ly + q]], { w: 2, color: '#7a2f12', head: 0, tail: 0 });
      for (const q of [-32, 30]) ink(g, [[lx - 15, ly + q], [lx + 15, ly + q]], { w: 6, color: '#1c0d0a', curve: false, head: 0, tail: 0 });
    }
    g.restore();
    contour(g, body, { w: 9 });
    if (wounds >= 1) for (const [cy, w, sd] of [[-250, 130, 1], [-400, 110, 2]]) { const cx = spine(-cy / 62)[0], rw = rng(sd + 20), z = []; for (let k = 0; k <= 9; k++) z.push([cx - w + k / 9 * w * 2, cy + (rw() - 0.5) * 46]); ink(g, z, { w: 18, color: '#120807', curve: false, head: 0.2, tail: 0.2, seed: sd }); ink(g, z, { w: 8, color: '#fff1c0', curve: false, head: 0.2, tail: 0.2, seed: sd }); }
    for (const [yy, w] of [[-520, 118], [8, 120]]) {
      const cx = spine(-yy / 62)[0];
      shape(g, [[cx - w, yy], [cx, yy + 16], [cx + w, yy], [cx + w, yy + 24], [cx, yy + 42], [cx - w, yy + 24]], '#171013', { w: 4 });
    }
    for (let k = 0; k < 11; k++) {
      const x0 = -130 + k * 26;
      ink(g, [[x0, 40], [x0 + Math.sin(t * 3 + k) * 14, 96], [x0 + Math.sin(t * 2.4 + k) * 30, 130 + r() * 70]], { w: 15, color: k % 3 ? '#d9c9a4' : '#8e3524', head: 0.04, tail: 0.5, seed: k });
    }
  }
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < lamps; i++) {
    const c = spine(2 + (i * 0.8) % 5), px = c[0] + (r() - 0.5) * 90, py = c[1] + (r() - 0.5) * 50 + Math.sin(t * 2 + i) * 6, q = g.createRadialGradient(px, py, 2, px, py, 44);
    q.addColorStop(0, `rgba(255,246,205,${glow})`); q.addColorStop(0.25, `rgba(255,180,70,${0.7 * glow})`); q.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = q; g.fillRect(px - 44, py - 44, 88, 88);
  }
  g.restore();
  const m0 = spine(9.4), m = [m0[0] + (crumble > 0.02 ? carry[0] : 0), m0[1] + (crumble > 0.02 ? carry[1] : 0) + crumble * crumble * 420], o = split * 46, rq = rng(seed + 9);
  g.save(); g.globalAlpha *= clamp(1.35 - 2.7 * crumble);
  for (let i = 0; i < 16; i++) { const a = -Math.PI + i / 15 * Math.PI, l = 130 + rq() * 120; if (i > 4 && i < 11) continue; ink(g, [[m[0] + Math.cos(a) * 62, m[1] + Math.sin(a) * 60], [m[0] + Math.cos(a) * l, m[1] + Math.sin(a) * l * 0.8 + Math.sin(t * 3 + i) * 14], [m[0] + Math.cos(a) * (l + 70), m[1] + Math.sin(a) * l * 0.6 + 70 + Math.sin(t * 3 + i + 1) * 22]], { w: 20, color: i % 3 ? '#15101a' : '#4a3a2c', head: 0.05, tail: 0.8, seed: i }); }
  if (split > 0.02) { const q = g.createRadialGradient(m[0], m[1], 4, m[0], m[1], 120); q.addColorStop(0, '#fff1c0'); q.addColorStop(0.4, PAL.ember); q.addColorStop(1, '#2a0d08'); shape(g, [[m[0] - 60, m[1] - 80], [m[0] + 60, m[1] - 80], [m[0] + 54, m[1] + 80], [m[0] - 54, m[1] + 80]], q, { w: 5 }); ink(g, [[m[0], m[1] + 66], [m[0] + 2, m[1] + 40], [m[0] - 1, m[1] + 22]], { w: 8, color: '#1c0d08', head: 0.05, tail: 0.2 }); for (const [k, col] of [[1, '#ffb84a'], [0.62, '#fff6d8']]) shape(g, [[m[0], m[1] + 34], [m[0] - 20 * k, m[1] + 10], [m[0] - 12 * k, m[1] - 18 * k], [m[0] + 2 * Math.sin(t * 8), m[1] - 52 * k, 1], [m[0] + 13 * k, m[1] - 16 * k], [m[0] + 20 * k, m[1] + 10]], col, { w: 0 }); }
  const rh = rng(seed + 40);
  for (const d of [-1, 1]) {
    if (wounds >= 3 && d < 0) continue;
    g.save(); g.translate(m[0] + d * o, m[1] + (d > 0 ? split * 14 : 0)); g.rotate(d * split * 0.16 + (d > 0 ? 0.03 : 0) + d * crumble * 0.8);
    const edge = [[0, 104, 1], [-d * 8, 72, 1], [d * 9, 46, 1], [-d * 6, 14, 1], [d * 8, -24, 1], [-d * 7, -58, 1]];
    const hs = loop([[0, -108, 1], [d * 62, -108, 1], [d * 78, -88], [d * 88, -10], [d * 84, 62], [d * 64, 104, 1], ...edge]);
    trace(g, hs); const pg = g.createLinearGradient(0, -108, 0, 104); pg.addColorStop(0, '#e6d3a6'); pg.addColorStop(0.45, d < 0 ? '#f1e2bd' : '#f6ebcd'); pg.addColorStop(1, '#b98a52'); g.fillStyle = pg; g.fill();
    g.save(); trace(g, hs); g.clip();
    for (let y = -96; y < 104; y += 17) ink(g, [[-d * 8, y - 2], [d * 46, y + 6], [d * 94, y - 8]], { w: 2.6, color: 'rgba(80,34,12,.6)', head: 0, tail: 0, seed: y + 200 });
    for (const y of [-92, 88]) ink(g, [[-d * 8, y], [d * 46, y + 7], [d * 94, y - 6]], { w: 7, color: '#24406e', head: 0, tail: 0 });
    if (d < 0) for (const k of [30, 20, 9]) { g.beginPath(); g.arc(d * 44, -18, k, 0, 7); g.lineWidth = 6; g.strokeStyle = 'rgba(140,36,24,.75)'; g.stroke(); } // the maker's faded ring mark
    else { shape(g, [[18, -32, 1], [42, -54], [70, -38, 1], [72, -8], [50, 12, 1], [24, 0]], '#0c0506', { w: 4, color: '#5a2412' }); const fk = 1 + 0.12 * Math.sin(t * 9); for (const [k, c] of [[1, '#c8382b'], [0.7, PAL.ember], [0.42, '#fff1c0']]) shape(g, [[45, 4], [45 - 13 * k, -10], [45 - 7 * k, -24 * fk * k - 6], [46, -40 * fk * k - 4, 1], [45 + 9 * k, -20 * fk * k - 6], [45 + 13 * k, -8]], c, { w: 0 }); }
    const mo = [[-d * 10, 50, 1]]; for (let q = 1; q < 6; q++) mo.push([d * q * 13, 47 + rh() * 8, 1]); mo.push([d * 72, 52, 1]); for (let q = 5; q > 0; q--) mo.push([d * q * 13, 58 + rh() * 7 - q, 1]); mo.push([-d * 10, 62, 1]);
    shape(g, mo, '#2a120a', { w: 3, color: '#7d4a28' });
    g.restore(); contour(g, hs, { w: 6 });
    for (const y of [-112, 104]) ink(g, [[0, y], [d * 34, y + 2], [d * 66, y - 1]], { w: 11, color: '#171013', head: 0, tail: 0 });
    g.restore();
  }
  g.restore();
  g.restore();
}
