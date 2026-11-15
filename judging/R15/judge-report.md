# R15 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R15 gate. **Tree judged**: HEAD `cb84b07` (clean,
committed — includes the R15 burst-wall `7d7929b`, flame `67f5eec`, lock-cue `c2acb44`,
and lock-grace `cb84b07` commits). **Method**: look-first (watched two 60 Hz arcade
stage-1 bursts + the mapped stage-4 frame, then played ours hands-on via
`tools/playtest.mjs`, selftest 8/8 before first use), then each shipped claim
re-measured with my own instrument — the reactive-cadence gun A/B, the lane's grace
probe run with the CORRECT tunable key, the burst density probe before/after, and a
hands-on missile climb→lock→dodge→fire by hand. Arcade reference:
`ab2-longplay-60fps.mp4` (stage 1 wall t≈100, lull t≈110) and `ab2-longplay.mp4`
(stage-4 frame t220).

## SCORE

| | R14 | R15 | one-line reason |
|---|---|---|---|
| **Stills** | 8.5 | **8.5** | The afterburner is genuinely fixed — the R14 "long and liquid" cones are now crisp, separated twin teardrops that scale with throttle (short/fat at L, long/separated at H, white core → orange → short red tip), and the new amber lock-count pips read cleanly under the reticle. Held at 8.5, not raised: the stage-4 forest **ground** is still darker and flatter than the arcade's vivid mottled canopy with its cyan river (`ours-stage4.png` vs `arcade-stage4-t220.png`), and the noisier-than-arcade sea and sub-screen kill fireball that held R13/R14 off 9 are untouched. A crisper flame is a real per-frame gain, but the frame ceiling did not move. |
| **Motion** | 8.1 | **8.5** | The project's two oldest illusion-breakers both **closed**. Reactive aiming now clearly out-kills a dead-centre stick — seed 7 **24 vs 12**, seed 19 **25 vs 8** (my own reactive-cadence A/B, both seeds) — where R14 measured a 9-vs-10 tie; the burst wall supplies off-centre close targets a tracker rakes and a blind net misses. And I flew the full missile loop **by hand**: parked the sight mid-height on an approaching wave, took 3 locks in a safe posture (zero enemy fire), dodged hard while holding the button (the grace window **held** all 3 locks), released, and the 3-salvo killed 2. Held below 9: the blind gun floor is still a potent 8–12 free kills, the aim win needs *active* tracking (a fixed posture still loses), and acquiring the *first* lock is non-obvious because the caged sight does not auto-recentre. |
| **Composite** | 8.3 | **8.5** | +0.2 — more than the recent +0.1 rounds, because the two headline combat residuals R14 handed up both reproduced as CLOSED, not merely improved. Not a leap: both closures carry real caveats (reactive-only aim win; fiddly first lock), the stills ceiling is static, and one shipped probe's A/B is broken as committed. |

**One-line verdict**: *The gun finally rewards aiming — pointing it at the wall out-kills
holding the stick dead-centre two-to-three times over — and for the first time I climbed,
grabbed a fistful of locks, dropped away to dodge, and still fired the salvo, all by hand;
what's left is that the sky is still only four stages wide, the first lock is a trick you
have to discover, and the forest floor is darker than the arcade's.*

### What anchors the score (the look / the play, in player language)

I watched arcade stage 1 at 60 Hz: **t≈100 is a wall** (`arcade-stage1-wall-t100.png`) —
planes at every depth, HIT ticking 2→10 in four seconds, half-screen fireballs about every
second — and **t≈110 is a lull** (`arcade-stage1-lull-t110.png`) — a near-empty sky, the
world rolled hard onto a steep diagonal and staying rolled. That burst-then-drought is the
rhythm. Then I played seed 7 by hand (flight → dogfight → death/respawn → missile loop,
~45 turns) and ran deterministic A/Bs on seeds 7 and 19.

- **Real gains I felt.** (1) **The wall is there** (`ours-burst-wall.png`): climb into a
  non-bait wave and 6–10 jets stand across the upper frame at mixed depths, then the sky
  empties to zero for seconds — a genuine wall-then-lull, not the old flat 3–6. (2)
  **Aiming the wall pays.** Sweeping the sight onto the off-centre cluster scored where a
  centred stick caught nothing; my hand-raking and the deterministic A/B agree. (3) **The
  missile is flyable by a human now.** The amber pips (`ours-lockcue-pips.png`) tell you
  how many locks you're holding, and the grace window lets you leave the vulnerable climb
  before you fire — I did the whole loop without dying in the posture. (4) The flame is
  crisp and throttle-scaled; the ~7.7 s death starburst is intact.
- **What still breaks the spell.** (1) **Getting the FIRST lock is a trick.** The caged
  sight does not auto-recentre — it floats wherever you left it — and a full climb shoots
  it to +0.76, straight **past** the distant lockable band near the horizon. I got zero
  locks for ~15 turns until I discovered the move: a *gentle* descent that parks the sight
  around +0.31 on an approaching wave. A new player won't find that quickly, cue or no cue.
  (2) **The blind stick still eats.** Aiming wins, but a do-nothing centred pilot still
  collects 8–12 gun kills in 90 s — a third to half of a good aimer's score. (3) The
  **stage-4 ground** is dark and flat against the arcade's bright mottled canopy.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **GUN: aiming now BEATS the blind stick** (burst wall supplies off-centre close targets) | **SURVIVES** | My own reactive-cadence A/B (`gun_human_cadence.mjs`, 0.9 s reaction, invincible, 90 s, kills by weapon via `__killDrain`): **seed 7 aim 24 vs blind 12**, **seed 19 aim 25 vs blind 8**. Aiming is 2.0–3.1× the blind floor — R14's 9-vs-10 tie is broken. Blind floor held (8–12, telemetry-corroborated: my blind seed-7 playtest summed S1 3 / S2 5 / S3 4 = 12), **not** ballooned. **Nuance:** a *fixed* aim posture still LOSES (the R15 opening's sight-shoved-down arm lost 8/5 to blind 10/12, which I reproduce in spirit — my own fixed climb-and-sweep policy scored ~2). The win is real but belongs to *reactive* aiming, not any fixed stick. |
| **MISSILE human-usable: grace window + lock cue** (climb-lock-dodge-fire without holding the death posture) | **SURVIVES (with a first-lock caveat)** | Flown **by hand** on seed 7: sight parked at (0.045, **0.312**), missile held → **3 locks** acquired with **enemy shots 0** (safe posture); dodged to (−0.60, −0.40) with the button still held → **locks stayed 3** (grace held them through the target leaving); released → **3 missiles away, stock 50→47**; they killed (hits 4→6). The amber pips render legibly under the reticle (`ours-lockcue-pips.png`). **Blind protection holds**: a low/centred stick (sight ≤ +0.19) never locks — stock stayed 50 with 6 enemies up. **Caveat:** acquiring the first lock is non-obvious (see below); the cue helps you *keep* locks, not *find* the posture. |
| **MISSILE grace A/B "salvos 18→32 (+78%)"** (combat-asks.md) | **REFUTED as documented; mechanism SURVIVES** | The committed `lock_grace_probe.mjs` toggles `--gun lockgrace=0`, but the registered tunable is **`lockhold`** (tunables.js). `gun=lockgrace=0` **throws** ("unknown key — refusing to run") and the probe **times out with no numbers** (reproduced). So combat-asks.md's 18→32 is not reproducible as the probe documents. Re-run with the CORRECT key: default (grace on) **42 salvos, maxLocks 4, 18 missile kills** vs `lockhold=0` (grace off) **34 salvos, maxLocks 2, 19 missile kills**. The grace window is real and doubles locks-held-per-salvo for a dodging pilot, but its missile-KILL effect is ~flat (18 vs 19) — its headline magnitude was overstated. |
| **DENSITY: wall-then-lull from variance, presence not inflated** | **SURVIVES** | `burst_probe.mjs`, seed 7, 120 s, before (`burstevery=0`) → after: close-count **sd 0.80→1.26**, **peak 4→7**, **wall-seconds 4.5→10**, lulls preserved (**71–72 s** total close-drought, max 7.7 s), and readable **presence held: readFrac 0.53→0.51** (NOT inflated toward the old 80 %). During walls, off-centre close supply (2.5/tick) exceeds centre (1.65/tick) — the asymmetry that feeds the gap-2 aim win. Variance up, mean essentially flat. |
| **FLAME: crisp separated cones (R14 "long and liquid" fixed)** | **SURVIVES** | `ours-flame-H.png` / `ours-flame-L.png`: throttle H = long, clearly separated twin cones (not the old merged liquid mass), white core → orange → short red tip; throttle L = short fat teardrops. Throttle-scaled and bank-rigid, death-safe hide intact. |
| **ENVELOPE_Y refutation (do not grow)** | **CONFIRMED — call was right** | Live: our sight climbs to **+0.76** (> arcade sight ceiling ~+0.62) and dives to **−0.25** (< arcade floor ~−0.18). We bracket/over-reach the arcade on both ends; climbing acquires locks. Growing `ENVELOPE_Y` would move us away from the arcade. Not re-opened. |

## Sampling rates (citation field 6)

- Arcade calibration: 60 Hz consecutive decode, every 20th frame (0.33 s step) montage —
  pose/population/roll only, no speed claim.
- Gun A/B: `gun_human_cadence.mjs`, 5400-tick (90 s) deterministic runs, 0.9 s reaction
  cadence, invincible, kills counted by weapon (`__killDrain`), seeds 7 & 19.
- Missile grace A/B: `lock_grace_probe.mjs` jink policy, 90 s, invincible, seed 19,
  default vs `gun=lockhold=0`.
- Density: `burst_probe.mjs`, 7200-tick (120 s), seed 7, before (`pace=burstevery=0`) vs
  default; per-tick close/readable counts.
- Hands-on play: `tools/playtest.mjs`, ~45 turns of 10–120 ticks, seed 7, mortal; my turn
  length is my sampling rate. Flame/stage-4 from single full-res final frames.

## Ranked gap list for R16 (player language — what most breaks the illusion now)

1. **The sky is only four stages wide, and there's no breather.** With the gun and missile
   now closing, **absence is the biggest remaining gap**: 4 of 23 stages, no resupply /
   refuel / bonus interstitial. A 5th stage, or the iconic refuel pass, widens the game
   more than any further combat tuning. (World + flow.)
2. **The first missile lock is a trick you have to discover.** The mechanic now works and
   the pips are clear, but a new player can't find the lock: the caged sight doesn't
   auto-recentre (it floats where you left it) and a full climb overshoots the distant
   lockable band to +0.76. Consider a gentle sight auto-return toward rest on a centred
   stick, or a cue that the distant wave is *enterable* — so the "park mid-height on the
   approaching wave" move is discoverable, not stumbled onto. (Player / combat.)
3. **The stage-4 forest ground is dark and flat.** The teal sky matches; the ground needs
   the arcade's brighter, more mottled canopy and its cyan river (`arcade-stage4-t220.png`).
   (World.)
4. **The blind gun still eats a third of the fight.** Aiming wins now, but a do-nothing
   centred stick still banks 8–12 kills/90 s. Pushing that floor down further (without
   breaking visible centred hits) makes aiming matter even more. (Combat/spawner — coupled
   to the wall's centre-vs-off-centre split, already measured.)
5. **Climaxes read small; the title is hand-rounded.** Kill fireballs are sub-screen vs
   the arcade's half-screen blasts; the title wordmark is hand-rounded where the arcade's
   is brush-angular. A grouped polish pass. (Effects / ui.)

**Also flagged (housekeeping, not gates):**
- **Fix the committed grace probe.** `lock_grace_probe.mjs` and combat-asks.md document the
  A/B as `lockgrace=0`; the real key is `lockhold`. As committed the "before" arm is
  unrunnable and the "18→32" figure is not reproducible. Correct the key and re-publish the
  A/B (true effect: salvos 34→42, locks/salvo 2→4, kills ~flat).
- **SIGHT_NDC_Y_OFFSET** reconciliation (our rest sight +0.30 vs arcade ~+0.16) stays the
  low-priority, measure-first item it was — do not blind-change.

**Kept as positives (do not regress):** the aim-beats-blind gun (both seeds); the
human-usable missile loop (grace window + legible pips) with blind protection intact; the
burst wall-then-lull rhythm (variance, presence preserved); the crisp throttle-scaled
afterburner; the ~7.7 s arcade-correct death cycle; the 4th stage + stages 1–3; the
over-reaching vertical envelope (do NOT grow `ENVELOPE_Y`).

## Instrument limits (stated plainly)

- Two seeds (7, 19); one agent pilot at ~1 s decision cadence; strips are 6-panel
  composites, not video — no feel claim finer than a turn length, no audio judged.
- The gun A/B's "aim" arm is a reactive tracker at a human 0.9 s cadence steering onto the
  nearest readable/reachable enemy's exact ndc — human-ish, but a real hand can't read
  exact ndc. The DIRECTION (reactive aim ≫ blind; blind floor held) is robust across both
  seeds and corroborated by my own hand-raking; the magnitudes (24/25 vs 12/8) are
  instrument figures, not a claim a person hits exactly that.
- The missile verdict rests on one clean hand-flown loop on seed 7 plus the corrected grace
  A/B; I did not exhaustively test every phase on seed 19 by hand.
- Stage-4 ground judged by look against one mapped arcade frame (t220) + the measured
  palette, not a fresh ACF measurement.
