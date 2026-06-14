// ── INICIO: tests de HookRunner ──
import { describe, expect, it, vi } from 'vitest'
import { HookRunner } from '../../src/plugins/HookRunner.js'
import type { HookContext, UnlockCheck } from '../../src/types/index.js'

function makeCtx(): HookContext {
  return { locale: 'gl', timestamp: 0, metadata: {} }
}

describe('HookRunner', () => {
  // ── Constructor ──

  it('constructor sen opts: cero throw', () => {
    const runner = new HookRunner()
    expect(runner).toBeDefined()
  })

  it('constructor con onError: callback gardado', async () => {
    const onError = vi.fn()
    const runner = new HookRunner({ onError })
    runner.register('beforeUnlock', 'p1', () => {
      throw new Error('boom')
    })
    await runner.runBeforeUnlock('n1', makeCtx())
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith('p1', expect.any(Error))
  })

  // ── Before runners ──

  it('runBeforeUnlock con cero handlers: devolve true', async () => {
    const runner = new HookRunner()
    expect(await runner.runBeforeUnlock('n1', makeCtx())).toBe(true)
  })

  it('runBeforeUnlock con handler que devolve true: devolve true', async () => {
    const runner = new HookRunner()
    runner.register('beforeUnlock', 'p1', () => true)
    expect(await runner.runBeforeUnlock('n1', makeCtx())).toBe(true)
  })

  it('runBeforeUnlock con handler que devolve false: devolve false', async () => {
    const runner = new HookRunner()
    runner.register('beforeUnlock', 'p1', () => false)
    expect(await runner.runBeforeUnlock('n1', makeCtx())).toBe(false)
  })

  it('runBeforeUnlock cero short-circuit: tódolos handlers executan', async () => {
    const runner = new HookRunner()
    const h1 = vi.fn(() => false)
    const h2 = vi.fn(() => true)
    runner.register('beforeUnlock', 'p1', h1)
    runner.register('beforeUnlock', 'p2', h2)
    const result = await runner.runBeforeUnlock('n1', makeCtx())
    expect(result).toBe(false)
    expect(h1).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('runBeforeUnlock con handler async (Promise<boolean>)', async () => {
    const runner = new HookRunner()
    runner.register('beforeUnlock', 'p1', async () => true)
    expect(await runner.runBeforeUnlock('n1', makeCtx())).toBe(true)
  })

  it('runBeforeRespec con readonly string[] args', async () => {
    const runner = new HookRunner()
    const handler = vi.fn(() => true)
    runner.register('beforeRespec', 'p1', handler)
    await runner.runBeforeRespec(['a', 'b'], makeCtx())
    expect(handler).toHaveBeenCalledWith(['a', 'b'], expect.any(Object))
  })

  it('runBeforeLock funciona correctamente', async () => {
    const runner = new HookRunner()
    runner.register('beforeLock', 'p1', () => false)
    expect(await runner.runBeforeLock('n1', makeCtx())).toBe(false)
  })

  it('runBeforeLock con handler que devolve true: devolve true', async () => {
    const runner = new HookRunner()
    runner.register('beforeLock', 'p1', () => true)
    expect(await runner.runBeforeLock('n1', makeCtx())).toBe(true)
  })

  it('runBeforeRespec con handler que devolve false: devolve false', async () => {
    const runner = new HookRunner()
    runner.register('beforeRespec', 'p1', () => false)
    expect(await runner.runBeforeRespec(['a'], makeCtx())).toBe(false)
  })

  // ── After runners ──

  it('runAfterUnlock con múltiples handlers: todos executan en orde', async () => {
    const runner = new HookRunner()
    const order: number[] = []
    runner.register('afterUnlock', 'p1', () => {
      order.push(1)
    })
    runner.register('afterUnlock', 'p2', () => {
      order.push(2)
    })
    await runner.runAfterUnlock('n1', makeCtx())
    expect(order).toEqual([1, 2])
  })

  it('runAfterUnlock con handler async', async () => {
    const runner = new HookRunner()
    const called = vi.fn()
    runner.register('afterUnlock', 'p1', async () => {
      called()
    })
    await runner.runAfterUnlock('n1', makeCtx())
    expect(called).toHaveBeenCalledOnce()
  })

  it('runAfterLock funciona correctamente', async () => {
    const runner = new HookRunner()
    const called = vi.fn()
    runner.register('afterLock', 'p1', () => {
      called()
    })
    await runner.runAfterLock('n1', makeCtx())
    expect(called).toHaveBeenCalledOnce()
  })

  it('runAfterRespec funciona correctamente', async () => {
    const runner = new HookRunner()
    const called = vi.fn()
    runner.register('afterRespec', 'p1', () => {
      called()
    })
    await runner.runAfterRespec(['a'], makeCtx())
    expect(called).toHaveBeenCalledOnce()
  })

  // ── Compute runners ──

  it('runComputeUnlockability chain pattern', () => {
    const runner = new HookRunner()
    const base: UnlockCheck = { allowed: true }
    runner.register('computeUnlockability', 'p1', (_nodeId, prev) => ({
      ...prev,
      allowed: false,
    }))
    runner.register('computeUnlockability', 'p2', (_nodeId, prev) => ({
      ...prev,
      reason: 'blocked by p2',
    }))
    const result = runner.runComputeUnlockability('n1', base)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('blocked by p2')
  })

  it('runComputeCost chain pattern', () => {
    const runner = new HookRunner()
    runner.register('computeCost', 'p1', (_nodeId, costs) => [
      ...costs,
      { resourceId: 'extra', amount: 5 },
    ])
    const result = runner.runComputeCost('n1', [{ resourceId: 'gold', amount: 10 }])
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({ resourceId: 'extra', amount: 5 })
  })

  // ── Error handling ──

  it('runBeforeUnlock con handler que lanza: onError chamado, continúa', async () => {
    const onError = vi.fn()
    const runner = new HookRunner({ onError })
    const h1 = vi.fn(() => {
      throw new Error('crash')
    })
    const h2 = vi.fn(() => true)
    runner.register('beforeUnlock', 'p1', h1)
    runner.register('beforeUnlock', 'p2', h2)
    const result = await runner.runBeforeUnlock('n1', makeCtx())
    expect(result).toBe(true)
    expect(onError).toHaveBeenCalledWith('p1', expect.any(Error))
    expect(h2).toHaveBeenCalledOnce()
  })

  it('runAfterLock con handler que lanza: onError chamado, continúa', async () => {
    const onError = vi.fn()
    const runner = new HookRunner({ onError })
    runner.register('afterLock', 'p1', () => {
      throw new Error('crash')
    })
    const h2 = vi.fn()
    runner.register('afterLock', 'p2', h2)
    await runner.runAfterLock('n1', makeCtx())
    expect(onError).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('runComputeCost con handler que lanza: mantén último valor', () => {
    const onError = vi.fn()
    const runner = new HookRunner({ onError })
    runner.register('computeCost', 'p1', () => {
      throw new Error('boom')
    })
    const result = runner.runComputeCost('n1', [{ resourceId: 'gold', amount: 10 }])
    expect(result).toEqual([{ resourceId: 'gold', amount: 10 }])
    expect(onError).toHaveBeenCalledOnce()
  })

  it('runComputeUnlockability con handler que lanza: mantén último valor', () => {
    const onError = vi.fn()
    const runner = new HookRunner({ onError })
    const base: UnlockCheck = { allowed: true }
    runner.register('computeUnlockability', 'p1', () => {
      throw new Error('boom')
    })
    const result = runner.runComputeUnlockability('n1', base)
    expect(result.allowed).toBe(true)
    expect(onError).toHaveBeenCalledOnce()
  })

  // ── Unregister all for plugin ──

  it('unregisterAllForPlugin borra só handlers do pluginId', async () => {
    const runner = new HookRunner()
    runner.register('beforeUnlock', 'pA', () => false)
    runner.register('beforeUnlock', 'pA', () => false)
    runner.register('beforeUnlock', 'pB', () => true)
    runner.unregisterAllForPlugin('pA')
    const result = await runner.runBeforeUnlock('n1', makeCtx())
    expect(result).toBe(true)
  })
})
// ── FIN: tests de HookRunner ──
