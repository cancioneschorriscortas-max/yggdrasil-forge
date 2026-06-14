// ── INICIO: HistoryPlugin types ──

/**
 * Tipo de operación rastreada polo HistoryPlugin.
 */
export type HistoryOperation = 'unlock' | 'lock' | 'respec'

/**
 * Unha entrada na historia.
 */
export interface HistoryEntry {
  /** Tipo de operación rastreada. */
  readonly operation: HistoryOperation
  /** Timestamp do hook (millis desde epoch). */
  readonly timestamp: number
  /**
   * Ids dos nodos involucrados.
   * - Para unlock/lock: array dun só id (`[nodeId]`).
   * - Para respec: array con todos os nodos bloqueados (post-cascade).
   */
  readonly nodeIds: readonly string[]
  /** Locale do HookContext no momento da operación. */
  readonly locale: string
}

/**
 * Opcións para HistoryPlugin.
 */
export interface HistoryOptions {
  /**
   * Límite máximo de entradas almacenadas (FIFO).
   * Cando se chega ao límite, a entrada máis antiga é eliminada.
   *
   * Default: 100.
   */
  readonly maxSize?: number
}

// ── FIN: HistoryPlugin types ──
