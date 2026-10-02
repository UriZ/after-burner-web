// Scripted input timeline for `?demo=2` — the combat verification run.
//
// `?demo=1` (main.js) is the existing attract-mode sweep and is left exactly
// as it is; this is a second, separate timeline that actually pulls the
// triggers, so a judge or QA pass can capture firing, locking and a missile
// salvo unattended and deterministically.
//
// It lives under src/weapons/ rather than src/game/ purely for file
// ownership this round: src/game/spawner.js is the only src/game file this
// round's combat work owns besides game.js, and main.js belongs to nobody.
// game.js (which this round's combat work does own) reads it directly, so
// `?demo=1`'s path through main.js is untouched.
//
// Entries are [tStart, stickX, stickY, fire, missile], latched: the last
// entry whose tStart <= simTime wins. Times are SIM seconds, so the timeline
// is identical whatever `--every` a capture uses.
const SCRIPT = [
  // Open level and quiet: the stage-opener overtake flight is on screen and
  // receding. Nothing fires, so a capture here shows enemy motion alone.
  [0.0, 0, 0, false, false],
  // Vulcan on, gentle left — exercises the zig-zag column and the muzzle
  // flash against approaching enemies.
  [1.6, -0.3, 0.05, true, false],
  [3.0, 0.15, 0, true, false],
  // Stop firing and HOLD the missile button: locks accumulate, up to 6
  // brackets appear.
  [4.0, 0.1, 0.05, false, true],
  // Release -> salvo. The missiles leave over ~0.3 s with launch billows.
  [5.4, 0.1, 0, false, false],
  // Immediately re-acquire and fire a SECOND salvo while the first is still
  // in flight. This is the state GAME_SPEC.md §3's "6-8 missiles in flight
  // per salvo" describes — with a 0.4 s salvo cooldown and a 0.6-0.9 s
  // flight time, overlapping salvos are how that many get into the air at
  // once, and a single hold-and-release cannot reach it.
  [5.5, 0.05, 0, false, true],
  [6.3, 0, 0, false, false],
  // Vulcan again through the impacts.
  [6.6, -0.2, -0.05, true, false],
  // Hard bank right while firing: checks that enemies, trails and brackets
  // all behave under world roll.
  [7.4, 0.95, 0, true, false],
  [8.8, 0.3, 0.1, false, true],
  // Second salvo.
  [10.2, 0, 0, false, false],
  [10.8, -0.9, 0, true, false],
  [12.2, 0, 0.1, true, false],
  [13.5, 0, 0, false, true],
  [14.8, 0, 0, false, false],
  [15.4, 0.4, 0, true, false],
];

export function combatDemoTimeline(simTime) {
  let entry = SCRIPT[0];
  for (const e of SCRIPT) {
    if (simTime >= e[0]) entry = e;
    else break;
  }
  return { x: entry[1], y: entry[2], fire: entry[3], missile: entry[4] };
}
