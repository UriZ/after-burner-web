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
- **Barrel roll**: AB2 II has a barrel roll (quick double lateral flick / roll input)
  granting brief evasion. ASSUMED mechanics — the prototype never implemented it; frame
  evidence of the move exists in longplay motion but was not extracted. Verify timing
  (duration ~0.5–1 s, with world roll wrap) against 60 fps footage before building.
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
- Renders as opaque tracer streaks (previous-position→current quad), not glow discs
  (ADOPTED #133). Aim assist: a round snaps its altitude/depth ramp to the nearest enemy
  near the sight line at spawn so convergence actually intersects targets (ADOPTED #100 —
  without it, shots pass under airborne enemies).
- Vulcan is effectively the anti-close-range weapon; generous hitbox. ASSUMED relative
  damage balance (prototype: 1 hit kills fighters, bombers take 2).

### Missiles
- Finite stock (ADOPTED: 50 at start, `game_state.gd`; restocked at refuel stages).
  HUD shows stock as rocket icons + tick marks (MEASURED layout, REFERENCE.md; the
  large-icon vs tick denomination is ASSUMED — verify before building the widget).
- Fire on button press, cooldown 0.4 s (ADOPTED). Missiles launch from wing pylons,
  run ~0.3 s straight (HOMING_DELAY), then home on the locked target; max life 5 s.
- **Lock-on**: AB2's HUD target box tracks the nearest threat CONTINUOUSLY, anywhere on
  screen (MEASURED behavior adopted at #49 — the box is not gated on crosshair hover).
  Weapon lock (what a missile homes on) additionally requires the crosshair near the
  enemy (prototype: 80 px radius, lock survives 0.5 s after leaving). A hysteresis
  margin (~0.85×) stops the box flickering between two similar-distance enemies
  (ADOPTED). Lock brackets draw as corner-brackets sized from the enemy's actual drawn
  sprite (loose 2× fit), blue `#008cd9`→`#3bbaff` (MEASURED t104); audio lock tone on
  acquire (ASSUMED detail: rising two-tone, verify against footage audio).
- Missile trail: continuous opaque white→grey ribbon with 2.7× value taper (MEASURED —
  REFERENCE.md); curves visibly as the missile turns into the target. Kill = large
  explosion + score.

## 4. Enemies

- Types ADOPTED from prototype (`enemy_jet_2d.gd`): fighter (speed 0.35 depth/s, 1 hp,
  100 pts), interceptor (0.55, 1 hp, 200), bomber (0.25, 2 hp, 500). The *type split and
  scores* are prototype inventions — ASSUMED vs the arcade (AB2's real roster is MiG-type
  jets with position-based bonus scoring; verify if scoring fidelity matters).
- Enemies approach from the horizon (depth 0 → toward camera), flying at altitude in the
  sky band, with lateral drift; they despawn past the camera. Scale grows with a
  saturating curve so the fly-past peaks at 25–30%W wingspan (MEASURED band, #105).
- Enemies bank INTO their drift, up to ~57° (MEASURED #131), and roll in/out on a slow
  oscillation (~0.55 rad/s phase; oscillation is multiplicative so a non-turning enemy
  flies flat) — ADOPTED.
- Firing: tracked shots aimed at the player's position at fire time, bullet speed ~0.6
  depth/s, descending from the firer's altitude to player level; enemies may only open
  fire once visibly close (depth ≥ 0.3) and fire every 1.5–2 s (ADOPTED; arcade timing
  ASSUMED). Enemy bullets are the real threat; ramming is nearly a non-mechanic (body
  collision only in a narrow near-despawn window — ADOPTED #103 reasoning).
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
- Refuel/runway bonus stages: 5 and 13 (verified biomes: runway + trees). Arcade behavior:
  land/fly low over a runway strip, missiles restock, no combat (partially ASSUMED —
  frames verify the runway exists; the restock amount is ASSUMED. Prototype awards +30
  missiles on its `is_bonus` stages 6/12/18 — note the prototype's bonus flags do NOT
  match the arcade's refuel stages; trust the frame-verified 5/13, not the flags).
- Stage length: prototype uses a flat 30 s timer (ADOPTED convenience); arcade spans vary
  12–49 s (MEASURED from the verified stage map — e.g. stage 5 is 12 s, stage 9 is 48 s).
  Prefer the measured per-stage durations.
- Bookends: carrier launch opens stage 1 (t84–92: deck roll, climb-out through clouds);
  carrier landing after stage 23 (t936–952 is ocean+carrier — landing cinematic ASSUMED
  in detail). Loop back to stage 1 after 23 (ADOPTED prototype behavior; arcade ends with
  a landing + ranking — ASSUMED).

## 6. Scoring / HUD

- Score accumulates per kill; HIT counter counts kills this life, resets on death
  (ADOPTED `game_state.gd`; matches the HUD's HIT field read across frames — score and
  HIT both visibly grow kill by kill, e.g. t97 score 7710/HIT 1 → t104 30810/HIT 10).
- HUD layout and colors: MEASURED — see REFERENCE.md's HUD table. Elements: SCORE
  emblem + digits, HIT emblem + digits (top); lock reticle square (upper right); bottom
  strip: SPEED + throttle bar with 0–3 scale, STAGE + number, missile stock icons.
  **No altitude bar exists.** HUD never rotates with the world roll.
- End-of-stage bonus / position-based scoring: ASSUMED (arcade awards per-stage bonuses;
  prototype has none).

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

## Verification priorities for this rebuild (the ASSUMED list, ranked)

1. Barrel roll mechanics and timing (core AB2 II feature, zero prototype coverage).
2. Throttle's effect on flow/closure (AB2 II's headline addition; HUD state MEASURED only).
3. Refuel stage behavior and missile restock amounts (stages 5/13).
4. Arcade wave choreography per stage (prototype pacing is invented around a density target).
5. Scoring table / bonuses (prototype values are placeholders).
6. Lock-on audio + reticle state machine details (colors measured; transitions assumed).
