#!/usr/bin/env python3
"""Generate the per-round HTML report for the After Burner rebuild.

Tight, scannable, self-contained (images embedded as data URIs so it can be
published as an Artifact with no external assets). One per round — edit the
ROUND dict below each round and re-run:

    python3 tools/round_report.py            # writes judging/R<n>/report.html

Design: AB2's own screen palette. Side-by-sides are the hero; the gap list is
a HUD-style readout; the TLDR sits up top. Keep the copy short — this is the
one-glance artifact, not the evidence file.
"""
import base64
import html
import mimetypes
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- ROUND DATA
ROUND = {
    "number": 13,
    "date": "2026-11-15",
    "status": "CLOSED",                      # or "BUILD IN PROGRESS"
    "score": "8.2 / 10",                     # judge score once the round closes
    "last_score": "8.0 / 10 (R12)",
    "tldr": (
        "R13 chased combat <em>feel</em>: the systems existed, they just didn’t behave like the "
        "arcade in play. The jet now <em>breathes fire</em> — twin afterburner cones that answer "
        "the throttle — the sky stays <em>alive</em> (shorter lulls, a big enemy flyby, no empty "
        "respawn), and the <em>missile is finally usable</em> from a normal posture, if only on a "
        "coin-flip of wave timing. It rises to 8.2. The oldest crack is still open: the gun still "
        "kills <em>without</em> you — readable enemies swarm below the caged sight."
    ),
    "verdict": (
        "“Two clean wins — the afterburner and a live sky — and the missile crossing from "
        "<em>unusable</em> to <em>usable-but-intermittent</em>, while the oldest illusion-breaker, "
        "the blind gun, stays untouched. Honest progress, not a leap.”"
    ),
    "verdict_attr": "R13 fresh-context judge · composite 8.2 (motion 8.0 · stills 8.5)",
    # Side-by-side hero pairs (already composited OURS | ARCADE).
    "pairs": [
        ("judging/R13/afterburner-ours-vs-arcade.png",
         "The jet breathes fire",
         "Shipped this round: twin afterburner cones that answer the throttle and bank with the airframe — the game’s namesake, finally on the plane."),
        ("judging/R13/flyby-ours-vs-arcade.png",
         "The sky is alive now",
         "A big enemy flyby crosses the full screen, 5–6 enemies persist through the death cycle, and the longest dead stretch dropped from ~6 s to ~3.5 s."),
        ("judging/R12/gestalt/pair5-title.png",
         "The title is close, the letterforms aren’t",
         "Structure, plate and accent colours match; the brush-angular wordmark and tall plate don’t. Still open."),
    ],
    # What shipped and held up under the judge's re-measure.
    "shipped": [
        "The jet breathes fire — twin afterburner cones, throttle-responsive, banking with the airframe",
        "Missile usable from a normal posture — a real salvo fires without camping the horizon (intermittent)",
        "A big enemy flyby crosses the full screen; dead-sky lulls cut ~6 s → ~3.5 s",
        "Enemies persist through the death cycle — no more empty respawn",
        "A mid-range gun-dwell window (26 % → 34 % of enemies at a trackable depth)",
    ],
    # Ranked gaps for NEXT round. kind drives the colour chip.
    "gaps_label": "Next — R14",
    "gaps": [
        (1, "feel", "The gun still kills without you",
         "The oldest complaint, still open: a blind centered stick with the trigger held collects ~20 gun "
         "kills in 90 s — aiming doesn’t clearly beat it, because the readable enemies swarm the low waterline "
         "row the caged sight can’t reach. Make aiming the gun actually cause the kill."),
        (2, "feel", "Missiles are a coin-flip on wave timing",
         "Usable now, but a lock only comes around on the every-fourth-wave bait — land on a bad phase (or die "
         "first) and you fire nothing. Make a lock reachable every wave from a survivable posture."),
        (3, "tension", "Re-measure the death cycle before touching it",
         "Flagged as too long (~7.7 s) three rounds running, always against a single frame-pinned reading that "
         "was never re-measured. Settle it: decode several arcade deaths at 60 Hz. If it really is ~7.7 s, the "
         "pace problem is the tumble filling it, not the length."),
        (4, "missing", "Breadth — 3 of 23 stages, no resupply or bonus",
         "The biggest structural absence. Every round should keep chipping at the stage count and the missing "
         "resupply/bonus passes."),
        (5, "polish", "Small climaxes and the title",
         "Kill fireballs still read sub-screen next to the arcade’s half-screen blasts; the flame is a touch "
         "long and liquid; the title wordmark is hand-rounded where the arcade’s is brush-angular."),
    ],
    # What not to break.
    "keep": [
        "The afterburner flame (throttle-responsive, banks with the jet, death-safe)",
        "The flyby, the live sky, and enemies persisting through respawn",
        "Missile usable from normal posture; islands, game-over, ±60° attract drama",
        "Gun kills at the sight; death starburst → tumble → READY; stage 2 sunset",
    ],
    "method_note": (
        "R13 ran the loop end to end with no human in it: an agent played the open, three lanes built, the "
        "TL verified every claim by playing, and a fresh judge re-measured — catching that the ‘22–28 "
        "salvos/min’ probe over-reads human play ~10×, and confirming an assist-cone tweak was inert. "
        "Honest numbers over headline ones. History in judging/R13/."
    ),
}

KIND = {
    "bug":      ("BUG",      "var(--red)"),
    "feel":     ("FEEL",     "var(--burn)"),
    "missing":  ("MISSING",  "var(--burn)"),
    "tension":  ("CAREFUL",  "var(--cyan)"),
    "polish":   ("POLISH",   "var(--muted)"),
}


def data_uri(relpath):
    path = os.path.join(ROOT, relpath)
    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def esc(s):
    return html.escape(s, quote=True)


def build():
    r = ROUND
    pairs_html = "\n".join(
        f'''      <figure class="pair">
        <img src="{data_uri(src)}" alt="{esc(title)}: ours left, arcade right" loading="lazy" />
        <figcaption><span class="pair-ours">OURS</span><span class="pair-vs">vs</span><span class="pair-arc">ARCADE</span>
          <strong>{esc(title)}</strong> {esc(cap)}</figcaption>
      </figure>'''
        for src, title, cap in r["pairs"]
    )

    gaps_html = "\n".join(
        f'''      <li class="gap">
        <span class="gap-rank">{n:02d}</span>
        <span class="gap-chip" style="--chip:{KIND[kind][1]}">{KIND[kind][0]}</span>
        <div class="gap-body"><strong>{esc(title)}</strong><p>{esc(desc)}</p></div>
      </li>'''
        for n, kind, title, desc in r["gaps"]
    )

    keep_html = "".join(f"<li>{esc(k)}</li>" for k in r["keep"])

    shipped = r.get("shipped")
    shipped_html = ""
    if shipped:
        items = "".join(f"<li>{esc(s)}</li>" for s in shipped)
        shipped_html = f'''  <section>
    <div class="sec-head"><h2>Shipped this round</h2><span class="count">held up under the judge’s re-measure</span></div>
    <ul class="shipped">{items}</ul>
  </section>'''
    gaps_label = r.get("gaps_label", "The gaps")

    return f"""<title>After Burner Round {r['number']}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=Press+Start+2P&display=swap" />
<style>
  :root {{
    --ground: #f3efe4; --surface: #fffdf7; --surface-2: #ece6d6;
    --ink: #16222e; --muted: #5d6f7f; --line: #d6cfbe;
    --cyan: #0a73c4; --burn: #d9630b; --red: #c81536;
    --cream: #fffdf7;
    --shadow: 0 1px 2px rgba(20,34,46,.08), 0 8px 24px rgba(20,34,46,.07);
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --ground: #0a1420; --surface: #0f1d2d; --surface-2: #14263a;
      --ink: #eef3ec; --muted: #8aa2ba; --line: #22384f;
      --cyan: #37b0ff; --burn: #ff8330; --red: #ff3a5c;
      --cream: #f1ece0;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 30px rgba(0,0,0,.35);
    }}
  }}
  :root[data-theme="dark"] {{
    --ground: #0a1420; --surface: #0f1d2d; --surface-2: #14263a;
    --ink: #eef3ec; --muted: #8aa2ba; --line: #22384f;
    --cyan: #37b0ff; --burn: #ff8330; --red: #ff3a5c;
    --cream: #f1ece0;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 30px rgba(0,0,0,.35);
  }}

  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; background: var(--ground); color: var(--ink);
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    line-height: 1.5; -webkit-font-smoothing: antialiased;
  }}
  .wrap {{ max-width: 1120px; margin: 0 auto; padding: clamp(20px, 4vw, 48px); }}
  .mono {{ font-family: "IBM Plex Mono", ui-monospace, monospace; }}
  .eyebrow {{
    font-family: "IBM Plex Mono", monospace; font-size: 11px; font-weight: 600;
    letter-spacing: .22em; text-transform: uppercase; color: var(--cyan);
  }}

  /* HUD status bar — echoes AB2's bottom readout */
  .hud {{
    display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px;
    padding: 14px 18px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); box-shadow: var(--shadow);
  }}
  .badge {{
    font-family: "Press Start 2P", monospace; font-size: clamp(13px, 2.4vw, 20px);
    color: var(--cream); background: var(--red); padding: 10px 12px; border-radius: 6px;
    line-height: 1; white-space: nowrap;
  }}
  .hud-stat {{ display: flex; flex-direction: column; gap: 3px; }}
  .hud-stat .k {{ font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }}
  .hud-stat .v {{ font-family: "IBM Plex Mono", monospace; font-weight: 600; font-size: 15px; font-variant-numeric: tabular-nums; }}
  .hud-spacer {{ flex: 1 1 auto; }}
  .pill {{
    font-family: "IBM Plex Mono", monospace; font-size: 11px; font-weight: 600;
    letter-spacing: .1em; text-transform: uppercase; padding: 6px 11px;
    border-radius: 999px; border: 1px solid var(--burn); color: var(--burn);
  }}
  .pill.closed {{ border-color: var(--cyan); color: var(--cyan); }}

  h1 {{ font-size: clamp(26px, 5vw, 44px); line-height: 1.08; margin: 30px 0 0;
    letter-spacing: -.02em; text-wrap: balance; max-width: 18ch; }}

  /* TLDR */
  .tldr {{ margin-top: 20px; padding: 22px 24px; border-radius: 12px;
    background: var(--surface); border: 1px solid var(--line);
    border-left: 4px solid var(--burn); box-shadow: var(--shadow);
    font-size: clamp(16px, 2.1vw, 19px); }}
  .tldr em {{ font-style: normal; color: var(--burn); font-weight: 600; }}

  .verdict {{ margin-top: 16px; padding: 20px 24px; border-radius: 12px;
    background: var(--surface-2); border: 1px solid var(--line); }}
  .verdict blockquote {{ margin: 0; font-size: clamp(16px, 2vw, 18px); }}
  .verdict em {{ font-style: normal; color: var(--red); font-weight: 600; }}
  .verdict .attr {{ margin-top: 10px; font-family: "IBM Plex Mono", monospace;
    font-size: 11px; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }}

  section {{ margin-top: 44px; }}
  .sec-head {{ display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }}
  .sec-head h2 {{ font-size: 20px; margin: 0; letter-spacing: -.01em; }}
  .sec-head .count {{ font-family: "IBM Plex Mono", monospace; font-size: 12px; color: var(--muted); }}

  /* Side-by-side hero */
  .pairs {{ display: grid; gap: 22px; }}
  .pair {{ margin: 0; }}
  .pair img {{ width: 100%; height: auto; display: block; border-radius: 10px;
    border: 1px solid var(--line); image-rendering: pixelated; box-shadow: var(--shadow); }}
  figcaption {{ margin-top: 10px; font-size: 14.5px; color: var(--ink); }}
  .pair-ours, .pair-arc, .pair-vs {{ font-family: "IBM Plex Mono", monospace; font-size: 10.5px;
    font-weight: 600; letter-spacing: .12em; padding: 2px 7px; border-radius: 4px; vertical-align: middle; }}
  .pair-ours {{ color: var(--cream); background: var(--burn); }}
  .pair-arc {{ color: var(--cream); background: var(--cyan); }}
  .pair-vs {{ color: var(--muted); letter-spacing: .05em; }}
  figcaption strong {{ display: inline; margin-left: 6px; }}

  /* Gaps */
  .gaps {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }}
  .gap {{ display: grid; grid-template-columns: auto auto 1fr; gap: 14px; align-items: start;
    padding: 16px 18px; background: var(--surface); border: 1px solid var(--line);
    border-radius: 10px; box-shadow: var(--shadow); }}
  .gap-rank {{ font-family: "Press Start 2P", monospace; font-size: 15px; color: var(--muted);
    line-height: 1.2; font-variant-numeric: tabular-nums; }}
  .gap-chip {{ font-family: "IBM Plex Mono", monospace; font-size: 10px; font-weight: 600;
    letter-spacing: .1em; padding: 4px 8px; border-radius: 4px; white-space: nowrap;
    color: var(--chip); border: 1px solid var(--chip); height: fit-content; }}
  .gap-body strong {{ font-size: 16px; }}
  .gap-body p {{ margin: 5px 0 0; color: var(--muted); font-size: 14.5px; }}

  .shipped {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
  .shipped li {{ padding: 13px 15px 13px 38px; position: relative; background: var(--surface);
    border: 1px solid var(--line); border-left: 3px solid var(--cyan); border-radius: 8px;
    font-size: 14.5px; box-shadow: var(--shadow); }}
  .shipped li::before {{ content: "✓"; position: absolute; left: 14px; top: 12px; color: var(--cyan);
    font-weight: 700; }}

  .keep {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }}
  .keep li {{ padding: 12px 14px 12px 32px; position: relative; background: var(--surface-2);
    border-radius: 8px; font-size: 14px; }}
  .keep li::before {{ content: "+"; position: absolute; left: 13px; top: 11px; color: var(--cyan);
    font-family: "IBM Plex Mono", monospace; font-weight: 600; }}

  .foot {{ margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--line);
    font-size: 13.5px; color: var(--muted); }}
  .foot .mono {{ color: var(--ink); }}
  a {{ color: var(--cyan); }}
</style>

<div class="wrap">
  <header class="hud">
    <span class="badge">AFTER&nbsp;BURNER&nbsp;R{r['number']}</span>
    <div class="hud-stat"><span class="k">Score</span><span class="v">{esc(r['score'])}</span></div>
    <div class="hud-stat"><span class="k">Last closed</span><span class="v">{esc(r['last_score'])}</span></div>
    <div class="hud-stat"><span class="k">Date</span><span class="v">{esc(r['date'])}</span></div>
    <span class="hud-spacer"></span>
    <span class="pill{' closed' if r['status']=='CLOSED' else ''}">{esc(r['status'])}</span>
  </header>

  <p class="eyebrow" style="margin-top:34px">Round {r['number']} · The rebuild, measured against the real thing</p>
  <h1>Look first. Measure second.</h1>

  <div class="tldr">{r['tldr']}</div>

  <div class="verdict">
    <blockquote>{r['verdict']}</blockquote>
    <div class="attr">{esc(r['verdict_attr'])}</div>
  </div>

  <section>
    <div class="sec-head"><h2>Ours vs the arcade</h2><span class="count">stage 1 · 60&#8202;Hz capture vs mapped longplay</span></div>
    <div class="pairs">
{pairs_html}
    </div>
  </section>

{shipped_html}

  <section>
    <div class="sec-head"><h2>{esc(gaps_label)}</h2><span class="count">ranked by what breaks the illusion</span></div>
    <ol class="gaps">
{gaps_html}
    </ol>
  </section>

  <section>
    <div class="sec-head"><h2>Keep — do not regress</h2></div>
    <ul class="keep">{keep_html}</ul>
  </section>

  <p class="foot">{esc(r['method_note'])}</p>
</div>
"""


def main():
    out = os.path.join(ROOT, f"judging/R{ROUND['number']}/report.html")
    if len(sys.argv) > 1:
        out = sys.argv[1]
    with open(out, "w") as f:
        f.write(build())
    print("wrote", out, f"({os.path.getsize(out)//1024} KB)")


if __name__ == "__main__":
    main()
