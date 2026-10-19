# Prompts Claude Code — intégration du design system BATTLER

Avant de commencer :
1. `BATTLER-design-system.md` est rangé dans `docs/design-system.md` et le committer seul.
2. Créer une branche dédiée : `git checkout -b design-system-v1`.
3. Lancer Claude Code en **mode plan** (Shift+Tab) pour la phase 0.

Un prompt = une phase = un commit (ou une PR). Vérifier dans le navigateur entre chaque phase.

---

## Phase 0 — Inventaire, sans rien modifier

```
Lis docs/design-system.md : c'est la source de vérité visuelle de BATTLER.

Ne modifie aucun fichier dans cette phase.

Explore le projet et produis un rapport d'inventaire :
1. Comment le style est organisé aujourd'hui (CSS global, modules, styled-components, Tailwind, inline…), et où sont définies les couleurs, polices et espacements actuels.
2. La liste des composants React qui correspondent à ceux du document (bouton Combattre, Au hasard, boutons icône, onglets de mode, onglets Classement/Confrontations, panneau de combattant, carte de compétence, jauges, portraits, VS, tooltips, tableau de stats), avec leur fichier.
3. Où vit le système d'animation et quelles propriétés/classes il pilote, pour garantir qu'on ne le casse pas.
4. Les valeurs codées en dur (couleurs, rayons, ombres) qui devront passer par des tokens.
5. Les risques : composants partagés entre écrans, logique de jeu mêlée au rendu, styles dont dépend l'animation.

Termine par un plan de migration en petites étapes indépendantes, chacune testable seule. Pas de code.
```

Relire le plan, le corriger si besoin, puis valider.

---

## Phase 1 — Tokens seuls

```
Ajoute les tokens de la section 1 de docs/design-system.md (variables CSS sur :root) et charge les polices Cinzel, Alegreya Sans et IBM Plex Mono.

Contraintes :
- N'applique encore les tokens à aucun composant : le rendu de l'application doit rester identique.
- Ne renomme ni ne supprime aucune variable ou classe existante.
- Si une variable existante entre en conflit de nom, préfixe les nouvelles (--bt-…) et signale-le.

Montre-moi le diff et confirme que rien d'autre n'a changé.
```

---

## Phase 2 — Composants fonctionnels (sobres)

```
En suivant docs/design-system.md (sections 2 « Fonctionnel », 3 et 4), migre vers les tokens UNIQUEMENT ces composants :
jauges et barres de stats, tableau de statistiques, tooltips, pastilles, onglets mineurs (soulignés), bouton tertiaire.

Règles :
- Changement visuel uniquement : ne touche ni aux props, ni à la logique, ni aux données, ni aux handlers.
- Conserve les classes et attributs dont dépend le système d'animation (cf. inventaire). Ajoute data-state / aria-* s'ils manquent, sans retirer l'existant.
- Pas de nouvelle dépendance.
- Un composant à la fois ; liste à la fin ce qui a changé et ce qui reste à vérifier à l'œil.
```

---

## Phase 3 — Boutons secondaires, boutons icône, panneau de combattant

```
Applique docs/design-system.md section 3 à : boutons secondaires (serti, variante A), boutons icône ronds (serti), panneau de combattant (voile + flou, liseré de camp 2 px en tête, pas d'équerres), composant portrait (états de la section 3, sans changer le nombre ni la disposition des portraits).

Mêmes règles qu'en phase 2. Le portrait doit rester un composant réutilisable : ne fige ni le nombre de colonnes ni la taille de la grille.
```

---

## Phase 4 — Pièces prestige

```
Implémente les pièces prestige décrites en section 2 (recette prestige) et 3 de docs/design-system.md :
bouton Combattre, onglets majeurs (avec encoche sous l'actif), sceau VS (sans lignes de liaison).

Points d'attention :
- clip-path coupe box-shadow et l'anneau de focus : ombre via filter: drop-shadow sur un parent, focus en colorant le cadre.
- La zone cliquable doit correspondre à la forme visible, ≥ 44 px.
- Les états (survol, pressé, désactivé, focus) changent les couleurs des couches, jamais la forme.
- Le système d'animation ne doit pas être modifié ; si une animation existante cible une propriété que la nouvelle structure casse, arrête-toi et signale-le au lieu de la contourner.
```

---

## Phase 5 — Cartes de compétence

```
Applique la forme « lame » (section 2) aux cartes de compétence, avec une fenêtre octogonale pour le sceau.

La couleur dépend de la nature de la compétence (martiale / adresse / arcane). Si le modèle de données n'a pas ce champ, ajoute un champ optionnel `nature` avec une valeur par défaut qui reproduit le rendu actuel, sans modifier la mécanique des compétences. Ne remplis pas les natures toi-même : liste-moi les compétences pour que je les classe.

Prévois un emplacement d'image (futur asset A-01) avec repli natif : si l'image manque, le glyphe actuel s'affiche, sans décalage.
```

---

## Phase 6 — Intégration des illustrations (optionnelle, derrière un flag)

```
Sur l'écran Affrontement, applique les règles de la section 5 de docs/design-system.md : ancrage bas-centre, ligne de sol commune, ombre de contact CSS, chaque combattant orienté vers le centre (scaleX(-1) selon le côté, portrait inversé avec lui), texte sur illustration avec ombre portée.

La composition de cet écran est encore OUVERTE (section 7) : ne refais pas la mise en page. Mets ces changements derrière un flag (ex. constante ou paramètre d'URL) pour pouvoir comparer avec l'existant.
```

---

## Garde-fous à répéter si besoin

- « Si une consigne du document contredit le code existant, arrête-toi et demande, ne choisis pas seul. »
- « N'implémente rien de la section 7 (OUVERT). »
- « Ne génère ni ne télécharge aucune image. »
- Après chaque phase : `git diff --stat`, test dans le navigateur, puis commit avant la phase suivante.
