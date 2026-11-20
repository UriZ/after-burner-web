"""60 Hz blob tracker for arcade frames (R40 density-truth lane).

Links per-frame blobs from blobs.py into TRACKS so that arrival width, entry
region, on-screen lifetime, simultaneous counts and inter-arrival gaps all come
from ONE instrument. Identity of each track is assigned by EYE from the
filmstrip this writes; the tracker never decides what a track is.
"""
import numpy as np, json, os, sys, glob
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blobs as B

MAX_GAP = 6          # frames a track may vanish and still continue (0.1 s)
MAX_W   = 620        # px: wider than this is ground / cloud mass, not an aircraft
MAX_AREA= 90000

def cent(r): return ((r['x0']+r['x1'])/2.0, (r['y0']+r['y1'])/2.0)

def link(frames):
    """frames: list of (index, [blob,...]). Returns list of tracks."""
    tracks=[]; active=[]
    for fi, bl in frames:
        cands=[r for r in bl if r['w']<=MAX_W and r['area']<=MAX_AREA]
        used=set(); pairs=[]
        for ai,t in enumerate(active):
            last=t['obs'][-1]; cx,cy=cent(last['r'])
            for ci,r in enumerate(cands):
                x,y=cent(r)
                d=((x-cx)**2+(y-cy)**2)**0.5
                reach=max(34.0, 0.9*max(last['r']['w'], r['w'])) * (1+ (fi-last['f']-1)*0.6)
                wr = r['w']/max(1,last['r']['w'])
                if d<=reach and 0.45<=wr<=2.2:
                    pairs.append((d/(1.0+0.02*r['w']), ai, ci))
        pairs.sort()
        takena=set()
        for cost,ai,ci in pairs:
            if ai in takena or ci in used: continue
            takena.add(ai); used.add(ci)
            active[ai]['obs'].append(dict(f=fi, r=cands[ci]))
        for ci,r in enumerate(cands):
            if ci in used: continue
            active.append(dict(obs=[dict(f=fi, r=r)]))
        keep=[]
        for t in active:
            if fi - t['obs'][-1]['f'] > MAX_GAP: tracks.append(t)
            else: keep.append(t)
        active=keep
    tracks.extend(active)
    return tracks

def summarise(t, W, HZ=60.0):
    obs=t['obs']; ws=[o['r']['w'] for o in obs]
    xs=[cent(o['r'])[0] for o in obs]; ys=[cent(o['r'])[1] for o in obs]
    f0,f1=obs[0]['f'], obs[-1]['f']
    return dict(f0=f0, f1=f1, n=len(obs), dur=round((f1-f0+1)/HZ,3),
                w0=ws[0], wmax=max(ws), wend=ws[-1],
                wfrac0=round(ws[0]/W*100,2), wfracmax=round(max(ws)/W*100,2),
                x0=round(xs[0]), y0=round(ys[0]), x1=round(xs[-1]), y1=round(ys[-1]),
                dx=round(xs[-1]-xs[0]), dy=round(ys[-1]-ys[0]),
                motion=round(float(np.hypot(np.diff(xs), np.diff(ys)).mean()) if len(xs)>1 else 0,2),
                meanw=round(float(np.mean(ws)),1))

def filmstrip(t, files, out, n=6, pad=14, cell=150):
    obs=t['obs']; idx=[int(round(i)) for i in np.linspace(0,len(obs)-1,min(n,len(obs)))]
    im=Image.new('RGB',(cell*len(idx), cell+18),(20,20,20)); d=ImageDraw.Draw(im)
    for k,j in enumerate(idx):
        o=obs[j]; r=o['r']
        src=Image.open(files[o['f']]).convert('RGB')
        cx,cy=cent(r); half=max(r['w'],r['h'])/2+pad
        box=(int(cx-half),int(cy-half),int(cx+half),int(cy+half))
        crop=src.crop(box).resize((cell,cell), Image.NEAREST)
        im.paste(crop,(k*cell,18))
        d.text((k*cell+3,3), f"f{o['f']} w{r['w']}", fill=(255,255,0))
    im.save(out)
