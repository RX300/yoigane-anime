// Renders frames with headless Chrome over the DevTools protocol. No npm packages.
// node render/driver.mjs --frames 0,48,96 --out out/stills
// node render/driver.mjs --range 0-1535 --workers 4 --out out/frames
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const outDir = path.resolve(ROOT, args.out || 'out/stills');
const workers = Number(args.workers || 1);

let frames;
if (args.range) {
  const [a, b] = args.range.split('-').map(Number);
  frames = Array.from({ length: b - a + 1 }, (_, i) => a + i);
} else {
  frames = (args.frames || '0').split(',').map(Number);
}
await mkdir(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/frame') {
    const n = Number(url.searchParams.get('n'));
    const chunks = [];
    for await (const c of req) chunks.push(c);
    await writeFile(path.join(outDir, `f${String(n).padStart(5, '0')}.png`), Buffer.concat(chunks));
    done.add(n);
    return res.end('ok');
  }
  const file = path.resolve(ROOT, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(ROOT + path.sep)) { res.statusCode = 403; return res.end(); }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && existsSync(p));
if (!CHROME) throw new Error('Chrome or Edge not found: set CHROME_PATH');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function worker(id, list) {
  const profile = path.join(ROOT, 'out', `.chrome${process.pid}_${id}`);
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
    '--force-color-profile=srgb', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    // Chrome may still hold the file open when it appears, so retry until it can be read.
    let port = '';
    for (let i = 0; i < 150 && !port; i++) {
      port = await readFile(portFile, 'utf8').then(t => t.split('\n')[0].trim(), () => '');
      if (!port) await sleep(100);
    }
    if (!port) throw new Error('Chrome never published its debugging port');
    const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let seq = 0; const pending = new Map();
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
      else if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails; console.error('PAGE', d.exception?.description || d.text);
      } else if (m.method === 'Runtime.consoleAPICalled') {
        console.log('LOG', m.params.args.map(a => a.value ?? a.description).join(' '));
      }
    };
    const send = (method, params = {}) => new Promise(r => {
      const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
    });
    const run = async expression => {
      const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      const x = m.result?.exceptionDetails;
      if (x) throw new Error(x.exception?.description || x.text);
      return m.result?.result?.value;
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: base });
    let ready = false;
    for (let i = 0; i < 150 && !ready; i++) { await sleep(100); ready = await run('window.ready===true'); }
    if (!ready) throw new Error('page never became ready');
    for (const n of list) await run(`renderAndPost(${n})`);
    ws.close();
  } finally {
    proc.kill(); await sleep(400);
    await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }).catch(() => {});
  }
}

const t0 = Date.now();
const done = new Set();
async function pass(list, base) {
  const size = Math.ceil(list.length / workers), jobs = [];
  for (let i = 0; i < workers; i++) {
    const part = list.slice(i * size, (i + 1) * size);
    if (part.length) jobs.push(worker(base + i, part));
  }
  for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected') console.error(String(r.reason?.message || r.reason));
}
// A worker that dies only loses its own frames: render whatever is missing again, up to twice.
let todo = frames;
for (let attempt = 0; attempt < 3 && todo.length; attempt++) {
  if (attempt) console.error(`retrying ${todo.length} missing frames`);
  await pass(todo, attempt * workers);
  todo = frames.filter(n => !done.has(n));
}
server.close();
console.log(`${done.size} of ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (todo.length) console.error('missing:', todo.join(','));
process.exit(todo.length ? 1 : 0);
