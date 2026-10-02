import * as THREE from 'three';

// Canvas-authored pixel art, not shipped/ripped assets (ARCHITECTURE.md D5).
// NearestFilter keeps the blocky look consistent with the 320x224 internal
// render target.
export function makeCanvasSprite(draw, width, height, worldWidth) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const worldHeight = worldWidth * (height / width);
  sprite.scale.set(worldWidth, worldHeight, 1);
  return sprite;
}

// Placeholder F-14, rear/below three-quarter view (reference: afterburner/
// assets/reference/ab2-arcade-desert-explosions.png, ab2-arcade-reload-dorsal.jpg
// — twin canted tails, swept wings, twin engine nozzles with afterburner glow).
export function createJetSprite(worldWidth = 2.0) {
  return makeCanvasSprite(
    (ctx) => {
      const body = '#c3c7cb';
      const bodyDark = '#7d8186';
      const dark = '#26262a';
      const flame = '#ffa83c';
      const flameCore = '#fff0b8';
      const canopy = '#3c4858';

      // Afterburner flames (drawn first, body overlaps the tops of them).
      ctx.fillStyle = flame;
      ctx.fillRect(16, 24, 6, 7);
      ctx.fillRect(26, 24, 6, 7);
      ctx.fillStyle = flameCore;
      ctx.fillRect(18, 26, 2, 4);
      ctx.fillRect(28, 26, 2, 4);

      // Twin canted tails (V-tail).
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(14, 20); ctx.lineTo(8, 4); ctx.lineTo(12, 4); ctx.lineTo(17, 20);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(34, 20); ctx.lineTo(40, 4); ctx.lineTo(36, 4); ctx.lineTo(31, 20);
      ctx.closePath(); ctx.fill();

      // Swept wings.
      ctx.fillStyle = bodyDark;
      ctx.beginPath();
      ctx.moveTo(14, 18); ctx.lineTo(0, 13); ctx.lineTo(0, 17); ctx.lineTo(16, 24);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(34, 18); ctx.lineTo(48, 13); ctx.lineTo(48, 17); ctx.lineTo(32, 24);
      ctx.closePath(); ctx.fill();

      // Fuselage.
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(24, 2); ctx.lineTo(18, 10); ctx.lineTo(16, 26); ctx.lineTo(32, 26); ctx.lineTo(30, 10);
      ctx.closePath(); ctx.fill();

      // Engine nacelle shading + cockpit hint.
      ctx.fillStyle = dark;
      ctx.fillRect(18, 20, 5, 6);
      ctx.fillRect(25, 20, 5, 6);
      ctx.fillStyle = canopy;
      ctx.fillRect(22, 4, 4, 6);
    },
    48,
    32,
    worldWidth
  );
}
