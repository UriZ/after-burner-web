import sys, os, glob, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blobs as B, track as T

d = sys.argv[1]; out = sys.argv[2]
files = sorted(glob.glob(os.path.join(d,'f*.png')))
sky, share = B.sky_mode(files[::200][:8])
print('sky', sky, round(share,3), 'frames', len(files), flush=True)
frames=[]
for i,f in enumerate(files):
    res,(W,H) = B.analyse(f, sky, minarea=14, minw=4)
    frames.append((i,res))
    if i%200==0: print(i, len(res), flush=True)
tracks = T.link(frames)
summ = [dict(id=k, **T.summarise(t, W)) for k,t in enumerate(tracks)]
json.dump(dict(sky=[int(v) for v in sky], W=W, H=H, nframes=len(files),
               tracks=summ,
               raw={str(k):[dict(f=o['f'], **{kk:o['r'][kk] for kk in ('x0','y0','x1','y1','w','h','area')}) for o in t['obs']] for k,t in enumerate(tracks)}),
          open(out,'w'))
print('tracks', len(tracks))
