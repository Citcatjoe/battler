"""Découpe une planche d'icônes générée par ChatGPT Image (voir docs/STYLE_BIBLE.md, section 7).

Usage :
    python scripts/slice-icons.py <planche.png> <dossier de sortie> <nom1,nom2,...> [planche-controle.png]

Les noms sont donnés dans l'ordre de lecture de la grille (gauche à droite, puis haut en bas) ;
la grille est carrée (4 noms → 2x2, 16 noms → 4x4). Dépendances : numpy, pillow, scipy.

GPT Image peint souvent le damier de « transparence » dans l'image au lieu d'un vrai canal alpha :
1. Le fond est l'ensemble des pixels neutres et clairs du damier (le damier dessiné dérive trop
   pour être modélisé par une grille régulière).
2. L'alpha est calculé par « color to alpha » contre chacune des deux teintes du damier, en gardant
   l'explication la plus transparente : les lueurs deviennent semi-transparentes, sans halo pâle.
3. Ce qui est enfermé par un contour sombre reste opaque (acier, ivoire, os), même s'il est clair.
4. Les morceaux sont regroupés par case, recadrés, mis au carré avec une marge et réduits en 128 px.
Si la planche a un vrai canal alpha, les étapes 1 à 3 sont sautées.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SIZE = 128
MARGIN = 0.08

src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = sys.argv[3].split(',')
GRID = int(np.ceil(np.sqrt(len(NAMES))))
check_path = Path(sys.argv[4]) if len(sys.argv) > 4 else None
out_dir.mkdir(parents=True, exist_ok=True)
source = Image.open(src).convert('RGBA')
real_alpha = np.asarray(source)[..., 3].astype(np.float64) / 255
img = np.asarray(source.convert('RGB')).astype(np.float64)
h, w, _ = img.shape
grey = img.mean(axis=2)
neutral = (img.max(axis=2) - img.min(axis=2)) < 6

if real_alpha.min() < 1:
    # Vrai canal alpha : rien à reconstituer.
    alpha, bg = real_alpha, np.zeros_like(img)
else:
    # 1. Fond : les grands ensembles connexes de pixels neutres et clairs (cases du damier et
    # transitions floues entre cases). Le damier dessiné par l'IA dérive trop pour être modélisé.
    bg_like = neutral & (grey >= 217)
    lab, n_lab = ndimage.label(bg_like)
    background = np.zeros_like(bg_like)
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        m = lab[sl] == i
        size = m.sum()
        g = grey[sl][m]
        two_tones = np.mean(g > 248) > 0.1 and np.mean(g < 228) > 0.1
        # Une case isolée (poche enfermée entre deux parties d'une icône) : environ 14 px de côté.
        lone_square = 120 < size < 260 and 10 <= m.shape[0] <= 18 and 10 <= m.shape[1] <= 18
        if size > 2000 or (size > 60 and two_tones) or lone_square:
            background[sl] |= m
    c_white = np.median(img[background & (grey > 248)], axis=0)
    c_grey = np.median(img[background & (grey < 228)], axis=0)
    print(f'damier : teintes {c_white.round()} / {c_grey.round()}, fond {background.mean():.0%} de l\'image')

    # 2. Color to alpha contre chacune des deux teintes : on garde l'explication la plus transparente
    # (une lueur verte sur une case grise s'explique mal par du blanc, et inversement).
    def to_alpha(bg_color):
        diff = img - bg_color
        # Tolérance au bruit : le blanc du damier vaut 253, un canal à 255 ne doit pas donner un pixel opaque.
        excess = np.maximum(np.abs(diff) - 4, 0)
        denom = np.where(diff < 0, bg_color, 255 - bg_color)
        return np.clip(np.max(excess / np.maximum(denom, 24), axis=2), 0, 1)

    a_white, a_grey = to_alpha(c_white), to_alpha(c_grey)
    on_white = a_white <= a_grey
    alpha = np.where(on_white, a_white, a_grey)
    bg = np.where(on_white[..., None], c_white, c_grey)

    # 3. Opaques : ce qui est enfermé par un contour sombre (acier des lames, ivoire du dé, os du crâne).
    # Les lueurs débordent à l'extérieur des contours, elles ne sont donc pas concernées.
    dark = ndimage.binary_closing(grey < 130, iterations=2)
    outlined = ndimage.binary_fill_holes(dark) & ~background
    alpha[outlined] = 1.0
    # 3 bis. Zones pâles enfermées dans l'icône (visage du spectre, cœur d'un éclair) : sans contour
    # sombre, le « color to alpha » les rendait presque transparentes. Ce qui est entièrement entouré
    # de matière opaque, et n'a pas été reconnu comme damier, fait partie du dessin.
    enclosed = ndimage.binary_fill_holes(alpha > 0.5) & (alpha <= 0.5) & ~background
    alpha[background] = 0.0
    alpha[bg_like & ~outlined] = 0.0  # restes du damier (transitions floues) au milieu des lueurs
    alpha[enclosed] = 1.0  # après les restes du damier : un visage pâle ressemble à une case grise
    alpha[alpha < 0.03] = 0

a = alpha[..., None]
fg = np.where(a > 0, (img - (1 - a) * bg) / np.maximum(a, 1e-6), 0)
fg = np.clip(fg, 0, 255)
rgba = np.dstack([fg, alpha * 255]).round().astype(np.uint8)

# 4. Morceaux regroupés par case (les ondes du cor et les gouttes du poison sont détachées).
labels, n = ndimage.label(alpha > 0.08)
cell_h, cell_w = h / GRID, w / GRID
cells = {i: np.zeros((h, w), bool) for i in range(GRID * GRID)}
for i, sl in enumerate(ndimage.find_objects(labels), start=1):
    m = labels[sl] == i
    if m.sum() < 30:
        continue
    cy, cx = ndimage.center_of_mass(labels == i)
    r, c = int(cy // cell_h), int(cx // cell_w)
    # Grille incomplète (8 icônes sur 3×3) : les morceaux des cases vides sont ignorés.
    if r * GRID + c >= len(NAMES):
        continue
    cells[r * GRID + c][sl] |= m
    # Un morceau à cheval sur deux cases signale une icône qui déborde.
    y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    if int(y0 // cell_h) != int((y1 - 1) // cell_h) or int(x0 // cell_w) != int((x1 - 1) // cell_w):
        print(f'attention : un morceau de la case {NAMES[r * GRID + c]} déborde sur une case voisine')

for idx, name in enumerate(NAMES):
    mask = ndimage.binary_dilation(cells[idx], iterations=3)
    if not mask.any():
        print(f'ERREUR : aucune icône trouvée pour {name}')
        continue
    ys_, xs_ = np.nonzero(mask & (alpha > 0))
    y0, y1, x0, x1 = ys_.min(), ys_.max() + 1, xs_.min(), xs_.max() + 1
    crop = rgba[y0:y1, x0:x1].copy()
    crop[..., 3] = np.where(mask[y0:y1, x0:x1], crop[..., 3], 0)
    side = int(round(max(y1 - y0, x1 - x0) * (1 + 2 * MARGIN)))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(crop, 'RGBA'), ((side - (x1 - x0)) // 2, (side - (y1 - y0)) // 2))
    icon = canvas.convert('RGBa').resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA')
    icon.save(out_dir / f'{name}.png', optimize=True)

if check_path is None:
    sys.exit()
# Planche de contrôle : fond pierre du jeu, à 64 px et à 20 px.
sheet = Image.new('RGBA', (len(NAMES) * 72 + 8, 112), (12, 10, 9, 255))
for i, name in enumerate(NAMES):
    p = out_dir / f'{name}.png'
    if not p.exists():
        continue
    ic = Image.open(p)
    sheet.alpha_composite(ic.resize((64, 64), Image.LANCZOS), (8 + i * 72, 8))
    sheet.alpha_composite(ic.resize((20, 20), Image.LANCZOS), (8 + i * 72 + 22, 84))
sheet.save(check_path)
