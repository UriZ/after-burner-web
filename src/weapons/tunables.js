// `?gun=key=value,key=value` — MEASUREMENT-ONLY override of the player
// weapons' tunable constants. Same family as `?combatonly=`, `?combatexpl=1`
// and `?debugstick=`: it exists so a probe can isolate one lever, and
// nothing in normal play reads it (with no parameter every `gunTunable()`
// call returns the shipped default it was given).
//
// WHY IT EXISTS, which is a methodology point rather than a convenience one.
// R8's gap is a FOUR-LEVER question — the assist's depth band, whether the
// assist supplies the vertical aim, the gun's kill reach, and aim scatter —
// and two rounds of this project have now been decided by a lane running a
// one-lever-at-a-time isolation instead of arguing from arithmetic
// (REFERENCE ledger rows 28 and 29, both of which REFUTED what the lane had
// written down first). An isolation needs the arms to differ in ONE constant
// and in nothing else, which means one build and one switch. Editing the
// constant between runs does not give that: the tree moves, five other lanes
// are live, and the two arms then differ by whatever else landed.
//
// IT IS ALSO THE REPRODUCTION. Every arm in judging/R8/lane-combat.md names
// its `?gun=` string, so a judge re-runs the arm rather than re-deriving the
// edit history. R7's gap-1 reproduction had to be rebuilt from prose by the
// judge because the probe that found it was never committed.
//
// Unknown keys are a HARD ERROR, not a shrug. tools/capture.mjs's header
// records what a silently-dropped flag cost this project: a tool that
// accepted `--params` for `--url-params`, dropped the parameters, captured a
// scene with none of the requested state in it and returned a clean,
// plausible, stable zero. A typo'd `?gun=assitmax=7` must not quietly
// measure the shipped default and be written up as an arm.

const KNOWN = new Set([
  'assistmax', // assist's far depth bound (shipped: the readable depth)
  'assistmin', // assist's near depth bound
  'assistrad', // assist cone radius, frame-width fractions
  'assistyfrac', // 0..1: how much of the target's own altitude the assist supplies
  'assistlead', // 1 = lead the target's closure over TRAVEL_S, 0 = snap to its depth now
  'assistpick', // 1 = pick the target nearest the SIGHT, 0 = nearest in DEPTH (pre-R8)
  'assistfromsight', // 1 = cone's dx from the sight, 0 = from the nose (pre-R8)
  'reach', // max depth at which a vulcan round may resolve a hit (pre-R8 form)
  'reachdepth', // R12: depth an UNASSISTED round ramps to (shipped: readable depth; 55 = pre-R12)
  'hitminp', // R12: fraction of its path a round must fly before it can score (0 = pre-R12)
  'minspan', // SHIPPED form: smallest projected span the gun may engage, frac of frame width
  'scatter', // per-round aim scatter, frame-width fractions (sigma-ish)
  'hitmult', // vulcan hit radius as a multiple of the target's own span
  'lockrad', // missile lock cone radius around the sight, frame-width fractions
  'lockhold', // R15: seconds a COMPLETED lock survives its target leaving the field before firing (0 = pre-R15 instant drop)
  'closure', // throttle closure excursion: 0 = inert, 1 = full [0.85,1,1.20]
  'lockaim', // R37: 0 disables the steering requirement on lock acquisition (measurement lever; lockSystem.js reads ?lockaim= directly this round)
]);

let overrides = null;

function parse() {
  if (overrides) return overrides;
  overrides = new Map();
  if (typeof location === 'undefined') return overrides;
  const raw = new URLSearchParams(location.search).get('gun');
  if (!raw) return overrides;
  for (const pair of raw.split(',')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = (i < 0 ? pair : pair.slice(0, i)).trim();
    const v = i < 0 ? '1' : pair.slice(i + 1).trim();
    if (!KNOWN.has(k)) {
      throw new Error(
        `?gun: unknown key "${k}". Known: ${[...KNOWN].join(', ')}. ` +
          'Refusing to run rather than silently measuring the shipped default.'
      );
    }
    const n = Number(v);
    if (!Number.isFinite(n)) {
      throw new Error(`?gun: "${k}" is not a finite number ("${v}").`);
    }
    overrides.set(k, n);
  }
  return overrides;
}

// Returns the override for `key` if `?gun=` supplied one, else `fallback`.
export function gunTunable(key, fallback) {
  if (!KNOWN.has(key)) throw new Error(`gunTunable: "${key}" is not a declared key`);
  const o = parse();
  return o.has(key) ? o.get(key) : fallback;
}

// What the shipped build is actually running, for a probe to read back and
// for the report to quote. A lane that writes down the arm it MEANT to run
// rather than the one the page served is one typo from a wrong table.
export function gunTunableReport(defaults) {
  const o = parse();
  const out = {};
  for (const [k, v] of Object.entries(defaults)) out[k] = o.has(k) ? o.get(k) : v;
  out._overridden = [...o.keys()];
  return out;
}
