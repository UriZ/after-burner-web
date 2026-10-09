#!/usr/bin/env python3
"""MIRROR CHECK — the player jet's level planform is written twice, and this
asserts the two copies still agree.

Why it exists. `levelOps()` in tools/art/sheets/player-f14.js generates the
authored pose sheets; `drawJetSilhouette()` in src/render/spriteFactory.js
draws the same aircraft for the pre-decode fallback and for createJetSprite's
initial texture. They cannot share code: the tools module runs in node and the
src module statically imports three.js and PNG assets through Vite. Both files
already carry a shouting comment saying "change both or neither" — and in R5
they diverged anyway, shipping a different, worse aircraft in daylight for a
whole round. A comment is not a guard.

OPERATOR. Strip comments, take the two function bodies, and extract every
NUMERIC LITERAL in source order, with the colour-role identifiers in source
order alongside. Compare the two sequences. This is deliberately syntactic: it
does not prove the two drawings rasterize identically (nothing short of
running both can), but it catches the failure that actually happens — an edit
applied to one file and not the other. Role names are normalised because the
two files spell the same role differently by history (`coolDark` vs `slate`,
`c.` vs `pal.`).

Usage: python3 tools/art/mirror_check.py        # exits non-zero on divergence
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / "tools/art/sheets/player-f14.js"
FALLBACK = ROOT / "src/render/spriteFactory.js"

# The two files' names for the same eight palette roles.
ROLE_ALIASES = {"slate": "coolDark"}
ROLES = {"key", "lightTop", "midNeutral", "coolDark", "deepShadow", "canopy", "flame", "flameCore"}

# Constant names that mean the same anchor in each file.
CONST_NAMES = [
    "ROOT_Y", "FIN_TOP_OUT", "FIN_TOP_IN", "FIN_ROOT_OUT", "FIN_ROOT_IN",
    "NAC_X", "NAC_Y", "POD_R", "CX", "LOCAL_W",
    "WING_ROOT_IN", "WING_LE_ROOT_Y", "WING_TE_ROOT_Y", "WING_LE_TIP_Y",
    "WING_TE_TIP_Y", "WING_TIP_X",
]
CONST_ALIASES = {f"JET_{n}": n for n in CONST_NAMES}


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return "\n".join(re.sub(r"//.*$", "", line) for line in src.splitlines())


def body(path, name):
    src = strip_comments(path.read_text())
    i = src.index(f"function {name}(")
    i = src.index("{", i)
    depth = 0
    for j in range(i, len(src)):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                return src[i : j + 1]
    raise SystemExit(f"could not find the end of {name} in {path}")


def tokens(text):
    """Numeric literals, role/anchor identifiers and ARITHMETIC OPERATORS, in
    source order. The operators are not decoration: podPoly() contains no
    numbers and no role names at all, so without them its comparison would be
    a vacuous "0 items match" — precisely the clean zero CLAUDE.md says to
    crop and look at. With them, flipping one sign in it fails the check."""
    out = []
    for m in re.finditer(r"-?\d+\.?\d*|[A-Za-z_][A-Za-z0-9_]*|[-+*/]", text):
        t = m.group(0)
        if t in "+-*/" and len(t) == 1:
            out.append(("o", t))
            continue
        if re.match(r"^-?\d", t):
            out.append(("n", float(t)))
            continue
        t = CONST_ALIASES.get(t, t)
        t = ROLE_ALIASES.get(t, t)
        if t in ROLES or t in {"ROOT_Y", "FIN_TOP_OUT", "FIN_TOP_IN", "FIN_ROOT_OUT",
                               "FIN_ROOT_IN", "NAC_X", "NAC_Y", "CX"}:
            out.append(("r", t))
    return out


def constants(path):
    """Named anchor constants and their numeric values."""
    src = strip_comments(path.read_text())
    out = {}
    for m in re.finditer(r"const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\[[^\]]*\]|-?\d+\.?\d*)\s*;", src):
        name = CONST_ALIASES.get(m.group(1), m.group(1))
        if name in CONST_NAMES:
            out[name] = re.sub(r"\s+", "", m.group(2))
    return out


def compare(label, a, b, fails):
    if a == b:
        print(f"  OK   {label}: {len(a)} items match")
        return
    fails.append(label)
    print(f"  FAIL {label}: {len(a)} vs {len(b)}")
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            lo = max(0, i - 4)
            print(f"       first difference at {i}:")
            print(f"         sheet    ...{a[lo:i+4]}")
            print(f"         fallback ...{b[lo:i+4]}")
            return
    n = min(len(a), len(b))
    longer, name = (a, "sheet") if len(a) > len(b) else (b, "fallback")
    print(f"       identical up to {n}; {name} continues: {longer[n:n+8]}")


def main():
    fails = []
    ca, cb = constants(SHEET), constants(FALLBACK)
    missing = sorted(set(ca) ^ set(cb))
    if missing:
        fails.append("constant set")
        print(f"  FAIL constants present in only one file: {missing}")
    for k in sorted(set(ca) & set(cb)):
        if ca[k] != cb[k]:
            fails.append(f"constant {k}")
            print(f"  FAIL constant {k}: sheet {ca[k]} vs fallback {cb[k]}")
    if not fails:
        print(f"  OK   {len(ca)} anchor constants match")
    for fn in ("bladePoly", "wingPoly", "podPoly"):
        compare(fn, tokens(body(SHEET, fn)), tokens(body(FALLBACK, fn)), fails)
    # The keyline is the one legitimate structural difference: the sheet
    # applies it in drawFrame() via canvas.outline4(c.key) AFTER levelOps has
    # been transformed into the cell, while the fallback has no transform step
    # and calls addKeyline() at the end of the drawing itself. Both grow one
    # outward ring of `key`; only the call site differs, so that single call
    # is dropped before the comparison rather than papered over.
    # Compare the DRAWING PROGRAM only. Each function opens with its own local
    # helper definitions -- levelOps pushes ops onto an array, drawJetSilhouette
    # rasterizes straight into a buffer with a +Y offset -- and those preambles
    # are legitimately different machinery for the same picture. The drawing
    # starts at the first blade in both, so both bodies are sliced from there.
    MARK = "poly(bladePoly(-1)"
    sb = body(SHEET, "levelOps")
    fb = re.sub(r"addKeyline\([^)]*\);", "", body(FALLBACK, "drawJetSilhouette"))
    sb, fb = sb[sb.index(MARK):], fb[fb.index(MARK):]
    compare("drawing program", tokens(sb), tokens(fb), fails)
    if fails:
        print(f"DIVERGED: {len(fails)} mismatch(es) -- {', '.join(fails)}")
        return 1
    print("OK: the sheet generator and the procedural fallback draw the same aircraft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
