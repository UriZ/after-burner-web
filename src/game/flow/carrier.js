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
  fillRectHard(buf, 40, DECK_NEAR_Y + 1, 120, 2, ISLAND_MID); // sheer line
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
  // R7: the landing strip is a BAND, not a line. On t89 the deck reads as a
  // broad pale runway with a darker deck either side of it and a dashed
  // centreline down the middle; R6 drew the centreline and nothing else, and
  // the launch capture is one flat plate of #c6c4e7 as a result.
  fillPolygonHard(
    buf,
    [[96, DECK_FAR_Y + 2], [126, DECK_FAR_Y + 2], [60, DECK_NEAR_Y - 2], [12, DECK_NEAR_Y - 2]],
    DECK_MID
  );
  strip(104, DECK_FAR_Y + 4, 30, DECK_NEAR_Y - 6, ISLAND_DARK, 0);
  strip(118, DECK_FAR_Y + 4, 58, DECK_NEAR_Y - 8, MARKING, 7);
  // Deck-edge line along the starboard side, under the island.
  strip(DECK_FAR_X1 + 2, DECK_FAR_Y + 2, DECK_NEAR_X1 - 6, DECK_NEAR_Y - 7, ISLAND_DARK, 0);

  // --- island (superstructure), starboard side ----------------------------
  //
  // R7 REDRAW. The R6 island was one flat rectangle with four darker
  // rectangles on it, and judge gap 10 is exactly that: "a grey wedge with
  // one box beside the arcade's detailed ship". Drawn here against
  // reference/carrier-launch-t89.png x[470,686] y[110,340] viewed at 3x
  // (tools/out/sprite-r7/arcade/t89-island-3x.png), which is the LAUNCH
  // shot -- the island is ~90 px tall there against ~25 px in the distant
  // t84, so it is the frame that actually shows the structure. What that
  // crop holds, and what each block below is:
  //
  //   * a multi-storey bridge block whose face is a REGULAR GRID of small
  //     dark windows, roughly 6 columns by 5 rows. This is the single
  //     feature that makes the mass read as a ship rather than a box, and
  //     R6 had none of it.
  //   * TWO rounded tower caps, the aft one larger, each ringed with a band
  //     of dark vent/window ticks and lit along its top.
  //   * a lattice mast carrying two long yardarms and, above them, a
  //     horizontal air-search radar bar.
  //   * a large pale hull number on a dark panel at the island's base.
  //
  // The arcade's number is 128 and its deck carries SEGA/ENTERPRISE; neither
  // is reproduced (CLAUDE.md's assets rule). The number here is 07, drawn
  // from this file's own 6x9 segment table.
  const lit = (x, y, w, h) => fillRectHard(buf, x, y, w, h, DECK_MID);
  const mid = (x, y, w, h) => fillRectHard(buf, x, y, w, h, ISLAND_MID);
  const dark = (x, y, w, h) => fillRectHard(buf, x, y, w, h, ISLAND_DARK);

  // Bridge block, two value planes across: the face toward the deck catches
  // the light, the outboard half is in shade.
  const BRIDGE_Y = ISLAND_Y0 + 17;
  mid(ISLAND_X0, BRIDGE_Y, islandW, ISLAND_Y1 - BRIDGE_Y);
  lit(ISLAND_X0, BRIDGE_Y, 19, ISLAND_Y1 - BRIDGE_Y);
  // The window grid. 6 x 4 of 3x2 lights with 2 px mullions -- at the
  // opening framing one window is ~2 native px, which is the smallest
  // feature that survives, and the GRID is what reads, not any one light.
  for (let r = 0; r < 4; r += 1) {
    for (let col = 0; col < 6; col += 1) {
      dark(ISLAND_X0 + 2 + col * 5, BRIDGE_Y + 3 + r * 4, 3, 2);
    }
  }
  // A dark band under the windows and the shadowed base the deck sits on.
  dark(ISLAND_X0, ISLAND_Y1 - 11, islandW, 2);

  // Two rounded tower caps. canvas-side there is no ellipse primitive, so
  // each is a flat-topped octagon -- the same construction the player jet's
  // nacelles use, and at 14-22 texels it reads round.
  const cap = (cx, cy, rx, ry) => {
    const cut = Math.round(rx * 0.5);
    fillPolygonHard(
      buf,
      [
        [cx - rx + cut, cy - ry], [cx + rx - cut, cy - ry],
        [cx + rx, cy - ry + cut], [cx + rx, cy + ry],
        [cx - rx, cy + ry], [cx - rx, cy - ry + cut],
      ],
      ISLAND_MID
    );
    lit(cx - rx + cut, cy - ry, 2 * (rx - cut), 2); // lit crown
    for (let t = -rx + 2; t < rx - 2; t += 4) dark(cx + t, cy + 1, 2, 2); // vent ring
  };
  cap(ISLAND_X0 + 13, ISLAND_Y0 + 11, 10, 6);
  cap(ISLAND_X0 + 37, ISLAND_Y0 + 8, 13, 9);

  // --- mast, yardarms and radar, above the caps ---------------------------
  dark(ISLAND_X0 + 22, SHIP_TOP_Y, 2, ISLAND_Y0 + 6 - SHIP_TOP_Y);
  dark(ISLAND_X0 + 8, SHIP_TOP_Y + 2, 31, 1); // upper yardarm
  dark(ISLAND_X0 + 13, SHIP_TOP_Y + 6, 21, 1); // lower yardarm
  mid(ISLAND_X0 + 2, SHIP_TOP_Y + 8, 17, 2); // air-search radar bar
  fillRectHard(buf, ISLAND_X0 + 7, SHIP_TOP_Y + 3, 3, 3, MARKING); // signal board
  dark(ISLAND_X0 + 47, SHIP_TOP_Y + 5, 2, ISLAND_Y0 - SHIP_TOP_Y);

  // --- hull number, large, on a dark panel at the island base -------------
  // 6x9 digits from a seven-segment table. The arcade's are the biggest
  // single piece of lettering on the ship and they are what a player reads
  // first; R6's were two 3x5 white blocks, i.e. not digits at all.
  const SEG = { 0: 0b1110111, 7: 0b1010010 };
  const drawDigit = (d, x, y) => {
    const s = SEG[d];
    const bar = (i, bx, by, w, h) => { if (s & (1 << i)) fillRectHard(buf, x + bx, y + by, w, h, MARKING); };
    bar(6, 0, 0, 6, 2); // top
    bar(5, 0, 0, 2, 5); // upper left
    bar(4, 4, 0, 2, 5); // upper right
    bar(3, 0, 4, 6, 2); // middle
    bar(2, 0, 4, 2, 5); // lower left
    bar(1, 4, 4, 2, 5); // lower right
    bar(0, 0, 7, 6, 2); // bottom
  };
  // Lifted onto the island FACE rather than its base: the base's last rows
  // sit behind the deck's near edge at the launch framing, and the first
  // R7 draft put the digits exactly there -- the capture showed a dark panel
  // with nothing in it.
  dark(ISLAND_X0 + 28, ISLAND_Y1 - 22, 22, 11);
  drawDigit(0, ISLAND_X0 + 30, ISLAND_Y1 - 21);
  drawDigit(7, ISLAND_X0 + 40, ISLAND_Y1 - 21);

  // --- parked aircraft ----------------------------------------------------
  // Clustered at the bow, outboard of the strip, and aft of the island, as in
  // t84. Each is 9 px across: one aircraft at this scale, not a fleet. Drawn
  // as a DARK chevron with a light core -- a white chevron on the #c6c4e7
  // deck was invisible in the first capture, same defect as the markings.
  const PARKED = [
    [10, 62], [30, 68], [50, 74], [8, 78],
    [60, 40], [76, 40], [92, 42], [108, 44],
    [150, 70], [168, 76], [134, 64],
  ];
  // R7: light body, DARK outline, 13 px across. R6 drew them as dark
  // chevrons with a 2 px light core and the launch capture shows why that
  // fails -- against #c6c4e7 at the opening scale a 9 px dark mark is one
  // smudge, while the arcade's parked aircraft are pale bodies with a hard
  // dark edge, which is what survives the downscale. Placed outboard and
  // forward of the catapult so the player's own jet does not sit on them.
  for (const [px0, py0] of PARKED) {
    // Size with DEPTH. The deck is a perspective trapezoid, so an aircraft
    // parked at its far end must be smaller; drawing them all one size is
    // what made the first R7 draft read as a row of identical arrows. k runs
    // 0.62 at the far edge to 1.0 at the near one, from the same
    // DECK_FAR_Y/DECK_NEAR_Y the deck itself is built from.
    const k = 0.62 + 0.38 * ((py0 - DECK_FAR_Y) / (DECK_NEAR_Y - DECK_FAR_Y));
    const W = 13 * k;
    const H = 5 * k;
    fillPolygonHard(
      buf,
      [[px0, py0 + H], [px0 + W / 2, py0], [px0 + W, py0 + H], [px0 + W / 2, py0 + H * 0.6]],
      ISLAND_DARK
    );
    fillPolygonHard(
      buf,
      [[px0 + W * 0.15, py0 + H * 0.8], [px0 + W / 2, py0 + H * 0.2],
       [px0 + W * 0.85, py0 + H * 0.8], [px0 + W / 2, py0 + H * 0.6]],
      MARKING
    );
    fillRectHard(buf, px0 + W / 2 - 1, py0 + H * 0.2, 2, H, ISLAND_DARK); // fuselage
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
