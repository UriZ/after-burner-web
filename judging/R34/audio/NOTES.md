# R34 AUDIO lane — weapon SFX + music punch-up

Owner ask: "improve the music, and the SOUND of the missiles and guns."
All work is synthesized WebAudio (oscillators / noise / envelopes / FM / waveshaper).
No samples, no transcription. Public trigger API (`AudioBus.play('vulcan'|'missileLaunch'|
'lockOn'|'explosion'|...)`, `setEngine`, `music`, etc.) is UNCHANGED — only the synthesis
behind each event changed.

## Files touched (all under src/audio/, the lane's owned set)
- `engine.js` — added a master-output brickwall limiter (compressor) so the punchier SFX
  can stack over the music without hard-clipping the output.
- `sfx.js` — rewrote vulcan, missileLaunch, lockOn, explosion; added a soft-clip waveshaper
  helper for grit.
- `music.js` — new catchier lead hook, driving rhythm-guitar layer, crash on phrase downbeats,
  detuned lead double, rebalanced buses, final limiter on the render.

## SFX changes (evaluate by EAR — see "How to listen")

**GUN / vulcan** — was a single thin square click. Now 3 layers per round: a sub-5ms highpassed
noise CRACK (ignition snap), a fat gritty pitch-dropping sawtooth BODY run through a soft-clipper
(the mechanical "chug"), and a short low sine PUNCH (weight). Dropped the body pitch from ~1100 Hz
to ~320 Hz so it reads meaty, not beepy. L/R muzzles differ ~6% so rapid fire reads as a stereo
"dakka" rattle.

**MISSILE launch** — was a short whoosh + thump. Now a 0.6s launch roar in 4 layers: an ignition
CHUFF (lowpassed noise whump), a gritted broadband ROAR that swells in fast and trails out, a
descending sawtooth THRUST SIZZLE (the pitched "fffshOOM"), and a low LAUNCH THUMP. Much stronger,
longer, more physical.

**EXPLOSION** — was noise + a soft boom. Now hits hard: a bright detonation CRACK transient, a
gritted broadband BLAST body (waveshaper so it reads as fire/debris, not wind), a deeper/longer
SUB BOOM (down to ~0.3× the start pitch for chest-thump low end), and a mid gritty PUNCH so the
blast is full-range. `big` (player death) variant is lower/longer as before.

**LOCK-ON** — was one thin triangle chirp. Now a crisp arcade "ACQUIRED" confirm: two short rising
square blips (C#6→F#6) and a longer held A6 confirm tone with a sine sub-octave under it for body.
Clearly cuts through combat.

## Music changes
R31 had the 160 BPM Andalusian (Am-G-F-E) FM-rock bed. R34 makes it more energetic/catchy:
- **Stronger hook**: rewrote the lead into a syncopated call-and-answer (descending hook that
  answers back up, higher restatement on the F bar, a climb to a G#5 peak on the turnaround).
- **Rhythm-guitar drive**: new gritty palm-muted power-chord (root+fifth) 8th-note chug summed
  into one amp-style waveshaper — the biggest "rock energy" add. Slightly syncopated accents for
  push rather than a flat machine-gun.
- **Lead presence**: a detuned second oscillator panned opposite thickens the hook into a
  chorused lead instead of a thin single tone; lead bus pushed forward (0.34→0.38).
- **Crash** on each 8-bar phrase downbeat lifts the loop point.
- **Mix**: softened the pad to make room; final brickwall limiter on the render so the dense
  downbeats stay clean.
- Still ORIGINAL in the SEGA FM style — same composed-here A-minor material, no transcription.

## Verification
- `node judging/R34/audio/mock-smoke.mjs` — WebAudio-mock no-throw for EVERY event unmuted
  (incl. a 24-round vulcan burst and the full music render). ALL PASS.
- `node judging/R34/audio/offline-render.mjs` — REAL OfflineAudioContext render of the 60s loop
  in headless chromium: peak ~0.93, RMS ~0.158, 0 clipped samples, both channels. No clipping,
  real energy.
- `node tools/combat_probe.mjs --ticks 150 --url-params "demo=1&seed=7"` — exit 0, no errors
  (this path is muted by `?fixed=1`; it confirms structure/no-throw on boot).

## How to listen (owner)
Open `tools/audio-preview.html` via the dev server (`npm run dev`, then
http://localhost:5173/tools/audio-preview.html) — click once to unlock audio, then audition each
SFX button and the "music: flight loop" button. Or in the game at localhost:5173 / the deployed
site, fire the gun, lock + fire a missile, and get a kill.
