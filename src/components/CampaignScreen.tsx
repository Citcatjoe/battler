import { useMemo, useState, type ReactNode } from 'react'
import { hashSeed } from '../game/analysis'
import { DIE_FACES } from '../game/events'
import {
  ACT_FIGHTS,
  ACT_LENGTH,
  autoHeritage,
  BOSS,
  campaignCharacter,
  CAMPAIGN_CHAMPIONS,
  championOf,
  dangerOf,
  drawChampions,
  drawHeritage,
  heritableGains,
  isBossNode,
  opponentOf,
  REWARDS,
  type CampaignRun,
  type Encounter,
  type HeritageItem,
  type PendingReward,
} from '../game/campaign'
import type { Character } from '../game/character'
import { rollFace } from '../game/events'
import { stepLabel } from '../game/forge'
import { getRelic } from '../game/relics'
import { randomSeed, seededRng } from '../game/rng'
import { Fighter } from './Fighter'
import { ForgeCard, ForgeChoice, ForgedDie, useForgeChoice } from './ForgedDie'
import { BackLink, Button, Glyph } from './kit'
import { MiniPortrait } from './RecordBits'
import { RelicCard, RelicRow } from './RelicSeal'
import { SkillDice } from './SkillDice'
import { SkillSeal } from './SkillSeal'

/*
 * La campagne (0.88.0, docs/CAMPAGNE.md) : le choix du champion et de son héritage, la carte de l'acte (le champion, son
 * dé forgé, ses reliques, et les adversaires du nœud avec leur bande de danger), la récompense de chaque victoire (une
 * relique ou une forge) et la fin de la partie. Aucune règle ici : tout vient de campaign.ts et forge.ts ; App tient la partie.
 */

interface Props {
  run: CampaignRun | null
  /** Les héritages de chaque personnage (campaign.ts, `loadHeritage`) */
  heritage: Readonly<Record<string, HeritageItem[]>>
  onStart: (championId: string, seed: number, heritage?: HeritageItem) => void
  onFight: (encounter: Encounter) => void
  onReward: (gain: HeritageItem | undefined) => void
  onAbandon: () => void
  onNewRun: () => void
  onMenu: () => void
}

export function CampaignScreen({ run, heritage, onStart, onFight, onReward, onAbandon, onNewRun, onMenu }: Props) {
  if (!run) return <Draft heritage={heritage} onStart={onStart} onMenu={onMenu} />
  if (run.outcome) return <RunEnd run={run} onNewRun={onNewRun} onMenu={onMenu} />
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

function Draft({ heritage, onStart, onMenu }: Pick<Props, 'heritage' | 'onStart' | 'onMenu'>) {
  const [seed] = useState(randomSeed)
  const champions = useMemo(() => drawChampions(seededRng(seed)).map((id) => CAMPAIGN_CHAMPIONS[id]), [seed])
  const [picked, setPicked] = useState<Character | null>(null)
  if (picked && heritage[picked.id]?.length)
    return <HeritagePick champion={picked} items={heritage[picked.id]} seed={seed} onBack={() => setPicked(null)} onStart={(item) => onStart(picked.id, seed, item)} />
  return (
    <Backdrop>
      <Header kicker="Campagne" title="Choisissez votre champion" sub={`Il mène seul les ${ACT_LENGTH} combats de l'acte, jusqu'au boss. Une défaite met fin à la partie.`} />
      <div className="relative flex flex-1 items-end justify-center gap-10 px-10 pb-6">
        {champions.map((c) => {
          const legacy = heritage[c.id]?.length ?? 0
          return (
            <button
              key={c.id}
              type="button"
              className="encounter-card"
              onClick={() => (legacy ? setPicked(c) : onStart(c.id, seed))}
              aria-label={`Choisir ${c.name}`}
            >
              <div className="flex h-[380px] w-full justify-center">
                <Fighter character={c} side={0} anchor="body" />
              </div>
              <h2 className="font-display text-4xl font-extrabold text-ink-1">{c.name}</h2>
              <p className="font-body text-lg text-ink-2">
                {c.race} · {c.archetype} · {c.dice > 1 ? c.dice : ''}d{DIE_FACES}
              </p>
              <SkillDice character={c} />
              <SignatureLine character={c} />
              <p className="min-h-6 font-body text-[15px] font-bold text-gold-300">{legacy ? `Héritage : ${legacy} amélioration${legacy > 1 ? 's' : ''} de sa dernière partie` : ''}</p>
            </button>
          )
        })}
      </div>
      <div className="relative flex justify-center pb-8">
        <BackLink onClick={onMenu}>Menu</BackLink>
      </div>
    </Backdrop>
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

/** L'héritage (§ 8) : une amélioration de sa dernière partie, parmi trois au plus ; le champion a déjà choisi. */
function HeritagePick({ champion, items, seed, onBack, onStart }: { champion: Character; items: HeritageItem[]; seed: number; onBack: () => void; onStart: (item?: HeritageItem) => void }) {
  const { offer, auto } = useMemo(() => {
    const rng = seededRng(hashSeed(`campagne:${seed}:heritage`))
    const offer = drawHeritage(items, rng)
    return { offer, auto: autoHeritage(offer, rng) }
  }, [items, seed])
  const [picked, setPicked] = useState(auto)
  return (
    <Backdrop>
      <Header kicker="Héritage" title={`${champion.name} reprend une amélioration`} sub={`Une seule, parmi celles de sa dernière partie : ${champion.name} a fait son choix, cliquez sur une autre carte pour décider à sa place.`} />
      <div className="relative flex flex-1 items-center justify-center gap-8">
        {offer.map((item) => (
          <HeritageCard
            key={heritageKey(item)}
            item={item}
            champion={champion}
            selected={picked === item}
            mark={item === auto ? `Choix de ${champion.name}` : picked === item ? 'Votre choix' : undefined}
            onSelect={() => setPicked(item)}
          />
        ))}
      </div>
      <div className="relative flex items-center justify-center gap-6 pb-10">
        <BackLink onClick={onBack}>Champions</BackLink>
        <Button variant="primary" size="xl" icon="combattre" onClick={() => onStart(picked)} className="w-96">
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
        // La récompense du combat précédent (une relique ou une forge), entre lui et ce nœud
        const reward = node > 0 ? REWARDS[node - 1] : undefined
        return (
          <li key={node} className="flex items-center">
            {reward && (
              <>
                <span className="act-link" data-done={node <= run.wins ? '' : undefined} />
                <span
                  className="act-forge"
                  data-done={run.wins >= node ? '' : undefined}
                  title={`${reward === 'relic' ? 'Une relique' : 'Une forge du dé'} après le combat ${node}`}
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
 * La signature du champion (règles v2, 0.104.0) : la seule compétence de son kit au départ d'une campagne, avec la face
 * qui la porte. Rien pour un champion parti de son kit entier (Morgrut, Thaldrin, Fanchon).
 */
function SignatureLine({ character }: { character: Character }) {
  const skill = character.events.find((e) => e.id === character.definition.signature)
  if (!skill) return null
  const face = rollFace(skill.trigger)
  return (
    <p className="flex items-center gap-2 font-body text-[15px] text-ink-2">
      <SkillSeal id={skill.id} size={32} />
      <span>
        Signature : <b className="text-ink-1">{skill.name}</b>
        {face !== undefined && `, sur le ${face}`}
      </span>
    </p>
  )
}

/** Le champion tel qu'il est : son portrait en pied, son dé forgé, ses reliques. */
function ChampionPanel({ champion, run }: { champion: Character; run: CampaignRun }) {
  return (
    <section className="relative flex w-[560px] shrink-0 flex-col items-start justify-end gap-3 pb-6 pl-14" aria-label="Le champion">
      <div className="h-[420px] w-[360px]">
        <Fighter character={champion} side={0} anchor="inside" />
      </div>
      <div className="relative z-10">
        <h2 className="font-display text-5xl font-extrabold text-side-a-hi">{champion.name}</h2>
        <p className="font-body text-lg text-ink-2">
          {champion.race} · {champion.archetype} · {champion.maxHp} PV
        </p>
        <SignatureLine character={champion} />
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
            <p className="flex h-[440px] items-center font-body text-xl italic text-ink-3">Les adversaires se préparent…</p>
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

function RunEnd({ run, onNewRun, onMenu }: { run: CampaignRun; onNewRun: () => void; onMenu: () => void }) {
  const champion = championOf(run)
  const won = run.outcome === 'won'
  const legacy = heritableGains(run)
  return (
    <div className="champion-screen fade-in relative flex h-full overflow-hidden">
      {won && <div className="champion-rays pointer-events-none absolute -left-[10%] top-[-30%] h-[160%] w-[70%]" />}
      <div className="relative flex w-[560px] shrink-0 flex-col items-center justify-end pb-10">
        {won && <div className="champion-pedestal absolute bottom-[52px] h-[60px] w-[420px] rounded-[50%]" />}
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
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Son dé</span>
          <ForgedDie character={champion} size="sm" tooltip="below" />
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
          <Button variant="primary" size="xl" icon="chroniques" onClick={onNewRun}>
            Nouvelle campagne
          </Button>
          <BackLink onClick={onMenu}>Menu</BackLink>
        </div>
      </div>
    </div>
  )
}
