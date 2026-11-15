# R16 combat lane — cross-lane asks

Combat lane owns `src/weapons/**`, `src/game/spawner.js`, `src/entities/enemy*.js`,
`src/effects/**`. These are requests into files another lane owns, per CLAUDE.md
("cross-area changes are requested via message, not reached into").

## To the PLAYER / UI lane

1. **Sight auto-recentre (your R16 gap-2 candidate) interacts with my bait raise —
   coordinate before shipping it.** My first-lock fix (spawner `BAIT_Y` 0.44-0.58 →
   0.55-0.65) is built on a MEASURED fact of the current build: the vertical sight
   rail SATURATES — any sustained climb pins the sight at its ceiling ndcY **+0.76**
   and it stays there with the stick centred (it does NOT auto-return). I raised the
   bait so that pinned full-climb cone (ndcY [+0.523,+0.997]) lands on it, which is
   what makes the naive "climb to them" instinct work.
   - If you add a **gentle auto-return toward rest on a centred stick**, that is
     compatible and complementary: a parked stick returning to rest (ndcY +0.188,
     cone top +0.425) stays BELOW the bait floor (+0.5275), so blind protection is
     unaffected. But an auto-return that acts while the stick is HELD UP, or that
     caps the climb below +0.76, would pull the pinned sight back off the raised
     bait and re-open the discoverability gap. **Keep the full-climb pin reaching
     at least ~+0.72 while the climb is held**, or tell me the new ceiling and I
     re-centre the bait band on it.

2. **The hint cue is gated on `combat.js`'s `_lockHold`** (the missile-held state,
   your/HUD-adjacent file — I only READ it via the `holding` arg to
   `lockSystem.update`). If you change `_lockHold`'s meaning (e.g. gate it on a
   different button or a cooldown), the "aim here" hint follows it automatically.
   That is intended, but flag me if you repurpose it.

## Recorded for the TL (not a cross-lane edit)

- `GAME_SPEC.md §3/§4`: the R16 first-lock changes (raised + lateral-centred lock
  bait, the missile-held "aim here" hint bracket) are ADOPTED tuning on top of the
  R13 lock-bait / R15 lock-cue lineage. Record when you record the other R16 items.
