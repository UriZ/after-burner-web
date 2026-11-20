# R32 ENEMY-CADENCE lane — close-pass cadence: arcade vs ours

**Gap (R32 judge #1):** "Enemies spend too long as distant specks — the dogfight doesn't
crowd you. AB2 keeps large threatening aircraft sweeping CLOSE and often."

**Decision: TUNED.** Added a CLOSE-DROUGHT CLIP to `src/game/spawner.js` (behind
`?pace=closedrought=`, default 3.0 s). It fills the close-range droughts a fast-firing
player opens with the existing fair fly-past. **Enemy SIZE untouched** (owner-flagged false
gap). No overshoot: the no-fire SUPPLY is byte-identical ON vs OFF; it only acts in a
firing player's drought.

## 1. Arcade close-pass cadence (MEASURED)
60 Hz consecutive decode of `ab2-longplay-60fps.mp4`, STAGE_MAP spans. Montages at ~1.33 Hz:
`arc_s1_tiles.png` (stage 1, 94–110 s), `arc_s4_tiles.png` (stage 4, 204–220 s). LOOKED.

- The arcade pilot is **firing constantly** (HIT counter climbs ~1 kill / 1.2 s in stage 1)
  and yet a readable (>8 %W) enemy is on screen **~50–70 % of stage-1 combat** and
  **~40–55 % of stage 4** — you kill one and another is ALREADY closing. Enemies ARRIVE
  already mid-large; they do not spend 5 s as specks growing from the horizon.
- Rhythm = large aircraft sweeping close almost continuously, with occasional 2–4 s lulls
  (stage-1 t106–110, some empty stage-4 frames). Peak head-on size ~19.5 %W (matches R27).
- This CONFIRMS R27's arcade estimate (~35–45 % readable-present during flight) and refutes
  the "arcade sky is mostly distant specks under active play" reading.

## 2. Ours under ACTIVE play (MEASURED, `cadence_probe.mjs`)
Active-aim pilot (nearest enemy, proportional stick + jitter 0.5). Metric = fraction of
ticks with ANY on-screen enemy >8 %W (`gt8Frac`), 120 s, `?fixed=1`.

| arm | seed 7 | seed 19 | seed 3 |
|---|---|---|---|
| **SUPPLY** (active aim, NO fire) | 0.55 | 0.54 | 0.46 |
| **active aim + FIRE** (pre-R32) | 0.068 | 0.097 | 0.24 |

- **Our SUPPLY (46–55 %) already matches the arcade** — the spawner is NOT starving close
  enemies. But active FIRE collapses close presence to **7–13 %** (seed-3 stays at 24 % — a
  naturally crowded seed). My probe kills FEWER enemies than the arcade expert (7.5/min vs
  ~20–50/min) yet sees FAR fewer close enemies → it is a **replenishment** gap, not a
  kill-speed artifact.
- **Root cause:** under fire `meanAlive` is only ~2.0 (cap is 6 — the CAP is not the
  limiter). The sky holds two DISTANT specks mid-approach, so `DEAD_SKY_MAX_S` (triggers only
  on a TOTALLY empty sky) never fires, while NO close enemy is present for seconds. That is
  the judge's sentence exactly: two distant specks, nothing crowding you. Our close supply
  arrives BUNCHED in burst walls (~every 30 s) then drought; clearing a wall leaves the
  drought dominant.

## 3. The fix — CLOSE-DROUGHT CLIP (`spawner.js`)
Analogous to the existing empty-sky clip but keyed on CLOSE presence (an on-screen enemy
nearer than depth 8.8 ≈ 8 %W). While a close enemy is present the timer resets and NOTHING
extra spawns (supply unchanged, no overshoot). In a sustained drought it forces one
`_flyby` — a single large crossing pass that does not meaningfully fire (crosser geometry),
so it is a dodge/shoot event that cannot break fairness. A negative cooldown after each fill
stops a second stacking while the first is still inbound → ~one close crosser at a time,
never a pile. `?pace=closedrought=0` reproduces the pre-R32 stream exactly.

### Effect (active aim + FIRE, `gt8Frac`)
| seed | OFF (pre-R32) | ON (3.0) |
|---|---|---|
| 7  | 0.068 | **0.121** (+78 %) |
| 19 | 0.097 | **0.142** (+46 %) |
| 3  | 0.24  | 0.24 (no-op — already crowded, clip never fires) |

Seed-7 nearest-span histogram shifted: 0–2 %W ticks 3356→2110; 8–14/14–20/>20 all up; close
dwell 0.23 s → 4.4 s. Still WELL below the arcade's ~45 % (conservative, no overshoot).

### No-overshoot proof (active aim, NO fire — the SUPPLY)
`gt8Frac` **0.549 ON == 0.549 OFF**, `meanAlive` **4.13 == 4.13**, byte-identical. The clip
is inert whenever the near field is naturally full.

### LOOK (active-fire captures, `active_capture.mjs`)
`s1_OFF_tiles.png` vs `s1_ON_tiles.png` (stage 1, seed 7, t12–37). OFF: opening combat then a
~6 s DROUGHT (`key_OFF_drought.png`) where the player is alone with distant specks and DIES
(respawn "READY"). ON: the same window is filled with close crossing enemies
(`key_ON_fill.png`), the player SURVIVES (HIT 28 vs 23) and reaches stage 2 with more kills.
(PRNG diverges once the clip fires, so frames are not matched — the DISTRIBUTION is the point.)

## 4. Weapon / fairness guardrails — nothing broke
| probe | OFF (pre-R32) | ON (3.0) |
|---|---|---|
| `aim_lock_probe` seed7 (missile) | firstLock 87, firstLaunch 109, stock 42 | **identical** |
| `combat_probe` demo seed7 (gun) | hits 15, vulcanRounds 8 | hits 16, vulcanRounds 8 |
| `fairness_probe` seeds 4,5,6 — **deaths/min** | **1.00** | **1.00** |
| `fairness_probe` — enemy shots/min | 32.2 | 35.1 (+9 %, deaths flat → not a difficulty change) |
| `fairness_probe` — unannounced fatal hits | 0 | 0 |
| `fairness_probe` — warning floor (s) | 2.917 | 2.917 |
| `fairness_probe` — kills | 12/9/11 | 15/14/17 (more close targets to engage) |

Missile usability byte-identical; death rate identical; warning floor held; 0 unannounced
fatal hits. Kills rose (more close targets) — the intended effect, not a fairness regression.

## Files changed
- `src/game/spawner.js` — close-drought clip + `closedrought`/`closedepth` pace keys.
- `src/entities/enemy.js` — unchanged (no size/approach change; false-gap respected).
