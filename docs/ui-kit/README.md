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
