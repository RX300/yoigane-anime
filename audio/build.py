"""Rebuild the whole soundtrack:  python audio/build.py   (add --verify for the measurement report)

Writes out/audio/yoigane_mix.wav, music.wav, vocal.wav, sfx.wav and cues.json."""
import argparse
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
for k in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ.setdefault(k, '1')
OUT = HERE.parent / 'out' / 'audio'

import numpy as np

import cues
import mix
import music
import scene
import vocals as VO
from dsp import DUR, N, SR, lufs, true_peak_db, write_wav24


def _bus(name):
    return name, music.BUSES[name]().astype(np.float32)


def _scene():
    return {k: v.astype(np.float32) for k, v in scene.build().items()}


def render(workers):
    with ProcessPoolExecutor(workers) as ex:
        f_lead, f_dbl, f_wh, f_sh = ex.submit(VO.lead), ex.submit(VO.double), ex.submit(VO.whispers), ex.submit(VO.shouts)
        f_sc = ex.submit(_scene)
        f_bus = [ex.submit(_bus, k) for k in music.BUSES]
        f_ch = [ex.submit(VO.choir_singer, c) for c in VO.CHOIR]
        buses = dict(f.result() for f in f_bus)
        lead, breath, info = f_lead.result()
        voc = dict(lead=lead, breath=breath, double=f_dbl.result(), choir=VO.choir_mix([f.result() for f in f_ch]), whisper=f_wh.result(), shout=f_sh.result())
        return buses, voc, info, f_sc.result()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--workers', type=int, default=min(10, os.cpu_count() or 4))
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--keep-dry', action='store_true', help='also save the dry voices as float32 for verify.py')
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    buses, voc, info, sc = render(a.workers)
    print(f'rendered {len(buses)} music buses, {len(VO.CHOIR)} choir singers, lead and effects in {time.time() - t0:.1f} s')
    stems, full = mix.mixdown(buses, voc, sc)
    assert len(full) == N == int(DUR * SR)
    for k, v in stems.items():
        write_wav24(OUT / f'{k}.wav', v)
    write_wav24(OUT / 'yoigane_mix.wav', full)
    cues.write(OUT / 'cues.json', cues.build(voc['lead'], info, voc['choir'], stems))
    print(f'mix {lufs(full):.2f} LUFS, true peak {true_peak_db(full):.2f} dBTP, total {time.time() - t0:.1f} s')
    if a.keep_dry or a.verify:
        d = OUT / 'dry'
        d.mkdir(exist_ok=True)
        np.savez(d / 'dry.npz', lead=voc['lead'].astype(np.float32), choir=voc['choir'].astype(np.float32), breath=voc['breath'].astype(np.float32))
        import pickle
        with open(d / 'info.pkl', 'wb') as f:
            pickle.dump(info, f)
    if a.verify:
        import verify
        verify.main(info)


if __name__ == '__main__':
    main()
