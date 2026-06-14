// ── INICIO: Plugin types ──
// Sistema de plugins: interfaces, hooks, permissions.

import type { Locale } from '@yggdrasil-forge/common'
import type { Result } from '@yggdrasil-forge/common'
import type { EdgeType } from './edge.js'
import type { EventMap } from './events.js'
import type { NodeInstance, NodeState } from './node.js'
import type { Budget, Cost } from './resources.js'
import type { TreeDef } from './tree.js'
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
  readonly afterRespec: (nodeIds: readonly string[], ctx: HookContext) => void | Promise<void>

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
 *         return false
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
/**
 * Subset readonly de TreeEngine exposto aos plugins durante
 * `Plugin.install()`. Cero mutations, cero acceso a snapshots,
 * audit, subscribe, subtrees ou outros internals sensibles.
 *
 * **Sub-fase 8.4.b.ii**: 10 getters readonly.
 */
export interface PluginEngineHandle {
  readonly getNodeState: (nodeId: string) => NodeInstance | null
  readonly getAllNodeStates: () => ReadonlyMap<string, NodeInstance>
  readonly getBudget: () => Readonly<Budget>
  readonly getProgress: (nodeId: string) => number
  readonly getTreeDef: () => Readonly<TreeDef>
  readonly getLocale: () => Locale
  readonly getStat: (statId: string) => number
  readonly getAllStats: () => Readonly<Record<string, number>>
  readonly isReadOnly: () => boolean
  readonly canUnlock: (nodeId: string) => Result<UnlockCheck>
}

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
export type { EdgeType, NodeState }
// ── FIN: Plugin types ──
