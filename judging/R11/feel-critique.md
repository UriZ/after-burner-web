# R11 — FEEL CRITIQUE: what the game does over time, re-measured from scratch

> ## THE THREE ANSWERS, IN ONE BOX
>
> 1. **AIMING DOES MATTER WITH BOTH WEAPONS, AND THE 85 % IS AN ARTEFACT OF THE
>    AIMING PILOT.** The arm the lane called "the best aiming pilot" flies the
>    nearest enemy in **depth 26…88**; the gun may only kill between
>    `assistmin` 2.6 and `readableDepth` **7.06**, read off the running page. The
>    two bands do not overlap, so in every gun arm that pilot was pointing at
>    empty sky. With a pilot that takes the gun's licence off the page
>    (`trackgun` / `trackboth`), on the shipped tree `fd833f6`, 5 400 consecutive
>    60 Hz ticks, **n = 8 seeds**: the motionless stick takes **53 %** of the best
>    aiming pilot's kills with both weapons, **55 %** with the gun alone and
>    **32 %** with the missile alone. Against a pilot that steers *away* from the
>    nearest target, aiming spans **71 / 76 / 88 %** of the achievable range.
>    **My own first table had the same defect and said 96 % and 107 %; both are
>    withdrawn (§1.3, §9).** A player can tell: **24 kills per 90 s against 43**,
>    and §2.1 shows the gun's half of that survives 300 ms of pilot latency
>    intact.
>
> 2. **`ASSIST_RADIUS_FRAC = 0.13` IS THE WRONG SUSPECT AND THE PROPOSED FIX
>    WOULD NOT HAVE WORKED.** The assist supplies **no lateral aim at all**:
>    `_findAssistTarget` returns `ndcX: this.sight.x` and `ASSIST_Y_FRAC = 0`, so
>    the only thing a target in that cone buys is the round's **depth ramp**.
>    Cutting the cone to exactly the sight's reach (`?gun=assistrad=0.0985`,
>    which is what "1.32× the sight's entire reach" implies) costs a motionless
>    pilot **10 %** of its gun kills (19.7 → 17.7, n = 3 seeds) and the aiming
>    pilot nothing, moving the blind share 53 % → 48 %. Switching the assist off
>    altogether costs **both** pilots 63 % and leaves the ratio untouched. The one
>    lever that does move it is **the vulcan's own hit radius**
>    (`HIT_RADIUS_SPAN_MULT` 0.5 → 0.15: blind share 53 % → 30 %), which is the
>    least anchored constant of the three — §3.2.
>
> 3. **THE PAIRING RESULT: the ordering survives, the conclusion does not — and
>    there is now AN ARCADE COLUMN FOR THE BRACKET that refutes the 8.3 %W gate.**
>    With the aim point in the frame the engine actually tests in, `final` is NOT
>    latency-immune (−25 %, not 0 %), `82daaa4`'s collapse is −45 % not −74 %, and
>    every tree is flat when the pilot's gain is adapted to its own lag — so
>    *"the envelope cut undoes the lock cut"* does not hold (§4). Separately, the
>    arcade's sight and its lock bracket are both drawn glyphs, so the distance
>    between them is readable: **11 of 12 arcade bracket tracks never come within
>    8.3 %W of the arcade's own sight at any point in their lives** (§5), median
>    closest approach **18.6 %W**. The gate is refuted as a model of the arcade's
>    *bracket*; the *missile's* cone is not drawn and remains unanchored.
>
> **SAMPLING RATE, BOTH SIDES, EVERY FIGURE.** Ours: one `window.__step(1)` per
> sample, 60 Hz sim ticks, state read inside the same in-page driver call;
> nothing coarser. Arcade: `ffmpeg -nostdin -ss T -i ab2-longplay-60fps.mp4
> -frames:v N -vsync 0 f%04d.png`, consecutive source-rate 60 Hz, `t = T + (i−1)/60`.
>
> **TREES, BY SHA, FOR EVERY OUR-SIDE FIGURE.** Pristine `git archive`
> extractions into the scratchpad, `node_modules` symlinked, nothing taken from
> the shared working tree:
> `5e3d57e` (R11 start) · `82daaa4` (lock cone + ramp removal, rail still
> ±34.93 %W) · `final` = `git archive 82daaa4` + `fd833f6`'s `player.js`, which
> is the combat lane's `final` · `fd833f6` (**shipped**, HEAD at round start).
>
> **Page errors: 0** in every browser arm in this file.

---

## 1. THE INSTRUMENT, AND WHAT IT HAD TO GET RIGHT BEFORE IT COULD CRITICISE ANYTHING

`judging/R11/feelcrit_probe.mjs` (selftest 11/11), `feelcrit_census.mjs`,
`feelcrit_table.py`, `feelcrit_analyse.py`, plus three arcade operators in §5.
Written independently of `probe_r11.mjs` / `human_arm.mjs` / `gun_check.mjs` —
same engine hooks, different pilot, different reference frame, different kill
accounting — because this round's three worst failures were one failure mode and
a second implementation is what catches it.

### 1.1 THE AIM REFERENCE WAS WRONG IN BOTH EXISTING PROBES, AND PAST 50 DEGREES OF BANK IT IS WRONG ON 61 % OF TICKS

Every hit, lock and assist test in `combat.js` is taken against `this.sight`,
which is computed at `combat.js:748` in the **pitch-only** ndc frame — the frame
enemy positions are authored in. `window.__sight()` returns the sight's
**live-camera** ndc. These are two frames, not two objects, and `combat.js:745`
says so in capitals.

`probe_r11.mjs` (`best.ndcX - sg.ndcX`) and `human_arm.mjs`
(`(best.ndcX - o.sx) * 3.0`) both steer on `__sight().ndcX` against
`__combatStats()`'s pitch-only enemy x. The combat lane names the mismatch and
bounds it at **17.41 %W on the wide-rail tree, 2.33 %W on the cut one**, and
argues it cannot explain the 18→11 fall. That argument is right for 18→11 and it
is the wrong test for the latency table — see §4.

This probe reconstructs the real cone centre from `__fairness().playerNdc`
(pitch-only) and `__brackets().rollDeg`:

```
sightX = playerNdc.x + (SIGHT_FRAC/0.5)            * (-sin roll)
sightY = playerNdc.y + (SIGHT_FRAC/(0.5*224/320))  * ( cos roll)      SIGHT_FRAC = 0.105
```

**Validated on live frames against an answer the simulation already holds**, not
on a synthetic. `lockSystem.js:466` drops `tracked` the instant the aim leaves
it, and `_lockable` is a hard radius test about `this.sight`; so on every tick
where `trackedId` is non-null, that enemy **is** inside `LOCK_RADIUS_FRAC` of the
true cone centre. A correct reconstruction must report ≤ radius on 100 % of
those ticks.

**Pooled over every arm in this file that ran on an aim-gated tree** (`82daaa4`,
`final`, `fd833f6`): **180 arms, 154 407 tracked ticks.**

| | reconstruction inside the radius | naive `playerNdc.x` / `+0.30` inside it |
|---|---|---|
| **all 154 407 tracked ticks** | **99.9987 %** (154 405 / 154 407) | 96.20 % |
| of which \|roll\| < 1° — 52 666 ticks, *the test has no power here* | 99.996 % | 99.93 % |
| 1–15° — 84 464 | **100.000 %** | 96.71 % |
| 15–30° — 14 578 | **100.000 %** | 85.51 % |
| 30–50° — 2 334 | **100.000 %** | 69.49 % |
| ≥ 50° — 365 | **100.000 %** | **38.90 %** |

**Both exceptions are the same tick on two byte-identical trees**
(`pr-{final,fd833f6}-track-missile-g3-l18-s11`, tick 4870) and exceed the radius
by **1 × 10⁻⁶ fracW = 0.0001 %W** — the tracked enemy is read *after* the step
that `_lockable` was evaluated *before*, so a target sitting exactly on the
boundary can cross it inside the tick. Reported rather than rounded away.

**The discriminating rows are the banked ones, and the test is stated with the
band it has no power in.** At zero roll the two aim points are identical by
construction and both read ~100 %; past 50° of bank the naive aim point —
the one `probe_r11.mjs` and `human_arm.mjs` steer on — is outside the lock cone
on **61 %** of the ticks where the simulation says the target is inside it.

### 1.2 THREE PUBLISHED R11 NUMBERS REPRODUCED FROM A DIFFERENT OPERATOR

The rail is **measured, not converted** from `ENVELOPE_X`: slam 4 s each way and
read the jet's roll-free screen column (`__sight().ndcX`, which `combat.js`
proves identical to the drawn jet's screen x at every roll angle).

| | this probe | published |
|---|---|---|
| `fd833f6` rail | **±9.85 %W** | ±9.85 %W (lane-feel §1.3) |
| `fd833f6` plateau | **0.6315 %W/tick = 0.379 fracW/s** | 0.379 fracW/s |
| `82daaa4` rail / plateau | **±34.93 %W / 1.048 fracW/s** | ±34.93 / 1.048 |
| `5e3d57e` rail | **±34.93 %W** | ±34.93 %W |
| arcade sight, `-ss 98.5`, 300 consecutive frames | **15 detections, [535.0, 608.5] px** | 15, [535.0, 608.5] (lane-combat §1.2 w1) |
| arcade sight, `-ss 520.0`, 420 consecutive frames | **63 detections, [415.5, 618.0] px** | 63, [415.5, 618.0] (w3) |

The two arcade rows are the check that my frame extraction is aligned
(`t = T_ss + (i−1)/60`) and that I am running *their* operator rather than a
variant of it.

> **A ROLL-CONTAMINATED READOUT, found and fixed in my own probe.** The first
> version closed its position controller on `__fairness().playerNdc.x`, which
> rotates under bank by construction, so rolling right *shrinks* |x| and the
> controller answers with more right stick — positive feedback. It measured a
> **±7.52 %W rail on a tree whose rail is ±9.85**. A plausible, stable, wrong
> number from an instrument one line away from correct.

### 1.3 A DEFECT I FOUND IN MY OWN PILOT, WHICH ALSO SITS IN TWO COMMITTED PROBES

My first gun table said a motionless stick **outscored** every aiming pilot. It
did, and the reason was my instrument.

`track` — here, in `probe_r11.mjs`, and in `human_arm.mjs` — flies the nearest
enemy in **depth 26…88**. The gun's licensed band is `assistmin` = 2.6 to
`readableDepth`, and the page reports `readableDepth = 7.06`
(`window.__gunTunables()`). **The two bands do not overlap at all**, and the
median depth of a vulcan kill in these runs is **5.9**. So a "tracking" pilot in
a gun arm is aiming at aircraft 4–12× farther away than anything the gun may
kill, while the gun quietly kills whatever drifts through the sight. Calling that
arm "the best aiming pilot" is an instrument read below its own validity floor —
this round's dominant failure, in my own probe.

`judging/R11/gun_check.mjs` uses `depth <= 22` with the comment *"the gun's own
licensed band: inside `readableDepth`"*. 22 is not `readableDepth` (7.06); the
band is asserted rather than read, and it is 3× too deep. Its direction survives
(22 at least overlaps the gun's range), its magnitude is not a clean read.

Fixed by adding `trackgun` and `trackboth`, which take the licence **off the
page** (`spanFrac >= minspan`, `depth >= assistmin`) so they cannot go stale
against a constant edit. Every gun figure below is from those.

---

## 2. DOES AIMING MATTER WITH BOTH WEAPONS? — YES, MORE THAN THE LANE CONCLUDED, AND THE 85 % IS AN ARTEFACT

`lane-feel.md` §2.2b's conclusion — *"with a full loadout the motionless stick
still takes **85 %** of the best aiming pilot's kills … the vulcan gives them
away instead"* — is the owner's complaint and the round's open item. **It is an
artefact of the aiming pilot, not a property of the build.**

Both `probe_r11.mjs`'s `track` and `human_arm.mjs`'s pilot fly the nearest enemy
in **depth 26…88**. The gun may only kill inside **`assistmin` 2.6 to
`readableDepth` 7.06** (`vulcan.resolveHits`'s span gate, read off the page). The
two bands **do not overlap**, so the "best aiming pilot" in that comparison was,
for the gun, pointing at empty sky. My own first table had the same defect and
said something even stronger and even more wrong (§1.3, §9).

`trackgun` and `trackboth` take the licence off the running page — nearest enemy
with `spanFrac >= minspan` and `depth >= assistmin`, by screen distance from the
reconstructed sight. Everything else is unchanged: identical trigger cadence
(40 held / 5 released) in every arm, `?fixed=1&invincible=1`, **5 400 consecutive
60 Hz ticks**, `fd833f6`, 0 page errors. **n = 8 seeds (3 / 5 / 7 / 11 / 13 / 17
/ 23 / 29) on the five arms the headline turns on; n = 3 (3 / 5 / 11) on the
`anti` and `sweep` floors and on the two gain-3 arms, and that is stated per
row rather than pooled silently.**

| weapons | pilot | n | kills, mean [seed:value] | vulcan | missile |
|---|---|---|---|---|---|
| **both** | `anti` g3 — steers *away* from the nearest target | 8 | **14.5** [3:13 5:11 7:13 11:13 13:17 17:17 23:20 29:12] | 12.8 | 1.8 |
| | `sweep` — sinusoid, never aims | 3 | 15.3 [3:17 5:10 11:19] | 14.7 | 0.7 |
| | **`still` — the stick is never touched** | 8 | **23.6** [3:23 5:29 7:20 11:24 13:24 17:28 23:21 29:20] | 19.1 | 4.5 |
| | `track` g8 — the missile-band pilot, i.e. the published one | 8 | 27.5 [3:37 5:23 7:22 11:24 13:24 17:29 23:30 29:31] | 12.0 | 15.5 |
| | `trackgun` g8 | 8 | 40.9 [3:45 5:38 7:38 11:36 13:42 17:46 23:41 29:41] | 36.0 | 4.9 |
| | **`trackboth` g8 — the best aiming pilot** | 8 | **43.0** [3:43 5:44 7:48 11:50 13:36 17:45 23:39 29:39] | 29.9 | 13.1 |
| **gun** | `anti` g3 | 3 | 12.7 [3:13 5:11 11:14] | 12.7 | — |
| | `sweep` | 3 | 14.3 [3:16 5:10 11:17] | 14.3 | — |
| | **`still`** | 8 | **22.0** [3:21 5:23 7:20 11:15 13:25 17:23 23:23 29:26] | 22.0 | — |
| | `track` g8 (missile band) | 3 | 16.7 [3:16 5:21 11:13] | 16.7 | — |
| | **`trackgun` g8** | 8 | **38.9** [3:32 5:42 7:37 11:37 13:43 17:40 23:38 29:42] | 38.9 | — |
| **missile** | `anti` g3 | 3 | 2.7 [3:3 5:1 11:4] | — | 2.7 |
| | `sweep` | 3 | 1.0 [3:0 5:1 11:2] | — | 1.0 |
| | **`still`** | 8 | **5.2** [3:4 5:4 7:6 11:6 13:5 17:10 23:4 29:3] | — | 5.2 |
| | **`track` g8** | 8 | **16.6** [3:19 5:21 7:16 11:18 13:11 17:19 23:13 29:16] | — | 16.6 |

> | weapons | blind share `still` / best aiming (n = 8, paired by seed) | share of the `anti`→best range aiming spans |
> |---|---|---|
> | **both** | **53 %** — 51 66 42 48 57 61 51 49 | **71 %** (n = 8) |
> | **gun** | **55 %** — 50 55 54 41 58 58 61 62 | **76 %** (n = 3) |
> | **missile** | **32 %** — 21 19 38 33 45 53 31 19 | **88 %** (n = 3) |
>
> **The published 85 % is 53 %, and "the vulcan gives them away" does not hold:
> the gun's blind share (55 %) is no better than the loadout's (53 %).** A
> motionless stick loses **45 %** of the achievable score with a full loadout.
> Aiming matters, on both weapons, on the shipped tree. The per-seed spread is
> 42–66 %, so this is a claim about the mean over eight seeds and not about any
> single run — which is the correction the lane itself had to make twice.
>
> **The `anti` floor is why these are interpretable at all.** "85 % of the best
> pilot" has no scale without knowing what the worst pilot gets: `anti` is 14.5
> and `still` is 23.6, so *doing nothing* is not neutral — it is already a third
> of the way up, and the remaining span is what aiming is worth. The denominator
> is also the best arm over **every** tracking pilot and **both** gains, per
> seed, not one hand-picked controller.
>
> **A detail that matters for which lever to pull.** `track` g8 — the published
> pilot — scores 27.5 with both weapons while `trackgun` scores 40.9, and the
> split says why: `track` converts 15.5 missile / 12.0 gun, `trackgun` 4.9 / 36.0.
> **They are not better and worse pilots; they are two different games**, and the
> build supports both. That is a point in R11's favour that neither lane could
> see with one pilot.

**Can a player tell?** On these numbers, yes with the missile — a 3.2×
difference is unmissable — and the loadout difference (**23.6 → 43.0 kills over
90 s**, i.e. one kill every 3.8 s against one every 2.1 s) is a different-feeling
game. **But `trackgun` is an optimistic ceiling**: it re-aims every 60 Hz tick on
perfect information at targets living at depth 2.6–7.06, which cross the frame
fast. §2.1 prices that.

### 2.1 AND A HUMAN CAN REACH IT — THE GUN'S AIMING CONTENT IS LATENCY-PROOF, UNLIKE THE MISSILE'S

The obvious objection to `trackgun` is that it is a perfect-information,
zero-reaction-time tracker working at depth 2.6–7.06, where targets cross the
frame fast. §4's machinery answers it: the same pilot with its stick computed
from the world as it was N ticks ago.

**Every row of this table is the same three seeds (3 / 5 / 11) across its own
three latencies**, so the comparison is paired; the 0 ms column therefore shows
the n = 3 subset of §2's n = 8 means (37.0 against 38.9, 45.7 against 43.0) and
is not a second estimate of them.

| arm | 0 ms | 150 ms | 300 ms |
|---|---|---|---|
| `trackgun` g8, gun only | **37.0** [3:32 5:42 11:37] | **40.7** [3:41 5:40 11:41] | **37.7** [3:34 5:35 11:44] |
| `trackboth` g8, both | **45.7** [3:43 5:44 11:50] | — | **40.7** [3:40 5:44 11:38] |
| *(for contrast, §4)* `track` g3, missile only | 16.3 | — | 12.3 (−25 %) |

> **Three hundred milliseconds of pure loop delay costs the gun-band pilot
> nothing** (37.0 → 37.7, inside the seed spread) and the full loadout 11 %. The
> blind share at human latency is therefore essentially the zero-latency one:
> `still` **22.0** (n = 8) against `trackgun` **37.7** at 300 ms is **58 %** with
> the gun, and `still` **23.6** against `trackboth` **40.7** is **58 %** with
> both — against 55 % and 53 % at zero latency. *(The latency arms are n = 3;
> the `still` denominators are n = 8, and mixing the two is why these are
> reported as a bound on the change rather than as a fourth row of the table.)*
>
> **And this is the clean mechanical explanation of §4.** The gun's tolerance is
> a **hit radius** — 5.96 %W at the median kill, resolved the instant the round
> arrives — so a laggy pilot who is roughly on target still scores. The missile's
> tolerance is an **8.3 %W cone that must be HELD for `LOCK_ACQUIRE_S` = 0.22 s**,
> which a delayed loop keeps falling out of. Latency sensitivity in this build
> belongs to the *hold*, not to the rail and not to the cone width alone.

---

## 3. WHERE THE SIGHT IS PARKED IS WORTH ALMOST NOTHING TO THE GUN — THE ARM THAT NAMES THE MECHANISM

`still` versus `track` conflates two questions: *is the weapon too forgiving* and
*does the traffic arrive where a motionless sight already points*. The arm that
separates them parks the jet at a fixed fraction of its own rail with a deadbeat
controller (the per-tick travel is **measured** in a 20-tick pre-run, so one
controller holds station on a ±34.93 %W tree and a ±9.85 %W one), and then just
holds the triggers.

**`fd833f6`, both weapons, 5 400 consecutive 60 Hz ticks × 3 seeds:**

| sight parked at | screen x | total kills [seed:value] | vulcan | missile | sd of held x |
|---|---|---|---|---|---|
| left rail | −9.83 %W | 18.7 [3:14 5:21 11:21] | **17.3** | 1.3 | 0.32 %W |
| half left | −4.92 %W | 24.7 [3:29 5:23 11:22] | **21.7** | 3.0 | 0.12 %W |
| **centre (= never touch the stick)** | **0.00 %W** | **25.3** [3:23 5:29 11:24] | **17.7** | **7.7** | 0.00 %W |
| half right | +4.92 %W | 24.0 [3:22 5:26 11:24] | **18.3** | 5.7 | 0.12 %W |
| right rail | +9.83 %W | 19.7 [3:17 5:19 11:23] | **17.7** | 2.0 | 0.32 %W |

> **THE VULCAN'S SCORE IS FLAT ACROSS THE ENTIRE REACHABLE RAIL — 17.3 to 21.7,
> a ±11 % band whose minimum and maximum are BOTH interior points.** Park the
> sight at a rail and the gun does not notice. Only the **missile** responds to
> where the sight is, and it responds hard: **1.3 → 7.7 → 2.0**, a 5.9× swing
> across the same five positions. The single best place to park the sight is the
> one the game starts you at.
>
> **READ THIS AS A STATEMENT ABOUT STATIC POSITION AND NOTHING ELSE.** §2 shows a
> pilot that *follows* each close target as it crosses takes the gun from 22.0 to
> **38.9** kills (§2, n = 8 seeds). So the gun's aiming content is real and it is entirely in the
> TRACKING, not in where you sit: every fixed point on the rail is worth the
> same, and the whole 1.9× is bought by moving with the target. That is a
> coherent skill — it is just not the one a ±9.85 %W rail with a 0.379 fracW/s
> plateau is well shaped for, since the targets it applies to are at depth
> 2.6–7.06 and crossing fast.

### 3.1 WHY — AND IT IS APPROACH GEOMETRY, NOT THE ASSIST CONE

Per-kill ledger, `still` pilot, gun only, **8 seeds, n = 176 kills**, each
stamped with the reconstructed sight on the tick the kill landed:

* **97 % of a motionless pilot's gun kills happen within ±9.85 %W of screen
  centre — inside the sight's entire reach — and 59 % within ±4 %W.**
* Median lateral aim error at the kill: **3.16 %W**, for a stick that was never
  touched. p90 **8.13 %W**.
* Median projected span of the victim **11.92 %W**, median depth **5.94**.

`vulcan.js:371` sets the hit radius to `max(span * 0.5, 0.02)`. At the median
kill the target is 11.92 %W wide, so the radius is **5.96 %W — 61 % of the
sight's whole lateral reach**. §7 measures where the traffic arrives, with the
triggers off so the player cannot bias the sample: median \|x\| **5.94 %W**, and
**50.0 %** of it inside ±5.96 %W. A hit window ±6 %W wide centred on a stream
half of which arrives inside ±6 %W leaves a parked sight very little to do.

### 3.2 THE ONE-LEVER ISOLATION — `ASSIST_RADIUS_FRAC` IS THE WRONG SUSPECT, AND THE HIT RADIUS IS THE RIGHT ONE

`_findAssistTarget` returns **`ndcX: this.sight.x`** and `ASSIST_Y_FRAC = 0`
(`combat.js:980`), so an in-cone target supplies **neither lateral nor vertical
aim** — only the round's **depth ramp**. `combat.js:916` says so in its own
header: *"It snaps the vertical ramp and the range, NOT the lateral aim, and that
split is load-bearing."* The lane's reading — *"the gun assist cone being wider
than everything the player can aim at means the vulcan's aiming content is now
near zero"* — attributes lateral forgiveness to a lever that has none.

One `?gun=` lever per arm, every arm's live constants read back from
`window.__gunTunables()`, **gun only, 3 seeds (3 / 5 / 11), 5 400 consecutive
60 Hz ticks**, run against **both** the blind pilot and the gun-band aiming one:

| arm | `still` | `trackgun` g8 | **blind share** |
|---|---|---|---|
| **shipped** (`assistrad 0.13`, `hitmult 0.5`) | **19.7** [3:21 5:23 11:15] | **37.0** [3:32 5:42 11:37] | **53 %** |
| `?gun=assistrad=0.0985` — cone cut to exactly the sight's reach | 17.7 (−10 %) | 37.0 (±0 %) | **48 %** |
| `?gun=assistrad=0.001` — the assist switched off | 7.3 (−63 %) | 13.7 (−63 %) | **53 %** |
| `?gun=hitmult=0.15` — hit radius 0.15× span instead of 0.5× | 6.3 (−68 %) | 21.3 (−42 %) | **30 %** |

> **I had this wrong first, with the wrong pilot, and the correction is the
> interesting part.** With `track` (the 26…88 band) in the aiming column, every
> lever moved both arms by the same proportion and the ratio never budged — so I
> wrote that none of them could change the blind/aiming balance. With the pilot
> aiming at what the gun can actually kill:
>
> **1. The lane's suspect is still the wrong suspect.** Cutting
> `ASSIST_RADIUS_FRAC` from 1.32× the sight's reach to exactly 1.00× moves the
> blind share 53 % → 48 % and costs a blind pilot 10 % of its kills. Real,
> directionally right, small.
>
> **2. Switching the assist off entirely is not a fix for anything** — it costs
> both pilots 63 % and leaves the ratio exactly where it was. It is a lethality
> control, not an aim control, which is what `ASSIST_Y_FRAC = 0` already implied.
>
> **3. `HIT_RADIUS_SPAN_MULT` is the lever that actually moves the ratio**:
> 0.5 → 0.15 takes the blind share from **53 % to 30 %**, because it costs the
> blind pilot 68 % and the aiming one only 42 %. It is also the most expensive —
> the aiming pilot drops 37 → 21 — and **it has no anchor**: `max(span·0.5, 0.02)`
> is a physical model (a round within half a wingspan hits) and the arcade's own
> gun tolerance has never been measured. **Do not tune it on the ratio.** Ledger
> row 41 is exactly this move. What it does say is where an arcade acquisition
> would pay: the gun's convergence or kill tolerance, not the assist cone.

## 4. THE PAIRING RESULT — THE ORDERING SURVIVES, THE CONCLUSION DOES NOT

`lane-combat.md` §5 is the round's strongest claim: *"the 300 ms collapse is the
LOCK cut, not the wide rail — and the envelope cut undoes it. Either change alone
would have been a regression; the pair is sound."* It rests on one arm with no
arcade column, flown by a pilot steering on the **wrong reference frame** (§1.1),
at **one fixed pursuit gain**.

Those two defects are not independent of the conclusion. A delayed pursuit loop
at gain 3.0 is an **unstable** loop: it overshoots, the overshoot banks the
aircraft, and the frame error is **a function of bank**. The lane bounds that
error at **17.41 %W on the wide-rail trees and 2.33 %W on the cut one** — so the
instrument's own error is 7.5× larger on exactly the trees the conclusion says
collapse, and it is large compared with the 8.3 %W cone being tested. The
published asymmetry is indistinguishable from *"a 17 %W aim-point error is fatal
to an 8.3 %W cone and survivable against a 22 %W one."*

Re-run with the validated cone centre (§1.1: 99.9987 % on the known-answer test
over 154 407 tracked ticks, 100.000 % on every tick with any bank at all), same
protocol otherwise — missile only, trigger cadence 40/5, `?fixed=1&invincible=1`,
5 400 consecutive 60 Hz ticks, **3 seeds paired by seed**, 0 page errors:

| tree | cone | rail | **g 3.0, 0 ms** | **g 3.0, 300 ms** | **g 1.0, 300 ms** |
|---|---|---|---|---|---|
| `5e3d57e` | 0.22 ungated | ±34.93 %W | **19.7** [3:18 5:22 11:19] | **16.7** [3:15 5:21 11:14] −15 % | **19.3** [3:15 5:26 11:17] −2 % |
| `82daaa4` | **0.083 gated** | ±34.93 %W | **18.3** [3:18 5:14 11:23] | **10.0** [3:10 5:9 11:11] **−45 %** | **18.5** [3:18 5:19 11:19] +1 % |
| `final` ≡ **shipped** | 0.083 gated | **±9.85 %W** | **16.3** [3:19 5:16 11:14] | **12.3** [3:10 5:13 11:14] **−25 %** | **16.7** [3:19 5:17 11:14] +2 % |

*(published, for comparison: 21.7 / 20.3 / 14.3 at 0 ms; 16.3 / **5.3** / **14.3** at 300 ms.)*

> ### WHAT SURVIVES
> **The ordering.** The gated 0.083 cone IS more latency-sensitive than the
> ungated 0.22 one — `82daaa4` loses 45 % where `5e3d57e` loses 15 %. The lane's
> mechanism (a small cone is a small target a laggy pilot hunts across) is real.
>
> ### WHAT DOES NOT
> **1. The collapse is −45 %, not −74 %.** With the aim point in the right frame,
> `82daaa4` keeps 10.0 of 18.3 kills, not 5.3 of 20.3.
>
> **2. `final` IS NOT IMMUNE. It loses 25 %.** The published row says the cut
> envelope is latency-flat (14.3 → 14.3, 0 %). It is not: 16.3 → 12.3. **So the
> envelope cut does NOT undo the lock cut's latency cost** — it halves it, and
> the shipped tree is still worse at 300 ms than the pre-R11 tree was
> (12.3 vs 16.7). The sentence *"either change alone would have been a
> regression; the pair is sound"* is the half that does not survive: on this
> axis the best of the three trees is `5e3d57e`, the one R11 replaced.
>
> **3. The whole effect is a property of the CONTROLLER GAIN, not of the build.**
> At gain 1.0 with the identical 300 ms delay every tree is flat (−2 %, +1 %,
> +2 %) and `82daaa4` scores **18.5**, above its own zero-latency gain-3 arm. The
> median achieved aim error says why, and this is internal evidence rather than
> an appeal to human factors: **gain 3 + 300 ms lands at 13.91 / 7.62 / 6.45 %W
> of aim error, gain 1 + 300 ms at 4.62 / 4.49 / 3.83 %W.** At gain 3 the loop is
> not tracking at all — 13.91 %W is larger than the whole 8.3 %W cone under test,
> so that arm is not "a pilot with latency", it is "a controller that is unstable
> at this latency", and what it measures is its own stability margin. Holding the
> gain fixed while sweeping the delay therefore reports a property of the model
> as a property of the lock cone.
>
> *(That a human would lower the gain instead is a modelling claim with no
> arcade column, and it is not what the refutation rests on. The refutation is
> that the published arm does not track, by its own achieved-error number.)*
>
> **The lane's own binding rule is the right one and it should have bitten
> harder: this arm has no arcade column and cannot rank builds.** It was used to
> rank three, and the ranking changes when one unanchored free parameter of the
> model — the gain — is moved by a factor the model never justified.

**A cross-tree check, because this round lost a result to one.** `final`
(`git archive 82daaa4` + `fd833f6`'s `player.js`) and the shipped `fd833f6`
produce **byte-identical per-tick rows and identical kill counts** on every arm
run on both. Code-only diffs (comments stripped) confirm it: `lockSystem.js` 0
lines, `combat.js` + `__explBusy` only, `spawner.js` a `console.warn` block only,
`enemy.js` an aim-error hash whose amplitude constant is `0.0` and which draws no
PRNG. **The combat lane's `final` row therefore does describe the shipped build**
— I expected it not to, and it does.

**Determinism control**: the same arm run twice gives identical kills *and*
identical per-tick rows, `still` and `track`, on `fd833f6` seed 3.

---

## 5. AN ARCADE COLUMN FOR THE LOCK BRACKET — the thing worth more than any critique

`LOCK_RADIUS_FRAC` moved 0.22 → 0.083 between two numbers neither ground-truth
document could anchor. **It is measurable, and nobody had tried, because the
question was framed as "what is the radius" rather than "what does the arcade
draw".** Both ends of the relation are drawn on screen: the nose sight is a 17 px
four-corner glyph (1.65 %W) and the lock bracket is the same four-corner shape at
~53 px (5.15 %W). The distance between them is a direct read.

### 5.1 TWO OPERATORS, EACH VALIDATED FOR ITS OWN GLYPH

* **Sight** — `judging/R11/sight.py`, unchanged, selftest 16/16, its 83/83
  detections cropped and looked at by the lane that wrote it. Re-run here it
  reproduces its own published columns exactly: `-ss 98.5` → 15 detections,
  [535.0, 608.5] px; `-ss 520.0` → 63 detections, [415.5, 618.0] px.
* **Bracket** — `judging/R11/feelcrit_lockrad.py`, **new**, selftest 15/15,
  including the one case sight.py's operator structurally cannot do: *a bracket
  drawn around a bright airframe.* sight.py requires a **hollow centre** and an
  empty **isolation ring**; a lock bracket has an aircraft inside it and terrain
  around it, so running sight.py's operator on brackets returns zero — a zero
  from a violated precondition, which is this round's most expensive failure
  mode. Stated here so nobody later "reconciles" the two by assuming a bug.
* **I tried the permissive operator on the sight class first and it failed**: on
  the same 300 stage-1 frames it put "sights" across 2.09…86.53 %W against the
  three-times-reproduced [52.04, 59.19] %W. Discarded, not patched.
* **Isotropy**: the frame is 1028×720 and 720/1028 is 0.056 % off AB2's native
  224/320, so distances use the exact form `hypot(dx/W, (dy/H)·224/320)` — the
  same units `lockSystem._lockable` is written in — and the 0.056 % is asserted
  in the selftest rather than assumed away.

### 5.2 WHAT IT READS

Twelve bracket **tracks** (≥3 consecutive frames, centre motion ≤18 px/frame)
across four windows, three stages and **six independent lock-on events**
(§5.3 item 4), 60 Hz consecutive decode. **Every one of
the twelve was cropped and looked at — 12/12 are a genuine four-corner lock
bracket around an aircraft with a genuine sight glyph in the same frame, zero
false positives.**

| window | `-ss` | stage | frames | bracket frames | tracks | usable |
|---|---|---|---|---|---|---|
| a1 | 98.5 | 1 | 300 | 47 | 8 | 5 |
| a12 | 520.0 | 12 | 420 | 80 | 8 | 5 |
| b12 | 530.0 | 12 | 420 | 19 | 2 | 1 |
| b6 | 275.0 | 6 | 420 | 25 | 4 | 1 |
| a7 / a19 / b1 / b4 / b7 / b14 / b16 / b21 | 315 / 775 / 105 / 215 / 322 / 585 / 670 / 870 | 7/19/1/4/7/14/16/21 | 3 240 | 219 | 24 | **0** |

*(4 800 consecutive 60 Hz frames decoded in all — 80 s of arcade play across
twelve windows and eleven stages.)*

Two statistics per track, because they bound different things:

* **first** — the sight→bracket distance on the track's first detected frame, an
  **acquisition** distance. Biased **up**: a bracket that existed earlier but was
  not detectable (over terrain, inside a fireball) starts its track late, and a
  closing enemy moves outward from a roughly central sight.
* **min** — the smallest distance anywhere in the track's life. Free of that
  bias, and it carries the stronger statement, which is a **code-level
  certainty** on our side rather than another measurement: on the shipped tree
  *both* bracket paths require `_lockable` — `_updateTracking` tests it every
  tick (`lockSystem.js:457, 466`) and a completed lock needs it held for
  `LOCK_ACQUIRE_S` (`:383–390`). **So an aircraft that never comes within
  8.3 %W of the sight is never bracketed by our build, by either route.** A
  track whose `min` exceeds 8.3 %W is therefore an arcade bracket our build
  cannot draw at all.

```
n = 12 tracks, 4 windows, 3 stages
  FIRST (acquisition, biased up):  min  7.86   median 18.83   max 31.82  %W
  MIN over each track (unbiased):  min  7.63   median 18.60   max 31.59  %W
```

> ### **ELEVEN OF TWELVE ARCADE BRACKETS NEVER COME WITHIN 8.3 %W OF THE ARCADE'S OWN SIGHT, AT ANY POINT IN THEIR LIVES.**
> The median bracket spends its whole life at **18.6 %W** from the sight; four of
> twelve never get inside **25 %W**. One track (stage 6) sits at 7.6–8.1 %W, so
> the operator is not blind to near brackets — it found the one that was there.
>
> **`LOCK_RADIUS_FRAC = 0.083` as a BRACKET GATE is refuted by the arcade.** The
> retired `0.22` sits almost exactly at the measured median. R11 gated our
> tracking bracket on the aim and matched the arcade's bracket-*presence*
> percentage by deleting the brackets the arcade actually draws.
>
> **This does not refute 0.083 as a MISSILE-LOCK radius.** `GAME_SPEC.md` §3
> distinguishes the two: the bracket "tracks the nearest threat continuously, not
> gated on crosshair hover" (ADOPTED #49), and the weapon lock "additionally
> requires the crosshair near the enemy". R11 retired #49 and made one radius do
> both jobs. **The measurement says #49 was right and retiring it was the
> regression**; it says nothing about the missile's own cone, which is not drawn
> and therefore still has no arcade column.

### 5.3 THE LIMITS, STATED

1. **The bracket detector is WHITE-ONLY** (`min(R,G,B) ≥ 205`). `GAME_SPEC.md` §3
   records blue `#008cd9`→`#3bbaff` bracket variants at t≈104. So my
   bracket-*presence* counts are an undercount and **must not be compared with
   the lane's 17.8 %** — that is a sensitivity-limited statistic and mine is a
   different operator. The *distance* statistic is unaffected by sensitivity:
   it uses only the detections it has, and all twelve were verified by eye.
2. **The binding yield limit is the SIGHT, not the bracket.** b16 and b21 carry
   116 and 86 bracket frames and contribute nothing, because sight.py's isolation
   ring needs clear sky around the glyph and a city or a coast does not give it.
   Misses are reported as misses and never interpolated.
3. **Could co-legibility select against SMALL distances?** It can, and the size
   of the effect is computable rather than guessed: a 53 px bracket's corner ink
   breaks the sight's 3 px isolation ring only when the two centres are closer
   than about 38 px = **3.7 %W**. That is well below the 8.3 %W gate and far
   below the 7.63 %W minimum observed, so it cannot manufacture this result.
4. **a1's five tracks are ONE salvo, and it is the salvo REFERENCE ledger row 41
   retired.** All eight of a1's tracks start between frames 85 and 112, i.e.
   t = 99.9–100.35 s — the `t ≈ 100` lock-on frame row 41 struck down as a
   licence for the radius. **The twelve tracks are six independent events, not
   twelve:** a1 at t ≈ 100.0 (5 tracks), a12 at t ≈ 520.2 (2), 524.3 (1) and
   525.9 (1), b12 at t ≈ 530.0 (1) and b6 at t ≈ 280.5 (1), across stages 1, 6
   and 12. **Strip a1 entirely and 6 of the 7 remaining tracks are still beyond
   8.3 %W** — median 17.84 %W, max 31.59 %W, over five events in three stages.
   The t = 100 frame is not load-bearing here.

---

## 6. THE OTHER HALF OF THE LOOP — THE LATERAL STICK IS A DODGE CONTROL, NOT AN AIM CONTROL

Every published R11 kill figure is taken under `?invincible=1`, which is correct
for a kill census and silent about whether moving keeps you alive.
`combat.js:1073` counts `playerHitsTaken` **whether or not the hit was survived**,
with its own note on why: *"each death costs an 8.5 s sequence that clears and
rebuilds the sky, so the death count saturates at ~4/minute almost regardless of
how lethal the fire actually is."* So the hit count under invincibility is the
instrument, and the deaths-on count is the one that saturates.

`fd833f6`, 5 400 consecutive 60 Hz ticks, 3 seeds, both weapons:

| pilot | hits taken, invincible ON (the instrument) [seed 3 / 5 / 11] | hits taken, deaths ON (saturates) |
|---|---|---|
| `still` | **151.3** [140 161 153] | 5.7 [7 5 5] |
| `track` | **46.7** [33 57 50] | 3.3 [3 3 4] |
| `sweep` (sinusoid, never aims) | **15.7** [19 17 11] | 2.7 [3 3 2] |

> **A motionless stick takes 3.2× the hits of a tracking pilot and 9.6× those of
> a pilot that only waggles.** The deaths-on column compresses that 9.6× into
> 2.1×, exactly as `combat.js` predicts — anyone measuring this with deaths on
> would conclude the difference is small.
>
> **And the best dodger is the pilot that never aims.** `sweep` takes a third of
> the hits `track` does. Evasion in this build rewards *motion*, not *correct*
> motion — which is a second, independent way for the player's input to be
> decoupled from the outcome, and it points at `enemyShots.js`'s aim model rather
> than at anything in the weapons.

## 7. APPROACH GEOMETRY — THE TRAFFIC ARRIVES CENTRED, AND THE SPAWNER DID NOT MOVE WHEN THE RAIL WAS CUT 3.55×

`feelcrit_census.mjs` records, once per enemy id, its screen x the **first tick
its projected span reaches the gun's own licence gate** (`READABLE_SPAN_FRAC` =
10 %W — the gate `vulcan.resolveHits` and `_findAssistTarget` both apply), i.e.
where it is when it first becomes killable. Flown by `still`, so the stick is
never touched, roll is identically zero, and the pitch-only frame **is** the
screen frame: there is no reconstruction anywhere in this number.

> **`--weapons none`, and the reason is a result I nearly published.** With the
> triggers held, this census measures *the traffic that survives long enough to
> become killable*, not the traffic the spawner authors — an enemy shot before it
> reaches the gate never registers. Run that way the two trees gave an **exactly
> identical median (6.0107 %W)** on 117 and 69 samples with 117 and 69 distinct
> values, which is the "two rows agreeing too exactly" signal. Cropped: the
> median of both samples is **literally the same aeroplane** (seed 5, an
> `approach` fighter at x = 6.010662211368075), because the two runs share spawns
> until their PRNG streams diverge at the first kill. Thirteen values are shared
> exactly. **The agreement was real and meant nothing.** With the triggers off,
> the player cannot influence the sample at all and the comparison becomes a
> proper control.

**`fd833f6` and `5e3d57e`, `still`, `--weapons none`, 3 seeds, 158 crossings
each, 5 400 consecutive 60 Hz ticks per arm:**

| | value |
|---|---|
| **the two trees' distributions** | **element-for-element identical** (`np.allclose` on the sorted samples) — the control, and it must hold, because `spawner.js` is byte-identical in code between the two and an unarmed player changes nothing |
| median \|x\| | **5.94 %W** |
| p75 / p90 / max | 10.29 / 15.01 / **23.91 %W** |

| an enemy is laterally engageable if \|x\| ≤ … | share of the authored traffic |
|---|---|
| **5.96 %W** — the gun's hit radius at the median kill, sight parked at centre | **50.0 %** |
| 8.30 %W — the lock cone, sight parked at centre | 66.5 % |
| **9.85 %W** — the shipped sight's entire reach | **72.8 %** |
| 15.81 %W — cut rail **+** gun hit radius | 91.1 % |
| 18.15 %W — cut rail **+** lock cone | 93.7 % |
| **34.93 %W — the OLD rail, alone** | **100.0 %** |

> **Half of everything the spawner authors is already inside one gun hit-radius
> of dead centre when it becomes killable, and the entire authored spread fits
> inside the rail the game had BEFORE R11 cut it.** `ENVELOPE_X` moved 3.55×;
> this distribution did not move at all. That is `judging/R11/ask-spawner.md` as
> a measured number, and it is the structural reason the hold sweep in §3 is flat
> — a sight parked at the centre is already where the aeroplanes go.
>
> **It also sets the size of the problem honestly: this is not "most of the
> traffic is unreachable".** With the rail *and* the weapon's own tolerance,
> 91–94 % of it is engageable. The defect is that **50 % of it needs no lateral
> input at all**, which is a different complaint and a different fix: the
> spawner's lateral spread wants re-deriving against ±9.85 %W, not widening until
> things become unreachable.

## 8. THE DRAWN-BRACKET POPULATION ON OUR SIDE, AND WHAT IT IS MATCHED TO

Per tick, 5 400 consecutive 60 Hz ticks per arm, `fd833f6`; n = 8 seeds on the
`still` and `track g8` rows, n = 3 on the rest.

| pilot | weapons | n | ≥1 bracket | ≥2 | max | ≥1 completed lock |
|---|---|---|---|---|---|---|
| `anti` g3 | both | 8 | 4.8 % | 1.6 % | 3 | 0.8 % |
| `sweep` | both | 3 | 3.9 % | 0.8 % | 2 | 0.6 % |
| **`still`** | both | 8 | **13.9 %** | 4.4 % | 4 | 2.1 % |
| `trackgun` g8 | both | 8 | 13.4 % | 4.2 % | 3 | 2.7 % |
| `trackboth` g8 | both | 8 | 28.5 % | 10.5 % | 4 | 5.0 % |
| `track` g8 | both | 8 | 34.7 % | 14.7 % | **5** | 6.0 % |
| `track` g8 | missile | 8 | 36.9 % | 16.4 % | **6** | 6.2 % |
| **ARCADE** (lane-feel §2.3, 1 140 frames, stages 1/4/12) | — | — | **17.8 %** | **3.1 %** | **3** | — |

Three things this says that the lane's version does not:

* **An aiming pilot exceeds the arcade's measured maximum of 3 simultaneous
  brackets, reaching 5 and 6.** `MAX_LOCKS = 6` against two independent arcade
  readings of max 3 is on the lane's own OPEN list as arithmetic; here it is a
  measured overshoot. My own 12-track arcade census never saw more than 3 in a
  frame either.
* **The statistic the gate was tuned to varies ~9× across pilots on our own
  build** — 3.9 % (`sweep`) to 36.9 % (`track`) — so "ours matches the arcade's
  17.8 %" is a statement about which pilot was flown, not about the mechanism.
  The arcade's 17.8 % pools whatever its own pilot was doing.
* **The lane's published figure for this arm was 15.4 % at n = 1 seed; at n = 8
  it is 13.9 %.** The direction of its conclusion is unchanged. Noted because
  every other single-seed figure this round moved when it was replicated.

## 9. WHAT I WITHDREW, AND THE ONE RULE THAT CAUGHT ALL OF IT

| withdrawn | why |
|---|---|
| **"the motionless stick takes 96 % of the best aiming pilot's kills with both weapons"** and **"with the gun it takes 107 %, so aiming is actively counterproductive"** — my own first headline | my `track` pilot flew depth 26…88, and the gun's licensed band is 2.6…7.06. The arm I was calling "the best aiming pilot" could not aim at a single thing the gun may kill. Corrected in §2 with `trackgun`/`trackboth`, which read the licence off the page |
| a ±7.52 %W rail on a ±9.85 %W tree | position controller closed on the roll-contaminated pitch-only `playerNdc.x`; §1.2 |
| the permissive four-corner operator applied to the arcade SIGHT | it put "sights" over 2.09…86.53 %W against a three-times-reproduced [52.04, 59.19]; replaced by `sight.py`, not patched |
| **"no gun lever can move the blind/aiming ratio, they only change lethality"** — my own §3.2 conclusion, published two paragraphs after the defect that caused it | the same wrong-band `track` pilot in the aiming column. Re-run against `trackgun`: `HIT_RADIUS_SPAN_MULT` 0.5 → 0.15 moves the blind share **53 % → 30 %**. The restraint it argued for (do not tune an unanchored constant to a ratio with no target) still stands; the reason given for it did not |
| a bracket-**presence** percentage as a correction to the lane's 17.8 % | my bracket detector is white-only and `GAME_SPEC.md` §3 records blue bracket variants; a sensitivity-limited count is not a correction to another operator's count. The **distance** statistic does not depend on sensitivity |
| **"the lateral spread is identical on both trees", read off the weapons-ON census** | the two medians agreed to 4 decimal places on 117 and 69 continuous-valued samples. Cropped: the median of both is the *same aeroplane*, because the runs share spawns until the first kill diverges their PRNG streams. Re-run with `--weapons none`, where the player cannot bias the sample, and the two distributions really are element-for-element identical — for a reason (`spawner.js` is byte-identical in code) rather than by coincidence. §7 |
| **"the shipped tree is not the tree the pairing table was measured on"** | I expected `fd833f6` ≠ `final` because 9 files changed between `82daaa4` and `fd833f6`. Code-only diffs and byte-identical per-tick rows say otherwise. Reported because I nearly published the opposite |

> **One rule produced all seven: state the validity floor of the operator, then
> show you were above it.** The band defect is the same failure the round's three
> withdrawals were — an instrument run below its own stated precondition, giving
> a stable, plausible, wrong number — and the only reason it surfaced is that the
> gun's licence is *readable from the page*, so the assertion could be checked
> instead of believed. Two committed probes carry the same defect
> (`probe_r11.mjs` depth 26…88 for gun arms; `gun_check.mjs` depth ≤ 22 with a
> comment calling it `readableDepth`, which is 7.06).
>
> **And it propagated once before I caught it: the same wrong pilot produced a
> wrong headline (§2) AND a wrong isolation conclusion (§3.2), in two different
> sections, both plausible, both stable.** One defective arm contaminates every
> table it appears in, which is the argument for naming the arm's own
> precondition in the arm rather than in the prose next to it.

### Things I did NOT measure, named so nobody reads their absence as a result

* **The arcade's own missile-lock radius.** §5 measures the drawn **bracket**.
  The missile's acquisition cone is not drawn and still has no arcade column at
  either end. `LOCK_RADIUS_FRAC` as a *missile* constant remains unanchored.
* **The arcade's pilot reaction latency.** §4 moves a free parameter the model
  never justified; it still cannot rank builds, and I have not made it do so.
* **The arcade's enemy lateral spread.** §7's distribution is ours only. Reading
  it from footage needs aircraft identity at working scale, which this round
  withdrew three trackers for failing.
* **Vertical aim.** Everything here is the lateral axis. `RATE_Y` and the
  vertical envelope were not touched and not tested.
* **Audio.** The lock tone's order and timing cannot be read from frames.

---

## 10. WHAT R11 GOT RIGHT, RE-MEASURED

Stated because three of this round's four changes survive my own instrument
without qualification, and a critique that only lists defects misreports the
round.

* **The envelope cut is correct and it lands.** Measured from a different
  operator on a pristine tree: rail **±9.85 %W**, plateau **0.379 fracW/s**,
  against an arcade sight whose rails I reproduce at [415.5, 618.0] px = ±9.85 %W
  from the lane's own detector. Three quantities, three matches.
* **The ramp removal is correct, and the before/after is exact.** The probe's
  20-tick calibration from the left rail (roll-free screen column, consecutive
  60 Hz ticks) reads, in %W per tick:

  ```
  fd833f6   0.6315 x 20        every step identical to four decimal places
  5e3d57e   0.3166 0.5758 0.7881 0.9618 1.1041 1.2206 1.3159 1.3940 1.4579
            1.5102 1.5531 1.5882 1.6169 1.6404 1.6597 1.6754 1.6883 1.6989
            1.7076 1.7146      still climbing at tick 20, 98 % of plateau
  ```

  against an arcade that reaches maximum lateral rate in one frame.
* **The LOCK change does what it claims, for the missile.** Missile-only, with a
  pilot in the right band and the right frame: a motionless stick takes **24 %**
  of an aiming pilot's kills, and aiming spans **88 %** of the anti→best range.
  That is the cleanest "the player's aim decides the outcome" number in the
  build, and it is the lane's.
* **`gun_check.mjs`'s direction was right and `probe_r11.mjs`'s both-weapons
  table was not** — and the difference between them is exactly the depth band.
  The lane published the weaker of its own two instruments as the headline.
* **The round's self-corrections are good.** Eleven withdrawals, two of them the
  publishing lane's own headlines, with the mechanism recorded each time. The
  `?gun=` tunable harness, the `--pilot` guard, and `__gunTunables()`'s readback
  are why I could *check* the gun's licensed band instead of asserting it — that
  infrastructure is what made this critique's main correction possible.

---

## 11. RANKED — WHAT MOST DAMAGES THE FEELING OF PLAYING AFTER BURNER II, FOR R12

Ranked by *how much of the player's experience it changes*, with the evidence
class marked. **ARCADE** = there is a measured arcade column. **OURS** = measured
on our build only, so it describes a gap from a target that is itself unanchored.

> **"Aiming does not matter" is NOT on this list, because it is not true of the
> shipped build.** §2, n = 8 seeds: blind share **53 %** with both weapons,
> **55 %** with the gun, **32 %** with the missile, and §2.1 shows the gun's half
> survives 300 ms of pilot latency intact. The owner's complaint was real about
> the *measurement* and is answered. **What is left is not "the player's input does nothing" — it is
> "the player's input does the wrong things, and the screen stops telling them
> what the weapon is about to do."**

### 1. THE TRACKING BRACKET IS GATED AT 8.3 %W AGAINST AN ARCADE THAT BRACKETS AT A MEDIAN 18.6 %W — **ARCADE**

**11 of 12 arcade bracket tracks never come within 8.3 %W of the arcade's own
sight at any point in their lives** (§5; min closest-approach 7.63 %W, median
18.60, max 31.59; 12/12 detections cropped and looked at; 4 windows, 3 stages,
consecutive 60 Hz). R11 retired ADOPTED #49 — *"AB2's bracket tracks the nearest
threat continuously, not gated on crosshair hover"* — and gated our bracket on
the missile's cone. **The measurement says #49 was right.** The gate matched the
arcade's bracket-*presence* percentage by deleting exactly the brackets the
arcade draws, and that percentage varies **~9× across pilots on our own build**
(3.9 % to 36.9 %, §8), so it never constrained the mechanism in the first place.

**The fix is a separation, not a number.** `GAME_SPEC.md` §3 already distinguishes
the continuously-tracking bracket from the missile lock that *"additionally
requires the crosshair near the enemy"*; R11 made one radius do both jobs. Put
the tracking bracket back on nearest-threat (bounded by the arcade's max of 3
simultaneous, which is the part of the arcade column that is firm), and leave
`LOCK_RADIUS_FRAC` to the missile alone — where §2 shows it is doing real work
and where it still has no arcade column either way.

### 2. THE TRAFFIC ARRIVES CENTRED, AND THE SPAWNER NEVER MOVED WHEN THE RAIL WAS CUT 3.55× — **OURS**

Median |screen x| at the moment an enemy becomes gun-killable, triggers off so
the census is of the traffic the spawner *authors*: **5.94 %W on a ±9.85 %W
rail**, and the distribution is **element-for-element identical** on the pre-cut
tree (§7). **50.0 % of the authored traffic is already inside one gun hit-radius
of dead centre**; 72.8 % is inside the sight's entire reach; and **100 % of it
fits inside the ±34.93 %W rail the game had before R11 cut it.** `ENVELOPE_X`
moved 3.55×; this did not move at all. That is why parking the sight anywhere in
the middle of the rail is worth the same (§3) and why a stick that is never
touched still scores 23.6 of a possible 43.0.

**The fix is a re-derivation, not a widening.** With rail + weapon tolerance,
91–94 % of the traffic is still engageable, so nothing is out of reach; what is
wrong is that half of it needs no lateral input.

This is `judging/R11/ask-spawner.md` with a number attached. It is ranked second
rather than first only because it has no arcade column: nobody has measured the
arcade's own enemy lateral spread, and three trackers were withdrawn this round
for being unable to establish aircraft identity at working scale. **Acquiring
that spread is the highest-value measurement on the board after the bracket**,
and §5's method suggests a route — the arcade *draws* a bracket on an enemy, so
bracket x samples *bracketed* enemy position **without needing to identify an
airframe at all**, which is the step that killed three trackers. Its bias is
nameable and must be stated with it (the bracket rides the nearest threat, so the
sample is of threats the arcade's own logic selected, not of all traffic).

### 3. EVASION REWARDS MOTION, NOT CORRECT MOTION — **OURS**

`still` takes **151.3** hits per 90 s, `track` **46.7**, and the pilot that never
aims at anything, `sweep`, takes **15.7** (§6). The best dodger in the build is a
sinusoid. This is a second, independent channel through which the player's input
is decoupled from the outcome, it is in `enemyShots.js`'s aim model rather than
in the weapons, and **it is invisible to any measurement taken with deaths on** —
the death count compresses that 9.6× into 2.1×, exactly as `combat.js:1073`'s own
note predicts.

### 4. THREE SCREEN-SPACE RADII DID NOT MOVE WHEN THE ENVELOPE DID, AND NONE HAS AN ANCHOR — **OURS**

`ASSIST_RADIUS_FRAC` 0.13 is 1.32× the sight's whole reach; the vulcan hit radius
`max(span·0.5, 0.02)` is **5.96 %W at the median kill = 61 % of the reach**;
`LOCK_RADIUS_FRAC` 0.083 is 0.84× it. §3.2 prices all three against both pilots:

* `ASSIST_RADIUS_FRAC` → the sight's reach moves the blind share 53 % → **48 %**
  for −10 % of a blind pilot's kills. The lane's suspect, and a small effect.
* the assist switched off entirely costs **both** pilots 63 % and moves the ratio
  **not at all** — a lethality control, as `ASSIST_Y_FRAC = 0` implies.
* **`HIT_RADIUS_SPAN_MULT` 0.5 → 0.15 moves the blind share 53 % → 30 %** and is
  the only lever that does. It is also the most expensive (the aiming pilot drops
  37 → 21) **and the least anchored**: half a wingspan is a physical model, and
  the arcade's own gun tolerance has never been measured.

**Do not retune any of the three on the ratio** — that is ledger row 41 exactly.
**What this ranking is for is to say where an arcade acquisition would pay: the
gun's convergence or kill tolerance, not the assist cone.** Ranked below 2
because the arithmetic complaint is real and the fix it implies is not.

### 5. `MAX_LOCKS = 6` AGAINST AN ARCADE MAXIMUM OF 3 — **ARCADE**

An aiming pilot draws **5 and 6** simultaneous brackets on our build (§8) against
two independent arcade readings of max 3, and my own 12-track census never saw
more than 3 in a frame either. This is on the lane's OPEN list as arithmetic;
here it is a measured overshoot. Cheap and safe to fix.

### 6. THE MISSILE'S LATENCY COST IS IN `LOCK_ACQUIRE_S`'s HOLD, AND THAT CONSTANT IS NOT MEASURED — **OURS, DIAGNOSTIC ONLY**

At 300 ms of pure loop delay the shipped tree loses **25 %** of a pursuit pilot's
missile kills where `5e3d57e` loses 15 % (§4), while the same delay costs the
gun-band pilot **nothing** (§2.1). The difference between the two weapons is not
cone width — it is that the gun's tolerance is resolved on arrival and the
missile's **8.3 %W cone must be held for `LOCK_ACQUIRE_S` = 0.22 s**.
`lockSystem.js:74` already says that constant is **NOT MEASURED and cannot be
read from footage**, so the one parameter that decides how much a laggy player is
punished is unanchored at both ends — cone and hold. **And its derivation takes
`MAX_LOCKS = 6` as an input** (`lockSystem.js:77`, *"t100: ~6 brackets at once"*),
which is the count REFERENCE ledger row 41 retired and which item 5 above shows
is 2× the arcade's measured maximum. Fixing item 5 moves this constant too;
they are one change.

**This must not be treated as a gate**: there is no arcade column for pilot
latency, and the whole effect disappears when the controller's gain is adapted to
its own lag. It is listed so a future lane does not rediscover it as a
regression, and so the published *"the pair is sound"* is not carried forward as
settled.

### 7. `GAME_SPEC.md` §3 STILL SAYS THE SHIPPED LOCK RADIUS IS 0.22 — **DOC**

It runs 0.083. One line, but this document is what the next lane reads before
touching the lock.

---

## 12. REPRODUCTION

```
node judging/R11/feelcrit_probe.mjs   --mode selftest        # 11/11
python3 judging/R11/feelcrit_lockrad.py --selftest           # 15/15
bash judging/R11/feelcrit_run.sh <stage> <out> <trees> [P]   # stages: gainsweep
                       matrix hold gunisol pairing repeat
node judging/R11/feelcrit_census.mjs --root <tree> --pilot still --out <dir>
python3 judging/R11/feelcrit_pairglyph.py <frames-dir> --label <w> --cache <dir>
python3 judging/R11/feelcrit_arcagg.py <cache-dir> [--gate 8.3]
python3 judging/R11/feelcrit_table.py  pilots|hold|isol|pair|brk|repeat <dir>
python3 judging/R11/feelcrit_analyse.py validate|kills|aimerr|hold <dir>
```

Trees: `git archive <sha> | tar -x -C <dir>` + `ln -s node_modules`. **Cold-start
more than one arm at a time against freshly-extracted trees and vite's dependency
optimiser races on the shared `node_modules/.vite/deps`** — it cost three arms
here, each failing loudly with a `waitForFunction` timeout rather than quietly.
Warm one arm per tree first, or run the first batch serially. Arcade
frames: `ffmpeg -nostdin -ss T -i .reference-cache/video/ab2-longplay-60fps.mp4
-frames:v N -vsync 0 <dir>/f%04d.png`. Evidence images (gitignored, large) under
`tools/out/feelcrit-r11/` — `ALL12-marks.png` is every arcade detection in §5 at
1:1 with the sight circled and the sight→bracket line drawn.
