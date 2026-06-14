// ── INICIO: tests de TreeEngine hook integration (8.4.c) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { Plugin, TreeDef } from '../../src/types/index.js'

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes: [{ id: 'node-a', label: 'Node A', type: 'passive' }],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

function makeCostTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [
      { id: 'node-a', label: 'A', type: 'passive', cost: [{ resourceId: 'xp', amount: 10 }] },
      { id: 'node-b', label: 'B', type: 'passive', cost: [{ resourceId: 'xp', amount: 5 }] },
    ],
  })
}

function makeHookPlugin(id: string, installFn: Plugin['install']): Plugin {
  return {
    id,
    name: `Hook Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '1.0.0',
    install: installFn,
  }
}

describe('TreeEngine hook integration (8.4.c)', () => {
  // ── Backward-compat (CRÍTICOS) ──

  it('unlock() sen plugins: comportamento idéntico ao actual', async () => {
    const engine = new TreeEngine(makeCostTree())
    const result = await engine.unlock('node-a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeId).toBe('node-a')
    }
  })

  it('lock() sen plugins: comportamento idéntico', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('node-a')
    const result = await engine.lock('node-a')
    expect(result.ok).toBe(true)
  })

  it('respec() sen plugins: comportamento idéntico', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('node-a')
    const result = await engine.respec()
    expect(result.ok).toBe(true)
  })

  it('canUnlock() sen plugins: devolve defaultResult inchanged', () => {
    const engine = new TreeEngine(makeCostTree())
    const result = engine.canUnlock('node-a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })

  // ── beforeUnlock hooks ──

  it('beforeUnlock true → unlock procede normalmente', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeUnlock', () => true)
      }),
    )
    const result = await engine.unlock('node-a')
    expect(result.ok).toBe(true)
  })

  it('beforeUnlock false → unlock cancela con OPERATION_CANCELLED_BY_HOOK', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeUnlock', () => false)
      }),
    )
    const result = await engine.unlock('node-a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.OPERATION_CANCELLED_BY_HOOK)
    }
    // Cero state change (nodo nunca foi unlocked, sen entrada no state map):
    const nodeState = engine.getNodeState('node-a')
    expect(nodeState?.state ?? 'locked').toBe('locked')
  })

  it('beforeUnlock async (Promise<boolean>) awaited correctamente', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeUnlock', async () => true)
      }),
    )
    const result = await engine.unlock('node-a')
    expect(result.ok).toBe(true)
  })

  // ── afterUnlock hooks ──

  it('afterUnlock chamado tras unlock exitoso', async () => {
    const engine = new TreeEngine(makeCostTree())
    const afterCalled = vi.fn()
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('afterUnlock', () => {
          afterCalled()
        })
      }),
    )
    await engine.unlock('node-a')
    expect(afterCalled).toHaveBeenCalledOnce()
  })

  it('afterUnlock NON chamado se beforeUnlock cancelou', async () => {
    const engine = new TreeEngine(makeCostTree())
    const afterCalled = vi.fn()
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeUnlock', () => false)
        api.registerHook('afterUnlock', () => {
          afterCalled()
        })
      }),
    )
    await engine.unlock('node-a')
    expect(afterCalled).not.toHaveBeenCalled()
  })

  // ── lock hooks ──

  it('beforeLock false → cancela con operation=lock', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('node-a')
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeLock', () => false)
      }),
    )
    const result = await engine.lock('node-a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.OPERATION_CANCELLED_BY_HOOK)
    }
  })

  // ── respec hooks ──

  it('beforeRespec false → cancela; cero state change', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('node-a')
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeRespec', () => false)
      }),
    )
    const result = await engine.respec()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.OPERATION_CANCELLED_BY_HOOK)
    }
    // State inchanged:
    expect(engine.getNodeState('node-a')?.state).toBe('unlocked')
  })

  it('beforeRespec recibe nodeIdsToLock final (tras cascade)', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('node-a')
    const receivedIds = vi.fn()
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeRespec', (ids) => {
          receivedIds(ids)
          return true
        })
      }),
    )
    await engine.respec(['node-a'])
    expect(receivedIds).toHaveBeenCalledWith(expect.arrayContaining(['node-a']))
  })

  // ── computeUnlockability ──

  it('canUnlock con computeUnlockability hook modifica result', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('computeUnlockability', (_nodeId, prev) => ({
          ...prev,
          allowed: false,
        }))
      }),
    )
    const result = engine.canUnlock('node-a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(false)
    }
  })

  it('canUnlock con hook que devolve mesmo valor: result inchanged', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('computeUnlockability', (_nodeId, prev) => prev)
      }),
    )
    const result = engine.canUnlock('node-a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
  })

  it('canUnlock con NODE_NOT_FOUND: cero pasa polo hook', async () => {
    const engine = new TreeEngine(makeCostTree())
    const hookCalled = vi.fn()
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('computeUnlockability', (_nodeId, prev) => {
          hookCalled()
          return prev
        })
      }),
    )
    const result = engine.canUnlock('nonexistent')
    expect(result.ok).toBe(false)
    expect(hookCalled).not.toHaveBeenCalled()
  })

  // ── HookContext ──

  it('context recibido con locale + timestamp + metadata={}', async () => {
    const engine = new TreeEngine(makeCostTree())
    let receivedCtx: unknown = null
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeUnlock', (_nodeId, ctx) => {
          receivedCtx = ctx
          return true
        })
      }),
    )
    await engine.unlock('node-a')
    expect(receivedCtx).toEqual(
      expect.objectContaining({
        locale: 'gl',
        timestamp: expect.any(Number),
        metadata: {},
      }),
    )
  })

  it('context reutilizado entre runBefore e runAfter (mesmo timestamp)', async () => {
    const engine = new TreeEngine(makeCostTree())
    let beforeTs = 0
    let afterTs = 0
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeUnlock', (_nodeId, ctx) => {
          beforeTs = ctx.timestamp
          return true
        })
        api.registerHook('afterUnlock', (_nodeId, ctx) => {
          afterTs = ctx.timestamp
        })
      }),
    )
    await engine.unlock('node-a')
    expect(beforeTs).toBe(afterTs)
    expect(beforeTs).toBeGreaterThan(0)
  })

  // ── Edge cases ──

  it('respec con length=0: cero hooks chamados', async () => {
    const engine = new TreeEngine(makeCostTree())
    const hookCalled = vi.fn()
    await engine.registerPlugin(
      makeHookPlugin('p1', (_eng, api) => {
        api.registerHook('beforeRespec', () => {
          hookCalled()
          return true
        })
      }),
    )
    // Respec sen nodos unlocked → length=0:
    const result = await engine.respec()
    expect(result.ok).toBe(true)
    expect(hookCalled).not.toHaveBeenCalled()
  })
})
// ── FIN: tests de TreeEngine hook integration (8.4.c) ──
