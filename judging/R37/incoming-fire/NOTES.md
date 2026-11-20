# R37 incoming-fire lane — notes

Owner ask (live play, first human ear-check): "improve the sound of incoming fire, and the
look of incoming fire." Owned files: `src/weapons/enemyShots.js`, `projectileSprites.js`,
`telegraph.js`, `src/entities/groundBattery.js`, `src/audio/sfx.js`. Constraints: fire
VOLUME is CLOSED (R30 sparse-fire), R36 death-legibility gains must survive, synthesized
audio only.

## 1. LOOK — what the arcade round actually is (measured first)

Instrument: 60 Hz consecutive decode (`ffmpeg -ss T -t D -i ab2-longplay-60fps.mp4 -vsync 0`)
of the stage-7 t330 train — the SAME burst the round-width census (enemyShots.js) and the
shot palette (REFERENCE.md) were measured on — plus stage-4 bursts at t212/218/225 (fire
there is sparse/explosion-dominated; the t330 train is the clean subject). Evidence in this
directory:

- `arc/t330/` 108 frames at 60 Hz; `t330-train-strip-f38-53.png` (16 consecutive frames of
  the train region, 4x); `t330-tracked-round-8x.png` (one round tracked over 3 consecutive
  frames, 8x); 16-bucket colour census over all train fire pixels (script inline in
  session; mode table below).

**Findings, each against our shipped sprite:**

1. **The arcade round is LAYERED, not concentric.** A dark-red CAP over the top ~third, a
   bright PALE-PEACH body under it with cream/near-white horizontal streaks through the
   middle, all inside a thin near-black outline. Ours (R29) was five concentric ellipses —
   a dark-ringed orange ball with a gold dot. Wrong structure, too saturated an interior.
2. **It BOILS.** Tracked round, 3 consecutive frames at 60 Hz: red-cap pixel count
   129→192→169, pale count 101→71→105 (~40% coverage swing frame-to-frame), and the cap
   alternately merges with and lifts off the body (visible across the 16-frame strip).
   Ours was a static sprite.
3. **NO TRAIL.** The sky behind every tracked round is clean at 60 Hz. The brief's "short
   ember trail" candidate is therefore NOT arcade-faithful — not added.
4. **Size ramp: already closed.** Near-end tracked width 34–38 video px = 10.6–11.8 native
   (matches the census max 10.58 within compression blur); the R36 endpoints (air
   5.8→9.9 px, battery 7→9.9 px progress-ramped) stay inside the measured envelope.
   No size change shipped.
5. **Palette census** (16-bucket modes over the train, snapped to SEGA_LADDER):
   pale body #f8b888-family → **#f7b584** (new); outline #080808–#380808 → **#3a1010**
   (new); cap #880808/#981818-family ≈ the already-measured rim **#941010** (kept); cream
   streak #f8d898 ≈ the already-measured core **#ffd673** (kept — same source, earlier
   pass, not churned); mid-orange #f89868-family ≈ the measured body **#ff7331** (kept, now
   the shadow band). The old salmon edge #e66b63 does not exist on the real round (video
   blur) — dropped.

**Change (projectileSprites.js + enemyShots.js):** the round is redrawn as two explicit
16x12 pixel-grid variants (A: cap merged/red-dominant; B: cap lifted/pale-dominant — no
canvas ellipses, no antialiasing), and each live shot flickers A↔B at 30 Hz with a
per-shot phase (spawn-order parity — deterministic, no PRNG draw). Map-swap only, the
telegraph.js palette-swap idiom; sizes, ballistics, hit test untouched.

## 2. SOUND — the whistle now TRACKS the approach

The R34 cue was a 0.16 s blip at the muzzle; the round then flew its whole 0.8–5 s
approach silently. Every enemy round flies a fixed straight line at fixed speed, so its
entire future is known at spawn — `enemyShots.spawn` now passes the audio layer `crossS`
(time to the player's plane, from the shot's own depth/speed; plane depth ~5, the same
figure every combat derivation quotes — an error of ±0.5 depth shifts the cut ≤60 ms) and
a per-shot id, and `sfx.js` schedules the full arc up front:

- **Air round:** soft launch tick at t0 (quieter than the R34 blip), then a two-osc
  detuned descending whistle (1650→620 Hz) + air-rip noise band that becomes audible only
  in the LAST 1.5 s before crossing and swells exponentially to the crossing (pitch tied
  to remaining flight, loudness to proximity), hard cut at the crossing +60 ms.
- **Battery round (the R36 killer):** a DEEPER, distinct voice — launch thump (150→58 Hz
  sine + chuff), then a gritty falling-shell sawtooth roar (540→140 Hz through the
  soft-clipper) + lowpassed noise, screaming its whole 0.8 s flight, same hard cut.
- **Early cut:** `_retire` (hit / pass / respawn `clearShots`) sends `enemyFireCut{id}` —
  the voice is silenced in ~15 ms, so a dead life's rounds never scream into the new one.
- **Stacking:** per-voice peaks ≤0.2; air voices capped at 6 concurrent (battery bypasses
  the cap — the likeliest killer is never the voice silenced); master limiter (engine.js)
  unchanged.
- The combat.js inbound-warning warble (`setInboundWarning`) is untouched.

## 3. Verification so far (updated incrementally)

- **fx_palette_probe (hard gate): PASS** after the redraw — 0 partial-alpha texels,
  0 off-palette opaque colours, 0 channel values off the hardware ladder (23 total frame
  union). Both boil frames are audited (`tools/fx-probe.mjs` now lists enemyShot[A] and
  enemyShot[B] — small tool edit, this lane).
- **Muted-path boot: PASS** — `node tools/combat_probe.mjs --ticks 150`, zero page errors,
  telemetry streaming (run after ALL source edits).
- Before-state captures: `cap-before/` (58 frames at 60 Hz around a located battery fire,
  seed 4, deterministic `?fixed=1&demo=1&invincible=1`), `before-round-zoom.png`.
- **Offline audio render: PASS** (`render_check.mjs` — OfflineAudioContext through a
  mirror of engine.js's master chain, running the SAME incomingVoiceGraph code via
  `sfx.__renderIncomingForTest`; checks are hard-gated, exit 1 on any failure):
  - battery voice: peak 0.226, 0 clipped; pitch READ descending 326.7→160.4 Hz across the
    approach; proximity swell RMS 0.0011→0.0702; post-cut RMS 0.00000 (hard cut verified).
  - air voice: peak 0.130, 0 clipped; 1260→668 Hz; swell 0.0004→0.0403; clean cut.
  - 8-round train: peak 0.183, 0 clipped. Train + battery stack (worst case the voice cap
    allows): peak 0.298, 0 clipped — wide headroom under the limiter.
- **Look before/after at 60 Hz: PASS** — `round_capture.mjs` (adapted from R36's
  ab_capture) captured the SAME deterministic battery round (seed 4, fireTick 660 in both
  arms — the timetable did not move) on the pre-change tree (`cap-before/`) and the
  shipped tree (`cap-after/`), 58 frames each. Crops: `look-compare.png` (arcade f0041 vs
  ours before vs ours after frames A and B), `after-round-track.png` /
  `before-round-track.png` (5-tick tracks). The after-round is the arcade's layered
  red-cap/pale-body oval, and frames t688 vs t698 show the two boil variants alternating
  in-game. It is the only red-capped hot oval on screen during the approach — higher
  contrast against sky, sea and the player's gold vulcan puffs than the old all-orange
  ball (which shared its colour family with the vulcan stream). Note on the track
  widths: the after-arm blob reads ~2 px narrower ONLY because the locator mask counts
  hot pixels (r>200) and the new cap #941010 / outline #3a1010 fail that test; the drawn
  size endpoints (fracFar/fracNear) are untouched in code, so the R36 size-aware
  announced guarantee is unchanged by construction.
- **Fairness probe (seeds 4/5/6 × 180 s): PASS — R36 gains survive.** Baseline =
  `judging/R36/death-legibility/probe-final8v2.json`; after = `probe-after-s{4,5,6}.json`
  (run per-seed; the 3-seed single process died twice to environment flakiness,
  "Target closed" at goto — post-sleep Chrome, not a page error; per-seed runs clean).

  | | deaths/min (agg) | min warning | unannounced fatal |
  |---|---|---|---|
  | R36 baseline | 1.667 (n=15/540 s) | 1.167 s | 0 |
  | R37 shipped tree | 1.333 (n=12/540 s) | 1.167 s | 0 |

  Deaths 12 vs 15 is within one Poisson sd (sd≈3.9 on 15). Per seed: **seed 6
  byte-identical** to baseline (deathTimes [14.5, 29.6, 107.4, 141.6] both arms); seed 5
  same count, times shifted ≤5 s; seed 4 first three deaths match within 1.4 s
  (29.4/57.6/94.9 vs 30.8/57.7/95.1) with three late deaths gone. **Attribution: the
  shifts are NOT this lane's.** This lane's diff is PRNG-clean and writes no gameplay
  state (audited — the only Math.random added is inside the offline render test hook;
  audioId/age/flickerPhase are read by flicker/audio only), and seed 6's byte-identity
  confirms the perturbation is conditional, not systemic. The shared working tree
  carries the missile lane's in-flight `missiles.js` intercept-lead change
  (INTERCEPT_T depth-dependent), which changes which enemies demo missiles kill late in
  a run — exactly the cross-seed-varying, late-run pattern observed. The numbers above
  are therefore the CURRENT TREE's state (which is what the gate asks): in band, warning
  floor intact, zero unannounced fatal hits on every seed.

## Cross-file notes

- `tools/fx-probe.mjs` edited by this lane (adds the second boil frame to the palette
  audit). Measurement-only.
- `BATTERY_SHOT_PROFILE` (groundBattery.js, this lane) gained `battery: true` — audio
  routing only, read by enemyShots.spawn; no ballistics field reads it.
- telegraph.js: read, unchanged this round (the R29 flare + the measured 0.4 s battery
  telegraph stand).
