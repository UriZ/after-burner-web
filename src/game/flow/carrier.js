import * as THREE from 'three';
import {
  createPixelBuffer,
  fillRectHard,
  fillPolygonHard,
  setPixel,
  addKeyline,
  bufferToTexture,
} from '../../render/spriteFactory.js';
import { worldYForScreenFrac, worldWidthAtDepth } from '../../core/cameraGeom.js';

// The carrier the game launches off. feel-critique.md §7.2 / §10 rank 5: "the
// carrier catapult launch has no carrier in it ... it spends the opening on
// nothing", and the opening is the first 3.5 s a player ever sees.
// launchSequence.js shipped the SEQUENCE in R5 without the SUBJECT, because
// its own header says no carrier asset existed and ground.js / the sprite
// sheets are other lanes' files. This module is the subject, authored here
// out of spriteFactory.js's PUBLIC pixel helpers (createPixelBuffer /
// fillPolygonHard / addKeyline / bufferToTexture) rather than by editing that
// file -- it adds a drawing, it does not change the art lane's.
//
// ---------------------------------------------------------------------------
// MEASURED AGAINST reference/carrier-prelaunch-t84.png (686x480), which is the
// arcade's own pre-launch shot: the ship seen from ASTERN and slightly above,
// looking forward along the deck, bow away from the camera.
//
// Operator for the proportions below: low-saturation mask (sat < 0.18,
// 60 < max(RGB) < 235) over the frame, then the largest 4-connected component,
// which isolates the flight deck cleanly (checked by rendering the mask and
// looking at it, not by trusting the number -- the first run reported a
// 98 %W bbox because sea foam is also low-saturation, and only the component
// step and the crop fixed that).
//
//   flight deck span          168..516 px = 50.87 %W, centred at 49.85 %W
//   flight deck vertical      53.33 .. 72.71 %H  (19.58 %H)
//   mast top / hull bottom    ~40.8 %H .. ~86.5 %H
//   island (superstructure)   right of centre, roughly 62..87 % of ship width
//
// So the deck is a trapezoid: NARROW at the top (the far end, the bow) and
// wide at the near/stern edge, with the island on the right. Those two facts
// -- trapezoid-widening-toward-the-viewer and island-to-starboard -- are what
// make a grey mass read as a carrier rather than as a grey mass.
//
// PALETTE, modal colours sampled from the same frame (deck flat, island face,
// hull): #c6c4e7 / #b5b3c5 / #9294b3 / #505065 / #201f26, plus white for the
// deck markings and parked aircraft. EIGHT tones including the keyline, which
// is REFERENCE.md Criterion A's per-object budget.
//
// These carry the video level expansion STATUS.md warns about ("the arcade's
// ladder tops out at 0xf7; every video frame tops out at 0xff") -- they are
// video-level samples, not native-ROM values, and are recorded as such. The
// ship is grey, so the error is a small uniform brightening rather than a hue
// shift; if a native frame ever lands, re-sample rather than scaling these.
//
// NOT REPRODUCED, deliberately: the arcade paints "SEGA" and "ENTERPRISE"
// across the deck in blue and green. That is SEGA's trade dress and
// CLAUDE.md's assets rule is absolute, so our deck carries an abstract
// landing-strip centreline and a hull number instead. The silhouette, the
// proportions and the palette are measured; the lettering is not copied.
// ---------------------------------------------------------------------------

const DECK_LIGHT = '#c6c4e7';
const DECK_MID = '#b5b3c5';
const ISLAND_MID = '#9294b3';
const ISLAND_DARK = '#505065';
const HULL_DARK = '#201f26';
const MARKING = '#ffffff';
const KEYLINE = '#12121a';

// Texture is authored at 208x124 so one authored texel is ~1.6 native px at
// the opening framing (50.87 %W of a 320-wide render = 163 px across the 188
// texels of deck) and ~2.3 at the end of the overfly. Authoring SMALLER and
// letting it scale up would have been the cheaper option and is the wrong one
// -- the thing is on screen at up to 145 %W by the end of the pass.
//
// THE PROPORTIONS BELOW ARE SOLVED, NOT EYEBALLED. The first version was
// eyeballed (208x96) and the capture showed why that is not good enough: the
// deck read as a flat grey arrowhead because it was too shallow for its
// width, and the hull disappeared behind the bottom HUD strip. Converting the
// four arcade landmarks from %H/%W into PIXELS of the 686x480 frame (the
// aspect matters -- %H and %W are not the same unit) gives:
//
//   ship height (mast top 40.83 %H -> hull bottom 86.46 %H) = 219.0 px
//   deck width (50.87 %W)                                   = 349.0 px
//   => ship height / deck width                             = 0.6276
//   deck vertical extent (53.33 -> 72.71 %H)                = 93.0 px
//   => deck extent / deck width                             = 0.2666
//
// and the four landmarks as fractions of the ship's own height:
//   mast top 0.0000, deck top 0.2739, deck near edge 0.6987, hull bottom 1.0
//
// With a 188-texel deck: ship height = 188 * 0.6276 = 118 texels, so the ship
// occupies y 3..121 of a 124-row texture and the landmarks land where the
// constants below put them. The old 208x96 gave a deck/width ratio of 0.218
// against the arcade's 0.2666 -- 18 % too shallow, which is exactly the
// "arrowhead" the capture showed.
const TEX_W = 208;
const TEX_H = 124;

const SHIP_TOP_Y = 3;
const SHIP_BOTTOM_Y = 121; // 118 rows = 188 * 0.6276

// Ship geometry in texture space. The three Y values are SHIP_TOP_Y plus the
// arcade's own landmark fractions times the 118-row ship height.
const DECK_FAR_Y = 35; // 3 + 0.2739*118
const DECK_NEAR_Y = 85; // 3 + 0.6987*118
const HULL_BOTTOM_Y = SHIP_BOTTOM_Y;
const DECK_FAR_X0 = 62;
const DECK_FAR_X1 = 124;
const DECK_NEAR_X0 = 0;
const DECK_NEAR_X1 = 188;

// Island: top/bottom read off the same crop at 44.8 / 62.5 %H, converted
// through the same ship-span fraction (0.0875 / 0.4746).
const ISLAND_Y0 = 13;
const ISLAND_Y1 = 59;
const ISLAND_X0 = 129;
const ISLAND_X1 = 181;

function drawCarrier(buf) {
  const islandW = ISLAND_X1 - ISLAND_X0;
  const islandH = ISLAND_Y1 - ISLAND_Y0;

  // --- hull: a dark slab under the deck, narrower than it, tapering down --
  fillPolygonHard(
    buf,
    [
      [22, DECK_NEAR_Y - 3],
      [173, DECK_NEAR_Y - 3],
      [162, HULL_BOTTOM_Y],
      [37, HULL_BOTTOM_Y],
    ],
    HULL_DARK
  );
  // Two lighter bands: a stern transom and a waterline shadow. Without them
  // the hull is a featureless silhouette and the whole ship reads as a
  // cardboard cut-out at every scale the overfly passes through.
  fillRectHard(buf, 44, DECK_NEAR_Y + 6, 112, 3, ISLAND_DARK);
  fillRectHard(buf, 50, DECK_NEAR_Y + 17, 100, 2, ISLAND_DARK);
  // Sponson boxes along the hull side, which is what gives the arcade's hull
  // its serrated edge rather than a clean line.
  for (let x = 48; x < 150; x += 24) {
    fillRectHard(buf, x, DECK_NEAR_Y + 1, 10, 4, ISLAND_DARK);
  }

  // --- flight deck: the trapezoid, wide at the near (stern) edge -----------
  fillPolygonHard(
    buf,
    [
      [DECK_FAR_X0, DECK_FAR_Y],
      [DECK_FAR_X1, DECK_FAR_Y],
      [DECK_NEAR_X1, DECK_NEAR_Y],
      [DECK_NEAR_X0, DECK_NEAR_Y],
    ],
    DECK_LIGHT
  );
  // Deck edge thickness along the near rim -- the deck is a plate seen from
  // slightly above, not a decal.
  fillPolygonHard(
    buf,
    [
      [DECK_NEAR_X0 + 4, DECK_NEAR_Y - 5],
      [DECK_NEAR_X1 - 4, DECK_NEAR_Y - 5],
      [DECK_NEAR_X1, DECK_NEAR_Y],
      [DECK_NEAR_X0, DECK_NEAR_Y],
    ],
    DECK_MID
  );
  // Port-side angled-deck sponson: the overhang on the left of t84, and the
  // one asymmetry that stops the trapezoid reading as a plain wedge.
  fillPolygonHard(
    buf,
    [
      [0, 60],
      [18, 52],
      [26, 68],
      [0, 76],
    ],
    DECK_MID
  );

  // --- deck markings ------------------------------------------------------
  // The angled landing strip: a long centreline from the bow down to the port
  // quarter, with a dashed line inboard of it. Drawn in the DARK tone, not in
  // white: the first version used white on #c6c4e7 and measured 0 visible
  // contrast at the opening scale -- it simply was not there in the capture.
  const strip = (x0, y0, x1, y1, hex, dash) => {
    const n = Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    for (let i = 0; i <= n; i++) {
      if (dash && i % dash > dash / 2) continue;
      const t = i / n;
      setPixel(buf, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), hex);
      setPixel(buf, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t) + 1, hex);
    }
  };
  strip(104, DECK_FAR_Y + 4, 30, DECK_NEAR_Y - 6, ISLAND_DARK, 0);
  strip(118, DECK_FAR_Y + 4, 58, DECK_NEAR_Y - 8, MARKING, 7);
  // Deck-edge line along the starboard side, under the island.
  strip(DECK_FAR_X1 + 2, DECK_FAR_Y + 2, DECK_NEAR_X1 - 6, DECK_NEAR_Y - 7, ISLAND_DARK, 0);

  // --- island (superstructure), starboard side ----------------------------
  fillRectHard(buf, ISLAND_X0, ISLAND_Y0, islandW, islandH, ISLAND_MID);
  fillRectHard(buf, ISLAND_X0 + 4, ISLAND_Y0 + 7, islandW - 8, 4, ISLAND_DARK); // bridge windows
  fillRectHard(buf, ISLAND_X0 + 4, ISLAND_Y0 + 17, 22, 3, ISLAND_DARK);
  fillRectHard(buf, ISLAND_X0 + 31, ISLAND_Y0 + 3, 13, 12, ISLAND_DARK); // funnel
  fillRectHard(buf, ISLAND_X0 + 5, ISLAND_Y1 - 10, islandW - 12, 10, ISLAND_DARK); // shadowed base
  // Hull number on the island face, two 3x5 blocks. Deliberately not the
  // arcade's "128" -- see the header's note on trade dress.
  fillRectHard(buf, ISLAND_X0 + 11, ISLAND_Y1 - 8, 3, 5, MARKING);
  fillRectHard(buf, ISLAND_X0 + 17, ISLAND_Y1 - 8, 3, 5, MARKING);

  // --- mast and radar, in the 10 rows above the island --------------------
  fillRectHard(buf, 152, SHIP_TOP_Y, 2, ISLAND_Y0 - SHIP_TOP_Y, ISLAND_DARK);
  fillRectHard(buf, 139, SHIP_TOP_Y + 1, 29, 1, ISLAND_DARK); // upper yardarm
  fillRectHard(buf, 144, SHIP_TOP_Y + 5, 20, 1, ISLAND_DARK); // lower yardarm
  fillRectHard(buf, 130, SHIP_TOP_Y + 6, 15, 2, ISLAND_MID); // air-search radar bar
  fillRectHard(buf, 176, SHIP_TOP_Y + 4, 2, ISLAND_Y0 - SHIP_TOP_Y - 1, ISLAND_DARK);

  // --- parked aircraft ----------------------------------------------------
  // Clustered at the bow, outboard of the strip, and aft of the island, as in
  // t84. Each is 9 px across: one aircraft at this scale, not a fleet. Drawn
  // as a DARK chevron with a light core -- a white chevron on the #c6c4e7
  // deck was invisible in the first capture, same defect as the markings.
  const PARKED = [
    [68, 42],
    [84, 42],
    [110, 46],
    [128, 50],
    [16, 70],
    [36, 74],
    [146, 66],
    [164, 72],
  ];
  for (const [px0, py0] of PARKED) {
    fillPolygonHard(
      buf,
      [
        [px0, py0 + 4],
        [px0 + 4, py0],
        [px0 + 9, py0 + 4],
        [px0 + 4, py0 + 2],
      ],
      ISLAND_DARK
    );
    setPixel(buf, px0 + 4, py0 + 1, MARKING);
    setPixel(buf, px0 + 4, py0 + 2, MARKING);
  }

  // --- bow wave / waterline foam ------------------------------------------
  // Deterministic pseudo-noise, not Math.random: this texture is built once
  // per page load and a capture has to be byte-reproducible across runs
  // (ARCHITECTURE.md D4). `(x * 7919) % 3` is a fixed pattern, not a draw
  // from any PRNG stream -- in particular not from the shared gameplay
  // stream, whose sequencing other systems depend on.
  for (let x = 32; x < 168; x++) {
    const h = 1 + ((x * 7919) % 3);
    fillRectHard(buf, x, HULL_BOTTOM_Y - 1, 1, h, MARKING);
  }

  addKeyline(buf, KEYLINE);
}

export function createCarrierSprite(worldWidth) {
  const buf = createPixelBuffer(TEX_W, TEX_H);
  drawCarrier(buf);
  const texture = bufferToTexture(buf);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    // depthTest OFF, and this is not a shortcut. The ship is a billboard at a
    // fixed depth; the sea is a single large mesh whose NEAR pixels are much
    // closer to the camera than the ship's depth, so with depth testing on,
    // every pixel of the hull below the sea's near field is depth-rejected and
    // the ship is drawn with its bottom half eaten. renderOrder -1 puts it
    // ahead of the player jet (renderOrder 0) and of every combat element
    // (6-30) in the transparent pass, so the jet still draws in front of it,
    // which is the one ordering that matters here.
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = -1;
  // Pivot on the DECK's centre, not the texture's. The deck occupies texels
  // 0..188 of 208, so its midpoint is 94 — 10 texels left of the texture's
  // own centre, and a sprite pivoted at 0.5 therefore puts the deck 4.8 % of
  // its own width to the left of where it was commanded. Measured, not
  // predicted: the first solved framing read deck cx 47.14 %W against the
  // arcade's 49.85, and 2.71 points is exactly 4.8 % of the 56.3 %W sprite.
  // THREE.Sprite.center is in normalised sprite units, so this stays correct
  // through the whole overfly as the thing grows.
  sprite.center.set((DECK_NEAR_X0 + DECK_NEAR_X1) / 2 / TEX_W, 0.5);
  sprite.scale.set(worldWidth, worldWidth * (TEX_H / TEX_W), 1);
  sprite.visible = false;
  sprite.userData.texAspect = TEX_H / TEX_W;
  return sprite;
}

// Places the carrier by the two things the shot is actually authored in --
// the fraction of screen WIDTH it spans and the fraction of screen HEIGHT its
// centre sits at -- rather than by a world position.
//
// This is CLAUDE.md's "perspective parallax" rule applied deliberately: an
// object held at a fixed world Y drifts vertically on screen as its apparent
// size changes, so a carrier animated in world space would wander off the
// composition while it grew. Depth is fixed and only scale and world Y move,
// which makes the commanded screen fraction exactly what you get.
export function placeCarrier(sprite, { depth, aspect, spanFrac, centreFrac }) {
  const frustumW = worldWidthAtDepth(depth, aspect);
  const w = frustumW * spanFrac;
  sprite.scale.set(w, w * sprite.userData.texAspect, 1);
  sprite.position.set(0, worldYForScreenFrac(centreFrac, depth), depth);
}
