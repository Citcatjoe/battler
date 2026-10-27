import { describe, expect, it } from 'vitest'
import { describeSkill, TRIGGERS } from './events'
import { FORGE_OPS, rankText, sharpen } from './forge'
import { describeRelic, RELICS } from './relics'
import { ALL_SKILLS } from './roster'
import { RULES } from './rules'
import { STATES } from './states'
import { STATUS_IDS, STATUSES, statusRuleSections, type Status } from './statuses'
import { EMOJI } from './test-utils'
import { NBSP, typeset } from './typography'

/*
 * Le style de rédaction du compendium (passe du 2026-10-25, règle de l'utilisateur, docs/SORTS.md § 1.10) : chaque texte
 * montré au joueur est court, sans décimale, sans type de dégâts, sans type de relique, sans élément, sans emoji, au bon
 * pluriel, avec la typographie française (espace insécable devant « : ; ! ? % »). Ce test lit tout ce que les
 * générateurs produisent : chaque compétence aux rangs I à III, chaque statut, état, relique et règle.
 */

/** Un motif interdit et sa raison, lue dans le message d'échec. */
const FORBIDDEN: [RegExp, string][] = [
  [/\d[.,]\d/, 'décimale'],
  [/\b(DP|DM|DT)\b/, 'type de dégâts'],
  [/\b(physiques?|magiques?)\b/i, 'type de dégâts'],
  [/relique (de|du) (coup|seuil|tour|caractéristique|stat)/i, 'type de relique'],
  [/[ée]l[ée]mentaire/i, 'élément'],
  [/ {2}| \u00a0|\u00a0 /, 'double espace'],
  [/[^\s\u00a0\u202f][:;!?%]/, 'signe double collé'],
  [/« /, 'espace simple après «'],
  // « +2 coup de chance » : un nombre plus grand que 1 devant un nom qui se compte
  [/(?<![\d,])([2-9]|[1-9]\d+) (coup|jet|tour|charge|action|dégât|critique assuré|esquive améliorée|vol de vie|pièce)(?![\wé])/i, 'pluriel'],
  [/\b(fois max|par combat\))/, 'limite à l’ancienne (« 2x »)'],
]

/** Les textes d'un domaine qui enfreignent une règle : « texte — raison ». */
function scan(texts: Record<string, string>, also: [RegExp, string][] = []): string[] {
  return Object.entries(texts).flatMap(([where, text]) => {
    const found = [...FORBIDDEN, ...also, [EMOJI, 'emoji'] as [RegExp, string]].filter(([re]) => re.test(text))
    return found.map(([, why]) => `${where} : « ${text} » — ${why}`)
  })
}

/** « lumière », « magie » : une couleur de dégâts n'est pas une règle ; seule la règle « Couleurs des dégâts » les nomme (les noms propres, Foudre, Larme de givre, restent). */
const DAMAGE_WORDS: [RegExp, string][] = [[/\b(lumière|magie)\b/i, 'couleur de dégâts']]

/**
 * Ni purge ni interaction dans une description (retour de l'utilisateur du 2026-10-27, C3) : au joueur de découvrir ce qui
 * retire un statut ou ce qui réagit à quoi. Seules les règles communes (section Règles) parlent de purification.
 */
const NO_INTERACTION: [RegExp, string][] = [[/purifi|purge|peut être retirée?\b/i, 'purification ou interaction']]
const DESCRIPTION_RULES = [...DAMAGE_WORDS, ...NO_INTERACTION]

const SAMPLES: Omit<Status, 'id'>[] = [{ stacks: 1 }, { stacks: 2 }, { stacks: 3, turns: 2 }, { stacks: 6 }, { stacks: 2, power: 1 }]

describe('style de rédaction du compendium (passe du 2026-10-25)', () => {
  it('typeset : espace insécable devant « : ; ! ? % », idempotent', () => {
    expect(typeset('Jauges : 3 · 50 % ; « pile »')).toBe(`Jauges${NBSP}: 3 · 50${NBSP}%${NBSP}; «${NBSP}pile${NBSP}»`)
    expect(typeset(typeset('a : b'))).toBe(typeset('a : b'))
  })

  it('chaque compétence, aux rangs I à III : sa ligne, son détail, ses pastilles et son rang', () => {
    const texts: Record<string, string> = {}
    for (const skill of ALL_SKILLS) {
      texts[`${skill.id} · rang`] = rankText(skill)
      for (const rank of [0, 1, 2]) {
        const { text, detail, tags } = describeSkill(sharpen(skill, rank))
        texts[`${skill.id} ${rank + 1}`] = text
        if (detail) texts[`${skill.id} ${rank + 1} · détail`] = detail
        tags.forEach((t, k) => (texts[`${skill.id} ${rank + 1} · pastille ${k}`] = t.label))
        // La condition et la limite sont dans la ligne, pas en pastille
        expect(tags.map((t) => t.label).join(' '), skill.id).not.toMatch(/^si |\bsi l|fois max/)
      }
    }
    expect(scan(texts, DESCRIPTION_RULES)).toEqual([])
  })

  it('chaque statut : son résumé, ses phrases à toutes les charges, son badge, son intensité, sa fiche', () => {
    const texts: Record<string, string> = {}
    for (const id of STATUS_IDS) {
      const def = STATUSES[id]
      texts[`${id} · résumé`] = def.summary
      for (const sample of SAMPLES) {
        const s = { id, ...sample }
        const key = `${id} ${s.stacks}${s.turns ? `/${s.turns}t` : ''}${s.power ? `+${s.power}` : ''}`
        texts[key] = def.describe(s)
        texts[`${key} · badge`] = def.badge(s)
        if (def.grafted) texts[`${key} · greffé`] = def.grafted(s)
        if (def.onFoe) texts[`${key} · adversaire`] = def.onFoe(s)
        if (def.detail) texts[`${key} · détail`] = def.detail(s)
      }
      if (def.power) for (const n of [1, 2]) texts[`${id} · intensité ${n}`] = def.power(n)
      const sections = statusRuleSections(id)
      ;[...sections.effect, ...sections.consumption].forEach((l, k) => (texts[`${id} · fiche ${k}`] = l.text))
    }
    for (const [id, state] of Object.entries(STATES)) texts[`état ${id}`] = state.summary
    expect(scan(texts, DESCRIPTION_RULES)).toEqual([])
  })

  it('chaque relique, chaque règle, chaque déclencheur et chaque opération de forge', () => {
    const texts: Record<string, string> = {}
    for (const r of RELICS) texts[r.id] = describeRelic(r).text
    for (const [id, t] of Object.entries(TRIGGERS)) texts[`déclencheur ${id}`] = t.label
    for (const [id, op] of Object.entries(FORGE_OPS)) texts[`forge ${id}`] = op.summary
    expect(scan(texts, DESCRIPTION_RULES)).toEqual([])
    // Les règles sont le livre de référence : la règle « Couleurs des dégâts » nomme les couleurs, les autres non
    const rules = Object.fromEntries(Object.entries(RULES).map(([id, r]) => [`règle ${id}`, r.text]))
    expect(scan(rules)).toEqual([])
  })
})
