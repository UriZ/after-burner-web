// Camera geometry, in one place.
//
// R6: these constants and the two solvers below lived in src/game/game.js and
// were ALSO transcribed into src/entities/player.js, with a comment there
// asking whoever retunes game.js to remember to re-sync by hand. R6 needed a
// third copy (src/game/flow/carrier.js has to place a sprite at a commanded
// SCREEN fraction, which is exactly what worldYForScreenFrac solves), and
// three hand-synced copies of a number that silently breaks composition when
// they disagree is not a thing to ship. game.js is still the OWNER of the
// camera's behaviour -- it is the only file that builds the camera and
// applies its orientation; this module just stops the numbers being written
// down more than once.
//
// Changing CAMERA_PITCH or FOV_DEG moves the horizon, the player's resting
// screen height and the carrier's placement together, which is the point.
// Both have derivations attached in game.js; do not retune either without
// re-reading them.

export const FOV_DEG = 55;
export const CAMERA_HEIGHT = 2.2;

// R1 judge gap 2: solved from the exact horizon relation for screenFrac
// 0.625 at FOV 55 deg (REFERENCE.md "Horizon", ADOPTED cruise 62.5%H). The
// full derivation is in game.js above its own import of this value.
export const CAMERA_PITCH = 0.12941440818613054;

const degToRad = (d) => (d * Math.PI) / 180;

// Screen fraction (0 = top, 1 = bottom) of the true horizon under a given
// pitch/FOV. Camera pitched UP by `pitch`, so the horizontal world ray sits
// `pitch` below the forward axis: ndcY = -tan(pitch)/tan(vFov/2).
export function horizonFracFor(pitchRad = CAMERA_PITCH, fovDeg = FOV_DEG) {
  const halfTan = Math.tan(degToRad(fovDeg) / 2);
  const ndcY = -Math.tan(pitchRad) / halfTan;
  return (1 - ndcY) / 2;
}

// Inverse of horizonFracFor for a FINITE point rather than the horizon:
// the world Y a point at depth `z` must have to land at `targetFrac` of
// screen height. Plugging dy = 0 collapses this to horizonFracFor exactly,
// which is the check that it is the same geometry and not a second model.
//   dy     = worldY - CAMERA_HEIGHT
//   localY = dy*cos(pitch) + z*sin(pitch)
//   localZ = -dy*sin(pitch) + z*cos(pitch)
//   ndcY   = (localY / -localZ) / tan(vFov/2)
export function worldYForScreenFrac(targetFrac, z, pitchRad = CAMERA_PITCH, fovDeg = FOV_DEG) {
  const halfTan = Math.tan(degToRad(fovDeg) / 2);
  const ndcY = 1 - 2 * targetFrac;
  const k = ndcY * halfTan;
  const dy =
    (-z * (Math.sin(pitchRad) + k * Math.cos(pitchRad))) /
    (Math.cos(pitchRad) - k * Math.sin(pitchRad));
  return CAMERA_HEIGHT + dy;
}

// World-space WIDTH of the view frustum at depth `z` in front of the camera,
// for an `aspect` (width/height) viewport. Lets a caller size a sprite by the
// screen fraction it should span instead of by trial and error -- the
// player's own JET_WORLD_WIDTH was found by capture-and-remeasure precisely
// because this was not available.
export function worldWidthAtDepth(z, aspect, fovDeg = FOV_DEG) {
  const halfTan = Math.tan(degToRad(fovDeg) / 2);
  return 2 * Math.abs(z) * halfTan * aspect;
}
