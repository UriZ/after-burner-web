# After Burner — three.js rebuild

A browser recreation of SEGA's After Burner II (1987 arcade), built with three.js + Vite.

**Read `STATUS.md` first** — it holds the current round, the latest judge verdict, and the
ranked gap list that defines what to work on next.

## THE PRIMARY DIRECTIVE

**The game must look, feel, and play as close as possible to the original After Burner II
arcade game.** This overrides everything else. Every decision is evaluated against: "would a
player mistake this for AB2?" If no, it fails. Code quality and test coverage are secondary
to visual and gameplay fidelity.

This is a **rebuild**, not a port. An earlier Godot prototype of the same game exists
elsewhere on this machine; everything worth keeping from it (measured constants, the arcade
stage map, reference tooling, session lessons) has been copied into this repo. **This repo is
standalone — never reach outside it for reference material or tooling.**

## The three ground-truth documents

| File | What it is | Rule |
|---|---|---|
| `ARCHITECTURE.md` | Binding design decisions D1–D9 | Code follows it; when the reference contradicts it, **the reference wins and the doc gets corrected first** (this has happened 4×) |
| `REFERENCE.md` | Measured visual facts — colors, proportions, HUD boxes | Every number cites source frame + coordinates + sampled value + **the operator used** |
| `GAME_SPEC.md` | Gameplay systems, each tagged MEASURED / ADOPTED / ASSUMED | Build against MEASURED; ASSUMED items need footage verification before they're tuned to |

Arcade reference frames live in `reference/` (proven stage identity via the stage↔timestamp
map). Judge reports and evidence live in `judging/R*/`.

**Arcade footage, all local to this repo:**
- `STAGE_MAP.md` — the verified stage↔timestamp map (which second of the longplay is which
  stage, established by reading the HUD digit) plus measured per-stage sky/ground palettes
  with their yields, crops, and corroborations. **Never anchor per-stage work on an
  unlabelled frame** — that shipped a stage-2 sky as stage 1 once.
- `.reference-cache/video/` (gitignored, ~731 MB) — `ab2-longplay.mp4` (the map-keyed one),
  `ab2-longplay-60fps.mp4` (fine stepping), `ab2-gameplay.mp4` (contains player deaths;
  no stage map). Missing? Re-fetch with the skill below.
- `.claude/skills/youtube-reference/` — `bash .claude/skills/youtube-reference/fetch-reference.sh --list`
  to see cached sources, `--url "<youtube url>" --name <name>` to add one. It resolves paths
  relative to its own location, so it works from this repo with no outside dependency.

Extract single frames with `-frames:v 1` at an exact timestamp. Input-seek sequence
extraction is exact — `t = T_ss + (i−1)/60` holds to the pixel (the old "~4 s early" caveat
was refuted four times, once pixel-exact; R10 lane-criteria §5). For anything that MOVES,
decode consecutively at 60 Hz: `ffmpeg -ss T -t D -i .reference-cache/video/ab2-longplay-60fps.mp4
-vsync 0 <dir>/f%04d.png` — `-vf fps=N` resamples and is a different operation, and the
youtube-reference skill's 4 Hz burst default will hide any transient.

## How work happens here — the round loop (REVISED R12: "look first, measure second")

> **Method retrospective, binding from R12** (`judging/R12/method-retrospective.md`):
> eleven rounds plateaued at ~8/10 while the owner's play verdict was "it's very bad",
> because gaps were generated from measurement residuals, not from looking. The loop below
> replaces the old one.

```
SIDE-BY-SIDE LOOK (ours vs arcade, fixed scenarios) + AGENT PLAYTEST
        → gap list IN PLAYER LANGUAGE, ranked by what breaks the illusion
        → background agents build in parallel (disjoint file ownership)
        → FRESH-CONTEXT judge: looks first, then re-measures shipped claims
        → verdict + next gap list
```

- **Every round opens with eyes, not instruments.** Capture the fixed scenario set
  (attract/title, stage-1 combat ≥20 s, death+respawn, stage transition) at deterministic
  60 Hz, pair it with the matching STAGE_MAP arcade footage, composite side-by-side, and
  LOOK. A gap exists only if it is on that list or in the playtest verdict.
  Measurement serves a chosen gap (it locates the constant); it never generates gaps.
- **The standing playtest is an AGENT with hands on the stick** — the `agent-playtest`
  skill drives `tools/playtest.mjs` (closed loop: see frames → move stick → see the
  consequence; selftest 8/8 before trusting a session). A FRESH-CONTEXT agent plays every
  round and files `judging/R<n>/playtest-verdict.md`; its five-sentence verdict seeds the
  gap list. The loop does not wait on a human — but if the owner does play, their
  sentences outrank the agent's.
- **Absence outranks error; error outranks imprecision.** Missing system > wrong-looking
  system > constant outside its band > constant inside its band (forbidden work). Every
  round ships at least one missing-system item (stage variety, resupply, enemy patterns…).
- **Perceptual tolerance bands close questions permanently.** Every numeric target carries
  a stop-threshold: 1 native pixel, 1 frame at 60 Hz, or the band the arcade itself varies
  across — never tighter than ~10 %. Inside the band → CLOSED, re-litigation forbidden.
- **Meta is capped.** No standing criteria lane. New binding rules only when a top-3 gap
  demands one. Instrument work ≤ ~20 % of a round; no new instrument where crop-and-look
  answers it. The defect ledger (REFERENCE.md) is reference material, not required reading.
- The judge is a **separate agent with a fresh context every round**. It never trusts
  developer self-reports; it re-measures what shipped.

> ### JUDGE CALIBRATION — RECALIBRATED R24, binding. The owner played the 9.3/10 build and
> said: *"no missiles, no heat-seeking missiles, the UI/sprites (my jet and the enemies) are
> not good enough, overall pretty bad."* The judges had drifted back into R12's original
> failure — scoring element-by-element arcade fidelity (does the canyon match, does the tanker
> match) up to 9.3 while the game is **bad to PLAY**. Fix:
>
> - **The SCORE is anchored on a full NAIVE playtest, nothing else.** The judge PLAYS the game
>   for several minutes like a first-time player / the owner — fly at enemies, press the
>   buttons, use the weapons — **with NO insider knowledge** (no "climb to the lock band and
>   camp," no deliberate-only moves). If a normal player cannot fire a missile by pointing at
>   an enemy and pressing the button, **the missile does not work, regardless of what telemetry
>   or a deliberate probe shows.** Element fidelity (biomes/sprites matching frames) is
>   NECESSARY but CANNOT lift the score above how the game actually plays.
> - **Re-baselined scale (play experience, not frame-match):** **9–10** = genuinely good,
>   convincing AB2 you'd want to keep playing — every core weapon usable and satisfying, the
>   jet and enemies look great, it feels like the arcade in the hands. **7–8** = solid and
>   playable, clear rough edges. **5–6** = "pretty bad but real content there" — THIS is where
>   the owner put the current build (core weapon unusable, weak sprites). **≤4** = broken core
>   loop. The current build is **~5**, not 9.3; score honestly down there until play improves.
> - **Weapons-usable, controls-feel, and sprite/UI quality are each a scored dimension**, above
>   backdrop fidelity. A beautiful canyon with an unusable missile and weak jet art is a 5, not a 9.
> - The owner's playtest is the ground truth and **outranks the judge**; the judge's job is to
>   predict what the owner would say, by playing the way the owner plays.
> ### DIAGNOSIS GATE — ADDED R40, binding. The owner asked why progress was slow. The answer,
> from the data: R36–R38 shipped 18 verified fixes with every gate green and the naive-play
> score went 7 → 7 → 6.5. The method was tuned for rigor; **diagnosis** was the bottleneck.
> Four rules follow, and they outrank a lane's instinct to start editing:
>
> - **No code until the cause is proven.** A lane must REPRODUCE the complaint and state the
>   mechanism before it edits a file. Fixing the thing the complaint NAMES is the failure mode:
>   "deaths come from nowhere" got three rounds of fixes to the bullet (bigger → audible →
>   strobing), each passed its operator, and a fourth fresh player said the same sentence —
>   nobody had asked whether the firer was ever on screen. The lanes that found a MECHANISM
>   (the fireball was rendered wrong, not placed wrong; the continue coin was level-triggered)
>   fixed their gap in one pass.
> - **Hands before "done" on any feel item.** Probes drive scripted pilots; the owner flies by
>   hand. R37 declared aiming fixed on a 0.33× hands-off metric and the owner said "I don't see
>   the improvements." A feel lane PLAYS its gap before and after (`agent-playtest`), and that
>   verdict is the acceptance; probe numbers are supporting evidence, never the answer to the
>   owner. Note the instrument's blind spots when citing it: it decides every 0.5–4 s and is deaf.
> - **Three strikes escalates.** A complaint that survives two fixes is not a tuning problem.
>   The third round on it is a ROOT-CAUSE round, allowed to cross file ownership and change
>   architecture. Enemy art took 12 commits across 5 rounds before R37 found the wrong FACT
>   underneath it (R27 had misread the player's jet).
> - **Pull the big lever before the polish.** Close-enemy presence (~0.09 vs the arcade's
>   0.40–0.70) defines AB2's relentlessness and has been deferred by four separate lanes as
>   out-of-scope. Structural gaps get their own round; they do not wait for a lane to have spare
>   file ownership.

- **Never save an edit that does not boot.** Twice in R40 a half-landed edit (a renamed
  constant with one reference left behind; an undeclared tunable key) killed `window.__step`
  on a tree the OWNER WAS PLAYING and every other lane was capturing from. A save is a
  publish here. After each one:
  `node tools/combat_probe.mjs --ticks 60 --url-params "demo=1&seed=7"` must print state
  JSON, not a stack trace — ~10 s, and it catches the whole class. A lane that finds another
  lane's breakage ESCALATES rather than reaching into the file (both R40 lanes did this
  correctly); the TL preserves the WIP and restores the last good version.
- **Every report picture names itself.** Owner, twice: "what is ours and what is the arcade???"
  A caption under an ambiguous picture is not an answer. Comparison sheets are built with
  `tools/compare_sheet.py`, which bakes a labelled colour spine into each row (blue = arcade,
  orange = ours), and every round's report LEADS with a real arcade-vs-ours sheet — not a
  before/after of ours under an "ours vs arcade" heading.
- **Before tuning to a criterion, check the criterion against the arcade itself** —
  acceptance criteria have been retired as wrong in every round that audited them.
- **Every round ships an HTML report** — `python3 tools/round_report.py` (edit the `ROUND`
  dict, re-run, publish the `judging/R<n>/report.html` as an Artifact). It is the tight,
  one-glance artifact for the owner: TLDR, the ours-vs-arcade side-by-sides, the ranked
  gaps. Keep it tighter than the markdown; the markdown files hold the evidence.
- **Developers do not commit.** Work stays in the tree; the TL commits after verification.
  Never `git push` without explicit user approval.
- **Never run `git stash` / `checkout .` / `reset` on this tree** while agents are active —
  it destroys their uncommitted work. For A/B against committed state use
  `git show HEAD:<file>`.
- A narrow `git add` + commit **sweeps in whatever is already staged** by other agents on a
  shared tree. Use `git commit -- <paths>` (pathspec-scoped) and check the commit's own diff.

### File ownership (assign disjoint sets per round)

| Area | Files |
|---|---|
| World | `render/ground.js`, `sky.js`, `clouds.js`, `game/stage.js`, `core/*`, `tools/measure_*.py` |
| Player & HUD | `render/spriteFactory.js`, `entities/player.js`, `ui/**`, `render/screen.js`, `viewport.js` |
| Combat | `entities/enemy*`, `weapons/**`, `effects/**`, `game/spawner.js` |
| Game flow | `game/game.js`, `main.js`, `game/flow/**`, `game/score.js` |
| Audio | `audio/**` |

Cross-area changes are **requested via message**, not reached into. Interfaces get agreed
between agents before either side writes.

## Running, capturing, measuring

See `README.md` for commands, the full query-param table, and the tools inventory. The three
things that matter most:

- `tools/capture.mjs --out <UNIQUE-dir>` — `--out` has no default on purpose. Any tool
  writing a fixed output path corrupts concurrent agents' work silently.
- `?fixed=1` + `window.__step(n)` is the deterministic path every judge uses. It implies
  audio mute. `?seed=N` works (it was silently ignored until R3 — caught only because two
  seeds produced byte-identical output).
- `tools/hud_mask.py` derives the HUD exclusion mask **per run** from a live frame. Use it.

## Measurement discipline (this is where rounds are won or lost)

- **Validate the instrument on a known input before trusting any number.** Judges and devs
  have both discarded their own tools for failing synthetic controls. A measurement that
  disagrees with another instrument means one of them is broken — reconcile before concluding.
- **Any "measures zero" / "doesn't move" / "100%" result: crop it and LOOK once** before
  publishing. Every false alarm this project has produced was a clean, plausible, stable
  number.
- **The HUD contaminates sky-band measurements.** It is white, high-contrast, line-shaped,
  sits in the upper-right sky, and now contains a *rotating* attitude line. It has been
  counted as an enemy, as clouds (100% presence), and has defeated two line fits. Never
  hardcode an exclusion box — derive it with `hud_mask.py`.
- **Isolation harnesses beat in-situ measurement.** Measure the authored canvas, or the
  subject alone, before measuring it in a live frame full of dither, enemies, and haze.
- **No speed claims from sub-60 Hz sampling** (temporal aliasing). Stills support pose,
  scale, and composition only.
- **An honest bound or a withdrawal is an accepted deliverable.** "This fix would break a
  higher-priority passing metric, so I disabled it and documented why" is a good outcome.
  Inventing a number to post a headline figure is not.
- **A comment citing a measurement that was never taken is worse than no comment** — the
  next agent trusts it.

## Recurring bug classes already paid for

- **sRGB double-encoding**: `THREE.Color(r,g,b)` floats aren't decoded under three's color
  management (use `.setRGB(..., THREE.SRGBColorSpace)`), and shader output into an
  SRGBColorSpace target gets double-encoded — symptom is washed-out color that no amount of
  palette tuning fixes. Hit twice (sea, explosions).
- **Shared PRNG stream sequencing**: adding one conditional draw silently shifts every
  later draw. Give independent concerns independent streams.
- **Percentile calibration on fbm noise**: a smoothstep near the nominal [0,1] top never
  fires, because the noise's actual max is ~0.74. Hit three times.
- **Canvas2D fractional positions** silently antialias chunky pixel art into blur.
- **Perspective parallax**: an object at fixed world Y drifts vertically on screen as it
  approaches. Hold the target screen fraction per tick instead.

## Assets and licensing

No ripped SEGA assets, ever. All sprites are original pixel art authored on canvas, measured
against reference footage. Audio is synthesized WebAudio; the music is an **original**
composition in the FM style, never a transcription.
