// ── INICIO: computeLayout función pública ──
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { LayoutEngineRegistry } from './LayoutEngineRegistry.js'
import type { LayoutResult } from './LayoutResult.js'
import { applyEdgeRouting } from './PathBuilder.js'

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

  // F10.4b: aplicar routing por-edge segundo o contrato de datos
  // (LayoutConfig.curve + EdgeStyle.routing). applyEdgeRouting é
  // idempotente para árbores sen routing definido (fast-path: devolve
  // o mesmo LayoutResult); polo tanto é retrocompatible.
  const computeResult = engine.compute(treeDef)
  if (!computeResult.ok) return computeResult
  return ok(applyEdgeRouting(computeResult.value, treeDef))
}
// ── FIN: computeLayout función pública ──
