// ── INICIO: i18n helpers ──
// Tipos e funcións para resolver strings localizadas.

import { FALLBACK_LOCALE, type Locale } from './locales.js'

/**
 * Representa un texto localizable.
 *
 * Pode ser:
 * - Un string simple (sen localización): "Forno e masas"
 * - Un obxecto con traducións por locale: { gl: "Forno", es: "Horno", en: "Oven" }
 *
 * O resolver intenta na orde:
 * 1. A locale solicitada
 * 2. A locale de fallback
 * 3. Calquera locale disponible (primeira)
 * 4. String baleiro
 */
export type LocalizedString = string | Record<string, string>

/**
 * Resolve un LocalizedString á string final para mostrar.
 *
 * @param value - O valor a resolver (string ou obxecto de traducións)
 * @param locale - A locale activa
 * @param fallback - Locale a usar se a activa non ten tradución (por defecto: 'en')
 * @returns A string traducida, ou string baleiro se non hai nada disponible
 *
 * @example
 * resolveLocalized('Hola', 'gl')                                  // 'Hola'
 * resolveLocalized({ gl: 'Ola', es: 'Hola', en: 'Hello' }, 'gl')  // 'Ola'
 * resolveLocalized({ es: 'Hola', en: 'Hello' }, 'gl')             // 'Hello' (fallback)
 * resolveLocalized({ es: 'Hola' }, 'gl', 'es')                    // 'Hola'
 */
export function resolveLocalized(
  value: LocalizedString,
  locale: Locale,
  fallback: Locale = FALLBACK_LOCALE,
): string {
  if (typeof value === 'string') {
    return value
  }

  if (value[locale] !== undefined) {
    return value[locale]
  }

  if (value[fallback] !== undefined) {
    return value[fallback]
  }

  const firstAvailable = Object.values(value)[0]
  return firstAvailable ?? ''
}

/**
 * Substitúe variables `{nome}` nunha string con valores dun obxecto.
 *
 * @example
 * interpolate('Hola, {name}!', { name: 'Mundo' })  // 'Hola, Mundo!'
 * interpolate('Tes {n} puntos', { n: 5 })          // 'Tes 5 puntos'
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in values) {
      return String(values[key])
    }
    return match
  })
}
// ── FIN: i18n helpers ──
