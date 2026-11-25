// Writes out/yoigane.srt (Japanese with English underneath) from the sung phrases in out/audio/cues.json.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cues = JSON.parse(await readFile(path.join(ROOT, 'out/audio/cues.json'), 'utf8'));
const EN = {
  L1a: 'A night of snow, a single light', L1b: 'I call your name; my breath turns white',
  L2a: 'The red cord you tied for me', L2b: 'its little bell still sways',
  WH1: 'Sister...', WH2: 'Sister...', W1: 'Give it back', W2: 'Give it back', W3: 'that light',
  L3a: 'Ring, ring, evening bell', L3b: 'Split the dark; rise, you waves',
  L4a: 'A light that will not die, here in my heart', L4b: "until I carry it to tomorrow's shore",
};
const stamp = t => {
  const ms = Math.round(t * 1000), p = (v, n = 2) => String(v).padStart(n, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const phrases = cues.events.filter(e => e.type === 'vocal_phrase' && e.edge === 'start').sort((a, b) => a.start_t - b.start_t);
const missing = phrases.filter(p => !EN[p.id]).map(p => p.id);
if (missing.length) throw new Error(`no translation for ${missing.join(', ')}`);
await writeFile(path.join(ROOT, 'out/yoigane.srt'), phrases.map((p, i) =>
  `${i + 1}\n${stamp(p.start_t)} --> ${stamp(p.end_t)}\n${p.text}\n${EN[p.id]}\n`).join('\n'), 'utf8');
console.log(`${phrases.length} subtitles`);
