#!/usr/bin/env node
// ── INICIO: check-env ──
// Verifica que o entorno cumpre os requisitos do proxecto.
// Execución: node scripts/check-env.mjs
// Tamén: pnpm exec node scripts/check-env.mjs

import { execSync } from 'node:child_process'
import process from 'node:process'

const REQUIRED_NODE_MAJOR = 22
const REQUIRED_PNPM_MAJOR = 11

let hasErrors = false

function check(label, fn) {
  try {
    const result = fn()
    console.info(`✅ ${label}: ${result}`)
  } catch (err) {
    console.error(`❌ ${label}: ${err.message}`)
    hasErrors = true
  }
}

console.info('🔍 Verificando entorno de desenvolvemento...\n')

check('Node.js', () => {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10)
  if (major < REQUIRED_NODE_MAJOR) {
    throw new Error(`Node ${process.version}, requírese >=${REQUIRED_NODE_MAJOR}`)
  }
  return process.version
})

check('pnpm', () => {
  const version = execSync('pnpm --version', { encoding: 'utf-8' }).trim()
  const major = Number.parseInt(version.split('.')[0], 10)
  if (major < REQUIRED_PNPM_MAJOR) {
    throw new Error(`pnpm ${version}, requírese >=${REQUIRED_PNPM_MAJOR}`)
  }
  return version
})

check('git', () => {
  return execSync('git --version', { encoding: 'utf-8' }).trim()
})

check('TypeScript', () => {
  return execSync('pnpm exec tsc --version', { encoding: 'utf-8' }).trim()
})

check('Biome', () => {
  return execSync('pnpm exec biome --version', { encoding: 'utf-8' }).trim()
})

if (hasErrors) {
  console.error('\n❌ Algunhas verificacións fallaron. Corrixe e volve a executar.')
  process.exit(1)
} else {
  console.info('\n✅ Entorno listo para desenvolver Yggdrasil Forge.')
}
// ── FIN: check-env ──
