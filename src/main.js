// Frame entry point: film frames 0..1535, model sheets from 90000.
import { layer, printFinish, bloom } from './core.js';
import { renderSheet } from './sheet.js';
import { drawFrame } from './film.js';

const out = document.getElementById('c'), octx = out.getContext('2d');

window.renderFrame = f => {
  if (f >= 90000) return renderSheet(f - 90000);
  const [c, g] = layer();
  drawFrame(g, f);
  octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1; octx.fillStyle = '#14110f'; octx.fillRect(0, 0, 1920, 1080);
  octx.drawImage(c, 0, 0);
  bloom(octx, c, 0.28);
  printFinish(octx, f, { vignette: 0.38 });
};

window.renderAndPost = async n => {
  window.renderFrame(n);
  const blob = await new Promise(r => out.toBlob(r, 'image/png'));
  const res = await fetch(`/frame?n=${n}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`frame ${n}: HTTP ${res.status}`);
  return n;
};
window.ready = true;
