# R15 playtest verdict — hands on the stick (judge gate)

**Five sentences, first person, player language:**

Pointing the gun at the wall of planes finally beats just holding the stick in the
middle — I rake the cluster off to one side and watch them drop, where before a dead
hand scored the same. For the first time I pulled off the whole missile move by hand:
I eased up onto an incoming wave, grabbed three locks while the little amber dots lit
up under my reticle, then yanked away to dodge and the salvo still fired and killed.
The sky breathes now — a crush of six-to-ten jets at every height, then it empties out
and I'm just rolling hard over the coast with nothing to shoot. The afterburner looks
right, two tight separated flames that fatten when I throttle down and stretch when I
punch it. What still trips me: finding that first lock is a knack — the sight floats up
past the far planes if I climb hard, and nobody tells you to ease up gently instead, so
I flew fifteen passes empty before it clicked.

**What I did:** seed 7 mortal hands-on (~45 turns, flight → dogfight → death/respawn →
missile loop) + deterministic A/Bs on seeds 7 & 19 (gun aim-vs-blind, missile grace,
density before/after). Session: `scratchpad/play7/commands.jsonl` (re-derivable from seed +
log). Instrument limits: no audio, ~1 s decision cadence, 6-panel strips not video.

**Aiming control result:** reactive aim 24 (seed 7) / 25 (seed 19) vs blind 12 / 8 gun
kills in 90 s — aiming is 2–3× the blind floor; the floor held (not ballooned). A *fixed*
aim posture still loses; the win needs active tracking.

**Top gaps (player language):** (1) only 4 stages / no refuel pass — breadth; (2) the first
missile lock is an undiscoverable knack (sight floats, no auto-recentre, full climb
overshoots the lockable band); (3) stage-4 forest ground is dark/flat vs the arcade canopy;
(4) a do-nothing stick still banks 8–12 gun kills; (5) kill fireballs read sub-screen.
Evidence frames in `judging/R15/judge-evidence/`.
