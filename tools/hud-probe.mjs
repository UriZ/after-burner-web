// Isolation harness for the HUD's AUTHORED CANVAS (CLAUDE.md: "isolation
// harnesses beat in-situ measurement"; "measure the authored canvas, or the
// subject alone, before measuring it in a live frame full of dither,
// enemies, and haze").
//
// WHY THIS EXISTS. R6's whole-frame Criterion A2 gate (<=32 distinct channel
// values, union over RGB) was failing on 2 of 19 stage-1 frames, and the
// world lane localised the excursion to the reticle box. In a live frame you
// cannot tell a HUD pixel from the sea pixel behind it: the HUD is composited
// with alpha blending (screen.js: MeshBasicMaterial transparent:true), so a
// HUD pixel at partial alpha arrives on screen as an arbitrary blend of an
// authored colour and whatever the world put there. The channel values that
// appear are therefore a property of the PAIR, and chasing them in situ means
// chasing a different set of near-greys every tick.
//
// Here there is no world. The real `Hud` instance draws onto its own canvas
// and that canvas IS #screen, so what is measured is exactly the RGBA the
// compositor would receive. Two defects are then directly visible and
// separable:
//   1. any pixel with 0 < alpha < 255  -> antialiasing. The arcade's HUD is
//      1-bit coverage on a fixed palette; it has no mechanism for this.
//   2. any fully-opaque pixel whose RGB is not in HUD_PALETTE -> an
//      unauthored colour, whatever produced it.
//
// Usage (both drive the same page):
//   node tools/hud_palette_probe.mjs            # numbers, in-page, no PNG
//   node tools/capture.mjs --out <dir> --page /tools/hud-probe.html \
//        --frames 12 --url-params "sweep=roll"  # PNGs with alpha preserved
//
// Query params:
//   roll=<deg>   fixed reticle attitude-line angle (default 0)
//   sweep=roll   __step(n) advances the angle; see ROLL_SWEEP below
//   state=<name> HUD state variant (see STATES); default `flight`
//   bg=RRGGBB    paint an opaque backdrop first (default: none, keep alpha)
//   throttle=<f> override throttleFraction, for the arcade-consensus diff:
//                reference/ab2-arcade-desert.png fills the bar to x96, and
//                drawThrottleBar's end is `56 + round(71*f)`, so f = 0.5634
//                reproduces the arcade's own fill extent. Without this the
//                comparison would be scoring OUR throttle setting against
//                THEIRS and reading the difference as a bitmap error.
import { Hud, HUD_PALETTE } from '../src/ui/hud.js';

const params = new URLSearchParams(location.search);

const hud = new Hud();
// The Hud's OWN canvas becomes #screen. No drawImage copy: a copy is a
// second compositing step and could itself change alpha, which is the exact
// quantity under measurement.
const placeholder = document.querySelector('#screen');
hud.canvas.id = 'screen';
hud.canvas.style.width = `${hud.canvas.width * 3}px`;
hud.canvas.style.height = `${hud.canvas.height * 3}px`;
hud.canvas.style.display = 'block';
hud.canvas.style.imageRendering = 'pixelated';
placeholder.replaceWith(hud.canvas);

// HUD state variants. Each exercises a different set of elements, because a
// palette claim over one state is a claim about one state: the status dot
// only exists when enemies are in play, the missile odometer's icon mix
// depends on the count, and the lives row scales with lives.
const STATES = {
  // Representative mid-flight state, every element present.
  flight: { score: 248020, hit: 4, stage: 1, missiles: 50, lives: 3,
    throttle: 'M', throttleFraction: 0.55, enemiesInPlay: false, locked: false },
  // Status dot, tracking (red) and locked (amber).
  tracking: { score: 515040, hit: 12, stage: 2, missiles: 37, lives: 2,
    throttle: 'H', throttleFraction: 0.92, enemiesInPlay: true, locked: false },
  locked: { score: 999999, hit: 7, stage: 3, missiles: 9, lives: 1,
    throttle: 'L', throttleFraction: 0.08, enemiesInPlay: true, locked: true },
  // Extremes of the odometer and the throttle bar.
  full: { score: 0, hit: 0, stage: 1, missiles: 70, lives: 5,
    throttle: 'H', throttleFraction: 1, enemiesInPlay: true, locked: true },
  empty: { score: 1, hit: 99, stage: 4, missiles: 0, lives: 0,
    throttle: 'L', throttleFraction: 0, enemiesInPlay: false, locked: false },
};

// Angles the sweep walks. 24 steps of 15 deg covers the full circle and puts
// a sample on every diagonal and every axis, which is the point: the defect
// this harness was built for is phase-dependent, and a sweep that only ever
// samples one phase of a rotating element is the thing that hid it (world
// lane, judging/R6/lane-world.md section 1).
const ROLL_SWEEP = Array.from({ length: 24 }, (_, i) => i * 15);

let sweepIndex = 0;

function currentRollDeg() {
  if (params.get('sweep') === 'roll') return ROLL_SWEEP[sweepIndex % ROLL_SWEEP.length];
  return Number(params.get('roll') || 0);
}

function draw(rollDeg, stateName) {
  Object.assign(hud.state, STATES[stateName] || STATES.flight);
  if (params.has('throttle')) hud.state.throttleFraction = Number(params.get('throttle'));
  const ctx = hud.ctx;
  const bg = params.get('bg');
  hud.redraw((rollDeg * Math.PI) / 180);
  if (bg) {
    // Backdrop UNDER the HUD, so an inspector can see it; drawn by
    // compositing the already-finished HUD over a fill.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = `#${bg}`;
    ctx.fillRect(0, 0, hud.canvas.width, hud.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------------------------------------------------------------- measuring

const PALETTE_SET = new Set(HUD_PALETTE.map((c) => c.toLowerCase()));

function hex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Measures an arbitrary ImageData, so the selftest below can feed it a known
// input. Returns counts, never a verdict.
function measureImageData(data) {
  const px = data.data;
  const alphaHist = new Map();
  const partial = [];
  const opaqueColours = new Map();
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const a = px[i + 3];
    alphaHist.set(a, (alphaHist.get(a) || 0) + 1);
    if (a === 0) continue;
    const x = p % data.width;
    const y = (p - x) / data.width;
    if (a !== 255) {
      if (partial.length < 400) {
        partial.push({ x, y, a, hex: hex(px[i], px[i + 1], px[i + 2]) });
      }
      continue;
    }
    const h = hex(px[i], px[i + 1], px[i + 2]);
    opaqueColours.set(h, (opaqueColours.get(h) || 0) + 1);
  }
  const chan = new Set();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    chan.add(px[i]); chan.add(px[i + 1]); chan.add(px[i + 2]);
  }
  const offPalette = [...opaqueColours.entries()]
    .filter(([h]) => !PALETTE_SET.has(h))
    .sort((a, b) => b[1] - a[1]);
  return {
    partialAlphaCount: [...alphaHist.entries()]
      .filter(([a]) => a !== 0 && a !== 255)
      .reduce((s, [, n]) => s + n, 0),
    partialAlphaSamples: partial,
    distinctPartialAlphas: [...alphaHist.keys()].filter((a) => a !== 0 && a !== 255).sort((a, b) => a - b),
    inkPixels: [...alphaHist.entries()].filter(([a]) => a !== 0).reduce((s, [, n]) => s + n, 0),
    opaqueColourCount: opaqueColours.size,
    offPaletteColours: offPalette,
    offPalettePixels: offPalette.reduce((s, [, n]) => s + n, 0),
    channelValues: [...chan].sort((a, b) => a - b),
  };
}

function measure(rollDeg, stateName) {
  draw(rollDeg, stateName);
  const data = hud.ctx.getImageData(0, 0, hud.canvas.width, hud.canvas.height);
  return { rollDeg, state: stateName, ...measureImageData(data) };
}

// -------------------------------------------------------------- instrument
// control. CLAUDE.md: "Validate the instrument on a known input before
// trusting any number." Seven synthetic canvases with hand-computable
// answers. Three of them plant a real Canvas2D antialiasing defect, so a
// clean run on the actual HUD cannot be a blind instrument; cases 5/6 are a
// matched positive/negative pair, and case 7 documents a seam mechanism this
// project had not previously named.
function selftest() {
  const c = document.createElement('canvas');
  c.width = 40; c.height = 40;
  const x = c.getContext('2d');
  const out = [];

  // 1. Empty canvas: nothing anywhere.
  let m = measureImageData(x.getImageData(0, 0, 40, 40));
  out.push({ name: 'empty canvas', pass: m.inkPixels === 0 && m.partialAlphaCount === 0
    && m.offPaletteColours.length === 0, got: { ink: m.inkPixels, partial: m.partialAlphaCount } });

  // 2. One 10x10 opaque block of an authored palette colour: 100 ink px, 0
  //    partial, 0 off-palette, channel values exactly {0x00, 0xf7}.
  x.fillStyle = HUD_PALETTE[0]; // '#f70000'
  x.fillRect(5, 5, 10, 10);
  m = measureImageData(x.getImageData(0, 0, 40, 40));
  out.push({ name: 'authored block', pass: m.inkPixels === 100 && m.partialAlphaCount === 0
    && m.offPalettePixels === 0 && m.opaqueColourCount === 1
    && m.channelValues.join(',') === '0,247',
    got: { ink: m.inkPixels, partial: m.partialAlphaCount, off: m.offPalettePixels,
      chan: m.channelValues.join(',') } });

  // 3. A 10x10 block of a colour that is NOT in the palette: must be caught
  //    as off-palette, exactly 100 px, and must NOT be counted as partial
  //    alpha (the two defects are separate and must not alias).
  x.clearRect(0, 0, 40, 40);
  x.fillStyle = '#123456';
  x.fillRect(5, 5, 10, 10);
  m = measureImageData(x.getImageData(0, 0, 40, 40));
  out.push({ name: 'off-palette block', pass: m.offPalettePixels === 100
    && m.offPaletteColours.length === 1 && m.offPaletteColours[0][0] === '#123456'
    && m.partialAlphaCount === 0,
    got: { off: m.offPalettePixels, which: m.offPaletteColours.map(([h, n]) => `${h}x${n}`).join(' '),
      partial: m.partialAlphaCount } });

  // 4. THE DEFECT ITSELF, planted: a stroked diagonal in an authored colour.
  //    Canvas2D must produce partial-alpha pixels along it; if this test
  //    reports zero the instrument is blind to the thing it exists to find
  //    (and a clean run on the real HUD would mean nothing).
  x.clearRect(0, 0, 40, 40);
  x.strokeStyle = '#f7f7f7';
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(3.5, 3.5);
  x.lineTo(36.5, 20.5);
  x.stroke();
  m = measureImageData(x.getImageData(0, 0, 40, 40));
  out.push({ name: 'planted AA diagonal', pass: m.partialAlphaCount > 10,
    got: { partial: m.partialAlphaCount, alphas: m.distinctPartialAlphas.length } });

  // 5. The other half of the Canvas2D trap, and the one the real reticle
  //    hits: an AXIS-ALIGNED 1px stroke is pixel-exact ACROSS its width when
  //    the path sits at a half-integer, but its default butt cap is square to
  //    the path and lands wherever the endpoint does. Half-integer endpoints
  //    therefore half-cover the two END pixels even though the line itself is
  //    crisp. Known answer: exactly 2 partial px, at alpha 127 (half coverage
  //    of a 0-255 range rounds DOWN, not up — 128 fails).
  //
  //    My first version of this case used INTEGER endpoints (moveTo(3,10.5) ->
  //    lineTo(36,10.5)) and asserted >=2 partial px. It returned 0 and failed,
  //    correctly: an integer endpoint is a pixel boundary and does not
  //    antialias. The assertion was wrong, not the renderer. Left documented
  //    because it is the distinction that decides which coordinates in
  //    drawReticle needed changing — the half-integer is right for the line's
  //    WIDTH and wrong for its LENGTH.
  x.clearRect(0, 0, 40, 40);
  x.beginPath();
  x.moveTo(3.5, 10.5);
  x.lineTo(36.5, 10.5);
  x.stroke();
  m = measureImageData(x.getImageData(0, 0, 40, 40));
  out.push({ name: 'planted AA butt caps', pass: m.partialAlphaCount === 2
    && m.distinctPartialAlphas.join(',') === '127',
    got: { partial: m.partialAlphaCount, alphas: m.distinctPartialAlphas.join(',') } });

  // 6. Integer endpoints on the same line: known answer ZERO partial px.
  //    The negative control for case 5 — without it, "2 partial px" could be
  //    an artefact of the instrument rather than of the endpoint alignment.
  x.clearRect(0, 0, 40, 40);
  x.beginPath();
  x.moveTo(3, 10.5);
  x.lineTo(36, 10.5);
  x.stroke();
  m = measureImageData(x.getImageData(0, 0, 40, 40));
  out.push({ name: 'integer endpoints, no AA (negative control)',
    pass: m.partialAlphaCount === 0 && m.inkPixels === 33,
    got: { partial: m.partialAlphaCount, ink: m.inkPixels } });

  // 7. THE SEAM — REPORTED, NOT ASSERTED, and the reason why is the point.
  //
  //    Two OVERLAPPING collinear subpaths inside ONE stroke() do not union
  //    their coverage: the second subpath's butt cap stamps a half-covered
  //    pixel on top of ink the first subpath already covered completely.
  //    This is a THIRD Canvas2D antialiasing mechanism, distinct from case 4
  //    (a diagonal) and cases 5/6 (an endpoint off the grid), and it is the
  //    one that explains the six #7b7b7b pixels the old reticle put at its
  //    two attitude-line ends and its four bracket corners — pixels that
  //    plain geometry says are fully interior to the figure, which is why
  //    they survived a reading of the code and only fell out of a capture.
  //
  //    IT IS NOT A GATE BECAUSE IT DOES NOT REPRODUCE RELIABLY. Freshly
  //    created canvases of 40x12, 40x40 and 320x224 all show the seam
  //    (alpha 127 at the overlap, 255 when the same two segments are stroked
  //    separately), but THIS canvas — reused across the six cases above with
  //    clearRect between them — returns 255. Some renderer-state difference
  //    decides it, and chasing which one is not worth a lane's time now that
  //    the mechanism is gone from the HUD. An instrument control that fails
  //    for a reason unrelated to the subject is worse than no control, so
  //    this one prints its two numbers and gates on nothing.
  x.clearRect(0, 0, 40, 40);
  x.strokeStyle = '#f7f7f7';
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(3.5, 6.5); x.lineTo(13.5, 6.5);
  x.moveTo(11.5, 6.5); x.lineTo(30.5, 6.5);
  x.stroke();
  const seamAt11 = x.getImageData(0, 6, 40, 1).data[11 * 4 + 3];
  x.clearRect(0, 0, 40, 40);
  x.beginPath(); x.moveTo(3.5, 6.5); x.lineTo(13.5, 6.5); x.stroke();
  x.beginPath(); x.moveTo(11.5, 6.5); x.lineTo(30.5, 6.5); x.stroke();
  const noSeamAt11 = x.getImageData(0, 6, 40, 1).data[11 * 4 + 3];
  out.push({ name: 'overlapping-subpath seam (INFO, not a gate)', info: true,
    pass: true,
    got: { overlappingOneStroke: seamAt11, twoSeparateStrokes: noSeamAt11,
      note: 'a fresh canvas gives 127/255; see the comment' } });

  return out;
}

draw(currentRollDeg(), params.get('state') || 'flight');

window.__hudProbe = {
  palette: HUD_PALETTE,
  states: Object.keys(STATES),
  rollSweep: ROLL_SWEEP,
  measure,
  selftest,
};
// capture.mjs compatibility: __step advances the sweep and redraws.
window.__step = (n = 1) => {
  sweepIndex += Math.max(1, Math.round(n / 60)) || 1;
  draw(currentRollDeg(), params.get('state') || 'flight');
};
// Redraw-only hook for the timing probe: no getImageData, so it measures
// what the game actually pays per frame.
window.__hudRedrawOnly = (roll) => hud.redraw(roll);
window.__frameReady = true;
