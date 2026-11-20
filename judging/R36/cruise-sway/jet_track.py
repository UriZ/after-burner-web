#!/usr/bin/env python3
"""R36 cruise-sway: track the arcade jet's screen centroid during the
hands-off tanker dock (bright sprite on near-black sky).

Operator: centroid of pixels with R+G+B > 150 inside a fixed box
(x 300-780, y 280-560 of the 1028x720 frame) that contains the docked jet
and excludes the tanker belly, the RELOAD WEAPONS text and the sea.
Control: same frame np.roll'd by a known (dy, dx) must move the centroid
by exactly that much.
"""
import glob
import json
import sys

import numpy as np
from PIL import Image

# y 330-500: clears the tanker belly above (~280) and the blinking RELOAD
# WEAPONS text below (~520) — the text doubled npx as it blinked and swung
# the centroid +-50 px until it was excluded (crop-and-look catch).
BOX = (330, 500, 320, 760)  # y0, y1, x0, x1
THRESH = 150


def centroid(img):
    y0, y1, x0, x1 = BOX
    box = img[y0:y1, x0:x1].sum(axis=2)
    mask = box > THRESH
    if mask.sum() < 50:
        return None
    ys, xs = np.nonzero(mask)
    return float(xs.mean() + x0), float(ys.mean() + y0), int(mask.sum())


def main(d, out):
    files = sorted(glob.glob(d + '/f*.png'))
    # Synthetic control: a bright blob fully interior to the box, rolled by a
    # known (dy, dx) — centroid must move exactly that much. (A rolled REAL
    # frame is not a valid control here: content crossing the fixed box edge
    # — boom/tanker pixels — biases it by ~0.1-0.4 px, a control artifact.)
    synth = np.zeros((720, 1028, 3), dtype=np.int32)
    synth[400:440, 500:580] = [200, 180, 220]
    c0 = centroid(synth)
    cs = centroid(np.roll(np.roll(synth, 3, axis=0), -2, axis=1))
    print(f'control: dx={cs[0] - c0[0]:+.3f} (expect -2) dy={cs[1] - c0[1]:+.3f} (expect +3)')
    assert abs(cs[0] - c0[0] + 2) < 0.01 and abs(cs[1] - c0[1] - 3) < 0.01, 'control FAIL'
    print('control PASS')
    with open(out, 'w') as f:
        for i, p in enumerate(files):
            img = np.asarray(Image.open(p).convert('RGB'), dtype=np.int32)
            c = centroid(img)
            f.write(json.dumps({'frame': i, 'cx': c and c[0], 'cy': c and c[1], 'npx': c and c[2]}) + '\n')
    print('done ->', out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
