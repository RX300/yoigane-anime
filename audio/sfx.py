"""Sound effects, all synthesized: weather, lamps, fire, water, creatures."""
import numpy as np
from scipy import signal

import instruments as I
from dsp import SR, TAU, env, eq, fade, mtof, pan_gains, place, rng, smooth_noise, soft_clip, spectral_shape, tv_filter

FB = np.fft.rfftfreq(4096, 1 / SR)


def sweep_noise(n, fc, q, r, hop=240):
    """White noise through band-passes whose centre follows fc (array at audio rate or list of them)."""
    nz = r.standard_normal(n)
    nf = n // hop + 2
    ii = np.minimum(np.arange(nf) * hop, n - 1)
    c = fc[ii]
    qq = q[ii] if np.ndim(q) else np.full(nf, q)

    def hf(i0, i1):
        cc = c[i0:i1][:, None]
        bw = cc / qq[i0:i1][:, None]
        return (1j * bw * FB) / (cc * cc - FB * FB + 1j * bw * FB + 1e-9)
    return tv_filter(nz, hf, nf, hop, 4096)


def widen(y, r, amt=.012):
    """Mono to wide stereo with a short all-pass-like decorrelation."""
    k = int(amt * SR)
    h = r.standard_normal((2, k)) * np.exp(-np.arange(k) / (k * .25))
    h /= np.sqrt((h ** 2).sum(1, keepdims=True))
    return np.stack([signal.fftconvolve(y, h[0])[:len(y)], signal.fftconvolve(y, h[1])[:len(y)]], 1)


# ------------------------------------------------------------------ weather
def wind(dur, strength=.6, seed='', whistle=.5, dark=0.0):
    r = rng('wind' + seed)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    g = smooth_noise(n, .35, r)
    gust = .62 + .26 * g + .10 * smooth_noise(n, 1.6, r)
    gust = np.clip(gust, .12, 1.5)
    for ch in range(2):
        fc = (330 - 120 * dark) * 2 ** (.75 * g + .25 * smooth_noise(n, .8, r))
        y = sweep_noise(n, fc, 1.1, r) * 1.0
        hiss = eq(r.standard_normal(n), ('hp', 1800, .6), ('lp', 5200)) * .050
        low = eq(r.standard_normal(n), ('lp', 160, .7)) * .9
        out[:, ch] = (y + hiss * gust + low * .35) * gust ** 1.3
    for j in range(2):
        fw = (720 + 330 * j) * 2 ** (.35 * g + .10 * smooth_noise(n, 1.2, r))
        w = sweep_noise(n, fw, 26.0, r) * np.clip(gust - .55, 0, 2) ** 1.5
        gl, gr = pan_gains(-.5 + j)
        out[:, 0] += w * gl * whistle * 1.6
        out[:, 1] += w * gr * whistle * 1.6
    return out * strength * .55


def snowfall(dur, seed=''):
    """A hush of grains: thousands of tiny soft ticks."""
    r = rng('snow' + seed)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for _ in range(int(dur * 70)):
        i = int(r.uniform(0, n - 600))
        m = int(r.uniform(.002, .008) * SR)
        g = r.exponential(1.0) * .012
        x = r.standard_normal(m) * np.hanning(m) * g
        gl, gr = pan_gains(r.uniform(-1, 1))
        out[i:i + m, 0] += x * gl
        out[i:i + m, 1] += x * gr
    bed = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * .0035
    return eq(out + bed, ('hp', 2600), ('lp', 9000))


# ------------------------------------------------------------------ lamps
def lamp_off(vel=.8, seed=0, close=0.5):
    """A breath takes the flame: soft puff, wick hiss, the glow's tone falls away. Closer lamps are lower and bigger."""
    r = rng(f'loff{seed}')
    n = int(.9 * SR)
    t = np.arange(n) / SR
    fc = (900 - 350 * close) * np.exp(-t / .09) + 170
    puff = sweep_noise(n, fc, .9, r) * np.minimum(t / .006, 1) * np.exp(-t / (.07 + .05 * close)) * 2.4
    thump = np.sin(TAU * np.cumsum(58 + 90 * np.exp(-t / .03)) / SR) * np.exp(-t / .09) * (.25 + .9 * close)
    hiss = eq(r.standard_normal(n), ('hp', 4200), ('lp', 10500)) * np.exp(-t / .22) * .07 * (1 + .6 * smooth_noise(n, 18, r)) * np.minimum(t / .02, 1)
    f = 620 * 2 ** (-.9 * (1 - np.exp(-t / .12)) - .2 * r.random())
    tone = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .13) * .10
    return fade((puff + thump + hiss + tone) * vel, .0008, .1) * .55


def lamp_on(vel=.7, seed=0):
    """Wick catches: tiny scratch, warm bloom and a soft chime a fifth apart each time."""
    r = rng(f'lon{seed}')
    n = int(1.5 * SR)
    t = np.arange(n) / SR
    cr = eq(r.standard_normal(n), ('hp', 2500), ('lp', 9000)) * np.exp(-t / .012) * .5
    bl = sweep_noise(n, 240 + 500 * np.exp(-t / .1), .9, r) * np.minimum(t / .02, 1) * np.exp(-t / .16) * 1.2
    m = [74, 78, 81, 83, 86, 90][seed % 6]
    f = float(mtof(m))
    ch = (np.sin(TAU * f * t) + .35 * np.sin(TAU * f * 2.0 * t) + .16 * np.sin(TAU * f * 3.01 * t)) * np.minimum(t / .015, 1) * np.exp(-t / .38) * .13
    return fade((cr + bl + ch) * vel, .0008, .2) * .6


# ------------------------------------------------------------------ fire
def hearth(dur, seed=''):
    r = rng('hearth' + seed)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for ch in range(2):
        b = eq(r.standard_normal(n), ('lp', 320, .7), ('hp', 60))
        out[:, ch] = b * (.6 + .3 * smooth_noise(n, 6, r)) * .30
    rate = 0
    tt = 0.0
    while tt < dur - .1:
        tt += r.exponential(.075) if r.random() < .75 else r.exponential(.35)
        i = int(tt * SR)
        if i > n - 4000:
            break
        a = min(r.pareto(1.6) * .10, 1.0)
        m = int(r.uniform(.0015, .010) * SR)
        x = r.standard_normal(m) * np.exp(-np.arange(m) / (m * .25))
        x = np.concatenate([x, np.zeros(2400)])
        f = r.uniform(900, 4200)
        x = signal.sosfilt(np.array([np.r_[signal.butter(1, [f * .7, min(f * 1.6, 9000)], 'bp', fs=SR)[0], signal.butter(1, [f * .7, min(f * 1.6, 9000)], 'bp', fs=SR)[1]]]), x)
        gl, gr = pan_gains(r.uniform(-.6, .6))
        e = min(len(x), n - i)
        out[i:i + e, 0] += x[:e] * a * gl
        out[i:i + e, 1] += x[:e] * a * gr
    return out * .55


def flame_roar(dur, levels, seed='', pan=None, bright=1.0):
    """Turbulent fire: low flutter plus a bright tearing layer, both following `levels` breakpoints."""
    r = rng('flame' + seed)
    n = int(dur * SR)
    lv = env(levels, n, shape='cos')
    fl = 1 + .45 * smooth_noise(n, 11, r) + .25 * smooth_noise(n, 27, r)
    lo = eq(r.standard_normal(n), ('lp', 260, .7), ('hp', 38)) * 2.2
    mid = sweep_noise(n, 420 + 900 * lv, .8, r) * 1.0
    hi = eq(r.standard_normal(n), ('hp', 2400, .6), ('lp', 9500)) * .16 * bright * np.clip(1 + .9 * smooth_noise(n, 40, r), 0, 3)
    y = (lo + mid + hi * lv) * lv * np.clip(fl, .1, 2.5)
    st = np.stack([y, y], 1) * .75 + widen(y, r) * .35
    if pan is not None:
        p = env(pan, n, shape='cos')
        gl, gr = pan_gains(p)
        st = st * np.stack([gl, gr], 1) * 1.414
    return st * .42


def whoosh(dur=.5, f0=400, f1=2600, peak=.6, seed='', q=1.1, pan0=-.6, pan1=.6, vel=.8, low=0.0):
    """Air moved by a body or pole. Level peaks at `peak` (fraction of dur)."""
    r = rng('whoosh' + str(seed))
    n = int(dur * SR)
    u = np.arange(n) / n
    e = np.where(u < peak, (u / peak) ** 2.2, np.exp(-(u - peak) / (1 - peak) * 4.5))
    fc = f0 + (f1 - f0) * np.where(u < peak, (u / peak) ** 1.5, 1 - .75 * (u - peak) / (1 - peak))
    y = sweep_noise(n, fc, q, r) * e * 1.8
    if low:
        y += eq(r.standard_normal(n), ('lp', 180)) * e * low * 2
    gl, gr = pan_gains(pan0 + (pan1 - pan0) * u)
    return np.stack([y * gl, y * gr], 1) * vel


# ------------------------------------------------------------------ creatures and comedy
def kite(vel=.8, seed=0, dur=1.1, f0=3350, f1=2050, trill=1.0):
    """Black kite: a thin whistle that holds, then falls through a loose trill."""
    r = rng(f'kite{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    hold = np.clip((u - .22) / .78, 0, 1)
    ph = TAU * np.cumsum(17 - 6 * u + .8 * smooth_noise(n, 3, r)) / SR
    dep = trill * np.clip((u - .28) / .2, 0, 1)
    f = f0 * (f1 / f0) ** (hold ** .9) * (1 + .03 * np.sin(np.pi * np.clip(u / .22, 0, 1))) * (1 + .045 * dep * np.sin(ph)) * (1 + .003 * smooth_noise(n, 20, r))
    p = TAU * np.cumsum(f) / SR
    y = np.sin(p) + .06 * np.sin(2 * p + .4) + sweep_noise(n, f, 22.0, r) * .35
    e = np.clip(u / .05, 0, 1) * np.clip((1 - u) / .25, 0, 1) ** .8 * (1 - .30 * dep * (.5 + .5 * np.sin(ph + 1.2)))
    return fade(y * e, .004, .03) * vel * .30


def slide_whistle(dur, f0, f1, vel=.7, seed=0, curve=1.0, wob=0.0):
    r = rng(f'sw{seed}')
    n = int(dur * SR)
    u = np.arange(n) / n
    f = f0 * (f1 / f0) ** (u ** curve) * (1 + wob * .02 * np.sin(TAU * 7 * u * dur) * np.clip((u - .55) / .2, 0, 1))
    ph = TAU * np.cumsum(f) / SR
    y = np.sin(ph) + .22 * np.sin(2 * ph + .3) + .12 * np.sin(3 * ph + 1) + .03 * np.sin(5 * ph)
    nz = sweep_noise(n, f, 9.0, r) * .55 + eq(r.standard_normal(n), ('bp', 3000, .6)) * .03
    e = np.clip(u * dur / .025, 0, 1) * np.clip((1 - u) * dur / .05, 0, 1) * (.9 + .1 * np.sin(TAU * 5.5 * u * dur))
    return (y * .5 + nz) * e * vel * .34


def boing(vel=.8, seed=0, f=190, dur=.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fm = f * (1 + .55 * np.exp(-t / .28) * np.sin(TAU * (13 - 4 * t) * t) + .35 * np.exp(-t / .05))
    ph = TAU * np.cumsum(fm) / SR
    y = np.sin(ph) + .6 * np.sin(2 * ph + .5) + .4 * np.sin(3 * ph + 1) + .25 * np.sin(5.1 * ph)
    return fade(soft_clip(y * np.exp(-t / .26)) * np.minimum(t / .002, 1), .001, .08) * vel * .4


def pop(vel=.8, f0=420, f1=1500, dur=.07):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(TAU * np.cumsum(f0 * (f1 / f0) ** (t / dur)) / SR) * np.exp(-t / .022)
    return fade(y, .001, .01) * vel * .7


def flap(dur, rate=9.0, vel=.5, seed=0, fc=500, pan0=0.0, pan1=0.0):
    """Wing beats."""
    r = rng(f'flap{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = TAU * np.cumsum(rate * (1 + .06 * smooth_noise(n, 2, r))) / SR
    am = np.clip(np.sin(ph), 0, 1) ** 3
    y = eq(r.standard_normal(n), ('bp', fc, .8)) * am + eq(r.standard_normal(n), ('bp', fc * 5, .9)) * am ** 2 * .22
    e = np.clip(t / .04, 0, 1) * np.clip((dur - t) / .2, 0, 1)
    gl, gr = pan_gains(pan0 + (pan1 - pan0) * t / dur)
    return np.stack([y * e * gl, y * e * gr], 1) * vel * 1.5


# ------------------------------------------------------------------ fear
def heartbeat(vel=.8, seed=0):
    n = int(.55 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for (dt, f, a, d) in ((0, 62, 1.0, .075), (.17, 50, .72, .085)):
        k = int(dt * SR)
        tt = t[:n - k]
        y = np.sin(TAU * np.cumsum(f * (1 + .7 * np.exp(-tt / .02))) / SR) * np.exp(-tt / d)
        y += .30 * np.sin(TAU * f * 2.3 * tt) * np.exp(-tt / .04) + .14 * np.sin(TAU * f * 4.1 * tt) * np.exp(-tt / .02)
        out[k:] += y * a * np.minimum(tt / .004, 1)
    return fade(soft_clip(out * 1.4), .001, .05) * vel * .6


def creak(vel=.5, seed=0, dur=.7):
    """Wood under load: stick-slip pulses through plank resonances."""
    r = rng(f'creak{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    rate = 38 + 60 * np.sin(np.pi * t / dur) ** 2 * (1 + .25 * smooth_noise(n, 6, r))
    ph = np.cumsum(rate) / SR
    imp = np.diff(np.floor(ph), prepend=0)
    imp = imp * (1 + .5 * r.standard_normal(n))
    y = np.zeros(n)
    for f, q, a in ((310, 9, 1), (540, 12, .9), (870, 14, .8), (1430, 14, .5), (2300, 12, .25)):
        y += eq(imp, ('bp', f * r.uniform(.92, 1.08), q)) * a * 9
    return fade(y * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** .7, .01, .08) * vel * .5


def reverse_bell(dur=2.0, vel=.8, f=233.08):
    y = I.bell(f, dur + .6, 1.0, seed=7, beat=2.0)[::-1]
    y = y[-int(dur * SR):]
    n = len(y)
    u = np.arange(n) / n
    y2 = I.bell(f * 2 ** (1 / 12), dur + .6, .8, seed=8, beat=3.0)[::-1][-n:]
    z = (y + .7 * y2) * (u ** 2.2) * 2.2
    return np.stack([z, np.roll(z, 400)], 1) * vel


def scare(vel=1.0):
    """The mask: impact, shrieking cluster, splintering metal, and a throat noise that falls."""
    r = rng('scare')
    dur = 1.35
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    imp = I.impact(1.0, 31, 0, 2.0, metal=1.0)
    place(out, imp, 0, 1.0)
    for i, m in enumerate((62, 63, 68, 69, 74, 75, 80, 81, 86, 87, 92, 93)):
        y = I.bowed(m, .95, .9, 3, .012, .35, .6, trem=0, seed=f'sc{i}', sect='vn', slide=-1.2 + .25 * (i % 5), bright=1.5)
        place(out, y, 0.0, .40)
    f0 = 210 * np.exp(-t / 1.1) * (1 + .05 * smooth_noise(n, 40, r))
    ph = TAU * np.cumsum(f0) / SR
    src = np.zeros(n)
    for k in range(1, 40):
        src += np.sin(k * ph + k * k * .3) / k ** .35
    src = src * (1 + .8 * np.sign(np.sin(TAU * 47 * t))) + 2.5 * r.standard_normal(n)
    nf = n // 240 + 2

    def hf(i0, i1):
        u = (np.arange(i0, i1) * 240 / n)[:, None]
        g = 0
        for fc, bw, a in ((820 - 420 * u, 130, 1), (1500 - 350 * u, 180, .9), (2900 - 500 * u, 300, .7), (4200 - 300 * u, 500, .4)):
            g = g + a * (1j * bw * FB) / (fc * fc - FB * FB + 1j * bw * FB + 1e-9)
        return g
    th = tv_filter(src, hf, nf, 240, 4096) * np.clip(t / .01, 0, 1) * np.exp(-t / .5) * .32
    out += th[:, None] * .8
    out = soft_clip(out * 1.1)
    return fade(out, .0008, .3) * vel * .85


# ------------------------------------------------------------------ water
def surf(dur, levels, seed='', pan=None):
    """Sea swell: brightness follows level."""
    r = rng('surf' + seed)
    n = int(dur * SR)
    lv = env(levels, n, shape='cos')
    out = np.zeros((n, 2))
    for ch in range(2):
        a = sweep_noise(n, 220 + 900 * lv, .55, r) * lv * 1.5
        b = eq(r.standard_normal(n), ('hp', 1800, .6), ('lp', 9000)) * .22 * lv ** 1.8 * (1 + .3 * smooth_noise(n, 9, r))
        c = eq(r.standard_normal(n), ('lp', 95), ('hp', 26)) * 2.2 * lv ** 1.2
        out[:, ch] = a + b + c
    return out * .42


def wave_break(vel=1.0):
    """The crest falls: boom, curtain of foam, then hiss running up the shore."""
    r = rng('wbreak')
    dur = 3.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch in range(2):
        cr = spectral_shape(r.standard_normal(n), [(40, -3), (200, 0), (900, -1), (3000, -4), (8000, -8), (18000, -22)])
        out[:, ch] = cr * (np.minimum(t / .004, 1) * (.8 * np.exp(-t / .10) + .55 * np.exp(-t / .55) * (1 + .35 * smooth_noise(n, 14, r))))
        out[:, ch] += eq(r.standard_normal(n), ('hp', 3200), ('lp', 11000)) * .30 * np.minimum(t / .12, 1) * np.exp(-t / .9) * (1 + .5 * smooth_noise(n, 30, r))
        out[:, ch] += eq(r.standard_normal(n), ('lp', 110), ('hp', 25)) * 4.5 * np.exp(-t / .5) * (1 - np.exp(-t / .02))
    s = I.sub_drop(95, 30, 2.2, 1.0)
    out[:len(s)] += s[:, None]
    # spray drops
    for _ in range(150):
        i = int((.1 + r.exponential(.5)) * SR)
        m = int(.02 * SR)
        if i + m < n:
            tt = np.arange(m) / SR
            f = r.uniform(900, 3600)
            x = np.sin(TAU * (f * tt + 9000 * tt ** 2)) * np.exp(-tt / .004) * r.uniform(.02, .10)
            gl, gr = pan_gains(r.uniform(-1, 1))
            out[i:i + m, 0] += x * gl
            out[i:i + m, 1] += x * gr
    return fade(soft_clip(out * .8), .0006, .6) * vel * .70


def drip(vel=.6, f=1300, seed=0):
    n = int(.5 * SR)
    t = np.arange(n) / SR
    y = np.sin(TAU * np.cumsum(f * (1 + .55 * (1 - np.exp(-t / .03)))) / SR) * np.exp(-t / .045) * np.minimum(t / .002, 1)
    y += .35 * np.sin(TAU * f * 2.7 * t) * np.exp(-t / .012)
    return fade(y * vel, .0008, .05) * .4


def river(dur, seed='', vel=.5):
    """Small water: bubbling resonators over a soft wash."""
    r = rng('river' + seed)
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = eq(r.standard_normal(n), ('bp', 520, .5)) * (.5 + .22 * smooth_noise(n, .5, r)) * .16
        out[:, ch] += eq(r.standard_normal(n), ('bp', 2600, .5)) * (.4 + .2 * smooth_noise(n, .7, r)) * .028
    for _ in range(int(dur * 26)):
        i = int(r.uniform(0, n - 4000))
        m = int(r.uniform(.015, .06) * SR)
        tt = np.arange(m) / SR
        f = np.exp(r.uniform(np.log(380), np.log(1700)))
        x = np.sin(TAU * (f * tt + f * r.uniform(1, 5) * tt ** 2)) * np.sin(np.pi * np.arange(m) / m) ** 1.5 * r.exponential(.022)
        gl, gr = pan_gains(r.uniform(-1, 1))
        out[i:i + m, 0] += x * gl
        out[i:i + m, 1] += x * gr
    return out * vel


def bird(vel=.4, seed=0):
    r = rng(f'bird{seed}')
    n = int(.9 * SR)
    out = np.zeros(n)
    tt = 0.0
    for j in range(r.integers(3, 6)):
        m = int(r.uniform(.05, .12) * SR)
        i = int(tt * SR)
        if i + m >= n:
            break
        u = np.arange(m) / m
        f = r.uniform(3200, 4300) * (1 + r.uniform(-.25, .3) * u + .04 * np.sin(TAU * 28 * u * m / SR))
        out[i:i + m] += np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * u) ** 1.3
        tt += m / SR + r.uniform(.03, .09)
    return out * vel * .16
