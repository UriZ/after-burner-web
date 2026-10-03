# R4 — Game-feel critique

**Scope:** this build judged as a *game*, not as a set of pixels. Responsiveness, speed,
combat satisfaction, fairness, pacing, audio, missing verbs. Pixel fidelity is the art
critic's and `report.md`'s job and is not re-litigated here.

**Method:** three triangulated sources, kept separate throughout.
1. **Code read as a designer** — every tunable in `src/core/input.js`, `src/entities/player.js`,
   `src/game/game.js`, `src/game/flow/**`, `src/weapons/**`, `src/game/spawner.js`,
   `src/entities/enemy.js`, `src/audio/**`.
2. **Frames read in order** — five capture sets in `tools/out/feel-critic/`, plus a
   per-tick telemetry probe (`tools/out/feel-critic/feel_probe.mjs`) that samples
   `window.__flowState()` and `window.__combatStats()` every 0.1 s across a 120-second
   attract run (`?demo=1&seed=3`).
3. **Arcade anchors** — `GAME_SPEC.md`, `reference/`, the sibling repo's measured arcade
   data, MAME's `segaxbd.cpp` DIP/input tables, and published retrospectives. Cited inline.

**Caveat:** I could not hold the controls, and every capture is silent by construction
(`src/audio/engine.js`: `MUTED = params.has('fixed')`). Section 9 states explicitly which
conclusions are observed and which are inferred. Visual-polish files were being edited by
other agents while I captured; nothing in this critique depends on those edits.

---

## 1. Verdict

**No. A player would not enjoy 60 seconds of this, because across 60 seconds they are only
holding the controls for about 28 of them.**

Over a measured 120-second run (`?demo=1&seed=3`, 1200 samples at 0.1 s):

| state | wall-clock | share |
|---|---|---|
| `flight` (player has input) | 56.3 s | **46.9 %** |
| `death` (8.5 s scripted animation, no input) | 51.4 s | **42.8 %** |
| `continue` (10 s countdown, no input, **unskippable**) | 12.3 s | **10.2 %** |

**53.1 % of the clock has zero player agency.** Six deaths in 120 s = 3.0 deaths/minute.
The six lives lasted **5.1, 16.5, 15.1, 14.4, 6.5 and 9.1 seconds**. A three-life credit is
about 36 seconds of flying stretched across 62 seconds of wall time, and then a countdown
you cannot press a button to skip.

The run scored 65,780 points. Almost all of it was the passive 3,300/s clock
(`src/game/score.js`). The player landed **6 kills in 120 seconds — 0.05 kills/second.**
Measured arcade stage 1 runs at **0.54 kills/second**, and its only enemy-free window in a
whole stage is the ~6-second carrier catapult launch. We are shooting down **one tenth** as
many aircraft as the arcade while dying three times a minute.

`feel-01-one-minute-of-play.png` is the whole indictment in one picture: 72 tiles spanning
one minute, 25 of which contain no player aircraft, no enemy and no score movement.

---

## 2. The single biggest feel problem

> **The game takes the controller away from you more often than it gives it to you, and the
> deaths that cause it are not something you did.**

Two legs, both load-bearing.

### Leg A — each death costs 8.5 s, and 4.5 s of that is a literally empty screen

`src/game/flow/deathSequence.js`:
```
FIREBALL_S 0.6  +  STARBURST_S 1.0  +  TUMBLE_S 4.5  +  RESPAWN_S 2.4  =  8.5 s
```
`src/game/flow/flow.js:_triggerDeath()` calls `this.combat.clear()`, which wipes every
enemy, every projectile, every bracket. `src/game/score.js` freezes. `AudioBus.stopEngine()`
cuts the engine bed. So for 8.5 seconds the player gets: a blue rectangle, a sea, and a
~5-pixel red dot receding toward the horizon.

`feel-02-death-cycle.png` captures this at 0.25 s resolution. From t=5.5 s to t=9.8 s —
**eighteen consecutive tiles** — there is nothing in frame but sky, sea and one cloud, with
the score frozen at 013310 in every single one. Then 2.4 s of a scripted respawn the player
also cannot influence. Then `spawner.clear()` has reset `openerDone`, so the sky rebuilds
from empty and it is another 2–3 s before anything is at readable size.

The 8–9 s cycle is arcade-measured (`GAME_SPEC.md` §2) and I am not arguing it is wrong in
isolation. The arcade can afford it because it happens an order of magnitude less often, and
because clearing the sky is *our* addition — `GAME_SPEC.md` says "the world keeps scrolling",
not "the world empties".

### Leg B — the deaths are a dice roll the player cannot read or dodge

`src/entities/enemy.js`:
```js
const TRAIN_BIAS_MIN_NDC = 0.22;
const TRAIN_BIAS_MAX_NDC = 0.85;
```
Every shot train's centre is displaced from the player by a **random 0.22–0.85 NDC
(11 %W–42.5 %W) in a random direction.** The header comment is candid about why: aimed fire
was "a guaranteed kill whenever the jet has not moved further than the kill radius",
so the fix was to aim the trains *away* from the player.

That inverts the fairness contract. Enemy fire is no longer something you dodge — it is a
rake that sweeps a random part of the screen, and you die when you happen to be standing in
it. There is no tell, no lead you can read, and nothing you can learn. Measured: for **67 %
of flight frames there is not a single enemy shot on screen at all** (max 5), and yet the
player dies 3×/minute. The experience is long quiet stretches punctuated by an arbitrary,
unearned explosion.

Retrospectives are unanimous that AB2 was brutal — HG101 calls it "incredibly difficult…
without crashing and burning every few seconds" — but also that it was *learnable*: the
cached longplay is a 23-stage, 864-second, **zero-death** clear. The arcade's difficulty was
memorisable. Ours is not, because the thing that kills you is `rng()`.

---

## 3. Responsiveness and control feel

**Observed + code.**

`src/core/input.js` returns `x, y ∈ {-1, 0, +1}`. There is no analog axis, no deadzone, no
ramp — and **no throttle input of any kind**. Two fire buttons (`Z`, `X`) and four direction
keys is the entire verb set.

| what moves | how it moves | time to full |
|---|---|---|
| jet screen position | exponential, `FOLLOW_RATE = 6.0 /s` (`player.js`) | 50 % @ 116 ms, 90 % @ 384 ms |
| world roll | linear rate-limit, `74.5 °/s` → `66.5°` (`game.js`) | **893 ms** |
| jet sprite bank | `material.rotation = -worldRoll * 0.8` (`player.js`) | **893 ms** |

**The position response is fine. The attitude response — the part that sells "I am flying a
jet" — is roughly ten times too slow, and it is the only immediate feedback the player gets.**

The arcade decouples these two deliberately. Measured on verified stage-1 footage (sibling
repo, 338 detections): the player's jet sprite is **quantised to six discrete bank poses
(0 / 8.4 / 15.9 / 23.3 / 30.3 / 35.6°) and SNAPS between them — 61.8° in 50 ms, ≥1236 °/s** —
while the world slews smoothly at ~74.5 °/s underneath it. Across 189 frames the two
correlate at **r = −0.257**, and 92 of 153 banked frames have them at *opposite signs*. The
jet is not slaved to the world roll at all. It is the instant confirmation that your input
registered; the world is the slow, weighty consequence.

We have welded them together at 0.8× and made both slow. Press right, and for the first
three frames the jet tilts **3.7°**. The arcade tilts it **~23°** in the same three frames.

Two further consequences, both visible in `feel-03-roll-and-aim.png`:

- **Every lateral correction is a 66.5° knife-edge bank held indefinitely.** Because input is
  binary, there is no "gentle drift right". Hold right and the world rotates to near-vertical
  and *stays there* — the sea becomes a wall filling the left half of the frame. Reversing to
  the other extreme takes **1.79 s** of continuous rotation. The roll also outlasts the
  manoeuvre: the jet arrives at its new lateral position in ~0.4 s while the world is still
  rotating for another 0.5 s, and then takes 0.89 s to unwind after release. The world sloshes
  around after you have stopped moving.

- **The aim point detaches from the aircraft.** `src/entities/player.js` goes to considerable
  trouble (the `_rollAxisWorld` conjugation) to cancel the camera's roll out of the player's
  screen position. The sight square is not given the same treatment: `combat.js` sets it at
  `playerNdc.y + 0.30` and `lockSystem._placeCorners` projects it through the roll-excluded
  base quaternion, so it rotates about screen centre with the backdrop while the jet does not.
  **Measured on the capture frames (960 px wide): at 12° of roll the sight sits 118 px directly
  above the nose; at saturated 66.5° it has swung 58° around the aircraft to 101 px off the
  right wingtip** — 112 px (11.7 %W) from where a level-flight pilot expects it. You cannot
  aim while turning, which is most of the time.

**Fixes, with targets.**
- `player.js`: replace `material.rotation = -worldRoll * 0.8` with a snap to quantised poses.
  Target: **jet bank reaches its pose in ≤ 80 ms (≥ 400 °/s)**, quantised to ~6 steps with a
  ~37° peak, sign driven by `input.x` rather than by `worldRoll`. Keep the world at 74.5 °/s.
- `combat.js` / `lockSystem.js`: roll-compensate the sight's world position with the same
  `_rollAxisWorld` rotation `player.js` already uses. Target: **sight-to-nose offset constant
  within 10 px across 0–66.5° of roll.**
- `game.js`: make roll follow the *achieved lateral velocity*, not the raw stick, so it cannot
  outlast the manoeuvre — or give the keyboard a 0.15 s analog ramp so a tap produces a
  proportional 20–30° bank instead of a committed knife-edge. Target: **a 150 ms tap yields
  ≤ 25° of world roll and fully unwinds within 400 ms of release.**
- `player.js`: `ENVELOPE_Y 1.1 → 1.9`. The jet currently roams ±35 %W but only **±21 %H** —
  vertical authority is 60 % of lateral, in a game where climbing and diving is half the
  evasion vocabulary.

---

## 4. Sense of speed

**Observed.** The build has one speed and never changes it, and the strongest available
speed cue is running 7× too slow.

- **There is no throttle.** This is the headline absence. MAME's `segaxbd.cpp` reads AB2's
  throttle as `IPT_AD_STICK_Z` on ADC2 over the **full 8-bit 0x00–0xff range with no
  `PORT_MINMAX` clamp** — a *wider* usable travel than the flight stick, which is clamped to
  0x20–0xe0. Measured on the arcade longplay, the SPEED gauge's fill cycles through **8
  distinct levels and hits both rails inside a single 32-second stage** (min 117 px → max
  259 px of a 260 px crop). AB2 exists substantially *because* Yu Suzuki wanted to ship the
  throttle that AB1 cut.
  Our `SPEED M` gauge is a **static decal**: `src/ui/hud.js:448` initialises
  `throttle: 'M', throttleFraction: 0.55` and a grep of the whole tree finds **no writer** —
  the only consumer is `flow.js:189`, `AudioBus.setEngine(this.hudState.throttleFraction ?? 0.6)`,
  which therefore feeds the engine synth a constant 0.55 forever. The chevron never moves.
  The afterburner layer in `sfx.js` (`smoothstep(0.75, 1.0, s)`) is **mathematically
  unreachable**: it is dead code that can never sound.

- **The clouds crawl.** `src/render/clouds.js: CLOUD_SPEED = 9.5` world units/s against
  `stage.js: scrollSpeed = 68.93`. Near-field objects whipping past the canopy is the cheapest
  and strongest speed cue a rail shooter has, and ours drift by **7.3× slower than the
  ground**. In `feel-02-death-cycle.png` the same cloud sits in frame at essentially the same
  size for **six consecutive 0.25 s tiles**. It reads as a sticker on the monitor.

- **Speed is a constant, and constants are invisible.** Perceived speed is a contrast effect.
  The arcade runs two deliberate regimes — measured cruise flow is **≥ 1.58× canyon flow** —
  on top of a throttle the player is modulating continuously. We hold 68.93 units/s from the
  first frame to the last, so after ten seconds the player stops seeing it at all.

**Fixes, with targets.**
- Add a throttle. Two keys is enough (`Q`/`E`, or `Shift`/`Ctrl` held). Three detents L/M/H
  driving `scrollSpeed × 0.62 / 1.0 / 1.45`, enemy `depthRate × 0.8 / 1.0 / 1.3`, and
  `AudioBus.setEngine(0.30 / 0.65 / 1.0)` — which also makes the afterburner layer reachable.
  Wire `hudState.throttle` / `throttleFraction`. Target: **the SPEED chevron must change
  position ≥ 8 times in a 32-second stage** (the arcade's measured rate).
- `CLOUD_SPEED 9.5 → 45` minimum. Target: **a cloud crosses from first-visible to off-frame in
  ≤ 1.5 s**, not the current ~7 s.

---

## 5. Combat satisfaction

**Observed + code.** Firing does almost nothing you can see, and the gun cannot reach the
enemies you are looking at.

- **The vulcan is invisible.** `src/weapons/vulcan.js` puts 8.4 rounds in the air
  (`FIRE_INTERVAL_S 0.08`, `TRAVEL_S 0.7`), each **4.0 → 3.0 native pixels**
  (`PUFF_FRAC_NEAR 0.0125`), travelling **0.30 NDC = 15 %H** from muzzle to sight. That is a
  dribble of 4-pixel dots over a third of the distance the arcade's stream climbs
  (t214's measured column is ~34 native px with 10–12 px puffs). The muzzle flash is
  `FLASH_FRAC 0.03` for `FLASH_LIFE_S 0.05` — three frames of a 9-pixel blob. The previous
  round's own evidence crop (`evidence_vulcan.png`) shows the entire visible output of the
  cannon: one small orange smear beside the tail. **Holding the fire button looks identical
  to not holding it** until something happens to die.

- **The gun only works in the last 1.8 s of a 5 s approach.** `combat.js:_findAssistTarget`
  gates aim assist to `6 < e.d < 22`. Enemies spawn at depth 90 and close geometrically at
  `0.7089 /s`, so the assist window is `ln(22/6) / 0.7089 = 1.83 s` of a 5.00 s life. For the
  first 3.2 seconds — the entire period when the echelon is approaching and the player is
  tracking it — pressing fire achieves nothing, and nothing on screen explains why.

- **Missiles are a hold-and-release ritual with no tension.** `LOCK_INTERVAL_S = 0.10` and
  locks only launch on *release* (`combat.js:_updateMissiles`), so a full 6-lock salvo costs a
  0.5 s hold and then fires at something that was in the cone half a second ago. Measured over
  the run: **91 % of flight frames have zero missiles in flight and 94 % have zero locks.** The
  signature AB2 moment — six brackets snapping onto six aircraft and a salvo corkscrewing out —
  is statistically almost absent from a real run.

- **Threats are not readable.** `feel-04-flat-engagement-band.png`: across 24 consecutive
  frames of the only capture where the player survives long enough to fight, **every enemy sits
  in one narrow horizontal band at the player's own altitude and the top 40 % of the frame is
  empty sky in all 24 frames.** The engagement is a flat line, not a volume. Combined with
  `MAX_CONCURRENT_TRAINS = 1` and `TRAIN_START_GAP_S = 2.2`, the sky is busy with 13 aircraft
  (median) but only **2** are at readable size (≥10 %W), and **23 % of flight frames have none
  at all**.

- **Kills pay nothing in the moment.** `score.js` is explicit and arcade-correct — kills move
  only the HIT counter, cash settles at the stage tally. That is faithful, but it means the
  *only* in-the-moment reward for a kill is the explosion, which makes the explosion's job
  (and the gun's visibility) much more important than it is being treated.

**Fixes, with targets.**
- `PUFF_FRAC_NEAR 0.0125 → 0.022`, `SIGHT_NDC_Y_OFFSET 0.30 → 0.45`,
  `FLASH_LIFE_S 0.05 → 0.10`, `FLASH_FRAC 0.03 → 0.055`. Target: **the stream occupies ≥ 20 %H
  of the frame and ≥ 25 % of its columns are non-sky while firing** — i.e. you can tell at a
  glance that the gun is running.
- `_findAssistTarget` depth gate `6..22 → 6..55`, with `ASSIST_RADIUS_FRAC 0.13 → 0.07` so the
  extra reach is paid for with accuracy rather than handed over. Target: **0.3–0.5 kills/second
  for a player who tracks the echelon** (arcade measured 0.54), up from the current 0.05.
- Fire the first missile on *press*, keep accumulating while held. A tap should launch
  immediately; the hold should be a greed mechanic, not a mandatory wind-up.
- Spread `_echelonWave`'s `ndcB` vertical fan over −0.3…+0.7 instead of the current band, and
  raise `SPAWN_NDC_Y` spread, so aircraft arrive above the horizon line and the player has to
  look up. Target: **≥ 30 % of readable-size enemy-frames in the top third of the screen.**

---

## 6. Difficulty and fairness

**Measured.** 3.0 deaths/minute, 3 lives, mean life **11.1 seconds**.

The arcade's defaults (MAME `segaxbd.cpp`, `aburner2`): **Lives 3** (or 3×/4× credits),
**Allow Continue: Yes**, **Difficulty: Normal**. One hit kills — that part we match. What we
do not match is that the arcade's lethality is *learnable*: the cached 23-stage longplay is a
**zero-death clear**, and forum regulars report routinely clearing it. Nobody will ever clear
this build, because the fire model (§2, Leg B) makes death a random draw.

Three further fairness problems, all cheap:

- **The player cannot see how many lives they have.** `src/ui/hud.js` has `drawLives()` and
  `state.lives` wired to the renderer, and its own comment spells out the missing line:
  *"the wiring is `this.hudState.lives = this.lives;` wherever lives change"*. `flow.js` never
  writes it. The HUD therefore draws a **permanent, incorrect 3 life icons** regardless of the
  real count. Worse than absent — it actively lies, so there is no dread on the last life and
  game over arrives with no warning.

- **The continue countdown cannot be skipped.** `flow.js:_updateContinue(dt)` does not take
  `rawInput` at all. `CONTINUE_COUNTDOWN_S = 10`, and in the measured run that burned **12.3 s
  (10.2 % of the entire session)** staring at a counter with no button that does anything.

- **Missiles never restock.** `combat.js` starts at `MISSILE_START_STOCK = 50` and the only
  writes are `missileStock -= 1`. A player who uses salvos aggressively runs dry permanently.
  The arcade restocks every 2–3 stages via the stage 5/13 runway breathers and mid-air
  refuelling.

**Fixes, with targets.**
- Replace the random `TRAIN_BIAS` with an *aimed-and-telegraphed* train: aim at the player's
  position at fire time with a small fixed lead error (±0.08 NDC), and add a 0.4 s tell —
  muzzle flash on the firing aircraft plus a rising warning tone — before the shots leave.
  Target: **≥ 80 % of deaths follow a shot that was on screen and visibly growing for ≥ 0.8 s
  before impact**, and **deaths ≤ 1.0 /minute in stage 1, ≤ 2.0 by stage 3.**
- Do **not** call `combat.clear()` on death. Freeze enemy lethality for the sequence, let the
  world keep flying under the tumbling hulk. This single change removes the 4.5-second empty
  rectangle from every death.
- Shorten `TUMBLE_S 4.5 → 2.0` and `RESPAWN_S 2.4 → 1.6` → a **5.2 s** cycle. Combined with
  ≤1 death/min this takes non-interactive time from 53 % to **under 12 %**. Target: **≥ 85 % of
  wall-clock in `flight`.**
- One line in `flow.js`: `this.hudState.lives = this.lives;` in `_triggerDeath`, `_updateTitle`
  and `_updateContinue`.
- `_updateContinue(dt, rawInput)` + `if (rawInput.fire || rawInput.missile) this.continueCountdown = 0;`
- Restock `missileStock` to 50 at every `_enterStage()`.

---

## 7. Pacing

**Measured across the 120-second run.** The rhythm is not build-and-release; it is
drought-and-ambush.

- **64 % of elapsed time has no enemy at readable size (≥10 %W).** The longest unbroken
  such stretch was **19.1 seconds**; five more exceeded 9 seconds each.
- Arcade stage 1, for contrast: the *only* enemy-free window in the whole stage is the ~6 s
  carrier catapult launch, and **every sampled frame after t=94 contains an aircraft or an
  active explosion**. Enemy density 2–5 aircraft, continuously.
- The tally is correctly implemented as a live overlay rather than a blocking screen
  (`flow.js` class header) — that matches the arcade and should be kept. It is one of the few
  pacing decisions in the build that is right.
- The drought is self-inflicted, not a spawner bug: `spawner.clear()` on every death and every
  stage boundary resets `openerDone` and empties the queue, so the sky rebuilds from zero
  **3.0 times per minute**.

**Fix:** the §6 changes (don't clear on death, cut the death cycle, cut the death rate) fix
the pacing as a side effect. Target: **no stretch longer than 3.0 s without an enemy at
≥10 %W during `flight`.**

---

## 8. Audio

**Inferred from code — every capture is silent by design, so I have not heard this build.**
The code is unambiguous enough to critique anyway.

What exists is well-made: `sfx.js` has properly enveloped synthesis for vulcan (with a ±6 %
per-muzzle pitch nudge), missile launch, lock-on chirp, explosion, death wail, respawn chime,
tally tick, menu arpeggio; `music.js` renders a 63-second FM loop at 152 BPM offline into a
looping buffer. That is a solid foundation. The problem is *coverage and continuity*.

Measured arcade baseline (300 consecutive seconds of stage-1 capture): **integrated −15.0 LUFS,
loudness range only 5.2 LU, per-second RMS median −17.0 dBFS, and zero 1-second windows below
−25 dBFS.** There is no quiet beat anywhere in five minutes. Contemporary review: *"The machine
gun roars, missiles screech, and warning alarms scream at you non stop."* The cabinet drove
physical **LOCK ON** and **DANGER** lamps — the threat state was not only on screen.

Against that, ours:

- **`playEnemyFlyPast` is fully written — a doppler-ish filtered swell with a stereo pan
  sweep — and has zero call sites.** A grep of `src/` outside `src/audio/` finds every
  `AudioBus.play` call: `vulcan`, `lockOn`, `missileLaunch` ×2, `explosion`, `menuStart`,
  `playerDeath`, `respawnReady`, `tallyTick`. The single most spectacular event in a rail
  shooter — a jet roaring past your canopy at 27 %W — is **silent**.
- **There is no sound for enemy fire, for an inbound shot, for a near miss, or for a non-fatal
  hit.** The thing that kills you arrives without a single audio cue. This is the same defect
  as §2 Leg B viewed from the speaker: no telegraph, so no counterplay.
- **The engine bed is a constant.** `setEngineSpeed(0.55)` forever → `vol = 0.05 + 0.55×0.12 =
  0.116` under a 0.7 master. It never swells, never drops, never confirms anything the player did.
- **The game goes silent exactly when it goes blank.** `_triggerDeath()` calls
  `AudioBus.stopEngine()` and the engine stays off for the full 8.5 s. Blank screen, frozen
  score, dead engine. With deaths at 3/min, **~43 % of the session has no engine**.

**Fixes, with targets.**
- Call `AudioBus.play('enemyFlyPast', {panFrom, panTo})` from `spawner.update()` whenever an
  enemy crosses `d < 6`, panning from its NDC x. Zero new synthesis — the function is already
  written and tested.
- Add an inbound-threat tone: a looping two-tone warble while any enemy shot is within 1.0 s of
  the player's hit box, pitch rising as it closes. This is the arcade's DANGER lamp as audio and
  it is simultaneously the §6 fairness telegraph.
- Keep the engine running through the tumble (it is the hulk's engine, and it is the only thing
  stopping 4.5 s of silence); duck it instead of stopping it.
- Target against the arcade baseline: **no 1-second window of a normal run below −25 dBFS**,
  and audible feedback on all four of {firing, enemy firing, fly-past, incoming}.

---

## 9. What the arcade has that we entirely lack

| arcade verb / feature | status here | why it matters to feel |
|---|---|---|
| **Analog throttle** (8-bit, unclamped, modulated ~8×/stage) | **absent**; gauge is a static decal | the one thing AB2 added over AB1; the only speed *contrast* the player can author |
| **Afterburner** (snap lever min→max, visible flames) | layer exists in `sfx.js`, mathematically unreachable | the game's title |
| **Barrel roll** (slam stick one way then the other) | absent | pure spectacle — note HG101 says it has **no** real defensive value, so ship it for the look, not for i-frames |
| **Carrier catapult launch** opening stage 1 | absent; we open mid-air | sets the tone in the first 6 seconds, for free |
| **Breather stages** (5, 13, 23: runway landing, zero threat, missile restock) | absent | the release half of tension-and-release, and the only legitimate dead air the arcade has |
| **Visible spare-life icons** | renderer exists, never wired — shows a false constant 3 | dread on the last life |
| **Missile resupply** | absent; 50 and only ever down | removes a whole resource-management loop |
| **Difficulty curve across 23 stages** | 3 stages on a 32/32/36 s loop, identical difficulty | nothing to progress toward |
| **Cabinet motion + LOCK ON / DANGER lamps** | n/a (software) | the threat telegraph those lamps provided has **no** software substitute here |

---

## 10. Ranked fix list, by impact-per-effort on how the game FEELS

Ordered by (feel delta) ÷ (lines of code). Items 1–4 are each under ~20 lines and together
change the experience more than everything below them combined.

| # | change | file | effort | why it is this high |
|---|---|---|---|---|
| **1** | **Stop calling `combat.clear()` on death**; freeze lethality instead and let the world keep flying under the tumble | `flow.js` | ~5 lines | deletes the 4.5 s empty rectangle from every one of 3 deaths/min — the single most visible defect in `feel-01` and `feel-02` |
| **2** | **Telegraph and aim enemy fire**: drop `TRAIN_BIAS`, add a 0.4 s muzzle-flash + warning tone tell | `enemy.js`, `spawner.js`, `sfx.js` | ~40 lines | turns 3 unearned deaths/min into dodgeable threats; target ≤1.0 deaths/min stage 1 |
| **3** | **Snap the jet-sprite bank** (≥400 °/s, quantised, driven by `input.x` not `worldRoll`) | `player.js` | **1–6 lines** | restores the instant input confirmation the arcade has and we lack by ~10× |
| **4** | **Roll-compensate the sight** with the existing `_rollAxisWorld` rotation | `combat.js` / `lockSystem.js` | ~6 lines | you currently cannot aim while turning; `feel-03` |
| **5** | **Shorten the death cycle** `TUMBLE 4.5→2.0`, `RESPAWN 2.4→1.6` | `deathSequence.js` | 2 constants | 8.5 s → 5.2 s; with #2 takes non-interactive time 53 % → <12 % |
| **6** | **Wire `hudState.lives`; make the continue countdown skippable** | `flow.js` | ~4 lines | stops the HUD lying; reclaims 10 % of the session |
| **7** | **Add a throttle** (2 keys, 3 detents → scroll, enemy rate, engine gain, gauge) | `input.js`, `game.js`, `flow.js` | ~60 lines | the signature AB2 verb; also makes the afterburner audio reachable |
| **8** | **Audio coverage**: call the already-written `enemyFlyPast`; add the inbound-shot tone; keep the engine alive through the tumble | `spawner.js`, `combat.js`, `flow.js` | ~30 lines | the fly-past sound is *written and never called*; pairs with #2 as the fairness telegraph |
| **9** | **`CLOUD_SPEED 9.5 → 45`** | `clouds.js` | 1 constant | cheapest possible speed win; currently 7.3× slower than the ground |
| **10** | **Make the vulcan visible**: fatter puffs, longer stream, persistent flash; assist range `22 → 55` with a tighter cone | `vulcan.js`, `combat.js` | ~8 constants | firing currently looks identical to not firing; raises kills from 0.05/s toward the arcade's 0.54/s |
| **11** | **Fan enemies vertically** out of the single altitude band | `spawner.js` | ~6 constants | `feel-04`: the top 40 % of the screen is unused in every frame |
| **12** | **Restock missiles at each stage boundary** | `flow.js` | 1 line | a depleted stock is currently permanent |
| **13** | Barrel roll on a left-right stick slam (visual only, no i-frames) | `input.js`, `player.js` | ~25 lines | spectacle; do this after 1–8, not before |
| **14** | Carrier catapult launch opening stage 1 | new | large | best first-6-seconds investment once the above are done |

---

## 11. Observed vs inferred

**Observed in frames** (`tools/out/feel-critic/`, 5 capture sets, 198 frames):
the 8.5 s death cycle and its 4.5 s empty-screen phase; three deaths inside one 60 s attract
run; the frozen score across every death; the sight square swinging 58° off the nose under
bank (measured to the pixel on `roll-sight2/frame-0000` and `frame-0007`); the sustained 66.5°
knife-edge bank; enemies confined to one altitude band with the top 40 % of frame empty; the
near-invisible vulcan stream; clouds holding position across six consecutive 0.25 s frames; the
stage-2 palette swap and the live tally overlay (both of which work well).

**Measured by telemetry probe, not visible in frames**
(`tools/out/feel-critic/feel_probe.mjs`, 1200 samples over 120 s):
the 46.9 / 42.8 / 10.2 % state split; 3.0 deaths/min; the six per-life durations; 64 % of time
with no readable-size enemy and a 19.1 s worst case; median 13 alive vs median 2 at ≥10 %W;
67 % of flight frames with zero enemy shots on screen; 6 kills in 120 s.

**Inferred from code only — not experienced:**
*everything in §8.* Captures are muted by construction, so I have not heard one sound this
build makes. The claims that it feels dead, that the fly-past is silent, that the engine
drops out for 43 % of the session, and that the mix sits far below the arcade's −15 LUFS
floor are all read off call sites, constants and grep results — they are sound engineering
claims, not listening notes. **Someone should put headphones on and confirm §8 before acting
on it.**

Also inferred, not experienced: tap-vs-hold feel under a real keyboard (derived from
`FOLLOW_RATE` and `ROLL_RATE_DEG_PER_S`, not felt); whether a sustained 66.5° bank is
genuinely disorienting rather than merely unusual; and whether the aim-point detachment is as
disruptive in motion as it is in a still frame. The arithmetic says all three are real; only a
human with the controls can confirm the magnitudes.

---

## Evidence images

| file | shows |
|---|---|
| `judging/R4/feel-01-one-minute-of-play.png` | 72 tiles = 60 s of attract play. Three deaths; 25 tiles with no player, no enemy and no score movement. |
| `judging/R4/feel-02-death-cycle.png` | One death at 0.25 s resolution. 18 consecutive tiles of empty sky with the score frozen at 013310. |
| `judging/R4/feel-03-roll-and-aim.png` | A sustained "right" input: the 66.5° knife-edge ramp, and the sight square measured swinging 58° off the nose to the right wingtip. |
| `judging/R4/feel-04-flat-engagement-band.png` | 24 frames of sustained combat (invincible): every enemy in one altitude band, top 40 % of frame empty throughout. |

Captures and the telemetry probe live in `tools/out/feel-critic/` (`attract-min`, `death`,
`combat-fine`, `stage-trans`, `roll-sight2`, `title`, `feel_probe.mjs`).

**No source file was modified.** Nothing committed, nothing pushed.
