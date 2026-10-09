# Cross-lane asks — sprite-art lane, R6

The lead owns `interfaces.md`; these are requests, not agreements. Nothing below was reached
into. Evidence for each is in `judging/R6/lane-sprite-art.md`.

---

## A1 — one line in `src/entities/enemy.js` puts the five authored bank poses into service

**Owner: combat.** Every enemy sheet has been 5 drawn bank poses since R5, and R6 doubled
that to 5 day + 5 night per livery and aspect — **16 sheets, 80 cells**. Sixteen of those
cells are ever displayed, because `textureFor()` does not pass a bank angle:

```js
function textureFor(aspect, livery, detail) {
  return enemySprite.enemyTexture(aspect, livery.key, detail, livery.night);
}
```

`enemyTexture`'s fifth parameter is `bankDeg` and it defaults to `0`, so
`nearestBankIndex(0)` returns cell 2 every time. Every enemy in the game flies dead level.

The API has taken a signed bank angle in degrees since R5 interface I1; the change is to pass
whatever bank the entity already has:

```js
function textureFor(aspect, livery, detail, bankDeg = 0) {
  return enemySprite.enemyTexture(aspect, livery.key, detail, livery.night, bankDeg);
}
```

Cells are memoised per `(livery, aspect, night, cellIndex)`, so switching cells per frame
costs a map lookup. No sprite-art change is needed and none is pending on this.

---

## A2 — three criteria defects, with the arcade checked first in each case

**Owner: criteria-fix.** All three follow the ledger's own house defect class — *a validated
operator pointed at the wrong population, resolution, region or sample*.

### A2a — the gap-4 value band's CEILING is below the arcade

R5 judge gap 4 asks for a daylight airframe achromatic V median in **0.78–0.92**. On the
arcade's own **true-native** frame (`reference/ab2-arcade-desert.png` x[85,182] y[82,140],
achromatic mask S<0.35 ∧ V>0.08, n=672) the median is **0.969** — above the band's ceiling.
The band was taken from 686×480 video, where blur mixes white airframe into blue sky and
drags the median down: the same operator gives 0.792 on `stage1-level-flight-t116.png` and
the judge reports 0.839, on the same sprite the native frame reads at 0.969.

A 4-tone sprite's median can only land **on** one of its four values, so 0.969 and ≤0.92
cannot both be satisfied. R6 targeted the published band (ours: **0.839**) and the under-shoot
against the arcade is stated, not hidden.

**Ask:** ledger row — *"gap-4 band 0.78–0.92, measured on video upscales; the arcade's native
frame reads 0.969. Either raise the ceiling or state the band as a video-domain figure and
publish the native-domain equivalent beside it."* Note this is the **same defect R4's V 0.77
ceiling had**, one level milder: a correct operator on a blurred population.

### A2b — R5 gap 7's "wings need anhedral" has the sign backwards

Gap 7 reads *"wings need anhedral and taper"*. Measured on the authoritative crop
(`stage3-night-level-t175.png` x[207,487] y[227,306], ROW-RUNS operator, mask max(RGB)>30 +
largest 8-connected component): the arcade's wing **top edge rises 9.2 % of H from root to
tip** — the wingtips sit *higher* on screen than the wing roots. R5's drawing dropped 17.5 %
of H the other way, which is a real defect, but "anhedral" names the wrong fix. R6 drew to
the crop.

**Ask:** correct the gap text so the next round does not re-invert it.

### A2c — the two-blade discriminator needs a night form, or the band needs a night row

JET-SIL's dark-background airframe mask is `max(R,G,B) > 30`. REFERENCE.md's measured
**night** player palette (I3, off `ab2-arcade-night-banking.png`) contains **no black**: its
darkest step `#425284` doubles as the keyline and has a max channel of 132, so the night
keyline **passes** the mask where the day keyline fails it. In-game at 348 px span that
bridges the fin blades on three rows near their root and the two-blade figure reads
**95.2 %** against a 99–100 % band — on a sheet that measures 100 % on its own cell and whose
day twin measures 100 % in-game.

This is the operator meeting the arcade's own palette, not a drawing defect. **Ask:** either
exclude the night keyline value from the night mask, or publish a separate night band.

---

## A3 — FYI, not a request: the arcade's stage-1 line enemy is green camo

**Owner: combat (`enemy.js` `LIVERY_BY_STAGE`).** `GAME_SPEC.md` §4 says stage 1 flies
"white/grey MiG-types" and `LIVERY_BY_STAGE[0].line` is `grey`. On
`reference/stage1-level-flight-t116.png`, HUD stage digit **1**, the enemy behind the player
is unmistakably a **green-and-white camo** aircraft with a dark nozzle ring and a hot orange
centre (`judging/R6/r6-04-...png`, bottom panel).

R6 fixed the thing that was definitely wrong — the **value polarity** (ours was 43.7 % below
V 0.3 where the arcade is 11.9 %) — and left `grey` in the grey family per GAME_SPEC. Whether
stage 1's *line* should fly `camo` is a livery-mapping question in a file I do not own, and
one frame is not a distribution. Flagging it so it is not lost: if combat wants to switch
stage 1's line to `camo`, the camo sheets exist in both day and night and nothing on the
sprite side needs to change.

---

## A4 — the barrel-roll sheet is still one line from being used

**Owner: player-feel.** Unchanged from R5's ask A3; restated only because R6 lifted its
palette with the rest of the player art, so if it is wired now it will not read darker than
the level poses it interrupts. `JET_ROLL_SHEET` and `selectRollCell(sprite, tex, rollPhase)`
are exported from `spriteFactory.js` and the sheet is built, measured and inert.
