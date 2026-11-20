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
    "number": 38,
    "headline": "Kills no longer bury your jet; the shot that kills you is visible; dying costs lives again.",
    "prev_score": "7 / 10",
    "score": "6.5 / 10",  # R39 playtest scored the build R38 shipped
    "tldr": (
        "The playtest said the missile loop is <em>finally satisfying</em> — and named what still hurts. "
        "All four shipped: kills no longer <em>bury your jet</em> (they erupt at the victim and balloon "
        "past the camera, like the arcade), the shot that kills you <em>strobes</em> on every background, "
        "<em>dying costs lives again</em> (a held fire button was silently buying continues), and the "
        "empty-sky / parked-wingmen stretches are gone (crossings ran at half speed for 10 rounds)."
    ),
    "pairs_label": "Where we actually are",
    "pairs_sub": "every row is labelled inside the image — blue = arcade, orange = ours",
    "pairs": [
        ("judging/R38/report-assets/arcade-vs-ours-stage1.png",
         ("ARCADE", "OURS"),
         "The reference, and our build, side by side.",
         "Top row is the 1987 arcade; bottom row is ours at the same stage. Sky, sea, jet and HUD hold up. The honest gap this exposes: the arcade's sky is CROWDED — several enemies at readable size at once — while ours runs thinner. That density is the top item on the R39 list."),
        ("judging/R38/report-assets/kill-before-after.png",
         ("BEFORE", "AFTER"),
         "Kills stop burying your jet.",
         "Same kill, same tick, ours both rows. Before: a fixed-size fireball parks on the jet (84% peak coverage). After: a brief wing eruption, then the jet flies clean — sized to the victim, ballooning past the camera like the arcade's dead smoke. Your own death starburst still parks on the jet, so a kill never looks like your death."),
        ("judging/R38/death-legibility2/before-after-fatal-round.png",
         ("BEFORE", "AFTER"),
         "The killing shot strobes on every background.",
         "All 7 playtest deaths were 'announced' — but the round's pale body camouflaged against the desert sky and clouds (it was measured on night footage). Now the killer class strobes red↔hot; everything ambient holds steady color."),
        ("judging/R38/death-cost/arcade-reserve-icons-t266-338.png",
         ("ARCADE",),
         "Dying costs lives again — the arcade rule, read off its own HUD.",
         "The lives icons hold at 0 across two stage boundaries — no refill exists. Ours 'refilled' because a fire button still held from combat bought the continue on its first tick. Now a coin needs a fresh press that begins on the continue screen."),
    ],
    "shipped": [
        "Kill explosions victim-sized, ballooning past camera; jet coverage 84% → ~0; sim provably unchanged (identical kill ticks)",
        "Fatal round strobes red↔hot + bigger battery telegraph; air rounds byte-untouched",
        "Continue coin is rising-edge only — lives per credit are real, game over reachable",
        "Crossing tempo fixed (patterns ran at HALF rate — 'parked wingmen'); visible-emptiness relief pair: max empty gap 6.5→2.2 s (arcade ~1.5–2 s)",
        "Close presence 0.096→0.178 nominal — the old gap dented, not closed",
    ],
    "gaps_label": "Next — R39",
    "gaps": [
        (1, "feel", "Close presence by drawn width still ~0.09 vs arcade 0.40–0.70",
         "The relief pair proves the mechanism; the real fix is the arrival-pipeline redesign — side-entry mid-large arrivals as part of the ordinary rhythm."),
        (2, "feel", "Far kills still don't happen — locks form at mid depth",
         "R37's honest residual, unaddressed this round (the playtest didn't raise it; it may once density improves)."),
        (3, "polish", "Attract demo barely kills",
         "R30-deferred: make the demo AIM its fire windows. Attract-only."),
        (4, "polish", "Mid-kill residue smoke is parked, arcade's balloons for ~2 s",
         "Needs a velocity option on SmokeField.spawn (cross-file request logged)."),
    ],
    "keep": [
        "Your death starburst parks on the jet; enemy kills do not — that contrast is what tells them apart",
        "A held fire button must never buy a continue (rising-edge only, verify_continue.mjs 4/4)",
        "Hands-off play stays ≤0.4× aimed, 0 unannounced fatal hits, warning floor ≥1.167 s",
        "Air rounds stay as they are — only battery rounds strobe, or the strobe stops meaning 'this one kills you'",
    ],
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
    <div class="sec-head"><h2>Shipped this round</h2></div>
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

  h1 {{ font-size: clamp(26px, 5vw, 44px); line-height: 1.08; margin: 30px 0 0;
    letter-spacing: -.02em; text-wrap: balance; max-width: 18ch; }}

  /* TLDR */
  .tldr {{ margin-top: 20px; padding: 22px 24px; border-radius: 12px;
    background: var(--surface); border: 1px solid var(--line);
    border-left: 4px solid var(--burn); box-shadow: var(--shadow);
    font-size: clamp(16px, 2.1vw, 19px); }}
  .tldr em {{ font-style: normal; color: var(--burn); font-weight: 600; }}


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

  a {{ color: var(--cyan); }}
</style>

<div class="wrap">
  <header class="hud">
    <span class="badge">R{r['number']}</span>
    <div class="hud-stat"><span class="k">Last round</span><span class="v">{esc(r['prev_score'])}</span></div>
    <div class="hud-stat"><span class="k">This round</span><span class="v">{esc(r['score'])}</span></div>
  </header>

  <h1 style="margin-top:34px">{esc(r['headline'])}</h1>

  <div class="tldr">{r['tldr']}</div>

  <section>
    <div class="sec-head"><h2>{esc(r.get("pairs_label", "The pictures"))}</h2><span class="count">{esc(r.get("pairs_sub", "every panel is labelled in the image itself"))}</span></div>
    <div class="pairs">
{pairs_html}
    </div>
  </section>

{shipped_html}

  <section>
    <div class="sec-head"><h2>{esc(gaps_label)}</h2></div>
    <ol class="gaps">
{gaps_html}
    </ol>
  </section>

  <section>
    <div class="sec-head"><h2>Keep — do not regress</h2></div>
    <ul class="keep">{keep_html}</ul>
  </section>

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
