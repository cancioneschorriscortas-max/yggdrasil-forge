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

    // Placeholders que se sobreescriben inmediatamente polo executor da Promise.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let resolveOp: (value: T) => void = (_v: T) => {
      /* sobreescrito polo executor */
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let rejectOp: (reason: unknown) => void = (_r: unknown) => {
      /* sobreescrito polo executor */
    }

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
