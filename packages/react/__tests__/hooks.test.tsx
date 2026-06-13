import { act, render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import type { NodeInstance } from '@yggdrasil-forge/core'
// ── INICIO: tests hooks ──
import { describe, expect, it } from 'vitest'
import { useNodeSelector } from '../src/hooks/useNodeSelector.js'
import { useNodeState } from '../src/hooks/useNodeState.js'
import { useSkillTree } from '../src/hooks/useSkillTree.js'
import { useStat } from '../src/hooks/useStat.js'

// ── Helpers ──

function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
    ...overrides,
  }
}

// ── Bloque 1: useSkillTree ──

describe('useSkillTree', () => {
  it('devolve un snapshot con forma TreeState', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    function Comp() {
      const state = useSkillTree(engine)
      return <span data-testid="ust-shape">{typeof state.nodes === 'object' ? 'yes' : 'no'}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('ust-shape').textContent).toBe('yes')
  })

  it('re-render tras engine.unlock: nodo aparece no state', async () => {
    const engine = new TreeEngine(
      makeMinimalTreeDef({
        nodes: [{ id: 'root', type: 'small', label: 'Root' }],
        edges: [],
      }),
    )
    function Comp() {
      const state = useSkillTree(engine)
      return <span data-testid="ust-node">{state.nodes.root?.state ?? 'absent'}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('ust-node').textContent).toBe('absent')
    await act(async () => {
      await engine.unlock('root')
    })
    expect(['unlocked', 'maxed']).toContain(getByTestId('ust-node').textContent)
  })
})

// ── Bloque 2: useNodeState ──

describe('useNodeState', () => {
  it('devolve null para nodeId inexistente', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    function Comp() {
      const instance = useNodeState(engine, 'nonexistent')
      return <span data-testid="uns-null">{instance === null ? 'null' : 'found'}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('uns-null').textContent).toBe('null')
  })

  it('tras unlock, devolve NodeInstance do nodo', async () => {
    const engine = new TreeEngine(
      makeMinimalTreeDef({
        nodes: [{ id: 'solo', type: 'small', label: 'Solo' }],
        edges: [],
      }),
    )
    function Comp() {
      const instance = useNodeState(engine, 'solo')
      return <span data-testid="uns-inst">{instance?.state ?? 'null'}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('uns-inst').textContent).toBe('null')
    await act(async () => {
      await engine.unlock('solo')
    })
    expect(['unlocked', 'maxed']).toContain(getByTestId('uns-inst').textContent)
  })
})

// ── Bloque 3: useNodeSelector ──

describe('useNodeSelector', () => {
  it('aplica selector e devolve T', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    const selectState = (n: NodeInstance | null) => n?.state ?? 'absent'
    function Comp() {
      const s = useNodeSelector(engine, 'a', selectState)
      return <span data-testid="unsel-val">{s}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('unsel-val').textContent).toBe('absent')
  })

  it('selector estable non causa loops', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    const selectTier = (n: NodeInstance | null) => n?.currentTier ?? 0
    let renderCount = 0
    function Comp() {
      renderCount++
      const tier = useNodeSelector(engine, 'a', selectTier)
      return <span data-testid="unsel-tier">{tier}</span>
    }
    render(<Comp />)
    expect(renderCount).toBeLessThanOrEqual(3)
  })

  it('re-render tras cambio no nodo seleccionado', async () => {
    const engine = new TreeEngine(
      makeMinimalTreeDef({
        nodes: [{ id: 'x', type: 'small', label: 'X' }],
        edges: [],
      }),
    )
    const selectState = (n: NodeInstance | null) => n?.state ?? 'absent'
    function Comp() {
      const s = useNodeSelector(engine, 'x', selectState)
      return <span data-testid="unsel-chg">{s}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('unsel-chg').textContent).toBe('absent')
    await act(async () => {
      await engine.unlock('x')
    })
    expect(['unlocked', 'maxed']).toContain(getByTestId('unsel-chg').textContent)
  })
})

// ── Bloque 4: useStat ──

describe('useStat', () => {
  it('devolve number para statId non declarado', () => {
    const engine = new TreeEngine(makeMinimalTreeDef())
    function Comp() {
      const val = useStat(engine, 'doesNotExist')
      return <span data-testid="usta-type">{typeof val}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('usta-type').textContent).toBe('number')
  })

  it('valor mantén tipo number tras operación no engine', async () => {
    const engine = new TreeEngine(
      makeMinimalTreeDef({
        nodes: [{ id: 'n', type: 'small', label: 'N' }],
        edges: [],
      }),
    )
    function Comp() {
      const val = useStat(engine, 'anyStat')
      return <span data-testid="usta-post">{typeof val}</span>
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('usta-post').textContent).toBe('number')
    await act(async () => {
      await engine.unlock('n')
    })
    // Tras operación no engine, useStat segue devolvendo number
    expect(getByTestId('usta-post').textContent).toBe('number')
  })
})

// ── Bloque 5: Integración cross-hook ──

describe('hooks — integración cross-hook', () => {
  it('múltiples hooks no mesmo compoñente reactivos', async () => {
    const engine = new TreeEngine(
      makeMinimalTreeDef({
        nodes: [{ id: 'n1', type: 'small', label: 'N1' }],
        edges: [],
      }),
    )
    function Comp() {
      const state = useSkillTree(engine)
      const node = useNodeState(engine, 'n1')
      const stat = useStat(engine, 'x')
      return (
        <div>
          <span data-testid="xh-nodes">{typeof state.nodes}</span>
          <span data-testid="xh-ns">{node?.state ?? 'null'}</span>
          <span data-testid="xh-stat">{typeof stat}</span>
        </div>
      )
    }
    const { getByTestId } = render(<Comp />)
    expect(getByTestId('xh-nodes').textContent).toBe('object')
    expect(getByTestId('xh-ns').textContent).toBe('null')
    expect(getByTestId('xh-stat').textContent).toBe('number')
    await act(async () => {
      await engine.unlock('n1')
    })
    expect(['unlocked', 'maxed']).toContain(getByTestId('xh-ns').textContent)
  })
})
// ── FIN: tests hooks ──
