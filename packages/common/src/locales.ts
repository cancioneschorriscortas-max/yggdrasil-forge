// ── INICIO: locales soportadas ──
// Definición das locales que o motor recoñece oficialmente.
// Outras locales poden ser usadas via custom resolvers, pero estas
// son as que teñen mensaxes built-in.

/**
 * Tipo de locale: ISO 639-1 ou extendido (gl-ES, en-US, etc.).
 */
export type Locale = string

/**
 * Locales con tradución oficial integrada no proxecto.
 */
export const SUPPORTED_LOCALES = ['gl', 'es', 'en'] as const

/**
 * Tipo derivado das locales soportadas (gl | es | en).
 */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Locale por defecto cando non se especifica outra.
 * Inglés é o estándar internacional para librarías npm.
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en'

/**
 * Locale de fallback cando a locale solicitada non ten tradución.
 * Sempre é inglés porque ten cobertura completa garantida.
 */
export const FALLBACK_LOCALE: SupportedLocale = 'en'

/**
 * Verifica se unha locale dada é unha das soportadas oficialmente.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}
// ── FIN: locales soportadas ──
