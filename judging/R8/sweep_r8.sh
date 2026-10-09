#!/bin/bash
# R8 combat lane — the one-lever-at-a-time isolation.
#
# Every arm is the SHIPPED R7 GUN with exactly one constant moved. The R7
# baseline is expressible as a `?gun=` string (see R7 below) and reproducing
# it was certified BYTE-IDENTICAL to the pre-R8 tree on four arms — same
# kills, same order, same span and depth per kill — so an arm below differs
# from R7 in one constant and in nothing else.
#
# This is the method REFERENCE ledger rows 28 and 29 were settled by, and
# both of them REFUTED what their lane had written down from arithmetic
# first. R6 named the missing reach cap as the mechanism of gap 1; R7's feel
# critic priced it at 4.2 % with a controlled arm. Neither had a sweep.
#
# Usage: bash judging/R8/sweep_r8.sh <group 1-4>
set -euo pipefail
cd "$(dirname "$0")/../.."

R7="assistmax=22,assistmin=6,assistyfrac=1,assistlead=0,assistpick=0,assistfromsight=0,reach=1000000,scatter=0,closure=0"
MODES="still,trk"
SEEDS="1,2"
SECS=180

run () { # name  override-that-replaces-one-R7-key
  local name=$1 over=$2
  node judging/R8/pilot_r8.mjs --modes "$MODES" --seeds "$SEEDS" --secs "$SECS" \
    --extra "invincible=1&gun=${R7},${over}" \
    --out "tools/out/combat-r8/sw-${name}/arms.json" 2>&1 | tail -4
  echo "### $name  [$over]"
}

case "${1:-}" in
1) run reach    "reach=7.0596"
   run amax     "assistmax=7.0596" ;;
2) run amin     "assistmin=2.6"
   run yfrac0   "assistyfrac=0" ;;
3) run lead     "assistlead=1"
   run scatter  "scatter=0.025" ;;
4) run pick     "assistpick=1"
   run fromsight "assistfromsight=1" ;;
*) echo "usage: sweep_r8.sh <1|2|3|4>"; exit 2 ;;
esac
