from PIL import Image
import glob
# dead-rear fleeing enemy t115.0-115.6 (s1b f0001-f0036): nozzle around
# (330-420, 500-580) at t115.25 (from pose-planform crop: box 60,180 + 2x
# coords (300-420,320-420)/2 -> frame x 210-270 y 340-390). Enemy drifts;
# use a generous box and count hot-orange pixels (R>180, G 60-180, B<80)
# plus near-black pixels (nozzle ring) separately.
for f in sorted(glob.glob('s1b-f00[0-3]*.png'))[:36]:
    im = Image.open(f).convert('RGB')
    o=k=0
    for x in range(150,400):
        for y in range(280,460):
            r,g,b = im.getpixel((x,y))
            if r>180 and 40<g<190 and b<90: o+=1
            elif r<60 and g<60 and b<60: k+=1
    print(f, 'orange', o, 'black', k)
