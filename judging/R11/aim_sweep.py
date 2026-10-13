#!/usr/bin/env python3
"""Drive tools/fairness_probe.mjs across arms that differ by ONE constant set.

Each arm edits the named constants in place, runs the probe, and restores the
files from an in-memory copy in a `finally`, verifying the restore by md5. If
the restore ever fails the script says so loudly rather than leaving an edited
tree behind — other lanes are live in this repo.

  aim_sweep.py --out DIR --seeds 1,2,3,4,5,6,7 --seconds 300 \
      --arm 'LABEL:file.js:CONST=value,CONST=value;file2.js:CONST=value'
"""
import argparse, hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def md5(p):
    return hashlib.md5(open(p, 'rb').read()).hexdigest()


def patch(path, assignments):
    src = open(path).read()
    for name, val in assignments:
        pat = re.compile(r'^(\s*(?:export\s+)?const\s+%s\s*=\s*)[^;]+;' % re.escape(name),
                         re.M)
        new, n = pat.subn(lambda m: m.group(1) + val + ';', src)
        if n != 1:
            raise SystemExit('aim_sweep: %s = ... matched %d times in %s (want 1)'
                             % (name, n, path))
        src = new
    open(path, 'w').write(src)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--seeds', default='1,2,3,4,5,6,7')
    ap.add_argument('--seconds', type=int, default=300)
    ap.add_argument('--url-params', default='demo=1')
    ap.add_argument('--arm', action='append', required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    for spec in a.arm:
        label, rest = spec.split(':', 1)
        edits = []
        for chunk in rest.split(';'):
            if not chunk.strip():
                continue
            f, assigns = chunk.split(':', 1)
            edits.append((os.path.join(ROOT, f),
                          [tuple(x.split('=', 1)) for x in assigns.split(',') if x]))
        files = [f for f, _ in edits]
        saved = {f: open(f).read() for f in files}
        before = {f: md5(f) for f in files}
        try:
            for f, assigns in edits:
                patch(f, assigns)
            out = os.path.join(a.out, 'fp-%s.json' % label)
            cmd = ['node', os.path.join(ROOT, 'tools/fairness_probe.mjs'),
                   '--seeds', a.seeds, '--seconds', str(a.seconds),
                   '--url-params', a.url_params]
            print('ARM %s: %s' % (label, rest), flush=True)
            res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            if res.returncode != 0:
                print(res.stderr[-3000:], file=sys.stderr)
                raise SystemExit('probe failed on arm %s' % label)
            open(out, 'w').write(res.stdout)
            d = json.loads(res.stdout)
            print('  deaths/min %.3f   rounds/min %.1f   inAir %.2f'
                  % (d['meanDeathsPerMin'], d['meanShotsPerMin'],
                     sum(r['meanShotsInAir'] for r in d['runs']) / len(d['runs'])),
                  flush=True)
        finally:
            for f in files:
                open(f, 'w').write(saved[f])
            bad = [f for f in files if md5(f) != before[f]]
            if bad:
                print('!!! RESTORE FAILED on %s — the tree is NOT as you left it' % bad,
                      file=sys.stderr)
                sys.exit(9)
    print('all arms done; every edited file restored and md5-verified')


if __name__ == '__main__':
    main()
