"""Japanese singing synthesizer.

Glottis: Liljencrants-Fant pulse with Rd control, rendered as a band-limited harmonic sum, plus
pulse-modulated aspiration noise. Vocal tract: all-pole formant cascade (five moving formants and a fixed
upper set), a parallel nasal branch with antiformants, closure low-pass for voice bars. Consonants: plosive
closures and bursts, fricatives, affricates, nasals, flapped r, glides, all coarticulated through locus
equations. Pitch: portamento with overshoot, preparation, delayed vibrato, ornaments and fine drift.
"""
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.optimize import brentq

from dsp import SR, TAU, db, eq, mtof, rng, smooth_noise, spectral_shape, tv_filter

CT = 1000          # control rate, Hz
HOP = 120          # filter update, samples (2.5 ms)
NFFT = 4096
KMAX = 110

# ------------------------------------------------------------------ vowels (female, about 14.7 cm tract)
VOWELS = {
    'a': (840, 1380, 2850, 3900, 4900),
    'i': (305, 2740, 3420, 4250, 5050),
    'u': (370, 1420, 2650, 3850, 4850),
    'e': (585, 2110, 2940, 4050, 4950),
    'o': (500, 880, 2780, 3800, 4850),
    'N': (330, 1300, 2600, 3800, 4850),
    'x': (560, 1600, 2800, 3900, 4900),   # neutral, used for breaths
}
BW = {
    'a': (95, 105, 160, 230, 320), 'i': (60, 95, 170, 240, 320), 'u': (70, 110, 160, 230, 320),
    'e': (70, 100, 160, 230, 320), 'o': (80, 90, 150, 230, 320), 'N': (90, 250, 250, 300, 350),
    'x': (150, 150, 200, 260, 320),
}
F_HIGH = [(5950, 450), (7050, 560), (8150, 700), (9300, 850), (10450, 1000), (11600, 1150), (12800, 1300),
          (14000, 1500), (15300, 1700), (16600, 1900), (18000, 2100), (19400, 2400), (20800, 2600), (22200, 2800)]

# ------------------------------------------------------------------ consonants
# clo: constriction length (s); vot: release to voicing (s); floor: voicing level during the constriction
CONS = {
    'k': dict(kind='stop', place='vel', clo=.064, vot=.032, floor=0.0, burst=-8, asp=-9),
    'ky': dict(kind='stop', place='vel', clo=.062, vot=.040, floor=0.0, burst=-9, asp=-9),
    't': dict(kind='stop', place='alv', clo=.060, vot=.020, floor=0.0, burst=-11, asp=-12),
    'p': dict(kind='stop', place='lab', clo=.062, vot=.014, floor=0.0, burst=-14, asp=-16),
    'g': dict(kind='stop', place='vel', clo=.050, vot=.0, floor=.30, burst=-12, asp=-40),
    'd': dict(kind='stop', place='alv', clo=.046, vot=.0, floor=.42, burst=-14, asp=-40),
    'b': dict(kind='stop', place='lab', clo=.056, vot=.0, floor=.28, burst=-15, asp=-40),
    'ts': dict(kind='affr', place='alv', clo=.040, vot=.062, floor=0.0, fric='s', fg=-17.5),
    'ch': dict(kind='affr', place='pal', clo=.040, vot=.066, floor=0.0, fric='sh', fg=-15.5),
    's': dict(kind='fric', place='alv', clo=.098, vot=0, floor=0.0, fric='s', fg=-18),
    'sh': dict(kind='fric', place='pal', clo=.104, vot=0, floor=0.0, fric='sh', fg=-15.5),
    'hy': dict(kind='asp', place='pal', clo=.078, vot=0, floor=.06, asp=-3, fric='hy', fg=-25),
    'f': dict(kind='fric', place='lab', clo=.080, vot=0, floor=0.05, fric='f', fg=-22),
    'z': dict(kind='fric', place='alv', clo=.066, vot=0, floor=.40, fric='s', fg=-22),
    'j': dict(kind='fric', place='pal', clo=.070, vot=0, floor=.40, fric='sh', fg=-18),
    'h': dict(kind='asp', place='glo', clo=.070, vot=0, floor=.10, asp=-5),
    'n': dict(kind='nas', place='alv', clo=.076, vot=0, floor=.95),
    'ny': dict(kind='nas', place='pal', clo=.076, vot=0, floor=.95),
    'm': dict(kind='nas', place='lab', clo=.074, vot=0, floor=.85),
    'r': dict(kind='tap', place='tap', clo=.030, vot=0, floor=.26),
    'y': dict(kind='gli', place='pal', clo=.085, vot=0, floor=.80),
    'w': dict(kind='gli', place='lvel', clo=.080, vot=0, floor=.72),
    '': dict(kind='none', place='', clo=0, vot=0, floor=1.0),
}
NASAL = {  # poles (f, bw), zero (f, bw)
    'lab': ([(270, 60), (1050, 220), (2150, 260), (2900, 300), (3900, 350), (4900, 400)], (900, 160)),
    'alv': ([(280, 60), (1150, 240), (2300, 280), (2950, 300), (3950, 350), (4900, 400)], (1750, 220)),
    'pal': ([(280, 60), (1150, 240), (2500, 280), (3050, 300), (3950, 350), (4900, 400)], (2200, 260)),
    'vel': ([(280, 70), (1050, 240), (2300, 280), (2950, 300), (3950, 350), (4900, 400)], (3100, 300)),
}
FRIC = {
    's': [(50, -70), (1500, -48), (3500, -30), (5000, -11), (6300, -1), (7600, 0), (9500, -1), (12000, -7), (16000, -18), (22000, -36)],
    'sh': [(50, -70), (1500, -38), (2400, -15), (3100, -2), (3700, 0), (4600, -2), (6000, -6), (8000, -11), (11000, -20), (18000, -38)],
    'hy': [(50, -70), (1400, -40), (2300, -18), (2900, -4), (3500, 0), (4300, -3), (6000, -12), (8500, -20), (12000, -30), (20000, -45)],
    'f': [(50, -50), (700, -12), (1500, -6), (3000, -5), (6000, -4), (10000, -8), (16000, -20), (22000, -34)],
}


def split(mora):
    """Romaji mora to (consonant, vowel)."""
    if mora in ('n', 'N'):
        return '', 'N'
    v = mora[-1]
    c = mora[:-1]
    if v == 'i':
        c = {'k': 'ky', 'n': 'ny', 'h': 'hy', 's': 'sh', 't': 'ch', 'z': 'j'}.get(c, c)
    if v == 'u':
        c = {'h': 'f', 't': 'ts'}.get(c, c)
    if c not in CONS or v not in VOWELS:
        raise ValueError(f'bad mora {mora!r}')
    return c, v


def locus(place, V, kind=''):
    """Formants (F1..F5) at the constriction, coarticulated with the neighbouring vowel V."""
    f1, f2, f3, f4, f5 = V
    if place == 'lab':
        return (300, 0.62 * f2 + 330, 0.90 * f3, f4, f5)
    if place == 'alv':
        return (300, 0.42 * f2 + 1150, 0.35 * f3 + 1900, f4, f5)
    if place == 'vel':
        f2o = 0.80 * f2 + 620 if f2 > 1900 else 1.06 * f2 + 270
        return (280, f2o, 0.45 * f3 + 0.55 * (f2o + 480), f4, f5)
    if place == 'pal':
        return (290, 0.32 * f2 + 1830, 0.4 * f3 + 1940, f4, f5)
    if place == 'tap':
        return (400, 0.50 * f2 + 900, 0.45 * f3 + 1350, 0.9 * f4, f5)
    if place == 'lvel':
        return (350, 0.25 * f2 + 560, 0.75 * f3 + 450, f4, f5)
    return (f1, f2, f3, f4, f5)


# ------------------------------------------------------------------ LF glottal source
def lf_period(Rd, n=4096):
    """One period of the LF flow derivative, closure instant at sample 0, Ee = 1."""
    Ra = (-1 + 4.8 * Rd) / 100
    Rk = (22.4 + 11.8 * Rd) / 100
    Rg = Rk / (4 * (0.11 * Rd / (0.5 + 1.2 * Rk) - Ra))
    Tp = 1 / (2 * Rg)
    Te = min(Tp * (1 + Rk), 0.97)
    Ta = max(Ra, 0.0015)
    Ta = min(Ta, 0.9 * (1 - Te))
    D = 1 - Te
    wg = np.pi / Tp
    eps = brentq(lambda e: e * Ta - 1 + np.exp(-e * D), 1e-3 + 0.2 / Ta, 4 / Ta) if True else None
    ret = -(1 / (eps * Ta)) * ((1 - np.exp(-eps * D)) / eps - D * np.exp(-eps * D))
    s, c = np.sin(wg * Te), np.cos(wg * Te)

    def area(a):
        # E0 = -1 / (exp(a Te) sin(wg Te)); open-phase integral written to avoid overflow
        return -(1 / s) * ((a * s - wg * c) + wg * np.exp(-a * Te)) / (a * a + wg * wg) + ret
    lo, hi = -60.0, 120.0
    a = brentq(area, lo, hi)
    t = np.arange(n) / n
    op = -np.exp(a * (t - Te)) * np.sin(wg * t) / s
    re = -(1 / (eps * Ta)) * (np.exp(-eps * (t - Te)) - np.exp(-eps * D))
    y = np.where(t < Te, op, re)
    return np.roll(y, -int(round(Te * n)))


class LFTable:
    """Harmonic amplitudes of the LF pulse on a grid of Rd."""
    grid = np.linspace(0.45, 2.5, 60)
    coef = None

    @classmethod
    def get(cls):
        if cls.coef is None:
            cls.coef = np.array([np.fft.rfft(lf_period(r))[1:KMAX + 1] / 2048 for r in cls.grid])
        return cls.coef


def glottal(f0, rd, r, noise_amt=1.0, phase0=0.0, fmax=15500.0):
    """Band-limited LF pulse train. f0 and rd are per-sample arrays."""
    coef = LFTable.get()
    g = LFTable.grid
    n = len(f0)
    ph = TAU * np.cumsum(f0) / SR + phase0
    out = np.zeros(n)
    fr = np.clip((rd - g[0]) / (g[1] - g[0]), 0, len(g) - 1.001)
    i0 = fr.astype(int)
    a1 = fr - i0
    CH = 48000
    for s in range(0, n, CH):
        e = min(n, s + CH)
        f = f0[s:e]
        z = np.exp(1j * ph[s:e])
        zk = np.ones(e - s, complex)
        K = min(KMAX, int(fmax / max(60.0, f.min())))
        ii, aa = i0[s:e], a1[s:e]
        acc = np.zeros(e - s)
        tt = np.arange(e - s)
        for k in range(1, K + 1):
            zk = zk * z
            fk = f * k
            c = coef[ii, k - 1] * (1 - aa) + coef[ii + 1, k - 1] * aa
            w = np.clip((fmax - fk) / 1500.0, 0, 1)
            mid = k * float(f.mean())
            # upper harmonics lose phase lock, which removes the electric buzz
            if mid > 2200 and noise_amt > 0:
                sd = min(1.1, 0.55 * (mid - 2200) / 3500) * noise_amt
                rn = np.random.default_rng((int(r.integers(1 << 30)) + k) & 0x7fffffff)
                kn = (e - s) // 240 + 3
                th = np.interp(tt, np.arange(kn) * 240.0, rn.standard_normal(kn)) * sd
                acc += w * (c * zk * np.exp(1j * th)).real
            else:
                acc += w * (c * zk).real
        out[s:e] = acc
    return out, ph


# ------------------------------------------------------------------ note list to control tracks
class Note:
    def __init__(self, t, d, m, s, vel=1.0, vib=1.0, orn=None, port=None, scoop=0.0, rd=0.0, tie=False):
        self.t, self.d, self.m, self.s = t, d, m, s
        self.vel, self.vib, self.orn, self.port, self.scoop, self.rd, self.tie = vel, vib, orn, port, scoop, rd, tie
        self.c, self.v = ('', None) if tie else split(s)


class Singer:
    def __init__(self, name, vtl=1.0, f1=1.0, rd=1.15, breath=-27, vib_rate=5.5, vib_cents=42, vib_delay=.28,
                 detune=0.0, drift=7.0, jitter=.0035, shimmer=.02, offset=0.0, bw=1.0, ring=0.0, fric=0.0, whisper=False,
                 tune=1.0, sloppy=0.0, cons=0.0, level=0.6, nasal=1.0):
        self.__dict__.update(locals())
        del self.__dict__['self']


def keyframe(kf, n):
    """Cosine interpolation of [(t, vec), ...] at the control rate."""
    kf = sorted(kf, key=lambda k: k[0])
    xs = np.array([k[0] for k in kf])
    ys = np.array([k[1] for k in kf], float)
    t = np.arange(n) / CT
    i = np.clip(np.searchsorted(xs, t, side='right') - 1, 0, len(xs) - 2)
    u = np.clip((t - xs[i]) / np.maximum(xs[i + 1] - xs[i], 1e-6), 0, 1)
    u = (0.5 - 0.5 * np.cos(np.pi * u))[:, None]
    return ys[i] + (ys[i + 1] - ys[i]) * u


def gate(g, t, d0, d1, u0, u1, floor):
    """Multiply g by a dip: 1 before d0, floor between d1 and u0, back to 1 after u1 (cosine ramps)."""
    x = np.ones_like(t)
    a = np.clip((t - d0) / max(d1 - d0, 1e-4), 0, 1)
    b = np.clip((t - u0) / max(u1 - u0, 1e-4), 0, 1)
    x = 1 - (1 - floor) * (0.5 - 0.5 * np.cos(np.pi * a)) + (1 - floor) * (0.5 - 0.5 * np.cos(np.pi * b))
    g *= x


def predict_level(f0, F, B, rd, dec=5):
    """Perceived level (dB, relative to a typical sung vowel) of every control frame, from the harmonic sum."""
    n = len(f0)
    ii = np.arange(0, n, dec)
    k = np.arange(1, 25)
    f = f0[ii][:, None] * k
    g = LFTable.grid
    ri = np.clip(np.round((rd[ii] - g[0]) / (g[1] - g[0])).astype(int), 0, len(g) - 1)
    p = np.abs(LFTable.get()[ri, :24]) ** 2
    for j in range(5):
        fr, bw = F[ii, j][:, None], B[ii, j][:, None]
        q = fr * fr + bw * bw / 4
        p = p * q * q / ((q - f * f) ** 2 + (bw * f) ** 2)
    p = p * (f * f / (f * f + 450.0 ** 2)) ** 1.0
    lev = 10 * np.log10(p.sum(1) + 1e-9)
    return np.interp(np.arange(n), ii, lev) - 3.0


def sing(notes, S, dur, seed=''):
    """Render one singer. Returns audio (mono) and analysis tracks at the control rate."""
    r = rng(f'sing-{S.name}-{seed}')
    n = int(dur * CT) + 1
    t = np.arange(n) / CT
    notes = [nt for nt in notes]
    # per-singer timing looseness
    on = np.array([nt.t + S.offset + (r.normal(0, S.sloppy) if S.sloppy else 0) for nt in notes])
    off = np.array([nt.t + nt.d + S.offset for nt in notes])
    # phrases
    phr, cur = [], [0]
    for i in range(1, len(notes)):
        if on[i] - off[i - 1] > 0.06:
            phr.append(cur)
            cur = []
        cur.append(i)
    phr.append(cur)
    first = {p[0] for p in phr}
    last = {p[-1] for p in phr}

    vow = [None] * len(notes)
    for i, nt in enumerate(notes):
        vow[i] = vow[i - 1] if nt.tie else nt.v

    def VF(v):
        f = np.array(VOWELS[v], float) * S.vtl
        f[0] *= S.f1
        return f

    kf_f, kf_b = [], []
    av = np.zeros(n)
    g = np.ones(n)
    asp = np.zeros(n)
    nas = {p: np.zeros(n) for p in NASAL}
    vnas = np.zeros(n)
    clo = np.zeros(n)
    fric_events = []     # (t0, t1, kind, dB, attack, release, voiced, peak)
    phones = []          # (t0, t1, label)
    rdm = np.zeros(n)
    labels = [(0.0, '-')]
    cend = np.zeros(len(notes))   # vowel start
    cbeg = np.zeros(len(notes))   # consonant start
    spec = []
    for i, nt in enumerate(notes):
        C = dict(CONS[nt.c])
        if C['kind'] == 'nas':
            C['clo'] *= S.nasal * (1.45 if i in first else 1.0)
            C['floor'] = 1.0 if i in first else min(1.0, C['floor'] * S.nasal)
        # shorten consonants if the previous vowel would get squeezed
        tot = C['clo'] + C['vot']
        if i not in first and tot > 0:
            room = on[i] - on[i - 1]
            lim = 0.46 * room
            if tot > lim:
                C['clo'] *= lim / tot
                C['vot'] *= lim / tot
        spec.append(C)
        cend[i] = on[i]
        cbeg[i] = on[i] - C['clo'] - C['vot']

    def add(tt, F, B):
        kf_f.append((tt, F))
        kf_b.append((tt, B))

    add(0.0, VF(vow[0]), np.array(BW[vow[0]]))
    for i, nt in enumerate(notes):
        v = vow[i]
        Vv, Bv = VF(v), np.array(BW[v], float)
        C = spec[i]
        kind, place = C['kind'], C['place']
        v1 = cbeg[i + 1] if i + 1 < len(notes) and (i + 1) not in first else off[i]
        v0 = on[i]
        L = max(v1 - v0, 0.03)
        prev = None if i in first else vow[i - 1]
        # --- consonant targets
        if kind == 'none':
            if not nt.tie:
                if prev is None:
                    add(max(v0 - 0.08, kf_f[-1][0] + 0.015), Vv, Bv)
                    add(v0, Vv, Bv)
                else:
                    tr = min(0.060, 0.3 * (on[i] - on[i - 1]))
                    add(v0 - tr, kf_f[-1][1] if kf_f[-1][0] < v0 - tr else VF(prev), np.array(BW[prev], float))
                    add(v0 + min(0.055, 0.4 * L), Vv, Bv)
        else:
            Lcv = np.array(locus(place, tuple(Vv / S.vtl))) * S.vtl
            Lcv[0] = np.minimum(Lcv[0], Vv[0] * 1.0)
            c0, c1 = cbeg[i], on[i] - C['vot']
            Bc = np.maximum(Bv, np.array([110, 130, 190, 250, 330]))
            if prev is not None:
                Pv = VF(prev)
                Lvc = np.array(locus(place, tuple(Pv / S.vtl))) * S.vtl
                Lvc = 0.6 * Lvc + 0.4 * Lcv
                Lvc[0] = min(Lvc[0], Pv[0])
                pl = max(c0 - on[i - 1], 0.02)
                tvc = min({'gli': 0.050, 'tap': 0.026, 'asp': 0.04, 'nas': 0.036}.get(kind, 0.052), 0.42 * pl)
                if kind == 'asp':
                    add(c0, Pv, np.array(BW[prev], float))
                else:
                    add(c0 - tvc, Pv, np.array(BW[prev], float))
                    add(c0 + (0.006 if kind != 'gli' else 0.025), Lvc, Bc)
            else:
                add(max(c0 - 0.05, kf_f[-1][0] + 0.015), Lcv if kind != 'asp' else Vv, Bc)
            tcv = {'vel': 0.058, 'lab': 0.044, 'alv': 0.050, 'pal': 0.062, 'tap': 0.030, 'lvel': 0.072, 'glo': 0.03}[place]
            if kind == 'nas':
                tcv *= 0.68           # slow nasal transitions are heard as y
            if kind == 'gli':
                tcv = min(0.075, 0.5 * L)
                add(on[i] - 0.030, Lcv, Bc)
                add(on[i] + tcv * 0.8, Vv, Bv)
            elif kind == 'asp':
                add(c1 - 0.5 * C['clo'], Vv, np.maximum(Bv, np.array([180, 140, 190, 250, 330])))
                add(on[i] + 0.02, Vv, Bv)
            else:
                tcv = min(tcv, 0.5 * L)
                # F1 opens at the release; voicing may start later
                add(c1 - 0.002, Lcv, Bc)
                add(c1 + max(tcv, C['vot'] + 0.018), Vv, Bv)
        tv0 = kf_f[-1][0]
        # steady part with light undershoot towards the end of long notes
        if i + 1 >= len(notes) or (i + 1) in first:
            te = max(off[i], tv0 + 0.01)
            add(te, Vv * np.array([0.96, 1, 1, 1, 1]), Bv)
            nxt = cbeg[i + 1] - 0.09 if i + 1 < len(notes) else 1e9
            add(max(te + 0.025, min(te + 0.12, nxt)), Vv * np.array([0.94, 1, 1, 1, 1]), Bv * 1.2)

        # --- gates, noise, nasal tracks
        c0, c1 = cbeg[i], on[i] - C['vot']
        cg = S.cons
        if kind == 'stop' and C['floor'] == 0:
            if prev is not None:
                gate(g, t, c0 - 0.016, c0 + 0.008, on[i] - 0.006, on[i] + 0.020, 0.0)
            else:
                g *= np.clip((t - (on[i] - 0.006)) / 0.022, 0, 1) ** 1.3 if i in first and i == 0 else 1
                gate(g, t, c0 - 0.03, c0 - 0.01, on[i] - 0.006, on[i] + 0.020, 0.0)
            kb = None
            if place == 'vel':
                f2 = Vv[1]
                kb = float(np.clip(0.35 * f2 + 0.65 * locus('vel', tuple(Vv / S.vtl))[1] * S.vtl + (250 if f2 > 1900 else 60), 1000, 3600))
            fric_events.append((c1, c1 + 0.016, 'burst-' + place, C['burst'] + cg, .0008, .010, False, kb))
            x = np.exp(-np.clip((t - c1) / (C['vot'] * 0.9 + 0.006), 0, 20)) * (t >= c1)
            x *= np.clip((t - c1) / 0.003, 0, 1)
            asp = np.maximum(asp, x * db(C['asp'] + cg))
            phones.append((c0, c1, 'cl'))
        elif kind == 'stop':
            gate(g, t, c0 - 0.010, c0 + 0.010, on[i] - 0.004, on[i] + 0.012, C['floor'])
            x = np.clip((t - c0) / 0.008, 0, 1) * np.clip((on[i] - t) / 0.004 + 0.5, 0, 1)
            clo = np.maximum(clo, np.clip(x, 0, 1))
            kb = None
            if place == 'vel':
                kb = float(np.clip(locus('vel', tuple(Vv / S.vtl))[1] * S.vtl, 1000, 3400))
            fric_events.append((c1 - .002, c1 + 0.010, 'burst-' + place, C['burst'] + cg, .0008, .007, False, kb))
            phones.append((c0, c1, 'vc'))
        elif kind == 'affr':
            if prev is not None:
                gate(g, t, c0 - 0.016, c0 + 0.008, on[i] - 0.006, on[i] + 0.022, 0.0)
            else:
                gate(g, t, c0 - 0.03, c0 - 0.01, on[i] - 0.006, on[i] + 0.022, 0.0)
            fric_events.append((c1, on[i] + 0.006, C['fric'], C['fg'] + cg, .0025, .018, False, None))
            fric_events.append((c1, c1 + 0.012, 'burst-' + place, -15 + cg, .0008, .008, False, None))
            phones.append((c0, c1, 'cl'))
        elif kind == 'fric':
            fl = C['floor']
            gate(g, t, c0 - 0.012, c0 + 0.026, on[i] - 0.016, on[i] + 0.016, fl)
            fric_events.append((c0 - 0.004, on[i] + 0.010, C['fric'], C['fg'] + cg, .030 if fl < .2 else .018, .026, fl > .2, None))
            if fl > .2:
                x = np.clip((t - c0) / 0.02, 0, 1) * np.clip((on[i] - t) / 0.012, 0, 1)
                clo = np.maximum(clo, 0.75 * x)
            phones.append((c0, on[i], C['fric']))
        elif kind == 'asp':
            gate(g, t, c0 - 0.010, c0 + 0.022, on[i] - 0.022, on[i] + 0.016, C['floor'])
            x = np.clip((t - c0 + .01) / 0.03, 0, 1) * np.clip((on[i] + .012 - t) / 0.03, 0, 1)
            asp = np.maximum(asp, x * db(C['asp'] + cg))
            if 'fric' in C:
                fric_events.append((c0, on[i] + 0.006, C['fric'], C['fg'] + cg, .030, .030, False, None))
            phones.append((c0, on[i], 'h'))
        elif kind == 'nas':
            gate(g, t, c0 - 0.008, c0 + 0.010, on[i] - 0.008, on[i] + 0.010, C['floor'])
            x = np.clip((t - c0 + .006) / 0.014, 0, 1) * np.clip((on[i] + .004 - t) / 0.012, 0, 1)
            nas[place] = np.maximum(nas[place], x)
            y = np.clip((t - c0 + .045) / 0.045, 0, 1) * np.clip((on[i] + .065 - t) / 0.06, 0, 1)
            vnas = np.maximum(vnas, 0.78 * y)
            phones.append((c0, on[i], 'm' if place == 'lab' else 'n'))
        elif kind == 'tap':
            gate(g, t, c0 - 0.010, c0 + 0.008, on[i] - 0.010, on[i] + 0.008, C['floor'])
            x = np.clip((t - c0) / 0.008, 0, 1) * np.clip((on[i] - .004 - t) / 0.008, 0, 1)
            clo = np.maximum(clo, 0.30 * x)
            phones.append((c0, on[i], 'r'))
        elif kind == 'gli':
            gate(g, t, c0 - 0.02, on[i] - 0.045, on[i] - 0.030, on[i] + 0.045, C['floor'])
        if v == 'N':
            e = v1
            pl = 'alv'
            if i + 1 < len(notes) and (i + 1) not in first:
                np_ = CONS[notes[i + 1].c]['place']
                pl = {'lab': 'lab', 'alv': 'alv', 'pal': 'pal', 'vel': 'vel', 'tap': 'alv'}.get(np_, 'vel')
            x = np.clip((t - v0 + .010) / 0.030, 0, 1) * np.clip((e + .006 - t) / 0.014, 0, 1)
            nas[pl] = np.maximum(nas[pl], x)
            y = np.clip((t - v0 + .10) / 0.09, 0, 1) * np.clip((e + .05 - t) / 0.05, 0, 1)
            vnas = np.maximum(vnas, 0.85 * y)
            gate(g, t, v0 - 0.01, v0 + 0.02, e - 0.01, e + 0.012, 0.85)
        phones.append((v0, v1, v))
        labels.append((v0 - (0.5 * C['clo'] if kind in ('gli', 'none', 'asp') else 0.0), v))
        if kind in ('nas', 'stop') and place == 'lab':
            labels.append((c0, 'm'))
        labels.append((off[i], '-')) if i in last else None

    # --- phrase envelope and dynamics
    lev = np.zeros(n)
    for p in phr:
        a, b = on[p[0]], off[p[-1]]
        c0p = cbeg[p[0]]
        kindp = spec[p[0]]['kind']
        att = 0.055 if kindp == 'none' else 0.030
        st = a - 0.02 if kindp in ('none', 'stop', 'fric', 'affr', 'asp') else c0p - 0.01
        if kindp in ('stop',) and spec[p[0]]['floor'] > 0:
            st = c0p
        rel = min(0.16, 0.4 * notes[p[-1]].d)
        e = np.clip((t - st) / att, 0, 1)
        e = e * e * (3 - 2 * e)
        q = np.clip((b + 0.03 - t) / rel, 0, 1)
        q = q * q * (3 - 2 * q)
        lev = np.maximum(lev, e * q)
        # breathier onset and release
        rdm += 0.45 * np.exp(-np.clip((t - st) / 0.06, 0, 30)) * (t >= st) * (t < b)
        rdm += 0.7 * np.clip((t - (b - rel)) / rel, 0, 1) * (t < b + .1)
        asp = np.maximum(asp, db(-21 + (S.breath + 27)) * np.exp(-((t - st - 0.01) / 0.035) ** 2))
        asp = np.maximum(asp, db(-22 + (S.breath + 27)) * np.exp(-((t - b + 0.03) / 0.07) ** 2))
    dyn = [(0.0, notes[0].vel)]
    for i, nt in enumerate(notes):
        e = on[i + 1] if i + 1 < len(notes) and (i + 1) not in first else off[i]
        d = e - on[i]
        dyn.append((on[i] + 0.02, nt.vel * 0.98))
        if d > 0.45:
            dyn.append((on[i] + min(0.35 * d, 0.5), nt.vel * 1.08))
            dyn.append((e - 0.05, nt.vel * 0.88))
        else:
            dyn.append((on[i] + 0.5 * d, nt.vel))
            dyn.append((e - 0.02, nt.vel * 0.94))
        rdm += nt.rd * np.clip((t - on[i] + .02) / .04, 0, 1) * np.clip((e - t) / .04, 0, 1)
    dyn = np.interp(t, [d[0] for d in dyn], [d[1] for d in dyn])
    dyn = gaussian_filter1d(dyn, 14)
    phrase_lev = lev.copy()
    av = gaussian_filter1d(lev * g * dyn, 2.0)

    # --- pitch
    tgt = np.full(n, float(notes[0].m))
    lead = 0.048
    for i, nt in enumerate(notes):
        ld = lead if nt.port is None else nt.port
        tgt[t >= on[i] - ld] = nt.m
    # gaps between phrases: hold then jump halfway in the gap
    w0, ze = TAU * 8.2, 0.74
    f = np.empty(n)
    y, vel_ = tgt[0], 0.0
    dt = 1.0 / CT
    for k in range(n):
        acc = w0 * w0 * (tgt[k] - y) - 2 * ze * w0 * vel_
        vel_ += acc * dt
        y += vel_ * dt
        f[k] = y
    for p in phr:
        i = p[0]
        sc = notes[i].scoop if notes[i].scoop else -0.9
        u = np.clip((t - on[i]) / 0.13, 0, 1)
        f += np.where((t > on[i] - 0.12) & (t < on[i] + 0.2), sc * (1 - u) ** 2, 0)
    for i, nt in enumerate(notes):
        e = on[i + 1] if i + 1 < len(notes) else off[i]
        e = min(e, off[i] + 0.02)
        if i + 1 < len(notes) and notes[i + 1].tie:
            pass
        d = e - on[i]
        if nt.vib > 0 and d > 0.42:
            dl = min(S.vib_delay, 0.45 * d)
            x = np.clip((t - on[i] - dl) / 0.28, 0, 1) * np.clip((e + .02 - t) / 0.09, 0, 1)
            rate = S.vib_rate * (1 + 0.05 * smooth_noise(n, 1.5, r, CT))
            ph = TAU * np.cumsum(rate) / CT
            k0 = int(np.clip((on[i] + dl) * CT, 0, n - 1))
            ph = ph - ph[k0]
            f += nt.vib * S.vib_cents / 100 * x * np.sin(ph) * (1 + 0.12 * smooth_noise(n, 2, r, CT))
            av *= 1 + 0.045 * nt.vib * x * np.sin(ph + 0.6)
            rdm += 0.05 * nt.vib * x * np.sin(ph + 2.4)
        if nt.orn:
            for (rt, cents, width) in nt.orn:
                f += cents / 100 * np.exp(-((t - on[i] - rt) / width) ** 2)
        c = nt.c
        if c in ('g', 'd', 'b', 'z', 'j'):
            f += -0.35 * np.exp(-((t - (on[i] - 0.02)) / 0.03) ** 2)
    f += S.detune / 100 + S.drift / 100 * (0.7 * smooth_noise(n, 1.2, r, CT) + 0.35 * smooth_noise(n, 6, r, CT))
    f0c = mtof(f)

    # --- formant tracks
    F = keyframe(kf_f, n)
    B = keyframe(kf_b, n)
    for j in range(5):
        F[:, j] = gaussian_filter1d(F[:, j], 3.0) * (1 + 0.010 * smooth_noise(n, 3.0, r, CT))
    # raise F1 when the fundamental climbs above it, as singers do
    lim = f0c * 1.06
    x = np.clip((lim - F[:, 0]) / 60.0, -8, 8)
    F[:, 0] = np.where(nas['lab'] + nas['alv'] + nas['pal'] + nas['vel'] > 0.5, F[:, 0],
                       F[:, 0] + S.tune * 60.0 * np.log1p(np.exp(x)))
    F[:, 1] = np.maximum(F[:, 1], F[:, 0] + 190)
    B = B * S.bw
    B[:, 0] = np.maximum(B[:, 0] * (1 + 0.5 * np.clip((f0c - 280) / 300, 0, 1.2)), 0.25 * F[:, 0] * np.clip((f0c - 250) / 200, 0, 1))
    if S.ring:
        B[:, 2] *= 1 - 0.25 * S.ring
        B[:, 3] *= 1 - 0.30 * S.ring
        F[:, 3] -= 260 * S.ring
        F[:, 4] -= 520 * S.ring

    # --- loudness regulation: predict the level each pitch/vowel pair would reach and even it out
    rdc = np.clip(S.rd + gaussian_filter1d(rdm, 8), 0.5, 2.45)
    trm = -S.level * predict_level(f0c, F, B, rdc)
    nasal_any = nas['lab'] + nas['alv'] + nas['pal'] + nas['vel'] + clo
    hold = np.where(nasal_any + (g < .5) > .3, np.nan, trm)
    ok = ~np.isnan(hold)
    if ok.any():
        trm = np.interp(t, t[ok], hold[ok])
    av = av * db(np.clip(gaussian_filter1d(trm, 16), -18, 10))

    # --- audio-rate source
    ns = int(dur * SR)
    ta = np.arange(ns) / SR
    up = lambda z: np.interp(ta, t, z)
    f0a = up(f0c) * (1 + S.jitter * smooth_noise(ns, 160, r))
    rd = up(gaussian_filter1d(np.clip(S.rd + rdm + 0.35 * (1 - dyn), 0.5, 2.45), 3))
    ava = up(av) * (1 + S.shimmer * smooth_noise(ns, 90, r))
    act = ava > 1e-5
    src = np.zeros(ns)
    ph = np.zeros(ns)
    if not S.whisper:
        # render only where voiced, to save time
        edges = np.flatnonzero(np.diff(np.concatenate([[0], act.astype(int), [0]])))
        for a, b in zip(edges[::2], edges[1::2]):
            y, p = glottal(f0a[a:b], rd[a:b], r, phase0=r.uniform(0, TAU))
            src[a:b] = y * ava[a:b]
            ph[a:b] = p
    white = r.standard_normal(ns)
    base_asp = db(S.breath) * (0.25 * up(lev * g) + 0.75 * ava) * (1 + 0.8 * np.clip(rd - 1.0, 0, 1.5))
    if S.whisper:
        base_asp = base_asp * 0 + db(-4) * up(lev * dyn * (0.15 + 0.85 * g))
        pulse = 1.0
    else:
        o = 0.5 - 0.5 * np.cos(np.mod(ph, TAU) - 0.9)
        pulse = np.where(act, 0.35 + 1.25 * o ** 1.5, 1.0)
    asp_a = up(gaussian_filter1d(asp, 1.5)) * 0.35
    nz = white * (base_asp * pulse + asp_a) * 0.55
    nz = eq(nz, ('hp', 500, 0.6), ('hs', 5000, 0.7, -3.0))
    # frication keeps its own spectrum and must not pass the vowel filter
    nf = int(np.ceil(ns / HOP)) + 1
    fi = np.minimum((np.arange(nf) * HOP / SR * CT).astype(int), n - 1)
    H = tract_response(F[fi], B[fi], clo[fi], {k: v[fi] for k, v in nas.items()}, vnas[fi], S, f0c[fi])
    y = tv_filter(src + nz, H, nf, HOP, NFFT)
    y *= 0.16
    fr = np.zeros(ns)
    for (a, b, kind, gdb, at, rl, voiced, kb) in fric_events:
        m = int((b - a) * SR)
        i0 = int(a * SR)
        if m < 8 or i0 < 0 or i0 + m > ns:
            continue
        w = r.standard_normal(m + 512)
        if kind.startswith('burst'):
            pl = kind[6:]
            if pl == 'vel':
                pts = [(50, -50), (kb * 0.55, -22), (kb * 0.85, -4), (kb, 0), (kb * 1.18, -4), (kb * 1.7, -18), (kb * 2.4, -14), (kb * 3.2, -24), (22000, -50)]
            elif pl == 'lab':
                pts = [(50, -8), (400, 0), (1500, -8), (4000, -18), (10000, -30), (22000, -45)]
            elif pl == 'pal':
                pts = FRIC['sh']
            else:
                pts = [(50, -40), (1000, -24), (2500, -11), (3800, -2), (5500, 0), (8000, -3), (12000, -12), (20000, -30)]
            x = spectral_shape(w, pts)[256:256 + m]
            x = x / (np.std(x) + 1e-9)
            tt = np.arange(m) / SR
            x *= np.minimum(tt / at, 1) * np.exp(-np.maximum(tt - at, 0) / (rl * 0.5))
            lv = np.interp(a + 0.03, t, dyn)
            x *= db(gdb) * 0.5 * lv
        else:
            x = spectral_shape(w, FRIC[kind])[256:256 + m]
            x = x / (np.std(x) + 1e-9)
            tt = np.arange(m) / SR
            T = m / SR
            e = np.clip(tt / at, 0, 1) ** 1.2 * np.clip((T - tt) / rl, 0, 1)
            e = e * (0.75 + 0.25 * np.sin(np.pi * np.clip(tt / T, 0, 1)))
            x *= e * db(gdb) * 0.5 * np.interp(0.5 * (a + b), t, np.maximum(dyn, .3))
            if voiced:
                x *= 0.45 + 0.9 * (0.5 - 0.5 * np.cos(np.mod(ph[i0:i0 + m], TAU) - 0.9))
        fr[i0:i0 + m] += x * (0.5 if S.whisper else 1.0)
    # formant-scaled tract shifts frication spectra too, close enough through EQ
    y = y + fr * db(S.fric)
    return dict(audio=y, f0=f0c, av=av, lev=phrase_lev, F=F, t=t, phones=phones, labels=sorted(labels, key=lambda q: q[0]),
                on=on, off=off, notes=notes, phrases=phr, vow=vow)


def tract_response(F, B, clo, nas, vnas, S, f0):
    """Closure over control tracks: returns hfun(i0, i1) for tv_filter."""
    f = np.fft.rfftfreq(NFFT, 1 / SR)
    w = f
    w2 = w * w
    fixed = np.ones(len(f), complex)
    for (fr, bw) in F_HIGH:
        fr, bw = fr * S.vtl, bw * S.vtl
        if fr > 23500:
            continue
        p2 = fr * fr + bw * bw / 4
        fixed = fixed * p2 / ((p2 - w2) + 1j * bw * w)
    # a shallow pyriform-sinus dip near 5.3 kHz
    zf, zb, pb = 5300 * S.vtl, 500.0, 1100.0
    fixed = fixed * ((zf ** 2 - w2) + 1j * zb * w) / ((zf ** 2 - w2) + 1j * pb * w)
    fixed = fixed * np.exp(-(f / 15000.0) ** 6)
    nresp = {}
    for pl, (poles, (zf, zb)) in NASAL.items():
        h = np.ones(len(f), complex)
        for (fr, bw) in poles:
            fr, bw = fr * S.vtl, bw * S.vtl
            p2 = fr * fr + bw * bw / 4
            h = h * p2 / ((p2 - w2) + 1j * bw * w)
        zf2 = (zf * S.vtl) ** 2 + (zb / 2) ** 2
        h = h * ((zf2 - w2) + 1j * zb * w) / zf2
        # the zero adds a rising tilt; a matching pole restores the fall-off
        pf, pbw = 3600 * S.vtl, 700
        p2 = pf * pf + pbw * pbw / 4
        h = h * p2 / ((p2 - w2) + 1j * pbw * w)
        nresp[pl] = h * fixed * 1.15 / (1 + (f / 700.0) ** 2) ** 0.42
    low = (1 / (1 + (f / 420.0) ** 4)).astype(np.float32)
    fixed = fixed.astype(np.complex64)
    nresp = {k: v.astype(np.complex64) for k, v in nresp.items()}
    w32, w2 = w.astype(np.float32), w2.astype(np.float32)
    F, B = F.astype(np.float32), B.astype(np.float32)
    clo, vnas = clo.astype(np.float32), vnas.astype(np.float32)
    nas = {k: v.astype(np.float32) for k, v in nas.items()}
    busy = {k: bool(np.any(v > 1e-3)) for k, v in nas.items()}
    # above about 300 Hz the murmur's 280 Hz resonance has no harmonic under it; keep its level
    ngain = np.clip((f0 / 300.0) ** 1.3, 1.0, 2.2).astype(np.float32)

    def hfun(i0, i1):
        m = i1 - i0
        den = np.ones((m, len(f)), np.complex64)
        num = np.ones((m, 1), np.float32)
        for j in range(5):
            fr, bw = F[i0:i1, j][:, None], B[i0:i1, j][:, None]
            p2 = (fr * fr + bw * bw / 4) * 1e-6
            q = np.empty((m, len(f)), np.complex64)
            q.real = p2 - w2 * 1e-6
            q.imag = bw * w32 * 1e-6
            den *= q
            num = num * p2
        h = fixed * num / den
        vn = vnas[i0:i1][:, None]
        if np.any(vn > 1e-3):
            # vowel nasalisation: a pole-zero pair below F1 and a wider F1
            fp, bp, fz, bz = np.float32(290.0 * S.vtl), np.float32(120.0), 290.0 * S.vtl + 190.0 * vn, 120.0 + 60 * vn
            p2, z2 = fp * fp + bp * bp / 4, fz * fz + bz * bz / 4
            h = h * (((z2 - w2) + 1j * bz * w32) / ((p2 - w2) + 1j * bp * w32) * (p2 / z2))
        for pl, tr in nas.items():
            if not busy[pl]:
                continue
            a = tr[i0:i1][:, None]
            if np.any(a > 1e-3):
                h = h * (1 - a) + nresp[pl] * (a * (ngain[i0:i1][:, None] if pl != 'lab' else ngain[i0:i1][:, None] ** .4))
        c = clo[i0:i1][:, None]
        if np.any(c > 1e-3):
            h = h * ((1 - c) + c * low)
        return h
    return hfun


def breath_noise(dur, S, level=-30, seed=''):
    """An audible in-breath: open-tract noise that rises, then stops just before the phrase."""
    r = rng(f'breath-{S.name}-{seed}')
    n = int(dur * SR)
    x = r.standard_normal(n + 1024)
    x = spectral_shape(x, [(50, -50), (400, -26), (900, -9), (1500, -1), (2100, 0), (3000, -5), (4200, -4), (6500, -10), (10000, -16), (18000, -34)])[512:512 + n]
    x /= np.std(x)
    u = np.arange(n) / n
    e = np.sin(np.pi * np.clip(u, 0, 1) ** 1.5) ** 1.1 * (0.75 + 0.25 * smooth_noise(n, 14, r).clip(-2, 2) * 0.5)
    return x * e * db(level)
