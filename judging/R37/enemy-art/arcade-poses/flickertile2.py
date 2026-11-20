from PIL import Image
cents = {73:(756,349),74:(749,343),75:(742,337),76:(736,331),77:(719,332),78:(706,325),79:(705,323),80:(695,316),81:(678,310),82:(670,302)}
tiles=[]
for i,(cx,cy) in cents.items():
    im = Image.open(f's1a-f{i:04d}.png').convert('RGB').crop((cx-60,cy-50,cx+60,cy+50))
    tiles.append(im.resize((im.width*3,im.height*3), Image.NEAREST))
w,h = tiles[0].size
out = Image.new('RGB',(w*5,h*2))
for i,t in enumerate(tiles): out.paste(t,((i%5)*w,(i//5)*h))
out.save('flicker-tile2-t100.2.png'); print(out.size)
