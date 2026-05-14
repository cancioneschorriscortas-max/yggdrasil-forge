# BRIEFING EXECUTABLE — Sub-fase 1.4
## Yggdrasil Forge: Tipos de @core (3ª onda) + substitución de placeholders

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa
- `@yggdrasil-forge/common` con código real
- `@yggdrasil-forge/core` con tipos das ondas 1 e 2:
  - Onda 1 (1.2): Result, Node, Edge, Tree, RichContent, errores
  - Onda 2 (1.3): unlock, resources, i18n, events, plugin
- CI verde, 28 tests pasan
- Documento mestre en `docs/architecture/MASTER.md`

Esta é a **3ª e última onda de tipos** antes de empezar a lóxica do motor (1.5+).

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.4**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Sección 7.4** (NodeDef completa, NodeInstance)
- **Sección 7.5** (TimeConstraints)
- **Sección 7.6** (StatContribution)
- **Sección 7.7** (ProgressSourceConfig)
- **Sección 7.8** (AuthConfig)
- **Sección 7.9** (Effects DSL)
- **Sección 7.12** (Builds, snapshots, loadouts)
- **Sección 7.13** (Audit)
- **Sección 7.14** (TreeChange)
- **Sección 5.6** (decisións resoltas das 5 críticas pendentes — esencial)
- **Sección 56** (EngineMetrics)

---

## 3. OBXECTIVO DESTA SUB-FASE

Dúas partes integradas:

### Parte A: Crear 8 módulos de tipos novos

1. **`audit.ts`** — AuditEntry, AuditAction, AuditFilter
2. **`changes.ts`** — TreeChange (con `rename_node_id` e validacións de campos non modificables)
3. **`time.ts`** — TimeConstraints, TimeManagerOptions
4. **`stats.ts`** — StatContribution
5. **`auth.ts`** — AuthConfig, AuthProvider
6. **`metrics.ts`** — EngineMetrics
7. **`progress.ts`** — ProgressSourceConfig, ProgressHandler
8. **`build.ts`** — Build, BuildShareLink, BuildSnapshot
9. **`effects.ts`** — Effect DSL completo

### Parte B: Substituír placeholders `unknown`

Os tipos placeholder en NodeDef, TreeDef, events.ts e plugin.ts deben substituirse polos tipos reais agora dispoñibles:

- **NodeDef:** `cost`, `costPerTier`, `effects`, `prerequisites`, `progressSource`, `subtreeOverrides`, `timeConstraints`, `statContributions`
- **TreeDef:** `resources`, `startingBudget`, `i18n`
- **TreeState:** `budget`
- **NodeInstance:** `subtreeState`
- **events.ts:** `BuildPlaceholder`, `AuditEntryPlaceholder`, `TreeChangePlaceholder`
- **plugin.ts:** `StorageAdapterPlaceholder` e `LayoutAlgorithmPlaceholder` **MANTENSE como están** (esos tipos están en outras fases — 3.x e 4.x).

Tras esta sub-fase, **todos os tipos fundamentais de @core están completos** e listos para que a lóxica do motor (TreeEngine, UnlockResolver, etc.) os use.

---

## 4. DECISIÓNS XA TOMADAS

### 4.1 Tipos das 5 decisións críticas (sec. 5.6 do mestre)

- **AuthConfig:** sistema de auth providers rexistrables. Tokens nunca persistidos.
- **TimeConstraints:** dual API (UTC ms + calendar object con timezone explícita).
- **TreeChange:** id e type non modificables vía `modify_node`; operación dedicada `rename_node_id`.
- **Effect DSL:** declarativo, sen eval, reversible.

### 4.2 Convención de campos opcionais

Todos os campos opcionais usan `?:`. Para campos que poden ser readonly arrays vacíos, mellor `readonly Foo[]` que `readonly Foo[] | undefined` por defecto.

### 4.3 Tipos `unknown` que SE MANTEÑEN

- **`StorageAdapterPlaceholder`** en plugin.ts → tipo real chega en Fase 3 (Persistencia)
- **`LayoutAlgorithmPlaceholder`** en plugin.ts → tipo real chega en Fase 4 (Layout)
- **`LayoutConfig`** en tree.ts → estructura específica de cada layout chega en Fase 4
- **`PluginEngineHandle`** → tipo real cando se cree TreeEngine (sub-fase 1.12)

Estos quedan como `unknown` ou estructura abstracta por agora.

### 4.4 Imports

- Relativos con `.js`
- `import type` para tipos
- Cero `any`

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: 8c5347c
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 Crear packages/core/src/types/effects.ts

```typescript
// ── INICIO: Effects DSL ──
// DSL declarativo para describir efectos secundarios ao desbloquear nodos.
// Os efectos son serializables, reversibles (para respec) e seguros (sen eval).

import type { NodeState } from './node.js'
import type { UnlockCondition } from './unlock.js'

/**
 * Efecto declarativo: un cambio que ocorre cando se executa unha acción
 * (desbloquear nodo, alcanzar milestone, etc.).
 *
 * O motor aplica os efectos no orde definido. Para respec, aplícase a operación
 * inversa de cada efecto (cando é reversible).
 *
 * Tipos de efecto:
 *
 * - `modify_resource` — Cambia a cantidade dun recurso (+/-/*)
 * - `modify_stat` — Cambia un stat global
 * - `modify_node_state` — Cambia o estado dun nodo
 * - `set_node_visibility` — Mostra ou agocha un nodo
 * - `unlock_node` — Desbloquea outro nodo en cascada
 * - `set_progress` — Establece a porcentaxe de progreso dun nodo
 * - `trigger_event` — Emite un evento custom (con `irreversible` para non desfacer)
 * - `conditional` — Avalía unha condición e aplica `then` ou `else`
 * - `composite` — Agrupación de efectos para executar en sucesión
 * - `plugin` — Delega a lóxica a un plugin rexistrado
 */
export type Effect =
  | {
      readonly type: 'modify_resource'
      readonly resourceId: string
      readonly op: '+' | '-' | '*'
      readonly amount: number
    }
  | {
      readonly type: 'modify_stat'
      readonly statId: string
      readonly op: '+' | '-' | '*'
      readonly amount: number
    }
  | { readonly type: 'modify_node_state'; readonly nodeId: string; readonly state: NodeState }
  | { readonly type: 'set_node_visibility'; readonly nodeId: string; readonly visible: boolean }
  | { readonly type: 'unlock_node'; readonly nodeId: string }
  | { readonly type: 'set_progress'; readonly nodeId: string; readonly percent: number }
  | {
      readonly type: 'trigger_event'
      readonly eventName: string
      readonly payload?: unknown
      /** Cando true, este efecto NON se desfai durante respec. */
      readonly irreversible?: boolean
    }
  | {
      readonly type: 'conditional'
      readonly condition: UnlockCondition
      readonly then: readonly Effect[]
      readonly else?: readonly Effect[]
    }
  | { readonly type: 'composite'; readonly effects: readonly Effect[] }
  | {
      readonly type: 'plugin'
      readonly pluginId: string
      readonly params?: Readonly<Record<string, unknown>>
    }

/**
 * Resultado da aplicación dun efecto.
 */
export interface EffectResult {
  readonly effect: Effect
  readonly applied: boolean
  readonly reason?: string
}
// ── FIN: Effects DSL ──
```

### 5.2 Crear packages/core/src/types/time.ts

```typescript
// ── INICIO: Time-based mechanics types ──
// Restricións temporais: caducidades, cooldowns, re-certificacións.

/**
 * Restricións temporais dun nodo.
 *
 * Mestura tres modos:
 * - **UTC ms** (absolutos): startsAt, expiresAt — timestamps directos
 * - **Relativos** (TZ-independentes): validForMs, cooldownMs, reCertifyAfterMs
 * - **Calendario** (TZ-aware): expiresAtCalendar para casos "expira o luns ás 9am en Madrid"
 *
 * @example Certificación corporativa válida 1 ano
 * { validForMs: 365 * 24 * 60 * 60 * 1000, reCertifyAfterMs: 365 * 24 * 60 * 60 * 1000 }
 *
 * @example Misión con deadline absoluto
 * { expiresAt: 1715347200000 }
 *
 * @example Deadline en TZ específica
 * { expiresAtCalendar: { date: '2027-05-10', time: '23:59:59', timezone: 'Europe/Madrid' } }
 */
export interface TimeConstraints {
  /** Timestamp UTC ms — non dispoñible antes deste momento. */
  readonly startsAt?: number

  /** Timestamp UTC ms — caduca neste momento. */
  readonly expiresAt?: number

  /** Caduca neste momento calendario con TZ explícita. */
  readonly expiresAtCalendar?: {
    /** Formato ISO YYYY-MM-DD. */
    readonly date: string
    /** Formato ISO HH:mm:ss. */
    readonly time: string
    /** Timezone IANA, ex: "Europe/Madrid". */
    readonly timezone: string
  }

  /** Despois de desbloquear, caduca tras N ms. */
  readonly validForMs?: number

  /** Tempo mínimo entre desbloqueos repetidos. */
  readonly cooldownMs?: number

  /** Tempo tras o que se solicita re-certificación. */
  readonly reCertifyAfterMs?: number
}

/**
 * Opcións de configuración do TimeManager.
 */
export interface TimeManagerOptions {
  /** Activa o sistema time-based no motor. */
  readonly enabled: boolean
  /** Intervalo de verificación de caducidades en ms (defecto 60000). */
  readonly checkIntervalMs?: number
  /** Antelación con que avisar antes da caducidade (ms). */
  readonly leadTimeMs?: number
  /** Timezone por defecto cando un nodo non especifica expiresAtCalendar.timezone. */
  readonly timezone?: string
}
// ── FIN: Time-based mechanics types ──
```

### 5.3 Crear packages/core/src/types/stats.ts

```typescript
// ── INICIO: Stats types ──
// Contribucións de nodos a stats globais (procesadas polo StatComputer).

import type { UnlockCondition } from './unlock.js'

/**
 * Operación dunha contribución a un stat.
 *
 * O StatComputer aplica todas as contribucións activas no orden de
 * adición e tras procesar a operación segundo a aritmética definida.
 *
 * - `+` `-` `*` `/` — aritmética
 * - `min` `max` — toma o menor/maior entre o valor actual e o aportado
 * - `set` — sobrescribe o valor (úsase con precaución)
 */
export type StatContributionOp = '+' | '-' | '*' | '/' | 'min' | 'max' | 'set'

/**
 * Contribución dun nodo a un stat global.
 *
 * Cada nodo desbloqueado pode aportar a múltiples stats. O StatComputer
 * agrega todas as contribucións activas para devolver o valor actual.
 *
 * @example Folla afiada da carteira de armas
 * {
 *   statId: 'damage',
 *   op: '+',
 *   value: 5,
 *   perTier: true,  // +5 dano por cada tier
 * }
 *
 * @example Buff condicional
 * {
 *   statId: 'damage',
 *   op: '*',
 *   value: 1.1,
 *   conditions: [{ type: 'node_unlocked', nodeId: 'sharp_blade' }],
 * }
 */
export interface StatContribution {
  readonly statId: string
  readonly op: StatContributionOp
  readonly value: number
  /** Cando true, o valor multiplícase polo tier actual do nodo. */
  readonly perTier?: boolean
  /** Condicións dinámicas que deben cumprirse para que a contribución se aplique. */
  readonly conditions?: readonly UnlockCondition[]
}

/**
 * Explicación do cálculo dun stat (para devtools e debugging).
 */
export interface StatExplanation {
  readonly statId: string
  readonly finalValue: number
  readonly contributions: readonly {
    readonly nodeId: string
    readonly op: StatContributionOp
    readonly value: number
    readonly appliedTier: number
    readonly conditional?: boolean
  }[]
}
// ── FIN: Stats types ──
```

### 5.4 Crear packages/core/src/types/auth.ts

```typescript
// ── INICIO: Auth types ──
// Sistema de auth providers para fontes externas de progreso.
// Tokens NUNCA se persisten en storage; sempre obtidos via provider.

/**
 * Configuración de autenticación para fontes externas (Moodle, YouTube, etc.).
 *
 * Tipos:
 *
 * - `none` — Sen autenticación
 * - `bearer` (estático) — Token literal (só para tests/desenvolvemento)
 * - `bearer` (provider) — Token obtido dinamicamente via provider rexistrado
 * - `apikey` (estático) — Key en header
 * - `apikey` (provider) — Key obtida dinamicamente
 * - `basic` — Usuario + contrasinal (HTTP Basic Auth)
 * - `custom` — Handler completo personalizado
 */
export type AuthConfig =
  | { readonly type: 'none' }
  | { readonly type: 'bearer'; readonly token: string }
  | { readonly type: 'bearer'; readonly tokenProvider: string }
  | { readonly type: 'apikey'; readonly header: string; readonly key: string }
  | { readonly type: 'apikey'; readonly header: string; readonly keyProvider: string }
  | { readonly type: 'basic'; readonly username: string; readonly password: string }
  | { readonly type: 'custom'; readonly requestHandlerId: string }

/**
 * Provider de credenciais: función async que devolve o token actual.
 *
 * Encapsula a lóxica de obter/refrescar tokens. O motor chama a esta
 * función cada vez que precisa un token; o provider pode cachear
 * internamente.
 */
export type AuthProvider = () => Promise<string>

/**
 * Handler para o tipo 'custom' — recibe a request e devolve as cabeceiras.
 */
export type AuthRequestHandler = (
  request: { readonly url: string; readonly method?: string },
) => Promise<Record<string, string>>
// ── FIN: Auth types ──
```

### 5.5 Crear packages/core/src/types/progress.ts

```typescript
// ── INICIO: Progress source types ──
// Fontes externas de progreso (Moodle, YouTube, callbacks, eventos, computados).

import type { AuthConfig } from './auth.js'

/**
 * Configuración da fonte de progreso dun nodo.
 *
 * Cinco tipos:
 *
 * - `manual` — Progreso establecido só pola API (engine.setProgress)
 * - `remote` — Polling a un endpoint HTTP
 * - `callback` — Handler async rexistrado polo usuario
 * - `event` — Reactivo a eventos custom (ex. emisor de Moodle)
 * - `computed` — Calculado a partir doutros nodos (sum/avg/min/max)
 */
export type ProgressSourceConfig =
  | { readonly type: 'manual' }
  | {
      readonly type: 'remote'
      readonly endpoint: string
      readonly intervalMs?: number
      readonly headers?: Readonly<Record<string, string>>
      readonly auth?: AuthConfig
    }
  | {
      readonly type: 'callback'
      /** ID dun handler rexistrado en engine.registerProgressHandler(). */
      readonly handlerId: string
      readonly intervalMs?: number
    }
  | {
      readonly type: 'event'
      /** Nome do evento emitido por engine.emit() ao que reaccionar. */
      readonly eventName: string
    }
  | {
      readonly type: 'computed'
      /** IDs dos nodos dependentes. */
      readonly dependsOn: readonly string[]
      /** Función agregadora. */
      readonly formula: 'sum' | 'avg' | 'min' | 'max'
    }

/**
 * Handler para fontes de progreso tipo `callback`.
 *
 * Pode ter tres formas:
 * - Sen argumentos (handler simple)
 * - Recibe nodeId
 * - Recibe nodeId + contexto adicional
 */
export type ProgressHandler =
  | (() => Promise<number>)
  | ((nodeId: string) => Promise<number>)
  | ((nodeId: string, ctx: ProgressHandlerContext) => Promise<number>)

/**
 * Contexto pasado aos progress handlers cando se solicita.
 */
export interface ProgressHandlerContext {
  /** Locale activa. */
  readonly locale: string
  /** Timestamp UTC ms da solicitude. */
  readonly timestamp: number
  /** Metadata libre. */
  readonly metadata: Readonly<Record<string, unknown>>
}
// ── FIN: Progress source types ──
```

### 5.6 Crear packages/core/src/types/build.ts

```typescript
// ── INICIO: Build types ──
// Estado serializable dunha "build" do usuario: o que ten desbloqueado,
// o seu presuposto, e metadata para compartir/comparar.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { TreeState } from './tree.js'

/**
 * Estado serializable dunha build de usuario.
 *
 * Inclúe identificación, metadata e o TreeState completo no momento
 * en que se gardou.
 */
export interface Build {
  /** ID único da build. */
  readonly id: string
  /** ID da árbore (TreeDef.id) á que pertence. */
  readonly treeId: string
  /** Versión da TreeDef cando se gardou. */
  readonly treeVersion: string
  /** Versión do esquema de TreeDef (SCHEMA_VERSION en common). */
  readonly schemaVersion: string
  /** Etiqueta user-facing. */
  readonly label?: LocalizedString
  /** Autor (usuario, sesión, etc.). */
  readonly author?: string
  /** Timestamp UTC ms de creación. */
  readonly createdAt: number
  /** Timestamp UTC ms da última actualización. */
  readonly updatedAt: number
  /** Estado da árbore no momento de gardar. */
  readonly state: TreeState
  /** ID da build pai (para snapshots derivados). */
  readonly parentBuildId?: string
  /** Tags arbitrarias para clasificar. */
  readonly tags?: readonly string[]
}

/**
 * Enlace compartible dunha build.
 *
 * Permite que outro usuario importe a build via URL ou código curto.
 */
export interface BuildShareLink {
  /** URL completa que codifica a build. */
  readonly url: string
  /** Código curto alfanumérico para resolver via servidor. */
  readonly shortCode: string
  /** Data URL ou URL dunha imaxe QR opcional. */
  readonly qrCode?: string
  /** URL para embebido nun iframe externo. */
  readonly embedUrl?: string
}

/**
 * Snapshot dunha build (un punto guardado no tempo).
 */
export interface BuildSnapshot {
  readonly id: string
  readonly buildId: string
  readonly label?: string
  readonly createdAt: number
  readonly state: TreeState
}
// ── FIN: Build types ──
```

### 5.7 Crear packages/core/src/types/audit.ts

```typescript
// ── INICIO: Audit types ──
// Rexistro estruturado de accións realizadas sobre a árbore.

import type { TreeChange } from './changes.js'

/**
 * Acción rexistrada no audit log.
 *
 * Cada acción é un evento discreto que cambiou o estado da árbore.
 */
export type AuditAction =
  | { readonly type: 'node_unlocked'; readonly nodeId: string; readonly tier: number }
  | { readonly type: 'node_locked'; readonly nodeId: string }
  | {
      readonly type: 'progress_updated'
      readonly nodeId: string
      readonly from: number
      readonly to: number
    }
  | { readonly type: 'respec'; readonly nodeIds: readonly string[] }
  | { readonly type: 'build_imported'; readonly source: 'url' | 'file' | 'remote' }
  | { readonly type: 'tree_loaded'; readonly treeId: string }
  | { readonly type: 'tree_changed'; readonly changes: readonly TreeChange[] }
  | { readonly type: 'node_expired'; readonly nodeId: string }
  | {
      readonly type: 'progress_synced_external'
      readonly nodeId: string
      readonly from: number
      readonly to: number
    }
  | { readonly type: 'custom'; readonly name: string; readonly data: unknown }

/**
 * Entrada do audit log: unha acción rexistrada con metadata.
 */
export interface AuditEntry {
  /** ID único da entrada. */
  readonly id: string
  /** Timestamp UTC ms cando ocorreu. */
  readonly timestamp: number
  /** Identificador do actor (userId, sessionId, 'system'). */
  readonly actor?: string
  /** A acción realizada. */
  readonly action: AuditAction
  /** Contexto adicional libre. */
  readonly context?: Readonly<Record<string, unknown>>
  /** Cando true, esta acción pode ser revertida. */
  readonly rollbackable?: boolean
}

/**
 * Filtro para consultas ao audit log.
 *
 * Útil para queries tipo "todos os unlocks de student-42 entre dúas datas".
 */
export interface AuditFilter {
  readonly actor?: string
  readonly action?: { readonly type: AuditAction['type'] }
  readonly from?: number
  readonly to?: number
  readonly limit?: number
}
// ── FIN: Audit types ──
```

### 5.8 Crear packages/core/src/types/changes.ts

```typescript
// ── INICIO: TreeChange types ──
// Operacións declarativas para modificar a TreeDef en runtime.
// Aplícanse mediante engine.applyChanges([...]).

import type { EdgeDef } from './edge.js'
import type { GroupDef, LayoutConfig } from './tree.js'
import type { NodeDef } from './node.js'
import type { Resource } from './resources.js'

/**
 * Cambios permitidos en modify_node.
 *
 * Excluímos `id` e `type` porque NON se poden modificar:
 * - Para renomear un nodo, usar `rename_node_id` (que actualiza referencias).
 * - Para cambiar o tipo, eliminar + crear novo (cambio semántico maior).
 */
export type ModifyNodeChanges = Omit<Partial<NodeDef>, 'id' | 'type'>

/**
 * Cambios permitidos en modify_edge.
 *
 * Excluímos `id`, `source` e `target`:
 * - id non se renomea (eliminar + recrear).
 * - source/target cambiarían a semántica do edge; mellor eliminar + recrear.
 */
export type ModifyEdgeChanges = Omit<Partial<EdgeDef>, 'id' | 'source' | 'target'>

/**
 * Cambio declarativo na TreeDef.
 *
 * Aplícanse en lote via engine.applyChanges([...]). O motor valida cada cambio,
 * invalida caches afectadas, reconcilia NodeInstances e emite eventos.
 */
export type TreeChange =
  | { readonly type: 'add_node'; readonly node: NodeDef }
  | {
      readonly type: 'remove_node'
      readonly nodeId: string
      /** Cando true, tamén elimina edges relacionados con este nodo. */
      readonly cascadeEdges?: boolean
    }
  | {
      readonly type: 'modify_node'
      readonly nodeId: string
      readonly changes: ModifyNodeChanges
    }
  | { readonly type: 'rename_node_id'; readonly oldId: string; readonly newId: string }
  | { readonly type: 'add_edge'; readonly edge: EdgeDef }
  | { readonly type: 'remove_edge'; readonly edgeId: string }
  | {
      readonly type: 'modify_edge'
      readonly edgeId: string
      readonly changes: ModifyEdgeChanges
    }
  | { readonly type: 'add_group'; readonly group: GroupDef }
  | { readonly type: 'remove_group'; readonly groupId: string }
  | {
      readonly type: 'modify_group'
      readonly groupId: string
      readonly changes: Partial<GroupDef>
    }
  | { readonly type: 'add_resource'; readonly resource: Resource }
  | { readonly type: 'modify_layout'; readonly changes: Partial<LayoutConfig> }
// ── FIN: TreeChange types ──
```

### 5.9 Crear packages/core/src/types/metrics.ts

```typescript
// ── INICIO: Engine metrics ──
// Métricas runtime do TreeEngine.

/**
 * Snapshot das métricas do motor.
 *
 * Útil para devtools, monitoring e profiling. Os campos representan
 * acumulacións desde o startup do engine ou desde o último reset.
 */
export interface EngineMetrics {
  // Contadores acumulados
  readonly unlocksTotal: number
  readonly locksTotal: number
  readonly respecsTotal: number
  readonly errorsTotal: number
  readonly applyChangesTotal: number

  // Taxas (por segundo, calculadas en xanela móbil)
  readonly treeChangesPerSecond: number

  // Tempos medios (ms)
  readonly avgUnlockTime: number
  readonly avgLayoutTime: number
  readonly avgPathfindTime: number
  readonly avgStatComputeTime: number

  // Tamaño do dominio
  readonly nodeCount: number
  readonly edgeCount: number
  readonly pluginCount: number

  // Memoria estimada
  readonly estimatedMemoryBytes: number

  // Cache
  readonly cacheHitRate: number
  readonly cacheSize: number

  // External
  readonly externalProgressSourcesActive: number
  readonly pendingExternalSyncs: number
}
// ── FIN: Engine metrics ──
```

### 5.10 Substituír placeholders en packages/core/src/types/node.ts

Hai que reemprazar varios campos de NodeDef. Cargar o ficheiro actual e cambiar:

**Imports** (engadir ao topo, despois dos imports existentes):

```typescript
import type { Effect } from './effects.js'
import type { ProgressSourceConfig } from './progress.js'
import type { StatContribution } from './stats.js'
import type { TimeConstraints } from './time.js'
import type { Cost } from './resources.js'
import type { UnlockRule } from './unlock.js'
import type { TreeState } from './tree.js'
import type { TreeDef } from './tree.js'
```

**En NodeDef**, substituír cada campo `unknown` polo tipo real:

```typescript
// Antes (placeholders):
readonly cost?: readonly unknown[]
readonly costPerTier?: readonly (readonly unknown[])[]
readonly effects?: readonly unknown[]
readonly prerequisites?: unknown
readonly progressSource?: unknown
readonly subtreeOverrides?: unknown
readonly timeConstraints?: unknown
readonly statContributions?: readonly unknown[]

// Despois (tipos reais):
readonly cost?: readonly Cost[]
readonly costPerTier?: readonly (readonly Cost[])[]
readonly effects?: readonly Effect[]
readonly prerequisites?: UnlockRule
readonly progressSource?: ProgressSourceConfig
readonly subtreeOverrides?: Partial<TreeDef>
readonly timeConstraints?: TimeConstraints
readonly statContributions?: readonly StatContribution[]
```

**En NodeInstance**, substituír `subtreeState?: unknown`:

```typescript
readonly subtreeState?: TreeState
```

⚠️ **CIRCULAR REFERENCE WARNING:** TreeState → NodeInstance → TreeState. TypeScript permítello con `import type`. Se aparecen erros, comprobar que **todos** os imports cruzados usan `import type`.

### 5.11 Substituír placeholders en packages/core/src/types/tree.ts

**Imports** (engadir ao topo):

```typescript
import type { Budget, Resource } from './resources.js'
import type { I18nConfig } from './i18n.js'
```

**En TreeDef**, substituír:

```typescript
// Antes:
readonly resources?: readonly unknown[]
readonly startingBudget?: unknown
readonly i18n?: unknown

// Despois:
readonly resources?: readonly Resource[]
readonly startingBudget?: Budget
readonly i18n?: I18nConfig
```

**En TreeState**, substituír:

```typescript
// Antes:
budget: unknown

// Despois:
budget: Budget
```

### 5.12 Substituír placeholders en packages/core/src/types/events.ts

**Imports** (engadir ao topo):

```typescript
import type { AuditEntry } from './audit.js'
import type { Build } from './build.js'
import type { TreeChange } from './changes.js'
```

Eliminar as tres definicións placeholder ao principio do ficheiro:

```typescript
// Eliminar:
type BuildPlaceholder = unknown
type AuditEntryPlaceholder = unknown
type TreeChangePlaceholder = unknown
```

Substituír no EventMap:

```typescript
// Antes:
readonly buildLoaded: (build: BuildPlaceholder) => void
readonly treeChanged: (changes: readonly TreeChangePlaceholder[]) => void
readonly auditEntry: (entry: AuditEntryPlaceholder) => void

// Despois:
readonly buildLoaded: (build: Build) => void
readonly treeChanged: (changes: readonly TreeChange[]) => void
readonly auditEntry: (entry: AuditEntry) => void
```

### 5.13 Actualizar packages/core/src/types/index.ts

Substituír o contido completo por:

```typescript
// ── INICIO: types public API ──
// Tipos públicos do paquete @yggdrasil-forge/core.
//
// Ondas:
// - 1ª (1.2): Result, Node, Edge, Tree, RichContent, errors
// - 2ª (1.3): unlock, resources, i18n, events, plugin
// - 3ª (1.4): effects, time, stats, auth, progress, build, audit, changes, metrics
//             + substitución de placeholders en Node/Tree/events

// Result
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './result.js'

// Content
export type { RichContent, NodeContent } from './content.js'

// Node
export type {
  NodeType,
  NodeState,
  NodeDef,
  NodeInstance,
  StateChange,
  Position,
} from './node.js'
export { freezeNodeDef } from './node.js'

// Edge
export type { EdgeType, EdgeDef, EdgeStyle } from './edge.js'

// Tree
export type { TreeDef, TreeState, GroupDef, StatDef, LayoutConfig } from './tree.js'

// Resources (1.3)
export type { Resource, Cost, Budget } from './resources.js'

// I18n config (1.3)
export type { I18nConfig } from './i18n.js'

// Unlock (1.3)
export type {
  UnlockCondition,
  UnlockRule,
  UnlockCheck,
  UnlockExplanation,
  UnlockConditionEvaluation,
} from './unlock.js'

// Events (1.3)
export type { EventMap, EventName, EventHandler } from './events.js'

// Plugin (1.3)
export type {
  Plugin,
  PluginAPI,
  PluginEngineHandle,
  PluginInstallResult,
  PluginLogLevel,
  PluginPermission,
  Hooks,
  HookContext,
  ConditionEvaluator,
  StorageAdapterPlaceholder,
  LayoutAlgorithmPlaceholder,
} from './plugin.js'

// Effects (1.4)
export type { Effect, EffectResult } from './effects.js'

// Time (1.4)
export type { TimeConstraints, TimeManagerOptions } from './time.js'

// Stats (1.4)
export type { StatContribution, StatContributionOp, StatExplanation } from './stats.js'

// Auth (1.4)
export type { AuthConfig, AuthProvider, AuthRequestHandler } from './auth.js'

// Progress (1.4)
export type {
  ProgressSourceConfig,
  ProgressHandler,
  ProgressHandlerContext,
} from './progress.js'

// Build (1.4)
export type { Build, BuildShareLink, BuildSnapshot } from './build.js'

// Audit (1.4)
export type { AuditEntry, AuditAction, AuditFilter } from './audit.js'

// Changes (1.4)
export type { TreeChange, ModifyNodeChanges, ModifyEdgeChanges } from './changes.js'

// Metrics (1.4)
export type { EngineMetrics } from './metrics.js'

// Errors (re-export from common)
export {
  ErrorCode,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from './errors.js'
// ── FIN: types public API ──
```

### 5.14 Actualizar packages/core/__tests__/types/exports.test.ts

Engadir un novo bloque `describe('1.4 — wave 3 types', ...)` despois do bloque de 1.3. Engadir antes do peche final `})`:

```typescript
  describe('1.4 — wave 3 types', () => {
    it('Effect supports all variants structurally', () => {
      const effects: core.Effect[] = [
        { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 },
        { type: 'modify_stat', statId: 'damage', op: '+', amount: 5 },
        { type: 'modify_node_state', nodeId: 'x', state: 'unlocked' },
        { type: 'set_node_visibility', nodeId: 'x', visible: false },
        { type: 'unlock_node', nodeId: 'x' },
        { type: 'set_progress', nodeId: 'x', percent: 75 },
        { type: 'trigger_event', eventName: 'achievement', irreversible: true },
        {
          type: 'conditional',
          condition: { type: 'node_unlocked', nodeId: 'a' },
          then: [{ type: 'unlock_node', nodeId: 'b' }],
        },
        { type: 'composite', effects: [{ type: 'unlock_node', nodeId: 'x' }] },
        { type: 'plugin', pluginId: 'my-plugin', params: { foo: 'bar' } },
      ]
      expect(effects).toHaveLength(10)
    })

    it('TimeConstraints supports UTC, relative, and calendar modes', () => {
      const utc: core.TimeConstraints = { expiresAt: 1715347200000 }
      const relative: core.TimeConstraints = {
        validForMs: 365 * 24 * 60 * 60 * 1000,
        cooldownMs: 60000,
        reCertifyAfterMs: 365 * 24 * 60 * 60 * 1000,
      }
      const calendar: core.TimeConstraints = {
        expiresAtCalendar: {
          date: '2027-05-10',
          time: '23:59:59',
          timezone: 'Europe/Madrid',
        },
      }
      expect(utc.expiresAt).toBe(1715347200000)
      expect(relative.validForMs).toBeGreaterThan(0)
      expect(calendar.expiresAtCalendar?.timezone).toBe('Europe/Madrid')
    })

    it('StatContribution supports all ops and perTier/conditions', () => {
      const ops: core.StatContributionOp[] = ['+', '-', '*', '/', 'min', 'max', 'set']
      expect(ops).toHaveLength(7)

      const contribution: core.StatContribution = {
        statId: 'damage',
        op: '+',
        value: 5,
        perTier: true,
        conditions: [{ type: 'node_unlocked', nodeId: 'sharp_blade' }],
      }
      expect(contribution.perTier).toBe(true)
    })

    it('AuthConfig supports all auth modes', () => {
      const configs: core.AuthConfig[] = [
        { type: 'none' },
        { type: 'bearer', token: 'static-token' },
        { type: 'bearer', tokenProvider: 'moodle-token' },
        { type: 'apikey', header: 'X-API-Key', key: 'static-key' },
        { type: 'apikey', header: 'X-API-Key', keyProvider: 'my-provider' },
        { type: 'basic', username: 'u', password: 'p' },
        { type: 'custom', requestHandlerId: 'my-handler' },
      ]
      expect(configs).toHaveLength(7)
    })

    it('ProgressSourceConfig supports all 5 source types', () => {
      const sources: core.ProgressSourceConfig[] = [
        { type: 'manual' },
        { type: 'remote', endpoint: 'https://api.example.com', intervalMs: 30000 },
        { type: 'callback', handlerId: 'my-handler' },
        { type: 'event', eventName: 'lesson.completed' },
        {
          type: 'computed',
          dependsOn: ['video_1', 'quiz_1', 'practice_1'],
          formula: 'avg',
        },
      ]
      expect(sources).toHaveLength(5)
    })

    it('Build type is structurally valid', () => {
      const build: core.Build = {
        id: 'build-001',
        treeId: 'panadeiro',
        treeVersion: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: {
          nodes: {},
          budget: { resources: {} },
        },
      }
      expect(build.id).toBe('build-001')
      expect(build.state.budget.resources).toEqual({})
    })

    it('AuditAction supports all action types', () => {
      const actions: core.AuditAction[] = [
        { type: 'node_unlocked', nodeId: 'x', tier: 1 },
        { type: 'node_locked', nodeId: 'x' },
        { type: 'progress_updated', nodeId: 'x', from: 0, to: 50 },
        { type: 'respec', nodeIds: ['a', 'b'] },
        { type: 'build_imported', source: 'url' },
        { type: 'tree_loaded', treeId: 'panadeiro' },
        { type: 'tree_changed', changes: [] },
        { type: 'node_expired', nodeId: 'cert_gdpr' },
        { type: 'progress_synced_external', nodeId: 'video_1', from: 50, to: 100 },
        { type: 'custom', name: 'my-action', data: { foo: 'bar' } },
      ]
      expect(actions).toHaveLength(10)
    })

    it('TreeChange supports all change types including rename_node_id', () => {
      const changes: core.TreeChange[] = [
        { type: 'add_node', node: { id: 'x', type: 'small', label: 'X' } },
        { type: 'remove_node', nodeId: 'x', cascadeEdges: true },
        { type: 'modify_node', nodeId: 'x', changes: { label: 'Updated' } },
        { type: 'rename_node_id', oldId: 'old', newId: 'new' },
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
        { type: 'remove_edge', edgeId: 'e1' },
        { type: 'modify_edge', edgeId: 'e1', changes: { weight: 2 } },
        { type: 'add_group', group: { id: 'g1', label: 'G1' } },
        { type: 'remove_group', groupId: 'g1' },
        { type: 'modify_group', groupId: 'g1', changes: { color: '#fff' } },
        {
          type: 'add_resource',
          resource: { id: 'gold', label: 'Gold', initial: 0 },
        },
        { type: 'modify_layout', changes: { type: 'radial' } },
      ]
      expect(changes).toHaveLength(12)
    })

    it('NodeDef now accepts concrete types instead of unknown', () => {
      const node: core.NodeDef = {
        id: 'panadeiro_forno',
        type: 'cluster',
        label: { gl: 'Forno', es: 'Horno', en: 'Oven' },
        cost: [{ resourceId: 'xp', amount: 100 }],
        effects: [
          { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 },
        ],
        prerequisites: {
          type: 'all',
          conditions: [{ type: 'node_unlocked', nodeId: 'panadeiro_inicio' }],
        },
        timeConstraints: {
          validForMs: 365 * 24 * 60 * 60 * 1000,
        },
        statContributions: [{ statId: 'cocina', op: '+', value: 5 }],
      }
      expect(node.cost?.[0]?.resourceId).toBe('xp')
      expect(node.effects?.[0]?.type).toBe('modify_resource')
    })

    it('TreeDef accepts concrete resources and i18n', () => {
      const tree: core.TreeDef = {
        id: 'panadeiro',
        schemaVersion: '1.0.0',
        version: '1.0.0',
        label: 'Panadeiro',
        nodes: [],
        edges: [],
        layout: { type: 'radial' },
        resources: [{ id: 'xp', label: 'XP', initial: 0 }],
        startingBudget: { resources: { xp: 0 } },
        i18n: { defaultLocale: 'gl', fallbackLocale: 'en' },
        stats: [{ id: 'cocina', label: 'Cocina', initial: 0 }],
      }
      expect(tree.resources?.[0]?.id).toBe('xp')
      expect(tree.startingBudget?.resources['xp']).toBe(0)
    })

    it('EngineMetrics has all expected fields', () => {
      const metrics: core.EngineMetrics = {
        unlocksTotal: 0,
        locksTotal: 0,
        respecsTotal: 0,
        errorsTotal: 0,
        applyChangesTotal: 0,
        treeChangesPerSecond: 0,
        avgUnlockTime: 0,
        avgLayoutTime: 0,
        avgPathfindTime: 0,
        avgStatComputeTime: 0,
        nodeCount: 0,
        edgeCount: 0,
        pluginCount: 0,
        estimatedMemoryBytes: 0,
        cacheHitRate: 0,
        cacheSize: 0,
        externalProgressSourcesActive: 0,
        pendingExternalSyncs: 0,
      }
      expect(metrics.unlocksTotal).toBe(0)
    })
  })
```

### 5.15 Verificación local

```bash
pnpm lint:fix
pnpm format
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @yggdrasil-forge/core test:coverage
pnpm validate
```

⚠️ **Atención á circular reference** TreeState ↔ NodeInstance. Se `pnpm typecheck` ou `pnpm build` da erro, verifica que **todos os imports cruzados entre node.ts, tree.ts, build.ts usan `import type`**, non `import` simple.

### 5.16 Engadir changeset

```bash
pnpm changeset
```

**ATENCIÓN:** seleccionar **minor**, non major. O wizard pode preseleccionar major; usar tecla de cancelar e refacer se ocorre.

Responder:
- Selecciona `@yggdrasil-forge/core`
- Major? **NON** (Enter sen marcar nada — non confundir)
- Minor? **SI** para core (espazo + Enter)
- Summary: `Add wave 3 of foundational types: Effect DSL, TimeConstraints (dual API: UTC ms + calendar with timezone), StatContribution, AuthConfig (registrable providers), ProgressSourceConfig, Build/BuildShareLink/BuildSnapshot, AuditEntry/AuditAction, TreeChange (with rename_node_id), EngineMetrics. Replace all unknown placeholders in NodeDef, TreeDef, TreeState, NodeInstance, EventMap with concrete types.`

### 5.17 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: wave 3 type definitions
  - `Effect` DSL with 10 effect types (modify_resource, modify_stat, modify_node_state, set_node_visibility, unlock_node, set_progress, trigger_event, conditional, composite, plugin)
  - `TimeConstraints` with dual API (UTC ms absolutes/relatives + calendar with explicit timezone)
  - `TimeManagerOptions`
  - `StatContribution` with 7 operations (+/-/*//min/max/set), perTier, conditional contributions
  - `StatExplanation` for debugging stat computations
  - `AuthConfig` (none/bearer-static/bearer-provider/apikey-static/apikey-provider/basic/custom)
  - `AuthProvider`, `AuthRequestHandler`
  - `ProgressSourceConfig` (5 types: manual/remote/callback/event/computed)
  - `ProgressHandler`, `ProgressHandlerContext`
  - `Build`, `BuildShareLink`, `BuildSnapshot`
  - `AuditEntry`, `AuditAction` (10 action types), `AuditFilter`
  - `TreeChange` (12 change types including `rename_node_id` with auto-reference updates)
  - `ModifyNodeChanges`, `ModifyEdgeChanges` (constrained partials excluding id/type)
  - `EngineMetrics`

### Changed
- `NodeDef`: `unknown` placeholders replaced with concrete types
  - `cost`, `costPerTier`: `Cost[]`
  - `effects`: `Effect[]`
  - `prerequisites`: `UnlockRule`
  - `progressSource`: `ProgressSourceConfig`
  - `subtreeOverrides`: `Partial<TreeDef>`
  - `timeConstraints`: `TimeConstraints`
  - `statContributions`: `StatContribution[]`
- `TreeDef`: `resources`, `startingBudget`, `i18n` now use concrete types
- `TreeState.budget`: now `Budget`
- `NodeInstance.subtreeState`: now `TreeState` (circular reference resolved via `import type`)
- `EventMap`: `buildLoaded`, `treeChanged`, `auditEntry` now use concrete types
```

### 5.18 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add wave 3 types and replace unknown placeholders with concrete types"
git push origin main
```

Verifica **CI verde**. Se falla, **detente e reporta**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN** en todos os ficheiros novos.
- **Idioma de comentarios:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar código.
- **Imports relativos con `.js`**.
- **`import type` SEMPRE** entre os módulos que teñen referencias circulares (node ↔ tree ↔ build).
- **Evitar `sed` para edicións multi-liña** (introduce duplicacións en Windows). Preferir Python ou edición directa.
- **`readonly` masivo** en todos os campos de tipos inmutables.
- **Cero `any`**, cero `console.log`.

---

## 7. QUE NON FACER

- ❌ Non crear clases (TreeEngine, StatComputer, etc. — vén en 1.5+).
- ❌ Non implementar a lóxica de EffectsRunner, TimeManager, etc.
- ❌ Non substituír `LayoutConfig.[key: string]: unknown` (chega en Fase 4).
- ❌ Non substituír `StorageAdapterPlaceholder` nin `LayoutAlgorithmPlaceholder` en plugin.ts (chegan despois).
- ❌ Non substituír `PluginEngineHandle` (chega cando se cree TreeEngine).
- ❌ Non engadir dependencias externas.
- ❌ Non publicar nada en npm.
- ❌ Non usar `sed` para edicións multi-liña.

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ 8 ficheiros novos en `packages/core/src/types/`:
   - effects.ts, time.ts, stats.ts, auth.ts, progress.ts, build.ts, audit.ts, changes.ts, metrics.ts
   *(NB: son 9 nomes pero metrics e audit son fusionables conceptualmente; conta 9 ficheiros novos.)*
2. ✅ `node.ts` actualizado: 8 campos `unknown` substituídos por tipos reais
3. ✅ `tree.ts` actualizado: 3 campos placeholder substituídos
4. ✅ `events.ts` actualizado: 3 placeholders eliminados, EventMap con tipos reais
5. ✅ `index.ts` actualizado con todos os exports da 3ª onda
6. ✅ `exports.test.ts` actualizado con tests da 3ª onda (10+ novos casos)
7. ✅ Cobertura nas funcións con lóxica: 100% (sen cambios)
8. ✅ `pnpm typecheck`, `pnpm build`, `pnpm test` pasan
9. ✅ Changeset creado (minor)
10. ✅ CHANGELOG raíz actualizado
11. ✅ Commit pusheado, **CI verde**

Mostra ao autor:
```bash
ls packages/core/src/types/
pnpm --filter @yggdrasil-forge/core test
pnpm --filter @yggdrasil-forge/core test:coverage
git log --oneline -3
```

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.4 — COMPLETADA
═══════════════════════════════════════

✅ Tipos da 3ª onda en @core (9 ficheiros novos):
   - effects.ts (Effect DSL, 10 tipos)
   - time.ts (TimeConstraints dual API)
   - stats.ts (StatContribution + StatExplanation)
   - auth.ts (AuthConfig + providers)
   - progress.ts (ProgressSourceConfig, 5 tipos)
   - build.ts (Build, BuildShareLink, BuildSnapshot)
   - audit.ts (AuditEntry, AuditAction, AuditFilter)
   - changes.ts (TreeChange + ModifyNode/Edge Changes)
   - metrics.ts (EngineMetrics)

✅ Placeholders `unknown` substituídos:
   - NodeDef: cost, costPerTier, effects, prerequisites,
     progressSource, subtreeOverrides, timeConstraints,
     statContributions
   - TreeDef: resources, startingBudget, i18n
   - TreeState: budget
   - NodeInstance: subtreeState
   - EventMap: buildLoaded, treeChanged, auditEntry

✅ Tests: [N] tests pasan ([M] novos en exports.test.ts)
✅ Cobertura: 100% (sen cambios)
✅ Changeset minor creado
✅ CHANGELOG actualizado
✅ CI verde

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor:
[Lista, ou "Ningunha"]

📋 Estado:
LISTO PARA PROCEDER Á SUB-FASE 1.5
(EventEmitter, ConcurrencyGuard, helpers — primeira lóxica do engine)

🎯 ONDAS DE TIPOS DE @CORE COMPLETAS.
   A partir de 1.5 empézase a lóxica real do motor.
```

---

**FIN DO BRIEFING 1.4**
