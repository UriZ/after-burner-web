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

// ---------------------------------------------------------------------------
// R40 — THE KEYBOARD IS GIVEN A STICK, BECAUSE AB2'S CONSTANTS ASSUME ONE.
//
// Owner, after playing the live build: "aiming system is bad." The flight model
// is not the culprit and must not be touched — player.js's rate control is
// measured off 138 consecutive 60 Hz arcade steps (constant-rate plateau while
// held, full-magnitude reversal, no auto-centre) and it reproduces the arcade's
// rails. The culprit is upstream of it, here.
//
// AB2's cabinet has an ANALOG flight stick. Every rate constant in player.js
// (RATE_X 3.4, RATE_Y_UP/DOWN) was measured from footage of a pilot at or near
// FULL deflection, so those numbers describe the stick's MAXIMUM. An analog
// pilot reaches that maximum only when they deliberately slam the stick; the
// rest of the time they fly on a fraction of it, and that fraction is the
// entire mechanism by which a human places a crosshair on an aircraft.
//
// A keyboard has no fraction. `x`/`y` were 0 or +-1 and nothing between, so
// every key press was an arcade stick-slam and the player had exactly one aim
// speed: maximum. Measured consequence on the shipped build (NOTES.md §1.1):
// the vertical sight crosses its whole range in ~0.33 s, so the finest aim
// correction available to a keyboard player — one short tap, ~100 ms, about the
// shortest a hand reliably makes — was ~30 % of the vertical range. You cannot
// place a crosshair in 30 % steps. In 32 s of play I never once got the cross
// ONTO an aircraft; I could only sweep it past one and slam it into a rail.
// That is what "aiming system is bad" feels like from the inside.
//
// So the keyboard gets a stick: a held key RAMPS deflection toward full instead
// of jumping there, and a tap therefore yields a small deflection for a short
// time. Displacement goes from linear in tap length to roughly quadratic, which
// is precisely the fine control an analog hand has and a digital one did not —
// a 50 ms tap now moves the sight ~1.5 % of its range, a 100 ms tap ~6 %, while
// a deliberate hold still reaches full authority in RAMP_UP_S.
//
// WHY THIS DOES NOT CONTRADICT THE ARCADE MEASUREMENT, which is the thing to
// get right before touching an input path four rounds have rested on. That
// measurement is the transfer function from STICK to SIGHT, read off footage in
// which the arcade pilot's hand had already moved the stick. This ramp lives in
// the HAND-to-stick conversion — in the arcade it is the physical motion of a
// human arm, invisible in any stick-to-sight series. Nothing in player.js moves
// and no rail, rate or envelope changes. The arcade's own onset series is in
// fact consistent with a brief hand ramp rather than against one: player.js
// quotes dx = +3.0, 0.0, +6.0, +7.0, +6.0 px/frame — two sub-maximal frames
// before it saturates. That is a weak corroboration, not a proof, and it is not
// what this rests on.
//
// RAMP_DOWN_S is much shorter than RAMP_UP_S on purpose, and it is what keeps
// the two properties the arcade measurement DOES pin. Hold-station: release and
// the commanded rate is at zero within ~3 ticks, so the sight stops where it
// was left rather than coasting. Reversal: a direction change crosses zero at
// the fast rate, preserving the arcade's full-magnitude one-frame reversal.
//
// Analog callers are untouched. `setOverride` (?demo=1 scripted attract,
// ?fixed=1 capture/probe, the playtest harness's __setStick) returns before any
// of this and keeps supplying a real analog stick, so every deterministic
// capture stays byte-identical and the measured demo controller is unaffected.
const RAMP_UP_S = 0.16;
const RAMP_DOWN_S = 0.05;

// One axis of the emulated stick. Linear slew (not exponential) so that a held
// key produces a CONSTANT rate of deflection change and reaches the stop
// exactly at RAMP_UP_S — an exponential chase would approach full deflection
// asymptotically and never quite slam, which is the feel R11 deleted the
// acceleration ramp to get rid of. Moving toward zero, or across it on a
// reversal, uses the fast rate; only growing deflection away from centre pays
// RAMP_UP_S.
function rampAxis(cur, target, dt) {
  if (target === cur) return cur;
  const towardZero = Math.abs(target) < Math.abs(cur) || cur * target < 0;
  const step = dt / (towardZero ? RAMP_DOWN_S : RAMP_UP_S);
  const d = target - cur;
  if (Math.abs(d) <= step) return target;
  return cur + Math.sign(d) * step;
}

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.override = null;
    // Lever state, not a momentary key — persists across ticks and is only
    // nudged by an EDGE (press, not hold) of Q/E, one detent per press.
    this.throttleIndex = THROTTLE_DEFAULT;
    this._prevKeys = new Set();
    // Emulated analog stick state (keyboard path only) — see the ramp note.
    this._ax = 0;
    this._ay = 0;
    this._prevSimTime = null;
    // A/B lever: `?stickramp=0` restores the pre-R40 bang-bang keyboard, so the
    // fine-aim claim can be measured against the build it replaced rather than
    // modelled from the constants.
    this._rampOn =
      typeof location === 'undefined' ||
      new URLSearchParams(location.search).get('stickramp') !== '0';
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

    // Drive the emulated stick toward the key target. dt comes from the sim
    // clock (game.js calls this exactly once per tick), so it is deterministic
    // and matches the clock player.js integrates against. A missing, negative
    // or absurd delta — first tick, a flow reset, a tab stall — falls back to
    // one 60 Hz tick rather than teleporting the stick.
    let dt = this._prevSimTime === null ? 1 / 60 : simTime - this._prevSimTime;
    if (!(dt > 0) || dt > 0.25) dt = 1 / 60;
    this._prevSimTime = simTime;
    if (this._rampOn) {
      this._ax = rampAxis(this._ax, x, dt);
      this._ay = rampAxis(this._ay, y, dt);
      x = this._ax;
      y = this._ay;
    }

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
