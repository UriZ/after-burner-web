#!/usr/bin/env python3
"""
Side-by-side MOTION comparison: our build against the arcade, as video.

WHY THIS EXISTS. Nine rounds of this project judged the game on still frames
and telemetry scalars, and the owner kept saying the same things were wrong:
the way the jet looks, the missiles, the responsiveness, how the sights lock.
Greps across every judge report, both critiques, REFERENCE.md and GAME_SPEC.md
returned ZERO hits for "motion comparison", and ZERO for missile tracking,
heat-seeking, lock acquisition or turn rate. Nobody had ever watched it move.

That is this project's own recurring lesson turned on itself -- a lane fixes
the axis that was measured -- so the gates kept passing while the thing a
player actually sees went unexamined. A still cannot show how a missile
tracks, how a lock acquires, how an aircraft grows as it approaches, or
whether the controls have weight. Those are shapes over time, and an
aggregate over time destroys them just as thoroughly as a single frame does.

WHAT IT DOES. Captures N consecutive 60 Hz frames of our build, pulls the
same count of consecutive frames from the arcade longplay at a chosen
timestamp, scales both to a common height with NEAREST (never bilinear -- it
would invent colours the hardware cannot make), stacks them side by side with
labels, and writes an animated GIF plus the raw frame pairs.

    python3 tools/motion_compare.py --out tools/out/motion-jet \
        --url-params "seed=1&demo=1&invincible=1" --start-tick 1200 \
        --frames 90 --arcade-start 104.0

HONEST LIMITS, because this tool will be quoted:
  * The arcade source is 1028x720 or 686x480 -- NEITHER is an integer
    multiple of the native 320x224, so the arcade half is resampled and is
    valid for MOTION, TIMING and SHAPE only. Take no colour or cardinality
    reading off it; use the two true-native stills for that.
  * Aligning our tick 0 to an arcade second is a human judgement. The GIF
    does not prove the two are in phase; it shows two motions side by side.
  * 60 fps GIF playback is approximate in most viewers. For timing claims,
    step the raw frame pairs in `pairs/` rather than trusting the GIF.
"""

import argparse
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LONGPLAY_60 = ROOT / ".reference-cache/video/ab2-longplay-60fps.mp4"


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.exit(f"FAILED: {' '.join(str(c) for c in cmd)}\n{r.stderr[-2000:]}")
    return r


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True, help="output dir, caller-unique (no default, on purpose)")
    p.add_argument("--url-params", default="seed=1&demo=1&invincible=1")
    p.add_argument("--start-tick", type=int, default=600, help="ticks to advance before the first captured frame")
    p.add_argument("--frames", type=int, default=90, help="consecutive 60 Hz frames (90 = 1.5 s)")
    p.add_argument("--arcade-start", type=float, required=True, help="seconds into the 60 fps longplay")
    p.add_argument("--fps", type=int, default=30, help="GIF playback fps")
    p.add_argument("--height", type=int, default=448, help="common height for both halves")
    a = p.parse_args()

    out = pathlib.Path(a.out)
    ours, arc, pairs = out / "ours", out / "arcade", out / "pairs"
    for d in (ours, arc, pairs):
        d.mkdir(parents=True, exist_ok=True)

    if not LONGPLAY_60.exists():
        sys.exit(f"missing {LONGPLAY_60} -- re-fetch with .claude/skills/youtube-reference/fetch-reference.sh")

    # --- our side: one capture run, then CONSECUTIVE ticks ---------------
    # --every 1 is the whole point: a sampled capture cannot show motion.
    print(f"capturing {a.frames} consecutive frames from tick {a.start_tick} ...")
    run(["node", str(ROOT / "tools/capture.mjs"), "--out", str(ours),
         "--frames", str(a.frames), "--every", "1",
         "--warmup", str(a.start_tick), "--url-params", a.url_params], cwd=ROOT)

    # --- arcade side: the same count of consecutive frames ---------------
    # -frames:v at an exact -ss, per CLAUDE.md's AV1 warning about -ss
    # SEQUENCE extraction starting early on this file.
    print(f"extracting {a.frames} arcade frames from t={a.arcade_start}s ...")
    run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(a.arcade_start),
         "-i", str(LONGPLAY_60), "-frames:v", str(a.frames),
         "-vsync", "0", str(arc / "a%04d.png")], cwd=ROOT)

    ours_f = sorted(ours.glob("frame-*.png"))
    arc_f = sorted(arc.glob("a*.png"))
    n = min(len(ours_f), len(arc_f))
    if n == 0:
        sys.exit("no frames on one side")
    print(f"pairing {n} frames")

    # --- stack: NEAREST only; bilinear would invent colours -------------
    # No drawtext: this ffmpeg build has no freetype. Labels are a coloured
    # separator bar instead -- OURS is left of it, ARCADE right. A missing
    # filter must not silently produce an UNLABELLED comparison, which is how
    # a reader mixes up the two halves and "measures" the wrong one.
    for i, (o, c) in enumerate(zip(ours_f[:n], arc_f[:n])):
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(o), "-i", str(c),
             "-filter_complex",
             f"[0:v]scale=-1:{a.height}:flags=neighbor,pad=iw+8:ih:0:0:color=0x3fc98a[l];"
             f"[1:v]scale=-1:{a.height}:flags=neighbor[r];"
             f"[l][r]hstack=inputs=2",
             str(pairs / f"pair-{i:04d}.png")], cwd=ROOT)

    gif = out / "compare.gif"
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-framerate", str(a.fps),
         "-i", str(pairs / "pair-%04d.png"),
         "-filter_complex", "[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=none",
         str(gif)], cwd=ROOT)

    meta = {
        "ours_url_params": a.url_params, "start_tick": a.start_tick,
        "frames": n, "arcade_source": str(LONGPLAY_60.relative_to(ROOT)),
        "arcade_start_s": a.arcade_start, "gif_fps": a.fps,
        "arcade_resampled": True,
        "layout": "LEFT = ours, RIGHT = arcade, separated by a green bar",
        "valid_for": "motion, timing, shape",
        "NOT_valid_for": "colour, cardinality, ladder -- arcade side is resampled from a non-integer-multiple source",
    }
    (out / "motion-manifest.json").write_text(json.dumps(meta, indent=2))
    print(f"\n  {gif}\n  {n} frame pairs in {pairs}\n  manifest: {out/'motion-manifest.json'}")
    print("  LEFT = ours, RIGHT = arcade (green separator bar).")
    print("\n  Valid for MOTION, TIMING and SHAPE. Not for colour -- the arcade half is resampled.")


if __name__ == "__main__":
    main()
