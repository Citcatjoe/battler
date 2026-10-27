"""Découpe les planches de postures d'un personnage et aligne toutes les postures (voir docs/POSTURES.md).

Usage :
    python scripts/slice-poses.py <nom> <planche.png>:<colonnes>x<lignes>:<posture,posture,...> [autres planches…] [options]

Exemple (deux planches de 1536×1024, deux cases chacune, la garde en première case) :
    python scripts/slice-poses.py orc a.png:2x1:idle,attack b.png:2x1:idle,hurt --fond

- Chaque planche est une grille de cases de même taille, lues de gauche à droite puis de haut en bas,
  dans l'ordre des postures (identifiants de `src/game/poses.ts` : idle, attack, hurt, dodge, cast,
  ko, victory, et les deux images de la perte de contrôle, dazed-a et dazed-b ; `-` pour une case à ignorer).
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
- `--contours` (avec `--fond`, planches d'une rangée) : sépare les figures par leurs silhouettes au lieu
  de la grille. Une cape ou une arme qui déborde sur la case voisine reste à sa figure. Les cases
  servent encore à l'ordre des postures et au calage ; il faut que les figures ne se touchent pas.
- `--sortie=<dossier>` : écrit ailleurs que dans `src/assets/` (pour un essai).
- `--reference=<garde.png>` : ajoute des postures à un personnage déjà découpé. La garde de chaque planche
  est calée sur cette garde existante (même hauteur, mêmes pieds), et les nouvelles postures sont écrites
  sur SA toile (mêmes dimensions) : les postures déjà en place ne changent pas, la garde n'est pas réécrite.
  Exemple : `python scripts/slice-poses.py orc c.png:2x1:idle,hurt --fond --reference=src/assets/orc-idle.png`
- `--sol` : pose chaque posture sur la ligne de sol de la garde (son point le plus bas sur celui de la garde).
  Le générateur place la figure de chaque case un peu plus haut ou plus bas que la garde de sa planche ;
  sans cela, une posture flotte ou s'enfonce. `--sol=ko,hurt` ne pose que ces postures. À éviter pour une
  posture qui doit descendre sous les pieds (massue au sol, queue) ou décoller (saut). Vaut aussi avec
  `--reference`.
- `--pieds` (avec `--reference`) : cale chaque posture sur les pieds de la garde existante, et non sur la
  silhouette entière de la garde de sa planche : dégrossi par le milieu de la bande basse de la posture (6 % de sa
  hauteur), puis le décalage qui recouvre le mieux les pieds de la garde (`feet_shift`). Pour une posture qui ne doit
  pas bouger les pieds (la perte de contrôle : le corps vacille au-dessus des pieds plantés), quand le générateur
  décale la figure dans sa case.
- `--elargir=<px>` (avec `--reference`) : les nouvelles postures ont une toile plus large de <px> de chaque côté
  que la garde existante, même hauteur. Le jeu centre chaque image sur la colonne du combattant et lui donne la
  hauteur de la toile : la figure reste exactement au même endroit, et une posture qui sortirait de la toile (la
  queue de Naraxes qui vacille) n'est pas coupée. Les autres postures ne changent pas.
- `--avant=<px>` : pour un personnage très large (l'ours à quatre pattes), allonge la toile à l'arrière de
  deux fois <px> : le jeu centrant la toile, la silhouette s'affiche <px> (en pixels de la toile) plus près
  de l'adversaire, et son arrière ne sort plus de l'écran. Suppose un personnage qui regarde à droite.

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
POSES = {'idle', 'attack', 'hurt', 'dodge', 'cast', 'ko', 'victory', 'dazed-a', 'dazed-b'}
# Marge autour de l'union des silhouettes, en px
MARGIN = 8
# Alpha minimal d'un pixel de silhouette
SOLID = 24


def bbox(img: Image.Image):
    return img.getchannel('A').point(lambda v: 255 if v > SOLID else 0).getbbox()


def foot_x(img: Image.Image) -> float:
    """Milieu des pieds : abscisse moyenne des pixels pleins de la bande basse de la silhouette (6 % de sa hauteur)."""
    alpha = np.asarray(img.getchannel('A')) > SOLID
    rows = np.nonzero(alpha.any(axis=1))[0]
    top, bottom = rows[0], rows[-1]
    band = alpha[bottom - max(1, int((bottom - top) * 0.06)) : bottom + 1]
    return float(np.nonzero(band)[1].mean())


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


def seam(alpha: np.ndarray, center: int, band: int) -> np.ndarray:
    """Ligne de coupe verticale la moins dense (programmation dynamique) dans une bande autour de
    `center` : elle passe par le vide entre deux figures, ou par leur contact le plus mince. Rend, pour
    chaque ligne, la colonne de la coupe."""
    lo, hi = max(center - band, 1), min(center + band, alpha.shape[1] - 2)
    cost = alpha[:, lo:hi].astype(np.float64)
    # Léger penchant pour le milieu de la bande, à coût égal (une coupe dans le vide reste au centre)
    cost += np.abs(np.arange(lo, hi) - center)[None, :] * 1e-3
    acc = cost.copy()
    for y in range(1, acc.shape[0]):
        prev = acc[y - 1]
        best = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
        acc[y] += best
    path = np.empty(acc.shape[0], dtype=int)
    path[-1] = int(np.argmin(acc[-1]))
    for y in range(acc.shape[0] - 2, -1, -1):
        x = path[y + 1]
        cand = [c for c in (x - 1, x, x + 1) if 0 <= c < acc.shape[1]]
        path[y] = min(cand, key=lambda c: acc[y, c])
    return path + lo


def split_by_contours(path, sheet: Image.Image, poses: list[str], cols: int, rows: int, w: int, h: int):
    """Sépare les figures d'une planche par leurs silhouettes, et non par la grille : une cape ou une
    arme qui déborde sur la case voisine reste à sa figure. La planche est détourée d'un bloc, puis
    coupée entre chaque paire de figures par la ligne la moins dense (le vide, ou le contact le plus
    mince si elles se touchent). Chaque lambeau isolé (cape, mèche) rejoint ensuite la figure la plus
    proche. Chaque figure est rendue dans le repère de SA case, avec une marge d'une case de chaque
    côté, pour que le calage sur les pieds reste celui de la grille."""
    from scipy import ndimage

    if rows != 1:
        sys.exit(f'{path} : --contours ne gère que les planches d\'une seule rangée')
    full = keep_figure_all(cut_out(sheet))
    rgba = np.asarray(full)
    alpha = rgba[..., 3]
    solid = alpha > SOLID
    # Une coupe par frontière de cases, cherchée sur la moitié de case de part et d'autre
    cuts = [seam(alpha, k * w, w // 2) for k in range(1, cols)]
    xs = np.arange(alpha.shape[1])[None, :]
    region = np.zeros(alpha.shape, dtype=int)
    for c in cuts:
        region += xs >= c[:, None]
    # Le noyau de chaque figure : la plus grande tache de sa région ; les autres taches vont au noyau le plus proche
    cores = []
    for k in range(cols):
        lab, n = ndimage.label(solid & (region == k))
        if n == 0:
            cores.append(None)
            continue
        sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        cores.append(lab == 1 + int(np.argmax(sizes)))
    live = [k for k in range(cols) if cores[k] is not None]
    dist = {k: ndimage.distance_transform_edt(~cores[k]) for k in live}
    owner = np.full(alpha.shape, -1)
    lab, n = ndimage.label(solid & ~np.any([cores[k] for k in live], axis=0))
    for k in live:
        owner[cores[k]] = k
    for i in range(1, n + 1):
        mask = lab == i
        owner[mask] = min(live, key=lambda k: dist[k][mask].min())
    figures = {}
    for i, pose in enumerate(poses):
        if pose == '-':
            continue
        if cores[i] is None:
            print(f'{path} : case {pose} vide, ignorée')
            continue
        # La frange semi-transparente suit sa figure, sans franchir la coupe
        keep = ndimage.binary_dilation(owner == i, iterations=3) & (region == i) | (owner == i)
        own = rgba.copy()
        own[..., 3] = np.where(keep, own[..., 3], 0)
        fig = Image.fromarray(own, 'RGBA')
        cell = Image.new('RGBA', (w * 3, h))
        cell.alpha_composite(fig, (w - i * w, 0))
        figures[pose] = cell
        b = bbox(fig)
        spill = max(i * w - b[0], b[2] - (i + 1) * w, 0)
        print(f'{path} : {pose} séparée par sa silhouette' + (f' (déborde de {spill} px sur la case voisine)' if spill > 0 else ''))
    if 'idle' not in figures:
        sys.exit(f'{path} : la case de garde est vide')
    return figures


def keep_figure_all(img: Image.Image) -> Image.Image:
    """Retire les poussières de détourage (moins de 0,05 % de la planche), sans toucher aux figures."""
    from scipy import ndimage

    alpha = np.asarray(img.getchannel('A'))
    labels, n = ndimage.label(alpha > SOLID)
    if n <= 1:
        return img
    sizes = ndimage.sum(np.ones_like(labels), labels, index=np.arange(1, n + 1))
    keep = np.isin(labels, 1 + np.nonzero(sizes >= alpha.size * 0.0005)[0])
    keep = ndimage.binary_dilation(keep, iterations=3)
    out = np.asarray(img).copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return Image.fromarray(out, 'RGBA')


def read_sheet(spec: str, background: bool, contours: bool = False) -> dict[str, Image.Image]:
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
    if contours:
        return split_by_contours(path, sheet, poses, cols, rows, w, h)
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


def feet_shift(ref: Image.Image, placed: Image.Image, band: float = 0.08, reach: int = 160) -> int:
    """Décalage horizontal qui pose le mieux les pieds de `placed` sur ceux de la garde `ref` (même toile) : le plus grand
    recouvrement de leurs bandes basses (8 % de la hauteur de la garde, au-dessus de son sol). Deux pieds pèsent plus
    qu'une arme qui touche le sol, dont la place change d'une posture à l'autre ; à égalité, le plus petit décalage."""
    rb = bbox(ref)
    top = rb[3] - int((rb[3] - rb[1]) * band)
    guard = np.asarray(ref.getchannel('A'))[top : rb[3] + 1] > SOLID
    pose = np.pad(np.asarray(placed.getchannel('A'))[top : rb[3] + 1] > SOLID, ((0, 0), (reach, reach)))
    width = guard.shape[1]
    return max(range(-reach, reach + 1), key=lambda dx: ((pose[:, reach - dx : reach - dx + width] & guard).sum(), -abs(dx)))


def add_to_reference(name: str, sheets: list, ref: Image.Image, target: Path, feet_only: bool = False, sol: set[str] | None = None):
    """Postures nouvelles calées sur une garde déjà découpée, sur sa toile. `feet_only` (`--pieds`) : chaque posture
    sur les pieds de la garde existante ; `sol` (`--sol`) : les postures dont le point le plus bas va sur son sol."""
    rb = bbox(ref)
    ref_h = rb[3] - rb[1]
    ref_feet = (foot_x(ref) if feet_only else (rb[0] + rb[2]) / 2, rb[3])
    for sheet in sheets:
        g = bbox(sheet['idle'])
        scale = ref_h / (g[3] - g[1])
        print(f"planche : garde {g[3] - g[1]} px ramenée à {ref_h} px (×{scale:.3f})")
        for pose, fig in sheet.items():
            if pose == 'idle':
                continue
            b = bbox(fig)
            feet = (
                (foot_x(fig) if feet_only else (g[0] + g[2]) / 2) * scale,
                (b[3] if sol is not None and (not sol or pose in sol) else g[3]) * scale,
            )
            resized = fig.resize((round(fig.width * scale), round(fig.height * scale)), Image.LANCZOS)
            at = (round(ref_feet[0] - feet[0]), round(ref_feet[1] - feet[1]))
            canvas = Image.new('RGBA', ref.size)
            canvas.alpha_composite(resized, at)
            if feet_only:
                # Le milieu de la bande basse dégrossit ; les pieds se posent ensuite sur ceux de la garde
                dx = feet_shift(ref, canvas)
                if dx:
                    canvas = Image.new('RGBA', ref.size)
                    canvas.alpha_composite(resized, (at[0] + dx, at[1]))
                    print(f'{pose:8} pieds sur ceux de la garde ({dx:+d} px)')
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
    sheets = [read_sheet(spec, '--fond' in flags, '--contours' in flags) for spec in specs]
    reference = next((Path(a.split('=', 1)[1]) for a in flags if a.startswith('--reference=')), None)
    if reference:
        sol = next((a for a in flags if a == '--sol' or a.startswith('--sol=')), None)
        poses = None if sol is None else set(sol.split('=', 1)[1].split(',')) if '=' in sol else set()
        ref = Image.open(reference).convert('RGBA')
        # --elargir=<px> : la toile des nouvelles postures déborde de <px> de chaque côté, même centre, même hauteur
        pad = next((int(a.split('=', 1)[1]) for a in flags if a.startswith('--elargir=')), 0)
        if pad:
            wide = Image.new('RGBA', (ref.width + 2 * pad, ref.height))
            wide.alpha_composite(ref, (pad, 0))
            ref = wide
        add_to_reference(name, sheets, ref, target, '--pieds' in flags, poses)
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

    # --sol : les postures demandées sont posées sur le sol de la garde (même point le plus bas). La toile de
    # travail a de grandes marges vides : un décalage vertical par roulement ne coupe rien.
    sol = next((a for a in flags if a == '--sol' or a.startswith('--sol=')), None)
    if sol:
        ground = bbox(placed['idle'])[3]
        for pose in (sol.split('=', 1)[1].split(',') if '=' in sol else list(placed)):
            if pose == 'idle' or pose not in placed:
                continue
            dy = ground - bbox(placed[pose])[3]
            if dy:
                placed[pose] = Image.fromarray(np.roll(np.asarray(placed[pose]), dy, axis=0), 'RGBA')
                print(f'{pose:8} posée sur le sol ({dy:+d} px)')

    # Un seul rectangle pour toutes les postures : l'union des silhouettes, élargie pour rester centrée
    # sur les pieds de la garde. Le jeu centre l'image : sans cela, une attaque ample qui s'étire vers
    # l'avant élargirait la toile d'un seul côté et décalerait la garde vers l'arrière.
    boxes = [bbox(c) for c in placed.values()]
    half = max(anchor[0] - min(b[0] for b in boxes), max(b[2] for b in boxes) - anchor[0]) + MARGIN
    # --avant=<px> : la toile s'allonge à l'arrière (à gauche, le personnage regarde à droite) de deux fois
    # <px>. Le jeu centrant la toile, la silhouette s'affiche <px> plus loin vers l'adversaire
    avant = next((int(a.split('=', 1)[1]) for a in flags if a.startswith('--avant=')), 0)
    rect = (
        anchor[0] - half - 2 * avant,
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
