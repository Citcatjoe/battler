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
| `statusDuration` / `statusExpire` qui suivent l'effet d'un statut dans la même phase | le `statusTick` de ce statut quand il existe |
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

## 4. Étape 2 : la mise en scène (`src/game/staging.ts`)

`stage(result: CombatResult, opts) → Moment[]` est une **fonction pure** : ni React, ni horloge, ni son joué.

```ts
interface Moment {
  /** Étapes du moteur couvertes par ce moment, dans l'ordre (reprise en mode combat test) */
  beats: number[]
  turn: number
  owner: Side
  /** Cues datées depuis le début du moment, triées par `at` */
  cues: Cue[]
  /** Durée totale du moment (la suivante commence à `duration`) */
  duration: number
}
type Cue = { at: number } & (
  | { channel: 'dice'; dice: DiceState }               // plateau de dés (état complet)
  | { channel: 'strike'; strike: Strike | null }
  | { channel: 'blow'; blow: Blow | null }
  | { channel: 'float'; side: Side; float: Float }     // ajoute un texte flottant (liste, jamais écrasé)
  | { channel: 'aura'; fx: EffectFx | null }           // aura et titre d'une source
  | { channel: 'special'; special: SpecialSpec }       // label de la zone de surcharge
  | { channel: 'specialsClear' }
  | { channel: 'sound'; cue: SfxName; arg?: number }   // déjà dédoublonné par signe et par instant
  | { channel: 'hp'; hp: Pair<number> }
  | { channel: 'statuses'; statuses: Pair<Status[]> }
  | { channel: 'log'; entry: Omit<LogEntry, 'id'> }
  | { channel: 'skillPulse'; side: Side; face: number }
  | { channel: 'relicPulse'; side: Side; relics: string[] }
  | { channel: 'signal'; signal: Omit<SkillSignal, 'key'> }
  | { channel: 'scene'; scene: Omit<SceneFx, 'key'> }
  | { channel: 'form'; side: Side; form: number }
  | { channel: 'turn'; turn: number; active: Side }
)
```

Règles de la mise en scène :

1. **Un moment = une étape racine et toutes les étapes qui en découlent** (par `cause`), quand elles doivent se voir ensemble. On ne regroupe jamais d'après l'étape voisine. Un coup, son poison posé, son saignement qui coule, sa Riposte et ses Épines forment un seul moment, chacun à son instant.
2. **Les instants viennent de `timing.ts`** (constantes nommées, une par battement : `DICE_ROLL`, `WIND`, `CRIT_FREEZE`, `READ_HOLD`…). Les durées CSS en dérivent (variables posées à la racine) au lieu d'être recopiées à la main.
3. **Les PV de chaque partie de dégâts** se calculent à partir de l'état de l'étape précédente et des `parts`. La dernière partie doit retomber exactement sur `state.hp` (une assertion le vérifie).
4. **Sons** : la mise en scène émet les cues `sound` déjà dédoublonnées (un son par signe et par instant, SONS.md § 4.4). Le lecteur ne décide de rien.
5. **Iso-rendu d'abord** : la v2 reprend le rythme actuel (mêmes battements, mêmes durées). Les seules différences voulues sont les cas que le regroupement par cause corrige (par exemple une Riposte intercalée, qui ne sépare plus le poison de son coup). Chacune est listée au § 7.
6. **Mode combat test** : imposer un dé relance `simulateCombat`, puis `stage`. La lecture reprend au premier moment dont les `beats` n'ont pas encore été joués. Les dés imposés suivent le même contrat qu'aujourd'hui (`forcedRolls`).

Tests (`staging.test.ts`), sans navigateur, sur des combats à graine et des combats construits :
- le poison posé par un coup apparaît au même `at` que l'impact du coup, même si une Riposte ou des Épines suivent ;
- le saignement qui coule tombe sur l'impact du coup qui l'a fait couler ;
- jamais deux sons du même signe au même instant ;
- les cues `hp` d'un moment finissent sur `state.hp` de sa dernière étape ;
- tout `beat` est couvert par exactement un moment, dans l'ordre ;
- le décompte et l'expiration d'un statut tombent avec son effet (« −2 » et compteur ensemble).

## 5. Étape 3 : le lecteur

- `useCombat` garde son API publique (ce que lisent `FightScreen`, `Fighter`, etc.). Son contenu devient : `stage` une fois, puis une boucle qui attend chaque `at` avec l'horloge unique (vitesse, pause, arrêt) et applique la cue à l'état correspondant.
- **Textes flottants en liste** : chaque flottant a sa clé et sa durée de vie, et rien n'en écrase un autre (fin de `useLast`/`withHit`).
- **La pause et la vitesse pilotent aussi** la secousse de l'écran et les durées CSS (`--speed`, et pause via `animation-play-state`). Les sons déjà lancés finissent.
- **GSAP** : décision après l'étape 2. Les moments étant des données, on pourra les brancher sur une timeline GSAP (`timeScale`, `seek`, GSDevTools pour régler le rythme au ralenti) si la valeur le justifie.

## 6. Ordre de migration

1. Étape 1 (moteur), avec ses contrôles d'audit. L'empreinte reste identique.
2. `timing.ts` et `staging.ts` pour tous les types d'étape, avec leurs tests.
3. Lecteur. Bascule complète de `useCombat`, puis suppression de `flowAt`, `rideAt`, `anticipate`, `previewed`, `grouped`, `snap`, `chained`, `ownerOf`, et des fonctions `play*` impératives.
4. Revue visuelle par l'utilisateur sur le serveur de dev du worktree. Ensuite, fusion dans la branche principale.

## 7. Différences de rendu voulues

_À remplir pendant la migration : chaque écart avec la 0.80.2, et pourquoi._
