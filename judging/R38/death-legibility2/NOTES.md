# R38 death-legibility-2 lane — notes (incremental)

Gap (playtest rank 2): 7 deaths, none felt dodgeable — "the killer is one slow orange
puff among dozens of identical drifting puffs, or a plane that pops up full-size the
same instant I blow up." Owned files: `src/weapons/enemyShots.js`,
`src/weapons/telegraph.js`, `src/effects/smoke.js`, `src/effects/hitFlash.js`.

## 0. Starting facts (from code read, before any instrument)

- Every death is an enemy round through `combat.checkPlayerHit` (combat.js:1178
  "shots only — body-ram collision is …"); there are still no collision/terrain
  deaths. So the "plane pops up full-size the same instant I blow up" is a visual
  COINCIDENCE at the death tick, not the killer — candidate mechanisms: replenishment
  spawning near, a crosser entering at near depth, or the death-sequence camera.
- The on-screen ORANGE-FAMILY object classes a fatal round must be distinguished
  from, with their palettes:
  - player vulcan puffs (projectileSprites.js): gold/amber #ff9c10/#ffad19/#ffde21,
    4.5–5.4 px, 12/s — "dozens" whenever fire is held;
  - enemy round (R37 redraw): red cap #941010 + pale-peach body #f7b584 + hot core,
    dark outline #3a1010, 5.8–9.9 px (air), 7–9.9 px (battery);
  - kill-smoke residue (smoke.js 'kill'): saturated orange balls #a44a10/#e67310/
    #f78410/#ff9c4a at 14–16 %W — these DRIFT and linger ~1 s+, and with playtest
    gap #1 (kills detonate on the player's nose) they sit AT the player;
  - telegraph flares (telegraph.js): same palette family as the enemy round
    (deliberate, "one colour not two"), 10–18 px pulsing stars;
  - explosion fireballs + missile engine flames.
- The R37 whistle/roar covers the audio channel for hearing players; the playtest is
  deaf, so part of this gap may already be fixed for real players. The visual
  confusability claim stands on its own, though: four distinct object classes share
  the orange family at overlapping sizes.

## 1. Death taxonomy — COMPLETE (all 7 deaths, tick-exact)

Replayed all three playtest sessions (seeds 7/11/3) with `replay_deaths.mjs` (R36's
instrument; copied unchanged — ROOT resolution is depth-relative and this dir is at
the same depth). **Instrument validated on a known input**: s2b's first death
replays at tick 2865 / score 357575 — inside the playtest's independently reported
window (ticks 2854–3094) and matching the HUD score visible in their evidence strip
`judging/R38/evidence-illegible-death-s2bt29.png` to the digit.

| session (seed) | death tick | killer | total warning | round flight (visible) |
|---|---|---|---|---|
| s1 (7) | 417 | battery | 1.18 s | 0.79 s |
| s1 (7) | 1787 | interceptor (air) | 3.67 s | 2.67 s |
| s1 (7) | 2724 | battery | 1.18 s | 0.79 s |
| s1 (7) | 3749 | battery | 1.18 s | 0.79 s |
| s2b (11) | 2865 | battery | 1.17 s | 0.79 s |
| s2b (11) | 5739 | battery | 1.17 s | 0.79 s |
| s3 (3) | 443 | battery | 1.20 s | 0.79 s |

**6 of 7 deaths are ground-battery rounds** — the same killer class as R36's 7-of-9,
every one "announced" under the R36 size-aware operator (round drawn 7→9.9 px,
warning ≥ the 1.167 s floor). The one air death carried 3.67 s of warning. So the
R36/R37 fairness machinery held; what failed is PER-BACKGROUND CONTRAST and CLASS
DISTINCTNESS, see §2.

## 2. Why the announced round still isn't seen (60 Hz track-crops)

`s2b-death1-round-track-3x.png` (stage 2) and `s1-death3-round-track-3x.png`
(stage 1), 3× crops tracking the fatal round along its flight:

- **Stage-2 deaths happen against an ORANGE SKY.** The round's pale-peach body
  (#f7b584) was measured on the stage-7 t330 train — a NIGHT sky, where it blazes.
  Against stage 2's orange sunset gradient it is near-camouflage; mid-flight the
  round also crosses the big cream CLOUD, where the pale body vanishes entirely.
  Only the red cap (#941010) carries contrast on those backgrounds.
- **The authored 1-texel outline is sub-pixel at game size.** The canvas is 16 wide;
  at the 7–9.9 px the round draws, the outline is ~0.6 screen px. The arcade's own
  outline is ~1 native px of a 10.6–11.8 px round — proportionally TWICE ours — and
  dark is the one value that reads on orange sky, cream cloud, AND bright sea.
- **At arrival the round sits among steady warm blobs of its own size family**: the
  player's gold vulcan puffs (4.5–5.4 px, 12/s — "dozens" whenever fire is held),
  kill-smoke residue balls, and the nose-kill fireballs of playtest gap #1. Nothing
  marks the round as LIVE.
- **Audio**: the R37 battery roar covers hearing players for the whole 0.79 s
  flight; the playtest instrument is deaf and ALSO samples at 0.5–2 s — a 0.79 s
  flight can fall entirely between its panels. Part of this gap is real
  (contrast/class), part is the instrument (deaf + coarse).

## 3. The "plane pops up full-size the same instant I blow up" — NOT a spawner defect

- Every death is still an enemy round through `combat.checkPlayerHit`
  (combat.js:1178); no collision kills exist, so the plane never killed anyone.
- Code: every mid-combat spawn enters at depth ≥ 18 (~4 %W or smaller) — echelons
  63–108, crossers 30–44, walls/deep at APPROACH_SPAWN_DEPTH-scale, drought
  replenishment is a crosser (30–44). The only near-depth spawn is the stage-open
  OVERTAKE flight (depth 4–7), which is stage-open only, rear-aspect, receding and
  never fires — deliberate, documented in spawner.js (`_openerWave`).
- Evidence: in the s2b death-1 window the "full-size" green camo plane is
  continuously on screen for 60+ ticks before the death (8-tick strip
  `s2b-death1-approach-strip-small.png`), cruising lower-left. At the playtest's
  ~1 s panel cadence it appears to "pop up" next to the death explosion. Sampling
  artifact; no message to the sky-density lane needed.

## 4. Changes shipped (owned files only)

1. **`src/weapons/enemyShots.js` — battery rounds strobe.** The killer class gets
   its own two boil frames, authored in-file from the same measured SHOT_PALETTE
   (fx-probe audits both; no new colours): frame A = the layered red-cap oval with
   the outline thickened to the arcade's own proportion (~2/16), frame B = the body
   flashed HOT (#fff7ce family) under the same cap and outline. At the existing
   FLICKER_HZ = 30 the round strobes red↔hot — the only strobing object on screen —
   while every confusable ambient class (vulcan puffs, kill smoke, explosions,
   telegraph) holds steady colour. The AIR round's R37 measured boil is
   byte-untouched; sizes/ballistics/hit test untouched (R36 size-aware announced
   guarantee unchanged by construction).
2. **`src/weapons/telegraph.js` — battery flare a third larger** (14→26 px vs the
   air 10→18). The battery's whole visual warning chain is 0.4 s of this star +
   0.79 s of flight, and the star sits at the bottom of the frame in terrain
   clutter, not open sky. Size only; pulse rhythm, 0.4 s duration (a FAIRNESS
   constant in groundBattery.js — aim snapshots at flare-lit) and aim geometry
   untouched.
3. **`tools/fx-probe.mjs`** — the two battery frames added to the palette audit
   (measurement-only; R37 precedent).
4. `src/effects/smoke.js`, `src/effects/hitFlash.js`: read, deliberately unchanged.
   Kill smoke is the measured arcade residue; its adjacency to the player is
   playtest gap #1 (kills on the nose), which is the kill-placement lane's.

## 5. Verification (incremental)

- **fx_palette_probe: PASS** — batteryShot[A]/[B]: 0 partial-alpha, 0 off-palette,
  0 off-ladder (whole-tree union still 23 channel values, gate green).
- **Muted boot probe: PASS** — `node tools/combat_probe.mjs --ticks 150`, 0 error
  lines, telemetry streaming.
- **Before/after 60 Hz of the SAME deterministic deaths: PASS — crop and LOOK.**
  `before-after-fatal-round.png` (also the per-strip files `*-round-track-3x*.png`
  and the consecutive-frame `s2b-death1-strobe-60hz-AFTER.png`): the after-round
  carries a readable dark ring on the orange stage-2 sky, on the cream cloud it
  crosses, and on the stage-1 sea, and it strobes red↔hot every 2 ticks at 60 Hz —
  the only strobing object in the frame; every confusable class (vulcan gold,
  kill smoke, explosions, telegraph) holds steady colour. The s2b replay on the
  changed tree produced byte-identical deaths (ticks 2865/5739, same warnings) —
  render-only confirmed at the gameplay level.
- **Battery flare before/after** (`s2b-flare-before-after.png`): the 14→26 px star
  reads clearly on the turret against the desert clutter; before, the 10→18 px star
  was a few pixels at the peak beat.
- **Fairness probe (seeds 4/5/6 × 180 s, per-seed runs):**

  | seed | deaths/flight-min | min warning | unannounced fatal |
  |---|---|---|---|
  | 4 | 1.330 | 1.167 s | 0 |
  | 5 | 1.338 | 1.183 s | 0 |
  | 6 | 1.784 | 1.250 s | 0 |
  | **pooled** | **1.484** | **1.167 s** | **0** |

  Warning floor and zero-unannounced: PASS on every seed. The pooled rate is
  nominally 1.6 % past the band's +10 % edge (1.463), but n = 10 fatal hits puts
  the Poisson sd at ~0.47 — all of this is within one sd — and the shift is NOT
  this lane's: seed 6's first two deaths are byte-identical to the R36 baseline
  AND the R37 gate (14.5 s, 29.6 s in all three), with only the late-run times
  moving (107.4 → 78.6 s). That early-identity/late-shift signature is a
  conditional gameplay perturbation, and the shared tree is carrying the
  sky-density lane's in-flight spawner.js/enemy.js/flow.js edits (their new
  `_reliefPair` refill + drought 3.5→2.5 — more close enemies = more fire). This
  lane's diff writes no gameplay state by construction (a per-shot texture pick on
  an existing flag + a flare sprite's drawn size; no PRNG draws, no hit-test
  inputs). One probe run also crashed on a torn mid-save of spawner.js
  (`_reliefPair is not a function`) — concurrent-writer flake, clean on retry.
- **Same-tree replay note**: the s1 after-replay reproduces deaths 1–3 to the tick
  (417/1787/2724) but the 4th (t3749) no longer occurs — same attribution as
  above (the spawner edits landed between the before and after runs); s2b replayed
  byte-identical end to end.

## 6. Honest findings / what this lane did NOT do

- The air round's R37 measured boil frames and 1-texel outline are untouched: air
  deaths are 1-in-7 with 2.7–3.7 s warning, and those frames are measured art. If
  a future round wants the thicker outline on air rounds too, it is a
  projectileSprites.js change (not this lane's file this round).
- The "dozens of identical drifting puffs" at the player's nose are mostly the
  player's own vulcan stream + the kill-smoke of point-blank kills — the latter is
  playtest gap #1 (kills on the nose), the kill-placement lane's. Once kills
  detonate out in front, the player's immediate surround clears and the strobing
  battery round has even less competition.
- Audio was already covered for hearing players by R37 (battery roar the whole
  flight); the playtest is deaf AND samples at 0.5–2 s against a 0.79 s flight, so
  the next playtest may still under-credit the fix — judge it at 60 Hz, not by
  panel.
