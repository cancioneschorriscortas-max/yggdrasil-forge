// ── INICIO: DebugPlugin ──
// Plugin oficial para Yggdrasil Forge que loga tódalas operacións
// do TreeEngine via hooks.
//
// **Sub-fase 8.5.b**: rexistra os 8 hooks tipados en Hooks interface,
// usando api.log(level, message) para logging. **enabled=false**
// → cero hooks rexistrados (plugin rexistrado pero inactivo).
//
// **Preparación**: computeCost hook rexístrase aínda que cero se
// chame ata sub-fase futura que conecte.

import type { Plugin, PluginAPI, PluginEngineHandle, PluginLogLevel } from '@yggdrasil-forge/core'
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
      api.log(this.logLevel, `beforeRespec: ${nodeIds.length} nodes (locale=${ctx.locale})`)
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
      api.log(this.logLevel, `afterRespec: ${nodeIds.length} nodes (locale=${ctx.locale})`)
    })

    // ── Compute hooks (devolven defaultResult inchanged) ──
    api.registerHook('computeUnlockability', (nodeId, defaultResult) => {
      api.log(this.logLevel, `computeUnlockability: ${nodeId}`)
      return defaultResult
    })
    /* v8 ignore start -- computeCost hook registered but never called until future sub-phase connects it */
    api.registerHook('computeCost', (nodeId, defaultCost) => {
      api.log(this.logLevel, `computeCost: ${nodeId}`)
      return defaultCost
    })
    /* v8 ignore stop */
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
