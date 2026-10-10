#!/usr/bin/env python3
"""MIRROR SYNC — regenerate `drawJetSilhouette()` in src/render/spriteFactory.js
from `levelOps()` in tools/art/sheets/player-f14.js.

mirror_check.py asserts the two copies agree. This writes the second copy, so
the assertion has something to pass. Doing it by hand is how R5 shipped a
different aircraft in daylight for a whole round, and R7 then shipped a roll
sheet with holes in it for the same family of reason.

The transform is purely mechanical:
  * the sheet's bare constant names take the file's JET_ prefix
  * the sheet's `ops.push` plumbing is dropped; spriteFactory defines its own
    poly/rect against the pixel buffer
  * `return ops;` is dropped

Run it, then run mirror_check.py, then build. Never edit the spriteFactory
copy directly.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHEET = ROOT / 'tools/art/sheets/player-f14.js'
FALLBACK = ROOT / 'src/render/spriteFactory.js'

CONSTS = ['ROOT_Y', 'FIN_TOP_OUT', 'FIN_TOP_IN', 'FIN_ROOT_OUT', 'FIN_ROOT_IN',
          'NAC_X', 'NAC_Y', 'POD_R', 'CX', 'LOCAL_W', 'LOCAL_H',
          'WING_ROOT_IN', 'WING_LE_ROOT_Y', 'WING_TE_ROOT_Y', 'WING_LE_TIP_Y',
          'WING_TE_TIP_Y', 'WING_TIP_X']


def func_body(src, name):
    i = src.index(f'function {name}(')
    i = src.index('{', i)
    d = 0
    for j in range(i, len(src)):
        if src[j] == '{':
            d += 1
        elif src[j] == '}':
            d -= 1
            if d == 0:
                return i, j
    raise SystemExit(f'unbalanced braces in {name}')


def main():
    sheet = SHEET.read_text()
    i, j = func_body(sheet, 'levelOps')
    body = sheet[i + 1:j]

    # drop the ops-array plumbing and the return
    lines = []
    skip = ('const ops = []', 'const poly = (points, hex)', 'const rect = (x, y, w, h, hex)',
            'poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], hex)',
            'const disc = (x, y, r, hex)', 'return ops;')
    for ln in body.split('\n'):
        if any(k in ln for k in skip):
            continue
        lines.append(ln)
    body = '\n'.join(lines).strip('\n')

    # prefix the shared constants
    for c in sorted(CONSTS, key=len, reverse=True):
        body = re.sub(rf'(?<![\w.]){c}\b', f'JET_{c}', body)

    out = FALLBACK.read_text()
    i, j = func_body(out, 'drawJetSilhouette')
    head = ("{\n  const Y = JET_DRAW_Y;\n"
            "  const poly = (points, hex) => fillPolygonHard(buf, points.map(([x, y]) => [x, y + Y]), hex);\n"
            "  const rect = (x, y, w, h, hex) =>\n"
            "    poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], hex);\n"
            "  const c = pal;\n\n")
    new = head + body + '\n}'
    FALLBACK.write_text(out[:i] + new + out[j + 1:])
    print(f'drawJetSilhouette regenerated from levelOps ({len(body.splitlines())} lines)')

    # the shared constants themselves
    out = FALLBACK.read_text()
    n = 0
    for c in CONSTS:
        m = re.search(rf'^const {c} = (.+?);\s*(?://.*)?$', sheet, re.M)
        if not m:
            continue
        cur = re.search(rf'^const JET_{c} = (.+?);\s*(?://.*)?$', out, re.M)
        if cur and cur.group(1).strip() != m.group(1).strip():
            out = out[:cur.start(1)] + m.group(1) + out[cur.end(1):]
            n += 1
    FALLBACK.write_text(out)
    print(f'{n} shared constant(s) re-synced')
    return roles_pass(body)


# ---------------------------------------------------------------------------
# ROLE SYNC. The two hand-kept role lists (JET_PALETTE_ROLES in spriteFactory,
# LEVEL_OPS_ROLES in the sheet) exist to stop an undefined palette entry
# reaching the rasterizer, where PixelCanvas.set() ERASES rather than throwing
# and fillPolygonHard's hexToRgb dies with "Cannot read properties of
# undefined (reading 'slice')" at module construction.
#
# Both lists are hand-maintained and therefore both have the same hole: they
# only check the roles someone remembered to add. R9 added `specular` to the
# drawing, both lists stayed quiet, and the game failed to boot. So the lists
# are now DERIVED from the drawing program's own text, and every palette table
# that feeds the drawing is checked against them.
def roles_pass(body):
    used = sorted(set(re.findall(r'\bc\.([A-Za-z][A-Za-z0-9]*)', body)))
    ok = True

    for path, name in ((FALLBACK, 'JET_PALETTE_ROLES'),
                       (SHEET, 'LEVEL_OPS_ROLES')):
        src = path.read_text()
        m = re.search(rf'const {name} = \[(.*?)\];', src, re.S)
        if not m:
            print(f'  ROLE SYNC: {name} not found in {path.name}')
            ok = False
            continue
        have = sorted(set(re.findall(r"'([^']+)'", m.group(1))))
        if have != used:
            lit = ',\n  '.join(', '.join(f"'{r}'" for r in used[i:i + 6])
                                for i in range(0, len(used), 6))
            src = src[:m.start(1)] + '\n  ' + lit + ',\n' + src[m.end(1):]
            path.write_text(src)
            print(f'  ROLE SYNC: {name} rewritten from the drawing '
                  f'({len(used)} roles)')

    # Every palette table that reaches the drawing must define every role.
    tables = []
    fb = FALLBACK.read_text()
    for t in ('PLAYER_PALETTE_DAY', 'PLAYER_PALETTE_NIGHT'):
        m = re.search(rf'const {t} = \{{(.*?)\n\}};', fb, re.S)
        if m:
            tables.append((f'spriteFactory {t}', set(re.findall(r'^\s*(\w+):', m.group(1), re.M))))
    pal = (ROOT / 'tools/art/palettes.js').read_text()
    for t in ('PLAYER', 'PLAYER_NIGHT', 'PLAYER_ROLL'):
        m = re.search(rf'export const {t} = \{{(.*?)\n\}};', pal, re.S)
        if m:
            tables.append((f'palettes {t}', set(re.findall(r'^\s*(\w+):', m.group(1), re.M))))
    # the sheet's roles() and the roll sheet's three tables rename as they map,
    # so check the names the DRAWING sees, via those mappings
    sheet = SHEET.read_text()
    m = re.search(r'function roles\(p\) \{\s*return \{(.*?)\n  \};', sheet, re.S)
    mapped = dict(re.findall(r'(\w+):\s*p\.(\w+)', m.group(1))) if m else {}
    for label, names in tables:
        if label.startswith('palettes PLAYER') and mapped:
            names = {k for k, v in mapped.items() if v in names}
        if label.startswith('palettes PLAYER_ROLL'):
            continue  # the roll sheet builds its own tables; assertRoles covers it
        missing = [r for r in used if r not in names]
        if missing:
            print(f'  ROLE SYNC: {label} is missing {", ".join(missing)}')
            ok = False
    print('  ROLE SYNC:', 'OK' if ok else 'FAIL',
          f'-- {len(used)} roles read by the drawing')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
