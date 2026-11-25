"""Everything sung or called: Shio's solo line, the choir, Minato's whisper, the drummers' shouts."""
import numpy as np

import score as SC
import voice as V
from dsp import N, SR, db, place, rng, stereo

# Shio. One tract, different effort per scene.
BASE = dict(vtl=1.0, vib_rate=5.5)
SHIO = {
    'solo_soft': V.Singer('shio', rd=1.35, breath=-27, vib_cents=36, vib_delay=.30, cons=1.5, fric=-2, **BASE),
    'solo_warm': V.Singer('shio', rd=1.25, breath=-28, vib_cents=32, vib_delay=.30, cons=1.5, fric=-2, **BASE),
    'solo_wrath': V.Singer('shio', rd=.85, breath=-30, vib_cents=48, vib_delay=.34, cons=4, fric=0, ring=.3, jitter=.006, shimmer=.04, **BASE),
    'solo_full': V.Singer('shio', rd=.95, breath=-30, vib_cents=46, vib_delay=.24, ring=.45, cons=3, fric=0, nasal=1.25, **BASE),
    'solo_dawn': V.Singer('shio', rd=1.3, breath=-27, vib_cents=36, vib_delay=.30, cons=1.5, fric=-2, **BASE),
}
MINATO = V.Singer('minato', vtl=1.2, whisper=True)
EFFORT = {'solo_soft': -1.5, 'solo_warm': -2.0, 'solo_wrath': 1.0, 'solo_full': 1.5, 'solo_dawn': -1.5}   # dB before compression


def render_notes(tuples, S, oct=0, seed=''):
    """Sing a list of (t, d, midi, mora, opts); returns (start time, result of voice.sing)."""
    t0 = tuples[0][0] - 0.4
    end = tuples[-1][0] + tuples[-1][1]
    notes = [V.Note(t - t0, d, m + oct, s, **o) for (t, d, m, s, o) in tuples]
    return t0, V.sing(notes, S, end - t0 + 0.5, seed=seed)


def add_at(buf, y, t):
    i = int(round(t * SR))
    a, b = max(0, i), min(len(buf), i + len(y))
    if b > a:
        buf[a:b] += y[a - i:b - i]


def onset_lead(mora):
    c = V.CONS[V.split(mora)[0]]
    return c['clo'] + c['vot']


def lead():
    """Dry mono lead (N,), breaths (N,), and analysis for lip sync and verification."""
    dry, br, info = np.zeros(N), np.zeros(N), []
    prev_end = -9
    for ph in SC.LEAD:
        S = SHIO[ph['voice']]
        tup = SC.note_tuples(ph)
        t0, R = render_notes(tup, S, seed=ph['id'])
        add_at(dry, R['audio'] * db(EFFORT[ph['voice']]), t0)
        on = tup[0][0]
        lc = onset_lead(tup[0][3])
        gap = on - prev_end
        if gap > 0.45:            # shorter gaps would put a puff right against the next consonant
            bd = min(.22 if ph['id'] == 'W1' else .40, gap - lc - .16, on - lc - .12)
            soft = ph['voice'] in ('solo_soft', 'solo_warm', 'solo_dawn')
            if bd > .12:
                add_at(br, V.breath_noise(bd, S, -31 if soft else -29.5, ph['id']), on - lc - .11 - bd)
        for q in range(1, len(tup)):          # catch-breaths inside a phrase
            g = tup[q][0] - (tup[q - 1][0] + tup[q - 1][1])
            if g > .30:
                lc = onset_lead(tup[q][3])
                bd = min(.30, g - lc - .05)
                add_at(br, V.breath_noise(bd, S, -28, ph['id'] + str(q)), tup[q][0] - lc - .03 - bd)
        prev_end = SC.phrase_span(ph)[1]
        info.append(dict(id=ph['id'], text=ph['text'], t0=t0, f0=R['f0'].astype(np.float32), av=R['av'].astype(np.float32), F=R['F'].astype(np.float32),
                         labels=[(t0 + a, l) for a, l in R['labels']], phones=[(t0 + a, t0 + b, l) for a, b, l in R['phones']],
                         notes=[(n.t + t0, n.d, n.m, n.s) for n in R['notes']], vow=R['vow']))
    # a held breath in the near-silence, just before the eye opens
    add_at(br, V.breath_noise(.40, SHIO['solo_soft'], -49, 'held'), SC.ft(589))
    return dry, br, info


def double():
    """Second take of the chorus lines for thickness."""
    dry = np.zeros(N)
    S = V.Singer('shio2', vtl=1.015, rd=1.05, breath=-29, vib_cents=34, vib_rate=5.2, vib_delay=.32, ring=.35, detune=7, offset=.012, sloppy=.006)
    for ph in SC.LEAD:
        if ph['id'] in SC.CHOIR_PARTS:
            t0, R = render_notes(SC.note_tuples(ph), S, seed=ph['id'] + 'dbl')
            add_at(dry, R['audio'], t0)
    return dry


CHOIR = []
for k in range(4):
    CHOIR.append(dict(sec='S', k=k, part=None, oct=0, vtl=1.0, rd=1.15, pan=-.55 + .36 * k, gain=-1.0))
for k in range(4):
    CHOIR.append(dict(sec='A', k=k, part=0, oct=0, vtl=.965, rd=1.15, pan=-.85 + .30 * k, gain=0.0))
for k in range(3):
    CHOIR.append(dict(sec='M', k=k, part=None, oct=-12, vtl=.875, rd=1.0, pan=-.4 + .4 * k, gain=1.5))
for k in range(3):
    CHOIR.append(dict(sec='T', k=k, part=1, oct=0, vtl=.885, rd=1.05, pan=.30 + .28 * k, gain=-.5))
for k in range(3):
    CHOIR.append(dict(sec='B', k=k, part=2, oct=0, vtl=.84, rd=1.0, pan=.15 + .30 * k, gain=1.5))


def choir_singer(c):
    r = rng(f"choir-{c['sec']}{c['k']}")
    S = V.Singer(f"ch{c['sec']}{c['k']}", vtl=c['vtl'] * (1 + r.normal(0, .018)), rd=c['rd'] + r.normal(0, .12), breath=-27 + r.normal(0, 1.5),
                 vib_rate=r.uniform(4.9, 6.1), vib_cents=r.uniform(22, 40), vib_delay=r.uniform(.2, .4), detune=r.normal(0, 7), drift=10,
                 offset=r.normal(.004, .009), sloppy=.010, ring=r.uniform(.1, .4), cons=-2.5, fric=-2.0, jitter=.004)
    out = np.zeros(N)
    for ph in SC.LEAD:
        if ph['id'] not in SC.CHOIR_PARTS:
            continue
        t0, R = render_notes(SC.note_tuples(ph, c['part'], choir=True), S, c['oct'], f"{ph['id']}{c['sec']}{c['k']}")
        add_at(out, R['audio'], t0)
    return out * db(c['gain'])


def choir_mix(tracks):
    b = stereo()
    for c, y in zip(CHOIR, tracks):
        place(b, y, 0.0, 1.0, float(np.clip(c['pan'], -1, 1)), through=True)
    return b / 2.6


def whispers():
    """Minato: breath only, child-sized tract. One take far away, one close."""
    out = []
    for ph in SC.WHISPERS:
        t0, R = render_notes(SC.note_tuples(ph), MINATO, seed=ph['id'])
        out.append((ph['id'], t0, R['audio']))
    return out


SHOUTS = [(34.75, 1.0), (40.0, .9)]


def shouts():
    """Kakegoe: a clipped 'ha!' from seven throats, at the top of the coil and on the flame strike."""
    b = stereo()
    for (t, g) in SHOUTS:
        for k in range(7):
            r = rng(f'shout{t}{k}')
            male = k < 5
            S = V.Singer(f'sh{k}', vtl=(.86 if male else 1.0) * (1 + r.normal(0, .02)), rd=.75 + .1 * r.random(), breath=-22, drift=20, jitter=.012, shimmer=.06,
                         detune=r.normal(0, 60), cons=4)
            m = (57 if male else 66) + r.normal(0, 1.0)
            n = [V.Note(.35 + abs(r.normal(0, .008)), .20, m, 'ha', vel=1.1, vib=0, orn=[(.26, -900, .10)], scoop=-2)]
            R = V.sing(n, S, .9, seed=f'{t}')
            place(b, R['audio'], t - .35, .38 * g, float(r.uniform(-.8, .8)))
    return b
