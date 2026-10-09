#!/usr/bin/env python3
"""CRIT-AB-CONTROL — the criteria lane's INDEPENDENT control implementation of the
PROJECT-WIDE GATES of REFERENCE.md.

NOT the main instrument. `tools/measure_criterion_ab.py` (another R6 lane's) is richer on the
our-side: per-frame fitted horizon, a `hud+static` mask derived from the frames themselves, and
directory sweeps. Use that one to measure the build. This one exists to be a SECOND instrument,
written separately from the same prose, so the published figures have two implementations
behind them -- and it is the one that reports BOTH readings of "distinct channel values"
(REFERENCE.md ledger row 14), which is how that ambiguity was found. The two agree on every
published arcade figure (138/31/68.8/68.5 and 79/17/84.0/80.3).

Criterion A (colour cardinality), per frame at true native 320x224:
  A1  <= 256 unique RGB colours
  A2  <= 32 distinct channel values -- the UNION over R, G and B (= the hardware ladder).
      chanU below. chanP, the per-channel maximum, is a DIFFERENT statistic: it reads 29 on
      ab2-arcade-desert.png where the union reads the published 31.
  (A3, the per-sprite bound, is a sprite-sheet measurement and is not in this tool.)

Criterion B (adjacent-pixel identity, operator ADJ-ID), on a GROUND region at true native:
  B   >= 50 % of horizontally adjacent in-region pairs identical, AND >= 50 % vertically.

Native handling, per REFERENCE.md "Measuring OUR captures":
  * our captures are an integer NEAREST upscale of 320x224; this tool decimates with
    img[::k,::k] and ASSERTS every kxk block is uniform, refusing to measure if it is not.
  * arcade video frames are NOT admissible for Criterion B (re-encode noise deflates it, a
    non-integer upscale inflates it). --allow-nonnative overrides, and the output is marked.

Region, Criterion B:
  --region ground:A,B   rows [A,B) full width, minus the HUD mask  (our captures; the
                        published band is rows 140..195 of 224)
  --region frame        whole frame minus the HUD mask            (the arcade natives)
  HUD mask: --hud-mask <npy at 320x224> (derive per run with tools/hud_mask.py), or
            --hud-rows a,b,c,d for the two published arcade bands.
  NEVER hardcode our side's HUD box; that is a standing rule in CLAUDE.md.

A pair counts only when BOTH pixels are in-region.

--selftest builds inputs whose answers are known by construction and checks them.
"""
import argparse, sys
import numpy as np
from PIL import Image


def to_native(arr, allow_nonnative=False):
    """Return (native_array, note). Decimates an integer upscale of 320x224, checking it."""
    h, w = arr.shape[:2]
    if (w, h) == (320, 224):
        return arr, "true native"
    if w % 320 == 0 and h % 224 == 0 and w // 320 == h // 224:
        k = w // 320
        dec = arr[::k, ::k]
        # prove the upscale is block-uniform before trusting the decimation
        full = np.repeat(np.repeat(dec, k, axis=0), k, axis=1)
        maxdev = int(np.abs(full.astype(int) - arr.astype(int)).max())
        if maxdev != 0:
            raise SystemExit(f"REFUSING: {k}x decimation is lossy (max block deviation {maxdev}); "
                             "this frame is not an integer nearest upscale.")
        return dec, f"{k}x nearest upscale, decimation verified lossless (max dev 0)"
    if allow_nonnative:
        return arr, f"NOT NATIVE ({w}x{h}) — Criterion B is INVALID on this input"
    raise SystemExit(f"REFUSING: {w}x{h} is not 320x224 nor an integer multiple. "
                     "Pass --allow-nonnative only for Criterion A, and mark the result.")


def criterion_a(nat):
    flat = nat.reshape(-1, 3)
    uniq = len(np.unique(flat.view([('r', np.uint8), ('g', np.uint8), ('b', np.uint8)])))
    # TWO readings of "distinct channel values", and they differ. The published arcade
    # figures (31 desert / 17 night) are the UNION over all three channels -- i.e. the
    # hardware ladder. The per-channel maximum reads 29 on the desert frame. The night frame
    # gives 17 both ways, which is why the ambiguity went unnoticed. Report both; the GATE is
    # the union, because that is what the published numbers and the enumerated ladder are.
    chan = int(len(np.unique(flat.ravel())))
    chan_per = max(len(np.unique(flat[:, c])) for c in range(3))
    # colours covering 90 % of the frame
    _, counts = np.unique(flat, axis=0, return_counts=True)
    counts = np.sort(counts)[::-1]
    cum = np.cumsum(counts) / counts.sum()
    cover90 = int(np.searchsorted(cum, 0.90) + 1)
    return uniq, chan, chan_per, cover90


def adj_identity(nat, region):
    eqh = np.all(nat[:, :-1] == nat[:, 1:], axis=-1)
    bothh = region[:, :-1] & region[:, 1:]
    eqv = np.all(nat[:-1, :] == nat[1:, :], axis=-1)
    bothv = region[:-1, :] & region[1:, :]
    h = eqh[bothh].mean() * 100 if bothh.any() else float('nan')
    v = eqv[bothv].mean() * 100 if bothv.any() else float('nan')
    return h, v, int(bothh.sum()), int(bothv.sum())


def build_region(shape, spec, hud):
    h, w = shape
    reg = np.zeros((h, w), bool)
    if spec == "frame":
        reg[:] = True
    elif spec.startswith("ground:"):
        a, b = (int(t) for t in spec.split(":")[1].split(","))
        reg[a:b, :] = True
    else:
        raise SystemExit("--region must be 'frame' or 'ground:A,B'")
    if hud is not None:
        reg &= ~hud
    return reg


def selftest():
    ok = True
    # 1. flat field: 1 colour, identity 100 % both axes, by construction.
    flat = np.full((224, 320, 3), 77, np.uint8)
    u, c, _, _ = criterion_a(flat)
    h, v, _, _ = adj_identity(flat, np.ones((224, 320), bool))
    ok &= (u == 1 and c == 1 and h == 100.0 and v == 100.0)
    print(f"  flat field: colours {u} (exp 1), chan {c} (exp 1), H {h:.1f} V {v:.1f} (exp 100/100)")
    # 2. vertical 1-px stripes: H-identity 0 %, V-identity 100 %, 2 colours. Catches a
    #    transposed axis, which is the obvious way to get this operator subtly wrong.
    st = np.zeros((224, 320, 3), np.uint8)
    st[:, 1::2] = 255
    u, c, _, _ = criterion_a(st)
    h, v, _, _ = adj_identity(st, np.ones((224, 320), bool))
    ok &= (u == 2 and h == 0.0 and v == 100.0)
    print(f"  V stripes: colours {u} (exp 2), H {h:.1f} (exp 0), V {v:.1f} (exp 100)")
    # 3. horizontal stripes: mirrored answer.
    hs = np.transpose(st, (1, 0, 2))[:224, :320]
    h2, v2, _, _ = adj_identity(hs, np.ones(hs.shape[:2], bool))
    ok &= (h2 == 100.0 and v2 == 0.0)
    print(f"  H stripes: H {h2:.1f} (exp 100), V {v2:.1f} (exp 0)")
    # 4. region exclusion must actually exclude: paint a noisy band, exclude it, get 100 %.
    rng = np.random.default_rng(7)
    mix = np.full((224, 320, 3), 50, np.uint8)
    mix[100:120] = rng.integers(0, 256, (20, 320, 3), dtype=np.uint8)
    reg = np.ones((224, 320), bool)
    hA, vA, _, _ = adj_identity(mix, reg)
    reg[100:120] = False
    hB, vB, _, _ = adj_identity(mix, reg)
    ok &= (hA < 95 and hB == 100.0 and vB == 100.0)
    print(f"  region exclusion: with noise H {hA:.1f}, excluded H {hB:.1f} V {vB:.1f} (exp 100/100)")
    # 5. decimation gate: a lossy (bilinear) upscale must be REFUSED, a nearest one accepted.
    small = rng.integers(0, 256, (224, 320, 3), dtype=np.uint8)
    up = np.repeat(np.repeat(small, 3, axis=0), 3, axis=1)
    nat, note = to_native(up)
    ok &= np.array_equal(nat, small)
    print(f"  nearest 3x upscale: recovered exactly ({note})")
    bl = np.asarray(Image.fromarray(small).resize((960, 672), Image.BILINEAR))
    try:
        to_native(bl); ok = False; print("  bilinear upscale: NOT refused -- FAIL")
    except SystemExit as e:
        print(f"  bilinear upscale: refused ({str(e)[:46]}...)")
    print("SELFTEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="*")
    ap.add_argument("--region", default="frame")
    ap.add_argument("--hud-mask")
    ap.add_argument("--hud-rows", help="a,b,c,d -> exclude rows [a,b) and [c,d) full width")
    ap.add_argument("--allow-nonnative", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--label", default="")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    hud = None
    if a.hud_mask:
        hud = np.load(a.hud_mask)
    elif a.hud_rows:
        r = [int(t) for t in a.hud_rows.split(",")]
        hud = np.zeros((224, 320), bool); hud[r[0]:r[1]] = True; hud[r[2]:r[3]] = True
    rows = []
    for path in a.images:
        arr = np.asarray(Image.open(path).convert("RGB"))
        nat, note = to_native(arr, a.allow_nonnative)
        u, c, cper, cov = criterion_a(nat)
        reg = build_region(nat.shape[:2], a.region, hud)
        h, v, nh, nv = adj_identity(nat, reg)
        rows.append((path, u, c, cper, cov, h, v, nh, nv, note))
    print(f"# region={a.region}  hud={'mask' if a.hud_mask else (a.hud_rows or 'none')}  {a.label}")
    print(f"{'frame':50s} {'colours':>8s} {'chanU':>6s} {'chanP':>6s} {'cov90':>6s} {'H-id%':>7s} {'V-id%':>7s}")
    for p, u, c, cper, cov, h, v, nh, nv, note in rows:
        print(f"{p[-50:]:50s} {u:8d} {c:6d} {cper:6d} {cov:6d} {h:7.1f} {v:7.1f}   {note}")
    if len(rows) > 1:
        arr = np.array([[r[1], r[2], r[5], r[6]] for r in rows], float)
        m = np.median(arr, axis=0)
        print(f"{'MEDIAN of %d' % len(rows):50s} {m[0]:8.0f} {m[1]:6.0f} {'':6s} {'':6s} {m[2]:7.1f} {m[3]:7.1f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
