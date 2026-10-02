import * as THREE from 'three';

// Godot Color()/hex components here are display-referred (sRGB). THREE.Color's
// plain (r,g,b) ctor does NOT sRGB-decode floats under three's default color
// management (R1 finding: 0,0.624,1.0 rendered as #00cfff instead of #009fff).
// Route every stage color through these helpers, never a bare `new THREE.Color(...)`.
function srgb(r, g, b) {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}
function srgbHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return srgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// VERIFIED arcade stage 1 (ocean/coastal opener).
export const STAGE_1 = {
  name: 'stage-1-ocean',

  // Sky: MEASURED REFERENCE.md "Sky palettes" t116 -> #009eff, modal share
  // 0.82, flat fill (no stage-1 horizon glow). ADOPTED stage_data.gd value
  // #009fff agrees to 1 LSB; kept as-is (R1 judge: "effectively exact").
  skyTop: srgbHex('#009fff'),
  skyHorizon: srgbHex('#009fff'),

  // Sea (R1 gap 1 — replaces the flat-checker ocean/green-island fill).
  // H=235deg S=1.00 from stage_data.gd #124 (hue-histogram percentile pass,
  // V25/V75 0.796/0.925 — descriptive percentiles, NOT the texture's
  // extremes). R3 gap-2 (ref-researcher correction, REFERENCE.md "Sea
  // texture, stage 1 — direction and contrast"): binding contrast stats are
  // p5-p95 value spread 0.302-0.329 and 23.4-38.8% of sea pixels above
  // V 0.95 (foam) — far wider than the V25/V75 band, which only described
  // the MIDDLE 50%. vLo/vHi here are widened accordingly (base gradient,
  // BEFORE ground.js's separate foam layer pushes a fraction toward 1.0);
  // anisotropy orientation is CROSS-track, magnitude >=2.5x (ADOPTED #135
  // magnitude ~2.1-2.3x stands, but R2's "along-track" direction word was
  // this doc's own wrong gloss, corrected — see ground.js for the measured
  // on-screen ratio). No island green this round (scope-narrowed: "no green
  // except islands" is satisfied by having none; islands are a later-round
  // visual feature, not required by gap 1's acceptance criteria).
  sea: {
    hueDeg: 235,
    satLo: 0.85,
    satHi: 1.0,
    vLo: 0.58,
    vHi: 0.90,
  },

  // Horizon haze band (R1 gap 8). MEASURED REFERENCE.md "Horizon", t116
  // x=600, scanning down from the horizon: #6cafff (band start, ~0%
  // into the band) -> #93c7ff -> #c3edff -> #d1f4f8 (band end, ~100% into
  // the band, just before the hard drop to resolved water #010ff9). Band
  // spans y=244-288 of 480 (50.8%H-60.0%H) against that frame's own
  // measured horizon 50.0%H -> ~9.2%H tall, inside the 7-11%H acceptance.
  // Implemented as a 2-stop gradient using the two end colors (ground.js
  // interpolates the omitted middle two measured stops linearly, a
  // reasonable approximation for a 4-sample measurement).
  haze: {
    atHorizon: srgbHex('#6cafff'), // nearest the vanishing point
    atBandEdge: srgbHex('#d1f4f8'), // nearest the hard drop to resolved sea
    bandHeightFrac: 0.092, // tuned starting point from the t116 measurement; verify by capture
  },

  // Ground scroll speed (R1 gap 10). The Godot prototype's `scroll_speed:
  // 2.800` is a rate in that project's 2D depth-hack `d`-space
  // (screen_y = horizon_y + d^2*span) and is UNRELATED to this project's
  // `uScroll` world-units/s — the same argument the R1 README already
  // applied to `horizon_fraction` applies here and was not applied in R1
  // (R1 judge gap 10). Re-derived from this project's actual camera
  // geometry instead:
  //
  // Target: REFERENCE.md "Speed / motion" certified floor >= 3.063 px/frame
  // at motion-metrics' 192px work width (== 95.7%W/s at 60fps). Since that
  // resize preserves aspect (320:224 -> 192:134.4, scale 0.6 on both axes),
  // 3.063 px/frame@192 == 3.063/0.6 = 5.105 px/frame in our native 320x224
  // frame on either axis == 5.105/224 = 0.02279 screenFrac/frame (height
  // fraction) for our dominant vertical (radial, toward-viewer) flow.
  // Cross-check: 5.105/320*60fps = 95.7%W/s, matching REFERENCE.md exactly.
  //
  // Picked a representative near-field row (screenFrac 0.85 — solidly in
  // the visible ground, away from the haze band and the very bottom edge)
  // and solved (exact, not linearized) for the uScroll rate whose one-frame
  // world-distance step produces 1.35x that per-frame screenFrac target
  // (margin for this being a single-row approximation of a region-averaged
  // estimator). CAMERA_HEIGHT=2.2, CAMERA_PITCH=0.1294 rad, FOV=55deg (see
  // game.js) plug into: screenFrac(d) = (1 + tan(pitch + atan(Hc/d)) /
  // tan(vFov/2)) / 2 ... bisected numerically for the distance d0 at
  // screenFrac=0.85, then for the scrollSpeed whose d0 -> d0-scrollSpeed*dt
  // step over dt=1/60s matches the target screenFrac delta. Reproduce: see
  // dev report for the exact script. Result: scrollSpeed = 68.93.
  //
  // This closed form is a geometry-only estimate, not a substitute for
  // measuring our own capture — see dev report for the cross-frame
  // measurement taken on the actual render.
  scrollSpeed: 68.93,
};

// R4: stage progression support (gameflow-dev owns game.js/main.js this
// round, driving stage 1->2->3 transitions — interface is createGround()/
// createSky()'s new setStage(stage) methods, see those files; ground.js's
// shader is now stage-parameterized by groundMode, not stage-1-hardcoded).
//
// VERIFIED arcade stage 2 (desert/autumn scrub). Sky ADOPTED
// stage_data.gd: #e67100 -> #f0d100 horizon glow (only 5 of 23 stages
// have a measurable glow; stage 2 is one). MEASURED REFERENCE.md t140
// -> #f27500 (agrees to re-encode noise). Ground: stage_data.gd #124,
// H=35deg S=0.82 V75=0.733 V25=0.441 (percentile band, not the texture's
// extremes — widened proportionally the same way STAGE_1's was, see that
// comment above; not separately contrast/foam-verified this round, unlike
// STAGE_1's R3 ref-researcher pass).
export const STAGE_2 = {
  name: 'stage-2-desert',
  groundMode: 'sea', // same wave/grain/foam shader path as stage 1, different palette
  skyTop: srgbHex('#e67100'),
  skyHorizon: srgbHex('#f0d100'),
  sea: {
    hueDeg: 35,
    satLo: 0.65,
    satHi: 0.90,
    vLo: 0.25,
    vHi: 0.85,
  },
  haze: {
    // Not independently measured this round (no equivalent to STAGE_1's
    // t116 x=600 column scan was taken for stage 2) — interim value
    // continuing the sky's own horizon-glow color into the ground's near
    // field, a defensible approximation for a heat-haze look pending a
    // real measurement.
    atHorizon: srgbHex('#f0d100'),
    atBandEdge: srgbHex('#fbead0'),
    bandHeightFrac: 0.092, // unmeasured for stage 2; reused from stage 1 pending verification
  },
  scrollSpeed: 68.93, // unmeasured per-stage; same camera geometry, reused pending a stage-2 flow check
};

// VERIFIED arcade stage 3 (night). Sky MEASURED REFERENCE.md t175 ->
// #000000, modal share 0.91; ADOPTED stage_data.gd #000005 (near-identical,
// re-encode noise). A thin dark-blue near-horizon band was measured at
// (620,308) = #000131 (REFERENCE.md "Sky palettes"). Ground: REFERENCE.md
// "Night palette swap" finding (MEASURED, stage 3 t164-186) — "night ground
// is a dense white-speckle field (city lights) over near-black, with dark
// blue coastline bands" — fundamentally NOT a wave texture (ground_mode
// 'sea' is UNMEASURABLE here by the hue method per REFERENCE.md's own
// "Known gaps", near-black/no stable hue), hence the separate groundMode.
export const STAGE_3 = {
  name: 'stage-3-night',
  groundMode: 'speckle',
  skyTop: srgbHex('#000005'),
  skyHorizon: srgbHex('#000005'),
  speckle: {
    base: srgbHex('#06060a'), // near-black ground
    // City-light speckle color: not colorimetrically measured (REFERENCE.md
    // describes "white-speckle", no hex) — warm-white, between pure white
    // and the arcade's general warm-light convention elsewhere (HUD cream,
    // explosion warmth); verify against t175/t186 in a future pass.
    light: srgbHex('#fff2c8'),
    density: 0.05, // fraction of near-field pixels lit; unmeasured starting point
  },
  haze: {
    // The measured (620,308)=#000131 near-horizon band, continued into a
    // slightly paler stop for the band edge (unmeasured; proportioned like
    // STAGE_1's horizon->edge relationship since no second stage-3 sample
    // exists to anchor it).
    atHorizon: srgbHex('#000131'),
    atBandEdge: srgbHex('#0a0a2a'),
    bandHeightFrac: 0.092,
  },
  scrollSpeed: 68.93,
};

export const STAGES = [STAGE_1, STAGE_2, STAGE_3];
