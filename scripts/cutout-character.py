"""Détoure un personnage généré sur fond uni (voir docs/STYLE_BIBLE.md) et l'exporte pour le jeu.

Usage :
    python scripts/cutout-character.py <source.png> <sortie.png> [aperçu.png]

Dépendances : numpy, pillow, scipy.

1. La couleur du fond est estimée sur le pourtour de l'image (médiane).
2. Est fond tout pixel proche de cette couleur ET relié au pourtour, ou formant une grande
   poche fermée (espace entre les jambes), ou une petite poche de la couleur exacte du fond
   (trous d'une cape) : un reflet gris de l'armure, moins uniforme, reste opaque.
3. Le bord est adouci : alpha progressif selon la distance à la couleur du fond, sur une
   bande de quelques pixels, puis « décontamination » (on retire la teinte du fond des
   pixels semi-transparents pour éviter un liseré gris).
4. L'image est recadrée au plus près, avec une petite marge, et enregistrée en PNG optimisé.
   Avec CUTOUT_KEEP_CANVAS=1, elle garde au contraire sa toile entière : c'est ce qu'utilise
   `slice-poses.py`, qui recadre ensuite toutes les postures d'un personnage avec le même rectangle.
L'aperçu facultatif montre le résultat sur un fond sombre et sur un fond clair.
"""
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# Distance (RVB) en dessous de laquelle un pixel ressemble au fond
NEAR = 26
# Poches fermées de couleur fond plus grandes que cette surface (px) : considérées comme fond
POCKET = 600
# Petites poches (trous dans une cape…) : retirées seulement si leur couleur est quasi celle du fond.
# Plus agressif (ex. 4 px, 16), on troue les reflets gris des lames : ne pas descendre sans vérifier.
SMALL_POCKET = 12
SMALL_NEAR = 11
# Largeur (px) de la bande adoucie autour de la silhouette
FEATHER = 2
MARGIN = 8

src, out = Path(sys.argv[1]), Path(sys.argv[2])
preview = Path(sys.argv[3]) if len(sys.argv) > 3 else None

rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
h, w, _ = rgb.shape
border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
bg = np.median(border, axis=0)
dist = np.linalg.norm(rgb - bg, axis=2)

near = dist < NEAR
labels, n = ndimage.label(near)
edge_labels = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
sizes = ndimage.sum(near, labels, index=np.arange(1, n + 1))
mean_dist = ndimage.mean(dist, labels, index=np.arange(1, n + 1))
is_bg = np.zeros(n + 1, dtype=bool)
for i, (size, md) in enumerate(zip(sizes, mean_dist), start=1):
    is_bg[i] = i in edge_labels or size >= POCKET or (size >= SMALL_POCKET and md < SMALL_NEAR)
background = is_bg[labels]

# Alpha : 0 dans le fond, 1 dans la silhouette, progressif sur la bande de bord.
alpha = np.where(background, 0.0, 1.0)
band = ndimage.binary_dilation(background, iterations=FEATHER) & ~ndimage.binary_erosion(
    background, iterations=FEATHER
)
soft = np.clip((dist - NEAR * 0.35) / (NEAR * 1.6), 0, 1)
alpha = np.where(band, np.where(background, np.minimum(soft, 0.6), np.maximum(soft, 0.5)), alpha)

# Décontamination : c = (c - bg * (1 - a)) / a
a = alpha[..., None]
clean = np.where(a > 0.01, (rgb - bg * (1 - a)) / np.maximum(a, 0.01), 0)
rgba = np.dstack([np.clip(clean, 0, 255), alpha * 255]).astype(np.uint8)

ys, xs = np.nonzero(alpha > 0.05)
top, bottom = max(ys.min() - MARGIN, 0), min(ys.max() + MARGIN, h - 1)
left, right = max(xs.min() - MARGIN, 0), min(xs.max() + MARGIN, w - 1)
if os.environ.get('CUTOUT_KEEP_CANVAS') == '1':
    top, left, bottom, right = 0, 0, h - 1, w - 1
img = Image.fromarray(rgba, 'RGBA').crop((left, top, right + 1, bottom + 1))
img.save(out, optimize=True)
print(f'{out} : {img.width}x{img.height}, fond estimé {bg.round().astype(int).tolist()}, recadrage x{left} y{top}')

if preview:
    sheet = Image.new('RGBA', (img.width * 2, img.height))
    sheet.paste((28, 25, 23, 255), (0, 0, img.width, img.height))
    sheet.paste((235, 230, 220, 255), (img.width, 0, img.width * 2, img.height))
    sheet.alpha_composite(img, (0, 0))
    sheet.alpha_composite(img, (img.width, 0))
    sheet.convert('RGB').save(preview)
