# R41 aiming2 — "aiming" again, after the hold/release model landed

Owner, listing three focus areas: **aiming**. R40 shipped the keyboard ramp; R40b shipped
HOLD-to-lock / RELEASE-to-fire and put the plain crosshair back. Both of those were the
things the owner NAMED. This lane asks the thing underneath: when you put the sight on an
aeroplane, does *that* aeroplane die?

Answer, before any constant was read: **no, and the reason is that the game would not let
you lock the aeroplane you were looking at.**

---

## 1. WHAT MY HANDS FELT — before touching any constant

Session `r41aim/s7a`, seed 7, 12 turns, ticks 0→753 (~12.5 sim-seconds), no invincibility,
selftest 8/8 first. Evidence frames copied into this directory.

1. **The lock bracket goes to something I cannot see.** Turn 12
   (`pre-bracket-on-a-speck-enemy-on-my-nose.png`): a big white four-corner box sits at
   screen (315,215) around a dot roughly six pixels across — the bracket is the biggest
   aircraft-shaped thing in that frame and there is no aircraft in it. Meanwhile an enemy
   fighter is drawn **across my own nose** at (350,460) and a second one fills the bottom-left
   corner. Neither is bracketed.
2. **Often nothing is bracketed at all.** Turn 11 (`pre-two-big-enemies-no-bracket.png`): two
   enemies, huge, dead ahead, 120 px and 330 px from my sight. No bracket on either.
3. **Holding the button gets me one lock, not a salvo.** 40 ticks of holding → `locks 1`.
   120 ticks → `locks 2`. The arcade's own frames show four to six brackets up at once.
4. **The release works and the kill arrives three seconds later.** Turn 9: released with 2
   locks, `stock 49→47`, two missiles away. They were still in flight 90 ticks later, and
   still in flight 90 ticks after that; the kills landed on turn 11 — about **3.5 s** after
   I let go, by which time I had no idea which press they belonged to. The trail swallowed
   my jet for most of it (`pre-salvo-trail-swallows-jet.png`, panels 3–6 — my own aircraft is
   not visible).
5. **Gun kills erupt on my own airframe.** Turn 3: five-panel fireball at my right engine
   root while I was pointed up-left.

Items 4 (the trail) and 5 are dealt with in §5 — one belongs to another lane and **one of
them I withdrew after checking it against the arcade.**

---

## 2. ROOT CAUSE — proven before a line was edited (DIAGNOSIS GATE)

`judging/R41/aiming2/near_lock_diag.mjs`. It flies the policy the owner flies — **steer at the
biggest aircraft on screen, hold the button** — and per tick records what that aircraft is and
what the game bracketed instead. All of it from `__combatStats` / `__sight` / `__lockState`;
no constant read from a source comment.

Seed 7, 25 s, 643 ticks with a real (≥10 %W) aircraft on screen:

| | the aircraft I was pointing at | what the game bracketed instead |
|---|---|---|
| drawn size | **19.9 %W** | **3.3 %W** |
| depth | 4.2 | 33.4 |
| distance from my sight | 0.083 — *inside* the aim cone | 0.160 — twice as far |

**It carried the bracket on 2.8 % of those ticks.** On 42 % of them nothing was bracketed.

### The mechanism

`LOCK_DEPTH_MIN = 10` and `LOCK_DEPTH_MAX = 88`. Converted to what the player sees — drawn
span against depth, median over 3600 ticks, seed 7:

```
depth    4      6      8     10     16     33     88
span   18.3%  12.0%  8.9%  7.2%  4.4%  2.0%  ~0.8%     of frame width
```

So the lockable band was **7.2 %W down to 0.8 %W**: it began only *after* an aircraft had
shrunk below the size you can pick out and point at, and it ran out to an **eight-pixel dot**.
Every aircraft a player actually aims at was inside the near edge; the only thing left to
offer was a speck near the vanishing point.

### Both edges were defended by things that are not true

- **The near edge's argument is stale.** Its comment computes a homing dead zone from
  `HOMING_DELAY_S = 0.3` in `missiles.js`. The live value is **0.08** (R34 changed it; nobody
  re-derived the near edge). At 0.08 s the seeker turns at depth ~5.6, not ~8.4.
- **The far edge was never measured at all** — its note says only "where an enemy is still a
  small dot".
- **And the arcade locks closer and not as far as we did.** This file's own bracket-geometry
  note measures the arcade's bracket on two targets: a distant enemy at **1.9 %W** (t116) and
  a close one at **8.8 %W** (t100.75). I then looked at the footage directly
  (`ab2-longplay-60fps.mp4`, 60 Hz consecutive decode t99–104): at t99.17 the arcade has a
  **cluster of four or five brackets** on enemies of about **4–6 %W**, up and left of the nose,
  while two 19 %W enemies on the right carry **no bracket at all**. The arcade brackets the
  mid-distance aircraft you can still see, not the close ones and not specks.

---

## 3. WHAT SHIPPED

| File | Change |
|---|---|
| `weapons/lockSystem.js` | `LOCK_DEPTH_MIN` 10 → **6**, `LOCK_DEPTH_MAX` 88 → **35**, `LOCK_BREAK_DEPTH` 6 → **4** |
| `weapons/lockSystem.js` | `?lockdmin=` / `?lockdmax=` / `?lockbreak=` sweeps (measurement-only, self-read URL params — same family as R40's `?lockaimr=`) |
| `weapons/combat.js` | the kill ledger records the victim's `id` |
| `tools/aim_lock_probe.mjs` | release cadence + **designated-kill rate** (§4) |

The shipped band is **12.0 %W … 1.9 %W**. Both edges are now arcade-anchored: the far edge is
exactly the arcade's smallest measured bracket (1.9 %W, t116) and the near edge is one notch
more generous than its largest (8.8 %W, t100.75), which is the direction the owner's usability
directive points. `LOCK_BREAK_DEPTH` moves with the near edge because at 6 and 6 they
coincided and every lock taken at the edge would enter its hold on the tick it completed.

**Not changed, deliberately:** `LOCK_ACQUIRE_S` 0.42 (the "earned" beat the owner asked for in
R31), the aim cone, the sight glyph, every rate in `player.js`.

### The band is not a blink

Measured before trusting it: per aircraft that appears on screen (seed 7, 7200 ticks, 84
aircraft), the median is **3.35 s on screen, of which 2.28 s is inside the new band** — about
five acquire beats. Only 3 of 84 never enter it. The geometry was never the problem; the
constants were.

---

## 4. MEASURED — and the guard that could not press the button

`tools/aim_lock_probe.mjs` reported **0 launches** before this lane touched it. That was an
instrument mismatch, flagged by the TL in the R40b commit and confirmed here: its pilot HELD
the missile button for the whole run and never let go, which fired fine under R25's
gather-timeout and fires nothing under R40b's release model. **A guard that cannot press the
button the way the game is played cannot gate the game.** Repaired: the pilot now holds until
a lock takes (or 1.5 s of patience runs out), then releases.

It also got the metric the complaint actually asks for. Launch count says a missile left the
rail; it says nothing about whether aiming chose the victim. The pilot now records the id of
the aircraft it was pointing at when it released, and the kill ledger says which aircraft
died — **`designatedKillRate`**.

Aiming pilot, **jitter 0.5** (a hand-flown waver), 20 s, seeds 7 / 4 / 11, pooled:

| | launches | missile kills | designated kills | **rate** |
|---|---|---|---|---|
| pre-R41 (`lockdmin=10&lockbreak=6&lockdmax=88`) | 48 | 25 | 14 / 40 | **0.350** |
| R41 shipped | 43 | 25 | 14 / 33 | **0.424** |

And on the naive "point at the biggest aircraft" diagnostic of §2, same seed and operator:

| | pre-R41 | R41 |
|---|---|---|
| my target carries the bracket | 2.8 % | **13.5 %** |
| what it brackets instead — size | 3.3 %W | **7.3 %W** |
| — depth | 33.4 | **10.0** |
| — distance from sight | 0.160 | **0.087** (inside the aim cone) |
| ticks with nothing bracketed | 269 | **163** |

The far-edge sweep in isolation (jitter 0.5, three seeds pooled): 88 → 0.351, 50 → 0.361,
**35 → 0.412**, 26 → 0.462. **Launches are flat across the whole sweep (45–47)**, so R27's
"a naive hand must still get a missile" is not regressed at any arm.

**26 measured better than the 35 I shipped and I did not take it.** 35 is the arcade's only
anchor for this quantity; 26 is 12 % more on a three-seed statistic with nothing behind it.
Recorded as the next notch if the complaint survives — not taken on a number alone.

**What the far edge cost, reported rather than only what it bought:** median missile-kill
depth 8.4/17.6/10.6 → 10.6/14.5/13.5 and median victim span 0.084/0.054/0.069 →
0.067/0.069/0.069 across the three seeds. Kills did not move closer or get smaller; the far
bin was not where they were coming from (consistent with STATUS's standing "far-bin kills
3–5 %"). So this change does not deepen that open gap.

**Instrument limits, stated.** The playtest harness feeds an ANALOG stick straight past
`src/core/input.js`, so nothing I felt with my hands this round exercises the keyboard ramp
the owner is actually using — every hands-on claim here is about the analog path. The probes
drive scripted pilots and decide every tick; they are deaf, and strips are not video.

---

## 5. TWO LEADS I DROPPED, AND WHY

- **"Gun kills erupt on my own airframe" — WITHDRAWN, it is arcade-correct.** The gun answers
  the sight: on the naive-aim diagnostic, **91.7 %** of gun kills were the aircraft the pilot
  had designated, median kill distance from the crosshair **0.035**, median victim **9.8 %W**.
  The fireballs look like they are on my wingtip because the sight sits just above the nose
  and our jet is large — and the arcade's own frame at t100.75+1.75 s has the player's jet
  buried in two fireballs at its wing roots with 20 %W enemies overlapping the airframe. Same
  picture. I was about to call our jet too big as well: the reference says the arcade's jet
  spans **330 px of 1028 = 32 %W** (t175, REFERENCE "Player jet"), and ours measures ~29–34 %W.
  Both withdrawn before any sprite was touched.
- **"I cannot see the sight" — not mine to fix.** The owner rejected R40's dark backing
  ("its ugly") and size is not a lever. The arcade's sight is equally small and equally lost
  against its own airframe in both frames I looked at. No action.

---

## 6. CROSS-FILE REQUESTS (not reached into)

- `weapons/tunables.js` — fold `lockdmin` / `lockdmax` / `lockbreak` / `lockaimr` / `lockaim`
  into the `?gun=` KNOWN set. Carried forward from R37 and R40, now five keys deep.
- `game/spawner.js` lines 329 / 485 still hand-copy `SIGHT_NDC_Y_OFFSET` as **0.30**; it has
  been 0.16 since R40. Open since R40.
- `weapons/missiles.js` — the comment block above `MAX_TURN_FRAC_PER_S` still derives its
  authority budget from `HOMING_DELAY_S = 0.3`, which that same file sets to **0.08** eighty
  lines later. The number this lane tripped over; the derivation should be re-run or the
  comment corrected.
- README — document `?lockdmin=` / `?lockdmax=` / `?lockbreak=`.

---

## 7. WHAT MY HANDS FELT AFTER — same protocol, same instrument

Session `r41aim/post19`, seed 19, no invincibility, selftest 8/8 first. I deliberately played
a FRESH seed rather than replaying seed 7: the seed-7 replay came back **byte-identical
through all twelve turns**, because the particular aircraft I happened to point at in that
session were at depth 2.5–4 — already past the missile, inside any sane near edge, and not a
lock bug at all. Reported rather than buried: **one of my own §1 evidence frames is weaker
than I first read it.** The 31 %W enemy "across my nose" in
`pre-bracket-on-a-speck-enemy-on-my-nose.png` is a fly-BY, not a target; what is wrong in that
frame is only the other half — the bracket on the invisible dot.

Four things, in the order I noticed them:

1. **The brackets are on aeroplanes now.** Turn 5 (`post-four-brackets-on-real-aircraft.png`):
   four brackets up at once, three clustered below-right of my nose and one cyan at top-right,
   **each one squarely around an aircraft I can see**. Put it beside the arcade's own frame
   (`arcade-bracket-cluster-t99.png`, t99.17, a cluster of four or five brackets on 4–6 %W
   enemies up-left of the nose) and the composition is the same picture. Put it beside the
   pre-fix frame and that one is a single loud box around six pixels of empty sky.
2. **Holding racks up a salvo at the arcade's rhythm.** `locks` went 1 → 2 → 3 over three
   half-second turns while I held and swept. Before, 40 ticks of holding gave me 1 and 120
   ticks gave me 2.
3. **Release converts, and fast enough to connect it to the press.** Turn 5→8: released with
   3 locks, three missiles away, and **hits 0 → 3 within 1.6 s**
   (`post-salvo-converts-in-1.6s.png`). Before, a 2-lock release took ~3.5 s to resolve,
   through a trail that covered my own aircraft, onto targets I never saw. Second engagement,
   a single enemy: 35 ticks of hold → 1 lock → release → that one dead inside a second.
4. **The thing I withdrew, I withdrew by looking.** `arcade-fireballs-on-own-airframe-t100.75.png`
   is the arcade with its player jet buried in two fireballs at the wing roots, 20 %W enemies
   overlapping the airframe, and no bracket on any of them. That is the frame I was about to
   file as our defect.

**Honest residuals.** The missile smoke is still a large pale billow beside the jet — better
than §1's "swallows it", and `effects/smoke.js` is another lane's this round, so I left it
alone. And a sweeping, non-deliberate stick still converts much slower than a deliberate one
(hits 4 → 8 over ~6 s of natural play against 3 kills in 1.6 s when I actually aimed), which
is the aiming skill working as intended rather than a defect — but it is the arm to watch if
the owner's next sentence is still "aiming".

---

## 8. GATES

- `tools/combat_probe.mjs --ticks 60 --url-params "demo=1&seed=7"` — prints state JSON after
  every save, checked at each one and again at the end.
- `tools/playtest.mjs selftest` — **8/8**, 0 page errors.
- **R27 guard**, now actually able to fire (§4): `aim_lock_probe --seed 7 --jitter 0.5
  --secs 18` → **13 launches** (floor 8), firstLockTick **84** (R40's baseline exactly),
  hitRateCrossings **1.00**, designatedKillRate 0.545, 0 errors.
- **Fairness** `--seeds 4,5,6 --seconds 180`: deaths/min pooled **1.222** (band 1.200–1.466 —
  inside, near the floor; R40 was 1.4447), **0 unannounced fatal hits**, 11 fatal hits total.
  Attribution caveat, stated rather than hidden: this probe drives the SCRIPTED demo pilot and
  three files from other lanes (`effects/smoke.js`, `weapons/missiles.js`,
  `tools/art/sheets/enemy-mig.js`) are modified in this tree, so the shift from 1.4447 is not
  isolated to this lane.
