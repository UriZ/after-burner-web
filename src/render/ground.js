import * as THREE from 'three';

// Stage-1 sea (R1 gap 1) + horizon haze band (R1 gap 8). Both are computed
// in this one shader because the haze band is NOT sky — it is distant
// GROUND fading to pale haze before the vanishing point (REFERENCE.md
// "Horizon": the measured ramp sits BELOW the geometric horizon row, inside
// what is otherwise ground). See stage.js for every cited color/value.
//
// Anisotropic dithered noise replaces the R1 checkerboard (kills R1 gap 1:
// "the ground is a checkerboard, not AB2 terrain"). Perspective still does
// the vanishing-point/scale-growth work for free (ARCHITECTURE.md D2); only
// the per-fragment color now varies with continuous noise instead of a 2-tone
// grid, and `horizonFrac` (passed in from game.js, where camera pitch is the
// single source of truth) lets this shader compute, per fragment, an EXACT
// screen fraction from the real projection — correct under world roll too,
// since it re-derives from the live view/projection matrices every frame
// rather than assuming a fixed screen row.
export function createGround(stage, horizonFrac) {
  const vertexShader = `
    varying vec3 vWorldPos;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPos = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `;
  const fragmentShader = `
    // projectionMatrix is auto-injected into the VERTEX stage by three's
    // ShaderMaterial but not the fragment stage (viewMatrix IS already
    // available here) — declare just this one explicitly so the
    // per-fragment screen-fraction calc below can use the real projection.
    uniform mat4 projectionMatrix;
    uniform float uHueDeg;
    uniform float uSatLo;
    uniform float uSatHi;
    uniform float uVLo;
    uniform float uVHi;
    uniform float uScroll;
    uniform float uFreqX;
    uniform float uFreqZ;
    uniform float uGrainFreqX;
    uniform float uGrainFreqZ;
    uniform vec3 uHazeAtHorizon;
    uniform vec3 uHazeAtBandEdge;
    uniform float uHorizonFrac;
    uniform float uHazeBand;
    varying vec3 vWorldPos;

    // Hash-based bilinear value noise (deterministic, no textures needed).
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        v += amp * valueNoise(p);
        p *= 2.03;
        amp *= 0.5;
      }
      return v;
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      // Anisotropic sampling: independent wavelengths per axis (uFreqX <<
      // uFreqZ) stretch wave bands along world Z, the scroll/travel axis.
      // The world-space ratio here is much larger than the targeted
      // on-screen 2.1-2.3x (REFERENCE.md) because perspective foreshortens
      // depth-axis (Z) features in screen space near the camera — a world
      // ratio near the target measured as the OPPOSITE (cross-track-longer)
      // on a rendered frame; this value was tuned by capturing and
      // re-measuring with tools/measure_ground.py until the on-screen
      // anisotropy actually landed along-track. See dev report.
      vec2 waveP = vec2(vWorldPos.x / uFreqX, (vWorldPos.z + uScroll) / uFreqZ);
      vec2 grainP = vec2(vWorldPos.x / uGrainFreqX, (vWorldPos.z + uScroll) / uGrainFreqZ);
      float wave = fbm(waveP);
      // Independent noise samples (different coordinate offsets into the
      // same hash field) for V/sat/hue, instead of deriving all three from
      // one scalar — a single shared scalar traces only a 1D curve through
      // RGB space no matter how it's reshaped, which measured well short of
      // the >=2000-distinct-color acceptance (1428 measured). Independent
      // channels explore a genuine 3D region of RGB space.
      float grainV = fbm(grainP + 17.3);
      float grainS = fbm(grainP + vec2(97.1, 13.7));
      float grainH = fbm(grainP + vec2(53.3, 71.9));

      float v = mix(uVLo, uVHi, clamp(wave * 0.65 + grainV * 0.35, 0.0, 1.0));
      float sat = mix(uSatLo, uSatHi, grainS);
      float hue = (uHueDeg + (grainH - 0.5) * 14.0) / 360.0; // +/-7deg jitter
      vec3 sea = hsv2rgb(vec3(hue, sat, v));

      // Exact per-fragment screen fraction from the live projection — holds
      // under world roll since it re-derives every frame, not a cached row.
      vec4 clip = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
      float ndcY = clip.y / clip.w;
      float screenFrac = (1.0 - ndcY) * 0.5;
      float h = max(screenFrac - uHorizonFrac, 0.0);
      float band = clamp(h / uHazeBand, 0.0, 1.0);

      // Color ramps smoothly across the whole band (horizon-side ->
      // band-edge-side); the MIX with normal sea stays ~1 (full haze) until
      // the last quarter of the band, then falls fast — the measured "hard
      // edge" drop into resolved water, not another long fade.
      vec3 hazeColor = mix(uHazeAtHorizon, uHazeAtBandEdge, smoothstep(0.0, 1.0, band));
      float hazeMix = 1.0 - smoothstep(0.72, 1.0, band);
      vec3 color = mix(sea, hazeColor, hazeMix);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uHueDeg: { value: stage.sea.hueDeg },
      uSatLo: { value: stage.sea.satLo },
      uSatHi: { value: stage.sea.satHi },
      uVLo: { value: stage.sea.vLo },
      uVHi: { value: stage.sea.vHi },
      uScroll: { value: 0 },
      // Both octaves' world wavelengths are picked from the camera's actual
      // world-units-per-native-pixel scale at the near-field measurement
      // depth (screenFrac~0.85: 0.0457 w.u./px horizontal, 0.1895 w.u./px
      // vertical — a 4.14x ratio from perspective alone, derived
      // numerically, see dev report), targeting explicit SCREEN-PIXEL
      // wavelengths (X:Z = 1:2.2, REFERENCE.md's measured ratio) rather than
      // a world-space ratio directly: a world-space ratio alone measured
      // BACKWARDS on a captured frame (perspective does not scale both axes
      // the same way) and sub-2px world wavelengths aliased into
      // uncorrelated per-pixel noise (measured anisotropy 1.00, no
      // structure at all) before this fix.
      uFreqX: { value: 1.372 },  // wave: 30px/cycle horizontal
      uFreqZ: { value: 14.781 }, // wave vertical, tuned (see dev report)
      // Fine dither grain — pushes distinct-color count and keeps any
      // single color's palette share down (R1 gap 1 acceptance: >=2000
      // colors, top-8 share <=0.60).
      uGrainFreqX: { value: 0.366 }, // grain: 8px/cycle horizontal
      uGrainFreqZ: { value: 3.941 }, // grain vertical, tuned (see dev report)
      uHazeAtHorizon: { value: stage.haze.atHorizon },
      uHazeAtBandEdge: { value: stage.haze.atBandEdge },
      uHorizonFrac: { value: horizonFrac },
      uHazeBand: { value: stage.haze.bandHeightFrac },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });

  const geometry = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    update(dt, scrollSpeed) {
      // MINUS, not plus: a noise feature sampled at (worldPos.z + uScroll)
      // tracks world position z=Z0-scrollSpeed*dt over one tick when uScroll
      // INCREASES (kinematics: for the same noise value to reappear,
      // Z1+uScroll(t+dt) = Z0+uScroll(t) => Z1 = Z0-dScroll). The camera
      // looks toward -Z, so more-negative Z is FARTHER away — a plus here
      // makes a tracked feature's Z decrease, i.e. recede, not approach.
      // NOTE: this is the analytical derivation only — the empirical
      // cross-frame flow check (tools/measure_flow.py) could NOT confirm
      // the direction either way (periodic texture aliases the
      // cross-correlation into a dominant peak offset by roughly half the
      // grain wavelength regardless of sign; magnitude is reliable,
      // direction isn't, from that instrument). Re-verify once a discrete,
      // non-periodic landmark (e.g. an island) exists to track unambiguously.
      material.uniforms.uScroll.value -= dt * scrollSpeed;
    },
  };
}
