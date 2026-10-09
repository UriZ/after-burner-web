#!/bin/bash
# R8 sweep, stage 2 — the levers stage 1 did not reach, including the two the
# shipped build uses and which must not go out unmeasured: the aim SCATTER
# (the TL's brief names it as the untried lever and says to measure it rather
# than assume it) and the depth LEAD. Plus `minspan`, which is the gate the
# shipped build actually runs on, measured here as a single lever against the
# R7 control so it has a main effect of its own on the record.
#
# One seed per arm rather than two, stated rather than quietly done: the
# seed-to-seed standard error on the baseline arms is 0.024-0.070 on a mean of
# 2.8-3.2 kills/s (~1-2 %), so one seed resolves a main effect of >= 5 %, and
# these rows are read for SIGN AND MAGNITUDE only. Everything in the shipped
# configuration is re-measured at 4 seeds in the AFTER table.
set -euo pipefail
cd "$(dirname "$0")/../.."

R7="assistmax=22,assistmin=6,assistyfrac=1,assistlead=0,assistpick=0,assistfromsight=0,reach=1000000,minspan=0,scatter=0,closure=0"
MODES="still,trk"
SECS=180

run () {
  local name=$1 over=$2
  echo "### $name  [$over]"
  node judging/R8/pilot_r8.mjs --modes "$MODES" --seeds 1 --secs "$SECS" \
    --extra "invincible=1&gun=${R7},${over}" \
    --out "tools/out/combat-r8/sw-${name}/arms.json" 2>&1 | tail -3
}

case "${1:-}" in
1) run minspan   "minspan=0.10"
   run scatter   "scatter=0.025"
   run lead      "assistlead=1" ;;
2) run pick      "assistpick=1"
   run fromsight "assistfromsight=1"
   run scatbig   "scatter=0.05" ;;
*) echo "usage: sweep2_r8.sh <1|2>"; exit 2 ;;
esac
