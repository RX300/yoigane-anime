// Photography pass for characters: scene tint, gradient shadow and rim light on an isolated layer.
import { W, H, layer } from './core.js';

// fn(q) draws the character with the caller's transform. Options:
// top / bottom: multiply colours from the top to the bottom of the character box.
// rim: colour of the edge light, rimX / rimY: offset in pixels toward which the light sits, rimBlur, rimA.
// y0, y1: screen range of the gradient.
export function lit(g, fn, { top = '#ffffff', bottom = '#ffffff', rim = null, rimX = -7, rimY = -5, rimBlur = 1.2, rimA = 0.5, y0 = 100, y1 = H, alpha = 1, flat = null } = {}) {
  const [c, q] = layer();
  q.setTransform(g.getTransform());
  fn(q);
  q.resetTransform();
  const [m, k] = layer();
  k.drawImage(c, 0, 0);
  k.globalCompositeOperation = 'multiply';
  const gr = k.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  k.fillStyle = gr; k.fillRect(0, 0, W, H);
  k.globalCompositeOperation = 'destination-in';
  k.drawImage(c, 0, 0);
  if (flat) { k.globalCompositeOperation = 'source-in'; k.fillStyle = flat; k.fillRect(0, 0, W, H); }
  const ga = g.globalAlpha * alpha;
  g.save();
  g.resetTransform();
  g.globalAlpha = ga;
  g.drawImage(m, 0, 0);
  if (rim) {
    const [r, e] = layer();
    e.drawImage(c, 0, 0);
    e.globalCompositeOperation = 'destination-out';
    e.drawImage(c, -rimX, -rimY);
    const b = Math.max(Math.abs(rimX), Math.abs(rimY)) + 3;
    e.clearRect(0, 0, W, b); e.clearRect(0, H - b, W, b); e.clearRect(0, 0, b, H); e.clearRect(W - b, 0, b, H);
    e.globalCompositeOperation = 'source-in';
    e.fillStyle = rim; e.fillRect(0, 0, W, H);
    const [r2, e2] = layer();
    e2.filter = `blur(${rimBlur}px)`; e2.drawImage(r, 0, 0); e2.filter = 'none';
    e2.globalCompositeOperation = 'destination-in'; e2.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = ga * rimA;
    g.drawImage(r2, 0, 0);
  }
  g.restore();
}

// Soft contact shadow under feet.
export function ground(g, x, y, w, color = '8,14,34', a = 0.5) {
  g.save(); g.translate(x, y); g.scale(1, 0.14);
  const q = g.createRadialGradient(0, 0, 0, 0, 0, w);
  q.addColorStop(0, `rgba(${color},${a})`); q.addColorStop(0.6, `rgba(${color},${a * 0.5})`); q.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = q; g.fillRect(-w, -w, w * 2, w * 2); g.restore();
}
