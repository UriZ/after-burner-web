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
    "number": 25,
    "date": "2026-11-15",
    "status": "CORE FIX IN PROGRESS",
    "score": "~5 / 10",
    "last_score": "9.3 was backdrop-only (superseded)",
    "tldr": (
        "<strong>The owner played the 9.3 build and called it “pretty bad.”</strong> The judges had "
        "drifted into scoring element-by-element arcade <em>fidelity</em> — the biomes, the canyon, the "
        "tanker all genuinely match the arcade frames — while the game is <em>bad to play</em>: pressing "
        "the missile button at enemies fires <em>nothing</em> (the signature AB2 weapon needs an obscure "
        "camp-to-lock move no player would find), and the jet + enemy sprites aren’t good enough. Fidelity "
        "of parts is not a good game. The judging is recalibrated to score <em>naive play</em>, the build "
        "is honestly <strong>~5</strong>, and this round fixes the core instead of adding more backdrop."
    ),
    "verdict": (
        "“No missiles, no heat-seeking missiles; the UI/sprites — both my jet and the enemies — are not "
        "good enough; overall pretty bad.”"
    ),
    "verdict_attr": "The owner, after playing the build — the ground truth that outranks every judge",
    "pairs": [
        ("judging/R21/cmp-canyon.png",
         "The backdrop fidelity is real — but it isn’t the game",
         "The canyon, biomes, and airframes genuinely match the arcade (this is why the judges said 9.3). The problem is what the player’s hands and eyes actually touch: the weapons and the sprites."),
        ("judging/R19/tanker-ours-vs-arcade.png",
         "Beautiful parts, weak core",
         "Both refuel beats, seven biomes, matched airframes — all shipped. None of it helps if the signature missile is unusable and the jet reads flat. The score now reflects PLAY, not frame-match."),
        ("judging/R12/gestalt/pair1-combat-salvo.png",
         "The sprites need a real redraw",
         "The owner flagged the player jet AND the enemies. This round is an art-quality pass on the aircraft — not a palette tweak — plus making the missile an arcade-simple point-and-shoot heat-seeker."),
    ],
    "shipped": [
        "RECALIBRATED the judging — the score now anchors on a full NAIVE playtest (play like a first-timer, no insider moves)",
        "Weapons-usability + controls-feel + sprite quality are scored ABOVE backdrop fidelity; re-baselined (5-6 = this build)",
        "Confirmed the owner’s verdict: a naive player pressing the missile button at enemies fires 0 missiles",
        "STOPPED adding content (biomes/stages) until the core plays well",
    ],
    "gaps_label": "Fixing now — R25",
    "gaps": [
        (1, "bug", "Missiles don’t work for a player — make them arcade-simple",
         "AB2’s signature: point the reticle at enemies, press the button, it locks what’s near your aim and fires HOMING heat-seekers that chase them down. Ours needs camping a lock band — a naive player fires none. Rip out the barrier; a first-timer pressing X at enemies gets locks and kills within seconds."),
        (2, "feel", "The sprites aren’t good enough — the jet AND the enemies",
         "The owner singled out both. A real art-quality redraw of the player F-14 (on screen 100% of the time) and the enemy aircraft against the arcade — crisper, more characterful, not flat/toylike. Not a palette tweak."),
        (3, "feel", "Then re-judge the whole feel at naive play",
         "Once missiles work and the sprites improve, does it feel like AB2 in the hands? The recalibrated judge plays naively and scores the PLAY, not the frames."),
        (4, "missing", "Deferred: the backdrop work",
         "The flat field biomes, more stages, canyon density — all genuinely ahead of the gameplay already. Not this round; the core comes first."),
    ],
    "keep": [
        "The backdrop fidelity that IS right: 7 biomes, both refuel beats, the structured canyon, matched airframes",
        "The things that work: the gun, the afterburner, the refuel beats, the death cycle, the stage variety",
        "The recalibrated calibration — score naive PLAY, owner outranks the judge, don’t inflate on frame-match",
    ],
    "method_note": (
        "This is the R12 failure re-emerging and being caught again — by the owner. The judges re-measure "
        "ELEMENT FIDELITY (which climbs) and under-weight whether the game is good to PLAY (which is the "
        "point). The signature missile was unusable for 13 rounds while every judge passed it by testing "
        "DELIBERATE play, never naive play. The fix is a harder anchor: the judge plays like the owner, and "
        "the owner outranks the judge. History in judging/; recalibration in CLAUDE.md."
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
