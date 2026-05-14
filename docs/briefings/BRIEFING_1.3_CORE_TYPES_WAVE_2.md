# BRIEFING EXECUTABLE — Sub-fase 1.3
## Yggdrasil Forge: Tipos de @core (2ª onda) — unlock, resources, i18n, events, plugin

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa
- `@yggdrasil-forge/common`: constantes, locales, i18n helpers, errores
- `@yggdrasil-forge/core` con tipos da 1ª onda (1.2): Result, Node, Edge, Tree, RichContent
- CI verde
- Documento mestre en `docs/architecture/MASTER.md`

Esta é a **2ª onda de tipos de `@core`**. Engade as estruturas que faltan para que NodeDef poida ser tipado por completo na 3ª onda.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.3**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Seccións 7.10** (UnlockCondition, UnlockRule) — esencial
- **Sección 7.6** (Resources, Costs, Budget)
- **Sección 7.2** (I18nConfig)
- **Sección 10** (TreeEngine — para entender EventMap)
- **Sección 15** (Plugin interface, Hooks)
- **Sección 1.3.2** (reglas de Biome)
- **Sección 5.4** (Effects DSL — referenciado por Hooks)

---

## 3. OBXECTIVO DESTA SUB-FASE

Crear 5 módulos de tipos en `packages/core/src/types/`:

1. **`unlock.ts`** — `UnlockCondition` (15 tipos), `UnlockRule` (AND/OR/NOT/condición simple), `UnlockCheck`, `UnlockExplanation`
2. **`resources.ts`** — `Resource`, `Cost`, `Budget`
3. **`i18n.ts`** — `I18nConfig` (config a nivel TreeDef)
4. **`events.ts`** — `EventMap` con tipos de todos os eventos do TreeEngine
5. **`plugin.ts`** — `Plugin`, `PluginAPI`, `Hooks`, `PluginPermission`, `HookContext`

Actualizar `index.ts` para reexportar todo.

**NON** modificar aínda os campos `unknown` de NodeDef. Iso é parte de 1.4 (onde se substitúen polos tipos reais).

**NON** crear: `audit.ts`, `changes.ts`, `time.ts`, `stats.ts`, `auth.ts`, `metrics.ts`, `progress.ts` (vén en 1.4).

**NON** crear lóxica nin clases.

---

## 4. DECISIÓNS XA TOMADAS

- **UnlockRule é recursivo:** unha rule pode conter sub-rules (AND de ORs, etc.). Usamos union discriminada por `type`.
- **UnlockCondition é "atómico":** non se compón con outras condicións. Para iso úsase UnlockRule.
- **EventMap usa Map<EventName, HandlerSignature>** representado como interface plana (estilo node EventEmitter, sec. 10 do mestre).
- **Hooks son async-friendly:** poden devolver `boolean | Promise<boolean>` ou `void | Promise<void>` segundo o caso.
- **PluginPermission é union literal:** non é enum porque os plugins de terceiros poden definir permissions custom.
- **Effects DSL é placeholder por agora** (`unknown`). Os hooks que reciben effects refírense a el como `unknown[]` ata 1.4.
- **Imports relativos con extensión `.js`** (NodeNext ESM).
- **Cero `any`**, cero `console.log`, todos os campos opcionais con `?:`.

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: 35ac5d5
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 packages/core/src/types/resources.ts

```typescript
// ── INICIO: Resource types ──
// Recursos, custos e presupostos para a economía da árbore.

import type { LocalizedString } from '@yggdrasil-forge/common'

/**
 * Definición dun recurso da economía da árbore.
 *
 * Cada árbore pode definir múltiples recursos (ex: XP, puntos de habilidade,
 * ouro, mana...). Os nodos consumen recursos ao desbloquearse.
 *
 * @example
 * { id: 'xp', label: { gl: 'Experiencia', es: 'Experiencia', en: 'XP' }, initial: 0 }
 * { id: 'skill_points', label: 'Skill points', initial: 5, max: 100 }
 */
export interface Resource {
  readonly id: string
  readonly label: LocalizedString
  /** Identificador de icona ou emoji. */
  readonly icon?: string
  /** Cor visual asociada. */
  readonly color?: string
  /** Valor inicial cando se crea un novo TreeState. */
  readonly initial?: number
  /** Tope máximo (capacidade). */
  readonly max?: number
  /** Permite refund ao facer respec. */
  readonly refundable?: boolean
  /** Porcentaxe que se devolve no refund (0-100, defecto 100). */
  readonly refundPercent?: number
}

/**
 * Custo dunha acción (desbloquear, mellorar tier, etc.) en termos dun recurso.
 *
 * @example
 * { resourceId: 'xp', amount: 100 }
 * { resourceId: 'skill_points', amount: 1 }
 */
export interface Cost {
  readonly resourceId: string
  readonly amount: number
}

/**
 * Presuposto: cantidade actual de cada recurso disponible.
 *
 * É a representación runtime do "estado económico" da árbore.
 *
 * @example
 * { resources: { xp: 1250, skill_points: 3, gold: 500 } }
 */
export interface Budget {
  /** Mapa de resourceId → cantidade actual disponible. */
  resources: Record<string, number>
}
// ── FIN: Resource types ──
```

### 5.2 packages/core/src/types/i18n.ts

```typescript
// ── INICIO: I18n config types ──
// Configuración de internacionalización a nivel TreeDef.
//
// Nota: LocalizedString e Locale viven en @yggdrasil-forge/common.
// Aquí definimos só I18nConfig (config opcional por árbore).

import type { Locale } from '@yggdrasil-forge/common'

/**
 * Configuración de i18n para unha árbore.
 *
 * Cada TreeDef pode declarar a súa configuración i18n. Se non se especifica,
 * o motor usa os defaults globais (DEFAULT_LOCALE='en', FALLBACK_LOCALE='en').
 *
 * @example
 * { defaultLocale: 'gl', fallbackLocale: 'en' }
 */
export interface I18nConfig {
  /** Locale activa por defecto cando se carga a árbore. */
  readonly defaultLocale: Locale
  /** Locale usada cando a defaultLocale non ten tradución dun string. */
  readonly fallbackLocale: Locale
  /**
   * Resolver custom para strings dinámicas (chaves que non son LocalizedString).
   * Permite integrar i18next, formatjs, ou outros sistemas externos.
   */
  readonly resolver?: (key: string, locale: Locale) => string
}
// ── FIN: I18n config types ──
```

### 5.3 packages/core/src/types/unlock.ts

```typescript
// ── INICIO: Unlock conditions and rules ──
// Sistema declarativo de prerrequisitos: condicións atómicas + combinacións.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeState } from './node.js'

/**
 * Condición atómica para desbloquear un nodo.
 *
 * Cada condición avalíase contra o estado actual da árbore.
 * As condicións combínanse mediante UnlockRule (AND, OR, NOT).
 *
 * Tipos:
 *
 * - `node_unlocked` — Outro nodo está unlocked/maxed
 * - `node_maxed` — Outro nodo está maxed
 * - `node_state` — Outro nodo está nun estado concreto
 * - `nodes_count` — N nodos están unlocked en total (ou nun scope)
 * - `resource_min` — Un recurso ten polo menos X
 * - `tier_min` — Outro nodo está en tier ≥ X
 * - `distance_max` — Este nodo está a ≤ N steps doutro (estilo PoE)
 * - `tag_count` — Hai N nodos cunha tag concreta unlocked
 * - `progress_min` — Outro nodo ten progreso ≥ X%
 * - `subtree_completion` — Unha sub-árbore está completa en ≥ X%
 * - `stat_min` — Un stat global é ≥ X
 * - `time_after` — Pasou o timestamp X (UTC ms)
 * - `time_before` — Aínda non pasou o timestamp X
 * - `custom` — Avaliador rexistrado polo usuario
 */
export type UnlockCondition =
  | { readonly type: 'node_unlocked'; readonly nodeId: string }
  | { readonly type: 'node_maxed'; readonly nodeId: string }
  | { readonly type: 'node_state'; readonly nodeId: string; readonly state: NodeState }
  | { readonly type: 'nodes_count'; readonly count: number; readonly scope?: string }
  | { readonly type: 'resource_min'; readonly resourceId: string; readonly amount: number }
  | { readonly type: 'tier_min'; readonly nodeId: string; readonly tier: number }
  | { readonly type: 'distance_max'; readonly fromNodeId: string; readonly maxSteps: number }
  | { readonly type: 'tag_count'; readonly tag: string; readonly count: number }
  | { readonly type: 'progress_min'; readonly nodeId: string; readonly percent: number }
  | { readonly type: 'subtree_completion'; readonly subtreeId: string; readonly percent: number }
  | { readonly type: 'stat_min'; readonly statId: string; readonly amount: number }
  | { readonly type: 'time_after'; readonly timestamp: number }
  | { readonly type: 'time_before'; readonly timestamp: number }
  | { readonly type: 'custom'; readonly evaluator: string }

/**
 * Regra de desbloqueo: combinación lóxica de condicións.
 *
 * Recursiva: as condicións dentro de "all"/"any"/"none" poden ser tamén
 * UnlockCondition simples (caso máis común) OU outras UnlockRules aniñadas
 * via `as UnlockCondition[]`.
 *
 * Por simplicidade, neste momento permitimos que as condicións dentro
 * sexan só UnlockCondition (atómicas). Composicións complexas (AND de ORs)
 * conséguense aniñando UnlockRule no schema do TreeDef futuras versións.
 *
 * @example AND simple
 * { type: 'all', conditions: [
 *   { type: 'node_unlocked', nodeId: 'a' },
 *   { type: 'resource_min', resourceId: 'xp', amount: 100 }
 * ] }
 *
 * @example OR simple
 * { type: 'any', conditions: [
 *   { type: 'node_unlocked', nodeId: 'a' },
 *   { type: 'node_unlocked', nodeId: 'b' }
 * ] }
 *
 * @example Condición simple (sen wrapper)
 * { type: 'node_unlocked', nodeId: 'a' }
 */
export type UnlockRule =
  | { readonly type: 'all'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'any'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'none'; readonly conditions: readonly UnlockCondition[] }
  | UnlockCondition

/**
 * Resultado da avaliación dun UnlockRule.
 */
export interface UnlockCheck {
  /** True se o nodo pode desbloquearse agora mesmo. */
  readonly allowed: boolean
  /** Mensaxe localizada sobre por que está/non está permitido. */
  readonly reason?: LocalizedString
}

/**
 * Explicación detallada da avaliación dun UnlockRule.
 *
 * Útil para UI ("necesitas A, B e C"), debugging e devtools.
 */
export interface UnlockExplanation {
  readonly satisfied: boolean
  readonly conditions: readonly UnlockConditionEvaluation[]
}

/**
 * Resultado de avaliar unha condición concreta dentro dun UnlockExplanation.
 */
export interface UnlockConditionEvaluation {
  readonly condition: UnlockCondition
  readonly satisfied: boolean
  readonly reason: LocalizedString
}
// ── FIN: Unlock conditions and rules ──
```

### 5.4 packages/core/src/types/events.ts

```typescript
// ── INICIO: Event types ──
// Sinaturas dos eventos emitidos polo TreeEngine.

import type { YggdrasilError } from '@yggdrasil-forge/common'
import type { NodeInstance, StateChange } from './node.js'

/**
 * Build (placeholder).
 * Tipo concreto en 1.4 (build.ts).
 */
type BuildPlaceholder = unknown

/**
 * AuditEntry (placeholder).
 * Tipo concreto en 1.4 (audit.ts).
 */
type AuditEntryPlaceholder = unknown

/**
 * TreeChange (placeholder).
 * Tipo concreto en 1.4 (changes.ts).
 */
type TreeChangePlaceholder = unknown

/**
 * Mapa de eventos do TreeEngine.
 *
 * Cada chave é un nome de evento; cada valor é a sinatura do handler.
 *
 * Os consumidores usan `engine.on(event, handler)` con autocompletado tipado.
 *
 * @example
 * const unsubscribe = engine.on('unlock', (nodeId, instance) => {
 *   console.info(`Unlocked ${nodeId} at tier ${instance.currentTier}`)
 * })
 */
export interface EventMap {
  /** Un nodo desbloqueouse (manual ou por cascada). */
  readonly unlock: (nodeId: string, instance: NodeInstance) => void

  /** Un nodo bloqueouse (respec ou exclusión). */
  readonly lock: (nodeId: string, instance: NodeInstance) => void

  /** Cambio xenérico de estado dun nodo (calquera transición). */
  readonly stateChange: (nodeId: string, change: StateChange) => void

  /** Cambiou a cantidade dispoñible dun recurso. */
  readonly budgetChange: (resourceId: string, oldAmount: number, newAmount: number) => void

  /** Cambiou un stat calculado polo StatComputer. */
  readonly statChange: (statId: string, oldValue: number, newValue: number) => void

  /** Cambiou o progreso dun nodo (manual ou externo). */
  readonly progressChange: (nodeId: string, percent: number) => void

  /** Realizouse un respec, devolvendo puntos. */
  readonly respec: (nodeIds: readonly string[]) => void

  /** Cargouse unha build completa (importBuild, loadFromShareLink). */
  readonly buildLoaded: (build: BuildPlaceholder) => void

  /** O usuario entrou nunha sub-árbore. */
  readonly subtreeEntered: (subtreeId: string) => void

  /** A treeDef foi modificada vía applyChanges. */
  readonly treeChanged: (changes: readonly TreeChangePlaceholder[]) => void

  /** Un nodo expirou por time constraints. */
  readonly nodeExpired: (nodeId: string) => void

  /** Sincronizouse progreso dunha fonte externa. */
  readonly externalProgressSynced: (nodeId: string, percent: number) => void

  /** Un plugin emitiu un error capturable. */
  readonly pluginError: (pluginId: string, error: YggdrasilError) => void

  /** Error xenérico capturable polo consumidor. */
  readonly error: (error: YggdrasilError) => void

  /** Nova entrada engadida ao audit log. */
  readonly auditEntry: (entry: AuditEntryPlaceholder) => void
}

/**
 * Nome dun evento válido (chave do EventMap).
 */
export type EventName = keyof EventMap

/**
 * Handler tipado para un evento concreto.
 */
export type EventHandler<K extends EventName> = EventMap[K]
// ── FIN: Event types ──
```

### 5.5 packages/core/src/types/plugin.ts

```typescript
// ── INICIO: Plugin types ──
// Sistema de plugins: interfaces, hooks, permissions.

import type { EdgeType } from './edge.js'
import type { EventMap } from './events.js'
import type { NodeState } from './node.js'
import type { Cost } from './resources.js'
import type { UnlockCheck } from './unlock.js'

/**
 * Permisos que un plugin pode declarar.
 *
 * En v1.0 son declarativos (audit only). En v2.0 enforce strict.
 *
 * Cada plugin de terceiros pode definir permissions custom (string libre),
 * polo que isto é unha union literal flexible.
 */
export type PluginPermission =
  | 'read_state'
  | 'modify_state'
  | 'register_hooks'
  | 'register_layouts'
  | 'register_storage'
  | 'network'
  | 'persist'
  | (string & {})

/**
 * Contexto pasado a un hook cando se executa.
 *
 * Contén información sobre a operación en curso e helpers para
 * decidir/modificar o comportamento.
 */
export interface HookContext {
  /** Locale activa para mensaxes. */
  readonly locale: string
  /** Marca temporal UTC ms da operación. */
  readonly timestamp: number
  /** Identificador opcional do actor (userId, sessionId). */
  readonly actor?: string
  /** Metadata libre que outros hooks poden ler/escribir. */
  metadata: Record<string, unknown>
}

/**
 * Sinatura dos hooks rexistrables polos plugins.
 *
 * Os hooks `before*` poden devolver `false` para cancelar a operación.
 * Os hooks `after*` son notificacións post-facto.
 * Os hooks `compute*` poden modificar o resultado dunha computación.
 *
 * Todos poden ser async (Promise) ou síncronos.
 */
export interface Hooks {
  /** Antes de desbloquear; devolver false cancela. */
  readonly beforeUnlock: (nodeId: string, ctx: HookContext) => boolean | Promise<boolean>

  /** Despois de desbloquear con éxito. */
  readonly afterUnlock: (nodeId: string, ctx: HookContext) => void | Promise<void>

  /** Antes de bloquear; devolver false cancela. */
  readonly beforeLock: (nodeId: string, ctx: HookContext) => boolean | Promise<boolean>

  /** Despois de bloquear. */
  readonly afterLock: (nodeId: string, ctx: HookContext) => void | Promise<void>

  /** Antes dun respec; devolver false cancela. */
  readonly beforeRespec: (
    nodeIds: readonly string[],
    ctx: HookContext,
  ) => boolean | Promise<boolean>

  /** Despois dun respec. */
  readonly afterRespec: (
    nodeIds: readonly string[],
    ctx: HookContext,
  ) => void | Promise<void>

  /**
   * Modifica o resultado dun UnlockCheck antes de devolvelo.
   * Os plugins poden engadir condicións extra (ex: cooldowns, locks externos).
   */
  readonly computeUnlockability: (nodeId: string, defaultResult: UnlockCheck) => UnlockCheck

  /**
   * Modifica os custos dunha acción.
   * Os plugins poden aplicar descontos, sobrecustos, conversións.
   */
  readonly computeCost: (nodeId: string, defaultCost: readonly Cost[]) => readonly Cost[]
}

/**
 * Avaliador para condicións custom (rexistrado polos plugins).
 */
export type ConditionEvaluator = (params: Readonly<Record<string, unknown>>) => boolean

/**
 * Adapter de almacenamento (interface, implementación en 3.x).
 * Por agora placeholder.
 */
export type StorageAdapterPlaceholder = unknown

/**
 * Algoritmo de layout (interface, implementación en 4.x).
 * Por agora placeholder.
 */
export type LayoutAlgorithmPlaceholder = unknown

/**
 * API exposta aos plugins dentro do método `install`.
 *
 * Permite rexistrar hooks, condicións, layouts, storage adapters,
 * e emitir eventos. NON expón acceso directo ao estado interno do motor.
 */
export interface PluginAPI {
  /** Rexistra un handler para un hook concreto. */
  registerHook<K extends keyof Hooks>(name: K, handler: Hooks[K]): void

  /** Rexistra un avaliador para condicións custom (UnlockCondition.type='custom'). */
  registerCondition(name: string, evaluator: ConditionEvaluator): void

  /** Rexistra un algoritmo de layout adicional. */
  registerLayout(layout: LayoutAlgorithmPlaceholder): void

  /** Rexistra un StorageAdapter custom. */
  registerStorageAdapter(adapter: StorageAdapterPlaceholder): void

  /** Emite un evento do EventMap. */
  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void

  /** Log estruturado (vai ao logger do motor). */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void
}

/**
 * Definición dun plugin.
 *
 * Os plugins instálanse en runtime con `engine.registerPlugin(plugin)`.
 *
 * @example
 * const myPlugin: Plugin = {
 *   id: 'my-cooldown-plugin',
 *   name: 'Cooldown Plugin',
 *   version: '1.0.0',
 *   apiVersion: '1.0.0',
 *   permissions: ['read_state', 'register_hooks'],
 *   install(engine, api) {
 *     api.registerHook('beforeUnlock', async (nodeId, ctx) => {
 *       const lastUnlock = ctx.metadata.lastUnlock as number ?? 0
 *       const now = Date.now()
 *       if (now - lastUnlock < 5000) {
 *         return false  // cooldown
 *       }
 *       ctx.metadata.lastUnlock = now
 *       return true
 *     })
 *   }
 * }
 */
export interface Plugin {
  /** Identificador único do plugin. */
  readonly id: string
  /** Nome user-facing. */
  readonly name: string
  /** Versión do plugin (semver). */
  readonly version: string
  /** Versión da Plugin API que require (compatibilidade). */
  readonly apiVersion: string
  /** Permisos solicitados. */
  readonly permissions?: readonly PluginPermission[]

  /**
   * Función chamada para instalar o plugin no motor.
   * Pode ser async se require setup remoto, lectura de ficheiros, etc.
   */
  install(engine: PluginEngineHandle, api: PluginAPI): void | Promise<void>

  /**
   * Función chamada para desinstalar o plugin.
   * Opcional; se non se define, o motor limita-se a liberar hooks rexistrados.
   */
  uninstall?(engine: PluginEngineHandle): void | Promise<void>
}

/**
 * Handle limitado do TreeEngine pasado aos plugins.
 *
 * NON é o TreeEngine completo; expón só o que un plugin debería poder facer
 * sen romper encapsulación. A interfaz completa definirase con TreeEngine
 * (sub-fases 1.12+).
 *
 * Por agora é un placeholder para tipar a sinatura de `install`.
 */
export type PluginEngineHandle = unknown

/**
 * Resultado dunha tentativa de registro de plugin.
 */
export interface PluginInstallResult {
  readonly ok: boolean
  readonly reason?: string
}

/**
 * Tipos comunes de canle de log usados polos plugins.
 */
export type PluginLogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Re-export para evitar import unused (Biome).
 * EdgeType é referenciado en docs JSDoc de hooks futuros.
 */
export type { EdgeType }
// ── FIN: Plugin types ──
```

### 5.6 Actualizar packages/core/src/types/index.ts

Substituír o contido por:

```typescript
// ── INICIO: types public API ──
// Tipos públicos do paquete @yggdrasil-forge/core.
//
// Ondas:
// - 1ª (1.2): Result, Node, Edge, Tree, RichContent, errors
// - 2ª (1.3): unlock, resources, i18n, events, plugin  ← actual
// - 3ª (1.4): audit, changes, time, stats, auth, metrics, progress
//             + substitución dos `unknown` placeholders por tipos reais

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

### 5.7 Tests

Os tipos puros non se testean en runtime. Pero podemos:
- Engadir tests novos ao ficheiro `exports.test.ts` para verificar que os módulos novos son importables
- Validar que algunhas constraints semánticas se manteñen (ex: UnlockCondition.type ten que coincidir con un union literal coñecido)

#### 5.7.1 Actualizar packages/core/__tests__/types/exports.test.ts

Substituír o contido completo por:

```typescript
// ── INICIO: tests de exports ──
// Verifica que os módulos públicos exportan o esperado.
// Os tipos puros non son testables en runtime: comprobamos só
// constantes/funcións e que os módulos novos non rompen imports.

import { describe, expect, it } from 'vitest'
import * as core from '../../src/index.js'

describe('@yggdrasil-forge/core public exports', () => {
  describe('1.2 — foundations', () => {
    it('exports VERSION', () => {
      expect(core.VERSION).toBe('0.0.0')
    })

    it('exports Result helpers', () => {
      expect(typeof core.ok).toBe('function')
      expect(typeof core.err).toBe('function')
      expect(typeof core.isOk).toBe('function')
      expect(typeof core.isErr).toBe('function')
      expect(typeof core.unwrap).toBe('function')
      expect(typeof core.unwrapOr).toBe('function')
    })

    it('exports freezeNodeDef', () => {
      expect(typeof core.freezeNodeDef).toBe('function')
    })

    it('re-exports error utilities from common', () => {
      expect(core.ErrorCode).toBeDefined()
      expect(typeof core.YggdrasilError).toBe('function')
      expect(typeof core.isYggdrasilError).toBe('function')
      expect(typeof core.getErrorMessage).toBe('function')
    })
  })

  describe('1.3 — wave 2 types', () => {
    // Os tipos puros non son visibles en runtime, pero podemos
    // crear obxectos literais que cumpren o tipo e verificar runtime.

    it('Resource type is structurally valid', () => {
      const resource: core.Resource = {
        id: 'xp',
        label: { gl: 'Experiencia', es: 'Experiencia', en: 'XP' },
        initial: 0,
        max: 1000,
        refundable: true,
        refundPercent: 100,
      }
      expect(resource.id).toBe('xp')
      expect(resource.refundable).toBe(true)
    })

    it('Cost type is structurally valid', () => {
      const cost: core.Cost = { resourceId: 'xp', amount: 100 }
      expect(cost.amount).toBe(100)
    })

    it('Budget type is structurally valid', () => {
      const budget: core.Budget = { resources: { xp: 1250, sp: 3 } }
      expect(budget.resources['xp']).toBe(1250)
    })

    it('I18nConfig is structurally valid', () => {
      const config: core.I18nConfig = {
        defaultLocale: 'gl',
        fallbackLocale: 'en',
      }
      expect(config.defaultLocale).toBe('gl')
    })

    it('UnlockCondition supports all known types', () => {
      // Snapshot estructural: comproba que TS acepta cada variante.
      const conditions: core.UnlockCondition[] = [
        { type: 'node_unlocked', nodeId: 'a' },
        { type: 'node_maxed', nodeId: 'a' },
        { type: 'node_state', nodeId: 'a', state: 'unlocked' },
        { type: 'nodes_count', count: 3 },
        { type: 'nodes_count', count: 3, scope: 'cluster_1' },
        { type: 'resource_min', resourceId: 'xp', amount: 100 },
        { type: 'tier_min', nodeId: 'a', tier: 2 },
        { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
        { type: 'tag_count', tag: 'social', count: 5 },
        { type: 'progress_min', nodeId: 'a', percent: 50 },
        { type: 'subtree_completion', subtreeId: 'cluster_1', percent: 80 },
        { type: 'stat_min', statId: 'damage', amount: 100 },
        { type: 'time_after', timestamp: 1715347200000 },
        { type: 'time_before', timestamp: 1715347200000 },
        { type: 'custom', evaluator: 'my-evaluator' },
      ]
      expect(conditions).toHaveLength(15)
    })

    it('UnlockRule supports all/any/none combinators and atomic conditions', () => {
      const allRule: core.UnlockRule = {
        type: 'all',
        conditions: [{ type: 'node_unlocked', nodeId: 'a' }],
      }
      const anyRule: core.UnlockRule = {
        type: 'any',
        conditions: [{ type: 'resource_min', resourceId: 'xp', amount: 100 }],
      }
      const noneRule: core.UnlockRule = {
        type: 'none',
        conditions: [{ type: 'node_unlocked', nodeId: 'forbidden' }],
      }
      const atomic: core.UnlockRule = { type: 'node_unlocked', nodeId: 'a' }

      expect(allRule.type).toBe('all')
      expect(anyRule.type).toBe('any')
      expect(noneRule.type).toBe('none')
      expect(atomic.type).toBe('node_unlocked')
    })

    it('EventMap keys are referenceable', () => {
      // Comproba que os event names esperados son chaves válidas do EventMap.
      const knownEvents: core.EventName[] = [
        'unlock',
        'lock',
        'stateChange',
        'budgetChange',
        'statChange',
        'progressChange',
        'respec',
        'buildLoaded',
        'subtreeEntered',
        'treeChanged',
        'nodeExpired',
        'externalProgressSynced',
        'pluginError',
        'error',
        'auditEntry',
      ]
      expect(knownEvents).toHaveLength(15)
    })

    it('Plugin interface accepts a minimal valid plugin', () => {
      const plugin: core.Plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        apiVersion: '1.0.0',
        install() {
          // no-op
        },
      }
      expect(plugin.id).toBe('test-plugin')
    })

    it('Plugin accepts permissions and optional uninstall', () => {
      const plugin: core.Plugin = {
        id: 'test-plugin-2',
        name: 'Test Plugin 2',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['read_state', 'register_hooks', 'custom-permission'],
        install() {
          // no-op
        },
        uninstall() {
          // no-op
        },
      }
      expect(plugin.permissions).toContain('read_state')
      expect(plugin.permissions).toContain('custom-permission')
      expect(typeof plugin.uninstall).toBe('function')
    })

    it('PluginLogLevel accepts the expected levels', () => {
      const levels: core.PluginLogLevel[] = ['debug', 'info', 'warn', 'error']
      expect(levels).toHaveLength(4)
    })
  })
})
// ── FIN: tests de exports ──
```

### 5.8 Verificación local

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

Esperado: tests dos paquetes seguen pasando. Cobertura nas funcións con lóxica (result.ts, node.ts) segue ao 100%. Os módulos novos non engaden lóxica nova, así que non hai novas branches que cubrir.

### 5.9 Engadir changeset

```bash
pnpm changeset
```

Responder:
- Selecciona `@yggdrasil-forge/core`
- Minor bump
- Summary: `Add wave 2 of foundational types: UnlockCondition/UnlockRule (15 atomic conditions, AND/OR/NOT combinators), Resource/Cost/Budget, I18nConfig, EventMap (15 events), Plugin interface with Hooks and PluginPermission.`

### 5.10 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: wave 2 type definitions
  - `Resource`, `Cost`, `Budget` (economy primitives)
  - `I18nConfig` (per-tree i18n configuration)
  - `UnlockCondition` (15 atomic types: node-based, resource-based, distance, tags, time, custom, etc.)
  - `UnlockRule` (AND/OR/NOT combinators + atomic conditions)
  - `UnlockCheck`, `UnlockExplanation`, `UnlockConditionEvaluation`
  - `EventMap` (15 events: unlock, lock, stateChange, budgetChange, statChange, progressChange, respec, buildLoaded, subtreeEntered, treeChanged, nodeExpired, externalProgressSynced, pluginError, error, auditEntry)
  - `Plugin`, `PluginAPI`, `PluginEngineHandle`, `PluginInstallResult`
  - `Hooks` (beforeUnlock/afterUnlock/beforeLock/afterLock/beforeRespec/afterRespec/computeUnlockability/computeCost)
  - `HookContext`, `ConditionEvaluator`, `PluginLogLevel`, `PluginPermission`
```

### 5.11 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add wave 2 types (unlock, resources, i18n, events, plugin)"
git push origin main
```

Verifica **CI verde**. Se falla, **detente e reporta**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN** en todos os ficheiros novos.
- **Idioma de comentarios:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar código.
- **Imports relativos con `.js`**.
- **`import type` para tipos**, `import` para valores.
- **`readonly` masivo** en todos os campos de tipos inmutables.
- **Cero `any`**, cero `console.log`.

---

## 7. QUE NON FACER

- ❌ Non substituír os `unknown` de NodeDef polos tipos novos (vén en 1.4).
- ❌ Non crear `audit.ts`, `changes.ts`, `time.ts`, `stats.ts`, `auth.ts`, `metrics.ts`, `progress.ts` (1.4).
- ❌ Non crear clases (TreeEngine, EffectsRunner, etc.).
- ❌ Non implementar a lóxica de UnlockResolver (eso é 1.8).
- ❌ Non engadir dependencias externas.
- ❌ Non publicar nada en npm.

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ `packages/core/src/types/resources.ts` con Resource, Cost, Budget
2. ✅ `packages/core/src/types/i18n.ts` con I18nConfig
3. ✅ `packages/core/src/types/unlock.ts` con UnlockCondition (15), UnlockRule, UnlockCheck, UnlockExplanation, UnlockConditionEvaluation
4. ✅ `packages/core/src/types/events.ts` con EventMap (15 events), EventName, EventHandler
5. ✅ `packages/core/src/types/plugin.ts` con Plugin, PluginAPI, Hooks, HookContext, PluginPermission, etc.
6. ✅ `packages/core/src/types/index.ts` actualizado
7. ✅ `packages/core/__tests__/types/exports.test.ts` actualizado con tests dos novos tipos
8. ✅ Build pasa, todos os tests pasan
9. ✅ Changeset creado
10. ✅ CHANGELOG raíz actualizado
11. ✅ CI verde

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
SUB-FASE 1.3 — COMPLETADA
═══════════════════════════════════════

✅ Tipos da 2ª onda en @core:
   - Resource, Cost, Budget
   - I18nConfig
   - UnlockCondition (15 atomic types)
   - UnlockRule (all/any/none + atomic)
   - UnlockCheck, UnlockExplanation, UnlockConditionEvaluation
   - EventMap (15 eventos), EventName, EventHandler
   - Plugin, PluginAPI, Hooks, HookContext
   - PluginPermission, ConditionEvaluator, PluginLogLevel

✅ Tests: [N] tests pasan
✅ Cobertura funcións con lóxica: 100% (sen cambios, módulos novos son tipos puros)
✅ Changeset creado
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
LISTO PARA PROCEDER Á SUB-FASE 1.4
(audit, changes, time, stats, auth, metrics, progress
 + substitución dos `unknown` de NodeDef polos tipos reais)
```

---

**FIN DO BRIEFING 1.3**
