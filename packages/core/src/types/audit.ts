// ── INICIO: Audit types ──
// Rexistro estruturado de accións realizadas sobre a árbore.

import type { TreeChange } from './changes.js'

/**
 * Acción rexistrada no audit log.
 */
export type AuditAction =
  | { readonly type: 'node_unlocked'; readonly nodeId: string; readonly tier: number }
  | { readonly type: 'node_locked'; readonly nodeId: string }
  | {
      readonly type: 'progress_updated'
      readonly nodeId: string
      readonly from: number
      readonly to: number
    }
  | { readonly type: 'respec'; readonly nodeIds: readonly string[] }
  | { readonly type: 'build_imported'; readonly source: 'url' | 'file' | 'remote' }
  | { readonly type: 'tree_loaded'; readonly treeId: string }
  | { readonly type: 'tree_changed'; readonly changes: readonly TreeChange[] }
  | { readonly type: 'node_expired'; readonly nodeId: string }
  | {
      readonly type: 'progress_synced_external'
      readonly nodeId: string
      readonly from: number
      readonly to: number
    }
  | { readonly type: 'custom'; readonly name: string; readonly data: unknown }

/**
 * Entrada do audit log: unha acción rexistrada con metadata.
 */
export interface AuditEntry {
  readonly id: string
  readonly timestamp: number
  readonly actor?: string
  readonly action: AuditAction
  readonly context?: Readonly<Record<string, unknown>>
  readonly rollbackable?: boolean
}

/**
 * Filtro para consultas ao audit log.
 */
export interface AuditFilter {
  readonly actor?: string
  readonly action?: { readonly type: AuditAction['type'] }
  readonly from?: number
  readonly to?: number
  readonly limit?: number
}
// ── FIN: Audit types ──
