// ── INICIO: CustomLayoutConfig tipos + parseCustomConfig ──
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
 * Configuración do CustomLayout (posicións manuais).
 *
 * Esta interface só extende BaseLayoutConfig con `type: 'custom'`
 * literal. Cero campos adicionais en 4.4 — IdentityLayout xa cumpre
 * o contrato MASTER §20 sen necesidade de opcións extras. Sub-fases
 * futuras poden engadir campos opcionais aquí se algún caso de uso
 * real os require.
 *
 * O autor declara `NodeDef.position` para cada nodo que queira
 * posicionar manualmente; nodos sen position quedan en (0, 0).
 */
export interface CustomLayoutConfig extends BaseLayoutConfig {
  readonly type: 'custom'
}

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Valida e parsea un LayoutConfig xenérico a CustomLayoutConfig
 * estricto. Devolve err(LAYOUT_COMPUTE_FAILED) se `type` non é
 * exactamente 'custom'.
 *
 * Función minimal por deseño: en 4.4 CustomLayoutConfig só ten o
 * campo `type`. Coherencia arquitectónica con parseRadialConfig
 * (4.2) e parseTreeConfig (4.3) — todos os layouts teñen o seu
 * propio parser.
 */
export function parseCustomConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<CustomLayoutConfig> {
  if (config.type !== 'custom') {
    return err(
      new YggdrasilError(
        ErrorCode.LAYOUT_COMPUTE_FAILED,
        getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
          type: config.type,
          reason: `expected type 'custom', got '${config.type}'`,
        }),
        { context: { type: config.type } },
      ),
    )
  }

  return ok({ type: 'custom' })
}
// ── FIN: CustomLayoutConfig tipos + parseCustomConfig ──
