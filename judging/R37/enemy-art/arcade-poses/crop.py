import sys
from PIL import Image
# usage: crop.py frame x0 y0 x1 y1 zoom out
f, x0, y0, x1, y1, z, out = sys.argv[1:]
im = Image.open(f).crop((int(x0), int(y0), int(x1), int(y1)))
z = int(z)
im = im.resize((im.width*z, im.height*z), Image.NEAREST)
im.save(out)
print(out, im.size)
