// ── INICIO: SearchPlugin ──
// Plugin oficial para Yggdrasil Forge que integra SearchEngine
// como un Plugin do TreeEngine.
//
// **Sub-fase 8.6.b**: wrapping de SearchEngine como Plugin.
// `install` garda engineHandle + indexa treeDef inicial; `uninstall`
// limpa SearchEngine + descarta engineHandle.

import type { Plugin, PluginAPI, PluginEngineHandle } from '@yggdrasil-forge/core'
import { SearchEngine } from './SearchEngine.js'
import type { SearchOptions, SearchResult } from './types.js'

/**
 * Plugin oficial que integra SearchEngine como un Plugin do
 * TreeEngine.
 *
 * @example
 * import { SearchPlugin } from '@yggdrasil-forge/search'
 *
 * const plugin = new SearchPlugin()
 * await engine.registerPlugin(plugin)
 *
 * const results = plugin.search('warrior', { limit: 5 })
 */
export class SearchPlugin implements Plugin {
  readonly id = 'yggdrasil-search'
  readonly name = 'Search Plugin'
  readonly version = '0.1.0'
  readonly apiVersion = '1.0.0'
  readonly permissions = ['read_state'] as const

  private readonly engine = new SearchEngine()
  private engineHandle: PluginEngineHandle | null = null

  /**
   * Instala o plugin: garda engineHandle + indexa o treeDef inicial.
   */
  install(engineHandle: PluginEngineHandle, _api: PluginAPI): void {
    this.engineHandle = engineHandle
    this.engine.index(engineHandle.getTreeDef())
  }

  /**
   * Desinstala o plugin: limpa SearchEngine + descarta engineHandle.
   */
  uninstall(_engine: PluginEngineHandle): void {
    this.engine.clear()
    this.engineHandle = null
  }

  /**
   * Busca nodos que matcheen `query`. Delega a SearchEngine.search.
   */
  search(query: string, options?: SearchOptions): readonly SearchResult[] {
    return this.engine.search(query, options)
  }

  /**
   * Re-indexa o treeDef desde engineHandle.
   *
   * Se non se chamou `install` previamente (engineHandle=null),
   * cero efecto (defensivo).
   */
  reindex(): void {
    if (this.engineHandle === null) return
    this.engine.index(this.engineHandle.getTreeDef())
  }

  /**
   * Expón o SearchEngine interno para casos avanzados.
   */
  getEngine(): SearchEngine {
    return this.engine
  }
}
// ── FIN: SearchPlugin ──
