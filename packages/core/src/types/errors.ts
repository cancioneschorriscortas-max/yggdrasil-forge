// ── INICIO: Errors re-export ──
// Re-exporta as utilidades de error de common para uso interno en core.
// Os consumidores externos deben importar directamente de @yggdrasil-forge/common.

export {
  ErrorCode,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from '@yggdrasil-forge/common'
// ── FIN: Errors re-export ──
