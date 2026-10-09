// Isolation harness for the AUTHORED CANVASES of every composited element in
// src/effects/ and src/weapons/.
//
// Modelled on tools/hud-probe.mjs, which does the same job for the HUD, and
// built for the same reason: in a live frame you cannot tell a sprite's pixel
// from the sky pixel behind it, because a sprite texel at partial alpha
// arrives on screen as an arbitrary blend of an authored colour and whatever
// the world put there. Here there is no world — each element's own
// CanvasTexture is read back with getImageData, so what is measured is
// exactly the RGBA the compositor receives.
//
// WHAT THIS CATCHES THAT `hardAlpha` DID NOT. R6 gap 1 ("Criterion A fails in
// ordinary play, and it is a CLASS") was two mechanisms, and this probe exists
// because only one of them was visible to the old thresholding:
//
//   1. PERIMETER alpha — a shape drawn against transparency gets a rim of
//      half-covered texels. `hardAlpha` has thresholded these since R3.
//   2. INTERIOR colour — a shape drawn over an OPAQUE shape antialiases
//      against it, so the seam texels are genuine two-colour mixtures at
//      alpha 255. hardAlpha sees alpha 255 and leaves them. On the committed
//      tree the enemy-shot canvas (four concentric ellipses) carried 19
//      unauthored colours of its 23, and the explosion burst carried ~300.
//
// So the gate below is TWO assertions, not one:
//   * no texel with 0 < alpha < 255   (mechanism 1)
//   * every opaque texel's RGB is in the element's DECLARED palette
//     (mechanism 2) — the palette travels on the texture itself
//     (`texture.userData.palette`), so the probe cannot drift from the art.
// Plus two advisory readings: per-sprite colour count against REFERENCE.md
// Criterion A3 (<=8 for an aircraft/vehicle/cloud sprite, <=16 for an
// explosion or effect sprite), and ladder membership against REFERENCE.md's
// enumerated hardware ladder.
//
// Driven by `node tools/fx_palette_probe.mjs`.
import { SEGA_LADDER } from '../src/effects/pixelTexture.js';
import {
  vulcanTexture, enemyShotTexture, missileTexture, muzzleFlashTexture, lockBarTexture,
} from '../src/weapons/projectileSprites.js';
import { telegraphTextures } from '../src/weapons/telegraph.js';
import { burstTexturesForProbe, chunkTexturesForProbe } from '../src/effects/explosions.js';
import { smokePuffTexture, trailPuffTexture, billowTexture, SMOKE_VALUES } from '../src/effects/smoke.js';
import { makePixelTexture } from '../src/effects/pixelTexture.js';

// Every element this lane composites into the scene. `kind` picks the
// Criterion A3 ceiling.
function elements() {
  const out = [
    { name: 'vulcan', kind: 'effect', tex: vulcanTexture() },
    { name: 'enemyShot', kind: 'effect', tex: enemyShotTexture() },
    { name: 'missile', kind: 'vehicle', tex: missileTexture() },
    { name: 'muzzleFlash', kind: 'effect', tex: muzzleFlashTexture() },
    { name: 'lockBar', kind: 'effect', tex: lockBarTexture() },
  ];
  telegraphTextures().forEach((t, i) => out.push({ name: `telegraph[${i}]`, kind: 'effect', tex: t }));
  burstTexturesForProbe().forEach((phase, p) =>
    phase.forEach((t, a) => out.push({ name: `burst[p${p}a${a}]`, kind: 'effect', tex: t })));
  chunkTexturesForProbe().forEach((t, i) => out.push({ name: `chunk[${i}]`, kind: 'effect', tex: t }));
  SMOKE_VALUES.forEach((v, i) => {
    out.push({ name: `smokePuff[v${v}]`, kind: 'effect', tex: smokePuffTexture(i) });
    out.push({ name: `trailPuff[v${v}]`, kind: 'effect', tex: trailPuffTexture(i) });
    out.push({ name: `billow[v${v}]`, kind: 'effect', tex: billowTexture(i) });
  });
  return out;
}

const hex = (r, g, b) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

function audit(entry) {
  const canvas = entry.tex.image;
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const declared = new Set((entry.tex.userData.palette ?? []).map((h) => h.toLowerCase()));
  const partialAlphas = new Set();
  let partialCount = 0;
  const colours = new Map();
  const offPalette = new Map();
  const channelValues = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    if (a !== 255) { partialCount += 1; partialAlphas.add(a); continue; }
    const h = hex(data[i], data[i + 1], data[i + 2]);
    colours.set(h, (colours.get(h) ?? 0) + 1);
    channelValues.add(data[i]).add(data[i + 1]).add(data[i + 2]);
    if (declared.size && !declared.has(h)) offPalette.set(h, (offPalette.get(h) ?? 0) + 1);
  }
  const offLadder = [...channelValues].filter((v) => !SEGA_LADDER.includes(v));
  return {
    name: entry.name,
    kind: entry.kind,
    w: canvas.width,
    h: canvas.height,
    declaredCount: declared.size,
    opaquePixels: [...colours.values()].reduce((s, n) => s + n, 0),
    partialCount,
    partialAlphas: [...partialAlphas].sort((x, y) => x - y),
    colours: [...colours.keys()].sort(),
    offPalette: [...offPalette.entries()],
    channelValues: [...channelValues].sort((x, y) => x - y),
    offLadder,
  };
}

// --- instrument control -----------------------------------------------------
// Three cases, run before any real element is reported. The first two PLANT
// the exact two defects this probe exists to find, on canvases whose answers
// are computable by hand; a clean run on the real elements is worthless if the
// probe cannot see a defect it is shown deliberately.
function selftest() {
  const cases = [];

  // 1. PLANTED PERIMETER ALPHA: an antialiased arc with no hardAlpha and no
  //    palette. Canvas2D must produce partial-alpha texels at its rim.
  const soft = makePixelTexture((ctx, w, h) => {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); ctx.fill();
  }, 16, 16);
  const softA = audit({ name: 'planted-soft-arc', kind: 'effect', tex: soft });
  cases.push({
    name: 'planted perimeter alpha is DETECTED',
    got: softA.partialCount,
    pass: softA.partialCount > 0,
  });

  // 2. PLANTED INTERIOR SEAM: two concentric arcs, hardAlpha ON, no palette.
  //    hardAlpha cannot see the inner seam, so unauthored colours survive —
  //    this is the mechanism hardAlpha missed for four rounds. Declared
  //    palette is the two fills, so every seam colour is off-palette.
  const seam = makePixelTexture((ctx, w, h) => {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.25, 0, Math.PI * 2); ctx.fill();
  }, 32, 32, { hardAlpha: true });
  seam.userData.palette = ['#ff0000', '#ffff00'];
  const seamA = audit({ name: 'planted-interior-seam', kind: 'effect', tex: seam });
  cases.push({
    name: 'planted interior seam is DETECTED (hardAlpha alone misses it)',
    got: { partialAlpha: seamA.partialCount, offPalette: seamA.offPalette.length },
    pass: seamA.partialCount === 0 && seamA.offPalette.length > 0,
  });

  // 3. THE SAME CANVAS WITH A PALETTE: identical drawing, snapped. Must come
  //    back clean, and must still be TWO colours — a probe that passes by
  //    erasing the art is not a pass.
  const snapped = makePixelTexture((ctx, w, h) => {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.25, 0, Math.PI * 2); ctx.fill();
  }, 32, 32, { palette: ['#ff0000', '#ffff00'] });
  const snapA = audit({ name: 'planted-snapped', kind: 'effect', tex: snapped });
  cases.push({
    name: 'the same canvas with a palette is CLEAN and keeps both colours',
    got: { offPalette: snapA.offPalette.length, colours: snapA.colours.length },
    pass: snapA.offPalette.length === 0 && snapA.colours.length === 2,
  });

  // 4. Ladder table matches REFERENCE.md's enumeration, which is a TABLE and
  //    not a formula (round(k*255/31) yields 90 for 91 and 165 for 164).
  cases.push({
    name: 'SEGA_LADDER is the enumerated table, not the formula',
    got: { n: SEGA_LADDER.length, has91: SEGA_LADDER.includes(91), has164: SEGA_LADDER.includes(164), has8: SEGA_LADDER.includes(8) },
    pass: SEGA_LADDER.length === 31 && SEGA_LADDER.includes(91)
      && SEGA_LADDER.includes(164) && !SEGA_LADDER.includes(8),
  });

  return cases;
}

const rows = elements().map(audit);

// Draw every canvas into the page at 6x so a human can look at what was
// measured — CLAUDE.md's "crop and LOOK at any clean pass".
const sheet = document.querySelector('#sheet');
for (const e of elements()) {
  const c = document.createElement('canvas');
  c.width = e.tex.image.width;
  c.height = e.tex.image.height;
  c.getContext('2d').drawImage(e.tex.image, 0, 0);
  c.style.width = `${c.width * 6}px`;
  c.style.height = `${c.height * 6}px`;
  c.title = e.name;
  sheet.appendChild(c);
}

window.__fxProbe = { rows, selftest };
window.__frameReady = true;
