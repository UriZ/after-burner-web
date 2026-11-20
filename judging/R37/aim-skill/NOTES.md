# R37 aim-skill lane — hands-off lethality (R36 #1)

Gap: hands-off play (centered stick, buttons held) kills ~26-28/min vs aimed ~37-40 —
the game part-plays itself. The R36 depth lane proved spawner routing cannot fix it
(judging/R36/depth-combat/NOTES.md §5); the two blockers are in this lane's files:
`src/weapons/vulcan.js` (HIT_RADIUS_SPAN_MULT = 1.2 → kill disc 2.4× the target's
wingspan) and `src/weapons/lockSystem.js` (a parked stick self-locks whatever transits
the rest cone for a held button).

Hard constraints honored: R26 "the gun is dead" (aimed fire stays point-at-it-and-it-
dies; the 0.05 floor untouched), R27 "missiles not firing" + R31 "lock too easy"
(LOCK_ACQUIRE_S 0.42 s and LOCK_RADIUS_FRAC 0.27 untouched — only WHETHER a parked
stick accumulates progress changed, not how fast an aiming one does), R36 dry-fire
(fire on press without lock — untouched, it lives in combat.js).

## 0. Instrument + tree-state notes (read before trusting any table)

- `kill_depth_probe.mjs` (R36 lane's instrument) validated: boots on today's tree,
  and a repeated config reproduced byte-identically under `?fixed=1` (sweep1 0.7 ==
  sweep2 0.7, all four arms).
- **The live tree was a moving target**: sibling R37 lanes edited `src/weapons/missiles.js`,
  `src/weapons/enemyShots.js`, `src/game/spawner.js`, `src/weapons/projectileSprites.js`
  and added `src/entities/groundBattery.js` DURING the first two sweep attempts
  (file mtimes 01:35-01:38 vs sweep windows 01:31-01:40). sweep1's 1.2 config and
  sweep2's 1.2 config disagree because the tree moved between them; sweep1/sweep2 are
  therefore DISCARDED (kept on disk for the record).
- **The authoritative sweep (sweep3-*.json) ran against a frozen snapshot** of the
  full src/ tree (rsync'd 02:28, served from the scratchpad with the repo's own
  node_modules), so all eight arms per config compare one tree. The chosen value is
  then applied to the live tree and the final package verified there.
- Concurrent probe runs crash puppeteer under load (TargetCloseError) — all
  published runs here are sequential, one instrument at a time.

## 1. Hit-mult sweep (today's build, frozen snapshot)

kill_depth_probe, seeds 7/42 × 120 s, aimed vs hands-off, `?gun=hitmult=`
(sweep3-*.json; sweep validated: 4 arms per config, 0 page errors, bins/bySrc sums
consistent, and the overlapping sweep2 configs reproduce sweep3 byte-for-byte):

| hitmult | aimed kpm s7/s42 (pool, Δ vs 1.2) | hands-off kpm s7/s42 (pool) | raw adv | hands-off GUN-only kpm | adv once the lock gate removes hands-off missiles |
|---|---|---|---|---|---|
| 1.2 (shipped) | 39 / 39.5 (39.2) | 23.5 / 25.5 (24.5) | 1.60× | 14.8 | 2.66× |
| 0.9 | 36 / 33.5 (34.8, −11.5 %) | 23.5 / 24.5 (24.0) | 1.45× | 13.5 | 2.57× |
| 0.7 | 39 / 28.5 (33.8, −14.0 %) | 20.5 / 22.5 (21.5) | 1.57× | 12.8 | 2.65× |
| **0.5 (chosen)** | 37 / 31 (34.0, −13.4 %) | 21 / 21.5 (21.2) | 1.60× | **9.0** | **3.78×** |

**The R8 sweep's direction does NOT reproduce on today's build for the raw ratio**:
cutting the radius shaves the AIMED arm as much as the parked one (the generous disc
mostly pays a sight that is merely NEAR a target — which is also the parked stick's
entire gun income, since crossers sweep through the rest sight line and clip even a
small disc at closest approach). What DOES move is the hands-off GUN column once the
radius stops covering the whole wall: at 0.5 hands-off gun kills collapse 27-32 →
17-19 per 120 s (−39 % vs 1.2) while pooled aimed stays at −13.4 % (inside the ~15 %
band; honest seed scatter: s7 −5 %, s42 −21 %).

**Pick: 0.5** — the only value that materially cuts the parked-stick gun, the best
final-package advantage (3.78× over a hands-off arm whose missiles the lock gate
removes), and the R8-principled value (kill circle = the silhouette's own footprint,
so a visibly centred aimed hit still registers). R26's usability survives on the two
levers that actually carry it and are UNTOUCHED: the 0.05 radius floor (binds for
every target under 10 %W span, i.e. most of the mid band) and R26's widened depth
tolerance in resolveHits. Aimed missile kills are unaffected (17-27 per 120 s across
all arms).

**The seed-42 aimed −21.5 % (TL acceptance question: scatter, or is 0.7 the honest
pick?).** Scatter, on two grounds. (1) s42's aimed drop is NON-MONOTONE in the mult —
0.9 → −15.2 %, 0.7 → −28 %, 0.5 → −21.5 % — which a radius-driven mechanism cannot
produce (a smaller disc cannot kill more than a bigger one for the same pilot; the
inversion is wave-mix/PRNG-stream divergence at n=1 seed × 120 s, where ±5 kills of
quantization is ±8 %). 0.7 is therefore not the honest alternative: it is WORSE than
0.5 on s42 itself (−28 % vs −21.5 %) and on the pooled figure (−14.0 % vs −13.4 %),
while cutting the hands-off gun barely a third as much. (2) The number that governs
is the SHIPPED package's end-state, not the gate-off sweep arm: on the final build
(§3) aimed s42 measures 36.5 kpm = **−7.6 %**, inside the line, and pooled −2.5 %.

## 2. Parked-stick lock gate (lockSystem.js)

Design: `acquiring.t` builds only while the player is STEERING — the aim point
(`sight ?? playerNdc`, the same point the cone is centred on) has moved in the combat
frame within the last 2.0 s, or is held deliberately deflected > 0.02 fracW from a
5 s-tau slow average (a railed climb holds station without per-tick motion). The R36
cruise-sway is render-side only (combat streams verified byte-identical in that
lane's notes), so in the combat frame sight motion IS player input: a parked stick
leaves the sight frozen to the bit; any stick touch moves it at up to the railed
0.379 fracW/s vs the 0.01 fracW/s gate floor. Teleports (respawn, aim-source swap)
are detected (> 0.05 fracW/tick, 8× the railed per-tick max) and open nothing.

What a pointing player sees: nothing changed — cone, acquire beat, waver decay,
brackets, hint, completed-lock hold all untouched; any input in the last 2 s keeps
the gate open; a mid-acquire freeze HOLDS earned progress (does not bleed it).
`?lockaim=0` disables the gate (A/B lever; logged request below to fold into
tunables.js, which is another lane's file this round). Diagnostic: `window.__lockAim`.

**Measured leak in the motion heuristic, and the fix (two modes).** The first
hands-off verification run (gate on, seed 42) still completed 18 locks/120 s.
`gate_diag.mjs` located every one: ALL aiming-open spans start in flow state
'death' and bleed into post-respawn flight — after a death the jet EASES back to
rest for ~10 s under a ZERO stick, the caged sight rides the ease above the
motion floor, and each moving tick refreshes the 2 s window. Autopilot
recentering is indistinguishable from steering from the sight alone. So
`lockSystem.update` grew a backward-compatible 7th argument: the STICK
(combat.js's own `input`, which flow.js already zeroes during death and every
uncontrolled state). When present, steering is read exactly — |x| or |y| past a
0.05 deadzone (keyboard is 0/±1) within the 2 s window; the EMA/displacement
machinery is bypassed. When absent (6-arg harness callers), the motion heuristic
remains, leak documented. The one-line combat.js pass-through is a cross-file
request (below).

Boundary stated honestly: a player who holds the missile button on a dead-ahead
enemy WITHOUT touching the stick for > 2 s gets no lock (the R36 dry-fire still
gives them a missile on press). That is the chosen semantics — a stick nobody
steers is hands-off — and any steering tap in the last 2 s opens the gate.

**Second measured leak, fixed.** With the TL's combat.js pass-through live, a
hands-off s7 run still completed 7 locks/120 s: game.js's DEATH_COMBAT_INPUT is
`{fire:false, missile:false}` with NO x/y, so a field-presence test fell through
to the motion heuristic during the death tumble and re-opened the window into
every respawn. Fixed: ANY input object without numeric x/y = not steering; only
a null/omitted 7th argument falls back to the heuristic.

**Scripted exemption (design guard, measured inert).** demoTimeline input is
tagged `scripted: true` (TL applied) and the gate exempts it, so the attract
always showcases locks even if a future curve holds level past 2 s. On today's
curve it is PROVEN inert: fairness gate-binding (final3) vs gate-exempt (final8)
runs are byte-identical — the demo's weave keeps the window open on its own.

### Lock-gate verification (all on the live tree, stick mode + no-x/y fix)

| arm | result |
|---|---|
| gate_diag, hands-off s42, 120 s | **0 aiming-open spans, 0 lock completions** (pre-fix: 18, every span starting in 'death') |
| lock_probe hands-off s42, 120 s | **0 locks ever** (firstLockTick null); 8 missiles retired = dry-fires only (one per respawn press-edge); baseline gate-off: 30 completions / 23 hits |
| lock_probe hands-off s7, 60 s | **0 locks**, 5 dry-fires; gate-off control at 120 s: 30 completions / 23 hits (pre-lane baseline reproduced exactly) |
| aim_lock_probe (R27 settings: seed 7, jitter 0.5, 18 s) | **byte-identical to the gate-off arm**: 8 launches, 7/7 hits on crossings, first lock tick 84, stock 42. A wavering-but-aiming pilot notices nothing. (R27's "13/18 s" predates R31's re-basing to the 8+ floor; today's gate-off arm also gives exactly 8 — the delta is the tree, not this gate.) |

**Flagged robustness item (not this lane's files):** lock_probe hands-off s7 at
120 s crashes the Chrome tab ('Target closed', 4/4 attempts — single-evaluate
AND chunked probes) with the gate on, while the identical arm survives with
`?lockaim=0` (full run) and at 60 s with the gate on. The arm's regime is
"nothing dies for minutes" (no gun held, no locks) — likely an unbounded
accumulation somewhere under never-kill conditions; kill_depth (fire held,
things die) survives s7 hands-off fine. Reproduction:
`node judging/R37/aim-skill/lock_probe2.mjs --mode handsoff --seed 7 --secs 120`.

## 3. Final package verification

**kill_depth, final build (stick gate + no-x/y fix + hitmult 0.5), seeds 7/42 ×
120 s (`final3-killdepth.json`), vs the same-tree switch-back arm
(`?lockaim=0&gun=hitmult=1.2`, `switchback-killdepth.json` — which reproduces
the pre-lane sweep3 baseline byte-for-byte, validating the levers):**

| arm | aimed kpm s7/s42 (pool) | hands-off kpm s7/s42 (pool) | hands-off missile kills | hands-off/aimed | maxStage aimed / hands-off |
|---|---|---|---|---|---|
| switch-back (pre-lane) | 39 / 39.5 (39.25) | 23.5 / 25.5 (24.5) | 20 / 19 per 120 s | 0.62× | 2-3 / 1-2 |
| **final** | 40 / 36.5 (38.25, **−2.5 %**) | 13 / 12.5 (12.75, **−48 %**) | **0 / 0** | **0.33×** | **3 / 1** |

- Acceptance "hands-off ≤ half aimed": **met, 0.33×** (aim advantage 1.6× → 3.0×).
- Acceptance "aimed within ~15 % of baseline": **met at −2.5 % pooled** (s7 +2.6 %,
  s42 −7.6 %) — better than the sweep predicted, because aimed missile output is
  fully intact (16-20 kills/120 s) and the aimed gun loses only fringe kills.
- Acceptance "hands-off no longer clears stage 2": **met** — maxStage 1 on both
  seeds (reaches stage 2, never finishes it; aimed reaches stage index 3),
  8-9 deaths/120 s vs aimed 2.

**Fairness (tools/fairness_probe.mjs, seeds 4/5/6 × 180 s, ?demo=1):**

| arm | deaths/min | demo kills/180 s | unannounced fatal hits |
|---|---|---|---|
| switch-back (`lockaim=0&gun=hitmult=1.2`), today's tree | 1.667 / 1.667 / 1.667 | 15 / 14 / 15 | 0 |
| gate + exemption, hitmult **1.2** (decomposition) | 1.667 / 1.667 / 1.667 — **byte-identical to switch-back** | 15 / 14 / 15 | 0 |
| **final** (gate + exemption, hitmult **0.5**) | 1.0 / 1.667 / 1.333 | 0 / 4 / 0 | 0 |

Read before interpreting (per the brief): the probe's pilot is the SCRIPTED demo
wanderer, which never aims. The decomposition pins the entire shift on hitmult —
the lock gate contributes zero to this instrument. What hitmult 0.5 removes is
precisely the demo's free 2.4×-span gun kills, i.e. the mechanism of the R36 #1
gap itself. Three honest observations:
1. **The R36 committed 2.000 band is already broken on today's tree with this
   lane's levers OFF** (switch-back reads exactly 1.667×3) — sibling R37 lanes
   moved it; not chargeable here, but whoever re-baselines should know.
2. Against the same-tree 1.667 reference, the final arm's shift is {5,5,5} →
   {3,5,4} deaths per 180 s — DOWN (easier), sub-resolution for a probe whose
   quantum (1 death = 0.333/min) is twice the ±10 % band — and confined to the
   non-aiming scripted pilot. Player-posture death rates are unchanged:
   kill_depth aimed deaths 2/2 vs 3/2, hands-off 9/8 vs 9/7. 0 unannounced
   fatal hits everywhere.
3. **Owner-visible residual: the attract mode now kills almost nothing**
   (0-4 kills/3 min vs 14-15), because the demo pilot never actually aims and
   its kills were free-disc gun kills. The honest fix, if the attract reads too
   passive, is the R30-deferred "demo engagement" item (make the demo pilot AIM
   during its fire windows, with arcade-attract kill-rate evidence) — not a
   restored magic hitbox and not a special demo-only hit radius.

## Cross-file requests

- ~~`src/weapons/combat.js`: pass the stick (`input`) as locks.update's 7th
  argument~~ — **APPLIED by the TL** (requested by message, not reached into).
- ~~`demoTimeline.js`: tag scripted input `scripted: true`~~ — **APPLIED by the
  TL** (the exemption it feeds is measured inert on today's curve; kept as a
  design guard, see §2).
- OPEN — `src/weapons/tunables.js`: add `lockaim` to the KNOWN set and migrate
  the `?lockaim=` param into the `?gun=` family (lockSystem.js reads its own URL
  param this round to stay inside this lane's ownership).
- OPEN — README query-param table: document `?lockaim=0` (measurement-only).

## Instruments added/patched in this directory

- `lock_probe.mjs` / `lock_probe2.mjs` — aim_lock_probe's metrics with a
  hands-off arm; probe2 chunks the evaluate (600 ticks) + protocolTimeout 900 s
  after repeatable tab crashes on the never-kill arm (see the flagged item, §2).
- `kill_depth_probe2.mjs` — byte-copy of the R36 depth lane's probe with
  protocolTimeout 900 s (the hands-off arm's wall time exceeds puppeteer's
  default 180 s when kills are halved).
- `gate_diag.mjs` — per-tick log of aiming-open spans × flow state; the
  instrument that located both leaks.
- Sweep runners `run_sweep.sh` / `run_verify*.sh`; `bootcheck.mjs`.
