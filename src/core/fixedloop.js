// Fixed 60Hz timestep loop decoupled from rAF (ARCHITECTURE.md D3). Rendering
// does not interpolate between steps — arcade games didn't. `step(n)` drives
// the same update/render path manually for ?fixed=1 deterministic capture.

export const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25; // clamp to avoid a spiral of death after a stall

export class FixedLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = 0;
    this.simTime = 0;
    this.running = false;
    this._raf = this._raf.bind(this);
  }

  start() {
    this.running = true;
    this.last = performance.now() / 1000;
    requestAnimationFrame(this._raf);
  }

  stop() {
    this.running = false;
  }

  _raf(nowMs) {
    if (!this.running) return;
    const now = nowMs / 1000;
    let frameTime = now - this.last;
    this.last = now;
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;
    this.acc += frameTime;
    while (this.acc >= FIXED_DT) {
      this.update(FIXED_DT, this.simTime);
      this.simTime += FIXED_DT;
      this.acc -= FIXED_DT;
    }
    this.render();
    requestAnimationFrame(this._raf);
  }

  // Manual stepping for ?fixed=1: advance exactly n fixed ticks, then render once.
  step(n = 1) {
    for (let i = 0; i < n; i++) {
      this.update(FIXED_DT, this.simTime);
      this.simTime += FIXED_DT;
    }
    this.render();
  }
}
