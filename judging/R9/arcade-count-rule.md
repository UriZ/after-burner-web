# Pacing lane R9 — arcade density count: the rule, written BEFORE any frame was opened

Timestamped by being committed to the tree before `tools/out/pacing-r9/arcade/` existed;
the extraction command below is the only thing that selected frames.

1. **Source**: `.reference-cache/video/ab2-longplay.mp4` (686x480, the STAGE_MAP.md-keyed one).
   `-ss T -frames:v 1` single-frame extraction at an exact timestamp.
2. **Spans**: STAGE_MAP.md VERIFIED spans only, trimmed >=3 s at each end to avoid the
   stage-transition card and the reload. Stages chosen: **1, 3, 10, 11**. Stage 1 for
   comparability with both published counts; **3, 10 and 11 have never been counted by
   anyone in this repo**, so three quarters of this sample is new ground as well as a new
   reader.
3. **Grid**: fixed **5.00 s**, six frames per stage, no selection by content. 5.00 s is a
   THIRD spacing — the 63-frame set used 3.00 s and the R8 feel critic used 2.00 s — so
   this sample cannot inherit either grid's phase.
4. **Stage digit read on every frame before counting.** A frame whose digit does not read,
   or which shows the launch/transition/refuel card, is excluded with its reason.
5. **Count**: every enemy **aircraft** silhouette wholly or partly inside the play area.
   Excluded: the player's own jet, missiles, vulcan rounds, enemy fireballs, explosions,
   smoke, HUD elements, ground/sea objects (ships, installations, trees, rocks).
6. **Span**: each counted aircraft's drawn wingtip-to-wingtip extent as a per cent of the
   686 px frame width, read off a 2x NEAREST upscale with a ruler strip. +-2-3 points,
   same honesty bound the 63-frame set states for itself.
7. **Statistics published**: aircraft per frame and fraction of frames holding >=1, each at
   floors 0 (anything seen) / 3 / 5 / 10 / 15 %W. The two reproductions this lane is
   measured against are **readable presence at >=10 %W** and **the empty-sky fraction at
   >=3 %W** (the floor at which a human counter can see an aircraft at all, and the floor
   the published 39.7 % is quoted at).
8. **Pre-committed**: no frame is dropped after it is counted, and no floor is chosen after
   the numbers are in.
