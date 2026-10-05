// Isolated test harness for clouds.js (gap 8) — NOT part of the shipped
// game, lives entirely under tools/ which this developer owns. Mirrors
// game.js's camera/sky/ground setup (duplicated, not imported — avoids any
// dependency on game.js while combat-dev is mid-build on it this round) so
// clouds can be measured against a realistic frame before the real
// game.js wiring lands. Served by the same Vite dev server as the real
// game (tools/clouds-preview.html), driven by tools/capture.mjs exactly
// like the real index.html (?fixed=1&seed=N, window.__step).
import * as THREE from 'three';
import { Screen, GAME_W, GAME_H } from '../src/render/screen.js';
import { createSky } from '../src/render/sky.js';
import { createGround } from '../src/render/ground.js';
import { createClouds } from '../src/render/clouds.js';
import { FixedLoop } from '../src/core/fixedloop.js';
import { STAGE_1, STAGES } from '../src/game/stage.js';

const FOV_DEG = 55;
const CAMERA_HEIGHT = 2.2;
const CAMERA_PITCH = 0.12941440818613054; // duplicated from game.js, see clouds.js header

const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? Number(params.get('seed')) : 1;
// ?stage=2 / ?stage=3: R4 stage-progression verification (tests
// ground.js/sky.js's setStage() live-switch path, not just construction
// with a different stage object from the start).
const stageNum = params.has('stage') ? Number(params.get('stage')) : 1;
const stage = STAGES[Math.max(0, Math.min(STAGES.length - 1, stageNum - 1))] || STAGE_1;

const canvas = document.getElementById('screen');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV_DEG, GAME_W / GAME_H, 0.1, 2000);
camera.position.set(0, CAMERA_HEIGHT, 0);
camera.rotation.order = 'YXZ';
camera.rotation.x = CAMERA_PITCH;
scene.add(camera);

const screen = new Screen(canvas);
const sky = createSky(camera, STAGE_1);
const ground = createGround(STAGE_1, 0.625);
scene.add(ground.mesh);
if (stage !== STAGE_1) {
  // Exercises the live setStage() path, not just construction-time
  // selection — this is what gameflow-dev's stage transitions will do.
  sky.setStage(stage);
  ground.setStage(stage);
}
const clouds = createClouds(STAGE_1, camera, seed);
// Clouds are stage-tinted too (CLOUD_PALETTES). The real game does NOT yet
// call this — src/game/flow/flow.js switches sky and ground but not clouds,
// and that file belongs to another lane this round; see judging/R5/ask-world.md.
if (stage !== STAGE_1) clouds.setStage(stage);
scene.add(clouds.group);

const loop = new FixedLoop(
  (dt) => {
    ground.update(dt, stage.scrollSpeed);
    clouds.update(dt);
  },
  () => screen.render(scene, camera)
);

if (params.has('fixed')) {
  window.__step = (n = 1) => loop.step(n);
  screen.render(scene, camera);
  window.__frameReady = true;
} else {
  loop.start();
}
