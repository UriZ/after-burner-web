# R25 sprite-art lane — aircraft redraw (player F-14 + enemy MiG)

Owner verdict (ground truth): the player jet and the enemies "are not good enough." This was
an ART-QUALITY pass, not a palette-number pass. Authored BY EYE against the true-native
arcade crops; the airframe palettes (R7–R11) are correct and were KEPT unchanged.

## What was wrong (diagnosed by cropping LARGE, per "look first")

- **Player, level pose = an insect face.** Two orange nozzles read as eyes, the twin fins as
  pale rabbit ears, the dark engine slot as a mouth, the magenta canopy as a nose. No central
  fuselage mass — just a thin spine between the two nozzles. The hard-bank poses collapsed to
  a thin twig with two blobs because the planform carried no body to rotate. This is the
  "statistics cannot replace artwork" failure: R5–R11 tuned every JET-SIL discriminator in-band
  and the drawing still read wrong, because the operator cannot see a face.
- **Enemy MiG = a flat grey dart.** Wings had a bright top edge and NO dark edge outboard, so
  they faded into the sky as flat triangles; the fin was a 1 px antenna.

## What changed (files: tools/art/sheets/player-f14.js, enemy-mig.js; src/render/spriteFactory.js synced)

Player `levelOps()` fully recomposed (mirror_sync regenerates `drawJetSilhouette`; mirror_check OK):
- a **solid fuselage spindle** with bright dorsal spine and shaded flanks — the mass the sheet never had;
- **twin tails canted outward over the engines**, lit outer edge + dark-red inner edge, reading as F-14 fins not ears (ROOT_Y 18→14, so the fuselage owns the middle third);
- a **rear deck** seating the tails on structure;
- **engines on a shared shaded engine deck** so the pair reads as twin exhausts, not two eyes (nozzle separation kept at the measured 30 % to stay aligned with player.js's afterburner-flame billboard);
- **dark-red (#840000) panel/edge line-work** across tails, wings, and engine bodies.

Enemy shared `wing()`/`fin()` (improves grey, camo, interceptor, prop — spot-checked all four, no regression):
- **full-span 1 px dark trailing edge** on the wing (was inner-third only) — crisps it against the sky;
- **fin** now has a lit leading edge + dark trailing edge (was a bare spike).

## Verification

- In-game captures (stage 1, day + night): player reads as a real After Burner F-14; the grey
  MiGs read as crisp swept-wing jets. Night + barrel-roll sheets regenerate correctly (they
  share `levelOps`).
- `mirror_check.py` OK; full `build.js` clean; palette budgets unchanged (player 11, enemy 8).
- `enemysil.py` passes (fuselage 20 %, largest compact feature 3.1 %).

## JET-SIL deviations (ACCEPTED — the gate was derived to reproduce the flat sheet the owner rejected)

Measured on the new level cell (`jetsil.py --box 400,0,500,72 --v 30`):

| discriminator | arcade | old sheet | new sheet | note |
|---|---|---|---|---|
| aspect SPAN/H | 3.26 | 3.12 | **3.23** | now closer to the arcade |
| nozzle sep (V≥0.70) | 30.0 % | 30.0 % | **30.0 %** | held |
| two-blade fin rows | 100 % | 100 % | **100 %** | held |
| fin-pair extent | 35.5 % | 36.0 % | **41.0 %** | tails canted further out by eye |
| blade cant | 1.28 | 1.19 | **1.13** | tails drawn more parallel/F-14-like |

The two misses (fin extent, cant) are the cost of drawing tails that read as F-14 fins instead
of hitting the discriminators. Per CLAUDE.md ("before tuning to a criterion, check the criterion
against the arcade itself") and the owner's verdict outranking the gate, the LOOK was chosen over
the number. If a future round wants both, the fix is to narrow the outward cant — but verify by
crop first that it does not reintroduce the ear read.

## Honest read

The player is the big win — it went from a face to a characterful, voluminous F-14 and the bank
poses now hold their mass. The enemy is a clear crispness improvement (wings read as wings now)
but a smaller transform — it was less broken than the player. Both are a real step toward "good
enough"; a fresh-eyes naive playtest should re-judge against the owner's bar.
