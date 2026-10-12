#!/usr/bin/env python3
"""Arcade PLAYER-JET lateral tracker, instrument 2: the afterburner nozzle PAIR.

Instrument 1 (jet_envelope.py, the desaturated-airframe mass) fails on real
frames when the jet overlaps a cloud or the bottom HUD -- published, with the
montage, rather than hidden. This one keys on the one feature that is unique to
the PLAYER's aircraft in a rear view: TWO saturated orange nozzle discs, side by
side, of a camera-locked size, lit in every frame of normal flight.

  nozzle mask: hue in [0,50) deg, S >= S_MIN, V >= V_MIN
  blobs:       8-connected, area in [A_MIN, A_MAX]  (a disc, not an explosion)
  pair:        two blobs whose separation is inside the player's CAMERA-LOCKED
               nozzle-separation band [PAIR_DX_MIN, PAIR_DX]. That band is
               hand-measured off the ruled contact sheets (sheet.py) on frames
               where the player's aircraft was identified BY EYE: 0.3-0.45 ruler
               units = 31-46 px of 1028. Among admissible pairs the LOWEST on
               screen wins -- the player's jet is drawn below the traffic.
               The first version took the WIDEST pair with no upper prior and
               produced a median separation of 133 px, i.e. it was pairing
               nozzles belonging to two DIFFERENT aircraft. That is in the
               montage look-nz-w1.png and is why this prior exists.
  report:      midpoint x of the two blob centroids

Usage: jet_nozzles.py <dir> [--out csv] [--boxes png] | --selftest
"""
import sys, os, glob, csv
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jet_envelope import label8_runs, label8

S_MIN = 0.55
V_MIN = 0.45
HUE_MAX = 50.0        # deg; the nozzle glow is red->orange->yellow
A_MIN, A_MAX = 60, 1100
Y0, Y1 = 0.22, 0.87   # Y1 excludes the SPEED/STAGE HUD strip
PAIR_DX_MIN, PAIR_DX = 22, 58
PAIR_DY = 26


def nozzle_mask(rgb):
    a = rgb.astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(2); mn = a.min(2); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0.0)
    # hue only where red is the max channel -> [0,60) deg before wrap
    hue = np.where(d > 0, 60.0 * ((g - b) / np.maximum(d, 1e-6)), 0.0)
    return (mx == r) & (g >= b) & (hue < HUE_MAX) & (s >= S_MIN) & (mx >= V_MIN)


def blobs(path):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    m = nozzle_mask(np.asarray(im))
    band = np.zeros_like(m)
    y0, y1 = int(Y0 * H), int(Y1 * H)
    band[y0:y1] = m[y0:y1]
    lab = label8_runs(band)
    out = []
    if lab.max():
        cnt = np.bincount(lab.ravel()); cnt[0] = 0
        for k in np.nonzero((cnt >= A_MIN) & (cnt <= A_MAX))[0]:
            ys, xs = np.nonzero(lab == k)
            out.append((float(xs.mean()), float(ys.mean()), int(cnt[k])))
    return W, H, out


def detect(path):
    W, H, bs = blobs(path)
    best = None
    for i in range(len(bs)):
        for j in range(i + 1, len(bs)):
            dx = abs(bs[i][0] - bs[j][0]); dy = abs(bs[i][1] - bs[j][1])
            if PAIR_DX_MIN <= dx <= PAIR_DX and dy <= PAIR_DY:
                cy = (bs[i][1] + bs[j][1]) / 2.0
                if best is None or cy > best[0]:
                    best = (cy, bs[i], bs[j])
    if best is None:
        return None
    _, p, q = best
    return dict(W=W, H=H, cx=(p[0] + q[0]) / 2.0, cy=(p[1] + q[1]) / 2.0,
                sep=abs(p[0] - q[0]), ax=p[0], ay=p[1], bx=q[0], by=q[1],
                area=p[2] + q[2], n=len(bs))


def selftest():
    ok = tot = 0
    def chk(n, c):
        nonlocal ok, tot
        tot += 1; ok += bool(c); print(('PASS ' if c else 'FAIL ') + n)
    def frame(pairs, bg=(0, 60, 255), extra=None):
        im = Image.new('RGB', (1028, 720), bg); d = ImageDraw.Draw(im)
        for (x, y, r) in pairs:
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 120, 0))
        if extra: extra(d)
        im.save('/tmp/_nz.png'); return '/tmp/_nz.png'
    for cx in (200, 514, 820):
        r = detect(frame([(cx - 18, 450, 9), (cx + 18, 450, 9)]))
        chk('pair at cx=%d -> %.1f' % (cx, r['cx'] if r else -1), r and abs(r['cx'] - cx) <= 1.0)
    chk('single nozzle -> None', detect(frame([(500, 450, 11)])) is None)
    chk('null frame -> None', detect(frame([])) is None)
    r = detect(frame([(500, 450, 11), (500, 450, 11)]))
    chk('coincident discs rejected (PAIR_DX_MIN)', r is None)
    chk('explosion-sized blob rejected',
        detect(frame([(490, 450, 40), (560, 450, 40)])) is None)
    chk('above-band pair rejected', detect(frame([(496, 120, 9), (532, 120, 9)])) is None)
    chk('below-band (HUD strip) pair rejected', detect(frame([(496, 660, 9), (532, 660, 9)])) is None)
    chk('vertically split pair rejected', detect(frame([(496, 420, 9), (532, 520, 9)])) is None)
    xs = [detect(frame([(496 + i, 450, 9), (532 + i, 450, 9)]))['cx'] for i in range(5)]
    chk('1 px/frame recovered: %s' % np.diff(xs).tolist(), np.allclose(np.diff(xs), 1.0))
    # 12: two admissible pairs, one high one low. The LOWEST must win -- the
    # player's jet is drawn below the traffic it is shooting at.
    r = detect(frame([(280, 300, 11), (320, 300, 11), (700, 560, 11), (740, 560, 11)]))
    chk('lowest admissible pair taken (expect 720, got %.1f)' % (r['cx'] if r else -1),
        r and abs(r['cx'] - 720) <= 1.5)
    # 13: a pair separated by more than the camera-locked band is NOT a jet
    chk('over-wide pair rejected (two aircraft, not one)',
        detect(frame([(400, 450, 11), (620, 450, 11)])) is None)
    print('selftest %d/%d' % (ok, tot)); return ok == tot


def run(d, out, boxes):
    files = sorted(glob.glob(os.path.join(d, 'f*.png')))
    rows = []
    for i, f in enumerate(files):
        r = detect(f)
        rows.append(dict(i=i + 1, file=os.path.basename(f), **(r or {})))
    if out:
        with open(out, 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=['i', 'file', 'W', 'H', 'cx', 'cy', 'sep',
                                               'ax', 'ay', 'bx', 'by', 'area', 'n'])
            w.writeheader()
            for r in rows: w.writerow(r)
    if boxes:
        sel = [r for r in rows if r.get('cx') is not None and 'cx' in r]
        step = max(1, len(sel) // 12); sel = sel[::step][:12]
        ps = []
        for r in sel:
            im = Image.open(os.path.join(d, r['file'])).convert('RGB')
            dr = ImageDraw.Draw(im)
            for (x, y) in ((r['ax'], r['ay']), (r['bx'], r['by'])):
                dr.ellipse([x - 16, y - 16, x + 16, y + 16], outline=(255, 0, 255), width=3)
            dr.line([r['cx'], r['cy'] - 70, r['cx'], r['cy'] + 70], fill=(0, 255, 0), width=3)
            ps.append(im.resize((im.width // 2, im.height // 2)))
        cw, ch = ps[0].size
        sh = Image.new('RGB', (cw * 4, ch * 3))
        for j, p in enumerate(ps): sh.paste(p, ((j % 4) * cw, (j // 4) * ch))
        sh.save(boxes)
    return rows


if __name__ == '__main__':
    if '--selftest' in sys.argv: sys.exit(0 if selftest() else 1)
    d = sys.argv[1]
    o = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    b = sys.argv[sys.argv.index('--boxes') + 1] if '--boxes' in sys.argv else None
    rows = run(d, o, b)
    got = [r for r in rows if 'cx' in r and r.get('cx') is not None]
    print('%d/%d detected' % (len(got), len(rows)))
    if got:
        cx = np.array([r['cx'] for r in got]); W = got[0]['W']
        print('cx %.1f..%.1f  (%.2f..%.2f %%W)  sep med %.1f' % (
            cx.min(), cx.max(), 100 * cx.min() / W, 100 * cx.max() / W,
            np.median([r['sep'] for r in got])))
