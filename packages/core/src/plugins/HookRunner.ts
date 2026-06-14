// packages/core/src/plugins/HookRunner.ts
// ── INICIO: HookRunner ──
// Xestiona rexistro + execución dos hooks tipados en `Hooks`
// interface (plugin.ts).
//
// **Sub-fase 8.4.b.i**: standalone (cero acoplamento a PluginManager
// nin TreeEngine). 8.4.b.ii conecta PluginManager.register para
// que os plugins rexistren hooks via PluginAPI. 8.4.c conecta
// TreeEngine.unlock/lock/respec/canUnlock para chamar os runners.
//
// **Patrón**:
// - 8 arrays internos privados (un por hook name).
// - `register(name, pluginId, handler)`: engade ao array correspondente.
// - `unregisterAllForPlugin(pluginId)`: borra handlers do pluginId.
// - `runBefore*` async: cero short-circuit; result=false se algún
//   handler devolveu false.
// - `runAfter*` async: fire-and-forget; capture errors.
// - `runCompute*` sync: chain pattern; cada handler recibe o
//   resultado do anterior.
//
// Erros: captura + chama `onError(pluginId, error)` se está definido;
// continúa con outros handlers (cero rotura do flow).

import type { Cost, HookContext, Hooks, UnlockCheck } from '../types/index.js'

/**
 * Handler rexistrado co metadata do plugin que o rexistrou.
 * Usado para tracking + error reporting.
 */
interface RegisteredHandler<K extends keyof Hooks> {
  readonly pluginId: string
  readonly handler: Hooks[K]
}

/**
 * Opcións do HookRunner.
 */
export interface HookRunnerOptions {
  /**
   * Callback chamado cando un handler lanza unha excepción.
   * Recibe o pluginId que rexistrou o handler + o erro.
   *
   * Se non se define, os erros son silenciosamente ignorados (pero
   * o flow continúa con outros handlers).
   */
  readonly onError?: (pluginId: string, error: unknown) => void
}

export class HookRunner {
  // ── Arrays internos por hook name ──
  private readonly beforeUnlockHandlers: RegisteredHandler<'beforeUnlock'>[] = []
  private readonly afterUnlockHandlers: RegisteredHandler<'afterUnlock'>[] = []
  private readonly beforeLockHandlers: RegisteredHandler<'beforeLock'>[] = []
  private readonly afterLockHandlers: RegisteredHandler<'afterLock'>[] = []
  private readonly beforeRespecHandlers: RegisteredHandler<'beforeRespec'>[] = []
  private readonly afterRespecHandlers: RegisteredHandler<'afterRespec'>[] = []
  private readonly computeUnlockabilityHandlers: RegisteredHandler<'computeUnlockability'>[] = []
  private readonly computeCostHandlers: RegisteredHandler<'computeCost'>[] = []

  private readonly onError: ((pluginId: string, error: unknown) => void) | undefined

  constructor(opts?: HookRunnerOptions) {
    this.onError = opts?.onError
  }

  /**
   * Rexistra un handler para un hook concreto. O pluginId úsase
   * para tracking + error reporting.
   */
  register<K extends keyof Hooks>(name: K, pluginId: string, handler: Hooks[K]): void {
    // Casts autorizados: TS non pode estreitar o tipo do array
    // correspondente sen runtime check; usamos switch para safety.
    switch (name) {
      case 'beforeUnlock':
        this.beforeUnlockHandlers.push({
          pluginId,
          handler: handler as Hooks['beforeUnlock'],
        })
        return
      case 'afterUnlock':
        this.afterUnlockHandlers.push({
          pluginId,
          handler: handler as Hooks['afterUnlock'],
        })
        return
      case 'beforeLock':
        this.beforeLockHandlers.push({
          pluginId,
          handler: handler as Hooks['beforeLock'],
        })
        return
      case 'afterLock':
        this.afterLockHandlers.push({
          pluginId,
          handler: handler as Hooks['afterLock'],
        })
        return
      case 'beforeRespec':
        this.beforeRespecHandlers.push({
          pluginId,
          handler: handler as Hooks['beforeRespec'],
        })
        return
      case 'afterRespec':
        this.afterRespecHandlers.push({
          pluginId,
          handler: handler as Hooks['afterRespec'],
        })
        return
      case 'computeUnlockability':
        this.computeUnlockabilityHandlers.push({
          pluginId,
          handler: handler as Hooks['computeUnlockability'],
        })
        return
      case 'computeCost':
        this.computeCostHandlers.push({
          pluginId,
          handler: handler as Hooks['computeCost'],
        })
        return
    }
  }

  /**
   * Desrexistra TODOS os handlers dun plugin (útil ao chamar
   * unregisterPlugin en 8.4.b.ii).
   */
  unregisterAllForPlugin(pluginId: string): void {
    HookRunner.filterByPluginId(this.beforeUnlockHandlers, pluginId)
    HookRunner.filterByPluginId(this.afterUnlockHandlers, pluginId)
    HookRunner.filterByPluginId(this.beforeLockHandlers, pluginId)
    HookRunner.filterByPluginId(this.afterLockHandlers, pluginId)
    HookRunner.filterByPluginId(this.beforeRespecHandlers, pluginId)
    HookRunner.filterByPluginId(this.afterRespecHandlers, pluginId)
    HookRunner.filterByPluginId(this.computeUnlockabilityHandlers, pluginId)
    HookRunner.filterByPluginId(this.computeCostHandlers, pluginId)
  }

  /** In-place filter: borra entries co pluginId especificado. */
  private static filterByPluginId<K extends keyof Hooks>(
    arr: RegisteredHandler<K>[],
    pluginId: string,
  ): void {
    let writeIdx = 0
    for (let readIdx = 0; readIdx < arr.length; readIdx++) {
      const entry = arr[readIdx]
      if (entry !== undefined && entry.pluginId !== pluginId) {
        arr[writeIdx++] = entry
      }
    }
    arr.length = writeIdx
  }

  // ── Before runners (async; cero short-circuit) ──

  async runBeforeUnlock(nodeId: string, ctx: HookContext): Promise<boolean> {
    let result = true
    for (const entry of this.beforeUnlockHandlers) {
      try {
        const r = await entry.handler(nodeId, ctx)
        if (r === false) result = false
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
    return result
  }

  async runBeforeLock(nodeId: string, ctx: HookContext): Promise<boolean> {
    let result = true
    for (const entry of this.beforeLockHandlers) {
      try {
        const r = await entry.handler(nodeId, ctx)
        if (r === false) result = false
        /* v8 ignore start -- identical catch pattern tested in runBeforeUnlock */
      } catch (e) {
        this.onError?.(entry.pluginId, e)
        /* v8 ignore stop */
      }
    }
    return result
  }

  async runBeforeRespec(nodeIds: readonly string[], ctx: HookContext): Promise<boolean> {
    let result = true
    for (const entry of this.beforeRespecHandlers) {
      try {
        const r = await entry.handler(nodeIds, ctx)
        if (r === false) result = false
        /* v8 ignore start -- identical catch pattern tested in runBeforeUnlock */
      } catch (e) {
        this.onError?.(entry.pluginId, e)
        /* v8 ignore stop */
      }
    }
    return result
  }

  // ── After runners (async; fire-and-forget; capture errors) ──

  async runAfterUnlock(nodeId: string, ctx: HookContext): Promise<void> {
    for (const entry of this.afterUnlockHandlers) {
      try {
        await entry.handler(nodeId, ctx)
        /* v8 ignore start -- identical catch pattern tested in runAfterLock */
      } catch (e) {
        this.onError?.(entry.pluginId, e)
        /* v8 ignore stop */
      }
    }
  }

  async runAfterLock(nodeId: string, ctx: HookContext): Promise<void> {
    for (const entry of this.afterLockHandlers) {
      try {
        await entry.handler(nodeId, ctx)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
  }

  async runAfterRespec(nodeIds: readonly string[], ctx: HookContext): Promise<void> {
    for (const entry of this.afterRespecHandlers) {
      try {
        await entry.handler(nodeIds, ctx)
        /* v8 ignore start -- identical catch pattern tested in runAfterLock */
      } catch (e) {
        this.onError?.(entry.pluginId, e)
        /* v8 ignore stop */
      }
    }
  }

  // ── Compute runners (sync; chain pattern) ──

  runComputeUnlockability(nodeId: string, defaultResult: UnlockCheck): UnlockCheck {
    let current = defaultResult
    for (const entry of this.computeUnlockabilityHandlers) {
      try {
        current = entry.handler(nodeId, current)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
        // `current` mantén o último valor exitoso (ou defaultResult
        // se ningún handler tivo éxito aínda).
      }
    }
    return current
  }

  runComputeCost(nodeId: string, defaultCost: readonly Cost[]): readonly Cost[] {
    let current = defaultCost
    for (const entry of this.computeCostHandlers) {
      try {
        current = entry.handler(nodeId, current)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
    return current
  }
}
// ── FIN: HookRunner ──
