"""cues.json: picture events, vocal phrases and per-frame lip-sync arrays (1536 values, 24 fps)."""
import json

import numpy as np

import score as SC
from dsp import BEAT, DUR, FPS, SR, bt

NF = int(DUR * FPS)


def frame_rms(x):
    sp = SR // FPS
    y = x[:NF * sp].reshape(NF, sp) if x.ndim == 1 else (x[:NF * sp] ** 2).mean(1).reshape(NF, sp) ** .5
    return np.sqrt((y ** 2).mean(1))


def build(lead, info, choir, stems):
    ev = []

    def add(frame, typ, name, **kw):
        ev.append(dict(t=round(frame / FPS, 4), frame=int(round(frame)), type=typ, name=name, **kw))

    for e in SC.EVENTS:
        kw = dict(origin=e['origin'])
        if e['end'] is not None:
            kw.update(end_frame=e['end'], end_t=round(e['end'] / FPS, 4))
        add(e['frame'], e['type'], e['name'], **kw)
    for ph in SC.LEAD + SC.WHISPERS:
        a, b = SC.phrase_span(ph)
        who = 'minato_whisper' if ph['voice'] == 'whisper' else 'shio'
        base = dict(id=ph['id'], text=ph['text'], romaji=ph['romaji'], singer=who, origin='audio', start_t=round(a, 4), end_t=round(b, 4),
                    start_frame=int(round(a * FPS)), end_frame=int(round(b * FPS)))
        add(a * FPS, 'vocal_phrase', ph['id'] + '_start', edge='start', **base)
        add(b * FPS, 'vocal_phrase', ph['id'] + '_end', edge='end', **base)
        for (t, d, m, s, o) in SC.note_tuples(ph):
            add(t * FPS, 'vocal_note', s, phrase=ph['id'], dur=round(d, 4), midi=int(m), origin='audio')
    for (bar, name) in ((21, 'choir_enters'),):
        add(SC.note_tuples(SC.LEAD[[p['id'] for p in SC.LEAD].index('L3a')], 0)[0][0] * FPS, 'choir', name, origin='audio')
    for bar in range(1, 33):
        add(bt(bar) * FPS, 'bar', f'bar_{bar}', origin='audio')
    ev.sort(key=lambda q: (q['t'], q['type']))

    # lip sync: loudness of Shio's dry voice and the vowel her tract is shaping at each frame centre
    rms = frame_rms(lead)
    ref = np.percentile(rms[rms > 1e-4], 97)
    loud = np.clip(1 + 20 * np.log10(np.maximum(rms, 1e-7) / ref) / 36.0, 0, 1)
    vowel = ['-'] * NF
    for inf in info:
        lab = sorted(inf['labels'])
        t_end = inf['notes'][-1][0] + inf['notes'][-1][1]
        for f in range(max(0, int((inf['t0'] + .2) * FPS)), min(NF, int((t_end + .15) * FPS) + 1)):
            tc = (f + .5) / FPS
            cur = '-'
            for (t, l) in lab[1:] if lab[0][1] == '-' else lab:
                if t <= tc + .5 / FPS:
                    cur = l
            if loud[f] > .02 or cur in ('m',):
                vowel[f] = cur if tc < t_end + .10 else '-'
    ch = frame_rms(choir)
    chl = np.clip(1 + 20 * np.log10(np.maximum(ch, 1e-7) / np.percentile(ch[ch > 1e-4], 97)) / 36.0, 0, 1)
    mix = sum(stems.values())
    beat = [round(float(np.exp(-((f / FPS) % BEAT) / .12)), 3) for f in range(NF)]
    out = dict(
        title='Yoigane', fps=FPS, frames=NF, duration=DUR, bpm=120, sample_rate=SR,
        legend=dict(vowel="per frame: a i u e o = open vowel shape, N = moraic nasal (lips parted, tongue up), m = lips closed, - = mouth at rest",
                    vocal_loudness='0..1, 36 dB range, from Shio\'s dry solo voice',
                    origin="'picture' = frame fixed by the animation, 'audio' = placed by the music"),
        lyrics=[dict(id=p['id'], text=p['text'], romaji=p['romaji'], start_frame=int(round(SC.phrase_span(p)[0] * FPS)), end_frame=int(round(SC.phrase_span(p)[1] * FPS)))
                for p in SC.LEAD + SC.WHISPERS],
        events=ev,
        per_frame=dict(vocal_loudness=[round(float(v), 3) for v in loud], vowel=vowel, choir_loudness=[round(float(v), 3) for v in chl],
                       mix_rms_db=[round(float(v), 1) for v in 20 * np.log10(np.maximum(frame_rms(mix), 1e-6))],
                       sfx_rms_db=[round(float(v), 1) for v in 20 * np.log10(np.maximum(frame_rms(stems['sfx']), 1e-6))],
                       music_rms_db=[round(float(v), 1) for v in 20 * np.log10(np.maximum(frame_rms(stems['music']), 1e-6))], beat_pulse=beat),
    )
    # flat aliases so a consumer can read them without knowing the nesting
    out['vocal_loudness'] = out['per_frame']['vocal_loudness']
    out['vowel'] = out['per_frame']['vowel']
    return out


def write(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
