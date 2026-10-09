# R8 asks — presentation / off-ladder lane

Six items. Two are criteria/tooling corrections with evidence attached, two are acquisitions,
one is a decision only the TL can make, one is a cross-lane note.

---

## A1 — CRITERIA/TOOLING: `tools/measure_hud_consensus.py`'s own driving parameter is one column short, and the published "1 118 / 1 118" does not reproduce as published

**To**: criteria lane (owns `tools/`).

Run exactly as its docstring prescribes (`--page /tools/hud-probe.html --url-params
"throttle=0.5634&bg=000000"`), it returns **1 114 / 1 118**, with all four misses at column 96 of
the throttle bar. **This is not a regression**: it returns 1 114 on clean `82365e9` too, from a
**byte-identical probe PNG** (md5 `b21ecb82…` on both trees).

The cause is an inclusive/exclusive edge mismatch inside the harness, not in the HUD. The tool's
caveat derives `f` from "the arcade fills the bar to x96" via `drawThrottleBar`'s
`end = 56 + round(71·f)`, but `end` is **exclusive** — `hud.js:613` says so in a trailing comment
— so `f = 0.5634` gives `end = 96` and paints `[56, 95]`. Driving the same harness at
`f = 0.5774` (`end = 97`, i.e. column 96 painted) returns **1 118 / 1 118**, all three rects
exact.

**Ask**: correct the docstring's prescribed `f` and its derivation, so the next lane that runs
this before/after a change does not spend an hour deciding whether it broke the HUD. I have not
edited the tool. I also did not simply adopt the `f` that produces the round number — the point
is that one of the two is a one-column error and it is worth saying which.

**Ledger candidate**: same family as row 24 (JET-SIL's mask validated on the wrong crop) — a
validated operator pointed at the subject through a wrong parameter. Exactly reproducible, wrong,
and invisible to re-running it.

---

## A2 — CRITERIA: do not divide the video level expansion back out; REFERENCE's own two measurements of it disagree about the slope

**To**: criteria lane.

I tried this, shipped it briefly, measured it and withdrew it, and the reason belongs in the
ledger rather than in four files' comments.

REFERENCE.md gives the expansion twice:

| ink | native | video | ratio |
|---|---|---|---|
| HUD white | `#f7f7f7` (247) | `#ffffff` (255) | **×0.969** |
| stage-2 sky R | `#e67300` (230) | `#f27500` (242) | **×0.950** |

A linear de-expansion fitted to either one is contradicted by the other — 12 levels of
disagreement at the top of the range, which is more than a ladder step in that region. So "divide
by 247/255 and snap" is a model this repo's own data refutes, and it moves authored constants by
up to 9 levels on the strength of it.

**What I shipped instead, and I suggest it as the standing rule for any constant read off a video
frame**: (1) where REFERENCE publishes the native counterpart of *that exact ink*, use the
published native value; (2) otherwise take the **minimal nearest-rung snap and infer nothing**.
Deltas 1–4 levels, which REFERENCE itself calls visually nil.

---

## A3 — ACQUISITION: a true-native **title screen**, and a **daylight death** instance

Two new rows for STATUS.md's acquisition list, in the same form as the existing two.

| # | what to acquire | what it unblocks |
|---|---|---|
| **4** | a true-native **title screen** | seven of the title's twelve colours still carry t74's (686×480) video provenance with only a nearest-rung snap behind them: `BLUE_A`, `PINK`, `BLUE_COPY`, `SPHERE`, `SPHERE_HI`, `SPHERE_RIM`, `MOLTEN_HOT`, `MOLTEN_RIM`. The white and the red are settled (REFERENCE publishes their native counterparts); these are not |
| **5** | a **daylight death** instance, any stage, video is fine | the burnt-hulk ramp is now MEASURED — `ab2-gameplay.mp4` t202.4–206.8, n = 12 297 px — but the HUD digit on that frame reads **3**, a night stage. The ramp is licensed for night and **extrapolated** to daylight. The extrapolation is defensible (burnt wreckage is self-coloured, not stage-lit) and it is still an extrapolation. `ab2-gameplay.mp4` has no stage map, which is why this needs looking for rather than just grepping |

Acquisition 5 also has a cheap partial: **a death instance in `ab2-longplay.mp4`**, which *is*
stage-mapped. I did not find one in the span I decoded; somebody working that file anyway should
keep an eye out.

---

## A4 — DECISION (TL only): `carrier.js:357` `addKeyline(buf, KEYLINE)`

Handed to this lane by the out-of-cycle enemy-art lane. **Not actioned, deliberately.**

The keyline's *colour* is now on the ladder (`#12121a` → `#101019`), which was in scope. Whether a
**ship** should carry a 1-px keyline at all is a silhouette question to be settled against
`reference/carrier-prelaunch-t84.png`, and the grant I was given was explicitly palette-only with
"do not touch the placement maths". Removing an outline changes the silhouette's measured extent,
which is the quantity the art critique ranks the carrier on (aspect 1.54 against the arcade's
3.22). That is one change, in one lane, with the arcade crop open — not a side effect of a palette
pass.

**Ask**: either grant the silhouette scope explicitly to someone, or carry it to R9 as its own
item. Do not let it fall between the two grants a second time, which is how the hulk survived
three rounds.

---

## A5 — DECISION (TL only): `©SEGA 1987` on the title versus `carrier.js` declining to paint `SEGA` on the deck

Raised by the R7 art critique and still unresolved. `titleScreen.js` prints `(c)SEGA 1987`;
`carrier.js` explicitly declines to paint `SEGA` on its deck and substitutes an abstract marking,
citing the same CLAUDE.md assets rule. **Two files, one rule, opposite answers.**

I have not moved either, because resolving it silently in either direction is the wrong shape of
decision for a build lane to make. Both are one line whenever you rule.

---

## A6 — NOTE to the sprite lane: the hulk's bright tail is bounded by the sheet, not by my code

No action requested this round; recorded so it is not re-opened as a `deathSequence.js` defect.

The burnt hulk is now a histogram match against the arcade's own measured hulk and lands within
one ladder rung on p5, p25, p50 and p75 (41/49/66/82 against 36/51/65/84). Its **p95 is 123
against the arcade's 144 and its max is 123 against 191**, and that ceiling comes from the player
sheet: `player-f14.png`'s brightest authored tone is **23 % of its non-black pixels**, so it
cannot be placed in the arcade's top 5 % without splitting one authored tone across two output
rungs, which would put dither where the sheet has flat shading.

If a future sheet carries a small, genuinely-brightest highlight tone (a few per cent, on the wing
edges), the hulk's top rung follows it automatically — the remap reads the live sheet and needs no
change here.


---

## A7 — CRITERIA: a tick index is not a reportable quantity without the URL that produced it

**To**: criteria lane. **Accepted by the TL. Ledger candidate, and it is ledger row 21's class for
the third time in one round — the lead contributed the third instance.**

Resolved in `lane-ladder.md` §5. A one-value disagreement between two lanes at "tick 1 950" was
not an instrument disagreement: **the two tick 1 950s were different moments in the simulation.**
Same seed, same `?invincible=1`, **one flag apart** — `?demo=1` — and 29 becomes 28. Each side
then reproduced the other's three figures exactly by adding or dropping that one flag
(29/29/30 without, 27/28/28 with).

**The mechanism is mechanical, not statistical, and it generalises past this one flag.** `?demo=1`
is the only URL that plays the carrier launch (`flow.js`: `playLaunch = params.get('demo') ===
'1'`), and `stageTimer += dt` lives only inside `_updateFlight` — so the timer does not run during
the `launch` state and **every stage boundary in a `?demo=1` run is displaced later by
`LAUNCH_TOTAL_S` = 3.5 s = 210 ticks**. Predicted from source, the first boundary moves from
tick 1 921 to **2 132**; measured, launch occupies ticks 1-210 and the first tick on stage > 0
is **2 132** — predicted and measured agree to the tick. Dropping `?invincible=1`
displaces them by an *unbounded* amount instead (1 227 of the first 2 100 ticks go to the death
cycle and the boundary never arrives at all). **Two different flags, two different displacements,
both silent.**

Three other candidates were tested and refuted first: stepping granularity (1 950 × `step(1)` and
one `step(1950)` produce **byte-identical** PNGs), readback path (in-page `gl.readPixels`, the same
run's `toDataURL` PNG and an independent `capture.mjs` PNG all agree), and tree drift, tested
independently on both sides.

**Ask**: add to REFERENCE.md's citation rules, beside row 27's "a bare %H is not a reportable
quantity" — **a tick index is meaningless without the URL parameters that produced it**, because
two measurement-only flags each move every stage boundary and neither announces it. Any
window-aimed verification must quote its URL; this round's window reproduces on
`?fixed=1&seed=1&invincible=1`, ticks 1 921–1 979.

### A7b — this is a FOURTH class of silent wrong number, and it deserves its own row

The TL's framing, which is better than mine and which I am recording in its words:

> This failure is invisible to every cross-check we run. Both instruments were right, both agreed
> with themselves, both agreed with a second implementation, both were stable on repetition. Only
> reading the flow state out of the frame showed the two samples were not the same sample.

The three classes already in the ledger are **a bad operator**, **a validated operator pointed at
the wrong population/resolution/region**, and **a stale capture set**. This is none of them:
**two correct measurements of two different things that look like one thing.** Cross-validating
implementations cannot detect it — that is the standard remedy for the first class and it actively
*reinforces* this one, because both sides keep agreeing with themselves. Nor can re-running, nor a
duplicate sweep, nor a black-frame sweep.

**The actionable half is an asymmetry in the tooling, and it is now fixed.** `probe.mjs` logged
the flow state it sampled; `capture.mjs` did not, which is why this took four experiments instead
of one. The TL has since added a `capture-manifest.json` to `capture.mjs` (`1a49ac0`) carrying the
URL, the cumulative tick and the full flow state per frame — **verified working here**, and this
lane fixed one bug in it: the console tag read `st.stage`, which `__flowState()` does not expose
(it has `stageIndex` and `stageNumber`), so the stage silently never printed. Now reads
`[flight stage 2]`. **That bug is itself a miniature of the class** — a guard that made a typo
look like an absent field.

**Suggested general rule for the row**: *an operator that samples a time series must record the
state it sampled, not just the index it asked for.* It is the stage-digit rule (REFERENCE.md,
"every palette or value criterion names its stage") one level up, and the same remedy: read the
identity out of the artefact rather than trusting the request that produced it.
