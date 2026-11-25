"""Measurement report for the finished soundtrack. Writes out/audio/verify/*.png and report.json.

    python audio/verify.py [--no-plots] [--asr]     (needs out/audio/dry from build.py --keep-dry for the dry-voice checks)
"""
import os
import cv2  # noqa: F401  (must load before numpy.linalg on this machine)
import json
import pickle
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt

import score as SC
import voice as V
from dsp import FPS, SR, TAU, lufs, mtof, read_wav24, todb, true_peak_db

OUT = HERE.parent / 'out' / 'audio'
VER = OUT / 'verify'
FFMPEG = os.path.join(os.environ.get('FFMPEG_BIN', ''), 'ffmpeg')
SECTIONS = [('sadness', 0, 8), ('warmth', 8, 14), ('comedy', 14, 19.83), ('fear', 20, 27.9), ('wrath', 28, 34), ('narumi', 34, 38), ('hota', 38, 42),
            ('wave', 42, 50), ('resolve', 50, 52.16), ('lanterns', 52.16, 56), ('dawn', 56, 64)]


# ------------------------------------------------------------------ tools
def specgram(ax, y, fmax=10000, win=.03, hop=.004, t0=0.0, rng_db=80, fmin=0, log=False):
    n = int(win * SR)
    f, t, S = signal.spectrogram(y, SR, window=('gaussian', n / 6), nperseg=n, noverlap=n - max(1, int(hop * SR)), nfft=max(2048, n), mode='magnitude')
    S = todb(S, 1e-9)
    k = (f >= fmin) & (f <= fmax)
    ax.pcolormesh(t + t0, f[k], S[k], vmin=S.max() - rng_db, vmax=S.max(), cmap='magma', shading='nearest', rasterized=True)
    if log:
        ax.set_yscale('log')
    ax.set_ylim(max(fmin, 30 if log else 0), fmax)


def yin(y, fmin=120, fmax=800, win=.032):
    """Fundamental (Hz) of a short frame by the cumulative-mean-normalised difference function."""
    W = int(win * SR)
    T = int(SR / fmin) + 2
    if len(y) < W + T:
        return np.nan, 0
    x = y[:W + T]
    d = np.array([np.sum((x[:W] - x[l:l + W]) ** 2) if l else 0 for l in range(T)])
    c = d[1:] * np.arange(1, T) / np.maximum(np.cumsum(d[1:]), 1e-12)
    lo = int(SR / fmax)
    idx = np.arange(lo, T - 2)
    cand = [i for i in idx if c[i - 1] < .15 and c[i - 1] <= c[i] and c[i - 1] <= c[i - 2]]
    i = cand[0] if cand else lo + int(np.argmin(c[lo - 1:T - 3]))
    l = i
    if 1 <= l - 1 and l < len(c):
        a, b, e = c[l - 2], c[l - 1], c[l]
        den = a - 2 * b + e
        off = 0.5 * (a - e) / den if abs(den) > 1e-12 else 0
        return SR / (l + np.clip(off, -1, 1)), 1 - b
    return SR / l, 1 - c[l - 1]


def lpc_formants(y, fs=11000, order=12):
    x = signal.resample_poly(y, 11, 48)
    x = np.append(x[0], x[1:] - .97 * x[:-1]) * np.hamming(len(x))
    r = np.correlate(x, x, 'full')[len(x) - 1:len(x) + order]
    r[0] *= 1.0001
    a = np.linalg.solve(np.array([[r[abs(i - j)] for j in range(order)] for i in range(order)]), -r[1:order + 1])
    rt = np.roots(np.r_[1, a])
    rt = rt[np.imag(rt) > 0]
    f = np.angle(rt) * fs / TAU
    bw = -np.log(np.abs(rt)) * fs / np.pi
    k = (f > 180) & (bw < 600)
    return np.sort(f[k])


def flux_bands(x):
    """Log-level rise per millisecond in three bands."""
    m = x.mean(1)
    out = []
    for lo, hi in ((30, 250), (250, 2000), (2000, 12000)):
        z = signal.sosfilt(signal.butter(2, [lo, hi], 'bp', fs=SR, output='sos'), m)
        k = len(z) // 48
        p = (z[:k * 48].reshape(k, 48) ** 2).mean(1)
        sm = {30: 8, 250: 4, 2000: 3}[lo]
        p = np.convolve(p, np.ones(sm) / sm)[:k]          # causal, so an onset is never reported early
        l = 10 * np.log10(p + 1e-10)
        d = np.zeros(k)
        d[4:] = l[4:] - l[:-4]
        out.append(d)
    return np.array(out)


def onset_near(fl, t, win=25):
    """Time offset (ms) and size (dB per 4 ms) of the strongest rise within +-win ms, and where it starts."""
    i = int(round(t * 1000))
    a, b = max(0, i - win), min(fl.shape[1], i + win + 1)
    seg = fl[:, a:b]
    j = np.unravel_index(int(np.argmax(seg)), seg.shape)
    peak = float(seg[j])
    # walk back to the foot of the rise
    k = j[1]
    while k > 0 and seg[j[0], k - 1] > .35 * peak:
        k -= 1
    return float(a + k - i), peak, ('low', 'mid', 'high')[j[0]]


# ------------------------------------------------------------------ sections of the report
def check_files(rep):
    for n in ('yoigane_mix', 'music', 'vocal', 'sfx'):
        with wave.open(str(OUT / f'{n}.wav')) as w:
            rep['files'][n] = dict(rate=w.getframerate(), channels=w.getnchannels(), bits=8 * w.getsampwidth(), frames=w.getnframes(), seconds=w.getnframes() / w.getframerate())


def check_loudness(rep, stems, mix):
    r = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', str(OUT / 'yoigane_mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, errors='replace')
    s = r.stderr[r.stderr.rfind('Summary:'):]
    g = lambda p: float(re.search(p, s).group(1))
    rep['loudness'] = dict(ffmpeg_integrated_lufs=g(r'I:\s+(-?[\d.]+) LUFS'), ffmpeg_lra=g(r'LRA:\s+(-?[\d.]+) LU'), ffmpeg_true_peak_dbtp=g(r'Peak:\s+(-?[\d.]+) dBFS'),
                           own_lufs=round(lufs(mix), 2), own_true_peak=round(true_peak_db(mix), 2), sample_peak_db=round(float(todb(np.abs(mix).max())), 2),
                           samples_at_full_scale=int((np.abs(mix) >= 0.9999).sum()))
    d = mix - sum(stems.values())
    rep['loudness']['stem_sum_error_peak'] = float(np.abs(d).max())
    rep['sections'] = {n: {k: round(lufs(v[int(a * SR):int(b * SR)]), 1) for k, v in dict(mix=mix, **stems).items()} for n, a, b in SECTIONS}
    # spectral balance of the mix in broad bands (dB of power share)
    f, P = signal.welch(mix.mean(1), SR, nperseg=8192)
    bands = [(20, 60), (60, 120), (120, 300), (300, 800), (800, 2000), (2000, 5000), (5000, 10000), (10000, 20000)]
    rep['mix_band_balance_db'] = {f'{a}-{b}': round(float(10 * np.log10(P[(f >= a) & (f < b)].sum() / P.sum())), 1) for a, b in bands}
    c = np.corrcoef(mix[:, 0], mix[:, 1])[0, 1]
    rep['loudness']['stereo_correlation'] = round(float(c), 3)
    rep['loudness']['dc_offset'] = [float(v) for v in mix.mean(0)]


def check_silences(rep, mix):
    out = {}
    for e in SC.EVENTS:
        if e['type'] in ('silence', 'black') and e['name'] != 'fade_to_black':
            a, b = int(e['frame'] / FPS * SR), int(e['end'] / FPS * SR)
            m = int(.15 * (b - a))
            x = mix[a + m:b - int(.05 * (b - a))]
            pre = mix[max(0, a - int(.3 * SR)):a]
            out[e['name']] = dict(frames=[e['frame'], e['end']], rms_db=round(float(todb(np.sqrt((x ** 2).mean()), 1e-7)), 1), peak_db=round(float(todb(np.abs(x).max(), 1e-7)), 1),
                                  rms_before_db=round(float(todb(np.sqrt((pre ** 2).mean()), 1e-7)), 1))
    rep['silences'] = out
    # unplanned holes: 50 ms windows under -70 dBFS
    w = int(.05 * SR)
    k = len(mix) // w
    lv = todb(np.sqrt((mix[:k * w] ** 2).mean(1).reshape(k, w).mean(1)), 1e-7)
    quiet = [round(i * .05, 2) for i in range(k) if lv[i] < -70]
    rep['windows_below_-70dBFS'] = quiet
    rep['tail'] = dict(last_100ms_db=round(float(todb(np.sqrt((mix[-int(.1 * SR):] ** 2).mean()), 1e-9)), 1), last_sample=float(np.abs(mix[-1]).max()))


def check_sync(rep, sfx, mix):
    fs, fm = flux_bands(sfx), flux_bands(mix)
    rows = []
    for e in SC.EVENTS:
        if e['type'] in ('hit', 'lamp', 'lamp_on', 'bell', 'step', 'heartbeat'):
            t = e['frame'] / FPS
            o, rise, band = onset_near(fs, t)
            om, rm, bm = onset_near(fm, t)
            rows.append(dict(name=e['name'], frame=e['frame'], t=round(t, 4), sfx_offset_ms=o, sfx_rise_db=round(rise, 1), band=band, mix_offset_ms=om, mix_rise_db=round(rm, 1), masked_in_mix=bool(rm < 2.0)))
    rep['sync'] = rows
    off = np.array([r['sfx_offset_ms'] for r in rows if r['sfx_rise_db'] >= 3])
    rep['sync_summary'] = dict(events=len(rows), clear_onset_in_sfx=len(off), median_ms=float(np.median(off)), max_abs_ms=float(np.abs(off).max()), within_10ms=int((np.abs(off) <= 10).sum()),
                               within_half_frame=int((np.abs(off) <= 1000 / FPS / 2).sum()), weak=[(r['name'], r['sfx_rise_db']) for r in rows if r['sfx_rise_db'] < 3],
                               worst=sorted([(r['name'], r['sfx_offset_ms'], r['sfx_rise_db']) for r in rows if r['sfx_rise_db'] >= 3], key=lambda q: -abs(q[1]))[:10])


def check_pitch(rep, lead, info):
    rows = []
    for inf in info:
        for (t, d, m, s) in inf['notes']:
            fr = []
            a0, a1 = t + min(.09, .4 * d), t + d - min(.09, .3 * d)
            for tc in np.arange(a0, a1, .010):
                i = int((tc - .016) * SR)
                f, c = yin(lead[i:i + int(.032 * SR) + 600])
                if c > .75:
                    fr.append(1200 * np.log2(f / mtof(m)))
            if fr:
                rows.append(dict(phrase=inf['id'], mora=s, midi=m, t=round(t, 3), cents=round(float(np.median(fr)), 1), n=len(fr)))
            else:
                rows.append(dict(phrase=inf['id'], mora=s, midi=m, t=round(t, 3), cents=None, n=0))
    rep['pitch'] = rows
    c = np.array([r['cents'] for r in rows if r['cents'] is not None])
    rep['pitch_summary'] = dict(notes=len(rows), tracked=len(c), median_cents=round(float(np.median(c)), 1), mean_abs_cents=round(float(np.abs(c).mean()), 1),
                                p95_abs_cents=round(float(np.percentile(np.abs(c), 95)), 1), within_25=int((np.abs(c) <= 25).sum()), within_50=int((np.abs(c) <= 50).sum()),
                                worst=sorted([(r['phrase'], r['mora'], r['cents']) for r in rows if r['cents'] is not None], key=lambda q: -abs(q[2]))[:8])


def check_formants(rep):
    out = {}
    S = V.Singer('shio', rd=1.1, breath=-40, vib_cents=0, drift=0, jitter=0, shimmer=0, tune=0, level=0)
    for v in 'aiueo':
        # spoken-pitch rendering, where harmonics are dense enough for LPC
        m = 69 + 12 * np.log2(125 / 440)
        R = V.sing([V.Note(.3, 1.0, m, v, vib=0)], S, 1.8, seed='fm')
        y = R['audio'][int(.6 * SR):int(1.1 * SR)]
        f = [lpc_formants(y[i:i + int(.04 * SR)]) for i in range(0, len(y) - int(.04 * SR), 2400)]
        n = min(len(x) for x in f)
        med = np.median([x[:n] for x in f], 0)
        out[v] = dict(target=list(V.VOWELS[v][:4]), lpc=[round(float(x)) for x in med[:4]], error_pct=[round(100 * float(a / b - 1), 1) for a, b in zip(med[:3], V.VOWELS[v][:3])])
    rep['formants_at_125Hz'] = out


def check_formants_sung(rep, info):
    """Formant tracks actually used in the song at vowel centres (after coarticulation and F1 tuning)."""
    acc = {v: [] for v in 'aiueo'}
    for inf in info:
        for (t, d, m, s), v in zip(inf['notes'], inf['vow']):
            if v in acc:
                k = int((t - inf['t0'] + .5 * d) * V.CT)
                acc[v].append(np.r_[inf['F'][k, :3], mtof(m)])
    rep['formants_in_song'] = {v: dict(n=len(a), F1=round(float(np.median([x[0] for x in a]))), F2=round(float(np.median([x[1] for x in a]))), F3=round(float(np.median([x[2] for x in a]))),
                                       F0_range=[round(float(min(x[3] for x in a))), round(float(max(x[3] for x in a)))]) for v, a in acc.items() if a}


def check_voice_quality(rep, lead, info):
    rows = {}
    for inf in info:
        acc = {}
        for (lo, hi) in ((80, 1000), (1000, 3000), (3000, 6000), (6000, 10000)):
            z = signal.sosfiltfilt(signal.butter(4, [lo, hi], 'bp', fs=SR, output='sos'), lead[int(inf['t0'] * SR):int((inf['t0'] + len(inf['f0']) / V.CT) * SR)])
            q = []
            for (t, d, m, s) in inf['notes']:
                tc = t - inf['t0'] + min(.5 * d, .3)
                c, w = int(tc * SR), int(.03 * SR)
                L = SR / inf['f0'][int(tc * V.CT)]
                x = z[c - w:c + w]
                best = max(np.dot(x, z[c - w + l:c + w + l]) / np.sqrt(np.dot(x, x) * np.dot(z[c - w + l:c + w + l], z[c - w + l:c + w + l]) + 1e-20) for l in range(int(L * .97), int(L * 1.03) + 2))
                best = np.clip(best, 1e-3, .9999)
                q.append(10 * np.log10(best / (1 - best)))
            acc[f'{lo}-{hi}'] = round(float(np.median(q)), 1)
        rows[inf['id']] = acc
    rep['harmonic_to_noise_db'] = rows


def plots(stems, mix, lead, info):
    fig, ax = plt.subplots(5, 1, figsize=(22, 20), sharex=True)
    for a, (n, x) in zip(ax, [('mix', mix), ('music', stems['music']), ('vocal', stems['vocal']), ('sfx', stems['sfx'])]):
        specgram(a, x.mean(1), 12000, .05, .02)
        a.set_ylabel(n)
        for q in SECTIONS:
            a.axvline(q[1], color='c', lw=.8)
    from dsp import lufs as _l
    for n, x, c in (('mix', mix, 'k'), ('music', stems['music'], 'tab:blue'), ('vocal', stems['vocal'], 'tab:red'), ('sfx', stems['sfx'], 'tab:green')):
        t, l = _l(x, True)
        ax[4].plot(t, l, color=c, label=n, lw=1.6 if n == 'mix' else 1)
    ax[4].set_ylim(-55, -4)
    ax[4].grid(alpha=.3)
    ax[4].legend(loc='lower left', ncol=4)
    ax[4].set_ylabel('momentary LUFS')
    ax[4].set_xticks(range(0, 65, 2))
    plt.tight_layout()
    plt.savefig(VER / 'overview.png', dpi=60)
    plt.close()
    for n, a0, b0 in SECTIONS:
        fig, ax = plt.subplots(4, 1, figsize=(18, 15), sharex=True)
        for a, (k, x) in zip(ax, [('mix', mix), ('music', stems['music']), ('vocal', stems['vocal']), ('sfx', stems['sfx'])]):
            specgram(a, x[int(a0 * SR):int(b0 * SR)].mean(1), 9000, .035, .006, a0)
            a.set_ylabel(k)
            for e in SC.EVENTS:
                if a0 <= e['frame'] / FPS < b0 and e['type'] != 'section':
                    a.axvline(e['frame'] / FPS, color='w' if e['origin'] == 'picture' else 'lime', lw=.6, alpha=.6)
        plt.tight_layout()
        plt.savefig(VER / f'sec_{n.replace("+", "_")}.png', dpi=55)
        plt.close()
    if lead is not None:
        for inf in info:
            a0, b0 = inf['notes'][0][0] - .3, inf['notes'][-1][0] + inf['notes'][-1][1] + .3
            fig, ax = plt.subplots(2, 1, figsize=(18, 8), sharex=True, height_ratios=[2, 1])
            specgram(ax[0], lead[int(a0 * SR):int(b0 * SR)], 8000, .014, .002, a0)
            t = inf['t0'] + np.arange(len(inf['f0'])) / V.CT
            for j in range(3):
                ax[0].plot(t, inf['F'][:, j], 'c', lw=.7, alpha=.6)
            ax[0].set_xlim(a0, b0)
            tt = np.arange(a0 + .1, b0 - .1, .008)
            f = []
            for tc in tt:
                i = int((tc - .016) * SR)
                q, c = yin(lead[i:i + int(.032 * SR) + 600])
                f.append(q if c > .8 else np.nan)
            ax[1].plot(tt, f, 'k.', ms=2)
            ax[1].plot(t, inf['f0'], 'c', lw=.7, alpha=.6)
            for (tn, d, m, s) in inf['notes']:
                ax[1].plot([tn, tn + d], [mtof(m)] * 2, 'r', lw=1.2)
                ax[1].text(tn, mtof(m) * 1.04, s)
                ax[0].axvline(tn, color='w', lw=.5, alpha=.5)
            ax[1].set_ylim(200, 750)
            plt.tight_layout()
            plt.savefig(VER / f'voice_{inf["id"]}.png', dpi=55)
            plt.close()


def write16k(path, y):
    z = signal.resample_poly(y, 1, 3)
    z = z / max(1e-9, np.abs(z).max()) * .7
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes((z * 32767).astype('<i2').tobytes())


ASR_PY = r'D:\Utils\LiveTranslate\.venv\Scripts\python.exe'
ASR_CLIPS = ['0.2:3.8', '3.75:7.95', '7.85:11.45', '11.4:13.95', '28.6:34', '40.25:43.9', '43.85:48', '47.8:52', '55.2:62']


def run_asr(lead):
    """Local recognizers, offline, on the dry lead, the vocal stem and the full mix. Skipped if not installed."""
    if not Path(ASR_PY).exists():
        print('no local recognizer, skipped')
        return
    files = ['vocal16k.wav', 'mix16k.wav']
    if lead is not None:
        write16k(VER / 'lead16k.wav', lead)
        files.insert(0, 'lead16k.wav')
    subprocess.run([ASR_PY, str(HERE / 'asr_check.py'), *files, '--clip', *ASR_CLIPS, '--models', 'large,anime', '--json', 'asr.json'], cwd=VER, stderr=subprocess.DEVNULL)


def main(info=None, do_plots=True, asr=False):
    VER.mkdir(parents=True, exist_ok=True)
    stems = {k: read_wav24(OUT / f'{k}.wav')[0] for k in ('music', 'vocal', 'sfx')}
    mix = read_wav24(OUT / 'yoigane_mix.wav')[0]
    lead = None
    if (OUT / 'dry' / 'dry.npz').exists():
        with np.load(OUT / 'dry' / 'dry.npz') as d:
            lead = d['lead'].astype(np.float64)
        with open(OUT / 'dry' / 'info.pkl', 'rb') as f:
            info = pickle.load(f)
    rep = dict(files={})
    check_files(rep)
    check_loudness(rep, stems, mix)
    check_silences(rep, mix)
    check_sync(rep, stems['sfx'], mix)
    check_formants(rep)
    if lead is not None:
        check_pitch(rep, lead, info)
        check_formants_sung(rep, info)
        check_voice_quality(rep, lead, info)
    with open(VER / 'report.json', 'w', encoding='utf-8') as f:
        json.dump(rep, f, ensure_ascii=False, indent=1)
    write16k(VER / 'vocal16k.wav', stems['vocal'].mean(1))
    write16k(VER / 'mix16k.wav', mix.mean(1))
    if do_plots:
        plots(stems, mix, lead, info)
    if asr:
        run_asr(lead)
    return rep


if __name__ == '__main__':
    rep = main(do_plots='--no-plots' not in sys.argv, asr='--asr' in sys.argv)
    for k in ('files', 'loudness', 'sections', 'mix_band_balance_db', 'silences', 'windows_below_-70dBFS', 'tail', 'sync_summary', 'formants_at_125Hz', 'formants_in_song', 'pitch_summary', 'harmonic_to_noise_db'):
        if k in rep:
            print(k, json.dumps(rep[k], ensure_ascii=False))
