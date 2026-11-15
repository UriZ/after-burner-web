import * as THREE from 'three';
import {
  createPixelBuffer,
  fillRectHard,
  fillPolygonHard,
  addKeyline,
  bufferToTexture,
} from './spriteFactory.js';
import { worldYForScreenFrac, worldWidthAtDepth } from '../core/cameraGeom.js';
import { assertOnLadder } from '../ui/ladder.js';

// The airborne refuel TANKER — the second of After Burner II's two resupply
// mechanisms (the runway, STAGE_5 + the `resupply` flow state, is the first).
// R19 breadth lane. Built in the same spirit as flow/carrier.js: an authored
// pixel-art billboard, added to the scene by game.js, positioned by a flow
// state (here `airrefuel`) in screen-fraction terms, out of spriteFactory.js's
// PUBLIC helpers rather than by editing the art lane's sheets.
//
// ---------------------------------------------------------------------------
// MEASURED AGAINST reference/stage3-reload-tanker-t165.png (1028x720), the
// arcade's own mid-air reload shot (GAME_SPEC.md §5 "Mid-air tanker",
// stage-3 open, t164-168): a giant grey mothership/tanker seen from REAR
// aspect, the player's F-14 tucked in beneath it, cyan "RELOAD WEAPONS" text
// blinking low-centre, and the missile stock refilling 20->70 across t163-167
// (GAME_SPEC.md §5/§6). No enemies during it.
//
// Operator for the proportions below: low-saturation grey mask (sat < 40,
// 60 < val < 210) over the frame with the top HUD strip (<0.13H) and the
// player jet / bottom HUD (>0.60H) excluded, then per-row width of the grey
// mass; orange engine glow isolated as (r>150, 40<g<170, b<90) in the tanker
// band (0.17-0.37H); red sensor lights as (r>150, g<80, b<80). Verified by
// cropping the mask and LOOKING, per CLAUDE.md's measurement discipline — the
// first grey pass read the full frame width because the dark-blue horizon band
// is also low-saturation, and only the band exclusion isolated the aircraft.
//
//   tanker grey mass    full screen width at its widest row (wings EXIT both
//                       edges), centred at 49.4 %W
//   vertical extent     body/wings 0.14 .. 0.38 %H (0.24H), centred ~0.26H
//   per-row width       0.17H: 0.46-0.52W (fuselage top), 0.20H: 0.00-1.00W
//                       (wings fan to full width), 0.24H: 0.10-0.88W,
//                       0.28H: 0.23-0.75W, 0.32H: 0.32-0.66W, 0.36H: 0.35-0.63W
//                       — a broad swept gull, widest near the top, trailing
//                       edges sweeping back and inward below
//   engine nacelles     FOUR orange-glowing exhausts, symmetric about centre,
//                       at ~29 / 37 / 62 / 69 %W, y 0.19-0.27H
//   central pod         dark rounded fuselage mass at centre with small red
//                       sensor lights, hanging below the wing line
//   refuel boom         thin pale line dropping from the belly to the player
//
// PALETTE: greys sampled off the same frame (wing #bab7bb, nacelle #aba9aa,
// pod #727276, outer wing / belly #595959, cavities #21212a) and the engine
// glow (#ff8200 core-adjacent, brighter core) and red sensors, each snapped to
// its NEAREST Sega ladder rung (ui/ladder.js — Criterion A2 is |union of the
// three channels' value sets| <= 32, and the ladder has 31 members, so every
// authored channel must be a rung). EIGHT tones including the keyline, which is
// REFERENCE.md Criterion A's per-object budget. These carry the video chain's
// level expansion STATUS.md warns about; they are video-level samples of a grey
// object, so the error is a small uniform brightening, not a hue shift —
// re-sample rather than scale if a native frame ever lands.
//
// NOT REPRODUCED: no SEGA markings or lettering are copied (CLAUDE.md's assets
// rule). The silhouette, proportions and palette are measured; the surface
// detail is original.
// ---------------------------------------------------------------------------

const WING_LIGHT = '#bdb5bd'; // (189,181,189) lit upper wing / nacelle crown
const WING_MID = '#8c8c8c'; //   (140,140,140) wing body
const WING_DARK = '#525252'; //  (82,82,82)    shaded underside / cowl rings
const BODY_VDARK = '#212129'; // (33,33,41)    pod cavity / recesses
const ENGINE_ORANGE = '#ff8400'; // (255,132,0) engine exhaust glow
const ENGINE_CORE = '#ffb542'; //   (255,181,66) bright exhaust core
const SENSOR_RED = '#ce1919'; //    (206,25,25)  pod sensor lights
const KEYLINE = '#101019'; //       (16,16,25)   per-object keyline

const TANKER_PALETTE = [
  WING_LIGHT, WING_MID, WING_DARK, BODY_VDARK,
  ENGINE_ORANGE, ENGINE_CORE, SENSOR_RED, KEYLINE,
];
assertOnLadder(TANKER_PALETTE, 'tanker');

// Texture is WIDE and SHORT — the subject spans the whole frame width and only
// ~0.24H tall. Authored at 240x44 so that at the docked framing (spanFrac ~1.1
// of a 320-wide render = ~352 px across 240 texels) one authored texel is
// ~1.5 native px, matching carrier.js's authoring density. The wings are drawn
// out to the texture edges (they exit the frame in the arcade), and the body
// occupies rows 2..38 with a short refuel-boom stub below it.
const TEX_W = 240;
const TEX_H = 44;
const CX = 120; // texture centreline

// The measured silhouette, converted to texels: body rows 2..38 carry the
// 0.14..0.38H screen span, x fractions scaled by TEX_W. The wing fans to full
// width by row ~9 and the trailing edges sweep back in below.
function drawTanker(buf) {
  // --- wing + body silhouette (one swept-gull polygon, then shading) -------
  const OUTLINE = [
    [114, 2], [126, 2],       // fuselage top
    [239, 9], [239, 12],      // right wingtip (exits the frame)
    [211, 16], [180, 23], [158, 29], [151, 35], // right trailing edge in + down
    [140, 38], [100, 38],     // belly
    [89, 35], [62, 29], [42, 23], [29, 16],      // left trailing edge
    [1, 12], [1, 9],          // left wingtip
  ];
  fillPolygonHard(buf, OUTLINE, WING_MID);

  // Lit band along each LEADING (upper) edge — the single cue that reads the
  // wing as an angled surface rather than a flat grey chevron.
  fillPolygonHard(buf, [[126, 2], [236, 9], [236, 11], [130, 5]], WING_LIGHT);
  fillPolygonHard(buf, [[114, 2], [4, 9], [4, 11], [110, 5]], WING_LIGHT);
  // Shaded rim along each TRAILING (lower) edge.
  fillPolygonHard(buf, [[238, 12], [211, 16], [180, 23], [158, 29], [151, 35],
    [155, 35], [168, 28], [196, 20], [233, 13]], WING_DARK);
  fillPolygonHard(buf, [[2, 12], [29, 16], [60, 23], [82, 29], [89, 35],
    [85, 35], [72, 28], [44, 20], [7, 13]], WING_DARK);

  // --- central fuselage pod (rear aspect: a rounded dark mass) --------------
  fillPolygonHard(buf, [
    [108, 4], [132, 4], [141, 12], [141, 32],
    [128, 39], [112, 39], [99, 32], [99, 12],
  ], WING_DARK);
  // Recessed inner face, darkest, where the rear fuselage meets the boom.
  fillPolygonHard(buf, [
    [110, 10], [130, 10], [135, 16], [135, 30],
    [124, 36], [116, 36], [105, 30], [105, 16],
  ], BODY_VDARK);
  // Small red sensor lights clustered on the pod face (measured centre band).
  fillRectHard(buf, 114, 17, 2, 2, SENSOR_RED);
  fillRectHard(buf, 120, 19, 2, 2, SENSOR_RED);
  fillRectHard(buf, 125, 17, 2, 2, SENSOR_RED);

  // --- four engine nacelles, symmetric about centre ------------------------
  // Texel centres from the measured 29/37/62/69 %W engine columns.
  for (const ex of [70, 89, 151, 170]) {
    const ey = 16;
    // cowl ring: a flat-topped octagon (no ellipse primitive canvas-side, same
    // construction carrier.js's tower caps use — reads round at this scale).
    fillPolygonHard(buf, [
      [ex - 5, ey - 7], [ex + 5, ey - 7], [ex + 8, ey - 3],
      [ex + 8, ey + 4], [ex + 5, ey + 8], [ex - 5, ey + 8],
      [ex - 8, ey + 4], [ex - 8, ey - 3],
    ], WING_DARK);
    // orange exhaust glow
    fillPolygonHard(buf, [
      [ex - 3, ey - 4], [ex + 3, ey - 4], [ex + 5, ey],
      [ex + 3, ey + 5], [ex - 3, ey + 5], [ex - 5, ey],
    ], ENGINE_ORANGE);
    // bright core
    fillRectHard(buf, ex - 2, ey - 1, 4, 4, ENGINE_CORE);
    // lit crown on the cowl top
    fillRectHard(buf, ex - 4, ey - 7, 8, 1, WING_LIGHT);
  }

  // --- refuel boom stub + drogue, dropping from the belly centre -----------
  fillRectHard(buf, CX - 1, 38, 2, 4, WING_LIGHT);
  fillRectHard(buf, CX - 3, 41, 6, 2, WING_DARK);

  addKeyline(buf, KEYLINE);
}

export function createTankerSprite() {
  const buf = createPixelBuffer(TEX_W, TEX_H);
  drawTanker(buf);
  const texture = bufferToTexture(buf);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    // Same reasoning as carrier.js: a billboard at a fixed depth over a large
    // ground/sky mesh whose near pixels are closer than the tanker's depth;
    // depth testing would eat the sprite. renderOrder -1 draws it in the
    // transparent pass ahead of the ground but BEHIND the player jet
    // (renderOrder 0), so the player reads as tucked in UNDER the tanker —
    // exactly the rear-aspect formation of the reference.
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = -1;
  sprite.scale.set(1, TEX_H / TEX_W, 1);
  sprite.visible = false;
  sprite.userData.texAspect = TEX_H / TEX_W;
  return sprite;
}

// Places the tanker by the fraction of screen WIDTH it spans and the fraction
// of screen HEIGHT its centre sits at, at a fixed depth — CLAUDE.md's
// "perspective parallax" rule applied the same way placeCarrier does: an
// object held at a fixed world Y drifts vertically on screen as it changes
// apparent size, so only scale and world Y move while depth stays fixed, which
// makes the commanded screen fraction exactly what you get.
export function placeTanker(sprite, { depth, aspect, spanFrac, centreFrac }) {
  const frustumW = worldWidthAtDepth(depth, aspect);
  const w = frustumW * spanFrac;
  sprite.scale.set(w, w * sprite.userData.texAspect, 1);
  sprite.position.set(0, worldYForScreenFrac(centreFrac, depth), depth);
}
