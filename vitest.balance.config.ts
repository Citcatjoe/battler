/// <reference types="node" />
import { defineConfig } from 'vitest/config'

// Rapport d'équilibre (`npm run balance`), séparé des tests : il est long et n'échoue jamais.
export default defineConfig({ test: { include: ['scripts/*.report.ts'] } })
