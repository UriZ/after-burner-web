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
  (consistent with roll i-frames; not proof). CAVEATS: 360° rotation-direction continuity
  is not provable at 0.1 s sampling with cloud occlusion (a violent S-weave with steep
  banks both ways would look similar) — confirm with 1/60 s stepping before coding the
  animation curve; the input trigger (double-flick vs dedicated roll input) stays ASSUMED.
- **Throttle**: AB2 II has 3-state speed control (the HUD reads SPEED M at t140 —
  MEASURED label; H/L states ASSUMED from arcade manual knowledge). Throttle affects
  ground-flow rate and enemy closure. Magnitude: ASSUMED — needs 60 fps measurement.
  Prototype has no throttle.

## 2. Death / respawn

- Hit → jet tumbles (spins ~360°/s, falls toward lower clamp), big explosion at the jet,
  ~1 s, then respawn at centre-low position with ~2 s invincibility, flashing. ADOPTED
  (`player_jet_2d.gd`; flash must brighten, not alpha-fade — AB2 never renders the
  player translucent; prototype carries the flash as RGB gain ×2.2 at full opacity).
- Crash into terrain/canyon wall also kills (ASSUMED for walls — canyon stages exist and
  the arcade punishes wall hits; prototype collision is enemy/bullet only).
- Lives: 3 (ADOPTED `game_state.gd` DEFAULT_LIVES — standard arcade default; dip-switch
  configurable in the real board, so ASSUMED as the canonical value).
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
- Finite stock (ADOPTED: 50 at start, `game_state.gd`; restocked at refuel stages).
  HUD shows stock as rocket icons + tick marks (MEASURED layout, REFERENCE.md; the
  large-icon vs tick denomination is ASSUMED — verify before building the widget).
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
- **Lock-on**: AB2's HUD target box tracks the nearest threat CONTINUOUSLY, anywhere on
  screen (MEASURED behavior adopted at #49 — the box is not gated on crosshair hover).
  Weapon lock (what a missile homes on) additionally requires the crosshair near the
  enemy (prototype: 80 px radius, lock survives 0.5 s after leaving). A hysteresis
  margin (~0.85×) stops the box flickering between two similar-distance enemies
  (ADOPTED). Lock brackets draw as corner-brackets sized from the enemy's actual drawn
  sprite (loose 2× fit), blue `#008cd9`→`#3bbaff` (MEASURED t104; night stages show the
  same brackets in white, t186); audio lock tone on acquire (ASSUMED detail: rising
  two-tone, verify against footage audio).
- Missile trail: continuous opaque white→grey ribbon with 2.7× value taper near the
  missile (MEASURED — REFERENCE.md), aging into a chain of discrete round white puffs at
  the tail (MEASURED: puff chains at t226, t332, t120); curves visibly as the missile
  turns into the target. Kill = large explosion; score is NOT awarded at the kill (see
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
    motorbike rider pacing the jet (t251–253). Missile icons visibly refill GRADUALLY
    across the ~11 s pass (not a lump sum), the SPEED bar sits near zero, **score is
    frozen for the whole pass** (1799790 for 10 straight seconds — the passive accrual of
    §6 pauses), HIT stays 0, no enemies.
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
  - **HIT resets to 0 at every stage start** (t126, t204, t246) — NOT only on death as
    the prototype has it (`game_state.gd` needs correcting when ported).
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

Resolved by the Round-3 pass: barrel roll timing/displacement (one instance; see §1
caveats), wave choreography stages 1–7, scoring model + stage bonus, enemy/vulcan shot
appearance, resupply mechanics (tanker + runway), multi-lock salvo.

Still open:
1. Barrel roll input trigger + 360° continuity at 1/60 s + i-frame confirmation (§1).
2. Throttle's effect on flow/closure and on the score-accrual rate (AB2 II's headline
   addition; only the HUD letter state and the refuel accrual-pause are measured).
3. Missile stock widget denominations (large icon vs tick values) and exact starting
   stock; restock RATE on the runway (gradual — count icons per second from t246–256).
4. Enemy depth-speed retune to the measured 4–6 s approach; per-stage wave scripts
   beyond stage 7.
5. Lock-on audio + reticle state machine details (bracket colors measured; dot-color
   state transitions — yellow vs red — observed but not mapped to states).
6. Death/respawn look (no death occurs in the studied windows; prototype behavior stays
   ADOPTED untested).
7. Stage-13 runway sequence (assumed to mirror stage 5) and whether other stages open
   with the tanker reload (only stage 3's was observed).
