# Style bible : génération d'images (ChatGPT Image)

Ce document fixe la direction artistique de Battler et donne des prompts prêts à copier. Le but : des images **cohérentes entre elles**, **originales** et **directement intégrables** au jeu.

> Le personnage `dwarf.png` est un placeholder qui provient d'un jeu ou d'une œuvre existante. Il doit être remplacé par une création originale avant toute diffusion publique. L'orc a été remplacé le 2026-10-19 par une création originale (`orc-idle.png` et ses postures). Ne jamais citer un jeu, un studio, un artiste ou un personnage existant dans un prompt.

## Par où commencer

L'utilisateur génère les images dans ChatGPT à partir des prompts de ce document, puis les dépose à la racine du projet. L'agent les traite, les range et met ce document à jour. Un autre agent tient la mécanique (`roster.ts`, `statuses.ts`, combat) : pour un réglage de code qui le concerne (échelle d'un personnage, branchement d'une icône sur un nouveau statut), on lui écrit une consigne, que l'utilisateur transmet.

| Demande | Où regarder | Outil |
| --- | --- | --- |
| Un personnage | Palette (section 1), gabarits de taille (section 2), bloc STYLE (section 3), gabarit et exemples (section 4) | `scripts/cutout-character.py` (fond gris `#808080`) |
| Une arène | Section 5 (style des décors, composition, prompt de référence, catalogue de lieux) | Compression en JPG |
| Un fond de menu | Section 5.1 (style des décors), puis section 6 (zones de l'écran) | Compression en JPG |
| Des icônes | Inventaire, règles et gabarit de planche (section 7) | `scripts/slice-icons.py` |
| Une image déposée | Section 8 (vérifier la transparence), section 9 (check-list) | `gio trash` sur la source |

Les scripts demandent numpy, pillow et scipy dans un environnement virtuel (à créer dans le scratchpad de la session). À la fin d'un travail : compléter l'inventaire ou l'historique concerné, et ajouter une ligne « Non publié » au `CHANGELOG.md` (la version est montée par l'agent du gameplay).

**En suspens au 2026-10-19 :** icônes Pourriture (malus), Brûlure, Vulnérable, Étourdi et Garde (section 7) ; `purification` terne, à refaire (section 7, historique v3)  ; `dwarf.png` à remplacer par une création originale (l'orc l'a été le 2026-10-19, avec ses postures).

---

## 1. Direction artistique

> Cette direction vaut pour les **personnages** et les **icônes**. Les **décors** (arènes et fonds d'écran) ont leur propre style, la gouache graphique, décidé le 2026-10-20 : voir la section 5.1.

**En une phrase :** de la high fantasy héroïque, stylisée et peinte à la main, comme les illustrations de personnages des grands MMORPG. Les couleurs sont franches et propres à chaque faction, les proportions sont volontairement exagérées pour qu'on distingue les races au premier coup d'œil, et les visages restent fins, nets et charismatiques.

La référence de ton est l'elfe (`elf.png`, chasseresse de la nuit générée en 0.30.1, qui remplace l'ancienne placeholder lie-de-vin) : cuir et tissus bleu nuit, filigranes et croissants de lune argentés, cape et plumes en lambeaux, yeux lumineux, silhouette élancée et très lisible. On vise ce niveau de finition et cette lisibilité, avec des designs originaux. Il ne faut jamais nommer le jeu ou le personnage d'origine dans un prompt.

**Le curseur :** on est entre deux écueils.
- Trop loin d'un côté : jeu mobile casual ou gacha (Candy Crush, Clash of Clans…). Visages ronds et simplets, gros yeux, sourires, couleurs bonbon, rendu plastique brillant, personnage « mignon » ou grossier.
- Trop loin de l'autre : dark fantasy réaliste et terne, couleurs délavées, proportions réalistes, personnages qu'on ne distingue plus en petit.

| Axe | Choix |
| --- | --- |
| Rendu | Illustration numérique **stylisée, peinte à la main** (« hand-painted stylized fantasy ») : formes nettes et lisibles, textures peintes (pas photographiques), reflets francs sur le métal, détails concentrés sur le visage, les épaulières, les mains et l'arme |
| Proportions | **Héroïques et exagérées**, pour distinguer les races : l'orc colossal, aux épaules et aux avant-bras énormes, aux mains larges et à la petite tête par rapport au torse ; l'elfe très élancée, à la taille fine et aux longues jambes, avec des oreilles très longues ; le nain trapu et presque aussi large que haut, avec une barbe imposante. Les épaulières et les armes peuvent être surdimensionnées. La tête, elle, ne doit **jamais** être grosse. |
| Visages | **Fins, anguleux et charismatiques** : pommettes et mâchoire dessinées, nez et bouche détaillés, petits yeux expressifs (ou lumineux), regard déterminé ou hautain. Ce sont des héros, pas des mascottes : jamais de traits ronds ou simplets, de gros yeux, de sourire niais ou de grimace. |
| Silhouette | Reconnaissable en noir uni à 64 px : un élément signature qui dépasse nettement (épaulière à cornes, capuche et carquois à plumes, hache, crête du casque) |
| Matières | Armures **ornementées** : filigranes et gravures en relief, bordures en métal contrastant, pointes, crânes, plumes, fourrure, gemmes serties. Le métal est peint avec des reflets nets, le cuir cousu, le tissu en lambeaux. Ni chrome, ni plastique brillant. |
| Couleurs | **Franches et saturées, mais harmonieuses** : une couleur dominante forte par faction, une couleur secondaire et un accent lumineux (gemmes, runes, yeux). Pas de couleurs pastel ni « bonbon », pas d'arc-en-ciel. |
| Lumière | Éclairage principal **de face et légèrement en hauteur**, neutre et chaud, avec un liseré de lumière froide discret sur les deux bords. Pas de lumière venant d'un seul côté, car le jeu retourne l'image d'un des combattants. |
| Ambiance | Épique et héroïque, avec un peu de menace ; usure et cicatrices possibles, mais pas de gore ni d'horreur |

### Palette

Le jeu est sombre (fond pierre `#0c0a09`, accents ambre `#fbbf24` et `#fde68a`). Les personnages doivent ressortir sur ce fond.

| Usage | Teintes |
| --- | --- |
| Neutres communs | Fer gris-bleu `#6b7280`, cuir brun `#7c4a2d`, fourrure crème `#e7dcc8` |
| Accent du jeu (or, runes, yeux) | Ambre `#f59e0b`, or pâle `#fde68a` |
| Orc | Peau vert olive `#7f8f3a` ; tissus bleu nuit et brun |
| Elfe | Depuis la 0.30.1, le modèle d'Elaria est la chasseresse de la nuit (ligne suivante). Sylwen en est la déclinaison verte (`hue-rotate(-110deg)`). L'ancienne placeholder était lie-de-vin `#7f1d3a`, avec des touches émeraude. |
| Nain | Barbe roux cuivré `#b45309` ; acier sombre et laiton gravé `#b08d3c` |
| Mort-vivant | Cape et tabard pourpre usé `#5b2a86`, cuir brun et acier rouillé, peau livide, yeux turquoise `#2dd4bf` |
| Humain (prêtre) | Robes et tabard ivoire `#f5efe0`, or bruni ; accent bleu roi `#1d4ed8` ; lumière sacrée dorée |
| Homme-lézard | Écailles vert jade sombre `#0f766e`, ventre sable `#d6c08a` ; cuir noir-brun ; yeux ambre `#f59e0b` |
| Chasseresse de la nuit | Cuir et tissus bleu nuit `#1e1b4b`, argent ; peau gris cendré ; lueur lunaire blanc-argent `#e0e7ff` |
| Humain (paladin zélote) | Tabard et étendard rouge sang `#b91c1c`, acier sombre ; écru `#e7dcc8` pour les sceaux et parchemins ; yeux et runes de feu sacré orangé `#f97316` |
| Ogre sauvage | Peau brun-rose terreux `#b07a5a` ; cuir brut, fer rouillé et cordes ; aucun accent lumineux (il est trop bête pour la magie) |
| Barde saltimbanque (Fanchon, Mélisande) | Bleu paon profond (pourpoint et collants à losanges bleu et crème), crème et cuivre ; notes de musique magenta lumineuses ; seule humaine joyeuse du roster |
| Druide (deux formes) | Vert mousse `#4d7c0f` et brun châtaigne `#7c4a2d` (cheveux, fourrure de l'ours) ; écorce et os ; lueur vert sève `#a3e635` (yeux, tatouages, amulette), identique dans les deux formes |

**Teinte dominante :** les variantes de coloris sont aujourd'hui obtenues en CSS (`hue-rotate`) sur la même image. Chaque personnage doit donc avoir **une couleur dominante claire** (la peau de l'orc, l'armure de l'elfe, la barbe et le laiton du nain), plutôt qu'un mélange de nombreuses couleurs saturées.

### Ce qu'on évite

Look jeu mobile casual ou gacha, personnage mignon ou mascotte, chibi, grosse tête, visage rond ou simplet, gros yeux, sourire niais, traits grossiers ou difformes, couleurs pastel ou bonbon, rendu plastique ou jouet, anime, photoréalisme, dark fantasy terne et délavée, contours noirs épais façon BD, néon, sci-fi, texte, logo, filigrane, décor derrière un personnage, ombre portée au sol, cadrage coupé, mains déformées, armes en double.

---

## 2. Contraintes techniques du jeu

### Personnages (`src/assets/<race>.png`)

| Contrainte | Valeur | Pourquoi |
| --- | --- | --- |
| Format | **1024×1536 (portrait 2:3)**, PNG | Le combattant est affiché en pied dans une colonne verticale |
| Fond | **Transparent**, avec un détourage propre (pas de halo blanc) | Superposé au fond de l'arène |
| Cadrage | En pied, de la tête aux pieds, avec une marge de 3 à 5 % ; les pieds touchent presque le bas | Le jeu aligne les combattants sur le sol |
| Orientation | Vue de **trois-quarts, tournée vers la droite** | Convention `facing: 'right'` ; le jeu retourne l'image pour le côté droit |
| Pose | Garde de combat, stable, les deux pieds au sol, l'arme en main | Les animations (charge, impact, KO) déplacent l'image entière |
| Tête | Bien visible, non masquée par l'arme, dans le tiers supérieur | Les portraits sont des recadrages zoomés de la même image (`look.portrait`) |
| Lumière | De face ou symétrique | L'image est retournée en miroir |

### Gabarits : taille et silhouette

**Règle de taille (0.40.0, décision de l'utilisateur) : une échelle resserrée, ni uniforme ni réaliste.** Chaque personnage a une taille relative à un humain (1,00), dans une fourchette étroite : du nain (0,86) à l'ogre (1,13). Il est donc impossible qu'un nain fasse la taille de l'ogre, mais on n'a pas non plus un ogre gigantesque face à un nain minuscule. Une première version « réaliste », avec un ogre deux fois plus grand que le nain, a été essayée puis rejetée : l'ogre devenait beaucoup trop gros et le nain beaucoup trop petit. Toutes les images sont affichées **à leur largeur naturelle**, si bien que la carrure vient du dessin. Un test vérifie l'ordre et les écarts (`modules.test.ts`).

Deux leviers donnent à chacun son empreinte :
- **la hauteur**, fixée par `look.scale` dans `roster.ts`. Le prompt n'y peut rien, puisque le générateur remplit toujours son image ;
- **la largeur de la silhouette**, fixée par le prompt (ligne `BUILD`). Sans consigne, GPT Image rend toutes les silhouettes à peu près aussi larges (rapport proche de 0,6).

| Gabarit | Personnages (taille) | Largeur / hauteur du corps (arme exclue) | Ligne `BUILD` à coller |
| --- | --- | --- | --- |
| Titanesque | Ogre (1,13), druide en ours (1,10) | ~0,90 | `BUILD: titanic, the single largest creature of the roster, towering over an orc: enormous hunched mass, gut and shoulders spilling sideways, tree-trunk limbs; the body is nearly as wide as it is tall.` |
| Colossal | Orc (1,08) | ~0,75 | `BUILD: colossal and bulky, the biggest silhouette of the roster: huge shoulders, thick limbs, wide planted stance; the body is about three quarters as wide as it is tall.` |
| Grand | Mort-vivant (1,05), paladin (1,04) | ~0,55 | `BUILD: tall and imposing, broad-shouldered, upright; the body is a bit more than half as wide as it is tall.` |
| Grand et élancé | Elfes (1,03) | ~0,45 | `BUILD: very tall and willowy, a narrow vertical silhouette: slim limbs, narrow shoulders, no bulk; the body is less than half as wide as it is tall.` |
| Moyen | Humain, barde, druide de forme humaine (1,00) | ~0,55 | `BUILD: average human height and athletic build, balanced proportions; the body is a bit more than half as wide as it is tall.` |
| Ramassé | Homme-lézard, accroupi (0,97) | ~0,75 (queue comprise) | `BUILD: lean but low to the ground, crouched, the long tail stretching the silhouette sideways; the whole figure is about three quarters as wide as it is tall.` |
| Petit et râblé | Nain (0,86) | ~0,85 | `BUILD: short and extremely stocky, almost as wide as tall, massive barrel chest and arms, short thick legs; the body is nearly as wide as it is tall.` |

**Régler la taille d'un nouveau personnage :**
1. Choisir sa taille dans la fourchette, en le plaçant entre deux personnages existants (« un peu plus grand que l'orc » : 1,10). Ne pas sortir de 0,86 à 1,13 sans l'accord de l'utilisateur.
2. Mesurer la part de son image occupée par le personnage, en hauteur : environ 0,99 pour une image détourée au plus près, moins pour une toile à postures (0,84 pour l'orc).
3. Calculer **`scale = taille × 0,92 / part`**. 0,92 est la hauteur d'un humain dans le conteneur d'un combattant : 516 px sur les 560 de l'écran d'affrontement. Exemple pour l'orc : 1,08 × 0,92 / 0,845 = 1,18.
4. Pour une toile à postures, renseigner aussi **`headroom`**, la part vide au-dessus de la tête (0,13 pour l'orc) : la zone d'état et les effets s'y calent.
5. Vérifier par capture à côté du plus petit et du plus grand (nain, ogre).

Les éléments signature (halo du prêtre, arc, cornes) dépassent de la silhouette et comptent dans la hauteur de l'image : le corps de ces personnages paraît un peu plus petit. Avec des écarts aussi faibles, c'est acceptable. On corrige au cas par cas en relevant légèrement leur `scale`.

### Arènes (`src/assets/arena-<lieu>.jpg`)

| Contrainte | Valeur | Pourquoi |
| --- | --- | --- |
| Format | Généré en **1536×1024** (paysage 3:2), agrandi ×4 puis livré en **2400×1600** JPG, sans recadrage | Fond de la scène de 1600×900 ; le jeu cadre l'image avec `focus` (voir section 5, « En bref ») |
| Composition | Un sol dégagé et plat sur le **tiers inférieur central** ; l'horizon vers 40 à 45 % de la hauteur | Les combattants se tiennent à gauche et à droite du centre, en bas ; l'image est cadrée à `50% 70%` |
| Premier plan | **Rien** dans le tiers inférieur, coins compris ; le sol part du bord bas de l'image | Les pieds des combattants touchent le sol : aucun ne doit sembler posé sur un objet ni caché derrière (voir section 5.2) |
| Centre | Peu de contraste et pas d'élément fort au milieu | L'interface (dés, journal) et les impacts s'y affichent |
| Personnages | **Aucun** personnage, ni créature, ni texte | Les combattants sont ajoutés par le jeu |
| Lumière | **Clair-obscur** : côtés sombres, une zone lumineuse au loin, sol en demi-teinte | Le jeu assombrit encore un peu le fond (`filter` de chaque arène, `brightness` 0,6 à 0,8) ; un décor clair partout noie les combattants |

---

## 3. Bloc de style à coller en tête de chaque prompt

> Pour les personnages. Les décors ont leur propre style : section 5.1.

```text
STYLE: original high-fantasy character art in the style of premium MMORPG character illustrations,
hand-painted stylized fantasy, crisp readable shapes, painted textures with sharp metallic highlights,
heroic exaggerated proportions (broad shoulders, oversized ornate pauldrons and weapons, strong hands),
but a normal-sized head with a refined, angular, charismatic face: defined cheekbones and jaw,
detailed nose and mouth, small intense eyes, determined or haughty expression.
Ornate armor with embossed filigree, engraved metal trims, spikes, gems, feathers, fur and tattered cloth.
Bold saturated but harmonious faction colors: one strong dominant color, one secondary color,
one glowing accent (gems, runes or eyes).
Soft frontal key light slightly from above with subtle cool rim light on both edges.
Epic, heroic, slightly menacing mood, no gore.
Original design, not based on any existing game, film or character.
AVOID: casual mobile game or gacha look, cute, chibi, mascot, big head, round soft or goofy face,
big eyes, silly smile, crude or deformed facial features, pastel or candy colors, glossy plastic toy render,
anime, photorealism, dull desaturated grimdark, thick black comic outlines, neon, sci-fi,
text, logo, watermark, signature, cast shadow, cropped limbs, extra fingers, duplicated weapons.
```

---

## 4. Gabarit : personnage

```text
[STYLE BLOCK]

SUBJECT: <race> <archetype>, <description physique>, wearing <équipement>, holding <arme>.
Signature element: <élément de silhouette>.
Dominant color: <couleur dominante>; <accent lumineux>.
BUILD: <ligne du gabarit choisi, section 2>
POSE: <attitude propre à l'archétype>, like <image mentale>: <appuis, position de l'arme et des mains>;
head fully visible.

FRAMING: full body from head to feet, three-quarter view facing RIGHT,
both feet on the ground, weapon not covering the face, head in the upper third,
small even margin around the figure, feet near the bottom edge.

OUTPUT: portrait 1024x1536, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery.
```

Méthode qui marche depuis la 0.30 :
- **Le bloc STYLE (section 3) en tête**, puis ce gabarit.
- **Une posture par archétype** (le prêtre solennel, le voleur accroupi, le paladin qui charge, l'ogre qui louche sur un papillon) : jamais la même garde générique pour tous.
- **Le gabarit de taille** (section 2) donne la ligne `BUILD` et le `scale` à mettre dans `roster.ts`.
- **Fond gris `#808080`**, puis `python scripts/cutout-character.py <source.png> src/assets/<race>.png apercu.png`. Le gris est voulu : ChatGPT ne rend pas de vraie transparence pour les personnages (section 8).
- **Une exception au bloc STYLE** se dit en tête du prompt (`STYLE EXCEPTION: …`, voir l'ogre), sinon le bloc l'emporte.
- **Un personnage à plusieurs formes** : un prompt par forme, dans la même conversation, la seconde avec l'image de la première jointe et la liste des éléments à garder identiques (voir le druide).
- **Lumière symétrique** : le jeu retourne l'image d'un des deux combattants.

### Planche de postures (0.40.0)

Un personnage peut avoir, en plus de sa garde, **cinq postures** que le jeu affiche au fil du combat : attaque, esquive, coup encaissé, K.O., victoire. Pas plus, pour garder la production légère, et **seulement des postures communes à tous les personnages**, jamais une posture liée à une capacité (décisions de l'utilisateur). Les planches de trois cases (POSTURES.md § 3.2 bis) en réunissent deux par image. Règles, moteur et intégration : [POSTURES.md](POSTURES.md). Ce qu'il faut retenir pour générer :
- **la garde d'abord**, avec le prompt du personnage : elle devient la référence ;
- **jamais une posture seule** dans une image : le générateur ne garde pas l'échelle d'une image à l'autre ;
- **une planche 1536×1024 en deux cases de 768×1024**, la **garde à gauche** (elle sert de règle), la posture à droite, sur le même gris `#808080` ;
- **joindre la garde** comme référence, dans la conversation du personnage. **Jamais un placeholder** issu d'une œuvre existante : les postures en recopieraient le design ;
- **même taille, même ligne de sol (3 % au-dessus du bas), même vue de trois-quarts vers la droite, même lumière** dans les deux cases ;
- puis `scripts/slice-poses.py`, qui aligne toutes les postures sur la garde et les recadre ensemble.

```text
[STYLE BLOCK]

REFERENCE: the attached image is this character. Keep EXACTLY the same character in both panels:
same face, body, proportions, armor, colors, weapon and every detail. Only the pose changes.

LAYOUT: two identical portrait panels side by side, 768x1024 each, with a thin clear gap between them.
LEFT PANEL: GUARD — <la pose de garde actuelle, reprise du prompt d'origine>.
RIGHT PANEL: <NOM DE LA POSTURE> — <ligne de la posture, POSTURES.md § 3.2>.

CONSISTENCY: the character is the SAME SIZE in both panels (same scale, same camera distance and height),
both figures stand on the SAME ground line, about 3% above the bottom edge of the panels,
same three-quarter view facing RIGHT, same soft frontal symmetric lighting.
FRAMING: full body in each panel, nothing cropped, no part of one pose crossing into the other panel,
room above the head for a raised weapon.

OUTPUT: landscape 1536x1024, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery, no text, no panel borders.
```

Lignes de posture (à adapter à l'archétype, par exemple : l'ogre esquive en pataud ; versions de l'orc dans POSTURES.md § 3.2) :
- `ATTACK — mid-attack, lunging forward toward the right, weapon swinging at full extension, front foot planted`
- `DODGE — evading sideways, body twisting and leaning away to the left, light on the feet`
- `HURT — recoiling from a heavy blow, torso twisted back, one arm raised to shield the face, grimacing, both feet still on the ground`
- `KO — defeated, collapsed on one knee or lying on the ground, weapon dropped beside` (un K.O. à genoux se lit mieux qu'un personnage allongé)
- `VICTORY — triumphant victory pose, weapon raised high, chest out, both feet planted`

### Prompts prêts à l'emploi

**Orc, Brute (Gorak)**
```text
SUBJECT: orc brute, colossal and massively muscular, huge shoulders and forearms, large hands,
head small relative to the torso, olive-green skin, short lower tusks, strong square jaw,
short dark hair, stern calm and confident expression, sharp well-defined facial features,
bare scarred torso crossed by leather straps,
one oversized spiked iron pauldron with two curved bone horns and white fur trim,
heavy engraved iron bracers and greaves, fur-lined belt with a beast-skull buckle with glowing amber eyes,
dark blue wrapped trousers, a massive two-handed iron cleaver held low and ready.
Signature element: horned pauldron on one shoulder. Dominant color: olive-green skin.
```

**Elfe, Rôdeuse (Elaria)**
```text
SUBJECT: elf ranger, very tall and slender woman, narrow waist, long legs, very long pointed ears,
pale cool skin, long blonde hair, refined angular face, high cheekbones, glowing eyes,
cold haughty gaze, deep wine-red hood and long cape torn into tatters at the hem,
ornate fitted armor with wine-red plates outlined by silver thorn-like filigree,
pointed pauldrons with tufts of white feathers, emerald gems set in the chest and bracers,
quiver of white-feathered arrows on the back, elegant longbow held low in one hand.
Signature element: hood and quiver of white feathered arrows. Dominant color: wine-red armor.
```

**Nain, Gardien (Brokk)**
```text
SUBJECT: dwarf guardian, short and extremely stocky, almost as wide as tall, massive arms,
head proportionate to the body, stern weathered face with a strong nose, thick brows and small sharp eyes,
huge braided copper-red beard with brass beard rings,
steel helmet with a tall brass engraved crest, heavy dark steel plate armor with brass geometric runes
glowing faintly amber, oversized rounded pauldrons, thick leather gloves, heavy armored boots,
a large single-bladed battle axe held in both hands at guard.
Signature element: raised battle axe and braided beard. Dominant color: copper beard and brass trims.
```

**Humain, Prêtre** (généré en 0.30.0 : `src/assets/human.png`, une prêtresse solaire à la masse sacrée ; la famille Ysolde / Bérengère est donc au féminin)
```text
SUBJECT: human battle priest, tall athletic man with heroic proportions (broad shoulders, strong hands),
normal-sized head, refined angular face with a short well-groomed dark beard, high cheekbones,
calm stern gaze with eyes glowing faintly gold, close-cropped dark hair,
long ivory-white robes and tabard embroidered with gold sun motifs, worn over burnished gold plate armor,
oversized round gold pauldrons engraved with radiant suns, a royal-blue sash and blue gems on the chest,
a heavy holy tome chained to the belt, prayer beads around the wrist,
a large flanged gold mace in one hand.
Signature element: a large gold sun-disc halo mounted on the back, behind the shoulders, rising above
and around the head (the head stays fully visible in front of it). Dominant color: ivory-white and gold.
BUILD: average human height and athletic build, balanced proportions;
the body is a bit more than half as wide as it is tall.
POSE: upright, solemn and commanding, like a holy warrior invoking his god before the fight:
chest open, chin slightly raised, feet planted wide and firm, the mace held high and diagonally
above the shoulder (not in front of the face), the other arm stretched forward with the palm open
and a sphere of golden holy light glowing in it, robes and tabard swaying.
```

**Homme-lézard, Voleur** (généré en 0.30.0 : `src/assets/lizardman.png`, une assassine lézarde aux dagues dorées ; famille Naraxes / Ssythra au féminin)
```text
SUBJECT: lizardfolk rogue, lean and wiry reptilian humanoid, long arms, digitigrade legs,
a long thick tail curving behind, sleek reptilian head with a narrow snout, small sharp amber eyes
with slit pupils, a crest of short spines and a frill along the back of the head, cunning predatory gaze,
dark jade-green scales with a sand-colored belly, fitted black-brown leather armor with many straps,
pouches and small throwing knives, a ragged dark hood and short tattered scarf around the neck,
one asymmetric leather and bronze pauldron, wrapped forearms, two curved daggers in reverse grip.
Signature element: long curved tail and twin reverse-grip daggers. Dominant color: dark jade-green scales.
BUILD: lean but low to the ground, crouched, the long tail stretching the silhouette sideways;
the whole figure is about three quarters as wide as it is tall.
POSE: low, coiled and sneaky, like an ambusher about to pounce: deep crouch with knees bent,
torso leaning forward, one clawed foot ahead of the other, both feet on the ground,
one dagger held forward and low, the other raised behind near the shoulder ready to stab,
tail stretched out behind for balance, head low but lifted and fully visible, eyes locked on the target.
```

**Elfe, Chasseresse de la nuit** (générée en 0.30.1 : `src/assets/elf.png`, modèle d'Elaria et de Sylwen)

Une archère sombre et mélancolique, à la cape déchirée et aux yeux qui luisent sous la capuche. On reprend l'archétype, mais aucun de ses signes connus : ni peau bleutée, ni yeux rouges, ni cuir vert sombre, ni armure à pointes noires. On la distingue d'Elaria (lie-de-vin, blonde, arc tenu bas) par sa palette bleu nuit et argent, son arc en croissant de lune et sa posture : elle bande son arc.

```text
SUBJECT: elf night huntress, very tall and slender woman, narrow waist, long legs, very long pointed ears,
ash-grey skin with a faint cool sheen, long silver-white hair in a thick braid over one shoulder,
refined angular face, high cheekbones, eyes glowing pale silver-white, melancholic and deadly calm gaze,
deep midnight-blue hood and a long cape torn into ragged strips like shadows at the hem,
a short mantle of dark grey owl feathers over the shoulders,
fitted midnight-blue leather armor with silver plates engraved with crescent moons and stars,
pointed silver pauldrons, small pale moonstone gems on the chest and bracers,
quiver of black-fletched arrows with silver tips on the hip,
a tall elegant silver longbow shaped like a crescent moon, its arrow tip glowing with cold moonlight.
Signature element: crescent-moon longbow and owl-feather mantle. Dominant color: midnight blue and silver.
BUILD: very tall and willowy, a narrow vertical silhouette: slim limbs, narrow shoulders, no bulk;
the body is less than half as wide as it is tall.
POSE: poised and lethal, like a sniper taking aim: standing tall in a long sideways archer stance,
front foot forward and back foot planted, both feet on the ground, the crescent bow held vertically
in the extended front arm, string fully drawn back to the cheek with an arrow nocked and aimed to the right,
the bow and string beside the face (never in front of it), cape and braid drifting behind.
```

**Humain, Paladin zélote** (généré en 0.31.0 : `src/assets/paladin.png`)

Un croisé fanatique, colossal, aussi massif qu'un orc : c'est l'exception humaine au gabarit moyen. Pour ne pas doubler le prêtre (ivoire, or, bleu, solennel), il est rouge sang et acier sombre, brûle d'un feu sacré orangé et se jette en avant. Son emblème est une épée flamboyante, inventée, et non un symbole religieux réel.

```text
SUBJECT: human zealot paladin, a giant of a man as massive as an orc, enormous shoulders and arms,
huge gauntleted hands, normal-sized head, refined but hard angular face, shaved scarred head,
short dark beard, eyes burning with orange holy fire, fanatic fervent expression,
heavy dark steel plate armor dented and battle-worn, gigantic layered pauldrons,
a long blood-red tabard emblazoned with a white flaming-sword emblem, ragged at the hem,
wax purity seals with ivory parchment strips and heavy chains hanging from the armor,
glowing orange runes engraved on the breastplate, a closed great helm hanging from the belt,
an oversized two-handed greatsword with runes smoldering with orange holy fire.
Signature element: a tall tattered blood-red war banner mounted on his back, rising above the head,
with the flaming-sword emblem. Dominant color: blood red and dark steel.
BUILD: colossal and bulky, the biggest silhouette of the roster: huge shoulders, thick limbs, wide planted stance;
the body is about three quarters as wide as it is tall.
POSE: fanatic and unstoppable, like a crusader charging into heresy: heavy stride forward,
both feet on the ground, the greatsword raised high in both hands above the shoulder ready to cleave
(not in front of the face), chest forward, mouth open shouting a battle prayer, tabard and banner whipping back.
```

**Ogre sauvage** (généré en 0.35.0 : `src/assets/ogre.png`)

Une montagne de chair, plus grosse que l'orc, et bête comme ses pieds. La bêtise passe par la posture et le visage (bouche ouverte, regard qui louche sur un papillon posé sur sa masse, main qui gratte le crâne), jamais par un style cartoon. Le bloc STYLE interdit les visages niais : le prompt lève cette interdiction pour l'expression seulement, et garde la peinture premium. Sa peau brun-rose le distingue de l'orc vert.

```text
STYLE EXCEPTION: this character is deliberately dim-witted. A dull, gaping, vacant expression is allowed
and wanted, but keep the same premium hand-painted style, realistic anatomy and detailed rendering:
NOT cartoon, NOT chibi, NOT a mascot.
SUBJECT: savage ogre, a towering mountain of muscle and fat, even bigger than an orc, huge pot belly,
massive sloped shoulders, enormous hands, a small head sunk between the shoulders, heavy brow,
tiny dull eyes, a slack open jaw with a strong underbite and two crooked lower tusks, tongue slightly out,
dusky reddish-tan skin covered in warts, scars and stitched wounds, a few tufts of coarse hair,
a dented iron cooking pot worn as a helmet, crooked on the head,
scavenged mismatched gear: one rusty iron pauldron tied with rope, a patchwork loincloth of hides,
thick ropes and chains wrapped around the belly, a belt of bones and trinkets,
bare feet wrapped in rags, a gigantic crude mace: a tree-trunk club capped with a rough block
of stone studded with rusty iron spikes.
Signature element: the gigantic stone-and-spike mace and the cooking-pot helmet. Dominant color: dusky reddish-tan skin.
BUILD: titanic, the single largest creature of the roster, towering over an orc: enormous hunched mass,
gut and shoulders spilling sideways, tree-trunk limbs; the body is nearly as wide as it is tall.
POSE: clumsy and dumb, like a brute who forgot there is a fight: slouched, belly pushed forward,
knees slightly bent inward, both bare feet planted on the ground, the huge mace resting on one shoulder,
the other hand scratching the side of his head under the pot, mouth hanging open,
eyes crossed staring at a small butterfly perched on the mace head; head fully visible.
FRAMING: full body from head to feet, three-quarter view facing RIGHT, both feet on the ground,
mace not covering the face, head in the upper third, small even margin, feet near the bottom edge.
OUTPUT: portrait 1024x1536, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery.
```

**Druide, deux formes** (généré en 0.35.0 : `src/assets/druid.png` et `src/assets/druid-bear.png`)

Un même combattant, qui alterne une forme humanoïde et une forme d'ours féral. Ce sont deux images, deux fichiers (`druid.png` et `druid-bear.png`) et deux gabarits : la forme humanoïde est moyenne (0,90), l'ours titanesque (~1,06). Quatre rappels font reconnaître la même personne :
1. **les bois** : une couronne de petits bois de cerf tressés de lierre sur la tête du druide, les mêmes bois qui sortent du crâne de l'ours, avec le même lierre ;
2. **l'amulette** : un grand disque de bois gravé d'une spirale, une pierre vert sève au centre, porté au cou par les deux formes ;
3. **les tatouages** : des spirales vert sève lumineuses sur le visage et les bras, qui réapparaissent dans la fourrure de l'ours (museau, épaules, pattes avant) ;
4. **le manteau** : un manteau vert mousse déchiré au col de fourrure châtaigne ; l'ours en garde des lambeaux noués aux épaules, et les bracelets de perles rouge ocre restent aux poignets.

La fourrure de l'ours est du même châtaigne que les cheveux du druide, et les yeux ont la même lueur.

Méthode : deux prompts, **dans la même conversation ChatGPT**. On génère d'abord la forme humanoïde, jusqu'à en être content. Puis on joint cette image au second prompt, qui demande « le même personnage transformé ». Une seule image avec les deux formes côte à côte les forcerait à la même hauteur et diviserait la résolution par deux. Et si l'ours est raté, on ne régénère que lui.

Prompt 1, forme humanoïde :
```text
SUBJECT: human druid of the wild, a lean and wiry man with a feral edge, long arms, strong hands
with dirty fingernails, normal-sized head, refined angular weathered face, high cheekbones,
short chestnut-brown beard, long wild chestnut-brown hair with small braids, bone and wooden beads,
eyes glowing sap-green, intense wary gaze,
a crown of small deer antlers wrapped in ivy and tiny leaves,
glowing sap-green spiral tattoos on the cheeks, forearms and the back of the hands,
a large carved wooden disc amulet with a spiral and a glowing sap-green stone in its center, on a leather cord,
a long tattered moss-green mantle with a thick chestnut bear-fur collar, ragged at the hem,
layered leather and bark armor, red-ochre beaded bracelets on both wrists, bare feet wrapped in leather,
a gnarled wooden staff topped by twisted roots holding a glowing sap-green stone.
Signature element: antler crown and wooden spiral amulet. Dominant color: moss green and chestnut brown.
BUILD: average human height and athletic build, balanced proportions;
the body is a bit more than half as wide as it is tall.
POSE: wild and on edge, like a man about to become a beast: slightly hunched forward, knees bent,
both feet planted, the staff planted firmly on the ground in the back hand,
the front hand raised and curled like a claw, fingers starting to turn into bear claws,
sap-green light swirling around the clawed hand, mantle stirring; head fully visible.
FRAMING: full body from head to feet, three-quarter view facing RIGHT, both feet on the ground,
staff not covering the face, head in the upper third, small even margin, feet near the bottom edge.
OUTPUT: portrait 1024x1536, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery.
```

Prompt 2, forme d'ours (joindre l'image validée du prompt 1) :
```text
Using the attached image as the character reference: this is the SAME druid, transformed into
his feral bear form. It must be instantly recognizable as the same person.
Keep IDENTICAL: the deer antlers wrapped in ivy (now growing from the bear's skull),
the carved wooden spiral amulet with its glowing sap-green stone (cord stretched around the bear's neck),
the glowing sap-green spiral tattoos (now glowing through the fur on the muzzle, shoulders and forelegs),
the red-ochre beaded bracelets (now around the thick forelegs), the sap-green glowing eyes,
torn strips of the same moss-green mantle and its chestnut fur collar knotted around the shoulders,
and the same chestnut-brown color for the whole fur.
SUBJECT: a huge feral werebear, standing upright on its hind legs, massive humped shoulders,
thick powerful forelegs ending in long dark claws, broad head with an open roaring maw,
shaggy chestnut-brown fur with small braids and bone beads tangled in it, a few moss and leaves in the fur.
Same art style, same lighting, same palette as the reference.
BUILD: titanic, the single largest creature of the roster, towering over an orc: enormous hunched mass,
gut and shoulders spilling sideways, tree-trunk limbs; the body is nearly as wide as it is tall.
POSE: rearing and furious, like a wild beast defending its forest: standing on both hind legs,
both feet on the ground, body leaning forward, forelegs spread wide with claws out,
head thrust forward and roaring, fur bristling; head and antlers fully visible.
FRAMING: full body from head to feet, three-quarter view facing RIGHT, both feet on the ground,
claws not covering the face, head in the upper third, small even margin, feet near the bottom edge.
OUTPUT: portrait 1024x1536, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery.
```

**Barde saltimbanque** (généré le 2026-10-19 : `src/assets/bard-idle.png` et ses cinq postures ; Fanchon, variante Mélisande ; branchée en 0.41.0)

Une ménestrelle de foire, joyeuse, qui joue du luth en dansant. Un premier essai « duelliste narquoise » a été rejeté par l'utilisateur : il voulait une humeur plus gaie et plus de musique. Le bloc STYLE pousse vers une carrure héroïque et un air menaçant ; l'exception lève les deux, pour une femme humaine de taille moyenne (environ 7,5 têtes), à côté du nain et de l'ogre. La garde joue du luth, rapière au fourreau ; la rapière sort à l'attaque. Les notes restent collées au corps ou au luth : `slice-poses.py` efface tout fragment isolé.

```text
[STYLE BLOCK]

STYLE EXCEPTION: this character is joyful and full of life, NOT menacing. A bright, warm, open expression
is wanted: a radiant confident grin, eyes sparkling, mid-song. Keep the same premium hand-painted style,
refined angular adult face and detailed rendering: NOT cartoon, NOT cute, NOT a mascot.
Proportions are those of a real athletic adult woman of average height, about 7.5 heads tall:
NO exaggerated bulk, NO oversized pauldrons, NO oversized weapon. Light performer's clothing, not armor.

SUBJECT: human bard, a joyful traveling minstrel and street acrobat, a lithe athletic woman,
normal-sized head, refined angular face, high cheekbones, freckles, sparkling eyes glowing faintly magenta,
singing with a radiant confident grin, jet-black hair in a long high ponytail tied with ribbons,
a wide-brimmed deep peacock-blue hat cocked to one side with a long sweeping magenta and cream plume
and a small copper music-note brooch,
a fitted harlequin doublet and leggings patterned with large diamonds in deep peacock blue and cream,
puffed slashed sleeves showing cream silk, a light laced leather bodice with copper studs,
a short cream half-cape fluttering, knee-high soft leather boots with copper buckles,
a belt hung with tiny copper bells, a small tambourine, a wooden flute and rolled sheets of music,
a slender rapier with an elegant swept copper hilt, sheathed at the hip.
She PLAYS an ornate long-necked lute of dark lacquered wood with copper inlays and a carved rosette,
held across her body on a wide embroidered strap.
Music made visible: glowing magenta musical notes and flowing ribbons of sound spiral out of the lute
and swirl around her, staying close to her body.
Signature element: the lute played across her body and the plumed wide-brimmed hat.
Dominant color: deep peacock blue; secondary cream and copper; glowing magenta notes as accent.
BUILD: average human height and athletic build, balanced proportions;
the body is a bit more than half as wide as it is tall.
POSE: playing mid-performance, like a minstrel leading a festival crowd: light on her feet, a lively
dance step with one knee slightly bent, both feet on the ground, body turned three-quarter to the right,
strumming the lute with flair, the lute neck pointing up and forward (never in front of the face),
head tilted up as she sings, plume, ponytail, ribbons and cape swaying with the rhythm;
head fully visible.
FRAMING / OUTPUT : ceux du gabarit.
```

Lignes de posture utilisées (planches A et B de trois cases, C de deux ; chaque planche rappelle l'exception : « joyful, realistic athletic proportions of an average-height adult woman ») :
- Attaque, refaite seule en planche de deux cases de 768 (demande de l'utilisateur : des postures plus amples, surtout le coup) : `ATTACK — a long, explosive fencing lunge toward the right, full extension: the front leg bent deep and far forward, the back leg stretched straight behind, the torso leaning low into the thrust, the rapier arm fully extended straight forward at chest height, the free arm flung back behind her for balance…`, avec « The pose uses the whole width of its panel, but the ENTIRE rapier, tip included, stays inside the right panel ». La première attaque, tassée dans une case de 512, avait la lame coupée. La fente a quand même débordé sur la case de la garde (cheveux, notes) : les deux figures ont été séparées par leurs contours, puis recomposées dans des cases plus larges avant `slice-poses.py` (voir POSTURES.md § 4).
- `DODGE — an acrobatic evasion away to the left: torso arched back, one knee lifted, the lute hugged close to her chest, the free hand holding her hat on her head, laughing`
- `KO — collapsed onto one knee, leaning on the lute planted upright beside her, head bowed, hat askew but still on her head, one lute string snapped, no glowing notes`
- `VICTORY — strumming a final triumphant chord on the lute, a burst of glowing magenta notes rising close above the instrument, chin raised, beaming radiant grin, rapier sheathed`
- `HURT — staggering back from a heavy blow, torso twisted, the free arm raised to shield the face, the lute clutched protectively against her side, hat knocked askew, wincing`

**Variantes** : aujourd'hui, la teinte est faite en CSS. Pour générer une vraie variante plus tard, on reprend l'image du personnage de base et on demande : _« Same character, same pose, same framing and style, only change: … »_.
- Murzug (Berserker) : peau rouge brique, peintures de guerre, plus de cicatrices.
- Sylwen (Sentinelle sylvestre) : armure vert forêt, motifs de feuilles.
- Grimbald (Briseur de fer) : acier brut grisé, barbe gris cendre, marteau de guerre à la place de la hache.

---

## 5. Gabarit : arène

Une arène peut être **n'importe quel lieu** du monde : une forêt, des égouts, la place d'une grande ville, un cimetière, un port, une mine… Ce qui fait l'unité du jeu, c'est le **rendu** et la **composition**, pas le décor.

**Un prompt donné à l'utilisateur est toujours complet**, prêt à coller d'un bloc. On ne lui donne jamais un bloc commun à reconstituer avec une fiche (demande expresse de l'utilisateur, 2026-10-20). Pour écrire une nouvelle arène, on part du prompt de référence (section 5.3) et on réécrit ses parties sur le lieu.

**En bref** (tout décor : arène, fond d'écran, illustration d'arche) :

| Point | Règle |
| --- | --- |
| Format | **Paysage 1536×1024 (3:2), toujours**, même pour une arche de l'accueil (le jeu la recadre). L'écrire en **première phrase** du prompt (_« A wide landscape image, 3:2 aspect ratio (1536x1024), wider than tall. »_), puis en dernière ligne (_« OUTPUT: landscape 1536x1024, wider than tall. »_) : ChatGPT ignore souvent une consigne de format donnée seulement à la fin |
| Style | Gouache graphique (section 5.1), pour tous les décors. Ni pour les personnages, ni pour les icônes |
| Lumière | Clair-obscur : côtés dans l'ombre, une seule zone très lumineuse au loin, sol de combat en demi-teinte (section 5.2) |
| Composition | Côtés vivants, centre calme, **rien dans le tiers inférieur** (section 5.2) |
| Prompt | Complet, prêt à coller ; aucune image de référence |
| Dépôt | L'utilisateur dépose les PNG à la racine, nommés selon leur rôle : `arena <lieu>.png` pour une arène tirée au hasard, le nom de l'écran sinon (`home.png`, `duel.png`, `tournoi.png`…). `arena swamp` est l'exception : réservé au combat test |
| Traitement | Agrandissement ×4 par IA (Real-ESRGAN, modèle `realesrgan-x4plus`, binaire macOS `realesrgan-ncnn-vulkan` téléchargé dans le scratchpad), réduction Lanczos à **2400×1600** (arches : 1800×1200), JPG qualité 82 progressif : de 0,5 à 1,2 Mo par image. Le 3:2 est gardé : le cadrage se règle dans le code (`focus` des arènes, `object-position` ou `preserveAspectRatio` des écrans) |
| Rangement | `src/assets/arena-<lieu>.jpg`, `menu-<écran>.jpg`, `arch-<mode>.jpg` ; source à la corbeille (`gio trash`) |
| Nom d'arène | Un **lieu-dit** (`name`) et le lieu qui l'entoure (`region`), comme sur une carte : « Les Pierres-Couchées, bois de Vaumorin ». Des noms qu'on croirait trouver sur une carte d'état-major, pas des titres épiques (« Marais du Chagrin ») |

### 5.1 Style des décors : la gouache graphique

Choisi le 2026-10-20, pour **tous les décors** : arènes et fonds d'écran (accueil, tournoi…). Il ne s'applique **ni aux personnages, ni aux icônes**, qui gardent la direction de la section 1.

**Pourquoi.** Le premier style (« environment painting » riche : lumières, bloom, reflets, particules, détails partout) donnait des images surchargées, qui se ressemblaient toutes et perdaient leur personnalité. L'utilisateur les jugeait trop « IA ». Trois pistes autour de la gouache ont été essayées sur la clairière en ruines : décor peint de film d'animation, gouache sur dessin au crayon, et gouache graphique. C'est la gouache graphique qui a été retenue.

| Axe | Choix |
| --- | --- |
| Technique | Gouache mate, aplats de couleur, légère texture de brosse sèche, bords nets |
| Formes | Simplifiées et géométriques, dans l'esprit d'un livre illustré du milieu du XXᵉ siècle ou d'un film d'animation stylisé : sapins en hauts triangles, buissons ronds, nuages en rubans, collines en courbes nettes, pierres en blocs simples |
| Détail | Économe : chaque objet en quelques coups de pinceau, les feuillages en masses |
| Profondeur | Trois plans, chacun dans sa propre valeur : structures sombres sur les côtés, plan moyen, lointain pâle et très simplifié |
| Lumière | **Clair-obscur marqué** : beaucoup d'écart entre les ombres et la lumière. Une seule idée de lumière ; les ombres sont des aplats plus sombres ; la lumière est peinte en aplats clairs, jamais en halo |
| Palette | Cinq ou six couleurs, nommées dans le prompt |
| Interdit | Bloom, lueurs, rayons, reflets brillants, particules, braises, poussière en suspension, brume en effet, contre-jour sur les bords, dégradés, rendu HDR ou 3D, textures hyper détaillées, photoréalisme |

**Pas d'image de référence pour les décors** (demande de l'utilisateur, 2026-10-20) : chaque prompt de décor se suffit à lui-même et ne parle d'aucune autre image. Chaque décor est une image neuve.

### 5.2 Composition : vivante sur les côtés, premier plan vide

Un décor sobre n'est pas un décor vide : une clairière avec une seule arche ennuie. Les règles :

- **Les côtés racontent quelque chose.** Chaque côté a quatre ou cinq éléments simples : une structure (arche, pilier, mur), un objet abandonné (charrette, râtelier, puits), une trace de vie (autel, offrandes, bannière) et un **petit animal caché** (chouette dans un tronc, renard dans les buissons, corbeau sur un mât). Les animaux sont permis, pas les monstres ni les personnes.
- **Le lointain vit.** Un repère fort (château, pont, ville), plus deux ou trois signes de vie : un hameau qui fume, un vol d'oiseaux, une route.
- **Le sol garde la mémoire des duels**, sur ses bords seulement : pierres à demi enterrées, piquets et cordes, traces de pas, un gant tombé.
- **Le centre reste calme** et peu contrasté : l'interface et les impacts s'y affichent.
- **Rien au premier plan.** Les combattants ont les pieds au sol, en bas de l'image. Le tiers inférieur ne porte donc aucun objet, ni souche, ni rocher, ni herbe haute, coins compris : aucun pied ne doit sembler posé dessus ou caché derrière. Les éléments des côtés se tiennent **derrière** le sol de combat, au fond de la clairière.
- **La bonne distance du sol**, comme dans les arènes actuelles : la caméra est à hauteur d'homme, à quelques mètres des combattants. Le sol court sans interruption du bord bas de l'image jusqu'au pied des éléments des côtés. En bas de l'image, on le voit à l'échelle d'un personnage en pied, ni en gros plan, ni au loin.
- **Ombre devant, lumière au loin** (retour de l'utilisateur sur la première série, 2026-10-20). Les images réussies ont beaucoup d'écart entre ombre et lumière : l'accueil (terrasse au crépuscule) et le tournoi. Le modèle à suivre est la terrasse : les côtés sont sombres, avec une seule zone lumineuse au loin, au centre, qui attire l'œil. Le sol de combat est en demi-teinte, plus sombre vers le bas, pour que les combattants ressortent. Les décors clairs partout (carrière en plein midi, désert de sel qui ressemblait à une banquise) écrasent la profondeur, et les personnages s'y confondent avec le fond. Le lac aux lanternes et la cour naine sont à la limite. Le spectacle se joue au premier plan.
- **Si l'image devient trop chargée**, on retire un ou deux éléments des côtés. On ne touche pas au style.

### 5.3 Prompt de référence

Clairière en ruines, dans le style et la composition retenus. Pour une autre arène, on garde tels quels le premier paragraphe (style), FIGHTING GROUND AND CAMERA (en changeant seulement la matière du sol), DEPTH, COMPOSITION, AVOID et OUTPUT. On réécrit SCENE, LEFT SIDE, RIGHT SIDE, DISTANCE, LIGHT AND SHADOW et COLOR. Puis on donne à l'utilisateur le prompt **entier**.

```text
A wide landscape image, 3:2 aspect ratio (1536x1024), wider than tall. A stylized fantasy background painted in matte gouache, with a strong graphic design sense, like a mid-century illustrated storybook or a stylized animated film. Shapes are simplified and geometric: pines as tall triangles, rounded bushes, ribbon-like clouds, hills in clean curves, stones as simple blocks. Flat colors with subtle dry-brush texture, crisp edges, a playful yet epic mood. Original location, not based on any existing film, book or game.

SCENE: a forest clearing used as a dueling ground, among the ruins of an old stone sanctuary. The place feels lived-in and full of small stories that reward a second look.

LEFT SIDE (standing at the back edge of the clearing, behind the fighting ground): a broken stone arch covered with ivy; at its foot, an abandoned wooden cart with a broken wheel and a few sacks. A tall pine with an owl peeking from a hollow in its trunk. A small stone shrine with candles and flowers left as offerings. A fox half hidden in the bushes, watching the clearing.

RIGHT SIDE (standing at the back edge of the clearing, behind the fighting ground): a single standing pillar with a carved face worn by time; a wooden pole with a torn red banner and a raven perched on top. An old weapon rack with two dented shields and a spear. A stone well with a wooden bucket. A fallen statue head lying in the grass, covered with moss.

FIGHTING GROUND AND CAMERA: the camera stands at human eye level, a few meters from where two fighters will stand. A wide, flat, empty clearing of bare earth and short grass runs without interruption from the very bottom edge of the image up to the foot of the side elements, across the whole width. Nothing at all in the bottom third of the image, corners included: no stump, no rock, no tall grass, no object, so the fighters' feet will clearly stand on the ground. At the bottom edge, the ground is seen at the scale of a standing person, neither a close-up nor far away. Only on the back edges of the clearing: a ring of half-buried stones, a few wooden stakes with rope, footprints and a dropped glove hinting at past duels.

DISTANCE (center): a river valley with an old stone bridge, a small hamlet with chimney smoke drawn as a curl, a ruined castle on a hill, a flight of birds, then a simple mountain silhouette.

DEPTH: three clearly separated planes, each in its own flat value: darker structures on the sides, mid-value trees and ruins, pale and very simplified distance.

LIGHT AND SHADOW: strong chiaroscuro, a rather dark image with a bright heart. The left and right sides are in deep shadow, dark silhouettes with only a few small warm lights. One luminous area of interest far away in the center, the brightest part of the image: the sunlit valley and castle. The fighting ground is in soft half-light, darker toward the bottom edge, with a pool of warm light reaching its middle. Light is painted as flat bright shapes, never as a glow.

COLOR: late afternoon. Limited palette: deep green, olive, warm ochre, grey-blue stone, brick red, pale sky blue.

COMPOSITION: straight-on, human eye level, horizon at about 40% of the height. The center is calm and low-contrast; the interest lives on the sides and in the distance.

AVOID: foreground objects, anything in the bottom third of the image, bloom, glow, light rays, lens flare, sparkles, particles, floating embers, dust motes, haze effects, rim light, gradients, glossy reflections, HDR look, hyper-detailed textures, photorealism, 3D render look, people, monsters, text, logo, watermark.

OUTPUT: landscape 1536x1024, wider than tall.
```

### 5.4 Varier les arènes

Chaque arène joue sur six axes. **Une nouvelle arène doit changer au moins trois axes** par rapport à toutes celles qui existent, et sa **palette dominante doit être nouvelle** : c'est elle qui se remarque le plus une fois le fond assombri par le jeu.

| Axe | Possibilités |
| --- | --- |
| Type de lieu | Nature, ville, souterrain, sacré, ruine, frontière, magique |
| Intérieur / extérieur | Ciel ouvert, semi-couvert (cour, cloître, quai), sous un toit, sous terre |
| Heure | Aube, plein jour, fin d'après-midi, crépuscule, nuit |
| Météo | Clair, brume, pluie, neige, vent de sable : dessinés en formes simples (flocons, traits de pluie, bandes de brume en aplat), jamais en particules |
| Source de lumière | Soleil, lune, torches, braseros, forges, cristaux, magie, puits de lumière |
| Palette dominante | Vert et or, gris acier et orange, bleu nuit et ambre, turquoise et vert, ocre et rouge, violet et argent… |

**Garde-fous pour les lieux sombres** (égouts, cimetière, caverne, nuit) : l'image peut être sombre, mais jamais sans lumière. Il faut une zone lumineuse franche au centre ou au fond, et une flaque de lumière sur le sol de combat. Le jeu assombrit encore le fond (`brightness 0.45`) : pour un décor déjà sombre, c'est l'intégration qui allège le filtre (`filter` dans `ARENAS`), pas le prompt qui éclaircit l'image. L'ambiance peut être inquiétante, mais pas horrifique : ni cadavres, ni sang, ni créatures.

**Garder le sol jouable** : quel que soit le lieu, le centre bas doit rester plat et dégagé. Il faut le dire explicitement pour les lieux qui s'y prêtent mal : l'eau des égouts reste sur les côtés, les tombes s'alignent sur les bords, les étals du marché s'écartent.

### 5.5 Catalogue de lieux

Idées de lieux, écrites pour l'ancien style. Ce ne sont plus des prompts à coller : pour en utiliser une, on écrit un prompt complet à partir du prompt de référence (section 5.3). On en reprend le lieu, les côtés, le sol et le lointain, mais pas les lueurs, les braises ou les particules, et on ajoute les détails vivants de la section 5.2. Les deux premières sont déjà générées (ancien style, à refaire).

Autres idées proposées le 2026-10-20 : la Main du Titan (duel sur la paume d'une statue colossale au-dessus d'une mer de nuages, à l'aube ; blanc nacré, or rose, bleu ciel), le Lac aux mille lanternes (ponton de fête sur un lac, la nuit ; indigo, vermillon, or), l'Échouerie de sel (navires échoués sur un désert de sel, au couchant ; blanc, corail, turquoise), le Temple de la marée basse (cour d'un temple marin découvert par la marée, au matin ; vert d'eau, corail, grès mouillé), la Carrière des colosses (statues géantes inachevées taillées dans la falaise, à midi ; marbre blanc, terre cuite, bleu de cobalt).

**Clairière en ruines** (`arena-ruins.jpg`, générée)
```text
LOCATION: an ancient forest clearing used as a fighting ground, with moss-covered ruins.
FRAMING ELEMENTS: broken stone arches and pillars overgrown with ivy, tall pines, torches on wooden posts, a torn red banner.
GROUND: packed earth and short grass.
BACKGROUND: misty valley with distant castle ruins and snowy mountains.
TIME AND WEATHER: late afternoon, light haze, volumetric light rays through the trees.
LIGHTING AND PALETTE: golden sunlight from the upper left; green, gold and warm stone.
```

**Cour de forteresse naine** (`arena-dwarf-fortress.jpg`, générée)
```text
LOCATION: a dwarven fortress fighting courtyard carved directly into a mountainside.
FRAMING ELEMENTS: huge carved walls with geometric runes and brass inlays, two giant bearded guardian statues holding axes, glowing forges, braziers, brass banners.
GROUND: large worn stone flagstones with brass inlaid lines.
BACKGROUND: a gigantic open gate onto snowy peaks.
TIME AND WEATHER: late afternoon, cold mountain air, light snow on the ledges, floating embers.
LIGHTING AND PALETTE: cool daylight through the gate against warm orange forge glow; steel grey, brass and orange.
```

**Égouts de la capitale**
```text
LOCATION: a vast vaulted sewer junction beneath a great city, old and monumental rather than filthy.
FRAMING ELEMENTS: massive brick arches and pillars, rusted iron grates, channels of water flowing along the left and right edges only, hanging chains, a few lanterns.
GROUND: a wide, flat central stone platform, dry and walkable, slightly wet reflections.
BACKGROUND: a large round tunnel opening, with a shaft of daylight falling from a grate in the ceiling.
TIME AND WEATHER: unknown hour underground, light mist above the water, dripping water.
LIGHTING AND PALETTE: pale daylight shaft from above and warm lantern glow; teal green, wet brick and amber.
```

**Grande place de la capitale**
```text
LOCATION: the main square of a great fantasy capital city, prepared for a public duel.
FRAMING ELEMENTS: tall half-timbered and stone buildings with balconies and colorful heraldic banners, market stalls pushed back to the edges, a stone fountain on one side.
GROUND: wide, flat cobblestone square, empty in the center, a circle of sand marking the dueling area.
BACKGROUND: a grand cathedral or palace facade with towers, far behind the square.
TIME AND WEATHER: bright midday, clear sky, a few pigeons and fluttering confetti.
LIGHTING AND PALETTE: bright sunlight from above; royal blue, white stone, gold and red banners.
```

**Cimetière ancien**
```text
LOCATION: an old hilltop cemetery with a ruined chapel, eerie and melancholic, not horrific.
FRAMING ELEMENTS: leaning gravestones and stone angels lined along the left and right edges, twisted dead trees, wrought-iron fence, a few candles.
GROUND: a flat, wide gravel path and trampled grass in the center, with no graves on it.
BACKGROUND: the ruined chapel with a broken stained-glass window, a large full moon behind it.
TIME AND WEATHER: night, ground fog, drifting pale will-o'-the-wisps.
LIGHTING AND PALETTE: strong cold moonlight lighting the path, warm candle accents; violet, silver and moss green.
```

**Port de nuit**
```text
LOCATION: a busy fantasy harbor quay at night, ships moored alongside.
FRAMING ELEMENTS: wooden cranes, stacked crates and barrels, coiled ropes, ship hulls and masts on the edges, hanging oil lamps.
GROUND: a wide flat wooden and stone quay.
BACKGROUND: the harbor water with a lighthouse and distant ships, reflections of lights on the water.
TIME AND WEATHER: night, light sea mist, gentle drizzle.
LIGHTING AND PALETTE: warm lamp light on the quay, lighthouse beam in the distance; deep navy blue and amber.
```

**Ruines du désert**
```text
LOCATION: the half-buried ruins of an ancient desert temple used as an arena.
FRAMING ELEMENTS: colossal broken statues and sandstone columns with carved hieroglyph-like patterns, torn cloth canopies.
GROUND: flat, compact sand over old stone tiles.
BACKGROUND: dunes and a huge setting sun through a broken temple gate.
TIME AND WEATHER: sunset, warm wind carrying sand.
LIGHTING AND PALETTE: low orange sun, long shadows; ochre, terracotta and turquoise accents.
```

**Caverne de cristaux**
```text
LOCATION: a huge underground cavern filled with giant glowing crystals, an old mining site.
FRAMING ELEMENTS: clusters of tall luminous crystals, wooden mine scaffolding, rails and carts on the edges.
GROUND: a flat natural stone floor, smoothed by time.
BACKGROUND: a deep chasm with an underground waterfall and distant glowing crystals.
TIME AND WEATHER: underground, floating glowing dust motes.
LIGHTING AND PALETTE: the crystals are the light source, bright enough to light the floor; cyan, violet and dark slate.
```

**Marais**
```text
LOCATION: a misty swamp with an old wooden platform used as a fighting ground.
FRAMING ELEMENTS: gnarled mangrove-like trees with hanging moss, wooden stilts, lanterns on poles, reeds.
GROUND: a large flat wooden platform raised above the water.
BACKGROUND: dark water, dead trees and a pale sun through the mist.
TIME AND WEATHER: early morning, thick mist, fireflies.
LIGHTING AND PALETTE: soft diffused light and warm lanterns; olive green, murky brown and pale yellow.
```

**Cathédrale en ruine**
```text
LOCATION: the nave of a vast ruined cathedral open to the sky.
FRAMING ELEMENTS: tall gothic columns, broken pews pushed to the sides, shattered stained-glass windows, fallen statues.
GROUND: flat marble floor with cracked patterns.
BACKGROUND: the choir with a giant rose window, light pouring through it.
TIME AND WEATHER: morning, dust floating in the light.
LIGHTING AND PALETTE: colored light beams from the stained glass; ivory stone, crimson and sapphire.
```

**Toundra gelée**
```text
LOCATION: a frozen lake in a northern tundra, surrounded by ancient rune stones.
FRAMING ELEMENTS: tall carved standing stones covered in frost, snow-laden pines, a burning bonfire on one side.
GROUND: flat thick ice covered with a thin layer of snow.
BACKGROUND: mountains under a sky with northern lights.
TIME AND WEATHER: night, light falling snow.
LIGHTING AND PALETTE: green and violet aurora with warm bonfire light; icy blue, white and emerald.
```

**Forge volcanique**
```text
LOCATION: a fortress-forge built over a volcanic caldera.
FRAMING ELEMENTS: black basalt walls, giant anvils and chains, channels of glowing lava along the edges, iron cauldrons.
GROUND: a flat black basalt platform with glowing cracks only at the edges.
BACKGROUND: a lava fall and a smoking volcano peak.
TIME AND WEATHER: dark ash-filled sky, embers in the air.
LIGHTING AND PALETTE: intense orange lava light from below; black, red and molten gold.
```

**Bibliothèque de mage**
```text
LOCATION: the central hall of a gigantic magical library tower.
FRAMING ELEMENTS: towering bookshelves, floating books and candles, brass astrolabes and ladders.
GROUND: a flat polished wooden floor with a large inlaid arcane circle.
BACKGROUND: a huge round window onto a starry sky, with a floating orrery.
TIME AND WEATHER: night, glowing arcane particles.
LIGHTING AND PALETTE: warm candlelight and blue arcane glow; deep purple, warm wood and gold.
```

### 5.6 Historique des arènes

| Fichier | Lieu | Palette | Remarques |
| --- | --- | --- | --- |
Première série en gouache graphique, intégrée le 2026-10-20. Elle remplace les deux arènes de l'ancien style (`arena-ruins.jpg`, `arena-dwarf-fortress.jpg`, retirées).

| Fichier | Nom en jeu | Lieu | Palette | Remarques |
| --- | --- | --- | --- | --- |
| `arena-glade.jpg` | Les Pierres-Couchées, bois de Vaumorin | Clairière en ruines, fin d'après-midi | Vert, ocre, pierre | Prompt de référence (5.3), première version encore claire : le plus assombri en jeu |
| `arena-dwarf-city.jpg` | La Cour-des-Enclumes, Durnhold | Cour d'une cité naine, porte sur la vallée enneigée | Gris acier, laiton, orange | Limite en luminosité, bon contraste ombre et lumière |
| `arena-lantern-lake.jpg` | Les Mille-Feux, lac Sorelle | Ponton de fête sur un lac, nuit | Indigo, vermillon, or | Limite en luminosité |
| `arena-mushroom-vale.jpg` | Les Chapeaux-Fols, val Brunelle | Vallée de champignons lumineux, pénombre | Violet, magenta, turquoise, or | Couleurs très saturées : désaturé en jeu |
| `arena-tide-temple.jpg` | Les Cloches-Noyées, anse de Morvoux | Temple marin à marée basse, soir d'orage | Bleu-vert, corail, or | Bon clair-obscur |
| `arena-sky-hand.jpg` | La Paume-du-Vieux, pic Solange | Paume d'une statue géante au-dessus des nuages, aube | Ardoise, or rose, pêche | Contre-jour |
| `arena-swamp.jpg` | Les Pilotis, marais de Gâtebois | Marais sur pilotis, nuit de pleine lune | Vert-noir, sarcelle, ivoire | **Réservé au combat test** (`TRAINING_ARENA`) : jamais au choix, jamais au hasard, sur aucun autre écran |

Ajouter une ligne à chaque nouvelle arène. Avant de choisir la suivante, regarder ce tableau pour changer au moins trois axes et la palette.

---

## 6. Gabarit : fond d'écran de menu

> **Style :** les fonds de menu suivent le style des décors (gouache graphique, section 5.1), le clair-obscur et le format paysage (section 5, « En bref »). Seul le portail de la sélection (`menu-portal.jpg`) est encore de l'ancien style ; il reste tel quel, à la demande de l'utilisateur. Le prompt du portail ci-dessous est donc de l'ancien style : on en garde les zones de l'écran, pas le rendu.

L'écran de sélection (`StartScreen.tsx`) affiche un fond illustré, assombri en CSS (`brightness(0.6)`), avec un vignettage et un dégradé en bas. Ses contraintes diffèrent de celles d'une arène :

| Zone de l'écran | Ce qu'il y a dessus | Ce que le fond doit offrir |
| --- | --- | --- |
| Haut, au centre | Titre « BATTLER » (bouton « ← Menu » en haut à gauche) | Zone sombre (plafond, voûte) |
| Centre | Médaillon « VS » | La zone la plus lumineuse de l'image, une lueur ambre douce, sans objet fort |
| Autour du centre | Les deux combattants | Fond doux et peu chargé |
| Tiers gauche et droit | Fiches de texte | Zones sombres, peu contrastées, simples |
| Bas (1/5) | Règles et bouton « COMBATTRE ! » | Sol sombre et uni |

Prompt validé, qui a donné `src/assets/menu-portal.jpg` (portail d'arène au crépuscule) :

```text
STYLE: original high-fantasy environment painting, hand-painted digital illustration,
painterly brushwork, atmospheric depth, rich warm colors, epic and solemn mood.
Original location, not based on any existing game.
AVOID: casual mobile game look, pastel or candy colors, characters, creatures, text, letters,
logo, watermark, bright or busy details near the edges.

SUBJECT: the grand entrance of an ancient fighting arena at dusk, seen from the inside of a
torch-lit stone hall. In the center background, a massive open stone archway leads to a
distant sunlit arena floor, with warm golden light and drifting dust pouring through it.
On both sides, tall dark stone pillars with hanging war banners (one deep crimson on the left,
one deep blue on the right), unlit iron braziers, old weapon racks in shadow.

COMPOSITION: symmetrical, straight-on view at human eye level. The brightest area is a soft
warm amber glow in the center, slightly above the middle, behind where the word "VS" will
be displayed. The left and right thirds are dark, low-contrast and simple, because text
panels will be placed over them. The bottom fifth is a dark, plain stone floor, because a
button bar will sit there. The top is dark vaulted ceiling fading into shadow. No strong
object directly in the center. Two characters will stand on each side of the center,
so the background behind them must stay soft and uncluttered.

LIGHTING: dim, warm and moody, overall dark image with deep brown and stone-grey shadows,
golden-amber light coming from the archway, faint torch glow on the pillars,
strong natural vignette toward the corners.

OUTPUT: landscape 1536x1024, no characters, no text.
```

Le fond étant lumineux au centre, tout élément posé dessus a besoin de son propre support sombre. C'est pour ça que le « VS » est un médaillon pierre cerclé d'ambre.

### Fond de l'écran d'accueil

`HomeScreen.tsx` (triptyque depuis la 0.47.0) affiche `menu-home.jpg` (2026-10-20) : un haut plateau au crépuscule, des croix de bois à gauche (des compagnons enterrés là), des chaînes de montagnes au loin. Il est légèrement assombri (`brightness(0.7)`), sans flou, avec un vignettage. Le fond passe derrière le triptyque : seuls les bords et le ciel restent vraiment visibles.

Prompt validé (2026-10-20), qui a donné `menu-home.jpg` :

```text
A wide landscape image, 3:2 aspect ratio (1536x1024), wider than tall. A stylized fantasy background painted in matte gouache, with a strong graphic design sense, like a mid-century illustrated storybook or a stylized animated film. Very pared-down and graphic: large flat areas of color, few shapes, mountains as clean angular peaks in flat layered silhouettes, grass as a few simple strokes, clouds as flat ribbons. Flat colors with subtle dry-brush texture, crisp edges, a quiet, melancholic and epic mood. Original location, not based on any existing film, book or game.

SCENE: a bare high-altitude plateau at dusk, swept by the wind, very empty and silent. Far away, several chains of mountains, layered one behind the other, each paler than the last.

THE GRAVES: on the left of the image, a few simple wooden crosses planted in the ground, as if someone had buried their companions here: five or six crosses of different heights, slightly leaning, one with a sword planted beside it, one with a helmet hung on it, one with a scarf tied around it and flapping in the wind. They stand as dark graphic silhouettes against the bright sky. A small pile of stones at the foot of one cross. A single crow sits on the tallest cross.

RIGHT SIDE: almost empty: the plateau going on, a lone weathered rock, a few tufts of grass bent by the wind.

CENTER (game logo and menu entries will be placed over it): calm and empty, only the plateau, the distant mountains and the sky. No strong shape, low contrast.

LIGHT AND SHADOW: strong chiaroscuro, a rather dark image with a bright heart. The plateau and the crosses are in deep shadow, dark silhouettes; the brightest part of the image is the last light of the sun just behind the farthest mountain chain, in the center, painted as a flat pale gold band on the horizon. The sky goes from that warm band to a deep blue-violet at the top. Light is painted as flat bright shapes, never as a glow.

COLOR: dusk. Limited palette: deep blue-violet, slate blue, dark olive, warm pale gold, ash grey, a single touch of muted red for the scarf.

COMPOSITION: wide, straight-on, human eye level, horizon at about 55% of the height. Lots of empty space; the crosses on the left balance the empty right. The top and the center stay calm.

AVOID: busy composition, bloom, glow, light rays, lens flare, sparkles, particles, haze effects, rim light, gradients, glossy reflections, HDR look, hyper-detailed textures, photorealism, 3D render look, people, monsters, skeletons, bodies, gore, text, letters, logo, watermark.

OUTPUT: landscape 1536x1024, wider than tall.
```

| Zone de l'écran | Ce qu'il y a dessus | Ce que le fond doit offrir |
| --- | --- | --- |
| Haut, au centre | Titre « BATTLER » (72 px) | Zone sombre et peu détaillée |
| Centre, ~1 100 × 560 px | Le triptyque : trois arches et leurs socles | Rien d'important : il est caché. Un sol ou une pénombre qui « porte » les arches |
| Bas, au centre | Lignes d'explication sous les socles | Sombre et uni |
| Coins haut gauche et haut droit | Boutons ronds Statistiques, Compendium, Son | Ombre, rien d'important |
| Bords gauche et droit | Vignettage ajouté en CSS | C'est la seule partie vraiment visible : torches, colonnes, bannières y ont leur place |

### Illustrations des arches de l'accueil

Chaque arche du triptyque (`HomeScreen.tsx`, constante `ITEMS`) affiche une illustration, recadrée par le SVG (`preserveAspectRatio`, en mode `slice`) dans une ogive. Depuis le 2026-10-20 : `arch-duel.jpg` (portail ouvert sur une arène au couchant, bannières rouge et bleue, corbeau), `arch-tournament.jpg` (porte du colisée, trophée d'or sur un socle à gauche, restes d'un combattant ; cadrée à gauche, `xMinYMid`). Combat test reprend `arena-dwarf-city.jpg` : le marais est réservé au combat lui-même.

- **format paysage 1536×1024**, comme tous les décors : ChatGPT rend mal le portrait et le jeu recadre de toute façon (l'arche centrale fait 340 × 470 px, les volets 288 × 404) ; le haut est coupé en ogive, les côtés sont perdus ;
- **sujet au centre** de la largeur (ou à gauche, avec un cadrage `xMinYMid`), dans le tiers du milieu de la hauteur ; le quart du bas reste sombre et calme : un dégradé s'y pose, et le socle du titre vient juste dessous ;
- une **marge** autour du sujet : au survol, l'illustration est agrandie de 7 % dans son cadre ;
- pas de texte ni de personnage reconnaissable du roster (l'écran n'a pas à changer quand le roster bouge) ;
- les trois forment une série : même heure, même palette chaude, chacune avec son motif (Combat test : salle d'entraînement, mannequins, râtelier de dés ; Duel : deux armes croisées sous un portail ; Tournoi : la porte du colisée, bannières et trophée).

Au repos, l'arche est assombrie en CSS (`brightness(0.62)`, désaturée) ; au survol, elle est affichée telle quelle. L'image doit rester lisible dans les deux états.

### Fond de l'écran de tournoi

L'onglet « Tournoi » de `StartScreen.tsx` a son propre fond, `menu-tournament.jpg` : l'entrée monumentale de l'arène vue **de l'extérieur**. C'est le pendant du portail vu de l'intérieur, pour qu'on sente qu'on change d'écran. Aucun personnage n'y figure : le fond suffit, et l'écran n'a pas à être refait quand on ajoute un personnage.

| Zone de l'écran | Ce qu'il y a dessus | Ce que le fond doit offrir |
| --- | --- | --- |
| Haut, au centre | Titre « BATTLER » (bouton « ← Menu » en haut à gauche) | Ciel sombre, haut des remparts dans l'ombre |
| Gauche, du tiers au centre | Un personnage en pied, pieds vers le bas | La porte ouverte et lumineuse juste derrière lui, en contre-jour |
| Moitié droite | Titre « Tournoi à élimination directe », texte et boutons | Mur de pierre sombre et uni, peu contrasté |
| Bas (1/5) | Pieds du personnage | Pavés sombres et unis |

Prompt validé, qui a donné `src/assets/menu-tournament.jpg` (gouache, 2026-10-20) : porte à 30 % de la largeur, rempart sombre à droite, coffre débordant d'or et restes d'un combattant dans le coin bas gauche.

```text
A wide landscape image, 3:2 aspect ratio (1536x1024). A stylized fantasy background painted in matte gouache, with a strong graphic design sense, like a mid-century illustrated storybook or a stylized animated film. Shapes are simplified and geometric: the gate as a clean rounded arch, walls as large simple blocks, banners as flat ribbons, pennants as triangles. Flat colors with subtle dry-brush texture, crisp edges, a festive yet solemn and slightly ominous epic mood. Original location, not based on any existing film, book or game.

SCENE: the monumental main gate of a grand tournament colosseum at dusk, seen from the paved plaza outside, from a slightly low angle so the walls feel colossal.

LEFT PART, THE GATE: the gate is the focal point, its center at about 30% of the width. A huge rounded stone archway with a raised portcullis and heavy open wooden doors. Through it, the bright sunlit arena: sand, curved tiers of stands, a small striped tent and a few flags. Above the gate, a carved stone crest of two crossed swords inside a laurel wreath (no letters), long crimson and deep blue banners on each side of the arch, two stone pillars with braziers framing the entrance. Behind, the top of the colosseum curving away.

FOREGROUND, BOTTOM-LEFT CORNER ONLY, at the very left edge of the image: a heavy open treasure chest overflowing with gold coins, jewels, a small crown and a golden goblet, coins spilling onto the paving. At its foot, the remains of a fighter who fell here earlier: a few bones and a skull half hidden under a torn cloak, a cracked helmet, a broken sword and a dented round shield. Everything painted simply, dark in shadow, with the gold catching a little warm light. This group stays at the far left edge and does not reach the space in front of the gate, where a hero will stand.

RIGHT HALF (dark and calm, text and buttons will cover it): a long, colossal stone rampart going away in perspective toward the right, made of large simple blocks in deep shadow, with a few tall dark banners hanging along it and battlements with pennants against the sky. Plain, dim and uniform, low contrast.

TOP RIGHT: a deep dusk sky, dark blue-violet with a few flat ribbon clouds and a thin warm band near the horizon, where the game title will sit.

GROUND: flat, plain paving stones in perspective, running from the very bottom edge of the image to the gate, across the whole width. Nothing on them except the chest group in the bottom-left corner. A flat shape of warm light spills from the gate onto the paving in front of it; the rest of the plaza is dark.

LIGHT AND SHADOW: strong chiaroscuro, a dark image with a bright heart. The brightest part of the image is the sunlit arena seen through the gate. The braziers are small flat warm lights. The right half and the foreground stay in deep shadow. Light is painted as flat bright shapes, never as a glow.

COLOR: dusk. Limited palette: deep blue-violet, dark stone grey, warm gold, burnt orange, crimson, deep blue.

AVOID: bright or busy details on the right half, objects in front of the gate, bloom, glow, light rays as haze, lens flare, sparkles, particles, embers, haze effects, rim light, gradients, glossy reflections, wet shiny paving, HDR look, hyper-detailed textures, photorealism, 3D render look, gore, blood, people, crowd, monsters, text, letters, logo, watermark.

OUTPUT: landscape 1536x1024, wider than tall.
```

---

## 7. Icônes d'interface

Chaque compétence, chaque statut et chaque bouton a son icône peinte : aucun emoji nulle part (règle de l'utilisateur depuis la 0.34.0, contrôlée par les tests). Les icônes sont générées par **planches** (une grille par lot), puis découpées par script. On ne remplace pas la typographie : flèches `←` `▲` `▼`, pastilles `①` `②`, symboles de lecture `▶` `❚❚`.

### Inventaire

L'inventaire sert aussi à éviter les doublons : avant de choisir un motif, vérifier qu'il n'est pas déjà pris (le sablier est `turns`, le cœur vert `regen`, l'écu l'Armure temporaire, les épées croisées `swords`…). Les identifiants sont les noms réels des fichiers `src/assets/icons/<identifiant>.png`.

| # | Identifiant | Où il apparaît | Motif |
| --- | --- | --- | --- |
| 1 | `swords` | Affrontement, Jouer, combat « joué » | Deux épées croisées |
| 2 | `trophy` | Tournoi, Champion | Coupe dorée à deux anses |
| 3 | `lightning` | Simuler, combat « simulé » | Éclair, lueur bleu électrique |
| 4 | `stats` | Bouton Statistiques | Trois barres montantes en bronze |
| 5 | `scroll` | Bouton Fiche | Parchemin roulé, sceau rouge |
| 6 | `dice` | Au hasard, Compléter | Dé à vingt faces ivoire |
| 7 | `event` | Événements | Étoile magique violette |
| 8 | `crit` | Critique assuré | Cible avec une flèche au centre |
| 9 | `shield` | Armure temporaire | Écu cerclé d'or |
| 10 | `poison` | Poison | Crâne, lueur verte toxique |
| 11 | `regen` | Régénération | Cœur vert lumineux |
| 12 | `weakened` | Affaibli | Rose rouge sombre fanée |
| 13 | `breach` | Brèche | Cœur rouge fendu |
| 14 | `sound-on` | Son activé | Cor de guerre et ondes sonores |
| 15 | `sound-off` | Son coupé | Même cor, barré en rouge |
| 16 | `turns` | Tours restants d'un statut | Sablier en bronze |
| 17 | `thorns` | Épines (nain) | Ronce épineuse enroulée |
| 18 | `lifesteal` | Vol de vie (mort-vivant) | Cœur pourpre traversé d'un filet de sang |
| 19 | `wind-fury` | Furie des vents (orc) | Tourbillon de vent avec deux lames |
| 20 | `evasion` | Esquive améliorée (elfe) | Plume prise dans une rafale |
| 21 | `precision-aura` | Aura de précision (elfe) | Tête d'aigle dorée, halo or pâle |
| 22 | `poison-aura` | Aura de poison (mort-vivant) | Encensoir de bronze, vapeurs vertes |
| 23 | `power-aura` | Aura de puissance (orc) | Gantelet serré, halo rouge orangé |
| 24 | `intimidation-aura` | Aura d'intimidation (nain) | Masque de guerre cornu, yeux rouges |
| 25 | `holy-aura` | Aura de sainteté (prêtresse) | Disque solaire doré, gemme bleue, halo ivoire |
| 26 | `purification` | Purification (prêtresse) | Sceau violet brisé par un rayon de lumière |
| 27 | `fear` | Peur (posée par la prêtresse) | Masque spectral hurlant, fumée violette |
| 28 | `decoction-aura` | Aura de décoction (Naraxes) | Dague trempée dans une fiole jaune-vert |
| 29 | `coin-flip` | Pile ou face (Naraxes) | Pièce d'or tournant sur la tranche |
| 30 | `lucky-strike` | Coup de chance (Naraxes) | Petit dé pyramidal jade étincelant |
| 31 | `coin-face` | Dé-pièce, côté face (`Coin.tsx`) | Pièce vue de face, profil de lézard |
| 32 | `coin-pile` | Dé-pièce, côté pile, 15 dégâts (`Coin.tsx`) | Pièce vue de face, deux dagues croisées |
| 33 | `retribution` | Rétribution (paladin) | Épée flamboyante plantée pointe en bas |
| 34 | `riposte` | Riposte (paladin) | Lame qui en pare une autre, étincelles |
| 35 | `immunity-aura` | Aura d'immunité (paladin) | Sceau de cire rouge, rubans ivoire, feu sacré |
| 36 | `waiting` | Patience (ogre) | Montre à gousset cabossée, chaîne rouillée |
| 37 | `life-bloom` | Graine de vie (druide) | Graine qui germe, lueur vert sève |
| 38 | `bark-skin` | Peau épaisse (druide) | Plaque d'écorce moussue |
| 39 | `fireflies` | Lucioles (druide) | Trois grosses lucioles en spirale |
| 40 | `charge` | Charge (druide en ours) | Tête d'ours qui fonce, traînées de vitesse |
| 41 | `claw` | Coup de griffe (druide en ours) | Patte griffue, trois entailles |
| 42 | `rot-aura` | Aura de pourriture (druide en ours) ; sert aussi, en attendant, au malus Pourriture | Bois de cerf pourri sous les champignons, halo brun-violet |
| 43 | `whistle` | Siffloter et le statut Sifflotement (barde, double 1) | Flûtiau de cuivre, notes en lumière corail |
| 44 | `false-note` | Fausse note, compétence et malus (barde, double 2) | Diapason de bronze fendu, onde brisée violet terne |
| 45 | `melodious-aura` | Aura mélodieuse (barde, double 3) et Ouverture (l'aura posée au début du combat) | Caisse de luth à rosace de cuivre, notes et halo magenta |
| 46 | `crescendo` | Crescendo (barde, double 4 : un coup de 12 depuis la 0.41.0, plus trois coups) | Trois notes-lames en escalier, traînée magenta ; le motif évoque encore trois coups, à refaire si besoin |
| 47 | `soloist` | Soliste (barde, double 5 : un coup de 15) | Une grosse note forgée en lame, éclat magenta |

**Icônes manquantes, à demander :** Pourriture (le malus subi par la cible, distinct de l'aura), Brûlure, Vulnérable, Étourdi et Garde (statuts « à venir »). En attendant, la zone d'état affiche l'initiale du statut.

### Règles de design des icônes

- **Un objet, une silhouette épaisse**, lisible à 20 px, sans cadre ni fond.
- **Aura = halo.** Un statut permanent (aura) est posé devant une lueur ronde et diffuse de sa couleur d'accent ; les autres n'ont que la lumière de l'objet. ChatGPT a tendance à mettre un halo partout (v2) : la distinction tient donc surtout au motif.
- **Malus = couleurs froides et maladives** (Peur : violet-noir, Pourriture : brun-violet), sans or triomphant.
- **Palette du personnage.** Les icônes d'un personnage reprennent les couleurs de sa ligne dans la palette (section 1) : ivoire, or et bleu pour la prêtresse, jade et jaune-vert pour Naraxes, rouge sang et feu orangé pour le paladin, vert sève et châtaigne pour le druide.
- **Pas deux verts toxiques.** Le vert toxique appartient à `poison` et `poison-aura` : les autres poisons et pourritures prennent une autre teinte (jaune-vert, brun-violet).
- **Rappeler le personnage** quand c'est possible : le sceau de l'Aura d'immunité pend à l'armure du paladin, le bois pourri vient de la couronne du druide.
- **Pas de symbole religieux réel** (croix comprise) : on invente les emblèmes (épée flamboyante, disque solaire).

### Gabarit de planche (à copier)

Une planche ne contient **que** les nouvelles icônes. On joint une ou deux planches précédentes (ou quelques icônes de `src/assets/icons/`) comme référence de style. Taille de grille : celle que le script déduira, soit le carré qui contient tous les noms (1 à 4 icônes : 2×2 ; 5 à 9 : 3×3 ; 10 à 16 : 4×4). Les cases en trop restent vides, en fin de grille.

```text
Create a single square image, 1024x1024, containing a sprite sheet of <N> game UI icons
arranged in a strict <G>x<G> grid (<G> columns, <G> rows). Each icon is centered in its own
invisible cell (1/<G> of the width and height), occupies about 70% of the cell,
and never touches or overlaps the cell borders. Leave clear empty space between icons,
glows included. The last <K> cells stay completely EMPTY.

BACKGROUND: fully transparent, real alpha channel. Do NOT paint a checkerboard pattern.
If transparency is not possible, use a perfectly flat, uniform pure black background (#000000)
with no gradient, no texture, no vignette.
NO grid lines, NO frames, NO labels, NO numbers, NO letters, NO text anywhere.

STYLE: exactly the same style, materials, lighting and scale as the attached icon sheets.
Original high-fantasy game UI icons, hand-painted stylized fantasy, in the style of
premium MMORPG interface icons. Single object per icon, bold and simple silhouette that
stays readable at 20x20 pixels, thick shapes, no thin details, no circular or square frame.
Crisp painted highlights, dark brown outline-like shading for contrast.
<MATÉRIAUX : par défaut « Dominant materials: aged gold and warm bronze », ou la palette du personnage>
Consistent lighting from the top-left, same level of detail, same scale as the attached sheets.
AVOID: emoji look, flat vector clip-art, cute or cartoon style, glossy plastic,
3D render, photorealism, drop shadows outside the object, text, real-world religious symbols.

AURAS: icons marked [AURA] are permanent auras: the object sits in front of a soft,
diffuse, round glow of its accent color (a glow, NOT a ring frame, NOT a solid disc).
Other icons have no background glow, only the light of the object itself.

ICONS, in reading order (left to right, top to bottom):
Row 1:
 1. <objet, matières, couleur d'accent> (<sens en deux mots>)
 2. ...
Row <G>:
 <N+1>. (empty cell, nothing drawn)
```

Découpe, noms dans l'ordre de la grille :

```sh
python scripts/slice-icons.py <planche.png> src/assets/icons nom1,nom2,... controle.png
```

### Planches passées : motifs demandés

Les prompts complets suivaient le gabarit ci-dessus. On ne garde ici que ce qui leur est propre, pour pouvoir refaire une icône.

**v1 (16 icônes, 4×4, or et bronze) :** 1. two crossed swords, steel blades with gold hilts · 2. a golden trophy cup with two handles · 3. a jagged lightning bolt, gold with pale electric-blue glow · 4. three vertical bars of rising height, carved bronze · 5. a rolled parchment scroll with a red wax seal · 6. a single ivory twenty-sided die with gold edges · 7. a four-pointed magic star burst, violet glow with gold core · 8. an archery target with an arrow in the bullseye · 9. a heater shield with gold rim and steel face · 10. a skull, bone-white, with toxic green glow and drip · 11. a green heart with a soft emerald healing glow · 12. a wilted dark red rose · 13. a red heart cracked in two halves · 14. a bronze war horn emitting curved sound waves · 15. the same horn with a bold red diagonal slash · 16. a bronze hourglass with golden sand.

**v2 (8 icônes, 3×3, or et bronze) :** 1. [AURA] a proud golden eagle head in profile, pale gold glow · 2. a single white feather caught in a swirling gust of wind, soft cyan streaks · 3. a dark crimson heart pierced by a thin flowing stream of blood, faint purple glow · 4. [AURA] a small bronze censer on short chains, ring of toxic green fumes · 5. a swirling whirlwind with two curved blades inside, pale silver-blue · 6. [AURA] a clenched armored bronze gauntlet fist, fiery red-orange glow · 7. [AURA] a horned bronze war mask, snarling fanged mouth, glowing red eyes, blood-red glow · 8. a coiled thorny bramble vine with bronze-tipped thorns.

**v3 (8 icônes, 3×3) :** rangée de la prêtresse en ivoire, or et bleu roi ; rangée de Naraxes en jade, bronze et poison jaune-vert. 1. [AURA] a radiant gold sun-disc emblem with a royal-blue gem, ivory holy glow · 2. a violet magic sigil shattering, struck by a beam of white-gold light · 3. a pale ghostly screaming wraith face, violet-black smoke (a curse, no gold) · 4. [AURA] a curved bronze dagger dipped into a vial of acid yellow-green poison · 5. a gold coin spinning on its edge, motion arcs · 6. a small jade four-sided pyramid die, golden sparkles · 7-8. [COIN] the two sides of the same gold coin, seen perfectly head-on, no glow : a lizardfolk profile (face), two crossed curved daggers (pile). Les faces de la pièce sont affichées en grand par `Coin.tsx` (exportées en 256 px, sans texte, côté pile gagnant).

**v4 (3 icônes, 2×2, acier sombre, émail rouge sang, feu sacré orangé) :** 1. a heavy dark steel greatsword plunging point-down, wreathed in orange holy fire, burst and cracks at the impact · 2. a dark steel blade parrying another blade, burst of orange sparks, curved slash trail · 3. [AURA] a blood-red wax purity seal stamped with a flaming-sword emblem, two ivory parchment ribbons, orange holy fire glow.

**v5 (7 icônes, 3×3) :** ogre en laiton rouillé ; druide humanoïde végétal (vert mousse, écorce, vert sève `#a3e635`), druide ours animal (châtaigne, griffes sombres). 1. a battered brass pocket watch, cracked glass, two thick hands, rusty chain · 2. a large seed cracking open with two sprouts, sap-green light · 3. a thick plate of gnarled bark shaped like hide armor, moss, sap-green veins · 4. three large glowing fireflies spiraling upward, sap-green and yellow trails · 5. the head of a furious chestnut bear charging right, speed streaks, dust · 6. a chestnut bear paw with dark claws, three glowing slash marks · 7. [AURA] a broken deer antler rotting under sickly fungi, spores, murky brown and dull violet glow, NOT toxic green.

**v6 (5 icônes, 3×3, cuivre, bois laqué, bleu paon, notes magenta épaisses ; « no sheet-music staff lines ») :** 1. a small polished copper penny whistle, two chunky notes, warm coral-pink healing light · 2. a cracked dull bronze tuning fork, jagged broken sound wave, sickly violet and grey, no gold · 3. [AURA] an ornate dark-wood lute body, copper rosette, magenta notes, round magenta glow · 4. three thick notes rising in a staircase, stems edged like blades · 5. one large note forged as a copper and steel blade, magenta burst.

### Résultat attendu et intégration

| Élément | Convention |
| --- | --- |
| Source | Planche déposée à la racine, puis mise à la corbeille après découpe (`gio trash`) |
| Fichiers | `src/assets/icons/<identifiant>.png` : PNG transparent, carré de 128×128, icône recadrée au plus près puis centrée avec une marge de 8 %, optimisé (`optipng -o5`) |
| Code | Ajouter le nom à `IconName` dans `src/components/Icon.tsx`, et relier chaque statut dans `STATUS_ICON` (identifiant du statut → nom de l'icône). Le test de `screens.test.tsx` exige une icône peinte pour tout statut en jeu. |
| Affichage | `<Icon name="…" />`, à 1,3 fois la taille du texte, alignée sur la ligne de base ; `className` pour une autre taille |
| Contrôle | Planche de contrôle (icônes sur fond pierre `#0c0a09`, à 64 et 20 px) regardée avant l'intégration |

**Le script `scripts/slice-icons.py`** (numpy, pillow, scipy, dans un environnement virtuel) :
- déduit la grille du nombre de noms (carré), ignore les cases vides ;
- détecte chaque icône et regroupe ses morceaux détachés (ondes, gouttes) par case ; il signale un morceau qui déborde (souvent une simple frange de halo : regarder le contrôle) ;
- gère un **vrai canal alpha** (rien à faire) ou un **damier peint** (retiré ; les lueurs deviennent semi-transparentes, les zones claires cernées d'un contour restent opaques) ;
- ne gère **pas encore un fond noir uni** : à ajouter le jour où une planche arrive ainsi.

### Ajouter ou refaire des icônes

- **Une icône ratée :** dans la même conversation ChatGPT, _« Keep the exact same sheet, only redraw icon 3 »_. Ou générer l'icône seule, planche jointe : _« Same style, materials, lighting and scale as the attached sheet. Single icon, centered, 1024x1024, transparent background: … »_, puis la découper avec un seul nom.
- **De nouvelles icônes :** compléter l'inventaire, remplir le gabarit, ajouter une ligne à l'historique.
- **Refaire tout le jeu :** modifier le gabarit, régénérer tout, noter la version.

### Historique des planches

| Version | Date | Icônes | Résultat |
| --- | --- | --- | --- |
| v6 | 2026-10-19 | 43 à 47 | Barde (Fanchon). Vrai canal alpha ; les franges de halo débordent (avertissements du script sans conséquence). Personnage : `bard-idle.png` et ses postures. |
| v5 | 2026-10-18 | 36 à 42 | Ogre et druide (0.35.0). Vrai canal alpha. Personnages : `ogre.png`, `druid.png`, `druid-bear.png`. |
| v4 | 2026-10-18 | 33 à 35 | Paladin (0.31.0). Damier peint, découpe sans retouche. Personnage : `paladin.png`. |
| v3 | 2026-10-18 | 25 à 32 | Prêtresse et Naraxes (0.30.0). Damier peint. **Défaut** : l'éclair blanc doré de `purification` est terne (confondu avec les cases claires du damier) ; à refaire avec une vraie transparence. |
| v2 | 2026-10-18 | 17 à 24 | Deux compétences par personnage de base. Vrai canal alpha. Halo sur toutes les icônes, pas seulement les auras. |
| v1 | 2026-10-17 | 1 à 16 | Damier peint, retiré par le script. Avis : très réussies pour les statuts, un peu chargées pour les boutons de menu (piste : `swords`, `trophy`, `stats`, `scroll`, `dice`, `sound-*` avec moins de lueur et une silhouette plus simple). |


---

## 8. Méthode de travail dans ChatGPT

1. **Une conversation par série.** On garde le même fil pour une série (les deux formes d'un personnage, les planches d'icônes), afin que le modèle garde le style.
2. **Image de référence.** On joint une image validée : _« Use the attached image as the style reference: same rendering, lighting, level of detail and framing. »_ Pour les icônes, joindre une ou deux planches précédentes.
3. **Prompts complets.** On donne toujours à l'utilisateur des prompts entiers, prêts à coller d'un bloc. Pas de bloc commun à assembler avec une fiche.
4. **Retouches ciblées.** _« Keep everything identical, only fix the left hand. »_
5. **Transparence : ce qu'on sait (vérifié le 2026-10-18).**
   - L'API d'OpenAI fait une vraie transparence (`background: "transparent"`, sortie `png`). L'application ChatGPT n'a pas d'option : le résultat est aléatoire, et le modèle peint souvent un damier dans les pixels. L'aperçu ne permet pas de distinguer un damier d'une vraie transparence.
   - Constaté sur nos sources : 2 planches d'icônes sur 6 avaient un vrai canal alpha (v2, v5), les 4 autres un damier peint. Les personnages ont tous été demandés sur gris, et sont tous arrivés en RGB.
   - **Toujours vérifier le fichier** avant de le traiter : `python -c "from PIL import Image; print(Image.open('x.png').mode)"` (RGBA = canal alpha ; il faut encore qu'une partie des pixels soit transparente).
   - Si un damier arrive, relancer dans la même conversation : _« Convert this into a real RGBA PNG with a true transparent alpha channel, no checkerboard. »_
   - Le détourage sur gris abîme les fourrures et cheveux fins. Piste non retenue pour l'instant (choix de l'utilisateur) : un script `scripts/generate-image.ts` qui appelle l'API avec une vraie transparence (clé API, images payantes).

## 9. Check-list avant d'intégrer une image

- [ ] Le fichier a été vérifié (mode RGB ou RGBA, damier ou vraie transparence) et traité en conséquence.
- [ ] Le personnage est en pied, entier, tourné vers la droite, sans halo de détourage (aperçu sur fond sombre et sur fond clair).
- [ ] Il n'y a ni texte, ni filigrane, ni ombre portée.
- [ ] La silhouette se reconnaît en petit (tuile de 64 px) et sa largeur correspond à son gabarit.
- [ ] La lumière ne choque pas quand l'image est retournée.
- [ ] Le style reste cohérent avec les autres personnages ; le design est original.
- [ ] Image recadrée, PNG optimisé, rangée dans `src/assets/` sous un nom kebab-case anglais ; source à la corbeille (`gio trash`).
- [ ] Dans `roster.ts` (tenu par l'agent du gameplay), `look` est ajusté : `facing`, `scale` calculé selon l'échelle resserrée (section 2), `headroom` pour une toile à postures, cadrage du portrait `{x, y, zoom}`.
- [ ] Pour des postures : planches avec la garde en première case, `slice-poses.py`, planche de contrôle `logs/poses-<nom>.png` regardée (mêmes pieds, même taille), check-list de [POSTURES.md](POSTURES.md) § 3.4.
- [ ] Pour une arène : 1920×1080, gouache graphique sans effets de lumière, sol dégagé au centre bas, rien au premier plan sous les pieds des combattants, vérifiée en combat.
- [ ] Pour des icônes : planche de contrôle regardée, PNG dans `src/assets/icons/`, `IconName` et `STATUS_ICON` à jour, inventaire et historique de la section 7 complétés.
- [ ] Aucun navigateur ne marche sur cette machine : dire à l'utilisateur quand un rendu n'a pas été vu en jeu.
