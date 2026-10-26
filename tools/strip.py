# Stitch frame captures side by side with a time label: python3 tools/strip.py screens/v0.1.2/strips.json
import json, sys
from PIL import Image, ImageDraw, ImageFont
for s in json.load(open(sys.argv[1])):
    ims = [Image.open(f).convert("RGB") for f in s["files"]]
    w, h = ims[0].size; pad, lab = 16, 56
    out = Image.new("RGB", (len(ims) * w + (len(ims) + 1) * pad, h + lab + pad), (128, 128, 128))
    d = ImageDraw.Draw(out); font = ImageFont.load_default(size=30)
    for i, (im, f) in enumerate(zip(ims, s["files"])):
        x = pad + i * (w + pad); out.paste(im, (x, lab))
        d.text((x, 14), f.rsplit("-", 2)[-2] if f.endswith("-dark.png") or f.endswith("-light.png") else f, fill=(255, 255, 255), font=font)
    out.save(s["out"]); print(s["out"])
