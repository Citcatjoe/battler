# Résolution des affrontements

Ce document est le **livre de règles** de la résolution. Il dit dans quel ordre tout se passe pendant un combat, et comment les effets se combinent, s'opposent ou se bloquent. Tout affrontement, présent ou à venir, repose sur ces règles.

- Le moteur (`src/game/combat.ts`, `src/game/statuses.ts`) applique exactement ce qui est écrit ici. En cas de doute, c'est le code qui fait foi, et ce document doit être corrigé.
- Chaque règle est couverte par un test (`src/game/combat.test.ts`, sections « résolution » et « conditions »).
- Le vocabulaire (statut, charges, durée, cumul…) est défini dans [STATUTS.md](STATUTS.md#vocabulaire).

---

## 1. Inspirations

Ces règles reprennent des solutions éprouvées dans des jeux du même genre, adaptées à un duel automatique au tour par tour.

| Jeu | Idée reprise | Chez nous |
| --- | --- | --- |
| **Magic: The Gathering** | Tour découpé en phases ; le joueur actif résout ses effets avant l'autre (règle « APNAP ») ; vérification de l'état après chaque résolution ; effets de *remplacement* qui modifient un événement avant qu'il arrive. | Phases début / action / fin ; l'actif avant le défenseur dans chaque fenêtre ; K.O. vérifié après chaque effet ; esquive, bouclier, garde et immunité comme effets de remplacement. |
| **Slay the Spire** | Statuts lisibles à une seule valeur ; *Vulnérable* et *Affaibli* sur les dégâts ; *Artefact* qui bloque le prochain malus et perd une charge. | Vulnérable (dégâts entrants), Affaibli (dégâts sortants), Garde sacrée (bloque un malus, une charge). |
| **Darkest Dungeon** | Dégâts sur la durée (saignement, peste) résolus en début de tour ; étourdissement qui fait sauter le tour. | Poison en début de tour ; Étourdi fait perdre l'action. |
| **Pokémon** | Effets résiduels de fin de tour dans un ordre fixe et connu. | Brûlure et effets de fin de tour, dans un ordre fixe (bonus puis malus). |
| **D&D 5e** | Effets « au début » ou « à la fin du tour de la créature » ; immunités et résistances par type. | `onTurnStart` / `onTurnEnd`, durée décomptée au début ou à la fin ; immunités par personnage. |
| **Hearthstone** | Déclencheurs de début et de fin de tour ; pas de réaction infinie (les déclencheurs ont un ordre et une profondeur bornée). | Fenêtres `turnStart` / `turnEnd` ; une réaction ne déclenche pas d'autre réaction (pas de chaîne). |

---

## 2. Structure d'un affrontement

```
OUVERTURE
  Initiative : 1d10 chacun, relance sur égalité. Le plus haut est le premier joueur actif.
  Fenêtre « combatStart » : gauche, puis droite.

TOUR (répété, le joueur actif alterne) — l'actif est l'attaquant, l'autre le défenseur
  Phase 1 · DÉBUT DE TOUR (actif)
    1. Effets de début de tour des statuts de l'actif (onTurnStart) : bonus, puis malus
    2. Durées « début » de l'actif : −1 tour, expiration à 0
    3. Fenêtre « turnStart » (actif)
  Phase 2 · ACTION (actif)
    Contrôle : si l'actif porte un statut de contrôle (skipsAction), il perd son action
    (une charge consommée) → aller en phase 3.
    Sinon, ATTAQUE (chaîne de calcul, § 3), puis FENÊTRES DU COUP :
      bloodied (seuil) → naturalOne → naturalMax (actif)
      coup esquivé : missed (actif) → dodge (défenseur)
      coup touché : hit → crit (actif) → hurt (défenseur)
  Phase 3 · FIN DE TOUR (actif)
    1. Effets de fin de tour des statuts de l'actif (onTurnEnd) : bonus, puis malus
    2. Durées « fin » de l'actif : −1 tour, expiration à 0
    3. Fenêtre « turnEnd » (actif)

FIN : dès qu'un combattant tombe à 0 PV, quelle qu'en soit la cause. Au-delà de 1 000 tours,
      victoire aux PV.
```

**Principe du « tour du porteur »** : les effets de tour et les durées d'un statut se règlent pendant le tour **de celui qui le porte**, pas pendant celui de celui qui l'a posé. Un poison posé par Ervald agit au début des tours de sa victime.

### Qui fixe le moment d'une résolution

Le « moment » n'est jamais décidé au cas par cas dans le moteur. Il est réparti entre trois niveaux, chacun responsable d'une seule question :

| Niveau | Défini dans | Question | Réglages |
| --- | --- | --- | --- |
| **Compétence** (liée au personnage) | `roster.ts`, `CharacterEvent` | **Quand le statut est-il posé**, sur qui, combien ? | déclencheur (`trigger`), conditions (`when`), `chance`, `limit`, cible, charges, durée |
| **Statut** (neutre) | `statuses.ts`, `StatusDef` | **Quand agit-il** une fois posé, **et quand s'use-t-il** ? | crochets (continu dans la chaîne de calcul, `onTurnStart`, `onTurnEnd`, `reactions`, `skipsAction`), cumul, plafond, `expiresAt` |
| **Moteur** | `combat.ts`, ce document | **Dans quel ordre**, quand plusieurs choses tombent au même moment ? | phases (§ 2), chaîne de calcul (§ 3), règles d'ordre (§ 5), application (§ 6) |

**Règle : un statut = un comportement temporel.** Un statut agit toujours au même moment, quelle que soit la compétence qui le pose. Si l'on veut qu'il agisse à un autre moment, c'est **un autre statut** (le Poison agit en début de tour ; une perte de PV en fin de tour, c'est la Brûlure). La compétence, elle, choisit librement *quand* elle le pose. C'est ce qui garde les interactions prévisibles : un joueur qui connaît un statut sait quand il agira, chez tous les personnages.

Exemple avec l'Armure temporaire, selon la compétence qui l'invoque :

| On veut… | Qui s'en charge | Comment |
| --- | --- | --- |
| une armure obtenue **au jet de dé** | compétence | déclencheur `naturalOne` ou `naturalMax` (c'est Peau de pierre) |
| obtenue **à un moment de tour** | compétence | déclencheur `turnStart`, `turnEnd` ou `combatStart` |
| obtenue **sous condition** | compétence | `when` : sous 50 % de PV, si l'adversaire est empoisonné… |
| **stockée et conservée** | statut | cumul `add`, sans durée : elle reste jusqu'à ce qu'on l'use |
| **temporaire** | compétence (durée posée) + statut (`expiresAt`) | `turns: 2`, décomptés au début ou à la fin du tour du porteur |
| **résolue sur le moment** | statut | crochet `shield` : elle absorbe dans la chaîne de calcul, au coup suivant |
| **régénérée à chaque tour** | un autre statut | ex. « Rempart » : `onTurnStart` → pose 1 Armure temporaire |

**Ce que le moteur gère déjà** : tous les moments ci-dessus. Les 11 déclencheurs servent à la fois aux compétences et aux réactions des statuts, et un effet peut lui-même poser un statut (un statut peut donc en générer un autre à chaque tour).

**Ce qui manque** (crochets à ajouter le jour où une compétence en a besoin, chacun avec ses tests) :
- `onExpire` : un effet quand le statut expire (une armure qui « explose » en dégâts, une malédiction qui se déclenche au bout de 3 tours) ;
- un effet **différé** posé par une compétence (« dans 2 tours, … ») : se fait aujourd'hui avec un statut porteur d'une durée, donc demande `onExpire` ;
- une action sur **le dé lui-même** (relancer, imposer un minimum) : les statuts modifient les stats et les dégâts, pas le jet.

---

## 3. La chaîne de calcul d'une attaque

Les étapes sont toujours dans cet ordre. Les trois tirages (dé, esquive, critique) sont faits dans cet ordre fixe, ce qui rend les combats reproductibles.

| # | Étape | Règle | Peut être modifiée par |
| --- | --- | --- | --- |
| 1 | **Dé** | Jet du dé de dégâts de l'attaquant (stats effectives) | `modifyStats` (dé) |
| 2 | **Esquive** | Le défenseur tire contre sa chance d'esquive. Une esquive annule tout le coup (remplacement). | `modifyStats` (esquive) |
| 3 | **Critique** | Forcé par un statut (`forcesCrit`, sans tirage), sinon tirage contre sa chance de critique. Le jet est multiplié, puis arrondi. | `forcesCrit`, `modifyStats` |
| 4 | **Dégâts sortants** | Statuts de l'attaquant, dans l'ordre de pose | `modifyOutgoing` (Affaibli) |
| 5 | **Dégâts entrants** | Statuts du défenseur, dans l'ordre de pose | `modifyIncoming` (Vulnérable) |
| 6 | **Plancher** | Le coup vaut au moins 1 | — |
| 7 | **Armure** | Armure effective retirée, au moins 1 dégât | `modifyStats` (armure, ex. Brèche) |
| 8 | **Boucliers** | Chaque bouclier absorbe ce qu'il peut sans descendre sous 1, et s'use d'autant (prévention) | `shield` |
| 9 | **Application** | PV retirés, plafonnés aux PV restants (le coup fatal ne compte que ce qu'il fallait) | — |

Les charges consommées par le coup (critique assuré, bouclier) sont retirées juste après.

---

## 4. Les types d'effets

Tout effet du jeu appartient à l'une de ces familles. Chacune a son moment de résolution.

| Famille | Quand | Exemples | Mise en œuvre |
| --- | --- | --- | --- |
| **Instantané** | Au moment où l'événement se déclenche | soin, dégâts directs, pose d'un statut, purge | `Effect` (`heal`, `damage`, `applyStatus`, `cleanse`) |
| **Continu** | Tant que le statut est présent, à chaque calcul | Brèche (armure), Affaibli, Vulnérable | `modifyStats`, `modifyOutgoing`, `modifyIncoming` |
| **Périodique** | Au début ou à la fin des tours du porteur | Poison, Régénération (début), Brûlure (fin) | `onTurnStart`, `onTurnEnd` |
| **Déclenché** | À un moment précis du combat, dans une fenêtre | événements des personnages ; Épines quand le porteur encaisse | `CharacterEvent` ; `reactions` d'un statut |
| **Remplacement** | À la place d'un événement, avant qu'il arrive | esquive (le coup n'a pas lieu), bouclier (une partie n'arrive pas), garde et immunité (le statut n'est pas posé), critique assuré | étapes 2, 3 et 8 ; `wards`, `immunities` |
| **Contrôle** | À la place de l'action du porteur | Étourdi | `skipsAction` |

---

## 5. Règles d'ordre

1. **Actif d'abord** : dans toute fenêtre qui concerne les deux camps, l'actif résout avant le défenseur (ordre fixe des fenêtres du coup, § 2).
2. **Dans une fenêtre, pour un camp** : d'abord les **réactions de ses statuts** (dans l'ordre où ils ont été posés), puis les **événements de son personnage** (dans l'ordre de leur définition).
3. **Effets périodiques** : d'abord les **bonus**, puis les **malus**, chacun dans l'ordre de pose. Une régénération soigne donc avant que le poison ne frappe.
4. **Effets d'un même événement** : dans l'ordre où ils sont écrits.
5. **Vérification d'état** : après chaque effet, si un combattant est à 0 PV, le combat s'arrête aussitôt. Les effets suivants ne se résolvent pas.
6. **Pas de chaîne** : les effets produits par une réaction ou un événement ne déclenchent pas d'autre réaction (des dégâts d'Épines ne déclenchent pas `hurt`). Seule exception : le seuil `bloodied`, qui est un état, peut se déclencher après n'importe quelle perte de PV. Cette règle exclut toute boucle infinie.
7. **Un statut retiré ne résout plus rien** : un statut annulé ou consommé pendant une fenêtre n'agit plus dans cette fenêtre.
8. **Pas de hasard caché** : une condition fausse ou un mécanisme non utilisé ne consomme aucun tirage.

---

## 6. Poser un statut : application et opposition

Quand un effet pose un statut, quatre règles s'appliquent **dans cet ordre** :

1. **Immunité** : si le personnage est immunisé contre ce statut (`immunities`), il n'est pas posé. Rien n'est consommé.
2. **Garde** : si le porteur a un statut de garde qui couvre ce statut (`wards` : une polarité ou une liste), la pose est bloquée et la garde perd une charge.
3. **Opposition** : si le porteur a le statut **opposé** (`opposes`, toujours réciproque), les charges s'annulent une à une. Si le nouveau statut a plus de charges, le reste est posé ; sinon, il est entièrement neutralisé.
4. **Cumul et plafond** : ce qui reste est posé selon le cumul (`add` ou `refresh`) et le plafond (`maxStacks`).

Le résultat est enregistré dans la chronologie (`result` : posé, neutralisé ou bloqué). Le journal, les badges et les statistiques le reflètent : par exemple « Résisté », « Neutralisé », ou « La Garde sacrée protège X du Poison ». Un malus bloqué ou neutralisé ne compte pas comme « malus reçu ».

**Ce qui s'oppose et ce qui ne s'oppose pas**

- Deux modificateurs de la même stat, l'un positif et l'autre négatif, se compensent naturellement : leurs effets s'additionnent. Ils coexistent, et il n'y a pas besoin d'opposition.
- L'**opposition** (`opposes`) est réservée aux paires contraires par nature, dont l'une effacerait l'autre. Aujourd'hui : Régénération ↔ Poison.

---

## 7. Interactions : exemples

| Situation | Résolution |
| --- | --- |
| Une victime empoisonnée (3) reçoit une Régénération (2) | Opposition : Poison 3 − 2 → Poison 1, la Régénération est neutralisée. |
| Même victime, Régénération (4) | Le poison est effacé, Régénération 1 posée. |
| Un porteur de Garde sacrée (1) reçoit Poison puis Brèche | Le Poison est bloqué et la garde est épuisée ; la Brèche est posée. |
| Un mort-vivant immunisé au poison est visé par Souffle de la tombe | Bloqué par immunité (« insensible »). |
| Épines (2) : le porteur encaisse un coup | Fenêtre `hurt` du défenseur : 2 dégâts directs à l'attaquant (ignorent armure et bouclier). L'attaquant ne déclenche pas son propre `hurt`. |
| Épines achèvent un attaquant à 2 PV | K.O. pendant la fenêtre du coup : le porteur des Épines gagne. |
| Vulnérable (2) contre une armure de 1, coup de 3 | 3 + 2 = 5, puis l'armure : 4 dégâts. |
| Affaibli (3) et Vulnérable (2) sur le même coup de 2 | Sortant : 2 − 3 = −1 ; entrant : −1 + 2 = 1 ; plancher : 1 ; puis armure. |
| Étourdi (1) | Début de tour normal (le poison agit), action perdue, fin de tour normale (la brûlure agit). |
| Régénération et Brûlure | La Régénération agit au début du tour, la Brûlure à la fin. |

---

## 8. Statuts qui illustrent chaque mécanique (à venir)

Pour que chaque règle soit prête et testée, le registre contient un statut « à venir » par mécanique. Aucun n'est encore posé par un personnage, et aucun n'apparaît dans le compendium.

| Mécanique | Statut | Règle |
| --- | --- | --- |
| Périodique, fin de tour | 🔥 Brûlure | Perte de PV à la fin des tours du porteur ; durée décomptée en fin de tour |
| Continu, dégâts entrants | 🩸 Vulnérable | +N dégâts reçus avant l'armure (3 charges au plus) |
| Contrôle | 💫 Étourdi | Action perdue (1 charge au plus, une charge par tour perdu) |
| Réaction | 🌵 Épines | Sur `hurt` : N dégâts directs à l'attaquant |
| Garde | ✨ Garde sacrée | Bloque le prochain malus (une charge par blocage) |
| Opposition | 💚 Régénération ↔ ☠️ Poison | Charges annulées une à une |

Avant d'attribuer l'un d'eux à un personnage, il faut lui faire peindre une icône (la zone d'état retombe sinon sur l'emoji ; un test l'exige pour tout statut en jeu), puis mesurer l'équilibre.

---

## 9. Décisions de design à valider

Les règles ci-dessus sont des choix par défaut, cohérents et testés. Certains sont des choix de game design qui te reviennent :

- [ ] **Ordre des effets périodiques** : bonus avant malus (la régénération peut sauver d'un poison mortel). L'inverse rendrait les malus plus menaçants.
- [ ] **Pas de chaîne** : faut-il autoriser un niveau de réaction (Épines contre Épines) ? Le moteur le permettrait avec une profondeur bornée.
- [ ] **Étourdi** : plafonné à 1 charge, pour qu'on ne puisse pas enchaîner les tours perdus. Faut-il une immunité temporaire après un étourdissement, comme dans Darkest Dungeon ?
- [ ] **Garde sacrée** : bloque *tous* les malus, ou une liste précise ?
- [ ] **Opposition** : d'autres paires contraires (Affaibli ↔ un bonus de force à venir ?).
- [ ] **Immunités raciales** : faut-il en donner (mort-vivant insensible au poison ; nain résistant à l'étourdissement) ?
- [ ] **Dégâts directs** : ils ignorent armure, esquive et boucliers. Faut-il distinguer « dégâts directs » et « dégâts de type poison » réductibles ?

---

## 10. Étendre la résolution

| Ajouter… | Où | Règle de résolution à respecter |
| --- | --- | --- |
| un statut | `STATUSES` | choisir sa famille (§ 4) et ses crochets ; documenter ici s'il crée une interaction nouvelle |
| un crochet de statut | `StatusDef` + un appel à un endroit précis de `simulateCombat` / `resolveAttack` | le placer dans la structure (§ 2) ou la chaîne de calcul (§ 3), l'ajouter à `statusRules`, et le tester |
| un déclencheur | `Trigger`, `TRIGGERS`, un `fire(…)` | le placer dans une fenêtre existante ou nouvelle, en respectant « actif d'abord » |
| une règle d'application | `resolveApplication` (`statuses.ts`) | la placer dans l'ordre du § 6 |
| une étape de chronologie | `Beat` (`combat.ts`) | lui donner sa mise en scène dans `useCombat` : TypeScript refuse un type d'étape oublié |
