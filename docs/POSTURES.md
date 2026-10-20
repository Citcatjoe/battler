# Postures des combattants

_Fonctionnalité ajoutée en 0.40.0. But : **tester si changer l'image du combattant au fil des animations renforce l'immersion**. Personnages à postures : l'orc (Gorak, Murzug), avec sa nouvelle image originale, et la voleuse (Naraxes, Ssythra)._

---

## 0. En bref

- **Cinq postures**, en plus de la **garde** : attaque, esquive, coup encaissé, K.O. et victoire. Ce sont des décisions de l'utilisateur (2026-10-19) : peu de postures, pour garder la production d'images légère, et seulement des moments que tout combattant vit. Le coup encaissé a été ajouté après l'essai de l'orc. La compétence garde son animation (le nom de la compétence) sur l'image de garde.
- **Seulement des postures communes à tous les personnages** (règle de l'utilisateur, 2026-10-19) : des moments que tout combattant vit, comme attaquer, esquiver, tomber ou gagner. Jamais une posture propre à une capacité (une Furie, un sort de prêtresse, une forme du druide) : les capacités restent portées par leurs animations et leurs textes. Une nouvelle posture n'entre dans le registre que si elle vaut pour tout le roster.
- **L'écran choisit la posture** d'après ce qu'il rejoue déjà : l'élan, l'esquive, le coup reçu, la fin du combat. Le moteur de règles n'est pas touché : c'est de la présentation pure.
- **Une posture absente retombe sur la garde.** Un personnage sans postures s'affiche exactement comme avant.
- **Toutes les postures d'un personnage partagent la même toile** : mêmes dimensions, même ligne de sol, même échelle. Changer d'image ne fait donc pas sauter le personnage. C'est le rôle de `scripts/slice-poses.py`.

---

## 1. Les postures et leur moment

Registre : `src/game/poses.ts` (`POSES`).

| Posture (`PoseId`) | Nom | Quand | Ce que fait l'animation par-dessus |
| --- | --- | --- | --- |
| `idle` | Garde | au repos, et quand il déclenche une compétence. C'est `look.image` | tremblement de la Peur, translucidité de l'esquive imposée |
| `attack` | Attaque | pendant l'élan d'une attaque (`lunging`) | l'élan (`.lunge`) : recul, bond vers l'adversaire, retour |
| `dodge` | Esquive | quand il esquive (`received.dodged`), synchronisée avec l'élan adverse | le saut de côté (`.dodge`) |
| `hurt` | Coup encaissé | quand un coup le touche (`received.landed`, non esquivé), jusqu'au moment suivant | le recul et l'éclair rouge (`.hit`) |
| `ko` | K.O. | à la fin du combat, s'il a perdu | avec une posture K.O., le grisé seul (`.ko-posed`) ; sans, la bascule et le grisé (`.ko`) |
| `victory` | Victoire | à la fin du combat s'il a gagné, sur l'écran de fin et sur l'écran du champion | le léger balancement (`.victory`) |

**Priorité**, quand deux moments se chevauchent (`poseOf`) : K.O. et victoire, puis attaque, puis esquive, puis coup encaissé, puis garde.

**Changement d'image** : instantané, comme une image clé d'animation. Les postures sont préchargées dès que le combattant s'affiche, pour éviter un clignotement au premier élan.

---

## 2. Dans le code

| Fichier | Rôle |
| --- | --- |
| `src/game/poses.ts` | le registre `POSES` (nom, moment, ligne de prompt), `poseOf` (la posture du moment), `poseImage` (l'image, ou la garde par défaut), `poseImages` (préchargement) |
| `src/game/character.ts` | `CharacterLook.poses?: { attack?, dodge?, hurt?, ko?, victory? }`. `lookFor(form)` : une forme qui change d'image (l'ours) ne reprend pas les postures de la forme de base |
| `src/components/Fighter.tsx` | calcule la posture, change l'image affichée, précharge, choisit `.ko` ou `.ko-posed`. Toutes les images sont à leur largeur naturelle, centrées sur les pieds ; `anchor="inside"` fait déborder une image large vers le centre de l'écran plutôt que hors de l'écran (affrontement, fin de combat) |
| `src/components/StartScreen.tsx`, `MatchupScreen.tsx`, `EndScreen.tsx` | les menus, les panneaux et le sceau « VS » passent au-dessus des combattants (`relative z-20`) : une arme levée passe derrière, jamais devant |
| `src/index.css` | `.ko-posed` : le K.O. sans bascule |
| `scripts/slice-poses.py` | découpe les planches, aligne les postures sur la garde, les recadre ensemble |
| `scripts/cutout-character.py` | `CUTOUT_KEEP_CANVAS=1` : détourer sans recadrer (utilisé par `slice-poses.py`) |

Dans `roster.ts`, l'orc :

```ts
look: {
  image: orcIdleImg,
  poses: { attack: orcAttackImg, dodge: orcDodgeImg, ko: orcKoImg, victory: orcVictoryImg },
  facing: 'right',
  scale: 1.18, // taille 1,08 (échelle resserrée, STYLE_BIBLE § 2) : 1,08 × 0,92 / 0,845
  headroom: 0.13, // part vide au-dessus de la tête : la zone d'état s'y cale
  portrait: { x: 49, y: 8, zoom: 3 },
},
```

La garde est **`<nom>-idle.png`** : la garde recadrée avec les postures, sur leur toile. Les variantes (Murzug pour Gorak) héritent des postures de leur original, teinte comprise. Pour un personnage à formes, chaque forme a ses propres `poses` dans son `look`.

Tests : `modules.test.ts` (priorités, retour à la garde, formes, postures de Gorak et Murzug, textes sans emoji) et `screens.test.tsx` (chaque moment se rend).

---

## 3. Produire les images

### 3.1 Le principe : la garde sert de règle

Le générateur ne garde pas l'échelle d'une image à l'autre : un personnage sorti seul dans une image « grandit » ou « rapetisse » d'une posture à l'autre. On ne lui demande donc jamais une posture seule.
1. **D'abord la garde**, avec le prompt du personnage (`STYLE_BIBLE.md` § 4). C'est la référence pour la suite.
2. **Puis une planche par posture** : **1536×1024**, **deux cases de 768×1024**, la **garde à gauche** et la posture à droite. Une case de 768×1024 donne un personnage d'environ 950 px de haut, aussi net que les autres images. Toutes les postures dans une seule image donneraient des cases de 512 px, trop floues.
3. **`slice-poses.py`** met chaque planche à l'échelle de la garde de la première, la cale sur ses pieds, puis recadre toutes les postures avec le même rectangle.

Avec des planches de deux cases, il faut donc **six générations** pour cinq postures : la garde, puis cinq planches. Les planches de trois cases (§ 3.2 bis) réduisent ce nombre à trois.

### 3.2 Le prompt d'une planche

Dans la conversation ChatGPT du personnage, **joindre la garde** comme référence, puis :

```text
Same STYLE as before.

REFERENCE: the attached image is this character. Keep EXACTLY the same character in both panels:
same face, body, proportions, armor, colors, weapon and every detail. Only the pose changes.

LAYOUT: two identical portrait panels side by side, 768x1024 each, with a thin clear gap between them.
LEFT PANEL: GUARD — exactly the pose of the reference image.
RIGHT PANEL: <NOM DE LA POSTURE> — <ligne de la posture ci-dessous>.

CONSISTENCY: the character is the SAME SIZE in both panels (same scale, same camera distance and height),
both figures stand on the SAME ground line, about 3% above the bottom edge of the panels,
same three-quarter view facing RIGHT, same soft frontal symmetric lighting.
FRAMING: full body in each panel, nothing cropped, no part of one pose crossing into the other panel,
room above the head for a raised weapon.

OUTPUT: landscape 1536x1024, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery, no text, no panel borders.
```

Pour les planches suivantes, dans la même conversation, avec la garde jointe : `Same rules, same character, same layout as the previous sheet: guard on the left, exactly as the reference. RIGHT PANEL: …`

Lignes de posture (tirées de `POSES`, à adapter à l'archétype) :

| Posture | Ligne générique | Version de l'orc (utilisée) |
| --- | --- | --- |
| `attack` | `ATTACK — mid-attack, lunging forward toward the right, weapon swinging at full extension, front foot planted` | `ATTACK — a brutal overhead chop: lunging forward toward the right, the massive two-handed cleaver swung down at full extension, front foot planted, back leg driving` |
| `dodge` | `DODGE — evading sideways, body twisting and leaning away to the left, light on the feet` | `DODGE — a heavy sidestep away to the left, massive shoulders hunched and turned, the cleaver pulled close to the body, weight shifting, not acrobatic` |
| `hurt` | `HURT — recoiling from a heavy blow, torso twisted back, one arm raised to shield the face, grimacing, both feet still on the ground` | `HURT — staggering back from a heavy blow, torso twisted, one arm raised to shield the face, the cleaver lowered, snarling in pain, both feet still on the ground` (pas encore générée) |
| `ko` | `KO — defeated, collapsed on one knee or lying on the ground, weapon dropped beside` | `KO — defeated: collapsed onto one knee, leaning on the planted cleaver, head bowed, shoulders slumped, no blood` |
| `victory` | `VICTORY — triumphant victory pose, weapon raised high, chest out, both feet planted` | `VICTORY — triumphant: the cleaver raised high overhead with both hands, roaring, chest out, both feet planted` |

Un K.O. **à genoux** plutôt qu'allongé garde le personnage lisible et ne le fait pas disparaître sous l'ombre portée.

### 3.2 bis Deux planches de trois cases (recommandé depuis l'orc)

Pour moins de générations : des **planches de 1536×1024 en trois cases de 512×1024**, la garde toujours en première case. A : garde, attaque, esquive. B : garde, K.O., victoire. **C : garde, coup encaissé**, en deux cases de 768×1024 (gabarit du § 3.2). Il faut 3 générations au lieu de 5, en plus de la garde si le personnage n'a pas encore d'image originale. Le personnage garde environ 950 px de haut. Contrepartie : des cases étroites, d'où des poses **compactes** (l'arme levée ou ramenée près du corps, pas tendue sur le côté), sinon le générateur rapetisse le personnage dans la case.

```text
Same STYLE as before.

REFERENCE: the attached image is this character. Keep EXACTLY the same character in all three panels:
same face, body, proportions, armor, colors, weapon and every detail. Only the pose changes.

LAYOUT: three identical tall portrait panels side by side, 512x1024 each, with a thin clear gap between them.
PANEL 1 (left): GUARD — exactly the pose of the reference image.
PANEL 2 (middle): <POSTURE> — <ligne de la posture, version compacte>.
PANEL 3 (right): <POSTURE> — <ligne de la posture, version compacte>.

CONSISTENCY: the character is the SAME SIZE in all three panels (same scale, same camera distance and height):
the standing poses have the same head height. All figures stand on the SAME ground line, about 3% above
the bottom edge of the panels. Same three-quarter view facing RIGHT, same soft frontal symmetric lighting.
FRAMING: full body in each panel, nothing cropped, every pose kept compact so it fits its narrow panel
(weapon raised or held close to the body rather than stretched sideways), no part of one pose crossing
into another panel, room above the head for a raised weapon.

OUTPUT: landscape 1536x1024, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery, no text, no panel borders.
```

Découpe : `python scripts/slice-poses.py <nom> a.png:3x1:idle,attack,dodge b.png:3x1:idle,ko,victory c.png:2x1:idle,hurt --fond`.

### 3.2 ter Quatre planches amples et l'atelier des postures (0.54.0, recommandé)

Demande de l'utilisateur (2026-10-20) : **plus d'amplitude**. Les personnages sont pensés un peu de côté. Un coup se porte dans l'élan, le corps en extension ; un coup reçu repousse tout le corps vers l'arrière. L'attaque de la barde, de face, semblait frapper le spectateur : c'est à éviter.

- **Quatre planches** de 1536×1024 : A garde + attaque, B coup encaissé + garde, C esquive + garde (deux cases de 768×1024 chacune), D garde + K.O. + victoire (trois cases de 512). Quatre générations au lieu de trois : c'est le prix des cases larges.
- **La garde du côté opposé au mouvement** : à gauche pour l'attaque (qui part vers la droite), à droite pour le coup encaissé et l'esquive (qui partent vers la gauche). Rien ne déborde ainsi sur la garde.
- **Bloc `CAMERA AND MOTION` et `AMPLITUDE`** dans chaque prompt : la caméra ne bouge pas, mais le personnage se tourne presque de profil dans la case d'action. L'action reste parallèle à l'image, sans raccourci de perspective et sans arme pointée vers le spectateur. Le mouvement passe par tout le corps, et les tissus suivent derrière.
- **Règle de hauteur** pour une garde neuve : le sommet de la tête est le point le plus haut du personnage. Une arme levée au-dessus de la tête compte dans la hauteur de la garde, qui règle la taille à l'écran, et rapetisse le corps (Aldric, Morgrut).
- **L'atelier des postures** : une page de prompts complets, à copier d'un clic, une fiche par personnage avec sa garde. On ouvre une conversation ChatGPT par personnage et on y joint la garde une seule fois. Les gardes sur fond gris sont dans `logs/atelier/`, les planches sources rangées dans `logs/atelier/sources/<personnage>/`.

Découpe :
```
python scripts/slice-poses.py undead a.png:2x1:idle,attack b.png:2x1:hurt,idle c.png:2x1:dodge,idle d.png:3x1:idle,ko,victory --fond --contours
```

`--contours` sépare les figures par leurs silhouettes. La planche est détourée d'un bloc, puis coupée entre deux figures par la ligne la moins dense (le vide, ou leur contact le plus mince). Chaque lambeau isolé rejoint la figure la plus proche. Sur Ervald, l'attaque débordait de 195 px sur la case de la garde, le coup encaissé de 177 px, l'esquive de 154 px : tout est resté à sa figure.

### 3.3 Découper et intégrer

```
python scripts/slice-poses.py orc a.png:2x1:idle,attack c.png:2x1:idle,dodge e.png:2x1:idle,ko f.png:2x1:idle,victory --fond
```

- `--fond` : les planches sont sur le gris `#808080` ; chaque case est détourée par `cutout-character.py`, sans recadrage. Les fragments isolés (pointe d'une arme d'une case voisine qui déborde, résidu de fond) sont retirés : seuls restent le personnage et ce qu'il tient.
- **Ajouter une posture à un personnage déjà découpé** : `--reference=src/assets/<nom>-idle.png`. La garde de la planche est calée sur la garde existante (même hauteur, mêmes pieds), et la posture est écrite sur sa toile. Les autres postures ne bougent pas. Une planche où le personnage paraît plus grand, comme une planche à deux cases face à une planche à trois, se recale ainsi d'elle-même. Exemple : `python scripts/slice-poses.py orc c.png:2x1:idle,hurt --fond --reference=src/assets/orc-idle.png`.
- Sortie : `src/assets/<nom>-idle.png`, `-attack`, `-dodge`, `-hurt`, `-ko` et `-victory`, tous aux **mêmes dimensions** (778×993 pour l'orc), et une planche de contrôle `logs/poses-<nom>.png` avec la ligne de sol.
- **Regarder la planche de contrôle** : les pieds de chaque posture debout doivent toucher la ligne, et le personnage doit avoir la même taille dans toutes.
- Le script dit quelle part de la toile la garde occupe (84 % pour l'orc) : `scale = taille × 0,92 / part` (échelle resserrée, `STYLE_BIBLE.md` § 2), et `headroom` = la part vide au-dessus de la tête.
- **Portrait** : la nouvelle garde n'a pas le même cadrage que l'ancienne image ; régler `portrait: { x, y, zoom }` et vérifier les vignettes de l'accueil.
- Dépendances : numpy, pillow et scipy. La machine n'en a pas en standard : créer un environnement (`python -m venv`, puis `pip install numpy pillow scipy`).

### 3.4 Check-list

- [ ] La garde est générée d'abord ; chaque planche la reprend en première case, et c'est le même personnage (visage, armure, couleurs).
- [ ] La planche de contrôle a été regardée : mêmes pieds, même taille, rien de coupé.
- [ ] Dans `look` : `image` passe à `<nom>-idle.png` ; `poses` est rempli ; `scale` est corrigé de la part indiquée ; le portrait est recadré.
- [ ] Vu en combat par capture (l'élan, une esquive, un coup encaissé, la fin du combat), ainsi que l'accueil, l'affrontement et l'écran de fin, où l'image ne doit pas sortir de l'écran ni couvrir un panneau.
- [ ] Les sources sont à la corbeille (`gio trash`) et les PNG optimisés.

---

## 4. Les personnages à postures (0.40.0)

**L'orc (Gorak, Murzug)** :
- **une nouvelle image originale**, générée avec son prompt de la `STYLE_BIBLE`, qui remplace le placeholder `orc.png`, issu d'une œuvre existante et mis à la corbeille ;
- **ses cinq postures**, générées en planches de deux cases. Le coup encaissé a été ajouté après coup, avec `--reference` ;
- `scale` 1,18 et `headroom` 0,13.

**La voleuse (Naraxes, Ssythra)** :
- **une nouvelle garde**, tirée de sa planche. C'est un nouveau rendu de son image d'origine, qui est à la corbeille ;
- **ses cinq postures**, en trois planches : deux de trois cases (garde, attaque, esquive ; garde, K.O., victoire) et une de deux cases (garde, coup encaissé). C'est le format le plus rapide : 3 générations ;
- `scale` 1,10 et `headroom` 0,14 ;
- portrait recadré.

**Le barde (Fanchon, Mélisande ; 2026-10-19)**, premier personnage créé directement avec ses postures :
- une garde puis trois planches (A : garde, attaque, esquive ; B : garde, K.O., victoire ; C : garde, coup encaissé), soit 4 générations ; prompts dans la `STYLE_BIBLE` § 4 ;
- **attaque ample** (demande de l'utilisateur : des postures plus expressives, surtout le coup) : une fente complète, refaite seule dans une planche de deux cases de 768. La première, tassée dans une case de 512, avait la rapière coupée. La fente débordait encore sur la case de la garde : les deux figures ont été séparées par leurs contours (composantes connexes sur le gris), recomposées dans deux cases de 1100 px avec leur position relative, puis toutes les postures redécoupées depuis les planches d'origine (sans régénération). L'attaque, dessinée 18 px trop haut par le générateur, a été redescendue sur la ligne de sol ;
- toile 992×1005, **centrée sur les pieds de la garde** (`slice-poses.py` élargit désormais la toile des deux côtés : une attaque ample ne décale plus la garde), la garde en occupe 95 % : `scale` 0,97 (taille 1,00), `headroom` 0,03, portrait `{ x: 60, y: 5, zoom: 3.2 }` (inchangés) ;
- vu par capture : l'élan des deux côtés (la lame file vers l'adversaire, sans passer sur les dés), l'accueil, l'affrontement. **Effet de bord** : sur l'affrontement, l'ancrage `inside` colle le bord de la toile au bord de l'écran ; la toile plus large pousse la barde d'environ 70 px vers le centre, sous son nom et le bord de son panneau ;
- intégration dans `roster.ts` par l'agent du gameplay.

**Ervald (2026-10-20, 0.54.0)**, premier personnage fait avec l'atelier (§ 3.2 ter) :
- une nouvelle garde, tirée de sa planche, qui remplace `undead.png` ; quatre planches, générées du premier coup ;
- toile 1002×1118, la garde en occupe 83 % : `scale` 0,98 → 1,16 pour garder la même hauteur à l'écran, `headroom` 0,15 (l'épée levée de la victoire), portrait `{ x: 56, y: 19, zoom: 5 }` ;
- vu par capture : l'accueil, l'affrontement face à Aldric (même taille), l'attaque, le coup encaissé, l'esquive et la victoire en combat. Non vu : le K.O.

**Aldric (2026-10-20, 0.56.0)**, nouveau modèle (planche 0 de l'atelier) puis quatre planches :
- la règle de hauteur n'a été tenue qu'à moitié : l'épée est basse, mais la hampe de la bannière dépasse encore la tête d'environ 10 % ;
- **la taille se règle donc sur le corps** (tête-pieds, 77 % de la toile de 1054×1099) et non sur la silhouette entière : `scale` = 1,04 × 0,945 / 0,79 ≈ 1,24 (0,945 : rapport moyen hauteur affichée / taille, mesuré sur Gorak, Fanchon et Ervald), `headroom` 0,21, portrait `{ x: 55, y: 22, zoom: 5.2 }`. C'est la méthode à suivre pour tout personnage dont un élément dépasse de la tête ;
- vu par capture : l'accueil, l'affrontement face à Ervald, l'attaque, le coup encaissé et le K.O. Non vus : l'esquive et la victoire.

**Ysolde (2026-10-20, 0.57.0)**, à partir de sa garde actuelle, quatre planches générées du premier coup :
- la masse levée et le halo dépassent de la tête : taille réglée sur le corps, comme Aldric (tête-pieds 74 % de la toile de 1058×1070) : `scale` = 1,00 × 0,945 / 0,755 ≈ 1,25, `headroom` 0,245, portrait `{ x: 52, y: 28, zoom: 5 }` ;
- vu par capture : l'accueil, l'affrontement face à Aldric (un peu plus petite que lui), l'attaque, le coup encaissé et le K.O. Non vus : l'esquive et la victoire.

**Vu à l'écran** (captures Firefox) :
- l'attaque des deux personnages pendant l'élan ;
- le coup encaissé de la voleuse ;
- l'accueil, l'affrontement et la victoire de l'orc sur l'écran de fin.

**Pas encore vu** : l'esquive et le K.O. dans un combat joué. Ils sont couverts par les tests.

**À juger par l'utilisateur** : l'apport à l'immersion, avant de généraliser au roster. Il faut trois générations par famille avec les planches de trois cases, plus la garde pour le nain, dernier placeholder.

## 5. Limites connues

- **Une même règle d'affichage pour tous** depuis la 0.40.0 : toutes les images sont à leur largeur naturelle, avec une échelle resserrée (`STYLE_BIBLE.md` § 2). Une première version, où seul l'orc était à sa vraie largeur, le faisait paraître bien plus massif que l'ogre (472 px de large contre 330) : c'est corrigé. Un personnage qui reçoit des postures garde sa taille, à condition de régler son `scale` sur sa nouvelle toile.
- **Sur l'écran de fin**, la victoire de l'orc (couperet levé) passe derrière le début du texte (« Orc · Brute »), qui reste au premier plan mais se lit moins bien.
- **La cohérence du dessin** d'une planche à l'autre dépend du générateur : la garde jointe et le rappel « same character » limitent la dérive, sans la supprimer. Une planche ratée se régénère seule, avec sa garde.
