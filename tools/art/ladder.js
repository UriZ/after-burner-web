// The Sega 5-bit colour ladder, published in judging/R4/art-critique.md §3:
// "channel values ∈ {0, 16, 25, 33, 41, 49, 58, 66, 74, 82, 91, 99, 107, 115,
// 123, 132, 140, 148, 156, 164, 173, 181, 189, 197, 206, 214, 222, 230, 239,
// 247, 255}". Every authored colour's R/G/B channel must land exactly on one
// of these 31 values. This file is the single source of truth for that rule
// and the assertion every generator runs before export.
export const LADDER = [
  0, 16, 25, 33, 41, 49, 58, 66, 74, 82, 91, 99, 107, 115, 123, 132, 140, 148,
  156, 164, 173, 181, 189, 197, 206, 214, 222, 230, 239, 247, 255,
];

const LADDER_SET = new Set(LADDER);

export function isOnLadder(channelValue) {
  return LADDER_SET.has(channelValue);
}

export function nearestLadderValue(v) {
  let best = LADDER[0];
  let bestDist = Math.abs(v - best);
  for (const l of LADDER) {
    const d = Math.abs(v - l);
    if (d < bestDist) {
      best = l;
      bestDist = d;
    }
  }
  return best;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Snap a hex colour's channels onto the ladder; returns the snapped hex and
 * whether any channel moved (so a typo'd palette constant is caught, not
 * silently "fixed"). */
export function snapHexToLadder(hex) {
  const { r, g, b } = hexToRgb(hex);
  const sr = nearestLadderValue(r);
  const sg = nearestLadderValue(g);
  const sb = nearestLadderValue(b);
  const snapped = rgbToHex(sr, sg, sb);
  const moved = sr !== r || sg !== g || sb !== b;
  return { snapped, moved, original: hex };
}

/** Assert every channel of every hex in `hexes` is exactly on the ladder.
 * Throws with a precise message naming the offending colour — this is the
 * hard gate the spec requires ("assertions in your generator so a violating
 * sheet cannot be exported"). */
export function assertAllOnLadder(hexes, label = '') {
  for (const hex of hexes) {
    const { r, g, b } = hexToRgb(hex);
    if (!isOnLadder(r) || !isOnLadder(g) || !isOnLadder(b)) {
      const { snapped } = snapHexToLadder(hex);
      throw new Error(
        `[ladder] ${label}: ${hex} is off the Sega 5-bit ladder ` +
        `(nearest ladder colour: ${snapped}). Fix the palette constant.`
      );
    }
  }
}
