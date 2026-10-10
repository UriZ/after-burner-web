---
name: youtube-reference
description: Turn arcade gameplay footage into local frame sequences any agent can read, so motion can be measured instead of guessed. REQUIRED for any claim about TIME - duration, rate, delay, period, envelope, "holds for", "arrives every" - because every such figure in this project taken before R9 was sampled at 4 Hz and the arcade events they describe last 0.067-0.13 s. Read it for the 60 Hz consecutive-decode recipe; the 4 Hz burst default here is a stage-spread tool and will hide the defect. Use before any visual design, implementation, or review work, and before judging anything that moves.
user-invocable: true
argument-hint: "--url URL --name SLUG [--bursts \"150,420,700\"] [--burst-fps 4] [--min-fps N] [--force] [--list]"
allowed-tools: Bash, Read
---

# YouTube Reference Frames

Converts reference gameplay video into stills on disk, so motion can be studied by any agent — including those with no web tools.

---

## READ THIS FIRST — R10, and it is the reason this file was rewritten

**For nine rounds no reviewer in this project ever produced a motion burst.** The R9 judge was the
first, found a hard defect in one afternoon (our explosion holds near its peak **9× longer** than
the arcade's), and split its score **stills 9/10, motion 4/10**. This skill had named that exact
defect class since before round 1, in its own words below: *"invisible in any single screenshot and
obvious across a burst."*

> **AND THE DEFAULT IN THIS FILE WOULD NOT HAVE FOUND IT EITHER.** `--burst-fps` defaults to **4**
> — *"consecutive frames, 0.25 s apart"*. The arcade explosion holds within 60 % of peak for
> **0.067 s**. Three arcade kills arrive inside **0.367 s**. The post-respawn invincibility flash
> has states lasting **0.10–0.13 s** and defeated four separate measurement passes for this reason.
> **Every one of those is shorter than one default sample. A reviewer who followed this skill
> exactly, at its defaults, would have produced clean 4 Hz bursts and concluded nothing was wrong.**
> REFERENCE.md ledger row 48.

**So this skill now has two distinct modes and you must pick on purpose:**

| you are asking | use | rate |
|---|---|---|
| *what does stage 7 look like, what colours, what terrain* | **`--bursts` / stage spread** (below) | 4 Hz is fine |
| *how long does X last, how fast does Y turn, what happens between the launch and the hit* | **NATIVE-RATE CONSECUTIVE DECODE** (next section) | **60 Hz, nothing less** |

### Native-rate consecutive decode — the only way to measure a TRANSIENT

This bypasses the burst machinery on purpose. It is what the R9 judge used and what every
temporal figure in REFERENCE.md and GAME_SPEC.md is now required to have been taken with.

```bash
# 300 consecutive frames at the source's own 60 fps. -vsync 0 decodes EVERY frame;
# -vf fps=N RESAMPLES and is a different operation. Do not substitute one for the other.
ffmpeg -nostdin -loglevel error -ss 96.0 -t 5.0 \
  -i .reference-cache/video/ab2-longplay-60fps.mp4 \
  -vsync 0 <your-unique-out-dir>/f%04d.png
```

- **Use the 60 fps cache file**, `ab2-longplay-60fps.mp4`. The 30 fps copy cannot resolve a
  0.067 s event, and `--height 480` can never yield 60 fps from this source (see `--min-fps`).
- **`-ss` sequence extraction on the AV1 60 fps file starts ~4 s early.** The *envelope* of an
  event — its shape over time — is a relative measurement and is unaffected. **An absolute
  timestamp is not**: verify alignment against the HUD stage digit before quoting one.
- **Output to a UNIQUE directory**, per CLAUDE.md. Any tool writing a fixed path corrupts
  concurrent agents' work silently.
- **STATE THE RATE.** REFERENCE.md citation **field 6** is binding: every figure touching time
  publishes its sampling rate as a number, **on both sides**, plus the decode method. A figure
  without one is not a temporal measurement.
- **A NEGATIVE needs the rate most of all.** *"There is no flash"*, *"ours leaves no smoke"*,
  *"nothing happens in between"* — a 4 Hz sampler produces all three for free. Four passes
  published "no visible invincibility flash" about an arcade that flashes.
- **Publish the CONTIGUOUS RUN, not just a count.** Four frames above a threshold scattered over
  five seconds is not the same event as four consecutive ones, and a count cannot tell them apart.

---

## Why this exists

CLAUDE.md requires watching After Burner II gameplay video before any visual work. That was impossible in practice:

- `developer`, `judge`, `qa`, and `visual-qa` are granted only `Read, Write, Edit, Glob, Grep, Bash` — no web access whatsoever
- `architect` and `ui-designer` have `WebFetch`, but WebFetch returns page HTML and text. It does not decode video

For a long time every agent told to "watch the videos" quietly fell back to the static screenshots, and the requirement was ceremonial. This skill makes it real: video becomes **files**, and every agent can read files.

## Why frames instead of watching

A model cannot stream video. Consecutive stills at a known interval are the faithful representation of motion available to it, and they answer motion questions directly:

- **How fast does an object grow as it approaches?** Compare the same enemy across a burst.
- **How quickly does the ground rush past?** Track a ground feature between consecutive frames.
- **How long between enemy waves?** Count frames between appearances.
- **How do flames animate?** Consecutive frames show the cycle.

This is exactly the class of defect that stills-only review kept missing. The original example — enemy sprites plateauing at a fixed size for the entire near half of their approach — is invisible in any single screenshot and obvious across a burst.

> **Status of that original example, R10: CHECKED AND CLEARED — do not open a gap for it.** The
> R9 judge measured `span × depth` per tick over 420 consecutive ticks and it is constant to three
> decimals on every enemy; enemies spend only 6.4–14.5 % of their on-screen life within 20 % of
> their maximum span. **There is no size plateau in this build.** The defect class is real and the
> warning stands; this particular instance is closed.
>
> **The questions above are the RIGHT questions and the bulleted ones are all 60 Hz questions.**
> *"How long between enemy waves"* is answerable at 4 Hz. *"How do flames animate"* and *"how fast
> does an object grow"* are not. Read the mode table at the top before choosing a rate.

## Usage

```bash
bash .claude/skills/youtube-reference/fetch-reference.sh \
  --url "https://www.youtube.com/watch?v=VIDEOID" \
  --name ab2-longplay
```

See what has already been extracted:

```bash
bash .claude/skills/youtube-reference/fetch-reference.sh --list
```

Target specific moments, with finer motion sampling:

```bash
bash .claude/skills/youtube-reference/fetch-reference.sh \
  --url "https://www.youtube.com/watch?v=VIDEOID" \
  --name ab2-night --bursts "300,900" --burst-fps 8
```

## Getting 60fps footage (`--min-fps`)

The default `--height 480` download of the 60 FPS longplay is not actually 60fps: YouTube
only muxes the higher frame rate at 720p and above for that source (verified with
`yt-dlp -F` — every format at 480p and below is 30fps; 60fps exists at formats 298/398/302
1028x720). `--height 480` alone can never yield it, no matter which URL you point at.

```bash
bash .claude/skills/youtube-reference/fetch-reference.sh \
  --url "https://www.youtube.com/watch?v=65weTx0haog" \
  --name ab2-longplay --min-fps 60
```

- Adds an `[fps>=N]` term to the yt-dlp format selector.
- Auto-bumps the default `--height` to `720` when you don't set one explicitly — otherwise
  `[height<=480][fps>=60]` matches nothing and the download fails outright.
- After download, `ffprobe`'s `r_frame_rate` is checked against `--min-fps`; a short-of-target
  result fails loudly with the exact selector used and the source's full format list, rather
  than silently accepting a lower fps.

**Dual-cache layout — the 30fps and 60fps copies never collide.** A `--min-fps` run is cached
and extracted under `<name>-<min-fps>fps` (e.g. `ab2-longplay-60fps`), not `<name>`:

```
.reference-cache/video/ab2-longplay.mp4          # existing 30fps copy, untouched
.reference-cache/video/ab2-longplay-60fps.mp4     # new, ~300-380 MiB
assets/reference/motion/ab2-longplay/             # 30fps frames, untouched
assets/reference/motion/ab2-longplay-60fps/        # 60fps frames
```

Running one never modifies or deletes the other, in either order. This 60fps copy is what
the #113 §12 fps-decimation entry gate and any future quantitative speed metric (#114) need
as the reference side — the 30fps copy fails that gate (measured ratio ~0.92 against a true
0.5, see #113).

## Output

Frames land in `assets/reference/motion/<name>/` (or `<name>-<min-fps>fps/` for a `--min-fps`
fetch) — **note that `assets/reference/motion/` does not exist in this repository until the script
creates it, and it is NOT the `tools/out/<unique-dir>` convention every other capture here uses.
Do not pool these frames with measurement captures.**

- `burst-a-01.jpg` … `burst-a-12.jpg` — **12 frames at `--burst-fps`, default 4, i.e. 0.25 s apart
  and a 3 s window.** **This is a STAGE-SPREAD and WAVE-TIMING tool, not a transient tool** —
  see the mode table at the top of this file. For anything shorter than ~1 s, use the native-rate
  consecutive decode instead; `fps=N` here *resamples* and `--burst-fps 60` on the 30 fps cache
  file cannot invent frames that are not in it.
- `stage-01.jpg` … — spread across the run, for stage, terrain, and palette variety.

Read them with the Read tool like any other image.

## How to actually use the frames

1. **Pick the rate before you pick the frames.** Mode table at the top of this file.
2. Read a full burst **in sequence**, not one frame in isolation
3. Pick one object and track it across consecutive frames — its size, screen position, and how both change
4. Compare that rate of change against your own build's captured frames. On our side the matching
   tool is `tools/capture.mjs --every 1` with `--warmup N` (a consecutive burst can start somewhere
   other than tick 1), or a per-tick telemetry recorder; `?fixed=1` + `window.__step(n)` is the
   deterministic path. **Both sides at the same rate or the comparison means nothing.**
5. State what you measured, not just what you saw. "The enemy roughly doubles in width over four frames" is reviewable; "the scaling looks right" is not
6. **State the sampling rate, on both sides, in the figure itself** (REFERENCE citation field 6).
   And **validate the instrument on a known input first** — the arcade explosion envelope was
   published only after a synthetic 5 %-of-frame patch returned 5.00 % through the same mask.

## Requirements

- `ffmpeg` on PATH (`brew install ffmpeg`)
- Network access on first run

`yt-dlp` is fetched automatically into `.reference-cache/bin/` on first use. It is **not** installed system-wide and does not enter version control.

## Caching

- Downloaded video is cached in `.reference-cache/video/` and reused
- Extraction is skipped if frames already exist — pass `--force` to redo
- The whole `.reference-cache/` directory is gitignored

## Licensing — important

Extracted frames are **local development reference and are gitignored**. Do not commit them and do not publish them. This repository is public; committing frames from copyrighted arcade footage would be redistribution rather than reference use. Any agent needing them regenerates them with this skill.

## Reference sources for this project

The three After Burner II gameplay recordings named in CLAUDE.md. Pass one of those URLs with `--url`; use `--list` first to check whether a set has already been extracted, since the cache is shared across agents.
