// packages/core/src/plugins/PluginAPI.ts
// ── INICIO: PluginAPI ──
// Implementación da PluginAPI interface (plugin.ts).
//
// **Sub-fase 8.4.b.ii**:
// - 3 métodos funcionais: registerHook (proxy a HookRunner),
//   emit (proxy a EventEmitter), log (console con prefixo).
// - 3 métodos lanzan YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED:
//   registerCondition, registerLayout, registerStorageAdapter.
//   Diferido a sub-fases futuras.
//
// Cada instancia é creada por PluginManager.register() para un
// plugin específico (pluginId fixo).

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Locale } from '@yggdrasil-forge/common'
import type { EventEmitter } from '../engine/EventEmitter.js'
import type {
  ConditionEvaluator,
  EventMap,
  Hooks,
  LayoutAlgorithmPlaceholder,
  PluginAPI as PluginAPIInterface,
  PluginLogLevel,
  StorageAdapterPlaceholder,
} from '../types/index.js'
import type { HookRunner } from './HookRunner.js'

export class PluginAPI implements PluginAPIInterface {
  constructor(
    private readonly pluginId: string,
    private readonly hookRunner: HookRunner,
    private readonly eventEmitter: EventEmitter,
    private readonly locale: Locale,
  ) {}

  registerHook<K extends keyof Hooks>(name: K, handler: Hooks[K]): void {
    this.hookRunner.register(name, this.pluginId, handler)
  }

  registerCondition(_name: string, _evaluator: ConditionEvaluator): void {
    throw new YggdrasilError(
      ErrorCode.PLUGIN_API_NOT_IMPLEMENTED,
      getErrorMessage(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED, this.locale, {
        method: 'registerCondition',
      }),
    )
  }

  registerLayout(_layout: LayoutAlgorithmPlaceholder): void {
    throw new YggdrasilError(
      ErrorCode.PLUGIN_API_NOT_IMPLEMENTED,
      getErrorMessage(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED, this.locale, {
        method: 'registerLayout',
      }),
    )
  }

  registerStorageAdapter(_adapter: StorageAdapterPlaceholder): void {
    throw new YggdrasilError(
      ErrorCode.PLUGIN_API_NOT_IMPLEMENTED,
      getErrorMessage(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED, this.locale, {
        method: 'registerStorageAdapter',
      }),
    )
  }

  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    this.eventEmitter.emit(event, ...args)
  }

  log(level: PluginLogLevel, message: string): void {
    const prefixed = `[plugin:${this.pluginId}] ${message}`
    switch (level) {
      case 'debug':
        // biome-ignore lint/suspicious/noConsole: plugin log API delegates to console intentionally
        console.debug(prefixed)
        return
      case 'info':
        console.info(prefixed)
        return
      case 'warn':
        console.warn(prefixed)
        return
      case 'error':
        console.error(prefixed)
        return
    }
  }
}
// ── FIN: PluginAPI ──
