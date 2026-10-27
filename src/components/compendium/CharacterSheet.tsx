import { Fragment, useState } from 'react'
import type { Character } from '../../game/character'
import { skillCatalog } from '../../game/catalog'
import { ForgedDie } from '../ForgedDie'
import { emptyRecord, ratios, useHistory, type CharacterRecord } from '../../game/history'
import { RULES, type RuleId } from '../../game/rules'
import { CHARACTERS } from '../../game/roster'
import { fmtNum, fmtPct, Kpi, MatchRow, MiniPortrait, WIN_TEXT, WinBar } from '../RecordBits'
import { StatSheet } from '../StatSheet'
import { Icon, StatusIcon } from '../Icon'
import { Tabs } from '../Tabs'
import { STATUSES } from '../../game/statuses'
import { CharacterLink, MasteryName, SkillMedal, skillLink, triggerShort } from './CodexBits'
import type { CompendiumNav } from './sections'

interface Props {
  characterId: string
  nav: CompendiumNav
  /** Onglet affiché à l'ouverture */
  initialTab?: SheetTab
}

export type SheetTab = 'sheet' | 'performance'

/**
 * Fiche d'un combattant, dans le compendium : sa grande figure au centre ; à droite, deux onglets.
 * - « Fiche » : ce qui le définit (devise, histoire, forces, caractéristiques, compétences de départ en liens vers leur
 *   fiche) ;
 * - « Performances » : le résumé de ce qu'il a fait, lu dans le même historique que l'écran Statistiques
 *   (aucun second calcul), avec un lien vers cet écran.
 * Au-dessus des onglets, toujours visible : son dé de départ (le composant du dé forgé), une face par compétence, le
 * détail de chacune dans l'infobulle de sa face (retour du 2026-10-27). Seules ses compétences de départ sont citées :
 * ce qu'il peut apprendre ensuite reste à découvrir.
 */
export function CharacterSheet({ characterId, nav, initialTab = 'sheet' }: Props) {
  const history = useHistory()
  // Conservé en passant d'un personnage à l'autre
  const [tab, setTab] = useState<SheetTab>(initialTab)
  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]
  const record = history.characters[character.id] ?? emptyRecord()
  // Ses compétences de départ, celles de ses faces (pas celles qu'il pourrait graver ensuite, `outside`)
  const skills = skillCatalog().filter((s) => s.owners.includes(character) && !s.outside)

  return (
    <div className="grid h-full min-h-0 gap-6" style={{ gridTemplateColumns: `${FIGURE_COLUMN}px 1fr` }}>
      {/* Colonne laissée vide : la grande illustration (CharacterFigure) passe derrière, en fond */}
      <div aria-hidden />

      <div className="codex-panel flex min-h-0 flex-col gap-3 px-6 pt-4 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="codex-label">
              {character.race} · {character.archetype}
            </p>
            <h2 className="font-display text-[44px] font-extrabold leading-tight text-amber-200">{character.name}</h2>
            {/* Ses deux maîtrises sous son nom (docs/MAITRISES.md § 12), en liens vers leur onglet */}
            <p className="mb-1 flex items-center gap-2 font-display text-[19px] font-bold text-ink-1" aria-label="Maîtrises">
              {character.definition.masteries.map((id, k) => (
                <Fragment key={id}>
                  {k > 0 && <span className="text-ink-3">·</span>}
                  <button type="button" className="codex-link" onClick={() => nav.go({ section: 'masteries', id })}>
                    <MasteryName id={id} />
                  </button>
                </Fragment>
              ))}
            </p>
            <p className="font-display text-lg italic text-amber-200/80">« {character.lore.tagline} »</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button type="button" className="codex-label codex-link" onClick={() => nav.go({ section: 'rules', id: skillRule(character) })}>
              {RULES[skillRule(character)].title} →
            </button>
            <ForgedDie character={character} size="md" tooltip="below" align="right" />
          </div>
        </div>

        <Tabs
          className="self-start"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'sheet', label: 'Fiche' },
            { id: 'performance', label: 'Performances', hint: `${record.fights} combats` },
          ]}
        />

        {tab === 'sheet' ? (
          <div key={`sheet-${character.id}`} className="fade-in scroll-panel flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1 pr-3 pl-1">
            <div className="grid grid-cols-[1fr_290px] gap-6">
              <div className="flex flex-col gap-3">
                <p className="font-body text-[16px] leading-snug text-ink-2">{character.lore.background}</p>
                <div className="grid grid-cols-2 gap-4 font-body text-[15px]">
                  <section>
                    <h3 className="codex-label mb-1 text-(--good)!">Forces</h3>
                    <ul className="flex flex-col gap-0.5 text-emerald-200">
                      {character.lore.strengths.map((t) => (
                        <li key={t}>▲ {t}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="codex-label mb-1 text-(--bad)!">Faiblesses</h3>
                    <ul className="flex flex-col gap-0.5 text-red-300">
                      {character.lore.weaknesses.map((t) => (
                        <li key={t}>▼ {t}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
              <section className="codex-box">
                <h3 className="codex-label mb-2">Caractéristiques</h3>
                <StatSheet character={character} barClass="bg-ink-2" />
              </section>
            </div>

            <section>
              <h3 className="codex-label border-b border-line-2 pb-1">Compétences de départ</h3>
              {skills.length === 0 && <p className="py-2.5 font-body text-[15px] text-ink-3">Aucune compétence. Ses six faces sont nues, chaque jet porte son coup de base.</p>}
              <div className="grid grid-cols-2 gap-x-6">
                {skills.map((s) => (
                  <button
                    key={s.event.id}
                    type="button"
                    className="flex items-center gap-3 border-b border-line-1 py-2 text-left"
                    onClick={() => nav.go(skillLink(s.event))}
                  >
                    <SkillMedal event={s.event} size={34} />
                    <span className="codex-link min-w-0 flex-1 truncate font-display text-[17px] font-bold">{s.event.name}</span>
                    <span className="shrink-0 font-data text-[13px] text-ink-3">{triggerShort(s.triggers)}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Les règles de chaque forme (druide) : ce que la forme fait de lui, au-delà de ses compétences. Elles
                appartiennent au personnage et ne sont décrites qu'ici (0.98.0). */}
            {character.forms && (
              <section>
                <h3 className="codex-label border-b border-line-2 pb-1">Règles de forme</h3>
                {character.forms.map((f) =>
                  (f.statuses ?? []).map((id) => (
                    <div key={id} className="flex w-full items-start gap-3 border-b border-line-1 py-2.5 last:border-b-0">
                      <span className="seal" data-tone="neutral" style={{ width: 42, height: 42 }}>
                        <StatusIcon id={id} className="h-full w-full" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-[17px] font-bold text-ink-1">
                          {f.name} · {STATUSES[id].name}
                        </span>
                        <span className="block font-body text-[15px] leading-snug text-ink-2">{STATUSES[id].summary}</span>
                      </span>
                    </div>
                  )),
                )}
                <p className="pt-1.5 font-body text-[14px] text-ink-3">{RULES.forms.text}</p>
              </section>
            )}
          </div>
        ) : (
          <Performance key={`performance-${character.id}`} character={character} record={record} nav={nav} />
        )}
      </div>
    </div>
  )
}

/** La règle qui dit comment jouent ses compétences : selon sa forme (druide), ou sur son dé. */
const skillRule = (c: Character): RuleId => (c.forms ? 'forms' : 'dice-faces')

/** Onglet « Performances » : le palmarès, les adversaires et les derniers combats, avec le lien vers Statistiques. */
function Performance({ character, record, nav }: { character: Character; record: CharacterRecord; nav: CompendiumNav }) {
  const history = useHistory()
  const r = ratios(record)
  const matches = history.matches.filter((m) => m.fighters.includes(character.id)).slice(0, 5)
  const open = (id: string) => nav.go({ section: 'characters', id })
  return (
    <div className="fade-in scroll-panel grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-y-auto py-1 pr-3 pl-1">
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-body text-[14px] text-ink-3">
            {record.played} joués, {record.simulated} simulés
          </p>
          {nav.openRecords && (
            <button type="button" className="codex-link text-[15px]" onClick={nav.openRecords}>
              Voir dans Statistiques →
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Combats" value={record.fights} />
          <Kpi label="Victoires" value={record.wins} />
          <Kpi label="% victoire" value={fmtPct(r.winRate)} accent={r.winRate === null ? undefined : WIN_TEXT(r.winRate)} />
          <Kpi label="Dégâts / combat" value={fmtNum(r.damagePerFight)} />
          <Kpi label="Coups réussis" value={fmtPct(r.hitRate)} />
          <Kpi label="Critiques" value={fmtPct(r.critRate)} accent="text-crit" />
          <Kpi label="Esquives" value={fmtPct(r.dodgeRate)} accent="text-dodge" />
          <Kpi label="Armure absorbée" value={record.absorbed} />
          <Kpi label="Meilleur coup" value={record.bestHit || '—'} />
          <Kpi
            label={
              <>
                <Icon name="trophy" /> Tournois
              </>
            }
            value={record.tournamentWins}
            accent="text-gold-300"
          />
          <Kpi
            label={
              <>
                <Icon name="event" /> Compétences
              </>
            }
            value={record.events}
            accent="text-arcane"
          />
          <Kpi label="PV regagnés" value={record.healed} accent="text-good" />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <section>
          <h3 className="codex-label mb-2">Contre chaque adversaire</h3>
          <ul className="flex flex-col gap-1">
            {CHARACTERS.map((opp) => {
              const vs = record.opponents[opp.id]
              return (
                <li key={opp.id} className="grid grid-cols-[1.75rem_6rem_1fr_3.5rem] items-center gap-2 text-sm">
                  <MiniPortrait character={opp} size="h-7 w-7" />
                  <span className="truncate">
                    <CharacterLink character={opp} nav={nav} />
                  </span>
                  <WinBar rate={vs ? vs.wins / vs.fights : null} />
                  <span className="text-right font-data text-xs text-ink-3">{vs ? `${vs.wins}/${vs.fights}` : '—'}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="min-h-0">
          <h3 className="codex-label mb-1">Derniers combats</h3>
          {matches.length === 0 ? (
            <p className="text-sm italic text-ink-3">Aucun combat pour l'instant.</p>
          ) : (
            <ul>
              {matches.map((m) => (
                <MatchRow key={m.id} match={m} focus={character.id} onOpenCharacter={open} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/** Largeur de la colonne vide de la fiche, où se tient l'illustration (CharactersSection la centre dessus). */
export const FIGURE_COLUMN = 400

/**
 * Hauteur d'image d'un combattant d'échelle 1, en pixels de scène. Les images ont du vide au-dessus de la tête :
 * même l'ogre (échelle 1,48, image plus haute que l'écran) garde la tête sous le haut de l'écran.
 */
const FIGURE_PX = 700

/**
 * La grande illustration du combattant, **en fond** de l'écran du compendium (section Combattants) : debout sur la
 * colonne vide de la fiche, en grand, elle passe derrière le titre, les onglets, l'index et la fiche, fondue sur les
 * côtés pour que le chevauchement reste léger, et dans le sol. Rien n'est coupé : l'image tient dans la hauteur de
 * l'écran, et les combattants gardent leurs tailles relatives (`look.scale`, STYLE_BIBLE § 2).
 * `center` : abscisse du centre de la colonne vide, en pixels depuis le bord gauche de l'écran.
 */
export function CharacterFigure({ character, center }: { character: Character; center: number }) {
  const { look } = character
  const flip = look.facing !== 'right'
  const height = look.scale * FIGURE_PX
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Fondus sur l'enveloppe (centrés même quand l'image est retournée) : les côtés s'effacent sous les
          panneaux ; le haut s'efface derrière le titre et les onglets, qui restent lisibles ; le bas dans le sol */}
      <div
        className="backdrop-figure absolute bottom-0 h-full w-[760px] -translate-x-1/2"
        style={{
          left: center,
          maskImage:
            'linear-gradient(to right, transparent 0%, #000 24%, #000 76%, transparent 100%), linear-gradient(to bottom, transparent 10%, #000 24%, #000 88%, transparent 100%)',
          maskComposite: 'intersect',
        }}
      >
        {/* Halo chaud derrière la silhouette */}
        <div className="absolute inset-x-[22%] bottom-[4%] top-[18%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_55%,rgba(245,158,11,0.16)_0%,rgba(120,53,15,0.1)_40%,transparent_70%)] blur-2xl" />
        <img
          src={look.image}
          alt=""
          draggable={false}
          className="absolute bottom-0 left-1/2 w-auto max-w-none -translate-x-1/2 select-none object-contain object-bottom"
          style={{
            height,
            bottom: look.footroom ? -look.footroom * height : undefined,
            transform: flip ? 'scaleX(-1)' : undefined,
            filter: `${look.tint ?? ''} saturate(0.95)`,
          }}
        />
      </div>
    </div>
  )
}
