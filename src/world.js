// The five places of the film. Every function paints a full 1920x1080 frame.
import { W, H, PAL, lerp, clamp, rng, noise1, ink, shape, loop, trace, contour, bokashi } from './core.js';
import { fire } from './fx.js';

export function glow(g, x, y, r, color = '255,176,72', a = 0.8) {
  const q = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [s, k] of [[0, 1], [0.15, 0.62], [0.35, 0.3], [0.6, 0.1], [0.82, 0.025], [1, 0]]) q.addColorStop(s, `rgba(${color},${a * k})`);
  g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}

export function snow(g, f, n = 420, seed = 4, wind = 0.5, speed = 1.4) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const z = 0.35 + Math.pow(r(), 2.2) * 3.2;
    const x = ((r() * W + Math.sin(f / 30 + i) * 16 * z + f * wind * z * 2) % (W + 80) + W + 80) % (W + 80) - 40, y = (r() * H + f * speed * z) % (H + 40) - 20;
    g.beginPath(); g.ellipse(x, y, 1.5 * z, 1.5 * z * (1 + Math.abs(wind) * 0.1), 0, 0, 7);
    if (z > 2.2) { const q = g.createRadialGradient(x, y, 0, x, y, 3.4 * z); q.addColorStop(0, 'rgba(255,255,255,.8)'); q.addColorStop(0.5, 'rgba(250,252,255,.38)'); q.addColorStop(1, 'rgba(250,252,255,0)'); g.fillStyle = q; g.fillRect(x - 3.4 * z, y - 3.4 * z, 6.8 * z, 6.8 * z); } else { g.fillStyle = 'rgba(250,249,244,.82)'; g.fill(); }
  }
}

export function peak(g, x, y, w, h, seed, body, shade, cap) {
  const r = rng(seed), L = [], R = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, sl = Math.pow(u, 1.35);
    L.push([x - w * sl + (r() - 0.5) * w * 0.035, y - h * (1 - u)]); R.push([x + w * sl + (r() - 0.5) * w * 0.035, y - h * (1 - u)]);
  }
  const poly = [...L.slice().reverse(), ...R];
  trace(g, poly); const q = g.createLinearGradient(0, y - h, 0, y); q.addColorStop(0, body); q.addColorStop(1, shade); g.fillStyle = q; g.fill();
  g.save(); trace(g, poly); g.clip();
  for (let i = 0; i < 30; i++) {
    const a = (r() - 0.5) * 2, l = 0.12 + r() * 0.36, u = r() * 0.5;
    ink(g, [[x + a * w * u * 0.5, y - h * (1 - u * 0.4)], [x + a * w * (u * 0.5 + l * 0.4), y - h * (1 - u * 0.4 - l * 0.6)], [x + a * w * (u * 0.5 + l), y - h * (1 - u * 0.4 - l)]], { w: 5 + r() * 14, color: a < 0 ? cap : shade, head: 0.1, tail: 0.8, seed: i });
  }
  g.restore();
  contour(g, poly, { w: 4, color: '#10233f', seed });
}

export function pine(g, x, y, s, seed, snowy = true, col = '#122b33', lit = '#3d6446') {
  const r = rng(seed), trunk = [[x, y], [x + 34 * s, y - 110 * s], [x - 14 * s, y - 220 * s], [x + 26 * s, y - 330 * s], [x + 8 * s, y - 392 * s]];
  ink(g, trunk, { w: 34 * s, color: '#17120f', head: 0.02, tail: 0.8, wobble: 0.3, seed });
  ink(g, trunk.map(p => [p[0] - 5 * s, p[1]]), { w: 8 * s, color: '#4d3a2c', head: 0.1, tail: 0.8, wobble: 0.6, seed });
  const pads = [[-120, 150, 150], [128, 186, 140], [-96, 236, 132], [104, 276, 116], [-66, 318, 104], [62, 350, 92], [4, 396, 84]];
  for (const [dx, dy, l] of pads) {
    const cx = x + dx * s, cy = y - dy * s, w = l * s;
    ink(g, [[x + dx * 0.1 * s, cy + 26 * s], [cx - dx * 0.3 * s, cy + 18 * s], [cx, cy + 4 * s]], { w: 11 * s, color: '#17120f', head: 0.02, tail: 0.5 });
    for (let k = 0; k < 13; k++) {
      const u = k / 12 * 2 - 1, fx = cx + u * w * 0.82, fy = cy - (1 - u * u) * w * 0.2 + (r() - 0.5) * 10 * s, R = w * (0.26 + 0.1 * (1 - Math.abs(u)));
      g.beginPath(); g.moveTo(fx - R, fy + R * 0.28);
      for (let m = 0; m <= 10; m++) { const a = Math.PI + m / 10 * Math.PI, q = m % 2 ? 1 : 0.8; g.lineTo(fx + Math.cos(a) * R * q, fy + Math.sin(a) * R * 0.8 * q); }
      g.lineTo(fx + R, fy + R * 0.28); g.quadraticCurveTo(fx, fy + R * 0.5, fx - R, fy + R * 0.28); g.closePath();
      g.fillStyle = col; g.fill(); g.lineWidth = 2 * s; g.strokeStyle = 'rgba(6,14,16,.8)'; g.stroke();
      g.lineWidth = 1.5 * s; g.strokeStyle = lit; g.beginPath();
      for (let m = 1; m < 8; m++) { const a = Math.PI + m / 8 * Math.PI; g.moveTo(fx, fy + R * 0.2); g.lineTo(fx + Math.cos(a) * R * 0.84, fy + Math.sin(a) * R * 0.66); }
      g.stroke();
      if (snowy) { g.beginPath(); g.ellipse(fx, fy - R * 0.5, R * 0.7, R * 0.24, 0, 0, 7); g.fillStyle = '#e6eef0'; g.fill(); }
    }
  }
}

// Steep thatched farmhouse seen at three-quarters; lit 0..1.
function minka(g, x, y, s, lit, seed) {
  const r = rng(seed), mir = seed % 3 === 1 ? -1 : 1, pit = 0.88 + (seed % 4) * 0.08, P = (u, v, k) => [x + mir * u * s, y + (v < -66 ? -66 + (v + 66) * pit : v) * s, k];
  g.fillStyle = '#17202f'; trace(g, [P(-80, 0), P(-80, -62), P(60, -62), P(60, 0)]); g.fill();
  g.fillStyle = '#0f1725'; trace(g, [P(60, 0), P(60, -62), P(210, -50), P(210, -6)]); g.fill();
  const warm = k => `rgb(${[lerp(30, 255, k), lerp(42, 186, k), lerp(62, 84, k)].map(Math.round).join(',')})`;
  for (const [u, w] of [[-64, 46], [-8, 52]]) {
    g.fillStyle = warm(lit); trace(g, [P(u, -10), P(u, -52), P(u + w, -52), P(u + w, -10)]); g.fill();
    g.fillStyle = '#101826'; for (let k = 1; k < 4; k++) g.fillRect(x + mir * (u + w * k / 4) * s - 1.2 * s, y - 52 * s, 2.4 * s, 42 * s);
    g.fillRect(x + (mir > 0 ? u : -u - w) * s, y - 32 * s, w * s, 2.2 * s);
  }
  g.fillStyle = warm(lit * 0.7); trace(g, [P(90, -14), P(90, -46), P(150, -42), P(150, -14)]); g.fill();
  shape(g, [P(-8, -208, 1), P(72, -66, 1), P(236, -54, 1), P(160, -190, 1)], '#b9ccd8', { w: 3.2 * s, color: '#14263c' });
  for (let i = 0; i < 9; i++) { const u = r(); ink(g, [P(-2 + u * 160, -200 + u * 14), P(34 + u * 160, -130 + u * 10), P(72 + u * 156, -70 + u * 10)], { w: 2.2 * s, color: '#7f9db2', seed: i }); }
  shape(g, [P(-8, -212, 1), P(-112, -58), P(-96, -54, 1), P(-10, -150, 1), P(76, -54, 1), P(92, -60)], '#f0f3f1', { w: 3.6 * s, color: '#14263c' });
  g.fillStyle = '#3a3026'; trace(g, [P(-10, -152), P(-84, -62), P(64, -62)]); g.fill();
  for (let i = 1; i < 6; i++) ink(g, [P(-10 - i * 12, -152 + i * 15), P(-10, -150 + i * 16), P(-10 + i * 12, -152 + i * 15)], { w: 2.4 * s, color: '#1b150f' });
  g.fillStyle = warm(lit * 0.85); trace(g, [P(-22, -78), P(-22, -100), P(4, -100), P(4, -78)]); g.fill();
  if (lit > 0.05) { glow(g, x + 8 * s, y - 34 * s, 190 * s, '255,170,70', 0.5 * lit); }
}

// lamps: function(index) -> 0..1 brightness of each house.
export function village(g, f, { lamps = () => 1, pan = 0, zoom = 1, moon = true } = {}) {
  bokashi(g, 0, 0, W, H, [[0, '#050b1a'], [0.28, '#0c1d3b'], [0.5, '#1e4068'], [0.64, '#5c86a5'], [0.72, '#8fb0c2']]);
  g.save(); g.translate(W / 2, H * 0.56); g.scale(zoom, zoom); g.translate(-W / 2 - pan, -H * 0.56);
  if (moon) {
  glow(g, 1400, 250, 620, '222,226,214', 0.75);
  g.beginPath(); g.arc(1400, 250, 104, 0, 7); g.fillStyle = '#f4ecd8'; g.fill();
  for (const [a, b, c] of [[1370, 226, 26], [1432, 280, 34], [1418, 206, 13], [1366, 290, 16]]) { g.beginPath(); g.arc(a, b, c, 0, 7); g.fillStyle = 'rgba(176,172,150,.24)'; g.fill(); }
  for (let i = 0; i < 4; i++) ink(g, [[1060 + i * 60 - f * 0.25, 236 + i * 46], [1330 + i * 40 - f * 0.25, 224 + i * 50], [1720 + i * 30 - f * 0.25, 244 + i * 44]], { w: 18 - i * 3, color: 'rgba(16,34,62,.62)', head: 0.4, tail: 0.5, seed: i });
  }
  peak(g, 520, 690, 620, 450, 5, '#e2ebee', '#3f668a', '#f6f4ea');
  peak(g, 1620, 700, 560, 330, 9, '#b7cbd8', '#31567c', '#e8eef0');
  peak(g, 1080, 720, 520, 240, 13, '#8eadc2', '#24476e', '#cfdde4');
  for (const [y, c, k] of [[664, '#1f3f61', 3], [712, '#16304d', 5]]) {
    for (let x = -30; x < W + 60; x += 22) { const h = 46 + 34 * noise1(x / 70, k) + 22 * noise1(x / 17, k + 2); shape(g, [[x - 15, y + 40, 1], [x, y - h, 1], [x + 15, y + 40, 1]], c, { w: 0 }); if (x % 3 === 0) ink(g, [[x - 1, y - h], [x - 9, y + 4]], { w: 5, color: 'rgba(214,228,234,.6)', curve: false }); }
    const q = g.createLinearGradient(0, y - 30, 0, y + 60); q.addColorStop(0, 'rgba(150,180,200,0)'); q.addColorStop(1, 'rgba(150,180,200,.45)'); g.fillStyle = q; g.fillRect(-100, y - 30, W + 200, 90);
  }
  bokashi(g, -200, 742, W + 400, 120, [[0, '#a3bccf'], [1, '#6f93b0']]);
  for (let i = 0; i < 14; i++) { const x = -60 + i * 150, w = 110 + (i * 37) % 70; shape(g, [[x - w, 846, 1], [x - w * 0.5, 828], [x, 822 - (i % 3) * 5], [x + w * 0.6, 830], [x + w, 846, 1]], '#bcd0de', { w: 2.5, color: '#4d7292', seed: i }); }
  const r = rng(21), hs = [];
  for (let i = 0; i < 12; i++) hs.push([40 + i * 162 + r() * 70, 772 + (i % 3) * 22, 0.5 + (i % 3) * 0.17, i]);
  hs.sort((a, b) => a[1] - b[1]).forEach(h => minka(g, h[0], h[1], h[2], lamps(h[3]), h[3] + 2));
  bokashi(g, -200, 838, W + 400, 320, [[0, '#48708f'], [0.16, '#1d4a78'], [0.6, '#0d2549'], [1, '#050d1e']]);
  for (let i = 0; i < 16; i++) { const y = 850 + i * 15, w = 150 - i * 4 + 40 * noise1(i + f / 14, 2); ink(g, [[1400 - w, y], [1400, y + 3], [1400 + w * 0.9, y]], { w: 7, color: `rgba(241,232,206,${0.75 - i * 0.04})`, seed: i }); }
  for (const h of hs) { const k = lamps(h[3]); if (k > 0.05) for (let i = 0; i < 6; i++) { const w = 26 - i * 2 + 10 * noise1(i + f / 9 + h[3], 3); ink(g, [[h[0] - w, 850 + i * 15], [h[0] + 8, 853 + i * 15], [h[0] + w, 850 + i * 15]], { w: 4.5, color: `rgba(255,180,84,${k * (0.6 - i * 0.09)})`, seed: i }); } }
  for (let i = 0; i < 70; i++) { const y = 846 + Math.pow(i / 70, 1.5) * 300, l = 40 + r() * 250, x = r() * (W + 200) - 100 + Math.sin(f / 30 + i) * 8; ink(g, [[x, y], [x + l / 2, y + 3 + y * 0.004], [x + l, y]], { w: 1.6 + i * 0.05, color: i % 4 ? 'rgba(127,170,196,.55)' : 'rgba(6,16,36,.6)', seed: i }); }
  g.restore();
}

// Hearth room, seen across the irori.
export function hearth(g, f, { flame = true } = {}) {
  const t = f / 24, fl = 0.9 + 0.1 * noise1(t * 5, 1);
  bokashi(g, 0, 0, W, H, [[0, '#2a130c'], [0.5, '#6a3418'], [0.72, '#8c4c22'], [1, '#3a1c0e']]);
  for (let i = 0; i < 5; i++) {
    const x = 90 + i * 360;
    g.fillStyle = '#f0c478'; g.fillRect(x, 130, 300, 500);
    const q = g.createLinearGradient(0, 130, 0, 630); q.addColorStop(0, 'rgba(90,36,14,.75)'); q.addColorStop(1, 'rgba(255,206,120,.15)'); g.fillStyle = q; g.fillRect(x, 130, 300, 500);
    for (let k = 0; k <= 4; k++) { g.fillStyle = '#35180b'; g.fillRect(x + k * 75 - 4, 130, 8, 500); }
    for (let k = 0; k <= 5; k++) g.fillRect(x, 130 + k * 100 - 4, 300, 8);
    g.fillStyle = '#25100a'; g.fillRect(x - 34, 90, 30, 570); g.fillRect(x - 60, 96, 420, 30);
  }
  for (let i = 0; i < 9; i++) ink(g, [[-20, 40 + i * 9], [960, 30 + i * 9 + noise1(i, 3) * 8], [1940, 40 + i * 9]], { w: 6, color: i % 2 ? '#1c0c07' : '#4a2211', head: 0, tail: 0, seed: i });
  bokashi(g, 0, 660, W, 420, [[0, '#a8672e'], [0.4, '#8a4f22'], [1, '#341708']]);
  for (let i = -6; i < 16; i++) ink(g, [[960 + (i - 5) * 130, 660], [960 + (i - 5) * 300, 1090]], { w: 5, color: '#4d260f', curve: false, head: 0, tail: 0 });
  for (let i = 0; i < 60; i++) { const r = rng(i + 3), x = r() * W, y = 670 + r() * 400; ink(g, [[x, y], [x + 40 + r() * 60, y + 2]], { w: 1.2, color: 'rgba(60,26,8,.5)', curve: false }); }
  trace(g, [[700, 900], [1220, 900], [1330, 1080], [590, 1080]]); g.fillStyle = '#1b0d08'; g.fill();
  trace(g, [[740, 922], [1180, 922], [1262, 1080], [658, 1080]]); g.fillStyle = '#4d423a'; g.fill();
  if (flame) fire(g, { x: 960, y: 1040, w: 210, h: 210 * fl, t, seed: 6 });
  g.save(); g.translate(0, -40);
  ink(g, [[960, -10], [962, 400], [960, 760]], { w: 12, color: '#180a06', head: 0, tail: 0 });
  shape(g, [[888, 790], [900, 762], [960, 752], [1020, 762], [1032, 790], [1018, 852], [960, 872], [902, 852]], '#211a1a', { w: 6 });
  ink(g, [[892, 776], [960, 792], [1028, 776]], { w: 7, color: '#4a3c36' });
  g.restore();
  glow(g, 960, 960, 980 * fl, '255,150,60', 0.7); glow(g, 960, 1000, 420, '255,220,140', 0.6);
  for (let i = 0; i < 46; i++) { const r = rng(i + 90), u = (r() + t * (0.12 + r() * 0.12)) % 1; g.beginPath(); g.arc(960 + (r() - 0.5) * 420 * (0.3 + u) + Math.sin(t * 2 + i) * 18, 1000 - u * 900, 2.4 * (1 - u) + 0.8, 0, 7); g.fillStyle = `rgba(255,${190 - u * 90 | 0},90,${1 - u})`; g.fill(); }
}

function cloudBand(g, x, y, s, fill, line) {
  const pts = [[x - 260 * s, y, 1]];
  for (let i = 0; i < 9; i++) pts.push([x - 230 * s + i * 58 * s, y - (18 + 26 * Math.sin(i / 8 * Math.PI) + (i % 2) * 12) * s]);
  pts.push([x + 270 * s, y, 1], [x + 60 * s, y + 14 * s], [x - 120 * s, y + 10 * s]);
  shape(g, pts, fill, { w: 4 * s, color: line });
  for (let i = 0; i < 3; i++) ink(g, [[x - (180 - i * 60) * s, y - 3 * s - i * 8 * s], [x - (60 - i * 60) * s, y - 8 * s - i * 9 * s], [x + (70 + i * 40) * s, y - 3 * s - i * 8 * s]], { w: 3 * s, color: line });
}

export function road(g, f, scroll = 0) {
  bokashi(g, 0, 0, W, H, [[0, '#4d8fb4'], [0.26, '#9cc8cf'], [0.46, '#f0e2bd'], [0.56, '#f3cf9b']]);
  for (const [x, y, s, v] of [[300, 180, 1.2, 0.5], [1100, 120, 0.9, 0.35], [1660, 260, 1.4, 0.6], [760, 320, 0.8, 0.25]]) cloudBand(g, (x + f * v) % 2300 - 150, y, s, '#fbf4e2', '#8fb0b8');
  peak(g, 1380 - scroll * 0.07, 620, 640, 300, 31, '#8fb3b4', '#5d8a8c', '#e7efe4'); peak(g, 420 - scroll * 0.07, 630, 560, 200, 35, '#7fa58f', '#567f68', '#b9cfae');
  for (let i = 0; i < 9; i++) { const y = 600 + i * 24, c = ['#c9b45c', '#8fa04f', '#b7a04a', '#6f8c48'][i % 4], p = [[-20, y + 60]]; for (let x = -20; x <= W + 80; x += 60) p.push([x, y - 16 * Math.sin((x + scroll * (0.2 + i * 0.07)) / 320 + i * 1.3) - 8 * noise1((x + scroll * (0.2 + i * 0.07)) / 90, i)]); p.push([W + 80, y + 60]); trace(g, p); g.fillStyle = c; g.fill(); ink(g, p.slice(1, -1), { w: 5, color: '#3d4a22', head: 0, tail: 0, seed: i }); }
  shape(g, [[-60, 840, 1], [700, 800], [1980, 826, 1], [1980, 1100, 1], [-60, 1100, 1]], '#dcc092', { w: 6, color: '#6d4d28' });
  const r = rng(5);
  for (let i = 0; i < 110; i++) { const y = 850 + r() * 220, x = ((r() * (W + 200) - scroll) % (W + 200) + W + 200) % (W + 200) - 100; ink(g, [[x, y], [x + 14 + r() * 40, y + 2]], { w: 1.5 + r() * 2, color: 'rgba(140,98,52,.5)', curve: false }); }
  for (let i = 0; i < 90; i++) { const x = ((r() * (W + 200) - scroll * 0.9) % (W + 200) + W + 200) % (W + 200) - 100, y = 826 + r() * 22, l = 18 + r() * 34; ink(g, [[x, y + 6], [x + Math.sin(f / 18 + i) * 6, y - l * 0.6], [x + 6 + Math.sin(f / 18 + i) * 10, y - l]], { w: 4, color: i % 3 ? '#5f7a38' : '#c8b45a' }); }
  const wr = (x, v) => ((x + 500 - scroll * v) % 3000 + 3000) % 3000 - 500;
  pine(g, wr(1690, 0.9), 860, 1.9, 8, false, '#274b39', '#7c9a58'); pine(g, wr(150, 0.9), 850, 1.3, 12, false, '#2c5540', '#86a25c');
}

// Arched bridge toward the vanishing point; lamps(i) brightness, 0 is nearest.
export function bridge(g, f, { lamps = () => 1, fog = 0.5 } = {}) {
  bokashi(g, 0, 0, W, H, [[0, '#03060f'], [0.42, '#0a1730'], [0.56, '#1a3454'], [0.7, '#0a1830'], [1, '#03060d']]);
  const vx = 960, vy = 500;
  for (let i = 0; i < 13; i++) { const x = i * 170 - 60; pine(g, x, 640 + (i % 2) * 18, 0.5 + (i % 3) * 0.16, i + 40, false, '#071320', '#16304a'); }
  const q = g.createLinearGradient(0, 480, 0, 860);
  q.addColorStop(0, 'rgba(120,150,175,0)'); q.addColorStop(0.45, `rgba(120,150,175,${fog * 0.5})`); q.addColorStop(1, 'rgba(120,150,175,0)');
  g.fillStyle = q; g.fillRect(0, 480, W, 380);
  const at = (u, z) => { const k = 1 / z; return [vx + u * 900 * k, vy + 640 * k - 130 * Math.sin(Math.min(1, (1 - k) * 1.15) * Math.PI) * (1 - k) * 0.9]; };
  const L = [], R = []; for (let z = 0.9; z < 15; z *= 1.12) { L.push(at(-1, z)); R.push(at(1, z)); }
  trace(g, [...L, ...R.slice().reverse()]); const d = g.createLinearGradient(0, 500, 0, H); d.addColorStop(0, '#16263c'); d.addColorStop(1, '#3a2b26'); g.fillStyle = d; g.fill();
  let k = 0;
  for (let z = 0.9; z < 15; z *= 1.075) { const a = at(-1, z), b = at(1, z); ink(g, [a, b], { w: Math.max(1, 9 / z), color: k++ % 2 ? '#0c0a0e' : '#54443c', curve: false, head: 0, tail: 0, seed: k }); if (k % 3 === 0) ink(g, [[lerp(a[0], b[0], 0.2), a[1] - 3], [lerp(a[0], b[0], 0.6), a[1] - 4]], { w: 12 / z, color: 'rgba(206,222,230,.5)' }); }
  const zs = [1.15, 1.6, 2.3, 3.3, 4.8, 7, 10.5];
  for (let i = zs.length - 1; i >= 0; i--) for (const s of [-1, 1]) {
    const z = zs[i], b = at(s * 1.02, z), h = 430 / z, w = 40 / z, lit = lamps(i);
    if (i < zs.length - 1) { const c = at(s * 1.02, zs[i + 1]), hn = 430 / zs[i + 1]; for (const m of [0.38, 0.62]) ink(g, [[b[0], b[1] - h * m], [c[0], c[1] - hn * m]], { w: 22 / z, color: '#5d1d16', curve: false, head: 0, tail: 0.2 }); }
    shape(g, [[b[0] - w / 2, b[1], 1], [b[0] - w / 2, b[1] - h * 0.72, 1], [b[0] + w / 2, b[1] - h * 0.72, 1], [b[0] + w / 2, b[1], 1]], '#7b2a1e', { w: 5 / z });
    shape(g, [[b[0] - w * 0.7, b[1] - h * 0.72, 1], [b[0], b[1] - h * 0.8], [b[0] + w * 0.7, b[1] - h * 0.72, 1]], '#2a2f3a', { w: 4 / z });
    const lw = 54 / z, ly = b[1] - h * 0.93;
    ink(g, [[b[0], b[1] - h * 0.76], [b[0], ly + lw]], { w: 9 / z, color: '#2a2f3a', curve: false, head: 0, tail: 0 }); ink(g, [[b[0] - lw * 0.5, ly + lw], [b[0] + lw * 0.5, ly + lw]], { w: 10 / z, color: '#1c1512', curve: false, head: 0, tail: 0 }); ink(g, [[b[0] - lw * 0.5, ly - lw], [b[0] + lw * 0.5, ly - lw]], { w: 10 / z, color: '#1c1512', curve: false, head: 0, tail: 0 });
    const c = `rgb(${[lerp(38, 255, lit), lerp(40, 196, lit), lerp(52, 104, lit)].map(Math.round).join(',')})`;
    shape(g, [[b[0] - lw * 0.7, ly - lw], [b[0] + lw * 0.7, ly - lw], [b[0] + lw, ly], [b[0] + lw * 0.7, ly + lw], [b[0] - lw * 0.7, ly + lw], [b[0] - lw, ly]], c, { w: 5 / z });
    for (const m of [-0.5, 0, 0.5]) ink(g, [[b[0] - lw * 0.92, ly + lw * m], [b[0], ly + lw * m + lw * 0.16], [b[0] + lw * 0.92, ly + lw * m]], { w: 3 / z, color: 'rgba(60,20,10,.7)' });
    if (lit > 0.03) { glow(g, b[0], ly, 360 / z * (0.96 + 0.04 * noise1(f / 4 + i, s)), '255,164,64', 0.75 * lit); }
    else for (let m = 0; m < 3; m++) ink(g, [[b[0], ly - lw], [b[0] + Math.sin(f / 10 + m + i) * 18 / z, ly - lw - 50 / z], [b[0] + Math.sin(f / 12 + m) * 34 / z, ly - lw - 120 / z]], { w: 9 / z, color: 'rgba(130,140,155,.32)' });
  }
}

export function dawn(g, f, { sun = 1, lamps = () => 1 } = {}) {
  bokashi(g, 0, 0, W, H, [[0, '#3f6690'], [0.22, '#8fa9bd'], [0.4, '#efc9a4'], [0.54, '#f7a66b'], [0.6, '#f9c98e']]);
  const sy = lerp(680, 500, sun);
  glow(g, 960, sy, 900, '255,206,130', 0.85);
  g.beginPath(); g.arc(960, sy, 118, 0, 7); g.fillStyle = '#e8583a'; g.fill();
  for (const [x, y, s, v] of [[420, 260, 1.5, 0.3], [1500, 210, 1.3, -0.2], [1120, 360, 1, 0.2], [200, 420, 0.9, 0.15]]) cloudBand(g, x + f * v, y, s, '#fbe6cb', '#d98f6a');
  peak(g, 360, 660, 620, 330, 5, '#c9b9c4', '#7a88a8', '#f7e7d8'); peak(g, 1620, 660, 560, 270, 9, '#c4aebb', '#8290ad', '#f3dccb');
  const m = g.createLinearGradient(0, 540, 0, 690); m.addColorStop(0, 'rgba(252,226,196,0)'); m.addColorStop(1, 'rgba(252,226,196,.95)'); g.fillStyle = m; g.fillRect(0, 540, W, 150);
  const r = rng(21), hx = []; for (let i = 0; i < 16; i++) { const x = 20 + i * 140 + r() * 40; if (Math.abs(x - 960) > 150) hx.push(x); }
  hx.slice(0, 11).forEach((x, i) => minka(g, x, 690 + (i % 2) * 12, 0.4 + (i % 3) * 0.07, 0.95 * lamps(i), i + 2));
  bokashi(g, 0, 700, W, 380, [[0, '#f5c08c'], [0.14, '#d99a7c'], [0.4, '#6d83a2'], [1, '#1d3f68']]);
  for (let i = 0; i < 26; i++) { const y = 706 + i * 14, w = 110 + i * 5 + 50 * noise1(i + f / 12, 4); ink(g, [[960 - w, y], [960, y + 3], [960 + w, y]], { w: 7, color: `rgba(255,${206 - i * 4},${140 - i * 2},${0.9 - i * 0.026})`, seed: i }); }
  for (let i = 0; i < 80; i++) { const y = 712 + Math.pow(i / 80, 1.5) * 360, l = 50 + r() * 260, x = r() * (W + 200) - 100 + Math.sin(f / 30 + i) * 10; ink(g, [[x, y], [x + l / 2, y + 4], [x + l, y]], { w: 2 + i * 0.05, color: i % 3 ? 'rgba(255,226,190,.42)' : 'rgba(28,58,98,.5)', seed: i }); }
}

export function ferry(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, [[-420, -46, 1], [-330, 8], [-180, 44], [220, 44], [360, 6], [460, -70, 1], [300, -22], [-240, -18]], '#4a3122', { w: 7 });
  ink(g, [[-400, -40], [-240, -10], [300, -14], [446, -64]], { w: 11, color: '#8a6238', head: 0.02, tail: 0.04 });
  for (let i = 0; i < 4; i++) ink(g, [[-330 + i * 10, 0 + i * 9], [0, 22 + i * 6], [340 - i * 20, 4 + i * 8]], { w: 3, color: '#2a1a10' });
  g.restore();
}

// Battle ground: the riverbank under the pines, tinted per shot. Cached per tint, so only mist and parallax move.
const fieldCache = new Map();
export function field(g, f, key, { sky, far, mid, near, rim, mist, moon = null, drift = 0, deck = null }) {
  if (!fieldCache.has(key)) {
    const c = new OffscreenCanvas(W + 400, H), q = c.getContext('2d');
    const grd = q.createLinearGradient(0, 0, 0, H); sky.forEach(([a, b]) => grd.addColorStop(a, b)); q.fillStyle = grd; q.fillRect(0, 0, W + 400, H);
    if (moon) { glow(q, moon[0] + 200, moon[1], 520, moon[3], 0.5); q.beginPath(); q.arc(moon[0] + 200, moon[1], moon[2], 0, 7); q.fillStyle = `rgba(${moon[3]},.9)`; q.fill(); }
    peak(q, 420, 800, 700, 430, 5, far, mid, rim); peak(q, 1500, 800, 640, 350, 9, far, mid, rim); peak(q, 2150, 800, 520, 300, 13, far, mid, rim);
    const r = rng(17);
    for (let x = -30; x < W + 440; x += 18) { const h = 70 + r() * 90; q.beginPath(); q.moveTo(x - 17, 830); q.lineTo(x, 830 - h); q.lineTo(x + 17, 830); q.closePath(); q.fillStyle = mid; q.fill(); }
    const gd = q.createLinearGradient(0, 815, 0, H); gd.addColorStop(0, mid); gd.addColorStop(1, near); q.fillStyle = gd; q.fillRect(0, 828, W + 400, H - 828);
    const m1 = q.createLinearGradient(0, 680, 0, 1060); m1.addColorStop(0, `rgba(${mist},0)`); m1.addColorStop(0.42, `rgba(${mist},.5)`); m1.addColorStop(1, `rgba(${mist},0)`); q.fillStyle = m1; q.fillRect(0, 680, W + 400, 380);
    for (const [x, k, sd] of [[70, 1.5, 4], [520, 0.9, 8], [1750, 1.1, 11], [2230, 1.6, 15]]) pine(q, x, 900, k, sd, false, near, rim);
    const m2 = q.createLinearGradient(0, 800, 0, H); m2.addColorStop(0, `rgba(${mist},0)`); m2.addColorStop(0.45, `rgba(${mist},.3)`); m2.addColorStop(1, `rgba(${mist},0)`); q.fillStyle = m2; q.fillRect(0, 800, W + 400, H - 800);
    if (deck) { // the bridge seen from the side: rail, posts with dead lanterns, snowy planks
      const [plank, line, rail, snowC] = deck, WW = W + 400;
      const dg = q.createLinearGradient(0, 900, 0, H); dg.addColorStop(0, plank); dg.addColorStop(1, line); q.fillStyle = dg; q.fillRect(0, 900, WW, H - 900);
      for (let i = 0; i < 46; i++) { const x = i * 56 - 60, k = (x - WW / 2) * 0.22; ink(q, [[x, 900], [x + k, H + 10]], { w: 5, color: line, curve: false, head: 0, tail: 0, seed: i }); ink(q, [[x + 8, 902], [x + 8 + k, H + 10]], { w: 2, color: rim, curve: false, head: 0, tail: 0.6, seed: i + 60 }); }
      const rg = rng(31); for (let i = 0; i < 60; i++) { const x = rg() * WW, y = 918 + rg() * 160, w = 20 + rg() * 90; shape(q, [[x - w, y], [x - w * 0.3, y - 5 - rg() * 5], [x + w * 0.5, y - 6], [x + w, y], [x, y + 6]], snowC, { w: 0 }); }
      ink(q, [[-20, 900], [WW / 2, 898], [WW + 20, 900]], { w: 16, color: line, head: 0, tail: 0 }); ink(q, [[-20, 892], [WW / 2, 889], [WW + 20, 892]], { w: 10, color: snowC, head: 0, tail: 0, wobble: 0.6 });
      for (const [ry, w] of [[776, 24], [842, 15]]) { ink(q, [[-20, ry], [WW + 20, ry]], { w, color: line, curve: false, head: 0, tail: 0 }); ink(q, [[-20, ry - 1], [WW + 20, ry - 1]], { w: w - 7, color: rail, curve: false, head: 0, tail: 0 }); }
      ink(q, [[-20, 764], [WW / 2, 761], [WW + 20, 764]], { w: 9, color: snowC, head: 0, tail: 0, wobble: 0.7 });
      for (let x = 40; x < WW; x += 240) {
        shape(q, [[x - 16, 900, 1], [x - 16, 730, 1], [x + 16, 730, 1], [x + 16, 900, 1]], rail, { w: 5 }); shape(q, [[x - 22, 732, 1], [x, 706], [x + 22, 732, 1]], '#242833', { w: 4 }); shape(q, [[x - 18, 716, 1], [x, 698], [x + 18, 716, 1]], snowC, { w: 2 });
        ink(q, [[x, 706], [x, 660]], { w: 7, color: '#1b1d26', curve: false, head: 0, tail: 0 });
        shape(q, [[x - 22, 610], [x + 22, 610], [x + 30, 636], [x + 22, 664], [x - 22, 664], [x - 30, 636]], mid, { w: 4 }); for (const m of [-14, 2, 16]) ink(q, [[x - 28, 636 + m], [x, 641 + m], [x + 28, 636 + m]], { w: 2.4, color: line }); for (const m of [606, 666]) ink(q, [[x - 20, m], [x + 20, m]], { w: 8, color: '#15161d', curve: false, head: 0, tail: 0 });
      }
    }
    fieldCache.set(key, c);
  }
  g.drawImage(fieldCache.get(key), -200 - drift, 0);
  for (let i = 0; i < 3; i++) { const y = 800 + i * 70, x = ((f * (1.2 + i * 0.7) + i * 700) % 2600) - 700, q = g.createRadialGradient(x, y, 0, x, y, 520); q.addColorStop(0, `rgba(${mist},.2)`); q.addColorStop(1, `rgba(${mist},0)`); g.save(); g.translate(0, y * 0.82); g.scale(1, 0.18); g.fillStyle = q; g.fillRect(x - 520, y - 520, 1040, 1040); g.restore(); }
}
