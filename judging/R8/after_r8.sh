#!/bin/bash
# R8 — the AFTER table, and the re-certification of the R7-equivalent control.
#
# The control string gained two keys when the shipped gate moved from a DEPTH
# bound to the aircraft's own projected SPAN (`minspan`), so it has to be
# re-run: a control certified against an older build certifies nothing about
# this one. It must again be BYTE-IDENTICAL to the 82365e9 baseline ledgers.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Every R8 lever pinned to its R7 value. `minspan=0` and `assistmax=22`
# restore the depth-bounded assist and the unbounded reach.
R7="assistmax=22,assistmin=6,assistyfrac=1,assistlead=0,assistpick=0,assistfromsight=0,reach=1000000,minspan=0,scatter=0,hitmult=0.8,closure=0"

case "${1:-}" in
ctl)  # re-certify: must reproduce the baseline exactly
  node judging/R8/pilot_r8.mjs --modes still,trk --seeds 1,2 --secs 180 \
    --extra "invincible=1&gun=$R7" --out tools/out/combat-r8/ctl2-r7equiv/arms.json ;;
a)    # AFTER, shipped defaults, no ?gun= at all
  node judging/R8/pilot_r8.mjs --modes still,vert,lat,trk --seeds 1,2,3,4 \
    --secs 180 --extra "invincible=1" --out tools/out/combat-r8/aft-A/arms.json ;;
a2)   # the remaining policies at 2 seeds; the 4-axis table above is the headline
  node judging/R8/pilot_r8.mjs --modes still2,trkall,gunonly,msltrk,idle --seeds 1,2 \
    --secs 180 --extra "invincible=1" --out tools/out/combat-r8/aft-A2/arms.json ;;
scat0) # does the aim scatter matter once the hitbox is the aircraft?
  node judging/R8/pilot_r8.mjs --modes arcstill,arctrk --seeds 1,2 --secs 180 \
    --extra "invincible=1&gun=scatter=0" --out tools/out/combat-r8/sw-scat0-shipped/arms.json ;;
b)
  node judging/R8/pilot_r8.mjs --modes gunonly,msltrk,demo,idle --seeds 1,2,3,4 \
    --secs 180 --extra "invincible=1" --out tools/out/combat-r8/aft-B/arms.json ;;
c)    # the arcade-missile-rate arms: the only ones in which the gun's own
      # aim-dependence is not swamped by the stock-limited missile plateau
  node judging/R8/pilot_r8.mjs --modes arcstill,arctrk --seeds 1,2,3,4 \
    --secs 180 --extra "invincible=1" --out tools/out/combat-r8/aft-C/arms.json ;;
cbase) # ...and the same two pilots on the R7 gun, so the pair is comparable
  node judging/R8/pilot_r8.mjs --modes arcstill,arctrk --seeds 1,2,3,4 \
    --secs 180 --extra "invincible=1&gun=$R7" --out tools/out/combat-r8/aft-Cbase/arms.json ;;
mortal) # fairness needs FATAL hits, which needs a mortal pilot
  node judging/R8/pilot_r8.mjs --modes arcstill,arctrk,demo --seeds 1,2,3,4 \
    --secs 180 --out tools/out/combat-r8/aft-mortal/arms.json ;;
mortalbase)
  node judging/R8/pilot_r8.mjs --modes arcstill,arctrk,demo --seeds 1,2,3,4 \
    --secs 180 --extra "gun=$R7" --out tools/out/combat-r8/aft-mortalbase/arms.json ;;
thr0) # gap 4a: closure inert, throttle-cycling pilot
  node judging/R8/pilot_r8.mjs --modes thrcyc --seeds 1,2,3,4 --secs 180 \
    --extra "invincible=1&gun=closure=0" --out tools/out/combat-r8/thr-c0/arms.json ;;
thr1) # gap 4a: closure at the shipped half strength, same pilot
  node judging/R8/pilot_r8.mjs --modes thrcyc --seeds 1,2,3,4 --secs 180 \
    --extra "invincible=1&gun=closure=1" --out tools/out/combat-r8/thr-c1/arms.json ;;
thr2) # gap 4a: the full-strength arm the R6 lane measured and withdrew
  node judging/R8/pilot_r8.mjs --modes thrcyc --seeds 1,2,3,4 --secs 180 \
    --extra "invincible=1&gun=closure=2" --out tools/out/combat-r8/thr-c2/arms.json ;;
*) echo "usage: after_r8.sh <ctl|a|b|c|cbase|mortal|mortalbase|thr0|thr1|thr2>"; exit 2 ;;
esac
