# R12 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R12 gate. **Tree judged**: `e490e3e` (HEAD, clean).
**Method**: look-first (side-by-side gestalt + hands-on play), then each shipped claim
re-measured by my own instrument. Arcade reference: `.reference-cache/video/ab2-longplay.mp4`,
stage 1 = t≈88–120 per `STAGE_MAP.md`.

## SCORE

| | R11 | R12 | one-line reason |
|---|---|---|---|
| **Stills** | 8.5 | **8.5** | Islands/coastline now sweep past open sea, carrier launch, faithful title, fireball that breaks up — a real breadth gain, held off 9 by sea-texture that reads noisier/higher-contrast than the arcade's smoother whitecaps and a fireball a touch small for the screen. |
| **Motion** | 7.5 | **7.5** | Attract/cruise horizon now rolls hard (−61°/+51°, no longer level), gun kills land at the sight, and running out of lives finally ends the game — but the rank-1 verb (missiles) is still unusable in play and the sky still goes dead for seconds. |
| **Composite** | 8 | **8.0** | Same number, different 8: this round shipped two missing systems (land, stakes) and real roll-drama, but the single biggest illusion-breaker the method was built to catch — the missile a player can't reach — is only **partially** closed. |

**One-line verdict**: *More After Burner than R11 — it launches off a carrier, the horizon
swings, islands fly past, my tracer is visible and my gun kills land where I point, and the
game can finally end — but I still can't use my missiles, planes still die on my wingtip
instead of down my sights, and the sky still goes quiet.*

### What anchors the score (the look / the play, in player language)

Playing it (90+ turns on seed 7 via `tools/playtest.mjs`, plus scripted captures):

- **Real gains I felt**: the attract/combat baseline is no longer level — the horizon rolls
  to near-vertical on its own (measured worldRoll −61.2°…+50.9°, a 112° swing). The opening
  is the carrier launch. Islands, surf belts and inland green now scroll past where R11 had
  uniform sea. My vulcan is a visible orange column instead of a few dots. When I lost my
  last life the game went to a **GAME OVER** card instead of silently refilling. These are
  the things that make a glance say "After Burner."
- **What still breaks the spell from the cockpit**:
  1. **I could not use my missiles.** In ~45 deliberate turns I got exactly **one** lock and
     **never fired a single salvo as a player**; holding the aim up to try got me shot down.
  2. **Kills happen to me, not by me.** Enemies pop horizon-dot → wingtip; the gun fix moved
     *where* a kill lands (to the sight) but not the *window* — point-blank wingtip deaths
     still dominate.
  3. **Dead sky.** Confirmed multiple multi-second stretches with 0 enemies on screen
     (telemetry + frames agree), against an arcade where something crosses every second.

## Shipped claims, re-measured independently

| # | Claim (lane) | Verdict | My evidence |
|---|---|---|---|
| 1 | **Missile reachable** — `LOCK_DEPTH_MIN 26→16` brings the lockable band into the sight's cone; a player gets a lock and fires a salvo | **PARTIAL** | A lock is now *possible* for a player (I hit `locks 1` with full-up aim, sight at ndcY 0.76) — which **refutes R12's "zero locks, unreachable."** But it is still **effectively absent in play**: the lockable band is a narrow high-center strip, most enemies fly in low or off to the sides and never transit it, and pinning the sight to the band to wait gets you killed. 240 ticks pinned in-band with 2 enemies on screen → 0 locks. I never completed lock→release→salvo as a player. The *mechanism* is intact (see below) — the problem is the player can't reach it reliably. **Stays rank 1 for R13.** |
| 1b | **Blind-pilot protection** — centered pilot should NOT fire missiles | **SURVIVES** | Stick-centered, missile cycled hold/release ×5: `stock` stayed 50, `locks` 0, 0 missiles fired. Aiming is still required to even attempt a missile. |
| — | **Missile mechanism intact** (not claimed, but I checked the lane didn't break it) | **CONFIRMED** | `demo=2` probe, 3000 ticks: locks form (max 1 at a time), missiles launch on release, `stock` drains 50→48, and missiles **score hits** (first missile kill at t≈34 s). This is why my 12 s scripted capture read `HIT 0` — the first missile kill lands at ~34 s, not a bug. Note: demo=2 fires **single** missiles one lock at a time, not multi-missile salvos — STATUS's "fires salvos" is loose wording. |
| 2a | **Gun kills at the sight** — unassisted rounds ramped to readable depth + p-gate; `p90 14.65→9.3 %W` | **SURVIVES** | My own `__killDrain` probe (demo=2, seed 1, vulcan kills): median lateral offset from sight **6.2 %W**, **p90 10.6 %W**, max 10.6 %W — down from R11's measured 5.8/14.6, landing essentially at the sight's ±9.85 %W reach. My p90 (10.6) sits a hair above the lane's claimed 9.3 on a small sample (8 kills); direction and magnitude both hold. Kills resolve near the sight, not the wingtip. |
| 2b | **Tracer fattened** — puff core 12→40 texels, continuous bright column | **SURVIVES** | Visible orange column rising from the jet nose in play and in `demo=2` frame-0023; no longer "a few faint dots." |
| 4 | **Islands** — stage-1 land painted into the sea plane, approach from horizon with perspective/haze | **SURVIVES** | Present and convincing across every stage-1 capture: deep sea → cyan surf → brown crags → green inland, scrolling with the sea. Biggest single gestalt gain of the round. |
| 5b | **Stakes / game-over** — continue countdown running out → GAME OVER, no silent refill | **SURVIVES** | `lives=1&forcedeath=1.5` state trace: flight → death(fireball/starburst/tumble/respawn) → continue(10 s countdown 4→3→2→1) → **GAME OVER** at t=19.5 s. `lives` goes 1→0 and **stays 0** — the silent refill is gone. |
| 6 | **Attract drama** — two hard-bank beats/16 s, horizon to ±63° | **SURVIVES** | `demo=1` worldRoll measured −61.2°/+50.9° (claim ±63°); the baseline no longer cruises level. |
| D1 | **DECLINE: passive score is arcade-faithful** (0 through launch; the playtest's "from tick 0" was a `?fixed` artifact) | **DECLINE CORRECT** | Our `demo=1` keeps `score` 0 through the entire `launch` state (verified). And the **arcade itself** awards passive score: stage 1 goes SCORE 44010→70410 between t=108 and t=116 with **HIT unchanged at 11** (+26400, no kills). The decline is validated against the arcade. |
| D2 | **DECLINE: death cycle frame-pinned at 7.7 s, not 4 s** | **DECLINE PLAUSIBLE (not independently re-measured)** | My state trace gives flight→continue ≈ 7.5 s, consistent with the claimed 7.7. The eyeballed "~4 s" had no frame; I did not extract an arcade death-cycle duration myself, so I accept the decline but flag it as the one claim I did not re-measure against the arcade. |

### Sampling rates (citation field 6)

- Attract roll envelope: our side 60 Hz fixed-step, `--every 12` (0.2 s/sample) over 9.6 s.
- Gun-offset p90: our side 60 Hz consecutive `__step(1)`, every kill drained (not sampled).
- Missile play: my turn length (15–120 ticks) is my sampling rate; lock states read at
  turn boundaries, so I can state "I got a lock / I never fired a salvo" but not sub-turn
  lock timing.
- Arcade score/HIT: single frames at t=92/100/108/116 (1 Hz spot checks, identity read off
  the HUD STAGE digit), used only for the passive-score cross-check, not for any motion claim.

## Ranked gap list for R13 (player language — what most breaks the illusion now)

1. **I still can't use my missiles in normal combat.** The geometry fix made a lock
   *technically* reachable but only by pinning the sight to its top-center extreme and
   holding while an enemy happens to cross a narrow strip — which almost never aligns and
   gets me killed. Lock-warble, salvo, and converging smoke trails are still absent from
   play. **R13: make locking happen from a normal combat posture** — route enemies through
   the lockable band, or widen *the lock strip* (not the sight cage) to where enemies
   actually fly, or let the lock track an enemy the player is merely pointing *near*. Do
   **not** widen `ENVELOPE_X` (arcade-matched; STATUS closed).
2. **Kills still happen to me, not by me.** The gun now kills *at* the sight, but enemies
   jump horizon-dot → wingtip with almost no time spent in a shootable mid-range band, so
   point-blank collisions still dominate and aiming still isn't the main way kills happen.
   **R13: give enemies a real mid-range gunnery window** (approach pattern that lingers at a
   shootable depth), so that pointing-and-killing beats flying-into-them.
3. **The sky goes dead.** Repeated multi-second 0-enemy lulls vs the arcade's
   something-every-second, and enemies never fly past at large scale (the close-flyby *event*
   is missing — choreography, not the size distribution). **R13: tighten spawn pacing and add
   a scripted large-scale flyby.**
4. **Polish that reads wrong side-by-side**: the sea whitecaps are noisier/higher-contrast
   than the arcade's smoother water; the stage 1→2 transition is a single-frame hard palette
   cut; the kill fireball is a touch small for the arcade's screen-fillers. A grouped visual
   pass.
5. **Title letterforms / plate aspect** — small, carried from the gestalt list; title was
   not a shipped lane this round.

## Instrument limits (stated plainly)

- One agent player, one seed (7) for the hands-on missile/gun play; my decision cadence is
  0.25–2 s (turn length), so I make no sub-turn timing claims.
- The gun-offset p90 rests on 8 vulcan kills from one seed of `demo=2`; it confirms direction
  and rough magnitude, not a tight figure — do not quote my 10.6 %W as a precise target.
- No audio judged.
- I did **not** independently re-run the aim-vs-blind *gun* kill-share experiment (the
  playtest's 11-vs-8); I confirmed the missile half of "aiming matters" (blind pilot fires
  zero missiles) and that the p-gate structurally withholds non-aimed gun kills, but the
  cockpit impression that no-input still collects most *gun* kills (gap 2) is from play, not
  a fresh kill-share number.
- I did not extract an arcade death-cycle duration (claim D2); accepted on the lane's
  reasoning plus my 7.5 s build measurement.
