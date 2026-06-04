// ── INICIO: TreeLayoutConfig tipos + parseTreeConfig ──
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

/**
 * Dirección do layout xerárquico.
 *
 * - `'top-down'`: roots arriba, fillos abaixo. Default. (Diablo, WoW).
 * - `'bottom-up'`: roots abaixo, fillos arriba (organigrama invertido).
 * - `'left-right'`: roots á esquerda, fillos cara a dereita.
 * - `'right-left'`: roots á dereita, fillos cara a esquerda.
 */
export type TreeDirection = 'top-down' | 'bottom-up' | 'left-right' | 'right-left'

/**
 * Configuración do TreeLayout.
 *
 * Algoritmo: Buchheim et al. 2002 (linear-time variante de
 * Reingold-Tilford 1981). Para TreeDefs que son DAGs (nodo con
 * múltiples prereqs), cada nodo elixe o seu "primary parent" como
 * pai estructural (menor level BFS; desempate por orde en
 * treeDef.nodes). Edges seguen visibles **todos**; só o layout
 * xerárquico usa o primary parent.
 *
 * Múltiples roots: cada root é unha árbore independente; colócanse
 * un á dereita do outro con separación `nodeSpacing * 2`.
 */
export interface TreeLayoutConfig extends BaseLayoutConfig {
  readonly type: 'tree'

  /** Dirección do layout. Default `'top-down'`. */
  readonly direction?: TreeDirection

  /**
   * Distancia entre nodos do mesmo nivel (eixe perpendicular á
   * dirección). Default 80. Debe ser > 0.
   */
  readonly nodeSpacing?: number

  /**
   * Distancia entre niveles consecutivos (eixe da dirección).
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
function makeError(locale: Locale, reason: string): Result<TreeLayoutConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
        type: 'tree',
        reason,
      }),
      { context: { reason } },
    ),
  )
}

/**
 * Valida e parsea un LayoutConfig xenérico a TreeLayoutConfig estricto.
 * Devolve err(LAYOUT_COMPUTE_FAILED) con `reason` específica se algún
 * campo é inválido.
 */
export function parseTreeConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<TreeLayoutConfig> {
  // type
  if (config.type !== 'tree') {
    return makeError(locale, `expected type 'tree', got '${config.type}'`)
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
    type: 'tree' as const,
    ...(direction !== undefined ? { direction: direction as TreeDirection } : {}),
    ...(nodeSpacing !== undefined ? { nodeSpacing } : {}),
    ...(levelSpacing !== undefined ? { levelSpacing } : {}),
    ...(centerX !== undefined ? { centerX } : {}),
    ...(centerY !== undefined ? { centerY } : {}),
  })
}
// ── FIN: TreeLayoutConfig tipos + parseTreeConfig ──
