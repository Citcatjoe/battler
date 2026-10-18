"""
Traitement des sons choisis par l'utilisateur, avant leur entrée dans le jeu (`docs/SONS.md` § 7).

Source : un dossier par son, nommé comme le son dans le code (`SOUND_NAMES`, `src/game/sound.ts`),
qui contient le fichier retenu, et lui seul : `<source>/hit/hit-1.mp3`. Un fichier posé à plat
convient aussi s'il commence par le nom du son (`<source>/hit-1.wav`). Exception : les sons à
variantes (`VARIED`, les dés) prennent plusieurs fichiers, écrits `<son>-1.mp3`, `<son>-2.mp3`…

Pour chaque fichier : coupe le silence de tête (le son démarre à son attaque, pour tomber à
l'image du coup), ramène la durée à la fenêtre du son à ×1 avec un fondu de sortie, égalise
l'intensité (-12 dB RMS sur la partie utile, limiteur à -1 dB), puis encode en MP3 mono 96 kb/s
sous `<destination>/<son>.mp3`. Les anciens fichiers d'un son traité sont remplacés. Le volume de chaque son en jeu se règle ensuite dans `MIX`.

Usage : python3 -I scripts/process-sounds.py <dossier source> src/assets/sounds
Demande ffmpeg (avec libmp3lame). Affiche, pour chaque son, le début gardé, la durée et le gain.
"""
import array
import math
import os
import subprocess
import sys

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
SR, STEP, TARGET = 44100, 0.005, -12.0
AUDIO = ('.mp3', '.wav', '.ogg', '.flac')
# Durée maximale gardée, en secondes à ×1 (fenêtre du son, `docs/SONS.md` § 3)
MAX_DURATION = {
    'dice-roll': 1.2, 'dice-land': 0.3, 'coin-toss': 1.5, 'coin-land': 0.6, 'coin-win': 0.8,
    'hit': 0.7, 'crit-rumble': 1.2, 'dodge': 0.3,
    'aura-gain': 1.3, 'aura-loss': 1.0, 'buff': 0.7, 'debuff': 0.7, 'dispel': 0.6, 'stun': 0.9, 'rot': 0.5, 'heal': 0.7,
    'shift': 1.2, 'ko': 1.5, 'victory': 5.0, 'click': 0.1, 'clash': 4.0,
}
# Sons à plusieurs fichiers, tirés au hasard en jeu (`VARIED_SOUNDS`, `sound.ts`)
VARIED = {'dice-roll', 'dice-land'}


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    samples = array.array('f')
    samples.frombytes(raw)
    return samples


def env_db(x):
    """Niveau en dB par fenêtre de 5 ms."""
    w = int(SR * STEP)
    return [10 * math.log10(sum(v * v for v in x[i:i + w]) / w + 1e-12) for i in range(0, len(x) - w + 1, w)]


def sound_of(rel):
    """Le son d'un fichier : son dossier, sinon le début de son nom."""
    parts = rel.split(os.sep)
    if len(parts) > 1 and parts[-2] in MAX_DURATION:
        return parts[-2]
    stem = os.path.splitext(parts[-1])[0]
    return next((s for s in sorted(MAX_DURATION, key=len, reverse=True) if stem == s or stem.startswith(s + '-')), None)


found = {}
for root, _, files in os.walk(src):
    for f in files:
        if not f.lower().endswith(AUDIO):
            continue
        rel = os.path.relpath(os.path.join(root, f), src)
        sound = sound_of(rel)
        if sound is None:
            sys.exit(f'{rel} : aucun son de ce nom ({", ".join(MAX_DURATION)})')
        if sound in found and sound not in VARIED:
            sys.exit(f'{sound} : plusieurs fichiers ({found[sound][0]}, {rel}) ; il en faut un seul')
        found.setdefault(sound, []).append(rel)

jobs = []
for sound, rels in sorted(found.items()):
    for old in os.listdir(dst):
        if old == f'{sound}.mp3' or (old.startswith(f'{sound}-') and old[len(sound) + 1:-4].isdigit()):
            os.remove(os.path.join(dst, old))
    for n, rel in enumerate(sorted(rels), 1):
        jobs.append((sound, rel, f'{sound}-{n}.mp3' if sound in VARIED else f'{sound}.mp3'))

for sound, rel, out in jobs:
    path = os.path.join(src, rel)
    db = env_db(load(path))
    peak = max(db)
    on = next(i for i, v in enumerate(db) if v > peak - 25)  # attaque : 25 dB sous le pic
    end = max(i for i, v in enumerate(db) if v > peak - 45) + 1  # fin utile : 45 dB sous le pic
    start = max(0, on - 2) * STEP
    dur = min(MAX_DURATION[sound], (end - start / STEP) * STEP + 0.03)
    act = db[on:min(end, on + int(dur / STEP))]
    rms = 10 * math.log10(sum(10 ** (v / 10) for v in act) / len(act))
    gain = TARGET - rms
    fade = min(0.08, dur * 0.3)
    af = (f'atrim=start={start:.3f}:duration={dur:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.004,'
          f'afade=t=out:st={dur - fade:.3f}:d={fade:.3f},volume={gain:.1f}dB,alimiter=limit=0.89:level=false')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af', af, '-ac', '1', '-ar', '44100',
                    '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(dst, out)], check=True)
    print(f'{rel} -> {out}  début {start:.3f} s, durée {dur:.3f} s, gain {gain:+.1f} dB')

missing = [s for s in MAX_DURATION if s not in found]
if missing:
    print('Sans fichier dans cette livraison :', ', '.join(missing))
