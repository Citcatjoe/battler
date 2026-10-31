import { useMemo, useState, type ReactNode } from 'react'
import campaignImg from '../assets/menu-campaign.jpg'
import { hashSeed } from '../game/analysis'
import { describeSkill, DIE_FACES } from '../game/events'
import {
  ACT_FIGHTS,
  ACT_LENGTH,
  BOSS,
  campaignCharacter,
  championOf,
  dangerOf,
  drawHeritage,
  ENCOUNTER_CHOICES,
  heritageFor,
  heritageSlot,
  heritableGains,
  isBossNode,
  loadCampaignChoices,
  opponentOf,
  runTriggers,
  saveCampaignChoice,
  startAurasOf,
  type CampaignChoice,
  type CampaignRun,
  type Encounter,
  type HeritageItem,
} from '../game/campaign'
import { SIDE_STYLE } from '../game/combat'
import { REWARDS, type PendingReward } from '../game/offers'
import type { Character } from '../game/character'
import { rollFace } from '../game/events'
import { stepLabel } from '../game/forge'
import { MASTERIES, masteryOfSkill } from '../game/masteries'
import { getRelic } from '../game/relics'
import { CHARACTERS, createCharacter } from '../game/roster'
import { skillById } from '../game/skills'
import { randomSeed, seededRng } from '../game/rng'
import { sfx } from '../game/sound'
import { DieBuild } from './DieBuild'
import { VictoryBackdrop } from './ChampionScreen'
import { Fighter } from './Fighter'
import { ForgeCard, ForgeChoice, ForgedDie, useForgeChoice } from './ForgedDie'
import { BackLink, Button, Glyph, SquareButton } from './kit'
import { PortraitTile } from './Portrait'
import { MasteryIcon } from './Icon'
import { MiniPortrait } from './RecordBits'
import { RelicCard, RelicRow } from './RelicSeal'
import { SkillTooltip } from './SkillDice'
import { SkillSeal } from './SkillSeal'
import { StatSheet } from './StatSheet'
import { Switch } from './Switch'
import { CampaignWelcome } from './CampaignWelcome'

/*
 * La campagne (0.88.0, docs/CAMPAGNE.md) : le choix du champion et de son héritage, l'accueil de la campagne
 * (CampaignWelcome.tsx), la carte de l'acte (le champion, son dé forgé, ses reliques, et les adversaires du nœud avec leur
 * bande de danger), la récompense de chaque victoire (une relique ou une forge) et la fin de la partie. Aucune règle ici :
 * tout vient de campaign.ts et forge.ts ; App tient la partie.
 */

/**
 * Le départ choisi (0.131.0) : le champion, son aura, l'objet d'héritage repris s'il y en a un. « Choisir ce champion »
 * (ou « Commencer » après l'héritage) le donne à App, qui crée la partie.
 */
export interface CampaignStart {
  championId: string
  seed: number
  aura: string
  heritage?: HeritageItem
}

interface Props {
  run: CampaignRun | null
  /** Les héritages de chaque personnage (campaign.ts, `loadHeritage`) */
  heritage: Readonly<Record<string, HeritageItem[]>>
  onStart: (start: CampaignStart) => void
  onFight: (encounter: Encounter) => void
  onReward: (gain: HeritageItem | undefined) => void
  onAbandon: () => void
  onNewRun: () => void
  onMenu: () => void
}

/**
 * Sans partie (0.131.2, même structure que le tournoi : un choix, une explication, une sélection) : l'accueil de la
 * campagne (parcours et classement), puis le choix du champion (et de son héritage), d'où part l'acte I. Après une partie
 * (« Nouvelle campagne », « Terminer l'aventure »), on revient droit au choix du champion, sur le champion de cette
 * partie (retour du 2026-10-30 : après une défaite, on veut souvent le reprendre). Le champion montré survit à
 * l'aller-retour vers l'accueil.
 */
export function CampaignScreen({ run, heritage, onStart, onFight, onReward, onAbandon, onNewRun, onMenu }: Props) {
  const [championId, setChampionId] = useState(CHARACTERS[0].id)
  const [drafting, setDrafting] = useState(false)
  if (!run) {
    if (!drafting)
      return (
        <CampaignWelcome
          onBack={onMenu}
          onNext={() => {
            sfx.click()
            setDrafting(true)
          }}
        />
      )
    return (
      <ChampionDraft
        heritage={heritage}
        championId={championId}
        onSelect={setChampionId}
        onChoose={onStart}
        onBack={() => {
          sfx.click()
          setDrafting(false)
        }}
      />
    )
  }
  if (run.outcome)
    return (
      <RunEnd
        run={run}
        onNewRun={() => {
          setChampionId(run.championId)
          setDrafting(true)
          onNewRun()
        }}
        onMenu={onMenu}
      />
    )
  if (run.reward) return <Reward run={run} onReward={onReward} />
  return <ActMap run={run} onFight={onFight} onAbandon={onAbandon} onMenu={onMenu} />
}

/** Fond commun des écrans de la campagne : la pierre sombre de l'affrontement. */
function Backdrop({ children }: { children: ReactNode }) {
  return <div className="fade-in relative flex h-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#57534e_0%,#1c1917_45%,#0c0a09_80%)]">{children}</div>
}

function Header({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="relative flex flex-col items-center gap-2 pt-8 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">{kicker}</p>
      <h1 className="font-display text-5xl font-extrabold text-amber-100">{title}</h1>
      {sub && <p className="max-w-4xl font-body text-xl text-ink-2">{sub}</p>}
    </header>
  )
}

/* ---------- Choix du champion et de son héritage ---------- */

/**
 * Le choix du champion (retour du 2026-10-27, docs/ref/campagne-champion.png) : tous les personnages en portraits, le
 * champion choisi en grand (illustration, fiche de l'affrontement, ligne de lore en citation), son aura de départ (une
 * tuile par aura de ses deux maîtrises, docs/MAITRISES.md § 5 et § 12 ; le dé de la fiche la montre sur son 1) et son
 * héritage, optionnel par un interrupteur. Aura et héritage sont mémorisés par champion (`loadCampaignChoices`).
 * Héritage actif et disponible sur le dé de cette aura (`heritageFor`) : « Choisir ce champion » ouvre le choix de
 * l'amélioration (`HeritagePick`) ; sinon la partie part sans. Exporté pour les tests de rendu.
 */
export function ChampionDraft({
  heritage,
  championId,
  onSelect,
  onChoose,
  onBack,
}: Pick<Props, 'heritage'> & { championId: string; onSelect: (id: string) => void; onChoose: (start: CampaignStart) => void; onBack: () => void }) {
  const [seed] = useState(randomSeed)
  const champion = CHARACTERS.find((c) => c.id === championId) ?? CHARACTERS[0]
  const [choices, setChoices] = useState(loadCampaignChoices)
  const [picking, setPicking] = useState(false)
  // L'aura mémorisée, si elle est toujours une de ses auras de départ ; sinon la première (l'aura par défaut)
  const auras = startAurasOf(champion.id)
  const remembered = choices[champion.id]?.aura
  const aura = remembered && auras.includes(remembered) ? remembered : auras[0]
  const shown = useMemo(() => createCharacter(champion.id, { aura }), [champion.id, aura])
  const items = heritageFor(champion.id, aura, heritage[champion.id] ?? [])
  const withHeritage = items.length > 0 && choices[champion.id]?.heritage !== false
  const choose = (item?: HeritageItem) => onChoose({ championId: champion.id, seed, aura, ...(item && { heritage: item }) })
  if (picking && withHeritage)
    return <HeritagePick champion={shown} items={items} seed={seed} onBack={() => setPicking(false)} onPick={choose} />
  const select = (c: Character) => {
    if (c.id === champion.id) return
    sfx.click()
    onSelect(c.id)
  }
  const remember = (choice: Partial<CampaignChoice>) => {
    sfx.click()
    saveCampaignChoice(champion.id, choice)
    setChoices({ ...choices, [champion.id]: { ...(choices[champion.id] ?? { heritage: true }), ...choice } })
  }
  return (
    <Backdrop>
      {/* Le vestiaire sous les gradins : la sortie vers l'arène tombe derrière le champion, à contre-jour */}
      <img
        src={campaignImg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[50%_60%] opacity-60"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_22%_55%,rgba(12,10,9,0.15)_0%,rgba(12,10,9,0.6)_50%,rgba(12,10,9,0.85)_100%)]" />
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-side-a/10 to-transparent" />
      <BackLink onClick={onBack} className="absolute left-10 top-[36px] z-30">
        Accueil de la campagne
      </BackLink>
      <header className="absolute inset-x-0 top-[26px] flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">Campagne</p>
        <h1 className="font-display text-[40px] font-extrabold leading-tight text-amber-100">Choisissez votre champion</h1>
        <p className="font-body text-lg text-ink-2">Il mène seul les {ACT_LENGTH} combats de l'acte, jusqu'au boss. Une défaite met fin à la partie.</p>
      </header>

      {/* Tous les combattants, sans nom (le sélecteur du duel) ; « Au hasard » termine la rangée */}
      <div className="matchup-picker absolute left-1/2 top-[146px] z-20 flex max-w-[1000px] -translate-x-1/2 items-center gap-2">
        <ul className="matchup-picker-row" aria-label="Champions">
          {CHARACTERS.map((c) => (
            <li key={c.id} className="shrink-0">
              <PortraitTile
                character={c}
                side={0}
                state={c.id === champion.id ? 'selected' : 'idle'}
                selection="a"
                onClick={() => select(c)}
                title={c.name}
                aria-label={c.name}
                className="matchup-picker-tile"
              />
            </li>
          ))}
        </ul>
        {/* « Au hasard » : un autre champion que celui montré (hasard d'interface, aucune règle) */}
        <SquareButton
          icon="hasard"
          label="Un champion au hasard"
          onClick={() => {
            const others = CHARACTERS.filter((c) => c.id !== champion.id)
            select(others[Math.floor(Math.random() * others.length)])
          }}
          className="shrink-0"
        />
      </div>

      {/* L'illustration, au sol, le regard vers le centre (le traitement de l'affrontement) */}
      <div key={champion.id} className="slide-in-left pointer-events-none absolute bottom-[117px] left-[80px] top-[270px] w-[440px]">
        <Fighter character={champion} side={0} anchor="body" />
      </div>

      {/* La fiche de l'affrontement en duel : nom, race · classe, stats, dé de combat */}
      <section className="absolute left-[578px] top-[276px] z-20 w-[378px]" aria-label="Le champion">
        <h2 className="matchup-name text-side-a-hi">{champion.name}</h2>
        <p className="matchup-race mb-[12px] font-body text-[15px] leading-5 text-ink-2">
          {champion.race} · {champion.archetype}
        </p>
        <div className="matchup-panel fighter-panel side-a flex h-[339px] flex-col px-[18px]">
          <StatSheet character={shown} barClass={SIDE_STYLE[0].bar} trackClass={SIDE_STYLE[0].track} className="mt-[13px] h-[160px] shrink-0 justify-around" />
          <div className="matchup-rule mt-[12px]" />
          <div className="mt-[10px]">
            <DieBuild key={`${champion.id}:${aura}`} character={shown} />
          </div>
        </div>
      </section>

      {/* L'aura de départ (maîtrises V3, docs/MAITRISES.md § 5 et § 12) : une tuile de contenu par aura de ses deux
          maîtrises, la choisie au cadre du camp ; le 1 du dé de la fiche la montre ; mémorisée par champion */}
      <StartAuraRow auras={auras} chosen={aura} onChoose={(a) => a !== aura && remember({ aura: a })} />

      {/* La ligne de lore en citation, puis l'héritage */}
      <div className="absolute left-[1000px] top-[356px] z-20 flex w-[356px] flex-col gap-8">
        <figure className="flex gap-3">
          <span aria-hidden className="font-display text-[56px] leading-[0.8] text-[#b07a3f]">«</span>
          <blockquote className="flex flex-col gap-5">
            <p className="font-body text-[20px] italic leading-snug text-ink-1">{champion.definition.lore.background}</p>
            <span aria-hidden className="h-px w-14 bg-gold-500/70" />
          </blockquote>
        </figure>
        <button
          type="button"
          role="switch"
          aria-checked={withHeritage}
          disabled={items.length === 0}
          onClick={() => remember({ heritage: !withHeritage })}
          className="flex flex-col gap-2 rounded-(--r-xs) border border-line-2 bg-surface-1/80 px-4 py-4 text-left transition-colors enabled:hover:bg-surface-3 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-200"
        >
          <span className="flex items-center gap-4 font-body text-[16px] font-bold text-ink-1">
            Activer l'héritage
            <Switch on={withHeritage} />
          </span>
          <span className="font-body text-[14px] text-ink-3">
            {items.length ? 'Récupère un objet de la dernière partie perdue de ce champion.' : 'Aucune partie précédente pour ce champion.'}
          </span>
        </button>
      </div>

      <div className="absolute inset-x-0 top-[833px] flex -translate-y-1/2 justify-center">
        <Button variant="primary" size="xl" icon="combattre" onClick={() => (withHeritage ? setPicking(true) : choose())} className="w-[560px]">
          Choisir ce champion
        </Button>
      </div>
    </Backdrop>
  )
}

/**
 * La rangée « Aura de départ » : l'icône peinte de chaque aura (son sceau), son nom et l'emblème de sa maîtrise ; la
 * ligne d'effet de l'aura choisie à côté du titre, celle des autres au survol. Des tuiles de contenu, pas des boutons de
 * commande : « Choisir ce champion » reste le bouton du kit.
 */
function StartAuraRow({ auras, chosen, onChoose }: { auras: readonly string[]; chosen: string; onChoose: (aura: string) => void }) {
  const line = describeSkill(skillById(chosen)).text
  return (
    <div className="absolute left-[578px] top-[690px] z-30 flex w-[778px] flex-col gap-1.5" aria-label="Aura de départ">
      <p className="flex items-baseline gap-3 truncate">
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.25em] text-gold-300">Aura de départ</span>
        <span className="truncate font-body text-[15px] text-ink-2">{line}</span>
      </p>
      <ul className="flex gap-2">
        {auras.map((id) => {
          const skill = skillById(id)
          const mastery = masteryOfSkill(id)
          return (
            <li key={id} className="group relative min-w-0 flex-1 hover:z-[70]">
              <button type="button" className="aura-tile" aria-pressed={id === chosen} onClick={() => onChoose(id)}>
                <span className="relative shrink-0">
                  <SkillSeal id={id} size={40} />
                  {mastery && <MasteryIcon id={mastery} name={MASTERIES[mastery].name} className="absolute -bottom-1 -right-1.5 h-5 w-5 text-[11px]" />}
                </span>
                <span className="flex min-w-0 flex-col text-left">
                  <span className="line-clamp-2 font-body text-[15px] font-bold leading-[1.15] text-ink-1">{skill.name}</span>
                  {mastery && <span className="truncate font-body text-[11px] font-bold uppercase tracking-[0.12em] text-gold-300">{MASTERIES[mastery].name}</span>}
                </span>
              </button>
              {id !== chosen && <SkillTooltip event={skill} face={1} placement="above" align="center" />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const heritageKey = (item: HeritageItem) => (item.kind === 'relic' ? item.relic : JSON.stringify(item.step))

function HeritageCard({ item, champion, selected, mark, onSelect }: { item: HeritageItem; champion: Character; selected: boolean; mark?: string; onSelect: () => void }) {
  return item.kind === 'relic' ? (
    <RelicCard relic={getRelic(item.relic)} selected={selected} mark={mark} onSelect={onSelect} />
  ) : (
    <ForgeCard offer={item.step} character={champion} selected={selected} mark={mark} onSelect={onSelect} />
  )
}

/**
 * L'héritage (§ 8) : une amélioration de sa dernière partie, parmi trois au plus. Rien n'est choisi d'avance (retour du
 * 2026-10-27, U4 : la carte présélectionnée « Choix d'Elaria », une relique, partait dès qu'on lançait sans avoir
 * cliqué la carte voulue, un sort) : « Commencer » attend une carte, et seule la carte choisie porte une marque. Il
 * lance la partie.
 */
export function HeritagePick({ champion, items, seed, onBack, onPick }: { champion: Character; items: HeritageItem[]; seed: number; onBack: () => void; onPick: (item: HeritageItem) => void }) {
  const offer = useMemo(() => drawHeritage(items, seededRng(hashSeed(`campagne:${seed}:heritage`))), [items, seed])
  const [picked, setPicked] = useState<HeritageItem>()
  return (
    <Backdrop>
      <Header kicker="Héritage" title={`${champion.name} reprend une amélioration`} sub="Une seule, parmi celles de sa dernière partie : choisissez sa carte." />
      <div className="relative flex flex-1 items-center justify-center gap-8">
        {offer.map((item) => (
          <HeritageCard
            key={heritageKey(item)}
            item={item}
            champion={champion}
            selected={picked === item}
            mark={picked === item ? 'Votre choix' : undefined}
            onSelect={() => setPicked(item)}
          />
        ))}
      </div>
      <div className="relative flex items-center justify-center gap-6 pb-10">
        <BackLink onClick={onBack}>Champion</BackLink>
        <Button variant="primary" size="xl" icon="combattre" disabled={!picked} onClick={() => picked && onPick(picked)} className="w-96">
          Commencer
        </Button>
      </div>
    </Backdrop>
  )
}

/* ---------- La carte de l'acte ---------- */

/** La piste de l'acte : ses combats (`ACT_FIGHTS`), une récompense (losange) après chacun, puis le boss. */
function ActTrack({ run }: { run: CampaignRun }) {
  return (
    <ol className="flex items-center" aria-label="L'acte">
      {Array.from({ length: ACT_LENGTH }, (_, node) => {
        const fight = run.fights[node]
        const boss = node === ACT_FIGHTS
        const state = fight ? (fight.won ? 'done' : 'lost') : node === run.wins && !run.outcome ? 'current' : 'next'
        // La récompense du combat précédent (une relique ou une forge), entre lui et ce nœud ; celle que l'héritage
        // remplace est déjà reçue (`heritageSlot`)
        const reward = node > 0 ? REWARDS[node - 1] : undefined
        const inherited = node - 1 === heritageSlot(run)
        return (
          <li key={node} className="flex items-center">
            {reward && (
              <>
                <span className="act-link" data-done={node <= run.wins ? '' : undefined} />
                <span
                  className="act-forge"
                  data-done={inherited || run.wins >= node ? '' : undefined}
                  title={inherited ? `${reward === 'relic' ? 'La relique' : 'La forge'} du combat ${node} : reçue en héritage` : `${reward === 'relic' ? 'Une relique' : 'Une forge du dé'} après le combat ${node}`}
                />
                <span className="act-link" data-done={node <= run.wins ? '' : undefined} />
              </>
            )}
            <span className="act-node" data-state={state} data-boss={boss ? '' : undefined} title={boss ? BOSS.name : `Combat ${node + 1}`}>
              {fight ? <MiniPortrait character={campaignCharacter(fight.opponentId)} size="h-full w-full" /> : boss ? <Glyph name="tournoi" size={24} /> : node + 1}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Le départ du champion (maîtrises, docs/MAITRISES.md § 5) : l'aura de départ choisie, sur le 1, et sa compétence de
 * personnage, sur le 2, chacune avec les faces qui la portent (une copie en ajoute une).
 */
function StartSkills({ character, aura }: { character: Character; aura: string }) {
  return (
    <>
      <StartSkillLine character={character} id={aura} label="Aura de départ" />
      <StartSkillLine character={character} id={character.definition.signature} label="Compétence" />
    </>
  )
}

function StartSkillLine({ character, id, label }: { character: Character; id: string | undefined; label: string }) {
  const printed = character.events.filter((e) => e.id === id)
  if (printed.length === 0) return null
  const faces = printed.flatMap((e) => rollFace(e.trigger) ?? []).map((f) => `le ${f}`)
  return (
    <p className="flex items-center gap-2 font-body text-[15px] text-ink-2">
      <SkillSeal id={printed[0].id} size={32} />
      <span>
        {label} : <b className="text-ink-1">{printed[0].name}</b>
        {faces.length > 0 && `, sur ${faces.length > 1 ? `${faces.slice(0, -1).join(', ')} et ${faces.at(-1)}` : faces[0]}`}
      </span>
    </p>
  )
}

/** Le champion tel qu'il est : son portrait en pied, son dé forgé, ses reliques. */
function ChampionPanel({ champion, run }: { champion: Character; run: CampaignRun }) {
  return (
    <section className="relative flex w-[560px] shrink-0 flex-col items-start justify-end gap-3 pb-6 pl-14 pt-12" aria-label="Le champion">
      {/* Le portrait prend la hauteur que le dé, les reliques et l'héritage laissent : il ne monte jamais sur la piste de l'acte */}
      <div className="min-h-0 w-[360px] flex-1">
        <Fighter character={champion} side={0} anchor="inside" />
      </div>
      <div className="relative z-10">
        <h2 className="font-display text-5xl font-extrabold text-side-a-hi">{champion.name}</h2>
        <p className="font-body text-lg text-ink-2">
          {champion.race} · {champion.archetype} · {champion.maxHp} PV
        </p>
        <StartSkills character={champion} aura={run.aura} />
      </div>
      <div className="relative z-10 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-ink-3">Son dé · d{DIE_FACES}</span>
        <ForgedDie character={champion} size="md" tooltip="above" />
      </div>
      {champion.relics.length > 0 && (
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-ink-3">Reliques</span>
          <RelicRow relics={champion.relics} size={48} tooltip="above" />
        </div>
      )}
      {run.heritage && (
        <p className="relative z-10 font-body text-[14px] text-ink-3">
          Héritage : {run.heritage.kind === 'relic' ? getRelic(run.heritage.relic).name : stepLabel(run.heritage.step)}
        </p>
      )}
    </section>
  )
}

function EncounterCard({ encounter, onFight }: { encounter: Encounter; onFight: () => void }) {
  const opponent = opponentOf(encounter)
  const band = dangerOf(encounter.chance)
  return (
    <button type="button" className="encounter-card" onClick={onFight} aria-label={`Affronter ${opponent.name}`}>
      <div className="flex h-[330px] w-full justify-center">
        <Fighter character={opponent} side={1} anchor="body" />
      </div>
      <h3 className="font-display text-4xl font-extrabold text-side-b-hi">{opponent.name}</h3>
      <p className="font-body text-lg text-ink-2">
        {opponent.race} · {opponent.archetype} · {opponent.maxHp} PV
      </p>
      <span className="danger-chip" data-band={band.id}>
        {band.label}
      </span>
    </button>
  )
}

function ActMap({ run, onFight, onAbandon, onMenu }: { run: CampaignRun; onFight: (e: Encounter) => void; onAbandon: () => void; onMenu: () => void }) {
  const champion = championOf(run)
  const [quitting, setQuitting] = useState(false)
  const boss = isBossNode(run)
  return (
    <Backdrop>
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-side-a/10 to-transparent" />
      <header className="relative flex flex-col items-center gap-4 pt-7">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">Campagne</p>
        <ActTrack run={run} />
      </header>
      <div className="relative flex min-h-0 flex-1">
        <ChampionPanel champion={champion} run={run} />
        <section className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-5 pb-6 pr-10" aria-label="Adversaires">
          <h2 className="font-display text-3xl font-bold text-amber-100">{boss ? `${BOSS.name} vous attend` : `Combat ${run.wins + 1} sur ${ACT_FIGHTS} · choisissez votre adversaire`}</h2>
          {run.encounters ? (
            <div className="flex items-end gap-8">
              {run.encounters.map((e) => (
                <EncounterCard key={e.characterId} encounter={e} onFight={() => onFight(e)} />
              ))}
            </div>
          ) : (
            // En attendant le réglage (hors du fil de l'interface, D3) : une carte vide par adversaire attendu, sa roue
            // tourne sur le fil du compositeur (une rotation CSS), même si le fil de l'interface est occupé
            <div className="flex items-end gap-8" role="status" aria-label={boss ? `${BOSS.name} se prépare` : 'Les adversaires se préparent'}>
              {Array.from({ length: boss ? 1 : ENCOUNTER_CHOICES }, (_, i) => (
                <div key={i} className="encounter-card encounter-waiting">
                  <span aria-hidden className="encounter-spinner" />
                  <p className="font-body text-lg italic text-ink-3">{boss ? `${BOSS.name} se prépare…` : 'Un adversaire se prépare…'}</p>
                </div>
              ))}
            </div>
          )}
          <p className="font-body text-[14px] text-ink-3">Le danger se mesure contre votre champion tel qu'il est ; les chiffres restent cachés.</p>
        </section>
      </div>
      <div className="relative flex items-center justify-center gap-8 pb-6">
        <BackLink onClick={onMenu}>Menu</BackLink>
        {quitting ? (
          <span className="flex items-center gap-3 font-body text-[15px] text-ink-2">
            Abandonner compte comme une défaite.
            <Button variant="secondary" size="md" onClick={onAbandon}>
              Abandonner
            </Button>
            <button type="button" className="home-link" onClick={() => setQuitting(false)}>
              Continuer la partie
            </button>
          </span>
        ) : (
          <button type="button" className="home-link" onClick={() => setQuitting(true)}>
            Abandonner la partie
          </button>
        )}
      </div>
    </Backdrop>
  )
}

/* ---------- Récompense : une relique ou une forge, selon le combat gagné ---------- */

function Reward({ run, onReward }: { run: CampaignRun; onReward: (gain: HeritageItem | undefined) => void }) {
  const reward = run.reward!
  const champion = championOf(run)
  const kicker = `Récompense · victoire ${run.wins}`
  if (reward.kind === 'relic') return <RelicReward reward={reward} champion={champion} kicker={kicker} onReward={onReward} />
  return <ForgeReward reward={reward} champion={champion} kicker={kicker} onReward={onReward} />
}

function RelicReward({
  reward,
  champion,
  kicker,
  onReward,
}: {
  reward: Extract<PendingReward, { kind: 'relic' }>
  champion: Character
  kicker: string
  onReward: (gain: HeritageItem | undefined) => void
}) {
  const [relic, setRelic] = useState(reward.choice)
  return (
    <Backdrop>
      <Header kicker={kicker} title={`${champion.name} gagne une relique`} sub={`${champion.name} a fait son choix : cliquez sur une autre carte pour décider à sa place.`} />
      <div className="relative flex flex-1 items-center justify-center gap-8">
        {reward.offer.map((id) => (
          <RelicCard
            key={id}
            relic={getRelic(id)}
            selected={relic === id}
            mark={id === reward.choice ? `Choix de ${champion.name}` : relic === id ? 'Votre choix' : undefined}
            onSelect={() => setRelic(id)}
          />
        ))}
      </div>
      {champion.relics.length > 0 && (
        <div className="relative flex items-center justify-center gap-3 pb-4 font-body text-[15px] text-ink-3">
          Déjà portées :
          <RelicRow relics={champion.relics} size={40} tooltip="above" />
        </div>
      )}
      <div className="relative flex items-center justify-center pb-10">
        <Button variant="primary" size="xl" icon="combattre" onClick={() => onReward(relic ? { kind: 'relic', relic } : undefined)} className="w-96">
          Continuer
        </Button>
      </div>
    </Backdrop>
  )
}

function ForgeReward({
  reward,
  champion,
  kicker,
  onReward,
}: {
  reward: Extract<PendingReward, { kind: 'forge' }>
  champion: Character
  kicker: string
  onReward: (gain: HeritageItem | undefined) => void
}) {
  const choice = useForgeChoice(champion, reward.offer, reward.choice)
  return (
    <Backdrop>
      <Header kicker={kicker} title={`${champion.name} forge son dé`} sub={`${champion.name} a fait son choix : cliquez sur une autre opération, puis sur une face, pour décider à sa place.`} />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-8">
        <ForgeChoice character={champion} choice={choice} />
      </div>
      <div className="relative flex items-center justify-center pb-10">
        <Button
          variant="primary"
          size="xl"
          icon="combattre"
          disabled={!choice.ready}
          onClick={() => onReward(choice.step ? { kind: 'forge', step: choice.step } : undefined)}
          className="w-96"
        >
          Continuer
        </Button>
      </div>
    </Backdrop>
  )
}

/* ---------- Fin de la partie ---------- */

/**
 * Fin de la partie. Défaite : « Nouvelle campagne » ramène au choix du champion. Boss vaincu, fin d'acte : « Continuer
 * sans fin » (le mode sans fin, docs/CAMPAGNE.md, pas encore codé : bouton grisé) ou « Terminer l'aventure », qui ramène
 * au choix du champion.
 */
function RunEnd({ run, onNewRun, onMenu }: { run: CampaignRun; onNewRun: () => void; onMenu: () => void }) {
  const champion = championOf(run)
  const won = run.outcome === 'won'
  const legacy = heritableGains(run)
  const triggers = runTriggers(run)
  return (
    <div className="champion-screen fade-in relative flex h-full overflow-hidden">
      {won && <VictoryBackdrop x={280} />}
      <div className="relative flex w-[560px] shrink-0 flex-col items-center justify-end pb-10">
        <div className="relative h-[600px]">
          <Fighter character={champion} side={0} state={won ? 'victory' : 'ko'} />
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-6 py-10 pr-24">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.4em] text-amber-300">{won ? 'Acte gagné' : 'Fin de la partie'}</p>
          <h1 className="champion-name font-display text-7xl font-extrabold leading-none">{won ? `${BOSS.name} est tombé` : `${champion.name} est tombé`}</h1>
          <p className="mt-2 text-lg text-stone-400">
            {champion.name} · {run.wins} victoire{run.wins > 1 ? 's' : ''} sur {ACT_LENGTH} · d{DIE_FACES}
          </p>
        </header>
        {/* Combien de fois chaque face est tombée et chaque relique a agi, sur toute la partie (lu dans les combats enregistrés) */}
        <div className="flex items-start gap-10">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Son dé · faces tombées</span>
            <ForgedDie character={champion} size="sm" tooltip="below" counts={triggers.faces} />
          </div>
          {champion.relics.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Reliques · déclenchements</span>
              <RelicRow relics={champion.relics} size={40} tooltip="below" counts={triggers.relics} />
            </div>
          )}
        </div>
        <div className="codex-divider" />
        <section aria-label="Parcours">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Parcours</h2>
          <ol className="grid grid-cols-2 gap-1.5">
            {run.fights.map((f, k) => (
              <li key={k} className="champion-tile flex items-center gap-3 px-3 py-1.5">
                <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-amber-200/80">{f.boss ? 'Boss' : `Combat ${k + 1}`}</span>
                <MiniPortrait character={campaignCharacter(f.opponentId)} size="h-8 w-8" />
                <span className="min-w-0 flex-1 truncate font-display font-bold text-stone-200">{campaignCharacter(f.opponentId).name}</span>
                <span className={`font-mono text-xs tabular-nums ${f.won ? 'text-stone-400' : 'text-side-b-hi'}`}>{f.won ? `${f.turns} tours · ${f.hpLeft} PV` : 'défaite'}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Héritage" className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Héritage</h2>
          {legacy.length ? (
            <>
              <p className="font-body text-lg text-ink-2">Sa prochaine partie pourra commencer avec l'une de ces améliorations :</p>
              <div className="flex flex-wrap items-center gap-3">
                {legacy.some((g) => g.kind === 'relic') && (
                  <RelicRow relics={legacy.flatMap((g) => (g.kind === 'relic' ? [getRelic(g.relic)] : []))} size={48} tooltip="above" />
                )}
                {legacy.flatMap((g) =>
                  g.kind === 'forge' ? [<span key={JSON.stringify(g.step)} className="champion-tile px-3 py-1.5 font-body text-[15px] text-ink-1">{stepLabel(g.step)}</span>] : [],
                )}
              </div>
            </>
          ) : (
            <p className="font-body text-lg text-ink-2">Aucune amélioration gagnée : son héritage précédent, s'il en a un, reste intact.</p>
          )}
        </section>
        <div className="flex items-center gap-6 pt-2">
          {won ? (
            <>
              <Button variant="primary" size="xl" icon="infini" disabled title="Le mode sans fin n'est pas encore ouvert">
                Continuer sans fin
              </Button>
              <Button variant="secondary" size="md" onClick={onNewRun}>
                Terminer l'aventure
              </Button>
            </>
          ) : (
            <Button variant="primary" size="xl" icon="chroniques" onClick={onNewRun}>
              Nouvelle campagne
            </Button>
          )}
          <BackLink onClick={onMenu}>Menu</BackLink>
        </div>
      </div>
    </div>
  )
}
