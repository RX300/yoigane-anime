"""Arrangement. Every function renders one instrumental bus over the full 64 s (stereo, dry).

Arc: 0 s grief (koto, shakuhachi, low strings) / 8 s warmth (strings, flowing koto, shinobue) / 14 s comedy (pizzicato,
woodblock) / 20 s fear (drone, crawling cluster) / 28 s wrath (taiko, ostinato, growling brass) / 34 s Narumi (shamisen
riff, drum break) / 38 s Hota (brass swell) / 42 s Shio's wave (full ensemble) / 50 s resolve / 52 s the last bell / 56 s dawn in D major.
"""
import numpy as np

import instruments as I
from dsp import BEAT, bt, env, nm, place, rng, stereo
from score import CHORUS, COUNTER, E8, ft

P = lambda pos: pos * E8
S16 = BEAT / 4


# ------------------------------------------------------------------ koto, shamisen
def koto_bus():
    b = stereo()
    r = rng('koto-perf')

    def k(pos, note, vel=.6, dur=3.0, pan=None, bend=0.0, damp=1.0, jit=.005):
        m = nm(note) if isinstance(note, str) else note
        p = (m - 60) / 40 - .1 if pan is None else pan
        place(b, I.koto(m, round(float(vel), 2), dur, int(r.integers(3)), bend, damp), max(0.0, P(pos) + (r.normal(0, jit) if jit else 0)), 1.0, p)

    # bars 1-4: sparse answers around the voice
    for pos, n, v in [(0, 'D3', .62), (0, 'A3', .40), (1, 'D4', .42), (1.5, 'E4', .34), (5, 'D4', .40), (5.5, 'F4', .36), (6, 'A4', .46), (7, 'E4', .34),
                      (8, 'Bb2', .55), (9, 'F3', .40), (10, 'D4', .36), (12, 'F3', .34), (13, 'A4', .42), (13.5, 'F4', .36), (14, 'E4', .38), (14.5, 'D4', .36), (15, 'Bb3', .38),
                      (16, 'G2', .52), (17, 'D3', .38), (18, 'Bb3', .34), (20, 'G3', .36), (21, 'D4', .38), (21.5, 'F4', .38), (22, 'Bb4', .46),
                      (24, 'A2', .55), (25, 'E3', .38), (26, 'A3', .36), (27.5, 'Bb3', .34), (28, 'A3', .38), (29, 'D4', .36), (29.5, 'E4', .34), (30, 'C#4', .42)]:
        k(pos, n, v, 3.4)
    k(3, 'A4', .30, 2.5, bend=1.0)
    for j, n in enumerate(['C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5']):      # sweep into the memory
        k(31 + j * .12, n, .28 + .03 * j, 2.2, pan=-.5 + j * .13)
    # bars 5-7: flowing accompaniment in F
    pat = {32: ['F2', 'C3', 'A3', 'C4', 'F4', 'C4', 'A3', 'C4'], 36: ['F2', 'C3', 'A3', 'C4', 'G4', 'C4', 'A3', 'C4'],
           40: ['E3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3'], 44: ['D3', 'A3', 'C4', 'F4', 'A4', 'F4', 'C4', 'A3'],
           48: ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'D4'], 51: ['C3', 'G3', 'C4', 'E4'], 53: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4']}
    for p0, ns in pat.items():
        for j, n in enumerate(ns):
            k(p0 + j * .5, n, (.46 if j == 0 else .30) + r.uniform(-.03, .03), 2.4)
    # comedy joy: a quick grin of a flourish at frame 468
    for j, n in enumerate(['F4', 'A4', 'C5', 'D5', 'F5', 'A5', 'C6']):
        k(78 + j * .16, n, .5, .5, pan=-.5 + j * .16, damp=.4, jit=0)
    # bar 18: accents with the drum break
    for pos in (136, 137.5, 139):
        for n in ('D3', 'A3', 'D4', 'A4'):
            k(pos, n, .55, 1.0, damp=.5, jit=0)
    # chorus arpeggios
    for (p0, ln, root, vs, st) in CHORUS:
        if st < .7 or ln < 3:
            continue
        ms = [nm(v) for v in vs]
        seq = [ms[0], ms[1], ms[2], ms[0] + 12, ms[1] + 12, ms[0] + 12, ms[2], ms[1]]
        for j, m in enumerate(seq):
            if p0 + j * .5 < 207:
                k(p0 + j * .5, m, (.44 if j % 4 == 0 else .33) * st, 1.4, pan=.35 + .25 * np.sin(j), damp=.7)
    for p0, lo in ((167.2, 50), (191.0, 57)):
        sc = [m for m in range(lo, lo + 24) if m % 12 in (2, 4, 5, 9, 10)]
        for j, m in enumerate(sc):
            k(p0 + j * .08, m, .36 + .012 * j, 1.2, pan=-.6 + 1.2 * j / len(sc), jit=0)
    # cranes lift at frame 1154 (pos 192.33): high rising figures, two flocks
    for s, p0 in enumerate((192.33, 193.6, 195.0)):
        sc = [m for m in range(66 + 2 * s, 92) if m % 12 in (2, 4, 5, 9, 10)]
        for j, m in enumerate(sc):
            k(p0 + j * .085, m, .34, 1.0, pan=(-.7 + 1.4 * j / len(sc)) * (1 if s % 2 else -1), jit=0)
    # bars 28-32: the opening figure in major
    for pos, n, v in [(217, 'D4', .26), (218, 'F#4', .28), (219, 'A4', .30), (220, 'D5', .28), (221, 'E5', .26),
                      (224, 'G2', .5), (224, 'D3', .36), (225, 'B3', .32), (226, 'D4', .34), (227, 'F#4', .36), (228, 'D3', .42), (229, 'A3', .34), (230, 'D4', .34), (231, 'F#4', .36),
                      (232, 'E3', .42), (233, 'B3', .34), (234, 'D4', .36), (234.5, 'G4', .34), (236, 'A2', .46), (236.5, 'E3', .34), (237, 'G3', .32), (237.5, 'C#4', .34),
                      (238, 'D3', .5), (238, 'A3', .36), (239, 'D4', .34), (240, 'E4', .32), (241, 'F#4', .36), (242, 'A4', .36), (243, 'D5', .32),
                      (244, 'D3', .42), (244.06, 'A3', .34), (244.12, 'D4', .34), (244.18, 'F#4', .34), (244.24, 'A4', .36), (244.30, 'E5', .30), (246, 'F#4', .26), (247, 'A4', .26), (248, 'D5', .28), (249, 'E5', .24), (250, 'F#5', .22)]:
        k(pos, n, v, 3.2)
    return b


RIFF18 = [(0, 'D4', 1), (1, 'D4', .6), (2, 'Eb4', .8), (3, 'D4', 1), (4, 'A3', .7), (5, 'D4', .7), (6, 'G4', .9), (7, 'Eb4', .9)]
RIFF20 = [(0, 'D4', 1), (2, 'D4', .7), (3, 'F4', .8), (4, 'G4', .8), (6, 'F4', .9), (7, 'D4', .7), (8, 'F4', .9), (9, 'G4', .8), (10, 'Bb4', .9), (11, 'C#5', 1)]
RIFF21 = [(0, 'D4', 1), (2, 'D4', .7), (3, 'F4', .8), (4, 'A4', .9), (6, 'F4', .8), (7, 'D4', .7), (8, 'Bb3', .9), (10, 'D4', .7), (11, 'F4', .8), (12, 'G4', .9), (13, 'A4', .9), (14, 'Bb4', .9), (15, 'A4', .8)]


def shamisen_bus():
    b = stereo()
    r = rng('sham-perf')
    for bar, rf in ((18, RIFF18), (20, RIFF20), (21, RIFF21)):
        for st, n, v in rf:
            t = bt(bar) + st * S16
            for pan, off in ((-.35, 0.0), (.35, .007)):
                place(b, I.shamisen(nm(n), round(.62 * v + .12, 2), int(r.integers(4)) + (9 if pan > 0 else 0)), t + off + abs(r.normal(0, .002)), .9, pan)
            place(b, I.shamisen(nm(n) - 12, round(.6 * v, 2), int(r.integers(3))), t, .8, 0)
    for (p0, ln, root, vs, stg) in CHORUS:           # low drive on eighths
        if stg < .7 or p0 < 168:
            continue
        m = nm(root + '3')
        m = m - 12 if m > 52 else m
        for j in range(ln):
            if p0 + j > 206:
                break
            place(b, I.shamisen(m if j % 2 == 0 else m + 12, .62 if j % 2 == 0 else .45, int(r.integers(4))), P(p0 + j), .62, -.15 + .3 * (j % 2))
    return b


# ------------------------------------------------------------------ strings
def sect_of(m):
    return 'cb' if m < 41 else 'vc' if m < 54 else 'va' if m < 62 else 'vn'


def strings_bus():
    b = stereo()

    def s(pos, ln, note, vel, sect=None, **kw):
        m = nm(note) if isinstance(note, str) else note
        place(b, I.bowed(m, P(ln), vel, sect=sect or sect_of(m), seed=f'{pos}', **kw), P(pos))

    # bars 1-4
    for pos, ln, ns, v in [(2, 6, ['D2', 'D3', 'A3'], .26), (8, 8, ['Bb2', 'F3', 'D4'], .28), (16, 8, ['G2', 'D3', 'Bb3'], .32), (24, 8, ['A2', 'E3', 'A3'], .34)]:
        for n in ns:
            s(pos, ln, n, v, att=.9, rel=.7, vib=.6, players=4, swell=((0, .6), (.6, 1), (1, .7)))
    for pos, ln, n in [(16, 4, 'F4'), (20, 4, 'G4'), (24, 4.2, 'A4'), (28, 4, 'G4')]:
        s(pos, ln, n, .21, 'vn', att=.55, rel=.6, players=4, swell=((0, .8), (.5, 1), (1, .6)))
    # bars 5-7, warm
    for pos, ln, ns in [(32, 8, ['F2', 'C3', 'F3', 'A3', 'C4', 'F4']), (40, 4, ['E2', 'C3', 'G3', 'C4', 'E4', 'G4']), (44, 4, ['D2', 'A2', 'F3', 'C4', 'F4', 'A4']),
                        (48, 3, ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'Bb4']), (51, 1.8, ['C3', 'G3', 'C4', 'E4', 'G4']), (52.8, 2.9, ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'])]:
        for i, n in enumerate(ns):
            s(pos, ln, n, .40 - .025 * i, att=.35, rel=.45, vib=1.2, swell=((0, .75), (.5, 1), (1, .8)))
    for pos, ln, n in [(38, 2, 'C5'), (40, 3, 'E5'), (43, 1, 'D5'), (44, 2, 'C5'), (46, 2, 'A4'), (48, 3, 'D5'), (51, 1.5, 'C5'), (52.5, 3.2, 'A4')]:
        s(pos, ln, n, .25, 'vn', att=.22, rel=.35, vib=1.5, players=6)
    # bars 11-12: cluster that crawls upward and is cut dead at frame 576
    for i, n in enumerate(['D4', 'Eb4', 'A4', 'Bb4']):
        s(82 + 1.5 * i, 14 - 1.5 * i, n, .34, 'vn', att=.6, rel=.012, trem=27, slide=.9, swell=((0, .12), (.6, .45), (1, 1)))
    s(84, 12, 'D3', .34, 'vc', att=.8, rel=.012, trem=24, slide=1.0, swell=((0, .2), (1, 1)))
    # frames 602-658: harder cluster under the stare, ripped upward into the lunge
    for i, n in enumerate(['Eb4', 'E4', 'A4', 'Bb4', 'Eb5', 'E5']):
        s(100.4 + .4 * i, 7.6 - .4 * i, n, .32, 'vn', att=.25, rel=.012, trem=30, slide=1.4, swell=((0, .15), (.5, .35), (1, 1)))
    for i, n in enumerate(['A4', 'Bb4', 'E5', 'F5']):
        s(108, 1.83, n, .55, 'vn', att=.03, rel=.012, trem=32, slide=5.0, swell=((0, .5), (1, 1.2)))
    s(100.4, 9.4, 'Eb2', .5, 'cb', att=.6, rel=.012, trem=22, swell=((0, .3), (1, 1)))
    # bars 15-17, wrath: low ostinato then climbing tremolo
    ost = [0, 0, 1, 0, 3, 0, 1, 0]
    ost17 = [0, 0, 1, 0, 4, 0, 1, 0]
    for j in range(12, 46):
        bar = j // 16
        root = (38, 34 if j % 16 < 8 else 31, 33)[bar]
        m = root + (ost, (0, 0, 2, 0, 4, 0, 2, 0) if j % 16 < 8 else (0, 0, 2, 0, 3, 0, 2, 0), ost17)[bar][j % 8]
        v = .30 + .5 * (j / 48)
        for oc, sec, g in ((0, 'cb', .6), (12, 'vc', 1.0)):
            place(b, I.bowed(m + oc, .07, v * g, 4, .008, .07, .0, seed=f'w{j}', sect=sec, bright=.8), bt(15) + j * S16, 1.0)
    for pos, ln, ns in [(116, 4, ['A3', 'D4']), (120, 4, ['Bb3', 'D4', 'F4']), (124, 4, ['Bb3', 'D4', 'G4']), (128, 7.8, ['C#4', 'E4', 'G4', 'Bb4'])]:
        for n in ns:
            s(pos, ln, n, .20 + .018 * (pos - 116), att=.15, rel=.06, trem=26, swell=((0, .55), (1, 1)))
    # bar 18 coil: riff with the shamisen until everything stops at 35.0
    for bar, rf in ((18, RIFF18), (20, RIFF20), (21, RIFF21)):
        for st, n, v in rf:
            for oc, sec, g in ((0, 'va', .55), (-12, 'vc', .6)):
                place(b, I.bowed(nm(n) + oc, .075, .8 * v * g, 4, .006, .07, 0, seed=f'r{bar}{st}', sect=sec, bright=1.0), bt(bar) + st * S16)
    # after the deck stroke: a held low D
    s(144.4, 7.4, 'D2', .34, 'cb', att=.2, rel=.3, swell=((0, 1), (.6, .5), (1, .8)))
    s(144.4, 7.4, 'D3', .26, 'vc', att=.2, rel=.3, swell=((0, 1), (.6, .4), (1, .8)))
    # bar 20: climbing chord swell to the lantern at 40.0
    for pos, ln, ns in [(152, 4, ['Bb3', 'D4', 'F4', 'Bb4']), (156, 3.8, ['A3', 'C#4', 'E4', 'G4', 'A4'])]:
        for n in ns:
            s(pos, ln, n, .28, att=.25, rel=.05, trem=26, swell=((0, .45), (1, 1.1)))
    run = ['A4', 'Bb4', 'C#5', 'D5', 'E5', 'F5', 'G5', 'A5']
    for j, n in enumerate(run):
        place(b, I.bowed(nm(n), .07, .24 + .03 * j, 5, .012, .05, 0, seed=f'run{j}', sect='vn', bright=.6), bt(20, 4) + j * BEAT / 8)
    # chorus
    for c, (p0, ln, root, vs, stg) in enumerate(CHORUS):
        last = p0 == 204
        rel = .03 if last else .10
        L = ln - (.15 if last else .1)
        rt = nm(root + '2')
        rt = rt - 12 if rt > 45 else rt
        if stg > .7:
            for j in range(ln):
                if last and j == 3:
                    break
                place(b, I.bowed(rt, .16, (.62 if j == 0 else .48) * stg, 4, .012, .08, .2, seed=f'cb{c}{j}', sect='cb', bright=1), P(p0 + j))
                place(b, I.bowed(rt + 12, .15, (.62 if j % 2 == 0 else .46) * stg, 5, .010, .08, .2, seed=f'vc{c}{j}', sect='vc', bright=1), P(p0 + j))
            ms = [nm(v) for v in vs]
            seq = [ms[2], ms[1], ms[2], ms[0] + 12, ms[2], ms[1], ms[2], ms[0] + 12]
            for j, m in enumerate(seq[:2 * ln]):
                if last and j > 5:
                    break
                place(b, I.bowed(m, .06, (.34 if j % 2 == 0 else .25) * stg, 5, .006, .05, 0, seed=f'os{c}{j}', sect='vn', bright=.5), P(p0) + j * S16, 1.0)
        else:                                   # the wave hangs, then dives
            s(p0, ln, rt, .5, 'cb', att=.3, rel=.05, trem=24 if p0 == 187 else 0, swell=((0, .4), (1, 1.6 if p0 == 187 else 1)))
        for v in vs:
            s(p0, L, v, .30 * max(stg, .55), att=.07, rel=rel, vib=1.1, trem=26 if .4 < stg < .7 else 0,
              swell=((0, .9), (.5, 1), (1, .95)) if stg > .7 else ((0, .45), (1, .55 if stg < .4 else 1.5)))
    for pos, ln, n in COUNTER:
        soft = .55 if pos == 184 else 1
        s(pos, ln - (.12 if pos == 204 else 0), n, .40 * soft, 'vn', att=.06, rel=.10 if pos < 204 else .03, vib=1.5, players=8, spread=.8, swell=((0, .4), (1, 1.2)) if pos in (187,) else None)
        s(pos, ln - (.12 if pos == 204 else 0), nm(n) - 12, .24 * soft, 'vn', att=.06, rel=.10 if pos < 204 else .03, vib=1.2, players=5, spread=.4)
    # bars 27-28: the light comes back under the floating lanterns
    for pos, ln, ns, v in [(213, 5.0, ['D3', 'A3'], .14), (216, 8, ['D2', 'A2', 'D3', 'A3', 'F#4'], .22)]:
        for n in ns:
            s(pos, ln, n, v, att=1.0, rel=.8, vib=.7, swell=((0, .4), (.6, 1), (1, .9)))
    for pos, ln, n in [(217, 2, 'A4'), (219, 3, 'D5'), (222, 2, 'E5')]:
        s(pos, ln, n, .15, 'vn', att=.4, rel=.6, vib=1.0, players=5)
    # bars 29-32, dawn
    for pos, ln, ns in [(224, 4.2, ['G2', 'D3', 'G3', 'B3', 'D4']), (228, 4.2, ['F#2', 'D3', 'A3', 'D4', 'F#4']), (232, 4.1, ['E2', 'B2', 'G3', 'B3', 'D4']), (236, 2.1, ['A2', 'E3', 'G3', 'C#4', 'E4']),
                        (238, 14, ['D2', 'A2', 'D3', 'A3', 'D4', 'F#4', 'E5'])]:
        fin = pos == 238
        for i, n in enumerate(ns):
            s(pos, ln, n, .34 - .02 * i, att=.5, rel=1.4 if fin else .7, vib=1.1, swell=((0, .7), (.3, 1), (1, .3)) if fin else ((0, .7), (.5, 1), (1, .8)))
    for pos, ln, n in [(226, 2, 'F#4'), (228, 3, 'A4'), (231, 1, 'F#4'), (232, 2, 'G4'), (234, 2, 'B4'), (236, 2, 'A4'), (238, 12, 'F#4'), (244, 6, 'A4')]:
        s(pos, ln, n, .19, 'vn', att=.3, rel=1.6 if pos >= 238 else .6, vib=1.4, players=6, swell=((0, .8), (.4, 1), (1, .3 if pos >= 238 else .8)))
    return b


def pizz_bus():
    """Bars 8-10: sneaking pizzicato in F with a stumble, panels, a worried climb, and a full stop at the black frame."""
    b = stereo()
    r = rng('pizz-perf')

    def p(pos, note, vel=.7, pan=0.0):
        m = nm(note) if isinstance(note, str) else note
        place(b, I.pizz(m, vel, int(r.integers(4))), P(pos) + r.normal(0, .003), 1.0, pan)
        place(b, I.pizz(m, round(vel * .7, 2), 5 + int(r.integers(4))), P(pos) + abs(r.normal(.005, .003)), .7, pan + .2)
    for pos, n in [(56, 'F2'), (58, 'C3'), (60, 'F2')]:
        p(pos, n, .9, -.25)
    for pos in (57, 59):
        for n in ('A3', 'C4', 'F4'):
            p(pos, n, .5, .2)
    for pos, n, v in [(56, 'C5', .75), (56.5, 'D5', .6), (57, 'C5', .7), (58, 'A4', .7), (58.5, 'Bb4', .55), (59, 'A4', .65), (60, 'F4', .7), (60.5, 'G4', .55)]:
        p(pos, n, v, .1)
    for n in ('F2', 'B2', 'F3', 'B3', 'Eb4'):                    # snatched: wrong chord
        p(61, n, .9, 0)
    for i, f in enumerate((396, 400, 404)):                       # panels
        for n in (('F2', 'C3', 'Ab3'), ('Gb2', 'Db3', 'A3'), ('G2', 'D3', 'Bb3', 'F4', 'B4'))[i]:
            place(b, I.pizz(nm(n), .95, 2), ft(f), 1.0, 0)
    for j in range(13):                                           # worry climbs
        p(68 + j * .25, nm('F3') + j, round(.40 + .02 * j, 2), -.3 + .05 * j)
    for n in ('F3', 'A3', 'C4', 'F4'):                            # joy
        place(b, I.pizz(nm(n), .9, 3), ft(468), 1.0, 0)
    place(b, I.pizz(nm('C3'), .8, 1), ft(468) + .125, 1.0, -.2)
    place(b, I.pizz(nm('F2'), .9, 1), ft(468) + .25, 1.0, -.2)
    return b


# ------------------------------------------------------------------ flutes
def flute_bus():
    b = stereo()

    def line(notes, kind, t0, total, gain, pan, vel=1.0):
        nt = [(P(p) - t0, P(l) * .97, nm(n), v, o) for p, l, n, v, o in notes]
        place(b, I.flute(nt, total, kind, f'{t0}', vel), t0, gain, pan)
    line([(0, 1.8, 'D4', .5, dict(att=.10, rel=.3, scoop=-1.2, vib=.4))], 'shaku', 0.0, 1.2, .5, -.45)
    line([(13.5, .8, 'A4', .42, dict(att=.08, scoop=-.8)), (14.3, .6, 'Bb4', .46, dict()), (14.9, 1.4, 'A4', .44, dict(rel=.25, fall=-.9))], 'shaku', 3.2, 1.2, .55, -.45)
    line([(29.5, .5, 'E4', .4, dict(att=.08)), (30, .5, 'F4', .42, {}), (30.5, 1.8, 'E4', .46, dict(rel=.35, vib=.6))], 'shaku', 7.2, 1.2, .5, -.45)
    line([(38, 1, 'F5', .40, dict(att=.06)), (39, .5, 'G5', .42, {}), (39.5, 1.2, 'A5', .46, dict(rel=.15)), (45, 1, 'C5', .38, {}), (46, 1, 'D5', .40, {}), (47, 1, 'F5', .42, dict(rel=.15)),
          (53, .5, 'A5', .44, {}), (53.5, .5, 'G5', .42, {}), (54, 1.8, 'F5', .44, dict(rel=.35, vib=.7))], 'shinobue', 9.4, 4.6, .52, .35)
    line([(56, .4, 'C6', .55, dict(grace=-2)), (57, .35, 'C6', .5, {}), (58, .4, 'A5', .5, dict(grace=2)), (59, .35, 'A5', .5, {}), (60, .4, 'F5', .5, {}), (60.5, .3, 'G5', .5, {})],
         'shinobue', 13.9, 1.6, .55, .25)
    line([(78, .4, 'A5', .6, dict(grace=2)), (78.5, .25, 'C6', .6, {}), (78.75, .55, 'F6', .65, dict(grace=-1))], 'shinobue', 19.4, .8, .5, .25)
    line([(82, 3, 'Eb4', .22, dict(att=.5, rel=.5, fall=-.7)), (88, 3, 'D4', .20, dict(att=.5, rel=.5, fall=-1.2))], 'shaku', 20.3, 4.0, .6, .5)
    # battle signals: after the landing, and over the flame
    line([(147, 2.6, 'D5', .5, dict(att=.10, scoop=-1.5, rel=.3, vib=.8))], 'shaku', 36.6, 1.6, .55, .3)
    line([(152, 1.4, 'F5', .7, dict(scoop=-2, rel=.12)), (154, 1, 'D5', .65, {}), (155, 1, 'G5', .72, {}), (156, 1.5, 'A5', .8, dict(grace=2, rel=.10)), (157.6, 2.3, 'C#6', .9, dict(grace=-2, rel=.05))],
         'shinobue', 37.9, 2.4, .48, -.3)
    line([(p, l - (.12 if p == 204 else 0), n, .78 * (.6 if p == 184 else 1), dict(grace=2 if i % 3 == 0 else 0, rel=.05)) for i, (p, l, n) in enumerate(COUNTER)], 'shinobue', 39.9, 12.2, .36, .4)
    # lanterns and dawn
    line([(217, 1, 'A5', .28, dict(att=.10)), (218, 1, 'B5', .28, {}), (219, 2.6, 'A5', .32, dict(rel=.5, vib=.6))], 'shinobue', 54.0, 2.2, .34, .35)
    line([(229.5, .5, 'D5', .34, dict(att=.08)), (230, .5, 'E5', .34, {}), (230.5, 1.6, 'F#5', .40, dict(rel=.3, vib=.6))], 'shaku', 57.2, 1.6, .5, -.35)
    line([(241, 1, 'A5', .34, dict(att=.08)), (242, 1, 'B5', .36, {}), (243, 1, 'D6', .36, {}), (244, 3.5, 'A5', .38, dict(rel=.8, vib=.8))], 'shinobue', 60.0, 2.6, .40, .35)
    return b


# ------------------------------------------------------------------ pads and brass
def pad_bus():
    b = stereo()
    nn = lambda *xs: [nm(x) for x in xs]
    place(b, I.sho(nn('D5', 'E5', 'A5', 'B5'), 3.2, .30, 'a', 1.2, 1.2), bt(3, 1), .5)
    place(b, I.sho(nn('D5', 'Eb5', 'A5', 'Bb5', 'E6'), 3.7, .34, 'b', 2.0, .012, swell=((0, .3), (.7, .6), (1, 1))), 20.3, .55)
    place(b, I.sho(nn('Eb5', 'E5', 'Bb5', 'B5'), 1.9, .34, 'b2', .7, .012, swell=((0, .3), (1, 1))), 25.15, .5)
    place(b, I.sho(nn('A4', 'D5', 'E5', 'A5', 'D6'), 4.0, .30, 'c', .2, .2), 42.0, .45)
    place(b, I.sho(nn('A4', 'D5', 'F5', 'A5', 'D6'), 1.9, .34, 'd', .15, .05), 50.0, .5)
    place(b, I.sho(nn('D5', 'E5', 'A5', 'B5', 'F#6'), 9.0, .30, 'e', 2.2, 1.0, swell=((0, .5), (.5, 1), (1, .35))), 54.0, .55)
    d = I.drone(4.05, 26, .75, 'fear', (0, 12, 13, 18), .3)
    d *= env([(0, 0), (.5, .5), (3.0, .85), (3.99, 1.05), (4.0, 0.0), (4.05, 0)], len(d))[:, None]
    place(b, d, 20.0, 1.5)
    d = I.drone(2.9, 27, .8, 'stare', (0, 12, 13, 19), .5)
    d *= env([(0, .3), (1.5, .7), (2.75, 1.2), (2.8, 0), (2.9, 0)], len(d))[:, None]
    place(b, d, 25.083, 1.5)
    d = I.drone(5.8, 26, .6, 'wrath', (0, 12, 19), .5)
    d *= env([(0, .3), (3, .7), (5.7, 1.1), (5.8, 0)], len(d))[:, None]
    place(b, d, 28.1, 1.1)
    return b


def brass_bus():
    b = stereo()

    def q(t, d, note, vel, **kw):
        place(b, I.brass(nm(note), d, vel, seed=f'{t:.2f}', **kw), t)
    q(bt(15, 3), .9, 'D2', .6, players=3)                          # wrath: low growls
    q(bt(16, 1), 1.9, 'D2', .62, players=3)
    q(bt(16, 1), 1.9, 'Bb2', .55, players=3)
    for n in ('A1', 'A2', 'E3', 'G3'):
        q(bt(17, 1), 1.93, n, .72, players=3, swell=((0, .25), (.9, 1), (1, 1)), rel=.06)
    for n, v in (('Bb1', .75), ('Bb2', .75), ('F3', .7), ('Bb3', .7), ('D4', .65)):   # Hota: swell to the lantern
        q(bt(20, 1), .96, n, v, swell=((0, .7), (.1, .40), (1, .85)), players=4)
    for n, v in (('A1', .85), ('A2', .85), ('E3', .8), ('A3', .8), ('C#4', .75), ('E4', .75), ('G4', .7)):
        q(bt(20, 3), .94, n, v, swell=((0, .55), (1, 1.15)), players=4, rel=.04)
    for (p0, ln, root, vs, stg) in CHORUS:
        t, d = P(p0), P(ln) - .07
        rt = nm(root + '2')
        rt = rt - 12 if rt > 46 else rt
        if stg < .4:
            continue
        if stg < .7:                                              # dive: a rising low swell
            for m in (rt, rt + 12):
                place(b, I.brass(m, d, .8, 3, ((0, .2), (1, 1.2)), f'dive{m}', rel=.03), t, .9)
            continue
        fifth = rt + (8 if vs[0] == 'C4' else 7)
        for m, v in ((rt, .66), (fifth, .5), (rt + 12, .58)):
            place(b, I.brass(m, d, v * stg, 3, ((0, 1), (.25, .7), (1, .95 if p0 >= 200 else .72)), f'ch{p0}', rel=.05), t, .9)
        if p0 in (160, 168, 176, 190, 192, 200, 204):
            for v in vs:
                place(b, I.brass(nm(v), d, .56, 3, ((0, .9), (.3, .6), (1, .8)), f'cv{p0}', rel=.05), t, .8)
    q(59.5, 2.6, 'D3', .28, players=3, swell=((0, .2), (.4, .8), (1, .2)), att=.4, rel=.8)
    q(59.5, 2.6, 'A3', .24, players=3, swell=((0, .2), (.4, .8), (1, .2)), att=.4, rel=.8)
    return b


# ------------------------------------------------------------------ percussion
GRID = {
    15: dict(o='........x.......', n='........o...o.o.'),
    16: dict(o='X.......X.......', n='..o...o...o.x.o.', s='o...o...o.o.o.o.'),
    17: dict(o='X...x...X...X.x.', n='x.ooxoooxoooxxxx', s='oooooooooooooooo'),
    18: dict(o='X..X..X.........', n='x.xxx.xx........', s='xoxoxoxo........', k='....x...........', c='X...............'),
    19: dict(n='..............xx', s='.............xxx'),
    20: dict(o='X.....X...X.....', n='..x.xx..x.x.....', s='xooxooxoxoxo....', k='....x...........', c='X...............'),
    21: dict(o='X.....X...X...X.', n='..x.xx..x.xxxxxx', s='xooxooxooxooxxxx', k='....x.......x...', c='X...............'),
    22: dict(o='X.......X.X.....', n='X..x..x.x..x..x.', s='x.oox.oox.oox.oo', k='....x.......x...', c='X...............'),
    23: dict(o='X.......X.....X.', n='X..x..x.x..x.xxx', s='x.oox.oox.ooxxxx', k='....x.......x...', c='X...............'),
    24: dict(o='............X...', n='............X.xx', c='............X...'),
    25: dict(o='X...X...X...X...', n='X.xxx.xxX.xxx.xx', s='xoxoxoxoxoxoxoxo', k='....x.......x...', c='X.......x.......'),
    26: dict(o='X.X.X...X...X...', n='X.X.X.xxXxxxxxx.', s='xoxoxoxoxxxxxxx.', k='....x...........', c='X.......X.......'),
}
VELS = {'X': 1.0, 'x': .74, 'o': .42}
CRES = {15: .7, 16: .8, 17: .95, 20: .95}


def perc_bus():
    b = stereo()
    r = rng('perc-perf')
    kinds = {'o': ('o', 1.25, 0.0), 'n': ('nagado', .85, -.3), 's': ('shime', .42, .35)}
    q = lambda v: float(np.clip(round(v, 1), .3, 1))
    for bar, g in GRID.items():
        for key, pat in g.items():
            for st, ch in enumerate(pat):
                if ch == '.':
                    continue
                v = VELS[ch] * CRES.get(bar, 1.0) * (1 + r.normal(0, .04))
                if bar == 17:
                    v *= .55 + .45 * st / 15
                t = bt(bar) + st * S16 + (0 if ch == 'X' else r.normal(0, .0025))
                if key in kinds:
                    name, gain, pan = kinds[key]
                    place(b, I.taiko(name, q(v), int(r.integers(4))), t, gain * (.6 + .4 * v), pan)
                    if key == 'n':
                        place(b, I.taiko('chu', q(v), int(r.integers(4))), t + .004, .5 * v, .28)
                elif key == 'k':
                    place(b, I.rim(.9, int(r.integers(4))), t, .9, .2)
                    place(b, I.chappa(.55, .6, int(r.integers(3)), True), t, .8, -.35)
                elif key == 'c':
                    place(b, I.chappa(round(.9 * v, 1), 2.2, int(r.integers(3))), t, .85, -.15)
                    place(b, I.chappa(round(.8 * v, 1), 2.0, 10 + int(r.integers(3))), t, .7, .35)
    # rolls: into the pole's first ring, over the taut paper, down the wave, into the last bell
    for t0, t1, v0, v1 in ((bt(17, 3), bt(18) - .02, .25, .75), (ft(946), ft(960) - .03, .25, .7), (ft(1122), ft(1140) - .03, .3, 1.0), (bt(26, 3), ft(1243), .4, .9)):
        k = int((t1 - t0) / .0625)
        for j in range(k):
            u = j / k
            place(b, I.taiko('shime', q(v0 + (v1 - v0) * u), int(r.integers(5))), t0 + j * .0625 + r.normal(0, .002), .34, .35)
            place(b, I.taiko('nagado', q(.3 + .5 * u), int(r.integers(4))), t0 + j * .0625, .34 * (.4 + u), -.3)
    for f in (1206, 1212):                                         # resolve panels 2 and 3 get full strokes
        place(b, I.taiko('o', 1.0, 1), ft(f), 1.2)
        place(b, I.hyoshigi(.9, 2), ft(f), .5)
    place(b, I.hyoshigi(.9, 2), ft(1200), .5)
    # lone strokes
    place(b, I.taiko('o', .4, 2), bt(5), .30)
    place(b, I.taiko('o', .5, 1), bt(11), .7)
    place(b, I.taiko('o', .4, 2), ft(1428), .40)
    place(b, I.chappa(.4, 3.0, 4), ft(1296), .30, .2)
    return b


def comedy_perc_bus():
    b = stereo()
    w = lambda t, f, v=.8, pan=0., long=1.0: place(b, I.woodblock(f, v, 0, long), t, 1.0, pan)
    for j in range(5):                                             # walking
        w(14.0 + j * .25, 760 if j % 2 == 0 else 980, .5 if j % 2 else .62, -.25 + .5 * (j % 2))
    w(ft(372), 1450, .8, .1)                                       # teeth on nothing
    for i, f in enumerate((396, 400, 404)):
        place(b, I.hyoshigi(.75 + .12 * i, i), ft(f), .75 + .1 * i, -.4 + .4 * i)
        place(b, I.taiko('nagado', .7 + .1 * i, i), ft(f), .55 + .12 * i, 0)
        place(b, I.tsuzumi(.8, 1 + .3 * i, i), ft(f), .8, .3 - .3 * i)
    for j in range(12):                                            # flailing
        w(17.0 + j / 12, 640 + 46 * j, .5, -.5 + j / 12)
    w(ft(432), 1180, .8, -.2)
    w(ft(456) + .20, 430, .85, 0.0, 2.2)                           # the spare arrives
    place(b, I.tsuzumi(.9, 1.4, 1), ft(468), .9, .1)
    w(ft(468) + .25, 1180, .7, .2)
    return b


def accent_bus():
    """Impact layers and musical bell strokes that belong to the score."""
    b = stereo()
    place(b, I.impact(.70, 2, .2, 1.8), bt(17), .45)
    place(b, I.impact(.95, 3, 0, 1.0, .4), bt(18), .9)
    place(b, I.impact(.8, 4, .2, 1.8), bt(20), .6)
    place(b, I.impact(1.0, 5, 0, 2.6, .6), bt(22), .85)
    place(b, I.impact(.75, 6, .2, 2.0), bt(23), .45)
    place(b, I.impact(.8, 7, 0, 2.4, .5), bt(25), .55)
    for f, g in ((1200, .8), (1206, .7), (1212, .85)):
        place(b, I.impact(.9, f, .1, 1.2, .3), ft(f), g)
    place(b, I.bell(293.66, 6.0, .8, 0, 3), bt(22), .60, .1)
    place(b, I.bell(293.66, 3.0, .8, 0, 3), bt(25), .45, .1)
    place(b, I.bell(293.66, 2.0, .8, 0, 3), bt(26), .55, .1)
    return b


BUSES = dict(koto=koto_bus, shamisen=shamisen_bus, strings=strings_bus, pizz=pizz_bus, flute=flute_bus, pad=pad_bus,
             brass=brass_bus, perc=perc_bus, comedy=comedy_perc_bus, accent=accent_bus)
