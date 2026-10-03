import * as THREE from 'three';

// Canvas-authored pixel-art textures for the combat subsystems (enemies,
// weapons, effects). ARCHITECTURE.md D5: original art, authored at load
// time, never ripped.
//
// Why this exists alongside render/spriteFactory.js's `makeCanvasSprite`:
// that helper builds a canvas, a texture AND a sprite together, which is
// right for the one-off player jet but wrong for pooled objects. Vulcan
// rounds, missile trail puffs and enemy shots run to hundreds of live
// instances; each needs its own Sprite but they must SHARE one texture or
// we re-upload the same 16x16 canvas hundreds of times. So: author the
// texture once (`makePixelTexture`), then stamp cheap billboards off it
// (`makeBillboard`). spriteFactory.js is jethud-dev's file this round and
// is not modified.
// `hardAlpha` thresholds every texel's alpha to 0 or 255 after drawing.
//
// canvas2d antialiases paths and there is no way to turn that off, so an
// arc- or polygon-drawn sprite comes out with a rim of half-transparent
// texels. On a 1987 arcade sprite that rim does not exist, and it is not
// cosmetic: those texels alpha-blend with whatever is behind them, so an
// explosion's outline samples as orange-mixed-with-sky. That is what put
// blue-grey values (#7878be, #3598f4) into the explosion's measured dark
// percentiles while its interior was correctly saturated. Thresholding
// gives the chunky hard edge the look wants AND makes a colour measurement
// of the sprite a measurement of the sprite.
export function makePixelTexture(draw, width, height, { hardAlpha = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);

  if (hardAlpha) {
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
    ctx.putImageData(img, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  // Aspect is carried on the texture so billboards stamped from it keep the
  // authored proportions without every call site repeating the numbers.
  texture.userData.aspect = height / width;
  return texture;
}

// A camera-facing quad (THREE.Sprite) off a shared texture.
//
// `depthWrite: false` on everything here: these are additive-looking
// overlapping transparent elements (explosion lobes, smoke puffs, tracer
// puffs) and a depth-writing transparent sprite punches a hole in whatever
// transparent thing is drawn behind it afterwards. depthTest stays ON so
// the world (opaque ground) still occludes correctly.
export function makeBillboard(texture, worldWidth, { depthTest = true } = {}) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest,
    depthWrite: false,
    // toneMapped:false keeps the authored sRGB hexes landing on screen as
    // the measured values (same reason screen.js sets it on the blit quad).
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = texture.userData.aspect ?? 1;
  sprite.scale.set(worldWidth, worldWidth * aspect, 1);
  return sprite;
}

// Converts a value authored as a DISPLAY (sRGB) grey into the renderer's
// linear working space.
//
// Needed anywhere a brightness is written numerically rather than as a hex
// string — `Color.setScalar()` and vertex-colour buffers both land in the
// working space unconverted, while `Color.set('#rrggbb')` is sRGB-decoded
// for you. Getting this wrong is invisible in code review and subtle on
// screen: it only brightens the DARK end, so a trail authored to taper
// 1.00 -> 0.24 rendered as 1.00 -> 0.52 and its measured bright/dark
// quintile ratio came out 1.9 against an authored 4.2. The tell was that
// pushing the authored dark end down barely moved the measurement.
// (The R2 report flagged the same class of bug in ground.js, where the
// shader writes gl_FragColor directly: "authored HSV values are
// re-brightened on the way out".)
const _conv = new THREE.Color();
export function srgbScalar(v) {
  _conv.setRGB(v, v, v, THREE.SRGBColorSpace);
  return _conv.r;
}
