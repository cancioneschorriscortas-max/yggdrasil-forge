// ── INICIO: ConstellationConfig tipos + parseConstellationConfig ──
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
 * Forma do fío (radial strand) de cada cluster.
 *
 * - `'line'` (v1, único implementado): segmento radial recto desde
 *   `innerRadius` ata `outerRadius`. Os membros enfilan ao longo del.
 *
 * Valores futuros (estruturados no config pero NON implementados aínda,
 * por disciplina §13): `'curve'` (curvatura tanxencial), `'spiral'`
 * (avance espiral). Entrarán **sen reescribir o config**.
 */
export type ConstellationShape = 'line'

const VALID_CONSTELLATION_SHAPES = new Set<string>(['line'])

/**
 * Como repartir o tramo radial ao longo do fío.
 *
 * - `'equal-span'` (default): cada fío vai sempre de `innerRadius` a
 *   `outerRadius` independentemente do número de membros. Cluster de 3
 *   queda con máis folgura entre puntos ca un de 4; ambos rematan no
 *   mesmo `outerRadius`.
 * - `'fixed-step'`: paso radial constante para todos os clusters,
 *   calculado en función do cluster máis grande. Cluster con menos
 *   membros remata **antes** de `outerRadius`.
 */
export type ConstellationLengthMode = 'equal-span' | 'fixed-step'

const VALID_LENGTH_MODES = new Set<string>(['equal-span', 'fixed-step'])

/**
 * Configuración do `ConstellationLayout`.
 *
 * **Modelo**: cada cluster é un fío radial saínte do centro (a coroa).
 * Os membros distribúense ao longo do fío desde o membro máis preto
 * (a `innerRadius`) ata o máis afastado (cara `outerRadius`). Enche o
 * espazo radial → mata o "anel morto" que deixa `clustered-radial`
 * en modo `list` (invariante `growOutward`).
 *
 * **Forma confirmada** (esbozo de Agarfal, inspiración Skyrim): 5 fíos
 * rectos saíndo da coroa, un por cluster, membros espazados parello.
 *
 * **Disciplina §13**: a interface contén os mandos completos
 * (`shape`/`lengthMode`/`innerRadius`/`outerRadius`/`startAngle`), pero
 * `shape` só admite `'line'` na v1. `'curve'`/`'spiral'` chegarán sen
 * tocar este config.
 */
export interface ConstellationConfig extends BaseLayoutConfig {
  readonly type: 'constellation'

  /**
   * Forma do fío. Opcional. Default `'line'`. v1 só admite `'line'`;
   * outros valores devolverán erro de validación.
   */
  readonly shape?: ConstellationShape

  /**
   * Raio do primeiro skill de cada fío (o máis preto da coroa). > 0.
   * Default `90`.
   */
  readonly innerRadius?: number

  /**
   * Raio do último skill de cada fío (o máis lonxe). > `innerRadius`.
   * Default `320`.
   */
  readonly outerRadius?: number

  /**
   * Modo de repartición radial dos membros. Default `'equal-span'`.
   * Ver `ConstellationLengthMode`.
   */
  readonly lengthMode?: ConstellationLengthMode

  /**
   * Ángulo inicial do primeiro fío en radiáns. Default `-Math.PI / 2`
   * ("arriba" en coordenadas estándar onde Y crece cara abaixo). Cambialo
   * **xira** o anel (o "voltear" do exemplo).
   */
  readonly startAngle?: number

  /** Centro X do layout. Default `0`. */
  readonly centerX?: number

  /** Centro Y do layout. Default `0`. */
  readonly centerY?: number
}

const DEFAULT_LOCALE: Locale = 'gl'

/** Helper para crear err de validación con LAYOUT_COMPUTE_FAILED. */
function validationErr(
  reason: string,
  locale: Locale,
  context: Record<string, unknown>,
): Result<ConstellationConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
        type: 'constellation',
        reason,
      }),
      { context },
    ),
  )
}

/**
 * Valida e parsea un `LayoutConfig` xenérico a `ConstellationConfig`
 * estrito. Devolve `err(LAYOUT_COMPUTE_FAILED)` con `reason` específica
 * se algún campo é inválido.
 *
 * Defaults aplícanse fóra (en `ConstellationLayout.compute`), non aquí.
 */
export function parseConstellationConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<ConstellationConfig> {
  if (config.type !== 'constellation') {
    return validationErr(`expected type 'constellation', got '${config.type}'`, locale, {
      type: config.type,
    })
  }

  // shape opcional ∈ {'line'}; valor distinto = aínda non implementado.
  const shape = config.shape
  if (shape !== undefined) {
    if (typeof shape !== 'string' || !VALID_CONSTELLATION_SHAPES.has(shape)) {
      return validationErr(
        `shape '${String(shape)}' is not yet implemented; only 'line' is supported in v1`,
        locale,
        { field: 'shape', value: shape },
      )
    }
  }

  // innerRadius opcional, > 0 se presente
  const innerRadius = config.innerRadius
  if (innerRadius !== undefined) {
    if (typeof innerRadius !== 'number' || !Number.isFinite(innerRadius) || innerRadius <= 0) {
      return validationErr(
        `innerRadius must be a positive number; got ${String(innerRadius)}`,
        locale,
        { field: 'innerRadius', value: innerRadius },
      )
    }
  }

  // outerRadius opcional, > innerRadius se ambos presentes (e > 0 sempre)
  const outerRadius = config.outerRadius
  if (outerRadius !== undefined) {
    if (typeof outerRadius !== 'number' || !Number.isFinite(outerRadius) || outerRadius <= 0) {
      return validationErr(
        `outerRadius must be a positive number; got ${String(outerRadius)}`,
        locale,
        { field: 'outerRadius', value: outerRadius },
      )
    }
    if (innerRadius !== undefined && outerRadius <= innerRadius) {
      return validationErr(
        `outerRadius (${outerRadius}) must be greater than innerRadius (${innerRadius})`,
        locale,
        { field: 'outerRadius', innerRadius, outerRadius },
      )
    }
  }

  // lengthMode opcional ∈ {'equal-span','fixed-step'}
  const lengthMode = config.lengthMode
  if (lengthMode !== undefined) {
    if (typeof lengthMode !== 'string' || !VALID_LENGTH_MODES.has(lengthMode)) {
      return validationErr(
        `lengthMode must be one of equal-span/fixed-step; got '${String(lengthMode)}'`,
        locale,
        { field: 'lengthMode', value: lengthMode },
      )
    }
  }

  // startAngle opcional, finito se presente
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

  // centerX opcional, finito se presente
  const centerX = config.centerX
  if (centerX !== undefined) {
    if (typeof centerX !== 'number' || !Number.isFinite(centerX)) {
      return validationErr(`centerX must be a finite number; got ${String(centerX)}`, locale, {
        field: 'centerX',
        value: centerX,
      })
    }
  }

  // centerY opcional, finito se presente
  const centerY = config.centerY
  if (centerY !== undefined) {
    if (typeof centerY !== 'number' || !Number.isFinite(centerY)) {
      return validationErr(`centerY must be a finite number; got ${String(centerY)}`, locale, {
        field: 'centerY',
        value: centerY,
      })
    }
  }

  // Constrúe resultado tipado — spread condicional para
  // exactOptionalPropertyTypes (campos só presentes se tiñan valor).
  return ok({
    type: 'constellation' as const,
    ...(shape !== undefined ? { shape: shape as ConstellationShape } : {}),
    ...(innerRadius !== undefined ? { innerRadius } : {}),
    ...(outerRadius !== undefined ? { outerRadius } : {}),
    ...(lengthMode !== undefined ? { lengthMode: lengthMode as ConstellationLengthMode } : {}),
    ...(startAngle !== undefined ? { startAngle } : {}),
    ...(centerX !== undefined ? { centerX } : {}),
    ...(centerY !== undefined ? { centerY } : {}),
  })
}
// ── FIN: ConstellationConfig tipos + parseConstellationConfig ──
