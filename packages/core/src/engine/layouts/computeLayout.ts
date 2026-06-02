// ── INICIO: computeLayout función pública ──
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
} from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { LayoutEngineRegistry } from './LayoutEngineRegistry.js'
import type { LayoutResult } from './LayoutResult.js'

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Calcula o layout dun TreeDef usando o engine apropiado do registry.
 *
 * Determinación: busca o engine con `type === treeDef.layout.type`.
 * Se non hai engine rexistrado, devolve err(LAYOUT_TYPE_UNKNOWN).
 *
 * Cero estado: a función é pura e síncrona. O resultado pode
 * cachearse externamente (responsabilidade do consumidor; en futuro
 * o TreeEngine farao mediante InternalState.caches.layout).
 */
export function computeLayout(
  treeDef: TreeDef,
  registry: LayoutEngineRegistry,
  locale: Locale = DEFAULT_LOCALE,
): Result<LayoutResult> {
  const layoutType = treeDef.layout.type
  const engine = registry.find(layoutType)

  if (engine === undefined) {
    return err(
      new YggdrasilError(
        ErrorCode.LAYOUT_TYPE_UNKNOWN,
        getErrorMessage(ErrorCode.LAYOUT_TYPE_UNKNOWN, locale, {
          type: layoutType,
        }),
        { context: { type: layoutType } },
      ),
    )
  }

  return engine.compute(treeDef)
}
// ── FIN: computeLayout función pública ──
