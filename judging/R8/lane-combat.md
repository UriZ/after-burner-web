# R8 — combat lane: making the gun need the player

**Gap**: R7 gap 1 (rank 1), plus gap 4a (the throttle has no gameplay consequence) and two
documentation defects inside my own files that the R7 judge ranked (gap 5, gap 8 item 1).

**Files touched under `src/`**: `weapons/combat.js`, `weapons/vulcan.js`,
`weapons/lockSystem.js`, `weapons/enemyShots.js` (comment only), `entities/enemy.js`,
`game/spawner.js`, and one new file `weapons/tunables.js`. **Nothing else, and I committed
nothing.** New tooling, committed beside this report:
`judging/R8/{pilot_r8.mjs,pool_r8.mjs,shots_r8.mjs,sweep_r8.sh,sweep2_r8.sh,after_r8.sh}`.

> ## Verdict in one screen
>
> **The gun no longer kills what the player cannot see, and that part is closed exactly.**
> **0.0 %** of gun kills are now below the 10 %W readable gate, against **79.1 %** before; the
> median gun kill went from **8.20 %W to 11.05 %W**; the deepest gun kill in 720 s of flight went
> from **depth 59.8 to 9.4**, inside the band where the widest enemy is still readable.
>
> **"Playing well empties the sky" is closed, and it reversed.** A tracking pilot used to see a
> readable aircraft on **27.3 %** of ticks and now sees one on **79.6 %** — through R3's own
> ≥60 % gate, which it failed before. Worst drought **6.45 s → 2.40 s**, better than the
> `?demo=1` autopilot's own 3.30 s. Enemy fire volume **rose** (132.1 → 140.0 rounds/min), 0
> unannounced hits, minimum warning 2.883 s. And in mortal play the tracking pilot now dies
> **~21 % less** and flies **~10 more points** of the clock, because the full sky keeps it moving
> — the R7 feel critique's causal chain running the right way round.
>
> **The stick matters much more and still not enough.** Neutral/tracking **80.6 % → 64.0 %**
> (gun only **76.9 % → 54.8 %**); the stick's worth went from +10.2 % to +24.7 % and the vertical
> axis specifically from +3.9 % to +9.7 %. **The ≤40 % gate is MISSED.**
>
> **And the reason it is missed is not in my files, which is the finding I would most want read.**
> The spawner emits **2.71–3.27 aircraft per second of flight**; a tracking pilot kills **94.1 %
> of everything emitted**. The arcade's expert pilot kills 0.42–0.45/s. **So "kill rate within 2×
> of the arcade" cannot be met by any change to any weapon** — a pilot at ≤0.90/s would have to
> let ≥67 % of all traffic fly past, which is a pacing decision, not a weapon one. The missile
> separately contributes a flat, **aim-independent** 1.08–1.26 kills/s to every policy because it
> is limited by `flow.js`'s per-stage restock rather than by aim. §5 has the arithmetic and the
> two asks it generates.
>
> **Three levers were measured and refuted, including the one the brief named.** Aim scatter —
> *"the lever the feel critic names and nobody has tried"* — makes the gun **7 % MORE lethal** in
> both regimes and does not move the ratio: it is a shotgun, not a handicap, and it ships wired
> and inert with its cost published. Narrowing the assist's depth band, the mechanism the gap text
> names, made the gun **more** lethal too. And R6's named reach cap is worth **5–6 %**, which
> independently confirms the R7 feel critic's 4.2 % against R6's framing. **The lever that
> actually carried the ratio was the one nobody proposed: the hit radius was 1.6× the target's
> own wingspan.**

---

## 0. Provenance — what every number below was measured on

**Baseline tree**: `82365e9` for all of `src/`. My BEFORE table was captured on it with one
addition of my own already in place — the kill ledger (§1) — which is measurement-only and is
shown below to be behaviourally inert.

**AFTER tree**: `82365e9` + commit `1783060` (the out-of-cycle enemy-art lane: `enemySprite.js`,
`spriteFactory.js`, `tools/art/**`, the sprite PNGs) + my own changes.

**The tree was not clean and I am saying exactly what moved and when, because two of my
baseline arms ran while another lane was editing.**

| | time |
|---|---|
| my `timing-control` arm | 17:37 |
| **baseline groups A/B/C ran** | **17:38 – 18:00** |
| `src/game/flow/{flow,cards}.js`, `src/game/game.js` last edited | 17:32 — **before** |
| `src/weapons/combat.js` (my kill-ledger instrument) | 17:32 — **before** |
| `src/game/flow/titleScreen.js` edited | **17:45 — during** |
| `src/ui/ladder.js` edited | **17:44 — during** |

**What that can and cannot reach, read from the import graph rather than assumed.**
`flow.js` imports `drawTitleScreen` from `titleScreen.js`, which imports `assertOnLadder` from
`ui/ladder.js`, so both modules are in the graph every arm loaded. Neither is **called** outside
the title state, and **`?fixed=1` without `?showtitle=1` skips the title entirely** — every arm
starts at tick-0 flight. Both files also demonstrably parsed and evaluated in every arm, because
the harness collects `pageerror` and console errors and **refuses to report an arm that produced
any**, and no arm did. Neither file is read by the spawner, either weapon, enemy fire, the hit
tests or the flight/death state machine, which is where every quantity in this report comes from.

**The lesson I took from the R7 feel critic's own closing note** — *"a served-source assertion
only covers the files you thought to name"*, and the file that moved under it was not one of them
— is that the fix is to name more files. `SERVED_CHECK` now asserts **ten**: the five I own, plus
`enemyShots.js`, `player.js`, `flow.js` and `game.js`, each with a sha256 **and** a literal
spot-check of the constant being reasoned about, refusing to run on a mismatch. A hash says the
file changed; the literal says which way.

**And the art lane's change does not invalidate an instrument of mine, which I checked rather
than assumed.** The TL flagged that enemy sprites are now pale rather than keylined in black, so
any instrument keying on near-black pixels to find an aircraft needs re-validating. **None of
mine reads a pixel.** Every figure in this report comes from the simulation's own state —
`__combatStats` (per-enemy depth, `spanFrac`, NDC), `__flowState`, `__fairness`, and my own kill
ledger. The one place I look at pixels is the "crop it and look" frames in §7, which are
qualitative.

---

## 1. The instrument, and one thing it removed from the argument

### The kill ledger: weapon, size and depth per kill, as a direct read

Both R7 reviewers had to **infer** which aircraft died and how big it was. The feel critic
matched each tick's `hits` delta against the enemies that left the live list, attributed 97.8 %
of kills and counted the rest ambiguous rather than guessing — good method, and it still could
not attribute a kill to a **weapon**. It had to separate the gun from the missile by running
single-weapon arms, which is a different game rather than a decomposition of this one; and its
central column, "killed beyond the assist cone's own depth limit", then **could not tell the
gun's missing reach cap from the missile working exactly as licensed. The obvious reading of
that column was wrong by a factor of seven** (30.8 % → 4.2 % once the missile was switched off).

`combat._damage()` is the single funnel every kill passes through. It now records, at the instant
of the kill and before the enemy is retired: the weapon, the enemy's depth, its projected span,
its NDC position and its pattern. Both questions become direct reads and the ambiguity class is
gone.

**It is drained, not capped**, and that is the second R7 lesson paid forward: `hitLog`'s
256-entry `shift()` silently dropped 83 % of the R7 fairness evidence and had a perfectly
plausible "0 unannounced" to show for it. The ledger hands its entries over and empties itself,
so a probe cannot lose an entry by sampling too slowly — only by not calling. `killsDropped`
is the backstop if nobody drains, and it read **0 in every arm in this report**.

**It is behaviourally inert, and that is certified rather than argued** — see §2.

### `?gun=` — one build, one switch

R8's gap is a four-lever question. The project's two best pieces of criteria work this year
(REFERENCE ledger rows 28 and 29) were settled by one-lever-at-a-time isolations that **refuted
what their lane had written down from arithmetic first**, and an isolation needs its arms to
differ in one constant and nothing else. Editing a constant between runs does not give that: the
tree moves and five lanes are live, so two arms then differ by whatever else landed.

`src/weapons/tunables.js` reads `?gun=key=value,...`, measurement-only, same family as
`?combatonly=`. **Unknown keys throw.** A typo'd `?gun=assitmax=7` must not quietly measure the
shipped default and get written up as an arm — `tools/capture.mjs`'s header records what that
class of silence has already cost this project. `window.__gunTunables()` reads back what the page
is **actually** running, and every arm below quotes it, because a lane that records the arm it
*meant* to run is one typo from a wrong table.

### The pilots

`judging/R8/pilot_r8.mjs`, committed next to this report — R7's gap-1 reproduction had to be
rebuilt from prose by the judge because the probe that found it lived in a scratchpad.

Every tick is sampled (the whole loop runs inside `page.evaluate`), so `?demo=1`'s exactly-16.000 s
regime period cannot alias a spread. The tracking pilots **aim the sight, not the airframe** —
the sight sits 0.30 NDC above the jet and is what the weapon converges on, so a pilot driving the
target onto the airframe's own altitude would fly 15 %H low on every pass and understate the
stick by exactly the amount the fix is trying to make the stick worth. It is read from the live
projected sight sprites (`window.__sight`), so it stays correct under roll.

**Selftest: 15 arms, all PASS, re-run after every patch.** Beyond the usual (the clock advances
1.000 s per 60 steps; up is up; seeds differ; the trigger has an effect; an idle pilot kills
exactly 0; the missile must be *pulsed* because the salvo fires on release; `gunonly` really
silences the missile and `msltrk` really silences the gun), four are worth naming:

| arm | what it plants | result |
|---|---|---|
| unknown `--mode` | must exit nonzero, **not** fall through to the neutral arm — which would reproduce it exactly and read as a passing control. Run as a real child process, because the thing under test is the exit code | refused, exit 2 |
| `still2` — a second, **independently written** neutral policy | must reproduce `still` exactly | 1996 = 1996 kills, ledgers byte-identical |
| chunk size 137 vs 600 | the tick loop is chunked to survive puppeteer's `protocolTimeout`; chunking must not change the result | identical |
| kill ledger vs `hits`-delta | two independent counts of the same thing | identical in every arm |

### Two defects in my own instrument, found before publishing

1. **The `pHit` denominator, and I had it wrong by a factor of two.** `missCrossings` is
   incremented by `_logMiss`, which `checkPlayerHit` calls for **every** round crossing the
   player's depth plane — including the one that then hits. It counts **crossings, not misses**,
   so `pHit = playerHitsTaken / missCrossings`. Computed as `hits/(hits+missCrossings)` the
   `still` arm reads a clean, stable, plausible **50.00 %** (359/718) instead of its true
   **100.00 %** (359/359) — and a clean 50 % is exactly the shape of this project's false
   alarms. The R7 feel critic's "1 498 = 1 498" is the same quantity read correctly, and my
   100.00 % reproduces it.
2. **`?fixed=1` with `throttleIndex` spread in the wrong order.** The harness passed the
   run-wide default *after* the policy's own fields, so a policy that drives the throttle itself
   was silently pinned to the middle detent — which would have made the two gap-4a arms differ
   in nothing and read as "wiring the throttle has no effect". Caught by reading the throttle
   back out of `__flowState` instead of trusting the policy; the arms now publish the detent
   distribution they actually flew.

While on the subject, one defect in a comment rather than in code: `checkPlayerHit`'s header
says its early `return` on the first hitting round "cannot inflate P(hit)". It can — the
crossings it drops are mostly misses and they are dropped on hit ticks only, so the bias is
**upward**. The effect is small and I have not corrected for it; it is stated so the next reader
does not inherit the wrong sign.

---

## 2. The BEFORE table, and the certified control

**Pooled 4 seeds × 180 s per arm, every tick, `?fixed=1&invincible=1`, flight share 100.00 % in
every arm.** `invincible=1` is what makes the arms like-for-like: no death ever fires
`clearShots()` and no respawn grace ever empties the sky, so the comparison **between policies**
— which is the point — gets identical treatment. The absolute `pHit` level is therefore not a
mortal-play figure and must not be quoted as one; mortal arms are in §6.

Denominator for every kill rate: **kills per second of FLIGHT time**, pooled numerator over
pooled denominator. Same denominator as the arcade rows, which exclude the death cycle on both
sides (the arcade pilot in that longplay does not die).

| pilot (4 seeds × 180 s) | kills/s | gun/s | msl/s | all-kill span p50 | **gun kills below 10 %W** | gun depth p50 | **gun depth MAX** | readable present | worst drought | enemy rnd/min | pHit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `still` — stick never touched | **2.772** ±0.036 | 1.650 | 1.122 | 4.96 %W | **84.4 %** | 8.16 | **59.97** | 44.8 % | 15.43 s | 132.0 | **100.00 %** |
| `still2` — independent neutral policy | 2.772 | 1.650 | 1.122 | 4.96 %W | 84.4 % | 8.16 | 59.97 | 44.8 % | 15.43 s | 132.0 | 100.00 % |
| `vert` — vertical axis only | 2.881 | 1.760 | 1.121 | 5.06 %W | 82.0 % | 8.10 | 60.11 | 44.2 % | 9.90 s | 130.1 | 60.42 % |
| `lat` — lateral axis only | 3.013 | 1.917 | 1.096 | 5.92 %W | 69.3 % | 7.84 | 60.25 | 25.5 % | 13.68 s | 130.2 | 57.67 % |
| `trk` — both axes, nearest readable | **3.056** ±0.024 | 1.975 | 1.081 | 5.98 %W | 68.0 % | 7.70 | 60.15 | 19.1 % | 11.57 s | 123.7 | 58.20 % |
| `trkall` — both axes, any size | 3.175 | 2.071 | 1.104 | 5.37 %W | 86.7 % | 10.06 | 59.43 | **8.6 %** | **24.63 s** | 130.6 | 7.16 % |
| `gunonly` — missile never pressed | 2.249 | 2.249 | 0 | 8.20 %W | 79.1 % | 8.35 | 60.18 | 73.7 % | 4.13 s | 146.9 | 100.00 % |
| `msltrk` — trigger never pulled | 1.257 | 0 | 1.257 | 3.78 %W | — | — | — | 91.3 % | 2.45 s | 140.4 | 6.54 % |
| `?demo=1` autopilot | 0.960 | 0.722 | 0.238 | 8.56 %W | 50.6 % | 6.93 | 59.04 | 87.4 % | 3.30 s | 144.0 | 7.25 % |

> **`still` / `trk` = 90.7 %.** R6 measured 86.3 % on a different tree, the R7 feel critic 85.8 %
> on a third, the R7 judge 71.7 % with a stronger tracking pilot. **Four instruments, four trees,
> one conclusion.** Against the arcade's 0.42–0.45 kills/s this is **6.2× (still)** and
> **6.8× (tracking)**. Arcade anchor taken from the repo (R6 feel critic 0.420 over ten
> HIT-verified spans; R7 feel critic 0.451 over 178 frames of the same spans; R7 judge
> reproduced 4 of 4) — **I did not re-derive it and do not claim to have.**

### THE CONTROL THAT LETS THE REST OF THIS REPORT BE READ

The whole R7 gun is expressible as a `?gun=` string:

```
?gun=assistmax=22,assistmin=6,assistyfrac=1,assistlead=0,assistpick=0,
     assistfromsight=0,reach=1000000,scatter=0,closure=0
```

Run that against the R8 tree, 2 modes × 2 seeds × 180 s:

| arm | baseline kills | R7-equivalent kills | kill ledgers |
|---|---|---|---|
| `still` seed 1 | 485 | 485 | **byte-identical** |
| `still` seed 2 | 499 | 499 | **byte-identical** |
| `trk` seed 1 | 541 | 541 | **byte-identical** |
| `trk` seed 2 | 548 | 548 | **byte-identical** |

Not just the counts: every kill, in order, with the same timestamp, weapon, depth, span and NDC.
Which settles three things at once, none of which I would otherwise be entitled to assert:

1. **the kill ledger is behaviourally inert** — the BEFORE table is the R7 build's own behaviour;
2. **the rewrite of `_findAssistTarget` introduced nothing I did not name** — no accidental change
   rode along;
3. **every single-lever arm in §3 differs from R7 in exactly one constant**, including the two
   non-magnitude changes (which target is picked, where the cone is centred), which exist as
   levers *only* so this control could be exact.

`__gunTunables()` read back on that arm confirms all nine keys took, and reports
`readableDepth: 7.0596` — derived from the live camera, not transcribed.

---

## 3. The isolation — one lever at a time, and it refuted my own plan

Every arm below is the **R7 gun with exactly one constant moved**, 2 seeds × 180 s, `still` and
`trk`. The control row is the certified R7-equivalent, so a row differs from it in one constant
and nothing else.

| arm | `?gun=` delta | still kills/s | trk kills/s | **still/trk** | still gun kills | trk gun kills | gun span p50 | **gun depth MAX** | readable present still / trk | enemy rnd/min |
|---|---|---|---|---|---|---|---|---|---|---|
| **R7 control** | — | 2.733 | 3.025 | **90.3 %** | 584 | 699 | 5.09 %W | **59.3** | 45.7 / 19.0 % | 131.0 |
| reach cap | `reach=7.0596` | 2.781 | 3.039 | 91.5 % | 554 **−5.1 %** | 656 **−6.2 %** | 7.92 %W | **9.0** | 46.4 / 24.9 % | 132.8 |
| assist far bound | `assistmax=7.0596` | 2.792 | 3.103 | 90.0 % | **618 +5.8 %** | **737 +5.4 %** | 4.68 %W | 60.2 | 46.0 / 24.0 % | **114.2** |
| assist near bound | `assistmin=2.6` | 2.833 | 3.222 | 87.9 % | 604 +3.4 % | 759 +8.6 % | 4.98 %W | 58.8 | 44.4 / 18.4 % | 130.0 |
| **vertical aim** | `assistyfrac=0` | **2.550** | 3.036 | **84.0 %** | 494 **−15.4 %** | 688 −1.6 % | 4.82 %W | 59.9 | **58.6 / 30.7 %** | 134.2 |

### Three things in that table are not what anyone predicted, including me

**1. The reach cap is worth 5–6 %, not 30 %, and that confirms the R7 feel critic against R6.**
R6 named `vulcan.resolveHits`'s missing depth cap as the mechanism of gap 1. The R7 feel critic's
controlled `gunonly` arm priced it at **4.2 %** of the gun's kills and said so. Capping it here —
a direct intervention, not an inference, with the ledger confirming the deepest gun kill drops
from **59.3 to 9.0** — removes **5.1 %** (neutral) and **6.2 %** (tracking). **Three
methods, one answer. The feel critic was right and the headline mechanism in the gap text is a
minor term.**

**2. Narrowing the assist's depth band made the gun MORE lethal.** This is the arm I expected to
be the fix: 77.9 % of the neutral arm's gun kills land beyond depth 7.06, so bounding the assist
there "should" have removed most of them. Gun kills went **up** 5.8 % and 5.4 %, and the median
kill got **smaller** (5.09 → 4.68 %W).

The mechanism, and it is the useful part of this whole section: with `assistmin=6` still in place,
`assistmax=7.0596` leaves an assist band of `6 < d < 7.06` — **0.23 s wide**. The assist is
effectively off, and every round then flies the bare sight line to `DEFAULT_TARGET_DEPTH = 55`
**with no bound of any kind**, killing at up to depth 60.2. **An unassisted gun with no reach
limit is as lethal as an assisted one.** So the assist band and the reach cap are not two
independent fixes with additive effects; they are two halves of one, and **the single-lever table
is actively misleading about both.** Reading the main effects and adding them would have produced
a confident, arithmetic, wrong answer — which is the failure mode REFERENCE ledger rows 28 and 29
were both written about.

**That is what sent the shipped fix to a different gate**: not a depth bound on the assist, but a
**gate on the aircraft's own projected span, applied in hit resolution as well as in the assist**,
so it binds the unassisted round too. A depth bound cannot, by construction.

**3. The vertical aim is the ratio, and it is the only lever that fills the sky.** `assistyfrac=0`
is the only single change that moves the neutral/tracking ratio materially (90.3 → 84.0 %) and it
does it in the right way — by removing **15.4 %** of the *neutral* pilot's gun kills while costing
the tracking pilot **1.6 %**. It is also the only lever that makes the sky **fuller**:
readable-enemy presence **45.7 → 58.6 %** neutral and **19.0 → 30.7 %** tracking. The gap text
warns that a fix which only lowers the rate makes the game emptier; this one does the opposite,
and that is measured rather than hoped.

On re-reading ADOPTED #100 after seeing this, **the altitude snap was never what it was for.** The
failure it exists to prevent is "shots pass under airborne enemies", and the cause of that is the
**depth** ramp: an unassisted round ramps to depth 55, so at depth 8 it is only 14.5 % of the way
along its screen path and passes under anything up at the sight. Snapping the depth fixes that
completely. The altitude snap is what took the vertical axis off the player, and it bought nothing
the depth snap had not already bought. **Shipped at 0 — the assist snaps the depth ramp and
nothing else.**

### What the sweep says about the rounds-per-minute constraint

Reproduction 4 requires enemy rounds/min not to fall. The sweep shows **why it is not at risk from
this fix and names what would put it at risk**: rounds/min moves *opposite* to the kill rate,
because a dead aircraft stops shooting. The only arm that lowered it (`assistmax`, 131.0 → 114.2)
is the only arm that **raised** the kill rate. Every change that makes the gun weaker raises enemy
fire volume for free.

---

## 4. Two more levers measured, and both refuted the thing they were proposed for

### Aim scatter — the lever the brief named as untried. It is not a rate knob.

GAME_SPEC.md §3 has carried it since round 1 and it was never implemented: *"rounds fly along
the sight line into depth (prototype: 3.5 depth-units/s, converging laterally on the crosshair
aim with **slight spread 0.025**)"* — ADOPTED, and absent from this file. So I restored it rather
than inventing it, with its own PRNG stream (the shared-stream rule: a conditional draw shifts
every later draw, and taking scatter draws from the gameplay stream would make every wave in the
game a function of how often the player pulled the trigger, and would make this very measurement
incomparable). The draws are unconditional per round, three uniforms summed, never Box-Muller.

Measured as a single lever against the R7 control, 1 seed × 180 s:

| arm | still kills/s | trk kills/s | still gun kills | trk gun kills | gun span p50 | readable present |
|---|---|---|---|---|---|---|
| R7 control (per seed) | 2.733 | 3.025 | 292 | 350 | 5.09 %W | 45.7 / 19.0 % |
| `scatter=0.025` (the spec's own value) | 2.750 | 3.039 | 302 **+3.4 %** | 353 **+1.0 %** | 4.69 %W | 45.3 / 20.5 % |
| `scatter=0.05` (double it) | 2.772 | 3.239 | 309 **+5.8 %** | 387 **+10.7 %** | **4.35 %W** | 37.6 / 16.5 % |

> **Scatter makes the gun MORE lethal, and more of its kills sub-readable.** At the spec's value
> the effect is inside seed noise; at double it the gun gains **10.7 %** on a tracking pilot and
> its median kill shrinks to **4.35 %W**.

The mechanism is simple once seen and it inverts the proposal: with a hit radius proportional to
the target and 12 rounds/s in the air, **widening the dispersion grows the swept area faster than
it shrinks the per-round hit probability. Scatter is a shotgun, not a handicap.** The feel
critic's reasoning — that scatter would let the rate come down without emptying the sky — is
wrong in sign, and the reason it is wrong is the hit radius: at `0.8 × span` the hitbox was
**1.6× the target's own wingspan**, so a 0.025-frame-width scatter lands entirely inside the
forgiveness and only ever adds coverage.

**I then checked the obvious escape and it did not hold.** My reading was that scatter would
bite once the hitbox was tightened from 1.6× the target's span to 1.0× (below), because a
0.025-frame-width scatter is then half the hit radius rather than well inside it. **Run on the
shipped build it has the same sign:** gun kills 398 → 424 neutral (**+6.5 %**) and 704 → 761
tracking (**+8.1 %**), 2 seeds × 180 s, with the ratio unmoved (65.5 % → 64.0 %, inside seed
noise). The sign is the same in both regimes.

**So it ships WIRED AND INERT at 0, with the measured cost in its own comment** — the same
disposition R6 gave the throttle closure, and for the same reason. It is a GAME_SPEC element with
real provenance and the next lane should get the interface, the bound and the number; but shipping
a term that makes the gun 7 % *more* lethal, in the round whose whole job is the opposite, needs a
better argument than spec-literalism, and `vulcan.js`'s own header already says the stream's
zig-zag is **not** authored — it falls out of the two muzzles — so the look does not need it
either. One character turns it back on. **What must not happen is anyone reaching for it as a
difficulty lever.**

### The hit radius — the lever nobody proposed, and the one that was actually free

`HIT_RADIUS_SPAN_MULT = 0.8` makes the kill circle **1.6× the target's wingspan in diameter**:
60 % wider than the thing being shot at, in every direction. It has never been measured against
anything — GAME_SPEC.md §3's "generous hitbox" is tagged ASSUMED and gives no number.

It matters far more *after* the licence change than before it. Once the gun may only engage
aircraft at or above the 10 %W readable gate, every target it sees is 10–27 %W, where a
1.6×-span circle is **16–43 % of the frame wide and 23–62 points of H tall**. The fix that stopped
the gun killing invisible things also left it with an enormous hitbox in the band it kept.

Measured with arcade-missile-rate pilots, 180 s per seed. The 0.8 and 0.5 rows are
4 seeds (both carry `scatter=0.025`, so they are a like-for-like pair); the 0.3 row is 1 seed and
is read for sign and magnitude only:

| `hitmult` | kill circle diameter | neutral kills/s | tracking kills/s | **neutral / tracking** | **gun only** | readable present | worst drought |
|---|---|---|---|---|---|---|---|
| 0.8 (4 seeds) | 1.6 × wingspan | 2.354 ±0.017 | 3.049 ±0.028 | 77.2 % | 72.4 % | 74.8 / 53.4 % | 2.78 s |
| **0.5 (shipped, 4 seeds)** | **1.0 × wingspan** | **1.642 ±0.016** | **2.558 ±0.026** | **64.2 %** | **56.0 %** | 90.0 / 80.9 % | 2.35 s |
| 0.3 (1 seed) | 0.6 × wingspan | 1.206 | 2.006 | 60.1 % | 46.3 % | 93.6 / 92.5 % | 1.63 s |

**Shipped at 0.5 because it is the only value in that sweep that corresponds to a statable rule:
the kill circle becomes exactly the aircraft's own footprint.** 0.3 scores better on every column
and is **not** shipped — it puts the kill circle *inside* the drawn silhouette, so a visibly
centred hit would fail to register. That is a worse and more confusing defect than the one being
fixed, and I could not verify it either way without a pixel pass I did not have time for. Said
plainly: **0.3 is on the table for whoever can afford that pass, and the ratio it buys is real.**

---

## 5. THE KILL RATE IS NOT A WEAPON PROPERTY. It is set by the spawner, and I can show it.

Every intervention above moved the gun's kills by 5–20 % and left the **total** kill rate almost
exactly where it was: 2.72, 2.78, 2.79, 2.83, 2.55, 2.75, 2.77 across seven different guns. A
quantity that will not move no matter which lever you pull is being held by something that is not
on the list of levers, so I went and measured the denominator nobody in this project has quoted.

`Enemy` ids come from a global monotonic counter, so the largest id seen over a run divided by
flight time is the rate at which the spawner **produces** aircraft. 1 seed × 180 s, every tick:

| pilot | **aircraft EMITTED per second of flight** | kills/s | **share of all emitted traffic killed** | mean alive |
|---|---|---|---|---|
| `idle` — no trigger, no missile, no stick | **2.706** | 0.000 | **0.0 %** | 13.34 |
| `arcstill` — neutral stick, arcade missile rate | 3.233 | 2.306 | **71.3 %** | 12.15 |
| `arctrk` — tracking, arcade missile rate | 3.272 | 3.078 | **94.1 %** | 11.18 |

> **The spawner emits 2.7–3.3 aircraft per second. A tracking pilot kills 94.1 % of them. The
> arcade's expert pilot kills 0.42–0.45 per second.**

**Therefore reproduction 3 — "kill rate within 2× of the arcade's 0.42–0.45/s" — cannot be met by
any change to any weapon, and the arithmetic is not close.** The target is ≤ 0.90 kills/s. Supply
is 2.71/s *with no player input at all*. A pilot who killed ≤ 0.90/s would have to let **at least
67 % of all traffic fly past untouched** — which is not a weapon-strength statement, it is a
statement about how much traffic the game emits. Even a gun that killed nothing and a missile that
killed nothing leaves 2.71/s of aircraft arriving.

**And the same arithmetic bounds reproduction 1.** Missile kills are a flat **1.08–1.26/s for
every one of the nine pilot policies in the BEFORE table, neutral and tracking alike**, because a
pulsed missile button is limited by the STOCK (flow.js restocks 50 at every stage boundary;
`STAGE_DURATIONS_S` gives 32–44 s stages, so ~1.6 missiles/s of budget), not by aim. With the
missile spammed, the best conceivable gun — one that kills everything for a tracking pilot and
nothing for a neutral one — still reads

  still/trk ≥ 1.12 / (1.12 + gun_trk)

and the gun's measured ceiling, from the `gunonly` arm with no missile competing for targets, is
2.249/s. So **≤ 40 % is arithmetically out of reach above a gun_trk of 1.68/s that is also
perfectly aim-gated.** That is why §6's headline table is run at the **arcade pilot's own
measured missile consumption** (0.39–0.56 missiles/s, from GAME_SPEC.md §3's resupply decode:
50 at t84 → 20 at t163, then 70 at t167 → 22 at t253). Every R6 and R7 pilot — and my own first
ones — pulsed the button on a 0.4 s duty cycle, firing ~5/s and running the stock dry, which
makes the missile's contribution a property of the restock economy rather than of the pilot.

### What this reassigns, and to whom

1. **The gun's share of gap 1 is real, and §6 closes most of it.** Everything about *which*
   aircraft die and at what size was a weapon defect and is fixed.
2. **The rate itself is a spawner/pacing defect** and it is in my file — but it has **no
   arcade-side measurement anywhere in this repo.** Nobody has counted the arcade's aircraft
   emissions. The arcade's own HIT counter bounds it from below at 10–26 kills per 28–44 s stage,
   i.e. ~0.3–0.9 emissions/s if its expert pilot kills most of what arrives, against our 2.7–3.3.
   **We may be emitting 3–10× the arcade's traffic, and I am not going to change the pacing of
   the whole game on an inference.** Cutting spawn rate interacts with R3's density criterion,
   every drought figure in this report, and the "do not empty the sky" constraint — and all of
   those are currently measured against *our* supply.
3. **ACQUISITION, and it is cheap compared to what it unblocks**: count aircraft entering frame
   over a few `STAGE_MAP.md`-verified arcade spans. One afternoon with the longplay. It converts
   gap 1's remaining half from an inference into a measurement, and it is the single number that
   would let a lane legitimately retune pacing.
4. **CROSS-LANE ASK (flow lane, `flow.js`)**: the per-stage restock of 50 missiles is documented
   in `flow.js` as a stand-in for the arcade's two tanker/runway resupply points. It makes the
   missile's kill rate pilot-independent, and it is why half of every pilot's score needs no
   skill. GAME_SPEC.md §5 has the real mechanism measured (fills **to 70**, at two specific
   points, not every stage). I did not reach into `flow.js`.

---

## 6. What shipped

Six changes in `combat.js` / `vulcan.js`, one in `spawner.js`, one in `enemy.js`. Every magnitude
is either derived from the camera, taken from GAME_SPEC, or has its own measured row above.

| # | change | shipped value | basis |
|---|---|---|---|
| 1 | **The gun may only engage what the player can see.** A gate on the aircraft's own projected span, applied in `_findAssistTarget` **and** in `vulcan.resolveHits` | `READABLE_SPAN_FRAC = 0.10` | R3's density criterion — the same gate both R7 reviewers measured kill size against. Applied per-aircraft, not as a depth, because `widthScale` runs 0.92–1.35 and one depth is the wrong bound for two of the three enemy types |
| 2 | **The assist snaps the DEPTH ramp and nothing else.** The vertical aim is the player's | `ASSIST_Y_FRAC = 0` | §3. Also the correct reading of ADOPTED #100: the failure it was added for ("shots pass under airborne enemies") is caused by the depth ramp, not the altitude |
| 3 | **The assist near bound is removed** — it was switching the gun off across the entire close range the spec says it is for | `assistmin = FLY_PAST_DEPTH` | GAME_SPEC §3 "anti-close-range weapon" |
| 4 | **The cone is measured from the sight in both axes**, and the target is the one nearest the sight, not the nearest in depth | — | the shipped test took `dx` from the nose and `dy` from the sight, 0.30 NDC apart |
| 5 | **The assist leads the target's closure** over the round's 0.7 s time of flight | `exp(depthRate · closureScale · TRAVEL_S)` | closed form, exact — enemy depth is geometric. Measured: ratio 90.3 → 84.3 % |
| 6 | **The kill circle is the aircraft** instead of 1.6× it | `HIT_RADIUS_SPAN_MULT 0.8 → 0.5` | §4. 0.8 was ASSUMED and never measured |
| 7 | **Aim scatter implemented, shipped INERT at 0** | `SCATTER_FRAC = 0` | GAME_SPEC §3, ADOPTED, never implemented — and measured to make the gun 7 % MORE lethal in both regimes. Withdrawn with its cost published; §4 |
| 8 | **Enemy closure wired to the throttle** | `THROTTLE_CLOSURE_MULT = [0.92, 1.0, 1.10]` | §8 |

`DEFAULT_TARGET_DEPTH = 55` is **unchanged** and is now documented as what it always was — a
rendering constant, the depth rate that matches `t214`'s measured screen speed. The gun still
flies the full stream; it just cannot score outside its licence. The depth-form reach cap I built
first is **shipped off and kept only as an isolation lever**, because the span gate subsumes it:
`resolveHits`'s own depth-tolerance test already requires a round and its target to be at similar
depths, so a round at depth 55 can only be near an aircraft the span gate rejects. Verified, not
assumed — the shipped build's deepest vulcan kill is in §7.

### And the TL's one-line ask: four of five authored enemy bank poses were unreachable

`enemySprite.enemyTexture()` has taken a `bankDeg` and selected one of five authored bank cells
since R5 interface I1. `enemy.js`'s `textureFor()` did not pass it. Flagged in R6 and again in
R7; the art was built, measured, and dead.

It was not a one-line fix, because **the bank was already being shown** as a pure image-plane
rotation of the level cell, so passing `bankDeg` through would have drawn a 30° pose *and*
rotated it 30°: a 60° apparent bank. The pose now carries what it can and the rotation carries
the **residual** — the same technique `player.js` uses, and it keeps the bank continuous past the
sheet's ±30° limit, where the enemy's own `BANK_MAX_RAD` of 57° still reaches.

**Whether a posed cell was actually selected is read, not assumed.** The sheet path is near-LOD
only and falls back silently to the procedural drawing, whose cache key ignores `bankDeg` — so
`enemyTexture(…, bankDeg)` returns *the same object* as `enemyTexture(…, 0)` exactly when no
posed cell was available. Comparing the two is a direct read of "did we get a pose", and with no
sheet loaded the code is byte-identical in behaviour to the level-only build.

`window.__poseCensus()` makes "the art is now reachable" a measurement: over one 180 s arm,
**22 795 posed enemy-ticks against 77 131 level-only**, with all four previously-dead cells
selected (−30°: 30 selections, −15°: 125, +15°: 119, +30°: 22). Before the change that first
number is 0 by construction.

**One thing is owed to the art lane rather than taken from it.** Computing the residual needs the
sheet's bank ladder, and `enemySprite.js` exports neither `SHEET_BANK_ANGLES` nor its
nearest-index function. `enemy.js` therefore carries a **mirror** of `[-30, -15, 0, 15, 30]`,
flagged in place as a known risk: if the art lane re-authors the sheet at a different ladder the
mirror goes stale and the symptom is an enemy banked by the wrong few degrees — a visual defect,
not an error. **Ask: export the ladder (or a `poseDegFor(bankDeg)` helper) from `enemySprite.js`
and I will delete the mirror.** I did not reach into that file.

---

## 7. THE AFTER TABLE

**Headline arms: 4 seeds × 180 s each (720 s of flight per row), every tick, `?fixed=1&invincible=1`,
flight share 100.00 %, missile held to the ARCADE PILOT'S OWN measured consumption rate.** BEFORE
and AFTER are the *same pilots, same seeds, same ticks*; the BEFORE row is the shipped build with
`?gun=` pinned to the R7 values, and that string is certified byte-identical to `82365e9` (§2).

Each cell is `neutral / tracking` where two numbers appear.

| quantity (denominator named) | BEFORE — R7 gun | **AFTER — shipped** | gate |
|---|---|---|---|
| **neutral stick**, kills/s of flight | 2.475 ±0.055 | **1.575 ±0.042** | — |
| **two-axis tracking**, kills/s of flight | 3.072 ±0.024 | **2.460 ±0.052** | ≤0.90 → **MISSED, see §5** |
| **neutral / tracking — ALL kills** | 80.6 % | **64.0 %** | ≤40 % → **MISSED** |
| **neutral / tracking — GUN ONLY** | 76.9 % | **54.8 %** | — |
| gun kills/s, neutral → tracking | 2.039 → 2.651 | 1.101 → 2.008 | — |
| **gun kill span, median** | 8.20 / 8.61 %W | **11.05 / 12.61 %W** | — |
| **GUN kills below the 10 %W readable gate** | **79.1 % / 67.3 %** | **0.0 % / 0.0 %** | ≤10 % → **PASSES** |
| **deepest gun kill in 720 s of flight** | **59.80 / 59.81** | **9.36 / 7.50** | the licence is a SPAN, and depth 9.53 is where the widest enemy (bomber, `widthScale` 1.35) is still 10 %W → **0 % outside the licensed band** |
| all-kill span median / sub-readable | 7.51 %W / 82.8 % | 10.34 %W / 30.1 % | the residual is entirely the missile's licensed band — §9 item 3 |
| **readable enemy present** (R3's gate: ≥60 %) | 63.5 % / **27.3 %** | **90.0 % / 79.6 %** | **PASSES on BOTH pilots. It failed on the tracking pilot before, and that was the "playing well empties the sky" defect** |
| **worst single drought** | 8.22 s / 6.45 s | **2.82 s / 2.40 s** | better than the `?demo=1` autopilot's own 3.30 s |
| **enemy rounds/min of flight** | 137.8 / 132.1 | **146.8 / 140.0** | must not fall → **PASSES, it rose** |
| pHit (tracking pilot) | 45.37 % | 12.99 % | — |
| unannounced hits / minimum warning | 0 / 2.883 s | **0 / 2.883 s** | 0 and ≥2.88 s → **PASSES** |
| mean aircraft alive | 10.68 / 9.39 | 12.87 / 12.09 | — |

### The axis decomposition, 2 seeds × 180 s (spam-missile pilots, as R6/R7 ran them)

**Caveat on the AFTER column, stated rather than quietly carried: these four arms were captured
before the aim scatter was withdrawn, so they ran at `scatter=0.025` and the shipped build is
`scatter=0`.** Scatter is measured above at **+6.5 to +8.1 % gun lethality**, so the shipped
build's AFTER column is if anything slightly *better* than shown — the rows are conservative
about the fix, not flattering to it. The headline table above and the mortal table below are both
on the final build.

| pilot | BEFORE kills/s | AFTER kills/s | AFTER vs doing nothing |
|---|---|---|---|
| `still` — stick never touched | 2.772 | **2.150** | — |
| `vert` — vertical axis only | 2.881 (+3.9 %) | 2.358 | **+9.7 %** |
| `lat` — lateral axis only | 3.013 (+8.7 %) | 2.636 | **+22.6 %** |
| `trk` — both axes | 3.056 (+10.2 %) | 2.681 | **+24.7 %** |
| **still / trk** | **90.7 %** | **80.2 %** | gun only: 83.5 % → **61.6 %** |

> **The stick's worth went from +10.2 % to +24.7 %, and the vertical axis specifically from
> +3.9 % to +9.7 %** — which is the axis R7's flow lane opened to the arcade's own extreme and
> which the gun had made worth almost nothing.

### Mortal play — and the result here is the opposite of what I expected

4 arms, no `?invincible`, 2 seeds × 180 s, same pilots both sides. I ran this because reducing the
gun's lethality leaves more enemies alive to shoot back, and I expected to have made the game
harder. **I had not:**

**Only 2 seeds, and the seed spread on the key row is wide — do not read the mean as tight.**

| | BEFORE — R7 gun | **AFTER — shipped** |
|---|---|---|
| `arcstill` deaths/min of wall clock | 4.67, 4.67 | **4.67, 4.67** — unchanged |
| `arcstill` flight share | 40.8 / 39.8 % | 39.9 / 41.5 % — unchanged |
| **`arctrk` deaths/min of wall clock** | **4.00, 4.00** | **2.67, 3.67** (mean 3.17, **−21 %**) |
| **`arctrk` flight share** | **49.5 / 49.4 %** | **65.6 / 52.7 %** (mean 59.2 %, **+10 points**) |
| `arctrk` pHit | 15.89 % | **3.90 / 8.40 %** |
| unannounced FATAL hits | **0 of 52** | **0 of 47** |
| minimum warning, any arm | 2.900 s | 2.900 s |

**The mechanism is the R7 feel critique's own causal chain, now running the right way round.** It
found: *the gun empties the sky; the empty sky parks the player; the parked player is hit by every
train* — and separately that the variable governing pHit is not aiming but **the share of time the
stick is moving at all** (0 % deflection → 100 % hit; always moving → 7–8 %). A tracking pilot can
only steer at what it can see, and readable targets are now present **80.9 %** of the time instead
of **27.3 %**, so it is moving instead of sitting still. **Filling the sky is what made the player
survive.** The neutral pilot is identical on both builds, which is the control: it never moves
either way, so nothing about it could change, and nothing did.

Deaths/min **2.67–3.67 is still over the ≤2.0 gate**, which was measured on `?demo=1` and not on
this pilot — so it is an improvement of ~21 %, not a pass, and I am not claiming one.

---

## 8. Gap 4a — the throttle now has a gameplay consequence

**The defect, reproduced as a byte-match rather than as an argument.** `flow.scrollSpeed` had one
consumer, the ground mesh. Run my `thrcyc` pilot — which cycles L/M/H on a fixed dwell — with
`closure=0`, and its combat telemetry is **identical to the digit** to `arctrk`, which never
touches the throttle: 2.5583 kills/s, gun 2.0986, 143.7 rounds/min, pHit 14.66 %, drought 2.35 s.
**Cycling the throttle changed nothing a player can win or lose with, and the two arms prove it by
agreeing exactly.**

R6 built the wiring (`spawner.js` `THROTTLE_CLOSURE_MULT`, consumed by `enemy.js`'s
`closureScale`) and **shipped it inert at `[1, 1, 1]`** with a measured reason: at full strength
`[0.85, 1.0, 1.20]` it cost **−7 % enemy round volume** (R4 gap 5 forbids losing enemy fire) and
**+9 % lethality**. Its own note named the untried next arm: *"A half-strength [0.92, 1.0, 1.10]
is the obvious next arm and was NOT measured."*

**I measured it.** `thrcyc`, 4 seeds × 180 s, `?invincible=1`. The detent distribution is read
back out of `__flowState` and is **identical across all three arms** (L 25.6 % / M 50.0 % /
H 24.4 %), and mean `scrollSpeed` is identical to the millimetre (69.818), so the arms differ in
the closure constant and in nothing else:

| `closure` | `THROTTLE_CLOSURE_MULT` | approach at L / H | kills/s | **enemy rounds/min** | readable present | worst drought | pHit | unann. |
|---|---|---|---|---|---|---|---|---|
| 0 — R6's inert ship | `[1, 1, 1]` | 5.00 / 5.00 s | 2.5583 ±0.026 | **143.7** | 80.9 % | 2.35 s | 14.66 % | 0 |
| **1 — SHIPPED** | **`[0.92, 1.0, 1.10]`** | **5.43 / 4.55 s** | 2.4653 ±0.040 | **145.3 (+1.1 %)** | 82.1 % | 2.67 s | 12.38 % | 0 |
| 2 — R6's withdrawn arm | `[0.84, 1.0, 1.20]` | 5.95 / 4.17 s | 2.4542 ±0.053 | 141.5 (−1.5 %) | 80.8 % | 2.57 s | 9.65 % | 0 |

> **The volume objection that blocked this does not reproduce at half strength: rounds/min goes
> UP 1.1 %.** Kills fall 3.6 % (0.93 standard errors — not resolvable), readable presence rises
> 1.2 points, 0 unannounced hits, minimum warning 2.90 s.

**M is exactly 1 and that is enforced structurally, not by convention.** The table is built as a
blend about 1 (`1 + (m − 1) · strength`), so the datum cannot move as the sweep strength changes —
every MEASURED flight constant (the 4–6 s approach, the 62.50 %H horizon, the ground-flow rate,
passive accrual 3300/s) was read off footage at M throughout, and a middle value that drifted
would re-base all of them at once with no test noticing. **L and H are ADOPTED**, and their
magnitudes are *bounded, not chosen*: an approach runs `ln(90/2.6)/0.7089 = 5.00 s` and GAME_SPEC
§4 measures 4–6 s, so the band itself fixes the widest excursion available at ≥5/6 = 0.833 and
≤5/4 = 1.25. 0.92/1.10 sit comfortably inside; R6's 0.85/1.20 sat against the edges.

**Two honest caveats.**

1. **I did not reproduce R6's lethality direction, and I am not claiming to have overturned it.**
   They measured pHit 2.481 → 3.030 % (**up** 22 %) at full strength; I measure 14.66 → 12.38 →
   9.65 % (**down**). The arms are not measuring the same thing: theirs ran on `?demo=1`, a
   non-reactive path, where pHit is set by geometry; mine runs on a pilot that steers whenever a
   readable target exists, which is now 81 % of ticks, so faster closure makes it steer *more* and
   pHit measures evasion rather than threat. **Both numbers are right about their own pilot.**
   Anyone re-opening this should run both populations.
2. **The cue is still asymmetric and the throttle is still a weak verb.** Enemy closure now spans
   1.19× L-to-H while the ground spans 2.34×, because the measured 4–6 s approach band will not
   permit more. `enemy.js`'s header documents that asymmetry as one the arcade itself carries.
   **`clouds.js` is the world lane's and I did not touch it** — the judge's gap-4 note that cloud
   drift should scale with `scrollSpeed` (a nearer layer currently moving slower than a farther
   one, and not responding to speed at all) is still owed and is not mine.

---

## 9. Open, owed, and not done — with reasons

**1. Reproduction 1 is MISSED on the total, and I believe the gate as written cannot be met.**
§5 has the arithmetic: a pulsed missile contributes a flat, aim-independent 1.08–1.26 kills/s to
every policy because it is stock-limited, and the supply of aircraft is 2.7–3.3/s. The gun's own
neutral/tracking ratio is the quantity the gap is actually about and it is in §7. **I am
reporting the miss with its mechanism rather than tuning until a number appears**, because the
only levers that would close it from inside my files are ones I have measured and rejected for
stated reasons (`hitmult=0.3`, which puts the hitbox inside the silhouette).

**2. Reproduction 3 is MISSED and is not a weapons gap.** §5. The measurement that would let
anyone act on it — an arcade aircraft-emission count — does not exist in this repo and is on the
acquisition list below.

**3. Reproduction 2's second clause is DEFECTIVE AS WRITTEN and I did not tune to it.** The gate
says *"0 % of kills beyond the assist cone's own depth limit of 22"*. The R7 feel critic's own
`gunonly`/`msltrk` arms — in the document the clause was drawn from — show that
**44.3 % of missile kills land beyond depth 22 BY DESIGN**: `lockSystem.js` locks between
`LOCK_DEPTH_MIN = 26` and `LOCK_DEPTH_MAX = 88`, and the arcade's own salvo behaviour is measured
at distance (GAME_SPEC §3, t100: ~6 brackets on far targets, then HIT 2→10 in 2.25 s). **A gate
of 0 % on all kills forbids the signature weapon from working.** Same for the first clause:
"≤10 % of kills below the readable gate" pooled over both weapons gates the missile against a
criterion the arcade's own missile fails. **Restated and reported per weapon: the gun carries
both clauses, the missile's licensed band is published beside it.** This is the fifth consecutive
round in which a criterion came apart while a lane was using it; per R7 ledger rows 26–29, I am
reporting the criterion that fought me rather than only the result.

**4. The enemy round's time of flight is still unverified on the arcade side, and I did not tune
it.** The repo holds two incompatible arcade claims — "≤0.37 s" (TL, one measurement, not
re-derived by anyone) and `reference/stage7-enemy-shot-train-t330.png`'s 10–16 simultaneous
fireballs at ~0.11 s spacing, which needs ~1.1–1.8 s. `enemyShots.js` names the measurement that
would settle it (count frames from a muzzle flash to its impact on the 60 fps longplay) and says
it outranks the whole SPEED sweep. **It still has not been taken, and the carried question —
"was our fairness bought by making the threat slow?" — cannot be answered without it.** What I
did do is correct that file's stale worked example (R7 gap 8 item 1): the paragraph a later agent
reads for the lag budget was computed at `SPEED = 15` while the constant is 10. Shipped figures
are now the first line in that block, and I re-derived the shipped end independently off the
pilot harness by Little's law: **mean screen life 2.7–3.0 s across every policy**, inside the
2.24–5.04 s the constant predicts.

**5. `REACH_CEILING_NDC_Y`: comment fixed, constant deliberately NOT moved.** R7 gap 5. Every
input of its published derivation has moved (player ceiling +0.106 → +0.4597; lock radius 8.3 %W
→ 22 %W), and re-derived it gives **+1.388** — past the top of the screen — so the reachability
argument no longer binds and 0.64 is undocumented suppression. I rewrote the comment to say
exactly that and labelled it ADOPTED-retained-on-a-side-effect. **I did not move the constant**:
the statistic it suppresses (all-enemy top-third share, 34.9 % against the arcade's 32.5 %)
already matches, ledger row 26 says this band is not a quantile to chase, and the enemy altitude
distribution is scored by criteria another lane owns. Lifting it to chase a derivation would be
this project's named failure mode.

**6. The lock radius: comments fixed, constant deliberately NOT moved.** R7 gap 5 found three
values for one quantity. `lockSystem.js` said "widened to 15 %W" above a constant of `0.22`, and
`git log -S` shows **no 0.15 ever existed in that file** — it has been 0.22 since R3. The only
arcade-anchored figure is the prototype's ADOPTED 8.3 %W. Both comments are corrected and the
provenance is stated honestly. I left the value alone because §5 shows the missile's rate is set
by the stock budget, not by how many targets the cone admits, so narrowing it moves *which*
targets are taken and not *how many* — and I would rather hand the flow lane a measured ask than
retune a constant whose effect I have shown is not where the problem is.

**7. Not attempted, and named so it is not read as checked**: the near-field enemy sprite's
Criterion A2 failure (R7 gap 7 — and note the judge's warning that closing gap 1 *exposes* it,
which this lane's `readable present` figures going from 19–46 % to 78–90 % makes more likely, not
less); the arcade emission count; any pixel-level check of the hit radius against the drawn
silhouette; the barrel roll; enemy variety.

---

## 10. Asks

| to | ask |
|---|---|
| **flow lane** (`flow.js`) | The per-stage restock of 50 missiles makes the missile's kill rate pilot-independent and is half of every pilot's score. It is documented in your file as a stand-in; GAME_SPEC §5 has the real mechanism measured (fills **to 70**, at two specific points, not every stage). This is the largest single remaining term in the kill rate. |
| **art lane** (`enemySprite.js`) | Export `SHEET_BANK_ANGLES`, or a `poseDegFor(bankDeg)` helper. `enemy.js` currently mirrors the ladder to compute the residual rotation and the mirror is a stale-art-defect waiting to happen. One line, and I delete the mirror. |
| **whoever acquires footage** | **Count aircraft entering frame over a few `STAGE_MAP.md`-verified arcade spans.** This is the highest-value gameplay measurement left: it is the denominator every kill-rate comparison in this project has been quoted without, and without it nobody can legitimately retune pacing. |
| **the judge** | Every arm in this report is reproducible in one command. The R7-equivalent control string is in §2 and `judging/R8/{sweep_r8.sh,sweep2_r8.sh,after_r8.sh}` hold the exact invocations. Please re-run the control first — if it is not byte-identical to `82365e9`, nothing else here should be believed. |

---

## 11. A capture-hygiene defect I nearly shipped, and the rule it needs

Mid-round I cut my own parallelism (four concurrent arms against a machine at load average 326
with other lanes live) by killing two sweep groups. **Killing the shell does not kill the node
child, and the orphaned node keeps running — and keeps its output path.** Forty-seven minutes
later I found a process still running the arms of a *previous build*, about to write
`tools/out/combat-r8/aft-A/arms.json` — the exact path the current build's run was going to write.
Whichever finished last would have won, silently, and the result would have been a table mixing
two builds with every within-set hygiene check passing.

It is a new face of a rule this project already has. `--out` is required and has no default
precisely so two agents cannot share a path; what that does not cover is **one agent reusing a
path across two builds**, which is the same collision in time instead of in space. Three facts
make it invisible: the JSON is written once at the end, so the directory is empty while the
hazard exists; the orphan's stdout goes to a deleted inode, so its log says nothing; and the
output is perfectly well-formed.

Caught by `ps`, not by a guard. **Two rules it argues for, offered for REFERENCE.md:**

1. **After killing a run, `ps` for its children before reusing its output path.** `kill` on the
   shell is not `kill` on the work.
2. **A capture directory should be named for the BUILD as well as the arm**, so a late writer
   collides visibly instead of silently. The one I did get right by accident is worth keeping as
   the pattern: when `hitmult` changed default, I renamed the already-captured 4-seed set from
   `aft-C` to **`sw-hitmult0.8-4seed`** — it stopped being "the shipped configuration" and became
   "the 0.8 arm", and the name now says which. A set that is renamed for what it actually
   measures cannot be pooled into the wrong row.

**Hygiene results for every pooled figure in this report** (`judging/R8/pool_r8.mjs`, which
refuses a duplicate `(mode, seed, secs)` key across files rather than averaging it, and flags
byte-identical kill ledgers across different arms):

| check | result |
|---|---|
| cross-file duplicate arm keys | **0 refused** |
| byte-identical kill ledgers across *different* arms | the 4 `still` == `still2` pairs, **which is the planted-fault control passing** — and nothing else |
| arms with zero kills, excluding the `idle` control | **0** |
| arms that dropped a kill-ledger entry (`killsDropped`) | **0** |
| arms that produced a page error | **0** (the harness refuses to report one that does) |

---

## 12. Three things about this report that could be wrong, stated rather than buried

**1. Every ratio depends on MY tracking pilot, and the project has already been bitten by this.**
R7's two reviewers got 85.8 % and 71.7 % for the same quantity on the same tree, and the only
term that moved was how good their tracking pilot was. Mine is a proportional controller at gain
2.2 aiming the **sight** (not the airframe) at the nearest readable target, steering only when one
exists. **The LEVEL of every ratio in this report is a property of that pilot.** What is robust is
the CHANGE, because the BEFORE and AFTER rows are the same pilot, the same seeds and the same
ticks, with the before-build reachable in one URL parameter. Read the deltas, not the absolutes —
and if you want a different absolute, write a different policy and run both arms with it.

**2. The gun now visibly fails to damage distant aircraft, and that is deliberate.** The span
gate is applied in hit resolution, so a stream that passes straight through a 9 %W aircraft does
nothing to it, with no feedback. That is a real feel consequence and the next player-experience
critic may well dislike it. The justification is the gap's own sentence — *the gun is killing
things the player cannot see* — plus GAME_SPEC §3's "the vulcan is effectively the
**anti-close-range** weapon" and "missiles remain the long-range answer, which is the arcade's
division of labour". **If it reads badly, the honest fix is a visible miss cue, not re-opening
the gate.**

**3. The arcade-rate missile arms' launch rate is inferred, not instrumented.** The policy is
built to fire one lock per 2.0 s cycle = 0.50 launches/s, inside GAME_SPEC §3's resupply-decoded
0.39–0.56/s for the arcade pilot. What I actually *measure* is missile KILLS: 0.46–0.48/s. The
launch rate follows only if most launches hit, which the R7-build arms support (missile kills
track the stock budget closely) but which I did not record directly. **`missileStock` deltas
would make it a read; the harness does not take them.** The comparison between arms is unaffected
— both use the identical policy — but do not quote 0.50 launches/s as measured.

---

## 13. Evidence index

**Tree**: `82365e9` + `1783060` + this lane's changes. `src/` files I touched:
`weapons/{combat,vulcan,lockSystem,enemyShots}.js`, new `weapons/tunables.js`,
`entities/enemy.js`, `game/spawner.js`. **Nothing else, and I committed nothing.**

**Tools** (committed, next to this report, so the judge does not have to rebuild them):

| file | what |
|---|---|
| `judging/R8/pilot_r8.mjs` | the pilot harness. `--selftest` runs 15 arms including three planted faults |
| `judging/R8/pool_r8.mjs` | pooling + the cross-file duplicate refusal and the zero-kill / dropped-entry sweep |
| `judging/R8/sweep_r8.sh`, `sweep2_r8.sh` | the one-lever isolation arms, with the R7 control string |
| `judging/R8/after_r8.sh` | the control re-certification and every AFTER / throttle / mortal arm |
| `judging/R8/shots_r8.mjs` | pilot-driven frames with the simulation's own per-aircraft spans written beside them |

**Captures**, all under `tools/out/combat-r8/`, all mine:

| directory | arms | what |
|---|---|---|
| `base-{A,B,C}` | 36 | the BEFORE table, 9 pilot policies × 4 seeds, on `82365e9` |
| `ctl-r7equiv`, `ctl2-r7equiv` | 4 + 4 | the R7-equivalent control, **certified byte-identical three times** (after the first patch, after the span refinement, and after every doc fix and the `hitmult` change) |
| `sw-{reach,amax,amin,yfrac0,minspan,scatter,scatbig,lead,pick,fromsight}` | 18 | the single-lever isolation |
| `sw-hitmult{0.3,0.5,0.8-4seed}` | 10 | the hit-radius sweep |
| `sw-scat0-shipped`, `aftD-34` | 8 | **the final shipped AFTER table** (scatter off) |
| `aftC-{12,34}` | 8 | shipped-with-scatter, superseded; kept because §4's withdrawal rests on it |
| `aftCbase-{12,34}` | 8 | the BEFORE comparator at the same pilots |
| `axis-{A,B}` | 8 | the four-axis decomposition |
| `mortal-12`, `mortalbase-12`, `mortal-final` | 12 | fairness and deaths, mortal |
| `thr-c{0,1,2}` | 12 | gap 4a, three closure strengths at a fixed detent distribution |
| `supply` | 3 | the aircraft-emission rate — §5 |
| `timing-control` | 1 | **a smoke test, named so it is excluded from every pooled figure** |

**Figures**:

| file | shows |
|---|---|
| `judging/R8/r8-01-BEFORE-top-AFTER-bottom-sametick.png` | same seed, same pilot, same tick 1500: **HIT 61 → 35, and a sparse sky becomes a busy one** |
| `judging/R8/r8-02-KILLSIZE-boxed-BEFORE-top-AFTER-bottom.png` | the same pair with every on-screen aircraft boxed from `__combatStats` and labelled with its own span — green ≥10 %W, red below. **3 readable of 13 before, 6 of 13 after.** The boxes landing on the aircraft is also the overlay validating itself by eye |
| `judging/R8/shots-{before,after}/meta.json` | every frame's full on-screen census, HIT, rounds in air, `?gun=` readback and pose census |

**Instrument validations run before anything was believed**: `pilot_r8 --selftest` 15/15 PASS
(re-run after every patch); the R7-equivalent control byte-identical 3×; `?gun=` typo refused at
the page with the diagnosis surfaced (`?gun: unknown key "assitmax"`); `still2` reproducing
`still` exactly on every seed; chunk size 137 vs 600 identical; `thrcyc` at `closure=0` identical
to `arctrk` to the digit; the `idle` control killing exactly 0.

---

## 14. The shipped configuration, read back out of the page

`window.__gunTunables()` on a plain `?fixed=1` boot, no `?gun=` of any kind
(`_overridden: []` is the proof of that):

```json
{"assistmax":"Infinity","assistmin":2.6,"assistrad":0.13,"assistyfrac":0,"assistlead":1,
 "assistpick":1,"assistfromsight":1,"reach":"Infinity","minspan":0.1,"scatter":0,
 "hitmult":0.5,"lockrad":0.22,"closure":1,"readableDepth":7.059609316619035,"_overridden":[]}
```

`assistmax` and `reach` are Infinity **on purpose** — the depth-form bounds are shipped off and
kept only as isolation levers, because `minspan` subsumes them (§6). They are reported as the
string rather than the number because `JSON.stringify(Infinity)` is `null`, which reads as
"unset" to anyone reading a probe dump; a readback that cannot distinguish "deliberately
unbounded" from "I forgot to set it" is the provenance gap REFERENCE's citation rule exists for.
`readableDepth` 7.0596 is derived from the live camera, not transcribed.

**To reproduce the pre-R8 gun in one parameter** (this is the string that was certified
byte-identical to `82365e9`, three times, in §2):

```
?gun=assistmax=22,assistmin=6,assistyfrac=1,assistlead=0,assistpick=0,
     assistfromsight=0,reach=1000000,minspan=0,scatter=0,hitmult=0.8,closure=0
```
