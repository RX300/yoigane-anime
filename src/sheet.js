// Model sheet used for review: cast busts with expressions, and the three element effects.
import { W, H, PAL, layer, bokashi, printFinish, bloom } from './core.js';
import { bust } from './figure.js';
import { wave, fire } from './fx.js';
import { figure, hikui, POSE } from './body.js';
import { bust3 } from './face.js';
import { lit } from './light.js';

function sheetFace(g) {
  bokashi(g, 0, 0, W, H, [[0, '#0b1d3c'], [1, '#5f86a3']]);
  const row = [
    ['shio', { dir: 1, e: { mouth: 'line', brow: 0.2 } }], ['shio', { dir: -1, e: { mouth: 'sad', open: 0.6, brow: -0.9, tear: 0.9, look: [0.2, 0.5] } }],
    ['hota', { dir: 1, e: { mouth: 'laugh', open: 0.05, happy: true, blush: 0.6 } }], ['narumi', { dir: -1, e: { open: 0.7, mouth: 'line' } }],
  ];
  row.forEach(([w, o], i) => lit(g, q => bust3(q, w, { x: 260 + i * 470, y: 250, s: 0.95, ...o }), { top: '#dfe6f2', bottom: '#7f93bd', rim: '#cfe8ff', rimX: -5, rimY: -4 }));
  const r2 = [['minato', { dir: -1, e: { mouth: 'smile', blush: 0.8 } }], ['shio', { dir: 1, e: { mouth: 'shout', brow: 1.2, dark: 0.6, pupil: 0.7 } }], ['shio', { dir: -1, e: { mouth: 'smile', open: 0.05, happy: true, blush: 0.7 } }], ['hota', { dir: -1, e: { mouth: 'grit', brow: 1.2 } }]];
  r2.forEach(([w, o], i) => lit(g, q => bust3(q, w, { x: 260 + i * 470, y: 800, s: 0.95, ...o }), { top: '#fff0da', bottom: '#d8925c', rim: '#ffc36b', rimX: 6, rimY: -3, y0: 600 }));
}
import { village, hearth, road, bridge, dawn, ferry, snow } from './world.js';

function sheetBody(g) {
  bokashi(g, 0, 0, W, H, [[0, '#cfd6d6'], [1, '#f1e6cf']]);
  figure(g, 'shio', { x: 210, y: 520, s: 0.76, pose: POSE.stand });
  figure(g, 'shio', { x: 560, y: 520, s: 0.76, pose: POSE.draw, wind: 0.6, e: { brow: 0.9 } });
  figure(g, 'hota', { x: 960, y: 520, s: 0.72, pose: POSE.swing, wind: 0.5, e: { mouth: 'shout', brow: 1 } });
  figure(g, 'narumi', { x: 330, y: 1040, s: 0.76, pose: POSE.dash, wind: 1.2, e: { brow: 0.6, open: 0.7 } });
  figure(g, 'shio', { x: 760, y: 1040, s: 0.76, pose: POSE.kneel, e: { open: 0.4, mouth: 'sad', brow: -0.8 } });
  figure(g, 'shio', { x: 1110, y: 1060, s: 0.72, pose: POSE.leap, wind: 0.8, e: { mouth: 'shout', brow: 1 } });
  figure(g, 'minato', { x: 1330, y: 1040, s: 0.76, pose: POSE.stand, e: { mouth: 'smile' }, sheath: false });
  hikui(g, { x: 1640, y: 1000, s: 1.15, split: 0.5, reach: 0.4 });
}

export function sheetCast(g) {
  bokashi(g, 0, 0, W, H, [[0, '#d9cdb4'], [1, '#f1e6cf']]);
  const row = [
    ['shio', { yaw: -0.4, sway: -6, e: { mouth: 'line', brow: 0.2, look: [-0.3, 0] } }],
    ['hota', { yaw: 0.2, e: { mouth: 'laugh', open: 0.05, happy: true, blush: 0.6, browY: -8 } }],
    ['narumi', { yaw: 0.4, sway: 4, e: { mouth: 'line', open: 0.6, look: [0.4, 0] } }],
    ['minato', { e: { mouth: 'smile', blush: 0.7, pupil: 1.15 } }],
  ];
  row.forEach(([w, o], i) => bust(g, w, { x: 260 + i * 466, y: 230, s: 0.92, ...o }));
  const ex = [
    { mouth: 'sad', open: 0.6, brow: -0.9, tear: 1, look: [0, 0.5] }, { mouth: 'smile', open: 0.05, happy: true, blush: 0.7 },
    { mouth: 'o', open: 1.15, pupil: 0.5, brow: -0.7, browY: -10, blush: 0 }, { mouth: 'shout', open: 0.95, pupil: 0.7, brow: 1.2, dark: 0.75, blush: 0 },
    { mouth: 'line', open: 0.85, brow: 0.8, dark: 0.15, blush: 0.1 },
  ];
  ex.forEach((e, i) => bust(g, 'shio', { x: 200 + i * 380, y: 780, s: 0.78, yaw: -0.25, sway: i * 3 - 6, e }));
}

export function sheetFx(g, f) {
  const t = f / 24;
  bokashi(g, 0, 0, W, H, [[0, '#0a1630'], [1, '#24466f']]);
  wave(g, { x: 470, y: 640, s: 0.95, t, seed: 3 });
  fire(g, { x: 1790, y: 1050, w: 190, h: 300, t, seed: 2 });
}

const out = document.getElementById('c'), octx = out.getContext('2d');
export function renderSheet(f) {
  const [c, g] = layer();
  const pages = { 0: sheetCast, 1: sheetBody, 2: village, 3: hearth, 4: road, 5: (q, n) => bridge(q, n, { lamps: i => (i < 4 ? 1 : 0) }), 6: (q, n) => { dawn(q, n); ferry(q, 960, 900, 0.9); }, 7: sheetFace };
  (pages[f] || sheetFx)(g, f);
  if (f === 2) snow(g, 40);
  octx.globalCompositeOperation = 'source-over';
  octx.drawImage(c, 0, 0);
  if (f > 1) bloom(octx, c, 0.3);
  printFinish(octx, f, { vignette: f > 1 ? 0.45 : 0.15 });
}
