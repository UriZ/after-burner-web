# After Burner — three.js rebuild

A browser recreation of SEGA's After Burner II (1987 arcade), built with three.js + Vite.

**Read `STATUS.md` first** — it holds the current round, the latest judge verdict, and the
ranked gap list that defines what to work on next.

## THE PRIMARY DIRECTIVE

**The game must look, feel, and play as close as possible to the original After Burner II
arcade game.** This overrides everything else. Every decision is evaluated against: "would a
player mistake this for AB2?" If no, it fails. Code quality and test coverage are secondary
to visual and gameplay fidelity.

This is a **rebuild**, not a port. The Godot prototype at `../afterburner` is a read-only
knowledge mine (measured constants, reference tooling, accumulated session lessons) — never
a source of architecture, and never written to.

## The three ground-truth documents

| File | What it is | Rule |
|---|---|---|
| `ARCHITECTURE.md` | Binding design decisions D1–D9 | Code follows it; when the reference contradicts it, **the reference wins and the doc gets corrected first** (this has happened 4×) |
| `REFERENCE.md` | Measured visual facts — colors, proportions, HUD boxes | Every number cites source frame + coordinates + sampled value + **the operator used** |
| `GAME_SPEC.md` | Gameplay systems, each tagged MEASURED / ADOPTED / ASSUMED | Build against MEASURED; ASSUMED items need footage verification before they're tuned to |

Arcade reference frames live in `reference/` (proven stage identity via the stage↔timestamp
map). Judge reports and evidence live in `judging/R*/`.

**Cross-repo dependency**: the arcade video cache and the `youtube-reference` skill live in
`../afterburner/.reference-cache/` and `../afterburner/.claude/skills/`. Frame extraction
work needs that repo present. Extract single frames with `-frames:v 1` at an exact timestamp
(`-ss` *sequence* extraction on the AV1 60fps file starts ~4s early).

## How work happens here — the round loop

```
gap list → background agents build in parallel (disjoint file ownership)
        → FRESH-CONTEXT judge independently re-measures everything
        → verdict + ranked gaps → next round
```

- The judge is a **separate agent with a fresh context every round**. It never trusts
  developer self-reports; it re-measures. Four rounds so far: 3/10 → 4/10 → 6/10 → 7/10.
- **Judges audit criteria, not just code.** Acceptance criteria have been retired as
  non-discriminating or plain wrong in three consecutive rounds (a fin-height bound that
  contradicted the frames; a missile-trail brightness target taken from a *night* frame that
  turned the daylight trail black; an explosion palette taken from a frame of fading smoke).
  **Before tuning to a criterion, check the criterion against the arcade itself.**
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
