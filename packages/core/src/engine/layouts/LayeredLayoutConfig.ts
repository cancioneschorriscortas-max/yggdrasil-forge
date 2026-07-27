// ── INICIO: LayeredLayoutConfig tipos + parseLayeredConfig ──
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { BaseLayoutConfig, LayoutConfig } from '../../types/tree.js'
import type { TreeDirection } from './TreeLayoutConfig.js'

/**
 * Configuración do LayeredLayout (Sugiyama-lite para DAGs).
 *
 * Config espello da de TreeLayout (mesma convención de espazados e
 * direccións) — a diferenza é o ALGORITMO, non a parametrización:
 * layered coloca cada nodo na capa do seu camiño máis longo desde as
 * raíces (tódolos pais quedan ARRIBA), mentres tree elixe un só
 * "primary parent". Para nodos con varios pais, layered evita as
 * arestas diagonais cruzadas do tree.
 */
export interface LayeredLayoutConfig extends BaseLayoutConfig {
  readonly type: 'layered'

  /** Dirección do layout. Default `'top-down'`. */
  readonly direction?: TreeDirection

  /**
   * Distancia entre nodos da mesma capa (eixe perpendicular á
   * dirección). Default 80. Debe ser > 0.
   */
  readonly nodeSpacing?: number

  /**
   * Distancia entre capas consecutivas (eixe da dirección).
   * Default 120. Debe ser > 0.
   */
  readonly levelSpacing?: number

  /** Centro X do layout. Default 0. */
  readonly centerX?: number

  /** Centro Y do layout. Default 0. */
  readonly centerY?: number
}

const DEFAULT_LOCALE: Locale = 'gl'
const VALID_DIRECTIONS = new Set<string>(['top-down', 'bottom-up', 'left-right', 'right-left'])

/** Helper para crear err de validación. */
function makeError(locale: Locale, reason: string): Result<LayeredLayoutConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
        type: 'layered',
        reason,
      }),
      { context: { reason } },
    ),
  )
}

/**
 * Valida e parsea un LayoutConfig xenérico a LayeredLayoutConfig
 * estricto. Devolve err(LAYOUT_COMPUTE_FAILED) con `reason` específica
 * se algún campo é inválido.
 */
export function parseLayeredConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<LayeredLayoutConfig> {
  // type
  if (config.type !== 'layered') {
    return makeError(locale, `expected type 'layered', got '${config.type}'`)
  }

  // direction (opcional)
  const direction = config.direction
  if (direction !== undefined) {
    if (typeof direction !== 'string' || !VALID_DIRECTIONS.has(direction)) {
      return makeError(locale, `invalid direction: ${String(direction)}`)
    }
  }

  // nodeSpacing (opcional, > 0)
  const nodeSpacing = config.nodeSpacing
  if (nodeSpacing !== undefined) {
    if (typeof nodeSpacing !== 'number' || !Number.isFinite(nodeSpacing) || nodeSpacing <= 0) {
      return makeError(locale, `nodeSpacing must be a positive number; got ${String(nodeSpacing)}`)
    }
  }

  // levelSpacing (opcional, > 0)
  const levelSpacing = config.levelSpacing
  if (levelSpacing !== undefined) {
    if (typeof levelSpacing !== 'number' || !Number.isFinite(levelSpacing) || levelSpacing <= 0) {
      return makeError(
        locale,
        `levelSpacing must be a positive number; got ${String(levelSpacing)}`,
      )
    }
  }

  // centerX (opcional, número finito)
  const centerX = config.centerX
  if (centerX !== undefined) {
    if (typeof centerX !== 'number' || !Number.isFinite(centerX)) {
      return makeError(locale, `centerX must be a finite number; got ${String(centerX)}`)
    }
  }

  // centerY (opcional, número finito)
  const centerY = config.centerY
  if (centerY !== undefined) {
    if (typeof centerY !== 'number' || !Number.isFinite(centerY)) {
      return makeError(locale, `centerY must be a finite number; got ${String(centerY)}`)
    }
  }

  // Spread condicional (exactOptionalPropertyTypes)
  return ok({
    type: 'layered' as const,
    ...(direction !== undefined ? { direction: direction as TreeDirection } : {}),
    ...(nodeSpacing !== undefined ? { nodeSpacing } : {}),
    ...(levelSpacing !== undefined ? { levelSpacing } : {}),
    ...(centerX !== undefined ? { centerX } : {}),
    ...(centerY !== undefined ? { centerY } : {}),
  })
}
// ── FIN: LayeredLayoutConfig tipos + parseLayeredConfig ──
