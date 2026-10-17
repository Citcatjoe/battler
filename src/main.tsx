import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { validateRoster } from './game/roster'

// En développement, signale tout de suite une donnée de personnage incohérente.
if (import.meta.env.DEV) {
  const problems = validateRoster()
  if (problems.length) console.error('Roster invalide :\n' + problems.join('\n'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
