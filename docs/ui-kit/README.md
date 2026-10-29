# BATTLER — UI kit (boutons et icônes de commande)

À placer dans `docs/ui-kit/`. Ce dossier est la **source de vérité** des contrôles : on copie, on ne réinterprète pas.

| Fichier | Rôle |
|---|---|
| `battler-ui-kit.css` | Styles exacts : hauteurs, coupes, couches, états. À importer tel quel. |
| `BattlerIcon.jsx` | Registre des glyphes de commande + composant `<BattlerIcon name size />`. |
| `reference.html` | Page de référence qui affiche chaque contrôle avec `battler-ui-kit.css`. |
| `reference.png` | Capture de `reference.html` (1440 px) : l'implémentation doit y être identique. |

---

## 1. La règle qui manquait : deux familles d'icônes

| Famille | Forme | Usage |
|---|---|---|
| **Glyphes de commande** | SVG au trait, une seule couleur (`currentColor`), grille 24, trait 1,75 | Tout ce qui se clique : boutons, onglets, barre de lecture, liens. Uniquement ceux de `BattlerIcon.jsx`. |
| **Emblèmes de contenu** | Images peintes en couleur | Ce qui appartient au jeu : compétences, statuts, reliques, objets, portraits. |

Un emblème peint ne va **jamais** dans un bouton de commande. Sinon « Combattre » ressemble à une compétence, « Au hasard » à une relique.

## 2. Écarts constatés dans le jeu

1. **Icônes peintes dans les commandes** : épées croisées (Jouer, Combattre, Duel), trophée (Tournoi), d20 (Au hasard, Combat test), parchemin à sceau, barres en bois, cor, éclair (Simuler), ticket (Parier). → remplacer par les glyphes du kit.
2. **État « coupé » par une barre rouge peinte** sur l'icône (son, musique). → glyphe barré, couleur atténuée.
3. **Hiérarchie écrasée par les hauteurs** : sur l'écran de préparation, Changer / Parier / Simuler ont presque la hauteur de Jouer. → secondaires 52 px, primaire 72 px.
4. **Deux styles pour « retour »** : bouton fantôme « ← Menu » et lien « ← Retour à la sélection ». → un seul : `.bt-back`.
5. **Vitesses en pastilles hexagonales** : forme hors grammaire ; et deux groupes de vitesses (barre + magnétoscope). → `.bt-segmented`, un seul groupe.
6. **Badge du journal** : pastille orange chiffrée. → point or `.bt-dot`.

## 3. Hauteurs autorisées

| Contrôle | Classe | Hauteur |
|---|---|---|
| Primaire (un seul par écran) | `.bt-btn--primary.bt-btn--xl` | 72 |
| Paire de modes (Duel / Tournoi) | `.bt-modepair` | 72 |
| Secondaire | `.bt-btn--secondary.bt-btn--md` | 52 |
| Petit (barre de lecture, Réinitialiser) | `.bt-btn--sm` | 40 |
| Bouton icône rond | `.bt-iconbtn` / `--sm` | 48 / 44 |
| Bouton carré (glyphe seul) | `.bt-square` / `--sm` | 44 × 44 / 28 × 28 |
| Outil (journal, magnétoscope) | `.bt-tool` | 40 |
| Onglet mineur | `.bt-tabs [role=tab]` | 44 |
| Lien de retour | `.bt-back` | 44 (zone cliquable) |

Taille des glyphes : 24 dans un primaire, 22 dans une paire de modes et un bouton icône 48, 18 dans un secondaire, 16 dans un petit bouton ou un lien, 20 dans un outil.

## 4. Structure HTML attendue

```html
<!-- Primaire -->
<button class="bt-btn bt-btn--primary bt-btn--xl">
  <span class="bt-plate" aria-hidden="true"></span>
  <span class="bt-btn__label"><BattlerIcon name="combattre" size={24}/>Combattre</span>
</button>

<!-- Secondaire -->
<button class="bt-btn bt-btn--secondary bt-btn--md"><BattlerIcon name="hasard" size={18}/>Au hasard</button>

<!-- Bouton icône à bascule -->
<button class="bt-iconbtn" aria-label="Musique" aria-pressed={on}>
  <BattlerIcon name={on ? 'musique' : 'musique-coupee'} size={22}/>
</button>
```

Polices requises : Cinzel 500/600/700, Alegreya Sans 400/500/700, IBM Plex Mono 400/500.

## 5. Bouton carré et pastille de compteur (ajout du 2026-10-23)

Ajoutés au kit avec l'accord de l'utilisateur, pour les actions secondaires en glyphe seul des maquettes `docs/ref/affrontement-tournoi.png` et `docs/ref/tournoi-arbre-survol.png` (Simuler et Parier sous le VS ; Paris, Simuler le tour, Affronter ou Simuler sur une carte de l'arbre).

**Anatomie**
- `.bt-square` : 44 × 44, coins de 2 px, le serti du secondaire (plaque `--bg-2`, filet `--frame`, puis filet bronze à 4 px), glyphe de 20 px en `--gold-300`. Survol : plaque `--bg-3`, filets or, glyphe `--gold-200`. Pressé : plaque `--bg-1`, descend d'un pixel. Focus : anneau `--focus`. Désactivé : plaque `--bg-1`, glyphe `--text-off`, filet `--line-1`.
- `.bt-square--sm` (`<SquareButton size="sm">`) : 28 × 28, glyphe de 16, serti resserré (filet bronze à 3 px), sans pastille. Réservé aux actions d'une carte de l'arbre du tournoi (Affronter, Simuler), qui tiennent dans une ligne de 70 px depuis la 0.116.0 (le nom, puis l'aperçu du build : dé forgé et reliques ; 32 px avant, `docs/ref/tournoi-arbre-survol.png`, qui ne correspond plus à l'arbre).
- `.bt-badge` : pastille de compteur, cartouche `--bg-0` de 16 px de haut (22 px de large au moins), filet `--gold-500`, IBM Plex Mono 10 / 500, chiffres tabulaires, texte `--text-1`. Dans un `.bt-square`, elle s'accroche en bas à droite, débordant de 6 px.

**Usage**
- Le libellé n'est jamais écrit : il passe par `aria-label` et l'infobulle `title`. La pastille est ajoutée au nom accessible (« Parier (0/2) »).
- La pastille dit un compteur court : paris faits sur le total (« 0/2 »), nombre de combats concernés (« ×8 »). Pas de point or (`.bt-dot`) pour un nombre.
- À côté d'un primaire, un bouton carré se centre verticalement sur lui, comme un secondaire.

```tsx
import { Badge, SquareButton } from '../components/kit'

<SquareButton icon="parier" label="Parier" badge="0/2" onClick={…} />
<SquareButton icon="simuler" label="Simuler le tour" badge="×8" disabled={…} />
<Badge>2/2</Badge>   // pastille seule
```

```html
<button class="bt-square" aria-label="Parier (0/2)" title="Parier">
  <BattlerIcon name="parier"/>
  <span class="bt-badge" aria-hidden="true">0/2</span>
</button>
```

## 6. Glyphes « réglages » et « relique » (ajout du 2026-10-25)

Ajouté pour le bouton **Options** de la configuration du tournoi, qui ouvre la boîte des options (saison, combattants, forge du dé, reliques, noms uniques, paris). Aucun glyphe du kit ne disait « réglages » ; `journal` (une liste) le remplaçait en attendant.

**Anatomie** : trois curseurs horizontaux sur la grille 24, au trait du kit (1,75, `currentColor`, extrémités rondes) : une glissière à y = 6, 12 et 18, de x = 4 à x = 20, interrompue par un bouton rond de rayon 2 à x = 15, 9 et 17 (les positions alternent, pour qu'on lise des réglages et pas une liste). Aucun remplissage.

**Usage** : une commande qui ouvre des réglages ou des options. Bouton secondaire à 18 px, comme les autres.

```tsx
<Button variant="secondary" size="md" icon="reglages" aria-haspopup="dialog">Options</Button>
```

**Glyphe « relique »** : ajouté pour la tuile **Reliques** de la boîte des options, qui est un interrupteur (une commande) : le sceau peint d'une relique n'y a pas sa place. **Anatomie** : l'hexagone des reliques, pointe en haut, de rayon 9 centré sur la grille 24 (sommets à y = 3 et y = 21, côtés verticaux à x = 4,2 et 19,8), et une gemme en losange au centre (de 9 à 15 en x, de 8,5 à 15,5 en y), au trait du kit, sans remplissage. **Usage** : une commande qui active, filtre ou ouvre les reliques.

**Tuiles de la boîte Options** (passe de finition du 2026-10-25) : chaque tuile est une commande (interrupteur ou sélecteur) et ouvre sur une marque de 36 px, pour que les noms s'alignent d'une tuile à l'autre : un glyphe du kit à 24 px, or quand l'option est active, `--text-3` sinon : `tournoi` (Phase de saison), `combattre` (Combattants), `relique` (Reliques), `chroniques` (Noms uniques), `parier` (Paris). La Forge du dé garde sa face de dé gravée, dessinée en CSS (`.forge-face`, le chiffre du d6) : aucune image peinte dans une tuile.

## 7. Glyphes « crâne » et « infini » (ajout du 2026-10-29)

Ajoutés avec l'accord de l'utilisateur pour l'accueil de la campagne (`docs/ref/06-accueil-campagne.png`) et la fin d'acte. Dessins de Lucide (ISC), au trait du kit, sans remplissage.

- **`crane`** : un crâne de face, mâchoire à deux dents, deux orbites de rayon 1, le nez en petit triangle. **Usage** : le boss d'un parcours (sceau du parcours de l'accueil de la campagne).
- **`infini`** : le signe ∞, une seule boucle continue de x = 2 à x = 22. **Usage** : le mode sans fin (sceau du parcours, bouton « Continuer sans fin » de la fin d'acte).
