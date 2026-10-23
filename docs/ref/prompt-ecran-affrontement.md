# Prompt Claude Code : écran d'affrontement (avant combat)

Avant de lancer le prompt : copie les trois images de référence (`affrontement-reel.png`, `affrontement-limite.png`, `affrontement-regles.png`) dans `docs/ref/` du projet. Le UI kit doit déjà être intégré dans `docs/ui-kit/`.

---

```
On refait la mise en page de l'écran d'affrontement (avant combat). Les références sont docs/ref/affrontement-reel.png, docs/ref/affrontement-limite.png et docs/ref/affrontement-geometrie-regles.png.

Objectif : la composition reste symétrique quel que soit le contenu. Aujourd'hui, chaque bloc prend la taille de son contenu : un nom sur deux lignes, un d11 ou des reliques en plus décalent tout ce qui suit. On passe à une fiche à géométrie fixe.

NON NÉGOCIABLE
1. Fiche de dimensions constantes : 340 px de large, même hauteur pour les deux combattants, miroir exact par rapport au sceau VS. Aucune hauteur ne dépend du contenu.
2. Nom : zone réservée de 2 lignes (112 px), alignée en bas. Un nom court laisse du vide au-dessus, jamais en dessous. Au-delà de 2 lignes : coupure avec « … » et infobulle avec le nom complet. L'écusson de tête de série est accroché au bord extérieur du nom, sur sa ligne de base.
3. Dé de dégâts : toujours 12 emplacements, 2 rangées de 6, octogones de 40 px. Les emplacements au-delà de la taille du dé restent visibles mais grisés, ce qui fait lire la taille du dé comme une jauge. Le maximum est 12 : au-delà, rien n'est représenté.
4. Les types de face :
   - face simple : le chiffre seul ;
   - face à compétence : l'emblème peint de la compétence, avec le chiffre dans un petit cartouche en bas à gauche ;
   - face forgée (compétence acquise pendant la run) : cadre or dégradé (#F6DC9A → #DDA94A → #8A6424) et fond doré (#B9862F → #6E4D1D → #3E2A10), cartouche du chiffre en #24170A avec le texte en #F6DC9A. Plus aucun contour violet : le violet est réservé à la nature arcane des compétences ;
   - compétence améliorée : rang en chiffres romains (II, III) dans une pastille or (#DDA94A, texte #24170A) en haut à droite, entourée d'un liseré de 2 px couleur fond.
5. Reliques : on garde leur grammaire actuelle, des objets peints posés librement. Pas de cercle, pas de cadre, pas de conteneur : juste une ombre portée (filter: drop-shadow). Une rangée de 6 places de 44 px. Au-delà de 6 : 5 reliques puis « +N » en texte or (IBM Plex Mono). Sans relique : « Aucune relique », à la même hauteur.
6. Centre : seulement le sceau VS. Les pastilles des parieurs sont masquées (on garde le code et on le désactive, sans le supprimer) ; le compteur reste sur le bouton Parier.
7. Les illustrations des personnages restent au bord de l'écran. Elles peuvent passer derrière le voile de la fiche, jamais devant le nom.
8. Sélecteur d'arène : il affiche le nom de l'arène et son index (« 3 / 9 ») au lieu des points de pagination. Changer d'arène change le fond de l'écran en direct (illustration de l'arène à 45 % d'opacité sous un voile sombre). « Au hasard » garde le fond neutre.
9. Boutons du bas : uniquement les composants du kit (Jouer en primaire XL, les autres en secondaire MD).

LIBRE
- La structure des composants React et le nommage.
- Les détails du panneau de statistiques, tant que sa hauteur est fixe.
- Les transitions du changement d'arène (sobres, ou aucune).

MÉTHODE
1. Audit, sans rien modifier :
   - les fichiers et composants de cet écran ;
   - d'où viennent les données (nom, tête de série, stats, faces et leur type, rang de compétence, reliques, arène) ;
   - comment on sait aujourd'hui qu'une face est forgée et qu'une compétence est de rang 2 ou 3 ;
   - ce qui calcule actuellement les tailles et positions.
   Montre-moi cet audit et ton plan, puis attends ma validation.
2. Après validation : implémente sans toucher à la logique du jeu, aux données ni à la navigation. Seulement la présentation.
3. Vérification visuelle obligatoire. Crée une page de dev (ou un mode debug) qui affiche l'écran avec des données factices pour ces cas :
   a. cas réel : d9 avec 3 compétences, une face forgée et un rang II, 3 reliques ; contre d11 avec une face forgée et 3 reliques ;
   b. cas limite : nom court, d4, 0 relique ; contre nom très long (« Ervald le Revenu, Chevalier des Cendres »), d12, deux faces forgées, rangs II et III, 10 reliques ;
   c. les deux mêmes fiches avec les camps inversés.
   Capture chaque cas en 1440×810 avec Playwright et compare avec les PNG de référence. Vérifie au pixel près que les deux fiches ont le même cadre (top, hauteur, largeur) et que les rangées de dé et de reliques sont à la même hauteur des deux côtés. Liste les écarts, corrige, puis montre-moi les captures.
```
