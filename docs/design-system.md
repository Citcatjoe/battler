# BATTLER — Design system (référence d'intégration)

Version consolidée des décisions V1.0 → V1.4. Ce document est la source de vérité pour le code.
Il décrit **ce qui est décidé**. Les points marqués *OUVERT* ne doivent pas être implémentés comme définitifs.

---

## 0. Principes

1. La sobriété est la règle, l'illustration est l'exception. Chaque composant doit fonctionner sans asset peint.
2. L'or signale l'action (ce qui se clique, se sélectionne ou se gagne). Jamais les données, jamais les cadres inactifs.
3. La couleur du camp ne sert qu'à identifier le camp : azur = camp A (gauche), cramoisi = camp B (droite).
4. Un seul relief : un filet clair en haut et une ombre portée. Pas de lueur hors focus clavier, pas de texture répétée, pas d'ornement gratuit.
5. La hiérarchie dépend de l'écran : sur Affrontement, les personnages dominent ; sur Statistiques, les données composent seules l'écran. Une composition ne devient pas une règle globale.

---

## 1. Tokens

À poser sur `:root` (fichier `tokens.css` ou équivalent du projet).

```css
:root {
  /* surfaces */
  --bg-0: #0E0B09;  --bg-1: #16120F;  --bg-2: #1F1914;  --bg-3: #2A221B;
  --scrim: rgba(14,11,9,.80);            /* voile de panneau sur illustration (sans flou depuis la 0.64.2) */

  /* texte */
  --text-1: #F3EADB; --text-2: #BFB2A1; --text-3: #8C8174; --text-off: #5C5249;

  /* lignes */
  --line-1: rgba(232,200,140,.10); --line-2: rgba(232,200,140,.22);
  --line-bronze: #6E4D1D; --line-active: #DDA94A;

  /* or */
  --gold-200: #F6DC9A; --gold-300: #EDC46A; --gold-400: #DDA94A;
  --gold-500: #B9862F; --gold-700: #6E4D1D; --on-gold: #24170A;

  /* camps */
  --side-a: #43B4EE; --side-a-hi: #8AD3F7; --side-a-track: #13283A;
  --side-b: #EE4A72; --side-b-hi: #F68BA4; --side-b-track: #3A1520;

  /* données de jeu */
  --crit: #F5A54A;   /* ambre, distinct de l'or d'interface */
  --dodge: #5ACFE3; --arcane: #A47BF0; --armor: #A9B4BF;
  --good: #78C46A;  --bad: #E5484D;

  /* forme */
  --r-xs: 2px; --r-sm: 4px; --r-md: 8px; --r-round: 999px;
  --hl: inset 0 1px 0 rgba(255,240,210,.06);
  --shadow-2: 0 8px 24px rgba(0,0,0,.45);
  --shadow-3: 0 16px 40px rgba(0,0,0,.60);
  --focus: 0 0 0 2px var(--bg-0), 0 0 0 4px var(--gold-200);

  /* géométrie prestige (V1.1) */
  --cut-s: 6px; --cut-m: 10px; --cut-l: 14px;
  --cut-seal: 28px;          /* octogone VS 96 px */
  --cut-blade: 12px;         /* lame : 2 coins opposés */
  --frame: #8A6424;          /* cadre bronze */
  --frame-gap: 2px;          /* jour sombre = --bg-0 */
  --tranche-btn: 4px; --tranche-tab: 3px;
  --engrave: rgba(36,23,10,.30);
  --engrave-gold: rgba(237,196,106,.40);

  /* typographie */
  --font-display: Cinzel, 'Trajan Pro', Georgia, serif;
  --font-body: 'Alegreya Sans', 'Gill Sans', 'Segoe UI', sans-serif;
  --font-data: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
}
```

Échelle d'espacement : 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64.

### Typographie

| Rôle | Police | Taille / poids |
|---|---|---|
| Logo | Cinzel | 72 / 700, +6 % |
| Titre de page | Cinzel | 48 / 700 |
| Nom de héros | Cinzel | 40 / 600, couleur du camp |
| Titre de section | Cinzel | 22 / 600 |
| Libellé de contrôle | Cinzel | 15 / 700, capitales, +16 % |
| Corps | Alegreya Sans | 17 / 400 |
| Libellé | Alegreya Sans | 15 / 500 |
| Légende (minimum absolu) | Alegreya Sans | 13 / 400 |
| Donnée | IBM Plex Mono | 13–15 / 500, chiffres alignés à droite |

---

## 2. Familles de formes (principes, pas règles automatiques)

| Famille | Forme | Usage |
|---|---|---|
| **Fonctionnel** (~85 % de l'écran) | Rectangle, rayon 2–4, filet simple, plat | Tableaux, jauges, listes, tooltips, pastilles, corps des panneaux |
| **Prestige** (≤ 3 par écran) | Octogone (4 coins coupés), cadre + jour + plaque, tranche | Bouton Combattre, onglets majeurs, sceau VS |
| **Lame** | 2 coins opposés coupés, contour + trait de tête 2 px | Cartes de compétence uniquement |
| **Hexagone** (0.75.0) | Pointe en haut, cadre d'or éclairé du haut à gauche + jour 2 px + plaque de cuir + biseau, ombre qui suit la forme | Reliques uniquement (`RelicSeal`, `.relic-seal`, docs/RELIQUES.md § 5). Le rond reste aux statuts, l'octogone aux compétences et au prestige |

Détails de construction autorisés : chanfrein, cadre + jour + plaque, serti (double filet en box-shadow), tranche (uniquement sur ce qui se presse), gravure (CTA et VS uniquement), encoche sous l'onglet majeur actif.
Interdits : équerres de camp, lignes de liaison du VS (non retenues pour l'instant), ornements d'angle, textures de panneaux.

Recette **serti** (box-shadow, aucune balise ajoutée) :
`inset 0 0 0 1px var(--frame), inset 0 0 0 4px <fond du composant>, inset 0 0 0 5px var(--engrave)`

Recette **prestige** (couches empilées, toutes en `clip-path` octogonal) :
1. cadre `--frame` (inset 0) ; 2. jour `--bg-0` (inset 2px) ; 3. plaque (inset 4px) avec `inset 0 1px 0 rgba(255,246,220,.55), inset 0 -4px 0 <teinte sombre>` ; 4. option : polygone SVG gravé à 10px du bord.

Contraintes techniques :
- `clip-path` coupe `box-shadow` → l'ombre portée passe par `filter: drop-shadow()` sur un parent.
- `clip-path` coupe l'anneau de focus → sur les pièces prestige, le focus colore le cadre (`--frame` → `--gold-200`).
- La zone cliquable = la forme visible (clip-path sur l'élément interactif). Minimum 44 px.

---

## 3. Composants retenus (« B mesuré »)

| Composant | Traitement |
|---|---|
| Contrôles (boutons, paire de modes, onglets mineurs, boutons icône, barre de lecture, lien de retour) | **UI kit** ([ui-kit/README.md](ui-kit/README.md), 0.83.0) : `battler-ui-kit.css` importé tel quel, composants de `src/components/kit.tsx`, glyphes de commande de `BattlerIcon`. Primaire XL 72 px (un seul par écran), secondaire 52, petit 40, bouton icône 48 / 44. Jamais d'image peinte dans une commande. |
| Sceau VS | Octogone 96 px (coupe 28), cadre `--gold-500`, jour, plaque `--bg-1`, gravure or 40 %. Sans lignes de liaison. |
| Panneau de combattant | Fonctionnel : fond `--scrim` (sans flou depuis la 0.64.2), rayon 2, contour 1 px `rgba(232,200,140,.16)`, **liseré de camp 2 px en tête** (`inset 0 2px 0 var(--side-x)`). Pas d'équerres. |
| Cartes de compétence | Lame. La couleur dépend de la **nature** de la compétence : martiale = `--gold-500`, adresse = `--armor`, arcane = `--arcane`, neutre = `--text-3` (ajout de l'utilisateur, 0.39.1 : l'Attente de l'ogre). Fenêtre du sceau octogonale. Glyphe natif en repli tant que A-01 n'existe pas. |
| Jauges, stats, tableaux, tooltips, pastilles | Inchangés (V1.0). Barre 4–6 px, rayon 2, piste = `--side-x-track`, valeur IBM Plex Mono alignée à droite. |
| Portrait | Composant réutilisable : carré, visage centré ~40 % de hauteur, recadré depuis l'illustration en pied. États : repos, survol, choisi A / B (2 px couleur du camp), pris en face (opacité 45 %), focus, indisponible. **Nombre et colonnes non figés.** |

Taux de victoire : < 40 % rouille `#A86B4A`, 40–59 % laiton `#C9A65A`, ≥ 60 % `--good`. Le chiffre est toujours affiché.

Chiffres de dégâts flottants (phase 7 des règles v2, 2026-10-24) : une teinte par source, six au plus, sur le chiffre seulement ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) M37, registre `DAMAGE_SOURCES` de `damage.ts`, classes `TONE_CLASS` et `HIT_TONE_CLASS` de `narration.ts`). Rouge des coups (et du Saignement), vert acide du Poison, mauve (`--arcane` en famille) du feu magique, de la Brûlure et de la Pourriture, et trois jetons réemployés : `--text-1` cerclé de `--gold-700` pour la Lumière, `--dodge` pour la Foudre, `--armor` pour le Vent. L'ambre reste au critique.

Infobulles au survol (2026-10-21) : une seule visible à la fois, celle de l'élément survolé. Son déclencheur est un **groupe nommé** (`group/relic` sur l'élément, `group-hover/relic:` sur l'infobulle) : un `group-hover` nu réagit au survol de n'importe quel ancêtre `group` (une ligne de l'arbre, une case) et ouvre ensemble toutes les infobulles qu'il contient. Près d'un bord de la scène, l'infobulle change de côté plutôt que d'être coupée.

### 3.1 Labels de la zone de surcharge (2026-10-21)

Les labels qui tombent sous le dé quand quelque chose change le coup en cours (« Critique ×2 », « Armure temporaire −6 », « Saignement +2 », une relique) : la **zone de surcharge**, définie dans [RESOLUTION.md](RESOLUTION.md) § 11 (ce qui y entre, l'ordre, le point de vue). Ils ont **une couleur par source**, jamais par compétence, par personnage ni par polarité (demande de l'utilisateur : « une couleur par type de modificateur : coup, relique, autre… », dans la ligne du refus des dix couleurs de familles, « c'est carnaval », FAMILLES.md § 3). Le **signe** (+ amplifie l'action de l'attaquant, − la réduit ou la contre) se lit au « + / − » du chiffre, aux hachures du − et au son. Registre unique : `SPECIAL_SOURCES` et `SPECIAL_SIGNS` (`src/game/specials.ts`) ; un point d'appel ne donne jamais une couleur, un signe ni un son. Rendu : `SpecialLabel` (`src/components/SpecialLabel.tsx`).

| Source | Ce qu'elle marque | Fond | Texte | Tranche | Hachures du − |
|---|---|---|---|---|---|
| Coup (`strike`) | le dé et le critique : critique, critique assuré (avec l'icône du critique) | ambre `#fbbf24`, réservé au critique | `#1c1917` | `#92400e` | sombres |
| Compétence ou statut (`skill`) | un statut ou une compétence qui change ce coup : Esquive assurée, Armure temporaire, Luciole, Fausse note, Vol de vie, Riposte, Saignement, Épines acérées | ivoire neutre `#e9dfc8` : il ne dit ni bonus ni malus, le signe s'en charge | `#1f1a14` | `#7a6a4f` | sombres |
| Relique (`relic`) | une relique qui renforce le coup (« Fer à quatre clous +4 ») ou qui se déclenche ; avec l'icône de la relique | plaque sombre `#24170a`, liseré `--gold-400` | `--gold-200` | `--gold-700` | dorées |

- **Marque du −** : de fines hachures diagonales (135°, 3 px sur 8) dans la teinte de la source, à 16 % (`.special-badge[data-sign='minus']`, variable `--hatch`). Discrète, elle garde la couleur de la source lisible et se voit sur toutes les plaques, claires comme sombres. Le + n'a aucune marque.
- **Disposition** : en colonne sous le dé, dans l'ordre où les surcharges s'appliquent, tous à la largeur du plus long, droits (sans inclinaison), 8 px d'écart. Ils apparaissent en grossissant (`.special-badge`, 0,45 s) et restent jusqu'à l'étape suivante (jet suivant, coup suivant d'une rafale).
- **Étendre** : un nouveau statut qui change un coup reçoit sa source et son signe par sa mécanique (`isSurcharge`, `statusSpecial`), sans rien déclarer. Une nouvelle source ne s'ajoute qu'à `SPECIAL_SOURCES`, avec sa couleur, ses hachures et sa ligne ici ; un test vérifie que deux sources n'ont jamais la même couleur.

---

## 4. États et animation

- Le système d'animation existant n'est **pas modifié**.
- Les composants exposent : `data-state` (idle · hover · active · selected · disabled · triggered), `aria-selected`, `aria-pressed`, `:focus-visible`.
- Transitions autorisées : `background-color`, `border-color`, `color`, `box-shadow`, `transform`, `opacity`, `filter`. Jamais la géométrie.
- Pressé : `translateY(1px)`, pas de `scale` sur les contrôles texte.
- `prefers-reduced-motion` : les états restent lisibles sans transition.

---

## 5. Intégration des illustrations

- Ancrage bas-centre sur les pieds. Ligne de sol commune, alignée sur le sol du décor.
- Mise à l'échelle par la hauteur, jamais déformée.
- Chaque combattant regarde vers le centre : `transform: scaleX(-1)` selon le côté. Le portrait est inversé avec lui. Attention aux éléments latéralisés (inscriptions, blasons).
- Ombre de contact = ellipse CSS sous les pieds, jamais dans l'image.
- Ordre des plans : décor → personnages → panneaux → action. Exceptions décidées par écran.
- Débordements (armes, capes, boucliers) autorisés derrière un panneau, uniquement dans sa marge interne ; jamais sous une valeur.
- Texte posé sur une illustration : `text-shadow: 0 2px 12px rgba(0,0,0,.9)`, jamais sur une zone claire.
- Étalonnage CSS toléré en prototype (luminosité ±12 %, sépia ≤ 0,15) ; la correction définitive se fait dans les sources.
- Les repères colorés du décor (bannières) doivent s'accorder aux camps ou rester neutres.

---

## 6. Assets peints (aucun n'est encore généré)

Chaque emplacement d'asset doit avoir un **repli natif** et ne jamais casser si l'image manque.

| ID | Asset | Statut | Emplacement |
|---|---|---|---|
| A-01 | Sceaux de compétence | Retenu, prioritaire | Fenêtre de la carte de compétence (32 / 40 / 56 px), `alt=""`, `object-fit: cover` |
| A-02 | Matière du bouton Combattre | À tester | Texture rectangulaire derrière la plaque ; la découpe reste en CSS |
| N-01 | Série d'icônes de commande | À tester (3 icônes d'abord) | Boutons icône et icônes des boutons d'action |

Le sceau VS, les cadres et les textures de panneaux restent natifs.

---

## 7. OUVERT — ne pas figer

- Composition de l'écran Affrontement (V1.3 B = direction, pas spécification) : taille des personnages, nom hors panneau, position du VS, Combattre devant les pieds.
- Organisation du roster étendu (pagination, défilement, recherche).
- Lignes de liaison du VS, équerres de camp.
- Côté des camps vs bannières du décor.
