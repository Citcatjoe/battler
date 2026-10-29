import campaignImg from '../assets/menu-campaign.jpg'
import type { Character } from '../game/character'
import { BackLink, Button } from './kit'

/*
 * L'accueil de la campagne (0.131.0, docs/ref/06-accueil-campagne.png) : après le choix du champion, avant l'acte I.
 */

interface Props {
  /** Le champion choisi, parti de son aura */
  champion: Character
  onBack: () => void
  onEnter: () => void
}

export function CampaignWelcome({ champion, onBack, onEnter }: Props) {
  return (
    <div className="fade-in relative h-full overflow-hidden bg-[#0e0b09]">
      <img src={campaignImg} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-20" />
      <BackLink onClick={onBack} className="absolute left-10 top-[36px] z-30">
        Choix du champion
      </BackLink>
      <header className="absolute inset-x-0 top-[26px] flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.5em] text-gold-300">Mode sans fin</p>
        <h1 className="font-display text-[40px] font-extrabold leading-tight text-amber-100">Jusqu'où ira votre champion ?</h1>
      </header>
      <div className="absolute inset-x-0 top-[833px] flex -translate-y-1/2 justify-center">
        <Button variant="primary" size="xl" icon="combattre" onClick={onEnter} className="w-[560px]" aria-label={`Entrer dans l'acte I avec ${champion.name}`}>
          Entrer dans l'acte I
        </Button>
      </div>
    </div>
  )
}
