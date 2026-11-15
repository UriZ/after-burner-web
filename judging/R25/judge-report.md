# R25 JUDGE REPORT — recalibration round (naive-play anchored)

**Fresh context. Score anchored on a full naive playtest, per the recalibrated JUDGE
CALIBRATION block (CLAUDE.md, binding).** The owner played the prior "9.3" build and called it
"pretty bad" (no usable missiles, weak sprites). R25 set out to fix those two complaints. I
played it like a first-timer — point and shoot, dodge, die — across two seeds, no insider moves.

## COMPOSITE SCORE: 6.5 / 10

One line: **the signature missile now works and is satisfying, and both sprite sets read as real
aircraft — a real jump off the ~5 floor — but the vulcan cannon kills nothing in naive play, so
half the player's arsenal is as broken as the missile used to be, which caps it short of a clean 7.**

| dimension (recalibrated: play over frame-match) | score | why |
|---|---|---|
| Motion / play feel (the anchor) | 6.5 | Missiles usable + satisfying; world roll, death, enemy fire all read right; **gun dead** drags it |
| Stills / sprite + composition | 7.5 | Player F-14 and enemy MiGs now credible and characterful; explosions great; backdrop strong |
| **Composite (anchored on PLAY)** | **6.5** | Stills cannot lift it above how it plays; a working missile earns the jump, the dead gun holds the ceiling |

Where it sits on the re-baselined scale: **out of "5–6 pretty bad," into the low end of "7–8
solid and playable with clear rough edges."** I land at 6.5 — the missile fix genuinely lifted it
off the floor; the unusable gun is the one big rough edge keeping it from a confident 7.

## Claims table — SURVIVES / PARTIAL / REFUTED by PLAYING

| R25 claim | verdict | evidence from naive play |
|---|---|---|
| Missiles fireable by point-and-press, no camp barrier | **SURVIVES** | `--missile 1` with stick roughly at enemies fires immediately (stock 50→47→…); no lock-band move needed, both seeds |
| Missiles home and kill reliably | **SURVIVES** | Seed 7: 5 kills / 7 missiles, sky 6→1. Seed 13: 2 kills / 5 missiles. `pt-missile-kill.png` |
| TL's ~64 % naive hit | **PARTIAL (directionally true, not re-measured to the digit)** | My runs ≈ 70 % missile→kill (7/10 across both seeds); the exact figure is sightline-dependent but the *claim that naive missiles work* holds |
| Player jet no longer an "insect face" / is a real F-14 | **SURVIVES** | `pt-crop-player.png` — central fuselage, canted tails, swept wings, twin nozzles; bank pose holds mass |
| Enemy MiGs crisper swept-wing jets | **SURVIVES** | `pt-crop-enemies.png` — grey swept-wing fighters with red cockpit, read as planes not darts |
| (implicit) the build now plays well overall | **PARTIAL** | True for the missile loop; **false for the gun** — see below |

## The finding R25 did not address: the GUN is now the broken weapon

- **0 gun hits across ~11 naive gun turns, both seeds**, against 2–10 on-screen enemies at spans
  up to 23.5 %W. Tried sight-high, sight-low, and precise short-turn placement. `pt-gun-0hits.png`.
- The one apparent gun success (HIT 2→4 in the precise test) was **leftover in-flight missiles**
  landing: stock held at 45 (no new missiles) and missiles-in-flight drained 3→1 exactly matching
  the 2 hits. The gun contributed nothing.
- This is the owner's own complaint, relocated: *a primary weapon you point at enemies and fire
  does nothing.* The missile fix (generous on-screen lock radius + homing) is exactly what the gun
  now needs. A naive player who reaches for the rapid-fire cannon first — most do — will feel the
  build is still broken.

## Regression check

- Gun still *fires* (selftest: rounds=6 in flight) — it just doesn't *hit*. Not a new regression;
  it was never usable, the missile fix just made its deadness the top problem.
- Combat otherwise intact: enemies spawn in waves, shoot back (enemy-shot count into the teens),
  death→respawn cycles cleanly, stage 1 stable across ~20 min sim. No crashes, zero page errors.
- **Selftest 8/8.** Missiles + sprites: no observed breakage of the gun/world/HUD.

## RANKED R26 GAP LIST (player language — play, not backdrop)

1. **THE VULCAN CANNON DOESN'T KILL — fix it the way R25 fixed the missile.** 0 naive kills, both
   seeds. Give the gun a usable hit volume at the reticle (generous on-screen radius, like the
   missile got); verify by point-and-hold naive play, not a deliberate probe. **Round's #1.**
2. **Missile may be slightly too strong / too easy.** Point-roughly clears a wave; little aiming
   skill. Fine for now — but once the gun works, re-tune so both weapons have a role and the
   missile is special rather than the only tool.
3. **Sprite color balance.** Shapes are good; pull the player off its heavy red toward the arcade's
   grey-white-with-red-trim F-14, and calm the enemy's bright red cockpit block. Closes the last of
   "not good enough" on sprites.

Below the line (noted, not top-3): passive score accrual makes SCORE a weak feedback signal (HIT is
the honest one). Backdrop/biomes/canyon remain deprioritized per the recalibration — they do not
appear on this list and did not lift this score.

## Instrument limits

No audio; ~1 s decision cadence; strips, not video — no feel claim finer than one turn. Two seeds
(7, 13), ~20 min sim-time, 42 turns, no invincibility. Sessions fully re-derivable from their
`commands.jsonl`. Full five-sentence player verdict: `judging/R25/playtest-verdict.md`.
