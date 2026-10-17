import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // La version affichée en jeu vient de package.json : elle renvoie à l'entrée du CHANGELOG.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
