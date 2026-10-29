# Le grand livre des systèmes

Ce document fait l'**inventaire de toutes les briques du jeu**, couche par couche : résolution, chronologie, présentation (animations, textes, sons), interface. Pour chaque brique, il dit ce qu'elle fait, qui la lit et quel contenu l'utilise. Il relève ensuite les couplages qui rendent les effets de bord difficiles à prévoir.

Il prépare une réflexion à venir : penser chaque mécanique comme un **système** que l'on combine, plutôt que comme un cas particulier. Il ne tranche rien, il pose les faits. Les pistes de la dernière partie sont des questions ouvertes.

- Les règles elles-mêmes (ordre, phases, application) sont dans [RESOLUTION.md](RESOLUTION.md) ; ce document ne les redit pas, il y renvoie.
- Le catalogue détaillé des statuts est dans [STATUTS.md](STATUTS.md), et les personnages dans [PERSONNAGES.md](PERSONNAGES.md).
- État au 2026-10-18, version 0.35.3 : 18 personnages (30 compétences), 31 statuts, 10 types d'étapes, 27 sons.

---

## 1. Vue d'ensemble : six couches

```
 DONNÉES                MOTEUR              CHRONOLOGIE           LECTURES
 roster.ts      ──┐                                          ┌──▶ stage → useCombat ──▶ Fighter, StatusTray, dés, HUD  (écran)
 (personnages,    │                                          ├──▶ narration  (journal, textes flottants)
  compétences)    ├──▶ simulateCombat ──▶ beats[] + état ────┼──▶ trace      (lecture sans navigateur)
 statuses.ts      │    (règles, dés)     après chaque étape  ├──▶ audit      (revérifie chaque règle)
 (statuts,        │                                          ├──▶ stats      (bilan d'un combat)
  crochets)     ──┘                                          ├──▶ analysis   (équilibrage, valeurs nettes)
                                                             └──▶ history, tournament (historique, tournoi)
 PRÉSENTATION hors registre : Icon.tsx (icônes), sound.ts (sons), index.css (animations), staging.ts (choix du son et des instants), timing.ts (durées)
```

| Couche | Rôle | Fichiers | Contrat |
| --- | --- | --- | --- |
| **Données** | Ce que sont les personnages et les statuts | `roster.ts`, `character.ts`, `events.ts`, `statuses.ts` | Aucun nom de statut en dur ailleurs |
| **Moteur** | Applique les règles et tire les dés | `combat.ts`, `rng.ts` | Seul endroit où l'on tire au sort ; pur à graine près |
| **Chronologie** | Ce qui s'est passé, dans l'ordre | `Beat` (`combat.ts`) | Chaque étape porte l'état qui en résulte ; c'est **l'interface unique** entre le moteur et tout le reste |
| **Lectures** | Interprètent la chronologie | `staging` (et son lecteur `useCombat`), `narration`, `trace`, `audit`, `stats`, `analysis`, `history` | Ne recalculent aucune règle |
| **Présentation** | Montre et fait entendre | `Fighter.tsx`, `StatusTray.tsx`, `FightScreen.tsx`, `index.css`, `sound.ts`, `Icon.tsx` | Rien n'est tiré au sort à l'affichage (positions fixes) |
| **Interface** | Navigation et outils | écrans, `HpBar`, `SkillDice`, `CheatPad`, compendium | Scène fixe 1600×900 |

**Ce qui tient bien** : le moteur est unique et la chronologie est la seule source de vérité. Un combat est rejouable à l'identique par sa graine. Le mode triche passe par le moteur, et l'audit revérifie tout sans faire confiance au moteur.

**Ce qui fuit** : la connaissance des mécaniques ne reste pas dans les registres. Chaque lecture (écran, son, statistiques, audit) réinterprète certaines mécaniques à sa façon (§ 7).

---

## 2. Briques de la résolution

### 2.1 Les dés

| Dé | Où | Règle | Imposable (triche) |
| --- | --- | --- | --- |
| **Dé de dégâts** (d7 à d14) | chaque coup | jet de 1 à N ; 1, 2 et 3 déclenchent les compétences, et N déclenche `naturalMax` | oui |
| **Initiative** (d10) | ouverture | le plus haut commence, relance sur égalité | non |
| **Pièce** (d2) | Pile ou face | 1 = pile, 15 dégâts directs | oui (1 = pile) |
| **Dé supplémentaire** (d3) | Coup de chance | un second coup, toujours entre 1 et 3, donc toujours une compétence | oui |
| **Relance secrète** | Coup de griffe | nouveau jet du même dé, plus 3 ; non montrée | non (elle consomme le hasard, sans rang de triche) |
| **Tirages cachés** | esquive, critique, `chance` | contre une probabilité, dans un ordre fixe : dé, esquive, critique | non |

La **grammaire du dé** est le cœur du jeu : sur 1, 2 ou 3, presque toujours, le coup est **sacrifié** et une compétence se déclenche. Plus le dé est petit, plus le personnage joue ses compétences (d7 : 3 jets sur 7 ; d14 : 3 sur 14). La taille du dé règle donc à la fois la force de frappe et la fréquence des compétences. C'est le levier le plus couplé du jeu (voir [EQUILIBRAGE.md](EQUILIBRAGE.md), § 5).

### 2.2 Les sortes de coups

Un coup prend toujours l'une de ces formes, et chacune ouvre ou ferme des fenêtres :

| Sorte | Origine | Esquive | Critique | Fenêtres `hit` / `hurt` / `missed` / `dodge` | Usure des statuts « au prochain coup » |
| --- | --- | --- | --- | --- | --- |
| **Normal** | dé de 4 ou plus | oui | oui | oui | oui |
| **Sacrifié** | compétence `forfeitsHit` (1 à 3) | non | non | non | **non** : Vol de vie et Riposte attendent |
| **Transformé** | compétence `reshapesHit` (ours) | oui | oui, sauf `noCrit` | oui | oui |
| **Rafale** | statut `extraStrikes` | chaque coup résolu à part | chaque coup | chaque coup | chaque coup |
| **Pièce** | statut `coinToss` | non | non | non (aucun coup porté) | non |
| **Perdu** | statut `skipsAction` | pas d'action | — | — | — |

Le « coup sacrifié » est la **règle implicite la plus dangereuse** du jeu. Tout statut qui agit « au prochain coup » doit dire ce qu'il fait d'un coup sacrifié. La Riposte l'oubliait et s'éteignait à vide (corrigé en 0.32.0, voir § 8).

### 2.3 Les déclencheurs (13)

| Déclencheur | Utilisé par une compétence | Utilisé par un statut (réaction) |
| --- | --- | --- |
| `naturalOne`, `naturalTwo`, `naturalThree` | **toutes** (9 familles) | — |
| `naturalMax` | aucune | — |
| `hit` | aucune | Aura de décoction (Aura de pourriture, sans porteur depuis la 0.71.0) |
| `hurt` | aucune depuis la 0.73.0 (Rancune et Sève du druide, 0.71.0 à 0.72.0) | Épines |
| `combatStart`, `turnStart`, `turnEnd`, `crit`, `missed`, `dodge`, `bloodied` | aucune | aucune |

**Constat** : les compétences du roster n'utilisent que les trois faces du dé. Les dix autres déclencheurs sont prêts et testés ; deux seulement (`hit`, `hurt`) servent, et uniquement aux réactions des statuts.

### 2.4 Les modulateurs d'une compétence

| Brique | Rôle | Utilisée |
| --- | --- | --- |
| `when` (5 conditions : `hpBelow`, `hpAtLeast`, `hasStatus`, `lacksStatus`, `fromTurn`) | ne se déclenche que si… | non |
| `chance` | probabilité de déclenchement | non |
| `limit` | nombre maximal par combat | non |
| `form` | n'existe que sous une forme | druide |
| `forfeitsHit` | le coup est sacrifié | 28 compétences sur 30 |
| `reshapesHit` (`max` ou `reroll`, `bonus`, `noCrit`) | le coup est transformé | aucune depuis la 0.73.0 (Charge, Coup de griffe avant) |
| `scene` (0.73.0) | événement de scène joué par l'écran, présentation seule | Foudre |

### 2.5 Les effets (5)

| Effet | Ce qu'il fait | Utilisé par |
| --- | --- | --- |
| `heal` | soigne, plafonné aux PV max | Aura de sainteté et Vol de vie, par leurs statuts (Fleur de vie retirée en 0.73.0) |
| `damage` | dégâts **directs** : ignorent armure, esquive et boucliers | Foudre (0.73.0) ; sinon via les statuts (poison, auras, saignement, riposte, pièce, pourriture) |
| `applyStatus` | pose un statut (immunité → garde → opposition → cumul, voir RESOLUTION § 6) | presque tout |
| `cleanse` | retire des statuts d'une polarité (tous, ou les `count` derniers) | Purification, Aura d'immunité |
| `release` | relâche un statut à jauges en dégâts directs | Rétribution |

### 2.6 Les crochets de statut (le vrai vocabulaire du jeu)

Un statut est un assemblage de crochets. Chaque crochet agit à **un moment fixe** et produit **une sorte d'étape**. Le tableau dit aussi combien de fichiers doivent connaître le crochet, ce qui mesure sa « surface » (§ 7.1).

| Crochet | Famille | Moment | Étape produite | Fichiers qui le lisent | Statuts qui l'utilisent |
| --- | --- | --- | --- | --- | --- |
| `modifyStats` | continu | chaque calcul | — (dans `attack`) | moteur | Brèche, Aura de précision, Luciole, Incantation (d3, 0.73.0) |
| `modifyOutgoing` | continu | chaîne, étape 4 | `attack.modifiers` | moteur, audit | Affaibli, Aura de puissance, Force de l'ours et Aura sauvage (0.73.0) |
| `modifyIncoming` | continu | chaîne, étape 5 | `attack.modifiers` | moteur, audit | Vulnérable, Aura d'intimidation, Luciole |
| `forcesCrit` | remplacement | chaîne, étape 3 | `attack.critForced` | moteur | Critique assuré |
| `forcesDodge` | remplacement | chaîne, étape 2 | `attack.dodgeForced` | moteur, analyse | Esquive améliorée |
| `shield` | remplacement | chaîne, étape 8 | `attack.shields` | 10 fichiers | Armure temporaire (Écorce épaisse retirée en 0.73.0) |
| `spentOnHurt` | usure | après l'application | — (état) | moteur | Luciole |
| `decays` | usure | dans l'étape `statusTick` ou `statusReaction` du statut | — (état) | moteur | Poison (0.36.4), Saignement (0.68.0) |
| `drainsHit` | sur le coup | fenêtre `hit` de l'attaquant (esquivé : charge perdue au coup) | `statusReaction` | moteur, écran | Vol de vie |
| `reflectsHit` | sur le coup | fenêtre `hurt` du défenseur, à son rang de pose | `statusReaction` | moteur, écran | Riposte |
| `fillsOnHurt` | jauges | fenêtre `hurt` du défenseur, à son rang de pose (vide : après ses statuts) | `statusReaction` sans effet | moteur | Rétribution |
| `onTurnStart` | périodique | phase 1 | `statusTick` | moteur | Poison, Régénération, Aura glaciale (pose du Poison sur l'adversaire, 0.69.0), Pourriture |
| `onTurnEnd` | périodique | phase 3 | `statusTick` | moteur | Brûlure, Aura de sainteté |
| `reactions` | déclenché | fenêtres | `statusReaction` | moteur | Épines acérées et Saignement (`hurt`), décoction et pourriture (`hit`) |
| `skipsAction` | contrôle | phase 2 | `skip` | moteur, écran | Peur, Étourdi |
| `extraStrikes`, `extraDie` | action multiple | phase 2 | `flurry` | moteur, écran | Furie des vents, Coup de chance |
| `coinToss` | remplacement d'action | phase 2 | `coin` | moteur, écran, son | Pile ou face |
| `immune` | application | à la pose | `applyStatus.result` | registre | Aura d'immunité |
| `wards` | application | à la pose | `applyStatus.result` | registre | Garde sacrée (à venir) |
| `opposes` | application | à la pose | `applyStatus.result` | registre | Poison ↔ Régénération |
| `stacking`, `maxStacks` | cumul | à la pose | — | registre | tous |
| `turns`, `expiresAt` | durée | phase 1 ou 3 | `statusAge` | moteur | statuts à durée |
| `spentOnReaction` | usure | après réaction | — | moteur | aucun (prêt) |

**Statut composite** : depuis la 0.35.2, Luciole combine trois crochets (`modifyStats`, `modifyIncoming`, `spentOnHurt`). C'est la preuve que les crochets se composent bien. Mais la règle « un statut = un comportement temporel » (RESOLUTION § 2) devient « un statut = un **ensemble** de comportements, chacun à son moment ».

### 2.7 Les règles transverses

| Règle | Où | Effet de bord typique |
| --- | --- | --- |
| **Pas de décompte le tour de la pose** | `fresh` (moteur) | « 1 tour » ne veut pas dire la même chose selon `expiresAt` |
| **Tour du porteur** | phases | un poison agit pendant le tour de la victime, pas de celui qui l'a posé |
| **Pas de chaîne** | `fire` | Épines ne déclenche pas `hurt` ; mais Riposte et jauges sont codées à part, hors de cette règle |
| **Bonus avant malus** | `statusPhase` | une régénération soigne avant que le poison ne frappe |
| **K.O. après chaque effet** | `applyEffects` | un effet de compétence peut s'arrêter au milieu |
| **Plancher d'1 dégât** | chaîne, étapes 6 à 8 | l'intimidation ne peut jamais tout annuler |
| **Overkill compté** | `Attack.dealt` | les statistiques comptent l'excès, les PV s'arrêtent à 0 |
| **Pas de hasard caché** | moteur | un mécanisme non utilisé ne consomme aucun tirage, ce qui préserve les graines |

### 2.8 Les formes

Un personnage à formes (druide) alterne entre deux formes au début de chacun de ses tours, sauf le premier (étape `shift`). Chaque compétence peut exiger une forme (`form`), et chaque forme peut avoir son apparence (`lookFor`). C'est la seule brique qui change **l'identité** d'un personnage en cours de combat. Elle touche 12 fichiers.

---

## 3. La chronologie : 11 types d'étapes

C'est le **contrat central**. Chaque type d'étape doit avoir une mise en scène dans `stage` (`staging.ts`), et TypeScript refuse un type oublié (`beat satisfies never`).

| Étape | Produite par | Contenu |
| --- | --- | --- |
| `attack` | chaque coup | jet, faces, esquive, critique, modificateurs, armure, boucliers, dégâts, sacrifié ou transformé, imposé |
| `event` | une compétence | nom, déclencheur, effets appliqués |
| `statusTick` | `onTurnStart` ou `onTurnEnd` | phase, statut, effets |
| `statusAge` | usure de la phase | décomptes (tours avant → après) et statuts éteints, en une étape |
| `statusReaction` | `reactions`, `drainsHit`, `reflectsHit`, `fillsOnHurt` | statut, déclencheur, effets |
| `skip` | `skipsAction` | statut qui fait perdre l'action |
| `shift` | formes | nouvelle forme |
| `flurry` | `extraStrikes` | nombre de coups, faces de chaque dé |
| `coin` | `coinToss` | pile ou face, effets, imposé |
| `relic` | une relique (0.75.0, [RELIQUES.md](RELIQUES.md)) : moment du coup, début de tour, seuil de PV | relique, nom, effets, rang du déclenchement ; le bonus de coup d'une relique est sur l'étape `attack` (`relicBonus`) |

`statusReaction` regroupe quatre mécaniques (réaction déclarée, vol de vie, riposte, jauges), toutes dans les fenêtres du coup. L'écran doit donc relire le registre pour savoir laquelle il montre (§ 7.2).

---

## 4. Briques de la présentation

### 4.1 Mise en scène de chaque étape

| Étape | Animation | Texte flottant | Son | Journal | Zone d'état |
| --- | --- | --- | --- | --- | --- |
| `attack` (normal) | dé qui roule puis retombe, élan (`lunge`), recul (`hit`) ou saut (`dodge`), étoile d'impact | `-N` en rouge (taille selon les dégâts), `ESQUIVE !` en cyan | Dé lancé, Dé posé (rien sur le max ni sur 1 à 3), élan muet, puis Coup ou Esquive | `attackLog` (modificateurs et armure détaillés) | statuts usés |
| `attack` critique | badge `CRITIQUE ×N`, arrêt sur image (110 ms), éclair blanc (`crit-flash`), secousse forte | `CRITIQUE !` en ambre, chiffre `text-9xl` qui tremble (`crit-shake`) | Coup critique (Coup + Grondement) | idem | — |
| `attack` sacrifié | dé seul, pas d'élan | — (la compétence qui suit parle) | dé seulement | « fait 2 : pas de dégâts » | — |
| `attack` transformé | nom de la compétence jaillit avant l'élan | titre violet | Coup, comme un coup normal | « fait 1 : Charge ! » | — (sans porteur depuis la 0.73.0) |
| `event` | halo violet sur le lanceur (`event-aura`) ; dégâts sur l'adversaire en vrais coups (élan, jauge par jauge) | titre violet, sous-titre pour un bonus d'un autre nom, badges sur la cible | déduit des effets (`cueOf`, § 4.4) ; Coup par jauge, Coup critique sur le dernier | `eventLog` | statut posé apparaît (`status-pop`) |
| `event` avec scène (0.73.0) | événement de scène (`SceneEvent.tsx`) : vue sur toute l'arène (Foudre : arène assombrie, puis blanchie) et vue sur la colonne de la cible (l'éclair) ; les effets tombent à l'impact (`SCENE_EVENTS`) | titre violet ; dégâts à l'impact | Coup critique à l'impact (Foudre) | `eventLog` | — |
| `statusTick` | badge ; titre sur le porteur s'il frappe l'adversaire | `-N`, `+N PV` | Ronge s'il fait des dégâts, sinon déduit (Soin) | `statusTickLog` | compteur qui défile |
| `statusReaction` | Épines : coup sans élan ; Riposte : contre-coup avec élan | titre violet, `-N` | Coup (Épines, Riposte) ou Soin (Vol de vie) | `statusReactionLog` | charge consommée |
| `skip` | tremblement (Peur) | « Tour perdu » (`STATES.lostTurn`) sur celui qui perd son action, en fuchsia, qui tombe ; ni titre ni aura | Tour perdu | `skipLog` | charge consommée |
| `flurry` | tous les dés roulent ensemble, le second jaillit (`die-burst`, couleur `dieColor`) | titre | un seul Dé lancé et un seul Dé posé | `flurryLog` | statut consommé |
| `shift` | fondu des silhouettes (`form-out`, `form-in`), éclair de sève, 14 feuilles | nom de la forme | Transformation, la même dans les deux sens | `shiftLog` | — |
| `coin` | pièce qui tournoie et retombe | `Pile !` ou `Face…` ; coup lourd sur pile | Pièce lancée, Pièce retombe ; Coup critique sur pile | `coinLog` | statut consommé |
| `statusAge` | compteurs qui défilent vers le bas ; un médaillon éteint montre son 0, puis s'efface | — | — | `statusAgeLog` | `count-loss`, `count-in-down`, `status-leave` |
| fin | K.O. (chute) et victoire (balancement) | `K.O. !` | `ko`, `victory` | « s'effondre » | — |

**Synchronisation** : les règles (ce qui tombe en même temps que quoi, à quel repère) sont dans [MISE_EN_SCENE.md](MISE_EN_SCENE.md), qui fait foi.

### 4.2 Les rappels persistants sur le modèle

Ils sont pilotés par le `look` du registre et lus par `Fighter` (`statusLooks`).

| Rappel | Brique | Statuts | Règle d'affichage |
| --- | --- | --- | --- |
| **Aura de personnage** | `look.aura` (couleur) | les 8 auras du 3 | une seule à la fois (la première trouvée) : halo qui respire, anneau au sol, 6 particules, contour lumineux |
| **Translucidité** | `look.opacity` | Esquive améliorée | la plus faible des opacités |
| **Tremblement** | `look.motion: 'tremble'` | Peur | oui ou non |
| **Lucioles** | `look.motion: 'fireflies'` | Luciole | une par charge, cinq au plus |
| **Couleur du dé** | `look.dieColor` | Coup de chance | dé vert |
| ~~Liseré coloré~~ | `look.glow` | 11 statuts | **plus dessiné depuis la 0.34.0** : donnée morte, gardée pour plus tard |

### 4.3 La grammaire des couleurs

| Couleur | Sens | Où |
| --- | --- | --- |
| **Violet** | nom d'une compétence ou d'un statut qui agit, sur son lanceur | textes flottants, halo `event-aura` |
| **Rouge** | dégâts subis (famille physique, par défaut) | `-N`, badges `damage` |
| **Vert acide** | dégâts d'un statut de la famille poison (Poison, 0.97.0) | badges `poison` |
| **Mauve** | dégâts d'un statut de la famille arcane (Brûlure, Pourriture, 0.97.0) | badges `arcane` |
| **Ambre, or** | critique ; bonus posé | `CRITIQUE !`, gros chiffre, badges `positive` |
| **Vert émeraude** | soin | `+N PV` |
| **Fuchsia** | malus posé, bonus dissipé | badges `negative` |
| **Pierre** (neutre) | résisté, neutralisé, au maximum | badges `neutral` |
| **Cyan** | esquive | `ESQUIVE !` |
| **Bleu ciel / rose** | camp gauche / camp droit | dés, barres de vie, accents |
| **Vert / rouge** (contours) | bonus / malus | zone d'état |
| **Double contour doré** | aura de personnage | zone d'état (`aura-token`) |
| **Couleur propre** | identité de chaque aura | `look.aura`, halo du modèle |

Le code couleur des textes flottants vit dans `TONE_CLASS` (`narration.ts`), sauf ceux du coup (dégâts, critique, esquive) et le titre violet, écrits en dur dans `Fighter.tsx`.

### 4.4 Les sons (20, un fichier chacun)

Les règles sont dans [SONS.md](SONS.md), qui fait foi ; cette section ne garde que les briques.

| Brique | Où | Rôle |
| --- | --- | --- |
| `sfx.<son>()` | `sound.ts` | un appel par signification (20), fichier sinon synthèse ; `sfx.crit` est le seul son composé (Coup + Grondement) |
| `play` | `sound.ts` | lit le fichier d'un son, coupé par `ms` (dé, pièce) ou par la vitesse, avec un fondu |
| `MIX`, `LEVEL` | `sound.ts` | volume de chaque son, par niveau d'intensité |
| `UNTIMED`, `setSoundSpeed` | `sound.ts` | sons jamais écourtés ; vitesse du combat |
| `cueOf` | `cues.ts` | le son d'une compétence ou d'un statut, déduit de ses effets (aura, polarité, type d'effet), sans aucun nom en dur |
| `addSpecial`, `sound` | `staging.ts` | le son d'un coup (Esquive, Coup critique, Coup), l'appel de `cueOf`, le son du signe d'un label ; un seul son par nom et par instant |

**Comment un son est choisi.** Aucun statut ni aucune compétence ne déclare son son. Les étapes du combat ont chacune le leur (SONS.md § 4.1) ; une compétence prend le premier son qui correspond à ce qu'elle a produit (`cueOf`, SONS.md § 4.2). Un nouveau contenu ne touche donc jamais au son, sauf s'il crée une nouvelle signification.

### 4.5 Les animations (CSS)

Toutes les durées du combat sont divisées par `--speed` (vitesse ×1, ×2, ×4), et `.is-paused` les fige (la secousse de l'arène aussi, depuis le moteur v2).

| Groupe | Classes |
| --- | --- |
| **Coup** | `lunge` (`--t-lunge`), `lunge-fast` (`--t-lunge-fast`), `hit`, `dodge`, `impact`, `damage-float` (`--t-float`), `dodge-text` (`--t-title`), `special-badge` (labels de coup spécial, ex-`crit-badge`), `crit-flash`, `crit-shake` |
| **Dé et pièce** | `die-rolling`, `die-landed`, `die-burst`, `die-slot`, `coin-flipping`, `coin-landed` |
| **Compétences et statuts** | `event-aura`, `char-aura` (halo, anneau, particules), `status-tremble`, `firefly-orbit`, `firefly` |
| **Métamorphose** | `form-out`, `form-in`, `morph-flash`, `morph-leaf` |
| **Zone d'état** | `status-pop`, `count-gain`, `count-loss`, `count-in-up` / `count-out-up`, `count-in-down` / `count-out-down`, `status-leave`, `aura-token` |
| **Fin** | `ko`, `victory`, `fade-in` |
| **Écrans** | `slide-in-left`, `slide-in-right`, `vs-slam`, `backdrop-figure`, `champion-rays`, `log-pop` |
| **Mortes** | `status-aura`, `status-halo` (anciens halos de statut, plus utilisés) |

**Le rythme**, lui, n'est pas dans le CSS : il est dans la table nommée de `timing.ts` (une constante par battement, de 60 à 1 300 ms), que la mise en scène (`staging.ts`) utilise pour dater ses cues. Les durées CSS qui doivent rester d'accord avec lui (l'élan de 750 ms et son impact à 300 ms, le vol d'un signal, la pièce, l'aura d'une compétence, la vie d'un texte flottant) lisent les variables `--t-*` qui en dérivent (`TIMING_VARS`, posées sur `.arena`).

### 4.6 Les icônes

Quatre tables relient les icônes peintes (`src/assets/icons/`) au jeu, dans `Icon.tsx` : `STATUS_ICON` (statut → icône peinte, empruntée par la compétence qui le pose), `STATE_ICON` (état de la zone d'état → emblème `state-*`, jamais une icône de compétence, 0.130.0), `MOMENT_ICON` (moment → pastille de déclencheur `badge-*`, zone d'état seulement, 0.130.0) et `SKILL_ICON` (compétence → icône) ; une relique prend le fichier qui porte son id (`RelicIcon`). Hors de la barre de compétences, un statut de la zone d'état montre l'emblème de son état, sans pastille (`statusIcon`, `StatusIcon`). Une icône manquante affiche l'initiale, et un test l'interdit pour un statut en jeu. Jamais d'emoji. Quand un état mérite un emblème : [EMBLEMES.md](EMBLEMES.md).

En attente : les deux états de réserve (Vulnérable, Esquive empêchée), sans porteur ([EMBLEMES.md](EMBLEMES.md) § 3) ; Garde sacrée et Régénération montreraient l'Immunité et le Soin.

---

## 5. Briques de l'interface

| Brique | Où | Ce qu'elle montre |
| --- | --- | --- |
| **En-tête du combat** | `HpBar` | nom, PV, trois dés de compétence (`SkillDice`) avec infobulle ; ceux de la forme en cours pour le druide |
| **Zone d'état** | `StatusTray` | bonus à gauche, malus à droite ; un médaillon par état et par moment (`trayStates`, [EMBLEMES.md](EMBLEMES.md)) : emblème, pastille de déclencheur en haut à gauche, un seul nombre en bas à droite, infobulle |
| **Zone des dés** | `FightScreen` | dés ou pièce, critique, marque « Imposé » |
| **Barre de commandes** | `.hud` | pause, vitesse (×1, ×2, ×4), journal (J), triche (C) |
| **Journal** | `CombatLog` | toutes les lignes de `narration`, copie de la trace |
| **Mode triche** | `CheatPad` | impose le prochain dé ; le combat est résolu à nouveau par le moteur |
| **Fiches et compendium** | `compendium/` | textes générés depuis les registres (`describe`, `statusRules`, `describeEvent`) |
| **Statistiques, tournoi, champion** | écrans | lectures de l'historique et de `computeStats` |

**Superpositions** : le z-index se règle au cas par cas : en-tête en 55, son en 60, zone d'état en 15 (60 au survol), journal en 45, HUD en 40. Il n'existe pas d'échelle commune, ce qui a déjà causé un défaut (§ 8).

---

## 6. Le contenu, vu comme des assemblages

Chaque famille est un assemblage de trois briques sur les faces 1, 2 et 3. Les variantes réutilisent les mêmes briques et ne changent que les stats.

| Famille | 1 | 2 | 3 (aura) | Briques mobilisées |
| --- | --- | --- | --- | --- |
| **Orc** | Pourfendre : un vrai coup sur un 1 ; s'il touche, Saignement 2 (`needsTouch`, 0.70.0 ; réaction `hurt` + `decays` du statut) | Furie des vents : `extraStrikes` | Puissance : `modifyOutgoing` +2 | plaie, rafale, sortant |
| **Elfe** | Œil de faucon : `forcesCrit` | Esquive améliorée : `forcesDodge` + `opacity` | Précision : `modifyStats` (multiplicateur) | critique forcé, esquive forcée, stats |
| **Nain** | Peau de pierre : `shield` 6 | Épines acérées : réaction `hurt` → Saignement sur l'attaquant (0.68.0) | Intimidation : `modifyIncoming` −2 | bouclier, réaction, entrant |
| **Mort-vivant** | Souffle de la tombe : poison (`onTurnStart`) | Vol de vie : `drainsHit` | Poison : `onTurnStart` sur l'adversaire | périodique, sur le coup |
| **Prêtresse** | Peur : `skipsAction` + `tremble` | Purification : `cleanse` du dernier bonus | Sainteté : `onTurnEnd` soin | contrôle, purge, périodique |
| **Voleuse** | Coup de chance : `extraStrikes` + d3 | Pile ou face : `coinToss` | Décoction : réaction `hit` → poison | rafale, pièce, réaction |
| **Paladin** | Rétribution : `release` (`fillsOnHurt`) | Riposte : `reflectsHit` | Immunité : `cleanse` + `immune` | jauges, renvoi, immunité |
| **Ogre** | Attente (malus sur soi) | Attente | Attente | aucune mécanique : un coup sacrifié et une marque |
| **Druide, homme** (Incantation : `modifyStats`, d3) | Foudre : `damage` 5, `scene` | Feux follets : Brûlure 3 (`onTurnEnd`) | Aura sauvage : `modifyOutgoing` +2, pour l'ours | statut de forme, dégâts directs, périodique, sortant (0.73.0) |
| **Druide, ours** (Force de l'ours : `modifyOutgoing` +4) | coup | coup | coup | statut de forme, sortant (0.73.0) |

**Briques en sommeil** (prêtes et testées, mais posées par personne) : Régénération (depuis la 0.73.0), Affaibli, Brèche, Vulnérable, Étourdi, Garde sacrée ; `reshapesHit` (depuis la 0.73.0) ; les conditions `when`, `chance` et `limit` ; dix déclencheurs ; `spentOnReaction` ; l'opposition (Poison ↔ Régénération ne se rencontrent jamais en jeu).

**Interactions systémiques déjà observées** : ce sont les familles de briques qui se rencontrent, avec les mesures de [EQUILIBRAGE.md](EQUILIBRAGE.md).

| Rencontre | Exemple | Effet mesuré |
| --- | --- | --- |
| **Dégâts sans fin contre soins cumulés** | Pourriture (sans durée) contre Aura de sainteté | druide contre prêtresses, de 65 à 69 % |
| **Réduction fixe contre petits coups** | Intimidation −2 contre le d7 des prêtresses | sans Aura de sainteté, Ysolde ne gagne que 0,7 % contre Brokk |
| **Soins cumulés contre dégâts faibles** | Aura de sainteté contre les coups rognés de Brokk | avec l'aura, les prêtresses le battent à 71-72 % |
| **Immunité contre malus** | Aura d'immunité contre Luciole, poison, peur | Aldric bat le druide à 62 % |
| **Plusieurs coups contre réactions par coup** | Furie des vents contre Épines | 12 dégâts renvoyés (voulu) |
| **Coup sacrifié contre « prochain coup »** | Vol de vie, Riposte, Luciole | la charge attend : règle à redire pour chaque nouveau statut |
| **Esquive imposée contre esquive à 0** | Esquive améliorée sous Luciole | l'esquive imposée passe quand même |
| **Purge contre cumul** | Purification contre une aura à 6 charges | tout part d'un coup |

---

## 7. Où naissent les effets de bord

### 7.1 La surface d'une mécanique

On compte les fichiers (hors tests) qui doivent connaître chaque mécanique. Plus ce nombre est grand, plus une décision simple a de conséquences.

| Mécanique | Fichiers | Lesquels |
| --- | --- | --- |
| Coup sacrifié (`forfeitsHit`) | **12** | moteur, événements, roster, écran, journal, trace, audit, stats, analyse, fin de combat, compendium, dés de compétence |
| Formes | **12** | personnage, moteur, roster, `staging`, `Fighter`, écran de combat, journal, trace, audit, compendium, infobulles, dés de compétence |
| Bouclier (`shield`) | **10** | moteur, registre, journal, trace, audit, stats, analyse, fin de combat, compendium, icônes |
| Coup transformé | **9** | moteur, événements, roster, écran, journal, trace, audit, compendium, dés de compétence |
| Purge (`cleanse`) | 8 | moteur, événements, roster, écran, journal, trace, audit, compendium |
| Pièce (`coinToss`) | 3 | moteur, registre, écran |
| Aura (`isAura`) | 4 | registre, écran, Fighter, zone d'état |
| La plupart des crochets de statut | 2 ou 3 | moteur, registre, et parfois l'écran |

**Lecture** : les crochets de statut ont une petite surface, parce que le registre les décrit et que le moteur les applique. C'est le modèle qui marche. Les mécaniques d'**action** (sacrifié, transformé, formes) touchent tout : chaque lecture de la chronologie doit les comprendre.

### 7.2 Les connaissances qui fuient hors des registres

Le registre de `statuses.ts` se dit « entièrement décrit ici, règles ET présentation ». Ce n'est plus vrai. La présentation d'un statut est répartie entre quatre endroits :

| Aspect | Où il vit |
| --- | --- |
| Nom, description, couleur d'aura, mouvement | `statuses.ts` (`look`) |
| Icône | `Icon.tsx` (`STATUS_ICON`) |
| Son | `staging.ts` (`cueOf` et branches par type d'étape) |
| Texte flottant (ton, écho, sous-titre) | `narration.ts` (`effectBadge`) et `staging.ts` (`fxFloats`, heuristique d'écho) |
| Mise en scène (coup avec élan, réaction sans élan) | `staging.ts`, selon `reflectsHit` ou `drainsHit` |
| Rythme | table nommée de `timing.ts` |

Exemples concrets de connaissances implicites :
- **Un futur Étourdi sonnera comme la Peur** : toute étape `skip` joue Tour perdu. C'est voulu depuis la 0.36.2 (`SONS.md`, un son par signification).
- **Un futur malus qu'un personnage se pose à lui-même sonnera Malus reçu**, comme l'Attente de l'ogre (`cueOf`) : voulu depuis la 0.36.2.
- **Un nouveau statut de renvoi de dégâts** devra être ajouté à la main dans la branche `statusReaction`, sinon il sera joué comme des Épines.
- **Le coup transformé** est retrouvé par l'écran en relisant la définition de la compétence (`events.find(…).reshapesHit`).

### 7.3 Le coup : ce qui reste codé à la main

Depuis le 2026-10-21 (décision de l'utilisateur), tout ce qui réagit à un coup qui touche passe par les fenêtres génériques : Vol de vie dans `hit` de l'attaquant, Riposte et jauges de Rétribution dans `hurt` du défenseur, à leur rang parmi ses statuts. Seules restent écrites à la main dans `strikeOnce`, avant les fenêtres, l'usure au coup (`spentOnHurt`, `spentOnHit`) et la charge de Vol de vie perdue sur une esquive. Une pile qui touche ouvre les mêmes fenêtres, donc les mêmes réactions.

Un couplage croisé demeure :
- **Jauges** : Rétribution ne se remplit que si le personnage possède une compétence qui la relâche. Le moteur parcourt pour cela les compétences du défenseur : un statut dépend du roster.

La Riposte et le vol de vie, devenus des réactions, respectent « pas de chaîne » par la règle même.

### 7.4 Les lectures qui réinterprètent

Cinq lectures parcourent la chronologie : écran, journal, trace, audit, statistiques et analyse. Chacune réimplémente une partie de la compréhension des mécaniques :
- `analysis` reconnaît la rafale (le premier coup est normal, les suivants sont l'apport de la Furie) et cherche *le* statut `forcesDodge` pour lui attribuer une esquive imposée. Un second statut d'esquive imposée serait mal compté.
- `stats` compte les coups sacrifiés à part ;
- `audit` refait les formes, les boucliers multiples et les coups transformés ;
- `trace` et `narration` décrivent les mêmes faits avec deux vocabulaires.

Une nouvelle mécanique doit donc être enseignée à chacune. C'est ce qui s'est produit à l'arrivée du druide : l'audit ne connaissait ni les formes, ni les coups transformés, ni les boucliers multiples.

### 7.5 Ce que le joueur ne voit pas

| Information | Visible | Où elle se perd |
| --- | --- | --- |
| Modificateurs du coup (Luciole +2, puissance +2, intimidation −2) | journal seulement | le chiffre flottant ne montre que le total |
| Armure et boucliers retenus | journal seulement | idem |
| Relance secrète du Coup de griffe | jamais (voulu) | — |
| Charge qui attend (Vol de vie, Riposte) après un coup sacrifié | zone d'état seulement | rien ne dit « elle attend » |
| Statut bloqué par l'immunité | badge « résisté » | — |

C'est le pendant visuel de la question « pourquoi ce coup fait 9 ? ».

### 7.6 Données et doc qui ne suivent plus

- `look.glow` est renseigné sur 11 statuts, mais n'est plus dessiné. Les classes `.status-aura` et `.status-halo` sont mortes.
- Le commentaire d'en-tête de `roster.ts` ne décrit que les six premières races.

---

## 8. Les effets de bord déjà rencontrés (base de cas)

Chaque défaut passé montre un couplage. Ils servent de tests de pensée pour toute nouvelle brique.

| Version | Défaut | Couplage en cause |
| --- | --- | --- |
| 0.32.0 | La Riposte s'éteignait quand l'adversaire sacrifiait son coup | durée (`turns`) × coup sacrifié |
| 0.34.0 | Le coup fatal ne comptait que les PV restants | statistiques × application (overkill) |
| 0.34.0 | Deux textes pour un même événement (Aura de puissance) | compétence × statut posé × texte flottant |
| 0.34.0 | Un halo par statut, cumulés sur le modèle | `look` × nombre de statuts |
| 0.35.0 | L'Attente sans durée ne retombait jamais | statut × absence de `turns` |
| 0.35.0 | L'audit ignorait formes, coups transformés et boucliers multiples | mécanique × lectures (§ 7.4) |
| 0.35.1 | Le bouton de son caché sous l'en-tête du combat | z-index locaux (§ 5) |
| 0.35.1 | Le son coupé par un contexte audio en veille | son × gestes de l'utilisateur |
| 0.35.2 | Luciole +2 fait passer le druide de 49 à 53 % | valeur d'une compétence × personnage déjà équilibré |

---

## 9. Pistes pour penser en systèmes (questions ouvertes)

Ce ne sont pas des décisions. Chaque piste répond à un constat ci-dessus et sera à confronter avec la réflexion de l'utilisateur sur les règles des autobattlers.

1. **Une fiche sensorielle par brique, dans le registre.** Chaque statut et chaque compétence déclarerait son son, sa mise en scène (coup avec élan, réaction, aura), son ton de texte et son icône, au lieu que `useCombat` les déduise. On répond à § 7.2. Cela rejoint le point 9 de [TODO.md](TODO.md) (catalogue invocable).
2. **Une chaîne du coup en étapes nommées.** On remplacerait la suite écrite à la main de `strikeOnce` par une liste ordonnée de crochets « après le coup » (usure, vol, renvoi, jauges), comme les fenêtres. On répond à § 7.3. Le moteur gagnerait en lisibilité, et l'ordre deviendrait une donnée.
3. **Un seul interprète de la chronologie.** Statistiques, analyse, audit et journal partageraient une même lecture « qui a fait quoi à qui, grâce à quelle brique ». Une nouvelle mécanique ne s'enseignerait alors qu'une fois. On répond à § 7.4.
4. **Une table du tempo.** Les 34 attentes deviendraient des durées nommées (élan, impact, titre, pause de phase), partagées avec le CSS. Ce serait aussi la base d'une éventuelle timeline (GSAP, point 9 de TODO).
5. **Rendre les modificateurs visibles.** Une petite ligne sous le chiffre de dégâts (« +2 lucioles, −2 intimidation ») répondrait à § 7.5.
6. **Une échelle de couches** pour l'écran (arène, combattants, textes, en-tête, infobulles, fenêtres) au lieu de z-index locaux.
7. **Une liste de contrôle par brique**, tirée de § 2.2 et § 8 : qu'arrive-t-il sur un coup sacrifié, une rafale, une esquive imposée, une immunité, une purge, un K.O. au milieu, la triche ? `validateRoster` pourrait en vérifier une partie.
8. **Réveiller les briques en sommeil** avant d'en créer de nouvelles : déclencheurs, conditions, statuts à venir. Ce sont déjà des systèmes testés.
