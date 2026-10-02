// Keyboard stick + fire buttons. Arrow keys are the primary binding, WASD is
// an alias. `setOverride` lets ?demo=1 (scripted attract-mode input) and
// ?fixed=1 (puppeteer-driven capture) replace live keyboard with a function
// of sim time, per ARCHITECTURE.md D4.

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.override = null;
    this._onDown = (e) => this.keys.add(e.code);
    this._onUp = (e) => this.keys.delete(e.code);
    target.addEventListener('keydown', this._onDown);
    target.addEventListener('keyup', this._onUp);
  }

  setOverride(fn) {
    this.override = fn;
  }

  // Returns { x, y, fire, missile }. x/y are in [-1, 1]; y positive = climb.
  state(simTime) {
    if (this.override) return this.override(simTime);
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y += 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y -= 1;
    return { x, y, fire: k.has('KeyZ'), missile: k.has('KeyX') };
  }
}
