// One command for the finished film: node render/build.mjs [--skip-frames 1]
// Renders all 1536 frames, encodes them, muxes the soundtrack and checks the result.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// ffmpeg and ffprobe come from PATH, or from the folder named by FFMPEG_BIN.
const BIN = process.env.FFMPEG_BIN ? process.env.FFMPEG_BIN.replace(/[\\/]*$/, '/') : '';
const EXE = process.platform === 'win32' ? '.exe' : '';
const TOTAL = 1536;
const frames = path.join(ROOT, 'out/frames'), audio = path.join(ROOT, 'out/audio/yoigane_mix.wav'), film = path.join(ROOT, 'out/yoigane.mp4');
const run = (cmd, args, quiet) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' });
  if (r.status !== 0) { console.error(r.stderr || `${cmd} failed`); process.exit(1); }
  return r.stdout;
};

if (existsSync(path.join(ROOT, 'out/audio/cues.json'))) { run('node', ['render/make_cues.mjs']); run('node', ['render/make_srt.mjs']); }
if (!process.argv.includes('--skip-frames')) run('node', ['render/driver.mjs', '--range', `0-${TOTAL - 1}`, '--workers', '4', '--out', 'out/frames']);

const have = existsSync(frames) ? readdirSync(frames).filter(f => /^f\d{5}\.png$/.test(f)).length : 0;
if (have !== TOTAL) { console.error(`expected ${TOTAL} frames, found ${have}`); process.exit(1); }

const sound = existsSync(audio);
if (!sound) console.warn('no soundtrack found: encoding a silent film');
// The mix is lowered 0.7 dB because AAC overshoots its true peak.
run(BIN + 'ffmpeg' + EXE, ['-y', '-v', 'error', '-framerate', '24', '-i', path.join(frames, 'f%05d.png'),
  ...(sound ? ['-i', audio] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  ...(sound ? ['-af', 'volume=-0.7dB', '-c:a', 'aac', '-b:a', '320k'] : []), '-movflags', '+faststart', film]);

const info = JSON.parse(run(BIN + 'ffprobe' + EXE, ['-v', 'error', '-count_frames', '-show_entries',
  'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration', '-of', 'json', film], true));
console.log(JSON.stringify(info.streams, null, 1));
const v = info.streams.find(s => s.codec_type === 'video');
if (Number(v.nb_read_frames) !== TOTAL || v.width !== 1920 || v.height !== 1080) { console.error('video check failed'); process.exit(1); }
console.log(`${film}  ${(statSync(film).size / 1e6).toFixed(1)} MB`);
