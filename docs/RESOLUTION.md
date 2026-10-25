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
    2. Durées « début » de l'actif : −1 tour, expiration à 0, dans une seule étape statusAge (2026-10-21)
    3. Fenêtre « turnStart » (actif)
  Phase 2 · ACTION (actif)
    Contrôle : si l'actif porte un statut de contrôle (skipsAction), il perd son action
    (une charge consommée) → aller en phase 3.
    Chaque jet porte un COUP DE BASE (règles v2, phase 5 bis, décision de l'utilisateur du 2026-10-23) :
    sa valeur est tirée dans l'attaque du personnage (§ 3 bis). Le dé ne fait plus de dégâts : il désigne
    une face, qui déclenche sa compétence, ou rien (face nue). Un JET, pour chaque dé (un pour tous, deux
    pour la barde, plus ceux de Coup de chance) :
      a. le dé est lancé (un rang de dé en mode triche) ; il désigne une face ;
      b. la compétence de cette face déclare sa relation au coup de base (§ 3 bis) :
         - greffe (défaut) : étape roll (le dé), puis la compétence (fenêtre de sa face, compétences
           seules, étape event), puis le coup de base, au dé déjà tiré. Ce que la compétence pose est
           présent au début du coup : il y réagit (Œil de faucon rend ce coup critique, Vol de vie le draine ;
           Coup de chance, greffé depuis la 0.107.0, donne un jet de plus à l'action suivante) ;
         - modifie : le coup de base part ; s'il touche, la compétence se déclenche dans la fenêtre de sa
           face (Pourfendre : Saignement de la moitié des PV que ce coup a retirés, arrondie au-dessus ;
           Pile ou face : la pièce, voir plus bas). Une compétence qui modifie avec `hitMultiplier`
           (Crescendo, Soliste, phase 5 ter) fait « ce coup ×N » : la valeur du coup de base est multipliée
           dès le jet (§ 3, étape 1 bis), puis la compétence part dans la fenêtre de sa face s'il touche,
           sans autre effet. Crescendo (`buildsUp`, 0.107.0) monte : ×2, puis ×1 de plus à chaque fois
           qu'il est parti dans ce combat ;
         - remplace : pas de coup de base. L'étape attack du jet n'a ni valeur, ni esquive, ni critique
           (`Attack.replaced`) ; seules les fenêtres du dé s'ouvrent, et la compétence y donne ses propres
           coups (Furie des vents). Une face qui porte une compétence qui remplace remplace le jet : ses
           autres compétences partent dans cette même fenêtre ;
      c. face nue : le coup de base seul. Une compétence épuisée (`limit` : Soliste et Peur, une fois par
         combat, 0.107.0) ou dont une condition manque laisse sa face nue : ni étape roll, ni
         multiplicateur, ni compétence. Une compétence greffée ou qui remplace lit ses conditions au jet,
         sur l'état de ce moment (0.114.0 : la Curée sans Saignement chez l'adversaire, la Récolte et la
         Virulence sans Poison : le coup part seul) ; l'audit les relit au même moment.
    Pièce (Pile ou face, relation « modifie ») : la compétence pose sa pièce quand le coup touche ; elle
    part aussitôt, juste après les fenêtres de ce coup (étape coin, un rang de dé en mode triche). Pile :
    ce coup ×3 (0.107.0 ; ×2 avant), la pièce inflige encore deux fois les PV qu'il a retirés, en une
    perte, en coup qui compte comme un coup qui touche de ce montant (`headsTouches` : fenêtres « hit »
    du porteur et « hurt » de l'adversaire, sans esquive, armure ni critique) ; face : ce coup reste
    normal. Le statut est consommé. Sur pile, la fenêtre « heads » du lanceur s'ouvre d'abord (phase 8,
    second lot : la Pièce trouée), puis celles du coup qui touche. Dé pipé (phase 8, second lot) : la
    pièce se tire quand même (même suite du hasard), puis une charge de `loadedDie` la fait tomber sur
    pile, et pile vaut ×2 de plus (ce coup ×5) ; la charge part à cette pièce. Une pièce imposée par
    l'observateur (mode triche) garde sa valeur, et la charge reste.
    Coups multiples : si l'actif porte un statut `extraStrikes` non instantané (Coup de chance, Duo), il est
    consommé (étape flurry) et l'action compte plusieurs jets complets, chacun avec son dé, sa compétence
    et son coup de base (0.50.0 : toutes ses charges, un jet par charge, `strikeCharges: 'all'`). Un seul
    de ces statuts part par action : si Coup de chance et le Duo sont posés ensemble, l'un attend l'action
    suivante.
    Coups instantanés (`instantStrikes`, Furie des vents, 0.50.0) : les charges gagnées pendant un jet
    frappent juste après ce jet, avant le jet suivant de la même action (d6 de Coup de chance ou du Duo),
    toutes à la fois : `extraStrikes` coups de base par charge (0.110.0 ; avant, la
    rafale attendait la fin de l'action et une seule charge partait par action), plus son intensité
    (Furie aiguisée, 0.110.0, § 6 : un coup de plus une rafale sur deux au rang II). Ce sont des
    coups bruts (`Attack.plain`, 0.69.0) : chacun lance son dé, dont la face ne déclenche aucune
    compétence, donc aucune Furie en chaîne. Les reliques de face et la dorure, elles, lisent son dé.
    « Juste après ce jet » : après le jet tout entier. La Furie remplace son coup : sa rafale suit le
    jet remplacé. La Curée (0.114.0) se greffe : sa charge est posée avant le coup de base, et sa rafale
    part après lui (étape roll, Curée, coup de base et ses fenêtres, puis la rafale), avant tout autre
    coup.
    Le Duo (la barde, 2026-10-25, décision de l'utilisateur) : un seul d6, comme tout le monde. Sa
    signature, sur le 1, se greffe : +1 Aura mélodieuse, puis une charge de Duo ; le coup de ce 1 part. À
    sa prochaine action, le Duo est consommé comme Coup de chance : une rafale de 1 + charges jets
    complets. Un 1 dans cette rafale pose un nouveau Duo, pour l'action d'après. Jusqu'à la 0.115.1,
    la barde lançait deux dés à chaque action (`twinDice`, une rafale sans statut) : retiré.
    Pour CHAQUE COUP, entièrement résolu avant le suivant :
      ATTAQUE (chaîne de calcul, § 3), puis FENÊTRES DU COUP :
      bloodied (seuil) → la face du dé (naturalOne, naturalTwo, naturalThree, puis face:4…) → naturalMax (actif) :
        statuts et reliques, et seulement les compétences qui modifient (si le coup touche) ou qui
        remplacent (jet remplacé) ; une compétence greffée est déjà partie avec le jet
      coup esquivé : missed (actif) → dodge (défenseur)
      coup touché : hit → crit (actif) → hurt → shieldBroken (défenseur, seulement si ce coup a vidé un de ses
      boucliers : une armure temporaire qui a absorbé tout ce qui lui restait ; phase 8, second lot). Vol de vie
      réagit dans `hit` (actif), Riposte et jauges de Rétribution dans `hurt` (défenseur), à leur rang parmi ses
      statuts (ordre de pose ; une jauge encore vide passe après eux), puis les compétences, puis les reliques
      (2026-10-21). L'Embrasement réagit dans `hit` (actif) si l'adversaire brûle à ce moment : il relâche sa
      Brûlure (3 fois ses PV par tour × ses tours restants, d'un coup, `release` avec `from: 'opponent'`), qui
      s'éteint ; sans Brûlure, sa réaction ne part pas et la charge attend
      coup brut (Furie des vents, `plain`) : ses fenêtres du dé n'éveillent que les reliques (2026-10-23), ni statut ni compétence
      jet remplacé (`replaced`) : ni esquivé ni touché, seules les fenêtres du dé s'ouvrent
  Phase 3 · FIN DE TOUR (actif)
    1. Effets de fin de tour des statuts de l'actif (onTurnEnd) : bonus, puis malus
    2. Durées « fin » de l'actif : −1 tour, expiration à 0 (une seule étape statusAge)
    3. Fenêtre « turnEnd » (actif)

FIN : dès qu'un combattant tombe à 0 PV, quelle qu'en soit la cause. Au-delà de 1 000 tours,
      victoire aux PV.
```

**Principe du « tour du porteur »** : les effets de tour et les durées d'un statut se règlent pendant le tour **de celui qui le porte**, pas pendant celui de celui qui l'a posé. Un poison posé par Ervald agit au début des tours de sa victime.

**Pas de décompte le tour de la pose** (0.25.0) : un statut posé ou renouvelé pendant un tour n'est pas décompté à la fin de ce même tour. Un statut d'« 1 tour » décompté en fin de tour (`expiresAt: 'turnEnd'`), posé pendant l'action du porteur, dure donc jusqu'à la fin de son **prochain** tour : c'est « pour le tour d'après » (Furie des vents). Un statut décompté au début (défaut) et posé pendant l'action dure jusqu'au début du prochain tour du porteur, donc pendant tout le tour de l'adversaire (Esquive améliorée, Épines).

### Mise en scène d'une résolution

À l'écran, chaque résolution doit être **lisible comme un moment** : le joueur voit la cause et sa conséquence ensemble, dans l'ordre du moteur. La mise en scène (`stage`, `staging.ts`) regroupe les étapes par leur `cause`, jamais d'après l'étape voisine ([MOTEUR_V2.md](MOTEUR_V2.md) § 4). Une exception d'affichage, sans rien changer à l'ordre du moteur (0.111.0) : une relique du dé (Osselet fendu, Dé creux), que le moteur déclenche dans la fenêtre de sa face, après le coup, est montrée avec le dé posé, avant le coup ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) M40).

- **Une valeur qui change se voit changer** : le nombre de l'état rebondit au moment de la résolution, avec sa variation (−1, +2).
- **Cause et conséquence ensemble** : l'effet d'un statut (le « −2 » d'une brûlure) et l'usure qui suit dans la même phase (étape `statusAge` : décompte 3 → 2 et extinction) sont montrés au même instant ; l'étape `statusAge` a pour cause l'effet du statut qu'elle use (`statusTick`). Un statut qui s'estompe (le poison) perd sa charge dans l'étape même de son effet : le « −3 » et le compteur qui passe à 2 tombent ensemble. L'étape du moteur reste distincte ; seul l'affichage les réunit.
- **Rien ne disparaît sans avoir montré son 0** : un état épuisé ou expiré affiche d'abord son 0, puis quitte la zone d'état (`StatusTray`).
- **Une réaction au coup tombe avec son impact** (0.68.1) : la plaie qui coule (Saignement) est jouée sur la frappe qui la fait couler. Son label de surcharge (« Saignement +2 », § 11) tombe sous le dé au moment de l'impact, comme « Critique ×2 », puis ses PV perdus et son compteur qui baisse suivent d'un battement (`flowOf`, `bleedOut`, `staging.ts`). De même, le statut que le coup pose sur sa cible (poison de l'Aura de décoction, Saignement de Pourfendre) tombe à son impact (`ridesOf`, `landRide`). Les étapes du moteur restent distinctes ; elles ont le coup pour cause, si bien qu'une autre étape intercalée (Riposte) ne les sépare plus de lui (moteur v2).
- Ces règles valent pour toute résolution à venir : un nouveau type d'étape doit dire, dans `stage` (`staging.ts`), avec quoi il est montré.

**Ce que le moteur dit de chaque étape** (moteur v2, [MOTEUR_V2.md](MOTEUR_V2.md) § 3) : chaque étape (`Beat`) porte son rang (`id`), la phase du tour où elle a lieu (`phase` : `shift`, `turnStart`, `action`, `turnEnd` ; l'ouverture compte comme `turnStart`), le maître du tour (`owner`) et, sauf pour une étape racine (jet de l'action, effet de phase, rafale), sa **cause** (`cause`, le rang de l'étape qui l'a provoquée). Une réaction au coup, une compétence de son dé qui modifie ou remplace le coup, une relique sur un moment du coup ont le coup pour cause, même si une autre étape (Riposte) s'intercale ; un jet dont la face porte une compétence qui se greffe commence par une étape `roll` (le dé), cause de la compétence et du coup de base ; les fenêtres ouvertes par une pièce qui touche ont la pièce pour cause ; les jets d'une rafale (Coup de chance, le Duo de la barde) ont la rafale pour cause, par leur coup ou leur étape `roll` ; une pièce et des coups instantanés ont l'étape qui a posé leur statut ; un seuil franchi a l'étape qui l'a fait franchir ; un décompte ou une expiration, l'effet de tour de son statut quand il en a un. L'écran regroupe par cause, jamais par voisinage. `audit.ts` vérifie ces liens.

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

Les étapes sont toujours dans cet ordre. Les tirages (dé, valeur du coup de base, esquive, critique) sont faits dans cet ordre fixe, ce qui rend les combats reproductibles. Un jet greffé tire son dé avant sa compétence, puis la valeur du coup après elle.

| # | Étape | Règle | Peut être modifiée par |
| --- | --- | --- | --- |
| 1 | **Dé** | Jet du d6 de l'attaquant (`DIE_FACES`). **Le jet désigne une face** (« sur un 4 » : la face 4) : c'est elle que lisent les compétences, les reliques de face, la dorure et le jet maximal. Le dé ne fait aucun dégât. Une face dont la compétence **remplace** le coup arrête la chaîne ici : jet remplacé (`Attack.replaced`), ni valeur, ni esquive, ni critique, ni dégâts, aucune fenêtre `hit`, `hurt`, `missed` ou `dodge` ; les fenêtres du dé s'ouvrent normalement | compétence qui remplace (§ 3 bis) |
| 1 bis | **Coup de base** (règles v2, phase 5 bis) | Sa valeur est tirée dans l'**attaque** de l'attaquant, de `attackMin` à `attackMax` (stats effectives : reliques de caractéristique et Tremper l'arme comprises) ; aucun tirage si la fourchette n'a qu'une valeur. Une compétence de sa face qui le modifie avec `hitMultiplier` (Crescendo, Soliste : « coup de base ×N », phase 5 ter ; « ce coup ×N » jusqu'à la 0.109.1, qui se confondait avec la pile de Pile ou face, ×3 sur tout le coup) la multiplie (`Attack.multiplier`). Un type d'attaque unique (2026-10-24) : le coup de base n'a ni type ni source (DP ou DM, `attackKind` et `attackSource`, de la phase 5 bis à la 0.110.1, sans effet sur la règle : retirés) | `hitMultiplier`, reliques de caractéristique, forge |
| 2 | **Esquive** | Imposée par un statut du défenseur (`forcesDodge`, sans tirage, une charge consommée), sinon le défenseur tire contre sa chance d'esquive. Une esquive annule tout le coup (remplacement). | `forcesDodge` (Esquive améliorée), `modifyStats` (esquive) |
| 2 bis | **Bonus de relique** (0.75.0) | Sur un coup qui touche, les reliques de coup de l'attaquant ajoutent leur bonus à la valeur du coup de base, avant le critique ; un bonus de face (`onFace`, 0.77.0) ne vaut que si le dé de ce coup fait cette face : un coup de base de 6 sur la face 4, avec le Fer à quatre clous, vaut 10, puis 20 en critique ×2. Coup brut de Furie compris (2026-10-23). Un bonus à conditions (`when`, 2026-10-24 : Fiole de venin, Croc de boucher) ne vaut que si elles tiennent à ce coup, sur l'état du début du coup (« aux adversaires empoisonnés » : au moins 1 Poison), coup de base comme coups bruts de la Furie (test de `combat.test.ts`). Aucun tirage. | `Relic.rollBonus`, `Relic.onFace`, `Relic.when` ([RELIQUES.md](RELIQUES.md)) |
| 2 ter | **Face dorée** (0.88.0, forge du dé) | Sur un coup qui touche, si le dé de ce coup fait une face dorée de l'attaquant, +2 à la valeur du coup, après les reliques et avant le critique. Même règle qu'une relique de face : coup brut compris (2026-10-23), chaque dé d'une rafale se lit seul. Aucun tirage. | `Character.gilded`, `Attack.gild` ([CAMPAGNE.md](CAMPAGNE.md) § 4) |
| 3 | **Critique** | Forcé par un statut (`forcesCrit`, sans tirage), sinon tirage contre sa chance de critique. La valeur du coup (coup de base, ×N, reliques de coup et dorure comprises) est multipliée, puis arrondie. | `forcesCrit`, `modifyStats` |
| 4 | **Dégâts sortants** | Statuts de l'attaquant, dans l'ordre de pose | `modifyOutgoing` (Affaibli ; Ferveur, +1 par charge au prochain coup qui touche, 2026-10-24) |
| 5 | **Dégâts entrants** | Statuts du défenseur, dans l'ordre de pose | `modifyIncoming` (Vulnérable) |
| 6 | **Plancher** | Le coup vaut au moins 1 | — |
| 7 | **Armure** | Armure effective retirée, au moins 1 dégât | `modifyStats` (armure, ex. Brèche) |
| 8 | **Boucliers** | Chaque bouclier absorbe ce qu'il peut sans descendre sous 1, et s'use d'autant (prévention) | `shield` |
| 8 bis | **Dégâts finaux** | Statuts de l'attaquant, après tout le reste : leurs écarts s'additionnent, puis un seul plancher de 1 (0.110.0 ; avant, un plancher après chacun faisait dépendre le résultat de l'ordre de pose : un coup de 3 avec Fausse note et Aura mélodieuse faisait 1 ou 2, il fait 1). Ni l'armure ni l'intimidation ne les rognent | `modifyFinal` (Aura mélodieuse, Fausse note) |
| 9 | **Application** | PV retirés, sans descendre sous 0. Les dégâts du coup sont comptés en entier, excès du coup fatal compris (overkill, depuis la 0.34.0) | — |
| 9 bis | **Usure au coup** | Chaque statut `spentOnHurt` du défenseur touché perd une charge (Luciole), juste après l'application ; un statut `spentOnHit` de l'attaquant qui touche disparaît (Fausse note, Ferveur) | `spentOnHurt`, `spentOnHit` |
| 10 | **Vol de vie (esquive)** | Un coup esquivé consomme une charge de Vol de vie (`drainsHit`) sans soin, au moment du coup. Sur un coup qui touche, le Vol de vie n'est pas une étape de la chaîne : c'est une réaction de la fenêtre `hit` (§ 5, règle 9), qui rend les PV retirés (plafonnés aux PV max) et use une charge. Un jet remplacé ne porte pas de coup : la charge reste. | `drainsHit` (Vol de vie) |

Les charges consommées par le coup (critique assuré, bouclier) sont retirées juste après.

### 3 bis. L'attaque et les trois relations (règles v2, phase 5 bis, décisions de l'utilisateur du 2026-10-23)

**L'attaque** est une stat de la feuille : une petite fourchette (`attackMin` à `attackMax`, écart de 2 au plus), d'un **type unique** pour l'instant (retour de l'utilisateur du 2026-10-24 : « dans la fiche des persos, la distinction DM/DP ajoute une couche de confusion ; l'attaque doit pour le moment être une valeur d'un type unique »). Chaque coup de base tire sa valeur dans la fourchette par le `Rng`, après le dé. Les reliques de caractéristique et l'opération de forge « Tremper l'arme » l'écrivent à plat (+1 au minimum et au maximum). À l'écran, son chiffre est blanc pour tous (le « coup blanc », [MISE_EN_SCENE.md](MISE_EN_SCENE.md) M37). De la phase 5 bis à la 0.110.1, l'attaque avait un type, DP (dégâts physiques) ou DM (dégâts magiques : Ysolde, le druide sous forme humaine), et un coup magique nommait sa source (la Lumière, la Foudre) : une étiquette qu'aucune règle ne lisait, retirée du moteur (`attackKind`, `attackSource`, `Attack.source`) comme de l'écran.

**Les trois relations** d'une compétence du dé au coup de base (`CharacterEvent.relation`) :

| Relation | Ce qui se passe | Compétences |
| --- | --- | --- |
| **Greffe** (défaut) | Au jet : la compétence se résout, puis le coup de base part. Ce qu'elle pose est présent au début du coup et y réagit (règle 9) | toutes, sauf les suivantes ; Coup de chance depuis la 0.107.0 |
| **Modifie** | Le coup de base part ; s'il touche, la compétence se déclenche dans la fenêtre de sa face, ou change la valeur de ce coup | Pourfendre (Saignement de la moitié des PV que ce coup a retirés, arrondie au-dessus, dès le coup suivant ; 2 avant la 0.107.0) ; Pile ou face (pile : ce coup ×3) ; Soliste (ce coup ×3, une fois par combat) et Crescendo (×2, puis ×1 de plus à chaque fois), dès le jet |
| **Remplace** | Pas de coup de base : la compétence fournit ses propres coups | Furie des vents (deux coups de base bruts, chacun son dé) |

**Coup de chance garde son identité** (un dé de plus), au plus simple : depuis la 0.107.0, il se greffe, le coup du jet qui le déclenche part ; à sa prochaine action, le porteur lance un jet complet de plus par charge (sa face déclenche sa compétence, puis son coup de base). Aucune règle nouvelle : c'est la greffe, puis l'action à plusieurs jets. De la 0.106.0 à la 0.106.1, il remplaçait le coup : il en faisait perdre un pour en gagner un plus tard (+3 points gravé, Morgrut y perdait).

**Une compétence épuisée laisse sa face nue** (0.107.0, Soliste et Peur, `limit: 1`) : ni étape roll, ni multiplicateur, ni compétence, le coup de base seul. Une compétence qui modifie son coup ne compte un déclenchement que s'il touche : un solo esquivé reste à jouer. **Une compétence qui pose compte son déclenchement même quand la pose est refusée** (décision de l'utilisateur du 2026-10-24, E4 : « c'est le principe de ce genre de jeu ») : une Peur bloquée par une immunité, d'une relique ou d'une compétence, a usé sa fois par combat ; le 1 suivant est une face nue.

**La barde** : depuis le Duo (2026-10-25), un seul d6 ; dans la rafale du Duo, chaque jet est complet, la compétence de sa face y a la même relation au coup que sur tout dé. De la phase 5 ter à la 0.115.1, elle lançait deux dés à chaque action, deux jets complets. Avant la phase 5 ter, ses compétences étaient sur ses doubles (`doubleOne` à `doubleFive`, `double:6` pour un dé forgé) : un double se greffait sur les deux coups de base, ou les remplaçait par un seul coup ×N (Crescendo, Soliste, `relation: 'replace'`) ; graver une compétence qui modifie sur un double en faisait une greffe. Ces déclencheurs, la règle « remplace les deux coups », l'étape `pair` et les deux dés (`twinDice`) sont retirés.

Avant la 0.106.0, une compétence du dé sacrifiait son coup (`forfeitsHit`), sauf Pourfendre (`needsTouch`) ; le coup transformé (`reshapesHit`) n'avait plus de porteur ; chaque face frappait pour une valeur imprimée (0.105.0). Ces trois règles et les valeurs imprimées sont retirées.

### Le vocabulaire des textes porte la résolution (2026-10-23)

Demande de l'utilisateur : une relique ou une opération de forge se dit en une ligne, et cette ligne suffit à savoir quand elle agit et où elle s'insère dans la chaîne. Si on ne sait pas dire quand elle se déclenche, c'est la règle qui est ambiguë : on la corrige, on ne l'explique pas. Les mots ont donc un sens fixe :

| Mot | Sens dans la chaîne | Exemples |
| --- | --- | --- |
| **frappe**, **coup de base** | la valeur du coup de base (étapes 1 bis à 2 ter) : un bonus « au coup de base » ou « +N dégâts » d'une relique est multiplié par le critique | Dorer : « +2 au coup de base » ; Fer à quatre clous : « +4 dégâts sur un 4 » ; Tremper l'arme : « +1 à l'attaque » |
| **dégâts directs** | pas un coup : ni esquive, ni critique, ni armure | Osselet fendu : « 3 dégâts directs sur un 1 » |
| **dégâts temporaires** (DT) | les dégâts d'un statut qui ronge tour après tour (Poison, Saignement, Brûlure, Pourriture) ; ce que sont les dégâts dans l'histoire, pas leur mécanique (`damage.ts`, famille `temporal`). Un effet de dégâts déclare sa source, qui donne la teinte de son chiffre à l'écran ([MISE_EN_SCENE.md](MISE_EN_SCENE.md) M37) ; le compendium le dit dans sa règle « Couleurs des dégâts ». Plus de dégâts physiques ni magiques (DP, DM) depuis le 2026-10-24 : un coup est un coup | Poison, Saignement, Brûlure : DT ; Pile ou face, Riposte, Rétribution : des coups, en blanc |
| **sur un 4**, **sur un 6** | la face du dé, quel que soit le coup : qu'il touche ou non, remplacé ou brut (« sur un 6 » : le jet maximal du d6, 0.110.0 ; « sur un jet maximal » avant) | Osselet fendu, Dé creux |
| **au 4e tour**, **tous les 3 tours** | au début de son tour, après ses statuts de début de tour, avant son action | Braise captive, Chapelet de l'ermite |
| **quand ses PV passent sous 40 %** | au passage sous le seuil (règle 5 de [RELIQUES.md](RELIQUES.md) § 3) | Dent de loup |
| **aux adversaires empoisonnés**, **aux adversaires qui saignent**, **aux adversaires qui brûlent** | une condition lue au coup qui touche, sur l'état du début du coup, avant le critique (2026-10-24) ; au moins une charge ; coups bruts de la Furie compris | Fiole de venin, Croc de boucher, Soufflet de forge |
| **à chaque soin reçu** | après l'étape qui lui a rendu des PV, une fois par étape (§ 5, règle 6) | Encens de l'abbaye |
| **lors d'un coup reçu**, **lors d'un coup reçu de 6 dégâts ou plus** | dans les fenêtres d'un coup qui le touche ; « de 6 dégâts ou plus » : les PV que ce coup a retirés, après l'armure et les boucliers (0.110.0) | Géode fendue, Écu cabossé |
| **quand son armure temporaire est vidée** | dans les fenêtres du coup qui le touche et vide un de ses boucliers, après `hurt` (phase 8, second lot) ; un bouclier regonflé dans la même fenêtre (Écu cabossé) ne l'efface pas | Clous de pavois, Rempart hérissé |
| **quand il renvoie des dégâts** | après l'étape qui renvoie (sa Riposte, sa Rétribution relâchée), une fois par étape, comme le soin reçu (§ 5, règle 6) ; jamais sur un renvoi nul | Gantelet du talion, Vindicte |
| **sur pile** | quand sa pièce tombe sur pile, avant les fenêtres de pile qui touche | Pièce trouée |
| **+2 vol de vie** | pose 2 charges du statut sur le porteur ; le statut a sa propre règle | Dent de loup, Collier de ronces |
| **2x**, **recharge 3 tours** | sa limite, une seule par relique (2026-10-24) : deux déclenchements par combat, ou trois de ses tours avant de repartir | Géode fendue, Dé creux |

Une exception se dit là où elle naît, pas sur chaque objet qu'elle touche : la Furie des vents dit que ses coups ne déclenchent aucune compétence.

---

## 4. Les types d'effets

Tout effet du jeu appartient à l'une de ces familles. Chacune a son moment de résolution.

| Famille | Quand | Exemples | Mise en œuvre |
| --- | --- | --- | --- |
| **Instantané** | Au moment où l'événement se déclenche | soin, dégâts directs (Foudre du druide, 0.73.0 ; en 0.76.0, 3 coups de 2 : `hits` d'un effet `damage`, comptés ensemble dans la même étape, détail dans `parts`, jamais critiques, sans armure, esquive ni bouclier), pose d'un statut, purge (avec un effet de repli s'il n'y a rien à retirer : `orElse`, 0.42.0) ; une pose peut tirer ses charges du coup de ce jet (`fromHit`, Pourfendre) ou d'un statut, lu à cet instant (`fromStatus`, 0.114.0 : la Virulence ajoute deux fois le Poison que porte l'adversaire, son Poison triplé) | `Effect` (`heal`, `damage`, `applyStatus`, `cleanse`) |
| **Continu** | Tant que le statut est présent, à chaque calcul | Brèche (armure), Affaibli, Vulnérable, Aura d'immunité (armure +1) | `modifyStats`, `modifyOutgoing`, `modifyIncoming`, `modifyFinal` |
| **Périodique** | Au début ou à la fin des tours du porteur | Poison, Régénération (début), Brûlure (fin) | `onTurnStart`, `onTurnEnd` |
| **Qui s'estompe** | Perd une charge chaque fois qu'il agit, au même instant que son effet ; disparaît à 0 (étape `statusAge` de la phase, ou dans l'étape même de la réaction). Pas de durée en tours (refusée par `validateRoster`) | Poison (0.36.4) : 3, 2, 1 par tour ; Saignement (0.68.0) : 2, 1 par coup reçu | `decays` (sur `onTurnStart`, `onTurnEnd` ou une réaction) |
| **Déclenché** | À un moment précis du combat, dans une fenêtre | événements des personnages ; Épines acérées et Saignement quand le porteur encaisse ; Pourfendre, sur un 1, seulement si son coup touche (relation « modifie », § 3 bis) ; Rancune quand son porteur encaisse (un Critique assuré, 0.114.0) ; Sentence quand son porteur regagne des PV (une perte pour l'adversaire, 0.114.0) ; phase 8, second lot : Rempart hérissé quand son armure temporaire est vidée (`shieldBroken`, des Épines acérées), Vindicte quand il renvoie des dégâts (`reflected`, de la Ferveur), Pièce trouée sur pile (`heads`) | `CharacterEvent` ; `reactions` d'un statut |
| **Remplacement** | À la place d'un événement, avant qu'il arrive | esquive (le coup n'a pas lieu), esquive imposée, jet remplacé par sa compétence (Furie des vents), bouclier (une partie n'arrive pas), garde et immunité (le statut n'est pas posé), critique assuré | étapes 1, 2, 3 et 8 ; `relation: 'replace'`, `forcesDodge`, `wards`, `immunities` |
| **Sur le coup** | Dans les fenêtres d'un coup qui touche (ou d'une pile qui touche) : `hit` de l'attaquant, `hurt` du défenseur | Vol de vie (`hit`), Riposte et jauges de Rétribution (`hurt`), Embrasement (`hit`, phase 8 : il relâche d'un coup la Brûlure de l'adversaire, `release` avec `from: 'opponent'` et `StatusDef.releases` ; sans Brûlure, il attend) | `drainsHit`, `reflectsHit`, `fillsOnHurt`, `reactions` |
| **Contrôle** | À la place de l'action du porteur | Étourdi | `skipsAction` |
| **Action multiple** | Pendant l'action du porteur | Furie des vents (deux coups de base bruts, après son jet remplacé), Curée (deux coups de base bruts, après le coup de base de son jet, 0.114.0), Coup de chance et Duo (un jet complet de plus par charge, à la prochaine action) | `extraStrikes`, `instantStrikes` |
| **Aura** (permanente) | Pour le reste du combat, sans durée | Aura de puissance (sortant, non cumulable), d'intimidation (entrant), de précision et sauvage (stats : critique ; attaque), glaciale (périodique : pose du Poison sur l'adversaire, 0.69.0) | crochets existants, statut sans `turns` |
| **Mécanisme de compétence** (2026-10-21) | Statut qui porte la règle d'une compétence ou d'une forme (`StatusDef.mechanic` : `skill` pour les jauges de Rétribution, Pile ou face, Furie des vents, la Curée, l'Embrasement et le Dé pipé (phase 8) ; `form` pour Incantation et Force de l'ours, posés tant que le personnage garde la forme). Jamais purgé, jamais bloqué (immunité, garde, opposition), jamais compté comme bonus ou malus dans les statistiques ; le compendium le présente comme une mécanique de sa compétence | Rétribution, Furie des vents, Incantation, Dé pipé (`loadsCoin` : sa prochaine pièce tombe sur pile) | `StatusDef.mechanic`, `isMechanic`, `CharacterForm.statuses` |

---

## 5. Règles d'ordre

1. **Actif d'abord** : dans toute fenêtre qui concerne les deux camps, l'actif résout avant le défenseur (ordre fixe des fenêtres du coup, § 2).
2. **Dans une fenêtre, pour un camp** : d'abord les **réactions de ses statuts** (dans l'ordre où ils ont été posés), puis les **événements de son personnage** (dans l'ordre de leur définition), puis **ses reliques** (dans l'ordre d'obtention, 0.75.0) : une relique répond, elle n'initie pas.
3. **Effets périodiques** : d'abord les **bonus**, puis les **malus**, chacun dans l'ordre de pose. Une régénération soigne donc avant que le poison ne frappe.
4. **Effets d'un même événement** : dans l'ordre où ils sont écrits.
5. **Vérification d'état** : après chaque effet, si un combattant est à 0 PV, le combat s'arrête aussitôt. Les effets suivants ne se résolvent pas.
6. **Pas de chaîne** : les effets produits par une réaction ou un événement ne déclenchent pas d'autre réaction (la plaie qui coule ne déclenche pas `hurt`, les dégâts de Riposte non plus). Seules exceptions : les **seuils de PV**, qui sont des états et peuvent se déclencher après n'importe quelle perte de PV : `bloodied`, puis les reliques de seuil (0.75.0, `checkThresholds` ; sur ses PV ou, 0.77.0, sur ceux de l'adversaire). Une relique de seuil ne repart qu'après être remontée au-dessus de son seuil (tout soin la réarme aussitôt, `rearmThresholds`) : cette règle exclut toute boucle infinie. Le passage se lit sur les PV de l'étape vérifiée : quand une même perte fait passer plusieurs seuils, chaque relique concernée part, même si une relique partie avant elle soigne (0.85.0 : Larme de givre puis Trophée du chasseur adverse). **Tous les seuils franchis par une même étape sont marqués avant qu'aucun ne parte, et tous ont cette étape pour cause** ; ils partent l'actif d'abord (règle 1), puis le défenseur, chaque camp dans l'ordre d'obtention (0.110.0 ; avant, le camp de gauche passait toujours d'abord, et chaque relique avait la précédente pour cause). Seul un seuil franchi par l'effet d'une relique (un soin, des dégâts) a cette relique pour cause. Depuis le 2026-10-21, les trois reliques de seuil du registre sont à une charge (Dent de loup comprise) : le réarmement ne sert plus qu'à une future relique de seuil à recharge, et l'audit refuse une relique de seuil sans charge ni recharge. **Une relique dont l'effet serait nul ne part pas et ne s'use pas** (0.110.0) : une Dent de loup qui ne poserait rien (Vol de vie déjà à son plafond) attend, et part à la première vérification d'état où elle ajoute quelque chose, tant que son porteur reste sous le seuil.
   **Le soin reçu** (`healed`, 2026-10-24, lot des consommateurs de [PROGRESSION.md](PROGRESSION.md) § 13.3) est une exception de la même famille : un état constaté à la vérification d'état. Chaque étape qui rend des PV à un combattant (soin d'une compétence ou d'une aura, Vol de vie, repli de soin d'une purge, relique qui soigne ; jamais un soin nul, PV déjà pleins) ouvre **une** fois sa fenêtre `healed`, au début de la vérification qui suit cette étape, avant `bloodied` et les reliques de seuil ; cette étape en est la cause. Seule une relique y répond aujourd'hui (l'Encens de l'abbaye) ; ce qu'elle pose suit la règle 9 (l'Élan gagné pendant un coup sert le coup suivant). Un soin rendu dans cette fenêtre la rouvrirait avec sa propre étape pour cause, comme un seuil.
   **Les dégâts renvoyés** (`reflected`, phase 8, second lot) suivent la même règle : chaque étape où un combattant renvoie des dégâts (une Riposte qui rend une part du coup, une Rétribution qui relâche ses jauges sur l'adversaire ; jamais un renvoi nul) ouvre **une** fois sa fenêtre `reflected`, dans la vérification qui suit cette étape, après `healed` et avant `bloodied` ; cette étape en est la cause. Ce qu'on y gagne ne la rouvre pas (la Vindicte pose de la Ferveur, le Gantelet du talion soigne).
7. **Un statut retiré ne résout plus rien** : un statut annulé ou consommé pendant une fenêtre n'agit plus dans cette fenêtre.
8. **Pas de hasard caché** : une condition fausse ou un mécanisme non utilisé ne consomme aucun tirage. Une relique ne tire jamais : sans déclenchement, un combat avec elle est identique au combat sans elle (test de `combat.test.ts`).
9. **Un statut posé ou renforcé pendant un coup ne réagit pas à ce coup ; il agit dès le coup suivant** (règle du jeu, décision de l'utilisateur du 2026-10-21 ; remplace la règle de la 0.84.0, « une fenêtre réagit à ce qui est là quand elle s'ouvre »). Chaque coup a un **état de référence** : les statuts des deux camps au début du coup, avant son dé (`strikeBase`, `combat.ts`). Toutes les fenêtres de ce coup s'y rapportent : seuils qu'il fait franchir, faces de son dé (`naturalOne`…), `missed` et `dodge`, `hit`, `crit` et `hurt`. Seul un statut présent au début du coup y réagit, et avec au plus ses charges de ce moment : les charges ajoutées pendant le coup attendent le suivant, mais une charge consommée pendant le coup manque bien (il ne réagit jamais avec plus qu'il n'a). Le coup suivant, c'est aussi le coup suivant de la même action : deuxième coup d'une rafale (Furie des vents), second dé de la barde, d6 de Coup de chance. Une pièce qui tombe sur pile est un coup à part entière : son état de référence est celui du moment où elle part (ce que le coup qui la lance a posé y réagit, ce que la pièce pose attend le coup suivant). Exemples : la plaie que Pourfendre ouvre ne coule pas sur ce coup, elle coule au prochain coup qui touche le porteur ; une plaie de 2 grossie de 2 par un coup coule de 2 sur ce coup, puis il en reste 3 ; les Épines que le Collier de ronces pose quand le porteur passe sous la moitié de ses PV ne répondent pas au coup qui a fait passer le seuil, elles répondent dès le coup suivant. Vol de vie, Riposte et jauges de Rétribution sont des réactions comme les autres : un Vol de vie ou une Riposte posés pendant un coup attendent le suivant ; une jauge, elle, ne réagit pas : elle se remplit à chaque coup qui touche le porteur (pile comprise). Les compétences et les reliques ne sont pas des statuts : elles partent dans leur fenêtre. `audit.ts` vérifie la règle (« un statut posé pendant un coup réagit à ce coup »).

---

## 6. Poser un statut : application et opposition

Quand un effet pose un statut, quatre règles s'appliquent **dans cet ordre** :

1. **Immunité** : si le personnage est immunisé contre ce statut (`immunities`), il n'est pas posé. Rien n'est consommé.
2. **Garde** : si le porteur a un statut de garde qui couvre ce statut (`wards` : une polarité ou une liste), la pose est bloquée et la garde perd une charge.
3. **Opposition** : si le porteur a le statut **opposé** (`opposes`, toujours réciproque), les charges s'annulent une à une. Si le nouveau statut a plus de charges, le reste est posé ; sinon, il est entièrement neutralisé.
4. **Cumul et plafond** : ce qui reste est posé selon le cumul (`add` ou `refresh`) et le plafond (`maxStacks`).

Le résultat est enregistré dans la chronologie (`result` : posé, neutralisé ou bloqué). Le journal, les badges et les statistiques le reflètent : par exemple « Résisté », « Neutralisé », ou « La Garde sacrée protège X du Poison ». Un malus bloqué ou neutralisé ne compte pas comme « malus reçu ».

**Intensité** (0.110.0, aiguiser : [SORTS.md](SORTS.md) § 20). Un rang d'aiguisage ajoute à une compétence ce que dit son axe de rang : des charges, un montant, un coup ×N, une fois par combat, une part, ou une **intensité** (`Status.power`) que le statut posé lit lui-même (Furie : un coup de plus par rafale ; Aura de puissance : +1 à chaque coup ; Vol de vie, Riposte : quelques PV de plus par coup ; Pile ou face : pile ×1 de plus). Au cumul, l'intensité ne s'additionne pas : la plus forte reste ; un remplacement prend la sienne. Chaque rang ajoute une **quantité entière**, à chaque fois (0.111.0, retour de l'utilisateur : plus de demi-rang ni de chiffre à virgule ; le demi-rang de la 0.110.0, payé une fois sur deux, est retiré).

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
| Saignement posé par le coup qui touche | Une plaie ouverte pendant un coup (`naturalOne`, `hit`, `crit`) ne coule pas sur ce coup : elle coule dès le coup suivant qui touche le porteur (règle 9). Une plaie de 2 grossie de 2 par le coup coule de 2 (ses charges du début du coup), puis passe à 3. |
| Saignement contre esquive, Peur ou jet remplacé | Aucun coup ne touche : la plaie ne coule pas et ne perd rien. Elle attend le prochain coup qui touche, sans limite de durée. |
| Pourfendre (Gorak) : le 1 touche, ou est esquivé | Relation « modifie » : le 1 porte son coup de base (critique, Aura de puissance, intimidation, épines, riposte). S'il touche, la fenêtre du 1 (`naturalOne`, avant `hit` et `hurt`) pose un Saignement de la moitié des PV que ce coup a retirés, arrondie au-dessus (0.107.0, `fromHit` ; 2 avant) : un coup de 7 pose Saignement 4, qui ne coule pas sur ce coup ; la plaie coule dès le coup suivant qui touche l'adversaire (4 PV, puis 3, 2, 1 ; règle 9). S'il est esquivé, rien n'est posé : un coup doit toucher pour poser un malus physique (vérifié avant tout tirage). |
| Œil de faucon (Elaria) : le 1 | Greffe : Critique assuré est posé au jet, avant le coup de base du 1 ; présent au début du coup, il le rend critique (et s'use). |
| Furie des vents contre Saignement (2) | Le premier coup de la rafale fait couler 2, le deuxième 1 : la plaie est vidée dans la même action. |
| Furie des vents contre Esquive améliorée | Le premier coup est esquivé à coup sûr et consomme une charge ; le second est résolu normalement (tirage d'esquive) s'il n'en reste plus, sinon esquivé à coup sûr lui aussi (cumulable depuis le 2026-10-21). |
| Esquive améliorée posée deux fois (2026-10-21) | Les charges s'additionnent : deux charges, deux coups reçus esquivés à coup sûr, une charge par esquive. |
| Furie des vents : un 1, un 2 ou un 3 pendant les deux coups | Coups bruts (0.69.0) : deux coups de base, sans compétence ; aucune Furie ne se relance. Les reliques de face et la dorure lisent leur dé : le Fer à quatre clous renforce un 4 de Furie, l'Osselet fendu part sur un 1 de Furie. |
| Vol de vie (Ervald) : le 1 | Greffe : 1 charge posée au jet (2 au plus ; 2 par jet avant la 0.107.0) ; le coup de base du 1 l'use déjà s'il est porté (il touche : soin ; esquivé : la charge est perdue). |
| Vol de vie : coup esquivé | La charge est consommée sans soin : le coup a été porté, mais il n'a rien retiré. |
| Vol de vie contre Épines acérées | Le mort-vivant touche le nain : il regagne d'abord les PV retirés (sa fenêtre `hit`), puis la fenêtre `hurt` du nain pose le Saignement sur lui. |
| Jet remplacé (Furie des vents) contre Esquive améliorée, Épines acérées ou Saignement | Le jet lui-même ne porte pas de coup : il ne consomme ni l'esquive imposée, ni les épines, ni la plaie ; les deux coups de la Furie, eux, sont des coups. |
| Aura glaciale (2) au début du tour du mort-vivant | Phase 1, effets de début de tour du **porteur** (bonus) : 2 charges de Poison posées sur l'adversaire, avant le coup (0.69.0). Ce Poison agit au début du tour suivant de la victime et perd une charge à chaque fois : il grossit d'1 par tour. Immunisée, la victime ne reçoit rien. |
| Aura sauvage (2 charges) sur une attaque de 3 à 4 | Elle écrit la feuille (0.107.0) : l'attaque devient 5 à 6, avant le critique ; un critique ×2 d'un 6 fait 12. L'Aura de puissance, elle, ajoute +2 après le critique (12 + 2), et ne se cumule pas. |
| Aura de puissance contre Aura d'intimidation (2 charges) | Sortant puis entrant : un 6 devient 6 + 2 − 2 = 6 (−1 par charge depuis la 0.107.0). Un 1 contre l'intimidation seule : 1 − 2 = −1, plancher à 1. |
| Riposte et Vol de vie, Épines acérées | Le coup touche le paladin : l'attaquant vole d'abord sa vie (fenêtre `hit`), puis, dans le `hurt` du paladin, ses statuts réagissent dans l'ordre de pose (Riposte, jauges, épines, saignement). Les dégâts de riposte ne remplissent pas les jauges de rétribution : ce ne sont pas des coups. |
| Rétribution : jauges | Chaque coup qui touche le paladin, et chaque pile qui touche, range ses PV retirés dans une jauge (3 au plus, la plus ancienne cède sa place). Ni les dégâts directs (poison, saignement, riposte) ni les coups esquivés ne comptent. Sur un 1 : dégâts directs égaux à la moitié de la somme, arrondie au-dessous, au moins 1 (0.107.0, `release.share` ; la somme avant). Les jauges sont un mécanisme : aucune purge ne les retire. |
| Aura d'immunité | Posée sur un 3 : les malus du paladin sont d'abord purgés, puis toute pose de malus est bloquée (« protégé par Aura d'immunité »), sans usure. Une Purification adverse peut retirer l'aura. |
| Peur contre Furie des vents ou Pile ou face | La peur fait perdre l'action entière. La Furie, instantanée depuis la 0.50.0, ne peut pas se faire voler son action : elle frappe dans celle où elle est posée. La pièce non plus depuis le 2026-10-21 : elle part juste après le coup qui la pose. |
| Purification contre une aura cumulée | Le dernier bonus posé part avec toutes ses charges : une Aura glaciale à 3 charges disparaît d'un coup. Un Vol de vie en attente peut aussi être purifié ; une Furie ou les jauges de Rétribution, mécanismes de compétence, jamais. |
| Coup de chance : le jet qui le pose, puis l'action suivante | Greffe (0.107.0 ; il remplaçait le coup avant) : le coup du 1 part. À sa prochaine action, la voleuse lance un jet complet de plus par charge : chaque face déclenche sa compétence (un nouveau Coup de chance se garde pour la suivante), puis son coup de base. |
| Pile ou face et Aura de décoction | Le coup du 2 (le 1 jusqu'à la 0.112.0) touche : la pièce part. Pile : ce coup ×3, encore deux fois les PV retirés par ce coup, qui comptent comme un coup qui touche : la décoction empoisonne aussi juste après la pièce. Face, ou coup esquivé : rien de plus. |
| Aura de sainteté et poison | Le poison agit au début du tour du porteur, la sainteté à sa fin : la prêtresse empoisonnée perd puis regagne dans le même tour. |
| Aura de précision et Œil de faucon | Le critique assuré utilise le multiplicateur effectif : ×3,4 pour Elaria. Chaque charge ajoute aussi 5 % de critique (0.107.0). |
| Soliste (la barde) : deux 2 dans la même action | Le premier coup ×3 touche : le solo est joué. Le second 2 est une face nue (une fois par combat, 0.107.0). Si le premier est esquivé, le second est encore un solo. |
| Crescendo gravé : son troisième déclenchement | ×2, puis ×3, puis ×4 : chaque Crescendo qui a touché fait monter le suivant ; un Crescendo esquivé ne monte pas. |
| Saignement qui achève son porteur | K.O. pendant la fenêtre du coup : l'adversaire du porteur gagne, même si le coup seul ne suffisait pas. |
| Vulnérable (2) contre une armure de 1, coup de 3 | 3 + 2 = 5, puis l'armure : 4 dégâts. |
| Affaibli (3) et Vulnérable (2) sur le même coup de 2 | Sortant : 2 − 3 = −1 ; entrant : −1 + 2 = 1 ; plancher : 1 ; puis armure. |
| Étourdi (1) | Début de tour normal (le poison agit), action perdue, fin de tour normale (la brûlure agit). |
| Régénération et Brûlure | La Régénération agit au début du tour, la Brûlure à la fin. |
| Barde : un 1 (le Duo), puis un 2 et un 5 | Le 1 : +1 Aura mélodieuse et une charge de Duo, greffés ; le coup de ce 1 part, avec l'aura renforcée (présente au début du coup, règle 9). À sa prochaine action, le Duo part : une rafale de deux jets complets, dans l'ordre ; le 2 déclenche Soliste (ce coup ×3) sur le coup de ce dé ; le 5, une face nue, ne porte que son coup de base. Chaque coup a sa valeur tirée, son esquive et son critique ; les reliques de face et la dorure lisent chaque dé seul. |
| Barde : un 1 dans la rafale du Duo | Ce jet pose un nouveau Duo : il attend l'action suivante (le Duo de cette action est déjà consommé). Deux 1 dans la même rafale : deux charges, trois dés à l'action suivante. |
| Barde : le Duo et Coup de chance (gravé) posés ensemble | Un seul statut de jets de plus part par action : le premier posé ; l'autre attend l'action suivante. |
| Aura mélodieuse contre Aura d'intimidation (1) et armure 1 | Dégâts finaux (`modifyFinal`) : appliqués après tout le reste. Un 3 devient 3 − 2 = 1, l'armure laisse 1 (plancher), puis +1 : 2. C'est la réponse de la barde aux réductions fixes par coup. |
| Fausse note (1 charge) contre une Furie des vents | Le premier coup qui touche perd 5 dégâts finaux, après l'armure (plancher à 1), et consomme toute la Fausse note ; le second est normal. Un coup esquivé ne la consomme pas. |
| Fausse note (1) et Aura mélodieuse (1) sur le même coup de 3 après l'armure | Dégâts finaux additionnés : 3 − 5 + 1 = −1, puis le plancher : 1, quel que soit l'ordre de pose (0.110.0). |
| Sifflotement (2 charges), relancé avant la fin | Cumul : les charges s'ajoutent (2 + 2 = 4), chaque fin de tour rend 2 PV et retire une charge. |

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
| une étape de chronologie | `Beat` (`combat.ts`) | lui donner sa mise en scène dans `stage` (`staging.ts`), et sa `cause` : TypeScript refuse un type d'étape oublié |
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

1. **Point de vue de l'attaquant**, toujours : le combattant dont c'est l'action offensive en cours (le maître du tour). **+** si la surcharge amplifie son action, **−** si elle la réduit ou la contre. Pour un statut, le signe se déduit de sa polarité et de son porteur : un bonus de l'attaquant ou un malus du défenseur donne +, un bonus du défenseur ou un malus de l'attaquant donne − (`statusSpecial`). **Une relique** (exception, décision de l'utilisateur, 0.110.0) : + pour le bonus qu'elle donne à son porteur, même chez le défenseur (un bonus gardé pour plus tard est un bonus pour son porteur) ; − seulement chez le défenseur, quand elle contre le coup en cours en frappant l'attaquant (la Conque des vents). Une réaction dont aucun effet n'a de résultat (bloqué, neutralisé, au plafond) n'a pas de label.
2. **Format** : la cause et son effet chiffré sur ce coup (« Critique ×2 », « Fer à quatre clous +4 », « Armure temporaire −6 », « Riposte −3 ») ; le nom seul s'il n'y a rien à chiffrer (« Esquive assurée », « Épines acérées »).
3. **Ordre** : de haut en bas, l'ordre d'application de ce livre (§ 3, puis les réactions dans l'ordre du moteur) ; chaque label tombe à l'instant où il s'applique ; la colonne se vide à l'étape suivante (le jet suivant, chaque coup d'une rafale, le passage de main).
4. **Couleur selon la source**, pas selon le signe : Coup (le dé et le critique), Compétence ou statut, Relique. Le signe se lit au « + / − » du label, aux hachures de la plaque du − et à son son.
5. **N'entre que ce qui change ce coup et n'arrive pas à chaque coup.** Hors de la colonne :
   - ce qui se **déclenche** (une compétence et l'action qu'elle donne : Pile ou face, Furie des vents, Coup de chance, Rétribution, Crescendo et Soliste) : leur sceau le dit, au niveau identité (décision de l'utilisateur pour Pile ou face et la Furie, étendue à toute action déclenchée) ;
   - ce qui agit **à chaque coup** (auras : Aura de puissance, Aura mélodieuse, Aura de décoction ; états durables : Affaibli, Vulnérable, Force de l'ours) : barre de compétences et zone d'état.
   - **Exception déclarée : la relique qui se déclenche** (étape `relic`) garde son label, à la demande de l'utilisateur (« quand une relique se déclenche, il faudrait un label au centre ») : une relique n'a pas de sceau dans la barre de compétences.

### Inventaire (2026-10-21)

| Instant | Label | Lu dans | Source | Signe |
| --- | --- | --- | --- | --- |
| résultat du dé | Esquive assurée | `Attack.dodgeForced` (Esquive améliorée du défenseur) | Compétence ou statut | − |
| résultat du dé | « Fer à quatre clous +4 » | `Attack.relicBonus` | Relique | + |
| résultat du dé | « Face dorée +2 » (forge du dé) | `Attack.gild` | Coup | + |
| avant l'élan | Critique assuré | `Attack.critForced` | Coup | + |
| avant l'élan | « Critique ×2 » | `Attack.crit`, `critMultiplier` | Coup | + |
| impact | « Luciole +2 » | `Attack.modifiers` d'un statut `spentOnHurt` du défenseur | Compétence ou statut | + |
| impact | « Armure temporaire −6 » | `Attack.shields` (bouclier du défenseur, posé par Peau de pierre) | Compétence ou statut | − |
| impact | « Fausse note −10 » | `Attack.modifiers` (`final`) d'un statut `spentOnHit` de l'attaquant | Compétence ou statut | − |
| impact | « Ferveur +2 » (2026-10-24) | `Attack.modifiers` d'un statut `spentOnHit` de l'attaquant, avant l'armure | Compétence ou statut | + |
| réaction | « Vol de vie +5 » | étape `statusReaction` (`drainsHit` de l'attaquant) | Compétence ou statut | + |
| réaction | « Riposte −3 » | étape `statusReaction` (`reflectsHit` du défenseur) | Compétence ou statut | − |
| réaction | « Saignement +2 » | étape `statusReaction` (réaction `hurt` d'un malus du défenseur) | Compétence ou statut | + |
| réaction | Épines acérées | étape `statusReaction` (réaction `hurt` d'un bonus du défenseur) | Compétence ou statut | − |
| étape `relic` | le nom de la relique | étape `relic` | Relique | +, sauf chez le défenseur une relique qui frappe l'attaquant (−) (0.110.0 ; avant, − pour toute relique du défenseur) |

Nouveautés du 2026-10-21 : esquive assurée, bouclier qui absorbe, Fausse note, Luciole ; Riposte et Épines passent en −. Retirés : Pile ou face, Furie des vents (et son « ×2 »), Coup de chance, Rétribution, Crescendo, Soliste.

**Étendre** : un statut est une surcharge par sa mécanique (`isSurcharge`) : critique ou esquive imposés, bouclier, modificateur qui s'use sur le coup (`spentOnHit`, `spentOnHurt`), vol de vie, renvoi, réaction au coup encaissé ; jamais une aura. Un nouveau statut de ces familles a son label, son signe et son son sans rien déclarer. Aucun point d'appel ne choisit une couleur, un signe ni un son.
