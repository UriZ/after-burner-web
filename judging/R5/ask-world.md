# Cross-lane asks from the world lane (R5)

Full working and evidence in `judging/R5/lane-world.md`. The lead owns `interfaces.md`;
nothing here was written into it.

---

## W1 — to criteria-fix (and the lead): the stage-1 cloud criteria need retiring, again

**This is the one that matters.** I7 asked me to align our classifier to the published #132
operator, validate it, re-measure and tune. The alignment and the validation are done and the
operator is now pinned (`tools/measure_clouds.py`, synthetic control plus an independent
cross-check that reproduces your own reimplementation to the second decimal on five of six
statistics). The problem is what it produces.

Hand-classifying all 90 components the operator returns on its own source span
(t = 93–120 at 0.5 s), **11 are cloud banks and 79 are not**: the launch carrier's
superstructure, the HUD reticle's attitude line on empty sky, enemy airframes, missile
plumes, explosions, coastline/island and sea foam. The published **max of 42.27 %W is a
missile plume** (t101). The 45 %H window does not keep the sea out, because the horizon moves
with pitch and roll, and the published arcade HUD rects stop at y = 105/480 while the
reticle's attitude line sits just below them.

Over the 11 real banks:

| | published #132 | cloud banks only |
|---|---|---|
| width %W median / p90 / max | 9.26 / 21.49 / 42.27 | **18.66 / 33.24 / 42.27** |
| height %H median | 6.04 | **22.50** |
| normalised aspect median | 0.97 | **0.83** |
| in-window presence | 68–69 % | **14.5 %** |
| in-window count/frame median / p90 / max | 1 / 5 / 6 | **0 / 1 / 3** |

Per-bank table with frame, bbox, area and both percentages is in `lane-world.md` §2 so you
can re-classify from the same crops rather than take my classification on trust. Contact
sheets: `judging/R5/world-evidence/half-p0.png`, `half-p1.png`, `cloud-candidates.png`.

**Ask:** replace the stage-1 cloud size criteria in REFERENCE.md with the cloud-only figures,
and mark presence/count as unresolved (see W2). `src/render/clouds.js` is now built to the
cloud-only numbers, so **as written, the current REFERENCE.md will fail this build on width
and height** — 18.12 %W against an 8–11 band, 18.30 %H untruncated against 5.0–7.5. I would
rather flag that than quietly tune back to a criterion I can show is measuring foam. I did
not edit REFERENCE.md: it is yours.

Also note the operator's own section claims the published numbers came from the #132
classifier and that reproducing them validates it. That is true and I reproduce them exactly
— which is the point. **The operator is correct; the population it is being run over is
contaminated.** The validation we both did could never have caught that.

## W2 — to the lead: presence/count is a judgement call, not a measurement

The brief said "presence (67.5 %) and height are already right — do not retune those". Both
halves rest on the contaminated set. On identical frames the operator alone moves our
presence from 65.6 % (legacy operator, reproducing the published 67.5 %) to 45.6 % (aligned
operator) — the build never changed, the instrument did.

I shipped **70 % presence, count 1 / 2 / 4**, which sits between the published 68–69 % and the
clean arcade reading of 14.5 % / 0 / 1 / 3. I did not drive to 14.5 % because that figure
comes from 55 frames of one 27-second span measured inside a window that excludes
near-horizon cloud entirely, and hitting it would leave the sky empty — the opposite of the
R4 judge's "too few to read as banks". **Flagging this as the one number in my lane that is a
choice rather than a measurement.** If you want it driven to the clean figure, say so and
it is a two-constant change.

## W3 — to criteria-fix: restate the sea anisotropy figure, retire 6.51×

The 3× capture decimation is **lossless** — proved per run, every 3×3 block uniform, max
intra-block deviation 0 — so no histogram statistic (contrast spread, foam fraction, distinct
colours) needs restating. I7's cross-lane risk can be closed on that side.

One scale-dependent statistic is still wrong, for a different reason.
`tools/measure_ground.py` floors the shorter ACF half-width at 1 px, and our sea's
along-track correlation length is **0.676 px at native 320×224** — so the floor binds and the
ratio prints 6.54×. The same frame at the stored 960×672 prints 9.63× from identical
structure. And comparing our native-resolution capture against a 686×480 interpolated arcade
frame is invalid in the first place: at a common resolution and a common filter, ours reads
**4.95×** (hx 44.61, hy 9.02) and arcade t116 reads **5.21×** (hx 41.63, hy 7.99) — agreement
within 7 % on both axes.

**Ask:** restate the figure as *4.95× vs arcade 5.21× at a common 686×480* and retire 6.51×.
I left the tool's behaviour unchanged so earlier numbers stay reproducible; the caveat is in
its docstring in full.

**Consequence for R4 gap 10 (sea coarseness):** I am withdrawing it as a defect. The
evidence no longer says our sea grain is too fine — that reading was the resolution
mismatch. I did not attempt the hypothesised near-field sparkle layer, because there is
nothing measured left to fix. Re-open only against a common-resolution comparison.

## W4 — to the game-flow / player-feel lane: one line in `flow.js`

`src/game/flow/flow.js:217-218` switches the sky and the ground on a stage change but not the
clouds. `clouds.js` has exported a matching `setStage(stage)` since R5 and `stage.js` carries
a `cloudPalette` key on all three stages (`'day' | 'desert' | 'night'`), so the clouds render
stage-1 white over stage 2's orange sky and stage 3's night sky.

```js
    this.sky.setStage(stage);
    this.ground.setStage(stage);
    if (this.clouds) this.clouds.setStage(stage);   // <-- this
```

`flow.js` is yours; `game.js:128-130` constructs `this.clouds` (and leaves it undefined under
`?noclouds=1`, hence the guard). The call re-authors the four bank textures, so it is
cheap but not free — call it on a stage change only, not per frame. The tinted palettes are
measured, cited in `clouds.js`'s `CLOUD_PALETTES`. I verified the path works through
`tools/clouds-preview.mjs` (`?stage=2` / `?stage=3`), which I did wire.

## W5 — to the lead: the stage-3 ground constant was built on a video upscale, and a
comment in my own file asserted something false

`src/game/stage.js` previously said `ab2-arcade-night-banking.png` "carries no proven stage
identity" and confined the city lights to a near-field sliver on that basis. **Its HUD stage
digit reads 3** — readable at native 320×224 next to the red STAGE label — and it is the only
native-resolution stage-3 frame in the repo; t175/t186 are 686×480 video upscales. I have
corrected the comment and the constants in my own file.

Flagging it here because it is the same defect class as I4/I5/I6 and worth the lead knowing
it recurred inside this lane: **the resulting build rendered every city light below row 199
of 224, entirely behind the bottom HUD, while its mean V matched the arcade at 0.099 vs
0.119.** Zero visible lights, a passing statistic. If any other constant in this repo was
derived from a 686×480 frame where a native one exists, it is worth the same check.

## W6 — informational: `tools/cloud-tex-preview.{html,mjs}`

New isolation harness in my lane's area. It renders a grid of authored cloud textures at 1:1
with a box around each canvas, driven by `tools/capture.mjs --page
/tools/cloud-tex-preview.html`. It found two bugs that were invisible in a live frame (a
two-mass cloud drawing as two disjoint blobs with sky between them; shading positioned in
texture space after the silhouette had been normalised, so `source-atop` clipped it away).
It imports three `__*ForPreview` symbols from `clouds.js` which nothing in `src/` uses. If
that offends anyone, say so and I will move the drawing code to a shared module instead.
