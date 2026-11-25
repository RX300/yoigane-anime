"""Instruments built from physical or spectral models. No recorded material."""
from functools import lru_cache

import numpy as np

from dsp import SR, TAU, env, eq, fade, mtof, rng, smooth_noise, soft_clip, spectral_shape, tv_filter

# ------------------------------------------------------------------ shared: partial bank
def partials(freqs, amps, t60, n, phase=None, glide=None):
    """Sum of decaying sines; each partial is only computed until it is 75 dB down."""
    out = np.zeros(n)
    for i, (f, a, d) in enumerate(zip(freqs, amps, t60)):
        if f >= 20000 or abs(a) < 1e-5:
            continue
        m = min(n, int(d * 1.25 * SR) + 64)
        t = np.arange(m) / SR
        p = TAU * f * (t if glide is None else t + glide[:m]) + (0 if phase is None else phase[i])
        out[:m] += a * np.sin(p) * np.exp(-6.9078 * t / d)
    return out


# ------------------------------------------------------------------ plucked strings
@lru_cache(maxsize=None)
def koto(m, vel=0.8, dur=3.2, seed=0, bend=0.0, damp=1.0):
    """Koto: stiff string picked near the bridge by a hard plectrum, hollow paulownia body."""
    r = rng(f'koto{m}{seed}{vel:.2f}')
    f0 = float(mtof(m)) * 2 ** (r.normal(0, 1.2) / 1200)
    n = int(dur * SR)
    t = np.arange(n) / SR
    B = 1.1e-4 * (f0 / 300) ** 0.4
    beta = 0.085 + 0.02 * r.uniform(-1, 1)
    K = int(min(60, 11000 / f0))
    k = np.arange(1, K + 1)
    fr = k * f0 * np.sqrt(1 + B * k * k)
    bright = 1.2 + 1.6 * vel
    a = np.abs(np.sin(np.pi * k * beta)) / k ** 0.85 * np.exp(-fr / (2300 * bright))
    t60 = damp * 4.6 * (220 / f0) ** 0.35 / (1 + 0.20 * (k - 1) ** 0.9 + (fr / 3600) ** 2)
    ph = r.uniform(0, TAU, K) * 0.15
    g = np.cumsum(np.exp(-t / 0.045)) / SR * (2 ** (11 * vel / 1200) - 1)
    if bend:
        g = g + np.cumsum((2 ** (bend / 12 * np.clip((t - 0.16) / 0.12, 0, 1) ** 1.5) - 1)) / SR
    y = partials(fr, a * 0.62, t60 * 0.9, n, ph, g)
    y += partials(fr * (1 + 0.0006 * r.uniform(.6, 1.4)), a * 0.45, t60 * 1.15, n, ph + 0.6, g)
    # prompt, quickly dying polarisation
    y += partials(fr[:14], a[:14] * 0.9, np.full(min(14, K), 0.16), n, ph[:14] + 1.2, g)
    nk = int(0.03 * SR)
    ck = spectral_shape(r.standard_normal(nk), [(50, -40), (900, -18), (2500, -2), (4500, 0), (9000, -9), (18000, -24)])
    y[:nk] += ck * np.exp(-np.arange(nk) / SR / 0.0035) * 0.10 * vel
    y += partials([128, 214, 342], [.10 * vel, .08 * vel, .05 * vel], [.16, .12, .08], n)
    y = eq(y, ('hp', 70), ('pk', 260, 1.2, 2.0), ('pk', 480, 1.5, 1.5), ('pk', 1900, .9, 2.0), ('hs', 7000, .7, -3))
    y *= vel ** 1.2 / 0.9
    return fade(y, 0.0008, 0.12) * 0.55


@lru_cache(maxsize=None)
def pizz(m, vel=0.8, seed=0, dur=0.9):
    """Finger-plucked bowed instrument: short, dark, woody."""
    r = rng(f'pizz{m}{seed}')
    f0 = float(mtof(m)) * 2 ** (r.normal(0, 3) / 1200)
    n = int(dur * SR)
    K = int(min(40, 7000 / f0))
    k = np.arange(1, K + 1)
    fr = k * f0 * np.sqrt(1 + 2e-4 * k * k)
    a = np.abs(np.sin(np.pi * k * 0.21)) / k ** 1.1 * np.exp(-fr / 2600)
    t60 = 0.75 * (200 / f0) ** 0.5 / (1 + 0.35 * (k - 1))
    y = partials(fr, a, np.maximum(t60, 0.03), n, r.uniform(0, .3, K))
    y += partials([196 + 20 * r.random(), 285, 460], [.16 * vel, .12 * vel, .07 * vel], [.09, .07, .05], n)
    nk = int(0.02 * SR)
    y[:nk] += spectral_shape(r.standard_normal(nk), [(50, -20), (400, -4), (1200, 0), (3000, -8), (9000, -30)]) * np.exp(-np.arange(nk) / SR / .003) * .12 * vel
    return fade(y * vel, 0.001, 0.05) * 0.7


@lru_cache(maxsize=None)
def shamisen(m, vel=0.8, seed=0, dur=1.1):
    """Three-string lute with a big plectrum hitting a skin, and sawari buzz."""
    r = rng(f'sham{m}{seed}')
    f0 = float(mtof(m)) * 2 ** (r.normal(0, 3) / 1200)
    n = int(dur * SR)
    t = np.arange(n) / SR
    K = int(min(50, 10000 / f0))
    k = np.arange(1, K + 1)
    fr = k * f0 * np.sqrt(1 + 1.5e-4 * k * k)
    a = np.abs(np.sin(np.pi * k * 0.06)) / k ** 0.55 * np.exp(-fr / 4200)
    t60 = 0.95 / (1 + 0.10 * (k - 1) + (fr / 4500) ** 2)
    g = np.cumsum(np.exp(-t / 0.03)) / SR * (2 ** (16 * vel / 1200) - 1)
    y = partials(fr, a * .8, t60, n, r.uniform(0, 1, K), g)
    # sawari: slight one-sided contact regenerates upper partials
    y = y + 0.35 * np.maximum(y, 0) ** 2 * np.exp(-t / 0.4)
    nk = int(0.06 * SR)
    sk = spectral_shape(r.standard_normal(nk), [(50, -18), (250, 0), (700, -3), (2500, -8), (6000, -14), (15000, -34)])
    y[:nk] += sk * np.exp(-np.arange(nk) / SR / 0.012) * 0.55 * vel
    y += partials([238, 410, 655], [.28 * vel, .2 * vel, .12 * vel], [.11, .08, .05], n)
    y = eq(y, ('hp', 110), ('pk', 1100, 1.0, 3), ('pk', 3200, 1.0, 3))
    return fade(y * vel, 0.0006, 0.06) * 0.42


# ------------------------------------------------------------------ bowed strings
_tables = {}


def saw_table(f0, fmax=12000, size=4096):
    """Band-limited bowed-string wave (sawtooth with a bow-position comb)."""
    K = max(2, int(fmax / f0))
    if K not in _tables:
        k = np.arange(1, K + 1)
        amp = (1 / k) * (0.55 + 0.45 * np.abs(np.sin(np.pi * k * 0.127)) * 1.3) * np.exp(-(k * f0 / 9000) ** 2)
        ph = np.arange(size) / size
        tab = np.zeros(size)
        for kk, aa in zip(k, amp):
            tab += aa * np.sin(TAU * kk * ph)
        _tables[K] = np.append(tab, tab[0])
    return _tables[K]


def wt_play(tab, f):
    size = len(tab) - 1
    ph = np.mod(np.cumsum(f) / SR, 1.0) * size
    i = ph.astype(int)
    fr = ph - i
    return tab[i] * (1 - fr) + tab[np.minimum(i + 1, size)] * fr


def bowed(m, dur, vel=0.7, players=5, att=0.12, rel=0.25, vib=1.0, trem=0.0, swell=None, spread=0.6, seed='', sect='vn',
          slide=0.0, scoop=0.0, bright=0.0):
    """A string section on one note. Returns stereo."""
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    e = np.clip(t / att, 0, 1)
    e = np.sin(e * np.pi / 2) ** 1.4
    e = e * np.clip((dur + rel - t) / rel, 0, 1) ** 1.5
    if swell is not None:
        e = e * env([(u * dur, v) for u, v in swell], n, shape='cos')
    f0 = float(mtof(m))
    tab = saw_table(f0)
    for p in range(players):
        r = rng(f'bow{m}{dur:.3f}{seed}{sect}{p}')
        det = r.normal(0, 5.5)
        vr = r.uniform(5.0, 6.3)
        vd = vib * r.uniform(8, 15) * np.clip((t - r.uniform(.08, .25)) / 0.35, 0, 1)
        cents = det + vd * np.sin(TAU * vr * t + r.uniform(0, TAU)) + 3.0 * smooth_noise(n, 4, r)
        if slide:
            cents = cents + 100 * slide * np.clip(t / dur, 0, 1) ** 1.2
        if scoop:
            cents = cents + 100 * scoop * np.exp(-t / 0.09)
        f = f0 * 2 ** (cents / 1200)
        lag = int(r.uniform(0, 0.022) * SR)
        y = wt_play(tab, f) * (1 + 0.10 * smooth_noise(n, 7, r))
        if trem:
            ph = TAU * np.cumsum(0.5 * trem * (1 + 0.08 * smooth_noise(n, 3, r))) / SR + r.uniform(0, TAU)
            y *= 0.30 + 0.70 * np.abs(np.sin(ph / 2)) ** 0.8
        bn = r.standard_normal(n)
        y = y + bn * (0.030 + 0.10 * np.exp(-t / 0.05))
        ee = np.concatenate([np.zeros(lag), e[:n - lag]])
        pan = spread * ((p + 0.5) / players * 2 - 1)
        th = (pan + 1) * np.pi / 4
        out[:, 0] += y * ee * np.cos(th)
        out[:, 1] += y * ee * np.sin(th)
    out *= vel / players ** 0.75 * 0.34
    body = {'vn': [('hp', 170), ('pk', 285, 2.0, 4), ('pk', 480, 2.0, 3), ('pk', 1100, 1.2, -3), ('pk', 2600, 1.0, 3.5 + bright), ('lp', 6800 + 900 * bright)],
            'va': [('hp', 120), ('pk', 220, 2.0, 4), ('pk', 380, 2.0, 3), ('pk', 900, 1.2, -2), ('pk', 2000, 1.0, 2.0 + bright), ('lp', 5200 + 900 * bright)],
            'vc': [('hp', 55), ('pk', 105, 1.6, 3), ('pk', 190, 2.0, 3), ('pk', 600, 1.2, -2), ('pk', 1500, 1.0, 2.0 + bright), ('lp', 3800 + 900 * bright)],
            'cb': [('hp', 34), ('pk', 70, 1.4, 4), ('pk', 130, 2.0, 2), ('lp', 2000 + 600 * bright)]}[sect]
    return eq(out, *body)


# ------------------------------------------------------------------ brass-like swell
def brass(m, dur, vel=0.8, players=4, swell=((0, .35), (.7, 1), (1, .9)), seed='', att=.07, rel=.16, spread=.5):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    lev = env([(u * dur, v) for u, v in swell], n, shape='cos')
    e = np.clip(t / att, 0, 1) ** 1.2 * np.clip((dur + rel - t) / rel, 0, 1) ** 1.6
    f0 = float(mtof(m))
    K = int(min(28, 9000 / f0))
    for p in range(players):
        r = rng(f'br{m}{seed}{p}')
        cents = r.normal(0, 5) + 4 * smooth_noise(n, 5, r) - 45 * np.exp(-t / 0.035) + 5 * np.sin(TAU * 5.2 * t + r.uniform(0, 6)) * np.clip((t - .4) / .4, 0, 1)
        ph = TAU * np.cumsum(f0 * 2 ** (cents / 1200)) / SR + r.uniform(0, TAU)
        # louder means brighter: spectral slope follows the level
        L = lev * e * vel
        dec = 0.62 - 0.45 * np.clip(L, 0, 1)
        z = np.exp(1j * ph)
        zk = np.ones(n, complex)
        y = np.zeros(n)
        w = np.ones(n)
        q = np.exp(-dec)
        for k in range(1, K + 1):
            zk = zk * z
            y += w * zk.imag * (1.0 if k > 1 else .8)
            w = w * q
        y += 0.02 * r.standard_normal(n)
        pan = spread * ((p + .5) / players * 2 - 1)
        th = (pan + 1) * np.pi / 4
        out[:, 0] += y * L * e ** .3 * np.cos(th)
        out[:, 1] += y * L * e ** .3 * np.sin(th)
    out = soft_clip(out * 0.35, 1.2)
    return eq(out, ('hp', 60), ('pk', 480, 1.0, 2), ('pk', 1250, 1.0, 4), ('lp', 6500)) * 0.55 / players ** .4


# ------------------------------------------------------------------ flutes
def flute(notes, total, kind='shinobue', seed='', vel=1.0):
    """Monophonic breath-driven flute. notes = [(t, d, midi, vel, opts)]. Returns mono."""
    r = rng(f'fl{seed}{kind}')
    n = int(total * SR)
    t = np.arange(n) / SR
    ct = 500
    nc = int(total * ct) + 1
    tc = np.arange(nc) / ct
    p = np.full(nc, float(notes[0][2]))
    a = np.zeros(nc)
    chiff = np.zeros(nc)
    vib = np.zeros(nc)
    for i, (tt, d, m, v, o) in enumerate(notes):
        p[tc >= tt - 0.015] = m
        at, rl = o.get('att', .045), o.get('rel', .09)
        e = np.clip((tc - tt) / at, 0, 1) * np.clip((tt + d - tc) / rl + 1e-9, 0, 1)
        a = np.maximum(a, v * np.sin(np.clip(e, 0, 1) * np.pi / 2) * (1 + .12 * np.sin(np.pi * np.clip((tc - tt) / d, 0, 1))))
        chiff += v * np.exp(-((tc - tt - .012) / .016) ** 2)
        if d > .4:
            x = np.clip((tc - tt - .22) / .35, 0, 1) * np.clip((tt + d - tc) / .1, 0, 1)
            vib += o.get('vib', 1.0) * x
        if 'fall' in o:
            p += np.where(tc > tt, o['fall'] * np.clip((tc - tt - d * .55) / (d * .45), 0, 1) ** 1.5 * (tc < tt + d + .05), 0)
        if 'scoop' in o:
            p += np.where(tc > tt - .02, o['scoop'] * np.exp(-np.clip(tc - tt, 0, 9) / .09) * (tc < tt + d), 0)
        if 'grace' in o:
            p += np.where((tc > tt - .01) & (tc < tt + .055), o['grace'], 0)
    from scipy.ndimage import gaussian_filter1d
    p = gaussian_filter1d(p, 5 if kind == 'shinobue' else 9)
    a = gaussian_filter1d(a, 3)
    phv = TAU * np.cumsum(4.9 + .3 * smooth_noise(nc, 1, r, ct)) / ct
    dep = .16 if kind == 'shinobue' else .24
    p = p + dep * vib * np.sin(phv) + .05 * smooth_noise(nc, 4, r, ct)
    a = a * (1 + .16 * vib * np.sin(phv - .7)) * (1 + .05 * smooth_noise(nc, 9, r, ct))
    f = np.interp(t, tc, mtof(p))
    A = np.interp(t, tc, a)
    ch = np.interp(t, tc, chiff)
    ph = TAU * np.cumsum(f) / SR
    if kind == 'shinobue':
        H = [1, .42, .20, .09, .05, .025, .012]
        nl, lo = 0.12, 0.6
    else:
        H = [1, .34, .30, .10, .07, .03, .015]
        nl, lo = 0.30, 0.9
    y = np.zeros(n)
    for k, h in enumerate(H, 1):
        y += h * A ** (1 + .35 * (k - 1)) * np.sin(k * ph + .4 * k)
    nz = r.standard_normal(n) * (nl * A ** .8 * np.clip(1 + .22 * smooth_noise(n, 25, r), .3, 2) + .9 * nl * ch)
    nf = int(np.ceil(n / 240)) + 1
    ff = np.interp(np.arange(nf) * 240 / SR, tc, mtof(p))
    fb = np.fft.rfftfreq(4096, 1 / SR)

    def hf(i0, i1):
        g = np.zeros((i1 - i0, len(fb)), complex)
        for k in range(1, 9):
            c = ff[i0:i1][:, None] * k
            bw = 70 + 35 * k
            g += (0.9 / k ** lo) * (1j * bw * fb) / ((c * c - fb * fb) + 1j * bw * fb + 1e-9)
        sh = .10 * (1j * fb / 2500) / (1 + 1j * fb / 2500) / (1 + (fb / 7000) ** 2)
        return g + sh
    y = y * .5 + tv_filter(nz, hf, nf, 240, 4096) * 1.6
    y = eq(y, ('hp', 200), ('pk', 1500, .8, 1.5))
    return y * .42 * vel


# ------------------------------------------------------------------ free-reed pad (sho)
def sho(midis, dur, vel=.5, seed='', att=1.2, rel=1.2, swell=None):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    e = np.clip(t / att, 0, 1) ** 1.5 * np.clip((dur + rel - t) / rel, 0, 1) ** 1.5
    if swell is not None:
        e = e * env([(u * dur, v) for u, v in swell], n, shape='cos')
    for i, m in enumerate(midis):
        r = rng(f'sho{m}{seed}{i}')
        f0 = float(mtof(m)) * 2 ** (r.normal(0, 2) / 1200)
        K = int(min(14, 9000 / f0))
        y = np.zeros(n)
        wob = 1 + .0006 * smooth_noise(n, .8, r)
        ph = TAU * np.cumsum(f0 * wob) / SR
        for k in range(1, K + 1):
            y += (1.0 if k % 2 else .65) / k ** 1.05 * np.sin(k * ph + r.uniform(0, 6)) * (1 + .12 * smooth_noise(n, .7, r))
        th = (.7 * ((i + .5) / len(midis) * 2 - 1) + 1) * np.pi / 4
        out[:, 0] += y * e * np.cos(th)
        out[:, 1] += y * e * np.sin(th)
    return eq(out, ('hp', 250), ('pk', 2400, .8, 2), ('lp', 7000)) * vel * .16


# ------------------------------------------------------------------ drums
@lru_cache(maxsize=None)
def taiko(size='chu', vel=.8, seed=0):
    r = rng(f'taiko{size}{seed}')
    f, dur, dec, nz, pd = {'o': (55.0, 2.6, 1.05, .22, .45), 'nagado': (73.4, 1.5, .62, .30, .35), 'chu': (110.0, 1.0, .42, .34, .30),
                           'shime': (349.2, .35, .12, .6, .08)}[size]
    f *= 2 ** (r.normal(0, 12) / 1200)
    n = int(dur * SR)
    t = np.arange(n) / SR
    rat = np.array([1, 1.593, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.6, 4.06])
    am = np.array([1, .62, .38, .34, .25, .2, .17, .13, .1, .08]) * np.array([1] + list(r.uniform(.75, 1.2, 9)))
    t60 = dec * 2.4 / (1 + .55 * np.arange(10))
    g = np.cumsum(np.exp(-t / .032)) / SR * pd * vel
    y = partials(f * rat, am, t60, n, r.uniform(0, .4, 10), g)
    m = int(.12 * SR)
    hit = spectral_shape(r.standard_normal(m), [(40, -6), (180, 0), (600, -3), (1800, -8), (4500, -14 if size != 'shime' else -3), (12000, -30)])
    y[:m] += hit * np.exp(-np.arange(m) / SR / (.014 if size != 'shime' else .007)) * nz * 2.2 * vel ** 1.3
    k = int(.006 * SR)
    y[:k] += r.standard_normal(k) * np.hanning(2 * k)[k:] * .25 * vel ** 2
    if size == 'o':
        y += partials([f * .5], [.5], [.9], n, [0], g)
    y = soft_clip(y * (0.75 + .7 * vel), 1.0)
    if size != 'shime':
        y = eq(y, ('hp', 26), ('pk', 2600, .8, 2.5))
    return fade(y * vel, .0004, .08) * .62


@lru_cache(maxsize=None)
def rim(vel=.7, seed=0):
    """Stick on the drum rim (ka)."""
    r = rng(f'rim{seed}')
    n = int(.14 * SR)
    f = np.array([780, 1240, 1985, 2730, 3900]) * r.uniform(.97, 1.03)
    y = partials(f, [.8, 1, .7, .45, .25], [.07, .05, .045, .03, .02], n)
    k = int(.004 * SR)
    y[:k] += r.standard_normal(k) * .5
    return fade(y * vel, .0003, .02) * .3


@lru_cache(maxsize=None)
def woodblock(f=880.0, vel=.8, seed=0, long=1.0):
    r = rng(f'wb{f}{seed}')
    n = int(.4 * SR)
    f = f * 2 ** (r.normal(0, 6) / 1200)
    y = partials([f, f * 1.52, f * 2.74, f * 4.1], [1, .45, .35, .15], np.array([.10, .06, .04, .02]) * long, n)
    k = int(.005 * SR)
    y[:k] += spectral_shape(r.standard_normal(k), [(50, -20), (1500, 0), (6000, -6), (16000, -24)]) * np.linspace(1, 0, k) * .35
    return fade(y * vel, .0005, .03) * .6


@lru_cache(maxsize=None)
def hyoshigi(vel=.9, seed=0):
    """Hardwood clappers."""
    r = rng(f'hy{seed}')
    n = int(.5 * SR)
    f = np.array([1460, 2210, 3120, 4470, 6080, 7900]) * r.uniform(.985, 1.015)
    y = partials(f, [.7, 1, .75, .5, .35, .2], [.22, .16, .11, .07, .05, .03], n)
    k = int(.004 * SR)
    y[:k] += r.standard_normal(k) * np.linspace(1, 0, k) * .9
    return fade(y * vel, .0002, .05) * .4


@lru_cache(maxsize=None)
def tsuzumi(vel=.8, up=1.0, seed=0):
    """Hand drum whose pitch is squeezed upward: 'pon'."""
    r = rng(f'tz{seed}')
    n = int(.6 * SR)
    t = np.arange(n) / SR
    gl = np.cumsum(.16 * up * (1 - np.exp(-t / .05)) * np.exp(-t / .5)) / SR
    y = partials([268, 430, 590], [1, .4, .22], [.45, .2, .12], n, None, gl)
    k = int(.02 * SR)
    y[:k] += spectral_shape(r.standard_normal(k), [(50, -12), (500, 0), (2500, -4), (9000, -18)]) * np.exp(-np.arange(k) / SR / .004) * .5
    return fade(y * vel, .0005, .05) * .55


@lru_cache(maxsize=None)
def chappa(vel=.8, dur=1.8, seed=0, choke=False):
    """Small bronze hand cymbals: dense inharmonic partials over noise."""
    r = rng(f'cym{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.sort(np.exp(r.uniform(np.log(900), np.log(14000), 130)))
    a = r.uniform(.2, 1, 130) * np.exp(-((np.log(f) - np.log(4800)) / 1.0) ** 2)
    d = (dur * .95) / (1 + (f / 6000) ** 1.2) * r.uniform(.5, 1.3, 130)
    y = partials(f, a * .05, d, n, r.uniform(0, 6, 130))
    nz = spectral_shape(r.standard_normal(n), [(200, -40), (1500, -14), (4000, -2), (7000, 0), (12000, -4), (20000, -14)])
    y += nz * .16 * (np.exp(-t / .06) + .35 * np.exp(-t / (dur * .28)))
    if choke:
        y *= np.clip((.13 - t) / .03, 0, 1)
    return fade(y * vel, .0006, .1) * .55


# ------------------------------------------------------------------ bells. One set of ratios serves the temple bell,
# the bronze head of Shio's pole and Minato's little bell, so the motif is literally the same metal.
BELL_RATIOS = np.array([1.0, 1.478, 1.994, 2.536, 2.993, 3.41, 4.02, 4.79, 5.43, 6.31, 7.27, 8.22, 9.6, 11.3])
BELL_AMPS = np.array([.95, .34, .80, .42, .55, .36, .40, .30, .26, .20, .16, .12, .09, .06])


def bell(f=146.83, dur=8.0, vel=1.0, crack=0.0, seed=0, hum=True, beat=1.0):
    """Temple bell. Nominal pitch is the second partial group; hum an octave below; doublets beat slowly."""
    r = rng(f'bell{f:.1f}{seed}{crack}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    base = f / 1.994
    # the strike also wakes a ring of short-lived upper partials, so the bell speaks on small speakers
    rat = np.r_[BELL_RATIOS, 13.2, 15.1, 17.5, 20.4, 23.1, 26.7, 30.2]
    fr = base * rat
    am = np.r_[BELL_AMPS * np.array([1, 1, 1, 1.1, 1.2, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2, 2, 2]), np.array([.11, .10, .09, .08, .07, .06, .05])]
    t60 = 13.0 * (90 / np.maximum(fr, 60)) ** .55 + .5
    t60[14:] *= .45
    t60 = t60 * (1 - .94 * crack)
    sp = beat * np.r_[.35, .5, .62, .8, .9, 1.1, 1.3, 1.5, 1.8, 2.0, 2.3, 2.6, 3, 3.5, np.linspace(3.7, 5, 7)] * r.uniform(.8, 1.2, 21)
    ph = r.uniform(0, TAU, 21)
    y = partials(fr, am * .62, t60, n, ph) + partials(fr + sp, am * .42, t60 * .9, n, ph + .5)
    m = int(.25 * SR)
    st = spectral_shape(r.standard_normal(m), [(40, -10), (200, 0), (700, -4), (2500, -12), (8000, -26)])
    y[:m] += st * np.exp(-np.arange(m) / SR / .035) * .55 * vel
    if crack:
        bz = np.sin(TAU * fr[2] * t) * .4 + np.sin(TAU * fr[4] * 1.013 * t) * .4
        y += np.sign(bz) * np.abs(bz) ** .5 * np.exp(-t / .12) * .35 * crack
        y = eq(y, ('lp', 2600), ('pk', 430, 2, 5))
    y *= 1 - .6 * np.exp(-t / .004)
    return fade(y * vel, .001, .4) * .30


def suzu(vel=.8, seed=0, f=2960.0, shakes=((0, 1),), dur=1.4):
    """Tiny jingle bell: pellet clicks exciting high bell partials."""
    n = int(dur * SR)
    out = np.zeros(n)
    r = rng(f'suzu{seed}')
    for (tt, a) in shakes:
        for j in range(3):
            i = int((tt + j * r.uniform(.018, .045)) * SR)
            if i >= n:
                continue
            k = n - i
            fr = f / 1.994 * BELL_RATIOS[2:9] * r.uniform(.997, 1.003)
            out[i:] += partials(fr, np.array([1, .5, .6, .3, .3, .2, .1]) * a * (.7 ** j) * r.uniform(.8, 1.1), np.array([.8, .5, .6, .4, .3, .25, .2]), k, r.uniform(0, 6, 7))
    return fade(out * vel, .0008, .1) * .16


# ------------------------------------------------------------------ drone and impacts
def drone(dur, m=26, vel=.6, seed='', cluster=(0, 12, 13, 19), motion=.2):
    """Low, slightly sour bed: beating partials and a throat-like moving band."""
    r = rng(f'drone{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for i, c in enumerate(cluster):
        f0 = float(mtof(m + c))
        for ch in range(2):
            f = f0 * (1 + .0022 * smooth_noise(n, .5, r) + r.normal(0, .0012))
            ph = TAU * np.cumsum(f) / SR
            y = np.zeros(n)
            for k in range(1, 14):
                y += np.sin(k * ph + r.uniform(0, 6)) / k ** 1.15 * (1 + .5 * smooth_noise(n, motion * (1 + k / 6), r))
            out[:, ch] += y * [1, .7, .28, .25, .2][min(i, 4)]
    nz = np.stack([r.standard_normal(n), r.standard_normal(n)], 1)
    nz = eq(nz, ('bp', 170, 1.2)) * (1 + .6 * smooth_noise(n, .7, r))[:, None]
    out = eq(out + nz * 1.4, ('hp', 24), ('lp', 900, .6))
    return out * vel * .075


def sub_drop(f0=110, f1=32, dur=1.6, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / .07)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (dur * .33))
    return fade(soft_clip(y * 1.6), .001, .15) * vel * .55


def impact(vel=1.0, seed=0, dark=0.0, dur=2.4, metal=.0):
    """Layered hit: sub drop, body, broadband crack, debris tail. Stereo."""
    r = rng(f'imp{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    s = sub_drop(130, 33, min(dur, 1.8), 1.0)
    out[:len(s)] += s[:, None] * 0.9
    body = partials([62, 97, 148, 221], [.9, .6, .4, .25], [.7, .5, .35, .25], n)
    out += body[:, None] * .5
    for ch in range(2):
        nz = r.standard_normal(n)
        c = spectral_shape(nz, [(40, -4), (300, 0), (2000, -3), (6000, -8 - 10 * dark), (16000, -22 - 14 * dark)])
        out[:, ch] += c * (np.exp(-t / .028) * .9 + .12 * np.exp(-t / .35))
        rum = spectral_shape(nz, [(30, 0), (90, 0), (300, -14), (1500, -40)])
        out[:, ch] += rum * np.exp(-t / .6) * 1.1 * (1 - np.exp(-t / .03))
        if metal:
            f = np.sort(np.exp(r.uniform(np.log(300), np.log(7000), 40)))
            out[:, ch] += partials(f, r.uniform(.2, 1, 40) * .05 * metal, r.uniform(.4, 1.6, 40), n, r.uniform(0, 6, 40))
    out = soft_clip(out * 1.1)
    return fade(out, .0006, .2) * vel * .62
