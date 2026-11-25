"""Shared signal-processing tools. Everything here is plain numpy/scipy maths."""
import wave
import zlib

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
DUR = 64.0
N = int(round(DUR * SR))
FPS = 24
TAU = 2 * np.pi


def bt(bar, beat=1.0):
    """Time in seconds of a 1-based bar and 1-based (fractional) beat."""
    return (bar - 1) * BAR + (beat - 1) * BEAT


def rng(name):
    """Deterministic generator named by a string, so every rebuild is identical."""
    return np.random.default_rng(zlib.crc32(str(name).encode()))


def db(x):
    return 10.0 ** (np.asarray(x, float) / 20.0)


def todb(x, floor=1e-12):
    return 20 * np.log10(np.maximum(np.abs(x), floor))


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, float) - 69.0) / 12.0)


NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(s):
    """Note name to MIDI number: 'C#4', 'Bb3'."""
    p, i = NAMES[s[0]], 1
    while s[i] in '#b':
        p += 1 if s[i] == '#' else -1
        i += 1
    return p + 12 * (int(s[i:]) + 1)


# ---------------------------------------------------------------- envelopes
def env(points, n, sr=SR, shape='lin'):
    """Breakpoint envelope. points = [(t, v), ...]; 'cos' eases between points, 'exp' is linear in dB."""
    t = np.arange(n) / sr
    xs = np.array([p[0] for p in points], float)
    ys = np.array([p[1] for p in points], float)
    if shape == 'exp':
        return 10 ** np.interp(t, xs, np.log10(np.maximum(ys, 1e-5)))
    if shape == 'cos':
        i = np.clip(np.searchsorted(xs, t, side='right') - 1, 0, len(xs) - 2)
        u = np.clip((t - xs[i]) / np.maximum(xs[i + 1] - xs[i], 1e-9), 0, 1)
        u = 0.5 - 0.5 * np.cos(np.pi * u)
        return ys[i] + (ys[i + 1] - ys[i]) * u
    return np.interp(t, xs, ys)


def fade(x, a=0.002, b=0.005, sr=SR):
    x = np.array(x, float)
    na, nb = min(int(a * sr), len(x)), min(int(b * sr), len(x))
    if na > 0:
        w = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
        x[:na] = (x[:na].T * w).T
    if nb > 0:
        w = np.cos(np.linspace(0, np.pi / 2, nb)) ** 2
        x[-nb:] = (x[-nb:].T * w).T
    return x


def smooth_noise(n, rate, r, sr=SR):
    """Roughly unit-variance noise with energy below `rate` Hz (cubic interpolation of random knots)."""
    k = max(6, int(np.ceil(n / sr * rate * 2)) + 5)
    y = r.standard_normal(k)
    xs = np.arange(n) / sr * rate * 2 + 1
    i = np.clip(xs.astype(int), 1, k - 3)
    f = xs - i
    ym, y0, y1, y2 = y[i - 1], y[i], y[i + 1], y[i + 2]
    return (y0 + 0.5 * f * (y1 - ym + f * (2 * ym - 5 * y0 + 4 * y1 - y2 + f * (3 * (y0 - y1) + y2 - ym)))) * 1.15


# ---------------------------------------------------------------- filters
def biquad(kind, f, q=0.707, g=0.0, sr=SR):
    """RBJ biquad as one second-order section."""
    w = TAU * f / sr
    c, s = np.cos(w), np.sin(w)
    al = s / (2 * q)
    A = 10 ** (g / 40)
    if kind == 'lp':
        b, a = [(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + al, -2 * c, 1 - al]
    elif kind == 'hp':
        b, a = [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]
    elif kind == 'bp':
        b, a = [al, 0, -al], [1 + al, -2 * c, 1 - al]
    elif kind == 'pk':
        b, a = [1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A]
    elif kind in ('ls', 'hs'):
        sq = 2 * np.sqrt(A) * al
        k = 1 if kind == 'ls' else -1
        b = [A * ((A + 1) - k * (A - 1) * c + sq), k * 2 * A * ((A - 1) - k * (A + 1) * c),
             A * ((A + 1) - k * (A - 1) * c - sq)]
        a = [(A + 1) + k * (A - 1) * c + sq, -k * 2 * ((A - 1) + k * (A + 1) * c),
             (A + 1) + k * (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    b, a = np.array(b) / a[0], np.array(a) / a[0]
    return np.concatenate([b, a])


def eq(x, *bands, sr=SR):
    """eq(x, ('hp', 90), ('pk', 3000, 1.0, 2.0)) on mono (n,) or stereo (n, 2)."""
    sos = np.array([biquad(b[0], b[1], b[2] if len(b) > 2 else 0.707, b[3] if len(b) > 3 else 0.0, sr) for b in bands])
    return signal.sosfilt(sos, x, axis=0)


def spectral_shape(x, pts, sr=SR):
    """Zero-phase magnitude shaping; pts = [(Hz, dB), ...] interpolated on a log-frequency axis."""
    n = len(x)
    nf = int(2 ** np.ceil(np.log2(n + 2048)))
    f = np.fft.rfftfreq(nf, 1 / sr)
    lf = np.log2(np.maximum(f, 10.0))
    g = np.interp(lf, np.log2([p[0] for p in pts]), [p[1] for p in pts])
    return np.fft.irfft(np.fft.rfft(x, nf) * db(g), nf)[:n]


def tv_filter(x, hfun, n_frames, hop=120, nfft=4096, chunk=24):
    """Time-varying filter: x is cut into 50 %-overlapped Hann windows, each convolved with its own
    impulse response. hfun(i0, i1) returns the complex response (frames, nfft//2+1).
    Single precision and small chunks keep the work inside the CPU cache."""
    w = signal.get_window('hann', 2 * hop, fftbins=True).astype(np.float32)
    need = n_frames * hop + 2 * hop
    pad = np.concatenate([np.zeros(hop), x, np.zeros(max(0, need - len(x)))]).astype(np.float32)
    out = np.zeros(n_frames * hop + nfft + 4 * hop, np.float64)
    idx = np.arange(2 * hop)
    for i0 in range(0, n_frames, chunk):
        i1 = min(n_frames, i0 + chunk)
        if not np.any(pad[i0 * hop:(i1 + 1) * hop]):
            continue
        seg = pad[(np.arange(i0, i1) * hop)[:, None] + idx] * w
        y = np.fft.irfft(np.fft.rfft(seg, nfft, axis=1) * np.asarray(hfun(i0, i1), np.complex64), nfft, axis=1)
        for j in range(i1 - i0):
            a = (i0 + j) * hop
            out[a:a + nfft] += y[j]
    return out[hop:hop + len(x)]


# ---------------------------------------------------------------- placement
def pan_gains(p):
    """Constant-power pan, p in [-1, 1]; centre gives 0.707 in each channel."""
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.cos(th), np.sin(th)


# frames where everything still ringing is cut dead (hard blacks and silences)
HARD_CUTS = (336, 476, 576, 670, 1252)


def place(buf, sig, t, gain=1.0, pan=0.0, through=False):
    """Mix a mono or stereo signal into a stereo buffer at time t (pan may be an array).
    Sounds do not ring across a hard cut unless through=True (continuous beds)."""
    i = int(round(t * SR))
    if not through and len(buf) == N:
        for c in HARD_CUTS:
            k = int(c * SR / FPS)
            if i < k < i + len(sig):
                sig = fade(sig[:k - i], 0, .008)
                if np.ndim(pan):
                    pan = pan[:k - i]
                break
    if sig.ndim == 1:
        gl, gr = pan_gains(pan)
        sig = np.stack([sig * gl, sig * gr], 1)
    if i < 0:
        sig, i = sig[-i:], 0
    m = min(len(sig), len(buf) - i)
    if m > 0:
        buf[i:i + m] += sig[:m] * gain
    return buf


def stereo():
    return np.zeros((N, 2))


# ---------------------------------------------------------------- reverb
def make_ir(name, t60=1.8, pre=0.018, bright=0.45, low=1.15, er=9, er_span=0.07, er_gain=0.7, size=1.0):
    """Synthetic stereo room: sparse early reflections plus a noise tail whose decay depends on frequency."""
    r = rng('ir-' + name)
    n = int((pre + t60 * 1.2 + 0.1) * SR)
    ir = np.zeros((n, 2))
    edges = [0, 180, 400, 900, 2000, 4200, 8000, 14000, 24000]
    n_tail = n - int(pre * SR)
    t = np.arange(n_tail) / SR
    nf = int(2 ** np.ceil(np.log2(n_tail + 4096)))
    f = np.maximum(np.fft.rfftfreq(nf, 1 / SR), 1)
    for ch in range(2):
        nz = np.fft.rfft(r.standard_normal(n_tail), nf)
        tail = np.zeros(n_tail)
        for lo, hi in zip(edges[:-1], edges[1:]):
            m = 1 / (1 + (f / hi) ** 8)
            if lo > 0:
                m = m * (1 - 1 / (1 + (f / lo) ** 8))
            mid = np.sqrt(max(lo, 60) * hi)
            frac = np.clip(np.log2(mid / 500) / np.log2(14000 / 500), -1, 1)
            tb = t60 * (1 + (low - 1) * max(0, -frac) * 1.5) * (1 - (1 - bright) * max(0, frac))
            tail += np.fft.irfft(nz * m, nf)[:n_tail] * 10 ** (-3 * t / tb)
        tail *= 1 - np.exp(-t / (0.012 * size))
        ir[int(pre * SR):, ch] += tail
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    for k in range(er):
        tt = pre * 0.5 + er_span * ((k + 1 + 0.6 * r.uniform(-1, 1)) / er) ** 1.2
        g = er_gain * 0.2 * (0.82 ** k) * (1 if r.random() > 0.4 else -1)
        gl, gr = pan_gains(r.uniform(-0.9, 0.9))
        i = int(tt * SR)
        if i + 1 < n:
            ir[i, 0] += g * gl
            ir[i, 1] += g * gr
    return fade(ir, 0.0, 0.1)


def convolve_ir(x, ir):
    """Stereo in, stereo out, same length."""
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)


# ---------------------------------------------------------------- dynamics
def follow(x, att, rel, sr=SR, dec=48):
    """Envelope follower on |x| (max over channels), computed at sr/dec and interpolated back."""
    m = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=1)
    k = len(m) // dec
    p = m[:k * dec].reshape(k, dec).max(1)
    ca, cr = np.exp(-dec / (att * sr)), np.exp(-dec / (rel * sr))
    out = np.empty(k)
    e = 0.0
    for i, v in enumerate(p):
        c = ca if v > e else cr
        e = c * e + (1 - c) * v
        out[i] = e
    return np.interp(np.arange(len(m)), np.arange(k) * dec + dec / 2, out)


def compress(x, thr=-20.0, ratio=2.5, att=0.008, rel=0.12, knee=6.0, makeup=0.0):
    e = todb(follow(x, att, rel), 1e-6)
    over = e - thr
    soft = (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee)
    g = np.where(over <= -knee / 2, 0.0, np.where(over >= knee / 2, over * (1 / ratio - 1), soft))
    g = db(g + makeup)
    return x * (g if x.ndim == 1 else g[:, None])


def k_weight(x):
    """BS.1770-4 K-weighting (48 kHz coefficients)."""
    sos = np.array([[1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585],
                    [1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621]])
    return signal.sosfilt(sos, x, axis=0)


def lufs(x, momentary=False):
    """Integrated loudness (BS.1770-4 with gating) of a stereo signal."""
    y = k_weight(x) ** 2
    c = np.concatenate([np.zeros((1, y.shape[1])), np.cumsum(y, 0)])
    w, h = int(0.4 * SR), int(0.1 * SR)
    st = np.arange(0, len(x) - w + 1, h)
    p = ((c[st + w] - c[st]) / w).sum(1)
    loud = -0.691 + 10 * np.log10(np.maximum(p, 1e-12))
    if momentary:
        return st / SR + 0.2, loud
    g1 = p[loud > -70]
    if len(g1) == 0:
        return -99.0
    rel = -0.691 + 10 * np.log10(g1.mean()) - 10
    g2 = p[(loud > -70) & (loud > rel)]
    return -0.691 + 10 * np.log10(g2.mean())


def true_peak_db(x, os=8):
    m = 0.0
    for c in range(x.shape[1]):
        m = max(m, np.max(np.abs(signal.resample_poly(x[:, c], os, 1))))
    return 20 * np.log10(max(m, 1e-9))


def limiter_gain(x, ceiling_db=-1.3, look=0.004, rel=0.10):
    """Look-ahead gain curve from 4x-oversampled peaks; applied to the mix and to every stem alike."""
    c = db(ceiling_db)
    pk = np.zeros(len(x))
    for ch in range(x.shape[1]):
        o = np.abs(signal.resample_poly(x[:, ch], 4, 1)).reshape(len(x), 4).max(1)
        pk = np.maximum(pk, o)
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    L = int(look * SR)
    g = np.log(minimum_filter1d(need, 2 * L + 1))
    dec = 16
    k = int(np.ceil(len(g) / dec))
    gg = np.pad(g, (0, k * dec - len(g)), mode='edge').reshape(k, dec).min(1)
    cr = np.exp(-dec / (rel * SR))
    e, out = 0.0, np.empty(k)
    for i, v in enumerate(gg):
        e = v if v < e else cr * e + (1 - cr) * v
        out[i] = e
    rel_g = np.minimum(np.repeat(out, dec)[:len(g)], g)
    return np.exp(uniform_filter1d(uniform_filter1d(rel_g, L), L))


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / drive


# ---------------------------------------------------------------- files
def write_wav24(path, x):
    x = np.asarray(x)
    if x.ndim == 1:
        x = x[:, None]
    v = np.clip(np.round(x * 8388607.0), -8388608, 8388607).astype('<i4')
    raw = v.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw)


def read_wav24(path):
    with wave.open(str(path), 'rb') as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = np.frombuffer(w.readframes(n), np.uint8).reshape(-1, sw)
    if sw != 3:
        raise ValueError(f'{path}: expected 24-bit, got {8 * sw}-bit')
    v = raw[:, 0].astype(np.int32) | (raw[:, 1].astype(np.int32) << 8) | (raw[:, 2].astype(np.int8).astype(np.int32) << 16)
    return v.reshape(-1, ch) / 8388608.0, sr
