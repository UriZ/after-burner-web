// Keyboard stick + fire buttons. Arrow keys are the primary binding, WASD is
// an alias. `setOverride` lets ?demo=1 (scripted attract-mode input) and
// ?fixed=1 (puppeteer-driven capture) replace live keyboard with a function
// of sim time, per ARCHITECTURE.md D4.

// Throttle detents (feel-critique.md §4/§10 rank 7: "the signature AB2 verb,
// currently decorative"). AB2's own HUD reads 3 letters (L/M/H, GAME_SPEC.md
// §1's measured "SPEED M" label); M is index 1, matching hud.js's existing
// default `throttle: 'M'`.
export const THROTTLE_DETENTS = 3;
const THROTTLE_DEFAULT = 1; // M

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.override = null;
    // Lever state, not a momentary key — persists across ticks and is only
    // nudged by an EDGE (press, not hold) of Q/E, one detent per press.
    this.throttleIndex = THROTTLE_DEFAULT;
    this._prevKeys = new Set();
    this._onDown = (e) => this.keys.add(e.code);
    this._onUp = (e) => this.keys.delete(e.code);
    target.addEventListener('keydown', this._onDown);
    target.addEventListener('keyup', this._onUp);

    // Measurement-only hook (?debugstick=X, X in [-1,1]): a constant stick
    // deflection for deterministic world-roll verification under ?fixed=1
    // (puppeteer can't inject key events into the page's own listeners
    // cross-context the way a real keydown would). Never read in normal
    // play. See game.js dev report for the roll-angle/rate measurement.
    const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    if (params && params.has('debugstick')) {
      const x = Number(params.get('debugstick'));
      this.override = () => ({ x, y: 0, fire: false, missile: false, throttleIndex: THROTTLE_DEFAULT });
    }
  }

  setOverride(fn) {
    this.override = fn;
  }

  // Returns { x, y, fire, missile, throttleIndex }. x/y are in [-1, 1]; y
  // positive = climb. throttleIndex is 0..2 (L/M/H).
  state(simTime) {
    if (this.override) return this.override(simTime);
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y += 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y -= 1;

    // Throttle lever: Q down a detent, E up a detent. Edge-triggered against
    // last tick's key set so a held key steps once, not every frame.
    if (k.has('KeyQ') && !this._prevKeys.has('KeyQ')) {
      this.throttleIndex = Math.max(0, this.throttleIndex - 1);
    }
    if (k.has('KeyE') && !this._prevKeys.has('KeyE')) {
      this.throttleIndex = Math.min(THROTTLE_DETENTS - 1, this.throttleIndex + 1);
    }
    this._prevKeys = new Set(k);

    // R37: Space/Enter alias the gun. A naive player's first press at the
    // title is Enter or Space, and the title only starts on fire/missile —
    // without the alias that press did nothing (owner: "takes too long to
    // start playing"). In flight the alias is harmless (space-as-fire is the
    // common arcade-keyboard idiom).
    const fire = k.has('KeyZ') || k.has('Space') || k.has('Enter');
    return { x, y, fire, missile: k.has('KeyX'), throttleIndex: this.throttleIndex };
  }
}
