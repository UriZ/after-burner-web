// Score accrual. GAME_SPEC.md §6 (MEASURED):
//   - Score accrues PASSIVELY at ~3300/s at SPEED M, independent of kills.
//   - Kills add NO immediate score — only the HIT counter moves.
//   - Accrual FREEZES during the death/respawn cycle and during resupply
//     passes (resupply is not implemented this round; death is).
//   - Stage end pays HIT x 20,000 through a counting tally card, landing in
//     the score as it counts (GAME_SPEC.md §6 / REFERENCE.md "Transient HUD
//     overlays").
//   - Continue does NOT reset the score. GAME_SPEC.md §2 said it did, citing
//     "gp t265-269 climb from ~600"; that is a misread frame. Re-read at 4x:
//     ab2-gameplay.mp4 t256 485440 -> t262 489540 (frozen through the death)
//     -> t265 490000 -> t277 497600, and reference/continue-card-gp-t261.png
//     carries SCORE 489540 on the CONTINUE PLAY card itself. `reset()` below
//     is called ONLY on a new game and on the attract restart — see
//     flow.js:_updateContinue for the deleted call and the full citation.
export const PASSIVE_RATE_PER_S = 3300;
export const HIT_VALUE = 20000;

export class Score {
  constructor() {
    this.value = 0;
  }

  // `frozen` covers death/respawn and (future) resupply passes.
  accrue(dt, frozen) {
    if (!frozen) this.value += PASSIVE_RATE_PER_S * dt;
  }

  add(n) {
    this.value += n;
  }

  reset() {
    this.value = 0;
  }
}
