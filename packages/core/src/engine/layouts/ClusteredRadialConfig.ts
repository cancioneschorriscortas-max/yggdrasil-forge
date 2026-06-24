// ── INICIO: ClusteredRadialConfig tipos + parseClusteredRadialConfig ──
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
 * Tipo de esqueleto estrutural xerado polo ClusteredRadialLayout.
 *
 * - `'none'`: cero elementos mesh.
 * - `'spokes'`: liñas centro → punto-de-grupo, unha por cluster. Default.
 *   Representa as "varas" visuais da estrela cando a árbore non ten
 *   `edges` semánticos entre raíz e grupos (caso panadeiro).
 */
export type ClusteredMeshType = 'none' | 'spokes'

const VALID_CLUSTERED_MESH_TYPES = new Set<string>(['none', 'spokes'])

const VALID_MEMBER_LAYOUTS = new Set<string>(['fan', 'list', 'cluster'])

/**
 * Configuración do ClusteredRadialLayout (F11.2a — base común).
 *
 * Algoritmo (2a, base): raíz no centro · grupos repartidos en radial
 * uniforme · cada membro do grupo nun abano placeholder cara afóra
 * arredor do punto-de-grupo · spokes opcional centro→grupo.
 *
 * As variantes intra-grupo (`memberLayout: 'list' | 'cluster'`) e a
 * áncora real (`anchorNodeId`) chegarán en sub-fases posteriores (2b/2c)
 * SEN mudar este config — engadirán campos opcionais.
 *
 * **NON usa `NodeDef.position`** (igual ca `RadialLayout`). Para
 * posicións manuais, use o layout `'custom'` (IdentityLayout).
 */
export interface ClusteredRadialConfig extends BaseLayoutConfig {
  readonly type: 'clustered-radial'

  /** Distancia centro → punto-de-grupo. Obrigatorio, > 0. */
  readonly groupRadius: number

  /**
   * Distancia punto-de-grupo → membro (colocación base do abano
   * placeholder). Opcional, > 0. Default `groupRadius * 0.45`.
   */
  readonly orbitRadius?: number

  /** Centro X do layout. Default 0. */
  readonly centerX?: number

  /** Centro Y do layout. Default 0. */
  readonly centerY?: number

  /**
   * Ángulo inicial do primeiro grupo en radiáns. Default `-PI/2`
   * ("arriba" en coordenadas estándar onde Y crece cara abaixo).
   */
  readonly startAngle?: number

  /** Tipo de esqueleto estrutural. Default `'spokes'`. */
  readonly meshType?: ClusteredMeshType

  /**
   * Distribución intra-grupo dos membros arredor do punto-de-grupo.
   *
   * - `'fan'` (default): abano placeholder de 2a (orbitRadius + arco
   *   `DEFAULT_MEMBER_ARC`). Os membros distribúense radialmente cara
   *   afóra desde o punto-de-grupo.
   * - `'list'`: columna vertical irradiando cara afóra desde o
   *   punto-de-grupo, con separación `rowGap`. Caso "panadeiro".
   *   Honra `growOutward` (A.1).
   * - `'cluster'`: estilo "camareiro". A áncora do grupo
   *   (`GroupDef.anchorNodeId`, ou primeiro membro como fallback)
   *   colócase no punto-de-grupo (a `groupRadius` do centro); os
   *   demais membros (satélites) orbitan a `orbitRadius` da áncora,
   *   en arco `clusterArc` centrado na dirección radial saínte
   *   (honra `growOutward`).
   */
  readonly memberLayout?: 'fan' | 'list' | 'cluster'

  /**
   * Separación vertical entre membros consecutivos en modo `'list'`.
   * Opcional, `> 0`. Default `64`. Ignorado nos demais modos.
   */
  readonly rowGap?: number

  /**
   * Arco total (en radiáns) en que se reparten os satélites en modo
   * `'cluster'`, centrado na dirección radial saínte do centro.
   * Opcional, `> 0`. Default `PI` (semicírculo cara afóra).
   * Ignorado nos demais modos.
   */
  readonly clusterArc?: number
}

const DEFAULT_LOCALE: Locale = 'gl'

/** Helper para crear err de validación con LAYOUT_COMPUTE_FAILED. */
function validationErr(
  reason: string,
  locale: Locale,
  context: Record<string, unknown>,
): Result<ClusteredRadialConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
        type: 'clustered-radial',
        reason,
      }),
      { context },
    ),
  )
}

/**
 * Valida e parsea un `LayoutConfig` xenérico a `ClusteredRadialConfig`
 * estrito. Devolve `err(LAYOUT_COMPUTE_FAILED)` con `reason` específica
 * se algún campo é inválido.
 *
 * Defaults aplícanse fóra (en `ClusteredRadialLayout.compute`), non aquí.
 */
export function parseClusteredRadialConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<ClusteredRadialConfig> {
  if (config.type !== 'clustered-radial') {
    return validationErr(`expected type 'clustered-radial', got '${config.type}'`, locale, {
      type: config.type,
    })
  }

  // groupRadius obrigatorio + > 0
  const groupRadius = config.groupRadius
  if (typeof groupRadius !== 'number' || !Number.isFinite(groupRadius) || groupRadius <= 0) {
    return validationErr(
      `groupRadius must be a positive number; got ${String(groupRadius)}`,
      locale,
      { field: 'groupRadius', value: groupRadius },
    )
  }

  // orbitRadius opcional, debe ser > 0 se presente
  const orbitRadius = config.orbitRadius
  if (orbitRadius !== undefined) {
    if (typeof orbitRadius !== 'number' || !Number.isFinite(orbitRadius) || orbitRadius <= 0) {
      return validationErr(
        `orbitRadius must be a positive number; got ${String(orbitRadius)}`,
        locale,
        { field: 'orbitRadius', value: orbitRadius },
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

  // meshType opcional con valores limitados
  const meshType = config.meshType
  if (meshType !== undefined) {
    if (typeof meshType !== 'string' || !VALID_CLUSTERED_MESH_TYPES.has(meshType)) {
      return validationErr(
        `meshType must be one of none/spokes; got '${String(meshType)}'`,
        locale,
        { field: 'meshType', value: meshType },
      )
    }
  }

  // memberLayout opcional ∈ {'fan','list','cluster'}
  const memberLayout = config.memberLayout
  if (memberLayout !== undefined) {
    if (typeof memberLayout !== 'string' || !VALID_MEMBER_LAYOUTS.has(memberLayout)) {
      return validationErr(
        `memberLayout must be one of fan/list/cluster; got '${String(memberLayout)}'`,
        locale,
        { field: 'memberLayout', value: memberLayout },
      )
    }
  }

  // rowGap opcional, debe ser > 0 se presente
  const rowGap = config.rowGap
  if (rowGap !== undefined) {
    if (typeof rowGap !== 'number' || !Number.isFinite(rowGap) || rowGap <= 0) {
      return validationErr(`rowGap must be a positive number; got ${String(rowGap)}`, locale, {
        field: 'rowGap',
        value: rowGap,
      })
    }
  }

  // clusterArc opcional, debe ser > 0 se presente
  const clusterArc = config.clusterArc
  if (clusterArc !== undefined) {
    if (typeof clusterArc !== 'number' || !Number.isFinite(clusterArc) || clusterArc <= 0) {
      return validationErr(
        `clusterArc must be a positive number; got ${String(clusterArc)}`,
        locale,
        { field: 'clusterArc', value: clusterArc },
      )
    }
  }

  // Constrúe resultado tipado — todos os campos validados.
  // Spread condicional para `exactOptionalPropertyTypes`.
  return ok({
    type: 'clustered-radial' as const,
    groupRadius,
    ...(orbitRadius !== undefined ? { orbitRadius } : {}),
    ...(centerX !== undefined ? { centerX } : {}),
    ...(centerY !== undefined ? { centerY } : {}),
    ...(startAngle !== undefined ? { startAngle } : {}),
    ...(meshType !== undefined ? { meshType: meshType as ClusteredMeshType } : {}),
    ...(memberLayout !== undefined
      ? { memberLayout: memberLayout as 'fan' | 'list' | 'cluster' }
      : {}),
    ...(rowGap !== undefined ? { rowGap } : {}),
    ...(clusterArc !== undefined ? { clusterArc } : {}),
  })
}
// ── FIN: ClusteredRadialConfig tipos + parseClusteredRadialConfig ──
