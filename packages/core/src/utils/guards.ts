// ── INICIO: type guards e utilidades pequenas ──
// Type guards e funcións utilitarias pequenas de uso transversal.

/**
 * Type guard: verifica se un valor é un obxecto plano (non array, non null,
 * non instancia de clase como Date/Map/Set).
 *
 * @example
 * isPlainObject({ a: 1 })       // true
 * isPlainObject([1, 2])         // false
 * isPlainObject(null)           // false
 * isPlainObject(new Date())     // false
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }
  if (Array.isArray(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

/**
 * Limita un número entre un mínimo e un máximo.
 *
 * @example
 * clamp(5, 0, 10)    // 5
 * clamp(-3, 0, 10)   // 0
 * clamp(15, 0, 10)   // 10
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}
// ── FIN: type guards e utilidades pequenas ──
