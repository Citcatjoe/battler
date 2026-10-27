# Postures des combattants

_Fonctionnalité ajoutée en 0.40.0. But : **tester si changer l'image du combattant au fil des animations renforce l'immersion**. Personnages à postures : l'orc (Gorak, Murzug), avec sa nouvelle image originale, et la voleuse (Naraxes, Ssythra)._

---

## 0. En bref

- **Cinq postures**, en plus de la **garde** : attaque, esquive, coup encaissé, K.O. et victoire. Ce sont des décisions de l'utilisateur (2026-10-19) : peu de postures, pour garder la production d'images légère, et seulement des moments que tout combattant vit. Le coup encaissé a été ajouté après l'essai de l'orc. La compétence garde son animation (le nom de la compétence) sur l'image de garde.
- **Seulement des postures communes à tous les personnages** (règle de l'utilisateur, 2026-10-19) : des moments que tout combattant vit, comme attaquer, esquiver, tomber ou gagner. Jamais une posture propre à une capacité (une Furie, un sort de prêtresse, une forme du druide) : les capacités restent portées par leurs animations et leurs textes. Une nouvelle posture n'entre dans le registre que si elle vaut pour tout le roster.
- **L'écran choisit la posture** d'après ce qu'il rejoue déjà : l'élan, l'esquive, le coup reçu, la fin du combat. Le moteur de règles n'est pas touché : c'est de la présentation pure.
- **Une posture absente retombe sur la garde.** Un personnage sans postures s'affiche exactement comme avant.
- **La perte de contrôle** (0.120.0, demande de l'utilisateur, § 6) : un sixième moment commun à tous, joué par **deux images** qui alternent vite, tant qu'il porte la Peur ou l'Étourdi et pendant son tour perdu. Chaque personnage vacille à sa façon, d'après sa personnalité.
- **Toutes les postures d'un personnage partagent la même toile** : mêmes dimensions, même ligne de sol, même échelle. Changer d'image ne fait donc pas sauter le personnage. C'est le rôle de `scripts/slice-poses.py`. Seule exception (0.120.0) : la toile des deux images de perte de contrôle peut être **plus large** que la garde, à hauteur et centre égaux (`--elargir`, § 6) ; le jeu centre chaque image et lui donne la hauteur de la toile, la figure ne bouge donc pas.
- **Une forme animale bouge comme un animal** (règle de l'utilisateur, 2026-10-20) : l'ours du druide se tient, attaque, encaisse, esquive, tombe et triomphe comme une bête, à quatre pattes. Jamais debout comme un homme, jamais un coup de poing, jamais à genou. Les mêmes cinq moments, joués par un quadrupède : charge au galop gueule ouverte, sursaut en arrière sur ses quatre pattes, bond de côté, couché sur le flanc, rugissement campé sur ses pattes. Il lui faut donc une **nouvelle garde à quatre pattes**, tirée de l'ancienne (bois, amulette, tatouages). Un quadrupède est plus long que haut : ses planches empilent **deux cases en paysage de 1024×768** dans une image en portrait 1024×1536, la garde en haut, soit cinq planches (découpe `1x2:idle,<posture>`). **Ses prompts n'ont pas un mot d'anatomie humaine** : un premier jet reprenait le bloc STYLE des humanoïdes (épaules, mains, visage) et le bloc de mouvement (bras, « fighting-game »), et un coup de griffe d'une patte avant : ChatGPT en tirait une attaque d'homme, même avec la garde à quatre pattes jointe. L'attaque passe donc par la gueule et la masse, jamais par une patte levée, et la garde à quatre pattes se joint à chaque planche. À l'intégration, son `scale` et sa largeur à l'écran seront à régler sur la nouvelle silhouette.

---

## 1. Les postures et leur moment

Registre : `src/game/poses.ts` (`POSES`).

| Posture (`PoseId`) | Nom | Quand | Ce que fait l'animation par-dessus |
| --- | --- | --- | --- |
| `idle` | Garde | au repos, et quand il déclenche une compétence. C'est `look.image` | tremblement de la Peur (sans images de perte de contrôle), translucidité de l'esquive imposée |
| `attack` | Attaque | pendant l'élan d'une attaque (`lunging`) | l'élan (`.lunge`) : recul, bond vers l'adversaire, retour |
| `dodge` | Esquive | quand il esquive (`received.dodged`), synchronisée avec l'élan adverse | le saut de côté (`.dodge`) |
| `hurt` | Coup encaissé | quand un coup le touche (`received.landed`, non esquivé), jusqu'au moment suivant | rien pour un coup ordinaire : la posture seule. Un critique repousse en plus le combattant puis le ramène (`.knockback`, 0.68.3, demande de l'utilisateur) |
| `ko` | K.O. | à la fin du combat, s'il a perdu | le grisé, en fondu sur le filtre de l'image ; sans posture K.O., la bascule en plus (`.ko`) |
| `victory` | Victoire | à la fin du combat s'il a gagné, sur l'écran de fin et sur l'écran du champion | le léger balancement (`.victory`) |
| `dazed` | Perte de contrôle | tant qu'un statut lui fait perdre son action (Peur, Étourdi), puis pendant son tour perdu, jusqu'au passage de main (cue `daze`, [MISE_EN_SCENE.md](MISE_EN_SCENE.md) M51) | **deux images** (`poses.dazed`) qui alternent toutes les 180 ms (`.daze-frame-a`, `.daze-frame-b`, sans fondu) ; elles remplacent le tremblement de la Peur |

**Priorité**, quand deux moments se chevauchent (`poseOf`) : K.O. et victoire, puis attaque, puis esquive, puis coup encaissé, puis perte de contrôle, puis garde. Un coup encaissé ou une Riposte interrompent donc la perte de contrôle, qui reprend ensuite.

**Changement d'image** : instantané, comme une image clé d'animation. Les postures sont préchargées dès que le combattant s'affiche, pour éviter un clignotement au premier élan.

---

## 2. Dans le code

| Fichier | Rôle |
| --- | --- |
| `src/game/poses.ts` | le registre `POSES` (nom, moment, ligne de prompt), `poseOf` (la posture du moment), `poseImage` (l'image, ou la garde par défaut ; la première image de la perte de contrôle), `poseImages` (préchargement, les deux images de la perte de contrôle comprises) |
| `src/game/character.ts` | `CharacterLook.poses?: { attack?, dodge?, hurt?, ko?, victory?, dazed?: [a, b] }`. `lookFor(form)` : une forme qui change d'image (l'ours) ne reprend pas les postures de la forme de base |
| `src/game/staging.ts` | la cue `daze` (M51) : la perte de contrôle commence quand un statut `skipsAction` apparaît dans la zone d'état, et finit au passage de main qui suit son tour perdu. Le moteur n'en sait rien |
| `src/components/Fighter.tsx` | calcule la posture, change l'image affichée, précharge, choisit `.knockback` (critique reçu) et `.ko` (K.O. sans posture). Toutes les images sont à leur largeur naturelle, centrées sur les pieds ; `anchor="inside"` fait déborder une image large vers le centre de l'écran plutôt que hors de l'écran (affrontement, fin de combat). **Deux règles de Firefox** : le filtre (ombre, contour d'aura, grisé du K.O.) est sur une enveloppe exactement à la taille de l'image, jamais sur un conteneur plus petit qu'elle (la colonne du combattant), qui couperait ce qui déborde ; le retournement (`scaleX(-1)`) est sur l'image, sous ce filtre, jamais au-dessus : un filtre dans un repère retourné est coupé au bord de l'écran, du mauvais côté (0.77.x : l'ours à droite, dont la toile déborde de l'écran de 63 px, perdait son museau et ses pattes avant ; vu seulement dans un Firefox à l'écran, pas dans les captures sans interface) |
| `src/components/MatchupScreen.tsx`, `EndScreen.tsx` | les menus, les panneaux et le sceau « VS » passent au-dessus des combattants (`relative z-20`) : une arme levée passe derrière, jamais devant |
| `src/index.css` | `.knockback` : le recul d'un critique ; `.ko` : la bascule d'un K.O. sans posture ; `.daze-frame-a`, `.daze-frame-b` : l'alternance des deux images de perte de contrôle |
| `scripts/slice-poses.py` | découpe les planches, aligne les postures sur la garde, les recadre ensemble ; `--reference`, `--pieds`, `--sol` et `--elargir` pour ajouter des postures à un personnage déjà découpé (§ 6) |
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

Tests : `modules.test.ts` (priorités, retour à la garde, formes, postures de Gorak et Murzug, deux images de perte de contrôle par apparence, textes sans emoji), `screens.test.tsx` (chaque moment se rend ; les deux images alternent sans tremblement) et `staging.test.ts` (M51).

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
- `--sol` : pose chaque posture sur la ligne de sol de la garde (son point le plus bas sur celui de la garde). Le générateur place la figure de chaque case un peu plus haut ou plus bas que la garde de sa planche : sans lui, une posture flotte ou s'enfonce (jusqu'à 121 px pour l'ours couché, § 4). `--sol=ko,hurt` ne pose que ces postures. À éviter pour une posture qui doit descendre sous les pieds (massue de Morgrut, queue de Naraxes) ou décoller ; regarder la planche de contrôle dans tous les cas.
- `--avant=<px>` : pour un personnage très large, comme l'ours à quatre pattes. La toile s'allonge à l'arrière de deux fois <px> ; le jeu la centrant sur la colonne du combattant, la silhouette s'affiche <px> (de toile) plus près de l'adversaire et ne sort plus de l'écran par l'arrière.
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

**Elaria (2026-10-20, 0.58.0)**, à partir de sa garde actuelle, quatre planches du premier coup : l'arc dépasse de la tête, donc la taille est réglée sur le corps (de la capuche aux pieds, 77 % de la toile de 1014×1116). `scale` = 1,03 × 0,945 / 0,78 ≈ 1,25, `headroom` 0,22, portrait `{ x: 42, y: 25, zoom: 4.8 }`. Vu par capture : l'accueil, l'affrontement face à Ysolde, l'attaque, l'esquive et le coup encaissé. Non vus : le K.O. et la victoire.

**Brokk et Morgrut (2026-10-20, 0.65.0)**, une garde (planche 0) puis quatre planches chacun, du premier coup ; sources dans `logs/atelier/sources/brokk/` et `morgrut/` :
- **Brokk, nouveau modèle** (nain torse nu à la grande hache), création originale qui remplace `dwarf.png`, le dernier placeholder. Il regarde vers la droite (`facing` passe de `left` à `right`). La hache dépasse de la tête : taille réglée sur le corps (tête-pieds 71,6 % de la toile de 902×1098), `scale` = 0,86 × 0,945 / 0,716 ≈ 1,14, `headroom` 0,23, `footroom` 0,035 (la hache du K.O. descend 5 % sous les pieds), portrait `{ x: 60, y: 33, zoom: 4.6 }` ;
- **Morgrut**, même modèle, dont la nouvelle garde remplace `ogre.png`. Rien ne dépasse de sa tête, mais la massue levée de la victoire rend la toile haute (1042×1232) : la garde n'en occupe que 70,3 %, soit `scale` = 1,13 × 0,92 / 0,703 ≈ 1,48, la même hauteur à l'écran qu'avant. `headroom` 0,22, `footroom` 0,06 (la massue du coup encaissé et du K.O. descend 8 % sous les pieds), portrait `{ x: 56, y: 28, zoom: 4.6 }`. Le papillon reste dans le K.O. et la victoire ;
- **écran de fin** : la massue de la victoire montait jusqu'au titre « COMBAT », qui passe désormais devant le vainqueur (`z-20`) ;
- vu par capture : la sélection, l'affrontement Brokk contre Morgrut, l'attaque et le coup encaissé des deux en combat, la victoire des deux sur l'écran de fin. Non vus : les K.O. et l'esquive de Brokk. Celle de Morgrut ne sert pas, puisqu'il n'esquive jamais (0 %).

**Thaldrin, deux formes (2026-10-20, 0.67.0)**, chaque forme dans sa conversation ; sources dans `logs/atelier/sources/thaldrin/` (garde, puis A à D) et `thaldrin-ours/` (garde à quatre pattes, puis A à E) :
- **forme humaine**, à partir de sa garde actuelle : quatre planches du premier coup. Le bâton et les bois montent à hauteur de la tête : taille réglée sur la silhouette entière, comme avant. La garde occupe 83,9 % de la toile de 1004×1022 (bâton levé de la victoire) : `scale` = 0,93 × 0,989 / 0,839 ≈ 1,10, la même hauteur à l'écran qu'avant ; `headroom` 0,155. Toile large (fente de l'attaque) : `bodyInset` `{ left: 0.216, right: 0.217 }`, pour que l'affrontement le colle au bord par sa silhouette et non par sa toile. Portrait `{ x: 62, y: 22, zoom: 4.2 }` ;
- **forme d'ours, en animal** (§ 0) : une garde à quatre pattes (planche 0, l'ancienne garde debout jointe comme modèle), puis cinq planches de deux cases en paysage empilées. Le premier jet de prompts, qui reprenait les blocs des humanoïdes, donnait une attaque d'homme ; les prompts réécrits ont marché ;
- **les postures de l'ours flottaient** : dans les planches empilées, la case du bas place l'ours plus haut que la garde de la case du haut, jusqu'à 121 px pour le K.O. couché (16 % de sa hauteur), 79 px pour l'attaque, 60 px pour le coup encaissé. Le druide humain s'écartait aussi de 5 à 30 px. D'où `slice-poses.py --sol`, qui pose chaque posture sur le sol de la garde (`--sol` sur les deux formes) ;
- **l'ours sortait de l'écran par l'arrière** : une fois et demie plus long que haut, sa toile centrée sur sa colonne débordait du bord gauche. D'où `slice-poses.py --avant=130` : la toile s'allonge à l'arrière (1318×737), ce qui avance l'ours de 130 px de toile vers l'adversaire. La garde occupe 90,1 % de la hauteur : `scale` 0,98, `headroom` 0,088, soit une silhouette de 0,894 contre 0,930 au druide (96 %, bois compris). L'ours grossit, il ne grandit plus ;
- commandes : `slice-poses.py druid a.png:2x1:idle,attack b.png:2x1:hurt,idle c.png:2x1:dodge,idle d.png:3x1:idle,ko,victory --fond --contours --sol` et `slice-poses.py druid-bear a.png:1x2:idle,attack b.png:1x2:idle,hurt c.png:1x2:idle,dodge d.png:1x2:idle,ko e.png:1x2:idle,victory --fond --sol --avant=130` ;
- vu par capture : la sélection, l'affrontement face à Gorak, la métamorphose dans les deux sens, l'attaque des deux formes, le coup encaissé du druide, le K.O. et la victoire de l'ours en combat, la victoire du druide sur l'écran de fin. Non vus : les esquives, le coup encaissé de l'ours, le K.O. du druide.

**Vu à l'écran** (captures Firefox) :
- l'attaque des deux personnages pendant l'élan ;
- le coup encaissé de la voleuse ;
- l'accueil, l'affrontement et la victoire de l'orc sur l'écran de fin.

**Pas encore vu** : l'esquive et le K.O. dans un combat joué. Ils sont couverts par les tests.

**À juger par l'utilisateur** : l'apport à l'immersion. Tout le roster a ses postures depuis la 0.67.0.

## 5. Limites connues

- **Une même règle d'affichage pour tous** depuis la 0.40.0 : toutes les images sont à leur largeur naturelle, avec une échelle resserrée (`STYLE_BIBLE.md` § 2). Une première version, où seul l'orc était à sa vraie largeur, le faisait paraître bien plus massif que l'ogre (472 px de large contre 330) : c'est corrigé. Un personnage qui reçoit des postures garde sa taille, à condition de régler son `scale` sur sa nouvelle toile.
- **Sur l'écran de fin**, la victoire de l'orc (couperet levé) passe derrière le début du texte (« Orc · Brute »), qui reste au premier plan mais se lit moins bien. Même chose pour le corps de Morgrut sous « Ogre · Cogneur », dont les pieds touchent aussi le haut de la carte « PV restants ».
- **Le druide vainqueur apparaît en forme humaine sur l'écran de fin**, même s'il a gagné en ours : l'écran ne reçoit pas la forme, et l'ours à quatre pattes ne tiendrait pas dans son cadre en hauteur. Sa victoire d'ours se voit en combat.
- **La cohérence du dessin** d'une planche à l'autre dépend du générateur : la garde jointe et le rappel « same character » limitent la dérive, sans la supprimer. Une planche ratée se régénère seule, avec sa garde.

---

## 6. La perte de contrôle (0.120.0)

**Demande de l'utilisateur** (2026-10-26) : « un duo de frames par personnage, joué quand le perso perd le contrôle de son tour (Peur et Coup de massue). Quand il est sous l'effet du statut en question, jouer la boucle des 2 frames à faible intervalle, pour donner l'illusion d'étourdissement. Le perso penché en avant et/ou en arrière de manière visible, forcer le trait ; varier les postures selon les personnages, qu'ils n'aient pas tous la même animation, s'inspirer de leur personnalité. »

**Règle** : un moment commun à tous, comme les cinq autres (§ 0). Il dépend du **contrôle** (`skipsAction` au registre des statuts), pas d'une compétence : un statut de contrôle de plus le déclenche sans rien ajouter. Il commence quand le statut apparaît dans sa zone d'état, et finit au passage de main qui suit le tour qu'il perd (« Tour perdu ») : la charge part avec ce texte, il reprend ses esprits avec la main ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) M51). Les deux images alternent toutes les **180 ms**, sans fondu ; la pause du combat les fige. Le tremblement de la Peur s'efface sous elles.

**Les deux images de chacun**, d'après sa personnalité ([PERSONNAGES.md](PERSONNAGES.md)) ; elles penchent en sens opposés, les pieds plantés au même endroit, pour que la boucle se lise comme un vacillement :

| Personnage | Image A (`-dazed-a`) | Image B (`-dazed-b`) |
| --- | --- | --- |
| Gorak (orc, le champion des fosses) | il pique du nez vers l'avant, mâchoire pendante, le couperet traîne | il part en arrière sur les talons, tête renversée, un bras jeté pour l'équilibre : fier, il refuse de tomber |
| Naraxes (lézarde, la joueuse) | elle chancelle en arrière en S, langue fourchue pendante, queue dressée en balancier | elle bascule en avant, une griffe sur la tempe, la queue balaie le sol |
| Fanchon (barde, l'artiste de foire) | elle se pâme en arrière en comédienne, le dos de la main au front, le luth qui glisse | elle trébuche en avant, chapeau sur l'œil, sourire de travers, le bras qui mouline |
| Ervald (mort-vivant, le devoir) | pantin aux fils coupés : il bascule raide en arrière, d'un bloc, tête sur l'épaule | il s'effondre en avant sur son épée plantée comme une béquille, tête pendante |
| Ysolde (prêtresse, la juge) | elle perd sa sérénité : penchée loin en arrière, la main à la tempe, la masse qui pend, le halo de travers | courbée en avant, appuyée sur sa masse comme sur une canne |
| Aldric (paladin, le créancier) | rejeté en arrière par le choc, l'épée basse, le gantelet qui cherche l'équilibre | cassé en avant sur la garde de son épée plantée, la tête qui secoue |
| Elaria (elfe, la chasseresse) | élégante même sonnée : penchée en arrière, la main à la tempe, l'arc tenu mollement | pliée en avant à la taille, l'arc qui pend vers le sol |
| Brokk (nain, le roc) | un culbuto qui ne tombe pas : il oscille en arrière sur ses talons, yeux qui louchent, la hache qui glisse sur l'épaule | il oscille en avant, la hache plantée devant lui, accroché au manche ; ses bottes ne bougent pas |
| Morgrut (ogre, le gros distrait) | il bascule en arrière, ventre en avant, langue pendante, yeux qui roulent, un papillon au-dessus de la tête | il penche en avant en louchant sur le papillon, sourire bête, la main qui gratte son casque |
| Thaldrin, forme humaine | il bascule en arrière, tête aux bois qui pend, le bâton qui glisse, sa magie verte qui s'éteint en fumerolle | penché en avant sur son bâton, tête basse, genoux qui plient |
| Thaldrin, forme d'ours (§ 0 : en animal) | il se rejette sur son arrière-train, pattes avant raides, tête levée, langue pendante | il plonge sur ses pattes avant écartées, tête basse au ras du sol |

### 6.1 Production (agent, Artlist)

- **Générateur** : GPT Image 2.5 en image à image, par Artlist, qualité haute, sortie 2K, fond opaque, deux versions par planche (280 crédits la paire ; 11 planches, 3 080 crédits). La meilleure des deux est gardée, planche entière (les deux images d'une même planche se répondent).
- **Référence = la planche à remplir** : la garde actuelle (`<nom>-idle.png`) recadrée sur sa silhouette, posée sur le gris `#808080` dans le **tiers gauche** d'une toile 16:9 (1820×1024 ; garde haute de 82 % au plus, pieds à 96,5 %), les deux autres tiers vides. Le générateur garde la mise en page, l'échelle et la ligne de sol. L'ours : toile 9:16 (1024×1820), trois rangées, la garde dans celle du haut.
- **Découpe** : `python scripts/slice-poses.py <nom> <planche>:3x1:idle,dazed-a,dazed-b --fond --contours --reference=src/assets/<nom>-idle.png --pieds --sol` (l'ours : `1x3`, sans `--contours`). `--pieds` pose chaque image sur les pieds de la garde existante : le générateur décale souvent la figure dans sa case (jusqu'à 105 px de toile pour l'ours, 100 pour Gorak), ce qui faisait faire un pas de côté à chaque alternance. `--elargir` : Gorak 40 px, Naraxes 44 px (le dos de Gorak et la queue de Naraxes sortaient de la toile). L'image A de l'ours, cabrée, dépassait le haut de sa toile de 16 px : réduite de 3 % autour de ses pattes, à la main.
- **Sources** : `logs/atelier/sources/<personnage>/dazed.png` (dont `gorak/`, `naraxes/`, `fanchon/`, créés pour l'occasion). Planches de contrôle : `logs/poses-<nom>.png` (la garde et les deux images ; elles remplacent les planches de contrôle des cinq premières postures).
- **Vérifié** : chaque paire en superposition sur la garde (mêmes pieds, sens opposés), puis rendue par `Fighter` dans Firefox sans interface, les deux images figées l'une après l'autre (onze apparences, côté gauche et côté droit retourné). **Pas vu** : la boucle dans un vrai combat (il faut la Peur ou le Coup de massue, hors kit : gravés en campagne, ou par la forge en tournoi et en saison).

Le prompt d'une planche (les deux lignes `MIDDLE PANEL` et `RIGHT PANEL` changent par personnage, d'après le tableau ci-dessus) :

```text
EDIT THIS IMAGE: it is a character sheet with three equal tall panels side by side (left third, middle third, right third). The LEFT panel already contains the character in their guard pose. Keep the left panel EXACTLY as it is.
Paint the SAME character twice more, in the MIDDLE panel and in the RIGHT panel: two frames of a "dazed / lost control" animation loop. The game alternates these two frames very fast while the character is stunned or terrified and loses their turn, so the body must visibly rock back and forth between them.

CHARACTER: exactly the same character as in the left panel: same face, body, proportions, outfit, colors, weapon and every detail, same painted fantasy illustration style, same rendering, same soft frontal lighting. Only the pose and the facial expression change.

THE TWO DAZED FRAMES:
MIDDLE PANEL — <image A>
RIGHT PANEL — <image B>

AMPLITUDE: push it hard, exaggerated and readable from far away on a TV, like a fighting-game stun animation: the torso is clearly tilted (at least 20 to 25 degrees from vertical), the lean is obvious in the silhouette, the head lolls, the weapon hangs loose and heavy. The two frames lean in OPPOSITE directions so the loop reads as a wobble.
FEET: in both dazed frames the feet stay planted in the same place, on the same spot of the ground as the guard, so that only the body above the feet sways; knees may buckle. Never airborne, never fallen, never kneeling on the ground.

CONSISTENCY: the character is the SAME SIZE in all three panels (same scale, same camera distance and height), all figures stand on the SAME ground line as the guard in the left panel, same three-quarter view facing RIGHT. Full body in each panel, nothing cropped, no part of one figure touching or crossing into another panel; leave clear grey space between the three figures.

OUTPUT: keep the plain flat uniform medium grey background (#808080) everywhere, no gradient, no ground, no shadow, no scenery, no text, no panel borders, no stars, no spirals, no symbols, no motion lines, no visual effects added around the head.
```

Exemple de lignes (Brokk) : `MIDDLE PANEL — Brokk, the stubborn dwarf who never retreats, rocks like a weighted toy that will not fall: he ROCKS BACKWARD toward the left on his heels, the whole stocky body tilted far back, eyes crossed, mouth agape in his beard, the great axe slipping back over his shoulder, braids and beard swinging.` et `RIGHT PANEL — Brokk ROCKS FORWARD toward the right, top-heavy, torso pitched far forward, the head of his great axe thudded onto the ground in front of him and both hands clinging to the haft to stay up, eyes crossed and dazed, beard and braids swinging forward. His boots never leave their spot.` Pour l'ours, le même gabarit en trois rangées empilées (`TOP`, `MIDDLE`, `BOTTOM PANEL`), sans un mot d'anatomie humaine (§ 0) : « on all four paws, never stands up like a man ».

**Un nouveau personnage** : ses deux images de perte de contrôle, avec ce gabarit et deux lignes tirées de sa personnalité ; dans `look.poses`, `dazed: [a, b]`. Sans elles, il tremble sous la Peur comme avant.
