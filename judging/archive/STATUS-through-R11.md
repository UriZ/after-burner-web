# STATUS — where the rebuild stands

**Last updated**: 2026-10-13, **Round 11 in flight.** Two lanes landed and are committed
(`435926e` enemy art, `6027b49` feel); two are live in `src/` with work uncommitted —
`effects-r11` in `effects/**`, `enemyShots.js`, `enemy.js`, `spawner.js`, and `combat-r11` in
`combat.js` and `game/flow/**`. **Do not `stash` / `checkout .` / `reset` on this tree.**

> ## WHERE THE BUILD STANDS — R10 scored 7.5/10 (motion 4 → 6.5, stills 9 → 8); R11 is answering its gap list
>
> **R10's gate**: `judging/R10/judge-report.md`, `art-critique.md`, `feel-critique.md`; board at
> `judging/R10/board/index.html`. **R11 so far**: `judging/R11/lane-enemy-art.md`, `lane-feel.md`.
>
> **CLOSED IN R11.** The enemy aircraft — ranked first of ten and named a blocker by the owner —
> went from **5.7 % of pixels darker than L=80 to 33.9 %** against an arcade 24–29 %, and from
> **four silhouettes to six** (R10 found four of the eight day head-on sheets were two drawings in
> four liveries). The lock now requires aiming: **a motionless stick's share of kills fell 83 % →
> 22 % with the tracking pilot untouched at 18 → 18**. The stick responds on **tick 1** again
> instead of tick 12, against an arcade that reaches full lateral rate in one frame.
>
> **Caveat on the lock figures, stated because they are the round's headline:** the A/B itself
> stands, but its *justification* quoted the withdrawn envelope claim below, and **the lock cone
> rides the sight — so these numbers will move when `ENVELOPE_X` is cut.** They are measured, and
> they are measured on a build whose envelope is about to change. Re-run before citing.
>
> **THE R10 ACQUISITION THAT BLOCKED THE DRAWING WORK FOR TWO ROUNDS IS DONE** — an arcade column
> for the near-aspect head-on enemy, shape from a byte-reproducible longplay frame identified by
> its HUD digit, colour from the true-native desert still. It held as a drawing target and its
> acquisition reproduces byte-for-byte.
>
> ### WITHDRAWN MID-ROUND: THE "ENVELOPE_X PASSES" CLAIM. R10 GAP 2 WAS RIGHT ALL ALONG.
>
> **This block previously said `ENVELOPE_X` passed at 1.19x the arcade and that the real defect was
> the sight. That was wrong and is retracted.** `judging/R11/arcade_jet_x.csv` is **not a
> measurement of the player aircraft -- it was reading ENEMY aircraft.** The player is the
> twin-nozzle F-14; every arcade enemy has ONE nozzle, and at the 0.42 scale it was read at, that
> distinction is invisible. Three of three re-checked extreme rows land on empty sea, empty sky and
> a carrier deck. Seven full-resolution reads put the arcade player at 45.5-61 %W, nowhere near the
> published 19-78 %W.
>
> **Corrected position:**
> - The arcade jet **tracks** its sight, ratio ~1.0, half-envelope about **+-10 %W**.
> - Ours is **+-34.93 %W**, so **`ENVELOPE_X` is ~3.5x too wide. R10 gap 2 stands.**
> - `combat.js:714`'s sight-equals-jet-plus-offset gives ratio ~1.0 and the arcade's is ~1.0, so
>   **the sight derivation is NOT a defect.** `ask-combat.md` is withdrawn.
> - The derived "arcade jet rate 1.12 fracW/s" is withdrawn. Under ratio 1.0 it is 0.379 against
>   our 1.064 -- **R10's "2.76x too fast" stands un-rescued.**
> - **REFERENCE #122's tension is REOPENED, not closed.** The 13.55-vs-12.88 agreement was a
>   coincidence between two numbers, one of which was garbage.
>
> ### THE METHOD FAILURE, WHICH IS THE REUSABLE PART
>
> **A precision check does not license a measurement. Identity does.** The withdrawn figure
> carried a published 1.14 %W test-retest precision, and that was true -- precision was never the
> problem. **Identity was never validated at the scale the reading was taken at.** The lane DID
> crop and look, at a scale below what the identity test needs, **which is worse than not looking,
> because it manufactures confidence.** Binding: when an operator must tell two objects apart,
> validate the DISCRIMINATION at the working scale, and state the feature that does it (here: two
> nozzles against one).
>
> **And the failure this round is still of the dominant class, just with the sides swapped.** Two
> correct measurements of DIFFERENT THINGS -- R10's +-17.5 %W (stick held, world at full camera
> roll) against +-34.93 %W (released and settled) is a real distinction and still true. **Compute
> both definitions and show they differ before calling a disagreement a defect -- and verify both
> are measuring the OBJECT you think they are before either.**
>
> ### NUMBERS NOBODY MAY CITE AS MEASURED
>
> - **The arcade's JET per-frame lateral rate.** The R11 attempt FAILED — hand-read precision
>   ~1.1 %W cannot resolve a 0.6–1.9 %W step, and three automatic trackers were withdrawn for
>   being unable to establish aircraft identity. `RATE_X` is parked on a **DERIVATION**
>   (2.95 × the sight's measured 0.379 fracW/s). **This is the top acquisition on the board.**
> - **Arcade missile launch→impact**: a CANDIDATE 0.43–0.90 s band, not MEASURED.
>   `MAX_TURN_FRAC_PER_S` is solved, not measured.
> - Anything tagged ASSUMED in `GAME_SPEC.md`, `HOMING_GAIN` included.
>
> ### REFUTED — do not act on these, they appear in older reports
>
> - *"Our explosion smoke is too small"* and *"our fireball is too deep-red"*. Both were read off a
>   motion montage that **is not scale-matched** (arcade panels cover 0.39 of their frame, ours
>   0.77), so every area taken off it overstates the arcade **~3.9×**. At matched depth our residue
>   is **1.40 against the arcade's 0.71** — twice as large relative to its own fireball — and we
>   are the **yellower** of the two at first light. A second agent then mis-gridded the same image
>   (15 panels of 208 px where the labels prove 13 of 240) and "confirmed" the wrong reading.
>   **Two agents agreeing on an unreproducible image is not corroboration. Any figure published
>   here ships its generator and states its crop fractions on both sides.**
> - *"`-ss` sequence extraction on the AV1 60 fps file starts ~4 s early."* **Refuted four times
>   over**, once pixel-exact against a committed reference frame. `t = T_ss + (i−1)/60` holds
>   exactly. **CLAUDE.md still carries the stale warning** and fresh agents keep hedging timestamps
>   on it; the replacement text is in `judging/R10/lane-criteria.md` §5, awaiting the owner.
> - *"44 % of displacement arrives after release"* — a property of the 0.20 s hold, not the model.
> - REFERENCE #122's cruise `cx sd` 12.88 %W is **corroborated** (R11 measured 13.55), not in
>   conflict with the ±9.83 %W sight rails. Different objects.

R10 criteria work and its evidence: `judging/R10/lane-criteria.md`; R9's is
`judging/R9/lane-criteria.md`.

> ## R10 CRITERIA HEADLINE — THE INVERSION WAS CHECKED AND IT IS NOT AN INVERSION, AND THE RULE THAT FOUND THAT OUT IS THE DELIVERABLE
>
> **R9 found that DRAW-WEIGHT ranks the untouched enemy sprite above the redrawn one and called
> the sign inverted. I ran the test on seven SAME-SUBJECT known-quality pairs — one sheet, one
> cell, before and after a redraw the project accepted. The gated statistic RP90 ranks 5, ties 2
> and INVERTS NONE.** On the player jet, where an arcade anchor exists, its distance from the
> arcade falls across **every** accepted redraw and never once rises: **3.08 → 2.30 → 2.30 →
> 0.48.** The art critic's inversion is **real, reproduced to the digit, and robust across 5 of 5
> cells** — and it is a **cross-subject** reading of two different aircraft, on a class REFERENCE
> had **already declared UNLICENSED**.
>
> **The real defect needs the opposite fix: a statistic with no arcade anchor degenerates from a
> DISTANCE into a DIRECTION, and only a direction can have a sign.** Under *"lower is lighter, so
> push it lower"* a thin continuous sheet beats separated blades every time. **The licence was
> written and nothing enforced it**, and the criterion's own prose invites the reading it forbids.
> Ledger row 44. **Gate unchanged where an anchor exists; demoted to a diagnostic that must not
> say "lower is better" where none does.** The highest-value acquisition on the drawing board is
> now **an arcade column for the near-aspect head-on enemy — 69.2 % of enemy screen pixels.**
>
> **And the candidate proposed to replace it fails the same test WORSE than the thing it was
> proposed to replace**: LINEWORK inverted on 3 of 7, runs-per-row on 3 with 2 ties.
>
> **THE RULE STANDS AND IS THE ROUND'S DELIVERABLE, because the process finding was true:**
> *a synthetic control proves an operator computes what it says; it CANNOT prove a quality
> statistic ranks correctly, because in a synthetic the answer is an input.* DRAW-WEIGHT was
> validated against synthetics, rotation, two implementations, three mask rules and our own alpha
> — **five kinds, more than any other instrument here — and never once on two real drawings whose
> relative quality was known.** Binding, with a harness: `tools/known_quality_pair.py` (6 controls
> incl. a **positive** one), pairs taken from **git history** so the direction is not the
> instrument's to choose, masked by the sheets' own **alpha**, so there is **no mask discretion at
> all**.
>
> **Four conditions for a pair; the two that cost the most are new.** (3) **inside the statistic's
> own licence** — which is the whole difference between "the sign is inverted" and "the test was
> run out of bounds"; and (4) **NOT CIRCULAR — the lane that produced the "after" was not gated on
> the statistic under test.** Condition 4 cuts this round's own result roughly in half and is
> published as the bound: the three `010db2c` pairs are circular for RP90, and **the non-circular
> four give RP90 ranks 2 / ties 2 / inverts 0.** Weaker. Still not an inverted sign.
>
> **RETROSPECTIVE EVIDENCE THE TEST DISCRIMINATES, and it was not fitted**: ledger **row 18**
> (Criteria A and B *rewarded* a sea for getting worse, 20 points above the arcade) and **row 36**
> (`enemysil.py` fails a drawing for having the feature it wants) are **already-known inversions,
> both found by accident rounds later, both exactly what a ten-minute pair run would have
> printed.** And a pattern visible only at fifty rows: **not one ledger defect was ever found by a
> synthetic control.** Controls keep operators honest; they have never caught a criterion.
>
> **THE SWEEP FOUND TWO MORE, both first-time runs.** **JET-SIL's "two-blade fin rows" reads
> 100.0 % on all four player-jet tree states** — including the pre-R6 sheet the R6 judge replaced:
> saturated before the work began, so it cannot score any of it. **JET-SIL's blade cant is
> INVERTED on 2 of 3 accepted redraws** (\|d\| from the arcade's 1.28: 0.06 → 0.02 → 0.07 → 0.09).
> **Reported as a direction with NO error bound — the statistic may be too coarse at this
> magnitude. Do not tune to it; measure the arcade's own cant across several frames first.**
> Ledger row 50.
>
> **A POPULATION DEFECT, found because two rows agreed too exactly** (R9's own rule): the four day
> head-on enemy sheets are **TWO DRAWINGS** — `interceptor-head`/`prop-head` share a byte-identical
> alpha plane, as do `grey-head`/`camo-head`. **One silhouette was redrawn in R9, not two**, and
> any shape statistic over those four sheets has **n = 2, not 4**. Palette statistics are
> unaffected. Ledger row 45.
>
> ## R10's SECOND HEADLINE — THE PROJECT NOW HAS A CRITERION FOR TIME, AND A SIXTH CITATION FIELD
>
> **Two greps across every report and both ground-truth documents return ZERO hits for a motion
> comparison and ZERO for missile tracking, lock acquisition or turn rate.** Forty-three repaired
> criteria, every one of them reading one frame or a telemetry scalar. The R9 judge split its
> score — **stills 9/10, motion 4/10** — and retired the trend line.
>
> **CITATION FIELD 6, BINDING: every figure touching TIME states its SAMPLING RATE as a number, on
> both sides, plus the decode method.** Every such figure in this project taken before R9 was
> **4 Hz or coarser**, and the arcade events they describe last **0.067–0.13 s**. *A number with no
> sampling rate is not a temporal measurement; it is a still with a unit attached.* This is ledger
> row 29 widened from PERIODIC to TRANSIENT, and the corollary bites hardest: **a NEGATIVE about a
> transient is worth nothing without its rate** — "ours leaves no smoke", "there is no flash" are
> claims a 4 Hz sampler produces for free.
>
> **TIME-ENVELOPE is published — and WITHIN A DAY the known-quality-pair rule was applied to it by
> the effects lane and REFUTED ITS HEADLINE STATISTIC. Two of the three figures this lane
> published in that box are corrected below, and one of the corrections is this lane's own
> defect.** Ledger rows 51–56.
>
> **(1) `w60`/`n60` — "ticks within 60 % of peak", R9's headline figure and the number this
> criterion was built on — FAILS A KNOWN-QUALITY TRIPLE AND INVERTS.** Matched harness, matched
> depth, matched seed, quality settled by looking at the crops: the committed plateau reads
> **6/8** against the shipped flash's **8/8** — *the plateau scores better*, because both are
> normalised by peak and our sprite **boils**. **RETIRED as gate candidates, demoted to reported
> diagnostics**; the arcade's 0.067 s stands as a licensed arcade *fact*, not a number a lane may
> be scored against. **Control 7's lesson arriving on a second criterion: the statistic that reads
> most naturally as the defect is nearly blind to it — here, inverted.** Row 53. *The phrase was
> also under-specified: contiguous run vs total coincide on the arcade (4 and 4) and did not on
> our build (6 vs 16). Publish both; neither is reportable alone.*
>
> **(2) THE ARCADE PEAK THIS LANE PUBLISHED, 6.03 %, IS A DIFFERENT OPERATOR — the licensed one
> reads 4.317 %.** I reproduced R9's figure "to the digit" and took that as proof the operator was
> pinned. **What I had confirmed is that I was running R9's operator, which has no
> largest-component step.** Decomposed: raw **6.028** → persistence-excluded **5.969** → largest
> component **4.317** (effects lane, independently: **4.32**); the exclusion removes 0.060 % of
> frame and **the whole difference is the component step** — the arcade frame at peak is **28 %
> other fire-coloured material.** `w60` (4/4) and `r100` (0.157/0.157) reproduce exactly.
> **Binding: an exact reproduction proves you ran THEIR operator; it says nothing about whether it
> is the licensed one.** Rows 14/22/27 again, by the lane that maintains the ledger, same day.
> Row 51.
>
> **(3) "OURS PEAKS 40 % SMALLER" IS WITHDRAWN — class 2, and it is mine.** The arcade's own peak
> spans **0.83–6.03 % across five events in ONE STAGE, a factor of 7.3**, because peak scales with
> the killed target's **depth**; the sentence compared ours against **the maximum of five**, in the
> same box as a rule requiring every figure to state its population. **PEAK IS OPEN — no
> threshold, no ratio.** The depth-matched ratio that would fix it was attempted and **failed on
> the arcade side** (stage-1 kills detonate at or behind the player, where the target is not
> separable before first light). At **matched depth** the direction reverses: shipped peaks **39 %
> HIGHER** than the plateau it replaced — shorter *and* bigger, which is what a flash is. Row 54.
>
> **NOTHING IS GATED, AND THE REASON GOT DEEPER TWICE IN ONE DAY.** `life10` does not reproduce —
> 21 frames here against the effects lane's 14 — and I diagnosed that as a missing **event
> boundary** (row 52). **That diagnosis was wrong.** The debounce rule I asked for does not
> converge: K = 1…8 gives `life10` **14, 14, 26, 26, 84, 84, 84, 84** — it *parameterises* the
> disagreement instead of removing it.
>
> **THE CAUSE IS ATTRIBUTION: "largest component per frame" is a SELECTION, and it silently
> re-targets.** Verified on my own decode of arcade D — the peak fireball's centroid is
> **(141, 227)**; by +5 the selected component has jumped **51.2 %W** to the opposite corner, and
> **at +6, where `r100` is read, it is a different kill 39.6 %W away.**
>
> **SO `r100` — WHICH I PRE-REGISTERED THIS MORNING — IS WITHDRAWN, AND BOTH GROUNDS I REGISTERED
> IT ON WERE THE DEFECT.** *"Reproduced to three digits across two implementations"* is
> **shared-defect agreement — row 51 one level down, committed inside the repair for it**: both
> implementations run the same selection, so both re-target onto the same wrong object and agree
> exactly. *"A single named lag, no boundary to inherit"* is true and insufficient —
> **boundary-free is not attribution-free**; a control with a prescribed answer has untracked
> `r100` reading **0.836 against a truth of 0.068.** Rows 60–61. **The pre-registration was still
> right as a process — it is what sent the effects lane to measure the horizon. Pre-registration
> buys honesty about selection, not correctness.**
>
> **PUBLISHED INSTEAD OF A GATE, AND WORTH MORE: THE ATTRIBUTION HORIZON.** The first lag at which
> the largest component's centroid jumps more than `T` of frame width; **any statistic beyond it
> is unlicensed.** Binding precondition: *every envelope figure publishes its lag and that event's
> horizon, and a figure beyond the horizon is not published.* **It would have caught all three of
> our bad numbers.** The arcade `life10` column is **withdrawn as a measurement by the lane that
> produced it**, downgraded to an upper bound.
>
> **AND THE STRUCTURAL FINDING UNDERNEATH, which is the part that generalises:** `w60`/`n60` are
> confined to frames at ≥60 % of peak, where the component is dominant **by construction**, so
> they are inside the horizon on all four arcade events. **The statistics the triple refuted as
> RANKERS are the only ones that are ATTRIBUTABLE; the ones that rank are the ones that are not.**
> That is not bad luck — *a statistic that discriminates a decay must read the decayed state, and
> the decayed state is by definition where the subject is no longer the largest thing in frame.*
> **Discriminating power and attributability are in direct tension, and only identity resolves it,
> never a threshold.**
>
> **One asymmetry nobody had looked for: the arcade's horizon is +1 to +9, ours is +10** — not
> because our operator is better, but because our frames hold far fewer competing fire-coloured
> objects. **A population difference, so no lag statistic is symmetric between the sides by
> default**, and that is invisible to any control run on one side only.
>
> > **CORRECTED, ledger row 63, by the lane that produced the figure: the our-side column was
> > first published as ">9 / 10" and those are TWO POPULATIONS, not two readings.** The
> > `combatexpl` harness carries **ZERO competing components** before first light; the in-situ
> > capture carries **16 per frame**. **The harness's ">9" is not a long horizon — it is an event
> > ending before anything could out-compete it.** Only the in-situ **10** was ever comparable.
> > *Row 21's class, inside the box that enforces it, one message after that box was written.*
> >
> > **It forced the clause the precondition shipped without: THE HORIZON IS A PROPERTY OF THE
> > CAPTURE** — not of the build, not of the operator — **and must be measured in the same capture
> > as the figure it licenses**, because what it measures is how much other fire is in your frames.
> >
> > **And the same check found that the player's own nozzle discs (459 and 441 px) are the two
> > largest competitors on OUR side too**, four times anything else — so the persistent class is
> > not an arcade artefact, and **masking the player's airframe is the one pre-step that moves both
> > sides**, validatable on ours first because our airframe has ground truth. **Caveat on the floor
> > itself: it is a MAX, not a sum — insensitive to everything smaller than the biggest competitor,
> > and therefore hostage to that one object.**
>
> **AND THE RULE ITSELF GAINED A CLAUSE FROM BEING USED: REFUTATION IS STRONG, SELECTION IS
> FITTING.** Refuting a **pre-specified** statistic is binding — the pair cannot have been chosen
> to suit it. **Picking the winner from a menu of seven statistics against one known triple is
> fitting, not validation.** A statistic selected that way must be **pre-registered and tested on
> the NEXT pair** before it is gated. *One pair can kill a criterion; it takes a second, unseen
> pair to license one.*
>
> **THE SMOKE ROW IS FILLED, AND IT IS PEACH, NOT GREY.** R9's refusal was not beaten, it was
> **sidestepped** — a kill over **open sea with no cloud in frame**. Mean RGB **(236, 188, 162)**,
> dominant **`#f4c8b3`**, peak 7.20 % of frame, **≥ 0.8 s by eye, n = 1**. This settles a standing
> argument in `explosions.js` **in its favour on both halves**: the daylight arcade explosion has
> no grey, and authoring grey from a **night** frame would have been ledger row 12 again. **The
> decay envelope and size distribution stay OPEN** — near a cloud bank the mask's largest component
> flips **17.35 % → 0.09 % between frames**, which is the mask failing, not the smoke moving. And
> *"ours leaves no smoke"* **is now false**: 3 peach puffs, 1.067 s at ≥10 % of peak — measured by
> exact palette match, **an operator that does not exist on the arcade side**, so 5.78 vs 7.20 is
> not a comparison and the gap must not be "closed".
>
> **TWO INSTRUMENT FACTS FROM THE EFFECTS LANE, BOTH OF WHICH CORRECT STANDING CLAIMS.**
> **(a) The 60 fps longplay is genuinely 60 UNIQUE Hz** — R6's *"the file carries duplicate
> frames; 1/30 s is its effective unique rate, verified by hashing"* is **REFUTED, and the
> instrument is the finding: hashing cannot test this on an AV1 re-encode**, because every frame
> gets a distinct hash whether or not the content repeats. The md5 test is **vacuous in both
> directions**; the pixel-difference test is the one that works — 119 consecutive pairs, mean
> per-channel \|Δ\| **17.4–37.6, no pair identical**. **Anyone who stepped at 1/30 s on the
> strength of that sentence halved their resolution for no reason.** Row 55. **(b) The arcade's
> explosion SPRITE animates at 30 Hz inside 60 Hz logic** — sampling at 60 Hz does not make the
> subject a 60 Hz subject.
>
> **A NEW TAXON, and it is row 37's cousin rather than its repeat.** The repo's two "incompatible"
> arcade claims about enemy shots — `≤0.37 s` vs `10–16 fireballs at ~0.11 s spacing` — are **BOTH
> TRUE AND NOT BOTH ARCADE FIGURES: the 0.11 s is OUR OWN `enemy.js` constant projected onto the
> arcade.** Row 37 is a closed loop between **two** of our own numbers; this is a **HYBRID** — one
> real arcade measurement doing the work of making our own assumption look sourced. **Binding:
> when a figure is derived from more than one input, label the PROVENANCE OF EACH INPUT, not of
> the result.** Row 56.
>
> **A RATE HAS NO SHAPE.** The arcade kills at t = 96.333, 99.433, 100.267, 100.500, 100.633 — a
> 3.100 s drought, then **three kills in 0.367 s**, an instantaneous **~8 kills/s against the
> 0.42–0.54/s average ARCADE-PACING quotes.** Ours delivers 0.519/s smoothly and the criterion
> cannot tell. **Burst statistic owed; no threshold, because n = 5 kills is one observation.**
>
> ## R10's FOURTH BLOCK — THE FIRST MEASUREMENT OF ARCADE STICK BEHAVIOUR, AND A STANDING CAVEAT REFUTED
>
> **CLAUDE.md's *"`-ss` sequence extraction on the AV1 60 fps file starts ~4 s early"* is REFUTED
> for the input-seek form, by three independent invocations.** This lane anchored its own decode
> against a committed reference frame: `-ss 96.0` f0286 vs `reference/stage1-missile-salvo-t100.75.png`
> reads **mean |Δ| = 0.0000** with neighbours at **21.3 / 23.5** — a spike, not a plateau. The feel
> lane got 0.0000 from `-ss 98.5`; the effects lane got 12 byte-identical frames across two seek
> forms. **`t = T_ss + (i−1)/60` is exact.** The caveat must name the form it applies to or be
> retired — **as written it costs precision**: two lanes hedged their timestamps and a third
> re-derived the anchor, all for nothing. *A standing caveat that is wrong is as expensive as a
> missing one, and harder to notice, because being careful feels free.* **CLAUDE.md is not this
> lane's file — flagged to the TL.** Row 57. Stage identity is still read from the HUD digit.
>
> **TWO PUBLISHED FIGURES ARE NOW FREE OF THE FOUR RETIRED FRAMES.** A blind detector over **420
> CONSECUTIVE frames** returns a cleanly bimodal histogram: **lock bracket 5.246 %W (n = 75)**
> against R5's 5.15, and **nose sight 1.493 %W (n = 68)** against R7's 1.563. *Two numbers from
> two lanes in two rounds, recovered by one operator shown neither, on frames selected for
> neither* — the strongest corroboration shape this project has.
>
> **"~6 LOCK BOXES AT ONCE" IS RESTATED AND THE 6 IS LEFT OPEN.** The clean sample gives **max 3
> simultaneous and ≥2 in only 3.6 % of frames**; the night sample reaching 6 is precision-poor and
> an upper bound. **Defensible: "≤3 ambient, more during a salvo."** The ambient figure is the new
> fact — **a build showing several brackets continuously is wrong even if its salvo peak is right.**
>
> **NEW AND SOLID: THE ARCADE'S LOCK BRACKET DOES NOT ANIMATE IN SIZE** — flat within ±2 px across
> 26 consecutive frames; it appears at its final size. **The feel lane was briefed to make ours
> "fill" and did not build it, because of this.** Logged as a row class in its own right —
> **PREVENTED-BY-MEASUREMENT** — because this ledger records only defects *caught*, never features
> *prevented*, and that is now three instances in two rounds (rows 42, 43, 59).
>
> **ARCADE STICK, FIRST EVER MEASUREMENT.** 418 consecutive-frame steps, 25 tracks, two stages,
> 60 Hz: the sight's steps are **quantised in whole native pixels — 0, 1 or 2 per frame, never
> more** (ceiling 0.409 fracW/s). **And it has RAILS: nine stationary runs, eight of them at
> x = 618.0 or 415.5 — ±101 px = ±9.83 %W of centre. A human cannot stop at an identical
> sub-pixel x six times in fifteen seconds. AB2 does NOT auto-centre.**
>
> **DO NOT GATE THE SIGHT RATE ALONE — row 58, and it is row 37's shape.** Ours is 2.5–3.0× the
> arcade's rate *and* our envelope is 3.2–3.5× too wide, so **centre-to-rail time is 0.31 s against
> 0.24 s — nearly matched.** A rate gate would slow a stick that already crosses its screen in
> about the right time, **because the rate gate is measuring the envelope.** Found by the feel lane
> in its own figures, which then declined to propose the gate. **Publish rate, span and traverse
> time, or none of them.**
>
> **A CLASSIFICATION ADDED TO THE PAIR RULE, because the feel lane asked the right question about
> its own work**: only a **QUALITY RANKING** can have an inverted sign and need a pair. A
> **FIDELITY MATCH** has the arcade for a direction; a **CONSTRAINT** has none; a **DIAGNOSTIC**
> has no preferred direction and must not become a gate by habit (hit rate: **higher is explicitly
> NOT better — 100.0 % was the defect**). **The trap: a fidelity match degenerates into a quality
> ranking the moment its anchor is missing** — which is exactly row 44.
>
> **REGRESSION, DECLARED BY THE LANE THAT CAUSED IT**: the stick change breaks attract mode.
> `game/flow/demoTimeline.js` is an analog curve authored against a **position** controller and
> now means "drift at this speed" under a **rate** controller; isolated to HEAD + `player.js`
> alone. Handed to the flow lane. **Any citation of R9's attract-cycle credit needs this caveat
> until that file is re-authored.**
>
> **THE MISSILE IS ASSUMED, NOT MEASURED, AND NOW SAYS SO.** `HOMING_GAIN = 1.7` carries no tag in
> a file where every other constant does. Its launch→impact band — *"2–4 frames of 0.25 s"*, which
> `missiles.js` calls "MEASURED-TO-SPEC" — is a **4 Hz sample of a sub-second event on one of the
> four frames ledger row 37 retired**, true support **0.25–1.25 s**. Ledger row 49.
>
> **R10: HALF OF IT IS SOLVED AND THE HALF THAT ISN'T NOW HAS A METHOD.** **Launch is datable to
> one frame at 60 Hz** off the arcade's own missile-stock counter — hand-validated on four frames
> (8/5/3/1, detector agrees) before use. **Impact cannot be dated and three operators were built
> and withdrawn trying**: plume tracking gave a tidy 0.62–0.80 fracW/s across nine tracks and
> **the tracked objects were expanding fireballs — three of nine had zero net displacement while
> reporting 4–5 px/frame**; the HIT counter shares pixels with a **blinking dot on a 2-frame
> cycle**; and **the arcade pilot holds the trigger**, so no detonation is attributable. **The way
> to close it is a window with no gun fire — a targeted search, not a fourth operator.**
> A **CANDIDATE** band of **0.43–0.90 s** is published with its assumption named and explicitly
> **not tagged MEASURED**.
>
> **`HOMING_GAIN` stays ASSUMED — but its BLAST RADIUS SHRANK even though its provenance did not
> improve**, which is the useful kind of partial progress: a new `MAX_TURN_FRAC_PER_S = 0.77`
> clamp means the gain only binds below `0.01283 fracW/tick` and above that **its value does not
> reach the simulation at all.** The clamp is tagged **DERIVED/ASSUMED with its derivation
> visible**, and half of it is our own number — **row 56's hybrid provenance, labelled per input.**
> And a measured negative worth as much as a positive: the first clamp tried was **0.35, taken
> from the arcade's own measured sight rate, and it was WRONG and measured so before shipping**
> (35.0 % hit rate, median lateral miss five times the fuse radius). *An arcade-measured number
> imported into the wrong system is still an unanchored constant.*
>
> **COUPLING WARNING on row 41**: our sight covers one whole 0.22 cone radius in exactly one
> `LOCK_ACQUIRE_S`. **Cone width, sight speed and acquisition time are one coupled system — do
> not move any of the three alone.**
>
> ## R10's THIRD FINDING — THE TOOL NOBODY USED WOULD NOT HAVE FOUND IT EITHER
>
> `.claude/skills/youtube-reference/SKILL.md` has named this defect class since before round 1 —
> *"invisible in any single screenshot and obvious across a burst"* — and **no judge used it in
> nine rounds.** That is half the defect. **The other half: `--burst-fps` defaults to 4, i.e.
> 0.25 s apart. A reviewer who had followed the skill exactly, at its defaults, would have produced
> clean 4 Hz bursts and concluded nothing was wrong.** Two more defects in the same file: `-vf
> fps=N` **resamples** where consecutive decoding needs `-vsync 0`, and its output path
> `assets/reference/motion/` **does not exist in this repository**. Ledger row 48, **repaired in
> the three places a reader meets it**: the frontmatter description (the one line every agent sees
> without opening anything), a mode table and the 60 Hz recipe at the top of SKILL.md, and a new
> "Measuring MOTION" section in README.md. **`CLAUDE.md` is NOT this lane's file — the patch is in
> `judging/R10/lane-criteria.md` §5 for the TL.**

> ## R9 CRITERIA HEADLINE — THE FIRST CRITERION IN THIS LEDGER THAT CAUSED A DEFECT RATHER THAN MISSING ONE
>
> **R3's density gate — *"≥1 enemy at ≥10 %W in ≥60 % of combat frames"* — is RETIRED.
> The arcade reads 19.0 %.** Ledger row 37; replacement criterion **ARCADE-PACING** in
> REFERENCE.md, every row of which carries an arcade column.
>
> Two independent hand counts agree: **19.0 %** (63 digit-verified frames, 6 stages,
> `tools/out/combat-r6/arcade-vert/labels.csv`, re-analysed with
> `tools/arcade_density_census.py`, selftest 14/14) and **16.7 %** (18 frames, 3 stages, second
> reader). A third reader on a 2 s grid over stages 1/2/4 agrees on the population. **77.1 % of
> the arcade's own enemy aircraft are below 10 %W**, and **the arcade's sky holds no enemy
> aircraft at ≥3 %W in 39.7 % of frames — ours in 0.19 %.** Emptiness is part of AB2's rhythm
> and no criterion had ever named it.
>
> **`spawner.js` drove `MAX_ALIVE` 6 → 10 → 12 → 14 to satisfy that gate** — its own comment says
> so — **and the gate was then re-measured on the build the raise produced.** A closed loop
> between two of our own numbers with no arcade in it. We were at **27.3 %** before R8, the
> closest this build has ever been to arcade pacing; R8 took it to **79.6 %** and recorded a pass.
>
> **The gate DID have an arcade side and it was four frames hand-picked into `reference/`.** R9
> opened all eight stage-1 pack frames: **one of the four cited, `stage1-lockon-island-t104.png`,
> carries no enemy aircraft at any size** — the thing that reads as a target is a cluster of
> lock-on brackets with nothing inside them, **the third time the HUD has been counted as an
> enemy and the first time inside a criterion rather than an operator.** Scored over the whole
> pack it reads **50.0 %, below its own ≥60 % threshold.** Two of the four are named `lockon` and
> one `missile-salvo`. **Binding: a reference pack is never a sample — for a frequency claim in
> EITHER direction, the sample selection is the whole measurement.**
>
> **And a second instance of the same loop, found by the declared-exception sweep**: the missile
> lock radius is **0.22 (22 %W)** against the only arcade anchor for it, **8.3 %W**, justified by
> a "~6 brackets" count taken on **t100 — one of the same four frames**, during a salvo. Ledger
> row 41.
>
> **Credit that must not be lost in the retirement**: ours:arcade is **5.5× at the ≥3 %W floor and
> 5.6× at ≥10 %W — the same factor at both.** Our enemy size distribution is right. The
> population is five and a half times too large, and that is one constant.
>
> ## R9's SECOND CRITERIA FINDING — **THE ARCADE TITLE IS NOT A STILL**
>
> **The "II" sphere plate is a 3-D object that tumbles continuously and approaches the camera.**
> `reference/title-screen-t74.png` is one transient mid-tumble pose, and **every published
> measurement of the plate — "7.2× too sparse", "the balls are ~3× larger" — is a property of
> that pose, not of the object. All withdrawn (ledger row 43).** Verified by decoding the
> sequence rather than arguing it: `tools/out/criteria-r9/crit-r9-09-ARCADE-title-t70-t79-1s-grid.png`
> — **t70–71 no plate at all, t72 near face-on, t73 nearly EDGE-ON, t74 the published frame,
> t75 a wide shallow parallelogram, t79 filling most of the screen.** Re-derive from a **named
> phase** (t72 is the most face-on readable pose) or from a phase census.
>
> **And it contaminated the lettering too.** "BURNER is 13.7 % taller than AFTER" is **two
> stacked artefacts** (ledger row 42): the plate's white specular highlights passing a brightness
> threshold, **plus** baseline shear — the wordmark is set on a slope, so **the longer word's
> bbox spans more rows at identical letter height**. Measured on clean frames with
> `tools/title_word_height.py` (selftest 4/4): **per-column letter height FTER 79.5–80.0,
> URNER 78.0 — BURNER's letters are 2 % SHORTER.** The per-word scaling it implied
> (AFTER ×1.13 / BURNER ×1.29) **must not be implemented.** The **21.5 % whole-wordmark shortfall
> is real and survives**; its cause is the **missing oversized bookend letters**.
>
> **New citation field, binding, and it is ledger row 29 GENERALISED rather than a new taxon:**
> *a single-frame figure must establish that its subject is STATIC — and if it is not, say which
> phase the frame caught.* **The tell is what makes it dangerous: looking harder at the frame
> cannot find it.** A still of a tumbling plate is pixel-for-pixel indistinguishable from a still
> of a static one; the only way to find it is to decode a second frame, which no rule asked for.
**Judge score trend**: R1 3/10 → R2 4/10 → R3 6/10 → R4 7/10 → R5 7.5/10 → **R6 8/10** (still
FAIL against the arcade bar). Full reports in `judging/R1..R6/report.md`; R6's is the scoring
baseline, measured on clean checkout `e8fed58`. R6 also ran an art critique
(`judging/R6/art-critique.md`) concurrently with the judge.

**Start here if you are a new lane**: the **Criterion A/B scoreboard** at the top of
REFERENCE.md — **and read its POPULATION column before you quote anything from it.** Then gap 0
below. Everything else in this file is downstream of those.

> **R7 CRITERIA HEADLINE — the scoreboard was measured with the subject removed.**
> Every our-side row of the Criterion A/B table was a frame with **no enemies, no shots, no
> explosions and no lock brackets on screen**, and the table did not say so. Every arcade-side
> row is a frame **in combat** — the desert native frame carries two enemy aircraft, in-flight
> missiles, smoke puffs and the nose sight; the night native frame carries a **37.8 %W fireball
> and debris spray** (restated R8 with its box; the R7 figure of 33.4 %W / 809 px is withdrawn
> as unreproducible, ledger row 30) and still reads
> **79 colours / 17 channel values** — which, R8 adds, is **every other rung of the hardware's
> own 31-value ladder** and not an act of restraint; see ledger row 31 before quoting it as a
> licence. Same build, same commit `e8fed58`, same instrument:
> **21 channel values with combat off, 28–98 (median 53) in ordinary play, failing on 48 of 49
> digit-verified stage-1 frames.** Criterion **B** was separately shown population-*insensitive*
> (80.8 → 80.6 H, 56.4 → 56.3 V), so the caveat binds **A only**. REFERENCE ledger row 21.
>
> **R7 FINAL TREE (`5913af6`): the composite PASSES — 12 frames at three spacings, stage digit
> read 1 on every one, 62–70 colours and 26–30 channel values, 0 of 12 over either gate.**
> Captures `tools/out/tl-r7-final-{97,137,211}`, 0 cross-directory duplicates.
>
> > **R8 CORRECTION, AND IT IS THE ROUND'S HEADLINE: those twelve frames were labelled "with
> > combat on" and hold no player weapon, no kill and no explosion.** `?fixed=1` without
> > `?demo` injects **no input at all**. The R7 judge read the simulation's counters over 900
> > ticks of that URL (vulcan 0, missiles 0, hits 0) and R8 reproduced it **from the pixels**
> > (`tools/assert_population.py`: weapon 0/12, explosion 0/12, enemy fire 12/12; the frames
> > print **HIT 0** on their own HUD). **The conclusion survives on the judge's own re-measure
> > of the real population** — `?demo=1`, 3 seeds × 1 200 consecutive ticks, **55 kills in the
> > window, 0 of 3 600 frames over either gate.** What did not survive is the evidence, and
> > this is **ledger row 21's defect inside the repair for ledger row 21, in the same table,
> > one round later, published by the lane enforcing that rule on everyone else and confirmed
> > twice by the same invocation.** Ledger row 32. **Binding from R8: a population claim is
> > verified by an assertion over the captured frames, never by the invocation intended to
> > produce them.**
>
> The `e8fed58` numbers stay on the record because they are what the population defect (ledger
> row 21) was diagnosed from.
>
> **It is also the round's worked example of citation field 5.** The figure was first circulated
> without its capture directory or commit; this lane declined to confirm it, went looking, and
> landed on an unrelated R5-era directory reading 13 997 colours. The measurement was never
> wrong — it was unreproducible by anyone but its measurer, and it reproduced in one run once
> the provenance arrived. **Field 5 earned its place on the gate at the top of REFERENCE.md.**

**R9's PROCESS HEADLINE, and it is about how the round ran rather than what it measured: every
defect that mattered this round was published by the lane that committed it, unprompted.** The
drawing lane reported a topology bug in its own instrument and a control that passed vacuously;
the pacing lane reported that its own default pilot invalidated the rows it was measuring, and
withdrew a fix it had already built; the title lane reported two of its own targets as artefacts
before implementing them; this lane withdrew a published supporting argument and found that its
own criterion box named two mask rules eight lines apart — **ledger row 34's defect inside the
repair for it, by the lane that maintains the ledger.** Four lanes, nine self-reported defects,
**none of them found by a reviewer.** That is the loop working better than the judge-finds-it
model it was built on, and it is worth protecting: *a lane that reports the criterion which
fought it is worth more than a lane that reports only the result it got* (R7's lesson, now
measured).

**Two rules came out of it and both are binding, in REFERENCE's process-rule section:**
**(a) a cross-validation can AGREE because two errors cancel** — a suspiciously exact agreement
between two independently built operators is a reason to go looking, not to publish; and
**(b) the figure most worth cropping is the one you have already explained to yourself** —
CLAUDE.md's crop-and-look trigger list (zeros, non-movements, 100 %s) **missed both R9 instances**,
because both were large, reproducible numbers that arrived with a tidy mechanism attached, and the
mechanism is what suppressed the instinct to look.

**R9 DRAW-WEIGHT's mask licence is PER SUBJECT AND PER PALETTE — there is no general rule.**
Settled three times by three lanes, each finding the previous settlement too narrow on a
population it had not tested. Day palette over saturated terrain → achromatic (`sat<0.35`);
**night palette over black → the VALUE rule `max(RGB)>30`, which recovers 100.0 % of every one of
our nine night cells where the day rule recovers 44–51 %, or 78–83 % even with the keyline named**
— the night blue-greys are not achromatic (`#425284` sat 0.500, 28.5 % of the level cell's ink).
**The threshold must not be retuned**: 0.35 → 0.55 inflates the arcade day anchor's ink by
**+29.5 %** and moves the gated RP90 by **−15 %**, because the desert terrain starts qualifying;
and the night rule covers **98.6 %** of the daylight crop. Binding: *ground-truth tested on every
palette variant it will be applied to, not merely on both sides of one comparison.*

**And a scope limit on a standing rule**: *"native outranks the upscale"* is about **colour
levels** and does not transfer to a **thickness** statistic, which quantises on the EDT's level
set — the same arcade night jet reads pose CV 0.00 % at 686×480 and 10.73 % on the native grid.
**A CV of 0.00 % on a quantised statistic is a resolution report, not a stability report**; publish
the number of distinct EDT levels the percentile took beside any pose CV.

**R9 PACING — five of ARCADE-PACING's six rows now pass on a kill-rate-matched pilot, where one
of six passed before.** `MAX_ALIVE` 14 → 6, `WAVE_GAP` 0.9–1.6 s → 7–13 s. Emptiness at the ≥3 %W
floor **0.0–3.1 % → 33.1–48.0 %** (`demo`), **59.0–67.9 %** (arcade-cadence); emission
**2.71–3.34 → 0.567–0.700/s**.

> **AND THE CRITERION ITSELF TOOK TWO CORRECTIONS FROM ITS FIRST REAL USE — both found by the
> lane using it, which is now this project's dominant way of finding defective criteria.**
>
> **(a) ARCADE-PACING had a STAGE-POPULATION defect, and it is ledger class 2 — in a criterion
> written this round to replace one that failed the same way.** The arcade's density ramps hard
> with stage: readable-presence runs **0.0 % (stages 3, 4, 11) to 66.7 % (stage 10)**, and
> **stage 1 — the only stage this project ever captures — runs 33–44 %, roughly DOUBLE the
> all-stage 19.0 %.** Gating a stage-1 capture against the all-stage mean would have told a lane
> to build a stage 1 emptier than the arcade's own. **Binding: match the stage population on both
> sides.** Emptiness is not stage-robust either (18.2–55.6 %). **The stage-1 gate is now OPEN and
> says so**: n = 9, ±2 SE 11.3–77.6 %, which excludes nothing. *Do not split the difference and
> invent a number.*
>
> **(b) Route B was a weaker bound than published.** AB2's **HIT counter may also increment for
> ground targets**, so 0.48–0.54 kills/s bounds *all* kills, not aircraft kills. **Demoted to weak
> corroboration; the 0.40–0.74 band is UNCHANGED** — its floor comes from the aircraft-only hand
> count and GAME_SPEC's own ADOPTED 0.67/s — **and the error's direction only widens the gap.**
> One weak observation on stage 1 runs against the caution (HIT 11 at both t108 and t114 across a
> visible ground detonation); a 3 s grid cannot attribute increments and settling it needs a pass
> keyed to each HIT step at ≤0.1 s.
>
> **Two rows re-scoped rather than failed.** *Mean-on-screen names its pilot* — the two arms
> straddle the band (0.63–0.90 kill-rate-matched, 1.58–1.76 `demo`), two pilots not two builds.
> And **it is not the spawner's row to close**: our `idle` residence is **3.05–3.16 s** against
> the arcade's ~3.3 s, so **the size-vs-depth geometry already matches** and the collapse to
> 0.99–1.31 s under fire is the **missile economy** — missiles are 47–77 % of kills and carry no
> span gate at a 22 %W radius (ledger row 41). Raising emission to refill it would break three
> rows that now pass.
>
> **Run-length now ships beside the emptiness percentage**, and the reason is a measurement:
> *before, the longest empty run in a 90 s run was 0.32 s and the median continuously-occupied run
> was 86.5 s* — a near-zero emptiness figure and a sky that never actually emptied. A percentage
> cannot tell a sky that empties once for eight seconds from one that flickers two hundred times.

**Second withdrawal-on-measurement of the round**: the pacing lane built the player-corridor fix
for the art critique's rank-1 item and **withdrew it** — the population cut alone halves >30 %
player occlusion (10.7 → 4.8 %), the corridor moved it **not at all** and made the worst frame
worse (50.7 → 65.0 %). Shipped inert with the arms and the refutation in the file.

**R9 DRAW-WEIGHT's mask rule is settled against GROUND TRUTH, and the test is reusable.** Only
our own sheets have ground truth — the alpha channel — and it decided a choice worth 40 % on RSW:
recovery against `alpha > 0` over all nine day cells is **92.4–94.3 %** for the licensed
achromatic rule against **20.9–61.6 %** for a four-role palette rule, whose worst case is **the
LEVEL pose** (57.6 % → **20.9 %** once the largest-component step discards the fragments it
creates). The same four-role rule recovers **86.1 %** on the arcade's jet. **A criterion comparing
two sides through a mask 86 % faithful on one and 21 % on the other is not comparing like with
like.** Binding: *a mask rule is validated against ground truth on BOTH sides; the arcade side can
only be checked by cropping and looking; a rule never tested against our own alpha is untested.*

**R9 DRAW-WEIGHT, two results worth carrying**: the art critic's bank-invariance claim is
**CONFIRMED by 24×** (INK/SPAN rotation CV 1.2 % against bbox fill's 28.7 %), and the arm that
looked like a counter-example was `SHRINK = 0.34` entering a dimensioned statistic — **INK/SPAN may
only be read at a matched span.** The gate is **RP90**, not the obvious choices: at matched ink and
matched span, one slab against four blades separates by INK/SPAN ×1.025, DENS ×1.037, RSW ×1.430,
**RP90 ×1.811** — *the statistics that read most naturally as "drawing weight" are nearly blind to
the defect the criterion exists to catch.* And **the stroke statistics are the MOST mask-sensitive of the four**: the
arcade jet's RP90 reads **3.64 / 7.51 / 9.73** on one frame under three mask rules, and RSW moves
**+40 %** across two of them. **A gate on RP90 is a gate on RP90-under-a-named-mask** — that clause
is load-bearing, not pedantic. The licensed rule is published in REFERENCE and includes a topology
condition that cost 78 px before either lane had written it down: **8-connected foreground,
4-connected background flood** (a diagonally-stepped ring encloses nothing under an 8-connected
flood, and the arcade's nozzle discs are bounded by one).
**And the round's sharpest process lesson came out of it: CROSS-VALIDATION CAN AGREE BECAUSE TWO
ERRORS CANCEL.** Two implementations agreed on RSW to 0.00 and RP90 to 0.01 — on two *different*
masks, the agreement produced entirely by the topology bug. It was published as evidence and
withdrawn within the day. **A suspiciously exact agreement between two independently built
operators is a reason to go looking, not to publish.** Ledger row 38's box. The far LOD was rebuilt
**100.0 % → 56.3 % bbox fill**, and **56.3 % is this design's floor, not a miss** — the
FULL-WIDTH-BAND invariant costs 37.5 % before a shaped pixel, against the arcade's 30.6–34.6 %.
**Do not open a gap for the residual.**

**User's own verdict after playing it: "it's very bad, lots of work to be done."** The score
trend measures convergence on measurable properties; it does not yet mean the game is fun or
convincing. Treat the player-experience gap as real and unquantified — see "What nobody has
judged yet".

**Reading any number in this file**: per REFERENCE.md "What a complete citation is", an
our-side figure is incomplete without its **tree state**. Everything marked R5 below was
measured on the **uncommitted shared working tree with six lanes live**, not on a commit.
The R4 critic and player-feel once differed 6 vs 9 deaths in 120 s for exactly this reason,
and both were right about their own tree. **The R5 judge measures a clean checkout.**

## How Rounds 6 and 7 are being run

Build lanes in `src/` with disjoint file ownership, plus a criteria lane, which owns
`REFERENCE.md`, `GAME_SPEC.md`, `STAGE_MAP.md`, `README.md`, this file and new `tools/`
scripts, and **nothing under `src/`**. R6's criteria work is in `judging/R6/lane-criteria.md`;
R7's is in `judging/R7/lane-criteria.md`.

**Everything marked R7 in this file was measured on the R5 judge's captures of `53ce86b` or the
R6 judge's captures of `e8fed58` — both clean checkouts — or on arcade reference frames. None of
it was measured on the live R7 tree**, which several lanes are changing concurrently. Re-measure
before quoting any our-side R7 figure against a new commit.

**Everything marked R6 in this file was measured on the R5 judge's captures of clean checkout
`53ce86b`, or on arcade reference frames — not on the live R6 tree**, which four lanes are
changing concurrently. Any our-side R6 figure must be re-measured before it is quoted against
a new commit; the airframe and enemy figures in gaps 1 and 2 in particular predate the sprite
lane's current work.

## How Round 5 was run

Six lanes on one tree with disjoint file ownership: criteria-fix (`REFERENCE.md`,
`GAME_SPEC.md`, this file), world, combatfx, presentation, sprite-art, player-feel.
Cross-lane agreements and every lead ruling are in `judging/R5/interfaces.md` (I1–I28) —
**read it before re-litigating anything below.** Per-lane evidence in `judging/R5/lane-*.md`.

## Criteria repair came first, and it was the biggest finding of the round

**Forty-three acceptance criteria have now been retired or repaired** as non-discriminating or
plain wrong (R8 added seven: rows 30–36; **R9 added seven: rows 37–43**, and updated rows 4, 29
and 32). **Rows 42 and 43 are the round's two caught-BEFORE-implementation rows** — both from the
title lane, both reported by the lane that was about to build against them.
**Row 37 is the consequential one and it is a different kind of row**: every row before it is a
criterion that *would have* moved the build the wrong way had a lane tuned to it; row 37 is one a
lane *did* tune to, for five rounds, passing every round. The maintained ledger is in REFERENCE.md ("The defective-criteria ledger") —
add rows there rather than re-counting. R5 added four: the cloud size/presence figures (a
correct operator over a 90 %-non-cloud population), the zero-cloud/HUD-overlap control, the
sea anisotropy ratio, and the aliased `?demo=1` canyon sd; R5c added the gap-5 deaths/minute
denominator and the stage-2 open-plain target. **R6 resolved six**, five of them new rows (11–15) plus the HUD row,
which R5 had left open as a candidate: the HUD ≥3:1 contrast
criterion (the arcade fails it), the player-airframe V ≤ 0.77 ceiling (inverted), the
near-black enemy dominant (measured on stage 2, applied to stage 1), the ≤1.5 deaths/min
threshold (the arcade fails it by 36 %), and two operator defects found this round — Criterion
A2's "distinct values per channel" meaning two different statistics, and the #132 cloud
operator's arcade-side HUD exclusion being unusable as published. **Three more came out of the
world lane's close**: the sea horizontal-decorrelation band and the R5 anisotropy restatement,
both **retired with no replacement** because their arcade side is a 686×480 video band carrying
19 896 colours and 11.4 % V-identity — a two-pixel-kernel statistic read off the codec — and
**Criteria A and B themselves, narrowed**: they are region averages, blind to arrangement, and
a sea of a few enormous flat slabs passed all four while scoring 20 points *above* the arcade.
Every A/B figure must now be paired with an extremal statistic.

**R6 named a sub-class and added a process rule for it.** Two of this round's retirements were
*correctly measured on the wrong stage's frame* and then applied to a stage the measurement
never covered. Every re-run of the operator reproduces the wrong number exactly, so
cross-validation cannot see it; only reading the stage digit can. **Binding from R6: every
palette or value criterion records the frame it was measured on, the stage digit read out of
that frame, and the stages it is licensed for** — REFERENCE.md, "Every palette or value
criterion names its stage". The existing criteria are backfilled there, and **one is flagged
UNATTRIBUTED** (the explosion/fireball targets: `ab2-gameplay.mp4` has no stage map).

They are all one defect class, now named once in `interfaces.md`: **a validated operator
pointed at the wrong population, resolution, region or sample.** It produces exactly
reproducible wrong numbers, and cross-validating two implementations cannot detect it. Only
cropping what the operator was pointed at and looking catches it.

**Five times this round a criterion or an ask was checked against the arcade before being
tuned to, and four of those checks reversed the intended direction.** That is the loop
working. **Before tuning to a criterion, check the criterion against the arcade itself.**

### R7 criteria work — ten ledger rows, and one of them is the scoreboard itself

Full evidence in `judging/R7/lane-criteria.md`. Rows 21–29 are new; row 20 is **restated**.
**Rows 24 and 25 came from the sprite lane finding defects in criteria it was being judged
against, publishing both readings rather than picking one, and asking** — the loop working as
designed. **Rows 26–29 came from the flow lane the same way, and they are a sharper case: all
four came apart WHILE THE LANE WAS USING THEM. Nobody went looking.** That is now the dominant
way defective criteria surface in this project, and it is an argument for lanes reporting the
criterion that fought them, not only the result they got.

**Two of the four — 28 and 29 — were settled by running an experiment rather than winning an
argument** (a three-arm isolation that changed one constant at a time; a contiguous decode at a
sampling interval fine enough to see the thing). Both refuted something the lane itself had
written down first. Worth copying.

| row | what changed |
|---|---|
| **20** restated | fireball brightest-decile saturation **stays dropped, the published reason was wrong.** The 0.952 that justified dropping it came from a different operator than the criterion's own numbers. Under the criterion's own operator (not-background largest component, deciles ranked by **R+G+B**, saturation of the decile's **mean colour**) **ours reads 0.062 against the arcade's 0.066 — we pass, and we land on the arcade's core colour.** Under the FIRE-MASK/V-ranked reading **the arcade fails too, at 0.632.** It is under-specified, not a false negative. **The decile ladder is a win nobody claimed**: our ends match the arcade's to a level; only the middle rungs run hot |
| **21** new | **the Criterion A/B scoreboard was stated without its population** — see the box at the top of this file |
| **22** new | **VALUE-STAT never said whether `V = 0` pixels are kept.** The anchor keeps them, the sprite lane's V-CENSUS drops them, and the two agreeing at 0.8392 is a coincidence (one ladder rung), not corroboration. ~~Ours reads **0.643** under the band's own operator.~~ **R8: that 0.643 was `e8fed58` and went stale the same round — on the shipped tree ours reads 0.8392 (black share 18.9 %) and all three clauses of the band are met.** The rule stands; the figure attached to it did not |
| **23** new | **the published arcade HUD reticle rect is fitted to level flight and the attitude line rotates out of it** — measured `y` 0.067–0.299 at native against a rect stopping at 0.219. **Promoted out of the cloud block into a standing rule**: every operator that counts or classifies objects blanks the HUD first, both sides, and says it did. The upper-right HUD has now been counted as a cloud, a cloud bank, a false horizon and **twice** as an enemy aircraft |
| **24** new | **JET-SIL's afterburner mask was validated on a NIGHT crop only**, where the keyline is blue-grey and cannot enter a red-hue mask. The arcade's **daylight** keyline `#840000` is hue 0.0°, S 1.000, **V 0.518** and walks through the published `V ≥ 0.45` floor, so our day nozzle separation read **15.3 % instead of 30.6 %** — a published discriminator lost to mask contamination, not to the art. **Floor raised to `V ≥ 0.70`**; nothing measured lives between 0.52 and 0.90. **The deciding test, now a general rule: the arcade's own control returns 30.0 % under BOTH floors.** An operator change that moves our number and leaves the arcade's untouched is the right kind; one that moves both is retuning the criterion to the build |
| **25** new | **Criterion A3's "aircraft ≤ 8 colours" was derived from the NIGHT jet** and applied to every aircraft, while the same table's daylight row records **14 total / 7 at 95 %** — it failed the arcade's own daylight aircraft (13 colours, reproduced independently). **Re-licensed per variant, not loosened**: the gate becomes **`n95 ≤ 8`**, which the arcade passes on both variants (daylight 6–7, night ≤8) and we pass on both shipped sheets (day 7, night 6). Totals are published per variant as licensed facts. **The roll sheet's `n95 = 9` is a flagged exception with no arcade target** — see acquisition item 3 |
| **26** new | **gap 5's "top third" framing should not be a target.** The arcade's own player top-third share is **0.92 %, one observation in 109** — tuning a scripted path to reproduce a 1-in-109 event is tuning to a single observation. Restated as **spread**: p5 within ~3 points of 36.4 %H, sd within ~1.0 of 7.73, reachable extreme demonstrated separately. **Do not gate a top-third percentage in either direction** |
| **27** new | **a seven-point arcade-vs-arcade contradiction that was a UNIT MISMATCH, and it cost an hour because both numbers were right.** #122's cruise `cy` 52.8 %H is a **pixel centroid**; the player hand counts' 49.47 %H is a **bbox centre**; the document's own 1.3–3.3 point conversion reconciles them. **Nothing is found by re-running either operator** — this defect is invisible to every check we have except a unit label. Binding: **a bare "%H" is not a reportable quantity** |
| **28** new | **GAME_SPEC §2's "flight time is the denominator invariant to death-cycle length" is REFUTED by controlled experiment.** A three-arm isolation changing `DEATH_TOTAL_S` and nothing else moved **both** denominators, in opposite directions (wall −0.143, flight +0.098), because **threats are produced on wall time while exposure is counted in flight ticks**. Gate unchanged, stated reason withdrawn |
| **29** new | **GAME_SPEC §2's "no visible invincibility flash" is WRONG** — the arcade flashes the jet **1.67 s at a 0.267 s period**. Four passes missed it because each state lasts 0.10–0.13 s and **any sampling coarser than ~0.1 s aliases it away**. Generalised: *a negative about a periodic behaviour is only as good as the sampling interval it was taken at.* Second MEASURED-tagged negative this round that the arcade turns out to have |

**GAME_SPEC §3 element 1 — the nose sight — is REAL, confirmed, and must not be re-opened.**
Two R6 lanes independently concluded from 4 and 16 frames that the arcade has no nose sight and
that we were drawing an element it never had; the R6 combat lane said it exists. **Combat was
right.** It is now found in six places by three reviewers, including a **true-native** frame in
R7 that shows the nose sight on flat sky, with nothing within 4 px of it, alongside the
upper-right reticle. **Measured: 5 × 5 true-native px = 1.563 %W** (corroborated 11 × 11 video px = 1.604 %W
at t201.4). **Ours is 3.125 %W, ~2× too big; target 1.4–1.8 %W.** The **vertical** offset is
**not** a retune target yet — across three zero-enemy frames the sight sits 7.8 %H above, 8.8 %H
above and, in a hard bank, **12.0 %H below** the airframe, so whatever carries it rolls and
`SIGHT_NDC_Y_OFFSET` does not. **Recording a negative result that was checked and overturned is
worth as much as recording a defect** — this is the second time a lane has nearly retired
something real.

**And the method lesson, which is the generalisable part**: what nearly cost us a real HUD
element was not a bad operator. It was **four frames, then sixteen frames, concluding absence**,
twice, independently — normally this project's strongest evidence pattern, here two draws from
one biased sample. The lane that got it right chose its frames **by a rule written before the
question was asked**. **For a negative claim, the sample selection is the whole measurement.**

**Night reading C is 0.067 below the arcade ON PURPOSE. Do not "fix" it.** The R7 sprite lane
took it from 0.969 to **0.902** deliberately and said so. Mechanism, measured: the arcade's
night jet spends **2.8 %** of its airframe on `#a4b5e6` where ours spends **18.7 %** — **its
night and day sprites distribute their rungs differently and ours is one drawing indexed into
two ladders**, so matching C on night means mismatching it on day. The one-line fix was
identified and rejected: night has **no published value gate**, and collapsing the rung costs a
real value step across the blades, engine bodies and lower fuselage. **Trading a visible value
step for a number nobody is scored against is this project's named failure mode.** Recorded as a
known, reasoned divergence in REFERENCE.md so the next lane does not close it.

**A new process rule from the sprite lane's own tooling: assert the INPUTS, not the output.**
It shipped a **silent-erasure** bug — three roles added to a shared `levelOps()` and not to the
roll sheet's role tables, so `PixelCanvas.set()` received `undefined` and **erased** those
pixels. The sheet grew holes, no error. **Four gates passed it**: `assertPalette` because the
colour count went *down*; `vite build` because it is a property access; `sheet_visibility`
because a sprite with bites out of it is still visible; and every capture, because the sheet is
unwired. **`git diff --stat` caught it, not a gate.** The lesson in its own words: *an API where
"no colour" means "erase" cannot tell a typo from an intent, and every count-based gate is blind
to it.* Fixed with an `assertRoles` guard validated on known-bad input. REFERENCE.md now carries
this as a binding process rule.

**The wing inversion is now confirmed TWICE, independently.** The R7 sprite lane re-measured
rather than taking its predecessor on authority and found the arcade's wing top edge **rising
~10–14 %H outboard** (seven sample columns on t175), agreeing with R6's 9.2 %H. **Two
measurements, one direction, and the gap text says the opposite.** See gap 2.

## What works end to end

Title screen → flight → combat → death/respawn → stage-end tally → stage 1/2/3 progression →
continue → restart. Verified by the R4 judge, with R5 corrections marked:

| Area | Verified state |
|---|---|
| Composition | Horizon 62.50 %H, jet span 35.62 %W, centroid 57.08 %H — inside arcade bands. **R5: `?demo=1` is two populations** — canyon cy 63.52 %H is out of band *on purpose*; capture cruise only or split by regime (`simTime % 16 < 11`) |
| World roll | Rigid about screen centre, 74.5°/s, saturates ~66.5°; jet banks at 0.800× (pixel-confirmed); HUD stays upright |
| Ground | Scrolls correctly (was literally zero in R2); contrast/foam near arcade. **R6: sea anisotropy has NO arcade target — the R5 restatement (4.95× vs 5.21×) is RETIRED too** (ledger rows 6/16/17). Its arcade side came from a 686×480 video band carrying 19 896 colours and 11.4 % V-identity; the statistic even reverses sign with resolution (3.04× at 686×480, 4.56× at native, opposite directions). Quote it only as a same-operator regression guard between our own builds, with the resolution named |
| Combat | 10–14 aircraft on screen; ~~66.6 % of frames have an enemy ≥10 %W~~ **— R9: THAT IS NOT A PASS, IT IS THE DEFECT. The arcade reads 19.0 % and the gate behind this line is RETIRED (ledger row 37).** Ours was 80.4 % after R8; salvo of 6 missiles; trail occupancy 98 %; lock brackets 1–2 px |
| Explosions | Palette fixed — saturation 0.879, p50 `#c25e02` (exact). **R6: the core figure R5 published was wrong in SIGN** — our core was **28–32 %** against the arcade's 9.2 %, not the 4.1–7.8 % recorded, because FIRE-MASK's control regions were never published and the operator over-read. R5's lane, the art critique and the lead all endorsed holding a value derived from a number the operator could not produce. Now **9.1–12.3 % core at mean S 0.824–0.846** against the arcade's 9.2 / 0.846. `V>0.95` is the one statistic slightly low (40.7–48.6 vs the ≥45 gate) and was **deliberately not fixed** — the lever is spike thickness and the spikes are a separately flagged art defect |
| Scoring | Passive 3300.0/s exactly, frozen through death, HIT survives death, HIT×20,000 at the tally |
| Death cycle | Fireball → 53.4 %W starburst → tumbling hulk → oversized bottom respawn + READY card. **R5: non-interactive time per death 8.5 s → 5.2 s** (player-feel, self-reported) |
| HUD | Every word legible (5×7 font); odometer missile stock; rotating reticle attitude line |
| Audio | 11 synthesized SFX + engine loop + original FM music, wired to all state/combat events; 0 errors headless |

## R5 deliveries, with their verification level

Lane self-reports unless marked. **Nothing here is judge-verified.**

| | state |
|---|---|
| **Cloud banks (R4 gap 7)** | width median 7.19 → **18.12 %W**, height 5.36 → **20.54 %H**, presence 50.6 → 70.0 %. Lead-verified by capture. Carry the known bias: published counts over-count **3.1 %** and under-state width **0.9 %** from HUD severing, and it grows with any new horizontal HUD rule |
| **Cloud palette per stage** | `flow.js` switches on stage change; lead-verified at tick 2460, stage digit 2 |
| **Stage-2 open plain (part of gap 6)** | KEPT by lead ruling. **R5c correction: ours does NOT bracket the arcade** — our median 9.9 % against the arcade's **19.7 %** over 65 frames, and our maximum sits below the arcade's p75. More open plain and more swing is still owed |
| **Stage-3 city lights** | fixed and dramatic, and the lead checked the arcade before letting anyone dim them: the arcade has this condition **~3× harder than we do** (9.76 % of its bottom HUD band brighter than the cream glyph ink, against our 3.40 %) with **no opaque plate** behind the row. **Ruling: do not dim them**, and **do not add glyph outlines there** — our HUD is already 2–24× more separated from its background than the arcade's |
| **Night jet pose sheet** | selected in-game and measured at 345 px span: all four silhouette discriminators pass. Roll sheet built, measured, and **deliberately unwired** — inert, one line to enable next round |
| **Capture tooling** | three silent-corruption bugs fixed: HMR reload mid-run, a drawing-buffer race producing all-black frames (1/30 → 0/90), and the same HMR defect in `combat_probe.mjs`, which a judge reads combat ground truth from. The read-back change was verified **pixel-safe** (30/30 byte-identical) |
| **Build boots** | a mid-edit `ReferenceError` in `src/ui/hud.js` broke every capture and probe for part of the round. **Re-verified booting 2026-10-05** on the working tree (`tools/out/criteria-fix-r5c/boot/`) |

## Ranked gaps — R4's list, updated

Three of the eleven are closed or withdrawn; the rest stand.

0. **[R7: THE GATE PASSES ONLY IN THE POPULATION IT WAS MEASURED IN. In ordinary play the
   build fails Criterion A2 on 48 of 49 digit-verified stage-1 frames — 28–98 channel values
   against ≤32 — and the arcade's own native frames carry enemy traffic and a 33 %W fireball
   while reading 31 and 17. The defect did not halve; it relocated, from `clouds.js` into
   `effects/explosions.js` (dominant) and `weapons/enemyShots.js` (second, and enough on its
   own). Audit by CLASS — assert every composited element's rendered pixels are a subset of
   its authored palette, the way `hud_palette_probe.mjs` already does for the HUD. And stage
   3's night ground fails Criterion B's V gate at 43.8 % on the right four colours, arranged
   as per-pixel dither where the arcade lays flat regions. Ledger row 21.]**
   **[R6: the world lane rebuilt stage 1's sea and now passes all four gate readings — but
   read the pairing rule before you trust that, and read it before you touch any other
   stage.]** The gates are region averages and are blind to *arrangement*: an intermediate
   build of this same sea passed all four while being a few enormous smooth slabs, and scored
   H-identity **89.3 %, twenty points above the arcade's own 68.7 %** — the gate improved as
   the art got worse. **Every Criterion A/B figure must now be reported with an extremal
   statistic** (largest component, max extent, count); REFERENCE.md ledger row 18 and the
   degenerate-structure process rule. The original gap, left here because stages 2 and 3 are
   not closed:
   **STAGE 1 FAILED BOTH PROJECT-WIDE GATES BY TWO ORDERS OF MAGNITUDE — and it had never
   been on a gap list.** Criteria A (colour cardinality) and B (adjacent-pixel identity) have
   been published as GATES since R5 and were cited in no gap list, no ask and none of the six
   R5 lane reports. Stage-1 flight: **13 879 colours** against the gate's 256 and the arcade's
   138; **ground V-identity 0.1 %** against the gate's 50 % and the arcade's 68.5 %. The R5
   judge names this as the mechanism behind the owner's "it's very bad": every other criterion
   on the board measures composition, geometry or palette, and **none of them measures the
   texture of the pixels**, which is what a player actually looks at. We render continuous-tone
   noise where the arcade renders structured pixel art. **Scoping, and it is good news: stages
   2 and 3 are close** (374 and 989 colours; H-identity 64.2 % and 60.0 %) — the R5
   palette-snapping worked. **Stage 1's sea shader is the single outlier**, and it is the stage
   every judge, screenshot and new player sees first. Independently re-measured R6 on a second
   implementation; per-stage scoreboard at the top of REFERENCE.md.
1. **Enemy aircraft reads as "a slab with a bullseye"** — highest visible cost. Livery API
   agreed (I1); sprite lane owns the redraw. The arcade's stage-1 rear-aspect jets have
   **near-black nozzle rings with a hot orange centre** and read **mid-grey**, not white.
   **R6: the "near-black dominant" prescription is RETIRED for stage 1** (ledger row 12) — it
   was measured off `ab2-arcade-closeup-enemies.jpg`, whose HUD digit reads **STAGE 2**. The
   arcade flips enemy value per stage; stage 1's enemies are **pale grey-white with green wing
   camo and dark accents** (V median 0.557–0.582, light:dark **1.8–1.9 : 1**), ours is
   **0.06 : 1** — inverted by ~30×. New gate: **share(V>0.7) > share(V<0.3) by ≥1.5:1** on
   stage-1 liveries. Nothing changes for stage 2, where `camo` is correct.
2. **Player jet fins/nozzles** — criteria replaced and the day **and** night sheets now pass
   all four discriminators. **R6: the dominant residual is TONAL, not geometric.** R4's
   **V ≤ 0.77 airframe ceiling is RETIRED** (ledger row 11) — it was the brightest *cluster
   centroid of a median-cut quantization* quoted as the brightest *pixel*, and it capped us
   **below the reference aircraft's own median**. The arcade's daylight jet is **white**:
   achromatic V median **0.816–0.922** across five stage-verified stage-1 frames and **0.839**
   on the true-native frame, with **45–65 %** of pixels above V 0.80. ~~Ours: median 0.643,
   maximum 0.773 (`#c5c5ad`), 5.3 % above V 0.80.~~ **R8 — THIS IS CLOSED AND THE STALE FIGURE
   WOULD HAVE SENT A LANE TO FIX IT TWICE.** On the shipped tree (`82365e9`, re-derived
   independently from the R7 judge's `jet-on`/`jet-off` captures) ours reads median **0.8392**,
   max **1.000**, **63.4 %** above V 0.80 — the arcade's 0.839 / 1.000 / 59.5 % on all three.
   The 0.643 and 0.773 above were measured at `53ce86b` and `e8fed58`. New band: **V median
   0.78–0.92, brightest body colour ≥0.90**, daylight stages — **met**. Carried forward from R5 and still true:
   our blades are shorter and less canted, **our wings sweep DOWN outboard where the arcade's
   RISE** (corrected R7 — see below), nacelle pods are smaller — but geometry is third-order
   against a 10× difference in highlight share.
   **R7, two corrections to this gap's own text.**
   (a) **"Wings need anhedral" is the wrong sign and must not be implemented.** The R6 sprite
   lane measured the arcade's wing top edge **rising 9.2 %H from root to tip** while our R5
   sheet **dropped 17.5 %H**; the direction was re-checked against the arcade on a level astern
   crop in R7 (`tools/out/criteria-r7/arcade-combat/t175-jet-4x.png`) and the crop agrees. The
   sheet was already redrawn correctly in R6 — this was a gap-text defect only.
   (b) **"Ours 0.839 = arcade 0.839" is two different operators** (REFERENCE ledger row 22).
   VALUE-STAT never said whether `V = 0` pixels are kept; the published anchor keeps them and
   the sprite lane's V-CENSUS drops them, and the exact agreement at 0.8392 is a coincidence —
   214/255 is one ladder rung both landed on. ~~Under the band's own operator our airframe
   reads 0.643 against the arcade's 0.839 and the median clause is still missed.~~
   **STALE — STRUCK R8.** That reading is `e8fed58`, taken before the R7 sprite sheet landed in
   the same tree. On the shipped tree the band's own operator reads **0.8392**, the median
   clause is **met**, and the lever named below has already moved: the black share of the
   achromatic mask is **18.9 %**, not 30.7 %, against the arcade's 22.2 % — **we are now on the
   arcade's side of it.** Brightest body colour 0.773 → **1.000**, share above V 0.80 5.3 →
   **63.4 %**. Publish the black share beside any reading-A figure: the median is a **step
   function** of it (REFERENCE's VALUE-STAT box has the sweep and the window).
3. **HUD typography** — **the contrast half is CLOSED (R6).** The ≥3:1 criterion was run on
   the arcade's own bottom strip by two independent operators and **the arcade fails it on its
   own red ink on stages 1 and 2**; it is retired (REFERENCE.md ledger row 10) and replaced by
   the mechanism — white plate behind SPEED and the throttle bar only, no plate behind STAGE,
   black keyline on the stage digit and the missile stock, which we already do. "The cream
   stage digit is invisible over stage 2's tan ground" is **no longer true**: ours 5.64:1
   against the arcade's 5.92:1. **Scope reduced: stage 3 needs nothing** (I21-REVISED), and
   **do not add halos, outlines or plates** — ours is already 2–24× more separated than the
   arcade's. What remains is typography alone.
4. ~~Missile trail black~~ — **criteria defect fixed** (white in every stage, night only ~6 %
   dimmer). Build-side verification still owed.
5. **We are ~50 % more lethal than the arcade** — **the arcade's own rate is now MEASURED,
   twice, independently** (GAME_SPEC.md §2): **1.91/min** (R5 judge, READY-card template match,
   all 60 candidates crop-verified) and **2.04/min** (R5 feel critic, 27 deaths over 793.8 s,
   partitioned by 9 continue screens), wall clock; **2.78–2.94** on flight time. Ours is
   **3.00**. The old **≤1.5 gate is RETIRED** — the arcade fails it by 36 % — and replaced by
   **≤2.0 deaths/min of wall clock**, flight time reported on the same line. Carry the
   pilot-dependence **with** the gate: 0.00 (superplay) / 2.04 (human) / 2.90–3.00 (our
   non-reactive autopilot) is three pilots, not three games, and an autopilot that cannot dodge
   dies only 1.42× as often as a human who can — so **fail it and investigate; do not
   reflexively make the game easier.** Playable share already matches (arcade 69.4–73.5 %,
   ours 71.9 %), which closes gap 5's pacing half. Pilot-independent properties (warning time,
   shots in air, telegraph count) remain the better criterion and their arcade targets are
   **still unstarted**.
   **R7 — one half closed, the gate still MISSED at 2.114, and the lane refuted its own
   prediction with an experiment.** Three-arm isolation, 7 seeds × 300 s each:
   **flight share 78.20 % → 70.70 %, mid-band, PASSES** — the R6 judge's "we are above the
   arcade's playable share" is closed. **Wall clock 2.229 → 2.114, still over ≤2.0** by 0.94
   standard errors. The decomposition is the point: **the death cycle carries the whole of the
   improvement (−0.143); `ENVELOPE_Y`'s effect on lethality is NOT MEASURABLE (+0.028, a
   quarter of one standard error).** The lane had written the opposite into a draft on
   arithmetic, before the middle arm existed, and the experiment refuted it. **Nothing in that
   lane's files closes the remaining 0.114 without making the game easier**, which the gap text
   explicitly forbids — so **the miss ships with its mechanism published and an ask, rather than
   being absorbed.** That is the correct outcome; do not close it by shortening
   `RESPAWN_INVINCIBLE_S`, which R7 just gave an arcade anchor (GAME_SPEC §2).
   **Two criteria came apart while being used here** — the flight-time denominator's stated
   invariance (ledger row 28) and the "no visible invincibility flash" negative (row 29).
   **And the altitude half of this gap is re-framed: do NOT tune to a top-third percentage**
   (row 26) — the arcade's own player top-third share is **0.92 %, one observation in 109**.
   The criterion is **spread**: p5 44.9 → **38.7** against the arcade's 36.4, sd 6.07 → **8.22**
   against 7.73, with full stick reaching **27.02 %H**, the arcade's own minimum.
   **A difficulty gradient nobody has checked against the arcade** also appeared: deaths per
   flight-minute by altitude band runs **4.747 in 56–64 %H against 0.658 above it — 7.2×**, and
   about half our flight time is in the dangerous band, substantially the canyon regime. Worth
   someone's attention; reported, not called a defect.
6. **Stage 2/3 grounds have no structure** — improved, not fixed. Stage 2's palette snapped
   from 238–258 colours to 70–72 against the arcade's 42, and an open-plain regime now
   exists, but the terrain band is a smeared longitudinal streak symmetric about the flight
   axis where the arcade's is one diagonal mass. **A composition fix, not a terrain fix.**
7. ~~Clouds too small~~ — **closed**: 7.19 → 18.12 %W against the replaced criteria.
8. **Title typography is placeholder**; no attract-mode gameplay demo cycle.
9. **Card sizing/colour** — CONTINUE PLAY ~2× oversized, INSERT COIN cyan instead of red,
   countdown drawn behind the jet.
10. ~~Explosions have no white-hot core~~ — **closed, and the criterion behind it repaired
    THREE TIMES**: FIRE-MASK's three exclusion regions are **published** (ledger row 19); the
    brightest-decile saturation gate is **dropped** (ledger row 20) — ~~false negative by
    construction on our palette~~ **RESTATED R7: under-specified, and the arcade fails it too
    at 0.632 under the reading it was dropped on. Under the criterion's own operator ours
    reads 0.062 against the arcade's 0.066 and PASSES.** Original note: **criteria defect
    fixed** (targets: ≥40 % of pixels above V 0.95, brightest-decile saturation ≤0.30).
    **The decile ladder is a win nobody claimed** — ours `#9e0000 → #c80c01 → #efa00c →
    #fbdb2a → #f6f6e6` against the arcade's `#9b0304 → #d2050c → #f25908 → #f6d619 →
    #f7f6e6`; ends match to a level, middle rungs run hot. **The explosion is still the
    dominant Criterion A failure in play** (gap 0) — that is a compositing defect, not a
    palette one.
11. **Still entirely absent**: barrel roll (art is built and unwired), throttle/speed control,
    resupply stages, enemy variety and liveries, canyon stages, the full 23-stage structure,
    landmasses/islands/carrier — enemies still arrive in a single-file diagonal queue.

## What nobody has judged yet

- **Feel and fun.** Every judge so far measures pixels against reference frames. Nothing has
  evaluated responsiveness, difficulty curve, pacing, or whether playing it is enjoyable. A
  player-experience critic round is the obvious next addition to the loop.
- **Audio by ear.** It is wired and error-free, but musicality, the vulcan rate, the explosion
  weight and the afterburner swell have never been heard by a human. Audition at
  `tools/audio-preview.html` (`npm run dev`, click once to unlock).
- **Round 5 itself.** Six lanes delivered against repaired criteria; none of it has been
  independently re-measured.

## Open items carried forward

- **R7, OPEN: the published cloud-bank SIZE distributions still use the short reticle rect.**
  Ledger row 23 widened the rect for *counting* operators (`(0.720, 0.055, 0.965, 0.330)`)
  because the attitude line rotates out of the old one. The size figures were deliberately
  left on the old rect so they stay internally consistent, and they already carry a known
  severing bias (counts over-count 3.1 %, widths under-state 0.9 %, growing with any new
  horizontal HUD rule). **Re-deriving them on the wider rect is owed, and is a change in the
  numbers, not a documentation fix.**
- **R7, OPEN: the nose sight's VERTICAL offset needs TWO frames, not one.** Across three
  zero-enemy arcade frames it sits 7.8 %H above, 8.8 %H above, and 12.0 %H **below** the
  airframe — the third in a hard bank. Whatever carries it rolls; `SIGHT_NDC_Y_OFFSET` is a
  fixed screen offset. Measure a **level-flight** zero-enemy frame *and* a **hard-bank** one,
  and fix the frame of reference, before moving the constant. The **size** half is settled
  and actionable: 5 native px = 1.563 %W, ours 3.125 %W.
- **R7, OPEN: the arcade enemy-altitude re-count has been ATTEMPTED and has not succeeded.**
  The R6 judge reached six confident observations and published the attempt rather than a
  number, which is the right call. The bar is unchanged (≥60 observations, ≥40 stage-verified
  frames, by a third party, within 10 points of 32.5 %). Two operator additions are now
  binding — blank the HUD by the standing rule, and choose frames by a rule written before
  the question is asked. Prefer open-water/open-desert spans: both attempts lost their
  observations over dense terrain.
- **Stage-1 cloud presence is UNRESOLVED**, not a gate. The shipped 70 % / count 1-2-4 is
  **ADOPTED, not MEASURED** — do not cite it as an arcade fact and do not judge against it.
  Re-open needs aircraft/plume/surf rejection validated against a human on all 120 labelled
  components of t93–120, or a hand count over a longer span.
- **Stage-1 sky `#009eff` carries the video level expansion.** The arcade's ladder tops out
  at `0xf7`; every video frame tops out at `0xff`. Stage 2's sky was 12 levels too bright in
  R before correction. There is **no native stage-1 frame in this repo**, and neither
  686×480 nor 1028×720 is an integer multiple of 320×224, so native cannot be recovered by
  decimation. A native stage-1 screenshot would settle it immediately.
- **The player respawns into live fire** — 17 % of lives end within ~1 s of the 2.0 s grace
  expiring, because `flow.js` no longer clears shots on death (which is what bought the
  playable-share gain). Combat's call: threat-aware grace, or a `clearShots()` entry point.
- **Published jet-centroid numbers ran ~2–3 points optimistic for two rounds**; the operator
  is now published and reproduced to 0.01 points on two independent implementations
  (pixel centroid 57.51 %H, bbox centre 55.06 %H, span 35.94 %W). Watch for the two
  definitions being quoted as one statistic.
- **Nine genuinely drawn perspective bank poses** for the player jet — the current nine are a
  rotated and foreshortened planform.
- **A true-native stage-1 screenshot is now the highest-value acquisition this project can
  make.** It would settle **four** separate open items at once: the `#009eff` sky level (which
  carries the video's level expansion), Criterion B's floor on a stage-1 *sea* patch (currently
  extrapolated from two frames that are stage 2 and stage 3, neither of which is sea), the
  horizontal decorrelation band (ledger row 16) and the cross-track anisotropy target (row 17).
  Three of those four are **retired for want of it**, not for want of effort. Neither 686×480
  nor 1028×720 is an integer multiple of 320×224, so decimation cannot substitute.

### THE ACQUISITION LIST — SIX measurement programmes are blocked on footage we do not have

Listed together so anyone acquiring frames knows what to look for. **All six are true-native
320×224 screenshots**; a video frame at any resolution satisfies none of them, because neither
686×480 nor 1028×720 is an integer multiple of 320×224.

**The one candidate in the repo has been tested twice and fails.**
`reference/ab2-arcade-desert-explosions.png` is 400×280 = **exactly 1.25×** of native, which
would be recoverable *if* it were a nearest-neighbour upscale (a 5/4 nearest scale duplicates
every fifth column, so dropping those columns reconstructs the original). It is not. R8 tested
all five phases: **column duplication rate 0.013–0.025, row duplication 0.000**, and the file
carries **34 969 colours / all 256 channel values**. It is filtered, unrecoverable, and useless
for anything cardinality- or palette-shaped. Independently reproduces the R7 criteria lane's
finding; recorded here so it is not re-tested a third time.

| # | what to acquire | what it unblocks |
|---|---|---|
| **1** | a true-native **stage-1** frame (sea) | the `#009eff` sky level, Criterion B's floor on a stage-1 sea patch, ledger rows 16 and 17. **Three of the four are retired for want of it.** |
| **2** | a true-native **LEVEL astern** frame of the player jet, any daylight stage (**NEW, R7**) | **every true-native frame in this repo is a BANKED pose.** `ab2-arcade-desert.png` and `ab2-arcade-night-banking.png` both are, and the authoritative level crop (`stage3-night-level-t175.png`) is a 686×480 video upscale carrying **3 133 unique colours over 5 147 px** — fine for shape, useless for a colour census. The sprite lane tried it and discarded it rather than publish off it. Blocks: comparing our black **role area** against the arcade's 18 % on a level cell (the arcade's 18 % is measured on a banked pose where the nozzle discs face the camera and read as large filled circles, which our 2-D-rotated planform cannot reproduce); and any per-variant `n95` check on a level daylight sprite. **R9 widens it: the DRAW-WEIGHT arcade column for the player jet is n = 1 and BANKED** (INK/SPAN 7.07–7.32, SW 2.0 px, bbox fill 15.0 %, dark-accent share 44.7–46.0 %, measured twice on two implementations). A second observation needs a level astern native |
| **3** | an isolated arcade **barrel-roll** sprite (**NEW, R7**, lower priority) | the roll sheet's `n95 = 9` has **no arcade target at all** (ledger row 25). The only roll reference is `stage4-barrel-roll-t222.png`, 1028×720 video. Until this exists, **do not tune the roll sheet's palette to a number** |
| **4** | a true-native **DAYLIGHT frame holding an explosion** (**NEW, R8**) | **what it does NOT block, stated first, because R7's gap list had this backwards:** it does **not** block Criterion A2's licence. A2's ≤32 is the width of the hardware's colour ladder (REFERENCE ledger row 31), so no 1987 frame of this game could exceed it, explosion or not. What it **does** block is the **colour** half: the only arcade fireball palette anchor we hold is `ab2-arcade-huge-explosion.jpg` at **181×127**, and the only native blast is a **night** one whose warm pixels cost **0** channel values but **27 of 79 colours**. The one daylight native in combat spends **138 of 256** colours *with no explosion in it*, and daylight-with-explosions is the population our build is scored in. Blocks: a daylight fireball colour budget, and the fireball's palette against a bright sky |
| **5** | a true-native **NEAR-ASPECT enemy aircraft** (**NEW, R8**) | both true-native frames carry only **distant** enemies — measured, ~10 × 12 px of aircraft inside a 19 × 20 crop — and every near-aspect enemy reference (`ab2-arcade-closeup-enemies.jpg` 1440×1080, `stage1-missile-salvo-t100.75.png` 1028×720) is a video upscale with thousands of colours, on which a **single-colour-component operator cannot run at all**. That is why `enemysil.py`'s feature gate has never been checked against the reference and is now retired rather than tuned to (ledger row 36). Also the only route to a stage-1 enemy livery target that is not a video upscale. **R9 widens it: also the only route to a DRAW-WEIGHT arcade column for the near-aspect enemy, the object the R8 art critic ranks 2nd** |
| **6** | a true-native frame of the **CARRIER**, the **TITLE** screen, or a **DEATH HULK** (**NEW, R9**) | **DRAW-WEIGHT is explicitly UNLICENSED on all three** (REFERENCE.md). Their only references are 686×480 video, where INK/SPAN is read at **2.14× our native scale** *and* the mask needs a tolerance that **adds** ink at low values and **removes** it at high ones — a statistic that is a function of a knob. **Three objects the R8 art critic ranks in his top nine have no drawing criterion at all and cannot have one from the footage in this repo.** Note the night true-native (`ab2-arcade-night-banking.png`) cannot substitute for the player jet either: its jet is **inside a 37.8 %W fireball** and cannot be isolated — second measurement programme that frame has defeated, recorded so it is not attempted a third time. **R9 adds a CONDITION rather than a sibling item: a true-native TITLE still is INSUFFICIENT for the sphere plate unless its PHASE is stated** — the plate tumbles and approaches (ledger row 43), so a native still of an edge-on pose would reproduce the defect at higher resolution. A **tumble sequence** is NOT an acquisition item: one was extracted this round from `ab2-longplay.mp4`, which is how row 43 was settled |
- **`hazeSteps` is read by `paramsFor()` out of `stage.terrain`, NOT out of `stage.haze`.**
  Putting it under `haze` beside `bandHeightFrac` — where it reads as if it belongs — is a
  **silent no-op**: no error, no warning, the posterization simply does not happen. The R6
  world lane wrote it in the wrong block first and caught it only by grepping the consumer.
  Grep where a key is consumed before trusting that setting it did anything.
- **R7: there IS a third, and it is that the duplicate is in a DIFFERENT DIRECTORY.** Every
  sweep this project runs checks duplicates *within* a capture set; nothing checks *across*
  sets, and a pooled figure is exactly where that matters. Live instance:
  `tools/out/tl-verify-9-{1,2,3}` hold byte-identical frames (one invocation run three times as
  an instrument check, then kept) — three directories carrying one directory's information, and
  every within-set sweep passes. **Hash every frame of every set feeding a pooled figure and
  report the cross-set duplicate count beside it.** With it, a naming convention that costs
  nothing: **a control/smoke-test capture directory is named `-control` and no pooled figure may
  include one** — or it is deleted. And the detector that found it, which works when names and
  timestamps do not: **a capture set's age is visible in its content, and the component that
  dates it is whichever one a lane most recently rebuilt** (sky 15 colours and jet 40 said
  nothing; a 9 430-colour ground dated the set to before the stage-1 sea rebuild). All three in
  REFERENCE.md, "Capture sets: sweep for duplicates ACROSS sets".
- **R9, OWED AND NOT BLOCKED ON ANYTHING — a DIRECT arcade emission count.** The arcade's
  **0.40–0.74 aircraft/s** rests on Little's law with `W` taken from GAME_SPEC's existing
  MEASURED 4–6 s approach rather than re-measured, and three independent routes agree on it, so
  nothing in R9 depends on tightening it. **It is deliberately NOT on the acquisition list**,
  because the footage is already here: `.reference-cache/video/ab2-longplay-60fps.mp4` supports a
  contiguous decode fine enough to **track individual aircraft from first appearance to exit**
  across a `STAGE_MAP.md`-verified span, which yields emission **and** residence directly and
  collapses the bracket. Filing it as an acquisition would record it as blocked on footage we do
  not have when it is blocked on an afternoon. Sampling must be ≤0.1 s (ledger row 29's lesson).
- **R9, OWED, also not an acquisition — a SECOND READER's density count.** ARCADE-PACING's bands
  are ±2 SE on **63 frames by one reader**, corroborated by a second reader on 18 frames and a
  third on 24, all three agreeing. A fourth count over ≥40 digit-verified frames on a
  pre-registered grid would **tighten** the bands, not verify them. Low priority precisely
  because the three existing counts agree — recorded so it is not mistaken for a gap.
- **R9: `judging/R8/feel-critique.md` §2.4 shipped with two UNSUBSTITUTED TEMPLATE PLACEHOLDERS**
  — `PILOT_CENSUS_TABLE` (line 229) and `TRK_CENSUS_COMPARE` (line 238) — so the entire our-side
  census table behind R8's headline is absent from the document, and §1 quotes 79.6 % and 0.2 %
  as conclusions of a table that was never rendered. **Recovered, not re-derived**, by re-running
  the critic's own formatter over its own pooled arms:
  `python3 tools/out/feel-critic-r8/tables_fc8.py tools/out/feel-critic-r8/arms{A,B,C}-results.json`
  — figures now published in REFERENCE.md's ARCADE-PACING section. **A capture set and a
  formatter are not a published figure; check that the document rendered what it computed.**

- **Two capture-corruption causes are fixed; that is not proof there is no third.** Sweep
  every capture set for black frames **and for duplicates** — a stalled live frame
  double-counts in a pooled distribution and a black-frame sweep alone cannot see it.

<!-- Removed 2026-10-05: "sea coarseness (R4 gap 10) knowingly unresolved" — WITHDRAWN as a
     defect, see REFERENCE.md ledger row 6. The near-field sparkle layer is NOT to be built.
     Re-open only against a common-resolution, common-filter comparison stated as such. -->
