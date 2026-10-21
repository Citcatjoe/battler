import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// UI kit des contrôles, importé tel quel depuis sa source de vérité (docs/ui-kit/README.md)
import '../docs/ui-kit/battler-ui-kit.css'
import App from './App'
import { validateRoster } from './game/roster'
import { installDebugConsole } from './game/debugConsole'

// En développement, signale tout de suite une donnée de personnage incohérente.
if (import.meta.env.DEV) {
  const problems = validateRoster()
  if (problems.length) console.error('Roster invalide :\n' + problems.join('\n'))
}

// Traces de combat dans la console du navigateur (battler.trace(), battler.replay(…)).
installDebugConsole()

// Test de police des textes flottants : ?police=alegreya|cinzel|oswald|lilita, retenue pour les visites suivantes
const FLOAT_FONTS = ['alegreya', 'cinzel', 'oswald', 'lilita']
const asked = new URLSearchParams(location.search).get('police')
let floatFont = asked && FLOAT_FONTS.includes(asked) ? asked : null
try {
  if (floatFont) localStorage.setItem('battler:police', floatFont)
  else floatFont = localStorage.getItem('battler:police')
} catch {
  /* stockage indisponible : police par défaut */
}
if (floatFont && FLOAT_FONTS.includes(floatFont)) document.documentElement.dataset.floatFont = floatFont

const root = createRoot(document.getElementById('root')!)
// Page de développement du UI kit (?kit) : les composants disposés comme docs/ui-kit/reference.html
if (import.meta.env.DEV && new URLSearchParams(location.search).has('kit')) {
  void import('./dev/KitReference').then(({ KitReference }) =>
    root.render(
      <StrictMode>
        <KitReference />
      </StrictMode>,
    ),
  )
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
