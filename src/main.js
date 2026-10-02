import { Game } from './game/game.js';
import { createPrng } from './core/prng.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('screen');
const game = new Game(canvas);

const seed = params.has('seed') ? Number(params.get('seed')) : 1;
game.rng = createPrng(seed); // reserved for gameplay systems (spawner, etc.)

if (params.has('demo')) {
  game.input.setOverride(demoTimeline);
}

if (params.has('fixed')) {
  // Deterministic manual stepping for puppeteer capture (ARCHITECTURE.md D4):
  // tools/capture.mjs drives window.__step(n) itself, no rAF loop running.
  window.__step = (n = 1) => game.step(n);
  game.render();
  window.__frameReady = true;
} else {
  game.start();
}

// Trivial attract-mode placeholder for ?demo=1 — a scripted left/right sweep.
// Round 1 scope only; a real attract-mode timeline is later work.
function demoTimeline(simTime) {
  const x = Math.sin(simTime * 0.5);
  const y = Math.sin(simTime * 0.33) * 0.4;
  return { x, y, fire: false, missile: false };
}
