import * as THREE from 'three';
import { drawText, textWidth } from './font.js';
import { GAME_W, GAME_H } from '../render/viewport.js';

// HUD overlay (gap 4). All bounding boxes and colors below are converted
// from REFERENCE.md's "HUD (686x480 coordinates)" table, measured on
// reference/stage1-level-flight-t116.png, reference/carrier-prelaunch-t84.png
// and reference/stage2-flight-t140.png. Conversion: 320/686 = 0.466472 (x),
// 224/480 = 0.466667 (y) — the two scale factors agree to 3 decimal places,
// so the HUD table's layout proportions carry over directly.
const SX = GAME_W / 686;
const SY = GAME_H / 480;
const R = (x0, y0, x1, y1) => ({
  x0: Math.round(x0 * SX),
  y0: Math.round(y0 * SY),
  x1: Math.round(x1 * SX),
  y1: Math.round(y1 * SY),
});

// REFERENCE.md HUD table, one row per const:
const BB_SCORE_EMBLEM = R(36, 34, 151, 49); // red #d32716
const BB_SCORE_DIGITS = R(224, 35, 305, 48); // pale yellow #fff4ae
const BB_HIT_EMBLEM = R(346, 34, 407, 49); // red #d32716
const BB_HIT_DIGITS = R(432, 36, 455, 48); // pale yellow #fff4ae
const BB_RETICLE = R(508, 52, 624, 101); // white >=#b0b0b0 frame, amber dot #ffcd21
const BB_SPEED_LABEL = R(37, 431, 89, 441); // dark red on grey plate
const BB_THROTTLE_BAR = R(100, 430, 221, 443); // blue #338bf7 fill, amber #f2c56c chevron
const BB_STAGE_TEXT = R(292, 428, 351, 443); // red #c53428
const BB_STAGE_DIGIT = R(376, 426, 414, 450); // cream #d4b886
const BB_MISSILES = R(421, 427, 536, 472); // white body, red tips

const RED = '#d32716';
const PALE_YELLOW = '#fff4ae';
const WHITE = '#e8e8e8';
const AMBER = '#ffcd21';
const DARK_RED = '#8b2010'; // REFERENCE.md: "dark red", no hex given — chosen from the same red family as SCORE/STAGE
const BLUE = '#338bf7';
const AMBER_CHEVRON = '#f2c56c';
const STAGE_RED = '#c53428';
const CREAM = '#d4b886';
const MISSILE_BODY = '#ffffff';
// REFERENCE.md gives no hex for the missile tip, only "red tips" — reuse
// the one red hex the doc DOES cite (SCORE/HIT emblem) rather than invent
// an uncited color.
const MISSILE_TIP = RED;

function drawEmblem(ctx, bb, text) {
  const { x0, y0, x1, y1 } = bb;
  const w = x1 - x0;
  const h = y1 - y0;
  // Ribbon body, inset 1px top/bottom to leave room for wing flares.
  ctx.fillStyle = RED;
  ctx.fillRect(x0, y0 + 1, w, h - 2);
  // Winged flares at both ends (small triangular wedges), per the arcade
  // emblem's "winged" look (see stage1-level-flight-t116.png top-left).
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 1); ctx.lineTo(x0 - 3, y0); ctx.lineTo(x0, y0 + 3);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0, y1 - 1); ctx.lineTo(x0 - 3, y1); ctx.lineTo(x0, y1 - 3);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x1, y0 + 1); ctx.lineTo(x1 + 3, y0); ctx.lineTo(x1, y0 + 3);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x1, y1 - 1); ctx.lineTo(x1 + 3, y1); ctx.lineTo(x1, y1 - 3);
  ctx.closePath(); ctx.fill();
  // Label, white, vertically centered-ish inside the ribbon.
  drawText(ctx, text, x0 + 2, y0 + 1, WHITE, 1);
}

function drawReticle(ctx, bb) {
  const cx = (bb.x0 + bb.x1) / 2;
  const cy = (bb.y0 + bb.y1) / 2;
  const sq = (bb.y1 - bb.y0) * 0.78; // square bracket box, inscribed in the outer bbox height
  const half = sq / 2;
  const armX0 = cx - half;
  const armX1 = cx + half;
  const armY0 = cy - half;
  const armY1 = cy + half;
  const arm = 4; // corner bracket arm length
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Four L-shaped corner brackets.
  ctx.moveTo(armX0, armY0 + arm); ctx.lineTo(armX0, armY0); ctx.lineTo(armX0 + arm, armY0);
  ctx.moveTo(armX1 - arm, armY0); ctx.lineTo(armX1, armY0); ctx.lineTo(armX1, armY0 + arm);
  ctx.moveTo(armX0, armY1 - arm); ctx.lineTo(armX0, armY1); ctx.lineTo(armX0 + arm, armY1);
  ctx.moveTo(armX1 - arm, armY1); ctx.lineTo(armX1, armY1); ctx.lineTo(armX1, armY1 - arm);
  ctx.stroke();
  // Short side ticks just outside the brackets (wider horizontally than
  // vertically, matching the outer bbox being wider than the square) — NOT
  // full-width crosshair lines (that read as a cross, not AB2's reticle).
  const tick = 6;
  ctx.beginPath();
  ctx.moveTo(armX0 - 2, cy); ctx.lineTo(armX0 - 2 - tick, cy);
  ctx.moveTo(armX1 + 2, cy); ctx.lineTo(armX1 + 2 + tick, cy);
  ctx.moveTo(cx, armY0 - 2); ctx.lineTo(cx, armY0 - 2 - tick * 0.6);
  ctx.moveTo(cx, armY1 + 2); ctx.lineTo(cx, armY1 + 2 + tick * 0.6);
  ctx.stroke();
  // Center dot, amber in neutral state (red when locking — no lock state
  // modeled yet this round).
  ctx.fillStyle = AMBER;
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function drawThrottleBar(ctx, bb, fraction) {
  const w = bb.x1 - bb.x0;
  const h = bb.y1 - bb.y0;
  ctx.strokeStyle = '#4a4a4a';
  ctx.strokeRect(bb.x0 + 0.5, bb.y0 + 0.5, w - 1, h - 1);
  const fillW = Math.round((w - 2) * fraction);
  ctx.fillStyle = BLUE;
  ctx.fillRect(bb.x0 + 1, bb.y0 + 1, fillW, h - 2);
  // Amber chevron marker at the current-speed position.
  const chevX = bb.x0 + 1 + fillW;
  ctx.fillStyle = AMBER_CHEVRON;
  ctx.beginPath();
  ctx.moveTo(chevX, bb.y0); ctx.lineTo(chevX + 2, bb.y0 + h / 2); ctx.lineTo(chevX, bb.y1);
  ctx.closePath(); ctx.fill();
}

function drawMissiles(ctx, bb, count) {
  const slots = 8;
  const gap = (bb.x1 - bb.x0) / slots;
  for (let i = 0; i < slots; i++) {
    const x = bb.x0 + i * gap;
    if (i < Math.min(count, 4)) {
      // Large icon: thin white body + red nose triangle.
      ctx.fillStyle = MISSILE_BODY;
      ctx.fillRect(x, bb.y1 - 14, 2, 10);
      ctx.fillStyle = MISSILE_TIP;
      ctx.beginPath();
      ctx.moveTo(x, bb.y1 - 14); ctx.lineTo(x + 1, bb.y1 - 18); ctx.lineTo(x + 2, bb.y1 - 14);
      ctx.closePath(); ctx.fill();
    } else if (i < count) {
      // Remainder as small tick marks.
      ctx.fillStyle = MISSILE_BODY;
      ctx.fillRect(x, bb.y1 - 4, 1, 4);
    }
  }
}

// Screen-space HUD, composited after the world (src/render/screen.js) via
// its own orthographic camera — it is never parented under the game
// camera, so it cannot inherit world roll by construction
// (REFERENCE.md: "The HUD does not rotate"). No altitude element
// (ARCHITECTURE.md D7 corrected this round).
export class Hud {
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

    // Placeholder game state (no scoring/stage/weapon systems exist yet —
    // wired here so real systems can assign into `this.state` and call
    // `redraw()` once they land, per the round-2 task scope).
    this.state = { score: 0, hit: 0, stage: 1, missiles: 8, throttle: 'M', throttleFraction: 0.55 };
    this.redraw();
  }

  redraw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_W, GAME_H);

    drawEmblem(ctx, BB_SCORE_EMBLEM, 'SCORE');
    const scoreStr = String(this.state.score).padStart(6, '0');
    const scoreW = textWidth(scoreStr);
    drawText(ctx, scoreStr, BB_SCORE_DIGITS.x1 - scoreW, BB_SCORE_DIGITS.y0, PALE_YELLOW, 1);

    drawEmblem(ctx, BB_HIT_EMBLEM, 'HIT');
    const hitStr = String(this.state.hit);
    const hitW = textWidth(hitStr);
    drawText(ctx, hitStr, BB_HIT_DIGITS.x1 - hitW, BB_HIT_DIGITS.y0, PALE_YELLOW, 1);

    drawReticle(ctx, BB_RETICLE);

    drawText(ctx, 'SPEED', BB_SPEED_LABEL.x0, BB_SPEED_LABEL.y0, DARK_RED, 1);
    // Only 5px (42-47) between the SPEED label and the throttle bar's
    // measured x0 — a 3px glyph at x1+1 just clears the bar with no overlap
    // (R1 self-review caught this at x1+3, which the bar painted over).
    drawText(ctx, this.state.throttle, BB_SPEED_LABEL.x1 + 1, BB_SPEED_LABEL.y0, CREAM, 1);
    drawThrottleBar(ctx, BB_THROTTLE_BAR, this.state.throttleFraction);

    drawText(ctx, 'STAGE', BB_STAGE_TEXT.x0, BB_STAGE_TEXT.y0, STAGE_RED, 1);
    drawText(ctx, String(this.state.stage), BB_STAGE_DIGIT.x0, BB_STAGE_DIGIT.y0 + 2, CREAM, 2);

    drawMissiles(ctx, BB_MISSILES, this.state.missiles);

    this.texture.needsUpdate = true;
  }
}
