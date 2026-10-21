# Moteur v2 : du moteur à l'écran

Branche `moteur-v2` (worktree `../battler-moteur-v2`). Point de départ : le commit tagué `avant-moteur-v2` (0.80.2), qui reste intact sur `design-system-v1`.

## 1. Pourquoi

L'audit du 2026-10-21 a montré que les **règles** (`simulateCombat`) étaient saines : déterministes, organisées en registres, et sans aucun identifiant en dur. C'est le **passage du moteur à l'écran** qui produisait les problèmes de synchronisation :

- **Pas de lien de cause.** Aucune étape (`Beat`) ne disait quel coup l'avait provoquée. L'écran reconstruisait les liens en regardant les étapes voisines (`flowAt`, `rideAt`, `skillFaceAt`, `anticipate`, `grouped`, `chained`, recherche des rafales et des paires), avec des exceptions qui cassaient dès qu'une autre étape s'intercalait (la Riposte entre un coup et son poison, par exemple).
- **Des règles recalculées dans l'interface** :
  - le propriétaire du tour, déduit de la parité du numéro de tour (`ownerOf`) ;
  - les PV soustraits dans `playBlows` ;
  - la cause d'une esquive ou d'un critique imposés, devinée en prenant le premier statut du registre qui portait le drapeau.
- **Un script impératif** :
  - environ 950 lignes dans un seul `useEffect` ;
  - environ 40 durées en dur dans le code ;
  - une seule place pour les textes flottants, si bien que deux effets du même instant s'écrasaient ;
  - des sons dédoublonnés « entre deux `await` ».
- **Conséquence** : rien de tout cela ne se testait sans navigateur, et chaque correction ajoutait une exception de plus.

## 2. Le principe

```
simulateCombat (règles)  →  stage (mise en scène, fonction pure)  →  lecteur (horloge unique)  →  composants
        beats + causes            moments = listes de cues                 applique les cues
```

- **Le moteur dit ce qui s'est passé et pourquoi.** Chaque étape porte son identifiant, sa cause, sa phase et le propriétaire du tour.
- **La mise en scène décide ce qui se montre ensemble et quand.** Elle regroupe par **cause**, jamais par voisinage. Elle produit des données (des moments, faits de cues datées) : on peut donc les tester sans écran.
- **Le lecteur joue ces données.** Il ne contient ni règle ni décision de mise en scène, et une seule horloge (vitesse, pause, arrêt) vaut pour tous les canaux.
- **Toutes les durées vivent dans une table nommée** (`timing.ts`). Régler le rythme, c'est modifier cette table.

## 3. Étape 1 : un moteur qui dit les causes

Changements du type `Beat` (`combat.ts`), sans aucun changement de règle :

| Champ | Sens |
| --- | --- |
| `id: number` | Rang de l'étape dans `beats`, à partir de 0 |
| `cause?: number` | `id` de l'étape qui a provoqué celle-ci (voir le tableau suivant) ; absent pour une étape « racine » (jet de l'action, début de phase) |
| `phase: 'shift' \| 'turnStart' \| 'action' \| 'turnEnd'` | Moment du tour où l'étape a lieu |
| `owner: Side` | Celui dont c'est le tour, donné par le moteur (fin de `ownerOf` dans l'interface) |

Règles de cause :

| Étape | `cause` |
| --- | --- |
| Réaction à un coup (`statusReaction` sur `hit`/`hurt`, Vol de vie, Riposte, Épines, poison de l'Aura de décoction, saignement qui coule) | le coup (`attack`) |
| Événement déclenché par un coup ou par son dé (`needsTouch`, `reshapesHit`, coup sacrifié, face naturelle) | le coup |
| Événement d'un double | l'étape `pair` |
| Coups d'une rafale (`flurry`) ou d'une paire | l'étape `flurry` ou `pair` |
| Pièce (`coin`) | l'étape qui a posé Pile ou face (le coup ou l'événement) |
| Relique sur un moment du coup | le coup |
| `statusAge` (usure de la phase : décomptes et extinctions en une étape, 2026-10-21) qui suit l'effet d'un statut dans la même phase | le `statusTick` de ce statut quand il existe |
| Réaction à une réaction (Épines provoquées par une Riposte…) | l'étape qui l'a déclenchée |

Autres changements :

- `Attack.dodgeBy?: StatusId` et `Attack.critBy?: StatusId` : le statut qui a imposé l'esquive ou le critique (fin de la devinette dans `attackSpecials`).
- `Attack.shields` devient une liste ordonnée `{ status, absorbed }[]`, dans l'ordre d'application.
- Plus aucune modification d'une étape déjà émise (`combat.ts:870`, remplissage de jauge) : l'information va dans l'étape qui la produit.
- **Contrat** : l'empreinte de non-régression (`balance.test.ts`) ne bouge pas. Aucune étape n'est ajoutée ni retirée, et aucun tirage ne change.
- **Contrôles** dans `audit.test.ts` :
  - chaque `cause` désigne une étape antérieure du même tour (ou du tour précédent pour une fin de tour) ;
  - toute réaction à un coup a pour cause un coup ;
  - `owner` ne change qu'au changement de tour.

Précisions de l'implémentation (étape 1 livrée) :

- L'ouverture (fenêtre `combatStart`, tour 0) est rangée en phase `turnStart`, avec pour `owner` celui qui ne commence pas (comme l'ancien `ownerOf`).
- Tous les coups qui suivent une rafale `flurry`, y compris le coup de l'action, ont la rafale pour cause. Une rafale de coups instantanés (Furie des vents) a pour cause l'étape qui a posé sa charge, à défaut le dernier coup.
- Les fenêtres `hit`/`hurt` ouvertes par une pièce qui touche ont la **pièce** pour cause : le contrôle « réaction au coup » accepte un coup ou une pièce.
- Vol de vie, Riposte et seuils vérifiés juste après le coup ont le coup pour cause ; un seuil franchi par une réaction, une compétence ou un effet de tour a cette étape pour cause.
- Un décompte ou une expiration qui liste plusieurs statuts a pour cause l'effet de tour du premier d'entre eux qui en a un.
- Le contrôle d'antériorité vérifie `cause < id` (une pièce posée à un tour peut partir au suivant).

## 4. Étape 2 : la mise en scène (`src/game/staging.ts`)

`stage(result: CombatResult, opts) → Moment[]` est une **fonction pure** : ni React, ni horloge, ni son joué.

```ts
interface Moment {
  /** Étapes du moteur couvertes par ce moment, dans l'ordre (vide : ouverture, fin du combat) */
  beats: number[]
  turn: number
  owner: Side
  /** Cues datées depuis le début du moment, triées par `at` */
  cues: Cue[]
  /** Durée totale du moment (la suivante commence à `duration`) */
  duration: number
  /** Combat test : avant les cues de `at`, les dés jusqu'au rang `upTo` (exclu) doivent être choisis */
  rolls: { at: number; upTo: number }[]
  /** Les attentes du moment, contiguës depuis 0 (leur somme vaut `duration`), chacune avec ce qui l'a produite */
  spans: { at: number; ms: number; name: string }[]
}
type Cue = { at: number } & (
  | { channel: 'dice'; dice: DiceState }               // plateau de dés (état complet, sans ses labels)
  | { channel: 'strike'; strike: Strike | null }
  | { channel: 'blow'; blow: Blow | null }
  | { channel: 'float'; side: Side; float: Float }     // ajoute un texte flottant (liste, jamais écrasé)
  | { channel: 'aura'; fx: EffectFx | null }           // aura d'une source ({ key, source }) ; son titre est un `float`
  | { channel: 'special'; special: SpecialSpec }       // label de la zone de surcharge
  | { channel: 'specialsClear' }
  | { channel: 'sound'; cue: SfxName; arg?: number }   // un seul par nom et par instant ; `arg` : durée à ×1
  | { channel: 'hp'; hp: Pair<number> }
  | { channel: 'statuses'; statuses: Pair<Status[]> }
  | { channel: 'log'; entry: Omit<LogEntry, 'id'> }
  | { channel: 'skillPulse'; side: Side; face: number }
  | { channel: 'relicPulse'; side: Side; relics: string[] }
  | { channel: 'relicUse'; side: Side; relic: string; uses: number }  // charges restantes (en-tête)
  | { channel: 'signal'; signal: Omit<SkillSignal, 'key'> }
  | { channel: 'scene'; scene: Omit<SceneFx, 'key'> }
  | { channel: 'form'; side: Side; form: number }
  | { channel: 'turn'; turn: number; active: Side | null }           // null : avant l'initiative, après le K.O.
  | { channel: 'winner'; side: Side }
)
type Float =                                            // chacun avec sa `key`
  | { kind: 'title'; text: string; subtitle?: string } // nom d'une compétence, « Pile ! »
  | { kind: 'badge'; badge: Badge; row: number; lift: boolean } // un effet sur sa cible, rangé en colonne
  | { kind: 'hit'; damage: number; crit: boolean; dodged: boolean } // ESQUIVE, CRITIQUE et le chiffre d'un coup
```

Règles de la mise en scène :

1. **Un moment = une étape racine et toutes les étapes qui en découlent** (par `cause`), quand elles doivent se voir ensemble. On ne regroupe jamais d'après l'étape voisine. Un coup, son poison posé, son saignement qui coule, sa Riposte et ses Épines forment un seul moment, chacun à son instant.
2. **Les instants viennent de `timing.ts`** (constantes nommées, une par battement : `DICE_ROLL`, `WIND`, `CRIT_FREEZE`, `READ_HOLD`…). Les durées CSS en dérivent (variables posées à la racine) au lieu d'être recopiées à la main.
3. **Les PV de chaque partie de dégâts** se calculent à partir de l'état de l'étape précédente et des `parts`. La dernière partie doit retomber exactement sur `state.hp` (une assertion le vérifie).
4. **Sons** : la mise en scène émet les cues `sound` déjà dédoublonnées (un son par signe et par instant, SONS.md § 4.4). Le lecteur ne décide de rien.
5. **Iso-rendu d'abord** : la v2 reprend le rythme actuel (mêmes battements, mêmes durées). Les seules différences voulues sont les cas que le regroupement par cause corrige (par exemple une Riposte intercalée, qui ne sépare plus le poison de son coup). Chacune est listée au § 7.
6. **Mode combat test** : imposer un dé relance `simulateCombat`, puis `stage`. La lecture reprend dans le moment en cours (même étape racine), à l'instant où elle s'était arrêtée : un moment peut contenir plusieurs dés (§ 5). Les dés imposés suivent le même contrat qu'aujourd'hui (`forcedRolls`).

Tests (`staging.test.ts`), sans navigateur, sur des combats à graine et des combats construits :
- le poison posé par un coup apparaît au même `at` que l'impact du coup, même si une Riposte ou des Épines suivent ;
- le saignement qui coule tombe sur l'impact du coup qui l'a fait couler ;
- jamais deux sons du même signe au même instant ;
- les cues `hp` d'un moment finissent sur `state.hp` de sa dernière étape ;
- tout `beat` est couvert par exactement un moment, dans l'ordre ;
- le décompte et l'expiration d'un statut tombent avec son effet (« −2 » et compteur ensemble).

Précisions de l'implémentation (étape 2 livrée) :

- Un moment s'arrête aussi au changement de tour ; le passage de main (`HANDOVER`) ouvre le premier moment du tour. Le premier moment est l'ouverture (initiative), le dernier la fin du combat (K.O., victoire) : tous deux sans étape.
- Étapes jouées avec le coup qui les a provoquées (`absorbed`) : la plaie qui coule sur le défenseur (`flowOf`), les statuts que le coup pose sur sa cible (`ridesOf` : réaction du frappeur sur `hit`, compétence `needsTouch`), aussi pour une pièce sur pile. À leur place, elles ne montrent plus que leurs statuts.
- Étapes qui tombent avec leur dé, sans attente (`snapped`) : la compétence d'un coup sacrifié qui a la face du dé pour déclencheur, la compétence d'un double (cause : la paire). Les coups d'une rafale ou d'une paire sont ceux qui l'ont pour cause.
- Statuts affichés : l'état de l'étape la plus récente déjà montrée (rien ne revient en arrière quand une Riposte se joue après le poison que le coup a posé à son impact), avec les décomptes montrés d'avance (`previewCounts` : même statut, même tour, même camp, même phase).
- PV : chaque étape retire ses effets (ou ses `parts`, coup par coup) des PV à l'écran. Quand les étapes appliquées sont exactement toutes celles jusqu'à une étape, les PV doivent valoir son `state.hp` ; sinon `stage` lève une erreur en développement (et se recale sur l'état du moteur en production).
- Sons : `sound` n'émet qu'un son par nom et par instant, ce qui couvre la règle 4 de SONS.md § 4.4 (un son par signe) et sa règle 5 (un label se tait quand l'effet joue déjà ce son) ; l'ancien paramètre `silent` disparaît.
- Clés : celles des coups, auras et textes flottants viennent de `stage` (un compteur, identique tant que la chronologie l'est) ; celles des labels, du journal, des éclats, des signaux et des scènes viennent du lecteur.
- Attentes nommées (`spans`) : la mise en scène n'avance son instant que par `hold('WIND')` (une constante numérique de `timing.ts`, nom vérifié par TypeScript) ou par `wait(ms, 'libellé')` pour une durée calculée (seul cas : `rythme de la scène`, l'écart imposé par les impacts d'un événement de scène). Les options `lead`/`hold` de `showEffects` prennent un nom de constante (`hold: 'WOUND_HOLD'`) ou `lead: 0` (sans attente). Un test vérifie, sur tout le corpus, que les attentes se suivent sans trou, font la durée du moment et valent leur constante.

## 5. Étape 3 : le lecteur

- `useCombat` garde son API publique (ce que lisent `FightScreen`, `Fighter`, etc.). Son contenu devient : `stage` une fois, puis une boucle qui attend chaque `at` avec l'horloge unique (vitesse, pause, arrêt) et applique la cue à l'état correspondant.
- **Textes flottants en liste** : chaque flottant a sa clé et sa durée de vie, et rien n'en écrase un autre (fin de `useLast`/`withHit`).
- **La pause et la vitesse pilotent aussi** la secousse de l'écran et les durées CSS (`--speed`, et pause via `animation-play-state`). Les sons déjà lancés finissent.
- **GSAP** : décision après l'étape 2. Les moments étant des données, on pourra les brancher sur une timeline GSAP (`timeScale`, `seek`, GSDevTools pour régler le rythme au ralenti) si la valeur le justifie.

Précisions de l'implémentation (étape 3 livrée) :

- L'écran est un seul état, `View`, obtenu en appliquant les cues dans l'ordre avec `applyCue(view, cue, now)` (pure, exportée, utilisée aussi par `staging.test.ts`). Le hook rend ses champs (`hp`, `statuses`, `forms`, `dice`, `strike`, `blow`, `aura`, `floats`, `scene`, `log`, `turn`, `winner`, `active`, `pulse`, `signal`, `relicPulse`, `relicUses`) et ses commandes (`speed`, `setSpeed`, `paused`, `setPaused`, `cheat`, `forceNextRoll`, `resolved`). Changement pour les composants : `fx` devient `aura` (`{ key, source }`) et `floats` (`Pair<LiveFloat[]>`) ; `Fighter` reçoit `aura` (la clé) et `floats` au lieu de `fx`.
- Une horloge : à chaque image, l'instant avance de `durée × vitesse` (rien en pause, rien pendant l'attente d'un dé), le lecteur applique tout ce qui est échu, puis passe au moment suivant en reportant le reste. Les textes flottants vivent `FLOAT_LIFE` à cette horloge.
- Mode triche et combat test : avant les cues d'un point d'attente (`rolls`), chaque dé non choisi attend le joueur. Imposer un dé relance `simulateCombat`, puis `stage` ; la lecture retrouve le même moment (même étape racine) et reprend **au même instant** de ce moment, pas à son début : un moment peut contenir plusieurs dés (le coup et sa pièce, une rafale), et tout ce qui précède le dé imposé est identique.
- Durées CSS : `TIMING_VARS` (`--t-lunge`, `--t-lunge-fast`, `--t-signal`, `--t-coin-spin`, `--t-read`, `--t-float`, `--t-title`) posées sur `.arena`. La secousse (Web Animations) se met en pause avec le combat.

## 6. Ordre de migration

1. Étape 1 (moteur), avec ses contrôles d'audit. L'empreinte reste identique.
2. `timing.ts` et `staging.ts` pour tous les types d'étape, avec leurs tests.
3. Lecteur. Bascule complète de `useCombat`, puis suppression de `flowAt`, `rideAt`, `anticipate`, `previewed`, `grouped`, `snap`, `chained`, `ownerOf`, et des fonctions `play*` impératives.
4. Revue visuelle par l'utilisateur sur le serveur de dev du worktree. Ensuite, fusion dans la branche principale.

## 7. Différences de rendu voulues

Relevées en écrivant la v2 (2026-10-21), par rapport au rejoueur impératif de la 0.80.2. Non vues à l'écran : à juger en jeu (revue visuelle, § 6).

1. **La plaie qui coule tombe toujours à l'impact de son coup.** Avant, seulement si son étape suivait immédiatement le coup ; un Vol de vie, une Riposte ou une relique de seuil intercalés lui donnaient sa propre étape (lead, label, 700 ms de lecture). Maintenant elle a le coup pour cause, donc elle tombe sur la frappe, et le moment est plus court d'autant.
2. **Le statut posé par un coup tombe toujours à son impact** (poison de l'Aura de décoction, Saignement de Pourfendre), même quand une Riposte s'intercale ; et tous les statuts posés par ce coup, pas seulement celui de l'étape suivante. Avant : la Riposte les séparait, le poison avait sa propre étape (lead 250 ms, 1 300 ms de lecture). Corollaire : la zone d'état montre à l'impact l'état le plus récent, si bien que la charge de Riposte consommée s'y voit déjà, au lieu de l'étape de la Riposte.
3. **Le décompte tombe avec l'effet de son statut même si une étape s'intercale** (une relique de seuil déclenchée par les dégâts du poison, par exemple). Avant, l'anticipation s'arrêtait à la première étape étrangère, et le compteur avait son propre temps (650 ms).
4. **Les textes flottants ne s'écrasent plus.** Avant, un nouvel effet remplaçait d'un coup les textes du précédent (une seule place) ; maintenant chacun finit son animation (1,7 s à ×1). Deux textes du même instant restent tous deux lisibles ; un texte qui s'efface peut encore se voir quand le suivant apparaît à la même hauteur.
5. **Un seul son par nom et par instant, toutes sources confondues.** Avant, seuls les labels étaient dédoublonnés entre eux, plus le cas déclaré des Épines (`silent`). Un label et un effet qui jouent le même son au même instant n'en jouent plus qu'un.
6. **La pause fige aussi la secousse de l'arène** et la vie des textes flottants. Avant, la secousse finissait pendant la pause.
7. **Un rythme exact.** Avant, chaque attente se terminait à l'image suivante et perdait ce qui dépassait (jusqu'à ~16 ms par attente, une soixantaine d'attentes par tour) ; l'horloge unique reporte ce reste. Le combat est donc un peu plus court qu'en 0.80.2, et sa durée ne dépend plus de la cadence d'affichage.
8. **Mode triche : reprise au même instant du même moment** (voir § 5), au lieu de « l'étape suivante ». Visuellement identique, sauf qu'un dé imposé au milieu d'un moment ne rejoue rien de ce qui précède.
9. **Détails sans effet visible attendu** : les statuts sont aussi rafraîchis à l'étape d'un coup transformé et d'une paire (identiques en pratique) ; une Furie instantanée est reconnue par sa cause (la compétence qui l'a posée) au lieu de « l'étape précédente est une compétence », et la lecture courte de cette compétence par la rafale qu'elle cause.

## 8. Magnétoscope (outil de développement)

Pour régler le rythme (`timing.ts`) en regardant le combat : pause, ralenti, pas à pas de cue en cue, retour en arrière, curseur dans le moment, et la constante qui produit chaque tranche de temps.

**Ouvrir** : en combat, la touche **V**, ou `battler.vcr()` en console (`battler.vcr(false)` le ferme). L'état est retenu (`localStorage`, `battler:vcr`). Seulement sur le serveur de dev (`import.meta.env.DEV`), jamais en combat test (le mode triche y attend les dés : pas de retour en arrière avant un dé choisi).

**Le panneau** (au-dessus du HUD, sur le sol de l'arène) :
- en-tête : `Moment i / n · tour t · ce que joue le moment` (« Coup de Gorak », « Poison (début de tour) », « « Rétribution » d'Aldric »), à droite l'attente en cours (« WIND 300 ms ») et l'instant dans le moment ;
- la frise : les attentes du moment (`spans`) à l'échelle, chacune avec sa constante et sa durée (en italique, une durée calculée), l'attente en cours en or, le trait rouge à l'instant présent. **Cliquer ou glisser sur la frise** place la lecture à cet instant (curseur) ;
- au-dessus de la frise, les sons de chaque instant (nom du son) ; dessous, ce qui change à l'écran (`dés`, `coup`, `PV`, `texte`, `statuts`, `journal`…), sur deux rangs ;
- commandes : moment précédent, recommencer le moment, Lecture/Pause, pas suivant (prochain instant de cues, au besoin le moment suivant), moment suivant ; vitesses ×0,25, ×0,5 et ×1 (le HUD garde ×1, ×2, ×4).

**Clavier**, panneau ouvert : Espace (pause), → (pas), Maj+→ (moment suivant), ← (début du moment, puis moment précédent).

**Régler le rythme** : se mettre en pause sur le moment à régler, le parcourir pas à pas ou au ralenti, repérer sur la frise l'attente trop longue ou trop courte (son nom est celui de la constante de `timing.ts`), changer la constante, puis rafraîchir la page (F5 : le serveur de dev ne recharge pas tout seul) et revoir le même combat avec `battler.play(graine)`.

**Fonctionnement** (`useCombat`, option `vcr`) :
- `vcr.seek(mi, at)` : l'écran devient le résultat de toutes les cues des moments précédents et de celles du moment `mi` jusqu'à `at` compris (`applyCue`, le même pli que la lecture ; aucun son). L'horloge vaut la somme des durées précédentes plus `at` ; les textes flottants échus sont retirés. La lecture reprend de là.
- `stepCue`, `nextMoment`, `prevMoment`, `restartMoment` s'appuient sur `seek`. Chaque commande met d'abord le combat en pause.
- `vcr.snapshot` (`{ moments, mi, at, clock }`) est publié à chaque déplacement, à chaque changement de moment et au plus toutes les 100 ms pendant la lecture, seulement quand le panneau est ouvert.
- **Animations CSS** : un élément monté par un déplacement démarrerait ses animations à 0. Le lecteur rend donc d'abord un écran vidé de l'éphémère (coup, aura, textes, dés), puis le début du moment précédent, puis chaque instant de cues jusqu'à la cible avec `flushSync`, en avançant entre deux toutes les animations finies de l'arène (`getAnimations({ subtree: true })`, `currentTime`) du temps écoulé divisé par la vitesse. Elles restent figées par la pause (`.is-paused`). Un élan saisi au milieu d'un coup est donc à sa vraie position. Les éclats déjà passés avant ce point de départ (signal, sceau, relique, scène) ne rejouent pas.
- Changer de vitesse, panneau ouvert, garde la progression des animations CSS en cours (leur `currentTime` suit le rapport des vitesses).

**Limites** :
- Les boucles infinies (ambiance) et les transitions CSS (barres de vie, halos de tour) ne sont pas recalées : une transition rejoue depuis la valeur d'avant le déplacement.
- Un élément déjà à l'écran au début du moment précédent (texte flottant long, aura) repart de ce point, pas de son vrai début.
- La secousse de l'arène en cours est arrêtée par un déplacement ; elle repart si le coup qui la provoque est rejoué.
- Le journal ouvert passe en partie sous le panneau.
- Hors magnétoscope, changer de vitesse au milieu d'une animation la fait toujours sauter (comportement d'avant).
