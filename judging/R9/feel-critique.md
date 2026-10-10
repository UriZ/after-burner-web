# R9 — Game-feel critique

**Scope, and it changed mid-round.** I was briefed to judge the new pacing. Partway through,
the owner identified what he actually cares about: *"the way the jet looks (our jet, enemy
jets) and the overall look and feel (missiles, responsiveness, heat-seeking missiles, the way
the sights lock etc)."* **He is right that nobody has measured any of it.** Greps across every
judge report, both prior critiques, `REFERENCE.md` and `GAME_SPEC.md` return **zero** hits for
*missile tracking*, *heat-seeking*, *lock acquisition* and *turn rate*. Nine rounds.

**§§1–4 are the first measurements of the missile, the lock and responsiveness in this
project.** §5 is the pacing work I had already finished. The jet's *appearance* is the art
critic's lane and I do not trespass on it.

**The method change matters as much as the subject.** My predecessors measured feel as kill
rates, presence fractions, deaths per minute and playable share — aggregates over time. A
missile's behaviour is a *shape over time* and an aggregate destroys it. **Everything in §§1–3
is a consecutive-tick trace or a consecutive-frame capture at 60 Hz**, never a sample.

---

## 0. Tree, instruments, controls

**Subject: `bd73b52de439f4d5690356c3265137be9756c27b` (`bd73b52`).**

**The tree was not clean and two things changed under me mid-run.** At the start
`git status --short` carried one untracked file, `judging/R9/report.md`, and nothing under
`src/`. During the run a concurrent lane **modified `tools/capture.mjs`** and the R9 art
critique landed. I read the `capture.mjs` diff rather than assuming: it adds a `--warmup N`
flag defaulting to **0**, and the capture path is byte-identical at `warmup = 0`. My
consecutive-frame captures **do** pass `--warmup`, so they depend on that lane's uncommitted
code; I am naming it rather than letting an unqualified "`bd73b52`" imply otherwise. I
modified nothing under `src/`, committed nothing, pushed nothing.

| instrument | what, and the control it passed |
|---|---|
| `tools/out/feel-critic-r9/feel_fc9.mjs` | consecutive-tick traces of the missile, the lock and the step response |
| `tools/out/feel-critic-r9/pilot_fc9.mjs` | pilot + per-tick telemetry. `--selftest` **21/21** incl. a planted fault |
| `tools/out/feel-critic-r9/occl_fc9.py` | player occlusion. Synthetic 50.000/0.000; **no-combat arm against itself reads 0.0000 on every frame** |
| `tools/out/feel-critic-r9/contrast_fc9.py` | player figure-against-ground. Synthetic 441.673 / null |
| `tools/out/feel-critic-r9/landshare_fc9.py` | terrain share. Synthetic 100/0/0 **plus arcade t93 = 0.0 % and arcade t106 = 24.5 %** |
| `tools/out/feel-critic-r9/arcade-rule-fc9.md` | arcade sample rule, written **before the first `ffmpeg` call** |

They share no code with `judging/R9/pace_probe_r9.mjs`, `judging/R8/pilot_r8.mjs` or
`tools/combat_probe.mjs`. **`window.__combatDebug()` is never called** — it draws from the
shared PRNG and would make the result a function of the sampling rate.

### Two defects in my own instruments, found and fixed, because both produced plausible numbers

1. **The missile button latched on for a whole arm and reported zero missile kills.** I patched
   a salvo-hold parameter into the pilot policy; `window.__MSLHOLD` was undefined on that path,
   `mslPeriod + undefined` is `NaN`, the comparison that resets the timer never fired, and the
   button stayed pressed from t = 2 s to the end. **The arm completed, threw nothing, and
   returned a full, internally consistent table** — gun kills, dead-time, emission all fine —
   with `missile: 0` as the only tell. Caught because a 0 % missile share contradicted §1.
   The first stick run (`S-stick.json`) is affected and its missile columns are **withdrawn**;
   its gun-only columns survive and are reported as gun-only.
2. **A backtick inside a comment terminated the policy template literal.** Instant, loud
   failure — the harmless kind. Recorded only because it is the same edit.

**And one measurement I attempted and am withdrawing.** I tried to track the arcade player
jet's per-frame displacement by its twin orange nozzle discs, to ask whether the arcade's jet
*accelerates* where ours does not (§3). The tracker's blob size ranged **19 to 8 980 px** across
120 frames and it produced a single-frame displacement of **62.5 %W**, which is physically
impossible. **It failed its own control and I am not publishing the answer it gave**, which
happened to be the one I expected. The arcade side of §3 is therefore **unmeasured**, and what
it needs is a largest-connected-component tracker with a position gate, restricted to the
lower-centre region and to a span with no fireballs in it.

---

## 1. THE MISSILE — it is not a heat-seeker, it is a timer, and it cannot miss

### 1.1 The hit test has no lateral term

`src/weapons/missiles.js`, the end of `update()`:

```js
const hit = target && m.depth >= target.d;
```

**That is the entire impact condition.** `target` is the enemy captured at launch; `m.depth` is
how far the missile has travelled into the screen. There is **no test of where the missile is
relative to the target on screen** — no radius, no proximity, nothing. A missile destroys what
it was locked to the instant its depth reaches that target's depth, wherever either of them is.

The homing above it is therefore **cosmetic with respect to the outcome**:

```js
const remain = Math.max(0.1, target.d - m.depth);
const steer  = Math.min(1, ((v * dt) / remain) * HOMING_GAIN);   // HOMING_GAIN = 1.7
m.ndcX += (target.ndc.x - m.ndcX) * steer;
m.ndcY += (target.ndc.y - m.ndcY) * steer;
```

Three consequences, all read straight off those four lines:

* **There is no turn-rate limit anywhere.** This is a direct interpolation of screen position,
  not a steering law with a maximum lateral acceleration. A real seeker's whole character — the
  thing that makes it feel like a missile — is that it *can be out-turned*. Ours cannot be.
* **It ends in a snap.** `steer` saturates at 1 when `remain ≤ 1.30` depth units. At `V_MAX = 46`
  units/s that is the final **0.028 s, under two ticks**, during which the missile's screen
  position is set exactly equal to the target's. The convergence the player sees in the last
  two frames is not flown, it is assigned.
* **No manoeuvre by the target can cause a miss**, because the outcome never consults the
  target's lateral position at all.

### 1.2 Measured: 93.8 % of launches kill, and the gun was off

`feel_fc9.mjs --modes missile --secs 120 --seed 3`, `?fixed=1&seed=3&invincible=1`. The pilot
holds the missile button 0.5 s, releases, waits 1.5 s, repeating. **The trigger is never
pulled**, so every kill in the window is a missile kill and the attribution is unambiguous —
confirmed by the ledger: `killCounts = {vulcan: 0, missile: 45, other: 0}`.

| | |
|---|---|
| launches, counted from the missile STOCK | **48** |
| missile kills, counted from the kill ledger | **45** |
| **hit rate** | **93.8 %** |
| maximum missiles in flight at once | 6 |
| page errors | 0 |

The three non-kills are targets that retired — flew past and left the field — which is the only
failure mode the code has. **In 120 s of firing, no missile was defeated by anything a target
did.**

It kills every pattern, including the one that moves fastest across the screen:

| target pattern | missile kills | target \|ndcX\| at death, median / max |
|---|---|---|
| `approach` | 34 | 0.089 / 0.170 |
| `overtake` | 10 | 0.098 / 0.183 |
| **`crosser`** | **1** | **0.331 / 0.331** |

### 1.3 What it kills, which bears on the gun

| missile kills, n = 45 | min | median | max |
|---|---|---|---|
| target drawn span | 0.7 %W | **3.4 %W** | 5.2 %W |
| target depth | 12.9 | 20.9 | 90.4 |

**100 % of missile kills land on targets below the gun's own 10 %W licence.** The two weapons
are not two options on the same targets; they are disjoint. The gun may only kill the largest
quarter of the arcade's size distribution and the missile takes everything else, with no skill
test on either side of the line.

### 1.4 Flight time, and it is on spec

From the single-target lock trace (§2): launch at tick 121, kill at tick 154 = **0.550 s**.
The multi-target trace gives 0.52–0.58 s. GAME_SPEC §3's MEASURED band is **0.5–1.5 s**, so
the *timing* is right. It is the only thing about the missile that is.

### 1.5 The launch effect buries the player's own aircraft — its own box goes 4.5 % → 56.4 %

**→ `tools/out/feel-critic-r9/fc9-04-MISSILE-60hz-A.png` and `-B.png`** — 56 **consecutive**
frames, `--every 1`, of a real salvo (`?fixed=1&seed=3&demo=2&invincible=1`, `--warmup 1978`;
the salvo tick was located first with `locate_salvo_fc9.mjs`).

Watch it in order. The launch smoke grows into a single hard-edged white polygon, centred on
the player, that **never stops growing inside the window** and swallows the aircraft. By frame
30 the jet is two orange nozzle discs and a wingtip poking out of a white mass.

Measured — smoke = `min(R,G,B) ≥ 180`, rows 0.10–0.86 (the orange desert has `min = 0`, so the
operator is unambiguous on this stage and there are no clouds in these frames):

| | |
|---|---|
| share of the **whole frame** that is launch smoke, peak | **19.6 %**, at t+0.90 s |
| frames above 10 % of frame, in the 0.93 s window | **36 of 56** |
| time to fall back below 5 % of frame | **≈1.5 s** per salvo |
| **share of the PLAYER'S OWN screen box reading near-white at peak** | **56.4 %** |
| the same box with **no combat at all** (control, same stage) | median **4.5 %**, max 22.6 % |
| consecutive frames with **more than half** the player's box covered | **19 of 56** |

The player box is the measured level-astern span, 35.62 %W (REFERENCE.md), centred on the
sprite anchor the capture manifest records per frame, square in pixels.

**The control is load-bearing and I ran it because the player's own livery is cream.** On
`?nocombat=1` frames of the same content stage — no smoke in existence — the same box reads a
median of **4.5 %** and at worst 22.6 %, which is the jet itself passing a near-white test. So
the 56.4 % is **not** 56.4 points of smoke: it is a rise from a ~4.5 % floor, and the pre-launch
frame of the salvo capture reads 6.9 %, consistent with it. The honest claim is that **the
player's own box goes from essentially clear to more than half covered, and stays there for 19
consecutive frames**, not that every one of those points is smoke.

### 1.6 The arcade's, in motion, beside it

**→ `tools/out/feel-critic-r9/fc9-06-PLUME-arcade-top-ours-bottom.png`** and
**`fc9-05-ARCADE-salvo-60hz.png`** (28 frames at 60 Hz).

**Alignment was verified, not assumed.** CLAUDE.md warns that `-ss` sequence extraction on the
AV1 60 fps file starts ~4 s early. I extracted 420 frames from `-ss 98.5` and found the frame
matching the committed `reference/stage1-missile-salvo-t100.75.png` by direct pixel distance:
**`f-0136`, mean absolute difference 0.0 — pixel-exact.** Everything is anchored to that.

The arcade's trail is a **thin rope of discrete round puffs** that leaves the pylon and arcs
away out of frame. **The player's aircraft is fully visible in all 28 frames.** The large white
mass low in those frames is a *cloud bank* — it is present before the launch and drifts
independently.

> **Ours is the right amount of smoke in the wrong place, the wrong shape and the wrong
> duration.** REFERENCE's measured arcade launch mass (39.1 %W × 50.0 %H) was hit by growing a
> blob *on the aircraft*; the arcade spends that same area on a long thin plume *behind* it.
> A plume that recedes reads as speed. A blob that grows on your own cockpit reads as a
> graphical fault.

**One number I tried for this comparison and am withdrawing.** I ran the same
`min(RGB) ≥ 180` operator over the aligned arcade sequence. Stage 1 has **near-white clouds**
that pass it, and they move fast enough to swing the raw series from 11.9 % to 47.5 % in 0.17 s
— far faster than smoke. Baseline subtraction does not rescue it. **The operator is not valid
on that stage and the arcade column of this table is a crop, stated as a crop.**

---

## 2. THE LOCK — acquisition is one tick, and a locked target looks exactly like an unlocked one

### 2.1 It does not sweep, seek or take time

`feel_fc9.mjs --modes lock`, `?fixed=1&seed=3&invincible=1&combatsolo=1` (one enemy at a time,
so the trace is a single acquisition). A pilot steers the sight onto the target, then holds.

| tick | phase | locks | **brackets drawn** | stock | missiles in flight | hits |
|---|---|---|---|---|---|---|
| 0 | pre-press | 0 | **1** | 50 | 0 | 0 |
| **1** | hold | **1** | **1** | 50 | 0 | 0 |
| 121 | release | 0 | 1 | 49 | 1 | 0 |
| 154 | release | 0 | 1 | 49 | 0 | **1** |

**The lock is taken on the first tick the button is down — 16.7 ms.** `lockSystem.js` says so
directly: *"First lock lands immediately on press, so a tap still fires one missile"*, with
`if (!this._wasHolding) this.lockTimer = 0;`. There is no acquisition delay, no sweep, no
growing or converging bracket, no tone. GAME_SPEC §3 records a prototype "0.5 s grace" that is
not implemented as an acquisition time.

### 2.2 And pressing the button changes nothing on screen

Look at the bracket column: **1 before the press, 1 during the lock, 1 while the missile
flies.** The player gets no visual confirmation that a lock was taken.

This is not an artefact of the single-target case — it is how the drawing works.
`lockSystem.js _drawBrackets()` builds `wanted` as the **union** of (the tracking target, the
locks, the targets with a missile in flight) and then draws, for every member:

```js
this._placeCorners(this.brackets[i], e.ndc.x, e.ndc.y, e.d, BRACKET_BOX_PX);
```

**One call, one size, no style argument.** There is no visual difference whatsoever between
*"this is merely the nearest enemy"* — which the tracking bracket marks for free, continuously,
ignoring the sight — and *"this enemy is locked and a missile is committed to it."* The sight
corners get their own style (`SIGHT_STYLE`); the brackets do not.

> **The lock has no acquisition, no feedback and no confirmation. The one bracket the player
> can see is the one that costs nothing.**

### 2.3 Multi-target: a 2 s hold against six aircraft takes three locks, not six

Same trace with the normal spawner (6 alive):

| event | tick | interval |
|---|---|---|
| lock 1 | 1 | — |
| lock 2 | 76 | **1.25 s** |
| lock 3 | 91 | 0.25 s |
| release → 3 missiles away | 121 / 125 / 129 | 0.067 s stagger |
| **3 kills** | 155 … 181 | |

`LOCK_INTERVAL_S = 0.10` is a floor that never binds. The binding constraint is **cone
occupancy**: `_nearestLockable` needs the enemy inside 0.22 NDC of the sight *and* in depth
26–88, and with the stick held still only three qualified in two seconds. So the salvo size is
set by where the traffic happens to be, not by how long the player holds — which removes the
one skill the hold could have priced. All three missiles hit.

---

## 3. RESPONSIVENESS — the jet has no acceleration phase and never overshoots

`feel_fc9.mjs --modes resp`, `?fixed=1&seed=1&nocombat=1`, every tick recorded, settled to
neutral for 3 s before each step.

**The diagnostic is not "how long does the move take" — it is where the peak speed falls.** A
first-order lag is fastest on its first tick and decelerates; a mass with thrust is slowest on
its first tick and builds. Those are opposite feels and the same settling time.

| step input | final displacement | **tick-1 displacement** | **peak per-tick at** | 50 % | 90 % | overshoot |
|---|---|---|---|---|---|---|
| full up | 0.5716 NDC | 0.05636 (**9.9 % of the whole move**) | **tick 1** | 0.117 s | 0.383 s | **+0.00000** |
| full down | 0.4342 | 0.04026 (9.3 %) | **tick 1** | 0.133 s | 0.400 s | **+0.00000** |
| full right | 0.6986 | 0.06649 (9.5 %) | **tick 1** | 0.117 s | 0.400 s | **+0.00000** |
| release from full right | 0.6986 | 0.06649 (9.5 %) | **tick 1** | 0.117 s | 0.400 s | **+0.00000** |

The per-tick steps on full-right are `0.06649, 0.06016, 0.05443, 0.04925, 0.04457, 0.04033` — a
geometric decay at ratio **0.898 = exp(−6/60)** to four figures. That is `player.js` exactly:

```js
const t = 1 - Math.exp(-FOLLOW_RATE * dt);   // FOLLOW_RATE = 6.0
this.x += (targetX - this.x) * t;
```

**There is no velocity state in the player at all.** No momentum, no acceleration, no inertia:
position chases the stick with a 0.167 s time constant. The aircraft is a cursor with
smoothing. Release is the exact mirror of the press — it cannot coast, and it is incapable of
overshoot in any direction, which the table confirms to five decimal places.

**Two further facts from the same traces:**

* **Up and down are not symmetric.** `ENVELOPE_Y_UP 1.55` against `ENVELOPE_Y_DOWN 1.1`:
  0.5716 against 0.4342 NDC, a **1.32× gain step across neutral.** The file knows and says so.
* **The two pieces of visual feedback disagree by a factor of 27.** The drawn jet snaps to its
  maximum bank pose (**35.6°**) by **tick 2**, while the world roll takes **54 ticks (0.90 s)**
  to reach its 66.5° saturation. The sprite is instantaneous; the horizon is slow. R5 measured
  that split off the arcade and it is deliberate — I report it because it is the dominant
  thing a player feels on the stick and no one had put the two numbers side by side.

**What is missing to judge this**: the arcade's own step response. My attempt to extract it
failed its control and is withdrawn (§0). **So I can say exactly what our flight model is and I
cannot yet say whether the arcade's differs.** That is the single highest-value measurement
left on the table, and it is not blocked on footage — the 60 fps file is here and aligned.

---

## 4. What these three have in common

Each of the three is a *skill expression* that has been removed:

| | what the player could be doing | what the build does |
|---|---|---|
| **missile** | out-turn it, break the lock, waste a shot | outcome fixed at launch; 93.8 % hit; no turn limit |
| **lock** | earn a salvo by sweeping the sight, read the brackets filling | 1 tick, invisible, size set by where traffic happens to be |
| **stick** | load the aircraft, anticipate, let momentum carry | first-order lag, no overshoot, no inertia |

**That is one defect with three faces, and it is a better account of "it does not feel like
After Burner" than any pacing number.** The systems resolve instantly and deterministically;
nothing is in flight, in doubt, or recoverable. An AB2 missile that always hits is not a
missile, it is a scoring button with a 0.55 s delay.

---

## 5. The pacing question I was first given

Kept because it was finished before the re-scope, and because it is the same lesson.

### 5.1 R9's pacing cut was right, and the arcade's empty sky is not empty

The cut reproduces on my instrument: emission **0.60–0.62 aircraft/s** of flight across three
pilots (three independent operators agreeing to the unit), inside the arcade's 0.40–0.74.

What nobody asked is what AB2 puts on screen when it has no aeroplanes on it. I counted it, on
the arcade's own stage 1, on a grid fixed before I opened a frame
(`arcade-rule-fc9.md`; `ab2-longplay.mp4`, t = 88–120 s, 1.00 s grid, **stage digit read 1 on
all 33 frames**, zero exclusions; labels in `arcade-labels-fc9.csv`).

> **The arcade holds HIT frozen at 11 for eleven consecutive seconds, t106 → t116 — and spends
> them flying low over a rocky forested coastline filling up to 31.4 % of the frame. Over the
> matching stretch of ours the terrain share is 0.00 % on all 33 frames.**

| terrain share, same operator both sides | arcade stage 1, n = 33 | **ours, stage 1, n = 33** |
|---|---|---|
| mean / median / max | 6.17 % / 0.20 % / **31.40 %** | **0.00 % / 0.00 % / 0.00 %** |
| frames above 5 % | 9 of 33 | **0 of 33** |

Operator: saturated green only (`70° ≤ H ≤ 165°`, `S ≥ 0.30`, `V ≥ 0.15`), rows 0.10–0.86, both
sides. **Green only, not brown, deliberately** — the arcade's rock and sand overlap the fireball
palette and our cream livery, and a classifier that scored a kill as terrain would flatter us
the busier we got. It therefore *understates* the arcade, which is the safe direction.
Validated before use: synthetic 100/0/0, **arcade t93 open water 0.0 %, arcade t106 forest
24.5 %.** Our 0.00 % was cropped and looked at before it was computed.

**→ `fc9-03-THIRTY-THREE-SECONDS-arcade-vs-ours.png`** — 33 arcade seconds above 33 of ours.
Theirs: carrier deck, climb through cloud, sea dogfight, an island, a coastline, forest, open
water. Ours: the carrier launch, then thirty near-identical blue frames.
**→ `fc9-01-EMPTY-SKY-arcade-top-ours-bottom.png`** is the same point in three frames each.

**So the new rhythm is pacing on the arcade's clock and nothing happening on our screen.** AB2's
empty sky is empty of *aeroplanes*. R9 removed the aircraft from a screen that had nothing else
on it. The fix is not to put them back — the spawner is now right — it is that **the population
was carrying the whole of this game's screen.** Confirmed from the code side: the spawner emits
exactly three patterns, `overtake`, `approach`, `crosser`, all airborne. **There is nothing in
this build to shoot that is not an aeroplane.**

### 5.2 The cut silently de-licensed the gun

`READABLE_SPAN_FRAC = 0.10` is enforced in `vulcan.resolveHits`, so the gun cannot damage
anything smaller. That gate was written when the sky held twelve aircraft. With 4.7× fewer:

| 180 s, `?invincible=1`, every tick | `still` | `weave` | `trk` |
|---|---|---|---|
| flight time with a **gun-legal** target on screen | **31.2 %** | **37.4 %** | **26.5 %** |
| dead time — no aircraft ≥3 %W, no round in the air, no flare lit | 30.3 % | 28.9 % | **35.4 %** |
| dead-run median / max | 2.6 s / 7.3 s | 3.4 s / 6.9 s | **3.8 s / 6.6 s** |
| emission /s of flight (3 operators) | 0.62 | 0.61 | 0.60–0.62 |
| stages reached in 180 s | 6 | 6 | 6 |

**For roughly three quarters of the time a tracking pilot holds the trigger, the gun is legally
incapable of damaging anything on screen** — and §1.3 shows the missile takes 100 % of its kills
below that same line. The two weapons do not overlap, and the one the player aims is the one
that is usually inert.

### 5.3 Difficulty, and a finding that is not about difficulty

From the same arms (`--invincible true`, so these are **hits absorbed**, not deaths — my
formatter's "deaths" column is mislabelled for invincible arms and I am not quoting it as
deaths):

| 180 s | hits taken | gun-only kills/s |
|---|---|---|
| `still` — stick never moves | **344** | 0.28 |
| `trk` — tracks targets | **8** | 0.42 |
| `weave` — two sinusoids, never aims | **0** | 0.26 |

> **A pilot that waggles the stick without aiming at anything is hit zero times in three
> minutes. A pilot that holds it still is hit 344 times.**

The mechanism is in `combat.js` and is not a bug: an enemy round is aimed at a **snapshot** of
the player taken when the flare lights, 1.0 s before the round leaves, and never refreshed. The
player's envelope is ±0.70 NDC against a `PLAYER_HIT_RADIUS_FRAC` of 0.040, so *any* sustained
lateral motion puts the jet tens of hit-radii from where the shot was aimed. **The threat is
defeated by motion per se, not by reading the telegraph** — so the telegraph, the warning time
and the fairness contract are all priced against a player who does not exist.

Fairness itself holds: **0 unannounced fatal hits** on every arm, as in R8.

The neutral-stick:tracking ratio is **0.28 / 0.42 = 67 %** against the ≤40 % gate — missed, and
*worse* than R8's 64 %. But read §5.2 before acting on it: at the arcade's emission rate both
pilots are supply-limited, so the ratio is now measuring how much traffic arrives rather than
how much skill is worth. **A pacing change moved a weapons gate, in the direction the gate
reads as a regression and the game reads as neither.**

### 5.4 Occlusion has closed; readability has not

Four captures of the same tick (`combat×jet` on/off), per-pixel set difference, two tick
spacings (127, 229 — neither divides the 960-tick attract cycle), flight frames only, respawn
flash excluded. Controls: synthetic 50.000/0.000; **the no-combat arm against itself reads
0.0000 on every frame.**

| | n | >30 % hidden | >50 % | median | worst |
|---|---|---|---|---|---|
| R8 art critique (old population) | — | 19.5 % | 7.3 % | — | 60.7 |
| R9 pacing lane | 84 | 4.8 % | 2.4 % | — | 64.2 |
| R9 art critique | 34 | 8.8 % | — | — | — |
| **mine, pooled** | **59** | **1.7 %** | **0.0 %** | **0.0** | **42.9** |

Population asserted from the pixels: `occ-e127-A` weapon 10/30, explosion 2/30, enemy fire
13/30; **`occ-e229-A` weapon 0/30, explosion 0/30** — `?demo=1` barely fires, so that arm is
enemy-traffic-only and the pooled figure is biased **low**. The `?nocombat` collision control
reads CLEAN. Four instruments, one direction: **the population cut fixed this.**

**But the two frames in which I could least easily find the player scored 7.0 % and 9.9 %** —
stage 2, a cream jet on an orange desert with three identical green aircraft in tight echelon
just above it. Occlusion is a *layering* statistic; readability is a *contrast* one, and the cut
separated them. Measured on the same frames (exact — the background behind every player pixel is
observed directly through `?hidejet=1`):

| content stage | n | min | **median** | max |
|---|---|---|---|---|
| 1 — sea | 27 | 209.3 | **251.7** | 278.8 |
| **2 — desert** | 22 | 189.3 | **199.4** | 204.5 |
| 3 — night | 10 | 187.1 | 242.2 | 270.3 |

**The player is 21 % less separated from stage 2's ground than from stage 1's**, with a tight
range — the whole stage, not a tail. No arcade column is possible (it needs a `?hidejet=1` the
arcade does not have), so this is an our-side diagnostic, not a gate. It converges with the art
critic's ΔV 0.024 / ΔS 0.337 from the other side: **two thin separations, and the remaining
"cannot find my jet" problem is no longer occlusion.**

### 5.5 Ten minutes, and what ends it

**Nothing ends it.** `flow.js:703-746`: at zero on the 10 s `CONTINUE PLAY` countdown — with or
without a button press — `lives = START_LIVES`, the score is preserved, state returns to
`flight`. No game over.

| | period |
|---|---|
| HUD stage digit (`stageIndex % 23 + 1`) | 776 s |
| **authored content** (`STAGES.length = 3`) | **100 s** |
| music loop / distinct material in it | 63 s / **~25 s** |
| wave generator | one wave every 7–13 s |

Four items R8 ranked are **byte-for-byte unchanged**, each checked in source: `CLOUD_SPEED = 9.5`
(the nearest motion layer still ignores the throttle, while the ground spans 2.34× and enemy
closure 1.19× — sixth round unclaimed); the barrel roll is still an animation (`isRolling` is
read only in `game.js`, nowhere in `combat.js` or `flow.js` — no i-frames, no lock break);
`flow.js:398` still restocks all 50 missiles at every stage boundary; and there are no ground
targets.

**What the round did close, and it deserves saying**: a real attract cycle now exists
(title 8 s ⇄ demo 24 s, and only a button spends a credit), and the title is a moving object —
the sphere plate tumbles and `INSERT COIN!` blinks red where R8 recorded it cyan
(**→ `fc9-title.png`**).

---

## 6. Audio — read, not heard, and my predecessor's headline item is wrong on this tree

`git diff ea3726b bd73b52 -- src/audio/` is **empty**.

**R8's rank 7 said the 1.0 s telegraph is silent. It is not.** The telegraph's audio does not go
through `HANDLERS` — R8 read the right table and the wrong mechanism. It goes through a
persistent node graph: `combat.js:705` calls `_updateInboundWarning(lit)` every tick, and
`combat.js:1014` is `const intensity = Math.max(worst, lit > 0 ? 0.25 : 0);` where `lit` counts
enemies with a burning telegraph. `AudioBus.setInboundWarning` resolves to `sfx.js:345` — a
two-square warble, 650 Hz plus a minor third, 6 Hz LFO, pitch rising to 1100 Hz with proximity.
**It is wired.** What survives is narrower: `play()`'s unknown-name branch is a bare `return`,
so a *typo'd* event name still vanishes silently.

**The clipping prediction reproduces and R8 understated it.** Peaks into the master gain:
ordinary kill **0.85** (noise 0.40 + boom 0.45, both 0.005 s attack, coincident); **bomber kill
and the player's own death 1.15**; vulcan 0.37; engine 0.31; warble 0.32; music ≈0.40. **The
master is a bare `gain.value = 0.7` with no compressor or limiter anywhere in `src/audio/`.**
One ordinary kill with the trigger held and music playing = **1.93 × 0.7 = 1.35** — hard clip.

**What a human should listen for, in priority order:**

1. **Hold the trigger, kill one aircraft, music on. Does it crunch?** A limiter on the master is
   the fix if so.
2. **Die once.** `playPlayerDeath()` is `playExplosion(true)` — *identical* to a bomber kill —
   plus a 500→70 Hz saw. With your eyes shut, can you tell them apart?
3. **Fire a salvo.** §1 says it is a guaranteed kill with no feedback; does the audio supply any
   of the commitment the visuals do not — a lock tone, a launch, an impact you can place?
4. **Five minutes: when do you first notice the music repeat?** `BASS_PATTERN`, `LEAD_PATTERN`,
   `KICK_STEPS`, `HAT_STEPS` are **one bar each, unchanged across all forty bars** of a 63 s
   loop. No fill, no break, no drum variation.
5. **Twenty seconds of the vulcan with nothing to hit** — now the common case (§5.2). Weapon, or
   stuck typewriter?
6. Throttle H: `smoothstep(0.75, 1.0, s) × 0.14` is 0 at L, 0 at M, full at H — a switch, not a
   swell.

---

## 7. Ranked by how much it damages the experience

| # | what | where | why this rank |
|---|---|---|---|
| **1** | **The missile cannot miss and cannot be out-turned.** The hit test is `m.depth >= target.d` with **no lateral term**; there is no turn-rate limit; measured **93.8 % of launches kill** with the gun off, across all three patterns | `missiles.js update()` | the owner named heat-seeking missiles first. There is no seeking in the outcome — the homing is decoration over a timer. **Give it a turn-rate limit and a proximity test and the weapon exists**; both are a handful of lines, and the flight time (0.55 s) is already on spec |
| **2** | **The launch effect buries the player's own aircraft** — the player's own screen box goes from a 4.5 % no-combat floor to **56.4 %** covered, >50 % for 19 consecutive frames, ~1.5 s per salvo, up to 19.6 % of the whole frame | `missiles.js` billow + ribbon | the arcade spends the same area on a thin rope *behind* the jet and never hides it (**fc9-06**). Firing your main weapon should not blind you |
| **3** | **The lock has no acquisition and no feedback.** 1 tick to lock; a locked target draws the **identical** bracket to the merely-nearest one — `_drawBrackets` makes one call with no style argument | `lockSystem.js` | the player cannot tell the button did anything. A distinct locked style, and any acquisition time at all, would make the salvo a thing you *earn* |
| **4** | **The aircraft has no weight.** Peak speed on **tick 1** of every input, zero overshoot to five decimals, no velocity state — a first-order lag with τ = 0.167 s | `player.js FOLLOW_RATE` | this is the thing under the player's hand for the whole game. **Do not change it before measuring the arcade's** (§0 — my attempt failed its control and is withdrawn) |
| **5** | **The world is empty, and the correct pacing cut exposed it.** Terrain share **0.00 % on 33 of 33** of our stage-1 frames against the arcade's 6.17 % mean / 31.4 % max; no ground targets of any kind exist | `stage.js`, `spawner.js` | the arcade can afford eleven seconds without a hit because an island is going past. Ours cannot. **Rank 1 of the original brief** |
| **6** | **The gun is inert about three quarters of the time** and the missile takes 100 % of its kills below the gun's licence | `combat.js READABLE_SPAN_FRAC` | the two weapons are disjoint, and the one the HUD invites you to aim is the one that usually cannot fire effectively |
| **7** | **Enemy fire is defeated by motion per se** — `weave` takes **0** hits in 180 s, `still` takes 344 | `combat.js` snapshot aiming | the telegraph and its warning time are priced against a player who holds the stick still |
| **8** | **A single kill clips the master bus**, and the player's death sounds exactly like a bomber kill | `audio/engine.js`, `sfx.js` | one listen settles it; nobody has listened in nine rounds |
| **9** | **Nothing ends the session**, content laps every 100 s, music's distinct material is ~25 s | `flow.js`, `music.js` | unchanged |
| **10** | **Readability is now contrast, not occlusion** — player 21 % less separated on stage 2 | `spriteFactory.js`, `stage.js` | occlusion is closed (1.7 % >30 %); do not spend another round on the spawner for it |
| **11** | **Three motion cues, three throttle responses** (ground 2.34×, closure 1.19×, clouds 1.00×); the barrel roll is still an animation | `clouds.js`, `player.js` | sixth round unclaimed |

**Not on this list, deliberately.** The pacing cut itself (correct, keep it); the R9 title and
attract cycle (genuinely closed); the fairness contract (0 unannounced fatal hits, again); the
missile's **flight time**, which is the one thing about it that is on spec.

---

## 8. Observed / measured / inferred

**Consecutive-frame captures, looked at.** 56 frames of our salvo at 60 Hz; 28 of the arcade's,
anchored pixel-exact to the committed reference still; 33 arcade stage-1 frames on a 1 s grid
with the digit read on every one; 33 of ours; 6 title phases.

**Consecutive-tick traces from my own telemetry.** All of §§1.2–1.4, 2, 3 and 5.2–5.3.

**Read from source, not rendered or heard.** §1.1 (the hit test and the steer law); §2.2
(`_drawBrackets`); §3's `FOLLOW_RATE`; all of §6; §5.5's four unchanged items.

**Validated against known input before use.** Every operator in §0's table.

**Withdrawn after failing a control.** The arcade jet-tracking for §3; the
`min(RGB) ≥ 180` smoke operator on the arcade's stage 1 (§1.6); the missile columns of the first
stick run (§0).

**Taken from other lanes and labelled in place.** The art critic's ΔV/ΔS and 8.8 % tail; the
pacing lane's 4.8 %; the three published arcade density counts; REFERENCE's 39.1 %W × 50.0 %H
launch mass and 35.62 %W player span.

**Not attempted, and named so it is not read as checked:** the arcade's step response (§0 — the
highest-value measurement left, and not blocked on footage); the arcade's missile turn rate and
whether its seeker can be out-turned; a ≤0.1 s arcade pass attributing HIT increments to air or
ground kills; any arcade side for figure-ground contrast; a human listening to §6; a second
reader on my 33 arcade labels.
