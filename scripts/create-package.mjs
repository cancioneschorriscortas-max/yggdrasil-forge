#!/usr/bin/env node
// ── INICIO: create-package ──
// Xerador de paquete co patrón estándar do monorepo.
// Uso: node scripts/create-package.mjs <nome-paquete> "<descripción>"
// Exemplo: node scripts/create-package.mjs storage "Storage backends for Yggdrasil Forge"

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Uso: node scripts/create-package.mjs <nome> "<descripción>"')
  process.exit(1)
}

const [pkgName, pkgDescription] = args
const pkgDir = join(ROOT, 'packages', pkgName)
const fullName = `@yggdrasil-forge/${pkgName}`

if (existsSync(pkgDir)) {
  console.error(`❌ O paquete '${pkgName}' xa existe en ${pkgDir}`)
  process.exit(1)
}

console.info(`📦 Creando paquete ${fullName}...`)

mkdirSync(pkgDir, { recursive: true })
mkdirSync(join(pkgDir, 'src'), { recursive: true })
mkdirSync(join(pkgDir, '__tests__'), { recursive: true })

const packageJson = {
  name: fullName,
  version: '0.0.0',
  description: pkgDescription,
  license: 'MIT',
  author: 'Agarfal',
  homepage: 'https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme',
  repository: {
    type: 'git',
    url: 'https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git',
    directory: `packages/${pkgName}`,
  },
  type: 'module',
  main: './dist/index.cjs',
  module: './dist/index.js',
  types: './dist/index.d.ts',
  exports: {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    },
    './package.json': './package.json',
  },
  files: ['dist', 'README.md', 'LICENSE'],
  sideEffects: false,
  scripts: {
    build: 'tsup',
    dev: 'tsup --watch',
    test: 'vitest run',
    'test:watch': 'vitest',
    typecheck: 'tsc --noEmit',
    clean: 'rm -rf dist .turbo *.tsbuildinfo',
  },
  devDependencies: {
    tsup: 'catalog:',
    vitest: 'catalog:',
    '@vitest/coverage-v8': 'catalog:',
    typescript: 'catalog:',
  },
  publishConfig: { access: 'public' },
  engines: { node: '>=22' },
}

const tsconfigJson = {
  extends: '../../tsconfig.base.json',
  compilerOptions: {
    outDir: './dist',
    rootDir: './src',
    composite: true,
    tsBuildInfoFile: './.tsbuildinfo',
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist', '__tests__'],
}

const tsupConfig = `// ── INICIO: tsup config para ${fullName} ──
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
})
// ── FIN: tsup config ──
`

const vitestConfig = `// ── INICIO: vitest config para ${fullName} ──
import { defineConfig, mergeConfig } from 'vitest/config'
import rootConfig from '../../vitest.config'

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      include: ['__tests__/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    },
  }),
)
// ── FIN: vitest config ──
`

const indexTs = `// ── INICIO: ${fullName} ──
// ${pkgDescription}
// O contido real engadirase en sub-fases posteriores.

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'
// ── FIN: ${fullName} ──
`

const smokeTest = `// ── INICIO: smoke test para ${fullName} ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('${fullName}', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })
})
// ── FIN: smoke test ──
`

const readme = `# ${fullName}

${pkgDescription}

## Status

🚧 **Early development.** Public API not yet stable.

## Installation

\`\`\`bash
pnpm add ${fullName}
\`\`\`

## Documentation

See the [master architecture document](../../docs/architecture/MASTER.md).

## License

MIT
`

writeFileSync(join(pkgDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
writeFileSync(join(pkgDir, 'tsconfig.json'), `${JSON.stringify(tsconfigJson, null, 2)}\n`)
writeFileSync(join(pkgDir, 'tsup.config.ts'), tsupConfig)
writeFileSync(join(pkgDir, 'vitest.config.ts'), vitestConfig)
writeFileSync(join(pkgDir, 'src', 'index.ts'), indexTs)
writeFileSync(join(pkgDir, '__tests__', 'smoke.test.ts'), smokeTest)
writeFileSync(join(pkgDir, 'README.md'), readme)

console.info(`✅ Paquete ${fullName} creado en packages/${pkgName}/`)
console.info('   Recorda:')
console.info('   - Engadir reference en tsconfig.json raíz')
console.info('   - Executar pnpm install')
console.info('   - Executar pnpm lint:fix && pnpm format')
// ── FIN: create-package ──
