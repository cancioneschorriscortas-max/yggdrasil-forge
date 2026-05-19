// ── INICIO: selectors ──
// Factoría de selectors memoizados estilo reselect (caché last-args).
// Utilidade pura: NON é método de instancia de TreeEngine.

import type { Selector } from '../types/index.js'

/**
 * Compara dous valores por igualdade superficial (shallow).
 *
 * - Primitivas / referencias idénticas: `Object.is`.
 * - Obxectos planos / arrays: mesma cantidade de claves e cada valor
 *   igual por `Object.is` (un só nivel, NON recursivo).
 *
 * Helper puro exportado para uso opcional como `equalityFn` en
 * `subscribeWithSelector`. NON é a igualdade por defecto (segue sendo
 * `Object.is`); é responsabilidade do consumidor optar por el.
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true
  }
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false
  }
  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)
  if (keysA.length !== keysB.length) {
    return false
  }
  for (const key of keysA) {
    if (!Object.hasOwn(b as Record<string, unknown>, key)) {
      return false
    }
    const valA = (a as Record<string, unknown>)[key]
    const valB = (b as Record<string, unknown>)[key]
    if (!Object.is(valA, valB)) {
      return false
    }
  }
  return true
}

/**
 * Crea un selector memoizado a partir de N selectors de entrada e unha
 * función combinadora.
 *
 * Memoización **last-args** (caché de tamaño 1, estilo reselect clásico):
 * se TODAS as entradas son referencialmente iguais (`Object.is`) respecto
 * á última invocación, devólvese o resultado cacheado sen volver a
 * executar o combinador. Calquera entrada distinta recalcula e refresca
 * a caché.
 *
 * Tipado con sobrecargas para 1–3 selectors de entrada; cero `any`.
 *
 * @example
 * const selectUnlockedNodes = createSelector(
 *   (state) => state.nodes,
 *   (nodes) => Object.entries(nodes).filter(([, n]) => n.state === 'unlocked'),
 * )
 */
export function createSelector<S1, R>(input1: Selector<S1>, combiner: (s1: S1) => R): Selector<R>
export function createSelector<S1, S2, R>(
  input1: Selector<S1>,
  input2: Selector<S2>,
  combiner: (s1: S1, s2: S2) => R,
): Selector<R>
export function createSelector<S1, S2, S3, R>(
  input1: Selector<S1>,
  input2: Selector<S2>,
  input3: Selector<S3>,
  combiner: (s1: S1, s2: S2, s3: S3) => R,
): Selector<R>
export function createSelector<R>(
  ...args: readonly [
    ...inputs: ReadonlyArray<Selector<unknown>>,
    combiner: (...values: readonly unknown[]) => R,
  ]
): Selector<R> {
  // O último argumento é sempre o combinador; o resto, selectors de entrada.
  const inputs = args.slice(0, -1) as ReadonlyArray<Selector<unknown>>
  const combiner = args[args.length - 1] as (...values: readonly unknown[]) => R

  // Caché last-args: entradas previas + resultado previo.
  let lastInputValues: readonly unknown[] | undefined
  let lastResult: R
  let hasResult = false

  return (state) => {
    const inputValues = inputs.map((input) => input(state))

    // ── Comprobación de igualdade referencial de TODAS as entradas ──
    let allEqual = hasResult && lastInputValues !== undefined
    if (allEqual && lastInputValues !== undefined) {
      for (let i = 0; i < inputValues.length; i++) {
        if (!Object.is(inputValues[i], lastInputValues[i])) {
          allEqual = false
          break
        }
      }
    }

    if (allEqual) {
      return lastResult
    }

    lastInputValues = inputValues
    lastResult = combiner(...inputValues)
    hasResult = true
    return lastResult
  }
}
// ── FIN: selectors ──
