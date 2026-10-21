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
  Statuts de forme (0.73.0) : chaque personnage à formes commence avec ceux de sa première forme.
  Initiative : 1d10 chacun, relance sur égalité. Le plus haut est le premier joueur actif.
  Fenêtre « combatStart » : gauche, puis droite.

TOUR (répété, le joueur actif alterne) — l'actif est l'attaquant, l'autre le défenseur
  Phase 1 · DÉBUT DE TOUR (actif)
    0. Changement de forme (personnage à formes, sauf à son premier tour) : étape shift. Les statuts
       de forme de l'ancienne forme partent, ceux de la nouvelle sont posés (0.73.0).
    1. Effets de début de tour des statuts de l'actif (onTurnStart) : bonus, puis malus. Un bonus peut
       viser l'adversaire : l'Aura glaciale (0.69.0) pose ici 1 Poison par charge sur lui, avant le coup
       de l'actif ; l'immunité, l'opposition et la purge s'appliquent à ce Poison comme à tout autre.
    2. Durées « début » de l'actif : −1 tour (étape statusDuration), expiration à 0 (statusExpire)
    3. Fenêtre « turnStart » (actif)
  Phase 2 · ACTION (actif)
    Contrôle : si l'actif porte un statut de contrôle (skipsAction), il perd son action
    (une charge consommée) → aller en phase 3.
    Pièce (2026-10-21, demande de l'utilisateur) : un statut `coinToss` (Pile ou face) ne remplace plus
    l'action suivante. La pièce part aussitôt, juste après les fenêtres du coup pendant lequel il a été
    posé, dans la même action (étape coin, un rang de dé en mode triche) : pile, dégâts directs ; face,
    rien ; le statut est consommé. Le coup du 2 qui la pose reste sacrifié, et l'action continue ensuite
    (coups suivants d'une rafale). Option du statut (0.42.0) : `headsTouches`, pile ouvre les fenêtres
    « hit » (porteur) et « hurt » (adversaire), comme un coup qui touche, mais sans esquive, armure ni
    critique. Avant : la pièce remplaçait toute l'action suivante, sans coup.
    Coups multiples : si l'actif porte un statut `extraStrikes` (Furie des vents, Coup de chance), il est
    (Coup de chance, 0.50.0 : toutes ses charges, un d6 par charge, `strikeCharges: 'all'`).
    Coups instantanés (`instantStrikes`, Furie des vents, 0.50.0) : une charge gagnée pendant l'action
    frappe juste après le coup en cours, dans la même action (`extraStrikes` coups). Depuis la 0.69.0,
    ce sont des coups bruts (`Attack.plain`) : leur dé ne donne que leur valeur, un 1, un 2 ou un 3
    frappe pour sa valeur et ne déclenche aucune compétence, donc aucune Furie en chaîne.
    consommé (étape flurry) et l'action compte plusieurs coups, chacun avec son dé (`extraDie` : le d3
    de Coup de chance).
    Deux dés (`twinDice`, la barde, 0.41.0) : l'actif lance ses deux dés ensemble (étape pair, deux
    rangs de dé en mode triche). Un double qui a sa compétence (fenêtres doubleOne à doubleFive)
    remplace toute l'action : la compétence se déclenche (étape event), et si elle porte `volley`,
    suivent `volley` coups dont le dé vaut la face du double, ou, avec `merged`, un seul coup qui vaut
    leur somme (Crescendo : un coup de 3 × 4 = 12 ; Soliste : 15). Sinon,
    deux coups, un par dé, avec la valeur déjà tirée. Ces coups ne relancent rien : esquive,
    critique, modificateurs et fenêtres du coup comme un coup normal.
    Sinon, un seul coup. Pour CHAQUE COUP, entièrement résolu avant le suivant :
      ATTAQUE (chaîne de calcul, § 3), puis FENÊTRES DU COUP :
      bloodied (seuil) → naturalOne → naturalTwo → naturalMax (actif)
      coup esquivé : missed (actif) → dodge (défenseur)
      coup touché : hit → crit (actif) → hurt (défenseur)
      coup sacrifié (`forfeitsHit`) : ni l'un ni l'autre, seules les fenêtres du dé s'ouvrent
  Phase 3 · FIN DE TOUR (actif)
    1. Effets de fin de tour des statuts de l'actif (onTurnEnd) : bonus, puis malus
    2. Durées « fin » de l'actif : −1 tour, expiration à 0
    3. Fenêtre « turnEnd » (actif)

FIN : dès qu'un combattant tombe à 0 PV, quelle qu'en soit la cause. Au-delà de 1 000 tours,
      victoire aux PV.
```

**Principe du « tour du porteur »** : les effets de tour et les durées d'un statut se règlent pendant le tour **de celui qui le porte**, pas pendant celui de celui qui l'a posé. Un poison posé par Ervald agit au début des tours de sa victime.

**Pas de décompte le tour de la pose** (0.25.0) : un statut posé ou renouvelé pendant un tour n'est pas décompté à la fin de ce même tour. Un statut d'« 1 tour » décompté en fin de tour (`expiresAt: 'turnEnd'`), posé pendant l'action du porteur, dure donc jusqu'à la fin de son **prochain** tour : c'est « pour le tour d'après » (Furie des vents). Un statut décompté au début (défaut) et posé pendant l'action dure jusqu'au début du prochain tour du porteur, donc pendant tout le tour de l'adversaire (Esquive améliorée, Épines).

### Mise en scène d'une résolution

À l'écran, chaque résolution doit être **lisible comme un moment** : le joueur voit la cause et sa conséquence ensemble, dans l'ordre du moteur.

- **Une valeur qui change se voit changer** : le nombre de l'état rebondit au moment de la résolution, avec sa variation (−1, +2).
- **Cause et conséquence ensemble** : l'effet d'un statut (le « −2 » d'une brûlure) et le décompte de sa durée (3 → 2) qui suit dans la même phase sont montrés au même instant. Un statut qui s'estompe (le poison) perd sa charge dans l'étape même de son effet : le « −3 » et le compteur qui passe à 2 tombent ensemble (`anticipate`, `useCombat.ts`). L'étape du moteur reste distincte ; seul l'affichage les réunit.
- **Rien ne disparaît sans avoir montré son 0** : un état épuisé ou expiré affiche d'abord son 0, puis quitte la zone d'état (`StatusTray`).
- **Une réaction au coup tombe avec son impact** (0.68.1) : la plaie qui coule (Saignement) est jouée sur la frappe qui la fait couler. Son label de surcharge (« Saignement +2 », § 11) tombe sous le dé au moment de l'impact, comme « Critique ×2 », puis ses PV perdus et son compteur qui baisse suivent d'un battement (`flowAt`, `bleedOut`, `useCombat.ts`). Son étape du moteur reste distincte, juste après le coup ; si une autre étape les sépare (Riposte), la plaie garde sa propre étape, avec le même label.
- Ces règles valent pour toute résolution à venir : un nouveau type d'étape doit dire, dans `useCombat`, avec quoi il est montré.

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
| 1 bis | **Coup sacrifié** | Si une compétence de l'attaquant déclenchée par ce jet porte `forfeitsHit` (toutes les compétences du 1, du 2 et du 3 depuis la 0.27.0), le coup n'inflige rien : ni esquive, ni critique, ni dégâts, et aucune fenêtre `hit`, `hurt`, `missed` ou `dodge` (remplacement). Les fenêtres du dé s'ouvrent normalement. | `forfeitsHit` (compétence) |
| 1 bis | **Coup transformé** | Si une compétence du jet a `reshapesHit` (sous la bonne forme), le coup n'est pas sacrifié : sa valeur devient le maximum du dé (`max`) ou un nouveau jet secret plus un bonus (`reroll`). `noCrit` : pas de tirage de critique, et un critique assuré n'est pas consommé | `reshapesHit` (sans porteur depuis la 0.73.0 ; Charge et Coup de griffe avant) |
| 2 | **Esquive** | Imposée par un statut du défenseur (`forcesDodge`, sans tirage, une charge consommée), sinon le défenseur tire contre sa chance d'esquive. Une esquive annule tout le coup (remplacement). | `forcesDodge` (Esquive améliorée), `modifyStats` (esquive) |
| 2 bis | **Bonus de relique** (0.75.0) | Sur un coup qui touche, les reliques de coup de l'attaquant ajoutent leur bonus à la valeur du coup (le jet, ou la valeur d'un coup transformé), avant le critique ; un bonus de face (`onFace`, 0.77.0) ne vaut que si le dé de ce coup fait cette face : un 4 avec le Fer à quatre clous vaut 8, puis 16 en critique ×2. Le jet affiché et les compétences du jet restent ceux du dé naturel. Aucun tirage. | `Relic.rollBonus`, `Relic.onFace` ([RELIQUES.md](RELIQUES.md)) |
| 3 | **Critique** | Forcé par un statut (`forcesCrit`, sans tirage), sinon tirage contre sa chance de critique. Le jet est multiplié, puis arrondi. | `forcesCrit`, `modifyStats` |
| 4 | **Dégâts sortants** | Statuts de l'attaquant, dans l'ordre de pose | `modifyOutgoing` (Affaibli) |
| 5 | **Dégâts entrants** | Statuts du défenseur, dans l'ordre de pose | `modifyIncoming` (Vulnérable) |
| 6 | **Plancher** | Le coup vaut au moins 1 | — |
| 7 | **Armure** | Armure effective retirée, au moins 1 dégât | `modifyStats` (armure, ex. Brèche) |
| 8 | **Boucliers** | Chaque bouclier absorbe ce qu'il peut sans descendre sous 1, et s'use d'autant (prévention) | `shield` |
| 8 bis | **Dégâts finaux** | Statuts de l'attaquant, dans l'ordre de pose, après tout le reste ; au moins 1 (0.41.0). Ni l'armure ni l'intimidation ne les rognent | `modifyFinal` (Aura mélodieuse, Fausse note) |
| 9 | **Application** | PV retirés, sans descendre sous 0. Les dégâts du coup sont comptés en entier, excès du coup fatal compris (overkill, depuis la 0.34.0) | — |
| 9 bis | **Usure au coup** | Chaque statut `spentOnHurt` du défenseur touché perd une charge (Luciole), juste après l'application ; un statut `spentOnHit` de l'attaquant qui touche disparaît (Fausse note) | `spentOnHurt`, `spentOnHit` |
| 10 | **Vol de vie** | Si l'attaquant porte un statut `drainsHit`, le coup porté consomme une charge. S'il a touché, l'attaquant regagne les PV réellement retirés (plafonnés à ses PV max). Esquivé, la charge est perdue sans soin, au moment du coup. Un coup sacrifié (jet de compétence) n'est pas un coup porté : la charge reste. Étape `statusReaction`, avant les fenêtres du coup. | `drainsHit` (Vol de vie) |

Les charges consommées par le coup (critique assuré, bouclier) sont retirées juste après.

---

## 4. Les types d'effets

Tout effet du jeu appartient à l'une de ces familles. Chacune a son moment de résolution.

| Famille | Quand | Exemples | Mise en œuvre |
| --- | --- | --- | --- |
| **Instantané** | Au moment où l'événement se déclenche | soin, dégâts directs (Foudre du druide, 0.73.0 ; en 0.76.0, 3 coups de 2 : `hits` d'un effet `damage`, comptés ensemble dans la même étape, détail dans `parts`, jamais critiques, sans armure, esquive ni bouclier), pose d'un statut, purge (avec un effet de repli s'il n'y a rien à retirer : `orElse`, 0.42.0) | `Effect` (`heal`, `damage`, `applyStatus`, `cleanse`) |
| **Continu** | Tant que le statut est présent, à chaque calcul | Brèche (armure), Affaibli, Vulnérable, Aura d'immunité (armure +1) | `modifyStats`, `modifyOutgoing`, `modifyIncoming`, `modifyFinal` |
| **Périodique** | Au début ou à la fin des tours du porteur | Poison, Régénération (début), Brûlure (fin) | `onTurnStart`, `onTurnEnd` |
| **Qui s'estompe** | Perd une charge chaque fois qu'il agit, au même instant que son effet ; disparaît à 0 (étape `statusExpire` de la phase, ou dans l'étape même de la réaction). Pas de durée en tours (refusée par `validateRoster`) | Poison (0.36.4) : 3, 2, 1 par tour ; Saignement (0.68.0) : 2, 1 par coup reçu | `decays` (sur `onTurnStart`, `onTurnEnd` ou une réaction) |
| **Déclenché** | À un moment précis du combat, dans une fenêtre | événements des personnages ; Épines acérées et Saignement quand le porteur encaisse ; Pourfendre, sur un 1, seulement si son coup touche (`needsTouch`, 0.70.0) | `CharacterEvent` ; `reactions` d'un statut |
| **Remplacement** | À la place d'un événement, avant qu'il arrive | esquive (le coup n'a pas lieu), esquive imposée, coup sacrifié, bouclier (une partie n'arrive pas), garde et immunité (le statut n'est pas posé), critique assuré | étapes 1 bis, 2, 3 et 8 ; `forfeitsHit`, `forcesDodge`, `wards`, `immunities` |
| **Sur le coup** | Juste après l'application d'un coup qui touche | Vol de vie | `drainsHit` (étape 10) |
| **Contrôle** | À la place de l'action du porteur | Étourdi | `skipsAction` |
| **Action multiple** | Au début de l'action du porteur | Furie des vents (deux coups) | `extraStrikes` |
| **Deux dés** | À l'action, pour un personnage qui lance deux dés | la barde : deux coups, ou une compétence sur un double | `twinDice`, déclencheurs `doubleOne`… `doubleFive`, `volley` |
| **Aura** (permanente) | Pour le reste du combat, sans durée | Aura de puissance (sortant), d'intimidation (entrant), de précision (stats), glaciale (périodique : pose du Poison sur l'adversaire, 0.69.0) | crochets existants, statut sans `turns` |
| **Statut de forme** (0.73.0) | Tant que le personnage garde la forme : posé quand il la prend (ouverture pour la première, étape `shift` ensuite), retiré quand il la quitte. Jamais purgé (une purge l'ignore), jamais bloqué (immunité, garde) | Incantation (d3, un sort par jet), Force de l'ours (+3 à chaque coup ; +4 jusqu'à la 0.75.0) | `StatusDef.innate`, `CharacterForm.statuses` |

---

## 5. Règles d'ordre

1. **Actif d'abord** : dans toute fenêtre qui concerne les deux camps, l'actif résout avant le défenseur (ordre fixe des fenêtres du coup, § 2).
2. **Dans une fenêtre, pour un camp** : d'abord les **réactions de ses statuts** (dans l'ordre où ils ont été posés), puis les **événements de son personnage** (dans l'ordre de leur définition), puis **ses reliques** (dans l'ordre d'obtention, 0.75.0) : une relique répond, elle n'initie pas.
3. **Effets périodiques** : d'abord les **bonus**, puis les **malus**, chacun dans l'ordre de pose. Une régénération soigne donc avant que le poison ne frappe.
4. **Effets d'un même événement** : dans l'ordre où ils sont écrits.
5. **Vérification d'état** : après chaque effet, si un combattant est à 0 PV, le combat s'arrête aussitôt. Les effets suivants ne se résolvent pas.
6. **Pas de chaîne** : les effets produits par une réaction ou un événement ne déclenchent pas d'autre réaction (la plaie qui coule ne déclenche pas `hurt`, les dégâts de Riposte non plus). Seules exceptions : les **seuils de PV**, qui sont des états et peuvent se déclencher après n'importe quelle perte de PV : `bloodied`, puis les reliques de seuil (0.75.0, `checkThresholds` ; sur ses PV ou, 0.77.0, sur ceux de l'adversaire). Une relique de seuil ne repart qu'après être remontée au-dessus de son seuil (tout soin la réarme aussitôt, `rearmThresholds`) : cette règle exclut toute boucle infinie. Depuis le 2026-10-21, les trois reliques de seuil du registre sont à une charge (Dent de loup comprise) : le réarmement ne sert plus qu'à une future relique de seuil à recharge, et l'audit refuse une relique de seuil sans charge ni recharge.
7. **Un statut retiré ne résout plus rien** : un statut annulé ou consommé pendant une fenêtre n'agit plus dans cette fenêtre.
8. **Pas de hasard caché** : une condition fausse ou un mécanisme non utilisé ne consomme aucun tirage. Une relique ne tire jamais : sans déclenchement, un combat avec elle est identique au combat sans elle (test de `combat.test.ts`).
9. **Un coup ne réagit qu'à ce qui existait avant lui** (0.68.1, demande de l'utilisateur) : dans les fenêtres d'un coup (`hit`, `crit`, `hurt`, `missed`, `dodge`), seuls les statuts présents à leur ouverture réagissent, avec les charges qu'ils avaient alors (`strikeBase`, `fireStrike`). Un statut posé pendant ce coup attend le suivant. C'est ce qui rend une plaie visible avant qu'elle coule : l'observateur la voit s'ouvrir, puis attend le coup qui la fera couler.

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
| Poison 3, puis Souffle de la tombe (3) avant son tour | Cumul : Poison 6, qui fera 6, 5, 4, 3, 2 et 1 PV (21 PV). |
| Même victime, Régénération (4) | Le poison est effacé, Régénération 1 posée. |
| Un porteur de Garde sacrée (1) reçoit Poison puis Brèche | Le Poison est bloqué et la garde est épuisée ; la Brèche est posée. |
| Un mort-vivant immunisé au poison est visé par Souffle de la tombe | Bloqué par immunité (« insensible »). |
| Épines acérées (2) : le porteur encaisse un coup | Fenêtre `hurt` du défenseur : 2 charges de Saignement posées sur l'attaquant (0.68.0 ; avant, 2 dégâts directs renvoyés). Elles ne coulent pas tout de suite : la plaie attend que le nain touche à son tour. Les épines restent pour les coups suivants. |
| Furie des vents contre Épines acérées | **Chaque** coup qui touche le nain déclenche les épines : avec 3 charges, 3 + 3 = 6 charges de Saignement sur l'orc, qui couleront 6, 5, 4… sur les prochains coups du nain. |
| Saignement (2) : le porteur encaisse un coup | Fenêtre `hurt` du porteur, après les réactions posées avant la plaie : 2 dégâts directs (ignorent armure et bouclier), puis la plaie passe à 1, dans la même étape. Le coup suivant fait couler 1, et la plaie disparaît. |
| Saignement posé par le coup qui touche | Les fenêtres de l'attaquant (`hit`, `crit`) passent avant le `hurt` du défenseur, mais la plaie posée par ce coup (critique, griffe) n'existait pas à l'ouverture des fenêtres : elle ne coule pas (règle 9). Le coup suivant la fait couler. Une plaie de 2 grossie de 2 par un coup coule de 2 sur ce coup (ses charges d'avant), puis passe à 3. |
| Saignement contre esquive, Peur ou coup sacrifié | Aucun coup ne touche : la plaie ne coule pas et ne perd rien. Elle attend le prochain coup qui touche, sans limite de durée. |
| Pourfendre (Gorak) : le 1 touche, ou est esquivé | Le 1 n'est pas sacrifié : c'est un vrai coup (critique, Aura de puissance, intimidation, épines, riposte). S'il touche, la fenêtre du 1 (`naturalOne`, avant `hit` et `hurt`) pose Saignement 2, qui ne coule pas sur ce coup (règle 9). S'il est esquivé, rien n'est posé : un coup doit toucher pour poser un malus physique (`needsTouch`, vérifié avant tout tirage). |
| Furie des vents contre Saignement (2) | Le premier coup de la rafale fait couler 2, le deuxième 1 : la plaie est vidée dans la même action. |
| Furie des vents contre Esquive améliorée | Le premier coup est esquivé à coup sûr et consomme une charge ; le second est résolu normalement (tirage d'esquive) s'il n'en reste plus, sinon esquivé à coup sûr lui aussi (cumulable depuis le 2026-10-21). |
| Esquive améliorée posée deux fois (2026-10-21) | Les charges s'additionnent : deux charges, deux coups reçus esquivés à coup sûr, une charge par esquive. |
| Furie des vents : un 1, un 2 ou un 3 pendant les deux coups | Coups bruts (0.69.0) : le coup frappe pour la valeur du dé, sans compétence ; aucune Furie ne se relance. |
| Vol de vie : deux 2 de suite, ou un 1 ou un 3 | Le jet suivant est encore un coup sacrifié : aucun coup n'est porté, rien n'est volé, la charge reste (non cumulable, 1 charge au plus). Elle attend le prochain vrai coup. |
| Vol de vie : coup esquivé | La charge est consommée sans soin : le coup a été porté, mais il n'a rien retiré. |
| Vol de vie contre Épines acérées | Le mort-vivant touche le nain : il regagne d'abord les PV retirés (étape 10), puis la fenêtre `hurt` du nain pose le Saignement sur lui. |
| Coup sacrifié contre Esquive améliorée, Épines acérées ou Saignement | Le coup n'a pas lieu : il ne consomme ni l'esquive imposée, ni les épines, ni la plaie. |
| Aura glaciale (2) au début du tour du mort-vivant | Phase 1, effets de début de tour du **porteur** (bonus) : 2 charges de Poison posées sur l'adversaire, avant le coup (0.69.0). Ce Poison agit au début du tour suivant de la victime et perd une charge à chaque fois : il grossit d'1 par tour. Immunisée, la victime ne reçoit rien. |
| Aura de puissance (2 charges) sur un critique de 5 ×2 | Critique d'abord (10), puis sortant : 10 + 4 = 14, puis l'armure. Chaque coup d'une Furie des vents reçoit le bonus. |
| Aura de puissance (1) contre Aura d'intimidation | Sortant puis entrant : un 6 devient 6 + 2 − 2 = 6. Un 1 contre l'intimidation seule : 1 − 2 = −1, plancher à 1. |
| Riposte et Vol de vie, Épines acérées | Le coup touche le paladin : l'attaquant vole d'abord sa vie (étape 10), puis la Riposte renvoie la moitié des PV retirés, puis la fenêtre `hurt` (épines, saignement). Les dégâts de riposte ne remplissent pas les jauges de rétribution : ce ne sont pas des coups. |
| Rétribution : jauges | Chaque coup qui touche le paladin range ses PV retirés dans une jauge (3 au plus, la plus ancienne cède sa place). Ni les dégâts directs (poison, saignement, pièce) ni les coups esquivés ne comptent. Sur un 1 : dégâts directs égaux à la somme, au moins 1. |
| Aura d'immunité | Posée sur un 3 : les malus du paladin sont d'abord purgés, puis toute pose de malus est bloquée (« protégé par Aura d'immunité »), sans usure. Une Purification adverse peut retirer l'aura. |
| Peur contre Furie des vents ou Pile ou face | La peur fait perdre l'action entière. La Furie, instantanée depuis la 0.50.0, ne peut pas se faire voler son action : elle frappe dans celle où elle est posée. La pièce non plus depuis le 2026-10-21 : elle part juste après le coup qui la pose. |
| Purification contre une aura cumulée | Le dernier bonus posé part avec toutes ses charges : une Aura de puissance à 6 charges disparaît d'un coup. Une Furie ou un Vol de vie en attente peuvent aussi être purifiés. |
| Coup de chance : le d3 | Un d3 tombe toujours sur 1, 2 ou 3 : il ne frappe jamais et déclenche toujours une compétence de la voleuse (un nouveau Coup de chance, Pile ou face ou l'aura). |
| Pile ou face et Aura de décoction | Depuis la 0.42.0, pile compte comme un coup qui touche : la décoction empoisonne juste après la pièce. Face ne touche pas. |
| Aura de sainteté et poison | Le poison agit au début du tour du porteur, la sainteté à sa fin : la prêtresse empoisonnée perd puis regagne dans le même tour. |
| Aura de précision et Œil de faucon | Le critique assuré utilise le multiplicateur effectif : ×3 pour Elaria, ×3,4 pour Sylwen. |
| Saignement qui achève son porteur | K.O. pendant la fenêtre du coup : l'adversaire du porteur gagne, même si le coup seul ne suffisait pas. |
| Vulnérable (2) contre une armure de 1, coup de 3 | 3 + 2 = 5, puis l'armure : 4 dégâts. |
| Affaibli (3) et Vulnérable (2) sur le même coup de 2 | Sortant : 2 − 3 = −1 ; entrant : −1 + 2 = 1 ; plancher : 1 ; puis armure. |
| Étourdi (1) | Début de tour normal (le poison agit), action perdue, fin de tour normale (la brûlure agit). |
| Régénération et Brûlure | La Régénération agit au début du tour, la Brûlure à la fin. |
| Barde : deux dés différents (2 et 5) | Deux coups, l'un de 2, l'autre de 5, chacun avec son esquive et son critique. Un 2 seul ne déclenche rien : seules les paires comptent. |
| Barde : double 4, Aura mélodieuse (2 charges) | Crescendo : un seul coup de 12 (critique : 24), puis l'armure et les boucliers, puis +2 en dégâts finaux. |
| Aura mélodieuse contre Aura d'intimidation (1) et armure 1 | Dégâts finaux (`modifyFinal`) : appliqués après tout le reste. Un 3 devient 3 − 2 = 1, l'armure laisse 1 (plancher), puis +1 : 2. C'est la réponse de la barde aux réductions fixes par coup. |
| Fausse note (2 charges) contre une Furie des vents | Le premier coup qui touche perd 6 dégâts finaux, après l'armure (plancher à 1), et consomme toute la Fausse note ; le second est normal. Un coup esquivé ou sacrifié ne la consomme pas. |
| Sifflotement (3 charges), relancé avant la fin | Cumul : les charges s'ajoutent (3 + 3 = 6), chaque fin de tour rend 2 PV et retire une charge. |

---

## 8. Statuts qui illustrent chaque mécanique (à venir)

Pour que chaque règle soit prête et testée, le registre contient un statut « à venir » par mécanique. Aucun n'est encore posé par un personnage, et aucun n'apparaît dans le compendium.

| Mécanique | Statut | Règle |
| --- | --- | --- |
| Périodique, fin de tour | 🔥 Brûlure | Perte de PV à la fin des tours du porteur ; une seule valeur (0.69.0) : posée sans durée, elle dure autant de tours que sa valeur (`turnsFromStacks`), et une nouvelle Brûlure remplace l'ancienne |
| Continu, dégâts entrants | 🩸 Vulnérable | +N dégâts reçus avant l'armure (3 charges au plus) |
| Contrôle | 💫 Étourdi | Action perdue (1 charge au plus, une charge par tour perdu) |
| Garde | ✨ Garde sacrée | Bloque le prochain malus (une charge par blocage) |
| Opposition | 💚 Régénération ↔ ☠️ Poison | Charges annulées une à une |

Avant d'attribuer l'un d'eux à un personnage, il faut demander son icône peinte à l'utilisateur (la zone d'état affiche sinon une marque neutre, son initiale ; un test l'exige pour tout statut en jeu, et aucun emoji n'est permis), puis mesurer l'équilibre.

---

## 9. Décisions de design à valider

Les règles ci-dessus sont des choix par défaut, cohérents et testés. Certains sont des choix de game design qui te reviennent :

- [ ] **Ordre des effets périodiques** : bonus avant malus (la régénération peut sauver d'un poison mortel). L'inverse rendrait les malus plus menaçants.
- [ ] **Pas de chaîne** : faut-il autoriser un niveau de réaction (Épines contre Épines) ? Le moteur le permettrait avec une profondeur bornée.
- [ ] **Étourdi** : plafonné à 1 charge, pour qu'on ne puisse pas enchaîner les tours perdus. Faut-il une immunité temporaire après un étourdissement, comme dans Darkest Dungeon ?
- [ ] **Garde sacrée** : bloque *tous* les malus, ou une liste précise ?
- [ ] **Opposition** : d'autres paires contraires (Affaibli ↔ un bonus de force à venir ?).
- [ ] **Immunités raciales** : faut-il en donner (mort-vivant insensible au poison ; nain résistant à l'étourdissement) ?
- [ ] **Dégâts directs** : ils ignorent armure, esquive et boucliers, et ne sont jamais critiques, même en plusieurs coups (`hits`, 0.76.0). Faut-il distinguer « dégâts directs » et « dégâts de type poison » réductibles ?

---

## 10. Étendre la résolution

Pour vérifier qu'un combat suit bien ces règles, la **trace de résolution** de chaque combat (console du navigateur, bouton « Copier la trace ») en donne chaque étape dans l'ordre du moteur, avec la phase, la chaîne de calcul, les PV avant → après et les durées. Voir ARCHITECTURE.md, « Vérifier une résolution ».


| Ajouter… | Où | Règle de résolution à respecter |
| --- | --- | --- |
| un statut | `STATUSES` | choisir sa famille (§ 4) et ses crochets ; documenter ici s'il crée une interaction nouvelle |
| un crochet de statut | `StatusDef` + un appel à un endroit précis de `simulateCombat` / `resolveAttack` | le placer dans la structure (§ 2) ou la chaîne de calcul (§ 3), l'ajouter à `statusRules`, et le tester |
| un déclencheur | `Trigger`, `TRIGGERS`, un `fire(…)` | le placer dans une fenêtre existante ou nouvelle, en respectant « actif d'abord » |
| une règle d'application | `resolveApplication` (`statuses.ts`) | la placer dans l'ordre du § 6 |
| une étape de chronologie | `Beat` (`combat.ts`) | lui donner sa mise en scène dans `useCombat` : TypeScript refuse un type d'étape oublié |
| un label de la zone de surcharge | `specials.ts` | rien à déclarer pour un statut : sa mécanique le range (§ 11) ; une nouvelle source de surcharge lisible dans `Attack` s'ajoute à `attackSpecials`, à sa place dans l'ordre du § 3 |

---

## 11. La zone de surcharge

La colonne de labels sous le dé. **Définition validée par l'utilisateur (2026-10-21)** : elle montre **ce qui modifie l'étape de résolution en cours au-delà de sa règle de base, au moment où ça s'applique**. Présentation pure : le rejoueur lit la chronologie (les champs d'`Attack`, les étapes de réaction), rien n'est recalculé. Registre unique : `specials.ts` ; rendu : `SpecialLabel.tsx` ; couleurs : [design-system.md](design-system.md) § 3.1 ; sons : [SONS.md](SONS.md) § 4.4.

### Trois niveaux à l'écran

| Niveau | Où | Ce qu'il dit |
| --- | --- | --- |
| Identité | barre de compétences (sceaux, anneaux d'aura) | ce qui s'est déclenché : une compétence, une aura |
| Surcharge | colonne sous le dé | ce qui change *ce* coup-ci |
| Conséquences | textes sur les combattants, zone d'état | ce qui en résulte : PV, états posés ou usés |

### Les règles

1. **Point de vue de l'attaquant**, toujours : le combattant dont c'est l'action offensive en cours (le maître du tour). **+** si la surcharge amplifie son action, **−** si elle la réduit ou la contre. Pour un statut, le signe se déduit de sa polarité et de son porteur : un bonus de l'attaquant ou un malus du défenseur donne +, un bonus du défenseur ou un malus de l'attaquant donne − (`statusSpecial`). Une relique : + chez l'attaquant, − chez le défenseur.
2. **Format** : la cause et son effet chiffré sur ce coup (« Critique ×2 », « Fer à quatre clous +4 », « Armure temporaire −6 », « Riposte −3 ») ; le nom seul s'il n'y a rien à chiffrer (« Esquive assurée », « Épines acérées »).
3. **Ordre** : de haut en bas, l'ordre d'application de ce livre (§ 3, puis les réactions dans l'ordre du moteur) ; chaque label tombe à l'instant où il s'applique ; la colonne se vide à l'étape suivante (le jet suivant, chaque coup d'une rafale, le passage de main).
4. **Couleur selon la source**, pas selon le signe : Coup (le dé et le critique), Compétence ou statut, Relique. Le signe se lit au « + / − » du label, aux hachures de la plaque du − et à son son.
5. **N'entre que ce qui change ce coup et n'arrive pas à chaque coup.** Hors de la colonne :
   - ce qui se **déclenche** (une compétence et l'action qu'elle donne : Pile ou face, Furie des vents, Coup de chance, Rétribution, Crescendo et Soliste sur un double) : leur sceau le dit, au niveau identité (décision de l'utilisateur pour Pile ou face et la Furie, étendue à toute action déclenchée) ;
   - ce qui agit **à chaque coup** (auras : Aura de puissance, Aura mélodieuse, Aura de décoction ; états durables : Affaibli, Vulnérable, Force de l'ours) : barre de compétences et zone d'état.
   - **Exception déclarée : la relique qui se déclenche** (étape `relic`) garde son label, à la demande de l'utilisateur (« quand une relique se déclenche, il faudrait un label au centre ») : une relique n'a pas de sceau dans la barre de compétences.

### Inventaire (2026-10-21)

| Instant | Label | Lu dans | Source | Signe |
| --- | --- | --- | --- | --- |
| résultat du dé | Esquive assurée | `Attack.dodgeForced` (Esquive améliorée du défenseur) | Compétence ou statut | − |
| résultat du dé | « Fer à quatre clous +4 » | `Attack.relicBonus` | Relique | + |
| avant l'élan | Critique assuré | `Attack.critForced` | Coup | + |
| avant l'élan | « Critique ×2 » | `Attack.crit`, `critMultiplier` | Coup | + |
| impact | « Luciole +2 » | `Attack.modifiers` d'un statut `spentOnHurt` du défenseur | Compétence ou statut | + |
| impact | « Armure temporaire −6 » | `Attack.shields` (bouclier du défenseur, posé par Peau de pierre) | Compétence ou statut | − |
| impact | « Fausse note −10 » | `Attack.modifiers` (`final`) d'un statut `spentOnHit` de l'attaquant | Compétence ou statut | − |
| réaction | « Vol de vie +5 » | étape `statusReaction` (`drainsHit` de l'attaquant) | Compétence ou statut | + |
| réaction | « Riposte −3 » | étape `statusReaction` (`reflectsHit` du défenseur) | Compétence ou statut | − |
| réaction | « Saignement +2 » | étape `statusReaction` (réaction `hurt` d'un malus du défenseur) | Compétence ou statut | + |
| réaction | Épines acérées | étape `statusReaction` (réaction `hurt` d'un bonus du défenseur) | Compétence ou statut | − |
| étape `relic` | le nom de la relique | étape `relic` | Relique | + chez l'attaquant, − chez le défenseur |

Nouveautés du 2026-10-21 : esquive assurée, bouclier qui absorbe, Fausse note, Luciole ; Riposte et Épines passent en −. Retirés : Pile ou face, Furie des vents (et son « ×2 »), Coup de chance, Rétribution, Crescendo, Soliste.

**Étendre** : un statut est une surcharge par sa mécanique (`isSurcharge`) : critique ou esquive imposés, bouclier, modificateur qui s'use sur le coup (`spentOnHit`, `spentOnHurt`), vol de vie, renvoi, réaction au coup encaissé ; jamais une aura. Un nouveau statut de ces familles a son label, son signe et son son sans rien déclarer. Aucun point d'appel ne choisit une couleur, un signe ni un son.
