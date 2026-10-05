// player-f14-night.png — night palette swap of player-f14.png.
//
// R5b: this module used to carry its OWN copy of the drawing code, which is
// how it drifted from the daylight sheet (it had a magenta nozzle the
// arcade's night frame does not have — see the measurement note on
// PLAYER_NIGHT in ../palettes.js). It now delegates to player-f14.js's
// drawFrame with the night palette, so the two sheets are the same drawing
// by construction and cannot diverge again. Geometry, cell size and the
// bank-angle ladder all come from there.
export { buildPlayerF14NightSheet } from './player-f14.js';
