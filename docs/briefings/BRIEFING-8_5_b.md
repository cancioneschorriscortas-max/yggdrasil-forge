# BRIEFING — SUB-FASE 8.5.b de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEGUNDA das 2 sub-sub-fases de 8.5** (Plugins oficiais).
> Tras 8.5.a (scaffold + HistoryPlugin), 8.5.b engade **DebugPlugin**
> reutilizando o scaffold xa existente do paquete
> `@yggdrasil-forge/plugins`.
>
> **DebugPlugin**: plugin oficial que loga tódalas operacións do
> TreeEngine via hooks (8 hooks totais; preparación incluso de
> `computeCost` que aínda non se chama).
>
> **Pezas (4 grupos)**:
> 1. **DebugPlugin** (3 ficheiros NOVOS: types.ts + DebugPlugin.ts
>    + index.ts en `packages/plugins/src/debug/`).
> 2. **Tests** (~16) en `__tests__/debug/DebugPlugin.test.ts`.
> 3. **Actualizar** `src/index.ts` (+exports DebugPlugin + DebugOptions)
>    + `README.md` (+sección DebugPlugin paralela a HistoryPlugin).
> 4. **Housekeeping** (.changeset + CHANGELOG).
>
> **Decisións confirmadas polo director**:
> - **8 hooks rexistrados** (incluído `computeCost` que cero se
>   chama ata sub-fase futura; **preparación** sen impacto negativo).
> - **DebugOptions mínimo**: `{ enabled?: boolean, logLevel?: PluginLogLevel }`.
>   Cero `prefix` custom (PluginAPI.log xa engade `[plugin:id]`).
> - **Default**: `enabled=true`, `logLevel='debug'`.
> - **enabled=false**: cero hooks rexistrados durante install.
> - **before* handlers**: log + return true (cero cancela).
> - **after* handlers**: log + void.
> - **compute* handlers**: log + return defaultResult inchanged.
> - **Formato das mensaxes**: prescrito por hook (info contextual
>   sen ser verboso).
> - **README update**: sección DebugPlugin paralela a HistoryPlugin.
> - **Risco BAIXO-MEDIO**: reutiliza scaffold; aplica patrón
>   HistoryPlugin.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
> DebugPlugin non existe (xa verificado polo director).
>
> 8.6-8.8 DIFERIDOS.

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
- Pushed: `═══ SUB-FASE 8.5.b — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.5.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica en DebugOptions.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: DebugPlugin.ts chega a **100/100/100/100**.
Cero regresión na baseline post-8.5.a.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: cero modificación de
calquera test existente. Tódolos ~2062 tests previos (1673 core +
60 common + 193 storage + 116 react + 20 plugins) deben pasar
intactos.

**0.14 — Coherencia co patrón HistoryPlugin**: DebugPlugin segue
o mesmo patrón (Plugin interface + permissions + install + uninstall
+ tests con TreeEngine real).

**0.15 — Cero modificación de HistoryPlugin** (intacto desde 8.5.a).

**0.16 — Lección 8.3 L1 aplicada con rigor**: T0.2 verifica que
`packages/plugins/src/debug/` non existe.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.5.b** de Yggdrasil Forge. **SEGUNDA das 2 sub-sub-fases
de 8.5** (Plugins oficiais).

**Pezas (4 grupos)**:

**Grupo A — DebugPlugin (3 ficheiros NOVOS)**:
1. `packages/plugins/src/debug/types.ts` (NOVO; DebugOptions).
2. `packages/plugins/src/debug/DebugPlugin.ts` (NOVO; clase
   implementando Plugin).
3. `packages/plugins/src/debug/index.ts` (NOVO; re-exports).

**Grupo B — Tests (1 ficheiro NOVO)**:
4. `packages/plugins/__tests__/debug/DebugPlugin.test.ts` (NOVO;
   ~16 tests).

**Grupo C — Updates (2 MODIFICADOS)**:
5. `packages/plugins/src/index.ts`: engadir export DebugPlugin +
   DebugOptions.
6. `packages/plugins/README.md`: engadir sección DebugPlugin
   paralela a HistoryPlugin.

**Grupo D — Housekeeping**:
7. `.changeset/debug-plugin-8-5-b.md` (NOVO).
8. `CHANGELOG.md` (MODIFICADO).

**Total: 8 ficheiros tocados** (5 NOVOS + 3 MODIFICADOS).

**Cero modificación de**:
- `packages/plugins/src/history/` (HistoryPlugin intacto desde
  8.5.a).
- `packages/plugins/__tests__/history/` (HistoryPlugin.test.ts
  intacto).
- `packages/plugins/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts` (scaffold intacto).
- `packages/core/`, `packages/common/`, outros paquetes.
- Tests existentes (~2062 totais).
- `package.json` root, configs root, lockfile.
- `docs/architecture/MASTER.md`.

**CERO deps de npm externas engadidas**. Cero ErrorCodes novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `60a4404`, verificada
empíricamente)**.

### Tipos relevantes (verificados)

**PluginLogLevel** (verificado):
```ts
export type PluginLogLevel = 'debug' | 'info' | 'warn' | 'error'
```

**Plugin interface** (verificado en 8.4.b.ii):
```ts
interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly apiVersion: string
  readonly permissions?: readonly PluginPermission[]
  install(engine: PluginEngineHandle, api: PluginAPI): void | Promise<void>
  uninstall?(engine: PluginEngineHandle): void | Promise<void>
}
```

**PluginAPI.log** (verificado en 8.4.b.ii):
```ts
log(level: PluginLogLevel, message: string): void {
  const prefixed = `[plugin:${this.pluginId}] ${message}`
  switch (level) {
    case 'debug': console.debug(prefixed); return
    case 'info': console.info(prefixed); return
    case 'warn': console.warn(prefixed); return
    case 'error': console.error(prefixed); return
  }
}
```

**Decisión do director**: DebugPlugin reutiliza esta lóxica
(prefixo automático con `[plugin:yggdrasil-debug]`).

### Hooks dispoñibles (verificados desde 8.4.c)

| Hook | Chamado en TreeEngine? | Sub-fase |
|---|---|---|
| beforeUnlock | ✅ | 8.4.c |
| afterUnlock | ✅ | 8.4.c |
| beforeLock | ✅ | 8.4.c |
| afterLock | ✅ | 8.4.c |
| beforeRespec | ✅ | 8.4.c |
| afterRespec | ✅ | 8.4.c |
| computeUnlockability | ✅ | 8.4.c |
| computeCost | ❌ DIFERIDO | Sub-fase futura |

**Decisión do director**: DebugPlugin rexistra os **8 hooks**
(incluído computeCost). Preparación para futura conexión; cero
impacto negativo (HookRunner.runComputeCost existe pero non é
chamado).

### Patrón HistoryPlugin (verificado en 8.5.a)

Estructura:
```ts
class HistoryPlugin implements Plugin {
  readonly id = 'yggdrasil-history'
  readonly name = 'History Plugin'
  // ... etc
  readonly permissions = ['register_hooks'] as const
  
  constructor(options?: HistoryOptions) { ... }
  install(_engine, api) { ... }
  uninstall(_engine) { ... }
}
```

**DebugPlugin sigue mesmo patrón**.

### Estado scaffold (verificado tras 8.5.a)

```
packages/plugins/
├── README.md                     (39 liñas; engadir +sección Debug)
├── package.json                  (intacto)
├── tsconfig.json                 (intacto)
├── tsup.config.ts                (intacto; DT-14 fix xa aplicado)
├── vitest.config.ts              (intacto)
├── src/
│   ├── index.ts                  (modificar: +export DebugPlugin)
│   ├── history/                  (INTACTO)
│   │   ├── HistoryPlugin.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── debug/                    (NOVO en 8.5.b) ← obxectivo
│       ├── DebugPlugin.ts
│       ├── types.ts
│       └── index.ts
└── __tests__/
    ├── history/                  (INTACTO)
    │   └── HistoryPlugin.test.ts (20 tests)
    └── debug/                    (NOVO en 8.5.b)
        └── DebugPlugin.test.ts   (~16 tests)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `60a4404` (sub-fase 8.5.a — scaffold
  + HistoryPlugin).
- 1673 core + 60 common + 193 storage + 116 react + 20 plugins =
  **~2062 tests** monorepo limpo.
- Typecheck 23/23 successful (engadiu @plugins).
- Lint 0/0, format 0/0.
- 50 ErrorCodes existentes.
- DT abertas: 10 (DT-14 pechado parcialmente en 8.5.a; aínda válido
  para outros 14 paquetes scaffold).
- **Cadea 45 sub-fases consecutivas sen rollback**.
- **Paquetes activos: 5** (common, core, storage, react, plugins).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir **DebugPlugin** completo no paquete `@yggdrasil-forge/plugins`
(reutilizando o scaffold xa creado en 8.5.a): clase implementando
Plugin interface en `packages/plugins/src/debug/` (3 ficheiros:
types.ts + DebugPlugin.ts + index.ts); rexistra **8 hooks**
(beforeUnlock/afterUnlock/beforeLock/afterLock/beforeRespec/afterRespec/computeUnlockability/computeCost
— este último preparado para sub-fase futura que conecte) usando
`api.log(level, message)` para logging; `DebugOptions` mínimo (`{
enabled?: boolean (default true), logLevel?: PluginLogLevel (default
'debug') }`); `before*` handlers sempre devolven true (cero cancela);
`compute*` handlers devolven defaultResult inchanged (cero modifica);
**enabled=false** → cero hooks rexistrados; tests específicos (~16);
actualizar `src/index.ts` (+export DebugPlugin + DebugOptions) +
`README.md` (+sección paralela a HistoryPlugin). **Cero modificación
de HistoryPlugin ou scaffold existente**. **Cero modificación de
calquera test existente**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (5)**:
- `packages/plugins/src/debug/types.ts` (~30 liñas).
- `packages/plugins/src/debug/DebugPlugin.ts` (~140 liñas).
- `packages/plugins/src/debug/index.ts` (~6 liñas).
- `packages/plugins/__tests__/debug/DebugPlugin.test.ts` (~250
  liñas; ~16 tests).
- `.changeset/debug-plugin-8-5-b.md` (NOVO).

**MODIFICADOS (3)**:
- `packages/plugins/src/index.ts` (+2 liñas; engadir exports).
- `packages/plugins/README.md` (+~30 liñas; engadir sección
  DebugPlugin).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 8 ficheiros tocados** (5 NOVOS + 3 MODIFICADOS).

### 5.2 — src/debug/types.ts (FIXADO)

```ts
// ── INICIO: DebugPlugin types ──

import type { PluginLogLevel } from '@yggdrasil-forge/core'

/**
 * Opcións para DebugPlugin.
 */
export interface DebugOptions {
  /**
   * Se false, install() non rexistra ningún hook (plugin pasa a
   * estar "rexistrado pero inactivo").
   *
   * Default: true.
   */
  readonly enabled?: boolean

  /**
   * Nivel de log usado en tódalas mensaxes.
   *
   * Default: 'debug'.
   */
  readonly logLevel?: PluginLogLevel
}

// ── FIN: DebugPlugin types ──
```

### 5.3 — src/debug/DebugPlugin.ts (FIXADO)

```ts
// ── INICIO: DebugPlugin ──
// Plugin oficial para Yggdrasil Forge que loga tódalas operacións
// do TreeEngine via hooks.
//
// **Sub-fase 8.5.b**: rexistra os 8 hooks tipados en Hooks interface,
// usando api.log(level, message) para logging. **enabled=false**
// → cero hooks rexistrados (plugin rexistrado pero inactivo).
//
// **Preparación**: computeCost hook rexístrase aínda que cero se
// chame ata sub-fase futura que conecte. Preparación para futura
// integración; cero impacto negativo (HookRunner.runComputeCost
// existe pero non é chamado en TreeEngine actual).

import type {
  Plugin,
  PluginAPI,
  PluginEngineHandle,
  PluginLogLevel,
} from '@yggdrasil-forge/core'
import type { DebugOptions } from './types.js'

const DEFAULT_ENABLED = true
const DEFAULT_LOG_LEVEL: PluginLogLevel = 'debug'

/**
 * Plugin oficial que loga tódalas operacións do TreeEngine.
 *
 * @example
 * const plugin = new DebugPlugin({ logLevel: 'info' })
 * await engine.registerPlugin(plugin)
 * await engine.unlock('nodeA')
 * // Loga: [plugin:yggdrasil-debug] beforeUnlock: nodeA (locale=gl)
 * // Loga: [plugin:yggdrasil-debug] afterUnlock: nodeA (locale=gl)
 */
export class DebugPlugin implements Plugin {
  readonly id = 'yggdrasil-debug'
  readonly name = 'Debug Plugin'
  readonly version = '0.1.0'
  readonly apiVersion = '1.0.0'
  readonly permissions = ['register_hooks'] as const

  private readonly enabled: boolean
  private readonly logLevel: PluginLogLevel

  constructor(options?: DebugOptions) {
    this.enabled = options?.enabled ?? DEFAULT_ENABLED
    this.logLevel = options?.logLevel ?? DEFAULT_LOG_LEVEL
  }

  /**
   * Instala o plugin. Se enabled=true, rexistra os 8 hooks tipados.
   * Se enabled=false, cero hooks rexistrados.
   *
   * **Nota**: computeCost rexístrase aínda que non se chame ata
   * sub-fase futura que conecte (preparación).
   */
  install(_engine: PluginEngineHandle, api: PluginAPI): void {
    if (!this.enabled) return

    // ── Before hooks (cero cancelan; sempre devolven true) ──
    api.registerHook('beforeUnlock', (nodeId, ctx) => {
      api.log(this.logLevel, `beforeUnlock: ${nodeId} (locale=${ctx.locale})`)
      return true
    })
    api.registerHook('beforeLock', (nodeId, ctx) => {
      api.log(this.logLevel, `beforeLock: ${nodeId} (locale=${ctx.locale})`)
      return true
    })
    api.registerHook('beforeRespec', (nodeIds, ctx) => {
      api.log(
        this.logLevel,
        `beforeRespec: ${nodeIds.length} nodes (locale=${ctx.locale})`,
      )
      return true
    })

    // ── After hooks (cero return; só log) ──
    api.registerHook('afterUnlock', (nodeId, ctx) => {
      api.log(this.logLevel, `afterUnlock: ${nodeId} (locale=${ctx.locale})`)
    })
    api.registerHook('afterLock', (nodeId, ctx) => {
      api.log(this.logLevel, `afterLock: ${nodeId} (locale=${ctx.locale})`)
    })
    api.registerHook('afterRespec', (nodeIds, ctx) => {
      api.log(
        this.logLevel,
        `afterRespec: ${nodeIds.length} nodes (locale=${ctx.locale})`,
      )
    })

    // ── Compute hooks (devolven defaultResult inchanged; cero modifican) ──
    api.registerHook('computeUnlockability', (nodeId, defaultResult) => {
      api.log(this.logLevel, `computeUnlockability: ${nodeId}`)
      return defaultResult
    })
    api.registerHook('computeCost', (nodeId, defaultCost) => {
      // NOTA: este hook rexístrase pero non é chamado ata sub-fase
      // futura que conecte computeCost a TreeEngine.
      api.log(this.logLevel, `computeCost: ${nodeId}`)
      return defaultCost
    })
  }

  /**
   * Desinstala o plugin. Cero cleanup adicional require
   * (HookRunner.unregisterAllForPlugin xa borra os hooks).
   */
  uninstall(_engine: PluginEngineHandle): void {
    // Cero cleanup state interno require (DebugPlugin é stateless).
  }

  /**
   * Devolve se o plugin está habilitado.
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Devolve o nivel de log configurado.
   */
  getLogLevel(): PluginLogLevel {
    return this.logLevel
  }
}
// ── FIN: DebugPlugin ──
```

**Decisións nesta peza**:
- **Stateless**: cero estado interno (cero `entries`, cero `api`
  ref persistente). DebugPlugin é puro tracking via console.
- **`enabled=false` early return**: cero `registerHook` calls.
- **`before*` handlers sempre devolven true**: cero cancela operacións.
- **`compute*` handlers devolven defaultResult inchanged**: cero
  modifica resultados.
- **Mensaxes con contexto mínimo útil**: nodeId/nodeIds.length +
  locale. Cero verboso.
- **`computeCost` rexistrado mais cero chamado**: preparación
  documentada no comentario.
- **API públicas extra**: `isEnabled()` e `getLogLevel()` para
  inspección externa (útil en tests + debugging do propio plugin).
- **Cero `permissions` adicionais**: só `['register_hooks']`.
- **`uninstall` cero-op**: cero state interno; cero require cleanup
  (HookRunner xa fai unregisterAllForPlugin).

### 5.4 — src/debug/index.ts (FIXADO)

```ts
// ── INICIO: debug barrel ──
export { DebugPlugin } from './DebugPlugin.js'
export type { DebugOptions } from './types.js'
// ── FIN: debug barrel ──
```

### 5.5 — Modificar src/index.ts (FIXADO)

**Estado actual** (8.5.a):
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

**Estado esperado** (tras 8.5.b):
```ts
// ── INICIO: @yggdrasil-forge/plugins barrel ──
export { HistoryPlugin } from './history/index.js'
export type {
  HistoryEntry,
  HistoryOptions,
  HistoryOperation,
} from './history/index.js'

export { DebugPlugin } from './debug/index.js'
export type { DebugOptions } from './debug/index.js'
// ── FIN: @yggdrasil-forge/plugins barrel ──
```

### 5.6 — Modificar README.md (FIXADO)

**Engadir** sección DebugPlugin **despois** da sección HistoryPlugin
(antes da sección "License"):

```markdown
### DebugPlugin

Logs all TreeEngine operations via hooks (useful for debugging).

\`\`\`typescript
import { DebugPlugin } from '@yggdrasil-forge/plugins'

const debugPlugin = new DebugPlugin({ logLevel: 'info' })
await engine.registerPlugin(debugPlugin)

await engine.unlock('nodeA')
// Logs:
//   [plugin:yggdrasil-debug] beforeUnlock: nodeA (locale=gl)
//   [plugin:yggdrasil-debug] afterUnlock: nodeA (locale=gl)
\`\`\`

**Options:**
- \`enabled?: boolean\` (default: \`true\`) — if \`false\`, no hooks are registered.
- \`logLevel?: 'debug' | 'info' | 'warn' | 'error'\` (default: \`'debug'\`).

**Hooks registered (when enabled):**
- \`beforeUnlock\`, \`afterUnlock\`
- \`beforeLock\`, \`afterLock\`
- \`beforeRespec\`, \`afterRespec\`
- \`computeUnlockability\`
- \`computeCost\` (registered for future use; not currently invoked)

**API:**
- \`isEnabled(): boolean\` — returns whether the plugin is active.
- \`getLogLevel(): PluginLogLevel\` — returns the configured log level.

**Note**: \`before*\` hooks always return \`true\` (DebugPlugin never cancels operations). \`compute*\` hooks return the default result unchanged (DebugPlugin never modifies results).
```

### 5.7 — Tests prescritos (~16 tests)

**`__tests__/debug/DebugPlugin.test.ts`** (NOVO):

#### Constructor + configuration (4 tests)

1. **Constructor sen opts**: defaults `enabled=true`, `logLevel='debug'`.
2. **Constructor con `enabled=false`**: `isEnabled()=false`.
3. **Constructor con `logLevel='info'`**: `getLogLevel()='info'`.
4. **Plugin properties**: `id`, `name`, `version`, `apiVersion`,
   `permissions=['register_hooks']` correctos.

#### Install behavior (3 tests)

5. **Install con `enabled=true` rexistra 8 hooks**: usar mock api;
   verificar 8 chamadas a `api.registerHook` cos nomes correctos.
6. **Install con `enabled=false` cero hooks rexistrados**: 0
   chamadas a `api.registerHook`.
7. **Install dúas veces (re-install)**: rexistra 8 hooks cada vez
   (pode duplicar; aceptable comportamento).

#### Integration con TreeEngine real (4 tests)

8. **unlock con DebugPlugin** loga `beforeUnlock` + `afterUnlock`:
   spy en `console.debug`, verificar 2 chamadas con prefixo
   `[plugin:yggdrasil-debug]`.
9. **lock con DebugPlugin** loga `beforeLock` + `afterLock`.
10. **respec con DebugPlugin** loga `beforeRespec` + `afterRespec`
    con `nodeIds.length` correcto.
11. **canUnlock con DebugPlugin** loga `computeUnlockability`;
    resultado inchanged.

#### Before* return true (1 test)

12. **before* hooks sempre devolven true**: verificar via mock api
    + ler return values de cada hook.

#### Compute* return defaultResult (1 test)

13. **compute* hooks devolven defaultResult inchanged**:
    `computeUnlockability` recibe `{ allowed: true }` e devolve
    o mesmo obxecto (ou idéntico shape).

#### LogLevel propagation (4 tests)

14. **logLevel='debug' usa console.debug**: spy en console.debug
    + console.info; verificar só debug chamado.
15. **logLevel='info' usa console.info**.
16. **logLevel='warn' usa console.warn**.
17. **logLevel='error' usa console.error**.

#### Uninstall (1 test)

18. **uninstall non lanza erro**: `plugin.uninstall(mockEngine)`
    executa sen throw.

**Total: ~16-18 tests**. Post-8.5.b esperado: ~2062 → **~2080
totais monorepo**.

**Fixtures**:
- Mock PluginAPI con `vi.fn()` para registerHook + log.
- Mock PluginEngineHandle (pode ser `{} as PluginEngineHandle`
  porque DebugPlugin non usa engine).
- TreeEngine real para tests de integration (importar desde
  @yggdrasil-forge/core).
- `vi.spyOn(console, 'debug')` (e info/warn/error) para verificar
  outputs.

### 5.8 — Cobertura prescrita

- **DebugPlugin.ts**: **100/100/100/100**.
- **types.ts, index.ts**: tipos puros; cero impacto.
- **HistoryPlugin (intacto)**: 100/100/100/100 (xa).
- **Cero regresión** noutras pezas.

### 5.9 — Cero deps novas

Verificable empíricamente: cero modificación de package.json (root
ou plugins).

### 5.10 — Test counts esperados post-8.5.b

- **core**: 1673 tests (intactos).
- **common**: 60 tests (intactos).
- **storage**: 193 tests (intactos).
- **react**: 116 tests (intactos).
- **plugins**: 20 (HistoryPlugin) + ~16 (DebugPlugin) = **~36
  tests**.
- **Total monorepo**: ~2062 + ~16 = **~2078 tests**.

### 5.11 — Coordinación con sub-fases futuras

**Sub-fase futura específica** que conecte `computeCost` en TreeEngine:
DebugPlugin **xa ten o handler rexistrado**. Cero modificación de
DebugPlugin esperada cando esa sub-fase chegue (preparación incluída
en 8.5.b).

**8.6** (SearchPlugin) usará paquete separado `@yggdrasil-forge/search`.
**8.7** (ValidatorEngine) usará `@yggdrasil-forge/validators`.
**8.8** (Read-only mode) modifica TreeEngine constructor.

### 5.12 — Lección 8.3 L1 aplicada

T0.2 verifica empíricamente:
```bash
ls packages/plugins/src/debug/ 2>/dev/null && echo "ESCALAR" || echo "✅ libre"
ls packages/plugins/__tests__/debug/ 2>/dev/null && echo "ESCALAR" || echo "✅ libre"
```

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| DebugOptions | TS interface | debug/types.ts | ~25 |
| DebugPlugin class | clase + 8 hooks | debug/DebugPlugin.ts | ~140 |
| debug barrel | TS exports | debug/index.ts | ~6 |
| DebugPlugin tests | describe blocks | tests/debug/DebugPlugin.test.ts | ~250 |
| src/index.ts update | +exports | src/index.ts | +2 modif |
| README update | +sección | README.md | +~30 modif |
| .changeset | YAML+md | .changeset/debug-plugin-8-5-b.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~25 |

**Total estimado**: ~480 liñas (incluído ~250 de tests + ~30 de
README).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (5)**:
- `packages/plugins/src/debug/types.ts`
- `packages/plugins/src/debug/DebugPlugin.ts`
- `packages/plugins/src/debug/index.ts`
- `packages/plugins/__tests__/debug/DebugPlugin.test.ts`
- `.changeset/debug-plugin-8-5-b.md`

**MODIFICADOS (3)**:
- `packages/plugins/src/index.ts`
- `packages/plugins/README.md`
- `CHANGELOG.md`

**Total: 8 ficheiros tocados**.

**NON deben aparecer cambios en**:
- `packages/plugins/src/history/` (intacto desde 8.5.a).
- `packages/plugins/__tests__/history/` (intacto).
- `packages/plugins/package.json`, `tsconfig.json`,
  `tsup.config.ts`, `vitest.config.ts` (scaffold intacto).
- `packages/core/`, `packages/common/`, outros paquetes (intactos).
- Calquera test existente (~2062 totais).
- `package.json` root.
- `pnpm-lock.yaml` (cero deps novas → cero require update).
- `pnpm-workspace.yaml`, configs root.
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en DebugPlugin clase + métodos públicos (install,
uninstall, isEnabled, getLogLevel).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Coherencia con HistoryPlugin**: mesmo patrón de organización
(types.ts + Plugin.ts + index.ts).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/plugins/src/history/` (intacto desde 8.5.a).
- ❌ Modificar `packages/plugins/__tests__/history/` (intacto).
- ❌ Modificar `packages/plugins/package.json` (cero deps novas).
- ❌ Modificar outros configs (tsconfig.json, tsup.config.ts,
  vitest.config.ts).
- ❌ Modificar `packages/core/`, `packages/common/`,
  `packages/storage/`, `packages/react/`, outros paquetes.
- ❌ Modificar **calquera test existente** (~2062 totais).
- ❌ Engadir state interno persistente en DebugPlugin (stateless
  é decisión do director).
- ❌ Engadir métodos extras non prescritos (e.g., cero `getStats`,
  `pause`, `resume`, etc.).
- ❌ Implementar `prefix` custom (PluginAPI.log xa engade
  `[plugin:id]`).
- ❌ Modificar HistoryPlugin (intacto).
- ❌ Engadir AnalyticsPlugin, Cooldown, AutoUnlock, Webhook, Audit
  (DIFERIDOS).
- ❌ Modificar comportamento de hooks (before* return true; after*
  void; compute* return defaultResult).
- ❌ Engadir cancelación lóxica (DebugPlugin nunca cancela).
- ❌ Engadir `permissions` adicionais (só `'register_hooks'`).
- ❌ Engadir deps de npm externas.
- ❌ Usar `!` non-null assertions.
- ❌ Esquecer actualizar `src/index.ts` con DebugPlugin exports.
- ❌ Esquecer actualizar README.md con sección DebugPlugin.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `60a4404` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar que debug/ non existe en src nin tests:
ls packages/plugins/src/debug/ 2>/dev/null && echo "ESCALAR: xa existe" || echo "src/debug/ libre ✅"
ls packages/plugins/__tests__/debug/ 2>/dev/null && echo "ESCALAR" || echo "tests/debug/ libre ✅"

# Confirmar HistoryPlugin intacto (referencia):
ls packages/plugins/src/history/
ls packages/plugins/__tests__/history/

# Confirmar PluginLogLevel e Plugin types exportados:
grep -E "PluginLogLevel|^export type Plugin" packages/core/src/types/plugin.ts | head -3
grep -E "Plugin|PluginAPI|PluginEngineHandle|PluginLogLevel" packages/core/src/index.ts | head -10

# Confirmar HookRunner.runComputeCost existe (preparación):
grep "runComputeCost" packages/core/src/plugins/HookRunner.ts
# Esperado: 1 match (definición; cero chamadas en TreeEngine)
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 23/23
pnpm --filter @yggdrasil-forge/plugins test --force     # 20 tests (HistoryPlugin)
pnpm --filter @yggdrasil-forge/core test --force        # 1673 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear DebugPlugin (3 ficheiros)

Aplicar §5.2-§5.4 literal:
- `packages/plugins/src/debug/types.ts`
- `packages/plugins/src/debug/DebugPlugin.ts`
- `packages/plugins/src/debug/index.ts`

### T2 — Modificar src/index.ts

Aplicar §5.5 literal.

### T3 — Verificación typecheck

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/plugins build              # build OK
```

### T4 — Crear tests DebugPlugin.test.ts

Aplicar §5.7 literal (~16 tests).

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/plugins test --force      # 20 + 16 = ~36 tests
pnpm --filter @yggdrasil-forge/core test --force         # 1673 tests INTACTOS
```

### T5 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/plugins exec vitest run --coverage 2>&1 | \
  grep -E "DebugPlugin|HistoryPlugin|^All files" | head -5
# Esperado:
#   DebugPlugin.ts: 100/100/100/100
#   HistoryPlugin.ts: 100/100/100/100 (intacto)
```

### T6 — Modificar README.md

Aplicar §5.6 literal. Engadir sección DebugPlugin **despois** da
sección HistoryPlugin, **antes** de "License".

### T7 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/plugins build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/plugins/src/debug/ \
  packages/plugins/__tests__/debug/
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T8 — Verificación final

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm turbo run test --force                               # tódolos paquetes
# Esperado:
#   core: 1673 (intactos)
#   common: 60 (intactos)
#   storage: 193 (intactos)
#   react: 116 (intactos)
#   plugins: 20 + ~16 = ~36
```

### T9 — Changeset + CHANGELOG + commit + push

`.changeset/debug-plugin-8-5-b.md`:
```
---
'@yggdrasil-forge/plugins': minor
---

feat(plugins): add DebugPlugin for logging all TreeEngine operations (sub-phase 8.5.b)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **`DebugPlugin`** segundo plugin oficial en
  `@yggdrasil-forge/plugins`. Loga tódalas operacións do TreeEngine
  via hooks (8 hooks rexistrados; incluído `computeCost` que cero
  se chama ata sub-fase futura — preparación). Implementa Plugin
  interface con permissions `['register_hooks']`:
  - Constructor: `new DebugPlugin({ enabled?: true, logLevel?: 'debug' })`.
  - `install(engine, api)`: rexistra 8 hooks (3 before* + 3 after*
    + 2 compute*) se `enabled=true`. Cero hooks se `enabled=false`.
  - `uninstall(engine)`: cero cleanup require (stateless).
  - `isEnabled(): boolean`.
  - `getLogLevel(): PluginLogLevel`.
- **`DebugOptions`** tipo exportado.
- Actualizado `src/index.ts` con exports de DebugPlugin + DebugOptions.
- Actualizado `README.md` con sección DebugPlugin paralela a
  HistoryPlugin.

### Note
- Sub-fase 8.5.b ÚLTIMA das 2 sub-sub-fases de 8.5 (Plugins
  oficiais). **🎯 FASE 8.5 PECHADA**.
- **8 hooks rexistrados**: 6 que se chaman en 8.4.c (unlock/lock/respec
  before/after) + `computeUnlockability` (chamado) + `computeCost`
  (rexistrado pero cero chamado ata sub-fase futura).
- **DebugPlugin é stateless**: cero state interno persistente. Cero
  cleanup require en uninstall (HookRunner xa borra hooks
  rexistrados via unregisterAllForPlugin).
- **before* handlers sempre devolven true**: DebugPlugin nunca
  cancela operacións.
- **compute* handlers devolven defaultResult inchanged**: DebugPlugin
  nunca modifica resultados.
- **enabled=false**: install cero rexistra hooks (plugin pasa a
  estar "rexistrado pero inactivo").
- **Mensaxes con contexto mínimo útil**: nodeId/nodeIds.length +
  locale. Cero verboso.
- **HistoryPlugin INTACTO** desde 8.5.a.
- **Cero modificación de packages/core/, packages/common/,
  packages/storage/, packages/react/** ou outros.
- **Cero modificación de calquera test existente** (~2062 totais
  intactos).
- **Cero deps de npm externas engadidas**.
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
  packages/plugins/src/debug/ non existe antes de crear.
- **🎯 PLUGINS OFICIAIS PHASE 8.5 COMPLETA**: HistoryPlugin (8.5.a)
  + DebugPlugin (8.5.b). 3 sub-fases pendentes na Fase 8 (8.6
  SearchPlugin, 8.7 ValidatorEngine, 8.8 Read-only mode).
```

Commit Conventional:
`feat(plugins): add DebugPlugin for logging all TreeEngine operations (sub-phase 8.5.b)`

Push directo a `origin/main` (base `60a4404`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.5.b — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 60a4404)
✅ DebugPlugin NOVO en packages/plugins/src/debug/:
   - DebugPlugin.ts: class stateless con permissions ['register_hooks']
   - types.ts: DebugOptions { enabled?, logLevel? }
   - index.ts: re-exports
   - install rexistra 8 hooks (cero hooks se enabled=false)
   - 3 before* devolven true (cero cancela)
   - 3 after* só logan
   - 2 compute* devolven defaultResult inchanged
   - computeCost rexistrado pero cero chamado (preparación)
   - API: isEnabled(), getLogLevel()
✅ src/index.ts actualizado con DebugPlugin + DebugOptions exports
✅ README.md actualizado con sección DebugPlugin paralela
✅ T0.2 verificación empírica (lección 8.3 L1):
   - packages/plugins/src/debug/ non existe (libre)
   - HistoryPlugin intacto (referencia)
   - Plugin types exportados desde @core
✅ T3 build + typecheck: 23/23 paquetes
✅ T4 verificación:
   - 20 HistoryPlugin tests INTACTOS
   - ~16 DebugPlugin tests novos pasan
   - core 1673 tests INTACTOS
✅ T5 cobertura DebugPlugin: 100/100/100/100
✅ CERO modificación de HistoryPlugin (intacto)
✅ CERO modificación de scaffold (package.json, tsconfig, tsup,
   vitest configs intactos)
✅ CERO modificación de outros paquetes
✅ CERO modificación de calquera test existente (~2062 totais)
✅ CERO deps de npm externas engadidas
✅ Tests: plugins 20 + ~16 = ~36 | Core: 1673 (intactos) |
   Common: 60 | Storage: 193 | React: 116 = ~2078 monorepo
✅ Typecheck: 23/23 | Lint: 0/0 | Format: 0/0
✅ Build paquete plugins: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias (filtrar "TODOS")
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.5.b ÚLTIMA das 2 de 8.5.
   - 🎯 FASE 8.5 PECHADA: HistoryPlugin + DebugPlugin oficiais
     completados.
   - 46 sub-fases consecutivas sen rollback.
   - DebugPlugin é stateless (cero state interno persistente).
   - 8 hooks rexistrados; computeCost diferido a sub-fase futura.
   - 3 sub-fases pendentes (8.6 SearchPlugin, 8.7 ValidatorEngine,
     8.8 Read-only mode).
✅ Changeset minor (plugins) + nova [Unreleased]
✅ git status pre-commit: 8 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.6 (SearchPlugin + @yggdrasil-forge/search package).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.5.b. **ÚLTIMA das 2 sub-sub-fases de 8.5**.
Engade DebugPlugin completo reutilizando o scaffold de 8.5.a:
stateless class con 8 hooks rexistrados (incluído computeCost
preparación), DebugOptions mínimo (enabled + logLevel), API
pública isEnabled + getLogLevel. **Cero modificación de
HistoryPlugin nin scaffold**. 8 ficheiros tocados (5 NOVOS + 3
MODIFICADOS). ~16 tests novos. Risco BAIXO-MEDIO. Lección 8.3 L1
aplicada con rigor en T0.2.*

*🎯 **FASE 8.5 PECHADA TRAS 8.5.b**: HistoryPlugin (8.5.a) +
DebugPlugin (8.5.b) oficiais completados. 3 sub-fases pendentes
na Fase 8 (8.6, 8.7, 8.8).*
