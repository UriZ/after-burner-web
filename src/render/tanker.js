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
//   vertical extent     body/wings 0.14 .. 0.38 %H (0.24H), centred ~0.26H,
//                       with a TAIL FIN rising above to ~0.11H
//   per-row width       0.17H: 0.46-0.52W (fuselage top), 0.20H: 0.00-1.00W
//                       (wings fan to full width), 0.24H: 0.10-0.88W,
//                       0.28H: 0.23-0.75W, 0.32H: 0.32-0.66W, 0.36H: 0.35-0.63W
//                       — a broad DOWN-swept gull, widest near the top, trailing
//                       edges sweeping back and inward below
//   tail assembly       a VERTICAL tail fin at centre-top rising above the wing
//                       line, with high swept-back horizontal stabilizers — the
//                       winged-transport read the arcade has and a flat
//                       flying-wing/manta does not (R19 judge's airframe gap).
//                       ASSUMED: the fin/stab proportions are read off this one
//                       video frame's silhouette, not a certified measurement
//   engine nacelles     FOUR orange-glowing exhausts, symmetric about centre,
//                       at ~29 / 37 / 62 / 69 %W, y 0.19-0.27H
//   central fuselage    a LIT mid-grey rounded capsule at centre (not a dark
//                       pod) carrying small red sensor lights
//   refuel boom         thin segmented line dropping from the belly to the
//                       player jet, which noses UP to meet it (docked, not a gap)
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
  // --- vertical TAIL FIN (the feature that breaks the manta read) ----------
  // A thin upright blade rising from the fuselage crown (rows 3..13, screen
  // ~0.14..0.20H). In the reference this fin — not the wing — is what reads the
  // craft as a winged transport seen from the rear rather than a flat
  // flying-wing. Narrow (6 texels) so it reads as a blade, not a nose cone, and
  // lit-front / shaded-aft so it has a vertical face.
  fillPolygonHard(buf, [[118, 3], [122, 3], [123, 13], [117, 13]], WING_MID);
  fillPolygonHard(buf, [[118, 3], [120, 3], [120, 13], [117, 13]], WING_LIGHT); // lit fwd face
  fillPolygonHard(buf, [[120, 3], [122, 3], [123, 13], [120, 13]], WING_DARK);  // shaded aft edge

  // --- high horizontal STABILIZER: a long thin gull crossbar atop the fin ---
  // Roots connect solidly to the fin crown (x117..124) and the blades sweep OUT
  // and gently UP to pointed tips at ~x151 (rows 1..5), sitting as a distinct
  // high tailplane with clear black sky between it and the wing leading edge —
  // the cross-tail read the arcade has and a flat flying-wing/manta does not.
  // ASSUMED: fin + stabilizer proportions are read off the one video frame's
  // silhouette, fitted into the ~11 texels above the wing that the docking
  // composition leaves free — not a certified per-pixel measurement.
  const rStab = [[119, 2], [124, 2], [151, 1], [151, 3], [124, 5], [119, 4]];
  fillPolygonHard(buf, rStab, WING_MID);
  fillPolygonHard(buf, rStab.map(([x, y]) => [240 - x, y]), WING_MID);
  fillPolygonHard(buf, [[124, 2], [151, 1], [151, 2], [124, 3]], WING_LIGHT); // lit top edge
  fillPolygonHard(buf, [[124, 2], [151, 1], [151, 2], [124, 3]].map(([x, y]) => [240 - x, y]), WING_LIGHT);

  // --- main wings: a broad DOWN-swept gull, tips exiting both frame edges ---
  // Thick inboard shoulder (carrying the nacelles) with the leading edge high
  // at the root, sweeping DOWN-and-out to the drooping pointed tips at the
  // texture edges (measured: full screen width, trailing edges sweeping back
  // and down below). Pushed down vs the tail so the fin + stabilizer clear it.
  // One polygon per side, left mirrors the right.
  const rightWing = [
    [134, 17], [148, 13], [172, 15], [205, 20], [239, 25],
    [239, 28], [205, 29], [172, 30], [152, 30], [136, 27],
  ];
  fillPolygonHard(buf, rightWing, WING_MID);
  fillPolygonHard(buf, rightWing.map(([x, y]) => [240 - x, y]), WING_MID);
  // lit leading edges
  fillPolygonHard(buf, [[150, 13], [172, 15], [205, 20], [239, 25],
    [239, 26], [205, 21], [172, 16], [150, 14]], WING_LIGHT);
  fillPolygonHard(buf, [[150, 13], [172, 15], [205, 20], [239, 25],
    [239, 26], [205, 21], [172, 16], [150, 14]].map(([x, y]) => [240 - x, y]), WING_LIGHT);
  // shaded trailing edges
  fillPolygonHard(buf, [[239, 27], [205, 29], [172, 30], [150, 30],
    [150, 29], [172, 29], [205, 28], [239, 28]], WING_DARK);
  fillPolygonHard(buf, [[239, 27], [205, 29], [172, 30], [150, 30],
    [150, 29], [172, 29], [205, 28], [239, 28]].map(([x, y]) => [240 - x, y]), WING_DARK);

  // --- central FUSELAGE: a real rounded capsule, mid-grey and LIT -----------
  // The arcade's fuselage reads as a solid, lit body — NOT the near-black pod
  // ours used to draw (which read as a hole in the wing). Rows 11..39, tapered
  // to a narrow crown where the fin rises, widest mid-body, tapering to the
  // belly where the boom hangs.
  fillPolygonHard(buf, [
    [112, 11], [128, 11], [136, 16], [139, 22], [137, 29],
    [131, 35], [124, 39], [116, 39], [109, 35], [103, 29], [101, 22], [104, 16],
  ], WING_MID);
  fillPolygonHard(buf, [[112, 11], [128, 11], [131, 15], [109, 15]], WING_LIGHT); // lit crown
  fillPolygonHard(buf, [[136, 16], [139, 22], [137, 29], [134, 28], [136, 22], [134, 17]], WING_DARK);
  fillPolygonHard(buf, [[104, 16], [101, 22], [103, 29], [106, 28], [104, 22], [106, 17]], WING_DARK);
  // dark angular COCKPIT glass, offset to the upper-RIGHT as in the arcade —
  // the single dark accent, not a full black pod swallowing the body.
  fillPolygonHard(buf, [[120, 15], [134, 18], [135, 25], [123, 28], [117, 23], [118, 17]], BODY_VDARK);
  // red sensor lights clustered right-of-centre on the glass (measured band)
  fillRectHard(buf, 123, 21, 2, 2, SENSOR_RED);
  fillRectHard(buf, 128, 23, 2, 2, SENSOR_RED);
  fillRectHard(buf, 125, 26, 2, 2, SENSOR_RED);
  // lower-body panel line + lit lip (the horizontal segment the reference shows)
  fillPolygonHard(buf, [[108, 32], [132, 32], [130, 34], [110, 34]], WING_DARK);
  fillPolygonHard(buf, [[110, 34], [130, 34], [128, 35], [112, 35]], WING_LIGHT);

  // --- four engine nacelles flanking the fuselage --------------------------
  // Texel centres from the measured 29/37/62/69 %W engine columns; ey=21 nests
  // the glow into the wing-root shoulder at ~0.25H screen (measured orange band
  // 0.19-0.27H), sitting ON the down-swept wing as the reference shows.
  for (const ex of [70, 90, 150, 170]) {
    const ey = 21;
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

  // --- segmented refuel BOOM dropping from the belly centre ----------------
  // Reaches to the texture floor; game.js raises the docked jet so its nose
  // meets this (the arcade's jet noses up to a visible boom, not a gap below).
  fillRectHard(buf, CX - 1, 37, 2, 2, WING_LIGHT);
  fillRectHard(buf, CX - 1, 40, 2, 2, WING_MID);
  fillRectHard(buf, CX - 1, 42, 2, 1, WING_LIGHT);
  fillRectHard(buf, CX - 2, 43, 4, 1, WING_DARK); // drogue stub at the tip

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
