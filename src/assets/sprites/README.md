# What in this directory actually reaches the screen

**Read this before measuring anything here.** Two consecutive rounds published a headline
statistic taken off a file in this directory that the game never loads.

## Live — imported by `src/`, present in `dist/`

| file | loaded by |
|---|---|
| `enemy-{grey,camo,interceptor,prop}-{head,rear}.png` and their `-night` variants (16) | `src/entities/enemySprite.js` |
| `player-f14.png`, `player-f14-night.png`, `player-f14-roll.png` | `src/render/spriteFactory.js` |
| `enemy-palettes.generated.js` | `src/entities/enemySprite.js` |

## DEAD — nothing in `src/` imports these, and `vite build` emits no such asset

```
explosion.png      explosion-big.png      missile.png
smoke-puff.png     debris.png             font-5x7.png
```

**They are not what the player sees.** The explosion, the missile trail, the smoke and the
debris are all drawn procedurally — `src/effects/explosions.js`, `src/effects/smoke.js`,
`src/weapons/projectileSprites.js` — and the HUD font is drawn by `src/ui/`.

### Why this matters, and what it already cost

R10's art critique measured `explosion.png` at **75.5 % of opaque pixels at L ≤ 66** with a
**6.7 % white-hot core**, concluded the explosion's value structure was inverted against the
arcade's, and prescribed a fix: *"invert the area budget — the white/yellow pair should be
30–40 % of the sprite."* The TL reproduced the figure independently and reported it as the
root cause of the explosion defect.

**The number is correct. It describes nothing.** R11's art critic checked what imports the
file: nothing does. The on-screen explosion already fragments and re-flares like the arcade's.

Two independent agents measured the same dead asset, agreed to the digit, and were both
wrong about the game — because agreement between two readings of the same wrong object is
not corroboration.

### The check, before you quote any sheet in here

```sh
grep -rn "<basename>" src/          # must return an import
npx vite build && ls dist/assets/   # must contain the emitted asset
```

If either is empty, you are measuring a file, not the game. Verify what draws the thing on
screen instead, and measure that.

**Do not delete these without asking the owner** — they are original authored art and may be
wanted. The hazard is that they are measured, not that they exist; this file is the fix for
that. Wiring them up is a separate decision with visual consequences, since the procedural
effects they would replace are the ones currently passing their gates.
