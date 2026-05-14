// ── INICIO: deepEqual ──
// Comparación profunda de igualdade estrutural entre dous valores.

/**
 * Compara dous valores en profundidade.
 *
 * Considera iguais:
 * - Primitivos co mesmo valor
 * - Arrays coa mesma lonxitude e elementos iguais (en orde)
 * - Obxectos coas mesmas chaves e valores iguais
 * - Datas co mesmo timestamp
 *
 * NON considera iguais funcións (compáranse por referencia).
 *
 * @example
 * deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })  // true
 * deepEqual({ a: 1 }, { a: 2 })                         // false
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }

  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b
  }

  if (typeof a !== typeof b) {
    return false
  }

  if (typeof a !== 'object') {
    return a === b
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return false
  }

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) {
    return false
  }

  return aKeys.every((key) => Object.hasOwn(bObj, key) && deepEqual(aObj[key], bObj[key]))
}
// ── FIN: deepEqual ──
