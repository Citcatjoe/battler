/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

/**
 * Journaux de combat sur le disque (serveur de dev seulement) : le jeu envoie la trace de chaque
 * combat résolu (`debugConsole.ts`), écrite dans `logs/combats/` pour pouvoir la relire hors du
 * navigateur. Un fichier par combat : date, duel et graine dans le nom.
 */
function combatLogs(): Plugin {
  const dir = fileURLToPath(new URL('./logs/combats/', import.meta.url))
  return {
    name: 'battler-combat-logs',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__battler/combat-log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const { name, text } = JSON.parse(body) as { name: string; text: string }
            // Nom de fichier sûr : lettres, chiffres, tirets et points seulement
            const file = `${String(name).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 120) || 'combat'}.txt`
            mkdirSync(dir, { recursive: true })
            writeFileSync(join(dir, file), String(text))
            res.statusCode = 204
          } catch {
            res.statusCode = 400
          }
          res.end()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), combatLogs()],
  // La version affichée en jeu vient de package.json : elle renvoie à l'entrée du CHANGELOG.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
