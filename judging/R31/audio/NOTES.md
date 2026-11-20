# R31 Audio lane — "improve the music"

Owner gap: flight music is weak; wants driving, energetic FM-synth rock (AB2's
"After Burner / Final Takeoff" vibe — propulsive bass, strong lead, punchy
drums, sense of speed).

Scope: `src/audio/music.js` ONLY. SFX (`sfx.js`), engine, index untouched.

## What changed musically

- **Tempo** 152 → **160 BPM** (more urgency).
- **Progression** reworked to an **Andalusian cadence i-VII-VI-V** (Am-G-F-E),
  root line walking down A-G-F-E, **one chord per bar** (was 2 bars each). The
  V is **E major** (carries the G# leading tone) so it pulls hard back to Am —
  tension/release = forward drive. Original-in-style (the most common
  progression in rock/flamenco/game music), NOT transcribed.
- **Drums** — added a real **backbeat SNARE on 2 & 4** (was missing entirely:
  the single biggest "rock" fix), **closed hats on all 16ths** (relentless
  speed) with offbeat accents + an open hat, a punchier kick, and a **16th
  snare-roll turnaround fill** on the last bar of each phrase.
- **Bass** — pumping staccato 8th pulse (root on beat, octave on the "and")
  with a 16th fill into the next bar; FM saw through a 2.6 kHz lowpass so it's
  fat, not fizzy.
- **Lead** — replaced the choppy per-bar arpeggio with a **composed 8-bar
  melody**: descending E-D-C-A hooks on the Am/F bars, rising tension on G,
  a G#-leaning line on the E bar, and a climb-and-hold turnaround. Mostly long
  notes so it SINGS over the groove; **FM-brass voicing** (bright mod-index
  attack settling to a mellow sustain) + gentle vibrato on sustained notes.
- **New STAB layer** — bright FM-brass triad stabs on the backbeat (with the
  snare), spread across the stereo field — the classic FM-rock punctuation.
- **New PAD layer** — soft sustained triad under everything for harmonic glue.
- **Mix** — a gentle glue **compressor** across the whole offline render for
  punch and peak control; stereo spread on stabs/lead/bass.
- **Title sting** reworked to match: held A+E power-fifth bed, an Am fanfare
  run with the same FM-brass voicing, and a kick+snare hit so the title lands
  like the song's groove.

Architecture unchanged: still an ORIGINAL composition, FM via paired
oscillators, rendered ONCE through an OfflineAudioContext to a looping buffer.
Public API (`setState`, `playTitleSting`) unchanged. Added one test-only export
`__renderLoopForTest()` (returns the cached buffer; not used in play).

## Verification (all clean)

- `verify_music.mjs` — renders the loop in a real OfflineAudioContext:
  duration 61 s, stereo, **peak 0.75 (no clipping)**, RMS 0.077 (energetic, not
  silent), context running, **zero page errors**.
- `dump_music.mjs` — wrote `flight-loop.wav` (48 kHz stereo, 61 s) to listen to.
  ffmpeg: max_volume **-2.3 dB** (headroom, no clip), strong bass band
  (<200 Hz, -23.9 dB), hats present (>6 kHz).
- `node tools/combat_probe.mjs --ticks 120 --url-params "demo=1&seed=7"` →
  exit 0, no errors (whole audio chain incl. SFX imports clean).
- Title + sting + off paths all run with no errors.

## How to evaluate
Play at `localhost:5173` (`npm run dev`) — title screen for the sting, then
start a flight for the loop. Or listen to `flight-loop.wav` directly.
