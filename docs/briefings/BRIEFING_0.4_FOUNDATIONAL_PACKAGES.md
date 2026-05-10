# BRIEFING EXECUTABLE — Sub-fase 0.4
## Yggdrasil Forge: Crear paquetes fundacionais (common + core)

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual (entrada de 0.4):**
- Monorepo coa estructura raíz e configuracións base (0.1 + 0.1.5)
- TypeScript + Biome + Husky + VS Code workspace (0.2)
- Vitest + GitHub Actions CI funcionando (0.3, CI verde)
- Documento mestre en `docs/architecture/MASTER.md`

Sen paquetes ainda. **Esta sub-fase é a primeira que crea código real**.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 0.4**. Non improvisas, non preguntas. As decisións están tomadas. Reportas no formato da sección 9.

---

## 3. OBXECTIVO DESTA SUB-FASE

Crear os **dous paquetes fundacionais** do monorepo:

1. **`@yggdrasil-forge/common`** — constantes, error codes, tipos compartidos básicos
2. **`@yggdrasil-forge/core`** — motor principal (estrutura preparada, código real ven en 1.x)

Establecer o **patrón de paquete** que se usará para todos os demais (15+) paquetes futuros. Iso significa: scripts estandarizados, tsconfig configurado correctamente, build pipeline (tsup), tests (vitest), references entre paquetes (TypeScript project references), exports condicionais.

**NON** crear os outros 15+ paquetes (sub-fase 0.5).
**NON** escribir código real do dominio (TreeEngine, UnlockResolver, etc. — fase 1).
**NON** instalar React (paquete @react vén despois).

---

## 4. DECISIÓNS XA TOMADAS

- **Nomes de paquetes:** `@yggdrasil-forge/common`, `@yggdrasil-forge/core`
- **Versionado inicial:** ambos a `0.0.0` (publicaranse a partir de v0.1.0 cando empece código real)
- **Build tool:** `tsup` (xa decidido en MASTER sec. 68)
- **Test framework:** `vitest` (xa configurado en 0.3)
- **Output formats:** ESM + CJS dual (estándar npm moderno)
- **Type definitions:** sempre `.d.ts` xerados
- **Source maps:** sempre activos
- **Tree-shakeable:** sempre (sideEffects: false)
- **Module exports:** condicionais (./, ./internal, etc.)
- **Lingua de comentarios:** castelán
- **TypeScript project references:** activadas para builds incrementais

---

## 5. TAREFAS A EXECUTAR

### 5.1 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -5              # 054cb34 debe ser o último
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.2 Instalar tsup como devDependency raíz

`tsup` será usado por todos os paquetes do monorepo. Instalalo no workspace root:

```bash
pnpm add -D -w tsup
```

⚠️ Probable que pida aprobar build scripts (esbuild, etc.). Aproba o que pida.

### 5.3 Crear @yggdrasil-forge/common

Este paquete contén constantes e tipos básicos compartidos por outros paquetes.

```bash
mkdir -p packages/common/src
mkdir -p packages/common/__tests__
```

#### 5.3.1 packages/common/package.json

```json
{
  "name": "@yggdrasil-forge/common",
  "version": "0.0.0",
  "description": "Shared constants, types, and utilities for Yggdrasil Forge",
  "license": "MIT",
  "author": "Agarfal",
  "homepage": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git",
    "directory": "packages/common"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=22"
  }
}
```

#### 5.3.2 packages/common/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

#### 5.3.3 packages/common/tsup.config.ts

```typescript
// ── INICIO: tsup config para @yggdrasil-forge/common ──
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
```

#### 5.3.4 packages/common/vitest.config.ts

```typescript
// ── INICIO: vitest config para @yggdrasil-forge/common ──
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
```

#### 5.3.5 packages/common/src/index.ts

Contido inicial mínimo. Por agora exportamos só un placeholder; os contidos reais (error codes, locales, etc.) vén en sub-fase 1.1.

```typescript
// ── INICIO: @yggdrasil-forge/common ──
// Constantes, error codes, tipos compartidos para todo o monorepo.
// Os contidos reais engadiranse na sub-fase 1.1.

/**
 * Versión actual do paquete.
 * Sincronízase coa versión do package.json mediante o build.
 */
export const VERSION = '0.0.0'

/**
 * Nome canónico do proxecto.
 */
export const PROJECT_NAME = 'Yggdrasil Forge'
// ── FIN: @yggdrasil-forge/common ──
```

#### 5.3.6 packages/common/__tests__/smoke.test.ts

```typescript
// ── INICIO: smoke test para @yggdrasil-forge/common ──
import { describe, expect, it } from 'vitest'
import { PROJECT_NAME, VERSION } from '../src/index.js'

describe('@yggdrasil-forge/common', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })

  it('should export PROJECT_NAME', () => {
    expect(PROJECT_NAME).toBe('Yggdrasil Forge')
  })
})
// ── FIN: smoke test ──
```

#### 5.3.7 packages/common/README.md

```markdown
# @yggdrasil-forge/common

Shared constants, error codes, and types for the Yggdrasil Forge monorepo.

## Status

🚧 **Early development.** Public API not yet stable.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/common
\`\`\`

## Usage

\`\`\`typescript
import { VERSION, PROJECT_NAME } from '@yggdrasil-forge/common'
\`\`\`

## License

MIT
```

### 5.4 Crear @yggdrasil-forge/core

```bash
mkdir -p packages/core/src/{types,engine,layout,procedural,serialization,plugins,i18n,errors,utils}
mkdir -p packages/core/__tests__
```

#### 5.4.1 packages/core/package.json

```json
{
  "name": "@yggdrasil-forge/core",
  "version": "0.0.0",
  "description": "The core engine of Yggdrasil Forge — a comprehensive skill tree engine for the web",
  "license": "MIT",
  "author": "Agarfal",
  "homepage": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git",
    "directory": "packages/core"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@yggdrasil-forge/common": "workspace:*",
    "immer": "^10.1.1"
  },
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=22"
  }
}
```

⚠️ **Atención:** `workspace:*` é a sintaxe de pnpm para referenciar paquetes do workspace. Cando se publique en npm, pnpm convertirá esto á versión real automaticamente.

#### 5.4.2 packages/core/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"],
  "references": [
    { "path": "../common" }
  ]
}
```

A clave aquí é `references`: declara que core depende de common. TypeScript constrúe primeiro common e despois core.

#### 5.4.3 packages/core/tsup.config.ts

```typescript
// ── INICIO: tsup config para @yggdrasil-forge/core ──
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
  external: ['@yggdrasil-forge/common', 'immer'],
})
// ── FIN: tsup config ──
```

⚠️ `external` exclúe as dependencias do bundle. O usuario final terá `immer` instalado xa que é dep declarada en package.json.

#### 5.4.4 packages/core/vitest.config.ts

```typescript
// ── INICIO: vitest config para @yggdrasil-forge/core ──
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
```

#### 5.4.5 packages/core/src/index.ts

```typescript
// ── INICIO: @yggdrasil-forge/core ──
// Motor principal de Yggdrasil Forge.
// O contido real engadirase nas sub-fases 1.x.

import { PROJECT_NAME, VERSION as COMMON_VERSION } from '@yggdrasil-forge/common'

/**
 * Versión actual de @yggdrasil-forge/core.
 */
export const VERSION = '0.0.0'

/**
 * Devolve un saúdo de proba para verificar que o paquete está vivo.
 * Eliminarase cando se introduzan os tipos e clases reais.
 */
export function greet(): string {
  return `${PROJECT_NAME} core v${VERSION} (common v${COMMON_VERSION})`
}
// ── FIN: @yggdrasil-forge/core ──
```

#### 5.4.6 packages/core/__tests__/smoke.test.ts

```typescript
// ── INICIO: smoke test para @yggdrasil-forge/core ──
import { describe, expect, it } from 'vitest'
import { greet, VERSION } from '../src/index.js'

describe('@yggdrasil-forge/core', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })

  it('should greet correctly', () => {
    const greeting = greet()
    expect(greeting).toContain('Yggdrasil Forge')
    expect(greeting).toContain('core v0.0.0')
    expect(greeting).toContain('common v0.0.0')
  })
})
// ── FIN: smoke test ──
```

#### 5.4.7 packages/core/README.md

```markdown
# @yggdrasil-forge/core

The core engine of Yggdrasil Forge — a comprehensive skill tree engine for the web.

## Status

🚧 **Early development.** Public API not yet stable.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/core
\`\`\`

## Usage

\`\`\`typescript
import { greet } from '@yggdrasil-forge/core'

console.info(greet())
\`\`\`

## Documentation

See the [master architecture document](../../docs/architecture/MASTER.md) for design details.

## License

MIT
```

### 5.5 Actualizar tsconfig.json raíz con references

Substituír `tsconfig.json` (na raíz) por:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": [],
  "references": [
    { "path": "./packages/common" },
    { "path": "./packages/core" }
  ]
}
```

Cada novo paquete que se cree engadirase a esta lista.

### 5.6 Eliminar __tests__/smoke.test.ts da raíz

Xa non é necesario, cada paquete ten o seu propio smoke test.

```bash
rm -rf __tests__
```

Tamén eliminar o `.gitkeep` correspondente se existe.

### 5.7 Verificación local

```bash
# Instalar (linkea os paquetes do workspace)
pnpm install

# Verificar que os paquetes están detectados polo workspace
pnpm list -r --depth -1

# Build (debe funcionar incrementalmente: common primeiro, despois core)
pnpm build

# Verificar que se xerou dist/ en cada paquete
ls packages/common/dist/
ls packages/core/dist/

# Test (debe pasar todos os smoke tests)
pnpm test

# Coverage
pnpm test:coverage

# Typecheck
pnpm typecheck

# Lint + format
pnpm lint
pnpm format:check

# Validate completo
pnpm validate
```

Se algún paso falla, **detente e reporta**.

### 5.8 Eliminar referencias obsoletas en .gitignore

`.gitignore` actual exclúe `dist/` correctamente. Verificar tamén que exclúe `*.tsbuildinfo`:

```bash
grep tsbuildinfo .gitignore
```

Se non aparece, engadir á sección "Build outputs":
```
*.tsbuildinfo
```

### 5.9 Actualizar CHANGELOG.md

Engadir á sección "[Unreleased]":

```markdown
### Added
- Created `@yggdrasil-forge/common` package (placeholder)
- Created `@yggdrasil-forge/core` package (placeholder, depends on common)
- Configured tsup for ESM + CJS dual builds across packages
- Configured TypeScript project references for incremental builds
- Per-package vitest configs that extend the root config
- Per-package tsconfig with composite mode

### Changed
- Removed root-level `__tests__/smoke.test.ts` (replaced by per-package smoke tests)
```

Tamén engadir build scripts aprobados se houbo algún (esbuild, etc.).

### 5.10 Commit

```bash
git add .
git status
git commit -m "feat(common,core): create foundational packages with build pipeline"
git push origin main
```

Verificar que o **CI pasa** en https://github.com/cancioneschorriscortas-max/yggdrasil-forge/actions

Se falla, **non avances**. Reporta o erro.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN:** úsanse en todos os ficheiros de código creados (xa incluídos nos exemplos).
- **Idioma de comentarios no código:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar configuración manualmente. Imprescindible.
- **Verificación tras cada paquete** antes de pasar ao seguinte.
- **CI verde obrigatorio** antes de declarar a fase completada.

---

## 7. QUE NON FACER

- ❌ Non crear máis paquetes alén dos dous especificados (.4 está só para common + core).
- ❌ Non instalar React, Vue, ou ningún framework de UI.
- ❌ Non escribir clases reais como TreeEngine, UnlockResolver, etc. — iso é fase 1.
- ❌ Non publicar nada en npm.
- ❌ Non configurar changesets (sub-fase 0.5).
- ❌ Non engadir ningún paquete adicional como dependency.
- ❌ Non engadir Storybook, Playwright, ou outras ferramentas que veñen máis adiante.

---

## 8. QUE ENTREGAR AO FINAL

Confirma:

1. ✅ `packages/common/` creado e estructurado
2. ✅ `packages/core/` creado e estructurado
3. ✅ Ambos paquetes con package.json, tsconfig.json, tsup.config.ts, vitest.config.ts
4. ✅ Ambos paquetes con README.md propio
5. ✅ Ambos paquetes con smoke test que pasa
6. ✅ `pnpm build` xera `dist/` en ambos
7. ✅ `pnpm test` pasa
8. ✅ `pnpm typecheck` pasa con references
9. ✅ `tsconfig.json` raíz actualizado con references
10. ✅ `__tests__/smoke.test.ts` raíz eliminado
11. ✅ CHANGELOG actualizado
12. ✅ Commit pusheado
13. ✅ **CI verde en GitHub**

Mostra ao autor:
```bash
ls packages/                          # common, core
ls packages/common/                   # estructura completa
ls packages/core/src/                 # estructura interna
pnpm list -r --depth -1               # paquetes detectados
pnpm build                            # output do build
pnpm test                             # smoke tests pasan
git log --oneline -3
```

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 0.4 — COMPLETADA
═══════════════════════════════════════

✅ @yggdrasil-forge/common creado e funcional
✅ @yggdrasil-forge/core creado e funcional (depende de common)
✅ Build pipeline (tsup) configurado e funcional
✅ TypeScript project references configurados
✅ Smoke tests pasan en ambos paquetes
✅ tsconfig.json raíz actualizado con references
✅ CI verde en GitHub

📦 Paquetes:
  - @yggdrasil-forge/common (0.0.0)
  - @yggdrasil-forge/core (0.0.0, deps: common, immer)

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

🔗 CI execution: [URL + estado]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor:
[Lista, ou "Ningunha"]

📋 Estado para a directora:
LISTO PARA PROCEDER Á SUB-FASE 0.5
```

---

**FIN DO BRIEFING 0.4**

Cando completes todos os pasos, fai o reporte e detente. Non procedas a 0.5.
