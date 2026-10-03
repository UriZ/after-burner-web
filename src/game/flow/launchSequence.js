// Carrier catapult launch opening a fresh game. GAME_SPEC.md §5/§7
// (MEASURED, longplay): carrier pre-launch (t84, SCORE 0, jet on deck) ->
// launch roll (t89) -> climb-out through clouds (t92) -> stage-1 flight
// begins (~t94-97). feel-critique.md §9/§10 rank 14 calls this "the best
// first-6-seconds investment", notes the arcade's ONLY enemy-free window in
// a whole stage is this ~6s catapult launch, and that it "sets the tone in
// the first 6 seconds, for free" — previously the game opened mid-air with
// no equivalent.
//
// No carrier-deck 3D asset exists in this lane's scope — render/ground.js
// (terrain/structures) and entities' sprite art belong to the world/sprite
// lanes, not src/game/flow/. This is a placeholder treatment built only
// from the player sprite's existing position/scale/material.
//
// First attempt reused DeathSequence's respawn trick verbatim (oversized +
// dropped BELOW baseY, same as RESPAWN_DROP) and held it static for the
// whole onDeck phase — on capture it reads as the jet having crashed
// through the sea, not sitting on a deck: at this camera's shallow pitch,
// dropping the sprite's world Y pushes it behind the sea plane's near
// field and under the bottom HUD strip, which a brief RESPAWN_S transient
// gets away with but a full static second does not. Fixed by keeping Y/Z
// at the normal baseY/baseZ throughout (no sea-plane risk at all) and
// doing the whole "launch" entirely in SCALE: `onDeck` holds the jet
// oversized/close while the engine spools from idle to full; `climbOut`
// eases the scale back down to normal, reading as the jet settling from a
// close launch shot into cruise formation distance.
const ON_DECK_S = 1.0;
const CLIMB_S = 2.5;
export const LAUNCH_TOTAL_S = ON_DECK_S + CLIMB_S;

const ON_DECK_OVERSIZE = 1.6; // "close to camera" framing, no position drop

export class LaunchSequence {
  constructor(player) {
    this.player = player;
    this.active = false;
    this._origScaleX = player.sprite.scale.x;
    this._origScaleY = player.sprite.scale.y;
  }

  start() {
    this.active = true;
    this.phase = 'onDeck';
    this.t = 0;
    const s = this.player.sprite;
    s.position.set(0, this.player.baseY, this.player.baseZ);
    s.scale.set(this._origScaleX * ON_DECK_OVERSIZE, this._origScaleY * ON_DECK_OVERSIZE, 1);
    s.material.rotation = 0;
  }

  // 0..1 engine gain for the caller to feed AudioBus.setEngine(): idle on
  // the deck, spools to full through the roll/climb, settling toward a
  // normal cruise gain as control is handed back. Mirrors the shape
  // GAME_SPEC.md §1 implies (deck idle -> launch roll -> climb-out) without
  // claiming a measured curve — no footage gives per-frame engine state.
  get engineFrac() {
    if (!this.active) return 0.6;
    if (this.phase === 'onDeck') return 0.25 + 0.55 * Math.min(1, this.t / ON_DECK_S);
    const q = Math.min(1, this.t / CLIMB_S);
    return 1.0 - 0.35 * q; // full afterburner through the roll, easing toward cruise
  }

  // Returns true the tick control is handed to the player.
  update(dt) {
    if (!this.active) return false;
    this.t += dt;
    const s = this.player.sprite;

    if (this.phase === 'onDeck') {
      if (this.t >= ON_DECK_S) {
        this.phase = 'climbOut';
        this.t = 0;
      }
      return false;
    }

    // climbOut: ease the oversized close-up shot back down to normal
    // flight scale. Position stays at baseY/baseZ throughout (see the
    // class header for why this is scale-only, not a position drop).
    const q = Math.min(1, this.t / CLIMB_S);
    const ease = 1 - (1 - q) * (1 - q);
    const scaleMul = ON_DECK_OVERSIZE - (ON_DECK_OVERSIZE - 1) * ease;
    s.scale.set(this._origScaleX * scaleMul, this._origScaleY * scaleMul, 1);

    if (this.t >= CLIMB_S) {
      this.active = false;
      s.scale.set(this._origScaleX, this._origScaleY, 1);
      s.position.set(0, this.player.baseY, this.player.baseZ);
      this.player.x = 0;
      this.player.y = 0;
      return true;
    }
    return false;
  }
}
