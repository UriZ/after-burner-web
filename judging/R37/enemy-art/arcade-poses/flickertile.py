from PIL import Image
# f0001-f0012, crop the nozzle region, 3x zoom, tile horizontally
tiles=[]
for i in range(1,13):
    im = Image.open(f's1b-f{i:04d}.png').convert('RGB').crop((180,300,360,440))
    tiles.append(im.resize((im.width*2,im.height*2), Image.NEAREST))
w,h = tiles[0].size
out = Image.new('RGB',(w*6,h*2))
for i,t in enumerate(tiles):
    out.paste(t,((i%6)*w,(i//6)*h))
out.save('flicker-tile-t115.0.png')
print(out.size)
