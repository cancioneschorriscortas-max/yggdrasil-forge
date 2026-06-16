# BRIEFING — SUB-FASE 8.5.a de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA das 2 sub-sub-fases de 8.5** (Plugins oficiais).
> 8.5.a entrega:
> 1. **Scaffold completo** do paquete novo `@yggdrasil-forge/plugins`
>    (workspace integration + tsup + vitest + tsconfig + README).
> 2. **HistoryPlugin** completo: clase implementando Plugin, tracking
>    de operacións unlock/lock/respec via after* hooks, configurable
>    maxSize (FIFO), API pública (getHistory/clearHistory/size/getMaxSize).
> 3. **Aplicación do fix DT-14** (tsup composite:false) **proactiva**
>    dende o inicio (evita problema preventivamente cando @plugins
>    depende transitivamente de @common).
> 4. **Limpeza do comentario obsoleto** en TreeEngine.ts línea 1295
>    ("Hooks beforeRespec/afterRespec DIFERIDOS a 8.4" — xa NON é
>    certo, integráronse en 8.4.c).
>
> **8.5.b (próxima)** entregará DebugPlugin reutilizando o scaffold.
> **8.6+ DIFERIDAS** (SearchPlugin, ValidatorEngine, read-only).
>
> **Decisións confirmadas polo director**:
> - **Paquete novo** `@yggdrasil-forge/plugins` (aliñado co MASTER
>   literal: `import { HistoryPlugin, ... } from '@yggdrasil-forge/plugins'`).
> - **HistoryPlugin scope completo** (con API pública robusta;
>   undo/redo DIFERIDO).
> - **Default `maxSize: 100`** se cero opcións.
> - **FIFO** quanto maxSize alcanzado (shift do máis antiguo).
> - **`uninstall` cleanup** dos entries (boa cidadanía).
> - **Permissions declarativas**: `['register_hooks']` (V1.0 audit-only
>   segundo MASTER §40).
> - **Tests integration con TreeEngine real**: require
>   `@yggdrasil-forge/core` como devDependency (peer workspace).
> - **Tests unitarios con mocks**: cero require TreeEngine para a
>   maioría dos testes (mock o engine + api).
> - **Cleanup proactivo** do comentario obsoleto en TreeEngine.ts:
>   parte de 8.5.a (cero require sub-fase separada).
>
> **Aviso ao Executor**: paquete novo require workspace integration.
> pnpm-workspace.yaml xa inclúe `packages/*` → cero require modificar.
> Pero pnpm install é OBRIGATORIO tras crear o scaffold para que pnpm
> recoñeza o novo paquete.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica que `packages/plugins/`
> non existe (xa verificado polo director).
>
> 8.5.b, 8.6-8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.5.a — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.5.a — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica nos types do
HistoryPlugin.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: HistoryPlugin.ts chega a **100/100/100/100**.
Cero regresión na baseline post-8.4.c.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: cero modificación de
calquera test existente. Tódolos 1673 core + 60 common + 193
storage + 116 react = 2042 tests existentes deben pasar intactos.

**0.14 — pnpm install OBRIGATORIO** tras crear scaffold do paquete
novo. Sen iso, pnpm non recoñece o novo paquete + tests/typecheck
non funcionan.

**0.15 — Estilo coherente con paquetes existentes**: tódolos
arquivos de configuración (package.json, tsconfig.json,
tsup.config.ts, vitest.config.ts) deben replicar o patrón dos
paquetes existentes (analytics, storage). **Verificar empíricamente
ambos paquetes en T0.2** antes de crear.

**0.16 — DT-14 fix aplicado dende inicio**: `tsup.config.ts` usa
`dts: { resolve: true, compilerOptions: { composite: false,
incremental: false } }` (igual ca packages/storage/tsup.config.ts).

**0.17 — Lección 8.3 L1 aplicada con rigor**: T0.2 verifica que
`packages/plugins/` non existe + `@yggdrasil-forge/plugins` cero
referencias previas.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.5.a** de Yggdrasil Forge. **PRIMEIRA das 2
sub-sub-fases de 8.5** (Plugins oficiais).

**Pezas (5 grupos)**:

**Grupo A — Scaffold do paquete `@yggdrasil-forge/plugins`**
(NOVO; replica patrón de paquetes existentes):
1. `packages/plugins/package.json` (NOVO).
2. `packages/plugins/tsconfig.json` (NOVO).
3. `packages/plugins/tsup.config.ts` (NOVO; DT-14 fix aplicado).
4. `packages/plugins/vitest.config.ts` (NOVO).
5. `packages/plugins/README.md` (NOVO).
6. `packages/plugins/src/index.ts` (NOVO; re-exports).

**Grupo B — HistoryPlugin (3 ficheiros NOVOS)**:
7. `packages/plugins/src/history/types.ts` (NOVO; HistoryEntry,
   HistoryOptions, HistoryOperation).
8. `packages/plugins/src/history/HistoryPlugin.ts` (NOVO; class
   implementing Plugin).
9. `packages/plugins/src/history/index.ts` (NOVO; re-exports).

**Grupo C — Tests (1 ficheiro NOVO)**:
10. `packages/plugins/__tests__/history/HistoryPlugin.test.ts`
    (NOVO; ~18-20 tests).

**Grupo D — Cleanup obsoleto en TreeEngine (1 ficheiro MODIFICADO)**:
11. `packages/core/src/engine/TreeEngine.ts`: limpar comentario
    obsoleto en línea 1295 ("Hooks beforeRespec/afterRespec
    DIFERIDOS a 8.4" — actualizar a "**Hooks beforeRespec/afterRespec
    integrados en 8.4.c**").

**Grupo E — Housekeeping (2 ficheiros)**:
12. `.changeset/history-plugin-8-5-a.md` (NOVO).
13. `CHANGELOG.md` (MODIFICADO; nova `## [Unreleased]`).

**Total: 13 ficheiros tocados** (11 NOVOS + 2 MODIFICADOS).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros 14 paquetes
  scaffold (analytics, devtools, etc. intactos).
- `packages/core/src/` salvo TreeEngine.ts (1 cambio cosmético no
  comentario).
- Tests existentes (1673 core + 60 common + 193 storage + 116
  react).
- `packages/core/src/plugins/` (HookRunner, PluginManager,
  PluginAPI intactos).
- `packages/core/src/types/plugin.ts` (Plugin types xa tipados).
- `package.json` root (cero require devDeps novas).
- `pnpm-workspace.yaml` (xa inclúe `packages/*`).
- `tsconfig.json` root.
- `docs/architecture/MASTER.md` (cleanup MASTER vai a sub-fase doc
  post-Fase 8).

**CERO deps de npm engadidas externas.** Si: `@yggdrasil-forge/core`
e `@yggdrasil-forge/common` como devDependencies workspace (peer
resolution interno).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `5baefa6`, verificada
empíricamente)**.

### MASTER referencias verificadas

**MASTER plan Fase 8.5**: "**Plugins oficiais (History, Debug)**".

**MASTER uso esperado** (literal):
```ts
import { HistoryPlugin, AnalyticsPlugin } from '@yggdrasil-forge/plugins'
eng.registerPlugin(new HistoryPlugin({ maxSize: 50 }))
```

**Importante**: MASTER referencia AnalyticsPlugin ademais de
History/Debug. **Decisión do director**: AnalyticsPlugin DIFERIDO
(non está en plan 8.5; sub-fase futura específica). 8.5.a só fai
History.

**Plugins built-in totais segundo MASTER §40**: "Cooldown, History,
AutoUnlock, Debug, Analytics, Search, Webhook, Audit" (8 plugins).
**Fase 8 implementa só History (8.5.a) + Debug (8.5.b) + Search
(8.6 como paquete separado)**. Resto DIFERIDO.

### Plugin interface (verificada literal)

```ts
export interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly apiVersion: string
  readonly permissions?: readonly PluginPermission[]
  install(engine: PluginEngineHandle, api: PluginAPI): void | Promise<void>
  uninstall?(engine: PluginEngineHandle): void | Promise<void>
}
```

**Decisión do director para HistoryPlugin**:
- `id: 'yggdrasil-history'`.
- `name: 'History Plugin'`.
- `version: '0.1.0'`.
- `apiVersion: '1.0.0'`.
- `permissions: ['register_hooks']` (solo escoita afterX hooks).
- `install`: rexistra 3 hooks (afterUnlock, afterLock, afterRespec).
- `uninstall`: cleanup dos entries (`this.entries.length = 0`).

### PluginPermission valores (verificados)

```ts
export type PluginPermission =
  | 'read_state'
  | 'modify_state'
  | 'register_hooks'
  | 'register_layouts'
  | 'register_storage'
  | 'network'
  | 'persist'
  | (string & {})  // string libre
```

**HistoryPlugin** só require `register_hooks`. Cero modify_state,
cero persist, cero network.

### Scaffold patrón replicado (verificado en packages/analytics/)

**packages/plugins/package.json** estrutura prescrita:
```json
{
  "name": "@yggdrasil-forge/plugins",
  "version": "0.0.0",
  "description": "Official plugins for Yggdrasil Forge",
  "license": "MIT",
  "author": "Agarfal",
  "homepage": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git",
    "directory": "packages/plugins"
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
  "files": ["dist", "README.md", "LICENSE"],
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
    "@yggdrasil-forge/core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "vitest": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "typescript": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=22"
  }
}
```

**Diferenza importante con analytics**: HistoryPlugin **require**
@yggdrasil-forge/core (para Plugin interface) e @yggdrasil-forge/common
(para tipos). **Estas son `dependencies`** (cero devDependencies)
porque o plugin require-as en runtime.

### tsup config con DT-14 fix (verificado en packages/storage/)

```ts
// packages/plugins/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  tsconfig: 'tsconfig.json',
})
```

**Por que composite:false**: o paquete depende transitivamente de
@common (que ten composite:true), polo que tsup require override
para xerar dts correctamente. **Lección DT-14 aplicada proactivamente**.

### vitest.config.ts pattern (verificado en packages/analytics/)

```ts
// packages/plugins/vitest.config.ts
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
```

### tsconfig.json pattern (verificado en analytics)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src/**/*", "__tests__/**/*"],
  "references": [
    { "path": "../common" },
    { "path": "../core" }
  ]
}
```

**`references`**: importante para typecheck cross-package. **Engadir
@common + @core** (depende deses dous).

### Comentario obsoleto en TreeEngine.ts (verificado)

**Líña 1295** (parte do JSDoc de respec):
```ts
// Hooks beforeRespec/afterRespec DIFERIDOS a 8.4 (PluginManager + HookRunner).
```

**Acción**: cambialo a:
```ts
// Hooks beforeRespec/afterRespec integrados en 8.4.c (via HookRunner).
```

**É o único comentario "DIFERIDO" obsoleto no proxecto** (verificado
polo director con grep).

### Estado scaffold tras 8.4.c

```
packages/
├── analytics/        (scaffold; cero código)
├── cli/              (scaffold)
├── common/           (codifaixe; PL001-PL007)
├── core/             (codificado completo; plugins funcionais)
├── devtools/         (scaffold)
├── diff/             (scaffold)
├── exporters/        (scaffold)
├── heatmap/          (scaffold)
├── i18n/             (scaffold)
├── importers/        (scaffold)
├── multitenancy/     (scaffold)
├── neo4j/            (scaffold)
├── plugins/          (NOVO en 8.5.a) ← obxectivo
├── react/            (codificado; 116 tests)
├── search/           (scaffold)
├── stats/            (scaffold)
├── storage/          (codificado; 193 tests)
├── themes/           (scaffold)
├── validators/       (scaffold)
└── webhooks/         (scaffold)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `5baefa6` (sub-fase 8.4.c — hooks
  integrados).
- 1673 core + 60 common + 193 storage + 116 react = 2042 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 50 ErrorCodes existentes (incluído PL001-PL007).
- DT abertas: 11 (DT-9, DT-11, DT-12, DT-14, DT-15, DT-16, DT-17,
  DT-18, DT-19, DT-20, DT-21, DT-23, DT-24, DT-25).
- **Cadea 44 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir scaffold completo do paquete novo `@yggdrasil-forge/plugins`
(package.json + tsconfig + tsup con DT-14 fix proactivo + vitest +
README + src/index.ts) + **HistoryPlugin** completo (clase
implementando Plugin interface; tracking de operacións unlock/lock/respec
via after* hooks; FIFO con maxSize configurable default 100; API
pública robusta: `getHistory()`, `clearHistory()`, `size()`,
`getMaxSize()`; uninstall cleanup); + **limpar comentario obsoleto**
en `TreeEngine.ts` línea 1295 (hooks beforeRespec/afterRespec xa
non son "DIFERIDOS a 8.4" tras 8.4.c); + tests específicos
(~18-20). **Cero modificación de pezas existentes** salvo o
comentario cosmético en TreeEngine. **Cero modificación de calquera
test existente**. Aplicación proactiva da lección DT-14 dende
inicio do scaffold.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (11)**:
- `packages/plugins/package.json`
- `packages/plugins/tsconfig.json`
- `packages/plugins/tsup.config.ts`
- `packages/plugins/vitest.config.ts`
- `packages/plugins/README.md`
- `packages/plugins/src/index.ts`
- `packages/plugins/src/history/types.ts`
- `packages/plugins/src/history/HistoryPlugin.ts`
- `packages/plugins/src/history/index.ts`
- `packages/plugins/__tests__/history/HistoryPlugin.test.ts`
- `.changeset/history-plugin-8-5-a.md`

**MODIFICADOS (2)**:
- `packages/core/src/engine/TreeEngine.ts` (cosmético; línea 1295).
- `CHANGELOG.md`.

**Total: 13 ficheiros tocados**.

### 5.2 — package.json (FIXADO)

```json
{
  "name": "@yggdrasil-forge/plugins",
  "version": "0.0.0",
  "description": "Official plugins for Yggdrasil Forge",
  "license": "MIT",
  "author": "Agarfal",
  "homepage": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git",
    "directory": "packages/plugins"
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
  "files": ["dist", "README.md", "LICENSE"],
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
    "@yggdrasil-forge/core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "vitest": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "typescript": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=22"
  }
}
```

### 5.3 — tsconfig.json (FIXADO)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src/**/*", "__tests__/**/*"],
  "references": [
    { "path": "../common" },
    { "path": "../core" }
  ]
}
```

### 5.4 — tsup.config.ts (FIXADO; DT-14 fix aplicado)

```ts
// ── INICIO: tsup config para @yggdrasil-forge/plugins ──
// DT-14 fix aplicado dende inicio: composite:false necesario porque
// @plugins depende transitivamente de @common (que ten composite:true).
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
```

### 5.5 — vitest.config.ts (FIXADO)

```ts
// ── INICIO: vitest config para @yggdrasil-forge/plugins ──
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

### 5.6 — README.md (FIXADO)

```markdown
# @yggdrasil-forge/plugins

Official plugins for Yggdrasil Forge.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/plugins
\`\`\`

## Plugins included

### HistoryPlugin

Tracks unlock/lock/respec operations performed on a TreeEngine.

\`\`\`typescript
import { HistoryPlugin } from '@yggdrasil-forge/plugins'

const historyPlugin = new HistoryPlugin({ maxSize: 50 })
await engine.registerPlugin(historyPlugin)

// After operations:
const history = historyPlugin.getHistory()
// Each entry: { operation, timestamp, nodeIds, locale }
\`\`\`

**Options:**
- \`maxSize?: number\` (default: 100) — FIFO limit of stored entries.

**API:**
- \`getHistory(): readonly HistoryEntry[]\` — snapshot of history.
- \`clearHistory(): void\` — empties the history.
- \`size(): number\` — current number of entries.
- \`getMaxSize(): number\` — configured maxSize.

## License

MIT
```

### 5.7 — src/index.ts (FIXADO)

```ts
// ── INICIO: @yggdrasil-forge/plugins barrel ──
export { HistoryPlugin } from './history/index.js'
export type {
  HistoryEntry,
  HistoryOptions,
  HistoryOperation,
} from './history/index.js'
// ── FIN: @yggdrasil-forge/plugins barrel ──
```

### 5.8 — src/history/types.ts (FIXADO)

```ts
// ── INICIO: HistoryPlugin types ──

/**
 * Tipo de operación rastreada polo HistoryPlugin.
 */
export type HistoryOperation = 'unlock' | 'lock' | 'respec'

/**
 * Unha entrada na historia.
 */
export interface HistoryEntry {
  /** Tipo de operación rastreada. */
  readonly operation: HistoryOperation
  /** Timestamp do hook (millis desde epoch). */
  readonly timestamp: number
  /**
   * Ids dos nodos involucrados.
   * - Para unlock/lock: array dun só id (`[nodeId]`).
   * - Para respec: array con todos os nodos bloqueados (post-cascade).
   */
  readonly nodeIds: readonly string[]
  /** Locale do HookContext no momento da operación. */
  readonly locale: string
}

/**
 * Opcións para HistoryPlugin.
 */
export interface HistoryOptions {
  /**
   * Límite máximo de entradas almacenadas (FIFO).
   * Cando se chega ao límite, a entrada máis antiga é eliminada.
   *
   * Default: 100.
   */
  readonly maxSize?: number
}

// ── FIN: HistoryPlugin types ──
```

### 5.9 — src/history/HistoryPlugin.ts (FIXADO)

```ts
// ── INICIO: HistoryPlugin ──
// Plugin oficial para Yggdrasil Forge que rastrea operacións
// unlock/lock/respec executadas no TreeEngine.
//
// **Sub-fase 8.5.a**: primeira implementación; tracking + FIFO +
// API pública.
// **Diferido a sub-fase futura**: undo/redo (require modificar
// TreeEngine para expoñer reverse operations).

import type { Plugin, PluginAPI, PluginEngineHandle } from '@yggdrasil-forge/core'
import type {
  HistoryEntry,
  HistoryOperation,
  HistoryOptions,
} from './types.js'

const DEFAULT_MAX_SIZE = 100

/**
 * Plugin oficial para rastrear operacións unlock/lock/respec.
 *
 * @example
 * const plugin = new HistoryPlugin({ maxSize: 50 })
 * await engine.registerPlugin(plugin)
 * await engine.unlock('nodeA')
 * plugin.getHistory()
 * // [{ operation: 'unlock', timestamp: ..., nodeIds: ['nodeA'], locale: 'gl' }]
 */
export class HistoryPlugin implements Plugin {
  readonly id = 'yggdrasil-history'
  readonly name = 'History Plugin'
  readonly version = '0.1.0'
  readonly apiVersion = '1.0.0'
  readonly permissions = ['register_hooks'] as const

  private readonly maxSize: number
  private readonly entries: HistoryEntry[] = []

  constructor(options?: HistoryOptions) {
    this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE
  }

  /**
   * Instala o plugin no engine. Rexistra 3 after* hooks (afterUnlock,
   * afterLock, afterRespec) que engaden entries á historia.
   */
  install(_engine: PluginEngineHandle, api: PluginAPI): void {
    api.registerHook('afterUnlock', (nodeId, ctx) => {
      this.addEntry('unlock', ctx.timestamp, [nodeId], ctx.locale)
    })
    api.registerHook('afterLock', (nodeId, ctx) => {
      this.addEntry('lock', ctx.timestamp, [nodeId], ctx.locale)
    })
    api.registerHook('afterRespec', (nodeIds, ctx) => {
      this.addEntry('respec', ctx.timestamp, [...nodeIds], ctx.locale)
    })
  }

  /**
   * Desinstala o plugin. Limpa as entries (boa cidadanía).
   * Os hooks rexistrados son automáticamente borrados polo
   * HookRunner.unregisterAllForPlugin chamado en PluginManager.unregister.
   */
  uninstall(_engine: PluginEngineHandle): void {
    this.entries.length = 0
  }

  /**
   * Engade unha entrada á historia. Se a historia chega ao maxSize,
   * elimina a máis antiga (FIFO).
   */
  private addEntry(
    operation: HistoryOperation,
    timestamp: number,
    nodeIds: readonly string[],
    locale: string,
  ): void {
    this.entries.push({ operation, timestamp, nodeIds, locale })
    while (this.entries.length > this.maxSize) {
      this.entries.shift()
    }
  }

  /**
   * Devolve un snapshot da historia (copia inmutable).
   */
  getHistory(): readonly HistoryEntry[] {
    return [...this.entries]
  }

  /**
   * Borra todas as entries.
   */
  clearHistory(): void {
    this.entries.length = 0
  }

  /**
   * Devolve o número actual de entries.
   */
  size(): number {
    return this.entries.length
  }

  /**
   * Devolve o maxSize configurado.
   */
  getMaxSize(): number {
    return this.maxSize
  }
}
// ── FIN: HistoryPlugin ──
```

**Decisións nesta peza**:
- **`permissions: ['register_hooks'] as const`**: tupla readonly
  por TypeScript correctness.
- **Constructor con opt object** (cero positional args; máis
  extensible).
- **`uninstall` limpa entries**: boa cidadanía aínda que cero
  obrigatorio.
- **`addEntry` private**: pure FIFO (`while` para casos onde maxSize
  reduciuse via opcións futuras).
- **`getHistory` devolve copia inmutable** (`[...this.entries]`)
  para evitar mutación externa.
- **`uninstall` parameter prefijado con `_`**: cero usado pero
  require por interface Plugin.
- **`install` parameter `_engine` igualmente**: cero usado en
  HistoryPlugin (cero require chamar engineHandle.getNodeState).

### 5.10 — src/history/index.ts (FIXADO)

```ts
// ── INICIO: history barrel ──
export { HistoryPlugin } from './HistoryPlugin.js'
export type {
  HistoryEntry,
  HistoryOperation,
  HistoryOptions,
} from './types.js'
// ── FIN: history barrel ──
```

### 5.11 — Tests prescritos (~18-20 tests)

**`__tests__/history/HistoryPlugin.test.ts`** (NOVO):

#### Constructor + configuration (3 tests)

1. **Constructor sen opts**: `new HistoryPlugin()` → maxSize=100 por
   defecto; size=0 inicial.
2. **Constructor con maxSize**: `new HistoryPlugin({ maxSize: 50 })`
   → getMaxSize()=50.
3. **Plugin properties**: `id`, `name`, `version`, `apiVersion`,
   `permissions: ['register_hooks']` correctos.

#### Install + hook registration (2 tests)

4. **install rexistra 3 hooks**: usa mock api; verifica que se
   chamou `api.registerHook` con 'afterUnlock', 'afterLock',
   'afterRespec' (3 chamadas).
5. **install cero modifica engine**: o método `_engine` non se usa.

#### Integration con TreeEngine real (5 tests)

6. **Tras unlock, historia ten 1 entry de tipo 'unlock'**: usar
   TreeEngine real, registerPlugin, unlock, verificar getHistory().
7. **Tras lock, historia engade entry 'lock'**.
8. **Tras respec, historia engade entry 'respec' con nodeIds
   array post-cascade**.
9. **HistoryEntry.timestamp** é o do ctx (cero require Date.now()
   propio).
10. **HistoryEntry.locale** propágase desde ctx.

#### FIFO behavior (3 tests)

11. **FIFO ao chegar a maxSize**: maxSize=2; tras 3 unlocks, queda
    [2nd, 3rd] (1st eliminada).
12. **FIFO con maxSize=1**: tras 5 ops, só 1 entry (a última).
13. **FIFO con maxSize=0**: tras N ops, historia vacía (edge case
    ben definido).

#### API pública (3 tests)

14. **clearHistory()** borra todas as entries.
15. **size()** devolve número correcto.
16. **getHistory() devolve copia inmutable**: modificar o array
    devolto non afecta a historia interna.

#### Uninstall (2 tests)

17. **uninstall borra entries**: tras unregisterPlugin, plugin.size()=0.
18. **uninstall + reinstall preserva instancia**: se o usuario
    reusa a instancia, os hooks son rexistrados de novo.

#### Edge cases (2 tests)

19. **Múltiples operacións rapidamente**: 100 unlocks consecutivos
    con maxSize=10 → só últimas 10.
20. **Cancel via beforeUnlock NON engade entry**: se outro plugin
    cancela unlock vía beforeUnlock, afterUnlock NON se chama →
    cero entry na historia. **Lección clave**: HistoryPlugin só
    rastrea operacións completadas.

**Total: ~20 tests**. Post-8.5.a esperado: 1673 → **~1693 core
tests** (engadindo os 20 de plugins).

**ATENCIÓN: o paquete @yggdrasil-forge/plugins** ten un test suite
**propio** (cero engadido a `core`). Tests do paquete:
- @yggdrasil-forge/plugins: **~20 tests novos**.
- @yggdrasil-forge/core: **1673 tests intactos**.

### 5.12 — Cleanup obsoleto en TreeEngine.ts (FIXADO)

**Modificar** `packages/core/src/engine/TreeEngine.ts` línea 1295.

**Localizar**:
```ts
  // Hooks beforeRespec/afterRespec DIFERIDOS a 8.4 (PluginManager + HookRunner).
```

**Substituír por**:
```ts
  // Hooks beforeRespec/afterRespec integrados en 8.4.c (via HookRunner).
```

**Cero outras modificacións** en TreeEngine.ts. **Cero impacto en
ningún teste** porque é só un comentario.

### 5.13 — Cobertura prescrita

- **HistoryPlugin.ts**: **100/100/100/100**.
- **types.ts, index.ts**: tipos puros; cero impacto.
- **TreeEngine.ts**: baseline mantida (modificación só de comentario).
- **Cero regresión** noutras pezas.

### 5.14 — pnpm install OBRIGATORIO

**Tras crear o scaffold do paquete**:
```bash
pnpm install
```

**Sen iso, pnpm non recoñece o novo paquete**, e tests/typecheck
fallan con "cannot find module". **OBRIGATORIO ANTES de T4**
(typecheck) e T5 (tests).

### 5.15 — Test counts esperados post-8.5.a

- **core**: 1673 tests (intactos).
- **common**: 60 tests (intactos).
- **storage**: 193 tests (intactos).
- **react**: 116 tests (intactos).
- **plugins**: **~20 tests novos** (paquete novo).
- **Total monorepo**: 2042 + ~20 = **~2062 tests**.

### 5.16 — Coordinación con 8.5.b

**8.5.b** engadirá:
- `packages/plugins/src/debug/DebugPlugin.ts`.
- `packages/plugins/src/debug/types.ts`.
- `packages/plugins/src/debug/index.ts`.
- `packages/plugins/__tests__/debug/DebugPlugin.test.ts`.
- Actualizar `src/index.ts` para exportar DebugPlugin.

**Reutiliza scaffold de 8.5.a**. Risco BAIXO-MEDIO.

### 5.17 — Lección 8.3 L1 aplicada

T0.2 verifica empíricamente:
```bash
ls packages/plugins/ 2>/dev/null && echo "ESCALAR" || echo "✅ libre"
```

### 5.18 — DT-14 fix proactivo

Aplicado dende inicio en `tsup.config.ts`. **DT-14 do MASTER**:

> tsup `dts: {composite: false, incremental: false}` necesario en
> paquetes que dependen de common (composite=true). Cazado en 3.4
> para storage. Outros 17 paquetes scaffold terán o mesmo problema
> cando se lles engada código real. **Plan**: propagar fix nun ciclo
> de hardening futuro ou paquete por paquete cando active cada un.

**8.5.a aplica o fix para o caso @plugins**, evitando o problema
preventivamente. **Cero require cleanup post-build adicional**.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| package.json | JSON | packages/plugins/package.json | ~50 |
| tsconfig.json | JSON | packages/plugins/tsconfig.json | ~15 |
| tsup.config.ts | TS config | packages/plugins/tsup.config.ts | ~20 |
| vitest.config.ts | TS config | packages/plugins/vitest.config.ts | ~12 |
| README.md | Markdown | packages/plugins/README.md | ~30 |
| src/index.ts | TS barrel | packages/plugins/src/index.ts | ~6 |
| history/types.ts | TS types | history/types.ts | ~35 |
| history/HistoryPlugin.ts | TS class | history/HistoryPlugin.ts | ~110 |
| history/index.ts | TS barrel | history/index.ts | ~6 |
| HistoryPlugin.test.ts | tests | tests/history/HistoryPlugin.test.ts | ~300 |
| TreeEngine cleanup | 1 línea | TreeEngine.ts | -1 modif |
| .changeset | YAML+md | .changeset/history-plugin-8-5-a.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~30 |

**Total estimado**: ~480 liñas (incluído ~300 de tests).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (11)**:
- `packages/plugins/package.json`
- `packages/plugins/tsconfig.json`
- `packages/plugins/tsup.config.ts`
- `packages/plugins/vitest.config.ts`
- `packages/plugins/README.md`
- `packages/plugins/src/index.ts`
- `packages/plugins/src/history/types.ts`
- `packages/plugins/src/history/HistoryPlugin.ts`
- `packages/plugins/src/history/index.ts`
- `packages/plugins/__tests__/history/HistoryPlugin.test.ts`
- `.changeset/history-plugin-8-5-a.md`

**MODIFICADOS (2)**:
- `packages/core/src/engine/TreeEngine.ts` (comentario cosmético).
- `CHANGELOG.md`.

**Total: 13 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/` salvo TreeEngine.ts
  (1 cosmético).
- Tests existentes (2042 totais en 4 paquetes).
- Outros paquetes en `packages/` (analytics, storage, etc. intactos).
- `package.json` root.
- `pnpm-workspace.yaml` (xa inclúe `packages/*`).
- `tsconfig.json` root.
- MASTER.md.

**Cambios esperados secundarios** (xerados por pnpm install; **NON
require commitealos** porque están en .gitignore):
- `packages/plugins/node_modules/`.
- `pnpm-lock.yaml`: pode actualizarse pero **non é unha modificación
  intencional**; require verificar diff.

**ATENCIÓN sobre pnpm-lock.yaml**: tras `pnpm install`, é probable
que se actualice. **Se cambia, incluír no commit como parte do
scaffold do paquete novo**. Cero "modificación non prevista".

**Se algún destes aparece** → **ESCALAR**:
- Modificación en outros paquetes scaffold (analytics, storage, etc.).
- Modificación en tests existentes.
- Modificación substancial de TreeEngine.ts (máis dunha línea).

---

## 8. CONVENCIÓNS

TS strict, cero `any`. **Paquete novo segue tódolos
estándares do monorepo**.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en HistoryPlugin (clase + tódolos métodos
públicos).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Tipos exportados** desde `src/index.ts`: HistoryEntry,
HistoryOptions, HistoryOperation. Plugin class exportada con
named export.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/`, `packages/react/`, outros
  paquetes scaffold (analytics, devtools, etc.).
- ❌ Modificar `packages/core/src/` salvo a línea 1295 de
  TreeEngine.ts (1 comentario cosmético).
- ❌ Modificar `packages/core/src/plugins/` (HookRunner,
  PluginManager, PluginAPI intactos).
- ❌ Modificar `packages/core/src/types/plugin.ts` (Plugin types xa
  tipados).
- ❌ Modificar **calquera test existente** (2042 totais en
  core/common/storage/react).
- ❌ Modificar `package.json` root, configs root.
- ❌ Modificar `pnpm-workspace.yaml` (xa inclúe `packages/*`).
- ❌ Modificar `tsconfig.json` root.
- ❌ Modificar MASTER.md.
- ❌ Engadir AnalyticsPlugin, DebugPlugin, Cooldown, Webhook, Audit
  (DIFERIDOS; 8.5.a só HistoryPlugin).
- ❌ Implementar undo/redo en HistoryPlugin (DIFERIDO; require
  modificar TreeEngine).
- ❌ Engadir dependency a packages diferentes de @common, @core
  (cero require).
- ❌ Usar `!` non-null assertions.
- ❌ Esquecer `pnpm install` antes de typecheck/tests.
- ❌ Olvidar o cleanup do comentario obsoleto en TreeEngine.ts.
- ❌ Esquecer aplicar DT-14 fix en tsup.config.ts (composite:false).
- ❌ Engadir métodos extras en HistoryPlugin non prescritos (e.g.,
  cero `addManualEntry`, cero `filterByOperation`, etc.).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T10)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `5baefa6` como HEAD.

**T0.2** — Verificacións empíricas críticas:

```bash
# Confirmar que packages/plugins/ non existe:
ls packages/plugins/ 2>/dev/null && echo "ESCALAR: xa existe" || echo "Non existe ✅"

# Confirmar pattern dos paquetes existentes (analytics como referencia):
ls packages/analytics/
cat packages/analytics/package.json | head -20

# Confirmar DT-14 fix en storage (referencia para tsup.config.ts):
grep -A 5 "composite" packages/storage/tsup.config.ts

# Confirmar comentario obsoleto en TreeEngine.ts línea 1295:
sed -n '1295p' packages/core/src/engine/TreeEngine.ts
# Esperado: "  // Hooks beforeRespec/afterRespec DIFERIDOS a 8.4 (PluginManager + HookRunner)."

# Confirmar Plugin + PluginAPI + PluginEngineHandle re-exportados
# desde @core:
grep -E "Plugin|PluginAPI|PluginEngineHandle" packages/core/src/index.ts | head -5
# Verificar que están dispoñibles para importar desde fora.
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1673 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear scaffold do paquete (6 ficheiros)

Aplicar §5.2-§5.7 literal. Crear:
- `packages/plugins/package.json`
- `packages/plugins/tsconfig.json`
- `packages/plugins/tsup.config.ts`
- `packages/plugins/vitest.config.ts`
- `packages/plugins/README.md`
- `packages/plugins/src/index.ts`

### T2 — pnpm install (OBRIGATORIO)

```bash
pnpm install
```

**Sen iso, T3 falla con "cannot find module"**.

**Verificación**: comprobar que pnpm recoñece o novo paquete:
```bash
pnpm list --filter @yggdrasil-forge/plugins
```

Esperado: paquete listado con version 0.0.0.

### T3 — Crear HistoryPlugin (3 ficheiros)

Aplicar §5.8-§5.10 literal:
- `packages/plugins/src/history/types.ts`
- `packages/plugins/src/history/HistoryPlugin.ts`
- `packages/plugins/src/history/index.ts`

### T4 — Build + typecheck do paquete novo

```bash
pnpm --filter @yggdrasil-forge/plugins build
pnpm turbo run typecheck --force                          # 22/22 + plugins
```

**Esperado**: build ok + typecheck passes 22/22 (engadindo plugins).

Se hai erros de tipo → **ESCALAR**.

### T5 — Crear tests HistoryPlugin.test.ts

Aplicar §5.11 literal (~18-20 tests).

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/plugins test --force      # ~20 tests
pnpm --filter @yggdrasil-forge/core test --force         # 1673 tests INTACTOS
```

**Especial atención**: cero tests existentes deben modificarse.

### T6 — Cleanup obsoleto en TreeEngine.ts

Aplicar §5.12 literal. Modificar línea 1295.

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/core test --force          # 1673 tests aínda intactos
pnpm turbo run typecheck --force                          # 22/22 + plugins
```

### T7 — Cobertura + verificación final

```bash
pnpm --filter @yggdrasil-forge/plugins exec vitest run --coverage 2>&1 | \
  grep -E "HistoryPlugin|^All files" | head -5
# Esperado:
#   HistoryPlugin.ts: 100/100/100/100
#   types.ts, index.ts: irrelevante (tipos)
```

Tests gobernais:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                          # 22 paquetes
pnpm turbo run test --force                               # tódolos paquetes
```

**Esperado**:
- core: 1673 tests (intactos).
- common: 60 tests (intactos).
- storage: 193 tests (intactos).
- react: 116 tests (intactos).
- **plugins: ~20 tests novos**.

### T8 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/plugins build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/plugins/src/ \
  packages/plugins/__tests__/ \
  packages/core/src/engine/TreeEngine.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T9 — Changeset + CHANGELOG

`.changeset/history-plugin-8-5-a.md`:
```
---
'@yggdrasil-forge/plugins': minor
---

feat(plugins): scaffold @yggdrasil-forge/plugins package + HistoryPlugin (sub-phase 8.5.a)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **`@yggdrasil-forge/plugins`** paquete novo (scaffold + scripts +
  configs + README) en `packages/plugins/`. Aliñado co MASTER literal
  para `import { HistoryPlugin } from '@yggdrasil-forge/plugins'`.
  - **DT-14 fix aplicado proactivamente** en tsup.config.ts
    (`dts.compilerOptions.composite: false`).
  - dependencias internas: `@yggdrasil-forge/common`, `@yggdrasil-forge/core`
    (workspace).
- **`HistoryPlugin`** primeiro plugin oficial. Rastrea operacións
  unlock/lock/respec via after* hooks. Implementa Plugin interface
  con permissions `['register_hooks']`:
  - Constructor: `new HistoryPlugin({ maxSize?: 100 })`.
  - `install(engine, api)`: rexistra afterUnlock + afterLock +
    afterRespec hooks.
  - `uninstall(engine)`: cleanup das entries.
  - `getHistory(): readonly HistoryEntry[]`: snapshot inmutable.
  - `clearHistory(): void`.
  - `size(): number`.
  - `getMaxSize(): number`.
- **`HistoryEntry`**, **`HistoryOptions`**, **`HistoryOperation`**
  tipos exportados.

### Changed
- `TreeEngine.ts` línea 1295: actualizar comentario obsoleto
  ("DIFERIDOS a 8.4" → "integrados en 8.4.c"). Cero impacto funcional.

### Note
- Sub-fase 8.5.a PRIMEIRA das 2 sub-sub-fases de 8.5 (Plugins
  oficiais). 8.5.b implementará DebugPlugin reutilizando o scaffold
  deste paquete.
- **DIFERIDOS en 8.5.a**:
  - **DebugPlugin** (8.5.b).
  - **AnalyticsPlugin, Cooldown, AutoUnlock, Webhook, Audit** (sub-fases
    futuras; mencionados en MASTER §40 como plugins built-in).
  - **Undo/redo en HistoryPlugin** (require modificar TreeEngine
    para expoñer reverse operations).
- **HistoryPlugin é "fire-and-forget"** desde a perspectiva de
  TreeEngine: as afterX hooks executan tras éxito da operación; cero
  pode cancelar (são "after" hooks, cero "before").
- **HistoryPlugin NON rastrea operacións canceladas**: se outro
  plugin cancela unlock via beforeUnlock, afterUnlock NON se chama
  → cero entry na historia. **Esta é a semántica correcta**:
  histories rastrean **operacións completadas**.
- **FIFO con maxSize**: cando se chega ao límite, a entrada máis
  antiga é eliminada (`shift()`).
- **`uninstall` cleanup das entries**: boa cidadanía aínda que cero
  obrigatorio (HookRunner.unregisterAllForPlugin xa borra os hooks).
- **Tests integration con TreeEngine real**: require
  `@yggdrasil-forge/core` como dependencia (workspace).
- **Cero modificación de pezas existentes** salvo o comentario
  cosmético en TreeEngine.ts línea 1295.
- **Cero modificación de calquera test existente** (2042 totais
  intactos).
- **Cero deps de npm externas engadidas**.
- **Cero modificación de packages/storage/, packages/react/**, outros
  paquetes scaffold.
- **DT-14 fix aplicado**: tsup.config.ts inclúe
  `dts.compilerOptions.composite:false` dende inicio para
  evitar problemas con paquetes que dependen transitivamente de
  @common.
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
  packages/plugins/ non existe antes de crear.
```

### T10 — Commit + push

Commit Conventional:
`feat(plugins): scaffold @yggdrasil-forge/plugins package + HistoryPlugin (sub-phase 8.5.a)`

Push directo a `origin/main` (base `5baefa6`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.5.a — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 5baefa6)
✅ Paquete NOVO @yggdrasil-forge/plugins creado:
   - package.json + tsconfig.json + tsup.config.ts + vitest.config.ts
   - README.md
   - src/index.ts (barrel)
   - DT-14 fix aplicado proactivamente en tsup.config.ts
   - dependencies: @common + @core (workspace)
✅ HistoryPlugin NOVO en packages/plugins/src/history/:
   - HistoryPlugin.ts: class con permissions ['register_hooks']
   - types.ts: HistoryEntry + HistoryOptions + HistoryOperation
   - index.ts: re-exports
   - install rexistra 3 after* hooks
   - uninstall limpa entries
   - API: getHistory, clearHistory, size, getMaxSize
   - FIFO con maxSize default 100
✅ TreeEngine.ts línea 1295 cleanup:
   - "DIFERIDOS a 8.4" → "integrados en 8.4.c"
✅ T0.2 verificación empírica (lección 8.3 L1):
   - packages/plugins/ non existe (libre)
   - Patrón dos paquetes existentes confirmado
   - DT-14 fix en storage confirmado como referencia
   - Comentario obsoleto en TreeEngine confirmado
✅ T2 pnpm install: paquete recoñecido
✅ T4 build + typecheck: 22/22 + plugins (NOVO no count)
✅ T5 verificación tests:
   - core: 1673 tests INTACTOS
   - plugins: ~20 tests novos pasan
✅ T6 cleanup TreeEngine.ts: cero impacto en testes (1673 OK)
✅ T7 cobertura HistoryPlugin: 100/100/100/100
✅ CERO modificación de calquera test existente
✅ CERO modificación de pezas existentes en packages/core/src/
   salvo TreeEngine.ts línea 1295 (cosmético)
✅ CERO modificación de outros paquetes (analytics, storage, etc.)
✅ CERO deps de npm externas engadidas
✅ CERO modificación de pnpm-workspace.yaml (xa inclúe packages/*)
✅ Tests: 1673 core (intactos) + 60 common + 193 storage + 116
   react + ~20 plugins = ~2062 monorepo
✅ Typecheck: 22 + plugins | Lint: 0/0 | Format: 0/0
✅ Build paquete plugins: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias (filtrar "TODOS")
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.5.a PRIMEIRA das 2 sub-sub-fases de 8.5.
   - 45 sub-fases consecutivas sen rollback.
   - Paquete @yggdrasil-forge/plugins activo (primeiro de 15 scaffold
     que se activan).
   - DT-14 fix aplicado proactivamente; outros paquetes scaffold
     non bloqueados ata activación.
   - 4 sub-fases pendentes (8.5.b, 8.6, 8.7, 8.8).
   - HistoryPlugin é "fire-and-forget"; rastrea só operacións
     completadas.
   - Undo/redo en HistoryPlugin DIFERIDO (require modificar
     TreeEngine).
   - AnalyticsPlugin/Cooldown/AutoUnlock/Webhook/Audit DIFERIDOS
     (sub-fases futuras específicas).
✅ Changeset minor (plugins) + nova [Unreleased]
✅ git status pre-commit: 13 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.5.b (DebugPlugin reutilizando scaffold).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.5.a. **PRIMEIRA das 2 sub-sub-fases de 8.5**.
Entrega scaffold completo do paquete @yggdrasil-forge/plugins
(primeiro de 15 paquetes scaffold que se activa) + HistoryPlugin
completo (clase Plugin con permissions + install + uninstall + API
pública robusta + FIFO con maxSize) + cleanup do comentario obsoleto
en TreeEngine.ts. 13 ficheiros tocados (11 NOVOS + 2 MODIFICADOS).
~20 tests novos. Risco MEDIO. Aplicación proactiva da lección
DT-14 dende inicio. Cero modificación de pezas existentes salvo
cosmético. Cero modificación de calquera test existente.*

*Decisións críticas documentadas:
- Paquete novo en @yggdrasil-forge/plugins (aliñado MASTER literal).
- DT-14 fix proactivo en tsup.config.ts.
- HistoryPlugin permissions ['register_hooks'].
- FIFO con maxSize default 100; configurable.
- uninstall cleanup das entries (boa cidadanía).
- Tests integration con TreeEngine real (peer workspace).
- Cleanup do comentario obsoleto incluído na sub-fase (cero require
  sub-fase separada).
- Undo/redo DIFERIDO; cero modificar TreeEngine para reverse ops.
- AnalyticsPlugin e demais DIFERIDOS (sub-fases futuras).*
