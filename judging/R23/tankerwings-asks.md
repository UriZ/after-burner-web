# R23 TANKER-WINGS lane — asks / findings

Lane owns `src/render/tanker.js` only. One finding for the gate; no cross-area edits
requested (nothing outside `render/tanker.js` was touched).

## FINDING — the R22 criterion "drooping tips / anhedral downsweep" contradicts the arcade

The lane task (and the R22 judge) asked for wings that "sweep DOWN ... out to **drooping
tips** (a strong gull/anhedral downsweep)" — i.e. the wingtips BELOW the root.

Re-measuring `reference/stage3-reload-tanker-t165.png` per column (grey+orange mass, band
0.14–0.42H, symmetric both sides) says the **opposite**: the tips sit **higher** on screen
than the root.

| position            | leading(top) | trailing(bot) | midline |
|---------------------|:---:|:---:|:---:|
| tip (frame edge)    | 0.178H | 0.212H | **0.195H** |
| mid-span            | 0.219H | 0.267H | 0.243H |
| root (nacelle cowl) | 0.210H | 0.34–0.36H | **0.275H** |

The wing is a **wedge**: a DEEP bulky nacelle-cowl root whose trailing edge rakes
monotonically UP to a thin HIGH tip. The "droop" the eye reads at this framing is the deep
root falling away from the high fuselage/nacelle shoulder — **not** the tips falling.

Per CLAUDE.md ("Before tuning to a criterion, check the criterion against the arcade"; "the
reference wins and the doc gets corrected first") the wing was built to the **measured**
silhouette, not the "drooping tips" wording. **Ask of the gate/judge:** retire or reword the
"anhedral / drooping tips" acceptance language — the correct target is a strong deep-root →
high-thin-tip sweep. Nacelles were also measured LEVEL (all four orange blobs at row ~17.4 /
0.242H), not staggered, so they were kept level, on the shoulder.

Evidence: `scratch_tanker/compare_stack.png` (arcade top / ours bottom),
`scratch_tanker/cap_after/frame-0000.png`, `scratch_tanker/cap_seq/frame-0002.png` (docked).
