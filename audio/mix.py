"""Mixdown: EQ, reverbs, ducking, silences, loudness and true-peak limiting.

Every master move is either linear EQ or a gain curve shared by the three stems, so music + vocal + sfx = mix."""
import numpy as np
from scipy import signal
from scipy.ndimage import gaussian_filter1d

from dsp import (HARD_CUTS, N, SR, compress, convolve_ir, db, eq, fade, follow, limiter_gain, lufs, make_ir, place, stereo, todb,
                 true_peak_db)
from score import MUTES, ft

TARGET_LUFS = -14.0
CEILING_DB = -1.35


def automation(points):
    """[(seconds, dB), ...] to a linear gain curve."""
    t = np.arange(N) / SR
    return db(np.interp(t, [p[0] for p in points], [p[1] for p in points]))[:, None]


def pocket(x, key_gain, lo, hi, depth_db):
    """Dynamic EQ: the lo-hi band of x drops by up to depth_db where key_gain (0..1 activity) is high."""
    h = signal.firwin(1025, [lo, hi], pass_zero=False, fs=SR)
    mid = np.stack([signal.fftconvolve(x[:, c], h, 'same') for c in range(2)], 1)
    return x - mid * ((1 - db(-depth_db)) * key_gain)[:, None]


def activity(key, thr_db, att=.012, rel=.22):
    return np.clip((todb(follow(key, att, rel), 1e-6) - thr_db) / 10.0, 0, 1)


def spaces():
    return dict(room=make_ir('room', .55, .006, .5, 1.0, 10, .035, 1.2, .5),
                hall=make_ir('hall', 2.1, .034, .40, 1.15, 10, .085, .6),
                valley=make_ir('valley', 3.6, .055, .30, 1.2, 8, .16, .5, 1.6))


def verb(x, ir, gain_db, lo=180, hi=7500):
    """Convolution reverb rendered scene by scene, so no tail survives a hard cut."""
    y = eq(x, ('hp', lo), ('lp', hi))
    out = np.zeros_like(y)
    edges = [0] + [int(c * SR / 24) for c in HARD_CUTS] + [N]
    for a, b in zip(edges[:-1], edges[1:]):
        if not np.any(y[a:b]):
            continue
        w = fade(y[a:b], 0, .006 if b < N else 0)
        out[a:b] += fade(convolve_ir(w, ir), 0, .008 if b < N else 0)
    return out * db(gain_db)


def duck_curve(key, thr_db, depth_db, att=.010, rel=.22):
    """Gain (linear) that falls by up to depth_db while the key signal is above thr_db."""
    e = todb(follow(key, att, rel), 1e-6)
    x = np.clip((e - thr_db) / 12.0, 0, 1)
    return db(-depth_db * x)


MUSIC = {  # bus: (gain dB, eq bands, hall send dB, valley send dB)
    'koto': (-5.5, [('hp', 70), ('pk', 2500, .8, 1.0)], -15, -22),
    'shamisen': (-10.0, [('hp', 90), ('lp', 9000)], -20, -60),
    'strings': (-4.5, [('hp', 32), ('pk', 350, .8, -1.5)], -14, -24),
    'pizz': (-5.0, [('hp', 60)], -18, -60),
    'flute': (-6.5, [('hp', 180), ('pk', 2800, .9, -1.5)], -12, -17),
    'pad': (-4.0, [('hp', 26)], -16, -18),
    'brass': (-5.5, [('hp', 45), ('pk', 300, .8, -1.5)], -16, -24),
    'perc': (-5.5, [('hp', 28), ('pk', 240, .9, -2.0)], -19, -22),
    'comedy': (-7.5, [('hp', 120)], -16, -60),
    'accent': (-6.0, [('hp', 24)], -20, -22),
}


def build_music(buses, ir):
    out, sh, sv = stereo(), stereo(), stereo()
    for k, x in buses.items():
        g, bands, h, v = MUSIC[k]
        y = eq(x.astype(np.float64), *bands) * db(g)
        out += y
        sh += y * db(h)
        if v > -50:
            sv += y * db(v)
    out += verb(sh, ir['hall'], 4.0, 160) + verb(sv, ir['valley'], 4.0, 140)
    return out


def build_vocal(lead, breath, double, choir, whisper, shout, ir):
    """Lead chain, choir chain, effects voices."""
    x = eq(lead, ('hp', 120), ('pk', 270, .9, -1.5), ('pk', 1100, 1.0, -1.0), ('pk', 3300, .9, 3.0), ('hs', 9000, .7, 2.0))
    # de-ess: pull the 5-11 kHz band down when it dominates
    ess = eq(x, ('bp', 7500, .6))
    ratio = todb(follow(ess, .002, .04), 1e-6) - todb(follow(x, .002, .04), 1e-5)
    x = x - ess * (1 - db(-6.0 * np.clip((ratio + 9) / 7, 0, 1)))
    x = compress(x, -19, 3.0, .006, .10)
    x = compress(x, -13, 4.0, .002, .06)
    x = x + eq(breath, ('hp', 300)) * .8
    L = np.stack([x, x], 1) * .7071
    d = compress(eq(double, ('hp', 160), ('pk', 3000, .8, 1.5)), -18, 3.0)
    L2 = np.stack([d * .80, np.roll(d, int(.013 * SR)) * .80], 1) * db(-10)
    c = np.stack([compress(eq(choir[:, i], ('hp', 100), ('pk', 320, .8, -2), ('pk', 2800, .8, 2.0), ('hs', 8000, .7, 2)), -20, 2.2, .015, .15) for i in range(2)], 1)
    w = stereo()
    for (id_, t0, y) in whisper:
        far = id_ == 'WH1'
        y = eq(y, ('hp', 350), ('hs', 5000, .7, 2))
        n = len(y)
        place(w, y, t0, .55 if far else .60, np.linspace(-.7, .35, n) if far else np.linspace(.25, -.15, n), through=True)
    sh = eq(shout, ('hp', 140), ('pk', 1200, .8, 2))
    lead_g = automation([(0, -4.2), (7.9, -4.2), (8.0, -4.4), (13.9, -4.4), (28, -2.6), (33.9, -2.2), (40, -1.0), (45.9, -1.0), (46.0, -2.0), (46.7, -1.5), (46.8, -.4), (47.9, .2), (52, .6), (55, -4.4), (64, -4.4)])
    choir_g = automation([(0, -3.4), (46.7, -3.4), (47.5, -1.5), (47.9, -4.0), (50.8, -4.0), (51.1, -1.4), (52, -1.0)])
    main = L * lead_g + L2 * lead_g
    ch = c * choir_g
    shd = sh * db(-5.5)
    out = main + ch + shd + w * .55
    dryv = automation([(0, -14.5), (8, -16), (14, -16), (28, -17), (40, -18.5), (52, -18.5), (53, -14), (64, -14)])
    sv = main * dryv + ch * db(-13) + shd * db(-12)
    out += verb(sv, ir['hall'], 4.0, 220, 8500)
    out += verb(main * db(-21) + w * db(-7) + shd * db(-16) + ch * db(-20), ir['valley'], 4.0, 260, 7000)
    return out


def build_sfx(sc, ir):
    amb, fx, big = (sc[k].astype(np.float64) for k in ('amb', 'fx', 'big'))
    out = eq(amb, ('hp', 28)) * db(-5.0) + eq(fx, ('hp', 26)) * db(-4.0) + eq(big, ('hp', 24)) * db(-3.0)
    out += verb(fx, ir['room'], -17, 200) + verb(fx, ir['valley'], -25, 200) + verb(big, ir['hall'], -17, 90) + verb(big, ir['valley'], -11.5, 90, 6500)
    return out


def mute_curve(voice=False):
    """The hard silences, plus the final fade."""
    t = np.arange(N) / SR
    g = np.zeros(N)
    for (f0, f1, level, ri, ro) in MUTES:
        if voice and f0 == 576:
            continue
        a, b = ft(f0), ft(f1)
        x = np.clip((t - a) / ri, 0, 1) * np.clip((b + ro - t) / ro, 0, 1)
        g = np.minimum(g, level * np.sin(np.clip(x, 0, 1) * np.pi / 2) ** .5)
    g = db(g)
    u = np.clip((t - ft(1516)) / (ft(1535.4) - ft(1516)), 0, 1)
    return (g * np.cos(u * np.pi / 2) ** 1.5 * np.clip(t / .004, 0, 1))[:, None]


def mixdown(buses, voc, sc, verbose=True):
    ir = spaces()
    music = build_music(buses, ir)
    vocal = build_vocal(**voc, ir=ir)
    sfx = build_sfx(sc, ir)
    # --- section riding (dB)
    music *= automation([(0, -6.0), (7.6, -5.8), (8.2, -7.2), (13.9, -7.2), (14, -3), (19.8, -3), (20, -2.5), (24, -1.5), (25, -2.5), (27.4, 0), (28, -5), (29, -4.5), (30, -4.5), (32, -3.5), (33.9, -1.0),
                         (34, 0), (34.95, 0), (35.05, -7), (36, -7), (36.1, -1), (37, -1), (38, -2.5), (39.9, 0), (40, -.5), (46, -1), (47.5, -.5), (52, -.5), (52.6, -2), (54, -4.5), (56, -4.0), (59.4, -4.0), (60, -3.2), (64, -3.2)])
    vocal *= automation([(0, 0.0), (8, 1.0), (13.9, 1.0), (20, 0), (28, 0), (29.9, .5), (30, 2.5), (31.3, 3.0), (31.5, 4), (33.9, 4.5), (34, 1), (40, 2.8), (46, 1.8), (47.5, 2.4), (52, 2.2), (54, 1), (64, 1)])
    sfx *= automation([(0, -5.5), (8, -3.0), (14, -1.5), (20, -2.5), (23, -4.5), (24, -4.5), (25, -2), (25.2, -3.5), (27, -2), (27.4, 0), (28, -1), (32.5, 0), (36, 1.5), (36.5, .5), (37, 0), (38, 4), (39.4, 4), (40, 3), (41.5, 2),
                       (42, 0), (43, 1.5), (45.9, 1.0), (46, 2.5), (46.8, 2.0), (47.45, 1.0), (47.5, .5), (47.8, 0), (48.1, -5), (49.9, -4), (50, -1), (52, .5), (52.3, -2), (52.7, -4), (56, -4.5), (59.4, -3.5), (59.5, -.5), (61, -2), (64, -2)])
    # --- ducking: the lead opens a pocket in music and effects; big hits open a pocket in the music
    key_v = voc['lead']
    act = activity(key_v, -26)
    music = pocket(music, act, 650, 7000, 4.5)
    music = pocket(music, act, 200, 650, 2.5)
    sfx = pocket(sfx, act, 900, 16000, 5.0)
    gv, gs = db(-2.0 * act), db(-2.0 * act)
    gh = duck_curve(sc['big'] + .7 * sc['fx'], -13, 4.0, .003, .30)
    gc = duck_curve(sc['big'] + .7 * sc['fx'], -11, 1.5, .003, .25)
    music *= (gv * gh)[:, None]
    sfx *= gs[:, None]
    vocal *= gc[:, None]
    # --- tone: a little less sub, more air (linear, so the stems still add up); before the mutes so they stay silent
    music, vocal, sfx = (eq(v, ('ls', 52, .8, -1.5), ('hs', 5500, .7, air)) for v, air in ((music, 3.0), (vocal, 1.0), (sfx, 1.0)))
    m = mute_curve()
    stems = dict(music=music * m, vocal=vocal * mute_curve(True), sfx=sfx * m)
    # --- shared glue: slow compressor keyed by the sum
    tot = sum(stems.values())
    key = np.abs(eq(tot, ('hp', 90))).max(1)
    e = todb(follow(key, .020, .25), 1e-6)
    thr, ratio = -15.0, 1.7
    over = np.maximum(e - thr, 0)
    g = db(gaussian_filter1d(over * (1 / ratio - 1), 200))[:, None]
    stems = {k: v * g for k, v in stems.items()}
    # --- loudness search with the limiter in the loop
    tot = sum(stems.values())
    gain = TARGET_LUFS - lufs(tot)
    for it in range(6):
        pre = tot * db(gain)
        lg = limiter_gain(pre, CEILING_DB)[:, None]
        out = pre * lg
        L = lufs(out)
        if verbose:
            print(f'  master pass {it}: gain {gain:+.2f} dB  LUFS {L:.2f}  max limiting {todb(lg.min()):.1f} dB')
        if abs(L - TARGET_LUFS) < .03:
            break
        gain += (TARGET_LUFS - L) * 1.05
    if verbose:
        gr = todb(lg[:, 0])
        sec = [(round(i * .25, 2), round(float(gr[int(i * .25 * SR):int((i + 1) * .25 * SR)].min()), 1)) for i in range(256)]
        print('  limiting deeper than 6 dB at:', [q for q in sec if q[1] < -6])
        print(f'  share of time limiting > 3 dB: {float((gr < -3).mean()):.3f}')
    k = db(gain) * lg
    tp = true_peak_db(out)
    if tp > -1.02:
        k = k * db(-1.05 - tp)
    stems = {n: v * k for n, v in stems.items()}
    return stems, sum(stems.values())
