#!/usr/bin/env python3
"""Derives the CURRENT HUD mask by capturing a clean reference frame
(?nocombat=1&hidejet=1&noclouds=1) instead of hardcoding HUD element
bounding boxes.

Why: hardcoded HUD exclusion geometry silently desyncs the moment the HUD
owner changes layout/styling, and the leak reads as a confident wrong
answer, not an error. Hit independently THREE times in one round: this
developer's measure_roll.py and measure_clouds.py (8 of 10 "cloud"
detections were SCORE/HIT/reticle fragments at one point), and combat-dev's
clouds cross-check (the reticle's bottom attitude-line bracket counted as
a cloud in every frame). The fix: with the jet, clouds and combat elements
all hidden, everything rendering above the horizon is EITHER the flat sky
fill OR the HUD — by construction, not by guessing at coordinates. Deriving
this fresh from an actual capture means it can never go stale.

Library usage:
    from hud_mask import get_hud_mask, hud_free_rows

    mask = get_hud_mask('tools/out/my-run')  # captures+caches, returns a
                                               # (H, W) bool array, True=HUD
    rows = hud_free_rows(mask, x0=16, x1=304)  # row indices with zero HUD
                                                 # pixels in that column span

CLI usage:
    python3 tools/hud_mask.py --out tools/out/hudmask-run --save-png
    python3 tools/hud_mask.py --selftest
"""
import argparse
import os
import subprocess
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NATIVE_SCALE = 3  # capture.mjs's 960x672 viewport / this project's 320x224 internal render


def load_native(path, native_scale=NATIVE_SCALE):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    return img[::native_scale, ::native_scale]


def detect_sky_and_horizon(img, n_cols=66, consecutive=6, threshold=60):
    """Mode color of the top band (the sky) and the median horizon row,
    via per-column deviation-from-sky scanning. Same validated method as
    measure_ground.py/measure_roll.py (re-implemented here, not imported,
    so this module has no dependency on either)."""
    h, w, _ = img.shape
    band = img[: int(h * 0.18)].reshape(-1, 3).astype(np.int32)
    colors, counts = np.unique(band, axis=0, return_counts=True)
    sky = colors[np.argmax(counts)].astype(np.float64)

    xs = np.linspace(0, w - 1, n_cols).astype(int)
    rows = []
    for x in xs:
        dev = np.abs(img[:, x, :] - sky).sum(axis=1)
        hit = dev > threshold
        for y in range(h - consecutive):
            if hit[y:y + consecutive].all():
                rows.append(y)
                break
    horizon_row = int(np.median(rows)) if rows else h
    return sky, horizon_row


def derive_hud_mask(img, dev_threshold=40):
    """True where a pixel deviates from the sky color, restricted to rows
    above the horizon (below the horizon is legitimate ground texture
    variation, not HUD, and this mask makes no claim there)."""
    sky, horizon_row = detect_sky_and_horizon(img)
    dev = np.abs(img - sky).sum(axis=2)
    mask = dev > dev_threshold
    mask[horizon_row:, :] = False
    return mask, horizon_row


def hud_free_rows(mask, x0=0, x1=None):
    """Row indices with zero HUD pixels across [x0, x1) — convenience for
    callers that want to know which rows are safe to scan unmodified."""
    x1 = mask.shape[1] if x1 is None else x1
    band = mask[:, x0:x1]
    free = ~band.any(axis=1)
    return np.nonzero(free)[0]


def capture_clean_frame(out_dir, page='/', extra_params=''):
    """Boots a real capture (tools/capture.mjs) with the jet, clouds and
    combat elements all hidden, so everything above the horizon is either
    flat sky or HUD. Returns the path to the saved frame."""
    os.makedirs(out_dir, exist_ok=True)
    params = 'nocombat=1&hidejet=1&noclouds=1'
    if extra_params:
        params += '&' + extra_params
    cmd = [
        'node', os.path.join(ROOT, 'tools', 'capture.mjs'),
        '--out', out_dir, '--frames', '1', '--every', '1',
        '--page', page, '--url-params', params,
    ]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f'capture_clean_frame failed:\n{result.stdout}\n{result.stderr}')
    return os.path.join(out_dir, 'frame-0000.png')


def get_hud_mask(cache_dir, page='/', force=False, extra_params=''):
    """High-level convenience: capture (or reuse a cached) clean frame and
    return its HUD mask. Cached to <cache_dir>/hud_mask.npy — pass
    force=True to re-derive (e.g. if the HUD may have changed since)."""
    cache_path = os.path.join(cache_dir, 'hud_mask.npy')
    if not force and os.path.exists(cache_path):
        return np.load(cache_path)
    frame_path = capture_clean_frame(cache_dir, page=page, extra_params=extra_params)
    img = load_native(frame_path)
    mask, _ = derive_hud_mask(img)
    os.makedirs(cache_dir, exist_ok=True)
    np.save(cache_path, mask)
    return mask


def _synthetic_selftest():
    """Known-answer test: a synthetic frame with a flat sky, a textured
    'ground' below a horizon, and two bright rectangles above it (one
    mimicking the top HUD, one mimicking a bottom-right reticle blob).
    The mask must catch exactly the two rectangles and nothing in the
    ground's natural texture variation."""
    h, w = 224, 320
    rng = np.random.default_rng(7)
    img = np.zeros((h, w, 3), dtype=np.float64)
    sky = np.array([0, 159, 255])
    horizon = 140
    img[:horizon] = sky
    # textured ground: should NOT be flagged even though it deviates a lot
    # from the sky color (that deviation is legitimate, not HUD)
    img[horizon:] = np.array([0, 20, 200]) + rng.uniform(-15, 60, (h - horizon, w, 3))
    img[horizon:] = np.clip(img[horizon:], 0, 255)
    # two "HUD" rectangles above the horizon, coordinates within the
    # NATIVE 320x224 frame (this test's own first draft used 960px
    # viewport-scale coordinates here, which numpy silently clips to an
    # empty out-of-bounds slice rather than erroring -- caught only by the
    # leaked-pixel-count assertion below disagreeing, a reminder that this
    # is exactly the kind of silent-wrong-answer bug this whole tool exists
    # to avoid, just one level up).
    img[16:23, 17:70] = [230, 40, 30]       # top-left SCORE-like bar
    img[24:47, 237:291] = [240, 240, 240]   # reticle-like blob, top-right

    mask, detected_horizon = derive_hud_mask(img)
    assert abs(detected_horizon - horizon) <= 3, f'horizon detection off: {detected_horizon} vs {horizon}'
    assert mask[16:23, 17:70].all(), 'top-left synthetic HUD rect not fully caught'
    assert mask[24:47, 237:291].all(), 'top-right synthetic HUD rect not fully caught'
    assert not mask[horizon + 5:, :].any(), 'mask incorrectly flagged ground texture as HUD'
    leaked = mask[:horizon].sum() - (7 * 53 + 23 * 54)
    assert leaked == 0, f'mask flagged {leaked} extra pixels beyond the two synthetic rects'
    print('synthetic self-test: PASS')


def _live_selftest(out_dir):
    """Smoke test against the real, current HUD: the mask must be
    non-empty (something IS being excluded) and must include SOME pixel in
    the reticle's general screen region (top-right quadrant) — the
    structural property this tool exists to guarantee, without hardcoding
    the reticle's exact current coordinates (that staleness is the bug
    this tool fixes)."""
    mask = get_hud_mask(out_dir, force=True)
    h, w = mask.shape
    total = mask.sum()
    assert total > 0, 'live HUD mask is empty -- capture or detection broken'
    top_right = mask[: h // 3, int(w * 0.6):]
    assert top_right.any(), 'live HUD mask has nothing in the top-right quadrant (reticle region) -- suspicious'
    print(f'live self-test: PASS ({total} HUD px total, {top_right.sum()} in top-right/reticle quadrant)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=None, help='cache/output dir for the clean capture + mask')
    ap.add_argument('--page', default='/')
    ap.add_argument('--save-png', action='store_true', help='also save mask.png (white=HUD) for visual inspection')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()

    if args.selftest:
        _synthetic_selftest()
        _live_selftest(os.path.join(ROOT, 'tools', 'out', 'hudmask-selftest'))
        return

    if not args.out:
        print('--out <dir> is required (or use --selftest)', file=sys.stderr)
        sys.exit(1)

    mask = get_hud_mask(args.out, page=args.page, force=True)
    print(f'HUD mask: {mask.sum()} px flagged, shape {mask.shape}, saved to {args.out}/hud_mask.npy')
    if args.save_png:
        png = (mask.astype(np.uint8) * 255)
        Image.fromarray(png).save(os.path.join(args.out, 'mask.png'))
        print(f'saved {args.out}/mask.png')


if __name__ == '__main__':
    main()
