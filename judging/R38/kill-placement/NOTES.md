# R38 kill-placement lane — measurement, diagnosis, change, verification

Gap (playtest ranks 1+3, one mechanism): "almost every gun kill explodes directly on my
own nose … a kill looks exactly like my own death, and my jet spends whole seconds buried
inside someone else's fireball." Files owned: `src/weapons/vulcan.js`,
`src/effects/explosions.js`, `src/weapons/combat.js`.

## 1. Ours, measured — where kills resolve relative to the player

Instrument: `kill_place_probe.mjs` (this dir) — same two pilots as R37's
kill_depth_probe2 (aimed = proportional steer onto nearest enemy, fire+missile held;
handsoff = centered stick, fire+missile held), plus a new per-kill statistic: screen
distance from the kill to the PLAYER's jet centre, in isotropic frame-width fractions.
Player reconstructed from the killLog's own sightX/sightY (sight = player + 0.30 NDC
screen-up; exact at zero roll — the hands-off arm; approximate under the aimed arm's
bank). "On nose" = kill centre within 0.12 fracW of the jet centre (the jet spans
35.6 %W, half-span 0.178 — 0.12 is inside the drawn airframe's own footprint).

Baseline (seeds 7/42 × 120 s, `killplace-baseline.json`):

| arm | gun kills | on-nose share | distP50 | distP90 |
|---|---|---|---|---|
| s7 aimed | 64 | **0.73** | 0.104 | 0.170 |
| s7 handsoff | 26 | **0.65** | 0.066 | 0.148 |
| s42 aimed | 53 | **0.85** | 0.099 | 0.158 |
| s42 handsoff | 25 | **0.84** | 0.074 | 0.124 |

Crosser/overtake gun kills are 89–100 % on-nose at p50 0.057–0.096 in every arm.
**Even perfectly AIMED kills are "on the nose"** — structurally: the sight leads the
jet by only SIGHT_FRAC = 0.105 fracW, so a kill AT the sight is 0.105 from the jet
centre, and the kill fireball is drawn at PEAK_FRAC = 0.30 fracW diameter **at any
depth** (`worldWidthFor(PEAK_FRAC…, depth)` divides the depth back out — the fireball
is screen-sized, not world-sized). A mid-depth kill on a 5 %W enemy therefore throws
the same 30 %W fireball as a point-blank one, centred ~0.10 above the jet → every kill
reads as an explosion ON the jet, and the flank-smoke pair (~36 %W tip-to-tip, screen-
sized, 0.42 s) plus the parked residue (3 puffs to 14.5 %W each, 0.74–1.06 s, parked at
the kill point) keep fire/smoke on the airframe for over a second per kill; kills
cluster, so "whole seconds" is arithmetic, not an impression.

So the diagnosis is NOT (mainly) where the kill RESOLVES — it is that the explosion is
(a) the same huge screen size at every depth, and (b) parked at a fixed world point for
its whole life.

## 2. Arcade, measured — near kills and dead smoke (60 Hz consecutive)

Operator: `ffmpeg -ss 94 -t 11 -i ab2-longplay-60fps.mp4 -vsync 0` (stage-1 span from
STAGE_MAP; same decode family as the R36 §1 census; f0001 = t=94.000, fN = 94+(N−1)/60).
All claims below are from cropped contact sheets read by eye (sheets archived here:
`arc-near-kill-f0205-f0232.png`, `arc-mid-kill-f0333-f0360.png`,
`arc-occl-f0539-f0590.png`, `arc-occl-f0587-f0614.png`), plus a fire-presence scan of
the player's own screen box (S>0.55, V>0.90, warm — STAGE_MAP's explosion operator —
over x 360–670, y 350–650 of 1028×720, all 660 frames).

1. **The near kill erupts BESIDE the jet and never covers it.** f0209–f0232: eruption
   at the player's wing, the jet's full silhouette legible in every frame; the ball
   slides down-and-out while growing and is off the bottom edge within ~0.3–0.4 s.
   No parked smoke is left at the jet afterwards.
2. **Eruption size is the victim's size, not a constant.** The mid-depth kill at
   f0348–f0360 blooms a fireball ≈1–1.5× the victim's own span, ON the victim.
   Corroboration across the repo's own measurements: t357 fireball ~23 %W (a close
   ~20–23 %W victim → mult ~1.3), t100.75 stage-1 kill fireball 10.1 %W (a mid victim
   ~7–8 %W → mult ~1.3). One victim-anchored rule (fireball ≈ 1.3× victim span,
   ballooning 1/d afterwards) reconciles every measured arcade fireball size in
   REFERENCE at once.
3. **The in-your-face mass is dead smoke in MOTION, and it exits fast.** f0539–f0587:
   a huge ball overlaps the player's screen box for 50 frames (0.83 s — the longest
   fire-in-player-box run in the whole 11 s; second longest 0.4 s) — but it is
   (a) DRAWN BEHIND THE JET while it has not yet passed the player's plane (the white
   silhouette is crisp on top of the ball, f0539–f0551), and (b) ballooning past the
   camera: screen-filling for ~0.1–0.2 s at the end, then GONE within one frame
   (f0587 full fire → f0590 clean sky). The jet is never invisible for more than
   ~0.2 s, ever.
4. **Timing fits a LINEAR closure.** Near kill (our depth ~3) wing→off-bottom in
   ~0.35 s and mid kill (~15) to past-camera in ~2 s both solve to a constant
   ~7 depth-units/s in our units — dead things stop flying and the player's forward
   speed carries them past. Exponential at the victim's own depthRate fits neither.

**Withdrawal of one candidate mechanism, with evidence:** "resolve crosser gun kills
EARLIER in the transit" is NOT what the arcade does — f0209 and f0608 are kills
erupting exactly at the player's wing. The arcade gets away with wing kills because of
(1)–(3) above, not because kills happen elsewhere. The geometric kill point stays;
the rendering of the kill is what diverges.

## 3. Change (src/effects/explosions.js + one call-site arg in src/weapons/combat.js;
## src/weapons/vulcan.js deliberately UNTOUCHED)

- `ExplosionField.spawn` gains an optional `victim` ({spanFrac, ndcX, ndcY}) from
  combat.js `_damage`. Death sequence / harness callers pass nothing → exact legacy
  behaviour (the death starburst stays parked ON the jet — which is now the
  kill-vs-own-death discriminator, for free).
- Victim path: fireball world size fixed at spawn so its ERUPTION spans
  clamp(1.3 × victim span, 0.06, PEAK_FRAC) — PEAK_FRAC 0.30 is untouched and is
  exactly what the rule yields for the archetypal near kill (23 %W victim), per §2.2.
  (Bomber note: the `scale` 1.4 is no longer applied on the victim path — the
  bomber's 1.35× span carries its bigger boom through the same rule.)
- The whole event BALLOONS: depth advances linearly at 7 u/s from the kill depth,
  ndc scales by d0/d (fixed world lateral point — exact under screenSpace's
  perspective ray), the projection does the 1/d growth (all world sizes derived
  from the KILL depth, never the advancing one); at depth ≤ 1.3 the event retires
  instantly — fire, chunks, no residue — the arcade's gone-in-one-frame read.
- NEAR kills additionally FALL (4 u/s world sink, full at kill depth ≤ 6, faded to
  none by 10): pure radial slide is imperceptible near the vanishing point (first
  cut measured ~2 %W of slide over the fire's life), while the arcade ball drops
  wing→off-bottom in ~0.35 s. Applied uniformly it dragged sight-high mid-kill
  residue down INTO the jet column (ndcY +0.23 → +0.05, cap-after2-s7-mid) — hence
  near-only. Iterated by capture, both archived (cap-after-*, cap-after2-*).
- Flank smoke / hot cores / residue scale by the victim ratio (floor 0.4) and are
  skipped entirely for near kills — by depth (flanks ≤ 6, residue when the balloon
  reached ≤ 4) AND by NEAR-bin span (≥ 12 %W victim, the R36 census operator): the
  arcade near kill leaves no parked mass (§2.1). A d=6.13/15.6 %W crosser kill slid
  through the depth-only gate on the first cut and parked ~1 s of smoke on the jet.
- PRNG: draw count and order through spawn() unchanged (rotation + n + 2/chunk);
  the skipped dressing never drew. PROVEN sim-identical, not argued: the
  before-arm captures (HEAD explosions.js/combat.js restored on an otherwise
  unchanged tree) found the SAME kill ticks (4151, 3521) as the after-arm.
- Candidate mechanism "resolve crosser kills earlier in the transit" WITHDRAWN on
  arcade evidence (§2, f0209/f0608: the arcade also kills at the player's wing) —
  vulcan.js geometry untouched, so R26 "point at it and it dies" and the R37 skill
  package cannot regress from this lane.

## 4. Verification

**Before/after, same seed-7 ticks, 60 Hz** (evidence-ba-crosser / evidence-ba-mid
…-before-top-after-bottom.png; raw capture dirs cap-before-*/cap-after3-*):
- Crosser nose kill (tick 4151, d 6.13, span 15.6 %W): BEFORE — 30 %W fireball on
  the airframe, then flank+residue orange mass parked ON the jet to the window's
  end. AFTER — victim-sized eruption at the wing with the jet drawn on top
  (depth-tested), breakup falls away below-right by +0.18 s, sky clean by +0.32 s,
  no parked smoke. Fire-in-jet-box census (warm∧S>0.45∧V>0.55 over the jet's own
  35.6 %W box, 91 frames): BEFORE 76/91 frames above 10 % coverage, peak 84 %;
  AFTER 2/91, peak 16 % — and those 2 are the wing eruption the arcade also shows.
  The jet is never invisible; the longest arcade overlap measured was ~0.2 s and
  ours is now shorter.
- Mid kill (tick 3521, d 16.1, span 4.4 %W): BEFORE — same 30 %W fireball + smoke
  wreathing the jet's nose for ~1 s per kill. AFTER — a compact ~6 %W burst up at
  the sight, clearly separate; ratio-scaled residue parks AT the kill point above
  the jet; jet untouched (0/106 frames above 10 % in the jet box, both arms — the
  before-arm's overlap sat above the census box; the strips show it).

**Kill rates / R37 protection band** (kill_place_probe = kill_depth operator +
distance, seeds 7/42 × 120 s, killplace-final.json): hands-off/aimed kills/min
0.14× (s7: 5.5 vs 40) and 0.26× (s42: 8.5 vs 32.5) — inside the ≤ ~0.4× band.
Honest attribution: these differ from my own baseline (0.33×) because
**spawner.js/enemy.js were edited by a sibling lane between runs** (git status
showed their edits mid-round); my change is render-only and provably cannot move a
kill or death (identical kill ticks, identical PRNG). The deltas belong to that
lane's measurement, not this one.

**Fairness** (tools/fairness_probe.mjs, seeds 4/5/6 × 180 s, ?demo=1,
fairness-final.json): deaths/min 1.333 / 1.667 / 1.333, pooled **1.444** — inside
the R37 gate band 1.33 ± 10 % (1.197–1.463); **0 unannounced fatal hits in 13**.
Same shared-tree caveat as above; a render-only change cannot move this number.

**Legacy paths**: ?combatexpl harness still draws the fireball (22 428 warm px on a
live frame); death sequence spawns are victim-less → parked starburst preserved,
verified by code path (no explosion call-site other than _damage passes a victim).

## 5. Residuals / requests

- **Mid-kill dead smoke does not balloon for ~2 s as the arcade's does** — our
  residue is SmokeField puffs, which are parked by design (fixed depth/position,
  smoke.js). The event now reads correctly (small, separate, above the jet) but
  lacks the arcade's long ballooning tan mass (§2, arc-mid-kill sheet). Fix needs a
  velocity/trajectory option on SmokeField.spawn — **cross-file request: effects/
  smoke.js owner** (or TL approval for this lane to extend it next round).
- A theoretical timing channel was checked and is clean: kill events can now
  retire earlier, so explosions.busy() can fall sooner; deathSequence phases read
  busy(). Matched kill ticks across before/after captures show no divergence in
  practice (death spawns are legacy and dominate busy() during death).
- Far-kill residue (specks) is now ratio-floored at 0.4× rather than full size —
  strictly closer to the arcade; not separately measured this round.
