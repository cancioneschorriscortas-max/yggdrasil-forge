// ── INICIO: errors public API ──
export { ErrorCode } from './codes.js'
export { ERROR_MESSAGES } from './messages.js'
export {
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
} from './YggdrasilError.js'
export { getErrorMessage } from './getMessage.js'
// ── FIN: errors public API ──
