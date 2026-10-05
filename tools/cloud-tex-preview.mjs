// Isolation harness for clouds.js's texture authoring (CLAUDE.md:
// "Isolation harnesses beat in-situ measurement"). Draws a grid of cloud
// textures at 1:1 into the capture canvas with a 1px magenta box around each
// texture's full extent, so the drawn mass's fill of its canvas can be read
// directly instead of inferred from a sprite's on-screen bbox.
import { __drawCloudForPreview, __CLOUD_PALETTES_FOR_PREVIEW, __TEX_FOR_PREVIEW } from '../src/render/clouds.js';
import { createPrng } from '../src/core/prng.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const palName = params.get('palette') || 'day';
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#009fff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

const rng = createPrng(seed);
const { W, H } = __TEX_FOR_PREVIEW;
const pal = __CLOUD_PALETTES_FOR_PREVIEW[palName];
const cols = Math.floor(canvas.width / (W + 8));
const rows = Math.floor(canvas.height / (H + 8));
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    __drawCloudForPreview(octx, W, H, rng, pal);
    const x = 4 + c * (W + 8);
    const y = 4 + r * (H + 8);
    ctx.drawImage(off, x, y);
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, W + 1, H + 1);
  }
}
window.__step = () => {};
window.__frameReady = true;
