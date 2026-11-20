# R37 — start-time lane (owner: "when the game first starts, it takes too long to start playing")

## TL;DR

Two real costs found; both fixed. (1) **Infra (fixed by TL, ad803c9):** the dev server was
watching ~74k capture/evidence files — page load → first frame was 8.7 s in the owner's
browser, now 1.87 s owner-live / **0.77 s** on a quiet machine. (2) **Music (this lane):** the
R35 flight-music OfflineAudioContext render takes **200–257 s per variant** on this machine
(recorded in R35's own `render-result.txt` renderMs fields, never read), so stage-1 music
effectively **never played**, a full core ground at ~100% for minutes after every start /
reload / variant request, and my live 6-minute watch saw `playing:false` through all of
flight. Replaced with a **live lookahead scheduler** (same notes, same synth functions, same
bus/compressor chain): music now starts **0.3 s after the start press**, zero offline renders
on any play path. The state-machine cadence itself was never the gap — press→flying is 3.5 s
vs the arcade's ~10 s launch cinematic and ~16–19 s coin→controllable.

## Phase timings (how measured: `window.__startupProbe` in main.js — live-mode hook, no
?fixed needed — polled from puppeteer; scripts in this directory; all warm dev-server loads)

| Phase | Before | After | Arcade |
|---|---|---|---|
| page load → title painted | 8.7 s owner-live (infra bug); 88–139 s headless | **0.77 s** clean headless; 1.87 s owner-live (TL) | n/a (cabinet is always on; title loop) |
| `new Game()` (all canvas/texture authoring) | 0.48–0.93 s (load-contaminated) | **155 ms** clean | n/a |
| start press → launch state | ~15 ms | same | coin → cinematic ≈ 6 s (t78→t84) |
| launch cinematic → controllable flight | 3.52 s | same (deliberately untouched) | **~10 s** (t84 deck → t94 flight; player banking with HIT 1 by t98) |
| start press → **music playing** | **never** (200–257 s render; tab sometimes died first) | **0.31 s** | music from the launch |
| main-thread stall at title entry (render pre-warm graph build) | 274 ms clean / 1.9 s loaded | **0** (pre-warm removed) | n/a |

Arcade cadence read off `ab2-longplay.mp4` 1 Hz frames `arcade1hz/` (t74 title CREDIT 0 →
t80 SHIPS 3 → t84 carrier → t88 deck roll → t94 airborne → t98 fighting). Coin→controllable
≈ 16–19 s. **Ours is ~3× faster than the arcade from press to flying; the launch is NOT cut**
(brief: the gap is excess, not the sequence).

## The music bug (root cause + evidence)

- R35 rendered the 61 s / ~16k-node FM loop in an OfflineAudioContext. Its own verifier
  logged `renderMs: 200012–256595` per variant — 3.3–4.3 **minutes** — and the lane read
  only peak/RMS/pitch off those lines. In play: title pre-warm kicks the render at boot;
  `applyFlight` waits on the promise; flight opens silent and stays silent for minutes,
  with one core saturated (repeat per stage variant and per HMR reload — concurrent renders
  stack). The owner's own Chrome tab was observed at 99.5% CPU during this round.
- Scaling probes (`oac_isolation2.mjs`, `scaling_probe.mjs`, `suspend_experiment.mjs`):
  trivial offline graphs render ~1000× realtime (60 s in 74 ms); ANY
  thousands-of-FM-notes graph crawls below realtime; incremental graph build via
  `oc.suspend()/resume()` does NOT help — the crawl is intrinsic, not schedulability.
- Fix (src/audio/music.js): `buildLoop` refactored into shared `variantParams` +
  `makeBuses` + `scheduleBar`; the play path now runs a **live scheduler** (2.5 s
  lookahead > the 1 s background-tab timer clamp, 250 ms pump, absolute bar times so a
  late timer can only schedule late, never off-grid; 40-bar authored sequence wraps
  exactly as the rendered loop did, seam included). `stopLoop` disconnects the bus tree —
  one call silences everything. `buildLoop` is TEST-ONLY now (`__renderLoopForTest`).

## Verification

- `measure_after.mjs` (clean CPU): boot 0.77 s → title; title→launch 306 ms after press
  (includes the 300 ms key hold); launch→flight 3.63 s; `__musicDebug().playing` true at
  +0.31 s; `window.__musicTiming` **null** for the whole run = no offline render ever
  started in play. 50 s continuous run (`variant_switch_check.mjs`): scheduler stable
  launch→flight, no page errors, no renders.
- **Engine signal proof** (`bars_verify.mjs` → `__renderBarsForTest`, new test hook):
  4 bars per variant rendered offline through the SAME makeBuses/scheduleBar the live
  scheduler drives — all four variants: peak 0.91–0.94, RMS 0.144–0.149, **0 clipped**,
  render ~0.6 s wall. Matches R35's full-loop stats (peak 0.92–0.95, RMS 0.152–0.159),
  i.e. the refactor preserved the mix.
- **Audibility cannot be machine-verified here — instrument control failed** (CLAUDE.md
  rule: validate the instrument): `analyser_control.mjs` reads RMS **0 from a bare
  440 Hz oscillator in a RUNNING context**, headless AND headed — puppeteer launches
  Chrome-for-Testing with `--mute-audio`; its real-time contexts render nothing. So the
  live-path check is scheduler state + engine-level render, and the final ear check is
  the owner's. (The sting/SFX path, unchanged, is owner-verified audible from prior rounds.)
- Deterministic capture `seq-capture/` (`?fixed=1&demo=1&seed=3`, 10 frames @0.5 s,
  population-asserted): deck (f0) → climb-out (f3) → stage-1 combat with score/HIT live
  (f8). Launch sequence intact and untouched.

## Files touched (this lane's ownership only)

- `src/audio/music.js` — live scheduler (the fix); `__renderBarsForTest`; buildLoop demoted
  to test-only. The half-done copy from the cut session (`music.js.wip-broken` here) is
  superseded by this completed version.
- `src/audio/engine.js` — `window.__audioLevelProbe` (measurement-only analyser tap;
  retained: it's the instrument that EXPOSED the mute-audio limitation, documented above).
- `src/main.js` — `__startupProbe` boot-timing hook (committed by TL mid-round).
- No flow.js / launchSequence.js changes: cadence measured IN BAND vs the arcade.

## Honest residuals / asks (not start-time blockers)

1. **Stage-boundary music variant does not switch on a normal stage advance** — `_startTally`
   never re-calls `AudioBus.music('flight')`; variants only switch via respawn/continue/
   tanker call sites. Pre-existing R35 call-site behavior, observed in the 50 s run
   (variant 0 held through the 32 s boundary). One-line fix in flow.js if wanted; left
   untouched to keep this lane's diff scoped to the owner's bug.
2. **Start keys are Z/X only** — Enter/Space do nothing at the title. `core/input.js` is not
   this lane's file; a 2-line alias there would help first-time players. (Related: under
   heavy CPU starvation a short keypress can fall between sim ticks and be eaten — observed
   only under the now-fixed load.)
3. **Hygiene warning for future probe runs:** a timed-out puppeteer run leaves its browser
   ALIVE, possibly mid-200 s-render at ~100% CPU, contaminating every later measurement
   (two of my runs were poisoned this way; `pkill -f "cache/puppeteer"` after every batch).
   My runs also likely stuttered the owner's live session — same remedy.
4. `__renderLoopForTest` (full 40-bar offline render) still takes minutes by nature; use
   `__renderBarsForTest` for quick checks.

## Addendum (TL-approved): stage-advance music re-key SHIPPED

Residual #1 above is fixed: `_startTally` (flow.js) now calls
`AudioBus.music('flight', { stage: this.stageIndex })` right after
`_enterStage(stageIndex + 1)`, so the R35 per-stage variants actually switch on
a normal stage advance (previously only launch/respawn/continue/tanker re-keyed
— a clean run held variant 0 forever). Idempotent for an unchanged variant;
`_enterAirRefuel`'s own call becomes a same-variant no-op.

Deterministic verification (`variant_advance_fixed.mjs`,
`?fixed=1&seed=1&invincible=1`, `window.__step`): tick 20 → stage 1 / variant 0;
+2000 ticks (past the 32 s boundary) → stage 2 / **variant 1** / musicState
flight; +1950 ticks → stage 3 `airrefuel` / **variant 2**. (First attempt
without `?invincible=1` was a false read — the input-less pilot burned the whole
credit to deaths before 32 s of stageTimer accrued; harness note for the next
reader.) `__musicDebug` tracks state/variant even muted, so the check is valid
under `?fixed=1`.
