// ── INICIO: HistoryPlugin ──
// Plugin oficial para Yggdrasil Forge que rastrea operacións
// unlock/lock/respec executadas no TreeEngine.
//
// **Sub-fase 8.5.a**: primeira implementación; tracking + FIFO +
// API pública.
// **Diferido a sub-fase futura**: undo/redo (require modificar
// TreeEngine para expoñer reverse operations).

import type { Plugin, PluginAPI, PluginEngineHandle } from '@yggdrasil-forge/core'
import type { HistoryEntry, HistoryOperation, HistoryOptions } from './types.js'

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
