// ── INICIO: JsonSerializer ──
// Serialización / deserialización determinista de TreeDef con versionado de
// esquema. NO serializa TreeState/builds (solo la definición).
// Sub-fase 3.5 engade `deserializeAsync` con soporte de migracións.

import {
  ErrorCode,
  type Locale,
  SCHEMA_VERSION,
  YggdrasilError,
  getErrorMessage,
} from '@yggdrasil-forge/common'
import type { Result, TreeDef } from '../types/index.js'
import { err, ok } from '../types/index.js'
import { validateTreeDef } from './TreeDefValidator.js'
import type { MigrationRegistry } from './migrations/MigrationRegistry.js'
import { MigrationRunner } from './migrations/MigrationRunner.js'
import type { InferredTreeDef } from './treeDefSchema.js'

/**
 * Locale por defecto (coherente con TreeEngine y TreeDefValidator).
 */
const DEFAULT_LOCALE: Locale = 'gl'

// ── Ordenación estable de claves (determinismo) ──
// Reconstruye recursivamente el valor con las claves de cada objeto en orden
// alfabético estable. Los arrays conservan su orden (es semántico en TreeDef:
// nodes, edges, etc.). Resultado: serialize del mismo TreeDef siempre produce
// exactamente la misma cadena, independientemente del orden de inserción.
//
// Sin `as`: el narrowing a registro se hace con un type guard explícito.
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sortValueDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValueDeep(item))
  }
  if (isPlainRecord(value)) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValueDeep(value[key])
    }
    return sorted
  }
  return value
}

/**
 * Serializa un TreeDef a JSON determinista.
 *
 * - Claves ordenadas de forma estable (alfabética, recursiva): el mismo
 *   TreeDef produce siempre exactamente la misma cadena.
 * - Incluye `schemaVersion` (ya es campo de TreeDef; no se inyecta aparte,
 *   se valida que esté presente reflejándolo tal cual).
 * - NO incluye estado de runtime: el parámetro es TreeDef (la definición),
 *   no TreeState; no hay nada de runtime que excluir.
 *
 * @param treeDef - La definición de árbol a serializar.
 * @returns Cadena JSON determinista.
 */
export function serialize(treeDef: TreeDef): string {
  const ordered = sortValueDeep(treeDef)
  return JSON.stringify(ordered)
}

/**
 * Deserializa una cadena JSON a un TreeDef validado estructuralmente.
 *
 * Flujo: parse JSON -> validación estructural (TreeDefValidator) ->
 * comprobación de schemaVersion contra la SCHEMA_VERSION soportada de common.
 *
 * - JSON malformado (JSON.parse lanza) -> err(INVALID_TREE_DEF) con context
 *   indicando el fallo de parseo (decisión 5.3: no se inventa un código
 *   DESERIALIZATION_FAILED).
 * - Estructura inválida -> err(INVALID_TREE_DEF) (propagado del validador,
 *   con sus issues en context).
 * - schemaVersion != SCHEMA_VERSION soportada -> err(SCHEMA_VERSION_
 *   UNSUPPORTED) localizado. NO se intenta migrar (fase posterior).
 *
 * Devuelve InferredTreeDef (coherencia con validateTreeDef; decisión del
 * arquitecto, Opción 2: sin `as`/`any` en el flujo).
 *
 * @param json - Cadena JSON de fuente externa/no confiable.
 * @param locale - Locale para los mensajes de error. Default: 'gl'.
 */
export function deserialize(
  json: string,
  locale: Locale = DEFAULT_LOCALE,
): Result<InferredTreeDef> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (cause) {
    /* v8 ignore next -- defensivo: JSON.parse só lanza SyntaxError (Error). */
    const detail = cause instanceof Error ? cause.message : 'JSON parse error'
    return err(
      new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: `JSON parse error: ${detail}`,
        }),
        { context: { reason: 'JSON parse error' } },
      ),
    )
  }

  const validation = validateTreeDef(parsed, locale)
  if (!validation.ok) {
    return validation
  }

  const treeDef = validation.value
  if (treeDef.schemaVersion !== SCHEMA_VERSION) {
    return err(
      new YggdrasilError(
        ErrorCode.SCHEMA_VERSION_UNSUPPORTED,
        getErrorMessage(ErrorCode.SCHEMA_VERSION_UNSUPPORTED, locale, {
          version: treeDef.schemaVersion,
        }),
        {
          context: {
            found: treeDef.schemaVersion,
            supported: SCHEMA_VERSION,
          },
        },
      ),
    )
  }

  return ok(treeDef)
}

/**
 * Versión async de `deserialize` con soporte de migracións.
 *
 * Cando se pasa un `MigrationRegistry` e o `schemaVersion` do JSON non
 * coincide co SCHEMA_VERSION actual, intenta migrar os datos usando
 * `MigrationRunner` antes de validar. Se non se pasa registry ou
 * `schemaVersion` coincide, o comportamento é idéntico a `deserialize`.
 *
 * Flujo: parse JSON → (se schema distinto e registry presente) migrar →
 * validación estrutural → comprobación final de schemaVersion.
 *
 * @param json - Cadea JSON de fonte externa/non confiable.
 * @param locale - Locale para mensaxes de erro. Default: 'gl'.
 * @param migrationRegistry - Rexistro de migracións (opcional).
 */
export async function deserializeAsync(
  json: string,
  locale: Locale = DEFAULT_LOCALE,
  migrationRegistry?: MigrationRegistry,
): Promise<Result<InferredTreeDef>> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (cause) {
    /* v8 ignore next -- defensivo: JSON.parse só lanza SyntaxError (Error). */
    const detail = cause instanceof Error ? cause.message : 'JSON parse error'
    return err(
      new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: `JSON parse error: ${detail}`,
        }),
        { context: { reason: 'JSON parse error' } },
      ),
    )
  }

  // Se hai migrationRegistry e o dato ten schemaVersion distinto, migrar.
  let dataToValidate: unknown = parsed
  if (
    migrationRegistry !== undefined &&
    isPlainRecord(parsed) &&
    typeof parsed.schemaVersion === 'string' &&
    parsed.schemaVersion !== SCHEMA_VERSION
  ) {
    const runner = new MigrationRunner(migrationRegistry, { locale })
    const migrated = await runner.run(parsed, parsed.schemaVersion, SCHEMA_VERSION)
    if (!migrated.ok) {
      return migrated
    }
    dataToValidate = migrated.value
  }

  const validation = validateTreeDef(dataToValidate, locale)
  if (!validation.ok) {
    return validation
  }

  const treeDef = validation.value
  if (treeDef.schemaVersion !== SCHEMA_VERSION) {
    return err(
      new YggdrasilError(
        ErrorCode.SCHEMA_VERSION_UNSUPPORTED,
        getErrorMessage(ErrorCode.SCHEMA_VERSION_UNSUPPORTED, locale, {
          version: treeDef.schemaVersion,
        }),
        {
          context: {
            found: treeDef.schemaVersion,
            supported: SCHEMA_VERSION,
          },
        },
      ),
    )
  }

  return ok(treeDef)
}

/**
 * Agrupación de las funciones de serialización como objeto, para quien
 * prefiera un punto de acceso único (coherente con el patrón de otras
 * piezas del motor). Las funciones sueltas siguen exportadas.
 */
export const JsonSerializer = {
  serialize,
  deserialize,
  deserializeAsync,
}
// ── FIN: JsonSerializer ──
