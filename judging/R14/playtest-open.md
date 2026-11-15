# R14 opening playtest + death-cycle re-measurement

**Agent**: breadth-r14 opening playtest (fresh context). **Build judged**: committed HEAD
(`5ecb8bb`) — no `src/` edits by me, no stash; build lanes' in-flight work NOT judged.
**Instruments**: `tools/playtest.mjs` (selftest 8/8 before first use); arcade frames decoded
from `.reference-cache/video/ab2-gameplay.mp4` for deaths and `ab2-longplay-60fps.mp4` for
calibration. **Seeds**: 7 and 19.

**Instrument limits**: playtest has no audio, ~1 s decision cadence, 6-panel strips not video;
no feel claim finer than a turn length. Arcade death footage (`ab2-gameplay.mp4`) is **30 fps
native** (`r_frame_rate=30/1`) — true 60 Hz is physically unavailable from the only
deaths-containing file, so deaths are sampled at **30 Hz (every frame)**. The prior 7.70 s
reading used this same 30 fps file. On a multi-second interval 30 Hz (±0.033 s) is ample; the
CLAUDE.md 60-Hz rule targets sub-second events (0.067–0.13 s), not an 8 s cycle.

---

## The five-sentence player verdict

In a freeze-frame this is After Burner II, but the moment I start fighting I'm a bystander: I
set the stick dead-center, held the trigger, touched nothing for a minute and a half, and the
gun still shot down twenty planes. When I actually chased targets with the sight it barely
changed the count, because the aim point is pinned up at the horizon while the enemies I could
reach pour across low and to the sides, so my tracers stream up into empty sky over their
heads. I held the missile button the entire time with huge close fighters filling the screen
and on one seed got a single salvo off the opening wave and on the other got nothing at all —
the lock only exists for one scripted bait and whether your run ever sees it is pure luck. When
I die the screen goes black and I sit there watching my plane tumble for six full seconds
before I can fly again — an eternity next to the arcade dropping you straight back into fire.
The arcade I just watched is a wall of planes at every depth with a half-screen fireball going
off every second; ours is a few small dots you don't even need to aim at.

---

## JOB 1 — the R14 combat gaps, confirmed on HEAD

### Gap 1 (rank 1) — THE BLIND GUN → **STILL BROKEN, confirmed both seeds**

The telemetry `hits` field is the cumulative **kill** count (`combat.js:1368`, `_damage()`
increments it per kill); a gun-only arm fires no missiles, so `hits` IS its gun-kill count.
One trap found and handled: **`hits` resets to 0 on every stage transition** (combat is rebuilt
per stage) and again on game-over→continue, so totals are summed per-stage, not read off the
final line.

**Blind arm** (stick dead-center `x=0 y=0`, trigger held, gun only, `invincible=1` so survival
doesn't confound the comparison):

| seed | stage 1 | stage 2 | stage 3 | ≈ per 90 s |
|---|---|---|---|---|
| 7  | 4 | 8 | 8 | **~20 gun kills** |
| 19 | 6 | 9 | — (60 s run) | **~22 gun kills** (extrapolated) |

The sight sat pinned at `(0.000, 0.188)` the entire run — it never aimed at anything — and
still killed ~20/90 s. This reproduces R13's "~20 kills/90 s" headline on HEAD.

**Aiming arm** (seed 7, invincible, 90 s, hands-on: steered the sight toward the enemy swarm
each turn). Clean same-stage, same-window comparison (stage 1 only, no reset, first ~30 s):
**aiming 6 gun kills vs blind 4** — aiming barely helps. Across the later stages my hands-on
aiming did **not** pull ahead of the blind floor (and in stages 2–3 actually trailed it,
consistent with the fixed horizon-sight sitting right on top of the low swarm that the
auto-assist converts — moving the sight pulls the assist *off* that row). Either reading gives
the same verdict: **a do-nothing pilot gets ~20 gun kills/90 s and aiming does not clearly beat
it.** The gun kills without you.

**Root cause, seen directly** (`playtest-open-evidence/gun-geometry-tracers-up-enemies-low.png`):
a 5–6 ship formation descends center-to-left with a close ~20 %W fighter low-left, while the
vulcan tracers stream straight **up the center into empty sky** — the caged sight cannot point
at the enemies that are actually reachable. (R11 §2.1 + R13 both measured `ASSIST_RADIUS_FRAC`
inert; I did not touch it. The lever is the geometry, exactly as the gap text says.)

### Gap 2 (rank 2) — MISSILES A COIN-FLIP ON WAVE TIMING → **CONFIRMED (worse on seed 19)**

Held `--missile 1` through ~60 s of normal flight each seed, releasing every 4th turn to fire
accumulated locks (salvo fires on button **release**, `combat.js`). Tracked `locks` and
missile `stock` (50 full; a salvo drops it).

- **Seed 7**: locks formed **only on the opening wave** (t≈2–6 s, 2 locks), one salvo fired
  (stock 50→48). Then **zero locks for the remaining ~52 s** despite close enemies repeatedly
  on screen at **30.9 %W, 30.1 %W, 25.3 %W** — ideal missile targets, no lock. Stock also
  **regenerated** 48→50. ≈ **1 salvo/min**.
- **Seed 19**: **zero locks, zero salvos across the full 60 s** — stock never left 50 — with
  close enemies constantly present up to **29.1 %W / 26.9 %W / 26.0 %W**. ≈ **0 salvos/min**.

So on one seed the opening bait gives one salvo and on the other the phase never aligns and you
fire nothing in a minute. That is the coin-flip the gap describes: **a lock is unreachable from
a survivable posture except on the scripted every-4th-wave bait, and whether your run ever sees
one depends on wave phase.** Keep the blind-pilot constraint in view — blind missile kills must
stay ~0; the fix is to make a lock *reachable every wave*, not to widen the auto-assist.

---

## JOB 2 — death-cycle RE-MEASUREMENT → **7.70 s is approximately CONFIRMED (if anything a slight under-read)**

Re-measured two clean **direct-respawn** arcade deaths (mid-life, respawn without a continue),
every frame at **30 Hz**, pinning the hit (first frame fire is on the aircraft itself with loss
of level flight — nearby blasts excluded) and the recovery. A third event at **t≈500 s** is a
death into **game-over→CONTINUE PLAY** (`death-into-continue-t500.png`): its interval includes
the coin-insert countdown, so it is **not** comparable to a respawn cycle and is excluded.

| death | hit | jet back in control | READY-gone (last blink) | hit→control | **hit→READY-gone** |
|---|---|---|---|---|---|
| #1 (t200) | t200.30 | ~t206.5 | ~t208.65 | **6.2 s** | **8.35 s** |
| #2 (t349) | t349.00 | ~t355.3 | ~t356.9 | **6.3 s** | **7.90 s** |

Evidence: `death1-hit-t1997-2006.png`, `death1-readygone-t207-210.png`,
`death2-hit-t344-355.png`, `death2-readygone-t354-358.png`.

**Verdict on 7.70 s**: confirmed, not refuted. Both deaths bracket it (7.90 and 8.35 s;
mean ≈ 8.1 s) — my readings are **at or slightly above** the single prior reading, never below.
The cycle is genuinely long; it was **not** an artifact and it is **not** shorter than believed.
A robustness note the single reading missed: the two phases are separable and the **no-control
dead time is a consistent ~6.25 s** across both deaths, while the trailing READY-blink
(during which the arcade jet is already flying, invulnerable) adds ~1.6–2.1 s of fuzzy,
blink-timed tail — which is where the ±0.4 s spread between my two totals lives, and plausibly
where the prior "7.70" (vs my 7.9–8.35) sits too.

**Implication for R14**: do **not** shorten the death cycle on the theory the number was wrong —
it is right. Per the gap-list hypothesis: the pace complaint is the **tumble filling ~6 s**, not
the length of the respawn, and R7 already reversed a short cycle once. If the lane touches it at
all, compress the dead tumble, don't cut the cycle.

---

## Do the R14 lanes have the right targets? — **Yes.**

Gaps 1 and 2 are confirmed on HEAD and the combat lane is aimed correctly (gun: fix the
geometry/reachability so aiming *causes* the kill, not `ASSIST_RADIUS_FRAC`; missile: a lock
reachable every wave, blind missile kills kept ~0). Gap 3's premise is settled: the death cycle
is ~8 s and real — the flow lane should treat the **tumble duration (~6 s of no control)** as
the lever, not the cycle length. The gestalt gap stands: against the arcade's wall-of-planes
density (`arcade-calib-t100-density.png`), our combat is sparse — breadth/population (gap 4)
remains the biggest structural lever.
