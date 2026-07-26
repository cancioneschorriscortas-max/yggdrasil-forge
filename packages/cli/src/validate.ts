// ── INICIO: validate (7.15, Cambio 4) ──
// Validación headless dun documento: o corazón do bucle IA.
// `deserializeDocument` (@editor-core) é a única fonte de verdade —
// o mesmo camiño exacto que corre o editor ao importar (7.14-B + 7.15).
// O erro devólvese como DATO accionable, non como texto solto.

import { deserializeDocument } from '@yggdrasil-forge/editor-core'

/** Un problema atopado na validación, como dato accionable. */
export interface ValidationIssueJson {
  readonly severity: 'error' | 'warning' | 'info'
  readonly code: string
  readonly message: string
  readonly nodeId?: string
}

/** Resultado da validación: a forma exacta que emite `ygg validate --json`. */
export interface ValidationReport {
  readonly ok: boolean
  readonly issues: readonly ValidationIssueJson[]
  /** Recontos rápidos (só con ok=true) — útiles para sanidade do chamador. */
  readonly stats?: { readonly nodes: number; readonly edges: number }
}

/**
 * Valida o texto dun documento (JSON). Nunca lanza.
 *
 * Nota v1: `deserializeDocument` devolve UN erro agregado (cos campos
 * concretos dentro da mensaxe); emitímolo como un issue único. Se
 * algún día expón issues granulares, este informe amplíase sen
 * cambiar de forma.
 */
export function validateDocumentText(text: string): ValidationReport {
  const result = deserializeDocument(text)
  if (result.ok) {
    return {
      ok: true,
      issues: [],
      stats: {
        nodes: result.value.tree.nodes.length,
        edges: result.value.tree.edges.length,
      },
    }
  }
  return {
    ok: false,
    issues: [
      {
        severity: 'error',
        code: String(result.error.code ?? 'INVALID'),
        message: result.error.message,
      },
    ],
  }
}
// ── FIN: validate ──
