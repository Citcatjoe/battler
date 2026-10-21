# Prompts Claude Code — UI kit, puis lecteur de combat

Ordre : **1. kit** (boutons + icônes partout), **2. lecteur** (qui n'utilise que le kit).
Avant de commencer : copier le dossier `battler-ui-kit/` dans `docs/ui-kit/`, et exporter depuis le canevas la planche « Combat · Lecteur » en PNG dans `docs/ref/lecteur.png`.

---

## Prompt 1 — UI kit

```
Lis docs/ui-kit/README.md. Le dossier docs/ui-kit/ est la source de vérité des boutons et icônes de commande : on copie, on ne réinterprète pas.

1. Inventaire, sans rien modifier :
   - chaque bouton, onglet, lien de retour, bouton icône et contrôle de vitesse du jeu (fichier, composant, écran) ;
   - pour chacun : la classe du kit qui correspond et le glyphe de BattlerIcon à utiliser ;
   - toutes les icônes de commande actuelles (en particulier les images peintes) et leur remplaçant ;
   - ce qui n'a pas d'équivalent dans le kit (liste à part, ne pas inventer).
   Montre-moi ce tableau et attends ma validation.

2. Après validation :
   a. importe docs/ui-kit/battler-ui-kit.css tel quel dans les styles globaux et copie BattlerIcon.jsx dans les composants. Ne change aucune valeur. En cas de conflit de nom de variable CSS, signale-le au lieu de renommer.
   b. crée des composants React fins (Button variant/size, IconButton, ModePair, SegmentedControl, Tool, BackLink) qui ne font que poser les classes et la structure HTML du README. Aucun style propre dans ces composants.
   c. remplace les contrôles écran par écran, un commit par écran. Retire les images peintes des commandes, mais ne supprime aucun fichier image : elles peuvent servir au contenu.
   d. ne change ni la logique, ni la navigation, ni les animations.

3. Vérification visuelle obligatoire :
   - crée une page de développement qui affiche tes composants React dans la même disposition que docs/ui-kit/reference.html ;
   - fais-en une capture (Playwright, 1440 px de large) et compare-la à docs/ui-kit/reference.png ;
   - liste tout écart : hauteur, coupe, épaisseur de trait, taille de glyphe, couleur, alignement. Corrige jusqu'à ce qu'il n'en reste plus, puis montre-moi les deux images côte à côte.

Règle permanente : les images peintes sont réservées au contenu (compétences, statuts, reliques, objets, portraits). Jamais dans un bouton de commande.
```

---

## Prompt 2 — Lecteur de combat (après le kit)

```
Regarde docs/ref/lecteur.png. On refait la zone de contrôle du combat avec les composants du kit uniquement (docs/ui-kit/).

Structure :
- Une barre de lecture (.bt-playbar) toujours visible en bas : Pause / Reprendre (.bt-btn--sm ; en pause, variante .bt-btn--resume), vitesses ×1 ×2 ×4 (SegmentedControl), séparateur, deux outils (.bt-tool) : Journal (glyphe « journal ») et Magnétoscope (glyphe « magnetoscope »), visibles pour tous.
- Deux tiroirs qui s'ouvrent au-dessus de la barre, au même emplacement : Journal (garde le style actuel de la console) et Magnétoscope (timeline + pas à pas). Ouvrir l'un ferme l'autre.

Comportements :
1. Les commandes de lecture n'existent qu'une fois : le magnétoscope ne contient plus son propre bouton Lecture ni son propre groupe de vitesses. Quand il est ouvert, la barre ajoute ×¼ et ×½.
2. Ouvrir le magnétoscope met en pause ; le fermer ne relance pas.
3. En pause (hors magnétoscope), une étiquette « En pause » s'affiche au-dessus de la barre.
4. Le journal fermé affiche un point or (.bt-dot) quand de nouvelles entrées arrivent.
5. « Copier la trace » devient un bouton icône (glyphe « copier ») dans l'en-tête du tiroir.
6. Le tiroir ouvert et la vitesse sont mémorisés entre deux combats.
7. Raccourcis : Espace pause/reprise, 1/2/3 vitesses, J journal, M magnétoscope, ← → moment précédent/suivant, . phase suivante, R rejouer le moment, Échap ferme le tiroir.

Ne modifie ni le moteur de résolution, ni les données de timing, ni les animations du combat : seulement la présentation et le câblage de ces contrôles.
Avant de coder, décris-moi comment tu relies la barre au lecteur existant et ce que tu supprimes de l'ancien magnétoscope. Attends ma validation.
```
