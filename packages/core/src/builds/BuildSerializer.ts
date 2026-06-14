// packages/core/src/builds/BuildSerializer.ts
// ── INICIO: BuildSerializer ──
// Funcións puras síncronas para serialización JSON de Build con
// validación de shape mínima.
//
// **Cero compresión** (Opción A do director): JSON puro. Builds
// pequenas (1-5 KB típicas) caben cómodamente en URLs sen
// compresión. **Sub-fase futura** podería engadir compresión via
// `pako` se require (e.g., builds > 10 KB en URLs).

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Build, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'

/**
 * Serializa unha Build a JSON. Cero compresión.
 *
 * @example
 * const json = serialize(build)
 * // '{"id":"build-1","treeId":"tree-1",...}'
 */
export function serialize(build: Build): string {
  return JSON.stringify(build)
}

/**
 * Deserializa un string JSON a Build. Devolve Result<Build>.
 *
 * Validación: shape mínima (campos requiridos presentes e do tipo
 * correcto). Cero validación profunda (e.g., cada NodeInstance).
 *
 * Errores posibles:
 * - `BUILD_DESERIALIZE_FAILED` (`YGG_B001`): JSON.parse falla.
 * - `BUILD_INVALID_SHAPE` (`YGG_B002`): shape non coincide con Build.
 */
export function deserialize(str: string): Result<Build> {
  let parsed: unknown
  try {
    parsed = JSON.parse(str)
  } catch (e) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_DESERIALIZE_FAILED,
        getErrorMessage(ErrorCode.BUILD_DESERIALIZE_FAILED, 'gl'),
        /* v8 ignore next -- catch(e): JSON.parse always throws Error subclass */
        { ...(e instanceof Error ? { cause: e } : {}) },
      ),
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_INVALID_SHAPE,
        getErrorMessage(ErrorCode.BUILD_INVALID_SHAPE, 'gl'),
      ),
    )
  }

  const obj = parsed as Record<string, unknown>

  // Validación mínima de campos requiridos:
  if (
    typeof obj.id !== 'string' ||
    typeof obj.treeId !== 'string' ||
    typeof obj.treeVersion !== 'string' ||
    typeof obj.schemaVersion !== 'string' ||
    typeof obj.createdAt !== 'number' ||
    typeof obj.updatedAt !== 'number' ||
    typeof obj.state !== 'object' ||
    obj.state === null
  ) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_INVALID_SHAPE,
        getErrorMessage(ErrorCode.BUILD_INVALID_SHAPE, 'gl'),
      ),
    )
  }

  const state = obj.state as Record<string, unknown>
  if (typeof state.nodes !== 'object' || state.nodes === null) {
    return err(
      new YggdrasilError(
        ErrorCode.BUILD_INVALID_SHAPE,
        getErrorMessage(ErrorCode.BUILD_INVALID_SHAPE, 'gl'),
      ),
    )
  }

  return ok(obj as unknown as Build)
}
// ── FIN: BuildSerializer ──
