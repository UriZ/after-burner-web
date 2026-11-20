// Scripted input timeline for `?demo=2` — the combat verification run.
//
// `?demo=1` (main.js) is the existing attract-mode sweep and is left exactly
// as it is; this is a second, separate timeline that actually pulls the
// triggers, so a judge or QA pass can capture firing, locking and a missile
// salvo unattended and deterministically.
//
// It lives under src/weapons/ rather than src/game/ purely for file
// ownership: src/game/spawner.js is the only src/game file the combat task
// owns, and main.js belongs to nobody.
//
// ---------------------------------------------------------------------------
// THE STICK IS A CONTINUOUS WEAVE, NOT A STEP TABLE, AND THAT IS A GAMEPLAY
// FIX AS WELL AS A FIDELITY ONE.
//
// The first version latched stick x/y from a table, so the jet sat at one
// deflection for 1-1.5 s at a time. Enemy shots are aimed at the player's
// position at fire time and take ~1.2 s to arrive (GAME_SPEC.md §4), so a
// jet that holds still for longer than the shot's flight time is hit by
// essentially every train aimed at it. Measured on the shipped build: the
// demo player survived ~3.5 s per life and lost all three lives inside 30 s,
// which made every combat measurement unmeasurable — src/game/flow/ clears
// all enemies on death, so the only combat ever observable was the first
// couple of seconds of a rebuild.
//
// That was not an enemy-balance bug. A scripted path that does not evade
// SHOULD die to aimed fire. The fix belongs in the path.
//
// GAME_SPEC.md §7 asks for exactly this independently: "Demo/attract
// gameplay should fly a two-regime path (cruise weave + straight
// canyon-style segments), not a constant-amplitude weave (ADOPTED #122 —
// constant weaving reproduces neither measured regime)". So the weave below
// is two incommensurable sinusoids with a slow amplitude envelope, giving
// the alternation #122 describes rather than one constant-amplitude sweep.
//
// Target: REFERENCE.md "Player jet / Screen position" cruise cx sd
// 12.88 %W. The jet's lateral envelope is 2.6 world units at depth 5 =
// +-35 %W of screen, so a stick signal with sd ~0.5 lands near 12 %W. See
// the dev report for the measured sd on capture.
// ---------------------------------------------------------------------------

// Two-regime weave. The 0.9 and 1.7 rad/s terms are incommensurable, so the
// path never repeats inside a capture window; the 0.21 rad/s envelope swings
// the amplitude between a wide cruise weave and a near-straight segment.
function weave(t) {
  const envelope = 0.62 + 0.38 * Math.sin(t * 0.21);
  const x = envelope * (0.60 * Math.sin(t * 0.9) + 0.30 * Math.sin(t * 1.7 + 1.1));
  const y = 0.34 * Math.sin(t * 0.73 + 0.4);
  return { x: Math.max(-1, Math.min(1, x)), y };
}

// Trigger schedule only — the stick comes from weave(). Entries are
// [tStart, fire, missile], latched: the last entry whose tStart <= simTime
// wins. Times are SIM seconds, so the schedule is identical whatever
// `--every` a capture uses.
const TRIGGERS = [
  // Open quiet: the stage-opener overtake flight is on screen and receding.
  // A capture here shows enemy motion with nothing fired.
  [0.0, false, false],
  // Vulcan on — exercises the zig-zag column and the muzzle flash.
  [1.6, true, false],
  // Stop firing and HOLD the missile button: locks accumulate, up to 6
  // brackets appear.
  [4.0, false, true],
  // Release -> salvo. The missiles leave over ~0.3 s with launch billows.
  [5.4, false, false],
  // Immediately re-acquire and fire a SECOND salvo while the first is still
  // in flight. This is the state GAME_SPEC.md §3's "6-8 missiles in flight
  // per salvo" describes — with a 0.4 s salvo cooldown and a 0.6-0.9 s
  // flight time, overlapping salvos are how that many get into the air at
  // once, and a single hold-and-release cannot reach it.
  [5.5, false, true],
  [6.6, false, false],
  // Vulcan again through the impacts.
  [6.9, true, false],
  [8.8, false, true],
  [10.2, false, false],
  [10.8, true, false],
  [13.5, false, true],
  [14.8, false, false],
  [15.4, true, false],
  // From here the schedule loops on a 12 s cycle so a long capture keeps
  // exercising both weapons instead of holding the vulcan down forever.
];
const LOOP_FROM_S = 16.0;
const LOOP_PERIOD_S = 12.0;

export function combatDemoTimeline(simTime) {
  const t = simTime < LOOP_FROM_S
    ? simTime
    : 1.6 + ((simTime - LOOP_FROM_S) % LOOP_PERIOD_S);
  let entry = TRIGGERS[0];
  for (const e of TRIGGERS) {
    if (t >= e[0]) entry = e;
    else break;
  }
  const { x, y } = weave(simTime);
  // R37 `scripted`: cinematic input — lock gate exempt (see demoTimeline.js).
  return { x, y, fire: entry[1], missile: entry[2], scripted: true };
}
