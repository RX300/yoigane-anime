"""Contact sheets: contact.py <frame folder> <output prefix> [columns] [rows]"""
import glob
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 3
files = sorted(glob.glob(src + '/f*.png'))
w, h = 1920 // cols, 1080 // cols
for k in range(0, len(files), cols * rows):
    sheet = Image.new('RGB', (w * cols, h * rows))
    for i, f in enumerate(files[k:k + cols * rows]):
        sheet.paste(Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
    sheet.save(f'{dst}{k // (cols * rows)}.png')
print(len(files), 'frames')
