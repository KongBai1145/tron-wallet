"""Resize the master 1024x1024 icon to all required Tauri sizes."""
from PIL import Image
import os

SRC = "C:/Users/KongB/tron-wallet/generated-icons/app-icon-1024.png"
DST_DIR = "C:/Users/KongB/tron-wallet/src-tauri/icons"
PUBLIC_DIR = "C:/Users/KongB/tron-wallet/public"

# Tauri required sizes
SIZES = [32, 128, 256, 310, 284, 150, 142, 107, 89, 71, 44, 30]

img = Image.open(SRC)
print(f"Source: {img.size}")

# Generate standard sizes
for size in SIZES:
    resized = img.resize((size, size), Image.LANCZOS)
    name = f"{size}x{size}.png"
    path = os.path.join(DST_DIR, name)
    resized.save(path, "PNG")
    print(f"  Saved: {name} ({os.path.getsize(path)} bytes)")

# 128x128@2x (256x256 actual)
resized = img.resize((256, 256), Image.LANCZOS)
path = os.path.join(DST_DIR, "128x128@2x.png")
resized.save(path, "PNG")
print(f"  Saved: 128x128@2x.png ({os.path.getsize(path)} bytes)")

# icon.png (512x512 for Tauri master)
resized = img.resize((512, 512), Image.LANCZOS)
path = os.path.join(DST_DIR, "icon.png")
resized.save(path, "PNG")
print(f"  Saved: icon.png ({os.path.getsize(path)} bytes)")

# Store logo
resized = img.resize((50, 50), Image.LANCZOS)
path = os.path.join(DST_DIR, "StoreLogo.png")
resized.save(path, "PNG")
print(f"  Saved: StoreLogo.png ({os.path.getsize(path)} bytes)")

# Generate favicon.svg (embed as PNG in SVG for compatibility)
favicon_sizes = [16, 32, 48]
for s in favicon_sizes:
    resized = img.resize((s, s), Image.LANCZOS)
    path = os.path.join(PUBLIC_DIR, f"favicon-{s}x{s}.png")
    resized.save(path, "PNG")
    print(f"  Saved: public/favicon-{s}x{s}.png ({os.path.getsize(path)} bytes)")

# Main favicon (32x32 as .ico)
ico_path = os.path.join(DST_DIR, "icon.ico")
img_resized = img.resize((256, 256), Image.LANCZOS)
img_resized.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"  Saved: icon.ico ({os.path.getsize(ico_path)} bytes)")

# Save a 32x32 favicon.ico in public/
ico_pub = os.path.join(PUBLIC_DIR, "favicon.ico")
img_resized.save(ico_pub, format="ICO", sizes=[(16, 16), (32, 32)])
print(f"  Saved: public/favicon.ico ({os.path.getsize(ico_pub)} bytes)")

print("\nDone! All icons generated.")
