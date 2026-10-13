#!/usr/bin/env python3
"""R11 art critique figures. Every crop box and magnification is in this file.

Usage:  python3 judging/R11/art_critic_r11.py <fig>
Output: tools/out/art-critic-r11/
"""
import sys, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT  = os.path.join(ROOT, 'tools/out/art-critic-r11')
os.makedirs(OUT, exist_ok=True)

CELL_W, CELL_H, NCELL = 64, 32, 5

def cell(path, i):
    """One 64x32 pose cell, RGBA, from a 320x32 enemy sheet."""
    im = Image.open(os.path.join(ROOT, path)).convert('RGBA')
    assert im.size == (CELL_W*NCELL, CELL_H), im.size
    return im.crop((i*CELL_W, 0, (i+1)*CELL_W, CELL_H))

def bbox(im):
    a = im.split()[3]
    return a.getbbox()

def tight(im, pad=1):
    b = bbox(im)
    return im.crop((max(0,b[0]-pad), max(0,b[1]-pad), min(im.width,b[2]+pad), min(im.height,b[3]+pad)))

def on_sky(im, sky, mag):
    """Composite over a flat sky and nearest-upscale by mag."""
    bg = Image.new('RGBA', im.size, sky+(255,))
    bg.alpha_composite(im)
    return bg.convert('RGB').resize((im.width*mag, im.height*mag), Image.NEAREST)

def hstack(ims, gap=8, bg=(24,24,24)):
    h = max(i.height for i in ims); w = sum(i.width for i in ims)+gap*(len(ims)-1)
    out = Image.new('RGB',(w,h),bg); x=0
    for i in ims:
        out.paste(i,(x,(h-i.height)//2)); x += i.width+gap
    return out

def vstack(ims, gap=8, bg=(24,24,24)):
    w = max(i.width for i in ims); h = sum(i.height for i in ims)+gap*(len(ims)-1)
    out = Image.new('RGB',(w,h),bg); y=0
    for i in ims:
        out.paste(i,((w-i.width)//2,y)); y += i.height+gap
    return out

SKY_S1 = (0,158,255)     # STAGE_MAP stage-1 sky, mode of reference/stage1-* crops
SKY_S2 = (231,113,5)     # stage-2 desert sky, mode of A-arc-headon-SOURCE-FRAME-stage2

def save(im, name):
    p = os.path.join(OUT, name); im.save(p); print(p, im.size)

def fig1():
    """LEVEL head-on, span-matched.
       Row 1 ARCADE: tools/out/art-critic-r10/arc-enemy-mid-4x.png crop
         (0,0)-(960,450); 12.85 file px per native px; subject span 918 file px
         = 71.4 native px. SHAPE ONLY (1028x720 is a non-integer resample).
       Row 2 OURS BEFORE (blob 435926e^), row 3 OURS AFTER (HEAD fd833f6):
         enemy-grey-head.png cell 2, 60 px span, NEAREST x15 = 900 px.
       Span mismatch arcade:ours = 918:900 = 1.02."""
    arc = Image.open(os.path.join(ROOT,'tools/out/art-critic-r10/arc-enemy-mid-4x.png')).convert('RGB')
    arc = arc.crop((0,0,960,450))
    b = on_sky(cell('tools/out/art-critic-r11/BEFORE-enemy-grey-head.png',2), SKY_S1, 15)
    a = on_sky(cell('tools/out/art-critic-r11/AFTER-enemy-grey-head.png',2),  SKY_S1, 15)
    save(vstack([arc,b,a]), 'FIG1-level-arcade-before-after.png')

def fig2():
    """Bank cells, AFTER, grey head, all five @12x on stage-1 sky."""
    cs = [on_sky(cell('src/assets/sprites/enemy-grey-head.png',i), SKY_S1, 12) for i in range(5)]
    save(hstack(cs), 'FIG2-bank-after-12x.png')

def fig3():
    """Head-on level cell, every livery, AFTER @12x."""
    rows=[]
    for n,sky in [('grey',SKY_S1),('camo',SKY_S2),('interceptor',SKY_S1),('prop',SKY_S2)]:
        rows.append(hstack([on_sky(cell(f'src/assets/sprites/enemy-{n}-head.png',2),sky,12),
                            on_sky(cell(f'src/assets/sprites/enemy-{n}-rear.png',2),sky,12)]))
    save(vstack(rows), 'FIG3-liveries-12x.png')


PLAYER_CELL_W, PLAYER_CELL_H = 100, 72   # player-f14.png is 900x72 = 9 cells

def pcell(path,i,w=PLAYER_CELL_W):
    im=Image.open(os.path.join(ROOT,path)).convert('RGBA')
    return im.crop((i*w,0,(i+1)*w,im.height))

def fig4():
    """Player F-14 day sheet, all 9 cells @6x on stage-1 sky, plus the level cell @12x."""
    cs=[on_sky(pcell('src/assets/sprites/player-f14.png',i),SKY_S1,6) for i in range(9)]
    save(vstack([hstack(cs[:5]),hstack(cs[5:])]),'FIG4-player-sheet-6x.png')
    save(on_sky(pcell('src/assets/sprites/player-f14.png',4),SKY_S1,12),'FIG4b-player-level-12x.png')


def montage(d='tools/out/art-critic-r11/live-s1', name='FIGM-live.png', cols=4, scale=1):
    import glob
    ps=sorted(glob.glob(os.path.join(ROOT,d,'frame-*.png')))
    ims=[Image.open(p).convert('RGB') for p in ps]
    if scale!=1: ims=[i.resize((i.width//scale,i.height//scale),Image.NEAREST) for i in ims]
    rows=[hstack(ims[i:i+cols],gap=4) for i in range(0,len(ims),cols)]
    save(vstack(rows,gap=4), name)


def fig7():
    """Each livery's LEVEL head cell point-sampled to the widths the player
       actually sees (DETAIL_SWITCH_NATIVE_PX = 10; sheet span 60 px), then
       nearest-upscaled x8 so the sampled pixels are visible.
       Widths 12/20/30/45 native px."""
    rows=[]
    for n,sky in [('grey',SKY_S1),('camo',SKY_S2),('interceptor',SKY_S1),('prop',SKY_S2)]:
        c=cell(f'src/assets/sprites/enemy-{n}-head.png',2)
        panes=[]
        for w in (12,20,30,45):
            h=max(1,round(w*c.height/c.width))
            s=c.resize((w,h), Image.NEAREST)
            panes.append(on_sky(s, sky, 8))
        rows.append(hstack(panes))
    save(vstack(rows), 'FIG7-sizes.png')

def fig8():
    """Player level cell (4) vs a banked cell (1), 12x, stage-1 sky."""
    a=on_sky(pcell('src/assets/sprites/player-f14.png',4),SKY_S1,10)
    b=on_sky(pcell('src/assets/sprites/player-f14.png',1),SKY_S1,10)
    save(hstack([b,a]),'FIG8-player-level-vs-banked.png')


def fig9():
    """Night level head cells, 12x, on a black sky (stage-3 sky is black)."""
    rows=[hstack([on_sky(cell(f'src/assets/sprites/enemy-{n}-head-night.png',2),(0,0,0),12),
                  on_sky(cell(f'src/assets/sprites/enemy-{n}-rear-night.png',2),(0,0,0),12)])
          for n in ('grey','camo','interceptor','prop')]
    save(vstack(rows),'FIG9-night-liveries-12x.png')



def fig5():
    """The two authored explosion sheets, FULL, nearest-upscaled. Neither is
       imported anywhere in src/ and neither appears in dist/ (verified by
       `grep -r "assets/sprites" src/` and `npx vite build`)."""
    save(Image.open(os.path.join(ROOT,'src/assets/sprites/explosion.png')).convert('RGB')
         .resize((576*4,72*4),Image.NEAREST), 'FIG5-explosion-sheet-4x.png')
    save(Image.open(os.path.join(ROOT,'src/assets/sprites/explosion-big.png')).convert('RGB')
         .resize((1600*2,160*2),Image.NEAREST), 'FIG5b-explosion-big-2x.png')

def fig6():
    """The arcade post-air-kill residue, cropped and looked at.
       Decode: ffmpeg -nostdin -ss 99.0 -i .reference-cache/video/ab2-longplay-60fps.mp4
               -frames:v 220 -vsync 0 tools/out/art-critic-r11/arcdec/f%04d.png
       (verified: f0106 is byte-identical to reference/stage1-missile-salvo-t100.75.png,
        mean |delta| 0.000000, so t = 99.0 + (i-1)/60 holds).
       Frame f0207 = t 102.433. Crop x[590,800] y[440,625] of the 1028x720 decode, x3.
       SHAPE plus a mean-over-a-large-blob colour reading defended by the erosion sweep
       in the critique's section 5 -- not a per-pixel colour reading."""
    f=os.path.join(ROOT,'tools/out/art-critic-r11/arcdec/f0207.png')
    if not os.path.exists(f):
        print('run the ffmpeg line in this docstring first'); return
    im=Image.open(f).convert('RGB').crop((590,440,800,625))
    save(im.resize((im.width*3,im.height*3),Image.NEAREST),'FIG6-arc-residue-box.png')

def fig10():
    """The TRUE-NATIVE arcade night airframe box, x[110,250] y[90,145] of
       reference/ab2-arcade-night-banking.png (320x224), x8. Contains the player
       jet, one cloud in the top-left corner and the burning enemy -- which is why
       the critique quotes a SATURATION CEILING and not a mean."""
    a=Image.open(os.path.join(ROOT,'reference/ab2-arcade-night-banking.png')).convert('RGB')
    sub=a.crop((110,90,250,145))
    save(sub.resize((sub.width*8,sub.height*8),Image.NEAREST),'FIG10-arc-night-jetbox-8x.png')

def fig11():
    """player-f14-night.png cell 4 of 9 (100x72 cells), x10 on black."""
    save(on_sky(pcell('src/assets/sprites/player-f14-night.png',4),(0,0,0),10),
         'FIG11-player-night-level-10x.png')

def ref_player():
    """The two arcade player crops the critique cites.
       REF-player-banked-10x: ab2-arcade-desert.png (82,82)-(175,148), x10. TRUE NATIVE.
       REF-player-nearlevel-5x: stage1-level-flight-t116.png (180,180)-(420,300), x5.
         686x480 longplay still -- SHAPE ONLY, no colour read off it."""
    a=Image.open(os.path.join(ROOT,'reference/ab2-arcade-desert.png')).convert('RGB').crop((82,82,175,148))
    save(a.resize((a.width*10,a.height*10),Image.NEAREST),'REF-player-banked-10x.png')
    b=Image.open(os.path.join(ROOT,'reference/stage1-level-flight-t116.png')).convert('RGB').crop((180,180,420,300))
    save(b.resize((b.width*5,b.height*5),Image.NEAREST),'REF-player-nearlevel-5x.png')

def figk2():
    """16 consecutive ticks of a kill:
       node tools/capture.mjs --out tools/out/art-critic-r11/kill2 --frames 16 --every 1 \
            --warmup 143 --url-params "seed=3&demo=2"
       Each 960x672 frame cropped to (330,0)-(720,300), i.e. x[0.344,0.750] y[0,0.446]."""
    import glob
    ps=sorted(glob.glob(os.path.join(ROOT,'tools/out/art-critic-r11/kill2/frame-*.png')))
    ims=[Image.open(p).convert('RGB').crop((330,0,720,300)) for p in ps]
    rows=[hstack(ims[i:i+8],gap=4) for i in range(0,len(ims),8)]
    save(vstack(rows,gap=4),'FIGK2-fireball-onset.png')

if __name__=='__main__':
    for f in sys.argv[1:]: globals()[f]()
