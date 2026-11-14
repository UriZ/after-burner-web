# R12 gestalt review — the first side-by-side look

**Date**: 2026-11-14. **Method**: per the R12 method change ("look first, measure second"),
this round opens by LOOKING at ours next to the arcade and writing down, in player
language, what breaks the "this is After Burner II" illusion. Evidence sheets in
`judging/R12/gestalt/` (ours left, arcade right, generator `make_sheets.py` in the TL
scratchpad; pairs name their capture/decode).

**Provenance.** Ours: tree `1a9f1a3`, `tools/capture.mjs`, `?fixed=1&demo=2&seed=3`
(combat, 12 frames, every 100 ticks, warmup 300) and `?demo=1&seed=1` (attract, same grid)
and `?showtitle=1` (title) — 27 frames total, all stamped "stage 1" by the capturer.
Arcade: `ab2-longplay.mp4` single-frame extracts inside the STAGE_MAP-verified stage-1 span
(t=90…117.5 at 2.5 s spacing) and title (t=72/74/77).

**Scope and honesty.** This is a STILLS/composition pass at 0.4 Hz effective sampling —
it supports composition, scale, palette and *variance-across-frames* claims only; no
temporal figure here is a measurement (citation field 6). Motion and feel still need the
60 Hz pass and the owner's playtest. The arcade's own emptiness is real (39.7 % of frames
hold no enemy ≥3 %W — R9) and the quiet arcade frame is included so the comparison is not
cherry-picked drama.

---

## What one glance shows, ranked by how hard it breaks the illusion

### 1. Stage 1 has no land. (`pair2-island.png`, `pair4-climax.png`)
The arcade's opening stage flies you past **island coastlines** — green vegetation over
brown rock crags, white surf bands along the waterline, a floating rock in the sky at
t117.5. Ours is **uniform open sea for the entire stage**. This is the single loudest
difference in every pair that contains it; a player who has seen AB2 notices in one
second. It is a **missing system** (terrain objects/landmass rendering), was rank 11 of
11 on R5's gap list, and has not been touched in six rounds.

### 2. Nothing dramatic ever happens to the camera or the world. (all pairs)
Across **all 24 of our flight frames, in two different modes**, the horizon is near-level
and sits at nearly the same height. In the arcade's 30-second stage-1 span the horizon
**rolls past 60°** (t100, t110 — the sea fills the left half of the screen to the top),
and its height swings wildly. The renderer *has* world roll (verified 74.5°/s in R4) —
nothing in play or demo ever drives it hard or holds it there. The game looks like it is
being flown by someone being careful. After Burner looks like a rollercoaster.

### 3. The sky has no furniture, and climaxes are small. (`pair1`, `pair4`)
Arcade clouds are **screen-filling banks you fly past and under**; ours are one or two
cotton puffs. The arcade's t117.5 explosion **fills the bottom half of the frame**; our
kills read as small local events even at their best. R10 fixed the explosion's *envelope*;
its *presence* at climax moments is not in the same universe.

### 4. The jet doesn't breathe fire. (`pair1`, `pair3`)
The arcade player jet trails **large orange afterburner flame cones** — with streaks —
through most of combat; the game is named after this. Our nozzles are black rings with
small orange dots. Secondary but visible in every frame: ours reads chunkier, with heavy
red paneling that outlines the airframe like a toy; the arcade's is a slim white/grey
machine. (The airframe *colour* is in band — R11 §4 — the *read* is still off.)

### 5. Enemies never fly past your face. (`pair3-quiet-sky.png`)
Even the arcade's **quiet** frame carries an enemy banking away at ~25 %W with motion
streaks, close enough to read its canopy. Ours keeps enemies at bracket-dot size
essentially always. Our overall size *distribution* measured right (R9: same 5.5× factor
at both floors) — what is missing is the **near-aspect flyby event**: an enemy crossing
the screen at large scale. That is a spawner/choreography behaviour, not a distribution
constant.

### 6. The title's letterforms are hand-wobbly. (`pair5-title.png`)
Structure is right (plate, A/B accent colours, credit line) — but the arcade wordmark is
that iconic brush-angular italic with knife-edge cuts, and ours reads hand-drawn and
rounded; the sphere plate is a wide square where the arcade's is tall. The title is the
first screen every player and every passer-by sees.

---

## How this merges with R11's (instrument-found) list

R11's rank 1 — **the gun does not need the player** (91 % blind share) — is invisible in
stills but is the owner's named complaint; it stays top-tier. The missile and lock items
stay as the measurement work serving feel. R11's criteria-repair items (#4, #7) drop below
all of the above per the meta cap.

**R12 build lanes should be cut from this list**, roughly:
- **World/terrain lane**: stage-1 islands + surf; cloud banks that occupy the frame (gaps 1, 3).
- **Flight-drama lane**: make play/demo actually use the roll and vertical envelope;
  attract choreography that banks hard and holds it (gap 2 + R11 gap 5).
- **Combat lane**: gun kill-resolution fix (R11 §2.1 mechanism — fix the round's depth
  path, not the cone); enemy flyby choreography (gap 5).
- **Player-read lane**: afterburner flames + red-outline softening (gap 4).
- **Title lane** (small): letterforms + plate aspect (gap 6).

**Owed before lanes ship**: the owner's 2-minute playtest — it may reorder this list, and
under the new method it outranks everything here.
