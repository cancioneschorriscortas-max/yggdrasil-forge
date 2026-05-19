// ── INICIO: AuditLogger ──
// Rexistro de auditoría en memoria. Cada acción mutativa exitosa do
// motor deixa unha AuditEntry consultable. Estado volátil (array
// interno): NON persiste a disco (persistencia é fase posterior con
// StorageAdapter). Límite circular FIFO: ao superar maxEntries
// descártanse as entradas máis antigas.

import type { AuditAction, AuditEntry, AuditFilter } from '../types/index.js'

/** Opciones de construcción do AuditLogger. */
export interface AuditLoggerOptions {
  /** Activa o rexistro. Se false, record() é no-op. Default: false. */
  readonly enabled?: boolean
  /** Máximo de entradas en memoria (FIFO). Default: 1000. */
  readonly maxEntries?: number
}

/** Opciones para rexistrar unha entrada concreta. */
export interface AuditRecordOptions {
  readonly actor?: string
  readonly context?: Record<string, unknown>
  readonly rollbackable?: boolean
}

const DEFAULT_ENABLED = false
const DEFAULT_MAX_ENTRIES = 1000

export class AuditLogger {
  private readonly enabled: boolean
  private readonly maxEntries: number
  // Buffer interno. Orde de inserción (máis antiga primeiro).
  private readonly entries: AuditEntry[] = []
  // Contador monótono para xerar ids únicos dentro da sesión.
  // Decisión interna (reversible): contador + prefixo en lugar de
  // crypto.randomUUID() pola robustez e determinismo (cero deps de
  // entorno, ids estables para tests).
  private counter = 0

  constructor(options?: AuditLoggerOptions) {
    this.enabled = options?.enabled ?? DEFAULT_ENABLED
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES
  }

  // ── record: crea e engade unha entrada ──
  // Se o logger está desactivado devolve null sen rexistrar nada
  // (cero overhead). Aplica o límite FIFO tras inserir.
  record(action: AuditAction, opts?: AuditRecordOptions): AuditEntry | null {
    if (!this.enabled) {
      return null
    }
    this.counter += 1
    const entry: AuditEntry = {
      id: `audit-${this.counter}`,
      // Punto de inxección futura: TimeManager inxectable é fase 2.
      // Por agora Date.now() directo.
      timestamp: Date.now(),
      ...(opts?.actor !== undefined ? { actor: opts.actor } : {}),
      action,
      ...(opts?.context !== undefined ? { context: { ...opts.context } } : {}),
      ...(opts?.rollbackable !== undefined ? { rollbackable: opts.rollbackable } : {}),
    }
    this.entries.push(entry)
    // Límite circular FIFO: descartar as máis antigas. NON lanzar erro.
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries)
    }
    return entry
  }

  // ── query: devolve copia filtrada ──
  // Filtros: actor exacto, action.type exacto, from/to inclusivos por
  // timestamp. Resultado ordenado de máis recente a máis antigo.
  // `limit` corta as N entradas máis recentes (decisión documentada:
  // o consumidor adoita querer "as últimas N accións").
  query(filter?: AuditFilter): AuditEntry[] {
    let result = this.entries.slice()
    if (filter?.actor !== undefined) {
      const actor = filter.actor
      result = result.filter((e) => e.actor === actor)
    }
    if (filter?.action !== undefined) {
      const actionType = filter.action.type
      result = result.filter((e) => e.action.type === actionType)
    }
    if (filter?.from !== undefined) {
      const from = filter.from
      result = result.filter((e) => e.timestamp >= from)
    }
    if (filter?.to !== undefined) {
      const to = filter.to
      result = result.filter((e) => e.timestamp <= to)
    }
    // Máis recente primeiro.
    result.reverse()
    if (filter?.limit !== undefined && filter.limit >= 0) {
      result = result.slice(0, filter.limit)
    }
    return result
  }

  // ── clear: baleira o rexistro ──
  clear(): void {
    this.entries.length = 0
  }

  // ── size: número de entradas actuais (útil en tests) ──
  size(): number {
    return this.entries.length
  }
}
// ── FIN: AuditLogger ──
