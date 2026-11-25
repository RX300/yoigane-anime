"""Sound effects laid on the film frames. Three buses: amb (beds), fx (close, small room), big (large space)."""
import numpy as np

import acts as A
import instruments as I
import sfx as X
import voice as V
from dsp import SR, TAU, env, eq, fade, mtof, pan_gains, place, rng, smooth_noise, soft_clip, stereo, tv_filter
from score import BAMBOO, BRIDGE_OFF, HEART, RELIT, RINGS, VILLAGE_OFF, ft


# ------------------------------------------------------------------ small one-off effects
def thud(f=70, vel=.6, cloth=.4, seed=0, dur=.3):
    r = rng(f'thud{f}{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(TAU * np.cumsum(f * (1 + .8 * np.exp(-t / .015))) / SR) * np.exp(-t / .06)
    y += eq(r.standard_normal(n), ('lp', 900)) * np.exp(-t / .02) * .8
    y += eq(r.standard_normal(n), ('bp', 2200, .6)) * np.exp(-((t - .02) / .025) ** 2) * cloth * .5
    return fade(y * vel, .0006, .05) * .5


def rustle(dur=.35, vel=.5, seed=0, f=2400):
    r = rng(f'rustle{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = eq(r.standard_normal(n), ('bp', f, .5)) * np.clip(1 + .9 * smooth_noise(n, 30, r), 0, 3) * np.sin(np.pi * t / dur) ** 1.2
    return y * vel * .4


def cinch(vel=.6):
    """Silk cord pulled tight: rising friction squeak, then a soft snap at the end of the pull (t = 0.16)."""
    r = rng('cinch')
    n = int(.34 * SR)
    t = np.arange(n) / SR
    u = np.clip(t / .16, 0, 1)
    fr = X.sweep_noise(n, 1500 + 2600 * u, 7, r) * u ** 1.5 * (t < .16) * 2.2
    k = int(.16 * SR)
    sn = np.zeros(n)
    m = n - k
    tt = np.arange(m) / SR
    sn[k:] = eq(r.standard_normal(m), ('bp', 1800, .8)) * np.exp(-tt / .008) * 2 + np.sin(TAU * 210 * tt) * np.exp(-tt / .04) * .6
    return fade((fr + sn) * vel, .002, .03) * .45


def step(vel=.5, seed=0):
    """Straw sandal on a gravel road."""
    r = rng(f'step{seed}')
    n = int(.22 * SR)
    t = np.arange(n) / SR
    y = eq(r.standard_normal(n), ('bp', 340, .8)) * np.exp(-t / .03) * 1.6
    for _ in range(26):
        i = int(abs(r.normal(.02, .035)) * SR)
        m = int(r.uniform(.001, .006) * SR)
        if i + m < n:
            y[i:i + m] += r.standard_normal(m) * np.hanning(m) * r.uniform(.2, .9)
    return fade(eq(y, ('lp', 6500), ('hp', 120)) * vel, .0006, .04) * .4


def clack(vel=.8):
    """Teeth closing on air."""
    n = int(.12 * SR)
    r = rng('clack')
    y = I.partials([1850, 2740, 3900, 5200], [.8, 1, .6, .4], [.05, .04, .03, .02], n)
    y[:140] += r.standard_normal(140) * np.linspace(1, 0, 140) * .9
    return fade(y * vel, .0003, .02) * .5


def gulp(vel=.8):
    n = int(.26 * SR)
    t = np.arange(n) / SR
    f = np.where(t < .07, 520 - 4200 * t, 226 + 1400 * np.clip(t - .07, 0, .1))
    y = np.sin(TAU * np.cumsum(f) / SR) * (np.exp(-((t - .03) / .03) ** 2) + .9 * np.exp(-((t - .13) / .035) ** 2))
    return fade(y + .3 * np.sin(2 * TAU * np.cumsum(f) / SR) * np.exp(-((t - .13) / .03) ** 2), .002, .03) * vel * .6


def wail(dur=.52, vel=.8):
    """Hota: a big man's 'uwaaa', singing engine, voice breaking downward."""
    S = V.Singer('hota', vtl=.83, f1=1.0, rd=.75, breath=-25, jitter=.012, shimmer=.07, vib_cents=90, vib_rate=7.5, vib_delay=.08, drift=25, cons=3)
    notes = [V.Note(.3, .12, 58, 'u', vel=.8, vib=0), V.Note(.42, dur - .12, 67, 'wa', vel=1.15, vib=1.0, orn=[(dur - .10, -900, .16)])]
    return V.sing(notes, S, .3 + dur + .35, seed='wail')['audio'] * vel


def slide_in(vel=.6, dur=.20):
    """Plate pushed over wood, stops dead."""
    r = rng('slidein')
    n = int(dur * SR)
    u = np.arange(n) / n
    y = X.sweep_noise(n, 900 + 1500 * u, 1.4, r) * np.sin(np.pi * np.clip(u, 0, 1)) ** .6 * (1 + .4 * np.sign(np.sin(TAU * 90 * u * dur)))
    return fade(y, .004, .006) * vel * .5


def sparkle(vel=.6, seed=0, up=True, dur=.5, n_notes=9, base=84):
    n = int((dur + .5) * SR)
    out = np.zeros((n, 2))
    r = rng(f'spk{seed}')
    sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26]
    for j in range(n_notes):
        m = base + sc[j if up else n_notes - 1 - j]
        i = int(dur * j / n_notes * SR)
        t = np.arange(n - i) / SR
        f = float(mtof(m))
        x = (np.sin(TAU * f * t) + .3 * np.sin(TAU * f * 2.76 * t)) * np.exp(-t / .14) * np.minimum(t / .002, 1)
        gl, gr = pan_gains(-.7 + 1.4 * j / n_notes)
        out[i:, 0] += x * gl
        out[i:, 1] += x * gr
    return out * vel * .16


def lunge(dur=.42, vel=.9):
    """Air torn toward the lens; pitch and level rise until the mask fills the frame."""
    r = rng('lunge')
    n = int(dur * SR)
    u = np.arange(n) / n
    out = np.zeros((n, 2))
    for ch in range(2):
        y = X.sweep_noise(n, 240 + 3600 * u ** 2, 1.3, r) * u ** 1.6 * 1.8
        y += X.sweep_noise(n, 900 + 2400 * u ** 1.5, 12, r) * u ** 2 * 3.0
        out[:, ch] = y
    f = 180 * 2 ** (2.2 * u ** 1.5)
    ph = TAU * np.cumsum(f * (1 + .01 * smooth_noise(n, 30, r))) / SR
    v = sum(np.sin(k * ph + k * k) / k ** .4 for k in range(1, 22)) * (1 + .7 * np.sign(np.sin(TAU * 61 * u * dur))) * u ** 1.8
    out += (eq(v, ('pk', 1300, 1.2, 8), ('hp', 250)) * .10)[:, None]
    return fade(out, .004, .004) * vel * .55


def groan(dur=1.0, vel=.8, f=78, seed=0):
    """The demon's hollow throat."""
    r = rng(f'groan{seed}')
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    f0 = f * (1.25 - .45 * u) * (1 + .05 * smooth_noise(n, 22, r))
    ph = TAU * np.cumsum(f0) / SR
    src = sum(np.sin(k * ph + .9 * k * k) / k ** .5 for k in range(1, 40))
    src = src * (1 + .5 * np.sin(TAU * 31 * t)) + 2.0 * r.standard_normal(n)
    nf = n // 240 + 2
    FB = X.FB

    def hf(i0, i1):
        uu = np.clip(np.arange(i0, i1) * 240 / n, 0, 1)[:, None]
        g = 0
        for fc, bw, a in ((420 - 140 * uu, 90, 1), (980 - 200 * uu, 140, .7), (2100 - 300 * uu, 260, .35)):
            g = g + a * (1j * bw * FB) / (fc * fc - FB * FB + 1j * bw * FB + 1e-9)
        return g
    y = tv_filter(src, hf, nf, 240, 4096) * np.sin(np.pi * np.clip(u, 0, 1) ** .6) ** .8
    y = soft_clip(y * .22)
    return fade(np.stack([y, np.roll(y, 300)], 1), .004, .1) * vel * .7


def tear(dur=.4, vel=.7, seed=0):
    """Paper lantern skin ripping."""
    r = rng(f'tear{seed}')
    n = int(dur * SR)
    u = np.arange(n) / n
    ph = np.cumsum(140 + 420 * u + 60 * smooth_noise(n, 30, r)) / SR
    imp = np.diff(np.floor(ph), prepend=0) * (1 + r.standard_normal(n))
    y = eq(imp * 6 + .25 * r.standard_normal(n), ('bp', 2600, .5), ('hp', 600)) * np.sin(np.pi * u ** .7) ** .6
    return fade(np.stack([y, np.roll(y, 220)], 1), .002, .03) * vel * .6


def brush(dur=1.083, vel=.5):
    """Four strokes of a wet brush on paper, with lifts between."""
    r = rng('brush')
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    marks = [(.00, .22), (.27, .17), (.48, .24), (.76, .32)]
    for (a, d) in marks:
        u = np.clip((t - a) / d, 0, 1)
        e = np.sin(np.pi * u) ** .7 * ((t >= a) & (t < a + d))
        y += e * (.6 + .4 * u)
    fc = 1500 + 900 * smooth_noise(n, 4, r) * .5 + 600 * y
    z = X.sweep_noise(n, np.clip(fc, 700, 4000), .8, r) * y * (1 + .35 * smooth_noise(n, 60, r))
    return fade(z, .004, .02) * vel * .55


def stamp(vel=.8):
    r = rng('stamp')
    n = int(.4 * SR)
    t = np.arange(n) / SR
    y = np.sin(TAU * np.cumsum(88 + 120 * np.exp(-t / .01)) / SR) * np.exp(-t / .07)
    y += I.partials([310, 520, 870], [.5, .35, .2], [.08, .06, .04], n)
    y[:200] += r.standard_normal(200) * np.linspace(1, 0, 200) * .5
    return fade(y * vel, .0005, .05) * .6


def riser(dur, vel=.6, f0=200, f1=5200, seed=''):
    r = rng('riser' + seed)
    n = int(dur * SR)
    u = np.arange(n) / n
    out = np.zeros((n, 2))
    for ch in range(2):
        out[:, ch] = X.sweep_noise(n, f0 * (f1 / f0) ** u, 1.1, r) * u ** 2.2 * 1.8
    return fade(out, .01, .004) * vel * .6


# ------------------------------------------------------------------ the film
def build():
    amb, fx, big = stereo(), stereo(), stereo()

    def e_env(y, pts, shape='cos'):
        return y * env(pts, len(y), shape=shape)[:, None]

    # ---- 1. sadness
    w = X.wind(8.6, 1.0, 'open', .6)
    place(amb, e_env(w, [(0, .25), (.8, .9), (7.2, 1), (8.0, .5), (8.6, 0)]), 0, 1.15, through=True)
    place(amb, e_env(X.snowfall(8.4, 'open'), [(0, 0), (.4, 1), (7.8, 1), (8.4, 0)]), 0, 1.2, through=True)
    r = rng('scene')
    for k, f in enumerate(VILLAGE_OFF):
        place(fx, X.lamp_off(.62 - .015 * k, k, .06 + .10 * r.random()), ft(f), .42, -.8 + 1.6 * ((k * 4) % 11) / 10)
    place(big, I.bell(146.83, 2.6, .9, crack=1.0), ft(96), .50, .05)
    place(fx, X.drip(.7, 1250), ft(180), .55, .1)
    # ---- 2. warmth
    h = X.hearth(6.05, 'mem')
    place(amb, e_env(h, [(0, 0), (.25, 1), (5.9, 1), (6.05, 0)]), 8.0, 1.5, through=True)
    place(amb, e_env(X.wind(6.0, .5, 'out', .2, 1), [(0, .3), (1, .5), (6, .4)]), 8.0, .35, through=True)
    for k, f in enumerate((206, 218, 230)):
        place(fx, thud(92 + 6 * k, .55, .8, k), ft(f), .75, -.45 + .25 * k)
    place(fx, rustle(.45, .6, 1), ft(250), .7, .1)
    place(fx, rustle(.30, .5, 2, 3200), ft(264), .5, .2)
    place(fx, cinch(.9), ft(304) - .16, .75, .15)
    place(fx, I.suzu(.8, 1, 2960.0, ((0, 1.0), (.20, .45))), ft(308), 1.0, .2)
    # ---- 3. comedy
    day = X.wind(5.9, .35, 'day', .0)
    place(amb, e_env(day, [(0, .6), (5.8, .6), (5.85, 0)]), 14.0, .35, through=True)
    for k, (t, p) in enumerate(((14.2, -.7), (16.05, .7), (17.35, -.5))):
        place(amb, X.bird(.6, k), t, .9, p)
    for k, f in enumerate((336, 348, 360)):
        for j, (dt, p, v) in enumerate(((0, -.25, .9), (.035, .05, .6), (.07, .35, .75))):
            place(fx, step(v, 3 * k + j), ft(f) + (dt if j else 0), .55, p)
    place(fx, X.slide_whistle(.48, 2300, 620, .9, 1, 1.15), ft(366) - .50, .85, .2)        # dive
    place(fx, X.flap(.45, 15, .6, 1, 600, .7, .1), ft(366) - .10, .8)
    place(fx, X.pop(.9, 380, 1500), ft(366), 1.0, .1)
    place(fx, X.kite(.9, 1, .42, 3450, 2700, .6), ft(366) + .03, .55, .2)
    place(fx, clack(1.0), ft(372), 1.0, -.15)
    place(fx, X.slide_whistle(.72, 640, 2500, .8, 2, .8, 1.0), ft(372) + .10, .8, .4)      # climbs away
    place(fx, X.flap(.8, 11, .5, 2, 560, .2, .9), ft(372) + .10, .7)
    place(big, X.kite(1.0, 2, 1.0), ft(372) + .40, .55, .7)
    for i, f in enumerate((396, 400, 404)):
        place(fx, X.whoosh(.16, 700, 3200, .85, f'pan{i}', 1.0, -.8, .4, .35), ft(f) - .14, .6)
        place(big, I.impact(.6, 40 + i, .3, .6), ft(f), .38 + .08 * i)
    place(fx, X.boing(.8, 1, 170), ft(404) + .05, .5)
    place(fx, X.kite(.8, 4, .30, 3300, 2500, .5), ft(432), .55, .45)
    place(fx, gulp(1.0), ft(440), 1.0, .35)
    place(fx, wail(.50, 1.0), ft(444) - .3, .50, -.2)
    place(fx, slide_in(.9, .20), ft(456), .9, .3)
    place(fx, I.partials([2093, 5200], [.4, .12], [.5, .2], int(.6 * SR)) * .25, ft(456) + .20, .8, .3)
    place(fx, sparkle(1.0, 1, True, .34, 9, 84), ft(468), 1.0)
    # ---- 4. fear
    place(amb, e_env(X.wind(8.0, .9, 'bridge', 1.0, 1), [(0, .4), (2, .8), (4, 1), (7.9, .9), (8, 0)]), 20.0, .95, through=True)
    place(amb, e_env(X.river(8.0, 'bridge', .5), [(0, .3), (3.6, .5), (4, .25), (8, .2)]), 20.0, .7, through=True)
    for k, (t, p) in enumerate(((20.25, -.5), (21.15, .4), (22.30, -.2), (23.60, .5))):
        place(big, X.creak(.8, k, .75), t, .9, p)
    for k, f in enumerate(BRIDGE_OFF):
        c = k / 6
        place(fx, X.lamp_off(.6 + .4 * c, 20 + k, .25 + .75 * c), ft(f), .45 + .55 * c, (-.75 if k % 2 == 0 else .75) * (1 - .75 * c))
        place(big, X.lamp_off(.6 + .4 * c, 20 + k, .25 + .75 * c), ft(f), .25 + .15 * c, 0)
    for k, f in enumerate(HEART):
        place(fx, X.heartbeat(.75 + .03 * k, k), ft(f), .75 + .03 * k)
    place(big, X.reverse_bell(1.9, .75, 233.08), ft(576) - 1.9, .50)
    for k, f in enumerate((602, 608, 614)):                        # the printed ring mark lights from behind
        place(fx, A.paper_glow(.75 + .12 * k, k, (146.83, 155.56, 207.65)[k]), ft(f), .75 + .10 * k, 0)
        place(big, A.paper_glow(.75 + .12 * k, k, (146.83, 155.56, 207.65)[k]), ft(f), .30, 0)
    place(big, X.reverse_bell(1.35, .7, 155.56), ft(648) - 1.35, .45)
    place(fx, lunge(11 / 24, 1.0), ft(648), 1.0)
    place(big, X.scare(1.0), ft(659), .95)
    place(fx, tear(.35, .9, 1), ft(659), .8)
    # ---- 5. wrath
    place(fx, I.suzu(.9, 2, 2960.0, ((0, 1.0), (.16, .5))), ft(672), .95, .05)
    place(big, I.suzu(.9, 3, 2960.0, ((0, 1.0), (.16, .5))), ft(672), .7, .05)
    place(big, groan(1.1, .7, 62, 3), 28.25, .35)
    place(fx, X.heartbeat(.8, 11), ft(696), .7)
    place(amb, e_env(X.wind(6.0, 1.0, 'wrath', .6, .6), [(0, .3), (3, .6), (5.9, 1.2), (6, 0)]), 28.0, .8, through=True)
    place(big, I.impact(.75, 22, .5, 1.6), ft(720), .42)
    place(fx, sparkle(.6, 5, True, .25, 5, 86), ft(720), .5)
    place(fx, riser(.5, .7, 110, 900, 'anger'), ft(744), .9)
    place(fx, X.creak(1.0, 9, .5), ft(744), .9, -.1)
    place(fx, thud(58, .9, .1, 7, .4), ft(756), .8)
    place(fx, A.pole_lift(10 / 24, 1.0), ft(782), 1.8, .1)
    place(fx, A.plank_knock(1.0), ft(792), .95, .05)
    place(big, A.pole_bell(.95, 5.0, 1.0, 1), ft(792), 1.0)
    place(amb, e_env(A.lapping(2.2, 1.0, 'pole', 1.6), [(0, 0), (.3, 1), (1.6, .9), (2.2, 0)]), 32.4, 1.0)
    # ---- 6. Narumi
    place(fx, A.stick_whir(24 / 24, 1.0), ft(816), .95)
    place(fx, A.arms_down(8 / 24, 1.0), ft(856), .95)
    place(big, A.barrel_stroke(.38, False, 2.2, 1), ft(840), 1.15, 0)
    place(big, A.barrel_stroke(.64, False, 2.6, 2), ft(852), 1.05, 0)
    place(big, A.barrel_stroke(1.0, True, 3.4, 3), ft(864), 1.05)
    place(fx, A.arrow_feathers(20 / 24, 1.0), ft(864), .95)
    place(big, A.hoop_stroke(1.0, 1, -.6), ft(866), 1.25)
    place(big, A.hoop_stroke(1.0, 2, .6), ft(871), 1.25)
    place(fx, A.ribs_crack(1.0), ft(870), 1.5)
    place(big, groan(.75, .9, 92, 1), ft(870), .40)
    place(fx, A.sticks_lowered(1.0), ft(878), 1.35, .05)
    place(amb, e_env(X.wind(1.6, .7, 'after', .3), [(0, 0), (.4, .8), (1.6, .3)]), 36.6, .6, through=True)
    place(fx, A.sticks_tap(1.0), ft(900), 1.0, 0)
    # ---- 7. Hota
    for k, f in enumerate(BAMBOO):
        u = k / (len(BAMBOO) - 1)
        place(fx, A.bamboo_crack(.75 + .25 * u, k, 1.25 - .45 * u), ft(f), .62 + .2 * u, (-.6 if k % 2 else .6) * (1 - .5 * u))
        place(big, A.bamboo_crack(.6, k, 1.25 - .45 * u), ft(f), .35, 0)
    for k, f in enumerate(RINGS):
        place(fx, A.bend_and_tie(1.0, k, .18 - .012 * k), ft(f) - (.18 - .012 * k), .75 - .03 * k, (.5 if k % 2 else -.5))
    place(fx, A.paper_taut(1.0, .22), ft(946) - .22, 1.0, 0)
    place(fx, A.inhale_fire(9 / 24, 1.0), ft(951), .9)
    place(big, A.whoomph(1.0), ft(960), 1.0)
    place(fx, A.warm_roar(2.0, 1.0), ft(960), .95)
    place(fx, A.steam(1.75, 1.0), ft(960) + .22, .85)
    # ---- 8. Shio
    su = X.surf(8.2, [(0, .10), (1.5, .35), (2.0, .62), (3.6, .80), (4.0, .30), (4.75, .24), (5.45, .85), (5.6, .9), (6.6, .55), (8.2, .10)], 'sea')
    place(amb, su, 42.0, .72, through=True)
    place(fx, A.water_rush(1.9, [(0, 0), (.15, .7), (.5, 1.0), (.8, .75), (1.9, 0)], 'climb', 300, 1900, (-.4, .2)), ft(1044), .85)
    for k, (f, v) in enumerate(((1044, .9), (1050, .75), (1056, 1.0), (1068, .7), (1086, .6))):
        place(fx, A.hull_creak(.60, 1.0, k), ft(f), 2.6 * v, -.2 + .1 * k)
    place(fx, A.splash(.8, 1), ft(1044), .55)
    place(fx, A.splash(.6, 2), ft(1050), .45)
    place(fx, A.splash(1.0, 3), ft(1056), .85)
    place(fx, thud(58, 1.0, .1, 9, .45), ft(1056), 1.0)
    for k in range(9):
        place(fx, X.drip(.5, 1500 + 260 * ((k * 5) % 7), k), ft(1104) + .06 + .075 * k + .02 * r.random(), .35, r.uniform(-.8, .8))
    place(fx, A.hull_creak(.7, .8, 8), ft(1104), 1.5, 0)
    place(fx, A.water_rush(18 / 24, [(0, .05), (.25, .4), (.75, 1.0)], 'run', 350, 3200, (-.2, .1)), ft(1122), .95)
    place(fx, riser(18 / 24, 1.0, 220, 3000, 'run'), ft(1122), .40)
    for k in range(5):                                             # hull slaps quicken down the face
        place(fx, thud(74 + 6 * k, .6, .2, 20 + k, .22), ft(1122) + .75 * (1 - (1 - k / 5) ** .7) + .05, .5)
    place(big, A.pole_bell(1.0, 5.5, 1.15, 2), ft(1140), 1.15)
    place(big, X.wave_break(.9), ft(1140), .80)
    cross = X.surf(26 / 24 + .3, [(0, 1), (.5, 1), (26 / 24, .7), (26 / 24 + .3, 0)], 'cross')
    u = np.clip(np.arange(len(cross)) / SR / (26 / 24), 0, 1)
    gl, gr = pan_gains(-.9 + 1.8 * u)
    place(fx, cross * np.stack([gl, gr], 1) * 1.3, ft(1140), .70)
    for k in range(7):
        place(fx, X.flap(1.5 + .1 * k, 6.5 + .7 * r.random(), .6, 30 + k, 420 + 60 * k, r.uniform(-.8, .2), r.uniform(-.2, .9)), ft(1154) + .11 * k, .60)
    place(fx, sparkle(.7, 7, True, .9, 12, 79), ft(1154), .7)
    # ---- 9. resolve: drum, lantern, pole, then the last bell
    place(big, A.barrel_stroke(.85, True, 1.2, 6), ft(1200), .62)
    place(fx, A.hoop_stroke(.8, 3, .4, 1), ft(1200), .60)
    place(big, A.whoomph(.95, 1.2, 2), ft(1206), .60)
    place(fx, A.bamboo_crack(.8, 40), ft(1206), .60, -.2)
    place(big, A.pole_bell(.9, 1.6, 1.0, 3), ft(1212), .95)
    place(fx, A.splash(.8, 6), ft(1212), .55)
    place(big, A.pole_bell(.75, .8, 1.0, 4), ft(1226), .60)
    place(fx, riser(5 / 24, 1.0, 900, 5200, 'squeeze'), ft(1243), .8)
    place(big, A.pole_bell(1.0, 6.0, 2.0, 5), ft(1248), 1.35)
    place(big, I.impact(1.0, 25, .4, 1.0), ft(1248), .55)
    tail = A.pole_bell(1.0, 6.5, 1.6, 5)[int(8 / 24 * SR):]        # the same blow, still ringing when hearing returns
    place(big, e_env(tail, [(0, 0), (.5, .42), (2.2, .5), (3.8, .25), (len(tail) / SR, 0)]), ft(1256), .62)
    place(fx, A.paper_shiver(11 / 24, 1.0), ft(1256), .80)
    place(fx, A.paper_lanterns(77 / 24 + .6, 1.0), ft(1267), 1.25)
    place(fx, A.unravel(2.6, 1.0), ft(1267), .60)
    place(fx, X.lamp_on(.9, 1), ft(1296), .9, -.2)
    place(fx, X.lamp_on(.9, 4), ft(1296) + .03, .7, .3)
    # ---- 10. dawn
    place(amb, e_env(X.river(9.0, 'dawn', .9), [(0, 0), (1.0, 1), (7.6, .9), (8.9, .3), (9, 0)]), 55.2, 1.1, through=True)
    place(amb, e_env(X.wind(8.6, .4, 'dawn', .0), [(0, 0), (1, .5), (8.6, .3)]), 55.3, .4, through=True)
    for k, (t, p) in enumerate(((56.4, -.6), (57.9, .6), (58.8, -.2), (61.6, .5), (62.6, -.5))):
        place(amb, X.bird(.6, 10 + k), t, .75, p)
    for k, f in enumerate(RELIT):
        place(fx, X.lamp_on(.6, k), ft(f), .50, -.8 + 1.6 * ((k * 4) % 11) / 10)
    place(big, I.bell(293.66, 8.0, 1.0, 0, 1), ft(1428), .80, .0)
    place(big, I.bell(146.83, 8.0, .9, 0, 2), ft(1428), .40, .0)
    place(big, I.bell(293.66, 8.0, .8, 0, 1), ft(1446), .58, .0)
    for f, g in ((1428, .8), (1446, .6)):                          # palm on bronze
        place(fx, thud(190, .7, .3, 31, .16), ft(f), g, 0)
    place(fx, brush(26 / 24, 1.0), ft(1464), .34, .1)
    place(fx, stamp(1.0), ft(1497), .80, .25)
    place(fx, I.suzu(.5, 5, 2960.0, ((0, .6),)), ft(1497) + .5, .5, .2)
    return dict(amb=amb, fx=fx, big=big)
