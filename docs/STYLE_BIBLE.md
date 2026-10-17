# Style bible : génération d'images (ChatGPT Image)

Ce document fixe la direction artistique de Battler et donne des prompts prêts à copier. Le but : des images **cohérentes entre elles**, **originales** et **directement intégrables** au jeu.

> Les personnages actuels (`orc.png`, `elf.png`, `dwarf.png`) sont des placeholders qui proviennent de jeux ou d'œuvres existants. Ils doivent être remplacés par des créations originales avant toute diffusion publique. Ne jamais citer un jeu, un studio, un artiste ou un personnage existant dans un prompt.

---

## 1. Direction artistique

**En une phrase :** de la high fantasy héroïque, stylisée et peinte à la main, comme les illustrations de personnages des grands MMORPG. Les couleurs sont franches et propres à chaque faction, les proportions sont volontairement exagérées pour qu'on distingue les races au premier coup d'œil, et les visages restent fins, nets et charismatiques.

La référence de ton est l'elfe placeholder actuelle (`elf.png`) : armure ornementée lie-de-vin, filigranes argentés, gemmes émeraude, cape en lambeaux, plumes, yeux lumineux, silhouette élancée et très lisible. On vise ce niveau de finition et cette lisibilité, avec des designs originaux. Il ne faut jamais nommer le jeu ou le personnage d'origine dans un prompt.

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
| Elfe | Peau pâle et légèrement froide ; armure lie-de-vin `#7f1d3a` ; touches émeraude `#10b981` |
| Nain | Barbe roux cuivré `#b45309` ; acier sombre et laiton gravé `#b08d3c` |
| Mort-vivant | Cape et tabard pourpre usé `#5b2a86`, cuir brun et acier rouillé, peau livide, yeux turquoise `#2dd4bf` |

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

### Arènes (`src/assets/arena-<lieu>.jpg`)

| Contrainte | Valeur | Pourquoi |
| --- | --- | --- |
| Format | **1536×1024**, à recadrer en **1920×1080 (16:9)**, JPG | Fond de la scène de 1600×900 |
| Composition | Un sol dégagé et plat sur le **tiers inférieur central** ; l'horizon vers 40 à 45 % de la hauteur | Les combattants se tiennent à gauche et à droite du centre, en bas ; l'image est cadrée à `50% 70%` |
| Centre | Peu de contraste et pas d'élément fort au milieu | L'interface (dés, journal) et les impacts s'y affichent |
| Personnages | **Aucun** personnage, ni créature, ni texte | Les combattants sont ajoutés par le jeu |
| Lumière | Assez claire et lisible | Le jeu assombrit le fond (`brightness 0.45`, désaturation, flou) |

---

## 3. Bloc de style à coller en tête de chaque prompt

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
Dominant color: <couleur dominante>; accents in amber gold.

FRAMING: full body from head to feet, standing combat stance, three-quarter view facing RIGHT,
both feet on the ground, weapon not covering the face, head in the upper third,
small even margin around the figure, feet near the bottom edge.

OUTPUT: portrait 1024x1536, transparent background, clean cutout edges, no ground, no shadow, no scenery.
```

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

**Variantes** : aujourd'hui, la teinte est faite en CSS. Pour générer une vraie variante plus tard, on reprend l'image du personnage de base et on demande : _« Same character, same pose, same framing and style, only change: … »_.
- Murzug (Berserker) : peau rouge brique, peintures de guerre, plus de cicatrices.
- Sylwen (Sentinelle sylvestre) : armure vert forêt, motifs de feuilles.
- Grimbald (Briseur de fer) : acier brut grisé, barbe gris cendre, marteau de guerre à la place de la hache.

---

## 5. Gabarit : arène

Une arène peut être **n'importe quel lieu** du monde : une forêt, des égouts, la place d'une grande ville, un cimetière, un port, une mine… Ce qui fait l'unité du jeu, c'est le **rendu** et la **composition**, pas le décor. Le prompt se monte donc en deux parties : un bloc fixe, toujours identique, et une fiche de lieu qui change à chaque arène.

### 5.1 Bloc fixe (à coller tel quel)

```text
STYLE: original high-fantasy environment painting, hand-painted digital illustration,
painterly brushwork, rich detailed materials, atmospheric depth, readable light,
saturated but harmonious colors, epic mood. Original location, not based on any existing game.
AVOID: casual mobile game look, pastel or candy colors, characters, creatures, people,
corpses, gore, text, letters, logo, watermark, strong object in the center.

COMPOSITION: wide establishing view at human eye level, straight-on. A flat, open, walkable
ground fills the lower central third (two fighters will stand there, left and right of the
center). Horizon or back wall at about 40% of the height. The center is calm and low-contrast,
with the depth of the scene opening there. Strong framing elements on the left and right edges.
The scene must stay readable even when darkened: one clear light source lights the ground.

OUTPUT: landscape 1536x1024, no characters.
```

Ensuite, on ajoute la fiche du lieu :

```text
LOCATION: <lieu, en une phrase>.
FRAMING ELEMENTS: <ce qui encadre à gauche et à droite>.
GROUND: <matière du sol plat au centre>.
BACKGROUND: <ce qu'on voit au fond, au centre>.
TIME AND WEATHER: <heure, météo, particules>.
LIGHTING AND PALETTE: <source de lumière principale, teintes dominantes>.
```

Joindre une arène validée et ajouter en tête : _« Use the attached image as the style reference: same painting technique, level of detail, camera height and composition, but a completely different location. »_

### 5.2 Varier les arènes

Chaque arène joue sur six axes. **Une nouvelle arène doit changer au moins trois axes** par rapport à toutes celles qui existent, et sa **palette dominante doit être nouvelle** : c'est elle qui se remarque le plus une fois le fond assombri par le jeu.

| Axe | Possibilités |
| --- | --- |
| Type de lieu | Nature, ville, souterrain, sacré, ruine, frontière, magique |
| Intérieur / extérieur | Ciel ouvert, semi-couvert (cour, cloître, quai), sous un toit, sous terre |
| Heure | Aube, plein jour, fin d'après-midi, crépuscule, nuit |
| Météo et particules | Clair, brume, pluie, neige, vent de sable, braises, spores, lucioles |
| Source de lumière | Soleil, lune, torches, braseros, forges, cristaux, magie, puits de lumière |
| Palette dominante | Vert et or, gris acier et orange, bleu nuit et ambre, turquoise et vert, ocre et rouge, violet et argent… |

**Garde-fous pour les lieux sombres** (égouts, cimetière, caverne, nuit) : le jeu assombrit le fond de moitié. Il faut donc demander une image **plus claire qu'on ne l'imagine**, avec une source de lumière franche au centre ou au fond qui éclaire le sol. L'ambiance peut être inquiétante, mais pas horrifique : ni cadavres, ni sang, ni créatures.

**Garder le sol jouable** : quel que soit le lieu, le centre bas doit rester plat et dégagé. Il faut le dire explicitement pour les lieux qui s'y prêtent mal : l'eau des égouts reste sur les côtés, les tombes s'alignent sur les bords, les étals du marché s'écartent.

### 5.3 Catalogue de lieux

Fiches prêtes à coller après le bloc fixe. Les deux premières sont déjà générées.

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

### 5.4 Historique des arènes

| Fichier | Lieu | Palette | Remarques |
| --- | --- | --- | --- |
| `arena-ruins.jpg` | Clairière en ruines, fin d'après-midi | Vert, or, pierre chaude | Première référence de rendu et de composition |
| `arena-dwarf-fortress.jpg` | Cour de forteresse naine, neige | Gris acier, laiton, orange | Sol de dalles très lisible |

Ajouter une ligne à chaque nouvelle arène. Avant de choisir la suivante, regarder ce tableau pour changer au moins trois axes et la palette.

---

## 6. Gabarit : fond d'écran de menu

L'écran de sélection (`StartScreen.tsx`) affiche un fond illustré, assombri en CSS (`brightness(0.6)`), avec un vignettage et un dégradé en bas. Ses contraintes diffèrent de celles d'une arène :

| Zone de l'écran | Ce qu'il y a dessus | Ce que le fond doit offrir |
| --- | --- | --- |
| Haut, au centre | Titre « BATTLER » et choix du mode | Zone sombre (plafond, voûte) |
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

### Fond de l'écran de tournoi

L'onglet « Tournoi » de `StartScreen.tsx` a son propre fond, `menu-tournament.jpg` : l'entrée monumentale de l'arène vue **de l'extérieur**. C'est le pendant du portail vu de l'intérieur, pour qu'on sente qu'on change d'écran. Aucun personnage n'y figure : le fond suffit, et l'écran n'a pas à être refait quand on ajoute un personnage.

| Zone de l'écran | Ce qu'il y a dessus | Ce que le fond doit offrir |
| --- | --- | --- |
| Haut, au centre | Titre « BATTLER » et choix du mode | Ciel sombre, haut des remparts dans l'ombre |
| Gauche, du tiers au centre | Un personnage en pied, pieds vers le bas | La porte ouverte et lumineuse juste derrière lui, en contre-jour |
| Moitié droite | Titre « Tournoi à élimination directe », texte et boutons | Mur de pierre sombre et uni, peu contrasté |
| Bas (1/5) | Pieds du personnage | Pavés sombres et unis |

Prompt validé, qui a donné `src/assets/menu-tournament.jpg` (porte fortifiée au crépuscule, porte à 30 % de la largeur) :

```text
STYLE: original high-fantasy environment painting, hand-painted digital illustration,
painterly brushwork, atmospheric depth, rich warm colors, epic and festive yet solemn mood.
Original location, not based on any existing game.
AVOID: casual mobile game look, pastel or candy colors, characters, creatures, crowd, text,
letters, logo, watermark, bright or busy details on the right half of the image.

SUBJECT: the monumental main gate of a grand tournament colosseum, seen from the paved plaza
outside, at dusk. A huge rounded stone archway with a raised iron portcullis and heavy open
wooden doors; through it, a glimpse of the sunlit arena sand and distant stands, golden light
and dust pouring out onto the plaza. Above the gate, a carved stone crest of two crossed swords
and a laurel wreath (no letters), long tournament banners in alternating crimson and deep blue
hanging from the ramparts, lit braziers on both sides of the archway, a few pennants on poles.

COMPOSITION: straight-on view at human eye level, slightly low angle to make the gate feel
monumental. The gate is placed in the LEFT HALF of the image, its center at about 35% of the
width, because a single standing hero will be placed in front of it and must be backlit by
its glow. The RIGHT HALF is a dark, plain, low-contrast stretch of colossal stone wall with
deep shadow, because a title, a paragraph of text and buttons will be placed over it.
The top fifth is dark dusk sky and shadowed ramparts, because the game title sits there.
The bottom fifth is dark, plain paving stones in shadow, where the hero's feet will be.
No strong object at the far left edge, natural vignette in the corners.

LIGHTING: dusk, overall dark image with deep blue-violet sky and stone-grey shadows,
the brightest area is the warm golden-amber light coming through the open gate,
warm brazier glow on the gate pillars, the right half stays dim and cool.

OUTPUT: landscape 1536x1024, no characters, no text.

---

## 7. Icônes d'interface

Les icônes remplacent les emojis utilisés dans les boutons, les fiches, les statistiques et les statuts. Elles sont générées en **une seule planche** (grille de 4×4), puis découpées.

On ne remplace pas la typographie : flèches `←` `▲` `▼`, pastilles `①` `②`, symboles de lecture `▶` `❚❚`.

### Inventaire

| # | Identifiant | Emoji remplacé | Où il apparaît | Motif demandé |
| --- | --- | --- | --- | --- |
| 1 | `swords` | ⚔ | Affrontement, Jouer, Affronter, combat « joué » | Deux épées croisées |
| 2 | `trophy` | 🏆 | Tournoi, Champion, colonnes Tournois | Coupe dorée à deux anses |
| 3 | `lightning` | ⚡ | Simuler, combat « simulé » | Éclair, lueur bleu électrique |
| 4 | `stats` | 📊 | Bouton Statistiques | Trois barres montantes en bronze |
| 5 | `scroll` | 📜 | Bouton Fiche | Parchemin roulé, sceau rouge |
| 6 | `dice` | 🎲 | Au hasard, Compléter | Dé à vingt faces ivoire |
| 7 | `event` | ✨ | Événements (fiches, journal, stats) | Étoile magique violette |
| 8 | `crit` | 🎯 | Statut Critique assuré | Cible avec une flèche au centre |
| 9 | `shield` | 🛡️ | Statut Armure temporaire | Écu cerclé d'or |
| 10 | `poison` | ☠️ | Statut Poison | Crâne, lueur verte toxique |
| 11 | `regen` | 💚 | Statut Régénération | Cœur vert lumineux |
| 12 | `weakened` | 🥀 | Statut Affaibli | Rose rouge sombre fanée |
| 13 | `breach` | 💔 | Statut Brèche | Cœur rouge fendu |
| 14 | `sound-on` | 🔊 | Son activé | Cor de guerre et ondes sonores |
| 15 | `sound-off` | 🔇 | Son coupé | Même cor, barré en rouge |
| 16 | `turns` | ⏳ | Tours restants d'un statut | Sablier en bronze |

L'ordre du tableau est celui de la grille (de gauche à droite, puis de haut en bas). Il ne faut pas le changer, car la découpe s'appuie dessus.

### Prompt de la planche

```text
Create a single square image, 1024x1024, containing a sprite sheet of 16 game UI icons
arranged in a strict 4x4 grid (4 columns, 4 rows). Each icon is centered in its own
invisible 256x256 cell, occupies about 70% of the cell, and never touches or overlaps
the cell borders. Leave clear empty space between icons.

BACKGROUND: fully transparent. If transparency is not possible, use a perfectly flat,
uniform pure black background (#000000) with no gradient, no texture, no vignette.
NO grid lines, NO frames, NO labels, NO numbers, NO text anywhere.

STYLE: original high-fantasy game UI icons, hand-painted stylized fantasy, in the style of
premium MMORPG interface icons. Single object per icon, bold and simple silhouette that
stays readable at 20x20 pixels, thick shapes, no thin details, no background behind the
object, no circular or square frame. Dominant materials: aged gold and warm bronze with
crisp painted highlights, dark brown outline-like shading for contrast. Each icon may use
one accent color as listed. Consistent lighting from the top-left on all icons, same
level of detail, same scale, all icons look like one coherent set.
AVOID: emoji look, flat vector clip-art, cute or cartoon style, glossy plastic,
3D render, photorealism, drop shadows outside the object, text.

ICONS, in reading order (left to right, top to bottom):
Row 1:
 1. two crossed swords, steel blades with gold hilts
 2. a golden trophy cup with two handles
 3. a jagged lightning bolt, gold with pale electric-blue glow
 4. three vertical bars of rising height like a bar chart, carved bronze bars
Row 2:
 5. a rolled parchment scroll with a red wax seal
 6. a single ivory twenty-sided die with gold edges
 7. a four-pointed magic star burst, violet glow with gold core
 8. an archery target with an arrow in the bullseye, red and gold rings
Row 3:
 9. a heater shield with gold rim and steel face
10. a skull, bone-white, with toxic green glow and drip
11. a green heart with a soft emerald healing glow
12. a wilted dark red rose with drooping petals
Row 4:
13. a red heart cracked in two halves
14. a bronze war horn emitting curved sound waves
15. the same bronze war horn, with a bold red diagonal slash across it
16. a bronze hourglass with golden sand
```

### Résultat attendu et intégration

| Élément | Convention |
| --- | --- |
| Source | Planche déposée à la racine, puis mise à la corbeille après découpe (voir `CLAUDE.md`) |
| Fichiers | `src/assets/icons/<identifiant>.png` : PNG transparent, carré de 128×128, icône recadrée au plus près puis centrée avec une marge de 8 % |
| Affichage | Composant `<Icon name="…" />` (`src/components/Icon.tsx`), à 1,3 fois la taille du texte et aligné sur la ligne de base ; `className` pour une autre taille. Les statuts passent par `STATUS_ICON`. |
| Contrôle | Une planche de contrôle (les 16 icônes sur fond pierre `#0c0a09`, à 20 px et à 64 px) est vérifiée avant l'intégration |

**Découpe.** Elle se fait avec `scripts/slice-icons.py` (dépendances : numpy, pillow, scipy, à installer dans un environnement virtuel) :

```sh
python scripts/slice-icons.py <planche.png> src/assets/icons \
  swords,trophy,lightning,stats,scroll,dice,event,crit,shield,poison,regen,weakened,breach,sound-on,sound-off,turns \
  controle.png
```

- Les noms sont donnés dans l'ordre de la grille. Une grille de 2×2 prend 4 noms.
- Le script ne coupe pas aveuglément en cases régulières : il détecte chaque icône et regroupe les morceaux détachés (ondes du cor, gouttes du poison) par case. Il signale un morceau qui déborde sur une case voisine.
- **Damier peint.** En v1, ChatGPT a dessiné le damier de « transparence » dans l'image au lieu d'un vrai canal alpha. Le script le retire : les lueurs deviennent semi-transparentes, et les parties claires cernées d'un contour (acier, ivoire, os) restent opaques. Si la planche a un vrai canal alpha, cette étape est sautée.
- Ensuite, on vérifie `controle.png` (fond pierre, 64 px et 20 px), on optimise les PNG (`optipng -o5`) et on met la planche source à la corbeille.

**Limite connue : le journal de combat.** Les icônes de statut et d'événement y sont insérées dans des chaînes de texte (`narration.ts`, `statusLabel`, `events.ts`). Pour y afficher des images, il faut d'abord remplacer le texte brut par un texte avec des marqueurs d'icône. Les emojis restent en place dans le journal tant que ce n'est pas fait. C'est aussi pour ça que `STATUSES[id].icon` (emoji) est conservé à côté de `STATUS_ICON`.

### Ajouter ou refaire des icônes

- **Une icône ratée :** dans la même conversation ChatGPT, demander _« Keep the exact same sheet, only redraw icon 12 »_. Ou générer l'icône seule, en joignant la planche comme référence : _« Same style, materials, lighting and scale as the attached sheet. Single icon, centered, 1024x1024, transparent background: … »_.
- **De nouvelles icônes :** ajouter des lignes à l'inventaire (identifiants à la suite), puis générer une planche ne contenant **que** les nouvelles icônes, en reprenant le bloc `STYLE` à l'identique et en joignant l'ancienne planche comme référence de style. Pour 1 à 4 icônes, on demande une grille de 2×2 en 1024×1024.
- **Refaire tout le jeu d'icônes :** modifier le bloc `STYLE` ci-dessus, régénérer la planche complète, et noter la nouvelle version dans l'historique.

### Historique des planches

| Version | Date | Icônes | État |
| --- | --- | --- | --- |
| v1 | 2026-10-17 | 1 à 16 | Intégrée dans tous les écrans (hors journal de combat). Damier peint retiré par le script. Avis : très réussies pour les statuts, peut-être un peu trop chargées pour les boutons de menu. Piste pour une v2 des icônes de menu (`swords`, `trophy`, `stats`, `scroll`, `dice`, `sound-*`) : moins de lueur, moins de détails, silhouette plus simple. |

---

## 8. Méthode de travail dans ChatGPT

1. **Une conversation par série.** On garde le même fil pour tous les personnages d'une série, afin que le modèle garde le style.
2. **Image de référence.** On génère d'abord un personnage jusqu'à en être satisfait, puis on l'utilise comme référence pour les suivants : _« Use the previous image as the style reference: same rendering, lighting, level of detail and framing. »_
3. **Retouches ciblées.** Pour corriger un détail, on le dit précisément et on demande de garder le reste : _« Keep everything identical, only fix the left hand. »_
4. **Fond transparent.** Le demander explicitement. Si le fond n'est pas transparent, on demande un fond uni gris moyen `#808080`, puis on détoure.

## 9. Check-list avant d'intégrer une image

- [ ] Le personnage est en pied, entier, tourné vers la droite, sur fond transparent.
- [ ] Il n'y a ni texte, ni filigrane, ni ombre portée, ni halo de détourage.
- [ ] La silhouette se reconnaît en petit (tuile de 64 px).
- [ ] La lumière ne choque pas quand l'image est retournée.
- [ ] Le style reste cohérent avec les autres personnages : même rendu, même niveau de détail.
- [ ] Le design est original, sans ressemblance évidente avec un personnage existant.
- [ ] Image recadrée au plus près, puis enregistrée dans `src/assets/`.
- [ ] Dans `roster.ts`, `look` est ajusté : `facing: 'right'`, `scale` (hauteur relative entre races), et le cadrage du portrait `{x, y, zoom}`.
- [ ] Pour une arène : recadrée en 1920×1080, vérifiée en combat, et sol bien dégagé derrière les combattants.
- [ ] Pour des icônes : 16 fichiers (ou le nombre prévu) dans `src/assets/icons/`, lisibles à 20 px sur fond sombre, inventaire et historique de la section 7 mis à jour.
