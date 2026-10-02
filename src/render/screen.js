import * as THREE from 'three';

// ARCHITECTURE.md D3: internal render resolution is AB2's true 320x224,
// rendered to a target and upscaled nearest-neighbor to fill the window
// preserving aspect (letterbox). Low-res is the default look, not a toggle
// fallback — chunky pixels are intentional.
export const GAME_W = 320;
export const GAME_H = 224;

export class Screen {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.target = new THREE.WebGLRenderTarget(GAME_W, GAME_H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });
    this.target.texture.colorSpace = THREE.SRGBColorSpace;

    // Blit pass: one unlit quad showing the low-res target, scaled to an
    // integer multiple of 320x224 so every game pixel maps to a crisp block
    // of screen pixels (nearest-neighbor upscale, no shimmer).
    this.blitScene = new THREE.Scene();
    this.blitCamera = new THREE.OrthographicCamera();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: this.target.texture, toneMapped: false });
    this.blitQuad = new THREE.Mesh(geo, mat);
    this.blitScene.add(this.blitQuad);

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.max(1, Math.floor(Math.min(w / GAME_W, h / GAME_H)));
    const pw = GAME_W * scale;
    const ph = GAME_H * scale;

    this.renderer.setSize(w, h, true);

    this.blitCamera.left = -w / 2;
    this.blitCamera.right = w / 2;
    this.blitCamera.top = h / 2;
    this.blitCamera.bottom = -h / 2;
    this.blitCamera.near = -1;
    this.blitCamera.far = 1;
    this.blitCamera.updateProjectionMatrix();
    this.blitQuad.scale.set(pw, ph, 1);
  }

  render(gameScene, gameCamera) {
    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(gameScene, gameCamera);

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(this.blitScene, this.blitCamera);
  }
}
