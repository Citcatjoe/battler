"""Découpe les planches de postures d'un personnage et aligne toutes les postures (voir docs/POSTURES.md).

Usage :
    python scripts/slice-poses.py <nom> <planche.png>:<colonnes>x<lignes>:<posture,posture,...> [autres planches…] [options]

Exemple (deux planches de 1536×1024, deux cases chacune, la garde en première case) :
    python scripts/slice-poses.py orc a.png:2x1:idle,attack b.png:2x1:idle,hurt --fond

- Chaque planche est une grille de cases de même taille, lues de gauche à droite puis de haut en bas,
  dans l'ordre des postures (identifiants de `src/game/poses.ts` : idle, attack, hurt, dodge, cast,
  ko, victory ; `-` pour une case à ignorer).
- **Chaque planche contient la garde (idle)** : elle sert de règle. Toutes les planches sont remises à
  l'échelle de la garde de la première planche, et calées sur ses pieds (bas et centre de sa silhouette).
  Une planche générée à une autre taille ou un autre cadrage retombe ainsi au bon endroit.
- `--fond` : planches sur fond uni, détourées case par case par `cutout-character.py` (sans recadrage).
  Sans `--fond`, les planches doivent déjà être transparentes.
- Toutes les postures sont ensuite recadrées avec LE MÊME rectangle (l'union des silhouettes, avec une
  marge, élargie pour que les pieds de la garde restent au centre) : mêmes dimensions, même ligne de sol,
  même centre. Le jeu passe de l'une à l'autre sans saut, et une attaque ample ne décale pas la garde.
- Sortie : `src/assets/<nom>-<posture>.png` pour chaque posture, et la garde recadrée de la même façon
  en `src/assets/<nom>-idle.png` (à utiliser comme `look.image` à la place de l'image actuelle si l'on
  adopte les postures). Planche de contrôle : `logs/poses-<nom>.png`.
- `--sortie=<dossier>` : écrit ailleurs que dans `src/assets/` (pour un essai).
- `--reference=<garde.png>` : ajoute des postures à un personnage déjà découpé. La garde de chaque planche
  est calée sur cette garde existante (même hauteur, mêmes pieds), et les nouvelles postures sont écrites
  sur SA toile (mêmes dimensions) : les postures déjà en place ne changent pas, la garde n'est pas réécrite.
  Exemple : `python scripts/slice-poses.py orc c.png:2x1:idle,hurt --fond --reference=src/assets/orc-idle.png`

Dépendances : numpy, pillow, scipy (pour `--fond`).
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
POSES = {'idle', 'attack', 'hurt', 'dodge', 'cast', 'ko', 'victory'}
# Marge autour de l'union des silhouettes, en px
MARGIN = 8
# Alpha minimal d'un pixel de silhouette
SOLID = 24


def bbox(img: Image.Image):
    return img.getchannel('A').point(lambda v: 255 if v > SOLID else 0).getbbox()


def keep_figure(fig: Image.Image) -> Image.Image:
    """Retire les fragments isolés (pointe d'arme d'une case voisine, résidu de fond) : on garde les
    morceaux d'au moins 2 % de la plus grande tache, c'est-à-dire le personnage et ce qu'il tient."""
    from scipy import ndimage

    alpha = np.asarray(fig.getchannel('A'))
    labels, n = ndimage.label(alpha > SOLID)
    if n <= 1:
        return fig
    sizes = ndimage.sum(np.ones_like(labels), labels, index=np.arange(1, n + 1))
    keep = np.isin(labels, 1 + np.nonzero(sizes >= sizes.max() * 0.02)[0])
    # La bande semi-transparente du bord suit sa tache : on dilate un peu le masque gardé
    keep = ndimage.binary_dilation(keep, iterations=3)
    out = np.asarray(fig).copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return Image.fromarray(out, 'RGBA')


def cut_out(cell: Image.Image) -> Image.Image:
    """Détoure une case sur fond uni, en gardant sa toile entière (cutout-character.py)."""
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp) / 'case.png', Path(tmp) / 'detour.png'
        cell.convert('RGB').save(src)
        env = {**os.environ, 'CUTOUT_KEEP_CANVAS': '1'}
        subprocess.run([sys.executable, str(ROOT / 'scripts/cutout-character.py'), str(src), str(out)], check=True, env=env, capture_output=True)
        return Image.open(out).convert('RGBA')


def read_sheet(spec: str, background: bool) -> dict[str, Image.Image]:
    """Les figures détourées d'une planche, par posture."""
    path, grid, order = spec.rsplit(':', 2)
    cols, rows = (int(x) for x in grid.lower().split('x'))
    poses = order.split(',')
    unknown = [p for p in poses if p != '-' and p not in POSES]
    if unknown or len(poses) > cols * rows:
        sys.exit(f'{path} : postures inconnues {unknown}, ou plus de postures que de cases ({cols * rows})')
    if 'idle' not in poses:
        sys.exit(f'{path} : la garde (idle) doit être sur chaque planche, elle sert de règle')
    sheet = Image.open(path)
    if not background and 'A' not in sheet.getbands():
        sys.exit(f'{path} : planche sans transparence, ajouter --fond pour la détourer')
    w, h = sheet.width // cols, sheet.height // rows
    figures = {}
    for i, pose in enumerate(poses):
        if pose == '-':
            continue
        cell = sheet.crop(((i % cols) * w, (i // cols) * h, (i % cols + 1) * w, (i // cols + 1) * h))
        fig = keep_figure(cut_out(cell) if background else cell.convert('RGBA'))
        if bbox(fig) is None:
            print(f'{path} : case {pose} vide, ignorée')
            continue
        figures[pose] = fig
    if 'idle' not in figures:
        sys.exit(f'{path} : la case de garde est vide')
    return figures


def add_to_reference(name: str, sheets: list, ref: Image.Image, target: Path):
    """Postures nouvelles calées sur une garde déjà découpée, sur sa toile."""
    rb = bbox(ref)
    ref_h = rb[3] - rb[1]
    ref_feet = ((rb[0] + rb[2]) / 2, rb[3])
    for sheet in sheets:
        g = bbox(sheet['idle'])
        scale = ref_h / (g[3] - g[1])
        feet = ((g[0] + g[2]) / 2 * scale, g[3] * scale)
        print(f"planche : garde {g[3] - g[1]} px ramenée à {ref_h} px (×{scale:.3f})")
        for pose, fig in sheet.items():
            if pose == 'idle':
                continue
            resized = fig.resize((round(fig.width * scale), round(fig.height * scale)), Image.LANCZOS)
            canvas = Image.new('RGBA', ref.size)
            canvas.alpha_composite(resized, (round(ref_feet[0] - feet[0]), round(ref_feet[1] - feet[1])))
            # Ce qui sort de la toile est coupé : le signaler
            full = np.asarray(resized.getchannel('A')) > SOLID
            kept = np.asarray(canvas.getchannel('A')) > SOLID
            lost = 1 - kept.sum() / max(full.sum(), 1)
            path = target / f'{name}-{pose}.png'
            canvas.save(path, optimize=True)
            warn = f' ATTENTION : {lost:.0%} de la silhouette sort de la toile' if lost > 0.005 else ''
            print(f'{pose:8} → {path} ({canvas.width}×{canvas.height}){warn}')
    # Planche de contrôle : la garde existante et les nouvelles postures, même ligne de sol
    imgs = [ref] + [Image.open(target / f'{name}-{p}.png') for s in sheets for p in s if p != 'idle']
    board = Image.new('RGBA', (ref.width * len(imgs), ref.height), (28, 25, 23, 255))
    for i, img in enumerate(imgs):
        board.alpha_composite(img, (i * ref.width, 0))
    ImageDraw.Draw(board).line([(0, rb[3]), (board.width, rb[3])], fill=(217, 160, 80, 255), width=2)
    control = ROOT / f'logs/poses-{name}.png'
    control.parent.mkdir(parents=True, exist_ok=True)
    board.convert('RGB').save(control)
    print(f'contrôle → {control.relative_to(ROOT)}')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    if len(args) < 2:
        sys.exit(__doc__)
    name, specs = args[0], args[1:]
    target = next((Path(a.split('=', 1)[1]) for a in flags if a.startswith('--sortie=')), ROOT / 'src/assets')
    target.mkdir(parents=True, exist_ok=True)
    sheets = [read_sheet(spec, '--fond' in flags) for spec in specs]
    reference = next((Path(a.split('=', 1)[1]) for a in flags if a.startswith('--reference=')), None)
    if reference:
        add_to_reference(name, sheets, Image.open(reference).convert('RGBA'), target)
        return

    # Règle : la garde de la première planche. Chaque planche est mise à son échelle et calée sur ses pieds.
    ref = bbox(sheets[0]['idle'])
    ref_h = ref[3] - ref[1]
    canvas = Image.new('RGBA', (1, 1))
    big = max(max(f.width, f.height) for s in sheets for f in s.values()) * 3
    anchor = (big // 2, big * 2 // 3)  # pieds de la garde, au milieu de la toile de travail
    placed: dict[str, Image.Image] = {}
    for sheet in sheets:
        g = bbox(sheet['idle'])
        scale = ref_h / (g[3] - g[1])
        feet = ((g[0] + g[2]) / 2 * scale, g[3] * scale)
        for pose, fig in sheet.items():
            if pose in placed:
                continue  # une posture déjà fournie par une planche précédente (la garde, d'abord)
            resized = fig.resize((round(fig.width * scale), round(fig.height * scale)), Image.LANCZOS) if scale != 1 else fig
            canvas = Image.new('RGBA', (big, big))
            canvas.alpha_composite(resized, (round(anchor[0] - feet[0]), round(anchor[1] - feet[1])))
            placed[pose] = canvas

    # Un seul rectangle pour toutes les postures : l'union des silhouettes, élargie pour rester centrée
    # sur les pieds de la garde. Le jeu centre l'image : sans cela, une attaque ample qui s'étire vers
    # l'avant élargirait la toile d'un seul côté et décalerait la garde vers l'arrière.
    boxes = [bbox(c) for c in placed.values()]
    half = max(anchor[0] - min(b[0] for b in boxes), max(b[2] for b in boxes) - anchor[0]) + MARGIN
    rect = (
        anchor[0] - half,
        min(b[1] for b in boxes) - MARGIN,
        anchor[0] + half,
        max(b[3] for b in boxes) + MARGIN,
    )
    crops = {pose: c.crop(rect) for pose, c in placed.items()}
    for pose, img in crops.items():
        path = target / f'{name}-{pose}.png'
        img.save(path, optimize=True)
        print(f'{pose:8} → {path} ({img.width}×{img.height})')

    # La garde occupe une part de la nouvelle toile : de quoi garder sa taille à l'écran
    idle = bbox(crops['idle'])
    share_h = (idle[3] - idle[1]) / crops['idle'].height
    print(f"La garde occupe {share_h:.0%} de la hauteur de la nouvelle toile : pour garder sa taille à l'écran, "
          f"diviser son `scale` par {share_h:.2f} (et vérifier par capture).")

    # Planche de contrôle : toutes les postures côte à côte, ligne de sol commune
    cw, ch = next(iter(crops.values())).size
    board = Image.new('RGBA', (cw * len(crops), ch), (28, 25, 23, 255))
    for i, img in enumerate(crops.values()):
        board.alpha_composite(img, (i * cw, 0))
    d = ImageDraw.Draw(board)
    ground = anchor[1] - rect[1]
    d.line([(0, ground), (board.width, ground)], fill=(217, 160, 80, 255), width=2)
    control = ROOT / f'logs/poses-{name}.png'
    control.parent.mkdir(parents=True, exist_ok=True)
    board.convert('RGB').save(control)
    print(f'contrôle → {control.relative_to(ROOT)} (ordre : {", ".join(crops)})')


if __name__ == '__main__':
    main()
