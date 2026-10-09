# R7 — Game-feel critique

**Scope:** this build judged as a *game*. Whether there is something to play, what the player
has to do, whether any of it takes skill, and whether ten minutes of it is worth anyone's time.
Pixel fidelity is other reviewers' job and is not re-litigated here.

---

## 0. Tree state, and what every number below was measured on

**Subject: commit `82365e99fcda921ed34ce2fd56ea1aab3dd7f7ab`.** At the start `git status --short`
carried one untracked file, `judging/R7/report.md` (a concurrent reviewer's document) and
**nothing under `src/`**. That changed during the review — see the next heading, which says
exactly when and what it affects. **I modified nothing under `src/` myself, committed nothing and
pushed nothing.**

`82365e9` is the **R7 content**, not a pre-R7 tree: the five R7 lane commits (`9531ab8` fx,
`373a127` world, `2160842` sprite, `2f10a3b` flow, `5913af6`/`b894957` criteria) are all
ancestors of it, and `82365e9` itself touches only `judging/` and `tools/`. **STATUS.md still
calls `5913af6` the "R7 FINAL TREE"**; for `src/` purposes the two are identical, but anyone
quoting a tree state should quote `82365e9`.

### A tree that stopped being clean halfway through, and exactly what it touches

**`src/` was clean when I started and is not clean now.** An R8 sprite lane began editing while
I was mid-review. I did not write any of it; I have modified nothing under `src/`. Timestamps,
against my own run artefacts:

| | time |
|---|---|
| **all 8 invincible arms complete** | 16:25 – **16:55** |
| the `killsize` evidence frames | **16:39** |
| `src/entities/enemySprite.js` edited | **17:01** |
| the 3 mortal arms (5 seeds × 300 s each) | 16:55 – **17:14** |
| `src/render/spriteFactory.js` edited | **17:11** |
| the carrier-launch frames | **17:15** |
| 20 sprite PNGs + `enemy-palettes.generated.js` rewritten | **17:21** |

**What that does and does not contaminate, read from the diff rather than assumed.** The change
is entirely **art**: `addKeyline` → `addUnderKeyline`, the livery `shadow` tone, and the intake
slot's polygon geometry. It touches **no** simulation quantity — not `ENEMY_WORLD_WIDTH`, not
`widthScale`, not depth, speed, hp, spawn or hit resolution. Enemy `spanFrac` is computed in
`ScreenSpace` from world width and depth and never from a texture.

* **Everything in §§1–3 — the kill rates, the kill-size and kill-depth distributions, the drought
  curves, the invincible pHit column — finished before the first edit.** Clean by timestamp.
* **The mortal arms in §8 span the two JS edits.** Their quantities are deaths, flight share and
  pHit, none of which the diff can reach. I would publish them as they stand and I am saying so
  rather than quietly not mentioning it.
* **The `killsize` frames — the one load-bearing visual — predate everything.**
* **The carrier-launch frames do not**: they were rendered between the JS art edits and the PNG
  rewrite, so they show a mixed art state. The only claim I make from them is that the launch
  reads as a carrier launch, which no keyline treatment changes.

**And the honest limitation of my own instrument: `SERVED_CHECK` would not have caught this.**
It asserts `player.js`, `vulcan.js`, `combat.js` and `flow.js` — the four files my conclusions
reason about — and `enemySprite.js` is not among them. **I found this by running
`git status` at the end, not by my own guard.** A served-source assertion only covers the files
you thought to name.

**Every run below asserts the source it drove**, rather than assuming it. Each probe fetches the
four files its conclusions rest on from the server it is about to drive and records a sha256
plus a spot-check for the constant being reasoned about, and **refuses to run if any check
fails**:

```
/src/entities/player.js   28371 B  sha aff5b23f5558ee06  "ENVELOPE_Y_UP = 1.55"     ✓
/src/weapons/vulcan.js     9822 B  sha f6bfb930e763d858  "DEFAULT_TARGET_DEPTH = 55" ✓
/src/weapons/combat.js    48089 B  sha 5e7fd9f1f628de1a  "ASSIST_RADIUS_FRAC = 0.13" ✓
/src/game/flow/flow.js    34901 B  sha 45e153d365c3bef1  "contentStageIndex + 1"     ✓
```

Both ends are pinned to `127.0.0.1` (the R6 IPv6 defect; `tools/capture.mjs`'s header records
what it cost). **Pinning is not proof you drove your own tree — the hash is**, and that is why
the assertion is still here after the pinning fix.

### Instruments, and what each was validated on before it was used

| instrument | validation | result |
|---|---|---|
| `pilot_r7.mjs --selftest` | 7 arms (below) | **PASS**, twice: before the arms and again after two mid-review patches |
| — clock advances under `__step` | 60 steps must advance `simTime` by 1.000 s | 1.0000 |
| — stick moves the jet, and up is up | full-up and full-down must move it in opposite directions | 27.02 / 77.31 %H |
| — **planted fault: unknown mode** | an unrecognised `--mode` must be **refused**, not silently reproduce the neutral arm | refused |
| — trigger has an effect | `fire:true` must out-kill `fire:false` | 85 vs 42 |
| — **kill count vs the score channel** | `score.js` adds nothing per kill, so `(score − 3300·flight)/20 000` counts independently | 341 mine / 271 tallied, 3 stage resets |
| — **missile pulse actually fires** | stock must fall from 50 | 50 → 0 |
| — seeds differ | `?seed` was silently ignored until R3 | 78 vs 79 |
| `control_r7.mjs` | each phase re-centres and settles 180 ticks first; every sample confirmed `state: 'flight'` | 3 repeats, identical |
| arcade HIT reads | the counter is monotone non-decreasing inside a stage, so a misread announces itself as a step **down** | **0 steps down in 178 sampled frames** |

**Three sources, kept separate and labelled inline:** code read as a designer; my own per-tick
telemetry; arcade footage. **With exactly one flagged exception, no number here is taken from
any lane report or from my predecessor** — including the many that agree with them. The
exception is the arcade enemy round's ≤ 0.37 s screen life in §4, which I did not re-derive and
which is labelled in place and again in §10.

**On sampling.** The whole tick loop runs inside one `page.evaluate`, so **every tick** is
sampled and `?demo=1`'s exactly-16.000 s regime period cannot alias any spread, sd or
percentile. Only `__flowState`, `__combatStats` and `__fairness` are polled; `__combatDebug` is
never called, because it draws from the shared PRNG and would make the measurement depend on the
sampling rate.

### Two defects in my own instrument, both found before publishing

1. **The missile button must be pulsed, not held.** `combat.js` fires the salvo on *release*
   (`!holding && this._wasHolding`). My first missile-only arm held the button and scored **0
   kills in 30 s** — a clean, stable, plausible zero that read like a finding about the missile
   being useless. It was a finding about my harness. Caught by adding a selftest arm that
   requires `missileStock` to actually fall.
2. **`hitLog` is capped at 256 with a `shift()`.** My first fairness cursor was an index, which
   parks at 256 once the cap is reached and silently records nothing after it — on the `still`
   arm that is the first 256 of 1 498 hits, **83 % of the fairness evidence dropped, with a
   perfectly plausible "0 unannounced" to show for it.** Re-keyed on each entry's own timestamp.

And one that is a tooling fact worth leaving for the next agent: **Puppeteer's default
`protocolTimeout` is 180 000 ms**, and this harness runs a whole arm inside a single
`page.evaluate`. Every 300 s arm dies, and the 180 s arms die *only when enough of them share
the CPU* — a result that depends on machine load, which is the worst kind. It fails loudly here;
set `protocolTimeout: 0`.

---

## 1. Verdict

**There is a game here for about ninety seconds, and the thing that ends it is that the gun does
not need you.**

I re-measured my predecessor's headline independently, with my own pilots, my own aggregation and
my own seeds, on the R7 tree rather than `e8fed58`. **It holds, and it is not close.**

| pilot (trigger held, 4 seeds × 180 s = 720 s each, every tick) | kills/s of flight | vs doing nothing |
|---|---|---|
| `still` — **stick dead centre, never touched** | **2.765** | — |
| `vert` — vertical axis only | 2.943 | +6.4 % |
| `lat` — lateral axis only | 3.038 | +9.9 % |
| `trk` — **both axes, tracking the nearest readable target** | **3.224** | +16.6 % |

> **A pilot who never touches the controls scores 85.8 % of what a two-axis tracking pilot
> scores**, and **6.1× the arcade's rate**, which I re-derived independently below at
> **0.451 kills/s**.

That reproduces R6's 86.3 % to within half a point on a different tree with a different
instrument. **But the number that says what is actually wrong is one nobody has taken**, and it
is the headline of this report.

### The gun is not merely too strong. It is killing things the player cannot see.

I attributed **97.8 %** of the `still` arm's kills to a specific aircraft — matching the tick's
hit delta against the enemies that left the live list on that tick, and counting the tick as
*ambiguous* rather than guessing whenever the two did not agree exactly. That gives the
**projected on-screen size of each enemy at the moment it died**:

| pilot | median kill size | **share of kills below the 10 %W "readable" gate** | median kill depth | share killed **beyond the assist cone's own depth limit of 22** |
|---|---|---|---|---|
| `?demo=1` autopilot | 8.37 %W | **64.4 %** | 8.3 | 8.3 % |
| `still` | **4.35 %W** | **91.2 %** | 15.8 | **30.8 %** |
| `vert` | 4.68 %W | 89.6 % | 14.9 | 28.6 % |
| `lat` | 5.06 %W | 83.2 % | 14.1 | 27.0 % |
| `trk` | 5.69 %W | 82.5 % | 12.4 | 26.9 % |

**The median enemy dies at 4.35 %W — fourteen pixels of a 320-pixel screen — and nine in ten die
before they are big enough for the project's own density criterion to count them.**

**The "beyond depth 22" column needed a control before it could be read, and the obvious reading
of it was wrong.** Depth 22 is where `_findAssistTarget` stops assisting, so I first wrote that
nothing *but* the missing range limit in `vulcan.resolveHits` could be killing those 30.8 %. That
ignores the missile: `lockSystem.js` locks between `LOCK_DEPTH_MIN = 26` and
`LOCK_DEPTH_MAX = 88`, so **every missile kill is by design a kill beyond depth 22**, and all the
arms above pulse the missile button. The column as written could not tell the defect from the
signature weapon working correctly. **The arm that separates them is `gunonly` — trigger held,
missile button never pressed** (and `diag_hits.mjs` confirms the converse arm really does
silence the gun, `maxVulcanRoundsInAir: 0`):

| arm (4 seeds × 180 s) | kills/s | **median kill depth** | median kill size | below readable | **beyond depth 22** | readable present | worst drought |
|---|---|---|---|---|---|---|---|
| `gunonly` — **vulcan alone**, missile never pressed | 2.297 | **8.7** | 7.96 %W | 85.1 % | **4.2 %** | 69.9 % | 4.45 s |
| `msltrk` — **missile alone**, trigger never pressed | 1.319 | **21.0** | 3.37 %W | **99.9 %** | **44.3 %** | 83.7 % | 5.45 s |
| `still` — both | 2.765 | 15.8 | 4.35 %W | 91.2 % | 30.8 % | 38.2 % | 18.12 s |

> **The vulcan's missing range limit is real in the source and is not what is happening.** With
> the missile switched off, only **4.2 %** of the gun's kills land beyond depth 22. The 30.8 %
> in the combined arm was **the missile**, killing in the band `lockSystem.js` licenses it for.
> **R6's named mechanism — "rounds reach depth 55 while readable starts at depth 7" — is true as
> code and accounts for about one kill in twenty.** A round with no assist flies the sight line
> and almost never coincides with a distant aircraft; R4's assist-band fix did bound the gun.

**The defect is one bound further in, and the controlled arm points straight at it.** The gun's
kills cluster at **median depth 8.7** with 85.1 % below readable and almost nothing past 22 —
that is the **assist band itself**. `_findAssistTarget` assists between `e.d < 6 || e.d > 22`,
while an enemy only reaches 10 %W at depth **≈ 7.06**. (My own data corroborates that threshold
independently: the gun's median kill is 7.96 %W at depth 8.7, and 7.96 × 8.7 / 7.06 = 9.8 %W.)

> **The aim assist is licensed over a depth band three times deeper than the band in which an
> aircraft is visible — 6 to 22 against readable-at-7.06 — and that is where 85 % of the gun's
> kills come from.** The lever is `_findAssistTarget`'s upper depth bound, not a range gate in
> `resolveHits`; the latter is worth about 4 %.

**And neither weapon empties the sky on its own — the pair does.** Readable-enemy presence is
69.9 % with the gun alone and 83.7 % with the missile alone, but **38.2 % with both**, and the
worst drought goes from ~4.5 s and ~5.5 s to **18.1 s**. The missile deletes the far half of
every approach (median depth 21.0, 99.9 % of its kills sub-readable, which is simply what a
weapon that locks from depth 26 does) and the gun deletes the near half, and between them very
little survives into the range where the player could see it coming.



**→ `r7feel-01-killsize-native-6x.png`** — three real `still`-pilot frames at **native 320×224**,
every live enemy boxed from `__combatStats` and labelled with its own projected span, green for
readable and red for below the gate. **Crop it and look**: the red boxes are specks you cannot
identify as aircraft, and they are most of what the gun is scoring on. The HIT counter in those
three frames runs **19 → 42 → 67 across 20 s of stepping**, which is the 2.765/s arriving on
screen.

**What the source says, now that the arm has told me which half of it matters.**
`vulcan.resolveHits` does gate a round against an enemy *at the same depth*
(`|e.d − r.depth| > depthTol`) while putting **no cap on the round's own depth** — a round travels
to `DEFAULT_TARGET_DEPTH = 55` over `TRAVEL_S = 0.7`. That is exactly as R6 described it, and
the `gunonly` arm prices it at **4.2 %** of the gun's kills. **R4's fix went into
`_findAssistTarget`'s band and not into hit resolution, and the arm says R4 fixed the half that
mattered** — the band it chose, `6 < d < 22`, is simply three times deeper than the depth at
which an aircraft becomes visible.

### And the consequence is that playing well empties the sky

Same arms, share of flight ticks with **nothing on screen at readable size**:

| pilot | readable enemy present | drought share | worst single drought |
|---|---|---|---|
| `?demo=1` autopilot (trigger down ~16 % of the time) | **87.4 %** | 12.6 % | 3.30 s |
| `still` | 38.2 % | 61.8 % | 18.12 s |
| `vert` | 33.6 % | 66.4 % | 19.67 s |
| `lat` | 22.1 % | 77.9 % | 18.87 s |
| `trk` | **9.0 %** | **91.0 %** | 18.12 s |
| `trkall` (chases sub-readable specks too) | **3.6 %** | **96.4 %** | **38.42 s** |

**It is a dose-response curve, and the dose is competence.** The better the pilot, the emptier
the game. R3's density criterion — *"a size-qualified count — ≥1 enemy at **≥10 %W in ≥60 % of combat
frames**"*, `judging/R3/report.md:151` — reads **87.4 % on the autopilot and 9.0 % on a tracking
pilot.** It is a pilot-dependent gate, and so is every
other density figure in this project, because they are all measured on `?demo=1`.

**That also means the autopilot systematically hides this defect from every gate we have**: on
`?demo=1` the median kill is 8.37 %W and 64 % are sub-readable; hold the trigger and the median
halves to 4.35 %W and 91 % are sub-readable. **The one pilot everybody measures is the one pilot
the defect barely touches.**

### Would a player enjoy it?

**Ninety seconds: yes.** It is loud, fast, legible and busy, the jet is unmistakably the biggest
thing on screen (99.97 % of ticks), and it kills you fairly. The carrier launch is real and
reads as one — **→ `r7feel-02-launch-12frames.png`**, twelve frames of the deck, the catapult
stripe and the island receding under the jet. The `killsize` frames above are, visually, a
convincing After Burner.

(A note for judges while I am here: the launch plays **only** under `?demo=1` —
`flow.js` gates it on `params.get('demo') === '1'`, so a plain `?fixed=1` capture starts at
tick-0 flight and never contains the opening. I captured the wrong thing once before noticing.)

**Ten minutes: no**, and for four reasons, of which the first is new and the rest are R6's
unclosed:

1. the gun plays the game, playing it *better* makes it emptier, and the emptiness is what
   then kills you (above, and §3);
2. **the stage digit still never exceeds 3** — `flow.js:320` is still
   `hudState.stage = this.contentStageIndex + 1` with `STAGES.length = 3`. My runs reach
   `stageIndex` 5 inside 180 s and the HUD shows only {1, 2, 3} in every arm;
3. **one 63 s music loop whose real repeat period is 1.58 s** (§5 — this is worse than it has
   been recorded as);
4. a kill rate **6.1× the arcade's**, which also wrecks the audio mix (§5).

**And underneath all of it is a finding that is not about the game at all.** `?demo=1` — the
autopilot every gate in this project is measured on — turns out to be the best case for three of
four acceptance figures at once: density reads **87.4 %** on it and **9.0 %** on a tracking
pilot; deaths/min reads **2.16** on it and **4.16** on a tracking pilot; flight share reads
**69.96 %** on it, inside the arcade band, and **46.43 %** on a tracking pilot, far outside.
**It is a validated operator pointed at the wrong population, and the population is the pilot**
(§8). That is probably why §§1–3 have survived seven rounds unseen.

---

## 2. Kill rate — the arcade figure, re-derived independently

My predecessor's 0.420 kills/s rested on one measurement. **It now rests on two, and they
agree.**

**I used a deliberately different operator.** R6 read the HIT counter at start + 3 s and
end − 2 s of ten stage spans: two points per stage, so a misread endpoint moves that stage's rate
and nothing contradicts it. **I sampled every 2 s across each whole span** — **178 frames** over ten
stages, of which 3 (stage 1, t90–t94) carry no digits at all because the carrier launch is still
running — which gives a within-stage kill curve, lets every read be checked against its
neighbours (**the counter is monotone non-decreasing inside a stage, so a misread announces
itself as a step down; I found none**), and does not depend on either endpoint being
representative.

Operator in full: `ffmpeg -nostdin -ss <t> -i .reference-cache/video/ab2-longplay.mp4
-frames:v 1`, crop `(420,26)–(492,56)` of the 686×480 frame, **6× NEAREST** (never bilinear — the
digits are 2–3 px strokes and any smoothing invents a 3 out of an 8), read by eye off
`arcade/hit-stage*.png`. Spans are the **verified** ones in `STAGE_MAP.md`, sampled strictly
inside them. Per-stage rate = (HIT at the first sample reading 0 after the stage's reset) →
(HIT at the last sample inside the span).

| stage | window | HIT | kills | sec | kills/s |
|---|---|---|---|---|---|
| 1 | t96 → t118 | 0 → 12 | 12 | 22 | 0.545 |
| 2 | t126 → t154 | 0 → 12 | 12 | 28 | 0.429 |
| 3 | t162 → t194 | 0 → 10 | 10 | 32 | 0.312 |
| 4 | t204 → t238 | 0 → 17 | 17 | 34 | 0.500 |
| 6 | t262 → t302 | 0 → 26 | 26 | 40 | 0.650 |
| 7 | t310 → t338 | 0 → 8 | 8 | 28 | 0.286 |
| 9 | t378 → t422 | 0 → 10 | 10 | 44 | 0.227 |
| 12 | t514 → t546 | 2 → 12 | 10 | 32 | 0.312 |
| 16 | t660 → t690 | 0 → 26 | 26 | 30 | 0.867 |
| 19 | t772 → t806 | 0 → 15 | 15 | 34 | 0.441 |
| **POOLED** | | | **146** | **324** | **0.451** |

> **Two independent measurements, different operators, different windows: 0.420 and 0.451.
> The arcade's kill rate is ~0.42–0.45/s and should be treated as established.**

**Where the two disagree, and why it is the dense operator that is right.** On **stage 19** R6
read `6 → 15` over t771 → t806 (0.257/s); I read `0 → 15` over t772 → t806 (**0.441/s**). At
**t770 the counter reads 14 over a stage-tally card** — the previous stage's final value, still
on screen during the transition — and reads **0 from t772 through t782**. R6's "start + 3 s"
sample at t771 lands inside that transition, where the digits do not mean what the operator
assumes. Dense sampling makes this visible; two-point sampling cannot. Stage 16 differs for the
same reason (its reset falls at ~t659, after R6's start sample).

**This is the same defect class the project has a ledger for**: a correctly-implemented operator
pointed at the wrong sample. It does not change the pooled conclusion — it moves the pooled rate
by 7 % — but **the per-stage numbers are not interchangeable between the two reads, and the
boundary-adjacent ones are the unreliable half.**

**Ours, same quantity** (kills per second of *flight*, pooled numerator over pooled denominator,
the same operator as the arcade row):

| | kills/s of flight | vs arcade |
|---|---|---|
| **arcade, 10 stages, measured above** | **0.451** | — |
| ours, `?demo=1` autopilot (invincible arm; 0.913 mortal) | 0.960 | 2.1× |
| ours, **stick centred, trigger held** | **2.765** | **6.1×** |
| ours, two-axis tracking pilot | 3.224 | 7.1× |

All four rows are per second of **flight** time, pooled across seeds, so the death cycle is
excluded from both sides — the arcade pilot in that longplay does not die at all.

---

## 3. Is there a game to play?

**What the player actually has to do, minute to minute: hold one button.** That is not a
rhetorical summary, it is the measurement in §1 — the stick is worth 16.6 % of the score and the
trigger is worth all of the rest.

**Does any of it require skill? One thing does — and I got its name wrong at first, so the
correction is here rather than buried.**

| pilot | kills/s | **pHit** — share of enemy rounds crossing the player's plane that hit him | share of ticks the stick is deflected |
|---|---|---|---|
| `?demo=1` autopilot | 0.960 | **7.25 %** | ~always (two slow sinusoids) |
| `still` | 2.765 | **100.00 %** (1 498 / 1 498) | **0 %** |
| `lat` | 3.038 | 60.81 % | 22.1 % |
| `vert` | 2.943 | 63.99 % | 33.6 % |
| `trk` — chases the nearest **readable** target | 3.224 | **71.18 %** | **9.0 %** |
| **`trkall` — chases the nearest target of ANY size** | **3.189** | **8.38 %** | **~always** |

The last column is **derived, not separately recorded**: `lat`, `vert` and `trk` steer only when
a readable target is on screen, so their deflection share is each arm's own measured
readable-present share (22.1 / 33.6 / 9.0 %). `still` is 0 by construction and `trkall` steers
whenever any enemy is on screen, which is almost always.

**My first reading of this was that aiming gets you killed. That is wrong, and `trkall` is the
arm that refuted it.** I ran `trkall` as a self-check on a different worry — that `trk` might be
understating what the stick is worth, since it only steers when a readable target exists and one
exists on just 9.0 % of ticks. It does not understate the score: **3.189 against 3.224, no
better.** But it is hit **8.38 %** of the time against `trk`'s 71.18 %, which is a different
finding altogether.

> **The variable is not aiming. It is the share of time the stick is moving at all.** Rank the
> six arms by pHit and you rank them by that column: 0 % deflection → 100 % hit; 9 % → 71 %;
> 22–34 % → 61–64 %; always → 7–8 %. §4 says why: **20 ms of stick clears the kill box**, so any
> sustained movement defeats an aimed train and standing still is the only way to be hit.

**Which makes this a consequence of §1 rather than a separate problem, and that is the point.**
A realistic player can only chase what they can see, and the gun has made the sky empty — so a
target-chasing pilot has nothing to steer at on 91 % of ticks and spends them sitting still. **The
gun empties the sky; the empty sky parks the player; the parked player is hit by every train.**
`trkall` escapes it only by flying at specks it could not actually see, on telemetry no human
has.

So: **the skill the game prices is "keep moving", it is worth an 8.5× reduction in hit rate, it
is free (20 ms), and the game gives the player no reason to do it** — because there is nothing
on screen to move toward.

**Operator caveat, stated because the absolute numbers depend on it.** Every arm in that table
is `?invincible=1`, so no death ever fires `clearShots()` and no respawn grace ever empties the
sky. That inflates every pHit in the column relative to mortal play — `enemyShots.js`'s own
sweep table records 2.272 % for the autopilot at `SPEED = 10` where I read 7.25 %. **All six
arms get identical treatment, so the comparison between policies — which is the point — is
like-for-like**; the absolute level is not a mortal-play figure and should not be quoted as one.
Mortal numbers are in §8.

**And the exposure control runs the conservative way.** The gap could have been an artefact of
the autopilot killing fewer shooters and therefore facing less fire — it is the opposite. The
autopilot logged **1 682** rounds crossing its plane against `trk`'s **1 523**, and was hit
**122** times against **1 084**. **More incoming, 9.8× fewer hits**, so the difference is in what
the pilot did, not in what was shot at it.

**The autopilot does the survivable thing by accident**, with two slow incommensurate sinusoids
at 0.22 and 0.35 rad/s that drift monotonically across the whole 3–6 s fairness lag and never
come back. That is why it reads 7.25 % without reacting to anything, and it is the same property
`trkall` has for a different reason.

**`still` reads pHit exactly 100 %, and a clean 100 % is the shape of this project's false
alarms**, so I did not take it on the number. Its own control holds — crossings inside
`PLAYER_HIT_RADIUS_FRAC` equal `playerHitsTaken` exactly, 1 498 = 1 498 — and **the mechanism in
`enemy.js` predicts it**: the train is fired at `this.aimX = playerNdc.x; this.aimY =
playerNdc.y`, an exact snapshot with **no error term**, swept about that exact centre by
`sweepX · k · TRAIN_SWEEP_STEP_NDC`.

**The "even train length so no round is dead-centre" guard does not function as an error term,
and this is quantitative.** `TRAIN_LENGTHS = [8]` makes `k` a half-integer, so the innermost
rounds sit **±0.006 NDC** from the snapshot. The kill box is `PLAYER_HIT_RADIUS_FRAC = 0.040`,
which is **±0.080 NDC laterally and ±0.114 NDC vertically**. The straddle is **5–8 % of the kill
box** — deep inside it. Against a player who has not moved, the centre of every train is a hit by
construction.

**So §4's untried lever is the right one, and I can now say what it has to beat.** An aim scatter
term would have to be of order the kill box, not of order the straddle: roughly **±0.08 NDC**,
i.e. **13× the displacement the train currently has**. That is the arm nobody has run, and it is
what decouples lethality from time-of-flight (§4).

---

## 4. Fairness, and whether we bought it by making the threat slow

**Fairness is over-delivered, and I could not break it either.** Pooled across five pilot
policies:

| | value |
|---|---|
| hits whose announcing flare lit **before the life began** (`announced:false`) | **0** |
| of which, **fatal** hits in mortal play (3 policies, 4 500 s, 5 seeds each) | **0 of 232** |
| **minimum** warning observed, any policy | **2.88 s** |
| median warning | 3.53 – 3.62 s |
| maximum | 5.43 s |
| `pHit` self-check (crossings inside radius == `playerHitsTaken`) | exact, every arm |

**Now the part that is a problem.** By Little's law on two independently-read quantities
(`shotsFired / flightSeconds` and mean `shotsInAir`), our enemy round's **mean screen life is
2.68 – 2.95 s** across all five policies. **The arcade's is ≤ 0.37 s** — one train, one stage,
a bound rather than a distribution, and I take that number from my predecessor rather than
re-deriving it, so it still rests on one measurement and should be treated accordingly.

> **Ours is a threat that floats for three seconds. The arcade's crosses the screen in a third
> of one.**

**And "a formality" is quantifiable, so here it is.** The train is aimed at a snapshot, so a shot
is defeated by displacing the kill box's own half-width before it arrives. Full lateral stick
carries the jet 0.6986 NDC through an exponential at `FOLLOW_RATE = 6.0`; the lateral half-width
is 0.080 NDC. Solving the exponential:

| | |
|---|---|
| full lateral stick to clear the kill box, from a standing start | **20 ms — 1.2 ticks** |
| full up stick to clear it vertically | 37 ms — 2.2 ticks |
| 0.2 s of full lateral stick carries | 0.488 NDC = **6.1× the kill box** |
| **minimum warning actually observed** | **2 880 ms** |

> **The player is given 142× the input time the dodge requires.** The warning is not generous,
> it is unbounded: any sustained stick input at all defeats an aimed train, which is why the
> autopilot's two slow sinusoids survive at pHit 7 % without reacting to anything.

**That reframes the difficulty model, and it is the explanation for §3's inverted incentive.**
Escaping is free. The only ways to be hit are to never move (`still`, pHit 100 %) or to keep
coming back to where you were — which is exactly what **aiming** makes you do (`trk`,
pHit 71 %). **The game is not hard to dodge; it is hard to dodge *and* aim**, and it pays almost
nothing for the aiming.

### Sizing the aim-scatter term, which is the lever nobody has pulled

R6 named an aim error term as the untried lever and left it unsized. **I cannot run that arm —
it needs a source change and this review modifies nothing — but it can be sized in closed form,
and the model can be checked against a number I did measure.**

Give the aim an isotropic Gaussian scatter of standard deviation σ, in frame-width fractions,
the same unit `PLAYER_HIT_RADIUS_FRAC = 0.040` is in. Against a player who has not moved, the
miss distance is Rayleigh, so

    P(hit) = 1 − exp( −r² / 2σ² ),    r = 0.040

**Control first.** The current build's only departure from a perfect shot is the even-train
straddle, σ_effective = 0.003 frac W. The model returns **P(hit) = 1.0000**, against the
**100.00 %** I measured on the `still` arm (1 498 / 1 498). The model reproduces the one point I
have.

| target pHit vs a stationary player | σ (frac W) | σ (NDC lateral) | σ in points of W |
|---|---|---|---|
| 90 % | 0.0186 | 0.037 | 1.86 |
| **50 %** | **0.0340** | **0.068** | **3.40** |
| 30 % | 0.0474 | 0.095 | 4.74 |
| **20 %** | **0.0599** | **0.120** | **5.99** |
| 10 % | 0.0871 | 0.174 | 8.71 |

> **A scatter of ~3.4 points of frame width halves the hit rate against a stationary player;
> ~6 points takes it to 20 %.** The build's current effective scatter is **0.3 points.** The
> lever is two orders of magnitude from where it would need to be, which is why nothing else has
> been able to decouple lethality from time of flight.

**And this is the arm that lets `SPEED` go back up.** Today lethality is carried entirely by the
lag, because the aim never misses; put the lethality in the scatter instead and `SPEED` is free
to move toward the arcade's third-of-a-second crossing without returning to R5's death rate.
**Run it as a two-arm isolation — scatter alone, then scatter plus `SPEED` — and change one
constant at a time**, which is what settled ledger rows 28 and 29.

**Judged directly: yes, we bought fairness by making the threat slow — but that is the symptom,
not the disease.** The reason time-of-flight *has* to carry the lethality is §3: the aim is
perfect, so the only miss mechanism in the build is the player having moved since the snapshot,
so the only way to make the game less lethal has been to give the player more time to move. **Do
not act by raising `SPEED` alone** — that is the lethality lever R6 and R7 both spent themselves
on. Give the aim an error term of order the kill box and the two decouple.

---

## 5. Audio — read, not heard, and worse than it has been recorded as

**I have heard nothing. Every capture is muted by construction** (`engine.js`: `?fixed=1` implies
mute). Everything here is derived from the synthesis, and one part of it is *computed* rather
than described.

### The music does not have a 63-second loop problem. It has a 1.58-second one.

`buildLoop()` is a pure function of `(bar, step)` with no RNG except the hat's noise buffer, so I
reproduced its score exactly (`music_structure.py`, constants transcribed from the source and
printed for checking) and counted what is actually distinct:

| | distinct, out of 40 bars |
|---|---|
| **drums** | **1** |
| **rhythmic figure, pitch discarded** | **1** |
| bass | 3 |
| lead | 5 |
| full-texture bars | 5 (the most common occurs **16 times**) |
| **8-bar phrases** | **2 of 5** |

> **Distinct musical material: 25.3 s, not 63 s.** The drum pattern and the onset rhythm are
> **identical in all forty bars** — no fill, no variation, once. The five "phrases" differ only
> by `leadOctaveUp`, an octave flip on bars 4–7 of odd phrases.
>
> In ten minutes: the loop plays **9.5** times, the 8-bar harmonic cycle **48** times, and **the
> one-bar lead figure 380 times.**

That is the ten-minute problem stated precisely, and it is the cheapest thing on the whole list.

### The kill rate wrecks the mix, and that is a new consequence of §1

`_damage()` fires `playExplosion` on **every** kill, `dur` 0.65 s (1.1 s for a bomber), each
contributing a noise body at gain 0.40–0.55 *plus* a sine boom at 0.45–0.60. Concurrency is
rate × duration, so it is a direct function of §1's kill rate and it is **pilot-dependent in the
same way everything else here is**:

| | kills/s | mean explosion voices sounding |
|---|---|---|
| `?demo=1` autopilot — **what every capture is taken on** | 0.960 | **0.62** |
| stick centred, trigger held — **how a person will play it** | 2.765 | **1.80** |
| two-axis tracking | 3.224 | 2.10 |

On top of that sit the music buses (0.5 + 0.35 + 0.6) and a vulcan firing 12 rounds/s at
0.22 + 0.15. **`engine.js`'s master is a bare `gain.value = 0.7` straight into `destination`:
there is no compressor and no limiter anywhere in `src/audio/**`.** At ~1.8 overlapping
explosions the sum exceeds unity before the master, and WebAudio hard-clips at the destination.

**Note which row the captures sit on.** At the autopilot's rate there is less than one explosion
sounding on average and the mix is probably fine — so this, like the density gate and the
difficulty gate, is a defect the one pilot everybody measures does not exhibit.

**Prediction a human can confirm in one listen: sustained fire should audibly distort.** The
explosion — the loudest cue in the game — is never heard as an *event*, because it never stops.

### Still open from R6, confirmed unchanged at `82365e9`

* **No sound for an enemy round leaving the barrel.** `HANDLERS` has entries for `vulcan`,
  `missileLaunch`, `lockOn`, `explosion`, `enemyFlyPast`, `playerDeath` — and nothing for enemy
  fire. The 1.0 s telegraph that the entire fairness model rests on has a visual flare and **no
  audible onset**. A warning you can only see is half a warning.
* **The player's death is a bomber kill plus a tail.** `playPlayerDeath()` calls
  `playExplosion(true)` — which is exactly what any `bomber` kill plays — then adds a sawtooth
  500 → 70 Hz wail. The most important sound in the game is a routine one with a suffix.
* **The vulcan is a typewriter.** A square wave at 1100 Hz (one muzzle) / 1030 Hz (the other),
  gain 0.22, against a noise snap at 0.15 — tonal-dominant. At 12 rounds/s from alternating
  muzzles that is a **70 Hz-wide two-tone alternation repeating 12 times a second**, and since
  the dominant way to play this build is to hold the trigger forever, **it is the sound of the
  entire game.**
* **The afterburner is a switch, not a swell**: `smoothstep(0.75, 1.0, s) × 0.14` against
  `THROTTLE_ENGINE_GAIN = [0.30, 0.65, 1.0]` is 0 at L, 0 at M, full at H.

### What a human should listen for, in priority order

1. **Hold the fire button for twenty seconds and say whether it distorts.** That is the one
   above that is a *defect* rather than a thinness, and it is the only one I cannot check.
2. **Play for five minutes and say when you first notice the music has repeated.** My claim is
   that it is inside the first ten seconds, not the first sixty.
3. Is there a hole where an enemy shooting at you should be? (Watch a flare light; listen.)
4. Can you tell your own death from a bomber kill with your eyes shut?
5. Does the vulcan read as a cannon or as a tone?
6. Does H read as an afterburner, or just as louder?

**How to listen, since every tool in the repo mutes:** `npm run dev` and just play — normal play
is unmuted. To hear a *scripted* run, `?demo=1&mute=0`; `?mute=0` is the explicit override that
forces sound even under `?fixed=1`.

---
## 6. The verbs, and R7's own claims re-measured

**Every R7 claim I was asked to verify, I verified on my own instrument, and all four hold.**
The envelope and sight figures come from `control_r7.mjs`, which re-centres and settles 180
ticks before each phase and confirms `state: 'flight'` on every sample.

| R7 claim | R7's figure | **mine, independent** | verdict |
|---|---|---|---|
| full-stick ceiling | 27.02 %H | **27.02 %H** | **confirmed exactly** |
| attract altitude p5 (arcade 36.4, gate ±3) | 38.7 | **38.33** | **confirmed, passes** |
| attract altitude sd (arcade 7.73, gate ±1.0) | 8.22 | **8.44** | **confirmed, passes** |
| sight lateral swing under bank | 0.000 %W | **0.0000 %W** over a **1.24° → 66.5°** roll sweep, 180 ticks | **confirmed** |

Full envelope, for the record — and note the unit: these are the **projected sprite anchor**, a
screen fraction, not a bbox centroid (REFERENCE ledger row 27 — a bare "%H" is not a reportable
quantity).

| | |
|---|---|
| neutral | **55.60 %H** |
| full climb held | **27.02 %H** |
| full dive held | **77.31 %H** |
| **vertical range** | **50.29 points of H** (R6 measured 42.22 before the R7 fix) |
| full left / right | 15.07 / 84.93 %W — lateral range **69.87 points of W** |
| sight above the nose | **15.0 points of H, constant through the whole roll sweep** |

**A note on how R6's IPv6 accident reads in hindsight.** R6 reported that its "bad" runs showed
a 50.29-point envelope and discarded them as contamination from a neighbouring tree. **50.29 is
exactly what I measure on `82365e9`.** The contaminated runs were reading R7's fix early; the
discarded number was right about the tree it was accidentally measuring. That does not vindicate
the method — R6 could not have known which tree it had, which is the whole point — but it is
worth recording that the IPv6 defect produced a *correct measurement of the wrong subject*,
which is the hardest kind to catch.

**Responsiveness** — `control_r7.mjs`, settled standing start, both axes, every tick:

| | pitch (full up) | roll (full right) |
|---|---|---|
| ticks to move 1 native px | **1** (16.7 ms) | **1** (16.7 ms) |
| ticks to 50 % of travel | 7 (117 ms) | 7 (117 ms) |
| ticks to 90 % | 23 (383 ms) | 24 (400 ms) |
| ticks to 99 % | 46 (767 ms) | 47 (783 ms) |

Instant onset, ~0.4 s to reposition. The first number is what makes the stick feel connected and
it is excellent; the second is the one §4 is measured against. I reproduce R6's figures tick for
tick, which is expected — `FOLLOW_RATE = 6.0` is unchanged.

**Missiles are resupplied, and I got this wrong before checking.** I first read `combat.js`, saw
`missileStock` assigned only in the constructor, and concluded there was no resupply — then a
missile-only pilot scored 238 kills against a stock of 50, which is impossible. Rather than
publish either number I dumped the raw channels per tick (`diag_hits.mjs`): **`missileStock`
rises 0 → 50 at every stage boundary**, from `flow.js:329`, outside the file I had grepped. The
instrument was right and my premise was wrong. The same dump independently confirms that
`fire: false` genuinely silences the gun (`maxVulcanRoundsInAir: 0`), which is what makes the
weapon-share split in §1 meaningful.

**The other two verbs still have no consequence, and I confirmed both in the source.**

* **The throttle moves exactly one of the three motion cues.** `THROTTLE_SCROLL_MULT =
  [0.62, 1.0, 1.45]` genuinely scrolls the ground — a **2.34×** range from L to H — but
  `spawner.js THROTTLE_CLOSURE_MULT` ships `[1, 1, 1]`, so enemies close at the same rate at
  every detent, and `clouds.js CLOUD_SPEED` is a fixed **9.5**, so the *nearer* objects, which
  should parallax *faster*, do not move at all with the lever. Push the throttle forward and the
  ground responds while the clouds and the traffic do not. **That is not a decorative throttle;
  it is a throttle whose cues contradict each other**, and a player reads the contradiction
  before they read the speed. `CLOUD_SPEED` is one constant and is now unclaimed for a fourth
  round.
* **The barrel roll is an animation.** `grep` for `isRolling` and `rollPhase` across
  `weapons/combat.js` and `game/flow/flow.js` returns **nothing** — no i-frames, no lock break,
  no effect on hit resolution. GAME_SPEC §1 lists i-frames as ASSUMED. It is drawn, it is
  triggerable, and nothing in the game reads it: decide, then wire it or write it down.

---

## 7. Ten minutes, re-judged

**R6's verdict was that the minute works and the ten do not. I reach the same verdict, and the
progression half of it is now exact rather than observed.**

**The player has seen every distinct thing this game owns by t = 100 s.** `STAGES.length = 3`,
and `STAGE_DURATIONS_S` opens 32 / 32 / 36 — so all three palettes have been and gone inside the
first hundred seconds. After that:

| | |
|---|---|
| content (palette, terrain) laps every | **3 stages = 100 s** |
| structure (the 23 measured durations) laps every | 776 s |
| in a 600 s run the player passes | **18 stage boundaries**, i.e. the 3-palette cycle **6.0 times** |
| HUD stage digit, all arms, every tick | **{1, 2, 3} only** |
| `stageIndex` actually reached in a 180 s arm | **5** |

**So a ten-minute player watches the same three looks go by six times while the HUD tells them
they are on stage 1, 2 or 3.** `flow.js:320` is `this.hudState.stage = this.contentStageIndex + 1`,
and the file's own comment defends it as "an honest *we only have 3 stages, so we lap them*
rather than a false claim of unbounded progression". **As a code-honesty argument that is
reasonable and as a player-facing decision it is the single thing most damaging to the ten
minutes**, because the 23 real durations *are* wired in and working — the structure genuinely
varies and **none of it is visible.** Showing the true `stageIndex` is one expression.

**And the content itself is two generators.** `spawner.js` dispenses `_crosserWave()` on every
third wave and `_echelonWave()` otherwise, plus a stage opener. Within an echelon the variation
is real but parametric — 3–6 members, a rake, two independent vertical band draws, a bomber in
roughly one wave in three. There is no landmass, island, canyon, tunnel, boss, resupply or
runway event; stage 5's 12-second "runway restock" is twelve seconds of desert, and the only
restock that happens is the invisible `missileStock = 50` at every boundary (§6).

**Minute two shows you everything minute ten will**, and the 63-second music loop — whose onset
rhythm is literally identical in all forty of its bars (§5) — plays through 9.5 times underneath
it.

---

## 8. Difficulty, in mortal play — and the gate is measured on the wrong pilot

**R7's two remaining claims, independently confirmed.** `?demo=1`, 5 seeds × 300 s, every tick,
pooled numerator over pooled denominator:

| R7 claim | R7's figure | **mine, independent** | verdict |
|---|---|---|---|
| deaths/min of wall clock (gate ≤ 2.0) | 2.114, **shipped missed** | **2.160 ± 0.160** (5 seeds) | **confirmed — still missed**, and the two agree inside a third of a standard error |
| flight share (arcade band 69.4–73.5 %) | 70.70 % | **69.96 %** | **confirmed — inside the band** |

**Now the part that is new, and it inverts the standing reasoning in GAME_SPEC §2.**

That document argues: *"a policy that cannot dodge dies only 1.42× as often as a human who can.
For a player who actually reacts, this build is plausibly at or below arcade lethality, and much
of the excess is the autopilot's."* **Nobody had measured a mortal pilot that actually plays.
I did, and it goes the other way.**

| mortal pilot, 300 s × seeds, every tick | **deaths/min wall** | deaths/min flight | **flight share** | kills/s flight |
|---|---|---|---|---|
| `?demo=1` autopilot — *the pilot every gate is measured on* | **2.160 ± 0.160** (n=5) | 3.087 | **69.96 %** | 0.913 |
| `evade` — tracks targets, commits 4 s away on every flare onset | 2.960 ± 0.194 (n=5) | 4.755 | 62.25 % | 2.656 |
| `trk` — **two-axis target tracking** | **4.160 ± 0.040** (n=5) | 8.959 | **46.43 %** | 3.769 |

**And the §3 result survives the move to mortal play**, which is the regime that matters and the
one my invincible pHit column could not speak for:

| mortal pilot | **pHit** | readable present | drought share | max `stageIndex` in 300 s |
|---|---|---|---|---|
| `?demo=1` autopilot | **2.83 %** | 86.0 % | 14.0 % | 6 |
| `evade` | 5.26 % | 62.3 % | 37.7 % | 6 |
| `trk` | **23.91 %** | **15.9 %** | **84.1 %** | 4 |

The autopilot's **2.83 %** sits right on `enemyShots.js`'s own published sweep value for
`SPEED = 10` (2.272 %), which is the external check on this column. **`trk` is hit 8.4× as
often** — against **9.8×** on the invincible arms. Same ratio, both regimes, and the drought
curve reproduces too (14.0 % → 84.1 %). Per §3 the cause is that `trk` has nothing readable to
steer at on **84.1 %** of its mortal ticks and spends them stationary; the two columns in that
table are the same fact.

> **GAME_SPEC's reasoning predicts that a human who can dodge dies 0.70× as often as the
> autopilot. My pilot that dodges — `evade`, which commits a full-deflection displacement away
> on every flare onset and holds it — dies 1.37× as often (2.960 ± 0.194 against
> 2.160 ± 0.160). One that only aims dies 1.93× as often.**
>
> **The autopilot does not overstate this build's difficulty. It understates it**, and `evade`
> is the right arm to say so with, because it is the only one that actually does the thing the
> standing argument credits a human with.

The margin on `evade` is 1.37× with standard errors of 0.19 and 0.16, so it is about two
standard errors clear of parity and well clear of the predicted 0.70×. **I would defend the
direction and the rough size; I would not defend the third digit.**

**Reacting helps, and it helps more than R6 found — because the baseline is different.** R6
compared a reactive pilot against the *autopilot* and got ~4 %. Compared against a pilot that
is actually trying to shoot things, committing away from every flare takes **4.160 → 2.960, a
29 % reduction.** Both are right about their own baseline; this is the one a player lives on.

**And flight share collapses with it.** The arcade band is a *structural* property — it is
supposed to transfer regardless of pilot — but ours runs **69.96 %** on the autopilot and
**46.43 %** on a tracking pilot, because death cycles eat the difference. **The figure that
"transfers cleanly, because it is a property of the game's structure rather than the pilot's
skill" does not transfer.**

### The common thread, and it is a criteria finding

Four separate acceptance figures in this project are measured on `?demo=1`, and **all four move
materially under a pilot who actually plays:**

| gate | on `?demo=1` | on a pilot holding the trigger | factor |
|---|---|---|---|
| readable-enemy density (R3 report:151, ≥60 % of frames) | **87.4 %** | 9.0 – 38.2 % | **up to 9.7× out** |
| kill rate (arcade 0.451/s) | 0.913 | 2.765 – 3.224 | 3.0× |
| deaths/min wall (gate ≤2.0) | 2.160 | 4.160 | 1.9× |
| flight share (arcade 69.4–73.5 %) | 69.96 % | 46.43 % | out of band |

**`?demo=1` is not a neutral measurement substrate — it is a specific, unusually survivable,
unusually low-volume policy, and it is the best case for three of these four gates.** It is a
pure function of `simTime`: it cannot chase a target, so it never re-crosses its own track
(§4), and its trigger is down about a sixth of the time, so it never empties the sky.

This is the same defect class the project already has a ledger for — **a validated operator
pointed at the wrong population** — except that here the population is *the pilot*, and no
amount of re-running the operator can reveal it. **The recommendation is not to replace
`?demo=1`**, which is correctly solved against the composition statistics it was built for.
It is that **every gate about combat volume, density or lethality should state the pilot policy
it was measured under, and should carry at least one trigger-held arm beside the autopilot one.**

---

## 9. Ranked by how much it damages the experience

Ordered by how much each one costs the *player*, not by how hard it is to fix. Items 1 and 2
are the round.

| # | what | where | why this rank |
|---|---|---|---|
| **1** | **The stick is worth 16.6 % of the score, and the gun has removed the reason to touch it.** Stick centred: 2.765 kills/s = **85.8 %** of a two-axis tracking pilot's | `combat.js _findAssistTarget`, `weapons/vulcan.js` | R6's headline, reproduced independently on a different tree. **A player who never touches the controls scores six-sevenths of one who plays** |
| **1=** | **The empty sky then parks the player, and a parked player is hit by every train.** pHit by share of ticks the stick moves: 0 % → **100 %**; 9 % (`trk`) → 71 %; always (`trkall`) → **8.4 %** — at the *same* score | #1, #3, `enemy.js` aim snapshot | **the lethality is downstream of the drought, not of aiming** — I had this backwards until `trkall` refuted it (§3). 20 ms of stick clears the kill box; the game gives the player nothing to move toward |
| **2** | **The aim-assist band is three times deeper than visibility.** `_findAssistTarget` assists over `6 < d < 22`; an enemy reaches 10 %W at d ≈ 7.06. Gun alone: **median kill at depth 8.7, 85.1 % of kills below readable size** | `combat.js:_findAssistTarget` (`e.d > 22`) | **this is the specific number to change, and it is one constant.** R6 named `resolveHits`'s missing range cap instead; the controlled `gunonly` arm prices that at **4.2 %** |
| **3** | **Playing well empties the sky, and no gate can see it.** Readable enemy present: 87.4 % on `?demo=1`, 38.2 % stick-centred, **9.0 % tracking**; worst drought 3.3 s → 18.1 s | #1, #2, `spawner.js` | R3's density criterion reads 87.4 % or 9.0 % depending only on **who is flying**. Every density figure in this project is measured on the one pilot the defect barely touches |
| **3=** | **Three of four gates are measured on the one pilot that does not exhibit the defects.** `?demo=1`: density 87.4 % (tracking 9.0 %), deaths/min 2.16 (tracking 4.16), flight share 69.96 % (tracking 46.43 %) | every density/lethality criterion; `game/flow/demoTimeline.js` as substrate | **not a player-facing defect — a measurement one**, and it is why #1–#3 have survived seven rounds. Ledger class: *a validated operator pointed at the wrong population*, where the population is the pilot |
| **4** | **No sense of progression.** Content laps every **100 s**; the HUD digit is `contentStageIndex + 1` and never exceeds 3; the 23 measured durations are wired in and invisible | `flow.js:320`, `stage.js STAGES` | the ten-minute question in one line, and one expression. A player cannot tell they have got anywhere |
| **5** | **The music's repeat period is 1.58 s, not 63 s.** 40 bars contain **1 distinct drum bar, 1 distinct rhythm, 3 bass, 5 lead, 2 distinct 8-bar phrases** — 25.3 s of distinct material | `audio/music.js` | cheapest item on this list against the ten-minute question, and much worse than "one 63 s loop" implies |
| **6** | **The kill rate is 6.1× the arcade's and it clips the audio.** 2.765/s against a re-derived **0.451/s**; ≈1.8 explosion voices sounding at all times into a master with **no limiter** | #1–#3, `audio/engine.js` | the score inflation is a consequence of #2; the mix damage is a new, unlisted consequence of it |
| **7** | **Enemy rounds live ~8× longer than the arcade's** (2.68–2.95 s against a ≤0.37 s bound), announced 2.88–5.43 s ahead | `enemyShots.js SPEED`, `enemy.js` | the threat reads as drifting, not incoming. **Do not raise `SPEED` alone** — see #8 |
| **8** | **The aim carries no error term, and the "straddle" that stands in for one is 5–8 % of the kill box** (±0.006 NDC against ±0.080/±0.114) | `enemy.js` aim snapshot, `TRAIN_SWEEP_STEP_NDC` | this is what forces time-of-flight to carry lethality, which is what makes #7 unfixable on its own. **Sized in §4: σ ≈ 0.034 frame-widths (0.068 NDC) halves pHit; the build's effective scatter is 0.003.** Two orders of magnitude short |
| **9** | **Missiles are the long-range deleter and nobody has said so.** Missile alone: median kill depth **21.0**, **99.9 %** of kills below readable size | `lockSystem.js LOCK_DEPTH_MIN = 26` | not a bug — it is what a weapon locking from depth 26 does — but it is half of #3, and it has never been costed |
| **10** | **No sound for an enemy round leaving the barrel.** `HANDLERS` has no entry | `audio/sfx.js` | the 1.0 s telegraph the whole fairness model rests on is silent. A warning you can only see is half a warning |
| **11** | **The player's death is a bomber kill plus a tail** — `playPlayerDeath()` is `playExplosion(true)` + a wail | `audio/sfx.js:153` | the most important sound in the game is a routine one with a suffix |
| **12** | **The throttle's one consequence disagrees with the other two cues** — ground ×2.34 across the range, `CLOUD_SPEED` fixed at 9.5, enemy closure ×1 | `clouds.js`, `spawner.js THROTTLE_CLOSURE_MULT` | one constant, unclaimed for a fourth round |

**Not on this list, deliberately — checked and I would leave alone:** the fairness contract
(§4 — 0 unannounced across every policy, and I could not break it either); the sight square
(0.0000 %W swing over a 66.5° sweep, closed); input latency (1 tick onset is excellent); the
player's vertical envelope and the attract altitude spread (all four R7 claims verified, §6);
jet prominence (99.97 % of ticks the biggest thing on screen).

---

## 10. Observed / measured / inferred

**Observed in frames.** The twelve carrier-launch frames (`r7feel-02-launch-12frames.png`), the
three native `still`-pilot frames with every enemy boxed and sized
(`r7feel-01-killsize-native-6x.png`), and the 178 arcade HIT-counter frames behind §2
(`arcade/hit-stage*.png`, ten sheets). Nothing else in this report is a pixel reading.

**Measured by telemetry, every tick, over 2.5 M enemy samples across 11 arms** — 8 invincible ×
4 seeds × 180 s and 3 mortal × 5 seeds × 300 s. All the pilot kill
rates and the 85.8 % figure; **the kill-size and kill-depth distributions**, which are this
report's new measurement; the drought and readable-presence curves; per-policy `pHit`; the enemy
altitude distribution; the player envelope, sight swing and both settle curves; the warning
distribution; the enemy round's mean screen life by Little's law; the stage index and HUD digit.

**Computed from the generator, not rendered.** The music repetition structure in §5 — `buildLoop`
is a pure function of `(bar, step)`, so its score is reproducible exactly, which is a stronger
statement than an autocorrelation of the rendered audio and needs no browser.

**Inferred from code only — not experienced.** All of §5's listening claims, including the
clipping prediction, which is an arithmetic consequence of a measured kill rate and an unlimited
master bus and is the one audio item I would most like a human to settle. Also: the claim that
the automated aim *feels* like the gun playing itself. The 85.8 % is measured; the feeling is
not. **Someone has to hold the controls and put headphones on.** §§1–4 and §§6–7 stand without
that; §5 does not.

**Taken from my predecessor rather than re-derived, and flagged as such**: the arcade enemy
round's **≤ 0.37 s** screen life (§4). It still rests on one measurement of one train in one
stage. Everything else that agrees with R6 was re-measured here from scratch.

**Corrected before publishing — the substantive one first.** §3 originally concluded that
*aiming* gets the player killed, on the strength of `trk`'s pHit 71 % against the autopilot's
7 %. I had run `trkall` to check a different worry (that `trk` understated the stick's value) and
it refuted the published reading instead: **same score, 8.4× fewer hits.** The variable is the
share of time the stick is moving, not whether the pilot is aiming, and the lethality is
therefore downstream of the drought rather than beside it. **The arm I ran to check my
instrument overturned my conclusion**, which is the second time this round that a control was
worth more than the measurement it was guarding.

Also corrected: a claim that missiles are never resupplied (they are, every
stage boundary — §6); a missile-only arm that scored zero because my own harness held a button
the game fires on release (§0); a fairness cursor that would have dropped 83 % of its evidence
and reported a clean zero (§0).

**I modified no source file under `src/`. Nothing was committed and nothing was pushed.** My new
files are confined to `tools/out/feel-critic-r7/` and this report. The `src/` modifications
present in the working tree at the time of writing are an R8 sprite lane's, not mine — §0 records
when each appeared and which of my arms predate it.

### Evidence

| file | shows |
|---|---|
| `tools/out/feel-critic-r7/pilot_r7.mjs` | the pilot harness, 7 self-test arms including a planted fault |
| `tools/out/feel-critic-r7/control_r7.mjs` | envelope, sight-swing and latency probe |
| `tools/out/feel-critic-r7/diag_hits.mjs` | the raw-channel dump that corrected my missile-resupply error |
| `tools/out/feel-critic-r7/music_structure.py` | the music repetition count, from the generator's own constants |
| `tools/out/feel-critic-r7/analyse.py` | pooled aggregation (pooled numerator / pooled denominator, never a mean of rates) |
| `selftest.json`, `selftest2.json` | instrument validation, before and after the mid-review patches |
| `inv-{still,vert,lat,trk,demo,gunonly,msltrk}.json` | the invincible arms, 4 seeds × 180 s each |
| `mort-{demo,trk,evade}.json` | the mortal arms, 5 seeds × 300 s each |
| `control.json` | envelope / sight / latency, with served-source hashes |
| `tools/out/feel-critic-r7/mortal_summary.py` | pooled mortal figures, read from the per-seed log lines |
| `inv-trkall.json` | the upper-bound tracking arm (chases sub-readable targets too) |
| `r7feel-01-killsize-native-6x.png` | **three native frames with every enemy boxed and labelled by span** |
| `r7feel-02-launch-12frames.png` | the carrier launch, 12 frames (`?demo=1` — a plain `?fixed=1` capture never contains it) |
| `arcade/hit-stage{01,02,03,04,06,07,09,12,16,19}.png` | **the 178 HIT-counter frames behind the 0.451 kills/s** |
| `arcade/hit_sheet.py` | the dense-sampling operator, with its crop and scaling stated |

