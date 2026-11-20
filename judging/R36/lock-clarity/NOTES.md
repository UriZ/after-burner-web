# R36 lock-clarity lane — diagnosis, changes, verification

Gap (rank 1, playtest): *"I can never tell when I'm locked — the little blue box hugs my own
jet instead of the enemy, and sometimes the missile button simply does nothing."*

## Diagnosis

**1. The "blue box hugs my own jet" is real, but the bracket is NOT misplaced.** It is drawn
at the TARGET enemy's position (lockSystem.js `_drawBrackets` → `_placeCorners(e.ndc.x,
e.ndc.y, e.d, …)`, verified by probe + look). The problem is that the locked target is
usually AT the player's nose: enemies funnel laterally onto the jet (R36 gap #2's geometry),
so the cyan box ends up overlapping the player's own sprite, where a naive player reads it as
ownship UI. Measured (`lock_pop_probe.mjs`, seed 42, jitter 0.5, 10 s, wavering aim pilot):
**53 % of locked/in-flight bracket draws (174/330 tick-brackets) land within 0.35 NDC of the
jet**; at-jet locked targets have median depth 15.3 (the live lock band, not stale holds —
held-past-break-depth locks contribute only 9/174). Crop-and-look confirmation:
`diag-smoke/atjet-t00059.png` — the cyan bracket sits ON a real enemy that is itself sitting
on the jet's nose. So the bracket tells the truth; what was missing is a cue that
distinguishes "LOCK on that aircraft" from static HUD clutter, plus the depth-combat lane's
fix moving kills out to range (not this lane's file set).

**2. "The button simply does nothing" is exact and code-level.** `combat.js _updateMissiles`
launches ONLY out of `locks.takeLocks()` — with zero completed locks, press/hold/release all
do literally nothing: no launch, no sound, no stock change (playtest ses2 t296–536: 4 s hold,
stock pinned at 50). GAME_SPEC.md §3's own ADOPTED behaviour is the opposite: **"Fire on
button press, cooldown 0.4 s (ADOPTED)"** — the arcade missile button never dead-clicks; a
no-lock press launches an unguided missile.

### Arcade-truth check on no-lock launch (task 2)

- GAME_SPEC §3: "Fire on button press, cooldown 0.4 s" is **ADOPTED** (prototype), not
  MEASURED.
- Footage attempt 1: climb-out t84–94 (zero enemies, so any launch would be lock-free).
  Decoded at 5 fps and read the stock widget across the span
  (`arcade-climbout/stockstrip.png`): stock stays 5 large/0 ticks — the player simply never
  pressed there. Inconclusive, honestly reported.
- Footage attempt 2: the R10-dated launch at t=176.00 (60 Hz consecutive decode,
  `arcade-launch176/launchstrip.png`): a lock bracket IS on screen through that launch, so it
  cannot prove the no-lock case either.
- Status: the behaviour ships on the strength of the spec's ADOPTED line (and the playtest's
  rank-1 demand); it remains **ADOPTED, not MEASURED**. Proving it from footage needs a
  launch during a zero-enemy span, which 25 s of searched footage does not contain.

### Arcade-truth check on the bracket colour cycle

GAME_SPEC §3 element 3 measures the arcade bracket in TWO blue variants inside one
engagement ("Blue #008cd9→#3bbaff variants at t104") — a colour cycle, which is the one
animation R10's "the bracket does not animate IN SIZE" clause leaves open. A 60 Hz crop
series at t175.4–176.8 could not track the moving bracket well enough to date the cycle, so
the pulse RATE is tagged ASSUMED in the source.

## Changes

**`src/weapons/lockSystem.js`**
- Locked / missile-in-flight brackets now PULSE two-tone, 8 frames per phase (3.75 Hz,
  ASSUMED rate): `TINT_LOCKED` #31e6ff ↔ `TINT_FLASH` #d6ffff. Tint only — size stays
  static per the R10 measurement. Tracked stays static thin white; acquiring keeps the
  one-way white→cyan snap-in. So the three states are now: static faint ticks (tracked),
  one-shot closing ramp (acquiring), **blinking cyan/white box (locked)** — legible even when
  the box sits on the nose.
- First partner tone tried was the arcade's own deeper blue #008cd9 (ladder-snapped
  #008cd6) and it FAILED the look: near-invisible against stage 1's #009fff sky
  (`pulse-check/pulse_crops.png` panels 2–3). Replaced with #d6ffff; documented in-source.
- Added `window.__lockPop` diagnostic hook (drawn-bracket population with state rank +
  target depth/ndc per tick; read-only).

**`src/weapons/missiles.js`**
- `launch(playerNdc, target, side, rng, aim)` now accepts `target = null` → a DRY
  (unguided) shot: it recovers the launch splay onto the fixed `aim` NDC point (the sight at
  press) using the same capped steer as homing, so it visibly flies straight up the sight
  line, ribbon and all.
- Dry shots fuse on ANY live enemy they physically cross within the same `HIT_RADIUS_FRAC`
  — a dead-ahead press can connect (the arcade's unguided-shot gamble), a shot past
  everything visibly sails out and retires at MAX_DEPTH ('expired' ledger row; rows still
  sum to launches).
- `update(dt, enemies = [])` — enemy list consulted only by the dry fuse; no caller change
  = pre-R36 behaviour exactly.

**`src/weapons/combat.js` — REQUESTED from TL (not this lane's file).** Patch sent via
message: rising-edge dry-fire when zero locks are held (one unguided missile up the sight
line, `AudioBus 'missileLaunch'`, stock −1, its own 0.4 s `dryCooldown` so it never touches
`salvoCooldown`/lock pacing), plus `missiles.update(dt, this.spawner.enemies)`.
**Lock DIFFICULTY is untouched**: acquire 0.42 s, cone 0.27, decay-on-waver — all exactly as
R31/R34 left them (the lane brief's "0.25 s / 0.26" are the older R27b values; current
constants verified from source and left alone).

## Verification so far

- Pulse on screen: `pulse-check-b/` — bracket samples alternate exactly (49,230,255) ↔
  pale white on the 8-tick phase through both held-lock and in-flight states
  (`pulse_rows.json`, `pulse_crops.png` — visible in all phases against the sky, box riding
  the enemy).
- `tools/aim_lock_probe.mjs` seed 7, jitter 0.5, 18 s (R27 wavering-pilot settings), with
  the pulse shipped and dry-fire NOT yet wired: 8 launches (stock 50→42), 3/3 crossings hit,
  first lock at tick 84 — unchanged mechanics, at the R31 8+ floor.
  **Caveat on cross-run comparisons this round:** a second identical run gave 7 launches
  (stock 50→43) — the death-legibility lane is concurrently editing enemyShots/
  groundBattery shot profiles in this shared tree, which shifts the whole sim timeline
  between runs (see memory: an in-place writer invalidates concurrent captures). Probe
  numbers are comparable only within one quiet-tree window; the gate numbers must be taken
  after both lanes land.
- PENDING (blocked on the combat.js patch, routed by TL to the death-legibility lane which
  owns the file this round). Post-patch verification cases:
  1. **Rising-edge proof**: HOLD the missile button 3+ s with no lock in reach — stock
     decrements EXACTLY once (one dry launch at the press, no hold-to-mash). `_wasHolding`
     audited for the TL: assigned every tick at the end of `_updateMissiles` (both
     branches), read before assignment — the edge gate is sound.
  2. **Mash pacing**: repeated presses pace at the dry cooldown (0.4 s), stock −1 each.
  3. **Visible + audible**: frames showing the dry missile's billow + ribbon flying
     STRAIGHT up the sight line and sailing out (the fix must be seeable, not just
     mechanical); `AudioBus 'missileLaunch'` fires on the dry path (captures are muted
     under ?fixed=1 — verified at the call site + the same sfx the locked launch uses).
  4. **aim_lock_probe** (seed 7, jitter 0.5, 18 s): launches comparable-or-higher (expect
     +1 from the press-edge dry round), hit rate on locked crossings unchanged.
  5. **Before/after capture pair** for the bracket legibility (static cyan at the nose vs
     pulsing cyan/white on the enemy).
  - PRNG note (TL's check 2): the dry launch consumes shared-stream draws (billow jitter),
    so post-patch timelines diverge from pre-patch ones whenever a dry shot fires — same
    class as any launch; fairness comparisons must be same-build, not cross-build.

### BEFORE run (pre-patch), `dryfire_check.mjs` → `dryfire-before/`

- **mash** (20 presses over 4 s, sight held in the corner, zero locks the whole window):
  **zero launches, stock pinned at 50** — the playtest's dead button, reproduced and
  measured.
- **hold** (button held 3 s, same posture): seed 7's funnel brings traffic into even a
  corner-held sight, so locks DID eventually form — first launch only at tick 48, i.e.
  **the button answered nothing for 0.8 s after the press** even on a hold that eventually
  earned a lock. (Scenario therefore not lock-free; the post-patch rising-edge assertion
  reads the pre-first-lock prefix: exactly one decrement, on the press tick.)

## AFTER — the combat.js patch is in (applied by the TL; this lane verified the applied
## text, caught a full duplication of all three pieces mid-landing, since deduplicated —
## current file has single init / single decrement / single fire block, re-read confirmed)

- **Rising edge, exactly once** (`dryfire-after2/`, hold 3 s): dry launch ON the press tick
  (tick 0, stock 50→49, zero locks, zero acquire), and NO further dry launch for the whole
  180-tick hold — the two later decrements (ticks 48, 131) are lock-paid salvos following
  the first lock at tick 26. Hold does not drain stock; press always answers.
- **Mash pacing** (`dryfire-after/`, press every 0.2 s, zero locks all window): 7 launches
  where before there were ZERO; gaps 36 ticks = 0.6 s, i.e. pacing honours the ADOPTED
  0.4 s cooldown (the exact-24-tick edge is blocked by ~3e-17 of float residue on
  `0.4 − 24·dt`, so the next 0.2 s press edge at 36 fires — within spec, launches are
  never closer than 0.4 s).
- **Visible + audible** (`dryfire-after2/hold-t010.png`, `hold-t030.png`): the dry round
  leaves with the full launch billow and white ribbon and flies visibly STRAIGHT up the
  sight line, then sails out. Audio: the dry path plays the same `'missileLaunch'` sfx as
  a locked launch (call site in the applied block).
- **aim_lock_probe** (seed 7, jitter 0.5, 18 s — R27 settings): **11 launches
  (stock 50→39) vs 7–8 pre-patch; firstLaunchTick 0** (the button answers instantly);
  first LOCK still tick 84 — identical to the pre-patch baseline, i.e. lock difficulty
  untouched; 7/7 crossings hit. (Depth-combat lane edits spawner/enemy concurrently, so
  cross-run timelines are not byte-comparable — the behaviour verdicts above are what
  this run establishes, per TL instruction.)
- **Before/after bracket pair**: `before_after_lock.png` — static cyan box at the nose
  (before) vs the locked bracket on the enemy alternating cyan / white-hot across an
  8-tick phase (after), legible in both phases against the sky.

## Naive-player contract, as shipped

(a) ACQUIRING: white bracket snaps in and closes onto the enemy, stroke thickening,
white→cyan ramp (pre-existing, unchanged). (b) LOCKED, on WHOM: the bracket on that enemy
pulses cyan↔white-hot at 3.75 Hz — the only pulsing element on screen — plus the existing
lock tone and HUD pips. (c) WHY a missile did/didn't launch: the button ALWAYS launches on
press (dry round visibly straight, stock decrements, launch sfx); a homing missile
additionally requires the earned lock, whose acquire time (0.42 s), cone (0.27) and
decay-on-waver are untouched from R31/R34.

## Needed from other lanes

- **TL/main**: apply the combat.js patch above (message sent).
- **depth-combat lane** (gap #2): the funnel fix is the other half of "the box hugs my jet"
  — once kills happen at range, locked brackets will sit out in the field where the arcade's
  do. Nothing else needed from them.
