import * as THREE from 'three';
import { ScreenSpace } from '../effects/screenSpace.js';
import { SmokeField } from '../effects/smoke.js';
import { ExplosionField } from '../effects/explosions.js';
import { HitFlashField } from '../effects/hitFlash.js';
import { Spawner } from '../game/spawner.js';
import { Vulcan, TRAVEL_S as VULCAN_TRAVEL_S } from './vulcan.js';
import { gunTunable, gunTunableReport } from './tunables.js';
import { createPrng } from '../core/prng.js';
import { Missiles } from './missiles.js';
import { EnemyShots, SPEED as ENEMY_SHOT_SPEED } from './enemyShots.js';
import { LockSystem, MAX_LOCKS } from './lockSystem.js';
import { Telegraphs } from './telegraph.js';
import {
  TELEGRAPH_S as ENEMY_TELEGRAPH_S,
  ENEMY_WORLD_WIDTH,
  FLY_PAST_DEPTH,
  poseCensus,
} from '../entities/enemy.js';
import { BATTERY_TELEGRAPH_S, BATTERY_SHOT_PROFILE } from '../entities/groundBattery.js';
import { AudioBus } from '../audio/index.js';

// Combat facade: one object game.js constructs and ticks. Owns the enemy
// spawner, both player weapons, enemy fire, lock brackets, explosions and
// smoke, and publishes the handful of fields the HUD reads.
//
// SHARED STATE CONTRACT (agreed with jethud-dev, who renders the HUD):
//   missiles      int 0..70, base-10 odometer semantics — tens digit = large
//                 rocket icons, units digit = small ticks. Starts at 50
//                 (5 large, 0 ticks) per GAME_SPEC.md §3's round-4 decode.
//   hit           int kill count. GAME_SPEC.md §6: kills pay through the
//                 stage-end HIT tally, NOT immediate score, so nothing here
//                 touches `score`. HIT is not reset by death and resets only
//                 at stage start — neither event exists this round, so it
//                 only counts up.
//   enemiesInPlay bool, for the reticle status dot (REFERENCE.md "Reticle
//                 anatomy": ABSENT when no enemies are in play).
//   locked        bool, true while at least one lock bracket is held.
// This object writes those four fields into whatever state object it is
// given; it never reads score/stage/throttle.

export const MISSILE_START_STOCK = 50;
const SALVO_COOLDOWN_S = 0.4; // ADOPTED
// R25 — how long a press GATHERS locks before the salvo auto-fires while the
// button is still held. The missile must fire for every naive input: a tap or
// mash fires on release, but a player who simply holds the button down must
// fire too (and keep firing). On the rising edge this window opens; the salvo
// launches on the first of release / this window closing / the lock set
// filling. 0.35 s fans a few locks across the wave before launch without the
// press feeling unresponsive.
const SALVO_GATHER_S = 0.35;
// R12: fraction of its muzzle->aim-point path a vulcan round must fly before
// it can score. Pulls gun kills off the muzzle and up to the sight (R11 §2.1);
// value set by the kill-vs-sight A/B in judging/R12/combat-lane.md.
const VULCAN_MIN_HIT_P = 0.15; // R26: was 0.8 -- rounds can score along most of their flight, not only the last 20%, so holding fire at enemies ahead kills them.
const LAUNCH_STAGGER_S = 0.05; // 6 missiles leave over ~0.3 s

// The sight: GAME_SPEC.md §3's lock-display element 1, "the small dashed
// SIGHT square leading the player's nose — the aim point, always present in
// flight, separate from any lock indicator".
//
// R40 — 0.30 -> 0.16, THE ARCADE FIGURE R15 MEASURED AND NOBODY EVER APPLIED.
//
// What stood here placed the sight 0.30 NDC above the jet, citing
// reference/stage4-vulcan-stream-t214.png: "top of the [gun] column ~0.32 H
// against a jet at ~0.51 H". That operator measures where the VULCAN STREAM
// CONVERGES — a depth-dependent vanishing point of the round column — and calls
// the answer the sight's offset. Those are two different objects. R15 tracked
// the arcade's SIGHT GLYPH itself and reported the offset on BOTH rails of the
// vertical envelope (judging/R15/playtest-open.md §JOB 1, table rows "full
// climb" / "full dive"):
//
//     full climb   jet +0.46 NDC (27 %H)   offset +0.16   sight ~ +0.62
//     full dive    jet -0.34 NDC (67 %H)   offset +0.16   sight ~ -0.18
//
// The same +0.16 at two extremes 0.80 NDC apart is a two-point agreement on the
// glyph, against one frame's convergence estimate on a different object. The
// glyph is the thing the player aims with, so the glyph operator wins.
//
// It also reconciles the one conflict that made this look settled. Our jet
// ceiling is NOT wrong — ENVELOPE_Y_UP 1.55 puts the airframe at +0.460 NDC
// against the arcade's 109-observation 27.0 %H, correct to three decimals
// (player.js). It was only the sight that over-reached (+0.760 vs the arcade's
// +0.62). The error was never in the envelope; it was in this offset, which is
// why four rounds of re-litigating ENVELOPE_Y never closed it.
//
// WHAT IT FIXES IN THE HAND, which is why it is in this round. At 0.30 the
// crosshair floats ~96 px above the nose on a 640-tall screen, in empty sky,
// while the gun bites down at the airframe — the fresh playtest's "kills pop
// right on my wingtip, almost never out in front where I'm aiming" and my own
// "five enemies blew up at my wingtips while I pointed up-left"
// (judging/R40/aiming/NOTES.md §1.4). It also parks the aim point ABOVE the
// band the enemies fan through, which the agent-playtest skill has been
// documenting as a standing instrument caveat ("enemies cluster at/below the
// horizon, away from the aim point"). That was never an instrument caveat. It
// was this constant.
//
// STILL OWED: a direct 60 Hz consecutive-decode track of the arcade sight glyph
// to confirm +0.16 against R15's inference (R15 itself notes its window only
// reached +0.42 and that +0.62 rests on the cited 27 %H extreme). 0.16 is the
// better-evidenced of the two numbers on the table, not a closed one.
const SIGHT_NDC_Y_OFFSET = 0.16;
// The same 0.30 expressed as a distance in frame WIDTHS, which is the
// isotropic unit the offset has to be applied in now that its direction is
// screen up rather than NDC +y: 0.30 * 0.5 * (224/320) = 0.105 = 10.5 %W.
// Derived from SIGHT_NDC_Y_OFFSET rather than written out, so the measured
// constant stays the single source.
const SIGHT_FRAC = SIGHT_NDC_Y_OFFSET * 0.5 * (224 / 320);
const SIGHT_DEPTH = 55;

// --- THE AIM ASSIST, REBUILT IN R8 ---------------------------------------
//
// THE GAP THIS CLOSES, measured three times on three trees by three
// reviewers: a pilot who never touched the stick scored 86.3 % (R6), 85.8 %
// (R7 feel) and 71.7 % (R7 judge) of what a two-axis tracking pilot scored,
// at 5.3-6.1x the arcade's own measured kill rate. This lane's own baseline:
// 90.7 % (2.7722 against 3.0556 kills/s of flight, 4 seeds x 180 s, every
// tick). The gun did not need the player.
//
// AND THE MECHANISM, WHICH IS NOT THE ONE THE GAP TEXT NAMES. R6 named the
// missing reach cap in vulcan.resolveHits; the R7 feel critic's controlled
// `gunonly` arm priced that at 4.2 % of the gun's kills and pointed instead
// at the assist's own depth band. This lane measured the band directly and
// it is worse than "three times too deep" — IT IS VERY NEARLY THE COMPLEMENT
// OF THE BAND IN WHICH AN AIRCRAFT CAN BE SEEN:
//
//   an enemy of base wingspan reaches the 10 %W readable gate at depth 7.06
//   the shipped band was 6 < d < 22, which is 1.83 s of approach
//   of that, d in [6, 7.06] — the only readable part — is 0.23 s, 12.6 %
//   and for d < 6, where the aircraft is 11.8-27 %W, the assist was OFF
//
// So the gun was given its aim exactly while the target was too small to
// identify, and had it taken away exactly when the target became visible.
// That is the whole of gap 1: 84.4 % of the neutral arm's gun kills were
// below the readable gate, at a median span of 8.22 %W and median depth 8.16.
//
// WHAT IS LICENSED, and all three bounds are derived rather than chosen:
//
//  1. DEPTH. The assist (and the gun's reach) stop at the depth where the
//     target is big enough for the project's own readability criterion to
//     count it. Not a tuned constant — `readableDepth` below is computed
//     from the live camera and ENEMY_WORLD_WIDTH.
//  2. VERTICAL AIM. `ASSIST_Y_FRAC` of the target's offset from the sight,
//     not all of it. The shipped behaviour was `ndcY: best.ndc.y` — the
//     round's vertical aim point BECAME the enemy's own altitude, exactly,
//     so for any target in the cone the player's vertical stick contributed
//     nothing whatever. R7's flow lane opened the vertical envelope to the
//     arcade's own extreme (27.02 %H) and the gun made it worth +7.2 %.
//  3. CONE. Measured from the SIGHT in both axes. The shipped test measured
//     dy from the sight and dx from the NOSE, which are 0.30 NDC apart, so
//     the cone was not centred on anything the player could see.
//
// GAME_SPEC.md §3's own wording is the authority for all of this and it was
// not being followed: "a round snaps its altitude/depth ramp to the nearest
// enemy NEAR THE SIGHT LINE at spawn", and "the vulcan is effectively the
// ANTI-CLOSE-RANGE weapon".
//
// R13 — 0.13 -> 0.09, AND THIS IS THE MOVE R11b NAMED AND DEFERRED. lockSystem.js's
// R11b note recorded that "aiming now matters" was true of the MISSILE and not
// of the GAME, because this cone, at 0.13, is 1.32x the sight's whole +-9.85 %W
// reach (0.0985 fracW) — "the gun assists onto essentially anything the player
// could ever aim at" — and it named the fix: "the gun's assist cone, in
// combat.js." It was out of R11/R12 scope and left for a round that touched the
// gun.
//
// THIS IS THAT ROUND, AND R13's OWN ROUTING FORCED IT. The lock-bait, gun-dwell
// and flyby this round route more READABLE traffic through the near field by
// design, and a cone wider than the sight's reach converts that traffic into
// kills for a DEAD-CENTRE stick: measured, blind-pilot vulcan rose 14 -> 24 over
// 90 s (judging/R13/lock_probe.mjs, seed 7) and the blind kill SHARE went
// 64 % -> 82 % even as the missile share fell 27 % -> 13 %. Routing that helps
// the aiming pilot must not hand the same kills to a pilot who never aims — the
// round's own "do-nothing pilot must not rack up kills" constraint.
//
// 0.09 is just inside the sight's reach, so the cone now marks WHERE THE PLAYER
// IS POINTING rather than a region wider than they can point. Measured on the
// shipped routing, seed 7 / seed 3, 90 s, aim vs blind (same probe):
//
//   assistrad   aim vulcan   blind vulcan   blind SHARE (total)
//     0.13          10            24            82 %
//     0.09          10            17            61 %   <- below the no-routing 64 %
//
// The aiming pilot's gun is UNCHANGED (10 either way — a sight actually on the
// target is inside both cones); only the auto-aim onto traffic the player is
// NOT pointing at is withdrawn. It cannot regress "gun kills at the sight": that
// is `reachdepth`/`minspan` (the unassisted round's depth ramp), a different
// lever, and a narrower assist moves kills CLOSER to the sight, not away. 0.065
// was also measured and gains nothing over 0.09 (blind 17 either way), so 0.09
// is the least change that closes it.
const ASSIST_RADIUS_FRAC = 0.09;
// Share of the target's own vertical offset from the sight that the assist
// supplies. 1.0 is the shipped R7 behaviour — the gun aims for you.
//
// SHIPPED AT 0: THE ASSIST SNAPS THE DEPTH RAMP AND NOTHING ELSE, and that
// is both the measured answer and, on re-reading, the only thing ADOPTED
// #100 ever needed. The failure it was added for is "shots pass under
// airborne enemies", and the cause of that failure is the DEPTH ramp, not
// the altitude: an unassisted round ramps its depth to DEFAULT_TARGET_DEPTH
// = 55, so when it is at depth 8 it is only 14.5 % of the way along its
// screen path and passes under anything up at the sight. Snapping the depth
// fixes that completely. The altitude snap was never the fix, and it is what
// took the vertical axis off the player.
//
// Measured, 2 seeds x 180 s, this lever alone against the R7 build (every
// other constant at its R7 value): it is the ONLY single lever that moves
// the neutral/tracking ratio materially — 90.3 % -> 84.0 % — and it is the
// only one that makes the sky FULLER rather than emptier at the same time
// (readable-enemy presence 45.7 -> 58.6 % neutral, 19.0 -> 30.7 % tracking),
// which is the constraint the gap text attaches to any fix.
const ASSIST_Y_FRAC = 0;
// The readability gate the gun's range is derived from: R3's density
// criterion, "at least one enemy at >= 10 %W", which is also the gate both
// R7 reviewers measured the kill-size distribution against.
export const READABLE_SPAN_FRAC = 0.1;
// R14 — THE GUN'S KILL-SPAN GATE, DECOUPLED FROM THE READABILITY GATE and
// raised 0.10 -> 0.14. This is the rank-1 lever ("the gun kills without you"):
// the gun may now only kill an aircraft that is genuinely close/big (>= 14 %W),
// not merely readable.
//
// THE DEFECT IT CLOSES, measured. A dead-centre do-nothing stick gets ~20 gun
// kills/90 s and a perfect gun-aimer gets ~36 — aiming barely out-kills doing
// nothing (R13 judge: "blind ~= aimed"). The cause is not the assist (R11 §2.1
// + R13 both found ASSIST_RADIUS_FRAC inert, and R14 re-confirmed removing the
// assist entirely HURTS the aimer MORE than the blind pilot: aim 36->24, blind
// 20->16 — the assist is not the blind-feeder). It is that readable traffic
// converges onto the centred sight by the 1/d back-loading (enemy.js note 2),
// so a parked sight sits in the fat of the traffic. The gun's own span gate was
// tied to the READABILITY gate (0.10), which licensed the gun against every
// 10 %W speck that drifted through centre — the widest part of the approach,
// where a blind sight catches most.
//
// Raising the gate to 0.14 makes the gun the "anti-close-range weapon"
// GAME_SPEC.md §3 already calls it: a base-wingspan fighter reaches 14 %W at
// depth ~5.0 (vs 10 %W at 7.06), so the kill window is the last ~2 depth-units
// of the pass. A centred sight only clips a target during that short close
// window; a sight that TRACKS a target down to close range kills it wherever it
// flies. Measured (judging/R14/gun_aim_probe.mjs, gun-only isolation — trigger
// held, no missiles — 90 s, seeds 7 & 3; the aim arm is a perfect-tracker UPPER
// BOUND and over-reads human play, the blind arm is trustworthy):
//
//   minspan   blind gun   aim gun   aim/blind   aim-blind
//     0.10       20/22       36        1.80         16     <- shipped before R14
//     0.14       13/15       32        2.46         19     <- R14
//     0.16       11          22        2.00         11     (aim over-culled)
//
// 0.14 maximises BOTH the ratio and the absolute aim-minus-blind gap; 0.16
// starts culling the aimer's own kills (the target is big enough to gun for too
// short a window even when tracked). Pairing it with hitminp=0.9 was measured
// and rejected: it drops the aimer to 26 for no better ratio (the p-gate narrows
// the kill band around the sight vertically, which bites the tracker too).
//
// IT IS ADOPTED, NOT MEASURED-AGAINST-THE-ARCADE, and honestly so: no arcade
// gun kill-size census exists (the pre-R14 0.10 was itself ADOPTED, tied to the
// readability gate, never an arcade gun reading). This moves one ADOPTED number
// to another, justified by the blind-vs-aim control the method requires, in the
// direction GAME_SPEC.md §3's own "anti-close-range" wording points. `?gun=
// minspan=0.10` recovers the pre-R14 gate exactly for the A/B.
const GUN_KILL_SPAN_FRAC = 0.03; // R26: was 0.14 -- the gun killed nothing in naive play because enemies had to be ~14%W (very close). 0.03 lets the stream kill enemies at normal ranges (owner: "the gun is dead").
// Lead the target's closure over the round's time of flight. An enemy closes
// by exp(depthRate * TRAVEL_S) during the 0.7 s a round is in the air — a
// factor of 0.609 at the shipped depth rate — so snapping the round's depth
// ramp to where the aircraft IS aims it behind where the aircraft will BE.
// With the lead the round and its target arrive at the same depth at the end
// of the ramp, which is also where the round reaches its aim point, so the
// hit resolves AT the aim point instead of at whatever fraction of the way
// there the depth arithmetic happened to cross.
const ASSIST_DEPTH_LEAD = 1;

// Player hit radius/depth window for checkPlayerHit (R4 game-flow addition),
// pulled out to named top-level constants per combat-dev's request — these
// are COMBAT BEHAVIOUR (hit radius, what counts as a hit), not plumbing, so
// they live here as plain tunables rather than buried in a helper's body.
// GAME_SPEC.md doesn't measure a player hitbox size; 0.09 (an 18%W-wide box
// against the 35.6%W jet) was a documented ASSUMED starting point — retune
// directly here, no need to route changes through gameflow-dev.
// Retuned from gameflow-dev's initial 0.09 at their invitation. 0.09 put a
// 18%W-wide kill box around the centroid of a 35.6%W jet — about half the
// drawn span, so a shot anywhere near the inner wing was lethal. AB2 is
// forgiving about wingtips; the lethal area is the fuselage. 0.065 = a
// 13%W box, still comfortably inside the airframe.
// 0.040 — an 8%W box, 25.6 x 25.6 native px at 320x224.
//
// Sized against the airframe it stands for rather than tuned to a death rate:
// the jet spans 35.6%W = 114 px and R4 gap 1's own criterion (a) puts a
// fuselage at <=35% of span, i.e. <=40 px. 25.6 px is inside that, so the box
// is the fuselage core and the wings are not lethal — which is the arcade's
// documented behaviour ("AB2 is forgiving about wingtips") and was the
// reasoning for the earlier 0.065 -> 0.05 step too.
//
// Deliberately NOT pushed further. It is the cheapest number in the file to
// move and the least honest: once it is smaller than the fuselage, the fix
// has stopped being "the hit box matches the aircraft" and started being
// "rounds pass through the aircraft". The remaining factor in R4 gap 5 was
// taken out of time-of-flight (enemyShots.js SPEED) instead.
const PLAYER_HIT_RADIUS_FRAC = 0.040;
// How near a shot has to pass before the inbound-warning warble picks it up.
// Derived from the kill radius so the two cannot drift apart: a sound that
// only fires on shots that hit teaches nothing, and one that fires on every
// shot on screen is ambience.
const WARN_MISS_FRAC = PLAYER_HIT_RADIUS_FRAC * 3.2;

// Miss-distance histogram resolution for _logMiss. 0.01 per bin over
// 0..0.40 of a frame width, so PLAYER_HIT_RADIUS_FRAC (0.040) is exactly
// four bins and a change in the hit radius does not need a re-binning.
const MISS_BINS = 40;
const MISS_BIN_W = 0.01;

export class Combat {
  constructor(scene, camera, baseQuaternion, rng) {
    this.scene = scene;
    this.rng = rng;
    this.space = new ScreenSpace(camera, baseQuaternion);

    this.smoke = new SmokeField(scene, this.space);
    this.explosions = new ExplosionField(scene, this.space);
    // R27 (combat-feel): a hit flash + spark on EVERY connecting round, so a
    // non-fatal hit is no longer silent. Driven from _damage() below.
    this.hitFlash = new HitFlashField(scene);
    this.spawner = new Spawner(scene, this.space, rng);
    // The gun's scatter stream. Seeded from the URL seed so `?seed=N` is
    // still frame-exact, XORed with a constant so it is not the same
    // sequence as any other stream, and created with `createPrng` rather
    // than by taking a draw from `rng` — taking a draw here would rewind
    // the spawner's stream by one and make every wave in the game a
    // function of this line's existence.
    const urlSeed = (() => {
      const p = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
      return p.has('seed') ? Number(p.get('seed')) : 1;
    })();
    this.vulcan = new Vulcan(scene, this.space, createPrng((urlSeed ^ 0x5ca77e4) >>> 0));
    this.missiles = new Missiles(scene, this.space, this.smoke);
    this.enemyShots = new EnemyShots(scene, this.space);
    this.locks = new LockSystem(scene, this.space);
    this.telegraphs = new Telegraphs(scene, this.space);

    this.missileStock = MISSILE_START_STOCK;
    this.hits = 0;
    this.salvoCooldown = 0;
    this.gatherTimer = 0; // R25: lock-gather window, see SALVO_GATHER_S
    // R36 (lock-clarity lane, routed through this file's owner): cooldown for
    // the no-lock DRY missile — its own clock, NOT salvoCooldown, so a dry
    // round never delays the acquire beat. See _updateMissiles.
    this.dryCooldown = 0;
    this.launchQueue = [];
    this.launchTimer = 0;
    this.launchSide = 1;

    this.playerNdc = { x: 0, y: 0, depth: 5 };
    this.sight = { x: 0, y: SIGHT_NDC_Y_OFFSET, depth: SIGHT_DEPTH };
    this._up = { x: 0, y: 1 };
    this._aimAssist = (ndc) => this._findAssistTarget(ndc);

    // --- R8: the gun's licensed range, DERIVED from the camera -----------
    // `spanFrac(w, d) = w / (widthPerUnitDepth * d)`, so the depth at which a
    // base-wingspan enemy spans READABLE_SPAN_FRAC is `spanFrac(w, 1) / R`.
    // On the shipped camera: 1.05 / 1.4873344 / 0.10 = 7.0596.
    //
    // Written this way rather than as a literal 7.06 so it cannot go stale.
    // This project has paid for that twice in the same quarter —
    // `spawner.js`'s REACH_CEILING_NDC_Y is derived in its comment from a
    // lock radius and a player ceiling that are both long gone, and
    // `enemyShots.js`'s worked example reasons at 15 u/s while its own
    // constant is 10. A derived number re-derives itself; a transcribed one
    // does not.
    this.readableDepth = this.space.spanFrac(ENEMY_WORLD_WIDTH, 1) / READABLE_SPAN_FRAC;
    // --- AND THE SHIPPED GATE IS THE SPAN ITSELF, NOT A DEPTH ------------
    //
    // The R8 isolation sent me back here, and this is the refinement it
    // asked for. A depth bound is a PROXY for "the target is big enough to
    // kill" and the proxy is wrong per aircraft type: `widthScale` runs 0.92
    // (interceptor) to 1.35 (bomber), so one depth licences the gun against a
    // bomber that is already at the 14 %W gate while the interceptor beside it
    // is only 9.5 %W — still under it (R14 raised the gate from 0.10 to 0.14,
    // GUN_KILL_SPAN_FRAC; the per-type point is unchanged). Testing the OWN
    // projected span is the criterion rather than a stand-in for it, costs
    // nothing (`resolveHits` already computes `spanFrac` for the hit radius)
    // and is immune to the camera, the depth rate and any future widthScale.
    //
    // IT ALSO GATES THE UNASSISTED ROUND, which the isolation showed is the
    // term that actually mattered and which a depth bound on the ASSIST
    // cannot touch. Running `assistmax` alone — the arm I expected to be the
    // dominant fix — made the gun MORE lethal, not less (gun kills 584 ->
    // 618 neutral, 699 -> 737 tracking), because switching the assist off
    // just hands the work to rounds flying the bare sight line to
    // DEFAULT_TARGET_DEPTH, and those had no bound of any kind. Main effects
    // measured one at a time were actively misleading here: the assist band
    // and the reach cap are not two independent fixes, they are two halves
    // of one.
    this.minKillSpan = gunTunable('minspan', GUN_KILL_SPAN_FRAC);
    // R12: the depth an UNASSISTED vulcan round ramps to. Shipped at the
    // readable depth so unassisted kills resolve up at the sight (R11 §2.1);
    // `?gun=reachdepth=55` recovers the pre-R12 muzzle-killing behaviour for
    // the A/B that certifies the change.
    this.vulcanReachDepth = gunTunable('reachdepth', this.readableDepth);
    // R12: a vulcan round is inert until it has flown this fraction of its
    // muzzle->aim-point path, so its kill resolves up at the sight the player
    // aimed at rather than at the muzzle (R11 §2.1). Shipped on; set
    // `?gun=hitminp=0` to recover the pre-R12 whole-stream behaviour.
    this.vulcanMinHitP = gunTunable('hitminp', VULCAN_MIN_HIT_P);
    // Retained ONLY as isolation levers, so the R7-equivalent control can be
    // exact. Shipped wide open: the span gate above is the live mechanism and
    // two mechanisms for one concept is how `lockSystem.js` came to hold
    // three values for its lock radius.
    this.assistDepthMax = gunTunable('assistmax', Infinity);
    this.assistDepthMin = gunTunable('assistmin', FLY_PAST_DEPTH);
    this.assistRadius = gunTunable('assistrad', ASSIST_RADIUS_FRAC);
    this.assistYFrac = gunTunable('assistyfrac', ASSIST_Y_FRAC);
    this.assistLead = gunTunable('assistlead', ASSIST_DEPTH_LEAD);
    // The last two levers exist only so the ISOLATION CONTROL can be exact.
    // Everything above is a magnitude; these two are the two behavioural
    // changes R8 made to this function that no magnitude can express — which
    // target is chosen, and where the cone is centred. Without them the
    // "reproduce the baseline" arm would differ from the shipped R7 build in
    // three ways at once and could not certify the instrument, and every
    // single-lever arm would silently carry them too. Shipped at the R8
    // values; set to 0 to recover the R7 function exactly.
    this.assistPickNearestSight = gunTunable('assistpick', 1);
    this.assistConeFromSight = gunTunable('assistfromsight', 1);
    // Depth form of the reach cap: isolation lever only, shipped off. The
    // span gate above subsumes it — `resolveHits`'s own depth-tolerance test
    // already requires the round and its target to be at similar depths, so
    // a round at depth 55 can only ever be near an aircraft at depth ~48-62,
    // which the span gate rejects. Verified redundant rather than assumed:
    // the shipped build's deepest vulcan kill is reported in §4.
    this.vulcanReach = gunTunable('reach', Infinity);

    // Flight times of missiles that reached a target, kept for the
    // measurement probe (GAME_SPEC.md §3's 0.5-1.5 s launch->impact is an
    // acceptance number, so it has to be readable rather than eyeballed).
    this.impactTimes = [];
    this.missiles.onImpact = (enemy, missile) => {
      // No explosion sound here: _damage() below plays it for every kill
      // from either weapon AND knows the target type, so it can pass
      // { big: true } for a bomber. Firing from both sites double-triggered
      // on every missile kill, same tick, no gap (audio-dev).
      this.impactTimes.push(missile.age);
      if (this.impactTimes.length > 64) this.impactTimes.shift();
      this._damage(enemy, 99, 'missile');
    };

    // R8 KILL LEDGER, measurement-only. Every kill's WEAPON, projected SIZE
    // and DEPTH at the instant it died, recorded at the single funnel every
    // kill passes through (_damage).
    //
    // It exists because the two R7 reviewers both had to INFER these and
    // both said so. The feel critic matched each tick's `hits` delta against
    // the enemies that left the live list and could attribute 97.8% of kills
    // (counting the rest ambiguous rather than guessing); it could not
    // attribute any of them to a WEAPON, and had to separate the gun from the
    // missile by running single-weapon arms — which is a different game, not
    // a decomposition of this one. Its central column ("killed beyond the
    // assist cone's depth limit") then could not tell the gun's missing reach
    // cap from the missile working exactly as licensed, and the obvious
    // reading of it was wrong by a factor of seven. This hook makes both
    // questions direct reads.
    //
    // Drained, not capped. `hitLog`'s 256-entry shift() silently dropped 83%
    // of the R7 fairness evidence and had a plausible "0 unannounced" to show
    // for it, so this one hands its entries over and empties itself: a probe
    // cannot lose an entry by sampling too slowly, only by not calling.
    // `killsDropped` is the backstop if nobody drains — a cap that announces
    // itself rather than one that lies.
    this.killLog = [];
    this.killsDropped = 0;
    this.killCounts = { vulcan: 0, missile: 0, other: 0 };

    // `?combatonly=a,b` — measurement-only isolation switch. Runs a single
    // combat subsystem against an otherwise empty sky so a sprite can be
    // measured without enemies, smoke and tracers leaking into the mask.
    // This is the harness the enemy-scaling and trail-occupancy numbers in
    // the dev report were taken on; the alternative (measuring in a live
    // combat frame) is what produced three different answers for one jet in
    // the sibling project. Never read in normal play.
    const params = new URLSearchParams(location.search);
    const only = params.get('combatonly');
    this.only = only ? new Set(only.split(',')) : null;

    // `?combattrail=1` — measurement-only: no enemies at all, and the
    // missile button fires a stagger of UNGUIDED missiles straight up the
    // sight line. The smoke trail is greyscale and so are the enemy
    // airframes and the lock brackets, so with any of those on screen a
    // value-based segmentation of the trail is measuring a mixture. This
    // mode leaves the trail as the only non-sky, non-sea object in frame,
    // which is what the column-occupancy and bright/dark quintile numbers in
    // the dev report were measured on. Never read in normal play.
    this.trailHarness = params.has('combattrail');

    // `?invincible=1` — measurement-only: checkPlayerHit always reports a
    // miss, so a capture or probe can observe >=30 s of continuous flight.
    //
    // This exists because the death path CLEARS combat, so every death
    // restarts the sky from empty and the only combat ever observable is
    // the first 2-3 s of a rebuild — which makes the size-qualified density
    // criterion, enemy fire volume and salvo depth all unmeasurable. The
    // sibling project's standing rule is that a capture-invincibility
    // switch is the right tool for live verification that is not itself
    // testing death. Gated here rather than in the flow state machine
    // because this file owns what counts as a hit; src/game/flow/ owns what
    // happens afterwards.
    this.invincible = params.has('invincible');
    this.playerHitsTaken = 0;
    this._prevLockCount = 0;
    // This file's own clock. It used to be created lazily by update()'s
    // `this.t = (this.t ?? 0) + dt`, and that cost a real crash: flow.js calls
    // checkPlayerHit() from _updateFlight BEFORE game.js reaches
    // combat.update() on the same tick, so on the very first flight tick
    // `this.t` was still undefined. Under `?invincible=1` the respawn edge
    // fires on exactly that tick, which stamped `_lifeStartT = undefined`, and
    // the first hit logged afterwards threw
    // "Cannot read properties of undefined (reading 'toFixed')" out of
    // _logHit — inside the game loop, so in a browser it stops the game, and
    // inside page.evaluate it rejects the probe's promise WITHOUT firing a
    // pageerror, which is why an errors:[] run is not evidence of no crash.
    // Reproduced at ?fixed=1&demo=2&seed=1&invincible=1 tick 1431 (also seed 2
    // tick 3551, seed 3 tick 7685). Initialising it here removes the class.
    this.t = 0;
    // Start of the life currently being flown, in that clock. 0 = the first
    // life of a credit, which gets no respawn grace. Advanced on the respawn
    // edge in checkPlayerHit; read only by _logHit.
    this._lifeStartT = 0;

    // `?combatexpl=1` — measurement-only: no enemies, no weapons; one
    // explosion every 1.2 s at a fixed screen position and depth. The
    // explosion palette has to be measured at PEAK opacity against a known
    // background: sampled out of live combat it is a mixture of the fireball,
    // its own fade-out alpha blending toward the sky, debris chunks and
    // whatever else is in frame, which is how a correctly-authored palette
    // can measure as "muddy brown". Never read in normal play.
    this.explHarness = params.has('combatexpl');
    this._explTimer = 0;

    // Cumulative fire/telegraph tallies for the fairness probe. Counters
    // rather than instantaneous counts because "enemy shot volume unchanged"
    // (R4 gap 5's own constraint on the fix) is a question about TOTAL rounds
    // fired over a run, and `enemyShots.shots.length` only reports how many
    // happen to be in the air at the instant you look.
    this.shotsFired = 0;

    // Spawner/pacing internals, exposed from THIS side rather than through
    // game.js's __combatStats hook, so the diagnostic survives game.js
    // changing hands. `?fixed=1` only.
    //
    // WARNING, and the reason __fairness below exists as a SECOND hook:
    // `rngSample` CONSUMES a draw from the shared PRNG, so every call to
    // __combatDebug perturbs the simulation from that tick onward. That is
    // acceptable for a one-shot inspection and fatal for a probe that polls
    // several hundred times across a 3-minute run — the thing being measured
    // (how often the player dies) would then depend on the sampling rate.
    // __fairness touches no RNG and is the one to poll.
    if (params.has('fixed') && typeof window !== 'undefined') {
      window.__combatDebug = () => ({
        waveTimer: this.spawner.waveTimer,
        dispenseTimer: this.spawner.dispenseTimer,
        waveIndex: this.spawner.waveIndex,
        pending: this.spawner.pending.length,
        alive: this.spawner.enemies.length,
        playerHitsTaken: this.playerHitsTaken,
        hitLog: (this.hitLog ?? []).slice(-16),
        playerNdc: { x: this.playerNdc.x, y: this.playerNdc.y },
        telegraphsLit: this.spawner.enemies.filter((e) => e.telegraph > 0).length,
        rngSample: this.rng(),
      });
      // LOCK-BRACKET GEOMETRY, read from the live sprites rather than from
      // pixels. R4 gap 10's residual defect — the bracket degenerating under
      // heavy bank — was first seen in a near-white connected-component
      // measurement, which cannot tell "the bar was not placed there" apart
      // from "the bar was placed there and something covered it, clipped it,
      // or merged with it". The missile trail, the sight square and the HUD
      // are all in the same segmentation class, and the brackets are
      // depth-tested against the ground. So project the eight bar sprites
      // through the live camera and read native-pixel positions directly:
      // the harness measures placement, and a pixel pass afterwards measures
      // whether what was placed survived to the screen. One of those two is
      // the actual bug and they are not the same question.
      // THE SIGHT SQUARE'S LIVE SCREEN POSITION, measurement only. Same
      // reasoning as __brackets below: read the projection of the sprites
      // that were placed, not the pixels, so "not placed there" and "placed
      // there and covered" stay separable. Returns NDC through the LIVE
      // (rolled) camera, which is the frame the question is asked in --
      // "does the sight hold station on the nose while the world rolls".
      // R11, measurement-only, and it is the one quantity the death-sequence
      // hole cannot be measured without. `deathSequence.js` now ends its
      // starburst phase on `explosions.busy()`; a probe that wants to assert
      // "no frame in the death sequence draws nothing" has to read the same
      // predicate the phase reads, not a pixel proxy for it, or it cannot tell
      // "the field is idle" from "the field is drawing something too faint for
      // my mask". Touches no RNG -- deliberately unlike __combatDebug(), which
      // consumes one from the shared stream and would shift the scenario if a
      // probe polled it per tick.
      window.__explBusy = () => this.explosions.busy();
      window.__sight = () => {
        const cam = this.space.camera;
        const v = new THREE.Vector3();
        const pts = this.locks.sightCorners
          .filter((c) => c.visible)
          .map((c) => {
            v.copy(c.position).project(cam);
            return [v.x, v.y];
          });
        if (!pts.length) return null;
        return {
          ndcX: pts.reduce((a, p) => a + p[0], 0) / pts.length,
          ndcY: pts.reduce((a, p) => a + p[1], 0) / pts.length,
          n: pts.length,
        };
      };
      window.__brackets = () => {
        const cam = this.space.camera;
        const v = new THREE.Vector3();
        const px = (s) => {
          v.copy(s.position).project(cam);
          return [
            Number((((v.x + 1) / 2) * 320).toFixed(2)),
            Number((((1 - v.y) / 2) * 224).toFixed(2)),
          ];
        };
        const sets = this.locks.brackets
          .filter((set) => set[0].visible)
          .map((set) => {
            const pts = set.map(px);
            const xs = pts.map((p) => p[0]);
            const ys = pts.map((p) => p[1]);
            return {
              bars: pts,
              // Bar CENTRES, so the box these eight bars describe is
              // measured as the arcade measurement describes it: the span of
              // the four corners, in native px of 320x224.
              boxW: Number((Math.max(...xs) - Math.min(...xs)).toFixed(2)),
              boxH: Number((Math.max(...ys) - Math.min(...ys)).toFixed(2)),
            };
          });
        // Screen-space roll, derived the same way the placement code derives
        // its axes: the camera's own right axis, expressed in the UNROLLED
        // basis the world is authored in. atan2 of that is exactly the angle
        // the image is rotated by, with no Euler-order ambiguity.
        const r = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        r.applyQuaternion(this.space._inv);
        return {
          rollDeg: Number(((Math.atan2(r.y, r.x) * 180) / Math.PI).toFixed(2)),
          sets,
        };
      };
      // R10: THE LOCK, per tick, including the state that did not exist
      // before this round -- the acquisition in progress. `armFrac` is read
      // off the live bracket sprites' geometry rather than recomputed, so
      // "the bracket looks different while acquiring" is a READ and not a
      // claim: `arm` is each set's drawn corner-arm length in native px.
      window.__lockState = () => ({
        t: this.t ?? 0,
        locks: this.locks.locks.length,
        acquiring: this.locks.acquiring
          ? Number(this.locks.acquiring.t.toFixed(4))
          : null,
        tracked: !!this.locks.tracked,
        inFlight: this.missiles.live.length,
        stock: this.missileStock,
        hold: !!this._lockHold,
        // One entry per drawn bracket: its box span and its arm length, both
        // in native px of 320x224, measured from the sprite scales the
        // renderer is about to use.
        drawn: this.locks.brackets
          .filter((set) => set[0].visible)
          .map((set) => {
            const d = set[0].position.distanceTo(this.space.camera.position);
            const px = this.space.worldWidthFor(1 / 320, d) || 1;
            return {
              arm: Number((Math.max(set[0].scale.x, set[0].scale.y) / px).toFixed(2)),
            };
          }),
      });
      // R10: EVERY LIVE MISSILE'S TRAJECTORY, per tick. The missile's
      // behaviour is a shape over time and every statistic this project has
      // taken of it was an aggregate (93.8 % of launches kill) that cannot
      // tell a seeker from a timer. Touches no RNG, allocates a small array.
      //
      // `lat` is the quantity the R9 critique found missing from the hit
      // test entirely: the missile's screen distance from its target, in
      // ISOTROPIC frame-width fractions (x in half-NDC, y through the
      // 224/320 aspect) -- the same unit LOCK_RADIUS_FRAC and the new
      // HIT_RADIUS_FRAC are in, so a trace and a constant are comparable
      // without a conversion step in between.
      window.__missiles = () => {
        const aspectY = 224 / 320;
        return this.missiles.live.map((m) => {
          const t = m.target;
          const lat =
            t && t.alive
              ? Math.hypot(
                  (t.ndc.x - m.ndcX) * 0.5,
                  (t.ndc.y - m.ndcY) * 0.5 * aspectY
                )
              : null;
          return {
            age: Number(m.age.toFixed(4)),
            depth: Number(m.depth.toFixed(3)),
            ndcX: Number(m.ndcX.toFixed(5)),
            ndcY: Number(m.ndcY.toFixed(5)),
            turn: Number((m.lastTurnFrac ?? 0).toFixed(6)),
            lat: lat === null ? null : Number(lat.toFixed(5)),
            tgt: t && t.alive ? { d: Number(t.d.toFixed(3)), x: t.ndc.x, y: t.ndc.y } : null,
            dead: !!m.targetLost,
          };
        });
      };
      // R10 missile outcome ledger, drained like __killDrain and for the same
      // reason. One row per RETIREMENT, with the lateral miss distance at the
      // depth crossing -- so "it missed" is a number and not an absence.
      window.__missileDrain = () => {
        const out = this.missiles.outcomes;
        this.missiles.outcomes = [];
        return out;
      };
      window.__missileDropped = () => this.missiles.outcomesDropped;
      // R8 kill ledger, drained. Returns every kill since the last call and
      // empties the buffer; touches no RNG. See the constructor for why this
      // is a drain and not a ring.
      window.__killDrain = () => {
        const out = this.killLog;
        this.killLog = [];
        return { kills: out, dropped: this.killsDropped, counts: { ...this.killCounts } };
      };
      // WHAT THE PAGE IS ACTUALLY RUNNING, read back rather than assumed.
      // Every `?gun=` arm in judging/R8/lane-combat.md quotes this, because
      // a lane that writes down the arm it MEANT to run is one typo away
      // from a wrong table — and `?gun=` throws on an unknown key precisely
      // so that typo cannot present as the shipped default.
      // R8: which of the enemy sheet's five authored bank poses the game
      // actually selected. `textureFor` dropped `bankDeg` for three rounds,
      // so four of the five were never reachable; this makes "they are now
      // selected" a read instead of a claim, and `levelOnlyTicks` separates
      // "no pose was chosen" from "the sheet had not decoded".
      window.__poseCensus = () => ({ ...poseCensus, byDeg: { ...poseCensus.byDeg } });
      window.__gunTunables = () =>
        gunTunableReport({
          // Infinity through JSON.stringify becomes `null`, which reads as
          // "unset" to anyone reading the probe output — and these two are
          // Infinity ON PURPOSE in the shipped build (the span gate below
          // subsumes both). Reported as the string so the readback says what
          // it means.
          assistmax: Number.isFinite(this.assistDepthMax) ? this.assistDepthMax : 'Infinity',
          assistmin: this.assistDepthMin,
          assistrad: this.assistRadius,
          assistyfrac: this.assistYFrac,
          assistlead: this.assistLead,
          assistpick: this.assistPickNearestSight,
          assistfromsight: this.assistConeFromSight,
          reach: Number.isFinite(this.vulcanReach) ? this.vulcanReach : 'Infinity',
          // The live gate. Omitting it from the readback while quoting it as
          // the shipped mechanism is exactly the provenance gap REFERENCE's
          // citation rule exists for.
          minspan: this.minKillSpan,
          scatter: this.vulcan.scatterFrac,
          hitmult: this.vulcan.hitMult,
          lockrad: this.locks.radius,
          closure: this.spawner.closureStrength,
          readableDepth: this.readableDepth,
        });
      window.__fairness = () => ({
        t: this.t ?? 0,
        killCounts: { ...this.killCounts },
        killsDropped: this.killsDropped,
        shotsFired: this.shotsFired,
        telegraphsStarted: this.spawner.trainsStarted,
        telegraphsLit: this.telegraphs.live.length,
        shotsInAir: this.enemyShots.shots.length,
        playerHitsTaken: this.playerHitsTaken,
        hits: this.hits,
        hitLog: this.hitLog ?? [],
        // R6 lethality instrument -- see _logMiss. A histogram, not a list:
        // ~1100 crossings per 3-minute run would be a 40 KB array per poll
        // and the probe polls 10x a second.
        missHist: Array.from(this.missHist ?? []),
        missCrossings: this.missCrossings ?? 0,
        missBinW: MISS_BIN_W,
        hitRadius: PLAYER_HIT_RADIUS_FRAC,
        batteryCrossings: this.batteryCrossings ?? 0,
        batteryHits: this.batteryHits ?? 0,
        playerNdc: { x: this.playerNdc.x, y: this.playerNdc.y },
        // Per-enemy firing state. Needed because the aggregate counters
        // cannot distinguish "trains never start" from "trains start and
        // never pay out" — a 97% volume collapse looked identical to both
        // until this was readable.
        stageIndex: this.stageIndex ?? 0,
        enemies: this.spawner.enemies.map((e) => ({
          d: Number(e.d.toFixed(2)),
          pattern: e.pattern,
          // Livery census (R5): `role` and `livery` are what the player SEES,
          // and they are deliberately not derivable from `type` — see
          // enemy.js's LIVERY_BY_STAGE note. Counted from here rather than
          // from pixels because a single frame holds 1-3 aircraft and one
          // near-field fly-past dominates any pixel census.
          type: e.type,
          role: e.role,
          livery: e.livery.key,
          // Screen position in native px of 320x224, so a bracket's measured
          // box centre can be compared against the target it is supposed to
          // be on without going through a pixel census that cannot tell three
          // clustered aircraft apart.
          px: [
            Number((((e.ndc.x + 1) / 2) * 320).toFixed(1)),
            Number((((1 - e.ndc.y) / 2) * 224).toFixed(1)),
          ],
          // On-screen span as a fraction of frame WIDTH, from the enemy's own
          // projection rather than from a pixel mask. The R3 judge's
          // replacement density criterion is size-qualified (>=1 enemy at
          // >=10%W in >=60% of combat frames), and a pixel census cannot
          // attribute a span to an aircraft when three of them overlap — which
          // in a head-on echelon is the normal case, not the awkward one.
          wFrac: Number(e.spanFrac(this.space).toFixed(4)),
          waveId: e.waveId,
          tg: Number(e.telegraph.toFixed(3)),
          burstLeft: e.burstLeft,
          fireTimer: Number(e.fireTimer.toFixed(2)),
        })),
      });
    }
  }

  _on(name) {
    return !this.only || this.only.has(name);
  }

  // Tells combat which stage it is drawing, 0-based, matching
  // game/stage.js's STAGES array and flow.stageIndex.
  //
  // Only the missile smoke uses it so far, and it genuinely needs it: the
  // trail is a near-white opaque plume in stage-1 daylight and a dark grey
  // ribbon at night, a 2.6x difference in value that no single constant can
  // cover (effects/trailPalette.js carries the two measurements and R4
  // gap 4 is what happens without this).
  //
  // INTERFACE REQUEST, src/game/game.js (not this lane's file): one line in
  // update(), before `this.combat.update(...)`:
  //     this.combat.setStageIndex(this.flow.stageIndex);
  // Until that lands the default is daylight, which is correct for stages
  // 1-2 and wrong only for stage 3's night trail — the failure mode is a
  // white trail at night rather than a black one in daylight, i.e. the
  // cheap direction.
  setStageIndex(stageIndex) {
    this.stageIndex = stageIndex;
    this.missiles.setStageIndex(stageIndex);
    this.spawner.setStageIndex(stageIndex);
  }

  // `playerWorld` is the player sprite's world position; `input` is the
  // same { fire, missile } shape core/input.js produces.
  update(dt, input, playerWorld) {
    this.t = (this.t ?? 0) + dt;
    this.space.worldToNdc(playerWorld, this.playerNdc);
    // THE SIGHT LEADS THE NOSE ON SCREEN, NOT IN THE UNROLLED FRAME.
    //
    // It used to be `playerNdc.y + 0.30` flat, and that is a defect in the
    // SELECTION and not only in the drawing (judging/R6/ask-flow.md A1).
    // Everything in this NDC frame is authored against the pitch-only basis
    // so that it swings with the horizon under bank -- except the jet, which
    // player.js roll-compensates so the airframe holds screen station. The
    // jet's position in THIS frame therefore rotates with the bank, and a
    // constant offset bolted onto it rotates around the airframe on screen:
    // 2 x 0.30 NDC x sin(33.25 deg) = 11.5 %W at the 66.5 deg saturation
    // angle, which reproduces R4's measured 112 px.
    //
    // That moves `_findAssistTarget`'s cone and `lockSystem._nearestLockable`'s
    // cone with it, so WHICH ENEMY THE GUN HELPS YOU HIT AND WHICH ONE THE
    // MISSILES LOCK WERE BOTH FUNCTIONS OF BANK ANGLE -- during the manoeuvre
    // the player spends most of their time in, and with nothing about the
    // target having changed. Visible or not, that is wrong.
    //
    // Fixed by taking the offset along SCREEN UP (screenSpace.screenUpNdc),
    // which is a unit direction in frame-width units, and scaling it back
    // into each axis's own NDC units. At zero roll this is exactly the old
    // expression: up = (0, 1), so x is unchanged and y gains
    // SIGHT_FRAC / (0.5 * 224/320) = 0.105 / 0.35 = 0.30.
    //
    // R11: THIS IS ARCADE-CORRECT LATERALLY AND IT WAS NEARLY CHANGED.
    // `judging/R11/ask-combat.md` asked for the sight to move ~1/2.95 of the
    // jet's lateral excursion, on an arcade "jet : sight excursion ratio" of
    // 2.95. Re-measured on an independent decode (judging/R11/lane-combat.md
    // §1): the arcade's ratio is 1.02 +- 0.03 — ITS SIGHT AND ITS AIRCRAFT
    // SHARE A SCREEN COLUMN. The 2.95 was two correct measurements of two
    // different objects, and the jet half of it was reading enemy aircraft.
    // The ask is withdrawn by both lanes.
    //
    // Ours is 1.000 and the `up.x` term is WHY, not in spite of it. The sight
    // is placed in the pitch-only frame and viewed through the rolled camera,
    // so its screen offset from the jet is R(roll) * (up * SIGHT_FRAC), and
    // R(roll) * screenUp == (0, 1) identically. The lateral component is
    // therefore exactly zero at EVERY bank angle, by construction rather than
    // by tuning. Measured: `judging/R11/sight_probe.mjs --mode rails`, 1 260
    // consecutive 60 Hz ticks through the 66.5 deg roll saturation,
    // max |jetNdcX - sightNdcX| = 3.3e-14 %W, 0 page errors.
    //
    // DO NOT "FIX" THIS BY COMPARING `playerNdc.x` WITH `__sight().ndcX`:
    // those are two frames, not two objects. `playerNdc` is this file's
    // pitch-only coordinate and rotates with bank; `__sight()` and
    // game.js's `jetNdcX` are live-camera screen positions. On the same tick
    // they differ by up to 17.41 %W, which is what the 2.95 ask was looking at.
    const up = this.space.screenUpNdc(this._up);
    this.sight.x = this.playerNdc.x + (up.x * SIGHT_FRAC) / 0.5;
    this.sight.y = this.playerNdc.y + (up.y * SIGHT_FRAC) / (0.5 * (224 / 320));

    if (this.explHarness) {
      this._explTimer -= dt;
      if (this._explTimer <= 0) {
        this._explTimer = 1.2;
        const pos = new THREE.Vector3();
        const depth = 12;
        this.space.ndcToWorld(0, 0.15, depth, pos);
        this.explosions.spawn(pos, depth, this.rng, 1);
      }
      this.explosions.update(dt);
      return;
    }

    if (this._on('enemies') && !this.trailHarness) {
      // `throttleIndex` has been threaded through flow.js's returned input
      // since R5 with nothing consuming it (judging/R6/ask-flow.md A6).
      // Defaulted to M rather than 0 so a caller that does not supply it --
      // every measurement harness in tools/ -- gets the measured datum and
      // not the slow detent.
      const fires = this.spawner.update(dt, this.playerNdc, input.throttleIndex ?? 1);
      if (this._on('shots')) {
        for (const f of fires) {
          // The aim point is ABSOLUTE and was snapshotted when this enemy's
          // telegraph lit (see enemy.js) — it is deliberately NOT the live
          // player position, which is what makes the flare a promise the
          // player can act on.
          this.enemyShots.spawn(
            f.fire,
            { x: f.fire.aimX, y: f.fire.aimY, depth: this.playerNdc.depth },
            // Measurement-only. `bornT` plus TELEGRAPH_S is the warning the
            // player had; `sweep` is how far this shot's aim sits from the
            // snapshot, i.e. how far a motionless player already was from
            // being hit. Together they decide whether a hit was DODGEABLE,
            // which is the actual fairness question — see _logHit.
            // `type` (R36): WHO fired — aircraft type or 'battery' — so a
            // death can be classified without inferring the firer from the
            // round's start position.
            // `teleS` is the telegraph duration THIS firer actually ran.
            // _logHit used to assume ENEMY_TELEGRAPH_S (1.0 s) for every
            // shot, which overstated a battery kill's warning by 0.6 s —
            // batteries flare for only BATTERY_TELEGRAPH_S (0.4 s).
            {
              bornT: this.t,
              sweep: Math.hypot(f.fire.aimX - f.fire.snapX, f.fire.aimY - f.fire.snapY),
              type: f.enemy ? f.enemy.type : 'unknown',
              teleS: f.enemy && f.enemy.isBattery ? BATTERY_TELEGRAPH_S : ENEMY_TELEGRAPH_S,
            },
            // Battery rounds fly the legibility profile (slower + the
            // arcade's median→p90 drawn size over the flight the player
            // watches) — see BATTERY_SHOT_PROFILE in groundBattery.js for
            // the R36 measurement that forced this. Air rounds unchanged.
            f.enemy && f.enemy.isBattery ? BATTERY_SHOT_PROFILE : null
          );
          this.shotsFired += 1;
        }
      }
    }
    this.enemyShots.update(dt);

    // The telegraph's two output channels. Both are driven from state the
    // enemies already carry, so neither can drift out of sync with the
    // timing that actually governs when a shot leaves.
    //
    // R7: THE FLARE GETS ITS OWN ISOLATION KEYS. `?combatonly=enemies,shots`
    // lights telegraphs, as it always has, so the R6 judge's named
    // reproduction arm means exactly what it meant when the figure was taken.
    // Two finer arms separate the two things inside it, which is what the
    // round-1 gap needed and could not express:
    //   ?combatonly=enemies,telegraph        flares, no rounds in the air
    //   ?combatonly=enemies,shots,noflare    rounds, no flares
    // The pair was what showed the flare's opacity ramp and the shot sprite's
    // antialiased interior to be two separate defects rather than one.
    const flareOn = this.only
      ? (this.only.has('telegraph') || (this.only.has('shots') && !this.only.has('noflare')))
      : true;
    const lit = flareOn ? this.telegraphs.update(this.spawner.enemies) : 0;
    this._updateInboundWarning(lit);

    if (this._on('vulcan')) {
      this.vulcan.update(dt, {
        firing: !!input.fire,
        playerNdc: this.playerNdc,
        aimAssist: this._on('enemies') ? this._aimAssist : null,
        sight: this.sight,
        onFire: (side) => AudioBus.play('vulcan', { side }),
        // R12 (lockSystem/vulcan lane): an UNASSISTED round ramps its depth to
        // the gun's readable reach instead of DEFAULT_TARGET_DEPTH = 55, so its
        // kill resolves up at the sight the player aimed at rather than at the
        // muzzle (R11 §2.1). `readableDepth` is derived from the live camera in
        // the constructor; it is the same gate `minKillSpan` already enforces.
        reachDepth: this.vulcanReachDepth,
      });
      this.vulcan.resolveHits(
        this.spawner.enemies,
        (e, dmg) => this._damage(e, dmg, 'vulcan'),
        this.vulcanReach,
        this.minKillSpan,
        this.vulcanMinHitP
      );
    }

    if (this._on('missiles')) this._updateMissiles(dt, !!input.missile);

    this.locks.update(
      dt,
      this._on('locks') ? this.spawner.enemies : [],
      this.playerNdc,
      this._lockHold,
      // The sight is gated separately from the brackets: it sits on the
      // sight line that the solo-enemy harness also flies up, so leaving it
      // on silently merges with the subject in a column-run measurement
      // (it did, on the first pass: a 9 px "enemy" that was actually the
      // sight's corner arm).
      this._on('sight') && !this.trailHarness ? this.sight : null,
      this.missiles.live.map((m) => m.target),
      // R37 aim-skill: the raw stick, so the lock gate can tell STEERING from
      // the post-death autopilot recentering (flow zeroes input during death/
      // uncontrolled states — exactly the semantics the gate needs). Inert
      // until lockSystem reads it.
      input
    );
    this.locks.bracketsVisible = this._on('brackets') && !this.trailHarness;
    // Lock-acquired tone: detected by watching the lock count rise rather
    // than by adding a callback to lockSystem.js, so that file needs no
    // audio knowledge at all (audio-dev's suggestion, and it keeps the
    // dependency pointing one way).
    if (this.locks.locks.length > this._prevLockCount) AudioBus.play('lockOn');
    this._prevLockCount = this.locks.locks.length;

    this.missiles.update(dt, this.spawner.enemies);
    this.smoke.update(dt);
    this.explosions.update(dt);
    this.hitFlash.update(dt);
  }

  _updateMissiles(dt, holding) {
    this.salvoCooldown -= dt;
    // Locks only accumulate when a salvo is not already being paid out and
    // there is stock to pay it with.
    const canArm = this.salvoCooldown <= 0 && this.missileStock > 0;
    this._lockHold = holding && canArm;
    this.dryCooldown -= dt;

    if (this.trailHarness) {
      if (holding && !this._wasHolding) {
        // Stub targets standing in for enemies: fixed screen positions off
        // to either side at a representative lock depth, so the harness
        // exercises the same homing turn a real salvo does. Duck-typed to
        // the few fields Missiles and _damage touch.
        for (let i = 0; i < 3; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          this.launchQueue.push({
            alive: true,
            retired: false,
            type: 'fighter',
            d: 34 + i * 6,
            ndc: { x: side * (0.35 + 0.1 * i), y: 0.3 },
            damage: () => false,
          });
        }
      }
      this._wasHolding = holding;
      this.launchTimer -= dt;
      if (this.launchQueue.length && this.launchTimer <= 0) {
        const stub = this.launchQueue.shift();
        this.missiles.launch(this.playerNdc, stub, this.launchSide, this.rng);
        AudioBus.play('missileLaunch');
        this.launchSide = -this.launchSide;
        this.missileStock -= 1;
        this.launchTimer = LAUNCH_STAGGER_S;
      }
      return;
    }

    // R36 — FIRE ON PRESS, ALWAYS (GAME_SPEC §3 ADOPTED "Fire on button press,
    // cooldown 0.4 s"): a press with NO lock launches ONE unguided missile
    // straight up the sight line instead of dead-clicking (R36 rank-1 gap).
    // Own cooldown, NOT salvoCooldown, so a dry round never delays the acquire
    // beat: press -> round leaves now; keep holding -> lock forms in parallel.
    // NOTE (shared-PRNG class): launch() draws from this.rng, so a dry fire
    // shifts every later draw on the gameplay stream — fairness comparisons
    // across this change reflect the stream shift as well as the behaviour.
    if (holding && !this._wasHolding && this.locks.locks.length === 0 &&
        this.dryCooldown <= 0 && this.salvoCooldown <= 0 && this.missileStock > 0) {
      this.missiles.launch(this.playerNdc, null, this.launchSide, this.rng, this.sight);
      AudioBus.play('missileLaunch');
      this.launchSide = -this.launchSide;
      this.missileStock -= 1;
      this.dryCooldown = SALVO_COOLDOWN_S;
    }

    // R25 — FIRE IS DISCOVERABLE FOR EVERY NAIVE HAND. The arcade missile is
    // point-and-shoot, so the player must not have to learn "release to fire".
    // A press opens a short GATHER window (SALVO_GATHER_S) over which locks fan
    // out across the wave; the salvo then launches on the FIRST of:
    //   - release        — a tap or mash fires at once (the common naive input)
    //   - gather closes   — a player who just HOLDS the button still fires, then
    //                       re-gathers and fires again until stock/targets run out
    //   - lock set full   — no reason to wait once MAX_LOCKS are held
    // The gather clock only runs while armed (this._lockHold), so it freezes
    // through the post-salvo cooldown instead of instantly re-firing the moment
    // the cooldown lifts.
    if (holding && !this._wasHolding) this.gatherTimer = SALVO_GATHER_S;
    // The gather clock only runs once at least one lock is held, so holding
    // over an empty sky waits to fan out a real salvo rather than firing a
    // single missile the instant one enemy drifts into the cone.
    if (this._lockHold && this.locks.locks.length > 0 && this.gatherTimer > 0) {
      this.gatherTimer -= dt;
    }

    const released = !holding && this._wasHolding;
    const gatheredWhileHeld = holding && this.gatherTimer <= 0;
    const full = this.locks.locks.length >= MAX_LOCKS;
    if (canArm && (released || gatheredWhileHeld || full) && this.locks.locks.length > 0) {
      const targets = this.locks.takeLocks();
      const n = Math.min(targets.length, this.missileStock, MAX_LOCKS);
      for (let i = 0; i < n; i++) this.launchQueue.push(targets[i]);
      if (n > 0) this.salvoCooldown = SALVO_COOLDOWN_S;
      this.gatherTimer = SALVO_GATHER_S; // re-gather for the next salvo if still held
    }
    this._wasHolding = holding;

    this.launchTimer -= dt;
    if (this.launchQueue.length && this.launchTimer <= 0) {
      const target = this.launchQueue.shift();
      if (this.missileStock > 0) {
        this.missiles.launch(this.playerNdc, target, this.launchSide, this.rng);
        AudioBus.play('missileLaunch');
        this.launchSide = -this.launchSide;
        this.missileStock -= 1;
      }
      this.launchTimer = LAUNCH_STAGGER_S;
    }
  }

  // Aim assist (ADOPTED #100): "a round snaps its ALTITUDE/DEPTH ramp to the
  // nearest enemy near the sight line at spawn so convergence actually
  // intersects targets" — without it, shots pass under airborne enemies.
  //
  // It snaps the vertical ramp and the range, NOT the lateral aim, and that
  // split is load-bearing. The first version also snapped ndcX, which made
  // every round a guaranteed hit: at 12 rounds/s the vulcan cleared waves
  // the instant they came into range and a 20 s demo run ended with an empty
  // sky and no missiles ever used. Lateral accuracy stays the player's job,
  // so the vulcan still misses when the target is not on the sight line.
  _findAssistTarget(playerNdc) {
    const aspectY = 224 / 320;
    let best = null;
    // Named for what it is rather than for one of the two things it can hold:
    // under the shipped rule it is a squared screen distance from the sight,
    // under the R7-equivalent isolation arm it is a depth. Both are "smaller
    // is better", which is the only property the loop uses.
    let bestRank = Infinity;
    const rad = this.assistRadius;
    for (const e of this.spawner.enemies) {
      if (!e.alive) continue;
      // THE LICENSED DEPTH BAND. Far bound: the depth at which this enemy
      // is big enough to see, derived in the constructor from the live
      // camera. Near bound: the fly-past depth, i.e. no near bound at all —
      // the shipped `e.d < 6` switched the assist OFF across the whole
      // close-range regime (11.8-27 %W) that GAME_SPEC.md §3 says this
      // weapon exists for.
      if (e.d > this.assistDepthMax || e.d < this.assistDepthMin) continue;
      // THE LICENCE: the gun may aim at what the player can see. Same gate
      // `resolveHits` applies, same number, read from the same place.
      if (e.spanFrac(this.space) < this.minKillSpan) continue;
      // BOTH axes from the SIGHT. The shipped test took dx from
      // `playerNdc.x` and dy from `this.sight.y`, which are 0.30 NDC apart
      // vertically, so the cone was centred on neither the nose nor the
      // sight.
      const coneX = this.assistConeFromSight ? this.sight.x : playerNdc.x;
      const dx = (e.ndc.x - coneX) * 0.5;
      const dy = (e.ndc.y - this.sight.y) * 0.5 * aspectY;
      const r2 = dx * dx + dy * dy;
      if (r2 > rad * rad) continue;
      // NEAREST TO THE SIGHT, not nearest in depth. The round converges on
      // a screen point near the sight, so the aircraft whose depth it should
      // take is the one the sight is actually on. Picking by depth could
      // snap the ramp to a near aircraft off to one side while the stream
      // flew through a farther one dead ahead — and then miss both.
      const rank = this.assistPickNearestSight ? r2 : e.d;
      if (rank < bestRank) {
        bestRank = rank;
        best = e;
      }
    }
    if (!best) return null;
    // Vertical aim: a bounded share of the target's offset from the sight,
    // so the player's stick carries the rest. ASSIST_Y_FRAC = 1 reproduces
    // the shipped R7 behaviour exactly, which is how the isolation arm for
    // this lever is run.
    const dyNdc = (best.ndc.y - this.sight.y) * this.assistYFrac;
    // Depth lead: where the target will be when the round gets there. The
    // enemy's depth advances geometrically (enemy.js: `d *= exp(depthRate *
    // dt)`), so the closed-form lead over TRAVEL_S is exact, not an
    // approximation — and `closureScale` is folded in because the throttle
    // now scales that same rate (spawner.js THROTTLE_CLOSURE_MULT).
    const lead = this.assistLead
      ? Math.exp(best.depthRate * (this.spawner.closureScale ?? 1) * VULCAN_TRAVEL_S)
      : 1;
    return { ndcX: this.sight.x, ndcY: this.sight.y + dyNdc, depth: best.d * lead };
  }

  // Player hit radius, in the same NDC-ish fraction convention vulcan.js's
  // resolveHits uses for enemy hitboxes. See PLAYER_HIT_RADIUS_FRAC above.
  _playerHit(ndcX, ndcY, playerNdc) {
    const aspectY = 224 / 320;
    const dx = (ndcX - playerNdc.x) * 0.5;
    const dy = (ndcY - playerNdc.y) * 0.5 * aspectY;
    return dx * dx + dy * dy <= PLAYER_HIT_RADIUS_FRAC * PLAYER_HIT_RADIUS_FRAC;
  }

  // R4 game-flow addition: a death trigger the flow state machine can poll
  // once per tick without reaching into enemyShots/spawner directly (the
  // "agree a hit-test interface" ask from the round brief). Tests enemy
  // shots only — body-ram collision is GAME_SPEC.md §2's "narrow near-
  // despawn window" case, ADOPTED #103 reasoning, left as a documented gap
  // this round (every one of the four measured arcade deaths was a shot
  // hit, not a ram).
  //
  // `invincible` (R4 blocker fix, post-respawn grace window — GAME_SPEC.md
  // §2 ADOPTS the prototype's 2s window "as a usability choice"): a
  // matching shot is STILL consumed — it "passes through" rather than
  // lingering — but no death is reported. GAME_SPEC's explicit trap
  // ("Invincibility must be pass-through for already-overlapping bodies when
  // it expires — otherwise expiry scores an undodgeable hit") is now
  // satisfied structurally rather than by that consumption: a round is tested
  // exactly once, on the tick it crosses the player's plane, so there is no
  // such thing as a round that lingers overlapping the player waiting for the
  // window to expire.
  // THE HIT IS RESOLVED AT THE PLAYER'S PLANE, ONCE PER ROUND. This replaced
  // a depth-tolerance test (`|shotDepth - playerDepth| <= 2.2`) and it is the
  // single biggest cause of R4 gap 5 — bigger than aim, telegraph or kill
  // radius, all three of which were retuned first with almost no effect.
  //
  // Why the tolerance form was lethal. A round's screen position is the
  // 1/depth-proportional lerp from the firing aircraft (f = 1) to its aim
  // point (f = 0), and the player sits at depth ~5 while rounds are fired
  // from depth 24-52 and retire at 1.6. Over the +-2.2 window, f runs from
  // +0.345 down to -0.886 — so the test was applied at every tick across a
  // screen segment 1.23x the firer-to-aim distance long, EXTENDING 0.89x
  // BEYOND the aim point. A round aimed well clear of the player still swept
  // over them going through. That is why the measured per-round hit rate sat
  // at ~10% under a random 11-42%W aim bias, at ~10% under honest aim at a
  // 1.4 s-stale snapshot, and at ~8% after the lag was pushed past 2 s: the
  // aim point was never what decided a hit.
  //
  // The exact form: a round hits iff it crosses the player's depth plane this
  // tick AND its screen position AT THE CROSSING is inside the kill radius.
  // Since f = 0 exactly at the player's depth, that position IS the aim
  // point (the lerp below is kept general so the test stays correct if the
  // player's depth ever stops being constant). Every round therefore gets
  // exactly one test, and P(hit) is exactly P(the jet is within the kill
  // radius of where it was when the flare lit) — which is the quantity
  // enemy.js's TELEGRAPH_S note is solved against, and was not measurable
  // before because the sweep dominated it.
  //
  // No tick can be skipped: a round covers SPEED/60 = 0.4 depth units per
  // fixed tick and the crossing test is an interval test on (prevDepth,
  // depth], not a proximity test, so it cannot fall between two samples
  // however fast the round travels.
  checkPlayerHit(playerNdc, invincible = false) {
    // RESPAWN CLEARS IN-FLIGHT ENEMY FIRE. See clearShots() for the decision
    // and the reasoning. Driven off the rising edge of `invincible` because
    // that edge IS the respawn: flow.js sets the grace window at the
    // death->flight transition and does not call this method while dead, so
    // the first flight tick of a new life is the first call with `invincible`
    // true after a run of false ones.
    //
    // This is a fallback, deliberately: an explicit clearShots() call at the
    // respawn transition in src/game/flow/ is the clearer site and makes this
    // edge a no-op (clearShots is idempotent). It lives here so the fix is
    // live now without a cross-lane change, and so this file's fairness model
    // does not silently depend on another lane remembering to call it.
    if (invincible && !this._wasInvincible) {
      this.clearShots();
      // Same edge, used as the start of the new life for _logHit's
      // `announced` field. Measurement only — nothing in the simulation
      // reads it. Initialised to 0 in the constructor so the first life,
      // which gets no grace window, is handled by the same arithmetic.
      this._lifeStartT = this.t;
    }
    this._wasInvincible = invincible;

    const pd = playerNdc.depth;
    for (const s of this.enemyShots.shots) {
      if (s.ndcX === undefined) continue; // not yet updated this tick
      if (!(s.prevDepth > pd && s.depth <= pd)) continue;
      const f = (1 / pd - s.invAim) / (s.invStart - s.invAim);
      const hx = s.aimNdcX + (s.startNdcX - s.aimNdcX) * f;
      const hy = s.aimNdcY + (s.startNdcY - s.aimNdcY) * f;
      this._logMiss(hx, hy, playerNdc, s);
      if (this._playerHit(hx, hy, playerNdc)) {
        this.enemyShots.remove(s);
        // Counted whether or not it was survived, so the HIT RATE can be
        // tuned directly. Inferring it from deaths does not work: each
        // death costs an 8.5 s sequence that clears and rebuilds the sky,
        // so the death count saturates at ~4/minute almost regardless of
        // how lethal the fire actually is.
        this.playerHitsTaken += 1;
        this._logHit(s, invincible);
        return !invincible;
      }
    }
    return false;
  }

  // Audio half of the fairness telegraph. `intensity` rises both with the
  // number of flares lit and with how close the nearest live shot is to the
  // player, so the warble is already going before anything is fired and
  // peaks as the dangerous shot arrives.
  //
  // Proximity is measured in SCREEN distance and depth together: a shot that
  // is close on screen but still far away is not yet a threat, and one that
  // is near in depth but across the frame never will be. Shots are aimed at
  // a snapshot, so a shot whose screen distance stays large is one the
  // player has already dodged — the warning correctly falls silent for it.
  _updateInboundWarning(lit) {
    const aspectY = 224 / 320;
    let worst = 0;
    for (const s of this.enemyShots.shots) {
      if (s.ndcX === undefined) continue;
      const dx = (s.ndcX - this.playerNdc.x) * 0.5;
      const dy = (s.ndcY - this.playerNdc.y) * 0.5 * aspectY;
      const miss = Math.hypot(dx, dy);
      // Only shots that will pass near the player warn at all. WARN_MISS is
      // 3.2x PLAYER_HIT_RADIUS_FRAC, so a near miss still warns — which is
      // what teaches the player the sound means something.
      if (miss > WARN_MISS_FRAC) continue;
      const near = 1 - Math.min(1, miss / WARN_MISS_FRAC);
      // Depth closes at THIS shot's own speed (battery rounds fly slower
      // than air rounds since R36); 1.2 s out is where the tone should
      // already be audible. IMPORTED/read from the shot, not copied: this
      // was a literal 24 and the constant has been 15 since R5 and is 12
      // since R6, so the warble had been starting at the wrong range for two
      // rounds -- it computed an ETA twice the real one and the tone
      // therefore rose late.
      const eta = Math.max(0, s.depth - this.playerNdc.depth) / (s.speed ?? ENEMY_SHOT_SPEED);
      const soon = 1 - Math.min(1, eta / 1.2);
      worst = Math.max(worst, near * soon);
    }
    const intensity = Math.max(worst, lit > 0 ? 0.25 : 0);
    AudioBus.setInboundWarning?.(intensity);
  }

  // MEASUREMENT ONLY, R6. The MISS DISTANCE of every enemy round at the
  // instant it crosses the player's plane, in the hit test's own units, as a
  // 40-bin histogram over 0..0.40 plus an overflow bin.
  //
  // It exists because DEATHS CANNOT BE TUNED ON. Three seeds x 180 s of
  // `?demo=1` produce 23-25 fatal hits; the Poisson standard deviation on 24
  // is 4.9, so the measurement cannot resolve anything smaller than a 20 %
  // change, and the gate this round asks for is a 22 % change. Measured
  // directly: a geometry change predicted to cut the per-round hit
  // probability ~25 % moved the death count 23 -> 24. That is not evidence
  // the change failed; it is evidence the instrument is too coarse, and
  // publishing either number as a result would have been the "clean,
  // plausible, stable" false alarm CLAUDE.md warns about.
  //
  // The same 540 s carries ~1100 plane crossings. P(hit) = the share of them
  // inside PLAYER_HIT_RADIUS_FRAC, so deaths/min is predicted as
  //   rounds/min x P(miss <= radius) x (fraction of hits that are fatal)
  // with a relative standard error of ~1/sqrt(hits in the bin) on the first
  // factor rather than on the deaths. The histogram also shows WHERE the
  // mass is, which is what says whether a lever is moving the distribution
  // or only its tail.
  //
  // Known bias, stated: `checkPlayerHit` returns on the first round that
  // hits, so on a tick where two rounds cross and the first one kills, the
  // second is never logged. Measured frequency of multi-crossing ticks is
  // low and only hits are affected, so this under-counts the >=2nd crossing
  // of a killing tick -- it cannot inflate P(hit).
  _logMiss(hx, hy, playerNdc, shot = null) {
    const aspectY = 224 / 320;
    const dx = (hx - playerNdc.x) * 0.5;
    const dy = (hy - playerNdc.y) * 0.5 * aspectY;
    const d = Math.hypot(dx, dy);
    this.missHist ??= new Int32Array(MISS_BINS + 1);
    const b = Math.min(MISS_BINS, Math.floor(d / MISS_BIN_W));
    this.missHist[b] += 1;
    this.missCrossings = (this.missCrossings ?? 0) + 1;
    // R36: the same crossing census, split for BATTERY rounds only, so the
    // battery's own per-round hit probability is a direct read (the pooled
    // histogram cannot attribute a crossing to a firer, and battery deaths
    // are far too few to tune the legibility/lethality trade on).
    if (shot && shot.meta && shot.meta.type === 'battery') {
      this.batteryCrossings = (this.batteryCrossings ?? 0) + 1;
      if (d <= PLAYER_HIT_RADIUS_FRAC) this.batteryHits = (this.batteryHits ?? 0) + 1;
    }
  }

  // MEASUREMENT ONLY. Records, for every shot that reached the player,
  // how much warning they had and how far they would have had to move.
  //
  // This exists because deaths-per-minute on `?demo=1` CANNOT answer the
  // fairness question: that path flies a fixed sinusoidal weave and does not
  // react to anything, so against genuinely aimed fire it will be hit at
  // whatever rate the geometry dictates no matter how readable the tell is.
  // Driving that number down would mean making the fire miss on purpose,
  // which is the inverted contract the telegraph replaced. What CAN be
  // measured on a non-reactive path is whether an evasive move existed:
  //
  //   warning  = TELEGRAPH_S + time of flight
  //   needed   = kill radius - how far off the snapshot this shot already was
  //   dodgeable if (jet's lateral speed) * warning > needed
  //
  // The speed term is deliberately left out here and applied by the analysis
  // script from the jet's MEASURED envelope, so this code carries no guessed
  // constant.
  _logHit(shot, invincible = false) {
    this.hitLog ??= [];
    const m = shot.meta;
    // The telegraph duration the killing shot's firer actually ran. Older
    // metas (and the volume shim) carry no teleS; fall back to the air value.
    const teleS = m && m.teleS != null ? m.teleS : ENEMY_TELEGRAPH_S;
    this.hitLog.push({
      t: this.t,
      // R36 death taxonomy: who fired the killing round and from where, so
      // "the shot that got me" is attributable without pixel forensics.
      type: m ? m.type ?? null : null,
      fromX: Number(shot.startNdcX.toFixed(4)),
      fromY: Number(shot.startNdcY.toFixed(4)),
      fromD: Number(shot.startDepth.toFixed(2)),
      aimX: Number(shot.aimNdcX.toFixed(4)),
      aimY: Number(shot.aimNdcY.toFixed(4)),
      // A hit taken inside the post-respawn grace window is NOT a death and
      // must not be pooled with the ones that are: the grace window exists
      // precisely because those hits were not dodgeable (the player had no
      // control of where they were put down), so averaging them in would
      // make the fairness figure look worse than the game is.
      fatal: !invincible,
      warning: m ? this.t - m.bornT + teleS : null,
      sweep: m ? m.sweep : null,
      radius: PLAYER_HIT_RADIUS_FRAC,
      // THE FAIRNESS STATISTIC ITSELF, as opposed to a proxy for it. No
      // deaths-per-minute figure, on either denominator, can tell an
      // unavoidable respawn death apart from honest difficulty: both are one
      // increment of the same counter. This pair can.
      //
      // `flareLit` is when the announcing flare came ON — enemy.js lights it
      // ENEMY_TELEGRAPH_S before the round leaves, and the aim snapshot is
      // taken at that same instant and never refreshed. `lifeStart` is when
      // the jet the round killed came into existence (t=0 for the first life,
      // the respawn edge thereafter).
      //
      // announced === false means the flare lit before this life began: the
      // round was aimed at a snapshot of a jet that no longer exists, so no
      // input during this life could have avoided it. That is the exact
      // defect clearShots() exists to make impossible, and this field is how
      // the guarantee is checked rather than asserted — it must read 0 across
      // a run, and a nonzero count localises the leak to a hit with a time.
      flareLit: m ? Number((m.bornT - teleS).toFixed(3)) : null,
      lifeStart: Number(this._lifeStartT.toFixed(3)),
      announced: m ? m.bornT - teleS >= this._lifeStartT - 1e-6 : false,
      // Warning actually available WITHIN this life: a flare that lit 0.2 s
      // after a respawn gave 0.2 s less usable warning than its nominal
      // `warning`, and only this form is comparable across lives.
      inLifeWarning: m
        ? Number((this.t - Math.max(m.bornT - teleS, this._lifeStartT)).toFixed(3))
        : null,
    });
    if (this.hitLog.length > 256) this.hitLog.shift();
  }

  // Retire every enemy round currently in the air, leaving the aircraft, the
  // smoke, the brackets and the player's own weapons untouched. Idempotent.
  //
  // WHY THIS AND NOT A THREAT-AWARE GRACE (player-feel lane's ask A3). The
  // measured defect: with flow.js no longer clearing combat on death — which
  // is right, and is what removed the ~20 s empty-screen stretches — the
  // player respawns into a sky that may already have rounds inbound, and 17%
  // of lives ended within about 1 s of the 2.0 s grace expiring.
  //
  // The two offered fixes are not equivalent under this lane's fairness
  // model. That model is one sentence: EVERY ROUND THAT CAN KILL YOU WAS
  // ANNOUNCED BY A FLARE YOU COULD SEE, and the flare's promise is honest
  // because the round is aimed at where you were when it lit (enemy.js,
  // TELEGRAPH_S). A round already in flight at a respawn was aimed at a
  // snapshot of the PREVIOUS life's jet, taken before this life existed. It
  // is unannounced by construction, and no amount of extra grace changes
  // that — a longer window only moves where the unannounced round lands.
  //
  // Holding invincibility while a round closes also costs more than it looks:
  // it puts fireballs through the jet with no effect, which teaches the
  // player that a hit sometimes does not count. That erodes the same contract
  // it is trying to protect, and being capped, it can still expire with a
  // round inbound — the original defect, just rarer and harder to diagnose.
  //
  // The cost of clearing is small and bounded, which is the whole reason this
  // is not the old combat.clear(): the AIRCRAFT are the visual mass and they
  // stay, along with their smoke and the enemies' own approach. What goes is
  // 8-16 small fireballs, replaced within ~1-2 s by the next train — which
  // now opens, correctly, with a flare the respawned player can see.
  clearShots() {
    this.enemyShots.clear();
    // ...and the trains that had not yet paid out. See enemy.js
    // abandonTrain(): retiring the rounds in the air is only half of the
    // guarantee, because an enemy mid-telegraph at the moment of death keeps
    // its aim snapshot of the previous life's jet and fires it into the new
    // one. Measured at 2 unannounced fatal hits in 72 before this line and
    // 0 after (tools/out/combat-r6/final/, 7 seeds x 300 s).
    for (const e of this.spawner.enemies) e.abandonTrain();
    // The flare sprites are driven from enemy.telegraph, so they have to be
    // retired on the same tick or a cleared train leaves a lit muzzle flare
    // hanging on an aircraft that is no longer shooting -- a tell that lies
    // in the other direction.
    this.telegraphs.clear();
    AudioBus.setInboundWarning?.(0);
  }

  clear() {
    this.spawner.clear();
    this.enemyShots.clear();
    this.telegraphs.clear();
    AudioBus.setInboundWarning?.(0);
    this.vulcan.clear();
    this.missiles.clear();
    this.locks.clear();
    this.smoke.clear();
    this.explosions.clear();
    this.hitFlash.clear();
    this.launchQueue.length = 0;
    this.salvoCooldown = 0;
  }

  _damage(enemy, amount, source = 'other') {
    if (!enemy.alive) return;
    // R27 (combat-feel): the hit cue fires on EVERY connecting round, BEFORE
    // the early return below. A non-fatal hit (bombers have hp:2) used to
    // return here with zero visuals, so rounds vanished into the target until
    // it finally exploded -- the arcade flashes/sparks the target on every
    // connecting round, and for a non-fatal hit this flash is the ONLY cue the
    // round landed. The spark/flash follows the enemy's live sprite.
    this.hitFlash.spawn(enemy);
    if (!enemy.damage(amount)) return;
    // Kill ledger (see the constructor). Written BEFORE spawner.remove(), so
    // `enemy.d` and the projected span are the values the player's screen
    // actually carried on the tick the aircraft died — read afterwards they
    // would be whatever the retired object was left holding.
    if (this.killLog.length < 8192) {
      this.killLog.push({
        t: Number(this.t.toFixed(3)),
        src: source,
        d: Number(enemy.d.toFixed(3)),
        span: Number(enemy.spanFrac(this.space).toFixed(5)),
        ndcX: Number(enemy.ndc.x.toFixed(4)),
        ndcY: Number(enemy.ndc.y.toFixed(4)),
        // R12: the sight's own position on the tick of the kill, so a probe
        // can measure HOW FAR FROM THE SIGHT a kill resolved (R11 §2.1's
        // median 5.8 %W / p90 14.6 %W, which the unassisted-depth change is
        // meant to pull inside the sight's +-9.85 %W reach) without having to
        // reconstruct the sight from playerNdc.
        sightX: Number(this.sight.x.toFixed(4)),
        sightY: Number(this.sight.y.toFixed(4)),
        pattern: enemy.pattern,
      });
    } else {
      this.killsDropped += 1;
    }
    this.killCounts[source] = (this.killCounts[source] ?? 0) + 1;
    const pos = new THREE.Vector3();
    this.space.ndcToWorld(enemy.ndc.x, enemy.ndc.y, enemy.d, pos);
    // R38 (kill-placement): the KILL explosion is anchored to its VICTIM —
    // eruption sized to the aircraft's own projected span, then ballooning
    // 1/d past the camera like the arcade's dead smoke, instead of a fixed
    // 30 %W fireball parked at the kill point (which made every kill read as
    // an explosion ON the player's jet — judging/R38/kill-placement/NOTES.md
    // §1-2). The death sequence's own spawns pass no victim and keep the
    // parked starburst, which is what visually separates "I killed that"
    // from "I died".
    this.explosions.spawn(pos, enemy.d, this.rng, enemy.type === 'bomber' ? 1.4 : 1, {
      spanFrac: enemy.spanFrac(this.space),
      ndcX: enemy.ndc.x,
      ndcY: enemy.ndc.y,
    });
    AudioBus.play('explosion', { big: enemy.type === 'bomber' });
    this.hits += 1;
    // Removed on the same tick it dies so the tracking bracket jumps to the
    // next enemy immediately, which is the measured behaviour at
    // t116->116.25 (bracket -> explosion under it, HIT +1, bracket already
    // on the next).
    this.spawner.remove(enemy);
    if (this.locks.tracked === enemy) this.locks.tracked = null;
  }

  // Writes the agreed fields into the HUD's state object.
  publish(state) {
    state.missiles = this.missileStock;
    state.hit = this.hits;
    state.enemiesInPlay = this.spawner.aliveCount > 0;
    state.locked = this.locks.locks.length > 0;
    // R15 — the lock COUNT, for the UI lane's "you hold N locks, release to fire"
    // HUD cue (ui/hud.js). `locked` stays for consumers that only need the
    // boolean; this is the glanceable number the salvo cue reads.
    state.lockCount = this.locks.locks.length;
    // R15 — a lock is being WORKED ON (sight on a lockable target, not yet a
    // completed lock), so the UI can show an "acquiring" state distinct from a
    // held lock. Optional for the UI lane; costs one field.
    state.acquiring = !!this.locks.acquiring;
  }
}
