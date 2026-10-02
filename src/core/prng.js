// Seeded PRNG (mulberry32). ARCHITECTURE.md D4: no Math.random() in gameplay
// code — every stream of randomness must trace back to one of these so
// ?fixed=1&seed=N captures are frame-exact and reproducible.

export function createPrng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
