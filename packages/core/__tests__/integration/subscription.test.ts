// ── INICIO: integración — subscrición + selectores (1.18) ──
// Cunha secuencia real de mutacións, verifica que:
// - subscribeWithSelector notifica só cando o valor seleccionado cambia.
// - O `previous` recibido reflicte o estado xusto anterior.
// - Mutacións non relacionadas non disparan notificación (selectividade).

import { describe, expect, it, vi } from 'vitest'
import { TreeEngine, createSelector, shallowEqual } from '../../src/engine/index.js'
import type { NodeInstance, TreeState } from '../../src/types/index.js'
import { makeRichTreeDef } from './fixtures.js'

describe('integración — subscrición selectiva', () => {
  it('selector sobre budget.xp notifica só cando cambia', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const listener = vi.fn<(curr: number, prev: number) => void>()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp ?? 0, listener)

    // root non ten custo nin afecta a xp → non notifica.
    await engine.unlock('root')
    expect(listener).not.toHaveBeenCalled()

    // a custa 5xp → notifica unha vez con (45, 50).
    await engine.unlock('a')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(45, 50)

    // c custa 10xp → notifica con (35, 45).
    await engine.unlock('c')
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith(35, 45)

    unsub()
  })

  it('createSelector + shallowEqual: lista de nodos unlocked notifica só cando cambia o conxunto', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const selectUnlocked = createSelector(
      (s: TreeState) => s.nodes,
      (nodes) =>
        Object.values(nodes)
          .filter((n: NodeInstance) => n.state === 'unlocked' || n.state === 'maxed')
          .map((n) => n.id)
          .sort(),
    )

    const listener = vi.fn<(curr: readonly string[], prev: readonly string[]) => void>()
    const unsub = engine.subscribeWithSelector(selectUnlocked, listener, {
      equalityFn: shallowEqual,
    })

    await engine.unlock('root')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(['root'], [])

    await engine.unlock('a')
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith(['a', 'root'], ['root'])

    // Lock de 'a' devolve recursos pero tamén cambia o conxunto unlocked.
    await engine.lock('a')
    expect(listener).toHaveBeenCalledTimes(3)
    expect(listener).toHaveBeenLastCalledWith(['root'], ['a', 'root'])

    unsub()
  })

  it('fireImmediately=true: chama listener con (current, current) ao subscribirse', () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const listener = vi.fn<(curr: number, prev: number) => void>()
    const unsub = engine.subscribeWithSelector((s) => s.budget.resources.xp ?? 0, listener, {
      fireImmediately: true,
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(50, 50)
    unsub()
  })

  it('select aplica o selector ao snapshot actual sen subscribir', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    expect(engine.select((s) => s.budget.resources.xp)).toBe(50)
    await engine.unlock('root')
    await engine.unlock('a')
    expect(engine.select((s) => s.budget.resources.xp)).toBe(45)
  })

  it('subscribe global: chámase ao cambiar o estado, non se chama tras unsub', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const listener = vi.fn()
    const unsub = engine.subscribe(listener)
    await engine.unlock('root')
    expect(listener).toHaveBeenCalled()
    const calls = listener.mock.calls.length
    unsub()
    await engine.unlock('a')
    expect(listener.mock.calls.length).toBe(calls)
  })
})
// ── FIN: integración — subscrición + selectores (1.18) ──
