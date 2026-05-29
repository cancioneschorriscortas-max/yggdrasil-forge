// ── INICIO: @yggdrasil-forge/common public API ──
// Constantes, error codes, locales, i18n helpers compartidos por todo o monorepo.

// Constantes globais
export { PROJECT_NAME, VERSION, SCHEMA_VERSION } from './constants.js'

// Locales
export {
  type Locale,
  type SupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  isSupportedLocale,
} from './locales.js'

// i18n
export { type LocalizedString, resolveLocalized, interpolate } from './i18n.js'

// Errors
export {
  ErrorCode,
  ERROR_MESSAGES,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from './errors/index.js'
// Result type (movido desde core en sub-fase 3.0)
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './result.js'
// ── FIN: @yggdrasil-forge/common public API ──
