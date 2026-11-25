// Shared maths, ink line, textile patterns and print finish.
export const W = 1920, H = 1080, FPS = 24, TOTAL = 1536;

export const PAL = {
  navy: '#0b1a33', prussian: '#123a6b', indigo: '#1f4e79', ice: '#a9c7d8', paper: '#f1e6cf', sumi: '#14110f',
  vermilion: '#c8382b', amber: '#f2a541', ember: '#ff6a1f', brick: '#8e3524', violet: '#7a6a94', bolt: '#d9ccff',
  moss: '#5d6b3f',
};

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const span = (f, a, b) => clamp((f - a) / (b - a));
export const outCubic = t => 1 - Math.pow(1 - clamp(t), 3);
export const inCubic = t => Math.pow(clamp(t), 3);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57), hash(i + 1 + seed * 57), u) * 2 - 1;
}

export function layer(w = W, h = H) {
  const c = new OffscreenCanvas(w, h);
  return [c, c.getContext('2d')];
}

// Catmull-Rom through control points, resampled densely.
export function spline(pts, per = 18) {
  if (pts.length < 3) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t +
        (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function trace(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (close) ctx.closePath();
}

let lineK = 1;
export const setLine = k => { lineK = k; };

// Brush line: width swells and tapers like a loaded brush, with a dry wobble.
export function ink(ctx, pts, o = {}) {
  const { w = 5, color = PAL.sumi, head = 0.18, tail = 0.35, wobble = 0.14, seed = 1, curve = true } = o;
  if (w <= 0) return;
  let s = curve ? spline(pts) : pts;
  if (s.length > 1 && s.length < 10) {
    const k = Math.ceil(10 / (s.length - 1)), d = [];
    for (let i = 0; i < s.length - 1; i++) for (let q = 0; q < k; q++) d.push([lerp(s[i][0], s[i + 1][0], q / k), lerp(s[i][1], s[i + 1][1], q / k)]);
    s = [...d, s[s.length - 1]];
  }
  const n = s.length;
  if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    const t = i / (n - 1);
    const prof = Math.min(1, head ? t / head : 1) * Math.min(1, tail ? (1 - t) / tail : 1);
    const hw = 0.5 * w * lineK * Math.pow(prof, 0.6) * (1 + wobble * noise1(i * 0.35, seed)) + 0.35;
    L.push([s[i][0] - dy / m * hw, s[i][1] + dx / m * hw]);
    R.push([s[i][0] + dy / m * hw, s[i][1] - dx / m * hw]);
  }
  trace(ctx, L.concat(R.reverse()));
  ctx.fillStyle = color;
  ctx.fill();
}

// Closed Catmull-Rom loop. A third element of 1 on a point makes it a sharp corner.
export function loop(pts, per = 14) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const p0 = p1[2] ? p1 : pts[(i - 1 + n) % n], p3 = p2[2] ? p2 : pts[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t +
        (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  return out;
}

// Contour of a closed loop, heavier on the side turned away from the light.
export function contour(ctx, s, o = {}) {
  const { w = 5, color = PAL.sumi, light = [-0.5, -0.85], seed = 1, wobble = 0.12 } = o;
  const n = s.length, A = [], B = [];
  let area = 0;
  for (let i = 0; i < n; i++) { const q = s[(i + 1) % n]; area += s[i][0] * q[1] - q[0] * s[i][1]; }
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = s[(i - 1 + n) % n], b = s[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    const nx = dy / m * sg, ny = -dx / m * sg;
    const k = 0.5 * w * lineK * (0.72 - 0.5 * (nx * light[0] + ny * light[1])) * (1 + wobble * noise1(i * 0.3, seed));
    A.push([s[i][0] + nx * k, s[i][1] + ny * k]);
    B.push([s[i][0] - nx * k * 0.6, s[i][1] - ny * k * 0.6]);
  }
  ctx.beginPath();
  A.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  B.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  ctx.fillStyle = color; ctx.fill('evenodd');
}

// Flat fill plus inked contour from the same control points.
export function shape(ctx, pts, fill, o = {}) {
  const c = loop(pts);
  if (fill) { ctx.save(); ctx.translate(1.2, 0.9); trace(ctx, c); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
  if (o.w !== 0) contour(ctx, c, o);
  return c;
}

// Printer's gradation: list of [stop, colour].
export function bokashi(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [s, c] of stops) g.addColorStop(s, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// Traditional textile patterns, built as repeating tiles.
export const textiles = {
  straw(u, dark, mid, pale) {
    const [c, g] = layer(u * 4, u * 3), r = rng(12);
    g.fillStyle = dark; g.fillRect(0, 0, u * 4, u * 3);
    for (let row = -1; row < 4; row++) for (let i = 0; i < 46; i++) {
      const x = r() * u * 4, y = row * u, l = u * (1 + r() * 0.5), d = (r() - 0.5) * u * 0.22;
      for (const ox of [0, u * 4, -u * 4]) { g.beginPath(); g.moveTo(x + ox - u * 0.03, y); g.lineTo(x + ox + u * 0.03, y); g.lineTo(x + ox + d, y + l); g.closePath(); g.fillStyle = [mid, pale, mid, '#8f7440'][i % 4]; g.fill(); }
    }
    return c;
  },
  seigaiha(r, dark, light) {
    const [c, g] = layer(r * 2, r);
    g.fillStyle = dark; g.fillRect(0, 0, r * 2, r);
    for (let row = -1; row <= 3; row++) for (let col = -1; col <= 2; col++) {
      const x = col * r * 2 + (row % 2 ? r : 0), y = row * r / 2 + r;
      [1, 0.74, 0.48, 0.22].forEach((k, i) => {
        g.beginPath(); g.arc(x, y, r * k, Math.PI, 0); g.closePath();
        g.fillStyle = i % 2 ? dark : light; g.fill();
        g.lineWidth = r * 0.035; g.strokeStyle = dark; g.stroke();
      });
    }
    return c;
  },
  tatewaku(u, ground, line) {
    const [c, g] = layer(u * 2, u * 4);
    g.fillStyle = ground; g.fillRect(0, 0, u * 2, u * 4);
    g.strokeStyle = line; g.lineWidth = u * 0.13;
    for (const [cx, sgn] of [[0, 1], [u, -1], [u * 2, 1]]) {
      g.beginPath();
      for (let y = -u; y <= u * 5; y += 2) {
        const x = cx + sgn * u * 0.34 * Math.cos(y / (u * 4) * Math.PI * 2);
        y === -u ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    return c;
  },
  yagasuri(u, ground, feather, spine) {
    const [c, g] = layer(u * 2, u * 4);
    g.fillStyle = ground; g.fillRect(0, 0, u * 2, u * 4);
    for (const [x0, off] of [[0, 0], [u, u * 2]]) for (let k = -2; k <= 2; k++) {
      const y = off + k * u * 4;
      g.fillStyle = feather;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + u / 2, y + u * 0.7); g.lineTo(x0 + u, y);
      g.lineTo(x0 + u, y + u * 2); g.lineTo(x0 + u / 2, y + u * 2.7); g.lineTo(x0, y + u * 2); g.closePath(); g.fill();
    }
    g.fillStyle = spine;
    for (const x of [u / 2, u * 1.5]) g.fillRect(x - u * 0.03, 0, u * 0.06, u * 4);
    return c;
  },
};

// Paper fibre, block grain and vignette, applied last.
let paperTile = null, woodTile = null;
export function printFinish(ctx, f, { grain = 0.16, vignette = 0.45 } = {}) {
  if (!paperTile) {
    const [c, g] = layer(512, 512), img = g.createImageData(512, 512), r = rng(7);
    for (let i = 0; i < 512 * 512; i++) {
      const v = 128 + (r() - 0.5) * 90;
      img.data.set([v, v, v, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    paperTile = c;
  }
  if (!woodTile) {
    const [c, g] = layer(W, H), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wy = y + 26 * noise1(x / 520, 3) + 9 * noise1(x / 130, 4);
      const v = 238 + 17 * Math.sin(wy / 5.5 + 3.2 * noise1(wy / 46, 5) * 2) * (0.35 + 0.65 * Math.abs(noise1(wy / 120, 6)));
      const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); woodTile = c;
  }
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.13; ctx.drawImage(woodTile, 0, 0); ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grain;
  const p = ctx.createPattern(paperTile, 'repeat'), k = Math.floor(f / 2);
  p.setTransform(new DOMMatrix().translate(hash(k) * 512, hash(k + 99) * 512));
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.15);
  v.addColorStop(0, '#ffffff');
  v.addColorStop(1, `rgb(${[18, 22, 40].map(c => Math.round(lerp(255, c, vignette))).join(',')})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Highlights bleed into the surroundings, as in the photography pass.
export function bloom(ctx, src, amount = 0.5, radius = 22) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount;
  ctx.filter = `blur(${radius}px) brightness(0.9) contrast(1.5)`;
  ctx.drawImage(src, 0, 0);
  ctx.restore();
}
