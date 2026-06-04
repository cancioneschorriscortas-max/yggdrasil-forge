// ── INICIO: RadialLayoutConfig tipos + parseRadialConfig ──
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { BaseLayoutConfig } from '../../types/tree.js'
import type { LayoutConfig } from '../../types/tree.js'

/**
 * Tipo de mesh visual auxiliar.
 *
 * - `'none'`: cero elementos mesh xerados.
 * - `'rings'`: círculos concéntricos un por nivel da árbore. Default.
 * - `'cross'`: dúas liñas (horizontal + vertical) cruzando o centro.
 * - `'star'`: N radios desde o centro, onde N é o número de roots da
 *   árbore. Útil cando hai unha estructura "estrela" natural.
 */
export type MeshType = 'none' | 'rings' | 'cross' | 'star'

/** Valores válidos de MeshType para validación. */
const VALID_MESH_TYPES = new Set<string>(['none', 'rings', 'cross', 'star'])

/**
 * Configuración dun polígono perimetral decorativo.
 *
 * O polígono debúxase como elemento mesh con `sides` vértices
 * equidistantes nun círculo de radio `radius` arredor do centro do
 * layout.
 */
export interface PolygonConfig {
  /** Número de lados. Min 3. */
  readonly sides: number
  /** Radio do polígono (distancia centro → vértice). Debe ser > 0. */
  readonly radius: number
}

/**
 * Configuración do RadialLayout.
 *
 * Algoritmo: BFS desde os roots da DependencyGraph (nodos sen
 * prerequisites). Cada nivel concéntrico distribúese uniformemente
 * en sectores angulares iguais por nodo do nivel anterior. Os
 * sectores son **iguais por nodo do nivel anterior** (cero
 * proporcional a número de descendentes). Para árbores
 * desbalanceadas pode producir sobreposición visual; algoritmo
 * proporcional diferido a sub-fase futura (ver DT-16).
 *
 * IMPORTANTE: RadialLayout **ignora `NodeDef.position`**. Para
 * posicións manuais, use o layout `'custom'` (IdentityLayout).
 */
export interface RadialLayoutConfig extends BaseLayoutConfig {
  readonly type: 'radial'

  /**
   * Distancia entre niveles concéntricos. Radio do nivel N = radius
   * * N. Debe ser > 0.
   */
  readonly radius: number

  /** Centro X do layout. Default 0. */
  readonly centerX?: number

  /** Centro Y do layout. Default 0. */
  readonly centerY?: number

  /**
   * Ángulo inicial en radiáns. Default `-Math.PI / 2` ("arriba" en
   * coordenadas estándar onde Y crece cara abaixo).
   */
  readonly startAngle?: number

  /** Polígono perimetral decorativo. */
  readonly polygon?: PolygonConfig

  /** Tipo de mesh auxiliar. Default 'rings'. */
  readonly meshType?: MeshType
}

const DEFAULT_LOCALE: Locale = 'gl'

/** Helper para crear err de validación con LAYOUT_COMPUTE_FAILED. */
function validationErr(
  reason: string,
  locale: Locale,
  context: Record<string, unknown>,
): Result<RadialLayoutConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
        type: 'radial',
        reason,
      }),
      { context },
    ),
  )
}

/**
 * Valida e parsea un LayoutConfig xenérico a RadialLayoutConfig
 * estricto. Devolve err(LAYOUT_COMPUTE_FAILED) con `reason` específica
 * se algún campo é inválido.
 *
 * Defaults aplícanse fóra (en RadialLayout.compute), non aquí.
 */
export function parseRadialConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<RadialLayoutConfig> {
  // type
  if (config.type !== 'radial') {
    return validationErr(`expected type 'radial', got '${config.type}'`, locale, {
      type: config.type,
    })
  }

  // radius obrigatorio + > 0
  const radius = config.radius
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) {
    return validationErr(`radius must be a positive number; got ${String(radius)}`, locale, {
      field: 'radius',
      value: radius,
    })
  }

  // centerX opcional, debe ser número finito se presente
  const centerX = config.centerX
  if (centerX !== undefined) {
    if (typeof centerX !== 'number' || !Number.isFinite(centerX)) {
      return validationErr(`centerX must be a finite number; got ${String(centerX)}`, locale, {
        field: 'centerX',
        value: centerX,
      })
    }
  }

  // centerY opcional, debe ser número finito se presente
  const centerY = config.centerY
  if (centerY !== undefined) {
    if (typeof centerY !== 'number' || !Number.isFinite(centerY)) {
      return validationErr(`centerY must be a finite number; got ${String(centerY)}`, locale, {
        field: 'centerY',
        value: centerY,
      })
    }
  }

  // startAngle opcional, debe ser número finito se presente
  const startAngle = config.startAngle
  if (startAngle !== undefined) {
    if (typeof startAngle !== 'number' || !Number.isFinite(startAngle)) {
      return validationErr(
        `startAngle must be a finite number; got ${String(startAngle)}`,
        locale,
        { field: 'startAngle', value: startAngle },
      )
    }
  }

  // polygon opcional con sides >= 3 e radius > 0
  const polygon = config.polygon as { sides: unknown; radius: unknown } | undefined
  if (polygon !== undefined) {
    if (
      typeof polygon !== 'object' ||
      polygon === null ||
      typeof polygon.sides !== 'number' ||
      !Number.isFinite(polygon.sides) ||
      polygon.sides < 3 ||
      polygon.sides !== Math.floor(polygon.sides)
    ) {
      return validationErr(
        `polygon.sides must be an integer >= 3; got ${String(
          polygon !== null && typeof polygon === 'object'
            ? (polygon as Record<string, unknown>).sides
            : polygon,
        )}`,
        locale,
        { field: 'polygon.sides', value: polygon },
      )
    }
    if (
      typeof polygon.radius !== 'number' ||
      !Number.isFinite(polygon.radius) ||
      polygon.radius <= 0
    ) {
      return validationErr(`polygon.radius must be > 0; got ${String(polygon.radius)}`, locale, {
        field: 'polygon.radius',
        value: polygon.radius,
      })
    }
  }

  // meshType opcional con valores limitados
  const meshType = config.meshType
  if (meshType !== undefined) {
    if (typeof meshType !== 'string' || !VALID_MESH_TYPES.has(meshType)) {
      return validationErr(
        `meshType must be one of none/rings/cross/star; got '${String(meshType)}'`,
        locale,
        { field: 'meshType', value: meshType },
      )
    }
  }

  // Construír resultado tipado — todos os campos validados.
  // Spread condicional para compatibilidade con exactOptionalPropertyTypes.
  return ok({
    type: 'radial' as const,
    radius,
    ...(centerX !== undefined ? { centerX } : {}),
    ...(centerY !== undefined ? { centerY } : {}),
    ...(startAngle !== undefined ? { startAngle } : {}),
    ...(polygon !== undefined
      ? {
          polygon: {
            sides: polygon.sides as number,
            radius: polygon.radius as number,
          },
        }
      : {}),
    ...(meshType !== undefined ? { meshType: meshType as MeshType } : {}),
  })
}
// ── FIN: RadialLayoutConfig tipos + parseRadialConfig ──
