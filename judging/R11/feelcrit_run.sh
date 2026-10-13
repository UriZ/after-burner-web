#!/bin/bash
# Arm generator + parallel runner for judging/R11/feelcrit_probe.mjs.
#
# Every arm writes to a UNIQUE filename inside its own --out directory (the
# --label is part of the filename), because a lane this round destroyed three of
# its own runs by sharing one. Every arm names the TREE it ran on in its label
# AND in the json's `root`, because "two lanes each called a different tree
# wide" was this round's cross-tree artefact.
#
#   feelcrit_run.sh <stage> <out-root> <trees-root> [parallel]
#
# stages: gainsweep | matrix | hold | gunisol | pairing | repeat
set -u
STAGE=${1:?stage}
OUT=${2:?out root}
TREES=${3:?trees root}
P=${4:-4}
REPO=$(cd "$(dirname "$0")/../.." && pwd)
PROBE="$REPO/judging/R11/feelcrit_probe.mjs"
SECS=90
CMDS=$(mktemp "${TMPDIR:-/tmp}/feelcrit-cmds-XXXXXX")

emit() {  # tree pilot weapons gain lag hold seed extraparams labelsuffix
  local tree=$1 pilot=$2 wp=$3 gain=$4 lag=$5 hold=$6 seed=$7 extra=$8 sfx=$9
  local lbl="${sfx}-${tree}-${pilot}-${wp}-g${gain}-l${lag}-h${hold}-s${seed}"
  local params="invincible=1"
  [ -n "$extra" ] && params="invincible=1&$extra"
  echo "node $PROBE --mode combat --root $TREES/tree-$tree --pilot $pilot" \
       "--weapons $wp --gain $gain --lag $lag --hold $hold --seed $seed" \
       "--secs $SECS --params '$params' --out $OUT/$STAGE --label $lbl" >> "$CMDS"
}

case "$STAGE" in
  gainsweep)
    for g in 0.5 1 2 3 5 8; do emit fd833f6 track both $g 0 0 3 "" gs; done
    for g in 0.5 1 2 3 5 8; do emit fd833f6 anti  both $g 0 0 3 "" gs; done
    ;;
  matrix)
    # Two pursuit gains, because "the best aiming pilot" must not be one
    # hand-picked controller: on seed 3 the gain sweep put g8 at 37 kills and
    # g3 at 29, so taking g3 alone as the denominator would have inflated the
    # motionless stick's share by a fifth. The denominator is the best arm.
    for s in 3 5 11; do for w in both gun missile; do
      emit fd833f6 still $w 3 0 0 $s "" mx
      emit fd833f6 track $w 3 0 0 $s "" mx
      emit fd833f6 track $w 8 0 0 $s "" mx
      emit fd833f6 anti  $w 3 0 0 $s "" mx
      emit fd833f6 sweep $w 3 0 0 $s "" mx
    done; done
    ;;
  hold)
    for s in 3 5 11; do for h in -1 -0.5 0 0.5 1; do
      emit fd833f6 hold both 3 0 $h $s "" hd
    done; done
    ;;
  gunisol)
    # ONE LEVER AT A TIME against the shipped build, pilot `still`, gun only.
    # The question: which constant actually gives a motionless stick its gun
    # kills -- the ASSIST cone (0.13) or the vulcan HIT radius (max(span/2,0.02))?
    for s in 3 5 11; do
      emit fd833f6 still gun 3 0 0 $s ""                        gi0ship
      emit fd833f6 still gun 3 0 0 $s "gun=assistrad%3D0.001"    gi1assistoff
      emit fd833f6 still gun 3 0 0 $s "gun=assistrad%3D0.0985"   gi2assistrail
      emit fd833f6 still gun 3 0 0 $s "gun=hitmult%3D0.15"       gi3hitmult
      emit fd833f6 track gun 3 0 0 $s ""                        gi0ship
      emit fd833f6 track gun 3 0 0 $s "gun=hitmult%3D0.15"       gi3hitmult
    done
    ;;
  pairing)
    for t in 5e3d57e 82daaa4 final fd833f6; do for s in 3 5 11; do
      emit $t track missile 3 0  0 $s "" pr
      emit $t track missile 3 18 0 $s "" pr
      emit $t track missile 1 18 0 $s "" pr   # the adaptive-gain control
      emit $t track both    3 18 0 $s "" pr
    done; done
    ;;
  repeat)
    # determinism control: the same arm twice, different output labels
    emit fd833f6 track both 3 0 0 3 "" rpA
    emit fd833f6 track both 3 0 0 3 "" rpB
    emit fd833f6 still both 3 0 0 3 "" rpA
    emit fd833f6 still both 3 0 0 3 "" rpB
    ;;
  *) echo "unknown stage $STAGE" >&2; exit 2;;
esac

mkdir -p "$OUT/$STAGE"
N=$(grep -c . "$CMDS")
echo "stage $STAGE: $N arms, $P at a time, out $OUT/$STAGE"
cp "$CMDS" "$OUT/$STAGE/cmds.txt"
: > "$OUT/$STAGE/run.log"
# A SEMAPHORE, NOT xargs. The first version used
#   xargs -P -I CMD bash -c 'CMD || echo ARM FAILED'
# which died with "command line cannot be assembled, too long" on the first
# batch, ran ZERO arms, and my own failure counter reported "failed arms: 0"
# because nothing had written the string it greps for. A stable, plausible
# zero from a guard that was itself the thing that broke. The count assertion
# at the bottom is the fix that would have caught it.
i=0
while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue
  ( eval "$cmd" || echo "ARM FAILED: $cmd" ) >> "$OUT/$STAGE/run.log" 2>&1 &
  i=$((i+1))
  while [ "$(jobs -rp | wc -l)" -ge "$P" ]; do wait -n 2>/dev/null || sleep 0.2; done
done < "$CMDS"
wait
GOT=$(ls -1 "$OUT/$STAGE" | grep -c '\.json$')
echo "arms dispatched: $i   json produced: $GOT / $N"
if [ "$GOT" -ne "$N" ]; then echo "*** ARM COUNT MISMATCH -- do not use this stage ***"; fi
echo "ARM FAILED lines: $(grep -c 'ARM FAILED' "$OUT/$STAGE/run.log" || true)"
grep 'page errors [1-9]' "$OUT/$STAGE/run.log" || echo "no arm reported a page error"
