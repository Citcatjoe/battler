/*
 * Le rythme du combat à l'écran (docs/MOTEUR_V2.md § 4) : toutes les durées de la mise en scène, en millisecondes
 * à ×1, une constante par battement. La mise en scène (`staging.ts`) date ses cues avec cette table ; le lecteur
 * (`useCombat.ts`) les divise par la vitesse. Régler le rythme, c'est modifier cette table, et elle seule.
 *
 * Les animations CSS qui doivent tomber d'accord avec ces durées (l'élan et son impact, le vol d'un signal, la pièce
 * qui tournoie, l'aura d'une compétence, la vie d'un texte flottant) lisent les variables de `TIMING_VARS`, posées sur
 * la racine de l'arène (FightScreen) : `calc(var(--t-lunge) / var(--speed))`. Aucune durée n'y est recopiée à la main.
 * Valeurs reprises telles quelles du rejoueur de la 0.80.2 (iso-rendu).
 */

/* ---------- Ouverture et fin ---------- */

/**
 * Silence avant le premier jet d'initiative (pas en combat test). 1 400 ms depuis la 0.91.0 (500 avant) : le cri de
 * guerre du bouton « Jouer » (1,74 s) y retombe avant que les dés roulent (SONS.md, règle 8)
 */
export const INTRO = 1400
/** Lecture d'un jet d'initiative, une fois les deux dés posés */
export const INITIATIVE_READ = 1000
/** Lecture de « … frappe en premier » avant le premier tour */
export const FIRST_READ = 700
/** Le K.O. tombe, puis la victoire sonne */
export const KO_HOLD = 1000
/** Après le son de la victoire, avant l'écran de fin */
export const VICTORY_HOLD = 1200

/* ---------- Tour ---------- */

/** Passage de main : le plateau se vide et annonce le suivant, son camp s'allume */
export const HANDOVER = 400

/* ---------- Dés ---------- */

/** Un dé roule (coup ordinaire) */
export const DICE_ROLL = 800
/** Plusieurs dés roulent ensemble (initiative, rafale, paire de la barde) */
export const DICE_ROLL_MANY = 900
/** Lecture du résultat d'un coup avant l'élan (ou avant le critique) */
export const DICE_READ = 350
/** Lecture des dés d'une rafale ou d'une paire, une fois posés */
export const DICE_LAND_HOLD = 400
/** Rafale instantanée (Furie des vents) : ses dés apparaissent à plat, un temps pour les voir */
export const VOLLEY_FLAT = 250
/** Coup sacrifié par une compétence sans compétence qui suive aussitôt : temps de lecture du dé */
export const FORFEIT_HOLD = 650
/** Coup sacrifié d'une rafale : lecture du dé (`VOLLEY_FORFEIT_SNAP` si sa compétence suit aussitôt) */
export const VOLLEY_FORFEIT_HOLD = 250
export const VOLLEY_FORFEIT_SNAP = 120

/* ---------- Coup ---------- */

/** Le critique s'annonce sous le dé avant l'élan */
export const CRIT_ANNOUNCE = 450
/**
 * Élan vers l'adversaire jusqu'à l'impact. Doit rester vers 40 % de `LUNGE` (l'animation `.lunge` touche à 42 %) :
 * changer l'un, c'est changer l'autre.
 */
export const WIND = 300
/** Durée de l'animation d'élan (`.lunge`, index.css), qui revient en place après l'impact */
export const LUNGE = 750
/** Arrêt sur image avant l'impact d'un critique */
export const CRIT_FREEZE = 110
/** Après l'impact, avant que le coup s'efface (`STRIKE_FLOW_HOLD` si une plaie coule sur ce coup) */
export const STRIKE_HOLD = 550
export const STRIKE_FLOW_HOLD = 650
/** Repos après un coup (ou après le dernier coup d'une rafale) */
export const STRIKE_REST = 450
/** Coup de rafale : élan court jusqu'à l'impact ; vers 40 % de `LUNGE_FAST` (`.lunge-fast`) */
export const VOLLEY_WIND = 170
export const LUNGE_FAST = 420
/** Arrêt sur image avant l'impact d'un critique en rafale */
export const VOLLEY_CRIT_FREEZE = 90
/** Coup de rafale : après l'impact (`VOLLEY_FLOW_HOLD` si une plaie coule), puis l'écart avant le suivant */
export const VOLLEY_STRIKE_HOLD = 260
export const VOLLEY_FLOW_HOLD = 220
export const VOLLEY_GAP = 60
/** La plaie qui coule sur un coup : ses PV tombent un battement après son label */
export const BLEED_DELAY = 140
/** Le son du statut posé par un coup (poison de l'Aura de décoction) suit le Coup d'un battement */
export const RIDE_CUE = 120

/* ---------- Coups de compétence (Rétribution, pièce, Riposte, Foudre) ---------- */

/** Après l'apparition des effets, avant le premier coup */
export const BLOWS_LEAD = 200
/** Élan d'un coup de compétence (`BLOW_WIND_REACTION` : sans élan, une réaction) */
export const BLOW_WIND = 170
export const BLOW_WIND_REACTION = 60
/** Arrêt sur image avant un coup lourd */
export const HEAVY_FREEZE = 90
/** Après un coup de la série, et après le dernier */
export const BLOW_HOLD = 260
export const BLOW_LAST_HOLD = 520
/** Après la série, une fois l'étape appliquée */
export const BLOWS_HOLD = 500

/* ---------- Effets (compétence, statut, relique) ---------- */

/** Attente avant l'apparition d'un effet (0 quand il tombe avec le dé qui le déclenche) */
export const LEAD = 250
/** Vol d'un signal d'activation, du sceau à la zone d'état (`.signal-orb`) */
export const SIGNAL = 340
/** Temps de lecture d'un effet ; c'est aussi la durée de l'aura d'une compétence (`.event-aura`) */
export const READ_HOLD = 1300
/** Lecture plus courte quand une rafale instantanée suit l'effet */
export const FLURRY_CHAIN_HOLD = 500
/** Plaie qui coule hors d'un coup (Saignement en réaction) */
export const WOUND_HOLD = 700
/** Un décompte ou une expiration qui n'ont pas été montrés avec l'effet de leur statut */
export const COUNT_HOLD = 650

/* ---------- Pile ou face ---------- */

/** La pièce tournoie (`.coin-flipping`, un tour d'animation) */
export const COIN_SPIN = 1200
/** Lecture du résultat avant la frappe */
export const COIN_READ = 650
/** Après le coup de pile ; après face */
export const COIN_HEADS_HOLD = 700
export const COIN_TAILS_HOLD = 1000

/* ---------- Textes flottants et secousse ---------- */

/** Vie d'un texte flottant (`.damage-float`, `.damage-sink`) : il est retiré de la liste ensuite */
export const FLOAT_LIFE = 1700
/** Vie d'un titre (`.dodge-text` : nom de compétence, ESQUIVE, CRITIQUE) */
export const TITLE_LIFE = 1500
/** Secousse de l'arène sur un gros coup ; sur un critique ou un coup lourd */
export const SHAKE = 350
export const SHAKE_HEAVY = 500

/**
 * Variables CSS dérivées de cette table, posées sur la racine de l'arène. Les animations du combat les lisent au
 * lieu de recopier leurs durées (index.css).
 */
export const TIMING_VARS = {
  '--t-lunge': `${LUNGE}ms`,
  '--t-lunge-fast': `${LUNGE_FAST}ms`,
  '--t-signal': `${SIGNAL}ms`,
  '--t-coin-spin': `${COIN_SPIN}ms`,
  '--t-read': `${READ_HOLD}ms`,
  '--t-float': `${FLOAT_LIFE}ms`,
  '--t-title': `${TITLE_LIFE}ms`,
} as const
