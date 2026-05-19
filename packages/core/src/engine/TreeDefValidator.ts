// ── INICIO: TreeDefValidator ──
// Validación ESTRUCTURAL de TreeDef mediante el esquema Zod (treeDefSchema).
// NO incluye validaciones pedagógicas (no_cycles, progressive_difficulty,
// all_reachable_from_root, ...): eso es la Fase 8.7, fuera de alcance (1.17).
//
// Contrato (decisión 5.2 del briefing, EMENDADA por el arquitecto:
// Result<TreeDef> -> Result<InferredTreeDef>):
// - validateTreeDef(input: unknown): Result<InferredTreeDef>
// - OK  -> ok(treeDef estructural, tipo InferredTreeDef)
// - FAIL -> err(YggdrasilError(INVALID_TREE_DEF, ...)) con un resumen
//           serializable de los issues de Zod en `context` (ruta + mensaje
//           por cada issue; NO se vuelca el ZodError crudo).
//
// InferredTreeDef es estructuralmente TreeDef salvo el artefacto Zod 3
// `?:T|undefined` (equivalencia probada por el helper + test negativo de
// T7). Así se evita todo `as`/`any` en la frontera de validación de entrada
// no confiable (decisión categórica del arquitecto).

import { ErrorCode, type Locale, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { z } from 'zod'
import type { Result } from '../types/index.js'
import { err, ok } from '../types/index.js'
import { type InferredTreeDef, treeDefShapeSchema } from './treeDefSchema.js'

/**
 * Forma serializable de un issue de validación Zod.
 *
 * Se extrae de ZodError.issues a esta forma plana para poder transportarla
 * en el `context` del YggdrasilError (logs, telemetría, red) sin volcar la
 * instancia cruda de ZodError.
 */
export interface TreeDefValidationIssue {
  /** Ruta al campo inválido, p.ej. 'nodes.0.type' (vacía = raíz). */
  readonly path: string
  /** Mensaje de Zod para ese issue. */
  readonly message: string
}

/**
 * Locale por defecto del validador. Coherente con TreeEngine (constructor
 * usa 'gl' por defecto). La entrada externa no fija locale; el llamador
 * puede pasarlo explícitamente.
 */
const DEFAULT_LOCALE: Locale = 'gl'

// ── Extracción de issues a forma serializable ──
// Convierte ZodError.issues en TreeDefValidationIssue[]. La ruta se une con
// '.' (p.ej. ['nodes', 0, 'type'] -> 'nodes.0.type'); raíz -> ''.
function extractIssues(error: z.ZodError): TreeDefValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Valida estructuralmente un valor desconocido contra el esquema de TreeDef.
 *
 * @param input - Valor sin confiar (p.ej. JSON parseado de fuente externa).
 * @param locale - Locale para el mensaje de error. Default: 'gl'.
 * @returns ok(treeDef estructural, tipo InferredTreeDef) si la estructura es
 *          válida; err(YggdrasilError con código INVALID_TREE_DEF) si no,
 *          con los issues de Zod en context.
 *
 * Nunca lanza: la entrada es externa/no confiable, por eso Result. Un input
 * arbitrario (number, null, array, objeto con forma incorrecta) produce err
 * controlado, no una excepción.
 *
 * Devuelve InferredTreeDef (no `TreeDef` nominal) para no introducir `as`/
 * `any` en esta frontera (decisión del arquitecto). InferredTreeDef es
 * estructuralmente TreeDef salvo el artefacto `?:T|undefined` de Zod 3.
 */
export function validateTreeDef(
  input: unknown,
  locale: Locale = DEFAULT_LOCALE,
): Result<InferredTreeDef> {
  const parsed = treeDefShapeSchema.safeParse(input)
  if (parsed.success) {
    // parsed.data ya es exactamente InferredTreeDef (z.infer del esquema).
    // Asignación directa: sin `as`, sin `any`.
    return ok(parsed.data)
  }

  const issues = extractIssues(parsed.error)
  // Resumen compacto para el mensaje localizado ({details}).
  const summary =
    issues.length === 0
      ? 'estructura inválida'
      : issues.map((i) => (i.path === '' ? i.message : `${i.path}: ${i.message}`)).join('; ')

  return err(
    new YggdrasilError(
      ErrorCode.INVALID_TREE_DEF,
      getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, { details: summary }),
      { context: { issues } },
    ),
  )
}
// ── FIN: TreeDefValidator ──
