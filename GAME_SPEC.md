# After Burner II — Gameplay Systems Spec

Breakdown of the systems the three.js rebuild must implement, from (a) the proven-stage
reference frames in `reference/` (extraction provenance in REFERENCE.md), and (b) the
Godot prototype at `../afterburner`, whose scripts encode many sessions of
reference-matching. Every item is tagged:

- **MEASURED** — backed by a cited frame/footage measurement (see REFERENCE.md for values).
- **ADOPTED** — the Godot prototype's tuned/verified behavior; the file carrying the
  tuning rationale is cited. Adopt the *behavior*; re-derive constants only with a measurement.
- **ASSUMED** — believed correct (arcade knowledge / plausible fill-in); needs verification
  before anyone treats it as ground truth.

Round-3 verification pass: timestamps `tN` cite the longplay timeline (see REFERENCE.md).
The 60 fps cache file (`ab2-longplay-60fps.mp4`, 1028×720) was verified to be the SAME
recording as the 686×480 map-keyed file (identical scene and HUD values at t84 and t116,
durations 988.68 vs 988.70 s), so the stage↔timestamp map transfers to it directly; the
fine-step observations below were extracted from it with exact single-frame `-ss`.

## 1. Player movement

- Jet is screen-positioned (the world does the moving); it roams a clamped box.
  ADOPTED: prototype clamps to x [80,880], y [200,600] of 960×672 ≈ x 8–92%W, y 30–89%H
  (`player_jet_2d.gd` MOVE_MIN/MAX). The roam *distribution* is MEASURED (two-regime:
  cruise cx sd 12.88%W at cy 52.8%H; canyon sd 2.59%W at cy 63.5%H — REFERENCE.md).
- Velocity model ADOPTED: max speed 720 px/s (75%W/s), accel 2200 px/s², decel 1400 px/s²
  (`player_jet_2d.gd`). Feels-right values, not measured — treat as starting point.
- **Banking rolls the WORLD, not the jet** (MEASURED, #128): lateral stick rotates the
  entire world rigidly about screen centre, up to 65–68°, at ~75–80°/s (full roll ≈0.8 s);
  HUD stays axis-aligned. The drawn jet banks at ~0.8× the world roll so jet and horizon
  stay in step (ADOPTED, visually tuned — tune against t98/t112, do not derive from stills).
  The roll command source must be single-owner: live input, demo path, and death all feed
  one slew (prototype learned this the hard way — a second slew desyncs jet from horizon 6×).
- Pitch moves the jet up/down the frame; the horizon shifts opposite (t116 horizon 0.50H
  vs t175 0.646H during level segments — MEASURED). Exact coupling curve: ASSUMED
  (prototype doesn't model it; pick by capture comparison).
- **Barrel roll**: MEASURED (one instance, t221.4–222.9, stage 4, sampled at 0.1 s; key
  frame committed as `reference/stage4-barrel-roll-t222.png`): duration ≈ **1.2 s**; the
  JET SPRITE rotates through steep-left → inverted (belly palette visible) → steep-right
  → level while the **horizon stays dead level the whole time** — the maneuver SUPPRESSES
  the world roll that a normal hard bank produces, and that suppression plus extreme
  sprite angles is how a barrel roll is distinguished from a bank in footage. Large
  displacement during the roll: the jet sweeps ~60%W laterally and from ~20%H to ~75%H
  and back. The player crossed several enemy shot trains during it without dying
  (consistent with roll i-frames; not proof). **360° continuity CONFIRMED at frame
  stepping** (round 4: t221.8–222.33 requested at 1/60 s): the roll advances in ONE
  direction — right bank → level → left bank → inverted → edge-on (the sprite narrows to
  a line) → right-bank recovery — with no reversal: a true full rotation in ~1.0–1.2 s.
  (The 60 fps file carries duplicated frames in this span — effective unique rate
  ~30 fps; fine for pose work, remember it for speed work.) Remaining ASSUMED: the input
  trigger (double-flick vs dedicated roll input) and whether i-frames are granted.
- **Throttle**: AB2 II has 3-state speed control (the HUD reads SPEED M at t140 —
  MEASURED label; H/L states ASSUMED from arcade manual knowledge). Throttle affects
  ground-flow rate and enemy closure. Magnitude: ASSUMED — needs 60 fps measurement.
  Prototype has no throttle.

## 2. Death / respawn

MEASURED in round 4 across FOUR death instances in the gameplay video
(`ab2-gameplay.mp4`, 866 s, 30 fps, cached beside the longplay — a DIFFERENT recording
with its own timeline, cited below as `gp tN`; it has NO stage↔timestamp map, so no
per-stage claims from it). Cleanest full cycle: gp t198–218 (night stage); repeats at
gp t257, t271, t281. Key frames committed: `reference/death-starburst-gp-t202.png`,
`reference/respawn-ready-gp-t207.png`, `reference/continue-card-gp-t261.png`.

- **Death sequence**: hit → an orange burst ON the jet and a fireball grows around it,
  jet silhouette still visible inside (~0.5–1 s) → a SCREEN-FILLING multi-lobe yellow/
  orange starburst (~60%W, ~1 s) **with a WHITE-HOT core** — deep-red rim → orange →
  yellow → near-white, ≥40% of its pixels above V 0.95 and its brightest decile at
  saturation ≤0.30 (MEASURED R5 on `death-starburst-gp-t202.png` and
  `ab2-arcade-huge-explosion.jpg` — REFERENCE.md "Fireball targets"; the old t357-derived
  percentiles describe fading smoke and cannot see the core) → the burnt dark-red hulk of the F-14 tumbles AWAY from
  the camera, shrinking toward the horizon, while the screen is otherwise empty of the
  player (~3–4 s; the world keeps scrolling) → respawn. This REPLACES the prototype's
  tumble-to-bottom-clamp death (spin at 360°/s, fall 1 s): the arcade hulk falls INTO
  the scene, not down the screen.
- **Score freezes while dead** (pinned at 5740 for gp t203–206) and resumes with the
  respawn — same pause behavior as the refuel pass (§6).
- **HIT is NOT reset by death** — it held at 2 across the entire gp t198–209 cycle. HIT
  resets ONLY at the stage-end tally (§6). The prototype resets it on death
  (`game_state.gd lose_life()`) — correct that when porting.
- **Respawn**: the jet slides in from the BOTTOM of the frame at OVERSIZED scale
  (larger than normal flight — it enters from behind/below the camera), twin afterburner
  flames blazing, with a "READY" text card low-center (yellow, then cyan), shrinking to
  normal scale as control resumes (~2 s). Full hit→control-restored cycle ≈ 8–9 s.
- **No visible invincibility flash** after respawn in any of the four instances, and two
  deaths occurred ~10 s apart — if post-respawn invincibility exists it is short and
  unindicated. The prototype's 2 s flashing window stays ADOPTED as a usability choice,
  not arcade-verified.
- **Continue**: after the final life, "CONTINUE PLAY / <countdown from 10> / INSERT
  COIN" overlays the still-scrolling world (gp t261). Continuing resumes IN PLACE —
  same stage — with the score reset to ~0 (gp t265–269 climb from ~600 at the normal
  accrual rate). Lives count itself: still ASSUMED 3 (dip-switch configurable; not
  derivable from this footage — deaths before the continue were not all captured).
- Players fly through their OWN kill explosions harmlessly (t116.75 longplay: jet
  overlapping a fireball, no death) — friendly explosions must not damage.
- Crash into terrain/canyon wall also kills (ASSUMED for walls — canyon stages exist and
  the arcade punishes wall hits; prototype collision is enemy/bullet only).
- Invincibility must be pass-through for already-overlapping bodies when it expires
  (ADOPTED #103 — otherwise expiry scores an undodgeable hit).

## 3. Weapons

### Vulcan
- Hold-to-fire stream, ~12 rounds/s (ADOPTED: 0.08 s interval, `weapon_manager_2d.gd`);
  alternating left/right muzzle. Rounds fly along the sight line into depth (prototype:
  3.5 depth-units/s, converging laterally on the crosshair aim with slight spread 0.025).
- **Round appearance: small orange FIREBALL PUFFS, not thin white tracers** — MEASURED at
  t214 (`reference/stage4-vulcan-stream-t214.png`, player firing, astern view): the
  stream is a loose zig-zag column of round amber puffs ahead of the nose (alternating
  slightly left/right from the two muzzles), each ~3–4 native px, sampled `#ffdb21` /
  `#ffad15` / `#ff9f0c`. This CORRECTS both the prototype's white quad-streak rendering
  (ADOPTED #133 — keep the opaque-quad technique, recolor/reshape to the measured puffs)
  and ARCHITECTURE.md D7's "tracer look" wording. Night stages render the same puffs
  (t200). Aim assist: a round snaps its altitude/depth ramp to the nearest enemy near the
  sight line at spawn so convergence actually intersects targets (ADOPTED #100 — without
  it, shots pass under airborne enemies).
- Vulcan is effectively the anti-close-range weapon; generous hitbox. ASSUMED relative
  damage balance (prototype: 1 hit kills fighters, bombers take 2).

### Missiles
- **Stock widget decoded (round 4, MEASURED)**: the bottom-right display is a base-10
  odometer — **each large rocket icon = 10 missiles (tens digit), each small tick = 1
  (units digit)**. Ticks decrement one per launch; when units hit 0 the next launch
  converts a large icon into ticks (4L+0 → 3L+9, observed across the t98–105 strip,
  which also counts ~8 launches matching the salvo's 8 kills). **Starting stock = 5
  large = 50** (t84/t86: exactly 5 large, 0 ticks — the prototype's 50 is confirmed).
  **Resupply fills TO 70** (7 large) at ~10–20 missiles/s over ~4 s, at BOTH resupply
  points (tanker: 20→70 across t163–167; runway: 22→70 across t253–256).
- Fire on button press, cooldown 0.4 s (ADOPTED). Missiles launch from wing pylons,
  run ~0.3 s straight (HOMING_DELAY), then home on the locked target; max life 5 s.
- **Multi-lock + salvo is real and central** — MEASURED (t99.5–103.5 at 0.25 s,
  `reference/stage1-missile-salvo-t100.75.png`): a cluster of ~6 dashed corner-bracket
  lock boxes on-screen at once (t100), then **HIT 2 → 10 in 2.25 s** — eight kills from
  one salvo pass, so at least ~6–8 missiles can be in flight simultaneously. Launch →
  impact ≈ 0.5–1.5 s at the depths observed (explosions land 2–4 frames of 0.25 s after
  the launch flurry). A launch throws big white smoke billows that briefly occlude part
  of the screen; two simultaneous wing-pylon launch flares are visible at t177. This
  replaces the prototype's single-lock model as the fidelity target.
- **Lock-on display, three distinct elements (round-4 state map, MEASURED on the
  t84–118 reticle strip and the t115–118 engagement at 0.25 s)**:
  1. **The small dashed SIGHT square** leading the player's nose — the aim point,
     always present in flight, separate from any lock indicator.
  2. **The fixed reticle square** upper-right: corner-bracket square with an
     **ATTITUDE LINE through it that rotates with the world roll** (horizontal in level
     flight t84–94, steeply diagonal during banks t96–98 — it is an artificial-horizon
     indicator, not decoration), plus a **status dot**: ABSENT when no enemies are in
     play (t84–94, carrier/climb-out); present once enemies exist, holding YELLOW or
     RED for multi-second spans (not a fast blink — 8 consecutive 0.25 s samples of
     yellow at t115.75–117.5). In the engagement studied, yellow spans coincide with an
     active enemy bracket and kills, red spans with none — suggestive of
     yellow=locked/engaged vs red=tracking, but NOT conclusively mapped; do not hard-code
     this correlation without an audio-synced pass.
  3. **Per-enemy lock brackets**: ONE white dashed corner-bracket rides the nearest
     enemy and JUMPS to the next enemy the moment its target dies (t116→116.25: bracket
     → explosion under it, HIT +1, bracket already on the next); during a salvo,
     MULTIPLE brackets show simultaneously (t100: ~6). Blue `#008cd9`→`#3bbaff`
     variants at t104; white at night (t186).
  AB2's bracket tracks the nearest threat continuously, not gated on crosshair hover
  (behavior adopted at #49). Weapon lock for missile homing additionally requires the
  crosshair near the enemy (prototype: 80 px radius, 0.5 s grace — ADOPTED). A
  hysteresis margin (~0.85×) stops bracket flicker between similar-distance enemies
  (ADOPTED). **Audio cues cannot be measured from frames** — the lock-tone order
  (acquire → tone → fire) is a stated bound, not verified; needs an audio pass.
- Missile trail: continuous opaque **WHITE** ribbon — mean V ≥0.90 and mean saturation
  ≤0.10 in daylight, ≥0.85 at night; it is white on night stages too, only ~6% dimmer
  (MEASURED R5 over stages 1/3/4 — REFERENCE.md). The old "white→grey with 2.7× value
  taper" came from `ab2-arcade-night-missiles.jpg`, which contains no smoke trail at all;
  the 2.7× taper is now flagged UNVERIFIED and the 0.37 value it carried is withdrawn —
  implementing it is what made our daylight trail black. The trail ages into a chain of
  discrete round white puffs at the tail (MEASURED: puff chains at t226, t332, t120);
  curves visibly as the missile turns into the target. Kill = large explosion; score is NOT awarded at the kill (see
  §6 — kills pay through the stage-end HIT tally).

## 4. Enemies

- Types ADOPTED from prototype (`enemy_jet_2d.gd`): fighter (speed 0.35 depth/s, 1 hp),
  interceptor (0.55, 1 hp), bomber (0.25, 2 hp). The prototype's per-enemy SCORES
  (100/200/500) are now known to be wrong — kills pay through the HIT tally, not points
  (§6 MEASURED). The speed/hp split remains ADOPTED; note the measured 4–6 s approach
  (below) implies slower depth speeds than the prototype's 0.35–0.55 (≈1.7–2.6 s
  lifetimes) — retune against the tracked approaches.
- **Wave choreography** — MEASURED on stages 1/2/3/4/7 (1 s and 0.25 s sampled windows;
  sheets rebuildable from the cited timestamps):
  - **Stage openers are overtake flights**: 2–4 enemies at near-player depth flying
    AHEAD of the player, rear-aspect with glowing nozzles, receding toward the horizon
    while weaving — they can be locked and killed from behind (stage 1 t94–99, stage 2
    t126–128, stage 4 t204). The prototype has no such pattern; it matters because it is
    the first thing every stage shows.
  - **Main pattern: head-on echelons** of 3–6 from the horizon, loose echelon/V, growing
    over ≈ **4–6 s** from first-visible dot to fly-past at SPEED M (tracked examples:
    t113→117, t230→236), firing when near-mid depth, then passing the camera.
  - Occasional near-depth lateral crossers right over the player (t118–119).
  - **Bomber type** (stage 7, t318): much larger dark airframe at close depth that drops
    a round black bomb with an orange core AND fires shot trains.
  - Liveries observed: white/grey MiG-types (stage 1+), dark green/black camo (stage 2),
    red/orange-fuselage interceptors (t102.5, t172), silver/blue prop types (stage 2 open).
- Enemies fly at altitude in the sky band, with lateral drift; they despawn past the
  camera. Scale grows with a saturating curve so the fly-past peaks at 25–30%W wingspan
  (MEASURED band, #105).
- Enemies bank INTO their drift, up to ~57° (MEASURED #131), and roll in/out on a slow
  oscillation (~0.55 rad/s phase; oscillation is multiplicative so a non-turning enemy
  flies flat) — ADOPTED.
- Firing: tracked shots aimed at the player's position at fire time, bullet speed ~0.6
  depth/s, descending from the firer's altitude to player level; enemies may only open
  fire once visibly close (depth ≥ 0.3) and fire every 1.5–2 s (ADOPTED; arcade timing
  ASSUMED — but firing-when-near is CONSISTENT with footage: shots appear from enemies at
  mid depth, t113–114, t117, t318). **Shot appearance MEASURED**
  (`reference/stage7-enemy-shot-train-t330.png`, 2× crop sampled): spaced TRAINS of 4–8
  oval fireballs, each ~6–8 native px — pale-gold core `#ffd570`, orange body `#ff7733`,
  dark red rim `#941114`, salmon edge `#e96c63` — clearly larger and darker-rimmed than
  the player's vulcan puffs. Enemy bullets are the real threat; ramming is nearly a
  non-mechanic (body collision only in a narrow near-despawn window — ADOPTED #103
  reasoning).
- Waves: formations (V, line, scattered) of 2–7, spawn interval per stage tightening from
  1.5 s (stage 1) to 0.25 s (stage 23) (ADOPTED `stage_data.gd` spawn_interval /
  `game_manager_2d.gd` wave table — prototype invention shaped by a measured on-screen
  density target of 4–6 enemies visible; the arcade's actual wave *choreography* — e.g.
  scripted crossing patterns per stage — is ASSUMED/unreplicated. Watch burst frames in
  order for pattern work).
- Density pacing ADOPTED (`spawn_pacing.gd`): dispense one enemy at a time on a 0.2–0.5 s
  tick, hard cap ~7 alive, rather than dumping whole waves.

## 5. Stage structure & progression

- 23 stages. Stage changes swap sky/ground palette, horizon height, scroll speed, and
  spawn pacing — the full per-stage table with measurement provenance is
  `../afterburner/scripts/stage/stage_data.gd` (ADOPT it wholesale; it is the single
  best-verified artifact in the prototype).
- Regimes: cruise (21 stages, horizon ≈0.625H) vs canyon (8 and 17: horizon 0.13/0.07H,
  walls both sides, flow ≤0.63× cruise — canyons are SLOWER, MEASURED #127).
- **Resupply happens TWO ways, both MEASURED**:
  - **Mid-air tanker** (stage-3 open, t164–168, `reference/stage3-reload-tanker-t165.png`):
    a giant grey mothership/tanker hangs overhead (rear aspect, multiple glowing engine
    nacelles), the player tucks in beneath it, cyan "RELOAD WEAPONS" text blinks
    low-center, and the missile stock refills. No enemies during it.
  - **Runway flyover** (stage 5, t244–257, `reference/stage5-runway-restock-t252.png`):
    low pass over a tree-lined base runway — trucks, tents, ground crew, and the
    motorbike rider pacing the jet (t251–253). The stock sits UNCHANGED at 22 for the
    first ~7 s of the pass, then refills in a ~4 s burst to 70 near the end (t253–256,
    widget-strip measurement — round 4 correction of round 3's "gradual across ~11 s"
    misread). The SPEED bar sits near zero, **score is frozen for the whole pass**
    (1799790 for 10 straight seconds — the passive accrual of §6 pauses), HIT stays 0,
    no enemies.
  - The prototype's `is_bonus` flags (6/12/18, +30 missiles) match NEITHER mechanism —
    trust the frame-verified stage-3-open tanker and stage-5 runway (stage 13 is the
    verified second runway biome; its sequence is ASSUMED to mirror stage 5's).
- Stage length: prototype uses a flat 30 s timer (ADOPTED convenience); arcade spans vary
  12–49 s (MEASURED from the verified stage map — e.g. stage 5 is 12 s, stage 9 is 48 s).
  Prefer the measured per-stage durations.
- Bookends: carrier launch opens stage 1 (t84–92: deck roll, climb-out through clouds);
  carrier landing after stage 23 (t936–952 is ocean+carrier — landing cinematic ASSUMED
  in detail). Loop back to stage 1 after 23 (ADOPTED prototype behavior; arcade ends with
  a landing + ranking — ASSUMED).

## 6. Scoring / HUD

- **The scoring model is MEASURED and it is NOT per-kill score.** The Round-1 draft of
  this file (and the prototype) had it wrong:
  - **Score accrues PASSIVELY at ~3300/s at SPEED M** — verified at 0.25 s granularity
    (+770/+880 alternating per 0.25 s, t99.5–103.5) and across kill-free lulls
    (t107–112: +3300/s with HIT frozen at 11). Accrual PAUSES during the runway refuel
    (score pinned at 1799790 for 10 s, t247–256), so it is distance/speed-keyed, not
    wall-clock. Lower rate observed in the first launch second (+1110) — rate plausibly
    scales with throttle/speed (ASSUMED detail).
  - **Kills add NO immediate score** — seconds containing kills show exactly the same
    +3300 as kill-free seconds (t116→117: +3300 with HIT 11→12). A kill increments the
    HIT counter (display lags the explosion by ~0.25–0.5 s).
  - **Stage end pays HIT × 20,000** via an on-screen tally card — red "HIT COUNTS n" over
    cyan "POINTS m" counting up together (~7 hits/s), with the next stage's "STAGE n"
    label shown during it (`reference/stage2-start-bonus-tally-t124.png`: 8 hits →
    160000 mid-count; stage-4→5 tally reconfirms ×20,000 at t244–245). The tally amount
    lands in the score as it counts.
  - **HIT resets to 0 at every stage start** (t126, t204, t246) **and ONLY there** —
    round 4 confirmed it survives player death (held at 2 across a full death/respawn
    cycle, gp t198–209). The prototype has both halves wrong (`game_state.gd` resets on
    death, never on stage) — correct both when porting.
  - **Continue resets the score to ~0** but keeps stage progress (§2, gp t261–269).
- HUD layout and colors: MEASURED — see REFERENCE.md's HUD table. Elements: SCORE
  emblem + digits, HIT emblem + digits (top); lock reticle square (upper right); bottom
  strip: SPEED + throttle bar with 0–3 scale, STAGE + number, missile stock icons.
  **No altitude bar exists.** HUD never rotates with the world roll.
- Position-based or per-enemy score values: NOT OBSERVED in stages 1–7 — if they exist
  they are swamped by the flat accrual; treat per-enemy point tables as ASSUMED-wrong
  until late-stage footage says otherwise.

## 7. Title / attract flow

MEASURED sequence from the longplay (timestamps exact):
1. Attract gameplay with "SIGHT" overlay callout + live-action throttle-hand inset (t2).
2. BEST FIGHTERS high-score table over gameplay (t30).
3. Title build animation: sphere-matrix "II" + letters assemble (t60–t66), settling into
   the full title card (t74): AFTER BURNER, INSERT COIN!, CREDIT, ©SEGA 1987 (colors in
   REFERENCE.md). Cycle repeats until coin/start.
4. Game start → carrier pre-launch (t84, SCORE 0) → launch roll (t89) → climb-out (t92)
   → stage-1 flight (~t94–97 on).
Demo/attract gameplay should fly a two-regime path (cruise weave + straight canyon-style
segments), not a constant-amplitude weave (ADOPTED #122 — constant weaving reproduces
neither measured regime; prototype's path constants are in `player_jet_2d.gd`).

## 8. Rendering/feel constraints that are gameplay-relevant

- Sense of speed comes from ground flow: constant world velocity through a quadratic
  depth→screen mapping (near rushes, far crawls). Cruise apparent flow must clear the
  measured arcade floor (≥95.7 %W/s — MEASURED bound #139; "no longer demonstrably too
  slow" is the achievable standard, true parity is unmeasurable from footage).
- Scroll speed must be per-regime: one global speed cannot serve cruise and canyon
  (the horizon span differs ~2.5×, and the arcade runs canyons slower — #139).
- Explosions, enemies, and the player must occupy the frame generously (prototype gates:
  ≥90% frame occupancy of the player during death anim; 4–6 enemies visible in combat).
- Speed judgements require 60 fps capture; never tune speed from <60 fps samples (#113).

## Verification priorities (remaining unknowns, ranked)

Resolved by rounds 3–4: wave choreography stages 1–7; scoring model + stage bonus +
continue behavior; enemy/vulcan shot appearance; resupply mechanics and amounts (50
start, refill to 70, both mechanisms); multi-lock salvo; stock-widget denominations
(10/1 odometer); barrel roll timing, displacement, and 360° continuity; death/respawn
sequence (4 instances); lock-display structure (sight + reticle/attitude-line/dot +
per-enemy brackets).

Still open:
1. Barrel roll input trigger and whether it grants i-frames (§1).
2. Throttle's effect on flow/closure and on the score-accrual rate (AB2 II's headline
   addition; only the HUD letter state and the refuel accrual-pause are measured).
3. Reticle dot-color semantics (yellow vs red — correlation observed §3, not mapped);
   lock/launch audio cue order (needs an audio-synced pass, frames cannot carry it).
4. Enemy depth-speed retune to the measured 4–6 s approach; per-stage wave scripts
   beyond stage 7.
5. Lives count (ASSUMED 3; dip-switch) and any post-respawn invincibility window (none
   visible — §2).
6. Stage-13 runway sequence (assumed to mirror stage 5) and whether other stages open
   with the tanker reload (only stage 3's was observed).
