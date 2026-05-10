// ── INICIO: @yggdrasil-forge/core ──
// Motor principal de Yggdrasil Forge.
// O contido real engadirase nas sub-fases 1.x.

import { VERSION as COMMON_VERSION, PROJECT_NAME } from '@yggdrasil-forge/common'

/**
 * Versión actual de @yggdrasil-forge/core.
 */
export const VERSION = '0.0.0'

/**
 * Devolve un saúdo de proba para verificar que o paquete está vivo.
 * Eliminarase cando se introduzan os tipos e clases reais.
 */
export function greet(): string {
  return `${PROJECT_NAME} core v${VERSION} (common v${COMMON_VERSION})`
}
// ── FIN: @yggdrasil-forge/core ──
