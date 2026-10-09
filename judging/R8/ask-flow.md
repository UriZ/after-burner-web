# R8 — asks from the game-flow lane

Five asks. **F1 and U1 are the ones that matter**; F1 because a constant with no
derivation left is still shaping the enemy distribution, U1 because gap 2's fix
made a piece of HUD geometry reachable that had never been drawn before.

Everything below carries its operator and its source frame. Where a number is
ours it names the tree it was measured on.

---

## U1 — `src/ui/hud.js`: the two-digit stage number is drawn in the wrong place

**Owner: the ladder lane (`src/ui/**`).**

Gap 2 is fixed: `flow.hudState.stage` is now the true 1..23 stage number, so the
HUD digit reaches 10..23 for the first time. `hud.js:836` draws it with

```js
drawTextCenteredInk(ctx, String(this.state.stage), M_STAGE_DIGIT.cx /* 187 */, ...)
```

which ink-centres the **whole string**. That is right for one digit and wrong for
two. **The arcade right-aligns on the units cell and ink-centres each digit
inside its own cell.**

### The arcade measurement

Source `.reference-cache/video/ab2-longplay.mp4` (686x480, scale 686/320 =
2.14375 to native). Stage identity per `STAGE_MAP.md`'s HUD-verified spans, so
every frame below is a known stage. Operator: cream-ink mask
`R>185 & G>175 & B<175 & R-B>45 & G-B>35` over crop x[335,455] y[415,458], column
runs converted to native. Figure
`judging/R8/flow-r8-01-arcade-stage-digits-1-to-15.png` — the digits 1, 2, 3, 4,
6, 8, 10, 11, 12, 13, 15 read directly off it.

| frame | number | tens ink centre (native x) | units ink centre (native x) |
|---|---|---|---|
| t=100 (stage 1) | 1 | — | **187.3** |
| t=175 (stage 3) | 3 | — | **187.3** |
| t=280 (stage 6) | 6 | — | 186.8 |
| t=490 (stage 11) | 11 | **179.3** | **187.0** |
| t=530 (stage 12) | 12 | **179.3** | **187.5** |

The units digit does not move when a tens digit appears — it holds 187 in all
five. The tens digit sits exactly one 8-px advance to its left (187.3 − 179.3 =
**7.95**, against the BIG face's 7-wide glyph + 1 gap). An ink-centred `"12"`
cannot produce that: it puts the pair's combined ink centre on 187, which is
half an advance right.

### Ours, measured on the fixed build

`tools/out/flow-r8/stage-AFTER-460/frame-{0008,0053,0070}.png`, isolated tree
`82365e9` + this lane's changes, `?fixed=1&seed=1&demo=1&invincible=1`, decimated
to native and matched on hud.js's exact `CREAM` `#f7f794`:

| ours | ink runs (native x) | tens centre | units centre |
|---|---|---|---|
| stage 2 | (184,190) | — | **187.0** ✅ |
| stage 10 | (180,183) (187,193) | **181.5** ✗ | **190.0** ✗ |
| stage 12 | (180,183) (187,193) | **181.5** ✗ | **190.0** ✗ |

Single digit is right on the arcade. Two digits are **2.2 px and 2.7 px right**
of it, and the units digit has left the cell the single digit occupies.

### What to change

Draw each digit ink-centred in its own cell, right-aligned on the units cell:

```js
const s = String(this.state.stage);
for (let i = 0; i < s.length; i++) {
  drawTextCenteredInk(ctx, s[i], M_STAGE_DIGIT.cx - 8 * (s.length - 1 - i),
    M_STAGE_DIGIT.y, CREAM, 1, 1, BIG_OVER_WORLD);
}
```

`src/game/flow/cards.js`'s `drawStageNumber()` is the same four lines and already
reproduces the arcade on the tally card (figure `judging/R8/flow-r8-03-tally-ARCADE-TOP-OURS-BOT.png`) — lift it or duplicate
it, your call; it is your file now.

**Collision check, done so you do not have to**: the tens cell is native
x[176,182]. `M_SPEED_PLATE` ends at x53, the `STAGE` word's red ink ends at
x164, and `M_LIVES` is bottom-left. Nothing is within 11 px. A hundreds cell
would be x[168,174] and still clear, but the number never exceeds 23.

**Instrument available**: `tools/out/flow-r8/read_stage_number.py --dir <capture>`
reads one- and two-digit numbers by exact-ink Hamming match and **reports which of
the two layouts it matched**, so it will tell you when this is fixed. Its
`--selftest` renders 1..23 in both layouts and asserts all 46 read back exactly.

---

## F1 — `src/game/spawner.js`: `REACH_CEILING_NDC_Y` has no derivation left, and removing it moves two published statistics onto the arcade

**Owner: the combat lane.**

R7 judge gap 5 established the inputs are dead. This lane re-derived the ceiling
and then **measured what the constant actually does**, because "it is not
load-bearing" and "it changes nothing" are different claims and only the first
was true.

### The re-derivation

`tools/out/flow-r8/rails_probe.mjs` (reads every input out of the source at run
time, so it cannot go stale the way the comment did):

```
player ndcY at full-up stick, settled          +0.45966   (27.017 %H)
+ combat.js   SIGHT_NDC_Y_OFFSET                0.30      sight tops at 0.7597
+ lockSystem  LOCK_RADIUS_FRAC 0.22 / (0.5*224/320) = 0.6286  y reach
= ceiling                                       1.3882 NDC
```

NDC y runs to +1.0. **The reachability bound is off the top of the screen.** The
shipped 0.64 is therefore not a reach bound; it is an undocumented cap on the
enemy altitude distribution.

The probe also confirms the rail two ways: `__setStick` and a real
`KeyboardEvent('keydown', {code:'ArrowUp'})` dispatched on the page's own window
agree to **0.000000 NDC**, so this is not a figure that is right about the sim
and wrong about the game.

### What it does — measured, two seeds, two trees differing in that one line

`tools/out/flow-r8/enemy_alt_probe.mjs`, 180 s, `?fixed=1&demo=1&invincible=1`,
sampled **every tick** (the demo's regime cycle is exactly 16.000 s, so a coarser
fixed interval would beat against it), ~134 000 enemy samples per arm. Throwaway
trees under the scratchpad; **nothing in `src/` was edited for this**.

| | ceiling 0.64 | ceiling lifted | arcade (spawner.js's own published figure) |
|---|---|---|---|
| seed 1 enemy p5 %H | 20.24 | **16.16** | 14.1 |
| seed 7 enemy p5 %H | 18.61 | **13.60** | 14.1 |
| seed 1 top-third share | 30.47 % | **31.06 %** | 32.5 % |
| seed 7 top-third share | 31.98 % | **32.56 %** | 32.5 % |
| seed 1 max enemy ndcY | 0.6696 | 0.9757 | — |
| seed 7 max enemy ndcY | 0.6686 | 0.9770 | — |

**Both statistics move toward the arcade on both seeds.**

### And spawner.js's stated reason for keeping it does not reproduce

The comment at `spawner.js:136-141` argues against lifting the cap because
*"our all-enemy top-third share is 34.9 % against the arcade's 32.5 %, so lifting
the far-field cap overshoots a matched figure to chase a quantile."* At
`82365e9` that share measures **30.47 % and 31.98 %** — *below* 32.5, not above.
The 34.9 predates R7. The argument is not merely stale, it points the other way
once the number is current.

**Asked**: delete `REACH_CEILING_NDC_Y` and `clampReach`'s upper arm, or keep a
cap and re-label it honestly as an ADOPTED distribution cap naming the statistic
it protects — but do not leave a reach justification on it, because there isn't
one. Re-measure the all-enemy columns in the same change; three of the figures
in that comment block are from before R7.

The floor (`REACH_FLOOR_NDC_Y = -0.7`) is **not** part of this ask. Its comment
already says it is the arcade's own p95 rather than a reach bound, which is a
correct label, and it is not the thing the judge flagged.

---

## F2 — `lockSystem.js` / `combat.js`: three values for one quantity, and a comment wrong in direction

**Owner: the combat lane.** Small, but it is what made F1 possible.

- `lockSystem.js:33-41` says the prototype's radius *"8.3 %W; **widened to
  15 %W** after measurement"* and then, eight lines later, sets
  `LOCK_RADIUS_FRAC = 0.22` — **22 %W**. Three numbers for one radius in one
  file.
- `combat.js:53` calls the assist cone *"Wider than the missile lock radius
  (8.3 %W)"* while `ASSIST_RADIUS_FRAC = 0.13` is **narrower** than the shipped
  0.22. The comment is wrong about the direction, not just the value.

The shipped y-reaches, for whoever fixes the text: lock `0.22 / 0.35 = 0.6286`
NDC, assist `0.13 / 0.35 = 0.3714` NDC (`rails_probe.mjs` prints both).

---

## F3 — `src/render/clouds.js`: the throttle's parallax cue, and the arcade cannot arbitrate the magnitude

**Owner: the world lane.** Gap 4b. This lane confirmed ownership before touching
anything and has touched nothing.

`clouds.js:417` is `const CLOUD_SPEED = 9.5; // independent of ground
scrollSpeed`, so at H the ground runs **2.34×** faster while the nearer cloud
layer does not change at all. A nearer layer that fails to respond to speed is a
parallax cue pointing the wrong way, and that reads worse than an inert one.

**The minimal coherent fix** is to scale cloud drift by the same throttle
multiplier the ground already uses. `flow.scrollSpeed` (this lane's file) is
`STAGES[...].scrollSpeed * THROTTLE_SCROLL_MULT[throttleIndex]` with
`THROTTLE_SCROLL_MULT = [0.62, 1.0, 1.45]`. **At M the multiplier is exactly
1.0, so every MEASURED cloud statistic is preserved bit-for-bit and only L and H
move.** If you want the multiplier without the stage term, say so and this lane
will expose `flow.throttleMult` — `game.js` currently calls `clouds.update(dt)`
and the extra argument is yours to design.

### The arcade check, and it is a negative result worth having

**Owed by R7's gap 4 and not previously taken.** The arcade's own throttle
letter was read off `.reference-cache/video/ab2-longplay-60fps.mp4` (1028x720 =
3.2125× native, the only source where a 7-px glyph survives — the 686x480 file
compresses this glyph into something that reads as "H" at 14× zoom, and that
false read is why the HD file was used). Crop x[140,182] y[634,672], **22
samples from t=95 s to t=740 s**, spanning roughly eighteen stages:

> **The letter is `M` on all 22.** Figures
> `judging/R8/flow-r8-04-arcade-throttle-letter-M-x16.png` and
> `flow-r8-05-arcade-throttle-letter-M-x6-9zoom.png`.

Two consequences:

1. **Every L and H magnitude in this build is ADOPTED with no arcade observation
   behind it.** There is no throttle excursion anywhere in 645 s of the mapped
   longplay to measure against. So R7's instruction — fix the incoherence, not
   the gameplay — is right, and now has evidence rather than caution behind it.
2. **`M` is the datum by observation, not by convention.** The footage every
   MEASURED flight constant was taken from was flown entirely at M, so none of
   them is contaminated by a different detent.

Stated honestly: this is one longplay pilot. It licenses *"the reference footage
contains no throttle excursion"*, not *"the cabinet has none"*.

---

## F4 — `README.md`: `?debugtally=N`

**Owner: the criteria lane** (`README.md`). One row for the query-param table:

| param | effect | owner |
|---|---|---|
| `?debugtally=N` | Forces the stage-end tally card open immediately with a representative 8 hits / 160,000 pts. `N > 1` names the incoming stage the card shows, so a capture can check the **two-digit** layout (stages 10-23) without flying for six minutes. `?debugtally=1` keeps the previous behaviour. | `game/flow/flow.js` |

README's own note says *"a verb that is not in this table is a verb a judge will
score as absent"*, which is why this is filed rather than left.

The same change also fixed the mismatch R7 §5.1 flagged: `?debugtally` drew
`stageIndex + 2` (unwrapped) while the real tally drew `contentStageIndex + 1`
(wrapped), so the debug card showed a number the real card could never show.
Both now go through `flow.stageNumber`.

---

## F5 — `GAME_SPEC.md` / `REFERENCE.md`: two corroborations to record

**Owner: the criteria lane.**

1. **GAME_SPEC §1's "SPEED M" is confirmed**, 22 samples over 645 s on the
   1028x720 source (F3 above). Worth recording *with the resolution caveat*: on
   the 686x480 longplay the same glyph reads as "H" under magnification. A
   future lane measuring this on the lower-res file will get it wrong.
2. **The arcade stage counter does not wrap**, digits 1, 2, 3, 4, 6, 8, 10, 11,
   12, 13, 15 read at `STAGE_MAP.md`-verified spans, and **two-digit numbers are
   right-aligned on a fixed units cell** on both the HUD and the tally card
   (U1's table and `judging/R8/flow-r8-03-tally-ARCADE-TOP-OURS-BOT.png`). The tally measurement is independent of the HUD
   one — different element, different colour, different frames, a 3.21× source
   for the single-digit reference and a 2.14× source for the two-digit ones —
   and the two agree on the units cell to 0.6 px.
