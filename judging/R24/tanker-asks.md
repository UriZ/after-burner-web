# R24 TANKER lane — out-of-lane asks & withdrawal note

## WITHDRAWAL: the wing up-sweep does NOT need deepening (measured)

The R24 task was to deepen the tanker wing up-sweep from a measured 0.038H to
the arcade's ~0.065H. On re-measuring I found **our wing already matches the
arcade at the docked state.** The 0.038H figure is a measurement-frame artifact,
not a silhouette gap. No change was made to `src/render/tanker.js`.

### Evidence

Operator (same on both): low-sat grey mask (sat<55, 60<val<215), left wing
scanned tip(frame edge) -> root(nacelle shoulder), per column, screen-H fraction.

Arcade: `reference/stage3-reload-tanker-t165.png`.
Render: `?airrefuel=3`, **warmed up 90 ticks so the tanker is fully DOCKED**
(approach ease `e`=1; AIR_REFUEL_APPROACH_S=1.2s = 72 ticks).

| col%W | arcade bot | render bot | arcade mid | render mid |
|------:|-----------:|-----------:|-----------:|-----------:|
| 0.02  | 0.218      | 0.213      | 0.203      | 0.196      |
| 0.05  | 0.226      | 0.226      | 0.209      | 0.202      |
| 0.12  | 0.244      | 0.244      | 0.225      | 0.214      |
| 0.24  | 0.281      | 0.280      | 0.254      | 0.238      |
| 0.30  | 0.297      | 0.302      | 0.251      | 0.243      |

Up-sweep tip->root@0.30:  trailing  arcade 0.079H / render **0.089H**;
midline arcade 0.048H / render **0.047H**. (trailing @root0.24: arcade 0.063H /
render 0.067H.) Match within ~0.01H at every column; ours is if anything
*steeper* on the trailing edge. Deepening would push us PAST the arcade.

Scale-free confirmation (midline slope, H per unit W, linear fit over clean wing
columns): arcade 0.199, render 0.202 — ratio 0.98. The internal wedge slope is
identical whether the tanker is docked (full width) or mid-approach (narrow).

### Why the judge read 0.038H

At the APPROACH frame (tanker not yet docked: TANKER_APPROACH_SPAN=0.74,
CENTRE=0.1) the tanker renders at ~0.70W wingspan, high and small. The SAME
(correct) wedge slope over that smaller span yields a smaller H-fraction
up-sweep: our frame-0 (`e`=0) capture measured midline 0.038H — exactly the
judge's figure. The gap is render SCALE on the un-docked frame, not wing slope.

### ASK (out of lane — `src/render/tanker.js` cannot touch this)

If the up-sweep should read deep *during the approach* too, that is governed by
`src/game/flow/flow.js` (Game flow area): `TANKER_APPROACH_SPAN` (0.74),
`TANKER_APPROACH_CENTRE` (0.1), and `AIR_REFUEL_APPROACH_S` (1.2s). The arcade
reference `stage3-reload-tanker-t165.png` is the DOCKED formation, so the
docked-state match above is the right fidelity bar. If the next judge measures
the docked frame, no action is needed. If it keeps measuring an approach frame,
raise the approach span / shorten the approach so the tanker reaches full size
sooner — a flow.js change, requested here rather than reached into.
