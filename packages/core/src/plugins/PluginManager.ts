// packages/core/src/plugins/PluginManager.ts
// ── INICIO: PluginManager ──
// Manexo in-memory de plugins rexistrados nun TreeEngine.
//
// **Sub-fase 8.4.b.ii**: constructor recibe (engineHandle,
// hookRunner, eventEmitter, locale?). register() chama
// plugin.install() con PluginAPI real. unregister() chama
// plugin.uninstall() + cleanup hooks.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Locale } from '@yggdrasil-forge/common'
import type { EventEmitter } from '../engine/EventEmitter.js'
import type { Plugin, PluginEngineHandle, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'
import type { HookRunner } from './HookRunner.js'
import { PluginAPI } from './PluginAPI.js'

const DEFAULT_LOCALE: Locale = 'gl'

export class PluginManager {
  private readonly plugins = new Map<string, Plugin>()
  private readonly engineHandle: PluginEngineHandle
  private readonly hookRunner: HookRunner
  private readonly eventEmitter: EventEmitter
  private readonly locale: Locale

  constructor(
    engineHandle: PluginEngineHandle,
    hookRunner: HookRunner,
    eventEmitter: EventEmitter,
    locale?: Locale,
  ) {
    this.engineHandle = engineHandle
    this.hookRunner = hookRunner
    this.eventEmitter = eventEmitter
    this.locale = locale ?? DEFAULT_LOCALE
  }

  /**
   * Rexistra un plugin no manager.
   *
   * **Sub-fase 8.4.b.ii**: chama `plugin.install(engineHandle, api)`
   * con PluginAPI real. Se install lanza, faise rollback (cero
   * almacenamento + cleanup hooks parciais).
   *
   * Errores posibles:
   * - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`).
   * - `PLUGIN_INSTALL_FAILED` (`YGG_P001`): install() lanzou.
   */
  async register(plugin: Plugin): Promise<Result<void>> {
    if (this.plugins.has(plugin.id)) {
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_ALREADY_REGISTERED,
          getErrorMessage(ErrorCode.PLUGIN_ALREADY_REGISTERED, this.locale, {
            id: plugin.id,
          }),
        ),
      )
    }

    // Almacenar primeiro (necesario para que install() poda chamar
    // PluginAPI.registerHook que internamente usa this.pluginId):
    this.plugins.set(plugin.id, plugin)

    // Crear PluginAPI fresca para este plugin:
    const api = new PluginAPI(plugin.id, this.hookRunner, this.eventEmitter, this.locale)

    // Chamar install (sync ou async); capture errors:
    try {
      await plugin.install(this.engineHandle, api)
    } catch (e) {
      // Rollback: borrar do Map + cleanup hooks parciais:
      this.plugins.delete(plugin.id)
      this.hookRunner.unregisterAllForPlugin(plugin.id)
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_INSTALL_FAILED,
          getErrorMessage(ErrorCode.PLUGIN_INSTALL_FAILED, this.locale, {
            pluginId: plugin.id,
            /* v8 ignore next -- defensive: tests always throw Error instances */
            reason: e instanceof Error ? e.message : String(e),
          }),
        ),
      )
    }

    return ok(undefined)
  }

  /**
   * Desrexistra un plugin polo id.
   *
   * **Sub-fase 8.4.b.ii**: chama `plugin.uninstall(engineHandle)`
   * se está definido + `hookRunner.unregisterAllForPlugin(id)`
   * SEMPRE. Se uninstall lanza, plugin xa borrouse (best effort).
   *
   * Errores posibles:
   * - `PLUGIN_NOT_FOUND` (`YGG_PL002`).
   * - `PLUGIN_UNINSTALL_FAILED` (`YGG_PL005`): uninstall lanzou.
   */
  async unregister(id: string): Promise<Result<void>> {
    const plugin = this.plugins.get(id)
    if (plugin === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_NOT_FOUND,
          getErrorMessage(ErrorCode.PLUGIN_NOT_FOUND, this.locale, { id }),
        ),
      )
    }

    // Cleanup hooks + borrado do Map SEMPRE (best effort):
    this.hookRunner.unregisterAllForPlugin(id)
    this.plugins.delete(id)

    // Chamar uninstall se existe; capture errors:
    if (plugin.uninstall !== undefined) {
      try {
        await plugin.uninstall(this.engineHandle)
      } catch (e) {
        return err(
          new YggdrasilError(
            ErrorCode.PLUGIN_UNINSTALL_FAILED,
            getErrorMessage(ErrorCode.PLUGIN_UNINSTALL_FAILED, this.locale, {
              id,
              /* v8 ignore next -- defensive: tests always throw Error instances */
              error: e instanceof Error ? e.message : String(e),
            }),
          ),
        )
      }
    }

    return ok(undefined)
  }

  /** Devolve o plugin polo id ou null se non existe. Sync. */
  get(id: string): Plugin | null {
    return this.plugins.get(id) ?? null
  }

  /** Lista todos os plugins rexistrados (orde de inserción). Sync. */
  list(): readonly Plugin[] {
    return Array.from(this.plugins.values())
  }
}
// ── FIN: PluginManager ──
