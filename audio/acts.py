"""Sounds of the three fighters (Shio's bell-headed ferry pole and boat, Narumi's drum, Hota's lantern building) and of the paper demon."""
import numpy as np

import instruments as I
import sfx as X
from dsp import SR, TAU, eq, env, fade, pan_gains, rng, smooth_noise, soft_clip, spectral_shape

POLE_HZ = 220.0      # nominal of the bronze pole head: the dominant of D, so the temple bell can answer it


# ------------------------------------------------------------------ Shio: pole and water
def pole_bell(vel=1.0, dur=6.0, size=1.0, seed=0):
    """The pole head struck: the temple bell's ratios a fourth below, long and inharmonic. size > 1 adds deeper layers."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = I.bell(POLE_HZ, dur, 1.0, 0, 20 + seed, beat=1.3) * 1.0
    y = y + .5 * I.bell(POLE_HZ / 2, dur, 1.0, 0, 30 + seed, beat=1.0)
    r = rng(f'pole{seed}{size}')
    kn = I.partials([174, 291, 466, 705], [.5, .4, .3, .2], [.09, .07, .05, .03], n)            # the wooden shaft knocks first
    kn[:160] += r.standard_normal(160) * np.linspace(1, 0, 160) * .4
    y = y + kn * .35
    if size > 1:
        y = y + (size - 1) * (I.bell(POLE_HZ / 4, dur, 1.0, 0, 40 + seed, beat=.8) * .9 + I.bell(POLE_HZ * 1.5, dur, .8, 0, 50 + seed, beat=1.6) * .35)
        y = y + (size - 1) * .9 * np.sin(TAU * np.cumsum(41 + 130 * np.exp(-t / .03)) / SR) * np.exp(-t / .45)
        y = np.tanh(y * .9) / .9
    st = np.stack([y, y], 1)
    k = int(.0007 * SR * 12)
    st[k:, 1] = .8 * st[k:, 1] + .2 * y[:-k]
    return fade(st, .0006, .5) * vel


def pole_lift(dur=10 / 24, vel=.8):
    """Wet pole lifted off planks: one short drag, then only drops and the bronze stirring in the air."""
    r = rng('polelift')
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    drag = np.exp(-((t - .05) / .045) ** 2)
    ph = np.cumsum(95 + 60 * smooth_noise(n, 16, r) * .4) / SR
    imp = np.diff(np.floor(ph), prepend=0) * (1 + .7 * r.standard_normal(n))
    y = np.zeros(n)
    for f, q, a in ((230, 5, 1.0), (410, 7, .9), (690, 8, .7), (1100, 9, .4)):
        y += eq(imp, ('bp', f, q)) * a * 8
    y = (y + X.sweep_noise(n, 700 + 500 * u, 1.0, r) * .6) * drag
    for k in range(5):
        i = int((.12 + .055 * k + .02 * r.random()) * SR)
        m = min(int(.03 * SR), n - i)
        tt = np.arange(m) / SR
        y[i:i + m] += np.sin(TAU * (r.uniform(900, 1900) * tt + 9000 * tt ** 2)) * np.exp(-tt / .006) * .30
    hum = I.partials(POLE_HZ / 1.994 * I.BELL_RATIOS[2:8], [.2, .14, .12, .1, .08, .06], np.full(6, 9.0), n, r.uniform(0, 6, 6)) * u ** 2
    return fade(y * .45 + hum * .16, .006, .004) * vel


def plank_knock(vel=.9):
    """The pole's butt planted on thick planks: one solid wooden knock."""
    r = rng('plank')
    n = int(.6 * SR)
    t = np.arange(n) / SR
    y = I.partials([86, 139, 226, 358, 545, 790], [1, .9, .75, .55, .35, .2], [.24, .19, .14, .10, .07, .05], n, r.uniform(0, .6, 6))
    y += np.sin(TAU * np.cumsum(52 + 90 * np.exp(-t / .015)) / SR) * np.exp(-t / .10) * .9
    y[:180] += r.standard_normal(180) * np.linspace(1, 0, 180) * .6
    y += eq(r.standard_normal(n), ('lp', 1300), ('hp', 120)) * np.exp(-t / .012) * .9
    return fade(soft_clip(y * .8), .0004, .08) * vel * .7


def lapping(dur, vel=.5, seed='lap', rate=1.1):
    """Water against wood: slow slaps and bubbles."""
    r = rng('lap' + seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = X.river(dur, 'lap' + seed, 1.0) * .8
    tt = r.uniform(0, .25)
    while tt < dur - .35:
        m = int(r.uniform(.22, .42) * SR)
        i = int(tt * SR)
        w = np.arange(m) / SR
        g = r.uniform(.4, 1.0)
        x = eq(r.standard_normal(m), ('bp', r.uniform(260, 520), .9)) * np.minimum(w / .03, 1) * np.exp(-w / .09) * g
        x += X.sweep_noise(m, 700 + 900 * np.minimum(w / .12, 1), 1.2, r) * np.minimum(w / .05, 1) * np.exp(-w / .07) * .35 * g
        gl, gr = pan_gains(r.uniform(-.7, .7))
        e = min(m, n - i)
        out[i:i + e, 0] += x[:e] * gl
        out[i:i + e, 1] += x[:e] * gr
        tt += (1 / rate) * r.uniform(.45, .8)
    return fade(out, .05, .2) * vel


def hull_creak(dur=.8, vel=.7, seed=0):
    """Ferry planks under load."""
    r = rng(f'hull{seed}')
    n = int(dur * SR)
    u = np.arange(n) / n
    ph = np.cumsum(22 + 46 * np.sin(np.pi * u) ** 2 * (1 + .3 * smooth_noise(n, 7, r))) / SR
    imp = np.diff(np.floor(ph), prepend=0) * (1 + .6 * r.standard_normal(n))
    y = np.zeros(n)
    for f, q, a in ((128, 8, 1.2), (212, 9, 1.0), (355, 11, .9), (610, 12, .6), (980, 12, .35)):
        y += eq(imp, ('bp', f * r.uniform(.94, 1.06), q)) * a * 9
    return fade(y * np.sin(np.pi * u) ** .6, .01, .06) * vel * .5


def water_rush(dur, levels, seed='rush', f0=350, f1=2200, pan=(0.0, 0.0)):
    """Water torn along a hull; brightness follows level."""
    r = rng('rush' + seed)
    n = int(dur * SR)
    lv = env(levels, n, shape='cos')
    u = np.arange(n) / n
    y = X.sweep_noise(n, f0 + (f1 - f0) * lv, .7, r) * lv * 1.4
    y += eq(r.standard_normal(n), ('hp', 2500, .6), ('lp', 9500)) * .22 * lv ** 1.6 * np.clip(1 + .5 * smooth_noise(n, 30, r), 0, 3)
    y += eq(r.standard_normal(n), ('lp', 160), ('hp', 35)) * 1.6 * lv * np.clip(1 + .5 * smooth_noise(n, 9, r), 0, 3)
    gl, gr = pan_gains(pan[0] + (pan[1] - pan[0]) * u)
    return fade(np.stack([y * gl, y * gr], 1) * .9 + X.widen(y, r) * .25, .01, .03) * .5


def splash(vel=.8, seed=0, dur=.7):
    r = rng(f'splash{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = X.sweep_noise(n, 500 + 1900 * np.exp(-t / .12), .8, r) * np.minimum(t / .006, 1) * np.exp(-t / .13) * 1.6
    th = np.sin(TAU * np.cumsum(62 + 110 * np.exp(-t / .02)) / SR) * np.exp(-t / .08)
    out += (th * .7)[:, None]
    for _ in range(30):
        i = int((.05 + r.exponential(.14)) * SR)
        m = int(.018 * SR)
        if i + m < n:
            tt = np.arange(m) / SR
            x = np.sin(TAU * (r.uniform(800, 3000) * tt + 8000 * tt ** 2)) * np.exp(-tt / .004) * r.uniform(.05, .2)
            gl, gr = pan_gains(r.uniform(-.8, .8))
            out[i:i + m, 0] += x * gl
            out[i:i + m, 1] += x * gr
    return fade(out, .0006, .1) * vel * .6


# ------------------------------------------------------------------ Narumi: two heavy drumsticks
def stick_whir(dur=1.0, vel=.8):
    """Heavy sticks circling: two wooden whirs on opposite sides, turning faster."""
    r = rng('whir')
    n = int(dur * SR)
    u = np.arange(n) / n
    out = np.zeros((n, 2))
    ph = TAU * np.cumsum(2.6 + 4.6 * u ** 1.2) / SR
    for s in (0, 1):
        a = .5 + .5 * np.sin(ph + np.pi * s)
        fc = 240 + 330 * a + 160 * u
        y = X.sweep_noise(n, fc, 2.2, r) * (a ** 2.2) * 2.4
        y += np.sin(TAU * np.cumsum(96 + 42 * a) / SR) * a ** 3 * .30
        y += X.sweep_noise(n, fc * 3.1, 3.0, r) * a ** 3 * .5
        gl, gr = pan_gains(.85 * np.sin(ph + np.pi * s + .8))
        out[:, 0] += y * gl
        out[:, 1] += y * gr
    return fade(out * (.35 + .65 * u)[:, None], .03, .006) * vel * .55


def arms_down(dur=8 / 24, vel=.9):
    """Rush of air as both arms fall: it sinks in pitch and swells into the stroke."""
    r = rng('armsdown')
    n = int(dur * SR)
    u = np.arange(n) / n
    out = np.zeros((n, 2))
    for ch in range(2):
        y = X.sweep_noise(n, 2300 - 1800 * u ** .8, .9, r) * (.10 + u ** 1.8) * 1.7
        y += eq(r.standard_normal(n), ('lp', 190), ('hp', 35)) * u ** 2 * 2.0
        out[:, ch] = y
    return fade(out, .005, .003) * vel * .6


def barrel_stroke(weight=1.0, both=False, dur=3.4, seed=0):
    """A big barrel drum. weight sets how hard and how long; both = two sticks landing a hair apart, the span answering."""
    r = rng(f'barrel{seed}{weight}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    rat = np.array([1, 1.593, 2.136, 2.296, 2.653, 2.918, 3.156, 3.6])
    g = np.cumsum(np.exp(-t / .05)) / SR * (.25 + .55 * weight)
    for s, (dt, p) in enumerate(((0.0, -.12), (.0065, .14)) if both else ((0.0, 0.0),)):
        k = int(dt * SR)
        m = n - k
        skin = I.partials(49.0 * rat, np.array([1, .75, .5, .42, .3, .25, .2, .14]) * (.5 + .5 * weight), (.5 + 1.0 * weight) * 1.6 / (1 + .5 * np.arange(8)), m, r.uniform(0, .5, 8), g[:m])
        shell = I.partials([137, 224, 316, 448, 640], [.5, .45, .32, .22, .12], [.30, .22, .16, .12, .08], m, r.uniform(0, 1, 5)) * .55
        hit = spectral_shape(r.standard_normal(m), [(40, -6), (160, 0), (900, -2), (2600, -6 + 3 * weight), (6000, -16), (12000, -30)]) * np.exp(-t[:m] / (.010 + .010 * weight)) * (.5 + .9 * weight)
        gl, gr = pan_gains(p)
        y = skin + shell + hit
        out[k:, 0] += y * gl * 1.15
        out[k:, 1] += y * gr * 1.15
    air = np.stack([eq(r.standard_normal(n), ('lp', 190), ('hp', 24)) for _ in range(2)], 1)
    out += air * (np.exp(-t / (.10 + .22 * weight)) * (1 - np.exp(-t / .010)))[:, None] * (.4 + 2.2 * weight ** 2)
    if both:
        sub = np.sin(TAU * np.cumsum(36 + 105 * np.exp(-t / .045)) / SR) * np.exp(-t / .62)
        planks = I.partials([92, 118, 173, 241, 332, 455, 611, 823], [.8, .9, .8, .7, .6, .5, .4, .3], [.9, .7, .55, .42, .33, .25, .19, .14], n, r.uniform(0, 1, 8))
        out += (sub * 1.1 + planks * .40)[:, None]
        for ch in range(2):
            out[:, ch] += spectral_shape(r.standard_normal(n), [(40, -4), (250, 0), (1500, -3), (5000, -11), (12000, -26)]) * (.9 * np.exp(-t / .024) + .28 * np.exp(-t / .18))
    return fade(soft_clip(out * .95), .0005, .4) * (.34 + .46 * weight)


def hoop_stroke(vel=.8, seed=0, pan=0.0, echoes=4, gap=.205):
    """Stick on the wooden hoop, answered by the valley."""
    n = int((gap * echoes + .6) * SR)
    out = np.zeros((n, 2))
    r = rng(f'hoop{seed}')
    m = int(.22 * SR)
    f = np.array([540, 910, 1480, 2240, 3300]) * r.uniform(.98, 1.02)
    y = I.partials(f, [.8, 1, .7, .4, .2], [.12, .09, .06, .04, .02], m)
    y[:150] += r.standard_normal(150) * np.linspace(1, 0, 150) * .6
    for e in range(echoes + 1):
        x = y if e == 0 else eq(y, ('lp', 3200 / (1 + .6 * e), .7))
        gl, gr = pan_gains(pan * (1 if e % 2 == 0 else -1) * (1 - .1 * e))
        i = int(e * gap * SR)
        out[i:i + m, 0] += x * gl * .52 ** e
        out[i:i + m, 1] += x * gr * .52 ** e
    return fade(out, .0004, .05) * vel * .55


def arrow_feathers(dur=20 / 24, vel=.8):
    """A wall of fletchings going past: hundreds of short soft flutters, centre to both sides."""
    r = rng('feathers')
    n = int((dur + .35) * SR)
    out = np.zeros((n, 2))
    beds = [eq(r.standard_normal(n + SR), ('bp', f, .9)) for f in (480, 800, 1300, 2100, 3300)]
    for _ in range(150):
        u = r.beta(1.4, 1.7)
        i = int(u * dur * SR)
        m = int(r.uniform(.07, .20) * SR)
        if i + m >= n:
            continue
        b = beds[r.integers(5)]
        k = int(r.integers(len(b) - m))
        w = np.arange(m) / m
        fl = .5 + .5 * np.sin(TAU * r.uniform(24, 46) * np.arange(m) / SR + r.uniform(0, 6))
        x = b[k:k + m] * fl ** 3 * np.sin(np.pi * w ** .7) * min(r.exponential(.9) + .15, 2.5)
        side = 1 if r.random() < .5 else -1
        p = side * (.05 + .9 * w)
        gl, gr = pan_gains(p)
        out[i:i + m, 0] += x * gl
        out[i:i + m, 1] += x * gr
    t = np.arange(n) / SR
    e = np.clip(t / .06, 0, 1) * np.clip((dur + .2 - t) / .35, 0, 1) ** 1.2
    for ch in range(2):
        out[:, ch] += X.sweep_noise(n, 900 - 350 * np.clip(t / dur, 0, 1), .7, r) * e * .32
    return fade(eq(out, ('hp', 220), ('lp', 3600), ('lp', 6000)), .004, .1) * vel * .30


def bamboo_crack(vel=.8, seed=0, size=1.0):
    """One culm splitting: a hard pop with its tube ringing, then fibres tearing."""
    r = rng(f'bamboo{seed}')
    n = int(.36 * SR)
    t = np.arange(n) / SR
    f = np.array([520, 1180, 1960, 3050, 4300]) * r.uniform(.9, 1.12) / size
    y = I.partials(f, [.8, 1, .8, .5, .3], [.075, .06, .045, .03, .02], n)
    y[:90] += r.standard_normal(90) * np.linspace(1, 0, 90) * 1.3
    k = int(.004 * SR)
    fib = X.sweep_noise(n, 2600 + 900 * np.exp(-t / .03), 1.0, r) * np.exp(-np.maximum(t - .004, 0) / .035) * np.clip(1 + 1.1 * smooth_noise(n, 160, r), 0, 4)
    fib[:k] = 0
    y += fib * .45 + np.sin(TAU * 130 / size * t) * np.exp(-t / .035) * .5
    return fade(soft_clip(y * .9), .0003, .04) * vel * .5


def ribs_crack(vel=.9):
    """The demon's lantern ribs give: a run of dry cracks and a paper rip."""
    n = int(.9 * SR)
    out = np.zeros((n, 2))
    for k, (t, g, p) in enumerate(((0, 1.0, 0), (.055, .7, -.5), (.095, .85, .5), (.16, .6, -.2), (.21, .5, .4), (.30, .4, -.6))):
        x = bamboo_crack(g, 60 + k, 1.25)
        i = int(t * SR)
        gl, gr = pan_gains(p)
        e = min(len(x), n - i)
        out[i:i + e, 0] += x[:e] * gl * 1.3
        out[i:i + e, 1] += x[:e] * gr * 1.3
    return fade(out, .0003, .1) * vel


def sticks_lowered(vel=.7):
    """Sleeves settle, the stick ends touch the planks."""
    r = rng('lowered')
    n = int(.5 * SR)
    t = np.arange(n) / SR
    y = eq(r.standard_normal(n), ('bp', 1500, .6)) * np.exp(-((t - .07) / .06) ** 2) * .35
    y += I.partials([148, 255, 430, 690], [.9, .6, .4, .2], [.12, .09, .06, .04], n)
    y[:120] += r.standard_normal(120) * np.linspace(1, 0, 120) * .3
    k = int(.055 * SR)
    y[k:] += .55 * I.partials([160, 272, 455], [.9, .6, .3], [.11, .08, .05], n - k)
    return fade(y * vel, .0006, .06) * .5


def sticks_tap(vel=.9):
    """Two thick sticks tapped once: dry, short, no metal."""
    r = rng('tap')
    n = int(.16 * SR)
    y = I.partials([905, 1390, 2080, 2950], [1, .8, .45, .2], [.045, .035, .025, .015], n)
    y += I.partials([420], [.5], [.05], n)
    y[:100] += r.standard_normal(100) * np.linspace(1, 0, 100) * .7
    return fade(y * vel, .0003, .03) * .5


# ------------------------------------------------------------------ Hota: builds a lantern round the dark
def bend_and_tie(vel=.6, seed=0, lead=.18):
    """A split rib bent into a hoop and tied: a climbing creak, then a soft cord snug and a wooden tick at t = lead."""
    r = rng(f'bend{seed}')
    n = int((lead + .16) * SR)
    k = int(lead * SR)
    u = np.clip(np.arange(n) / k, 0, 1)
    ph = np.cumsum(60 + 120 * u ** 1.3 + 14 * smooth_noise(n, 12, r)) / SR
    imp = np.diff(np.floor(ph), prepend=0) * (1 + .6 * r.standard_normal(n))
    y = np.zeros(n)
    for f, q, a in ((480, 9, .9), (860, 11, 1.0), (1420, 12, .9), (2300, 12, .6), (3400, 11, .3)):
        y += eq(imp, ('bp', f * r.uniform(.93, 1.07), q)) * a * 7
    y *= np.sin(np.pi * np.clip(u, 0, .999) ** .8) ** .6 * .45
    m = n - k
    tt = np.arange(m) / SR
    y[k:] += eq(r.standard_normal(m), ('bp', 1900, .8)) * np.exp(-tt / .012) * 1.1
    y[k:] += I.partials([610 * r.uniform(.94, 1.06), 1240, 2050], [.6, .45, .2], [.06, .04, .03], m) * .8
    return fade(y * vel, .006, .03) * .5


def paper_taut(vel=.8, pull=.22):
    """Paper rustles as it is drawn, then the skin snaps tight and hums (the snap is at t = pull)."""
    r = rng('taut')
    n = int((pull + .6) * SR)
    t = np.arange(n) / SR
    u = np.clip(t / pull, 0, 1)
    y = X.sweep_noise(n, 1400 + 3200 * u, 1.0, r) * u ** 1.4 * (t < pull) * np.clip(1 + .8 * smooth_noise(n, 70, r), 0, 3) * .9
    k = int(pull * SR)
    m = n - k
    tt = np.arange(m) / SR
    hum = np.sin(TAU * np.cumsum(168 + 46 * np.clip(tt / .05, 0, 1)) / SR) * np.exp(-tt / .14) + .5 * np.sin(TAU * np.cumsum(268 + 70 * np.clip(tt / .05, 0, 1)) / SR) * np.exp(-tt / .10)
    y[k:] += hum * .75 + eq(r.standard_normal(m), ('bp', 2300, .7)) * np.exp(-tt / .006) * 1.5
    return fade(y * vel, .004, .06) * .5


def inhale_fire(dur=.35, vel=.6):
    """Air drawn in before the light catches."""
    r = rng('inhale')
    n = int(dur * SR)
    u = np.arange(n) / n
    y = X.sweep_noise(n, 900 - 560 * u, .9, r) * u ** 2.4 * 1.6
    return fade(np.stack([y, np.roll(y, 150)], 1), .01, .003) * vel * .5


def whoomph(vel=1.0, dur=2.6, seed=0):
    """A giant lantern lights: one deep soft blast that opens and settles."""
    r = rng(f'whoomph{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    sub = np.sin(TAU * np.cumsum(40 + 58 * np.exp(-t / .09)) / SR) * np.minimum(t / .010, 1) * np.exp(-t / .42)
    out += (sub * 1.25)[:, None]
    for ch in range(2):
        nz = r.standard_normal(n)
        fc = 170 + 1250 * np.minimum(t / .05, 1) * np.exp(-t / .20)
        y = X.sweep_noise(n, fc, .6, r) * np.minimum(t / .007, 1) * np.exp(-t / .26) * 2.2
        y += eq(nz, ('lp', 130), ('hp', 24)) * 3.4 * np.minimum(t / .02, 1) * np.exp(-t / .34)
        y += eq(nz, ('bp', 1700, .5)) * np.exp(-t / .03) * .45
        out[:, ch] += y
    return fade(soft_clip(out * .9), .0008, .4) * vel * .72


def warm_roar(dur=2.0, vel=.7):
    """Fire held inside paper: low, round, hardly any hiss."""
    y = X.flame_roar(dur, [(0, .2), (.12, 1.0), (.5, .8), (dur * .75, .42), (dur, 0)], 'warm', [(0, -.1), (dur, .15)], .25)
    return eq(y, ('lp', 2600), ('pk', 210, .8, 4)) * vel


def steam(dur=1.8, vel=.5):
    """Steam lifting off wet planks."""
    r = rng('steam')
    n = int(dur * SR)
    u = np.arange(n) / n
    out = np.zeros((n, 2))
    for ch in range(2):
        y = X.sweep_noise(n, 2600 + 2600 * u, .7, r) * np.clip(1 + .35 * smooth_noise(n, 7, r), 0, 2)
        out[:, ch] = y * np.sin(np.pi * np.clip(u, 0, 1) ** .55) ** 1.3
    return fade(out, .05, .15) * vel * .35


# ------------------------------------------------------------------ after the blow
def paper_lanterns(dur, vel=.7):
    """Many paper lanterns loosened and floating: soft rustles, ribs ticking, all of it unhurried."""
    r = rng('floaters')
    n = int(dur * SR)
    out = np.zeros((n, 2))
    k = int(dur * 8)
    for j in range(k):
        u = (j + r.uniform(0, 1)) / k
        d = r.uniform(.18, .55)
        m = int(d * SR)
        i = int(u * (dur - d) * SR)
        if i + m >= n:
            continue
        w = np.arange(m) / m
        f = np.exp(r.uniform(np.log(1300), np.log(4200)))
        x = X.sweep_noise(m, f * (1 + .25 * w), 1.1, r) * np.clip(.5 + 1.5 * smooth_noise(m, r.uniform(14, 38), r), 0, 3.5) * np.sin(np.pi * w ** .8) ** 1.4
        g = min(.2 + r.exponential(.5), 1.6) * (.55 + .45 * np.sin(np.pi * min(1, u * 1.25)))
        p0 = r.uniform(-.9, .9)
        gl, gr = pan_gains(p0 + r.uniform(-.3, .3) * w)
        out[i:i + m, 0] += x * gl * g
        out[i:i + m, 1] += x * gr * g
        if r.random() < .30:
            q = min(int(.10 * SR), n - i)
            tk = I.partials([r.uniform(600, 1100), r.uniform(1500, 2400)], [.5, .3], [.05, .03], q) * .5 * g
            out[i:i + q, 0] += tk * .6
            out[i:i + q, 1] += tk * .6
    return fade(eq(out, ('hp', 450), ('lp', 4600), ('lp', 7000)), .05, .5) * vel * .085


def paper_shiver(dur=11 / 24, vel=.7):
    """Dry paper rattle: the whole skin trembling faster and harder."""
    r = rng('shiver')
    n = int(dur * SR)
    u = np.arange(n) / n
    out = np.zeros((n, 2))
    ph = np.cumsum(19 + 15 * u + 2 * smooth_noise(n, 10, r)) / SR
    tick = np.exp(-np.mod(ph, 1.0) * 9.0)
    for ch in range(2):
        y = X.sweep_noise(n, 2300 + 900 * u, .9, r) * tick * 1.2
        y += eq(np.diff(np.floor(ph + .13 * ch), prepend=0) * (1 + .5 * r.standard_normal(n)), ('bp', 1150, 6)) * 5
        out[:, ch] = y
    return fade(out * (.30 + .70 * u ** 1.2)[:, None], .006, .035) * vel * .34


def unravel(dur=2.6, vel=.7):
    """Rib by rib: soft bamboo clatter that slows as the pieces get smaller, and one long paper sigh."""
    r = rng('unravel')
    n = int((dur + .5) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    k, tt = 0, 0.0
    while tt < dur:
        g = (1.0 if k == 0 else r.uniform(.40, .75)) * (1 - .7 * tt / dur)
        x = eq(bamboo_crack(g, 80 + k, r.uniform(.8, 1.5)), ('lp', 3800 - 1200 * tt / dur))
        i = int(tt * SR)
        e = min(len(x), n - i)
        gl, gr = pan_gains(0 if k == 0 else r.uniform(-.8, .8))
        out[i:i + e, 0] += x[:e] * gl
        out[i:i + e, 1] += x[:e] * gr
        tt += (.075 + .13 * tt / dur) * r.uniform(.7, 1.3)
        k += 1
    sg = X.sweep_noise(n, 1500 - 600 * np.clip(t / 1.2, 0, 1), .8, r) * np.minimum(t / .05, 1) * np.exp(-t / .45) * .28
    out += sg[:, None]
    return fade(out, .0004, .2) * vel


def paper_glow(vel=.6, seed=0, f=196.0):
    """A ring lit from behind paper: a soft flame swell, the skin breathing with it, a warm low tone."""
    r = rng(f'glow{seed}')
    n = int(1.5 * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / .035, 1) ** .8 * np.exp(-np.maximum(t - .035, 0) / .30)
    out = np.zeros((n, 2))
    for ch in range(2):
        y = X.sweep_noise(n, 210 + 620 * e, .7, r) * e * 1.5 * np.clip(1 + .35 * smooth_noise(n, 13, r), .3, 2)
        y += X.sweep_noise(n, 2100 + 700 * e, 1.0, r) * e * np.clip(.4 + 1.2 * smooth_noise(n, 26, r), 0, 3) * .35
        out[:, ch] = y
    tone = (np.sin(TAU * f * t) + .45 * np.sin(TAU * f * 1.5 * t + .5) + .25 * np.sin(TAU * f * 2.01 * t)) * e * .22
    th = np.sin(TAU * np.cumsum(52 + 40 * np.exp(-t / .05)) / SR) * np.minimum(t / .012, 1) * np.exp(-t / .16) * .6
    out = eq(out, ('lp', 3800)) + (tone + th)[:, None]
    return fade(out, .002, .2) * vel * .30
