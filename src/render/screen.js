import * as THREE from 'three';
import { Hud } from '../ui/hud.js';
import { GAME_W, GAME_H } from './viewport.js';

// ARCHITECTURE.md D3: internal render resolution is AB2's true 320x224,
// rendered to a target and upscaled nearest-neighbor to fill the window
// preserving aspect (letterbox). Low-res is the default look, not a toggle
// fallback — chunky pixels are intentional.
export { GAME_W, GAME_H };

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

    // Screen-space HUD overlay (gap 4), composited into the low-res target
    // AFTER the game scene, via its own orthographic camera so it never
    // rotates with world roll (REFERENCE.md: "The HUD does not rotate").
    // Owned entirely by this file + src/ui/hud.js — no change to game.js's
    // existing `screen.render(this.scene, this.camera)` call site needed.
    this.hud = new Hud();

    // R4 game-flow addition: transient full-screen overlays (title card,
    // READY/CONTINUE/tally cards) composited into the same low-res pass,
    // after the HUD and before the final blit, so they get the identical
    // pixel-art/letterbox treatment. Each entry is `{ scene, camera }` built
    // the same way Hud is (own orthographic camera, own CanvasTexture quad —
    // see src/game/flow/overlay.js). Empty by default; existing callers of
    // render() are unaffected.
    this.overlays = [];

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

  // `worldRoll` (radians) is OPTIONAL and defaults to 0, same pattern as
  // player.js's update(): it only feeds the reticle's attitude line
  // (GAME_SPEC.md §3), everything else in the HUD is structurally
  // roll-invariant regardless of this argument. Call-site change needed in
  // game.js once combat-dev wants the line live:
  //   this.screen.render(this.scene, this.camera, this.worldRoll);
  render(gameScene, gameCamera, worldRoll = 0) {
    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(gameScene, gameCamera);

    // HUD pass: same target, no clear, so the world shows through wherever
    // the HUD canvas is transparent (REFERENCE.md: "drawn over the game
    // with no opaque bar").
    this.hud.redraw(worldRoll);
    this.renderer.autoClear = false;
    this.renderer.render(this.hud.scene, this.hud.camera);
    for (const o of this.overlays) {
      if (o.visible === false) continue;
      this.renderer.render(o.scene, o.camera);
    }
    this.renderer.autoClear = true;

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(this.blitScene, this.blitCamera);
  }
}
