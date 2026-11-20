# R27 enemy-presence lane — arcade vs ours time-at-size

## Method
- Arcade: stage 1 = 88-120s of ab2-longplay-60fps.mp4 (STAGE_MAP). Decoded 100-112s at
  60Hz (720 frames) for dwell/motion; 88-120s at 1Hz for the presence profile. Playfield
  width = 1028px (content fills edge-to-edge). Enemy px-width measured by crop; %W = px/1028.
  The big grey center jet is the PLAYER (3rd-person) and is NOT counted as an enemy.
- Ours: node tools/combat_probe.mjs --ticks 2400 --url-params "demo=1&seed=7" (400 ticks @0.1s,
  40s). spanFrac = fraction of 320px native screen = fraction of playfield width (same unit).

## Arcade stage-1 profile (measured)
- 88-93s (~6s): carrier launch + climbout, NO enemies.
- 94-103s: first wave; enemies ARRIVE already mid-large (t94: 2 enemies ~9-10%W), build to
  close combat. Peak t100: biggest enemy 19.5%W, a mid 8.7%W, + distant reticle speck ~4%W;
  2-4 enemies on screen. ~10 kills (HIT 0->10).
- 104-110s (~7s): LULL — player mostly alone, occasional distant single scout near reticle
  (~3-4%W), HIT frozen at 11 (no kills).
- 111-119s: second wave, mid-large enemies (t117 ~13.6%W, t119 ~14%W), kills resume to 13.
- Fraction of FLIGHT time (94-120) with a readable-large (>8%W) enemy on screen: ~40-50%.
  Over the whole 88-120 span (incl. enemy-free launch): ~35%.
- Rhythm = WAVES of 2-4 close/large enemies separated by multi-second lulls; biggest wave
  enemies ~15-20%W. Also carries distant scouts/formations (specks) during lulls.

## Ours (combat_probe demo seed 7)
- Per-enemy size (onscreen enemy-ticks, n=1121): median 3.95%W, mean 6.32%W, MAX 29.07%W.
    <2%W 23.7% | 2-4% 26.5% | 4-8% 22.9% | 8-15% 16.6% | >15% 10.3%
  => >8%W 26.9% of enemy-time; >4%W 49.8%.
- Largest-enemy-per-tick: a >8%W enemy present 33% of the whole run (43% of enemy-present
  ticks); >4%W present 51%. Median largest-enemy 6.7%W, mean 9.3%W.
- Enemies present near-continuously: 76% of ticks have >=1 enemy; avg 2.80, max 8.
- Depth: 12.2% of enemy-time at d<5 (=> ~14-28%W), 29% at d<10; long tail out to depth 90.
- Kills: only 4 hits / 40s (DEMO pilot barely engages) vs arcade's ~13/32s.

## Verdict
- Our CLOSE enemies already match/EXCEED the arcade (max 29%W vs arcade peak ~19.5%W) —
  confirms the TL correction; DO NOT bump width.
- Time a readable-large (>8%W) enemy is present: ours 33% of run vs arcade ~35-45% of flight
  time. COMPARABLE — the arcade does NOT keep enemies mostly-close/large. It alternates
  close-combat WAVES with multi-second lulls + distant scouts.
- The real divergence is RHYTHM (ours = continuous-smaller spread across depth; arcade =
  waves+lulls) and low demo kill-rate — neither fixed by approach/hold depth, both outside
  this lane, and bumping hold/approach depth would push ours FURTHER from the wave-lull
  rhythm while re-litigating the MEASURED 4-6s approach (GAME_SPEC §4) and risking weapons.

## Weapon-health baseline (no change made, so also the "after")
- aim_lock_probe --seed 7 --secs 18 --jitter 0.5: 13 missiles launched (stock 50->37),
  firstLock tick 16, firstLaunch tick 38, lock active 286 ticks, 0 errors.
- combat_probe final: hits 4, locks 1, vulcanRounds 4 (demo pilot, 40s).

DECISION: WITHDRAW — no code change. Arcade-justified change not supported.
