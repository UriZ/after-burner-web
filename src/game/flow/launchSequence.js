import { placeCarrier } from './carrier.js';
import { GAME_W, GAME_H } from '../../render/screen.js';

// Carrier catapult launch opening a fresh game. GAME_SPEC.md §5/§7
// (MEASURED, longplay): carrier pre-launch (t84, SCORE 0, jet on deck) ->
// launch roll (t89) -> climb-out through clouds (t92) -> stage-1 flight
// begins (~t94-97). feel-critique.md §9/§10 rank 14 calls this "the best
// first-6-seconds investment", notes the arcade's ONLY enemy-free window in
// a whole stage is this ~6s catapult launch, and that it "sets the tone in
// the first 6 seconds, for free" — previously the game opened mid-air with
// no equivalent.
//
// R6: THE CARRIER IS NOW IN IT. The paragraph that used to stand here said no
// carrier asset existed in this lane's scope, and R5 therefore shipped the
// sequence without its subject — feel-critique.md §7.2 measured the result
// ("an F-14 with its gear down, hovering over open sea, essentially static
// for 3.5 s ... worse than no launch at all, because it spends the opening on
// nothing") and ranked it 5. src/game/flow/carrier.js is that subject: a
// pixel-art carrier authored IN THIS LANE out of spriteFactory.js's public
// pixel helpers, measured against reference/carrier-prelaunch-t84.png. No
// other lane's file is touched.
//
// The shot, now that there is something to compose: the ship sits below the
// horizon with the oversized jet climbing off its bow, then ACCELERATES
// toward and past the camera (growing, sliding off the bottom) while the jet
// eases down to cruise scale. The overfly is what sells the launch — a static
// ship would be a backdrop, and the whole complaint was that the opening was
// static.
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

// --- Carrier framing ------------------------------------------------------
// The ship is commanded in SCREEN fractions, not world coordinates (see
// carrier.js placeCarrier for why — CLAUDE.md's perspective-parallax rule).
//
// CARRIER_DEPTH is behind the player's baseZ of -5, so the jet's quad is
// nearer the camera; the ordering is actually forced by renderOrder rather
// than by depth (the carrier has depthTest off), but keeping the depth
// honest means the two agree instead of merely not conflicting.
//
// THE START FRAMING IS SOLVED FROM reference/carrier-prelaunch-t84.png, not
// chosen. The arcade's ship puts four landmarks at known screen heights, and
// the sprite has exactly two free parameters (the fraction of screen width it
// spans, and the screen height of its centre), so the framing is determined:
//
//   sprite height as a fraction of H = spanFrac * (GAME_W/GAME_H) * (124/208)
//   deck span = spanFrac * (188/208)        [the deck is 188 of 208 texels]
//
//   deck span 50.87 %W           -> spanFrac   = 0.5087 / 0.9038 = 0.563
//   deck top  53.33 %H           -> centreFrac = 0.638
//
// and then the OTHER THREE landmarks are a prediction, not a second fit:
//
//   landmark        arcade %H   this framing %H
//   mast top          40.83        40.97
//   deck top          53.33        53.33   (fitted)
//   deck near edge    72.71        72.68
//   hull bottom       86.46        86.59
//
// Three independent landmarks reproduce to within 0.14 points of H off a
// one-parameter fit. That is the check that the TEXTURE's proportions are
// right as well as its placement — a wrongly-proportioned ship could be made
// to hit any one landmark and would miss the other three.
//
// CARRIER_SPAN_END/CENTRE_END are the overfly: the ship rushes up to 1.45x
// screen width and off the bottom edge.
const CARRIER_DEPTH = -12;
const CARRIER_SPAN_START = 0.563;
const CARRIER_SPAN_END = 1.45;
const CARRIER_CENTRE_START = 0.638;
const CARRIER_CENTRE_END = 1.5;
// The pass is over before the climb-out is: the last ~0.6 s is clean sky, so
// the sequence ends on flight rather than on scenery leaving the frame.
const CARRIER_PASS_FRAC = 0.78;

export class LaunchSequence {
  // `carrier` is the sprite from carrier.js, added to the scene by game.js
  // (the only file that may touch the scene graph). Optional on purpose: it
  // is absent under ?noclouds-style isolation harnesses and under any future
  // caller that has not built one, and this class must not require it —
  // every pre-R6 behaviour still runs with it undefined.
  constructor(player, carrier = null) {
    this.player = player;
    this.carrier = carrier;
    this.active = false;
    this._origScaleX = player.sprite.scale.x;
    this._origScaleY = player.sprite.scale.y;
  }

  _placeCarrier(q) {
    if (!this.carrier) return;
    // Accelerating ease (q^2), not the jet's decelerating one. The ship
    // should sit still long enough to be LOOKED at and then rush past, which
    // is how an overfly reads; a linear or eased-out pass reads as the ship
    // sinking, because the growth is fastest exactly when it should be
    // slowest.
    const e = q * q;
    const spanFrac = CARRIER_SPAN_START + (CARRIER_SPAN_END - CARRIER_SPAN_START) * e;
    const centreFrac = CARRIER_CENTRE_START + (CARRIER_CENTRE_END - CARRIER_CENTRE_START) * e;
    placeCarrier(this.carrier, {
      depth: CARRIER_DEPTH,
      aspect: GAME_W / GAME_H,
      spanFrac,
      centreFrac,
    });
    this.carrier.visible = q < CARRIER_PASS_FRAC;
  }

  start() {
    this.active = true;
    this.phase = 'onDeck';
    this.t = 0;
    const s = this.player.sprite;
    s.position.set(0, this.player.baseY, this.player.baseZ);
    s.scale.set(this._origScaleX * ON_DECK_OVERSIZE, this._origScaleY * ON_DECK_OVERSIZE, 1);
    s.material.rotation = 0;
    this._placeCarrier(0);
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
      this._placeCarrier(0);
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
    this._placeCarrier(q);

    if (this.t >= CLIMB_S) {
      this.active = false;
      s.scale.set(this._origScaleX, this._origScaleY, 1);
      s.position.set(0, this.player.baseY, this.player.baseZ);
      this.player.x = 0;
      this.player.y = 0;
      // Unconditional, not left to _placeCarrier's visibility test: this is
      // the one line that guarantees the ship cannot survive into flight if
      // CARRIER_PASS_FRAC is ever retuned above 1.
      if (this.carrier) this.carrier.visible = false;
      return true;
    }
    return false;
  }
}
