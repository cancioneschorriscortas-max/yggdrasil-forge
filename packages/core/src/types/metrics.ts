// ── INICIO: Engine metrics ──
// Métricas runtime do TreeEngine.

/**
 * Snapshot das métricas do motor.
 */
export interface EngineMetrics {
  readonly unlocksTotal: number
  readonly locksTotal: number
  readonly respecsTotal: number
  readonly errorsTotal: number
  readonly applyChangesTotal: number
  readonly treeChangesPerSecond: number
  readonly avgUnlockTime: number
  readonly avgLayoutTime: number
  readonly avgPathfindTime: number
  readonly avgStatComputeTime: number
  readonly nodeCount: number
  readonly edgeCount: number
  readonly pluginCount: number
  readonly estimatedMemoryBytes: number
  readonly cacheHitRate: number
  readonly cacheSize: number
  readonly externalProgressSourcesActive: number
  readonly pendingExternalSyncs: number
}
// ── FIN: Engine metrics ──
