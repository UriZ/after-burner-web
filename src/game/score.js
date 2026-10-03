// Score accrual. GAME_SPEC.md §6 (MEASURED):
//   - Score accrues PASSIVELY at ~3300/s at SPEED M, independent of kills.
//   - Kills add NO immediate score — only the HIT counter moves.
//   - Accrual FREEZES during the death/respawn cycle and during resupply
//     passes (resupply is not implemented this round; death is).
//   - Stage end pays HIT x 20,000 through a counting tally card, landing in
//     the score as it counts (GAME_SPEC.md §6 / REFERENCE.md "Transient HUD
//     overlays").
//   - Continue resets the score to ~0 but keeps stage progress.
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
