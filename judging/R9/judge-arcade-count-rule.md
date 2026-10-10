# R9 JUDGE — arcade enemy-density count rule, written BEFORE any frame was extracted

Written to disk before `tools/out/judge-r9/arcade/` existed. The extraction command below is
the only thing that selects frames.

1. **Source** `.reference-cache/video/ab2-longplay.mp4` (686x480, the STAGE_MAP-keyed file),
   `-ss T -frames:v 1` single-frame extraction at an exact timestamp.
2. **Spans** STAGE_MAP.md VERIFIED spans only, trimmed >=4 s at each end (transition card,
   reload card).
3. **Grid** fixed **4.00 s**. This is a FOURTH spacing — the 63-frame set used 3.00 s, the R8
   feel critic 2.00 s, the R9 pacing lane 5.00 s — so this sample cannot inherit any prior
   grid's phase.
4. **Stages 1, 2, 9, 21.** Stage 1 because it is the only stage this project captures and the
   gate that matters. **Stages 2, 9 and 21 have never been counted on a grid by anyone in this
   repo** (prior counts covered 1,4,6,7,12,19 / 1,3,10,11 / 1,6,16 / 1,2,4).
5. **Stage digit read on every frame before counting.** A frame whose digit does not read, or
   which shows a launch/transition/refuel/RELOAD card, is excluded with its reason.
6. **Count** every enemy **aircraft** silhouette wholly or partly inside the play area.
   Excluded: the player's own jet, missiles, vulcan rounds, enemy fireballs, explosions, smoke,
   HUD elements (**including lock-on brackets — anything inside a bracket is zoomed to 6x before
   it is counted or rejected**, ledger row 37), ground/sea objects.
7. **Span** drawn wingtip-to-wingtip extent as a per cent of 686 px, read off a 2x NEAREST
   upscale. +-2-3 points, the same honesty bound the other counts state.
8. **Published** aircraft per frame and fraction of frames holding >=1, at floors
   0 / 3 / 5 / 10 %W.
