import sys, glob, json
from PIL import Image
import numpy as np
LADDER=set([0,16,25,33,41,49,58,66,74,82,91,99,107,115,123,132,140,148,156,164,173,181,189,197,206,214,222,230,239,247,255])
for d in sys.argv[1:]:
    fs=sorted(glob.glob(d+'/frame-*.png'))
    man=json.load(open(d+'/capture-manifest.json'))
    st={f['frame']: f['state'] for f in man['frames']}
    worstspread=0; maxchan=0; over=0; offs=set(); rows=[]
    for f in fs:
        a=np.array(Image.open(f).convert('RGB')); k=a.shape[1]//320
        b=a.reshape(224,k,320,k,3)
        worstspread=max(worstspread,int((b.max(axis=(1,3)).astype(int)-b.min(axis=(1,3)).astype(int)).max()))
        nat=b[:,0,:,0,:]
        vals=set()
        for c in range(3): vals|=set(np.unique(nat[:,:,c]).tolist())
        off=sorted(v for v in vals if v not in LADDER)
        offs|=set(off)
        maxchan=max(maxchan,len(vals))
        if len(vals)>32: over+=1
        rows.append((f.split('/')[-1],len(vals),off,st[f.split('/')[-1]]['state'],st[f.split('/')[-1]]['deathPhase']))
    print(f'{d}: n={len(fs)} url={man["url"]} maxChan={maxchan} OVER-GATE={over} offLadderUnion={sorted(offs)} worstBlockSpread={worstspread}')
    bad=[r for r in rows if r[1]>32 or [v for v in r[2] if v!=159]]
    for r in bad[:6]: print('   ',r)
