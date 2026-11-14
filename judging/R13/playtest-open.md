# R13 opening playtest — focused confirmation of the combat gap list

**Agent**: playtest-r13-open (fresh context). **Build judged**: committed HEAD
(`5ecb8bb`/`3530453` R12-closed tree — no stash, no src edits by me; build lanes'
in-flight work NOT judged). **Instrument**: `tools/playtest.mjs` (selftest 8/8 before
first use). **Sessions**: seed 7 (~34 turns, ~70 sim-s) and seed 19 (~19 turns, ~20 sim-s);
≥3 sim-minutes of wall interaction across the two. Command logs are the sessions'
`commands.jsonl` under the scratchpad (seed + log fully re-derives the run).

**Instrument limits**: no audio, ~1 s decision cadence, strips are 6-panel composites not
video. No feel claim finer than a turn length. One usage subtlety found and corrected
mid-run — see "missile release semantics" below; it does not change the verdict.

---

## The five-sentence player verdict

Cruising feels like After Burner the moment I bank — the world rolls hard and the sea and
islands sweep under me — but the fighting still happens *to* me, not *by* me. I held the
missile button through two whole runs with six enemies on screen and never once got a lock
to fire; the lock reticle floats up in the empty corner of the sky while the enemies I could
actually hit are low and to the side. My gun kills the same handful of planes whether I aim
or let go of the stick, because the sight is pinned at the horizon and the close enemy is
never where the bullets go. The sky keeps emptying out — after every death and every stage
I fly through long quiet seconds with nothing to shoot, and no big enemy ever comes roaring
across my face the way the arcade throws them. It looks like After Burner in a freeze-frame,
but in motion it plays like target practice at a firing range that keeps running out of
targets.

---

## The three R13 combat gaps — verdicts

### Gap 1 — MISSILES REACHABLE BUT NOT USABLE → **CONFIRMED (and worse than the judge found)**

**Quantified**: Across both seeds I held `--missile 1` through roughly 22 sim-seconds of
play with 4–6 enemies on screen and spans reaching 24 %W. **Locks formed in only 2 of ~46
turns (both seed 7, turns 3–4, peaking at 3 locks), and ZERO salvos fired in either seed.**
Seed 19: 12 consecutive hold-turns, ~11 s, **zero locks ever**. Trying to force it by
climbing to the band and sitting there got me shot (enemy-shot count climbed 8→25) and
killed — the exact trap the judge described, except I never got the 1 lock the judge did.

**The root cause, seen directly** (`playtest-open-evidence/s7-lockband-empty-enemies-low.png`):
the lock bracket sits in the **empty upper-right sky**, while the live enemies — including a
large close green fighter at ~16 %W, an ideal missile target — sit **low and mid-left**,
nowhere near the band. The lock strip is positioned where the enemies aren't. The judge's
fix direction ("route enemies through the lock band, or widen the strip") is right, with one
sharpening: **the band must overlap where enemies actually fly (low/mid), not just widen in
the upper sky where it currently is.**

*Missile release semantics (for the lanes, not a bug)*: the salvo fires on **release** of
the missile button (`!holding && this._wasHolding` in `combat.js:915`), consuming
accumulated locks — holding continuously only accumulates. I re-ran the test correctly
(hold-to-acquire, release-to-fire). It made no difference: no lock ever accumulated to
release. The "not usable" finding stands on the lock side, not the input side.

### Gap 2 — KILLS HAPPEN TO YOU, NO MID-RANGE GUNNERY WINDOW → **CONFIRMED**

**Aiming control experiment**: blind arm (stick centered, fire held, ~12 s flight) = **2 gun
kills**; aiming arm (track + maneuver + fire, ~6 s before a stage clear cut it short) = **1
gun kill**. Both land at ~0.15 kills/s — **aiming does not out-kill blind fire**, because the
limiting factor is enemy availability at a reachable depth, not aim. Separately, seed 19 held
fire for ~9 s with 6 enemies on screen and the hit counter moved 0→2 then stuck — a very low
connect rate. **Geometry** (`s19-sight-misses-close-enemy.png`): a close ~20 %W enemy sits
mid-left while the caged sight and the vulcan tracer stream point up at the horizon, so the
gun passes over it. Enemy depths are bimodal — horizon dots (3–11 %W) or brief wingtip pops
(16–24 %W) — with **no stretch where an enemy dwells at a shootable mid-depth on the sight
line.** The judge's "give enemies dwell time at a mid-range depth" is the right fix.

### Gap 3 — DEAD SKY, NO LARGE FLYBY → **CONFIRMED (refined)**

**Longest zero-enemy stretch measured**: ~4 s (seed 7 turns 22–23, 240 ticks, both 0
enemies), plus a 0-enemy turn right after each respawn. These cluster **after deaths and
stage clears**; during active combat enemies are usually 3–6 on screen, so the sky isn't
*permanently* dead — it's a lull problem tied to respawn/transition. **No large flyby
confirmed**: the biggest spans I saw (~24 %W) appear briefly *at the lock band* and vanish;
nothing crosses the screen large and close. The arcade reference bursts (100 s & 110 s of the
longplay) show enemies at **many depths simultaneously, constantly, with ~1 kill/s in hot
stretches and half-screen fireballs** — ours shows a few small dots. Population + choreography
is the gap, as the judge said; the size *distribution* is not the problem.

---

## New gaps the judge's list missed

1. **Death→respawn is far too long.** Seed 19's cycle ran ~8 s from fireball to back-in-
   flight (fireball→starburst→tumble→respawn→flight); seed 7 ~4–6 s. The arcade drops you
   back into live fire fast. This **long dead interval compounds gap 3** — the sky is empty
   for the whole respawn — and it breaks the arcade's relentless pace. **Flow lane should
   look at the respawn timing.** (Evidence: seed 7 turns 10–14, seed 19 turns 11–17 all
   `death` phase.)
2. **Afterburner trails are white smoke, not orange cones** — confirms gap 4 from the
   gestalt pass. The engine shows two small orange nozzle dots but the trail is a white
   cloud (`s7-lockband-empty-enemies-low.png`, `s19-world-roll-on-bank.png`). The arcade's
   player jet drags big bright-orange afterburner cones (the game's namesake).

## R12 wins — all still hold in play

- **Islands visible**: yes (cruise and death strips, both seeds).
- **Game-over on life loss**: yes — lives 0 → `continue` flow state, "CONTINUE PLAY / 7 /
  INSERT COIN" over the sunset, no silent refill (`s7-gameover-continue.png`).
- **Visible tracer**: yes — yellow dotted vulcan stream in every combat strip.
- **Death cycle**: yes — starburst → tumble → respawn reads correctly (`s7-death-starburst.png`).
- **Stage 1→2 transition**: yes — bonus applied, stage-2 sunset composition is strong.
- **Roll drama in flight**: yes — hard bank rolls the world ~30–40° (`s19-world-roll-on-bank.png`).
- *Attract-screen ±60° drama*: not re-driven in this focused pass (the flight harness boots
  into gameplay, not the title); the in-flight roll system is confirmed working.

---

## Do the R13 lanes have the right targets?

**Yes — the combat lanes are aimed correctly, with two adjustments.** Gaps 1–3 are all
confirmed on the committed build. (1) Gap 1's spawner/lock fix must move the lock band to
**overlap where enemies actually fly (low/mid)**, not merely widen it in the currently-empty
upper sky — otherwise a wider-but-still-high strip locks nothing. (2) Add the **long
death→respawn interval to the flow lane's scope** — it's a real pace-breaker the gap list
missed and it worsens the dead-sky symptom gap 3 targets. Player-art's orange-afterburner
target (gap 4) is confirmed real.
