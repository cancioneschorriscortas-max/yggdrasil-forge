#!/usr/bin/env bash
set -e

# ── SUB-FASE 1.5: EventEmitter, ConcurrencyGuard, helpers ──

# Directorios
mkdir -p packages/core/src/utils
mkdir -p packages/core/src/engine
mkdir -p packages/core/__tests__/utils
mkdir -p packages/core/__tests__/engine

# ── 1. deepClone.ts ──
cat > packages/core/src/utils/deepClone.ts << 'ENDOFFILE'
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
 */
function deepCloneManual<T>(value: T): T {
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
ENDOFFILE

# ── 2. deepEqual.ts ──
cat > packages/core/src/utils/deepEqual.ts << 'ENDOFFILE'
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

  return aKeys.every(
    (key) => Object.hasOwn(bObj, key) && deepEqual(aObj[key], bObj[key]),
  )
}
// ── FIN: deepEqual ──
ENDOFFILE

# ── 3. generateId.ts ──
cat > packages/core/src/utils/generateId.ts << 'ENDOFFILE'
// ── INICIO: generateId ──
// Xerador de identificadores únicos para uso interno do motor.

/**
 * Contador monotónico interno para garantir unicidade aínda dentro
 * do mesmo milisegundo.
 */
let counter = 0

/**
 * Xera un identificador único.
 *
 * Formato: `{prefix}_{timestamp36}_{counter36}_{random36}`
 *
 * Non é criptográficamente seguro — é só para identificar entidades
 * internas (audit entries, snapshots, etc.) de forma única.
 *
 * @param prefix - Prefixo descriptivo (ex: 'audit', 'build', 'snapshot')
 *
 * @example
 * generateId('audit')  // 'audit_lm3k2p_0_4f9x'
 * generateId('build')  // 'build_lm3k2p_1_a82c'
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const count = (counter++).toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${timestamp}_${count}_${random}`
}

/**
 * Reinicia o contador interno. Só para uso en tests.
 */
export function resetIdCounter(): void {
  counter = 0
}
// ── FIN: generateId ──
ENDOFFILE

# ── 4. guards.ts ──
cat > packages/core/src/utils/guards.ts << 'ENDOFFILE'
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
ENDOFFILE

# ── 5. utils/index.ts ──
cat > packages/core/src/utils/index.ts << 'ENDOFFILE'
// ── INICIO: utils public API ──
// Utilidades internas de @yggdrasil-forge/core.
// Estas funcións son de uso interno; non forman parte da API pública estable.

export { deepClone } from './deepClone.js'
export { deepEqual } from './deepEqual.js'
export { generateId, resetIdCounter } from './generateId.js'
export { isPlainObject, clamp } from './guards.js'
// ── FIN: utils public API ──
ENDOFFILE

# ── 6. EventEmitter.ts ──
cat > packages/core/src/engine/EventEmitter.ts << 'ENDOFFILE'
// ── INICIO: EventEmitter ──
// Sistema de eventos tipado sobre o EventMap do motor.

import type { EventMap, EventName } from '../types/events.js'

/**
 * Función que cancela unha subscrición.
 */
export type Unsubscribe = () => void

/**
 * Emisor de eventos tipado.
 *
 * Todos os eventos e as súas sinaturas están definidos en EventMap.
 * Os métodos `on`, `once`, `emit` son type-safe respecto a ese mapa.
 *
 * Características:
 * - `on()` devolve unha función de unsubscribe (ergonómico)
 * - `off()` tamén dispoñible para casos con referencia gardada
 * - emit é síncrono; handlers execútanse en orde de rexistro
 * - un erro nun handler NON impide que os demais se executen
 * - `once()` para handlers de un só uso
 *
 * @example
 * const emitter = new EventEmitter()
 * const unsub = emitter.on('unlock', (nodeId, instance) => {
 *   console.info(`${nodeId} unlocked`)
 * })
 * emitter.emit('unlock', 'forno', someInstance)
 * unsub()  // cancela a subscrición
 */
export class EventEmitter {
  /**
   * Mapa de evento → conxunto de handlers rexistrados.
   * Úsase un array (non Set) para garantir orde de execución determinista.
   */
  private readonly listeners = new Map<EventName, Array<(...args: never[]) => void>>()

  /**
   * Handler opcional para erros lanzados dentro doutros handlers.
   * Se non se define, os erros silénciánse (pero non rompen o emit).
   */
  private errorHandler: ((error: unknown, event: EventName) => void) | undefined

  /**
   * Rexistra un handler para un evento.
   *
   * @returns Función que, ao chamarse, cancela esta subscrición.
   */
  on<K extends EventName>(event: K, handler: EventMap[K]): Unsubscribe {
    const handlers = this.listeners.get(event) ?? []
    handlers.push(handler as (...args: never[]) => void)
    this.listeners.set(event, handlers)

    return () => {
      this.off(event, handler)
    }
  }

  /**
   * Rexistra un handler que se executa unha soa vez e despois se elimina.
   *
   * @returns Función que cancela a subscrición antes de que se dispare.
   */
  once<K extends EventName>(event: K, handler: EventMap[K]): Unsubscribe {
    const wrapper = ((...args: Parameters<EventMap[K]>) => {
      this.off(event, wrapper as EventMap[K])
      ;(handler as (...a: Parameters<EventMap[K]>) => void)(...args)
    }) as EventMap[K]

    return this.on(event, wrapper)
  }

  /**
   * Elimina un handler concreto dun evento.
   *
   * Para que funcione, debe pasarse a MESMA referencia de función que se
   * pasou a `on()`. Se se usou unha función anónima inline, usar a Unsubscribe.
   */
  off<K extends EventName>(event: K, handler: EventMap[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers === undefined) {
      return
    }
    const index = handlers.indexOf(handler as (...args: never[]) => void)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
    if (handlers.length === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * Emite un evento, executando todos os handlers rexistrados en orde.
   *
   * Os erros lanzados por un handler captúranse e pásanse ao errorHandler
   * (se está definido); os demais handlers execútanse igualmente.
   */
  emit<K extends EventName>(event: K, ...args: Parameters<EventMap[K]>): void {
    const handlers = this.listeners.get(event)
    if (handlers === undefined || handlers.length === 0) {
      return
    }

    // Copia defensiva: un handler podería modificar a lista (off/on) durante o emit.
    const snapshot = [...handlers]

    for (const handler of snapshot) {
      try {
        ;(handler as (...a: Parameters<EventMap[K]>) => void)(...args)
      } catch (error) {
        if (this.errorHandler !== undefined) {
          this.errorHandler(error, event)
        }
      }
    }
  }

  /**
   * Define o handler de erros para handlers que lancen excepcións.
   */
  setErrorHandler(handler: (error: unknown, event: EventName) => void): void {
    this.errorHandler = handler
  }

  /**
   * Conta cantos handlers hai rexistrados para un evento.
   */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.length ?? 0
  }

  /**
   * Elimina todos os handlers dun evento, ou de todos os eventos se non
   * se especifica.
   */
  removeAllListeners(event?: EventName): void {
    if (event === undefined) {
      this.listeners.clear()
    } else {
      this.listeners.delete(event)
    }
  }
}
// ── FIN: EventEmitter ──
ENDOFFILE

# ── 7. ConcurrencyGuard.ts ──
cat > packages/core/src/engine/ConcurrencyGuard.ts << 'ENDOFFILE'
// ── INICIO: ConcurrencyGuard ──
// Serializa operacións async para evitar condicións de carreira.

import { ErrorCode, YggdrasilError } from '@yggdrasil-forge/common'

/**
 * Opcións de configuración do ConcurrencyGuard.
 */
export interface ConcurrencyGuardOptions {
  /**
   * Tempo máximo (ms) que unha operación pode estar en cola esperando
   * antes de rexeitarse. Se non se define, non hai límite.
   */
  readonly timeoutMs?: number
}

/**
 * Serializa operacións async: se chega unha operación mentres outra
 * está en curso, encólase e execútase cando a anterior remate.
 *
 * NON é re-entrante: unha operación que chame internamente a `runExclusive`
 * causaría deadlock. As operacións do motor están deseñadas para non aniñarse.
 *
 * @example
 * const guard = new ConcurrencyGuard()
 *
 * // Estas tres execútanse en serie, nunca solapadas:
 * await Promise.all([
 *   guard.runExclusive(() => unlockNode('a')),
 *   guard.runExclusive(() => unlockNode('b')),
 *   guard.runExclusive(() => unlockNode('c')),
 * ])
 */
export class ConcurrencyGuard {
  /**
   * Promesa da última operación encolada. As novas operacións encadéanse
   * a esta. Cando non hai nada en curso, é unha promesa xa resolta.
   */
  private tail: Promise<unknown> = Promise.resolve()

  /**
   * Número de operacións actualmente en cola ou en execución.
   */
  private pending = 0

  private readonly timeoutMs: number | undefined

  constructor(options?: ConcurrencyGuardOptions) {
    this.timeoutMs = options?.timeoutMs
  }

  /**
   * Executa unha función de forma exclusiva: espera a que terminen as
   * operacións previas, execútase, e libera a quenda para a seguinte.
   *
   * @param fn - Función async a executar exclusivamente
   * @returns O resultado da función
   * @throws YggdrasilError con código OPERATION_LOCKED se se supera o timeout
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    this.pending++

    // Encadea esta operación tras a anterior.
    const previous = this.tail

    // Creamos a promesa desta operación. resolveOp/rejectOp libéranse cando remata.
    let resolveOp: (value: T) => void = () => {}
    let rejectOp: (reason: unknown) => void = () => {}

    const operationPromise = new Promise<T>((resolve, reject) => {
      resolveOp = resolve
      rejectOp = reject
    })

    // A cola avanza cando esta operación remata (con éxito ou erro).
    this.tail = operationPromise.catch(() => {
      // Absorbe o erro para que a cola non se rompa; o erro xa se propaga
      // ao chamador vía operationPromise.
    })

    // Espera á operación anterior, despois executa a nosa.
    void previous.then(async () => {
      try {
        const result = await this.withTimeout(fn())
        resolveOp(result)
      } catch (error) {
        rejectOp(error)
      } finally {
        this.pending--
      }
    })

    return operationPromise
  }

  /**
   * Envolve unha promesa cun timeout opcional.
   */
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    if (this.timeoutMs === undefined) {
      return promise
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new YggdrasilError(
            ErrorCode.OPERATION_LOCKED,
            `Operation exceeded timeout of ${this.timeoutMs}ms`,
          ),
        )
      }, this.timeoutMs)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle)
      }
    }
  }

  /**
   * True se hai algunha operación en cola ou en execución.
   */
  isLocked(): boolean {
    return this.pending > 0
  }

  /**
   * Número de operacións en cola ou en execución.
   */
  pendingCount(): number {
    return this.pending
  }

  /**
   * Espera a que todas as operacións en cola rematen.
   */
  async drain(): Promise<void> {
    await this.tail
  }
}
// ── FIN: ConcurrencyGuard ──
ENDOFFILE

# ── 8. engine/index.ts ──
cat > packages/core/src/engine/index.ts << 'ENDOFFILE'
// ── INICIO: engine public API ──
// Exporta as pezas do motor.
// Por agora: EventEmitter, ConcurrencyGuard.
// Iranse engadindo TreeEngine, StateStore, etc. nas seguintes sub-fases.

export { EventEmitter, type Unsubscribe } from './EventEmitter.js'
export {
  ConcurrencyGuard,
  type ConcurrencyGuardOptions,
} from './ConcurrencyGuard.js'
// ── FIN: engine public API ──
ENDOFFILE

# ── 9. packages/core/src/index.ts (substitúe o contido) ──
cat > packages/core/src/index.ts << 'ENDOFFILE'
// ── INICIO: @yggdrasil-forge/core public API ──
// Motor principal de Yggdrasil Forge.

/**
 * Versión actual de @yggdrasil-forge/core.
 */
export const VERSION = '0.0.0'

// Tipos públicos
export * from './types/index.js'

// Pezas do motor (1.5+)
export * from './engine/index.js'
// ── FIN: @yggdrasil-forge/core public API ──
ENDOFFILE

# ── 10. Test: deepClone ──
cat > packages/core/__tests__/utils/deepClone.test.ts << 'ENDOFFILE'
// ── INICIO: tests de deepClone ──
import { describe, expect, it } from 'vitest'
import { deepClone } from '../../src/utils/index.js'

describe('deepClone', () => {
  it('clones primitives as-is', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBe(null)
    expect(deepClone(undefined)).toBe(undefined)
  })

  it('clones flat objects', () => {
    const original = { a: 1, b: 'two', c: true }
    const copy = deepClone(original)
    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
  })

  it('clones nested objects deeply', () => {
    const original = { a: { b: { c: 1 } } }
    const copy = deepClone(original)
    copy.a.b.c = 999
    expect(original.a.b.c).toBe(1)
  })

  it('clones arrays deeply', () => {
    const original = [1, [2, 3], [[4]]]
    const copy = deepClone(original)
    ;(copy[1] as number[]).push(999)
    expect((original[1] as number[]).length).toBe(2)
  })

  it('clones objects with array properties', () => {
    const original = { tags: ['a', 'b'], nested: { items: [1, 2] } }
    const copy = deepClone(original)
    copy.tags.push('c')
    copy.nested.items.push(3)
    expect(original.tags).toEqual(['a', 'b'])
    expect(original.nested.items).toEqual([1, 2])
  })

  it('clones Date objects', () => {
    const original = { created: new Date('2026-01-01') }
    const copy = deepClone(original)
    expect(copy.created.getTime()).toBe(original.created.getTime())
    expect(copy.created).not.toBe(original.created)
  })
})
// ── FIN: tests de deepClone ──
ENDOFFILE

# ── 11. Test: deepEqual ──
cat > packages/core/__tests__/utils/deepEqual.test.ts << 'ENDOFFILE'
// ── INICIO: tests de deepEqual ──
import { describe, expect, it } from 'vitest'
import { deepEqual } from '../../src/utils/index.js'

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
  })

  it('compares flat objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('compares nested objects', () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
  })

  it('compares arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
  })

  it('compares nested arrays and objects', () => {
    expect(deepEqual({ items: [{ x: 1 }] }, { items: [{ x: 1 }] })).toBe(true)
    expect(deepEqual({ items: [{ x: 1 }] }, { items: [{ x: 2 }] })).toBe(false)
  })

  it('distinguishes arrays from objects', () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
  })

  it('compares Date objects', () => {
    expect(deepEqual(new Date('2026-01-01'), new Date('2026-01-01'))).toBe(true)
    expect(deepEqual(new Date('2026-01-01'), new Date('2026-01-02'))).toBe(false)
  })

  it('returns true for same reference', () => {
    const obj = { a: 1 }
    expect(deepEqual(obj, obj)).toBe(true)
  })
})
// ── FIN: tests de deepEqual ──
ENDOFFILE

# ── 12. Test: generateId ──
cat > packages/core/__tests__/utils/generateId.test.ts << 'ENDOFFILE'
// ── INICIO: tests de generateId ──
import { beforeEach, describe, expect, it } from 'vitest'
import { generateId, resetIdCounter } from '../../src/utils/index.js'

describe('generateId', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  it('includes the prefix', () => {
    expect(generateId('audit')).toMatch(/^audit_/)
    expect(generateId('build')).toMatch(/^build_/)
  })

  it('generates unique ids', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId('test'))
    }
    expect(ids.size).toBe(1000)
  })

  it('generates ids with the expected structure', () => {
    const id = generateId('node')
    const parts = id.split('_')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('node')
  })

  it('resetIdCounter resets the internal counter', () => {
    const first = generateId('x')
    resetIdCounter()
    const afterReset = generateId('x')
    // O segundo segmento (counter) debe ser '0' tras reset
    expect(afterReset.split('_')[2]).toBe('0')
    expect(first.split('_')[2]).toBe('0') // tamén era 0 porque beforeEach resetea
  })
})
// ── FIN: tests de generateId ──
ENDOFFILE

# ── 13. Test: guards ──
cat > packages/core/__tests__/utils/guards.test.ts << 'ENDOFFILE'
// ── INICIO: tests de guards ──
import { describe, expect, it } from 'vitest'
import { clamp, isPlainObject } from '../../src/utils/index.js'

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
  })

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject([1, 2, 3])).toBe(false)
  })

  it('returns false for null and primitives', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject(42)).toBe(false)
    expect(isPlainObject('string')).toBe(false)
    expect(isPlainObject(true)).toBe(false)
  })

  it('returns false for class instances', () => {
    expect(isPlainObject(new Date())).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
    expect(isPlainObject(new Set())).toBe(false)
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when below range', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })

  it('returns max when above range', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('works with negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-15, -10, -1)).toBe(-10)
    expect(clamp(5, -10, -1)).toBe(-1)
  })
})
// ── FIN: tests de guards ──
ENDOFFILE

# ── 14. Test: EventEmitter ──
cat > packages/core/__tests__/engine/EventEmitter.test.ts << 'ENDOFFILE'
// ── INICIO: tests de EventEmitter ──
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from '../../src/engine/index.js'
import type { NodeInstance } from '../../src/types/index.js'

/** Helper: crea un NodeInstance mínimo para tests. */
function makeInstance(id: string): NodeInstance {
  return { id, state: 'unlocked', currentTier: 1 }
}

describe('EventEmitter', () => {
  describe('on / emit', () => {
    it('calls registered handler on emit', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('unlock', handler)
      const instance = makeInstance('forno')
      emitter.emit('unlock', 'forno', instance)
      expect(handler).toHaveBeenCalledWith('forno', instance)
    })

    it('calls multiple handlers in registration order', () => {
      const emitter = new EventEmitter()
      const calls: number[] = []
      emitter.on('unlock', () => calls.push(1))
      emitter.on('unlock', () => calls.push(2))
      emitter.on('unlock', () => calls.push(3))
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(calls).toEqual([1, 2, 3])
    })

    it('does nothing when emitting an event with no handlers', () => {
      const emitter = new EventEmitter()
      expect(() => emitter.emit('unlock', 'x', makeInstance('x'))).not.toThrow()
    })
  })

  describe('unsubscribe', () => {
    it('on returns a working unsubscribe function', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      const unsub = emitter.on('unlock', handler)
      unsub()
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('off removes a specific handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('unlock', handler)
      emitter.off('unlock', handler)
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('off only removes the targeted handler', () => {
      const emitter = new EventEmitter()
      const keep = vi.fn()
      const remove = vi.fn()
      emitter.on('unlock', keep)
      emitter.on('unlock', remove)
      emitter.off('unlock', remove)
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(keep).toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
    })
  })

  describe('once', () => {
    it('handler fires only once', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.once('unlock', handler)
      emitter.emit('unlock', 'a', makeInstance('a'))
      emitter.emit('unlock', 'b', makeInstance('b'))
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('a', makeInstance('a'))
    })

    it('once unsubscribe cancels before firing', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      const unsub = emitter.once('unlock', handler)
      unsub()
      emitter.emit('unlock', 'a', makeInstance('a'))
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('a throwing handler does not stop other handlers', () => {
      const emitter = new EventEmitter()
      const after = vi.fn()
      emitter.on('unlock', () => {
        throw new Error('handler boom')
      })
      emitter.on('unlock', after)
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(after).toHaveBeenCalled()
    })

    it('error handler receives the thrown error', () => {
      const emitter = new EventEmitter()
      const errorHandler = vi.fn()
      emitter.setErrorHandler(errorHandler)
      const boom = new Error('handler boom')
      emitter.on('unlock', () => {
        throw boom
      })
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(errorHandler).toHaveBeenCalledWith(boom, 'unlock')
    })
  })

  describe('listenerCount / removeAllListeners', () => {
    it('listenerCount returns the number of handlers', () => {
      const emitter = new EventEmitter()
      expect(emitter.listenerCount('unlock')).toBe(0)
      emitter.on('unlock', vi.fn())
      emitter.on('unlock', vi.fn())
      expect(emitter.listenerCount('unlock')).toBe(2)
    })

    it('removeAllListeners(event) clears one event', () => {
      const emitter = new EventEmitter()
      emitter.on('unlock', vi.fn())
      emitter.on('lock', vi.fn())
      emitter.removeAllListeners('unlock')
      expect(emitter.listenerCount('unlock')).toBe(0)
      expect(emitter.listenerCount('lock')).toBe(1)
    })

    it('removeAllListeners() clears everything', () => {
      const emitter = new EventEmitter()
      emitter.on('unlock', vi.fn())
      emitter.on('lock', vi.fn())
      emitter.removeAllListeners()
      expect(emitter.listenerCount('unlock')).toBe(0)
      expect(emitter.listenerCount('lock')).toBe(0)
    })
  })

  describe('mutation during emit', () => {
    it('handler that unsubscribes during emit does not break iteration', () => {
      const emitter = new EventEmitter()
      const calls: string[] = []
      const unsubSelf = emitter.on('unlock', () => {
        calls.push('first')
        unsubSelf()
      })
      emitter.on('unlock', () => {
        calls.push('second')
      })
      emitter.emit('unlock', 'x', makeInstance('x'))
      emitter.emit('unlock', 'x', makeInstance('x'))
      // Primeira emisión: first + second. Segunda: só second.
      expect(calls).toEqual(['first', 'second', 'second'])
    })
  })
})
// ── FIN: tests de EventEmitter ──
ENDOFFILE

# ── 15. Test: ConcurrencyGuard ──
cat > packages/core/__tests__/engine/ConcurrencyGuard.test.ts << 'ENDOFFILE'
// ── INICIO: tests de ConcurrencyGuard ──
import { describe, expect, it } from 'vitest'
import { ConcurrencyGuard } from '../../src/engine/index.js'
import { isYggdrasilError } from '@yggdrasil-forge/common'

/** Helper: promesa que resolve tras N ms. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('ConcurrencyGuard', () => {
  describe('runExclusive', () => {
    it('returns the result of the function', async () => {
      const guard = new ConcurrencyGuard()
      const result = await guard.runExclusive(async () => 42)
      expect(result).toBe(42)
    })

    it('serializes operations (no overlap)', async () => {
      const guard = new ConcurrencyGuard()
      const log: string[] = []

      const op = (label: string) => async () => {
        log.push(`${label}-start`)
        await delay(10)
        log.push(`${label}-end`)
        return label
      }

      await Promise.all([
        guard.runExclusive(op('A')),
        guard.runExclusive(op('B')),
        guard.runExclusive(op('C')),
      ])

      // Cada operación debe rematar antes de que empece a seguinte.
      expect(log).toEqual([
        'A-start',
        'A-end',
        'B-start',
        'B-end',
        'C-start',
        'C-end',
      ])
    })

    it('preserves order of results', async () => {
      const guard = new ConcurrencyGuard()
      const results = await Promise.all([
        guard.runExclusive(async () => {
          await delay(30)
          return 'first'
        }),
        guard.runExclusive(async () => {
          await delay(10)
          return 'second'
        }),
      ])
      expect(results).toEqual(['first', 'second'])
    })

    it('propagates errors to the caller', async () => {
      const guard = new ConcurrencyGuard()
      await expect(
        guard.runExclusive(async () => {
          throw new Error('operation failed')
        }),
      ).rejects.toThrow('operation failed')
    })

    it('a failed operation does not break the queue', async () => {
      const guard = new ConcurrencyGuard()
      const results: string[] = []

      const failing = guard.runExclusive(async () => {
        throw new Error('boom')
      })
      const succeeding = guard.runExclusive(async () => {
        results.push('ran after failure')
        return 'ok'
      })

      await expect(failing).rejects.toThrow('boom')
      await expect(succeeding).resolves.toBe('ok')
      expect(results).toEqual(['ran after failure'])
    })
  })

  describe('isLocked / pendingCount', () => {
    it('isLocked is false initially', () => {
      const guard = new ConcurrencyGuard()
      expect(guard.isLocked()).toBe(false)
    })

    it('isLocked is true while an operation runs', async () => {
      const guard = new ConcurrencyGuard()
      const op = guard.runExclusive(async () => {
        await delay(20)
      })
      expect(guard.isLocked()).toBe(true)
      await op
      expect(guard.isLocked()).toBe(false)
    })

    it('pendingCount reflects queued operations', async () => {
      const guard = new ConcurrencyGuard()
      const ops = [
        guard.runExclusive(() => delay(10)),
        guard.runExclusive(() => delay(10)),
        guard.runExclusive(() => delay(10)),
      ]
      expect(guard.pendingCount()).toBe(3)
      await Promise.all(ops)
      expect(guard.pendingCount()).toBe(0)
    })
  })

  describe('drain', () => {
    it('drain waits for all queued operations', async () => {
      const guard = new ConcurrencyGuard()
      const log: string[] = []
      void guard.runExclusive(async () => {
        await delay(10)
        log.push('done')
      })
      await guard.drain()
      expect(log).toEqual(['done'])
    })
  })

  describe('timeout', () => {
    it('rejects operations that exceed the timeout', async () => {
      const guard = new ConcurrencyGuard({ timeoutMs: 20 })
      await expect(
        guard.runExclusive(async () => {
          await delay(100)
        }),
      ).rejects.toThrow()
    })

    it('timeout error is a YggdrasilError with OPERATION_LOCKED', async () => {
      const guard = new ConcurrencyGuard({ timeoutMs: 20 })
      try {
        await guard.runExclusive(async () => {
          await delay(100)
        })
        expect.fail('should have thrown')
      } catch (error) {
        expect(isYggdrasilError(error)).toBe(true)
        if (isYggdrasilError(error)) {
          expect(error.code).toBe('YGG_C001')
        }
      }
    })

    it('operations within timeout succeed', async () => {
      const guard = new ConcurrencyGuard({ timeoutMs: 100 })
      const result = await guard.runExclusive(async () => {
        await delay(10)
        return 'ok'
      })
      expect(result).toBe('ok')
    })
  })
})
// ── FIN: tests de ConcurrencyGuard ──
ENDOFFILE

echo ""
echo "✅ Todos os ficheiros creados. Continúa co paso 2 (verificación)."
