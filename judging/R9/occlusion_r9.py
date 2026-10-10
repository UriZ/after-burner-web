#!/usr/bin/env python3
"""PLAYER-OCCLUSION fraction: how much of the player's own aircraft is hidden
behind another sprite.

The statistic R8's art critic ranked #1 ("you cannot find your own aircraft"),
re-implemented so this lane can report a BEFORE and an AFTER on it rather than
quote theirs. Their operator was two captures and a "pose-matched baseline" that
they measured as carrying a few per cent of noise (median -0.7 %). This is the
four-capture form, which has no baseline noise at all in the numerator and
isolates the remaining noise to one named place:

    A = ?fixed=1&demo=1&invincible=1                normal: world + player + combat
    B = A + &hidejet=1                              world + combat, NO player
    C = A + &nocombat=1                             world + player, NO combat
    D = A + &nocombat=1&hidejet=1                   world only

    VISIBLE  V = { px : A != B }   the player's pixels that survived to screen
    FULL     P = { px : C != D }   the player's pixels if nothing were in front
    hidden   = |P \ V| / |P|

THE OBVIOUS FORM OF THIS, 1 - |V|/|P|, IS WRONG AND IT WAS CAUGHT BY ITS OWN
NUMBERS: it returns a MEDIAN OF -19 % on the shipped build. The bboxes of V and
P are identical to the pixel, so the pose is matched; what differs is that a
player pixel whose colour happens to equal what is BEHIND it registers in
neither difference. Against the plain sky of the no-combat arm that collision
is common, so |P| systematically under-counts the player, while against an
enemy airframe in the live arm it is rare, so |V| does not -- and the ratio of
two differently-biased counts goes negative. |P \ V| compares the two masks
PIXEL BY PIXEL instead of by area, so it asks only about pixels P could see in
the first place, and it is bounded in [0,1] by construction. A negative result
is now impossible, which is worth saying out loud: the broken form announced
its own defect and the repaired one cannot.

Residual bias, both directions, stated: a player pixel that matched the sky in
C is absent from P and so is never counted either way (denominator slightly
small); a player pixel that happens to match the enemy airframe behind it in A
is absent from V and is counted as hidden when it is not (numerator slightly
large). Both are a few per cent on a 16-colour palette, which is why only the
TAIL (>30 %, >50 %, worst) is quoted, exactly as R8's art critic quoted theirs.

CONTROLS, run with --selftest and all of them must pass before any number here
is believed:
  1. synthetic: a 40x20 white box on blue, half covered by a red box, must read
     hidden = 50.000 % exactly.
  2. synthetic: nothing in front must read 0.000 %.
  3. REAL: the no-combat arm measured against ITSELF (A:=C, B:=D) must read
     0.0 % on every frame -- there is nothing on screen to occlude the player,
     so any non-zero is the instrument, not the game. This is the control that
     would have caught a mis-aligned tick grid.
  4. black/duplicate frame sweep across all four directories at once.
"""
import sys, json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image


def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)


def mask(a, b):
    """Pixels where the two frames differ at all. No tolerance: both are
    nearest-neighbour upscales of the same deterministic renderer, so a real
    difference is a whole palette step and a tolerance would only hide a
    mis-alignment."""
    return np.any(a != b, axis=2)


def frames(d):
    return sorted(Path(d).glob("frame-*.png"))


def manifest(d):
    f = Path(d) / "capture-manifest.json"
    return json.loads(f.read_text()) if f.exists() else None


def sweep(dirs):
    """Black-frame and duplicate sweep ACROSS directories as well as within."""
    seen, blacks, dups = {}, [], []
    for d in dirs:
        for f in frames(d):
            raw = f.read_bytes()
            h = hashlib.sha256(raw).hexdigest()
            arr = load(f)
            if arr.max() < 8:
                blacks.append(str(f))
            if h in seen:
                dups.append((str(f), seen[h]))
            else:
                seen[h] = str(f)
    return blacks, dups


def run(dA, dB, dC, dD):
    fa, fb, fc, fd = frames(dA), frames(dB), frames(dC), frames(dD)
    n = min(len(fa), len(fb), len(fc), len(fd))
    assert n, "no frames"
    ma = [manifest(x) for x in (dA, dB, dC, dD)]
    rows = []
    for i in range(n):
        A, B, C, D = load(fa[i]), load(fb[i]), load(fc[i]), load(fd[i])
        V = mask(A, B)
        P = mask(C, D)
        vis, full = int(V.sum()), int(P.sum())
        if full < 200:          # player off screen / death cycle: not a flight frame
            rows.append({"i": i, "skip": "player<200px", "full": full})
            continue
        hiddenpx = int((P & ~V).sum())
        rows.append({"i": i, "vis": vis, "full": full, "hiddenpx": hiddenpx,
                     "hidden": 100.0 * hiddenpx / full,
                     # the broken area-ratio form, kept so the defect above is
                     # reproducible from this tool's own output rather than
                     # only from its comment
                     "hidden_areaform": 100.0 * (1.0 - vis / full),
                     "tick": ma[0]["frames"][i]["tick"] if ma[0] else None,
                     "state": (ma[0]["frames"][i]["state"] or {}).get("state") if ma[0] else None})
    return rows, ma


def summarise(rows):
    h = [r["hidden"] for r in rows if "hidden" in r
         and (r.get("state") in (None, "flight"))]
    if not h:
        return None
    h = np.array(h)
    return {
        "n": int(h.size),
        "median": float(np.median(h)),
        "mean": float(h.mean()),
        "gt30_pct": float(100.0 * (h > 30).mean()),
        "gt50_pct": float(100.0 * (h > 50).mean()),
        "worst": float(h.max()),
        "p90": float(np.percentile(h, 90)),
    }


def selftest():
    ok = True
    # 1 + 2: synthetics
    sky = np.zeros((40, 60, 3), np.int16); sky[:, :, 2] = 200
    world_only = sky.copy()
    player = sky.copy(); player[10:30, 10:50] = [255, 255, 255]        # 20x40 = 800 px
    covered = player.copy(); covered[10:30, 30:50] = [200, 0, 0]       # right half hidden
    V = mask(covered, np.where((covered == player).all(2)[..., None], sky, covered))
    # build it the way run() does instead: A=covered, B=world+occluder
    occl_only = sky.copy(); occl_only[10:30, 30:50] = [200, 0, 0]
    V = mask(covered, occl_only); P = mask(player, world_only)
    got = 100.0 * (P & ~V).sum() / P.sum()
    print(f"  control 1 half-covered box: {got:.3f} %  (expect 50.000)")
    ok &= abs(got - 50.0) < 1e-9
    V = mask(player, world_only)
    got = 100.0 * (P & ~V).sum() / P.sum()
    print(f"  control 2 nothing in front: {got:.3f} %  (expect 0.000)")
    ok &= abs(got) < 1e-9
    return ok


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(0 if selftest() else 1)
    base = sys.argv[1]            # directory prefix; expects -A -B -C -D
    dirs = [f"{base}-{s}" for s in "ABCD"]
    blacks, dups = sweep(dirs)
    rows, _ = run(*dirs)
    # control 3: the no-combat arm against itself must read exactly 0
    rows_ctl, _ = run(dirs[2], dirs[3], dirs[2], dirs[3])
    ctl = summarise(rows_ctl)
    out = {
        "dirs": dirs,
        "black_frames": blacks,
        "duplicate_frames": dups[:10],
        "n_duplicates": len(dups),
        "control_nocombat_vs_itself": ctl,
        "summary": summarise(rows),
        "rows": rows,
    }
    print(json.dumps(out, indent=2))
