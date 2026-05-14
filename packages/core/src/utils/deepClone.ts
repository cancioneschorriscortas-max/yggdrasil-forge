// ── INICIO: deepClone ──
// Clon profundo de valores. Usa structuredClone se está dispoñible,
// con fallback manual para entornos antigos ou valores non clonables.

/**
 * Crea un clon profundo dun valor.
 *
 * Usa `structuredClone` nativo cando está dispoñible (Node 17+, browsers modernos).
 * Para valores que structuredClone non soporta (funcións, símbolos), eses campos
 * pérdense — comportamento esperado para datos serializables.
 *
 * @example
 * const original = { a: 1, nested: { b: [1, 2, 3] } }
 * const copy = deepClone(original)
 * copy.nested.b.push(4)  // non afecta a original
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return deepCloneManual(value)
}

/**
 * Fallback manual de clonado profundo para entornos sen structuredClone.
 * Exportada para poder ser testada directamente.
 */
export function deepCloneManual<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepCloneManual(item)) as T
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T
  }

  if (value instanceof Map) {
    const cloned = new Map()
    for (const [k, v] of value.entries()) {
      cloned.set(deepCloneManual(k), deepCloneManual(v))
    }
    return cloned as T
  }

  if (value instanceof Set) {
    const cloned = new Set()
    for (const item of value.values()) {
      cloned.add(deepCloneManual(item))
    }
    return cloned as T
  }

  const cloned: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    cloned[key] = deepCloneManual((value as Record<string, unknown>)[key])
  }
  return cloned as T
}
// ── FIN: deepClone ──
