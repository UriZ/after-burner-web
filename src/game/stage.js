import * as THREE from 'three';

// VERIFIED arcade stage 1 (ocean/coastal opener). Source: the Godot prototype
// ../afterburner/scripts/stage/stage_data.gd, first STAGES entry (line 460):
//   sky_top = sky_horizon = Color(0.000, 0.624, 1.000)   -> flat fill, no glow
//   ground_a = Color(0.000, 0.077, 0.925)                -> deep water
//   ground_accent = Color(0.000, 0.514, 0.000, 1.0)       -> coastline green
//   scroll_speed = 2.800
// That file's horizon_fraction (0.625) is a parameter of its 2D depth-hack
// renderer (screen_y = horizon_y + d^2*span) and does not port directly to a
// true perspective camera's horizon position — see README "Deviations".
//
// Godot Color() components and this project's ShaderMaterial uniforms are
// both display-referred (sRGB) values. THREE.Color's plain (r,g,b) ctor does
// NOT apply an sRGB->linear conversion, so under three's default color
// management the values get reinterpreted as already-linear and render too
// bright/washed out (0,0.624,1.0 rendered as #00cfff instead of #009fff on
// screen). .setRGB(..., THREE.SRGBColorSpace) does the conversion correctly.
function srgb(r, g, b) {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

export const STAGE_1 = {
  name: 'stage-1-ocean',
  skyTop: srgb(0.0, 0.624, 1.0),
  skyHorizon: srgb(0.0, 0.624, 1.0),
  groundA: srgb(0.0, 0.077, 0.925),
  groundAccent: srgb(0.0, 0.514, 0.0),
  scrollSpeed: 2.8,
};
