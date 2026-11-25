"""Photosensitivity and continuity check: flash_check.py <frame folder>

A flash is a pair of opposing luminance changes of 10 % or more of full scale where the darker state is below 0.8,
covering at least a quarter of the picture. More than three flashes in any second is a failure (WCAG 2.3.1 general flash).
Also lists identical consecutive frames (frozen picture) and prints luminance per shot.
"""
import glob
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image

FPS = 24
GW, GH = 32, 18  # grid cells over the picture


def grid(path):
    im = np.asarray(Image.open(path).convert('RGB').resize((GW * 4, GH * 4), Image.BOX), dtype=np.float32) / 255
    lin = np.where(im <= 0.04045, im / 12.92, ((im + 0.055) / 1.055) ** 2.4)
    y = lin @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    return y.reshape(GH, 4, GW, 4).mean(axis=(1, 3))


files = sorted(glob.glob(sys.argv[1] + '/f*.png'))
with ThreadPoolExecutor(8) as ex:
    Y = np.stack(list(ex.map(grid, files)))
n = len(Y)

# Per cell: collapse to alternating extremes, record the frame of every qualifying opposing transition.
trans = np.zeros((n, GH, GW), dtype=np.int8)
for cy in range(GH):
    for cx in range(GW):
        s = Y[:, cy, cx]
        ext, d = s[0], 0
        for f in range(1, n):
            v = s[f]
            if d >= 0 and v > ext or d <= 0 and v < ext:
                if d == 0 and abs(v - ext) < 0.1:
                    continue
                if d == 0:
                    d = 1 if v > ext else -1
                    trans[f, cy, cx] = d
                ext = v
            elif abs(v - ext) >= 0.1 and min(v, ext) < 0.8:
                d = -d
                trans[f, cy, cx] = d
                ext = v

area = GH * GW
up = (trans > 0).sum(axis=(1, 2)) / area
down = (trans < 0).sum(axis=(1, 2)) / area
big = [(f, 1) for f in range(n) if up[f] >= 0.25] + [(f, -1) for f in range(n) if down[f] >= 0.25]
big.sort()
worst, where = 0, 0
for f in range(n):
    c = [k for k in big if f <= k[0] < f + FPS]
    if len(c) / 2 > worst:
        worst, where = len(c) / 2, f
print(f'{n} frames, {len(big)} large transitions')
print('worst second:', worst, 'flashes, starting at frame', where, 'FAIL' if worst > 3 else 'ok')
for f, d in big:
    print(f'  frame {f:4d} {"up" if d > 0 else "down"}  area {max(up[f], down[f]):.2f}')

frozen = [f for f in range(1, n) if np.abs(Y[f] - Y[f - 1]).max() < 1e-5]
print('frozen frames:', len(frozen), frozen[:20])
print('mean luminance per second:', ' '.join(f'{Y[k:k + FPS].mean():.2f}' for k in range(0, n, FPS)))
