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
  // A tall narrow blade rising clearly above the wing line at centre (rows
  // 1..14, screen ~0.12..0.21H). In the reference this fin — not the wing — is
  // what reads the craft as a winged transport seen from the rear rather than a
  // flat flying-wing. Narrow so it reads as a blade, not a nose cone.
  fillPolygonHard(buf, [[120, 1], [126, 14], [114, 14]], WING_MID);
  fillPolygonHard(buf, [[120, 1], [120, 14], [115, 14]], WING_LIGHT); // lit fwd face
  fillPolygonHard(buf, [[120, 1], [126, 14], [122, 14]], WING_DARK);  // shaded aft edge

  // --- high horizontal stabilizers, swept back + down off the fin ----------
  // Poked out ABOVE the wing leading edge (rows 5..11) so the tail cross reads
  // as a separate high tailplane, not another chevron buried in the wing.
  fillPolygonHard(buf, [[116, 5], [90, 10], [96, 12], [117, 10]], WING_MID);  // left
  fillPolygonHard(buf, [[124, 5], [150, 10], [144, 12], [123, 10]], WING_MID); // right
  fillPolygonHard(buf, [[116, 5], [90, 10], [93, 10], [117, 6]], WING_LIGHT);  // lit edges
  fillPolygonHard(buf, [[124, 5], [150, 10], [147, 10], [123, 6]], WING_LIGHT);

  // --- main wings: a broad DOWN-swept gull, tips exiting both frame edges ---
  // Leading (upper) edge high at the root, sweeping down-and-out to pointed
  // tips at the texture edges (measured: full screen width by ~0.20H, trailing
  // edges then sweeping back inboard and down below). Pushed down vs the fin so
  // the fin clears the wing. One polygon per side, left mirrors the right.
  const rightWing = [
    [134, 12], [202, 16], [239, 18], [239, 20],
    [206, 22], [172, 27], [150, 31], [138, 28],
  ];
  fillPolygonHard(buf, rightWing, WING_MID);
  fillPolygonHard(buf, rightWing.map(([x, y]) => [240 - x, y]), WING_MID);
  // lit leading edges
  fillPolygonHard(buf, [[134, 12], [239, 18], [239, 19], [136, 14]], WING_LIGHT);
  fillPolygonHard(buf, [[106, 12], [1, 18], [1, 19], [104, 14]], WING_LIGHT);
  // shaded trailing edges
  fillPolygonHard(buf, [[239, 20], [206, 22], [172, 27], [150, 31],
    [154, 31], [176, 28], [208, 24], [239, 21]], WING_DARK);
  fillPolygonHard(buf, [[1, 20], [34, 22], [68, 27], [90, 31],
    [86, 31], [64, 28], [32, 24], [1, 21]], WING_DARK);

  // --- central FUSELAGE: a real rounded capsule, mid-grey and LIT -----------
  // The arcade's fuselage reads as a solid, lit body — NOT the near-black pod
  // ours used to draw (which read as a hole in the wing). Rows 10..38, tapered
  // to a narrow crown where the fin rises, widest mid-body, tapering to the
  // belly where the boom hangs.
  fillPolygonHard(buf, [
    [112, 10], [128, 10], [138, 16], [140, 24],
    [134, 33], [126, 38], [114, 38], [106, 33],
    [100, 24], [102, 16],
  ], WING_MID);
  fillPolygonHard(buf, [[112, 10], [128, 10], [132, 15], [108, 15]], WING_LIGHT); // lit crown
  fillPolygonHard(buf, [[138, 16], [140, 24], [134, 33], [131, 31], [136, 24], [135, 17]], WING_DARK);
  fillPolygonHard(buf, [[102, 16], [100, 24], [106, 33], [109, 31], [104, 24], [105, 17]], WING_DARK);
  // one recessed sensor housing (the single dark accent, not a full black pod)
  fillPolygonHard(buf, [[112, 18], [128, 18], [132, 24], [126, 31], [114, 31], [108, 24]], BODY_VDARK);
  // red sensor lights clustered on the housing (measured centre band)
  fillRectHard(buf, 114, 21, 2, 2, SENSOR_RED);
  fillRectHard(buf, 120, 23, 2, 2, SENSOR_RED);
  fillRectHard(buf, 125, 21, 2, 2, SENSOR_RED);

  // --- four engine nacelles flanking the fuselage --------------------------
  // Texel centres from the measured 29/37/62/69 %W engine columns; ey=18 puts
  // the glow at ~0.23H screen (measured orange band 0.19-0.27H).
  for (const ex of [70, 90, 150, 170]) {
    const ey = 18;
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
