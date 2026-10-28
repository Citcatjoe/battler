# Style bible : génération d'images (ChatGPT Image)

Ce document fixe la direction artistique de Battler et donne des prompts prêts à copier. Le but : des images **cohérentes entre elles**, **originales** et **directement intégrables** au jeu.

> Tout le roster est original depuis la 0.65.0 : le dernier placeholder, `dwarf.png`, issu d'une œuvre existante, a été remplacé par un nouveau modèle de Brokk (`dwarf-idle.png` et ses postures), comme l'orc le 2026-10-19. Ne jamais citer un jeu, un studio, un artiste ou un personnage existant dans un prompt.

## Par où commencer

L'utilisateur génère les images dans ChatGPT à partir des prompts de ce document, puis les dépose à la racine du projet. L'agent les traite, les range et met ce document à jour. Depuis le 2026-10-22, l'agent peut aussi générer lui-même par Artlist, quand le serveur est branché dans sa session (section 8, point 6). Un autre agent tient la mécanique (`roster.ts`, `statuses.ts`, combat) : pour un réglage de code qui le concerne (échelle d'un personnage, branchement d'une icône sur un nouveau statut), on lui écrit une consigne, que l'utilisateur transmet.

| Demande | Où regarder | Outil |
| --- | --- | --- |
| Un personnage | Palette (section 1), gabarits de taille (section 2), bloc STYLE (section 3), gabarit et exemples (section 4) | `scripts/cutout-character.py` (fond gris `#808080`) |
| Une arène | Section 5 (style des décors, composition, prompt de référence, catalogue de lieux) | Compression en JPG |
| Un fond de menu | Section 5.1 (style des décors), puis section 6 (zones de l'écran) | Compression en JPG |
| Des icônes | Inventaire, règles et gabarit de planche (section 7) | `scripts/slice-icons.py` |
| Une image déposée | Section 8 (vérifier la transparence), section 9 (check-list) | `gio trash` sur la source |

Les scripts demandent numpy, pillow et scipy dans un environnement virtuel (à créer dans le scratchpad de la session). À la fin d'un travail : compléter l'inventaire ou l'historique concerné, et ajouter une ligne « Non publié » au `CHANGELOG.md` (la version est montée par l'agent du gameplay).

**En suspens au 2026-10-20 :** icônes **à refaire ou à créer** : **Saignement** et **Pourfendre** (0.68.0 et 0.70.0, planche v7 prête, section 7), **Épines acérées** à retoucher (même planche) ; **Fleur de vie** (le druide pose une Régénération, qui s'affiche avec le cœur vert générique `regen` : il lui faut sa propre icône, demande de l'utilisateur) ; Pourriture (malus), Brûlure, Vulnérable, Étourdi et Garde (section 7) ; `purification` terne, à refaire (section 7, historique v3).

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
| Titanesque | Ogre (1,13) | ~0,90 | `BUILD: titanic, the single largest creature of the roster, towering over an orc: enormous hunched mass, gut and shoulders spilling sideways, tree-trunk limbs; the body is nearly as wide as it is tall.` |
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

**Nain, Gardien (Brokk)** (le modèle de la 0.65.0, `dwarf-idle.png`, généré dans l'atelier des postures, s'écarte de ce prompt : nain torse nu, sans casque, cheveux et barbe roux cuivré tressés de laiton, pagne rouge brodé, bottes de cuir et de laiton, grande hache à un tranchant tenue en travers)
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

**Ogre sauvage** (généré en 0.35.0 : `src/assets/ogre.png` ; depuis la 0.65.0, `ogre-idle.png` et ses postures, même modèle)

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

**L'ours à quatre pattes (0.67.0)**. Le prompt 2 ci-dessus a donné l'ours debout de la 0.35.0. Depuis, l'ours est une bête à quatre pattes (règle de l'utilisateur, `POSTURES.md` § 0) : aussi haut que le druide, bois compris, et une fois et demie plus long que haut. Sa garde s'obtient en joignant l'ancienne garde (`logs/atelier/druid-bear.jpg`), qui donne le modèle (bois, amulette, tatouages, bracelets, lambeaux de manteau), pas la pose. **Pas de bloc STYLE des humanoïdes** (épaules, mains, visage, armure, armes) : il tirait l'ours vers des gestes d'homme. Prompt complet de la garde :

```text
STYLE: original high-fantasy creature art in the style of premium MMORPG creature illustrations,
hand-painted stylized fantasy, crisp readable shapes, richly painted fur, sharp highlights on claws, antlers and beads.
Real animal anatomy: this is a four-legged beast, a giant grizzly bear, with a bear's head, muzzle and body.
Bold saturated but harmonious colors: chestnut-brown fur dominant, moss green secondary, glowing sap-green accent.
Soft frontal key light slightly from above with subtle cool rim light on both edges.
Epic, wild, menacing mood, no gore. Original design, not based on any existing game, film or character.
AVOID: anthropomorphic bear, werebear standing like a man, upright posture, human arms, hands or fists,
punching, boxing, sword-swing or club-swing motion, kneeling, sitting like a person, human face,
armor, weapons, cute, chibi, mascot, cartoon, plush toy, glossy plastic render, anime, photorealism,
thick black comic outlines, text, logo, watermark, signature, cast shadow, cropped limbs, extra legs.

REFERENCE: the attached image is this creature. Keep IDENTICAL: the deer antlers wrapped in ivy growing from
the skull, the carved wooden spiral amulet with its glowing sap-green stone on a cord around the neck,
the glowing sap-green spiral tattoos in the fur (muzzle, shoulders, forelegs), the red-ochre bead bracelets
around the forelegs, the torn moss-green mantle strips and chestnut fur collar knotted around the shoulders,
the sap-green glowing eyes, the long dark claws and the same chestnut-brown fur.
CHANGE ONLY the stance: it no longer stands like a man. It is now a real giant feral bear on all four legs.

ANIMAL BODY LANGUAGE: the bear moves like a real grizzly in a wildlife painting.
When it stands or moves, it is on all four legs; its forelegs are LEGS, not arms: they run, leap, brace, pin and land,
they never rise above the line of the shoulders, never swing across the body, never reach out sideways
like an arm. Its weapons are its jaws, its mass and its weight. Never upright on the hind legs, never a punch,
never kneeling, nothing held in the paws, no human gesture.

BUILD: titanic, the single largest creature of the roster: a grizzly far bigger than a horse, massive humped
shoulders, thick forelegs, heavy hindquarters; seen on all fours the body is about one and a half times
as long as it is tall.
POSE: a menacing feral guard, like a grizzly about to charge: on all four legs, the forelegs planted wide and
braced with the claws spread, the humped shoulders raised, the head held low and thrust forward,
lips curled back on the fangs in a snarl, sap-green eyes locked on the enemy, tattoos glowing,
mantle strips hanging from the shoulders; head and antlers fully visible, not hidden by a paw.
HEIGHT RULE: the tips of the antlers are the highest point of the figure.

FRAMING: full body from antlers to paws, three-quarter view facing RIGHT, turned enough to the side that the
length of the body reads clearly, all four paws on the same ground line, small even margin around the figure,
paws near the bottom edge.

OUTPUT: landscape 1536x1024, plain flat uniform medium grey background (#808080), no gradient,
no ground, no shadow, no scenery.
```

Ses cinq planches de postures (deux cases en paysage empilées, la garde en haut) suivent le même principe : `POSTURES.md` § 0 et § 4.

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
| Lumière | Clair-obscur : côtés dans l'ombre, une seule zone très lumineuse au loin, sol de combat en demi-teinte (section 5.2). **Lumière froide nommée, jamais un bain orange** ; ombres sombres mais lisibles (section 5.2 bis) |
| Composition | **Une idée maîtresse monumentale**, des cadres sombres jusqu'au bord haut, moins d'objets mais plus gros (section 5.2 bis). Centre calme, **rien dans le tiers inférieur** (section 5.2) |
| Prompt | Complet, prêt à coller ; aucune image de référence. On part du prompt de référence (section 5.3) |
| Dépôt | L'utilisateur dépose les PNG à la racine, nommés selon leur rôle : `arena <lieu>.png` pour une arène tirée au hasard, le nom de l'écran sinon (`home.png`, `duel.png`, `tournoi.png`…). `training.png` est le décor réservé au combat test (jamais une arène ailleurs) |
| Traitement | Agrandissement ×4 par IA (Real-ESRGAN, modèle `realesrgan-x4plus`, binaire `realesrgan-ncnn-vulkan` téléchargé dans un dossier temporaire : version Ubuntu de la release v0.2.5.0 de Real-ESRGAN sur GitHub, version macOS avant), réduction Lanczos à **2400×1600** (arches : 1800×1200), JPG qualité 82 progressif : de 0,5 à 1,2 Mo par image. Le 3:2 est gardé : le cadrage se règle dans le code (`focus` des arènes, `object-position` ou `preserveAspectRatio` des écrans) |
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

- **Les côtés racontent quelque chose.** Chaque côté a trois ou quatre éléments simples, au pied de son grand cadre (section 5.2 bis) : une structure (arche, pilier, mur), un objet abandonné (charrette, râtelier, puits), une trace de vie (autel, offrandes, bannière) et un **petit animal caché** (chouette dans un tronc, renard dans les buissons, corbeau sur un mât). Les animaux sont permis, pas les monstres ni les personnes.
- **Le lointain vit.** Un repère fort (château, pont, ville), plus deux ou trois signes de vie : un hameau qui fume, un vol d'oiseaux, une route.
- **Le sol garde la mémoire des duels**, sur ses bords seulement : pierres à demi enterrées, piquets et cordes, traces de pas, un gant tombé.
- **Le centre reste calme** et peu contrasté : l'interface et les impacts s'y affichent.
- **Rien au premier plan.** Les combattants ont les pieds au sol, en bas de l'image. Le tiers inférieur ne porte donc aucun objet, ni souche, ni rocher, ni herbe haute, coins compris : aucun pied ne doit sembler posé dessus ou caché derrière. Les éléments des côtés se tiennent **derrière** le sol de combat, au fond de la clairière.
- **La bonne distance du sol**, comme dans les arènes actuelles : la caméra est à hauteur d'homme, à quelques mètres des combattants. Le sol court sans interruption du bord bas de l'image jusqu'au pied des éléments des côtés. En bas de l'image, on le voit à l'échelle d'un personnage en pied, ni en gros plan, ni au loin.
- **Ombre devant, lumière au loin** (retour de l'utilisateur sur la première série, 2026-10-20). Les images réussies ont beaucoup d'écart entre ombre et lumière : l'accueil (terrasse au crépuscule) et le tournoi. Le modèle à suivre est la terrasse : les côtés sont sombres, avec une seule zone lumineuse au loin, au centre, qui attire l'œil. Le sol de combat est en demi-teinte, plus sombre vers le bas, pour que les combattants ressortent. Les décors clairs partout (carrière en plein midi, désert de sel qui ressemblait à une banquise) écrasent la profondeur, et les personnages s'y confondent avec le fond. Le lac aux lanternes et la cour naine sont à la limite. Le spectacle se joue au premier plan.
- **Si l'image devient trop chargée**, on retire un ou deux éléments des côtés. On ne touche pas au style.

### 5.2 bis Une idée monumentale, pas un inventaire (2026-10-27)

Constat de l'utilisateur sur la série des décors de campagne (section 5.7) : des compositions « fantastiques » quand le décor porte une grande idée (Fanchon, Thaldrin, Morgrut, Naraxes), « quelconques » sinon (premier jet d'Ysolde, d'Ervald et d'Elaria). Les jets ratés étaient des **inventaires** : de petits objets alignés de chaque côté, tous à la même échelle, rien de grand, la moitié de l'image en sol vide, et un couchant orange qui noyait les détails. Réécrits avec les règles ci-dessous, ils ont été jugés « bien meilleurs », avec des « compositions superbes ».

1. **Une idée maîtresse, qui se dit en une phrase et occupe l'image.** La toile peinte déchirée sur la vraie foire (Fanchon), le chêne fendu moitié vert moitié brûlé (Thaldrin), la sainte-juge qui tient le fléau d'une balance dont les plateaux pendent de part et d'autre (Ysolde), les rangs de lances-tombes qui fuient vers un mausolée ouvert de l'intérieur (Ervald), deux archères colossales dont les flèches se croisent sur la lune (Elaria). Elle a son paragraphe, en tête, et le prompt la nomme (`CENTER, THE JUDGE (the dominant shape of the image)`, `THE RANKS (the dominant pattern of the image)`).
2. **Des cadres monumentaux.** Les bords gauche et droit portent de grandes silhouettes sombres (colonnes, if, statues, falaises) qui montent de derrière le sol de combat jusqu'au-delà du bord haut. Paragraphes `LEFT FRAME` et `RIGHT FRAME`.
3. **Un écart d'échelle écrit.** La forme maîtresse fait « ten times » ou « twenty times human size » ; la caméra est un peu basse (« slightly low so the statues feel colossal »).
4. **Moins d'objets, plus gros.** Trois ou quatre éléments au pied de chaque cadre, dont un petit animal. Le récit des côtés (section 5.2) reste, mais il sert l'idée.
5. **Une géométrie nommée.** Symétrie stricte, ou perspective à un point de fuite placé sur la forme maîtresse ; une ligne forte (le fléau horizontal, le V des flèches, les rangs qui convergent) mène l'œil à la zone lumineuse. Horizon à environ 45 % de la hauteur.
6. **Une lumière froide nommée, jamais un bain orange.** Midi blanc tombant d'un oculus, lune, aube pâle. Les ombres sont « deep blue shadow, dark but still readable » : sombres, mais on y lit les détails. Les notes chaudes se comptent (« two or three tiny candle points »). COLOR finit par « No orange. » et AVOID contient `orange or red light, warm color cast over the whole image, sunset`. Un couchant reste possible (Morgrut, Thaldrin), mais seulement comme une bande au loin, pas comme une lumière qui baigne toute l'image.
7. **Surprendre sans perdre le lien** (décor d'un personnage) : partir de son lore et de sa personnalité ([PERSONNAGES.md](PERSONNAGES.md)), écarter le cliché de sa race (elfe et forêt, orc et désert, homme-lézard et marais) en l'écrivant dans AVOID, et en garder une trace s'il relie (le marais vu par la vitre de la serre de Naraxes). Si l'utilisateur demande le cliché (« plus religieux, c'est ok », « oriente plus cimetière »), on le prend : la surprise passe alors par l'idée maîtresse.

### 5.3 Prompt de référence

La Passe-des-Archères, décor d'Elaria (2026-10-27, second jet), qui applique la section 5.2 bis ; il remplace la clairière en ruines du 2026-10-20 (`arena-glade.jpg`), un inventaire écrit avant ces règles. Pour un autre décor, on garde tels quels le premier paragraphe (style ; on adapte seulement la liste des formes au lieu), FIGHTING GROUND AND CAMERA (en changeant la matière du sol et ce qui borde son fond), DEPTH, AVOID (on y ajoute le cliché écarté) et OUTPUT. On réécrit SCENE, LEFT FRAME, RIGHT FRAME, DISTANCE, LIGHT AND SHADOW, COLOR et COMPOSITION, et l'on donne à la forme maîtresse son propre paragraphe quand elle n'est pas dans les cadres (`CENTER, THE JUDGE`, `THE RANKS`). Puis on donne à l'utilisateur le prompt **entier**. Les autres prompts complets validés sont dans [prompts-decors.md](prompts-decors.md).

```text
A wide landscape image, 3:2 aspect ratio (1536x1024), wider than tall. A stylized fantasy background painted in matte gouache, with a strong graphic design sense, like a mid-century illustrated storybook or a stylized animated film. Shapes are simplified and geometric: cliffs as tall clean planes, statues as bold simplified figures, bows as sweeping clean curves, hills as flat layered bands, ribbon-like clouds. Flat colors with subtle dry-brush texture, crisp edges, a cold, proud and breathtaking epic mood. Original location, not based on any existing film, book or game.

SCENE: the border pass of Lithmeren, a narrow gorge where the elven marches end. On both sides of the gorge, two colossal statues of elven huntresses are carved directly into the cliffs, twenty times human size, kneeling, hooded, their carved capes torn into long strips. Each draws a long crescent-shaped bow upward toward the center: their two giant arrows cross high above the gorge, both aimed at the full moon rising between them. At their feet, a stone watch terrace where the border scouts stand guard.

LEFT FRAME, THE FIRST ARCHER: the left statue fills the left side of the image from behind the fighting ground to beyond the top edge, the sweep of its bow arcing over the top-left. Fine silver lines inlaid in the stone of its bow and hood. At its foot, behind the fighting ground: a slender watch post with a lantern of cold white light, a rack of long bows, a hooded falcon on a perch.

RIGHT FRAME, THE SECOND ARCHER: the right statue mirrors the first, filling the right side to beyond the top edge, its bow arcing over the top-right. At its foot, behind the fighting ground: three round straw targets with arrows clustered tightly in the center, except one single arrow far off on the edge; a thin wine-red pennant on a pole; a white hare hiding at the base of the statue.

FIGHTING GROUND AND CAMERA: the camera stands at human eye level, a few meters from where two fighters will stand, slightly low so the statues feel colossal. A wide, flat, empty terrace of pale stone slabs runs without interruption from the very bottom edge of the image up to the feet of the statues and the side elements, across the whole width. Nothing at all in the bottom third of the image, corners included: no stump, no rock, no object, so the fighters' feet will clearly stand on the ground. At the bottom edge, the ground is seen at the scale of a standing person, neither a close-up nor far away. Only on the back edge of the terrace: a low parapet, a few spent grey-feathered arrows, a dropped archer's glove hinting at past duels.

DISTANCE (center): between the two statues, through the gorge, the moonlit marches below: layered hills as flat bands, a river shining like a silver ribbon, a line of tiny watchtowers each with one small light, a flight of birds, and the huge full moon low in the sky, exactly where the two arrows point.

DEPTH: three clearly separated planes, each in its own flat value: the two dark colossal statues framing the sides, the mid-value gorge walls, the pale and luminous moon and marches.

LIGHT AND SHADOW: strong chiaroscuro, a dark image with a bright heart. The brightest part of the image is the full moon and the sky around it between the statues. Cold moonlight catches the inner faces of the statues and their bows as flat pale planes, giving them volume, while their outer sides fall into deep blue shadow, dark but still readable. The terrace is in soft half-light, darker toward the bottom edge, with a pool of pale moonlight reaching its middle. Light is painted as flat bright shapes, never as a glow.

COLOR: night. Limited palette: midnight blue, silver-white, cold teal shadow, pale moon cream, a single touch of wine red. No orange.

COMPOSITION: strict symmetry, straight-on, horizon at about 45% of the height. The two statues and their bows form a huge frame, and the crossing arrows form a bold V that leads the eye to the moon. The center of the terrace stays calm and low-contrast.

AVOID: forest, trees in the foreground, orange or warm light, red cast, foreground objects, anything in the bottom third of the image, bloom, glow, moon halo, light rays, lens flare, sparkles, stars as glitter, particles, floating embers, dust motes, haze effects, rim light, gradients, glossy reflections, HDR look, hyper-detailed textures, photorealism, 3D render look, people, monsters, text, letters, logo, watermark.

OUTPUT: landscape 1536x1024, wider than tall.
```

### 5.4 Varier les arènes

Chaque arène joue sur sept axes. **Une nouvelle arène doit changer au moins trois axes** par rapport à toutes celles qui existent, et sa **palette dominante doit être nouvelle** : c'est elle qui se remarque le plus une fois le fond assombri par le jeu. Son **idée maîtresse** aussi (section 5.2 bis).

| Axe | Possibilités |
| --- | --- |
| Type de lieu | Nature, ville, souterrain, sacré, ruine, frontière, magique |
| Intérieur / extérieur | Ciel ouvert, semi-couvert (cour, cloître, quai), sous un toit, sous terre |
| Heure | Aube, plein jour, fin d'après-midi, crépuscule, nuit |
| Météo | Clair, brume, pluie, neige, vent de sable : dessinés en formes simples (flocons, traits de pluie, bandes de brume en aplat), jamais en particules |
| Source de lumière | Soleil, lune, torches, braseros, forges, cristaux, magie, puits de lumière |
| Palette dominante | Vert et or, gris acier et orange, bleu nuit et ambre, turquoise et vert, ocre et rouge, violet et argent… |
| Idée maîtresse (section 5.2 bis) | Statue ou figure colossale, rangs qui convergent, arbre ou monument fendu, décor dans le décor, objet géant (balance, arc, porte seule)… Jamais deux fois la même |

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
| `arena-glade.jpg` | Les Pierres-Couchées, bois de Vaumorin | Clairière en ruines, fin d'après-midi | Vert, ocre, pierre | Premier prompt de référence (2026-10-20, remplacé en 5.3 le 2026-10-27), première version encore claire : le plus assombri en jeu |
| `arena-dwarf-city.jpg` | La Cour-des-Enclumes, Durnhold | Cour d'une cité naine, porte sur la vallée enneigée | Gris acier, laiton, orange | Limite en luminosité, bon contraste ombre et lumière |
| `arena-lantern-lake.jpg` | Les Mille-Feux, lac Sorelle | Ponton de fête sur un lac, nuit | Indigo, vermillon, or | Limite en luminosité |
| `arena-mushroom-vale.jpg` | Les Chapeaux-Fols, val Brunelle | Vallée de champignons lumineux, pénombre | Violet, magenta, turquoise, or | Couleurs très saturées : désaturé en jeu |
| `arena-tide-temple.jpg` | Les Cloches-Noyées, anse de Morvoux | Temple marin à marée basse, soir d'orage | Bleu-vert, corail, or | Bon clair-obscur |
| `arena-sky-hand.jpg` | La Paume-du-Vieux, pic Solange | Paume d'une statue géante au-dessus des nuages, aube | Ardoise, or rose, pêche | Contre-jour |
| `arena-swamp.jpg` | Les Pilotis, marais de Gâtebois | Marais sur pilotis, nuit de pleine lune | Vert-noir, sarcelle, ivoire | Décor du combat test en 0.62.0, arène ordinaire depuis la 0.63.0 |
| `arena-terrace.jpg` | Le Pas-des-Comètes, col d'Aubrelle | Terrasse en altitude, pluie d'étoiles filantes, vallée et arène au loin | Violet, rouge braise, ambre | 0.63.0. Tirée du prompt de la terrasse prévu pour l'accueil |
| `arena-training.jpg` | Le Pré-aux-Guetteurs, forêt de Brandeval | Clairière d'entraînement à l'aube, brume, yeux dans les fourrés | Bleu-vert, pêche, gris | **Réservée au combat test** (`TRAINING_ARENA`, 0.63.0) : jamais au choix, jamais au hasard, sur aucun autre écran |

Ajouter une ligne à chaque nouvelle arène. Avant de choisir la suivante, regarder ce tableau pour changer au moins trois axes et la palette.

### 5.7 Décors de campagne : l'adversaire chez lui (2026-10-27)

En campagne, on affronte chaque adversaire chez lui (demande de l'utilisateur) : un décor par personnage du roster, plus le Colosse, qui suit les règles d'une arène (sol dégagé, tiers bas vide) et la section 5.2 bis. Le lieu part du lore (`lore` dans `roster.ts`, [PERSONNAGES.md](PERSONNAGES.md)) et écarte le cliché de la race, sauf demande contraire. Générés par l'utilisateur et intégrés le 2026-10-27 (0.123.0) : `HOME_ARENAS` dans `arenas.ts`, fichiers `arena-<lieu>.jpg` ; l'écran d'affrontement de campagne montre l'arène de l'adversaire à la place du sélecteur. Prompts complets des décors retenus : [prompts-decors.md](prompts-decors.md).

| Personnage | Lieu-dit | Idée maîtresse | Palette | Jugement de l'utilisateur |
| --- | --- | --- | --- | --- |
| Fanchon | Les Tréteaux, foire de Clairbourg | La scène d'un théâtre ambulant, toile peinte déchirée sur la vraie foire | Bleu paon, magenta, crème, bois miel | « Fantastique » |
| Thaldrin | Le Chêne-Fendu, lande de Garance | Un chêne titanesque fendu par la foudre, moitié vert, moitié brûlé, sur une lande d'orage | Ardoise, charbon, mousse, miel, braise | « Fantastique » |
| Morgrut | Les Grands-Soleils, moulin de Brévanne | Le champ de tournesols d'un ogre heureux, épouvantail en armures, moulin aux ailes cassées | Or tournesol, sienne, olive, prune, turquoise | « Fantastique » |
| Naraxes | La Serre-Gagnée, Sszeth | Une serre de luxe gagnée aux dés : damier, plantes vénéneuses, partie abandonnée ; le marais seulement derrière la vitre | Chartreuse, laque noire, or, bordeaux | « Fantastique » |
| Ysolde | Le Fléau, sanctuaire d'Aurelhaven | Une sainte-juge colossale au masque de soleil tient une balance : une plume à gauche, des chaînes brisées à droite | Ivoire, citron pâle, cobalt, ombre ardoise | Second jet (le premier, cour méditerranéenne au couchant, était « quelconque ») : bien meilleur |
| Ervald | Le Champ-des-Lances, Ostremort | Cimetière militaire : soldats enterrés debout sous leur lance et leur casque, en rangs, vers un mausolée ouvert de l'intérieur | Bleu-noir, violet, argent froid, os | Second jet (le premier, siège figé dans le givre, était « quelconque ») : bien meilleur |
| Elaria | La Passe-des-Archères, marches de Lithmeren | Deux archères colossales taillées dans la gorge, leurs flèches croisées sur la lune | Bleu nuit, argent, sarcelle, vin | Second jet (le premier, observatoire lunaire, était « quelconque ») : bien meilleur ; prompt de référence (5.3) |
| Gorak | Les Fosses-Rouges, Kar-Dush | Les fosses sont les carrières d'argile d'une ville de briquetiers, fours allumés | Terre cuite, suie, os, vert-de-gris | Premier jet, écrit avant la section 5.2 bis ; intégré tel quel |
| Brokk | La Porte-Seule, Durnhold | La grande porte toujours debout, seule dans un alpage, un sentier de moutons en fait le tour | Paille, sauge, ardoise, rouille | Premier jet, écrit avant la section 5.2 bis ; intégré tel quel |
| Aldric | La Grange-aux-Dîmes, commanderie du Sceau ardent | La grange où l'ordre scelle chaque dette de cire rouge | Cire rouge, parchemin, chêne, fer | Premier jet, écrit avant la section 5.2 bis (baigné de lumière chaude) ; intégré tel quel |
| Le Colosse | La Loge-du-Colosse, Grand Cirque | Les murs de l'arène couverts des trophées des champions brisés, en rangs vers son trône de boucliers ; un crochet vide | Bleu acier, ardoise, sang de bœuf, or terni, os | Écrit avec la section 5.2 bis (aube froide, « No orange ») ; intégré en 0.126.0 (`arena-colossus-box.jpg`) |

---

## 6. Gabarit : fond d'écran de menu

> **Style :** les fonds de menu suivent le style des décors (gouache graphique, section 5.1), le clair-obscur et le format paysage (section 5, « En bref »). Depuis la 0.63.0, tous les fonds sont en gouache : la sélection affiche `menu-duel.jpg` (même image que l'arche du duel), qui remplace le portail de l'ancien style (`menu-portal.jpg`, retiré). Le prompt du portail ci-dessous est de l'ancien style : on en garde les zones de l'écran, pas le rendu.

> **Écrans clés (2026-10-27, 0.123.0)** : `menu-campaign.jpg` au choix du champion en campagne (le vestiaire sous les gradins, sortie lumineuse derrière le champion à 20 % de la largeur) ; `menu-season.jpg` sous l'arbre et la saison (l'arène vue du ciel, combats en cours ; la présentation et la configuration du tournoi gardent `menu-tournament.jpg`) ; `menu-victory.jpg` aux deux victoires finales, écran du champion et campagne gagnée (la salle du trésor : `VictoryBackdrop` cale le dessus de l'estrade, à 22,5 % de la largeur et 68 % de la hauteur de l'image, sous les pieds du vainqueur ; elle remplace le rai de lumière et le socle en CSS). Prompts complets, zones de l'écran comprises : [prompts-decors.md](prompts-decors.md). Un fond de menu suit aussi la section 5.2 bis (idée maîtresse, lumière froide, ombres lisibles), mais garde ses zones calmes sous l'interface.

L'écran de sélection (`StartScreen.tsx`, retiré en 0.100.0 ; ce fond reste celui de l'accueil) affichait un fond illustré, assombri en CSS (`brightness(0.6)`), avec un vignettage et un dégradé en bas. Ses contraintes diffèrent de celles d'une arène :

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

`HomeScreen.tsx` (triptyque depuis la 0.61.0) affiche `menu-home.jpg` (2026-10-20) : un haut plateau au crépuscule, des croix de bois à gauche (des compagnons enterrés là), des chaînes de montagnes au loin. Il est légèrement assombri (`brightness(0.7)`), sans flou, avec un vignettage. Le fond passe derrière le triptyque : seuls les bords et le ciel restent vraiment visibles.

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

La présentation du tournoi (`TournamentIntroScreen.tsx`) a son propre fond, `menu-tournament.jpg` : l'entrée monumentale de l'arène vue **de l'extérieur**. C'est le pendant du portail vu de l'intérieur, pour qu'on sente qu'on change d'écran. Aucun personnage n'y figure : le fond suffit, et l'écran n'a pas à être refait quand on ajoute un personnage.

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

**Reliques** (0.75.0, douze depuis la 0.77.0) : leurs icônes suivent le même gabarit de planche, avec leur propre grammaire (un objet immobile, patiné, avec son attache, la magie contenue dedans, le chiffre de la règle lisible dans l'objet : [RELIQUES.md](RELIQUES.md) § 6) et sans cadre : depuis la 0.91.1, la relique s'affiche en objet seul, sans aucun sertissage CSS, et sa silhouette doit se lire seule. Prompt complet de la planche des douze et découpe : [RELIQUES.md](RELIQUES.md) § 10. Fichier : `src/assets/icons/<id de la relique>.png`, à ajouter à l'inventaire ci-dessous une fois intégré.

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
| 14 | `sound-on` | Son activé ; **retirée en 0.121.0** (fichier à la corbeille, remplacé par les glyphes du UI kit) | Cor de guerre et ondes sonores |
| 15 | `sound-off` | Son coupé ; **retirée en 0.121.0** (glyphes du kit) | Même cor, barré en rouge |
| 16 | `turns` | Tours restants d'un statut | Sablier en bronze |
| 17 | `thorns` | Épines (nain) | Ronce épineuse enroulée |
| 18 | `lifesteal` | Vol de vie (mort-vivant) | Cœur pourpre traversé d'un filet de sang |
| 19 | `wind-fury` | Furie des vents (orc) | Tourbillon de vent avec deux lames |
| 20 | `evasion` | Esquive améliorée (elfe) | Plume prise dans une rafale |
| 21 | `precision-aura` | Aura de précision (elfe) | Tête d'aigle dorée, halo or pâle |
| 22 | `frost-aura` | Aura de poison (Ervald ; Aura glaciale de la v8 au 2026-10-28, renommée : le fichier garde son nom ; **repeinte en v30**) | L'encensoir de bronze d'Ervald, sans givre, d'où monte une fumée vert toxique qui forme des gouttes ; halo vert toxique, distinct de l'Aura de décoction (givré, brume bleu glacé jusqu'en v29) |
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
| 37 | `life-bloom` | Graine de vie (druide) ; sans usage depuis la 0.73.0 (Fleur de vie retirée) ; **retirée en 0.121.0** (fichier à la corbeille) | Graine qui germe, lueur vert sève |
| 38 | `bark-skin` | Peau épaisse (druide) ; sans usage depuis la 0.73.0 (Écorce épaisse retirée) ; **retirée en 0.121.0** | Plaque d'écorce moussue |
| 39 | `fireflies` | Lucioles (druide) ; statut `firefly`, hors jeu | Trois grosses lucioles en spirale |
| 40 | `charge` | Charge (druide en ours) ; sans usage depuis la 0.73.0 | Tête d'ours qui fonce, traînées de vitesse |
| 41 | `claw` | Coup de griffe (druide en ours) ; sans usage depuis la 0.73.0 ; **retirée en 0.121.0** | Patte griffue, trois entailles |
| 42 | `rot-aura` | Aura de pourriture (druide en ours) ; sert aussi, en attendant, au malus Pourriture | Bois de cerf pourri sous les champignons, halo brun-violet |
| 43 | `whistle` | Siffloter et le statut Sifflotement (barde, double 1) | Flûtiau de cuivre, notes en lumière corail |
| 44 | `false-note` | Fausse note, compétence et malus (barde, double 2) | Diapason de bronze fendu, onde brisée violet terne |
| 45 | `melodious-aura` | Aura mélodieuse (barde) et Ouverture ; **retirée en 0.121.0** avec l'Aura mélodieuse (fichier à la corbeille) | Caisse de luth à rosace de cuivre, notes et halo magenta |
| 46 | `crescendo` | Crescendo (barde, double 4 : un coup de 12 depuis la 0.41.0, plus trois coups) | Trois notes-lames en escalier, traînée magenta ; le motif évoque encore trois coups, à refaire si besoin |
| 47 | `soloist` | Soliste (barde, double 5 : un coup de 15) | Une grosse note forgée en lame, éclat magenta |
| 48 | `bleed` | Saignement (malus, v8) | Trois gouttes de sang rouge sombre tombant d'une entaille |
| 49 | `cleave` | Pourfendre (Gorak, v8) | Couperet de fer ébréché en plein élan, sang projeté |
| 50 | `grudge` | Rancune (druide, relais, v8) ; sans usage depuis la 0.73.0 (relais retiré) | Croc d'ours sur cordelette de cuir, braise ambre dans ses fêlures |
| 51 | `sap` | Sève (druide, relais, v8) ; sans usage depuis la 0.73.0 (relais retiré) ; **retirée en 0.121.0** | Goutte de sève émeraude qui perle d'une écorce entaillée |
| 52 | `grudge-aura` | Aura de rancune (druide en ours, v8) ; depuis la 0.73.0, Aura sauvage (druide en homme) | Empreinte d'ours brûlée dans une rondelle de chêne, braise ambre, halo ambre-brun |
| 53 | `sap-aura` | Aura de sève (druide en homme, v8) ; sans usage depuis la 0.73.0 ; **retirée en 0.121.0** | Bois de cerf vivant qui bourgeonne, feuilles vert sève, halo émeraude |
| 54 | `thunderbolt` | Foudre (druide en homme, v9) | Nuage d'orage noir, éclair fourchu bleu-blanc, étincelles émeraude, rochers brisés |
| 55 | `casting` | Incantation (forme humaine du druide, v9) | Tête de bâton noueux couronnée de bois de cerf, anneau de runes émeraude |
| 56 | `bear-might` | Force de l'ours (forme d'ours du druide, v9) | Patte d'ours châtaigne qui fend un rocher, éclats ambre |
| 57 | `burn` | Brûlure (malus, v9) et Feux follets (la compétence qui la pose) | Flamme fantôme vert pâle sur un lambeau d'étoffe calcinée, braises rouges |
| 58 | `lead-pommel` | Contrepoids de plomb (relique, v10) | Boule de plomb cerclée de fer, trou de rivet, anneau |
| 59 | `felt-boots` | Bottes de feutre (relique, v10) | Paire de bottes de cuir usées, lacets défaits |
| 60 | `mercenary-mail` | Cotte du mercenaire (relique, v10) | Cotte de mailles roulée, sanglée, anneaux neufs plus clairs |
| 61 | `split-knucklebone` | Osselet fendu (relique, v10) | Osselet fendu, un seul point gravé, cordelette |
| 62 | `hollow-die` | Dé creux (relique, v10) | Dé cubique d'os, couronne sur la face haute, chaînette |
| 63 | `four-nail-shoe` | Fer à quatre clous (relique, v10) | Fer à cheval étroit, quatre clous, suspendu par une ficelle |
| 64 | `opening-bell` | Cloche d'ouverture (relique, v10) | Clochette de bronze, une encoche, lanière de cuir |
| 65 | `hermit-beads` | Chapelet de l'ermite (relique, v10) | Chapelet de perles de bois, trois grosses perles d'os, fermoir d'os |
| 66 | `siege-clepsydra` | Clepsydre de siège (relique, v10) | Bol de bronze percé, trois graduations, eau arrêtée, une goutte |
| 67 | `wolf-fang` | Dent de loup (relique, v10) | Croc fêlé dans une cage de fil de fer, lueur rouge dans la fêlure |
| 68 | `bramble-collar` | Collier de ronces (relique, v10) | Couronne de ronce tressée, médaillon de bois fendu |
| 69 | `hunter-trophy` | Trophée du chasseur (relique, v10) | Mâchoire de bête sur un lacet, entailles gravées |
| 70 | `music-on` | Musique allumée (v11) ; **retirée en 0.121.0** (glyphes du kit) | Tambour de bronze, deux baguettes croisées |
| 71 | `music-off` | Musique coupée (v11) ; **retirée en 0.121.0** (glyphes du kit) | Même tambour, barré en rouge |
| 72 | `purse` | Bourse d'un parieur (guichet, classement des paris, v11) | Bourse de cuir nouée, pièces d'or qui dépassent |
| 73 | `bet-token` | Titre « Combien ? » des mises (guichet, v11) | Jeton de bronze cranté, couronne de laurier |
| 74 | `twist` | Bandeau du coup de théâtre (v11 ; remplace `coin-flip` dans le bandeau) | Embrasse de rideau de velours rouge, gland doré |
| 75 | `ticket` | Bouton « Parier » de l'affrontement (v11) ; **retirée en 0.121.0** (glyphe du kit) | Ticket de pari déchiré, épinglé, traits d'encre illisibles |
| 92 | `caged-ember` | Braise captive (relique élémentaire, Feu, v13) | Cage ronde de fer forgé à quatre barreaux, braise rouge et orange enfermée, chaîne |
| 93 | `frost-tear` | Larme de givre (relique élémentaire, Givre, v13) | Larme de glace bleu pâle dans une griffe d'argent terni, fougères de givre, fêlure au tiers, lanière |
| 94 | `wind-conch` | Conque des vents (relique élémentaire, Vent, v13) | Coquillage spiralé ivoire, tourbillon turquoise dans l'ouverture, lanière nouée |
| 95 | `split-geode` | Géode fendue (relique élémentaire, Terre, v13) | Géode ouverte en deux moitiés, un cristal ambré dans chacune, sanglée de cuir, boucle de bronze |
| 96 | `venom-vial` | Fiole de venin (relique de coup, v14) | Petite fiole de verre vert bouchée de cire, une goutte de venin figée le long du col, cordon de cuir |
| 97 | `butcher-hook` | Croc de boucher (relique de coup, v14) | Croc à viande de fer au manche de corne, pointe noircie d'une goutte de sang séché, ficelle |
| 98 | `abbey-incense` | Encens de l'abbaye (relique de coup, v14) | Pain de résine ambrée enveloppé de lin, une seule braise ; pas d'encensoir (déjà l'icône de l'Aura de décoction) |
| 99 | `dented-shield` | Écu cabossé (relique de coup, v14) | Bosse de fer d'un vieil écu (umbo), exactement six creux (le seuil de 6), lanière passée dans un rivet |
| 100 | `eagle-feather` | Plume d'aigle (relique de coup, v14 ; **repeinte en v29**, quatrième demande du 2026-10-27 : recharge 2 → 4 tours) | Rémige d'aigle bleu de cobalt, liée d'un fil rouge à un anneau de cuivre, **quatre** barbes arrachées au bord (la recharge de 4 tours ; deux jusqu'en v28) |
| 101 | `quilted-gambison` | Gambison matelassé (relique de caractéristique, v16) | Gambison plié, matelassure piquée, col lacé, une pièce recousue ; pas de mailles (c'est la Cotte) |
| 102 | `bonesetter-salve` | Onguent du rebouteux (relique de coup, v16 ; **repeinte en v25**, 0.121.0) | Pot de terre cuite, **deux** creux de doigts dans l'onguent (les deux charges depuis la 0.121.0 ; cinq en v16), ficelle nouée au col |
| 103 | `vigil-candle` | Chandelle de veille (relique de tour, v16) | Chandelle de suif aux trois anneaux gravés (l'intervalle de 3 tours), dans un bougeoir de fer à anneau ; ni sablier ni clepsydre |
| 104 | `quarry` | Curée (compétence, v17) | Corne tachée de sang, deux entailles rouges |
| 105 | `harvest` | Récolte (compétence, v17) | Faucille d'os givrée qui tranche de la ciguë, une goutte violette |
| 106 | `virulence` | Virulence (compétence, v17) | Croc de serpent, trois gouttes de venin qui grossissent |
| 107 | `sentence` | Sentence (compétence, v17) | Balance dorée, une flamme dans le plateau baissé, halo d'ivoire |
| 108 | `conflagration` | Embrasement (compétence, v18) | Brindilles de chêne liées d'écorce qui s'embrasent en une colonne de flamme ambre, les petites flammes éparses aspirées dedans ; ni luciole seule, ni braise en cage |
| 109 | `loaded-die` | Dé pipé (compétence, v18) | Dé d'os fendu sur une arête, une goutte de plomb dans la fente, une traînée violette qui le tire vers sa face « pile » (un point doré) ; ni pièce, ni dé vert |
| 110 | `bristling-rampart` | Rempart hérissé (compétence, v18) | Pavois de chêne cerclé de fer qui éclate, ses éclats changés en vol en épines de fer à la pointe rougie ; ni écu rond, ni ronce verte |
| 111 | `vendetta` | Vindicte (compétence, v18) | Gantelet d'acier levé qui serre la lame brisée d'une épée ennemie, une onde dorée qui repart vers l'avant ; ni balance, ni épée seule |
| 112 | `forge-bellows` | Soufflet de forge (relique, v19) | Petit soufflet à deux planchettes de chêne et cuir plissé, pendu à une lanière, trois clous de laiton (le +3), une lueur de braise au fond du bec |
| 113 | `pavise-nails` | Clous de pavois (relique, v19) | Éclat de planche de pavois peint où restent plantés trois gros clous forgés (les 3 dégâts), un fil de fer tordu pour attache, reflet bleu-gris |
| 114 | `talion-gauntlet` | Gantelet du talion (relique, v19) | Manchette de gantelet de fer rivetée, courroie de cuir bouclée, une seule pointe rabattue (le +1), lueur dorée dans les rivets |
| 115 | `holed-coin` | Coccinelle d'émail (relique, porte-bonheur ; Pièce trouée de la v19 au 2026-10-28, Trèfle de fer en v30, **repeinte en v31**) | Coccinelle d'émail vermillon, deux points de jais sur ses élytres (les 2 coups de chance), cousue au revers d'un gant de cuir noir par des points de fil d'or ; ni trèfle, ni fer à cheval, ni pièce, ni disque, ni dé (v30 : trèfle de fer émaillé vert, trop proche de la Pièce porte-bonheur ; jusqu'en v29 : pièce de cuivre percée sur un cordon) |
| 116 | `duo` | Duo (compétence de la barde et son statut, v20, 2026-10-25) | Deux dés d'ivoire qui roulent côte à côte sur une portée de musique, dans un halo mauve de l'Aura mélodieuse |
| 117 | `wasp-sting` | Dard de guêpe (relique de source, v21, 2026-10-25) | Dard de guêpe séché serti dans un capuchon de laiton, deux gouttes de venin (les 2 Poison) |
| 118 | `tinder-box` | Briquet d'amadou (relique de source, v21) | Boîte à briquet de fer, son silex et son battant, deux braises dans l'amadou (les 2 Brûlure) |
| 119 | `fair-coin` | Pièce de foire (relique de source, v21) ; **retirée en 0.121.0** avec la relique (les pièces sont des compétences de Chance) | Jeton de foire en laiton frappé d'une tête de bouffon, sur un cordon rouge et jaune |
| 120 | `spiked-bracer` | Brassard à pointes (relique de source, v21) | Brassard de cuir clouté, une seule grosse pointe rabattue vers l'arrière (la Riposte, 1x) |
| 121 | `faith-shield` | Bouclier de foi (compétence d'Ysolde et son statut `faithShield`, v22, 2026-10-25) | Écu d'ivoire et d'or qui durcit dans une lumière de soin, halo d'aura |
| 122 | `sidestep` | Pas de côté (compétence et statut, v22) | Botte de cuir qui fait un pas de côté devant une flèche, une rémanence bleue derrière elle, halo d'aura |
| 123 | `open-wound` | Plaie ouverte (compétence et statut `openWound`, v22) | Pointe de flèche qui ouvre une entaille sanglante dans une armure de cuir, étincelle d'or du critique, halo d'aura |
| 124 | `guard-break` | Brise-garde (compétence et statut `guardBreak`, v23, 2026-10-25) | Masse de bois cerclée de fer qui fend un écu de bois, éclats qui volent |
| 125 | `jinx` | Malchance (compétence et statut `jinx`, v23, version B) | Dé d'os ligoté d'une cordelette noire, lueur verdâtre de mauvais sort, pions noirs autour |
| 126 | `blinding` | Éclair aveuglant (compétence et statut `blinded`, v23, version B) | Œil sur un disque de bois, fendu d'un éclair bleu, une corne pendue à une lanière |
| 127 | `hemorrhage` | Hémorragie (compétence et statut `hemorrhage`, v23) | Couperet ensanglanté au-dessus d'une plante de soin tranchée, terre noire |
| 128 | `seal-theft` | Confiscation (compétence et statut `sealTheft`, « Sceau de vol », v23) | Gantelet de fer qui arrache un sceau de cire rouge à un parchemin, traînée de feu doré |
| 129 | `feint` | Visée (aura, Chance ; la Feinte jusqu'au 2026-10-28, même objet) et la Mire (statut `aim`) | Cape à capuche vide qui tourbillonne, une dague qui en sort, étincelle d'or du critique |
| 130 | `black-sap` | Sève noire (compétence et statut `blackSap`, v23, version B) | Calice d'étain qui déborde d'une sève violette et noire, fumée mauve |
| 131 | `blood-debt` | Dette de sang (compétence et statut `bloodDebt`, v23) | Épée ensanglantée, une reconnaissance de dette scellée pendue à la garde |
| 132 | `stoke` | Attiser (compétence, v23) | Tison entouré de lianes planté dans un feu de feuilles mortes |
| 133 | `storm-sky` | Ciel d'orage (compétence et statut `stormSky`, v24, 2026-10-25) | Couronne de bois de cerf moussus, un arc d'éclair bleu entre les andouillers, feuilles de chêne |
| 134 | `blood-frenzy` | Ivresse du sang (compétence, statuts `bloodFrenzy` et `bloodFrenzyStrike`, v24) | Poing vert d'orc qui brandit une hache, traînées de sang rouges et rémanences bleues des coups de plus |
| 135 | `stunning-blow` | Coup de massue (compétence, v24) | Heaume cabossé et fendu, étoiles d'or de l'étourdissement, éclats de pierre |
| 136 | `reprieve-medal` | Médaille de sursis (relique, v25, 2026-10-27) | Médaille d'argent bleuté sur un ruban de soie bleu roi délavé, une seule entaille en plein centre, arrêtée net, lueur blanche froide dans la fente |
| 137 | `vanguard-horn` | Cor d'avant-garde (relique, v25) | Petit cor de corne ivoire cerclé de cuivre vert-de-gris, lanière de cuir rouge sang, une bague gravée |
| 138 | `weighted-coin` | Patte de lièvre (relique, porte-bonheur ; Pièce lestée de la v25 au 2026-10-28, **repeinte en v30**) | Patte de lièvre séchée, fourrure gris perle et blanc de neige, bague de laiton poli au poignet, ruban turquoise noué qui pend ; ni pièce, ni disque, ni dé (jusqu'en v29 : pièce d'argent rognée lestée de plomb) |
| 139 | `lucky-streak` | Veine (aura, Chance, v26, 2026-10-27) | Dé de verre bleu ciel qui roule face 6, points d'or, l'ombre d'un second dé qui rebondit |
| 140 | `dread` | Effroi (aura, Ombre, v26) | Crâne de corbeau noir au-dessus d'une étincelle de critique, brume grise des orbites |
| 141 | `rancor` | Rancœur (aura, Représailles, v26) | Enclume de fer noir fendue frappée par une lame, étincelles qui montent en flamme cuivrée |
| 142 | `storm-field` | Champ d'orage (aura, Orage, v26) | Bouclier rond en nuée d'orage, éclairs jaune électrique depuis son bord |
| 143 | `ballad` | Ballade (aura, Chant, v26) | Partition roulée nouée d'un ruban, trois notes qui deviennent des feuilles de soin, accent rose |
| 144 | `prayer` | Prière (Lumière, v26) | Livre de prières ivoire ouvert sur un lutrin, colonne de lumière nacrée |
| 145 | `wither` | Flétrissure (Ombre, v26) | Lame rouillée qui ploie comme une tige fanée, poussière dans une brume olive |
| 146 | `assault` | Assaut (Fureur, v26) | Marteau d'arme en plein élan, tête doublée d'une rémanence turquoise |
| 147 | `stone-fist` | Poing de pierre (statut `stoneFist`, posé par Peau de pierre, v26) | Poing de basalte noir cerclé de bronze, fissures rouge magma, éclats de pierre |
| 148 | `lucky-coin` | Pièce porte-bonheur (compétence et statut `luckyCoin`, Chance, v26) | Pièce émeraude et or qui tournoie, trèfle à quatre feuilles frappé, étincelles vertes |
| 149 | `cursed-coin` | Pièce maudite (compétence et statut `cursedCoin`, Chance, v26) | Pièce de fer noirci à liseré violet, crâne de lézard frappé, fumée violette |
| 150 | `mastery-fury` | Emblème de la Fureur (v27, 2026-10-27) | Poing qui serre un manche de hache levée, orange feu |
| 151 | `mastery-blood` | Emblème du Sang (v27) | Goutte de sang qui coule le long d'une courte lame, cramoisi |
| 152 | ~~`mastery-hunt`~~ | Emblème de la Chasse (v27) ; **retiré en 0.122.0** (maîtrise fondue dans la Chance), fichier à la corbeille | Œil de rapace transpercé d'une flèche, bleu nuit |
| 153 | `mastery-bulwark` | Emblème du Rempart (v27) | Bouclier rond clouté vu de face, gris fer |
| 154 | ~~`mastery-retaliation`~~ | Emblème des Représailles (v27) ; **retiré en 0.122.0** (maîtrise fondue dans le Rempart), fichier à la corbeille | Deux lames croisées dont les pointes reviennent vers soi, bronze bruni |
| 155 | `mastery-poison` | Emblème du Poison (v27) | Fiole ventrue d'où monte une fumée, vert toxique |
| 156 | `mastery-chance` | Emblème de la Chance (v27) | Pièce debout contre un dé à six faces, or de pièce |
| 157 | `mastery-light` | Emblème de la Lumière (v27) | Disque solaire à rayons droits et épais, blanc ivoire |
| 158 | `mastery-shadow` | Emblème de l'Ombre (v27) | Crâne sous un croissant de lune noir, violet-noir |
| 159 | `mastery-magic` | Emblème de la Magie (v27, `mastery-storm` renommé en 0.122.0 : l'Orage devient la Magie) | Éclair qui fend une nuée, cyan électrique |
| 160 | ~~`mastery-song`~~ | Emblème du Chant (v27) ; **retiré en 0.122.0** (maîtrise répartie entre Magie, Fureur, Lumière et Ombre), fichier à la corbeille | Luth à une corde qui vibre, magenta |
| 161 | `onrush` | Élan (aura, Fureur, v29) | Hache en plein élan, sa traînée qui se plie en chevron, étincelles de critique ; accent corail, halo d'aura |
| 162 | `overcharge` | Surtension (aura, Magie, v29) | Paratonnerre de cuivre frappé par un éclair dédoublé ; accent indigo électrique, halo d'aura |
| 163 | `grip` | Emprise (aura, Ombre, v29) | Main d'ombre qui serre trois entraves gravées de malédictions ; accent jade, halo d'aura |
| 164 | `pilfer` | Larcin (aura, Ombre, v29) | Main gantée qui sort d'une cape et cueille une gemme dans un halo étranger ; accent magenta, halo d'aura |
| 165 | `shockwave` | Onde de choc (compétence et mécanisme, Rempart, v29) | Écu clouté abattu sur les dalles, anneaux d'onde, trois bosses (ses trois jauges) ; accent ocre |
| 166 | `tithe` | Dîme (compétence, statut `tithe` et état `tithed`, Lumière, v29) | Plat de dîme en étain sur une marche, pièces de cuivre, un fil de lumière tiré d'un gantelet ; accent cuivre |
| 167 | `votive-flame` | Flamme votive (compétence, statut `votiveFlame` et état `votive`, Lumière, v29) | Cierge dans un godet de verre cobalt, flamme saphir, gouttes de soin changées en étincelles ; accent saphir |
| 168 | `leech` | Sangsue (aura, Sang, v29) | Sangsue noire et lie-de-vin enroulée sur une lame ébréchée, une goutte qui devient un cœur ; halo d'aura |
| 169 | `blood-oath` | Serment de sang (compétence, Sang, v29) | Paume entaillée d'une dague, le sang qui coule sur un parchemin de serment noué d'un cordon rouge ; sang de bœuf et or terni |
| 170 | `blood-scent` | Odeur du sang (compétence, Sang, v29) | Museau de loup gris qui flaire trois gouttes de sang sur la pierre, une étincelle de critique à la dernière ; gris acier |
| 171 | `toad-skin` | Peau de crapaud (aura, Poison, v29) | Rondache couverte d'une peau de crapaud verruqueuse orange et noire, le venin qui perle et goutte du bord ; mandarine, halo d'aura |
| 172 | `verdigris-coin` | Pièce vert-de-gris (compétence et statut `verdigrisCoin`, Poison, v29) | Pièce de bronze croûtée de vert-de-gris, un serpent frappé, une coulure de poison ; sarcelle |
| 173 | `venom-bite` | Morsure (compétence, Poison, v29) | Chélicères d'araignée-loup plantées dans un brassard de cuir, deux jets de venin violet ; pas de serpent (c'est la Virulence) |
| 174 | `bastion` | Bastion (aura, Rempart, v31) | Écu de pierre dont les éclats jaillissent vers l'avant, une plaque nouvelle qui se reforme derrière ; gris ardoise bleuté, halo d'aura. **Détouré à la main** : une légère trace de damier reste dans le halo, à repeindre si elle se voit à l'écran |
| 175 | `judgement` | Jugement (aura, Lumière, v31) | Balance d'or pâle, un plateau marqué de trois entailles (les trois fautes), rayon de lumière ; jaune paille, halo d'aura ; aucun symbole religieux réel |
| 176 | `fault` | Faute (statut `fault` et son état, posés par le Jugement, v31) | Pièce ronde monochrome gravée d'une encoche barrée, froide, violet-gris ; la grammaire des emblèmes d'état |
| 177 | `brasier` | Brasier (aura, Magie, v31) | Brasero de fer forgé débordant de braises, langues de feu tordues vers le haut ; orange incandescent, halo d'aura ; distinct d'Attiser (tison) et de l'Embrasement |
| 178 | `shield-coin` | Pièce de bouclier (compétence et statut `shieldCoin`, Chance, v31) | Pièce épaisse d'argent bleuté qui tournoie, un heaume fermé frappé de face, tranche crénelée comme un rempart, éclats froids ; ni écu, ni bouclier rond |
| 179 | `volley-coin` | Pièce de la rafale (compétence, statuts `volleyCoin` et `volleyStrike`, Chance, v31) | Pièce de cuivre rouge qui tournoie, deux lames courtes parallèles frappées, traînées de vitesse et étincelles orange |
| 180 | `hex-coin` | Pièce ensorcelée (compétence et statut `hexCoin`, Chance, v31) | Pièce de laque fuchsia cerclée d'argent noirci, spirale sigillaire à trois crochets, un fil de fumée magenta qui s'enroule ; ni œil, ni rose, ni crâne |
| 181 | `blessed-phial` | Ampoule bénite (relique, v31) | Fiole ronde de verre scellée d'une cire blanche coulée, une lumière étoilée nacrée à l'intérieur, un cordon de cuir et un petit médaillon de laiton ; l'Immunité de ses trois premiers tours |
| 182 | `gaoler-chain` | Chaîne du geôlier (relique, v31) | Cadenas de bronze vert-de-gris à trou de serrure, pendu à une chaîne de fer rouillée ; l'Emprise tout le combat |
| 183 | `lightning-rod` | Pointe de paratonnerre (relique, v31) | Pointe de cuivre vert-de-gris torsadée, son bout ouvert en couronne qui tient un éclair bleu indigo ; la Surtension tout le combat |

`thorns` (n° 17) a été refaite en v8 : la même ronce, ses épines mouillées de sang (Épines acérées).

**À refaire (2026-10-20) :** ~~Fleur de vie~~ (retirée en 0.73.0). L'Aura sauvage garde `grudge-aura` ; `charge` et `grudge` sont sans usage depuis la 0.73.0. `bark-skin`, `claw`, `life-bloom`, `sap` et `sap-aura` sont passées à la corbeille en 0.121.0, avec `sound-on`, `sound-off`, `music-on`, `music-off`, `ticket` (remplacées par les glyphes du UI kit), `fair-coin` et `melodious-aura` (leur contenu retiré).

### Icônes à générer

**La liste d'attente de tout le projet**, tous chantiers confondus (druide, reliques, son, paris, interface). Chaque besoin s'y ajoute dès qu'une compétence, un statut, une relique ou un bouton arrive sans son icône, avec son type, son besoin, son motif et son icône provisoire. Tout se génère **d'un seul coup**, le moment venu (décision de l'utilisateur, 2026-10-20), mais **une planche par type** (règle de cette bible) : chaque type a sa grammaire, et les mélanger sur une planche brouille le style (une relique est un objet immobile sans halo ; une aura a son halo ; un bouton d'interface a moins de lueur). En attendant, l'icône provisoire s'affiche (ou l'initiale, s'il n'en a pas).

**Emblèmes d'état : un type d'icône à part** (planche v12, intégrée le 2026-10-21, 0.79.2). On cultive la différence de concept entre **compétence** et **état**, et elle passe aussi par l'image :

| | Compétence | État |
| --- | --- | --- |
| Ce que c'est | l'identité d'un personnage, ce qu'il sait faire | un mot du vocabulaire commun, ce qu'il subit ou porte, le même chez tous |
| Image | un objet peint, riche, à la palette du personnage | un symbole **gravé sur une pièce**, **monochrome** (argent et fer vieillis) |
| Cadre | posée dans un sceau octogonal CSS (`.skill-seal`), avec bordure | **aucun** : la pièce est découpée en disque et posée telle quelle ; toutes sont rondes et de même taille, elles s'alignent d'elles-mêmes |
| Couleur | celle du personnage | aucune dans l'image ; monochrome, elle peut être teintée en CSS si besoin ; la polarité se lit au compteur (vert ou rouge) et à la rangée (bonus à gauche, malus à droite) |
| Par-dessus | la pastille du dé, ses jauges | le compteur de l'état |

Deux mots du prompt font cette grammaire (ajoutés par l'utilisateur à la première version, qui donnait des icônes trop proches des compétences) : **« monochrome »** et **« carved on a coin »**. Aucun motif ne reprend celui d'une compétence (le gantelet de l'Aura de puissance, la cible d'Œil de faucon, l'écu de Peau de pierre, le crâne du Souffle de la tombe).

| Fichier | État | Symbole gravé |
| --- | --- | --- |
| `state-power.png` | Puissance | an upright sword with two stacked upward chevrons |
| `state-weakened.png` | Affaibli | a snapped sword blade, one downward chevron |
| `state-shield.png` | Bouclier | a round buckler with a horizontal band |
| `state-sure-crit.png` | Critique assuré | concentric rings with a four-pointed spark |
| `state-crit-power.png` | Critique renforcé | an impact burst with an upward chevron |
| `state-sure-dodge.png` | Esquive assurée | a curved arrow swerving around a post |
| `state-extra-die.png` | Dé en plus | two six-sided dice |
| `state-healing.png` | Soin | a heart with an upward chevron |
| `state-drain.png` | Drain | a heart with an arrow looping out and back in |
| `state-reflect.png` | Renvoi | an arrow bouncing off a small shield |
| `state-thorns.png` | Épines | a thorn star |
| `state-immunity.png` | Immunité | a shield with a keyhole |
| `state-poison.png` | Poison | a drop with rising bubbles |
| `state-bleed.png` | Saignement | a drop under a slash mark |
| `state-burn.png` | Brûlure | a flame |
| `state-lost-turn.png` | Tour perdu | iron shackles |
| `state-rot.png` | Pourriture | a wilting leaf with two holes (v15) |
| `state-breach.png` | Brèche | a cracked breastplate (v15) |
| `state-firefly.png` | Luciole | a firefly with a glowing tail (v15) |
| `state-spoiled.png` | Coup gâché | a sword blade bent wavy (v15) |
| `state-vulnerable.png` | Vulnérable | a target with an arrow plunging in (v15) |

**Pas encore à générer**, mais connus (pour ne pas les redécouvrir) :
- **Statuts sans porteur** : Étourdi, Garde sacrée. Ils n'entrent dans la liste que lorsqu'un personnage les pose. Les reliques ne les poseront pas : une relique ne pose jamais de malus sur l'adversaire (RELIQUES.md § 3, règle 7). Vulnérable et Pourriture ont leur emblème depuis la planche v15 (0.110.1).
- **Sceaux de compétence peints** (asset A-01, [design-system.md](design-system.md) : retenu, prioritaire) : un autre format qu'une icône, une illustration qui remplit la fenêtre octogonale de la carte (`object-fit: cover`), une par compétence ; aucun n'est commandé, la compétence montre son icône en attendant (`SKILL_SEAL`, `SkillSeal.tsx`).
- **Icônes de commande** (N-01, design-system : à tester, 3 d'abord) : boutons icône et boutons d'action.

**Emprunts** : une compétence qui pose un statut montre l'icône de ce statut (Œil de faucon → `crit`, Peau de pierre → `shield`, Vol de vie → `lifesteal`, Souffle de la tombe → `poison`) ; Ouverture prend l'Aura mélodieuse qu'elle pose ; les trois Attente de l'ogre partagent `waiting` ; l'Aura sauvage garde `grudge-aura` ; Feux follets montre ses lucioles (`fireflies`, 0.79.0). **Depuis la 0.79.0, ces emprunts restent aux compétences** : ce sont les états qui ont un emblème à eux (pièces gravées de la planche v12, intégrée en 0.79.2) : une compétence et l'état qu'elle pose ne montrent plus la même image. **Depuis la 0.96.2, la règle vaut hors du combat** : un statut de la zone d'état se montre partout (compendium, infobulle d'une relique) par l'emblème de son état (`statusIcon`, `Icon.tsx`) ; `STATUS_ICON` reste l'icône que la compétence emprunte, et celle des auras, formes et mécanismes.

**Prompt d'une planche d'emblèmes d'état** (celui de la v12, complet, à coller tel quel ; pour de nouveaux états, garder tout sauf la liste ICONS, et joindre la planche v12 comme référence de style) :

```text
Create a single square image, 1024x1024, containing a sprite sheet of 16 game UI icons
arranged in a strict 4x4 grid (4 columns, 4 rows). Each icon is centered in its own
invisible cell (1/4 of the width and height), occupies about 85% of the cell,
and never touches or overlaps the cell borders. Leave clear empty space between icons.
All coins have exactly the same diameter.

BACKGROUND: fully transparent, real alpha channel. Do NOT paint a checkerboard pattern.
If transparency is not possible, use a perfectly flat, uniform pure black background (#000000)
with no gradient, no texture, no vignette, no shadow under the coins.
NO grid lines, NO labels, NO numbers, NO letters, NO text anywhere.

PURPOSE: these are STATUS EMBLEMS for a fantasy auto-battler. Each one is shown as is, at
64 pixels and down to 24 pixels, with a small counter placed over its lower right edge.
They must read as simple SYMBOLS, not as illustrated objects: the game's skill icons are rich,
colorful painted objects, these emblems must look clearly different from them.

STYLE: MONOCHROME. Each icon is one bold, simple symbol CARVED ON A COIN: a round, flat,
old silver-and-iron coin seen perfectly head-on, with a thick raised rim, a worn hammered
surface, and the symbol embossed in its center. Grey metal only, no other color at all
(the game may tint them). Crisp painted highlight from the top-left, deep engraved shadows
for contrast. Thick strokes, no thin details, no scenery, no hands, no faces.
Every symbol must be distinct in silhouette from all the others.
AVOID: color, gold, emoji look, flat vector clip-art, cute or cartoon style, glossy plastic,
3D perspective, photorealism, text, real-world religious symbols (no crosses).

ICONS, in reading order (left to right, top to bottom), each carved on its coin:
Row 1:
 1. an upright sword with two stacked bold upward chevrons behind its blade (more damage)
 2. a sword blade snapped in two, the tip falling, one bold downward chevron below (less damage)
 3. a round buckler shield seen head-on, a thick rim and a horizontal band (damage shield)
 4. three concentric rings with a sharp four-pointed spark at their center (sure critical)
Row 2:
 5. a jagged impact burst (spiky star) with one bold upward chevron above it (stronger criticals)
 6. a thick curved arrow swerving around a short upright post (sure dodge)
 7. two six-sided dice, one slightly behind the other, pips as simple dots (extra die)
 8. a heart shape with one bold upward chevron inside it (healing over time)
Row 3:
 9. a heart shape with a curved arrow looping out of it and back into it (life drain)
10. a small round shield with an arrow bouncing off it and turning back (reflect damage)
11. a thorn star: five thick sharp thorns pointing outward from a small ring (thorns)
12. a shield outline with a keyhole at its center (immunity)
Row 4:
13. a single teardrop with three tiny bubbles rising inside (poison)
14. a single heavy drop below a short diagonal slash mark (bleeding)
15. a single bold flame tongue (burn)
16. a pair of iron shackles: two cuffs joined by a short chain (loses its turn)
```

**Découpe** (`scripts/slice-coins.py`, propre à cette grammaire) : sur fond noir uni ou transparent, chaque pièce est trouvée comme un disque (centre au barycentre, rayon tiré de son aire), découpée en rond avec un bord adouci un peu à l'intérieur de la tranche, et remplit tout son carré de 128 px, sans marge. La planche de contrôle montre chaque pièce à 64 et 24 px, avec un compteur posé dessus.

```sh
python scripts/slice-coins.py <planche.png> src/assets/icons state-power,state-weakened,state-shield,state-sure-crit,state-crit-power,state-sure-dodge,state-extra-die,state-healing,state-drain,state-reflect,state-thorns,state-immunity,state-poison,state-bleed,state-burn,state-lost-turn controle.png
```

Intégration : les noms dans `IconName`, et l'état dans `STATE_ICON` (`Icon.tsx`). La zone d'état (`StatusTray`) pose l'emblème sans cadre, à 48 px, teinté légèrement en vert ou en rouge selon sa polarité (`.state-tint`, 0.79.3), et son compteur dessus. Les statuts, leurs compétences et le compendium gardent leurs icônes peintes.

### Règles de design des icônes

- **Un objet, une silhouette épaisse**, lisible à 20 px, sans cadre ni fond.
- **Aura = halo.** Un statut permanent (aura) est posé devant une lueur ronde et diffuse de sa couleur d'accent ; les autres n'ont que la lumière de l'objet. ChatGPT a tendance à mettre un halo partout (v2) : la distinction tient donc surtout au motif.
- **Malus = couleurs froides et maladives** (Peur : violet-noir, Pourriture : brun-violet), sans or triomphant.
- **Palette du personnage.** Les icônes d'un personnage reprennent les couleurs de sa ligne dans la palette (section 1) : ivoire, or et bleu pour la prêtresse, jade et jaune-vert pour Naraxes, rouge sang et feu orangé pour le paladin, vert sève et châtaigne pour le druide.
- **Pas deux verts toxiques.** Le vert toxique appartient à `poison` et `poison-aura` : les autres poisons et pourritures prennent une autre teinte (jaune-vert, brun-violet).
- **Rappeler le personnage** quand c'est possible : le sceau de l'Aura d'immunité pend à l'armure du paladin, le bois pourri vient de la couronne du druide.
- **Pas de symbole religieux réel** (croix comprise) : on invente les emblèmes (épée flamboyante, disque solaire).
- **Reliques : une couleur dominante chacune** (retour de l'utilisateur du 2026-10-27, U6 : « la majorité sont brunâtres, patinées ; le traitement est bon mais les couleurs pourraient être plus variées »). On garde le traitement (objet usé, cabossé, patiné, avec son attache, [RELIQUES.md](RELIQUES.md) § 6.2), mais le brun, le bronze et le cuir ne dominent plus : chaque nouvelle relique reçoit **une teinte maîtresse franche**, tirée d'un matériau qui la porte naturellement (verre bleu cobalt, émail rouge, jade, argent bleuté, ivoire, ambre clair, cuivre vert-de-gris, laque noire, soie teinte, plume colorée), et le brun ne reste qu'en attache ou en accent. Avant une planche : poser les reliques côte à côte avec la planche précédente, et ne jamais donner deux fois de suite la même teinte maîtresse ; la viser dans le prompt (« dominant color: cobalt blue glass… »). La patine se lit dans l'usure (éclats, rayures, réparations), pas dans un voile brun sur toute l'image. La teinte n'est jamais une couleur de type ou de famille (refus de l'utilisateur, « c'est carnaval ») : elle vient de l'objet.
- **Emblèmes de maîtrise : une grammaire à part** (v27, 2026-10-27, [MAITRISES.md](MAITRISES.md) § 12). Un emblème n'est ni une compétence (geste), ni un état (pièce gravée), ni une relique (objet) : **une seule pièce héraldique simple, vue bien de face, plate**, sans cadre, sans contour d'écu, sans pièce ni fond, silhouette épaisse lisible à 24 px ; **une seule couleur maîtresse** par emblème (une ombre de la même couleur et un petit rehaut), les onze bien distinctes ; pas de liseré d'or sauf si l'or est la couleur maîtresse ; **aucun halo** (ce ne sont pas des auras) ; jamais mélangés sur une planche avec d'autres types. Couleurs : Fureur orange feu, Sang cramoisi, Chasse bleu nuit, Rempart gris fer, Représailles bronze bruni, Poison vert toxique, Chance or de pièce, Lumière blanc ivoire, Ombre violet-noir, Orage cyan électrique, Chant magenta. Sans fichier, `MasteryIcon` montre l'initiale dorée dans un rond.

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

**v7 (3 icônes) :** jamais générée, fusionnée dans la v8 (mêmes motifs pour `bleed`, `cleave` et `thorns`).

**v8, intégrée le 2026-10-20 (8 icônes, 3×3, dernière case vide ; référence de style jointe : les icônes `thorns`, `power-aura`, `poison-aura`, `claw` et `life-bloom`) :** toutes les icônes manquantes des personnages en jeu. Rangée 1, le Saignement et ses sources (sang rouge sombre et froid, jamais vermillon, aucun cœur : `breach` et `lifesteal` le prennent déjà) ; rangée 2, l'Aura glaciale d'Ervald (bleu glacé, pas de vert toxique) puis le relais du druide ; rangée 3, ses deux auras. Le druide garde sa palette (châtaigne, vert sève `#a3e635`, mousse) ; la Rancune et son aura prennent l'ambre orangé de l'aura en jeu. Motifs choisis pour ne doubler aucune icône du druide (graine, écorce, lucioles, tête d'ours, patte griffue, bois pourri). 1. three heavy dark-crimson blood drops falling from a short jagged open slash mark, cold dark red with a faint sickly violet edge, no gold (`bleed`, malus) · 2. a massive notched two-handed iron cleaver caught mid-swing in a wide diagonal arc, olive-green leather-wrapped grip, a crescent slash trail, thick dark-crimson blood flung from its edge, no glow (`cleave`, Pourfendre de Gorak) · 3. the same coiled thorny bramble vine as the attached `thorns` icon, bronze-tipped thorns now wet with dark-crimson blood, a few drops falling (`thorns`, Épines acérées, remplace l'actuelle) · 4. [AURA] the same small bronze censer on short chains as the attached `poison-aura` icon, now crusted with frost and short icicles, exhaling pale icy-blue mist, a few dark poison drops frozen inside the ice, pale icy-blue glow, NO green (`frost-aura`, Aura glaciale, remplace `poison-aura`) · 5. a single large curved bear fang hanging from a knotted brown leather cord, a smoldering amber-orange ember glowing inside cracks of the fang, no background glow (`grudge`, Rancune) · 6. a heavy glowing drop of emerald sap welling out of a deep cut in a piece of chestnut-brown bark, sap-green light, no background glow (`sap`, Sève) · 7. [AURA] a large bear paw print scorched into a round slab of dark oak, the print glowing like molten amber-orange embers, soft amber-brown glow (`grudge-aura`, Aura de rancune) · 8. [AURA] a living deer antler sprouting fresh sap-green leaves and small buds, soft emerald glow (`sap-aura`, Aura de sève ; le pendant vivant du bois pourri de `rot-aura`) · 9. vide. Découpe : `python scripts/slice-icons.py <planche.png> src/assets/icons bleed,cleave,thorns,frost-aura,grudge,sap,grudge-aura,sap-aura controle.png`. Intégration : les huit noms dans `IconName` ; `STATUS_ICON` : `bleed`, `frostAura: 'frost-aura'`, `grudge`, `sap`, `grudgeAura: 'grudge-aura'`, `sapAura: 'sap-aura'` ; les compétences `cleave`, `frost-aura`, `grudge`, `sap`, `grudge-aura` et `sap-aura` trouvent leur icône par leur id (fichier du même nom) ; `poison-aura.png` est sorti du jeu (corbeille).

**v9, druide (4 icônes, 2×2, intégrée le 2026-10-20 ; références jointes : `claw`, `life-bloom`, `grudge-aura`, `fireflies` ; palette du druide, aucune aura) :** 1. a small dark storm cloud with a thick jagged forked lightning bolt striking down out of it, crackling white-blue core, a few emerald sparks at the tip, no gold · 2. the carved head of a gnarled druid staff crowned with two small deer antlers, a ring of glowing emerald runes swirling around it · 3. a massive chestnut bear paw slamming down on a grey boulder that splits under it, amber dust and a short amber shockwave · 4. a pale sickly green ghost flame clinging to a charred, smoking scrap of dark cloth, ember-red edges, no gold.

**v10, reliques (12 icônes, 4×4, intégrée le 2026-10-20) :** prompt complet dans [RELIQUES.md](RELIQUES.md) § 10 (grammaire des reliques : objet immobile, attache, usure, magie contenue, compte dessiné dans l'objet, aucun halo).

**v11, interface (6 icônes, 3×3, intégrée le 2026-10-20 ; références jointes : `sound-on`, `sound-off`, `coin-pile`, `trophy` ; or et bronze, cuir, bois, vieux papier, « moins de lueur, silhouette plus simple ») :** 1. a small bronze hand drum with a leather skin, two crossed wooden drumsticks resting on it · 2. the exact same drum with a bold red diagonal slash · 3. a fat leather coin purse tied with a cord, a few gold coins peeking out · 4. a single round bronze betting token, notched rim, an engraved laurel ring · 5. a heavy red velvet stage curtain rope ending in a big gold tassel · 6. a torn paper betting ticket with a punched hole, pinned by a brass pin, illegible ink strokes.

**v13, reliques élémentaires (4 icônes, 2×2, intégrée le 2026-10-22, générée par l'agent avec Artlist : GPT Image 2.5, fond transparent ; référence jointe : les douze reliques de la v10 composées en une planche 4 × 3) :** gabarit de la planche des douze (RELIQUES.md § 10), matériaux « aged iron, tarnished silver, worn dark leather, old bone, warm bronze », et ce paragraphe ajouté après RELICS : _« These four are ELEMENTAL relics: each one holds a fragment of an old spell (fire, frost, wind, earth), SEALED inside it. The element is clearly visible INSIDE the object, bright and alive but still locked in: nothing bursts out, no flames, frost, wind or rocks leave the object, no background glow behind any icon. »_ 1. a small cage of black forged iron with exactly FOUR thick vertical bars, round like a lantern, a living ember trapped inside glowing orange and red, its light only between the bars, hanging from a short iron chain; NOT a wire cage, NOT a tooth · 2. a teardrop of pale blue ice that never melts, set in a claw of tarnished silver, frost feathers frozen inside it, one sharp crack across it at about one third of its height from the bottom, hanging from a thin leather cord · 3. a spiral sea shell, ivory and sand with a pale teal inner sheen, exactly TWO turns of spiral, a faint swirl of trapped wind visible deep in its opening, pierced near the tip and hung from a knotted leather strap · 4. a rough grey stone geode split open in half, showing a hollow lined with small crystals and exactly TWO large glowing amber crystals at its heart, bound by a worn leather strap with a bronze buckle. Le « NOT a wire cage, NOT a tooth » tient la Braise loin de la Dent de loup (croc dans une cage de fil de fer).

**v14, reliques consommatrices (5 icônes, 3×3, intégrée le 2026-10-24, générée par l'agent avec Artlist : GPT Image 2.5 en image à image, fond transparent ; référence jointe : les seize reliques existantes composées en une planche 4 × 4) :** motifs de [RELIQUES.md](RELIQUES.md) § 13, dans la grammaire des reliques (§ 6) : 1. Fiole de venin, une goutte figée le long du col · 2. Croc de boucher, une goutte de sang séché · 3. Encens de l'abbaye, un pain de résine ambrée enveloppé de lin avec une seule braise (pas un encensoir : c'est l'icône de l'Aura de décoction) · 4. Écu cabossé, la bosse de fer d'un écu à six creux · 5. Plume d'aigle, deux barbes arrachées.

**v15, emblèmes d'état (5 emblèmes, 3×3, intégrée le 2026-10-24, générée par l'agent avec Artlist : GPT Image 2.5 en image à image ; référence jointe : les seize emblèmes de la v12 composés sur fond noir) :** prompt de la v12 (§ Icônes à générer), liste ICONS remplacée : 1. a wilting leaf with two holes (`state-rot`, Pourriture) · 2. a cracked breastplate (`state-breach`, Brèche) · 3. a firefly with a glowing tail (`state-firefly`, Luciole) · 4. a sword blade bent wavy (`state-spoiled`, Coup gâché) · 5. a target with an arrow plunging in (`state-vulnerable`, Vulnérable). Découpe : `python scripts/slice-coins.py <planche.png> src/assets/icons state-rot,state-breach,state-firefly,state-spoiled,state-vulnerable` (rayon 136 à 137 px). Intégration : `STATE_ICON` (`Icon.tsx`).

**v16, reliques de durée (3 icônes, 3×3, intégrée le 2026-10-25, générée par l'agent avec Artlist : GPT Image 2.5 en image à image ; référence jointe : la planche des reliques) :** motifs de [RELIQUES.md](RELIQUES.md) § 14, dans la grammaire des reliques (§ 6) : 1. Gambison matelassé, un gambison plié au col lacé, avec une pièce recousue · 2. Onguent du rebouteux, un pot de terre cuite aux cinq creux de doigts et à la ficelle nouée · 3. Chandelle de veille, une chandelle de suif aux trois anneaux gravés, dans un bougeoir de fer à anneau.

**v17, compétences consommatrices (4 icônes, 2×2, intégrée le 2026-10-25, générée par l'agent avec Artlist : GPT Image 2.5 en image à image ; référence jointe : une planche de seize icônes de compétences existantes) :** motifs de [SORTS.md](SORTS.md) § 22 : 1. Curée, une corne tachée de sang aux deux entailles rouges · 2. Récolte, une faucille d'os givrée qui tranche de la ciguë, une goutte violette · 3. Virulence, un croc de serpent et trois gouttes de venin qui grossissent · 4. Sentence, une balance dorée, une flamme dans le plateau baissé, un halo d'ivoire. La Rancune reprend `grudge.png` (icône existante, sans usage jusque-là).

**v18 et v19, second lot de la phase 8 (4 + 4 icônes, deux planches 2×2, intégrées le 2026-10-25 pendant la passe de nuit, générées par l'agent avec Artlist : GPT Image 2.5 en image à image) :** une planche par grammaire (règle de cette bible). **v18**, les quatre compétences, sur la référence des compétences (l'objet en action, la magie peinte, la palette du porteur) : 1. Embrasement (Thaldrin : vert de chêne, ambre, braise) · 2. Dé pipé (Naraxes : vert des marais, or, violet de la chance) · 3. Rempart hérissé (Brokk : acier bleu-gris, chêne, rouge sombre) · 4. Vindicte (Aldric : or, ivoire, bleu nuit). **v19**, les quatre reliques, sur la référence des reliques (un objet immobile et patiné, son attache, la magie contenue, le chiffre de la règle dessiné dans l'objet) : 1. Soufflet de forge (trois clous) · 2. Clous de pavois (trois clous) · 3. Gantelet du talion (une pointe) · 4. Pièce trouée (deux étoiles). Motifs complets : inventaire, n° 108 à 115. Les quatre statuts du lot (`conflagration`, `loadedDie`, `bristlingRampart`, `vendetta`) montrent l'icône de leur compétence, comme la Curée, la Sentence et la Rancune.

**v20, le Duo (1 icône, intégrée le 2026-10-25, générée par l'agent avec Artlist : GPT Image 2.5 en image à image, référence : la planche des compétences) :** deux dés d'ivoire qui roulent côte à côte sur une portée de musique, dans le halo mauve de l'Aura mélodieuse (palette de la barde). Une seule icône pour la compétence et son statut `duo`.

**v21, les quatre reliques de source (4 icônes, une planche 2×2, intégrées le 2026-10-25, générées par l'agent avec Artlist : GPT Image 2.5 en image à image, référence : la planche des reliques) :** 1. Dard de guêpe (dard séché dans un capuchon de laiton, deux gouttes de venin) · 2. Briquet d'amadou (boîte à briquet de fer, deux braises, silex et battant) · 3. Pièce de foire (jeton de foire en laiton à tête de bouffon, cordon rouge et jaune) · 4. Brassard à pointes (brassard de cuir à pointes, une grande pointe rabattue vers l'arrière). Le chiffre de la règle est dessiné dans l'objet (2 gouttes, 2 braises, 1 pointe).

**v22, trois compétences de la revue des auras (3 icônes, une planche 2×2, intégrées le 2026-10-25, générées par l'agent avec Artlist : GPT Image 2.5 en image à image, référence : la planche des compétences) :** 1. Bouclier de foi (écu d'ivoire et d'or qui durcit dans une lumière de soin) · 2. Pas de côté (botte de cuir qui esquive une flèche d'un pas de côté, rémanence bleue) · 3. Plaie ouverte (pointe de flèche qui ouvre une entaille sanglante dans une armure de cuir, étincelle d'or du critique). La quatrième case reste vide.

### Résultat attendu et intégration

| Élément | Convention |
| --- | --- |
| Source | Planche déposée à la racine, puis mise à la corbeille après découpe (`gio trash`) |
| Fichiers | `src/assets/icons/<identifiant>.png` : PNG transparent, carré de 128×128, icône recadrée au plus près puis centrée avec une marge de 8 %, optimisé (`optipng -o5`) |
| Code | Ajouter le nom à `IconName` dans `src/components/Icon.tsx`, et relier chaque statut dans `STATUS_ICON` (identifiant du statut → nom de l'icône). Le test de `screens.test.tsx` exige une icône peinte pour tout statut en jeu. |
| Affichage | `<Icon name="…" />`, à 1,3 fois la taille du texte, alignée sur la ligne de base ; `className` pour une autre taille |
| Contrôle | Planche de contrôle (icônes sur fond pierre `#0c0a09`, à 64 et 20 px) regardée avant l'intégration |
| Serveur de dev | Sans rechargement à chaud (`hmr` et `ws` à `false`), le serveur déjà lancé ne voit pas un **nouveau** fichier : la liste `import.meta.glob` d'`Icon.tsx` reste celle du démarrage, même après F5 (constaté en 0.91.2 : les reliques élémentaires gardaient leur initiale sur le serveur de l'utilisateur). Après l'ajout, `touch src/components/Icon.tsx`, puis F5 |

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
| v31 | 2026-10-28 | 115, 174 à 183 | La refonte des auras : ses trois auras nouvelles (Bastion, Jugement, Brasier), la Faute du Jugement, les trois pièces de la Chance (bouclier, rafale, ensorcelée), les trois reliques venues des auras sorties (Ampoule bénite, Chaîne du geôlier, Pointe de paratonnerre) et le Trèfle de fer repeint en Coccinelle d'émail (Q14 : un porte-bonheur sans trèfle, sans fer à cheval, sans pièce). Artlist, GPT Image 2.5, 320 crédits ; deux planches : compétences 3×3 (`bastion`, `judgement`, `fault`, `brasier`, `shield-coin`, `volley-coin`, `hex-coin`, deux cases vides), reliques 2×2 (`blessed-phial`, `gaoler-chain`, `lightning-rod`, `holed-coin`). `bastion` détouré à la main : une légère trace de damier dans le halo, à repeindre si elle se voit. Les provisoires retirées (`shield`, `purification`, `fear`, `stoke` ; les pièces teintées). Non vues dans un écran du jeu. |
| v30 | 2026-10-28 | 22, 115, 138 | Le retour du 2026-10-28 : les deux porte-bonheur (« pas des pièces ») et l'Aura de poison (A3). Artlist, GPT Image 2.5, 160 crédits ; planche 2×2, **la version A retenue** : `weighted-coin` repeinte en Patte de lièvre, `holed-coin` en Trèfle de fer, `frost-aura` en encensoir à fumée verte. Mêmes ids et noms de fichiers. Non vues dans un écran du jeu. |
| v29 | 2026-10-27 | 100, 161 à 173 | La quatrième demande : les treize briques du contenu des maîtrises et du soin (Élan, Surtension, Emprise, Larcin, Onde de choc ; Dîme, Flamme votive, Sangsue, Serment de sang, Odeur du sang, Peau de crapaud, Pièce vert-de-gris, Morsure), et la Plume d'aigle repeinte à quatre barbes arrachées (recharge 4 tours). Artlist, GPT Image 2.5, 160 crédits, 14 icônes ; **la version damier retenue**. Les icônes provisoires (`sentence`, `burn`, `lifesteal`, `decoction-aura`, `cursed-coin`, `virulence`) sont retirées de ces briques ; `tithed` et `votive` empruntent l'icône de leur compétence. Planche de contrôle regardée (128 px) ; non vues dans un écran du jeu. |
| v28 | 2026-10-27 | reliques d'avant la 0.121.0 | **Recoloration** (B14, demande de l'utilisateur : des reliques plus colorées, comme les nouvelles, couleurs plus intenses et variées). Artlist, GPT Image 2.5, 320 crédits ; deux planches 4×4 en image-à-image, depuis une mosaïque des anciennes icônes, la planche v25 en cible de couleur ; **la version A retenue** : 29 icônes repeintes (`caged-ember` prise dans la version B, restée rouge). `venom-vial` gardée telle quelle (déjà verte). Mêmes identifiants, mêmes motifs. Emblèmes : `mastery-storm` renommé `mastery-magic`, `mastery-hunt`, `mastery-retaliation` et `mastery-song` retirés (0.122.0, huit maîtrises). Non vues dans un écran du jeu. |
| v27 | 2026-10-27 | 150 à 160 | Les onze emblèmes de maîtrise (grammaire nouvelle, ci-dessus). Artlist, GPT Image 2.5 ; planche 4×4 (cinq cases vides), deux versions générées, **la version B retenue**. Découpe par `scripts/slice-icons.py`. Vus dans le compendium (onglet Maîtrises) et à l'affrontement (captures Firefox). |
| v26 | 2026-10-27 | 139 à 149 | Onze compétences et statuts des Maîtrises (Veine, Effroi, Rancœur, Champ d'orage, Ballade, Prière, Flétrissure, Assaut, Poing de pierre, Pièce porte-bonheur, Pièce maudite). Artlist, GPT Image 2.5 ; planche 4×4 (cinq cases vides), deux versions : **la version A retenue**, sauf `lucky-streak` découpée de la version B sur fond noir. Les pièces remplacent leurs remplaçants temporaires (`coin-pile`, `coin-face`). |
| v25 | 2026-10-27 | 102, 136 à 138 | Trois reliques nouvelles (Médaille de sursis, Cor d'avant-garde, Pièce lestée) et l'Onguent du rebouteux repeint avec deux creux. Premières reliques sous la règle U6 (une teinte maîtresse franche). Artlist, GPT Image 2.5 ; planche 2×2, deux versions : **la version damier retenue**. Les trois planches v25 à v27 : 480 crédits. |
| v24 | 2026-10-25 | 133 à 135 | Trois compétences du lot 3 de la phase 8 (Ciel d'orage, Ivresse du sang, Coup de massue ; leurs statuts reprennent ces icônes). Artlist, GPT Image 2.5 en image à image, référence : la planche des compétences ; une planche 2×2 de trois, deux versions générées ; la version A retenue pour les trois (v23 et v24 : 320 crédits en tout). Découpe par `scripts/slice-icons.py`. Planche de contrôle regardée seulement ; pas encore vues dans un écran de jeu. |
| v23 | 2026-10-25 | 124 à 132 | Neuf compétences du lot 3 de la phase 8 (Brise-garde, Malchance, Éclair aveuglant, Hémorragie, Confiscation, Feinte, Sève noire, Dette de sang, Attiser ; leurs statuts reprennent ces icônes). Artlist, GPT Image 2.5 en image à image, référence : la planche des compétences ; une planche 3×3, deux versions générées : Malchance, Éclair aveuglant et Sève noire de la version B, les six autres de la version A. Découpe par `scripts/slice-icons.py`. Planche de contrôle regardée seulement ; pas encore vues dans un écran de jeu. |
| v22 | 2026-10-25 | 121 à 123 | Les trois auras de la revue des compétences (Bouclier de foi, Pas de côté, Plaie ouverte ; leurs statuts reprennent ces icônes). Artlist, GPT Image 2.5 en image à image, référence : la planche des compétences ; une planche 2×2 de trois, deux versions générées (160 crédits) : Bouclier de foi et Plaie ouverte de la version B, Pas de côté de la version A. Découpe par `scripts/slice-icons.py`. Planche de contrôle regardée seulement ; pas encore vues dans un écran de jeu. |
| v21 | 2026-10-25 | 117 à 120 | Les quatre reliques de source (Dard de guêpe, Briquet d'amadou, Pièce de foire, Brassard à pointes). Artlist, GPT Image 2.5 en image à image, référence : la planche des reliques ; une planche 2×2, deux versions générées (160 crédits), la version A retenue pour les quatre. Découpe par `scripts/slice-icons.py`. Planche de contrôle regardée (128 et 24 px) ; pas encore vues dans un écran de jeu. |
| v20 | 2026-10-25 | 116 | Le Duo (compétence de la barde et son statut). Artlist, GPT Image 2.5 en image à image, référence : la planche des compétences ; une icône, deux versions générées (160 crédits), la version A retenue. Découpe par `scripts/slice-icons.py`, `src/assets/icons/duo.png`. Pas encore vue dans un écran de jeu. |
| v19 | 2026-10-25 | 112 à 115 | Les quatre reliques du second lot de la phase 8 (Soufflet de forge, Clous de pavois, Gantelet du talion, Pièce trouée). Artlist, GPT Image 2.5 en image à image, référence : la planche des reliques ; une planche 2×2, deux versions générées, la version A retenue pour les quatre (v18 et v19 : 320 crédits en tout). Découpe par `scripts/slice-icons.py`, optimisées. Planche de contrôle regardée (128 et 24 px) ; vues dans les écrans par la passe de finition. |
| v18 | 2026-10-25 | 108 à 111 | Les quatre compétences du second lot de la phase 8 (Embrasement, Dé pipé, Rempart hérissé, Vindicte ; leurs statuts reprennent ces icônes). Artlist, GPT Image 2.5 en image à image, référence : la planche des compétences ; une planche 2×2, deux versions générées, la version A retenue pour les quatre. Découpe par `scripts/slice-icons.py`, optimisées. Planche de contrôle regardée (128 et 24 px) ; vues dans les écrans par la passe de finition. |
| v17 | 2026-10-25 | 104 à 107 | Les quatre compétences consommatrices peintes de la phase 8 (Curée, Récolte, Virulence, Sentence ; la Rancune reprend `grudge.png`). Artlist, GPT Image 2.5 en image à image, référence : seize icônes de compétences ; une planche 2×2, deux versions générées (160 crédits) : Curée et Virulence de la version B, Récolte et Sentence de la version A. Découpe par `scripts/slice-icons.py`, optimisées. Planche de contrôle regardée (128 et 24 px) ; pas encore vues dans un écran de jeu. |
| v16 | 2026-10-25 | 101 à 103 | Les trois reliques de durée (Gambison matelassé, Onguent du rebouteux, Chandelle de veille). Artlist, GPT Image 2.5 en image à image, référence : la planche des reliques ; une planche de trois, deux versions générées (160 crédits), la version A retenue pour les trois. Découpe par `scripts/slice-icons.py` (noms de la grille 3×3), optimisées. Planche de contrôle regardée (128 et 24 px) ; pas encore vues dans un écran de jeu. |
| v15 | 2026-10-24 | 5 emblèmes d'état | Pourriture, Brèche, Luciole, Coup gâché, Vulnérable (A8 de la revue). Artlist, GPT Image 2.5 en image à image, référence : les seize emblèmes de la v12 sur fond noir ; deux versions générées (160 crédits), les cinq retenus de la première. Découpe par `scripts/slice-coins.py` (rayon 136 à 137 px), optimisés. Planche de contrôle regardée (64 et 24 px, avec compteur) ; pas encore vus dans un écran de jeu. |
| v14 | 2026-10-24 | 96 à 100 | Les cinq reliques consommatrices. Artlist, GPT Image 2.5 en image à image, référence : les seize reliques en planche 4 × 4 ; deux versions générées (160 crédits). Retenues : Fiole et Écu de la première, Croc, Encens et Plume de la seconde. L'Écu redessiné une fois par une retouche (80 crédits) pour montrer exactement six creux. Découpe par `scripts/slice-icons.py`, `optipng`, 128 × 128. |
| v13 | 2026-10-22 | 92 à 95 | Les quatre reliques élémentaires. Première planche générée par l'agent (Artlist, GPT Image 2.5, deux planches d'un coup) : vrai canal alpha, découpe sans retouche. Retenues : Braise, Larme et Conque de la seconde planche (cage ronde à quatre barreaux, fêlure au tiers, spirale lisible), Géode de la première (les deux moitiés se lisent mieux qu'une géode entière ceinturée). |
| v12 | 2026-10-21 | 76 à 91 | Emblèmes d'état, nouvelle grammaire : pièces gravées monochromes. Deux versions générées : la première (or, bronze et couleurs, vrai canal alpha) était trop proche des compétences ; la seconde, retenue, ajoute « monochrome » et « carved on a coin ». Fond noir uni, pas de canal alpha : découpe en disque par `scripts/slice-coins.py`, sans retouche (rayons de 136 à 139 px). |
| v11 | 2026-10-20 | 70 à 75 | Interface : musique, bourse, jeton, coup de théâtre, ticket. Vrai canal alpha ; une poussière de 89 px près du tambour, effacée avant la découpe. La corde de l'embrasse (`twist`) est coupée net au bord de sa case, visible en grand. |
| v10 | 2026-10-20 | 58 à 69 | Les douze reliques. Vrai canal alpha, découpe sans retouche ; icônes plus grandes que leur case (avertissements du script sans conséquence). |
| v9 | 2026-10-20 | 54 à 57 | Druide : Foudre, Incantation, Force de l'ours, Brûlure. Vrai canal alpha, découpe sans retouche. |
| v8 | 2026-10-20 | 17 (refaite), 22 (remplacée), 48 à 53 | Saignement et ses sources (v7 fusionnée), Aura glaciale, relais du druide. Vrai canal alpha. Les lueurs de l'Aura glaciale et de l'Aura de rancune se touchaient : le script répartit désormais un morceau partagé entre deux cases selon le cœur opaque le plus proche. |
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
6. **Générer par Artlist (agent, depuis le 2026-10-22).** Quand le serveur Artlist est branché dans la session, l'agent génère lui-même, sans passer par ChatGPT :
   - modèle **GPT Image 2.5** (image à image), carré `1:1`, `background: "transparent"` : le canal alpha est réel (planche v13, vérifiée) ; `num_images: 2` donne deux planches pour le prix de deux images (200 crédits la paire en v13), et on garde la meilleure version de chaque icône ;
   - référence de style : composer les icônes voisines déjà intégrées en une planche (les PNG de 128 px agrandis dans une grille sur fond transparent), la téléverser, puis la joindre à la génération ;
   - le prompt est le même que pour ChatGPT (gabarit de la section 7) ; découpe et contrôle inchangés (`slice-icons.py`, une planche de contrôle par planche générée) ;
   - aucune source déposée à la racine : les planches restent dans le dossier temporaire de la session.
   - **postures d'un personnage** (0.120.0, perte de contrôle ; 0.124.0, incantation) : même modèle, sortie 2K, fond opaque gris ; la référence est la planche à remplir elle-même (la garde dans sa case, le reste vide), méthode et prompts dans [POSTURES.md](POSTURES.md) § 6.1 et § 7.1.

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
