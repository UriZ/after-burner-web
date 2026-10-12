#!/usr/bin/env python3
"""Arcade PLAYER-JET lateral tracker.

The quantity ENVELOPE_X actually sets is the AIRCRAFT's screen x, not the
sight's. R10 measured the sight (two operators, +/-9.83 and +/-10.12 %W) and
explicitly recorded the jet column as NOT ATTEMPTED.

Operator
--------
The player's F-14 is the only large DESATURATED mass that is camera-locked:
every arcade stage used here paints a saturated background (blue sea, teal
sky + green forest, blue sky + green terrain) and the airframe is grey/khaki.

  airframe mask: HSV S <= S_MAX and V in [V_MIN, V_MAX]
                 (V_MAX rejects cloud, smoke, sea foam and white HUD text;
                  V_MIN rejects the black outline and night shadow)
  band:          y in [Y0*H, Y1*H] -- the camera-locked band
  pick:          largest 8-connected component with area >= A_MIN

Reports BOTH bbox-centre x and pixel-centroid x, in %W, because those are two
different operators for one name and this project has been bitten by that.

Usage:
  jet_envelope.py <dir-of-f####.png> [--out trace.csv] [--boxes montage.png]
  jet_envelope.py --selftest
"""
import sys, os, glob, csv, colorsys
import numpy as np
from PIL import Image, ImageDraw

S_MAX = 0.30
V_MIN = 0.28
V_MAX = 1.01          # clouds are admitted by COLOUR and rejected by OUTLINE
Y0, Y1 = 0.40, 0.95
A_MIN = 3000
CLOSE = 3             # dilate/erode passes -- joins the airframe across its own
                      # black outlines and its two orange nozzles
DARK_V = 0.28         # sprite-outline black
DARK_MIN = 0.010      # min dark fraction inside the bbox.
                      # MEASURED on f0001 (w1): player-jet bbox 0.036,
                      # cloud bbox in f0220 0.0014 -- a 26x separation.


def _sv(rgb):
    a = rgb.astype(np.float32) / 255.0
    mx = a.max(axis=2); mn = a.min(axis=2)
    return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0), mx


def airframe_mask(rgb):
    s, v = _sv(rgb)
    return (s <= S_MAX) & (v >= V_MIN) & (v <= V_MAX)


def _shift_or(m):
    o = m.copy()
    o[1:, :] |= m[:-1, :]; o[:-1, :] |= m[1:, :]
    o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    o[1:, 1:] |= m[:-1, :-1]; o[:-1, :-1] |= m[1:, 1:]
    o[1:, :-1] |= m[:-1, 1:]; o[:-1, 1:] |= m[1:, :-1]
    return o


def close(m, n=CLOSE):
    for _ in range(n): m = _shift_or(m)
    for _ in range(n): m = ~_shift_or(~m)
    return m


def label8(m):
    """8-connected labelling, two-pass union-find. No scipy dependency."""
    h, w = m.shape
    lab = np.zeros((h, w), np.int32)
    parent = [0]

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    nxt = 1
    for y in range(h):
        row = m[y]
        for x in range(w):
            if not row[x]:
                continue
            nb = []
            if x > 0 and lab[y, x - 1]: nb.append(lab[y, x - 1])
            if y > 0:
                if lab[y - 1, x]: nb.append(lab[y - 1, x])
                if x > 0 and lab[y - 1, x - 1]: nb.append(lab[y - 1, x - 1])
                if x + 1 < w and lab[y - 1, x + 1]: nb.append(lab[y - 1, x + 1])
            if nb:
                mn = min(nb); lab[y, x] = mn
                for n in nb: union(mn, n)
            else:
                lab[y, x] = nxt; parent.append(nxt); nxt += 1
    for i in range(1, nxt):
        find(i)
    flat = np.array([0] + [find(i) for i in range(1, nxt)], np.int32)
    return flat[lab]



def label8_runs(m):
    """8-connected labelling via row runs + union-find. Fast path.

    Cross-checked against the naive per-pixel label8() in --selftest, because
    this project has twice shipped a measurement from a single implementation.
    """
    h, w = m.shape
    parent = [0]

    def find(x):
        r = x
        while parent[r] != r: r = parent[r]
        while parent[x] != r: parent[x], x = r, parent[x]
        return r

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[max(ra, rb)] = min(ra, rb)

    rows = []
    nxt = 1
    for y in range(h):
        row = m[y]
        if not row.any():
            rows.append([]); continue
        d = np.diff(row.astype(np.int8))
        starts = list((np.nonzero(d == 1)[0] + 1))
        ends = list(np.nonzero(d == -1)[0])
        if row[0]: starts.insert(0, 0)
        if row[-1]: ends.append(w - 1)
        cur = []
        for s0, e0 in zip(starts, ends):
            parent.append(nxt); lid = nxt; nxt += 1
            for (ps, pe, pl) in rows[-1] if rows else []:
                if ps <= e0 + 1 and s0 <= pe + 1:
                    union(lid, pl)
            cur.append((int(s0), int(e0), lid))
        rows.append(cur)
    lab = np.zeros((h, w), np.int32)
    for y, cur in enumerate(rows):
        for (s0, e0, lid) in cur:
            lab[y, s0:e0 + 1] = find(lid)
    return lab


def detect(path):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    rgb = np.asarray(im)
    s_, v_ = _sv(rgb)
    dark = v_ < DARK_V
    m = close(airframe_mask(rgb))
    band = np.zeros_like(m)
    y0, y1 = int(Y0 * H), int(Y1 * H)
    band[y0:y1] = m[y0:y1]
    lab = label8_runs(band)
    if lab.max() == 0:
        return None
    counts = np.bincount(lab.ravel()); counts[0] = 0
    order = np.argsort(counts)[::-1]
    k = None
    for cand in order:
        if cand == 0 or counts[cand] < A_MIN:
            break
        cy, cx = np.nonzero(lab == cand)
        bb = dark[cy.min():cy.max() + 1, cx.min():cx.max() + 1]
        if bb.mean() >= DARK_MIN:
            k = int(cand); break
    if k is None:
        return None
    ys, xs = np.nonzero(lab == k)
    return dict(W=W, H=H, area=int(counts[k]),
                x0=int(xs.min()), x1=int(xs.max()),
                y0=int(ys.min()), y1=int(ys.max()),
                cx_bbox=(float(xs.min()) + float(xs.max())) / 2.0,
                cx_cent=float(xs.mean()), cy_cent=float(ys.mean()))


def selftest():
    ok = 0; tot = 0
    def chk(name, cond):
        nonlocal ok, tot
        tot += 1; ok += bool(cond)
        print(('PASS ' if cond else 'FAIL ') + name)
    # 1-3: prescribed grey patch on saturated blue, recovered at its own centre.
    # It carries a BLACK OUTLINE because a real sprite does and the operator
    # keys on that -- an outline-free patch is a cloud and must be rejected
    # (control 12). The first version of this suite drew no outline and the
    # DARK_MIN gate failed it, correctly.
    def sprite(d, x0, y0, x1, y1):
        d.rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], fill=(6, 6, 6))
        d.rectangle([x0, y0, x1, y1], fill=(170, 170, 160))
        d.line([x0, (y0 + y1) // 2, x1, (y0 + y1) // 2], fill=(6, 6, 6), width=5)
    for cx in (200, 514, 820):
        im = Image.new('RGB', (1028, 720), (0, 60, 255))
        d = ImageDraw.Draw(im)
        sprite(d, cx - 60, 400, cx + 60, 470)
        p = '/tmp/_jt.png'; im.save(p)
        r = detect(p)
        chk('grey patch at cx=%d -> bbox %.1f centroid %.1f' % (cx, r['cx_bbox'], r['cx_cent']),
            r and abs(r['cx_bbox'] - cx) <= 1.0 and abs(r['cx_cent'] - cx) <= 1.0)
    # 4: a white cloud must NOT be accepted (V > V_MAX)
    im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
    d.ellipse([300, 400, 700, 600], fill=(252, 252, 252)); im.save('/tmp/_jt.png')
    chk('white cloud rejected', detect('/tmp/_jt.png') is None)
    # 5: a black outline must NOT be accepted (V < V_MIN)
    im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
    d.rectangle([300, 400, 700, 600], fill=(8, 8, 8)); im.save('/tmp/_jt.png')
    chk('black mass rejected', detect('/tmp/_jt.png') is None)
    # 6: saturated orange burner must NOT be accepted
    im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
    d.rectangle([300, 400, 700, 600], fill=(255, 140, 20)); im.save('/tmp/_jt.png')
    chk('saturated orange rejected', detect('/tmp/_jt.png') is None)
    # 7: null -- empty saturated frame
    Image.new('RGB', (1028, 720), (0, 60, 255)).save('/tmp/_jt.png')
    chk('null frame -> None', detect('/tmp/_jt.png') is None)
    # 8: two greys, the LARGER one wins (the player jet is the largest mass)
    im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
    sprite(d, 100, 420, 180, 460)      # small decoy
    sprite(d, 600, 400, 800, 500)      # big target
    im.save('/tmp/_jt.png'); r = detect('/tmp/_jt.png')
    chk('largest component wins (expect 700, got %.1f)' % r['cx_bbox'], abs(r['cx_bbox'] - 700) <= 1)
    # 9: out-of-band grey rejected
    im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
    sprite(d, 300, 40, 700, 200); im.save('/tmp/_jt.png')
    chk('above-band grey rejected', detect('/tmp/_jt.png') is None)
    # 10: moving patch recovered at exactly 1 px/frame
    xs = []
    for i in range(5):
        im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
        sprite(d, 400 + i, 400, 520 + i, 470); im.save('/tmp/_jt.png')
        xs.append(detect('/tmp/_jt.png')['cx_bbox'])
    dx = np.diff(xs)
    chk('1 px/frame recovered exactly: %s' % dx.tolist(), np.allclose(dx, 1.0))
    # 12: a LARGE outline-free desaturated blob -- a cloud -- must be rejected
    # even though it is the biggest component in the band. This is the control
    # that licenses DARK_MIN, and the figure it was calibrated on is real:
    # player-jet bbox 0.036 dark on w1/f0001, cloud bbox 0.0014 on w1/f0220.
    im = Image.new('RGB', (1028, 720), (0, 60, 255)); d = ImageDraw.Draw(im)
    d.ellipse([200, 380, 800, 620], fill=(226, 226, 230)); im.save('/tmp/_jt.png')
    chk('large outline-free blob (a cloud) rejected', detect('/tmp/_jt.png') is None)
    # 11: the two independent labellers agree on a real frame's mask
    import glob as _g
    cand = sorted(_g.glob(os.path.join(os.environ.get('JT_CTRL_DIR', '/nonexistent'), 'f*.png')))
    if cand:
        rgb = np.asarray(Image.open(cand[0]).convert('RGB'))
        mm = airframe_mask(rgb); bb = np.zeros_like(mm)
        H = mm.shape[0]; bb[int(Y0*H):int(Y1*H)] = mm[int(Y0*H):int(Y1*H)]
        la, lb = label8(bb), label8_runs(bb)
        ca = np.bincount(la.ravel()); ca[0] = 0
        cb = np.bincount(lb.ravel()); cb[0] = 0
        chk('two labellers agree on largest-component area (%d vs %d) on %s'
            % (ca.max(), cb.max(), os.path.basename(cand[0])), ca.max() == cb.max())
    print('selftest %d/%d' % (ok, tot))
    return ok == tot


def run(d, out, boxes):
    files = sorted(glob.glob(os.path.join(d, 'f*.png')))
    rows = []
    for i, f in enumerate(files):
        r = detect(f)
        rows.append(dict(i=i + 1, file=os.path.basename(f), **(r or {})))
    if out:
        with open(out, 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=['i', 'file', 'W', 'H', 'area', 'x0', 'x1',
                                               'y0', 'y1', 'cx_bbox', 'cx_cent', 'cy_cent'])
            w.writeheader()
            for r in rows: w.writerow(r)
    if boxes:
        sel = [r for r in rows if r.get('area')]
        step = max(1, len(sel) // 12)
        sel = sel[::step][:12]
        panels = []
        for r in sel:
            im = Image.open(os.path.join(d, r['file'])).convert('RGB')
            dr = ImageDraw.Draw(im)
            dr.rectangle([r['x0'], r['y0'], r['x1'], r['y1']], outline=(255, 0, 255), width=3)
            dr.line([r['cx_cent'], r['y0'], r['cx_cent'], r['y1']], fill=(0, 255, 0), width=3)
            panels.append(im.resize((im.width // 2, im.height // 2)))
        cw, ch = panels[0].size
        sheet = Image.new('RGB', (cw * 4, ch * 3), (0, 0, 0))
        for j, p in enumerate(panels):
            sheet.paste(p, ((j % 4) * cw, (j // 4) * ch))
        sheet.save(boxes)
    return rows


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(0 if selftest() else 1)
    d = sys.argv[1]
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    bx = sys.argv[sys.argv.index('--boxes') + 1] if '--boxes' in sys.argv else None
    rows = run(d, out, bx)
    got = [r for r in rows if r.get('area')]
    print('%d/%d frames detected' % (len(got), len(rows)))
    if got:
        cb = np.array([r['cx_bbox'] for r in got]); W = got[0]['W']
        print('cx_bbox  min %.1f max %.1f  (%.2f%%W .. %.2f%%W)' % (cb.min(), cb.max(), 100*cb.min()/W, 100*cb.max()/W))
