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
    "number": 37,
    "date": "2026-11-20",
    "status": "SHIPPED — all six lanes committed",
    "score": "owner is playing",  # owner-driven round; fresh naive playtest queued for R38 seeding
    "last_score": "R36: 7/10 naive playtest → this round = the owner's live asks + R36's gap list",
    "tldr": (
        "Your five live asks, shipped: enemy jets fixed by <em>reversing a 10-round-old error</em> (the "
        "arcade enemy has ONE nozzle — the twin glows were the 'insect face'), incoming fire that "
        "<em>looks and sounds</em> like a threat, the arcade's billowing <em>missile trail</em>, and the "
        "slow start traced to three real bugs — the biggest: <em>the music never actually played</em> "
        "(200 s render, now instant) and the dev server was choking on 74k files (first frame 8.7→1.9 s). "
        "Plus R36's top gap: <em>aiming matters now</em> — hands-off play collapsed to 0.33× of aimed."
    ),
    "verdict": (
        "“Hands-off: 13 kills/min, zero missiles, stuck at stage 1. Aimed: 38, missiles working, "
        "reaches stage 3. A pointing player notices nothing changed.”"
    ),
    "verdict_attr": "R37 gate verification — quiet tree, seeds 7/42/3 · owner's hands are the verdict",
    "pairs": [
        ("judging/R37/enemy-art/compare-poses-arcade-before-after.png",
         ("ARCADE | BEFORE | AFTER",),
         "The enemy jet, de-bugged.",
         "One nozzle, not two — R27 misread the player's jet, and the twin glows were your 'insect face'. Now: single bell, green camo, real quarter-view poses that bank into turns. Behavior byte-identical."),
        ("judging/R37/incoming-fire/look-compare.png",
         ("ARCADE | BEFORE | AFTER",),
         "Incoming fire reads (and sounds) like the arcade.",
         "The red-cap oval, two boil frames — no longer the same color as your own gun. Air rounds whistle in over the last 1.5 s; battery rounds roar their whole flight."),
        ("judging/R37/missile-feel/sbs-trail-column.png",
         ("ARCADE | BEFORE | AFTER",),
         "Missile trail billows like the arcade's.",
         "Scalloped white column, puff tail that persists and thins. Locked missiles also arrive in the arcade's 0.5–1.5 s again."),
    ],
    "shipped": [
        "Aiming matters: hit disc 1.2→0.5 span-mult + locks require steering; hands-off 0.62×→0.33× of aimed, zero free locks; pointing players byte-identical",
        "Music actually plays — 0.31 s after start, per-stage variants switch (R35's renderer needed 200+ s per variant and never played)",
        "Start fixed: dev server watch ignores (first frame 8.7→1.9 s), Space/Enter start the game; press-to-flying is 3× FASTER than the real arcade",
        "Enemy art: one nozzle, 9-pose ladder, nozzle shimmer, crab-pose selection",
        "Incoming fire: arcade oval + full-approach whistle/roar, cut on impact",
        "Retracted a fabricated figure (the '0.33–0.40 presence' comment cited a sweep that never ran)",
    ],
    "gaps_label": "Next — R38",
    "gaps": [
        (1, "feel", "Far kills still don't happen — 3–5% vs arcade ~22%",
         "Measured at gate: missiles now FLY right, but locks still FORM at mid depth. The lane is lock-formation depth, not missile speed."),
        (2, "feel", "Attract demo barely kills now",
         "Its old kills were free-disc kills. Fix is making the demo AIM its fire windows (R30-deferred) — not a demo-only hit radius."),
        (3, "tension", "Close-presence vs arcade (~0.07 vs 0.40–0.70)",
         "Old, real, never-closed. The arcade's density comes from enemies ARRIVING already large. Needs its own round."),
        (4, "polish", "Your ears are still the missing instrument",
         "The music/SFX/whistles are verified by render stats; machines can't hear. You can now — it actually plays."),
    ],
    "keep": [
        "Reversing R27's enemy misread instead of polishing it — four rounds of 'sprites need work' traced to one wrong fact",
        "Root-causing 'slow start' to infrastructure instead of trimming the launch cinematic",
        "0 unannounced fatal hits on every seed through six lanes of combat changes",
    ],
    "method_note": (
        "Owner-driven round: every lane came from a sentence you typed while playing. Two long-standing "
        "complaints died when a measured 'fact' was re-checked at source. Evidence in judging/R37/."
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
    def pair_badges(badges):
        # badges: tuple of 1 or 2 labels, e.g. ("BEFORE", "AFTER"), ("OURS", "ARCADE"),
        # or ("NEW",). Two labels render left=burn, right=cyan with an arrow between —
        # the badge must say what the image actually shows (owner, R36: a before/after
        # strip labelled "OURS vs ARCADE" is a lie).
        if len(badges) == 1:
            return f'<span class="pair-ours">{esc(badges[0])}</span>'
        return (f'<span class="pair-ours">{esc(badges[0])}</span>'
                f'<span class="pair-vs">→</span>'
                f'<span class="pair-arc">{esc(badges[1])}</span>')

    pairs_html = "\n".join(
        f'''      <figure class="pair">
        <img src="{data_uri(src)}" alt="{esc(title)}" loading="lazy" />
        <figcaption>{pair_badges(badges)}
          <strong>{esc(title)}</strong> {esc(cap)}</figcaption>
      </figure>'''
        for src, badges, title, cap in r["pairs"]
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
