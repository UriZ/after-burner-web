import * as THREE from 'three';
import { GAME_W, GAME_H } from '../../render/viewport.js';

// A transient full-screen overlay (title card, READY/CONTINUE/tally cards):
// its own canvas + CanvasTexture + orthographic scene/camera, exactly the
// pattern src/ui/hud.js already uses for the persistent HUD. Composited by
// screen.js's `overlays` array (R4 addition — see that file) in the same
// low-res pass as the HUD, so it gets identical pixel-art/letterbox
// treatment. Transparent background: these cards draw OVER the live world
// (REFERENCE.md: the tally/continue cards sit over still-scrolling gameplay,
// no opaque backing), except the title screen, which fills black itself.
export class Overlay {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = GAME_W;
    this.canvas.height = GAME_H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const geo = new THREE.PlaneGeometry(GAME_W, GAME_H);
    this.quad = new THREE.Mesh(geo, material);

    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    this.camera = new THREE.OrthographicCamera(
      -GAME_W / 2, GAME_W / 2, GAME_H / 2, -GAME_H / 2, -1, 1
    );
    this.camera.position.z = 1;

    this.visible = false;
  }

  // `draw(ctx, w, h)` is called with the canvas cleared first.
  redraw(draw) {
    this.ctx.clearRect(0, 0, GAME_W, GAME_H);
    draw(this.ctx, GAME_W, GAME_H);
    this.texture.needsUpdate = true;
  }
}
