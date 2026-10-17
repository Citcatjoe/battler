# Bonus et malus (statuts)

Ce document décrit le système des **statuts**, c'est-à-dire les bonus et les malus durables posés pendant un combat. Il donne leur vocabulaire, leur catalogue, les règles de design à suivre et l'état du chantier en cours.

- **En jeu**, le compendium (verticale « Bonus et malus ») liste les statuts **réellement posés par un personnage**, à partir du code (`statusCatalog()`) : c'est la liste de tout ce qu'on peut rencontrer en combat, et elle est toujours à jour. Un statut « à venir » n'y apparaît qu'une fois attribué.
- **Ce document** en garde la philosophie et les décisions. On le met à jour à chaque statut ajouté ou modifié.
- **La technique** (crochets du moteur, marche à suivre) est dans [ARCHITECTURE.md](ARCHITECTURE.md#ajouter-un-statut-aura-positive-ou-négative).

---

## Vocabulaire

| Terme | Sens |
| --- | --- |
| **Statut** | Effet durable porté par un combattant. Il s'affiche dans la zone d'état, au-dessus de lui (icône et nombre), et en aura au sol. |
| **Polarité** | **Bonus** (positif, vert) ou **malus** (négatif, rouge). |
| **Charges** (`stacks`) | Intensité ou réserve : points de bouclier, PV de poison par tour, nombre de critiques assurés… À 0, le statut disparaît. |
| **Durée** (`turns`) | Nombre de débuts de tour du **porteur** avant expiration. Elle est facultative : sans durée, le statut dure jusqu'à épuisement de ses charges. |
| **Cumul** (`stacking`) | Ce qui se passe quand on pose un statut déjà présent. `add` : les charges s'additionnent et la durée garde la plus longue. `refresh` : la nouvelle application remplace l'ancienne. |
| **Plafond** (`maxStacks`) | Nombre maximal de charges. Un cumul au-delà est ramené au plafond. |
| **Compteur** (`counter`) | Le seul nombre affiché sur l'icône de l'état. Par défaut (`auto`), ce sont les tours restants si le statut a une durée, sinon ses charges. On peut imposer `stacks` ou `turns`. |
| **Événement** | Capacité d'un personnage qui pose les statuts : *quand* (déclencheur) → *si* (conditions) → *quoi* (effets). |
| **Déclencheur** | Moment du combat : début du combat, début de tour, 1 au dé, critique, esquive, coup encaissé… (10 au total, voir [FEATURES.md](FEATURES.md#3-événements-et-statuts)). |
| **Condition** (`when`) | Exigence supplémentaire, vérifiée au moment du déclencheur. Toutes les conditions d'un événement doivent être vraies. |
| **Cible** | Un effet vise le porteur (`self`, par défaut) ou son adversaire (`opponent`). |
| **Réaction** (`reactions`) | Effet d'un statut déclenché à un moment du combat (ex. Épines quand le porteur encaisse). |
| **Garde** (`wards`) | Statut qui bloque la pose de certains statuts sur son porteur ; une charge par blocage. |
| **Opposition** (`opposes`) | Paire de statuts contraires dont les charges s'annulent une à une (Régénération ↔ Poison). |
| **Immunité** (`immunities`) | Statuts qui ne peuvent jamais être posés sur un personnage. |
| **Contrôle** (`skipsAction`) | Le porteur perd son action. |

### Déroulé dans un tour

Le tour du porteur a trois phases : **début de tour** (effets périodiques de début, durées « début »), **action** (attaque, ou action perdue s'il est Étourdi) et **fin de tour** (effets périodiques de fin, durées « fin »). Les fenêtres, l'ordre de résolution, l'application (immunité → garde → opposition → cumul) et des exemples d'interactions sont dans **[RESOLUTION.md](RESOLUTION.md)**, le livre de règles de la résolution.

Exemple : un poison de durée 3 posé sur l'adversaire agit au début de ses 3 tours suivants, puis expire.

### Conditions disponibles

| Condition | Vraie quand | Exemple |
| --- | --- | --- |
| `hpBelow` | les PV (du porteur ou de l'adversaire) sont sous une fraction des PV max | « si l'adversaire est sous 30 % de ses PV » |
| `hpAtLeast` | les PV sont au moins à une fraction des PV max | « tant qu'il a au moins 75 % de ses PV » |
| `hasStatus` | il porte un statut (avec au moins N charges) | « si l'adversaire est déjà empoisonné » |
| `lacksStatus` | il ne porte pas ce statut | « s'il n'a pas déjà de bouclier » |
| `fromTurn` | le tour en cours est au moins N | « à partir du tour 5 » |

Une condition fausse ne consomme pas de hasard : la `chance` d'un événement n'est tirée que si toutes ses conditions sont remplies.

---

## Catalogue (0.20.0)

| Statut | Polarité | Effet | Cumul | Plafond | En jeu |
| --- | --- | --- | --- | --- | --- |
| 🎯 Critique assuré | bonus | le prochain coup qui touche est critique (une charge par coup) | add | — | oui · elfes (Œil de faucon), sur soi |
| 🛡️ Armure temporaire | bonus | bouclier qui absorbe après l'armure, s'use d'autant | add | — | oui · nains (Peau de pierre), sur soi |
| 💚 Régénération | bonus | rend des PV au début de chaque tour du porteur | refresh | — | à venir |
| ☠️ Poison | malus | fait perdre des PV au début de chaque tour du porteur, en ignorant l'armure | add | — | oui · morts-vivants (Souffle de la tombe), sur l'adversaire |
| 🥀 Affaibli | malus | les coups du porteur infligent moins avant l'armure | refresh | — | à venir |
| 💔 Brèche | malus | armure du porteur réduite | add | 3 | à venir |
| 🔥 Brûlure | malus | perte de PV à la **fin** des tours du porteur ; durée décomptée en fin de tour | refresh | — | à venir |
| 🩸 Vulnérable | malus | +N dégâts reçus avant l'armure | add | 3 | à venir |
| 💫 Étourdi | malus | perd son action (une charge par tour perdu) | add | 1 | à venir |
| 🌵 Épines | bonus | renvoie N dégâts directs à l'attaquant à chaque coup encaissé | refresh | — | à venir |
| ✨ Garde sacrée | bonus | bloque les prochains malus (une charge par blocage) | add | — | à venir |

Régénération et Poison s'opposent. Les cinq derniers statuts illustrent chacun une mécanique de résolution (voir [RESOLUTION.md](RESOLUTION.md#8-statuts-qui-illustrent-chaque-mécanique-à-venir)). Ils n'ont pas encore d'icône peinte : à produire avant attribution.

---

## Règles de design

1. **Un statut est entièrement décrit dans son registre** (`STATUSES`) : règle et présentation. L'interface, le journal, le compendium et les statistiques suivent sans code dédié.
2. **Lisible en un coup d'œil** : chaque statut a une **icône peinte** claire (`STATUS_ICON`) et affiche **un seul nombre** dans la zone d'état. Le nom et le détail sont au survol, et dans le compendium.
3. **Bornes du moteur** : aucun statut ne peut faire descendre un coup sous 1 dégât, l'armure sous 0, ni une chance hors de 0 à 100 %. Les PV max ne changent jamais.
4. **Les dégâts directs sont puissants** : poison et dégâts d'effet ignorent armure, esquive et boucliers. Un réglage de 2 → 3 PV par tour a fait passer Ervald de 50 à 62 % de victoires (voir [PERSONNAGES.md](PERSONNAGES.md#morts-vivants--affliger)). Il faut les doser prudemment.
5. **Cumuls infinis interdits pour les malus de stats** : un malus qui modifie une caractéristique doit avoir un plafond (Brèche : 3), sinon un combat long finit par annuler la stat.
6. **Équilibre** : tout statut attribué à un personnage passe par la mesure (de 45 à 55 % de victoires, aucun duel au-delà de 60/40) et la mise à jour de la matrice dans `PERSONNAGES.md`.

### Ajouter un statut : check-list

- [ ] Rôle en une phrase (`summary`), polarité, icône (emoji pour le journal, **icône peinte obligatoire** dans `Icon.tsx` → `STATUS_ICON`, voir STYLE_BIBLE § 7), compteur affiché (`counter`).
- [ ] Règle de cumul, plafond si c'est un malus de stat.
- [ ] Crochets utilisés (voir ARCHITECTURE). S'il en faut un nouveau, le tester dans `combat.test.ts`.
- [ ] Une ligne ajoutée au catalogue ci-dessus, avec « à venir » tant qu'aucun personnage ne le pose.
- [ ] Une fois attribué : l'événement dans `roster.ts`, la mesure d'équilibre et `PERSONNAGES.md`.

---

## Chantier : l'arrivée des bonus et malus

**Objectif** : multiplier les bonus et malus appliqués pour un nombre de tours, selon des conditions, tout en gardant les combats lisibles et équilibrés.

**Prêt (0.18.0 à 0.20.0)**

- Durées en tours, cumul `add`/`refresh`, plafond de charges.
- Conditions de déclenchement (`when`) : PV du porteur ou de l'adversaire, présence ou absence d'un statut, tour minimal.
- `chance` et `limit` (nombre de fois par combat), ciblage du porteur ou de l'adversaire.
- Purge (`cleanse`) des bonus ou des malus.
- Couche de résolution (0.20.0) : fin de tour, contrôle, réactions, dégâts entrants, garde, immunités, opposition, ordre de résolution fixe. Voir [RESOLUTION.md](RESOLUTION.md), avec ses décisions à valider (§ 9).
- Catalogue généré depuis le code (`statusCatalog`), affiché dans le compendium, avec « en jeu » ou « à venir » et la liste de qui pose chaque statut.

**À définir (décisions de game design)**

- [ ] **Quels statuts pour qui** : les quatre statuts à venir (Régénération, Affaibli, Brèche, et un usage « sur soi » du poison ?) et leurs porteurs. Faut-il un deuxième événement par race, ou un événement propre à chaque variante ?
- [ ] **Conditions** : quelles conditions par personnage. Par exemple, un orc qui enrage sous 30 % de ses PV, ou un elfe qui achève une cible empoisonnée.
- [ ] **Durées types** : fixer une grille, par exemple 2 tours pour un effet court, 3 pour un effet standard, et « jusqu'à épuisement » pour les boucliers et les charges.
- [ ] **Interactions** : la purge doit-elle exister sur un personnage ? Faut-il des immunités (un mort-vivant immunisé au poison) ?
- [ ] **Nouveaux crochets éventuels** : vol de vie, renvoi de dégâts, étourdissement (tour passé), provocation… Chacun demande une étape du moteur et ses tests.
- [ ] **Lisibilité** : la zone d'état tient environ 4 médaillons de chaque côté au-dessus d'un combattant. Au-delà, faut-il les regrouper ou réduire leur taille ?
- [ ] **Compteur** : valider, statut par statut, que le nombre affiché est le bon. Par défaut, c'est la durée si elle existe : le poison d'Ervald affiche ses tours restants, pas ses 2 PV par tour.
