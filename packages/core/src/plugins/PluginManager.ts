// packages/core/src/plugins/PluginManager.ts
// ── INICIO: PluginManager ──
// Manexo in-memory de plugins rexistrados nun TreeEngine.
//
// **Sub-fase 8.4.a**: implementa CRUD básico (register, unregister,
// get, list). **Cero chamada a `plugin.install()`** — diferido a
// 8.4.b cando PluginAPI estea implementada. **Cero hooks chamados**
// — diferido a 8.4.c.
//
// **Patrón**: Map<id, Plugin> interno. Async para coherencia
// con futuras chamadas a install() / uninstall() en 8.4.b.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Locale } from '@yggdrasil-forge/common'
import type { Plugin, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'

const DEFAULT_LOCALE: Locale = 'gl'

export class PluginManager {
  private readonly plugins = new Map<string, Plugin>()
  private readonly locale: Locale

  constructor(locale?: Locale) {
    this.locale = locale ?? DEFAULT_LOCALE
  }

  /**
   * Rexistra un plugin no manager.
   *
   * **Sub-fase 8.4.a**: só almacena o plugin no Map. **Cero chamada
   * a `plugin.install()`** — chamarase en 8.4.b cando PluginAPI
   * estea implementada.
   *
   * Errores posibles:
   * - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`): se o id xa existe.
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
    this.plugins.set(plugin.id, plugin)
    return ok(undefined)
  }

  /**
   * Desrexistra un plugin polo id.
   *
   * **Sub-fase 8.4.a**: só borra do Map. **Cero chamada a
   * `plugin.uninstall()`** — chamarase en 8.4.b.
   *
   * Errores posibles:
   * - `PLUGIN_NOT_FOUND` (`YGG_PL002`): se o id non existe.
   */
  async unregister(id: string): Promise<Result<void>> {
    if (!this.plugins.has(id)) {
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_NOT_FOUND,
          getErrorMessage(ErrorCode.PLUGIN_NOT_FOUND, this.locale, { id }),
        ),
      )
    }
    this.plugins.delete(id)
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
