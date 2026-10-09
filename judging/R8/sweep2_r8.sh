#!/bin/bash
# R8 sweep, stage 2: the remaining single levers plus the ASSIST_Y_FRAC ladder.
#
# One seed per arm rather than two, stated rather than quietly done: the
# seed-to-seed standard error on the baseline arms is 0.024-0.070 on a mean of
# 2.8-3.2 kills/s, i.e. ~1-2 %, so a single seed resolves a main effect of
# >= 5 % and these arms are read for SIGN AND MAGNITUDE only. Anything that
# ends up in the shipped configuration is re-measured at 4 seeds in the AFTER
# table. (The machine was carrying a load average of 216 with four lanes live;
# halving the arm count was the alternative to halving the seeds, and seeds
# are the cheaper thing to lose on an effect this size.)
set -euo pipefail
cd "$(dirname "$0")/../.."

R7="assistmax=22,assistmin=6,assistyfrac=1,assistlead=0,assistpick=0,assistfromsight=0,reach=1000000,scatter=0,closure=0"
MODES="still,trk"
SECS=180

run () {
  local name=$1 over=$2
  echo "### $name  [$over]"
  node judging/R8/pilot_r8.mjs --modes "$MODES" --seeds 1 --secs "$SECS" \
    --extra "invincible=1&gun=${R7},${over}" \
    --out "tools/out/combat-r8/sw-${name}/arms.json" 2>&1 | tail -4
}

case "${1:-}" in
1) run lead      "assistlead=1"
   run scatter   "scatter=0.025"
   run pick      "assistpick=1" ;;
2) run fromsight "assistfromsight=1"
   run yfrac035  "assistyfrac=0.35"
   run yfrac050  "assistyfrac=0.5" ;;
*) echo "usage: sweep2_r8.sh <1|2>"; exit 2 ;;
esac
