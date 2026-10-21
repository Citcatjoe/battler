"""Découpe une planche d'emblèmes d'état (pièces gravées) générée par ChatGPT Image (docs/STYLE_BIBLE.md, section 7).

Usage :
    python scripts/slice-coins.py <planche.png> <dossier de sortie> <nom1,nom2,...> [planche-controle.png]

Grammaire des emblèmes d'état (0.79.2) : chaque état est une pièce ronde et monochrome, son symbole gravé
dedans. Le jeu la pose telle quelle, sans cadre, toutes à la même taille ; le compteur se pose dessus.
La découpe ne cherche donc pas le contour de l'objet, elle cherche le disque :
1. Le fond est uni (noir, ou un vrai canal alpha) : tout ce qui s'en détache, trous bouchés, est une pièce.
2. Les pièces sont rangées dans l'ordre de lecture (rangées, puis gauche à droite) et nommées dans cet ordre.
3. Chaque pièce est un disque : centre au barycentre, rayon tiré de son aire (une ombre portée qui dépasse
   ne l'élargit donc presque pas). Le disque est découpé avec un bord adouci, un peu à l'intérieur de la
   tranche, pour ne garder aucun liseré du fond.
4. Chaque pièce remplit tout son carré (aucune marge) et est réduite en 128 px : elles s'alignent d'elles-mêmes.
Dépendances : numpy, pillow, scipy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SIZE = 128
# Le disque est rogné de 1,5 % de son rayon : la tranche de la pièce reste, le fond disparaît
INSET = 0.985
SUPERSAMPLE = 4

src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = sys.argv[3].split(',')
check_path = Path(sys.argv[4]) if len(sys.argv) > 4 else None
out_dir.mkdir(parents=True, exist_ok=True)

source = Image.open(src).convert('RGBA')
rgba = np.asarray(source).astype(np.float64)
alpha = rgba[..., 3]
# Fond : transparent s'il y a un vrai canal alpha, sinon le noir uni
solid = alpha > 8 if alpha.min() < 255 else rgba[..., :3].max(axis=2) > 8
mask = ndimage.binary_fill_holes(ndimage.binary_opening(solid, iterations=2))
labels, count = ndimage.label(mask)
areas = ndimage.sum(mask, labels, range(1, count + 1))
coins = sorted(range(1, count + 1), key=lambda k: -areas[k - 1])[: len(NAMES)]
if len(coins) < len(NAMES):
    sys.exit(f'{len(coins)} pièces trouvées pour {len(NAMES)} noms')

found = []
for k in coins:
    cy, cx = ndimage.center_of_mass(labels == k)
    radius = np.sqrt(areas[k - 1] / np.pi)
    found.append((cy, cx, radius))
# Ordre de lecture : une rangée = des centres à moins d'un rayon de hauteur l'un de l'autre
found.sort(key=lambda c: c[0])
rows, row = [], [found[0]]
for c in found[1:]:
    if abs(c[0] - row[0][0]) < row[0][2]:
        row.append(c)
    else:
        rows.append(row)
        row = [c]
rows.append(row)
ordered = [c for r in rows for c in sorted(r, key=lambda c: c[1])]

radii = [r for _, _, r in ordered]
print(f'{len(ordered)} pièces, rayon {min(radii):.0f} à {max(radii):.0f} px')
tiles = []
for name, (cy, cx, radius) in zip(NAMES, ordered):
    r = radius * INSET
    side = int(round(2 * r))
    left, top = int(round(cx - side / 2)), int(round(cy - side / 2))
    box = (left, top, left + side, top + side)
    crop = source.crop(box)
    # Disque adouci : dessiné en grand puis réduit
    big = Image.new('L', (side * SUPERSAMPLE, side * SUPERSAMPLE), 0)
    ImageDraw.Draw(big).ellipse((0, 0, side * SUPERSAMPLE - 1, side * SUPERSAMPLE - 1), fill=255)
    disc = big.resize((side, side), Image.LANCZOS)
    a = np.minimum(np.asarray(crop)[..., 3], np.asarray(disc))
    crop.putalpha(Image.fromarray(a.astype(np.uint8)))
    tile = crop.resize((SIZE, SIZE), Image.LANCZOS)
    tile.save(out_dir / f'{name}.png', optimize=True)
    tiles.append((name, tile))
    print(f'  {name}: centre ({cx:.0f}, {cy:.0f}), rayon {radius:.0f}')

if check_path:
    # Contrôle : chaque pièce à 64 et à 24 px sur la pierre de l'arène, avec un compteur posé dessus
    cols = 8
    sheet = Image.new('RGB', (cols * 96, ((len(tiles) + cols - 1) // cols) * 110), (12, 10, 9))
    draw = ImageDraw.Draw(sheet)
    for i, (name, tile) in enumerate(tiles):
        x, y = (i % cols) * 96 + 8, (i // cols) * 110 + 8
        sheet.paste(tile.resize((64, 64), Image.LANCZOS), (x, y), tile.resize((64, 64), Image.LANCZOS))
        draw.ellipse((x + 44, y + 44, x + 70, y + 70), fill=(12, 10, 9), outline=(52, 211, 153), width=2)
        sheet.paste(tile.resize((24, 24), Image.LANCZOS), (x + 66, y + 4), tile.resize((24, 24), Image.LANCZOS))
        draw.text((x, y + 78), name.replace('state-', '')[:14], fill=(200, 190, 180))
    sheet.save(check_path)
