import * as THREE from 'three';
import { Screen, GAME_W, GAME_H } from '../render/screen.js';
import { createSky } from '../render/sky.js';
import { createGround } from '../render/ground.js';
import { Player } from '../entities/player.js';
import { Input } from '../core/input.js';
import { FixedLoop } from '../core/fixedloop.js';
import { STAGE_1 } from './stage.js';

const FOV_DEG = 55;
const CAMERA_HEIGHT = 2.2;
// Pitch solved from the perspective horizon relation tan(pitch)/tan(vFov/2)
// = 1 - 2*targetScreenFraction, targeting a horizon ~1/3 down from the top
// per ARCHITECTURE.md D2 ("horizon in upper third during level flight").
// Verify against assets/reference/ab2-arcade-coastal-banking.jpg and correct
// empirically — this is a closed-form starting point, not a measurement.
const CAMERA_PITCH = -0.172; // radians, ~-9.9deg, looking down

export class Game {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV_DEG, GAME_W / GAME_H, 0.1, 2000);
    this.camera.position.set(0, CAMERA_HEIGHT, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = CAMERA_PITCH;
    this.scene.add(this.camera);

    this.screen = new Screen(canvas);
    this.sky = createSky(this.camera, STAGE_1);
    this.ground = createGround(STAGE_1);
    this.scene.add(this.ground.mesh);

    this.player = new Player({ baseY: CAMERA_HEIGHT - 1.1, baseZ: -5 });
    this.scene.add(this.player.sprite);

    this.input = new Input();
    this.loop = new FixedLoop(
      (dt, simTime) => this.update(dt, simTime),
      () => this.render()
    );
  }

  update(dt, simTime) {
    const inputState = this.input.state(simTime);
    this.player.update(dt, inputState);
    this.ground.update(dt, STAGE_1.scrollSpeed);
  }

  render() {
    this.screen.render(this.scene, this.camera);
  }

  start() {
    this.loop.start();
  }

  step(n) {
    this.loop.step(n);
  }
}
