# R8 — combat lane: making the gun need the player

**Gap**: R7 gap 1 (rank 1), plus gap 4a (the throttle has no gameplay consequence) and two
documentation defects inside my own files that the R7 judge ranked (gap 5, gap 8 item 1).

**Files owned and touched**: `src/weapons/{combat,vulcan,lockSystem,tunables}.js`,
`src/entities/enemy.js`, `src/game/spawner.js`. New: `src/weapons/tunables.js`,
`judging/R8/{pilot_r8.mjs,pool_r8.mjs,sweep_r8.sh}`.
**Nothing else under `src/` was touched.**

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
