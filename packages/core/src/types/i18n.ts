// ── INICIO: I18n config types ──
// Configuración de internacionalización a nivel TreeDef.
//
// Nota: LocalizedString e Locale viven en @yggdrasil-forge/common.
// Aquí definimos só I18nConfig (config opcional por árbore).

import type { Locale } from '@yggdrasil-forge/common'

/**
 * Configuración de i18n para unha árbore.
 *
 * Cada TreeDef pode declarar a súa configuración i18n. Se non se especifica,
 * o motor usa os defaults globais (DEFAULT_LOCALE='en', FALLBACK_LOCALE='en').
 *
 * @example
 * { defaultLocale: 'gl', fallbackLocale: 'en' }
 */
export interface I18nConfig {
  /** Locale activa por defecto cando se carga a árbore. */
  readonly defaultLocale: Locale
  /** Locale usada cando a defaultLocale non ten tradución dun string. */
  readonly fallbackLocale: Locale
  /**
   * Resolver custom para strings dinámicas (chaves que non son LocalizedString).
   * Permite integrar i18next, formatjs, ou outros sistemas externos.
   */
  readonly resolver?: (key: string, locale: Locale) => string
}
// ── FIN: I18n config types ──
