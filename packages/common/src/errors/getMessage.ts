// ── INICIO: getErrorMessage ──
// Helper para obter a mensaxe localizada dun error code,
// con substitución de variables do contexto.

import { interpolate } from '../i18n.js'
import { FALLBACK_LOCALE, type Locale, type SupportedLocale } from '../locales.js'
import type { ErrorCode } from './codes.js'
import { ERROR_MESSAGES } from './messages.js'

/**
 * Obtén a mensaxe localizada para un error code.
 *
 * Se a locale solicitada non existe nas traducións, recórrese ao fallback.
 * Se a mensaxe ten placeholders {x}, substitúense co contexto.
 *
 * @param code - O error code
 * @param locale - A locale activa
 * @param context - Variables para interpolar na mensaxe
 *
 * @example
 * getErrorMessage(ErrorCode.NODE_NOT_FOUND, 'gl', { nodeId: 'panadeiro' })
 * // 'O nodo "panadeiro" non existe na árbore'
 */
export function getErrorMessage(
  code: ErrorCode,
  locale: Locale,
  context?: Record<string, unknown>,
): string {
  const messages = ERROR_MESSAGES[code]
  /* v8 ignore next 3 */
  if (messages === undefined) {
    return `Unknown error code: ${code}`
  }

  const template =
    messages[locale as SupportedLocale] ?? messages[FALLBACK_LOCALE] ?? `Error: ${code}`

  if (context === undefined) {
    return template
  }

  const stringContext: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' || typeof value === 'number') {
      stringContext[key] = value
    } else {
      stringContext[key] = String(value)
    }
  }

  return interpolate(template, stringContext)
}
// ── FIN: getErrorMessage ──
