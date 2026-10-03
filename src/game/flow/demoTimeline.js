// Real attract-mode flight for `?demo=1`, replacing main.js's placeholder
// `sin(t*0.5)` sweep (R3 report gap 8 / GAME_SPEC.md §7: "a two-regime
// attract flight (cruise roam ... with banked segments + occasional
// fire/lock) — this is what every judge captures, make it representative").
//
// REFERENCE.md "Player jet / Screen position" ADOPTED #122: the roam is
// two-regime, not constant-amplitude weaving — open cruise has a wide,
// slow wander (cx sd 12.88%W at cy 52.8%H); canyon segments are tighter and
// straighter (cx sd 2.59%W at cy 63.5%H). This is a pure function of
// simTime (no RNG), matching combatDemoTimeline.js's determinism
// requirement under `?fixed=1`.
//
// Regimes alternate on a fixed period so the behaviour is predictable for
// capture: ~11s cruise (wide wander, occasional bank+fire+lock), ~5s canyon
// (tight, mostly level, straighter line, less combat).
const CRUISE_S = 11;
const CANYON_S = 5;
const CYCLE_S = CRUISE_S + CANYON_S;

// Throttle (R5 feel fix, feel-critique.md §4/§10 rank 7): the attract
// timeline has no keyboard to drive Q/E, so it cycles the lever itself —
// otherwise an unattended capture of ?demo=1 would show a throttle gauge
// that never moves, same defect as the static decal this replaces. Dwelling
// ~3.5s per detent gives ~9 changes over a 32s stage, above the critique's
// "chevron must change position >=8 times in a 32s stage" target (the
// arcade's own measured rate).
const THROTTLE_DWELL_S = 3.5;
const THROTTLE_PATTERN = [1, 2, 1, 0]; // M, H, M, L

export function demoTimeline(simTime) {
  const phase = simTime % CYCLE_S;
  const inCruise = phase < CRUISE_S;
  const t = simTime;

  let x;
  let y;
  if (inCruise) {
    // Wide wander: a slow primary sweep plus a faster secondary component so
    // the path isn't a pure sine (REFERENCE.md explicitly rules out
    // "constant-amplitude weaving") — two incommensurate periods (0.35,
    // 0.93) never repeat the same combined shape within the regime window.
    x = Math.sin(t * 0.35) * 0.75 + Math.sin(t * 0.93 + 1.7) * 0.22;
    y = Math.sin(t * 0.22 + 0.6) * 0.32;
  } else {
    // Canyon: tighter and straighter — smaller lateral amplitude, lower and
    // flatter vertically, matching the measured cy 63.5%H / sd 2.59%W band
    // being both lower and narrower than cruise.
    const ct = t - CRUISE_S;
    x = Math.sin(ct * 0.55) * 0.22;
    y = -0.12 + Math.sin(ct * 0.4) * 0.08;
  }

  // Occasional fire/lock, concentrated in the cruise regime's banked
  // segments (GAME_SPEC.md §7: "cruise weave + ... occasional fire/lock").
  const fireWindow = inCruise && Math.sin(t * 1.65) > 0.55;
  const missileWindow = inCruise && (t % CRUISE_S) > 6.5 && (t % CRUISE_S) < 8.0;

  const throttleIndex = THROTTLE_PATTERN[Math.floor(t / THROTTLE_DWELL_S) % THROTTLE_PATTERN.length];

  return { x, y, fire: fireWindow, missile: missileWindow, throttleIndex };
}
