import { useState, type CSSProperties } from 'react'
import { GLYPHS } from '../components/BattlerIcon'
import { Badge, BackLink, Button, Glyph, IconButton, ModePair, ModePairItem, SegmentedControl, SquareButton, Tool, type GlyphName } from '../components/kit'
import { Tabs } from '../components/Tabs'
import './kit-reference.css'

/*
 * Page de développement (`?kit` sur le serveur de dev) : les composants React du UI kit, disposés comme
 * docs/ui-kit/reference.html, pour comparer leur capture à docs/ui-kit/reference.png (1440 px de large).
 * Les états de survol sont posés comme dans la référence, par les variables du kit en style en ligne.
 */

/** Légende de chaque glyphe, celle de la référence */
const GLYPH_USES: Record<GlyphName, string> = {
  combattre: 'Combattre, Jouer, Duel, onglet Affrontement',
  tournoi: 'Tournoi, pastille Vainqueur',
  hasard: 'Au hasard, Combat test',
  changer: 'Changer de combattants',
  parier: 'Parier',
  simuler: 'Simuler, pastille Simulé',
  statistiques: 'Statistiques',
  compendium: 'Compendium',
  chroniques: "Histoire d'un combattant",
  retour: 'Lien de retour',
  son: 'Réglages du son (musique ou effets actifs)',
  'son-coupe': 'Réglages du son (tout coupé)',
  musique: 'Musique active',
  'musique-coupee': 'Musique coupée',
  lecture: 'Reprendre',
  pause: 'Pause',
  journal: 'Journal',
  magnetoscope: 'Magnétoscope',
  'moment-precedent': 'Moment précédent',
  'moment-suivant': 'Moment suivant',
  'phase-suivante': 'Phase suivante',
  rejouer: 'Rejouer le moment',
  reinitialiser: 'Réinitialiser',
  copier: 'Copier la trace',
  fermer: 'Fermer',
  filtrer: 'Champ de filtre',
  info: 'Aide, règle liée',
}

const SPEEDS = [1, 2, 4].map((s) => ({ value: s, label: `×${s}` }))
const VCR_SPEEDS = [
  { value: 0.25, label: '×¼' },
  { value: 0.5, label: '×½' },
  ...SPEEDS,
]
const TABS = [
  { id: 'characters', label: 'Combattants', hint: 10 },
  { id: 'skills', label: 'Compétences' },
  { id: 'statuses', label: 'Statuts', hint: 28 },
  { id: 'relics', label: 'Reliques', hint: 12 },
  { id: 'rules', label: 'Règles' },
] as const
const noop = () => {}

const PRIMARY_HOVER = { '--plate': '#EDC46A', '--plate-shade': '#DDA94A' } as CSSProperties
const SECONDARY_HOVER: CSSProperties = {
  background: '#2A221B',
  color: '#F6DC9A',
  boxShadow:
    'inset 0 1px 0 rgba(255,240,210,.08),inset 0 0 0 1px #B9862F,inset 0 0 0 4px #2A221B,inset 0 0 0 5px rgba(185,134,47,.5),0 2px 0 #0A0806',
}

export function KitReference() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('characters')
  return (
    <div className="kit-ref">
      <main>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="cap" style={{ letterSpacing: '.12em', textTransform: 'uppercase', color: '#B9862F' }}>
            BATTLER / UI kit de référence
          </span>
          <h1>Boutons et icônes de commande</h1>
          <p className="note">
            Rendu de référence de battler-ui-kit.css. Toute implémentation doit être visuellement identique à cette page (hauteurs, coupes, icônes, états).
          </p>
        </header>

        <section>
          <h2>Deux familles d'icônes — ne jamais les mélanger</h2>
          <div className="rule">
            <div className="box">
              <b>Glyphes de commande</b> — SVG au trait, une couleur (currentColor), grille 24, trait 1,75. Pour tout ce qui se clique : boutons, onglets,
              barre de lecture, liens. Liste ci-dessous, aucune autre source.
            </div>
            <div className="box">
              <b>Emblèmes de contenu</b> — images peintes en couleur. Réservés à ce qui appartient au jeu : compétences, statuts, reliques, objets, portraits.
              Jamais dans un bouton de commande ; un bouton « Combattre » ne doit pas ressembler à une compétence.
            </div>
          </div>
        </section>

        <section>
          <h2>Primaire — un seul par écran (XL · 72 px)</h2>
          <div className="row">
            <div className="cell">
              <Button variant="primary" size="xl" icon="combattre">
                Combattre
              </Button>
              <span className="cap">repos</span>
            </div>
            <div className="cell">
              <Button variant="primary" size="xl" icon="combattre" style={PRIMARY_HOVER}>
                Jouer
              </Button>
              <span className="cap">survol</span>
            </div>
            <div className="cell">
              <Button variant="primary" size="xl" icon="combattre" disabled>
                Jouer
              </Button>
              <span className="cap">désactivé</span>
            </div>
          </div>
        </section>

        <section>
          <h2>Paire de modes — deux choix de même rang (72 px)</h2>
          <div className="row">
            <div className="cell">
              <ModePair label="Choisir un mode">
                <ModePairItem icon="combattre">Duel</ModePairItem>
                <ModePairItem icon="tournoi">Tournoi</ModePairItem>
              </ModePair>
              <span className="cap">.bt-modepair · 600 × 72</span>
            </div>
          </div>
        </section>

        <section>
          <h2>Secondaire serti (MD · 52 px) et rangée avec le primaire</h2>
          <div className="row" style={{ marginBottom: 28 }}>
            <div className="cell">
              <Button variant="secondary" size="md" icon="hasard">
                Au hasard
              </Button>
              <span className="cap">repos</span>
            </div>
            <div className="cell">
              <Button variant="secondary" size="md" icon="hasard" style={SECONDARY_HOVER}>
                Au hasard
              </Button>
              <span className="cap">survol</span>
            </div>
            <div className="cell">
              <Button variant="secondary" size="md" icon="hasard" disabled>
                Au hasard
              </Button>
              <span className="cap">désactivé</span>
            </div>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <Button variant="secondary" size="md" icon="changer">
              Changer
            </Button>
            <Button variant="primary" size="xl" icon="combattre">
              Jouer
            </Button>
            <Button variant="secondary" size="md" icon="parier">
              Parier 0/2
            </Button>
            <Button variant="secondary" size="md" icon="simuler">
              Simuler
            </Button>
          </div>
          <p className="note" style={{ marginTop: 12 }}>
            Dans une rangée, les secondaires gardent 52 px et se centrent verticalement sur le primaire de 72 px : la différence de hauteur fait la hiérarchie.
          </p>
        </section>

        <section>
          <h2>Petits contrôles (SM · 40 px), tertiaire, retour</h2>
          <div className="row">
            <div className="cell">
              <Button variant="secondary" size="sm" icon="pause">
                Pause
              </Button>
              <span className="cap">secondaire SM</span>
            </div>
            <div className="cell">
              <Button variant="resume" size="sm" icon="lecture" style={{ width: 148 }}>
                Reprendre
              </Button>
              <span className="cap">reprendre (en pause)</span>
            </div>
            <div className="cell">
              <Button variant="tertiary" size="sm" icon="reinitialiser">
                Réinitialiser
              </Button>
              <span className="cap">tertiaire</span>
            </div>
            <div className="cell">
              <BackLink>Menu</BackLink>
              <span className="cap">retour (un seul style)</span>
            </div>
          </div>
        </section>

        <section>
          <h2>Boutons icône ronds (48 px · 44 px)</h2>
          <div className="row">
            <div className="cell">
              <IconButton icon="statistiques" label="Statistiques" />
              <span className="cap">statistiques</span>
            </div>
            <div className="cell">
              <IconButton icon="compendium" label="Compendium" />
              <span className="cap">compendium</span>
            </div>
            <div className="cell">
              <IconButton icon="son" label="Effets sonores" pressed />
              <span className="cap">son</span>
            </div>
            <div className="cell">
              <IconButton icon="son-coupe" label="Effets sonores" pressed={false} />
              <span className="cap">son coupé</span>
            </div>
            <div className="cell">
              <IconButton icon="musique" label="Musique" pressed />
              <span className="cap">musique</span>
            </div>
            <div className="cell">
              <IconButton icon="musique-coupee" label="Musique" pressed={false} />
              <span className="cap">musique coupée</span>
            </div>
            <div className="cell">
              <IconButton icon="chroniques" size="sm" label="Histoire d'Elaria" />
              <span className="cap">44 px (fiches)</span>
            </div>
          </div>
          <p className="note" style={{ marginTop: 12 }}>
            « Coupé » = glyphe barré et couleur atténuée. Pas de barre rouge peinte.
          </p>
        </section>

        <section>
          <h2>Bouton carré (44 px) et pastille de compteur</h2>
          <div className="row">
            <div className="cell">
              <SquareButton icon="parier" label="Parier" badge="0/2" />
              <span className="cap">repos · pastille</span>
            </div>
            <div className="cell">
              <SquareButton icon="simuler" label="Simuler le tour" badge="×8" style={SECONDARY_HOVER} />
              <span className="cap">survol</span>
            </div>
            <div className="cell">
              <SquareButton icon="combattre" label="Affronter" />
              <span className="cap">sans pastille</span>
            </div>
            <div className="cell">
              <SquareButton icon="simuler" label="Simuler" badge="×8" disabled />
              <span className="cap">désactivé</span>
            </div>
            <div className="cell">
              <Badge>2/2</Badge>
              <span className="cap">pastille seule</span>
            </div>
          </div>
          <p className="note" style={{ marginTop: 12 }}>
            Glyphe seul au serti du secondaire ; le libellé passe par l'infobulle. La pastille (IBM Plex Mono 10, filet or) s'accroche en bas à droite.
          </p>
        </section>

        <section>
          <h2>Barre de lecture du combat</h2>
          <div className="row">
            <div className="cell">
              <div className="bt-playbar" role="toolbar" aria-label="Lecture du combat">
                <Button variant="secondary" size="sm" icon="pause">
                  Pause
                </Button>
                <SegmentedControl label="Vitesse" options={SPEEDS} value={1} onChange={noop} />
                <span className="bt-playbar__sep" />
                <Tool icon="journal" label="Journal" pressed={false} dot />
                <Tool icon="magnetoscope" label="Magnétoscope" pressed={false} />
              </div>
              <span className="cap">lecture</span>
            </div>
            <div className="cell">
              <div className="bt-playbar" role="toolbar" aria-label="Lecture du combat">
                <Button variant="resume" size="sm" icon="lecture">
                  Reprendre
                </Button>
                <SegmentedControl label="Vitesse" options={VCR_SPEEDS} value={1} onChange={noop} />
                <span className="bt-playbar__sep" />
                <Tool icon="journal" label="Journal" pressed={false} />
                <Tool icon="magnetoscope" label="Magnétoscope" pressed />
              </div>
              <span className="cap">magnétoscope ouvert (pause, vitesses étendues)</span>
            </div>
          </div>
        </section>

        <section>
          <h2>Onglets mineurs</h2>
          <Tabs tabs={TABS} value={tab} onChange={setTab} className="max-w-[820px]" />
        </section>

        <section>
          <h2>Glyphes de commande — liste complète</h2>
          <div className="grid">
            {(Object.keys(GLYPHS) as GlyphName[]).map((name) => (
              <figure key={name} className="g">
                <div className="gw">
                  <Glyph name={name} size={24} />
                </div>
                <figcaption>
                  <b>{name}</b>
                  <span>{GLYPH_USES[name]}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
