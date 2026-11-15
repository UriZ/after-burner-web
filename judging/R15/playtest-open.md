# R15 opening pass — arcade vertical sight range + combat-gap confirmations

Fresh-context opening pass. Judged against committed HEAD **1fe2778** (src/ and tools/
were clean at boot; the serve boots a snapshot with HMR off, so each run is a fixed state).
Reference: `.reference-cache/video/ab2-longplay.mp4` (map-keyed, 686×480, 30fps content).
Evidence frames in `judging/R15/evidence/`.

---

## JOB 1 (HEADLINE) — the arcade's vertical sight travel

**Deliverable: the arcade nose-sight ranges roughly `−0.18 NDC` (hard dive) to `+0.62 NDC`
(hard climb), sitting about `+0.16 NDC` above screen-centre in level flight. Our build already
BRACKETS that on both ends (climb +0.76, dive −0.25) — so "the sight can't reach where it needs
to" is NOT supported by the arcade. The combat residuals are a conversion/supply problem, not a
reach problem. Measure-first paid off: it argues AGAINST growing `ENVELOPE_Y`.**

### What the quantity actually is, and why it reduces to the airframe

There are **two** reticles in AB2 and they must not be conflated (confirmed by eye, frames
t108/t109/t113):

- the **nose sight** — the faint ~5×5 native (1.56 %W) glyph that rides near the plane's nose.
  This is the gun aim-point and the centre of the lock cone. **This is the thing to measure.**
- the **lock bracket** — the larger corner-box that snaps onto a locked enemy and can sit
  anywhere (t108: top-right at ~16 %H on a high enemy; t109: top-right at ~14 %H). NOT the sight.

The nose sight is **body-frame**, not a fixed screen offset (R7 established this; I reproduced
it). It sits ~8 %H *above* the airframe in level/mild attitudes and swings to *below* the
airframe on screen in a hard bank:

| frame | attitude | sight vs airframe centroid |
|---|---|---|
| t108 | banking, mid altitude | ~8.5 %H **above** (my read); R7: 7.8 / 8.8 %H above on two other frames |
| t113 | banked right, nose up | cursor ~8 %H **above** |
| t109 | hard bank right, nose up | sight glyph ~7–9 %H **below** the airframe (R7 measured 12 %H below on this same frame) |

Because the arcade **aircraft tracks its own sight at ratio 1.02 ± 0.03** (R10/R11, 151
detections), the sight's vertical *screen* travel is governed by the **airframe screen-altitude**
plus the ~8 %H body offset. So the measured quantity is: airframe altitude envelope + sight offset.

### Airframe screen-altitude envelope (the dominant term)

- **Established (109 hand-counted obs across 6 stages, R6+R7):** full climb **27.0 %H**,
  level median **50.0 %H**, deepest dive ever observed **67.0 %H**.
  In NDC (`ndcY = 1 − %H/50`, 0 = centre, + = up): **climb +0.46, level 0.00, dive −0.34**.
- **My fresh re-measure (stage-1 span t89–119, afterburner-flame locator on 15 clean frames,
  explosion blobs excluded):** airframe ~**40.6 %H** at the top (t109/t114 climb) to ~**59 %H**,
  **median ~52 %H**. This **corroborates the level median (~50 %H)** but this 30-s window
  **never exercises the extremes** — the pilot stays in a 40–59 %H band here, so the 27/67 %H
  rails come from the cross-stage hand-count, not from my window. Honest limit, stated.

### Nose-sight NDC (airframe + ~+0.16 level offset), with error bars

| | arcade airframe | + sight offset | **arcade sight (NDC)** |
|---|---|---|---|
| full climb | +0.46 (27 %H) | +0.16 | **≈ +0.62** (my window only reached +0.42; +0.62 rests on the cited 27 %H extreme) |
| level | 0.00 (50 %H) | +0.16 | **≈ +0.16** |
| full dive | −0.34 (67 %H) | +0.16 | **≈ −0.18** |

Error bars: the offset (+0.16 ≈ 8 %H) is from banked frames where body-vs-screen frame can't be
fully separated (R7's unresolved 74.4° ambiguity) — call it **±0.04 NDC**. The climb/dive
extremes carry the 109-obs hand-count's spread (sd 7.73 %H ≈ ±0.15 NDC) and I did not re-hit
them this round. **Treat `−0.18 … +0.62`, centred slightly above 0, as the honest range.**

### Comparison to our build (HEAD 1fe2778) — the decision-relevant part

Measured live (full-climb stick, settled, clean fresh boot) and from the committed rails:

- our sight at **full climb-stick: +0.76 NDC** (live telemetry, matches player.js's R8 probe
  +0.7597 to 3 dp) — **exceeds** the arcade's ~+0.62.
- lock-cone ceiling **+0.537 NDC** (`lockSystem.js:207`); climbing **does acquire locks**
  (see Job 2 missile) — reach to the bait is real.
- our airframe rails (player.js): UP **+0.46** (27 %H, `ENVELOPE_Y_UP 1.55`), DOWN **−0.55**
  (77 %H, `ENVELOPE_Y_DOWN 1.1`) → sight DOWN ≈ **−0.25**, **past** the arcade's ~−0.18 floor.

**So our vertical reach already brackets the arcade on BOTH ends** (we climb higher and dive
lower than the arcade sight ever does). The one place we differ is the *rest* offset: our sight
sits ~+0.30 above the airframe (`SIGHT_NDC_Y_OFFSET`) vs the arcade's ~+0.16 — i.e. our sight sits
a little **too high at rest**, not too low.

> **Flag for the player lane:** the opening brief's anchor ("our sight reaches ~+0.40 climbing,
> rests ~+0.30") is **inconsistent with live HEAD** — full-climb sight measures **+0.76**, not
> +0.40. Re-derive the current sight rail off live HEAD before tuning anything; don't trust the
> stale +0.40.

**Recommendation:** the arcade gives **no support for growing `ENVELOPE_Y`** in either
direction. Pushing more *down*-reach for the gun is actively unsupported (arcade sight floor is
only ~−0.18; we're already at −0.25, and player.js already flagged the down rail as past the
arcade's deepest dive). More *up*-reach is unnecessary (we reach +0.76 > arcade +0.62, and locks
already acquire). The R15 gap-1 framing ("the sight can't reach") does not survive the
measurement — see Job 2 for what the residuals actually are.

---

## JOB 2 — combat gaps confirmed on HEAD 1fe2778

Via `tools/playtest.mjs` (selftest 8/8 pass first). Kill A/B matches R14's instrument exactly
(dead-centre vs sight-down, trigger held, `invincible=1` for a deterministic count, throttle M,
**HIT counter summed per stage** — score is ~3300/s *passive* and is NOT a kill proxy). Feel/
density on a mortal pilot (no invincibility).

### GUN — CONFIRMED: aiming does NOT beat blind centred fire (reproduces R14 to the digit)

90 s, stages 1–3, HIT summed per stage:

| seed | BLIND (stick 0,0) | AIM (sight shoved down, y=−0.6) | result |
|---|---|---|---|
| 7 | **10** (s1:3/s2:4/s3:3) | **8** (2/3/3) | aim −2 |
| 19 | **12** (s1:5/s2:4/s3:1) | **5** (1/3/1) | aim −7 |

The blind floor (**10 / 12**) reproduces R14's seed-7=10 / seed-19=12 **exactly**. Aiming by
repositioning the sight onto the low enemy row makes it **worse** on both seeds — the dead-centre
stick is a dominant strategy because enemy traffic funnels through screen-centre into the wide
span-scaled hit net. This is a **supply + hit-net** problem (R15 gaps 2/3), **not** a reach
problem — pushing the sight *down* (which the build does reach) lost kills.

### DENSITY — rolling 2–6 with brief droughts; has variance but not the arcade's sharp wall/lull

`onScreen` enemy count over time, 3 seeds:

| run | n | min | median | max | mean | sd | empty-samples | droughts |
|---|---|---|---|---|---|---|---|---|
| seed 1 (mortal, 0.5 s samples, 87 s) | 174 | 0 | 4 | 6 | 3.63 | 1.98 | 11 % | 5 |
| seed 7 (fire-held, 5 s samples, 90 s) | 18 | 0 | 3 | 6 | 3.06 | 1.87 | 11 % | 2 |
| seed 19 (fire-held, 5 s samples, 90 s) | 18 | 0 | 3 | 6 | 3.33 | 2.05 | 11 % | 2 |

Consistent across seeds: a **rolling 2–6** (median 3–4, caps at 6) with real variance (sd ~2) and
occasional brief empties (~11 % of time; seed 1 had full-clear windows at t24–26 and t64–66).
So it is **not** a dead-flat steady band — but the droughts are *short* and the floor rarely
empties for long, so it also lacks the arcade's sharp **wall-of-planes-then-long-drought** rhythm
(R10: arcade kills 3 in 0.367 s then a 3.1 s drought; R9: arcade averages only ~19 % density).
Gap 3's framing holds: the fix is **sharper variance** (taller bursts, longer lulls), not more
enemies everywhere.

### MISSILE — CONFIRMED open: reach is fine, CONVERSION is the blocker

- Climbing (stick up, sight at +0.76) **acquires locks** — seed 7 opening hit **3 then 5 locks**.
  So the lock cone (+0.537) **does** reach the bait. Reach is NOT the block.
- But converting is near-impossible in practice: **the missile fires on RELEASE after a hold**
  (`lockSystem.js:386`), locks are **transient (~2 s window)**, and across ~27 s of a pilot
  dedicated to climbing + cycling the missile button I launched exactly **one** missile
  (stock 50→49) **and died once** (you're climbing unarmed into fire). On the adverse **seed 19**
  a climbing pilot acquired **zero** locks in its window — no reachable bait at all.
- Matches R14 ("lock available, human can't reliably convert; salvo feast on seed 7, zero on
  seed 19"). The block is the transient lock + fire-on-release timing + the survival cost of
  holding a climb, **not** vertical reach.

---

## Bottom line for the round

The measurement **redirects gap 1**: our vertical sight reach already brackets the arcade
(+0.76 climb, −0.25 dive vs arcade +0.62 / −0.18), so **`ENVELOPE_Y` should not grow**. The two
combat residuals are confirmed real but are **not** reach:

- **GUN** = target supply + wide hit net (blind centre dominates; aiming down loses — reproduces
  R14's 10/12 blind floor exactly). → spawner/hit-net lane (gaps 2/3).
- **MISSILE** = lock is reachable but transient + fire-on-release timing + you die climbing
  unarmed. → a conversion-window / arming-UX problem, not an envelope one.

If anything on the sight moves, it's the **rest offset** (ours +0.30 sits higher than the
arcade's ~+0.16), not the rails.
