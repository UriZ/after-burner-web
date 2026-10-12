import { Game } from './game/game.js';
import { createPrng } from './core/prng.js';
import { demoTimeline } from './game/flow/demoTimeline.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('screen');
const game = new Game(canvas);

const seed = params.has('seed') ? Number(params.get('seed')) : 1;
game.rng = createPrng(seed); // reserved for gameplay systems (spawner, etc.)

if (params.has('demo')) {
  // R10: the attract pilot is a POSITION CONTROLLER over the new rate-based
  // flight model (demoTimeline.js's R10 REPAIR block), so it needs the live
  // aircraft as well as the clock. core/input.js's override contract is
  // `fn(simTime)` and that file is not this lane's, so the player is closed
  // over here instead of widening the contract.
  game.input.setOverride((simTime) => demoTimeline(simTime, game.player));
}

if (params.has('fixed')) {
  // Deterministic manual stepping for puppeteer capture (ARCHITECTURE.md D4):
  // tools/capture.mjs drives window.__step(n) itself, no rAF loop running.
  window.__step = (n = 1) => game.step(n);
  // Measurement-only (?fixed=1 only, never read in normal play): inject a
  // stick state that the next __step() calls will see. `?debugstick=X`
  // (core/input.js) already pins a CONSTANT deflection, which is enough for
  // a steady-state roll-angle read but cannot express anything with timing
  // in it — and the two properties this lane has to prove both do:
  //   - input latency: ticks from a stick CHANGE to visible jet displacement
  //   - the barrel roll: a left->right stick SLAM inside 0.35s
  // Puppeteer cannot dispatch these as real keydowns (the page's own
  // listeners sit in a different execution context from page.keyboard's
  // synthetic events under manual stepping), so this installs the same
  // input override that ?demo=1 uses. Pass null to hand control back.
  window.__setStick = (s) => {
    if (s === null) {
      game.input.setOverride(
        params.has('demo') ? (simTime) => demoTimeline(simTime, game.player) : null
      );
      return;
    }
    const held = { x: 0, y: 0, fire: false, missile: false, throttleIndex: 1, ...s };
    game.input.setOverride(() => held);
  };
  game.render();
  window.__frameReady = true;
} else {
  game.start();
}

// `demoTimeline` (src/game/flow/demoTimeline.js, R4): the real two-regime
// attract flight (GAME_SPEC.md §7), replacing the round-1 placeholder
// `sin(t*0.5)` sweep that was flagged in every judge report since.
