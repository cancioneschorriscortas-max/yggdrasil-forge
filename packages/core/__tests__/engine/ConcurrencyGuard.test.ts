import { isYggdrasilError } from '@yggdrasil-forge/common'
// ── INICIO: tests de ConcurrencyGuard ──
import { describe, expect, it } from 'vitest'
import { ConcurrencyGuard } from '../../src/engine/index.js'

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
      expect(log).toEqual(['A-start', 'A-end', 'B-start', 'B-end', 'C-start', 'C-end'])
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
