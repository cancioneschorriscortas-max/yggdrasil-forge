import { TreeEngine } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'
import type { JSX } from 'react'
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { curriculumDef } from './tree-def-curriculum.js'

interface Crumb {
  readonly engine: TreeEngine
  readonly label: string
}

function treeLabel(engine: TreeEngine): string {
  const def = engine.getTreeDef()
  const lbl = def.label
  return typeof lbl === 'string' ? lbl : (lbl.en ?? def.id)
}

export function App(): JSX.Element {
  // Engine raíz — créase unha soa vez.
  const rootEngine = useMemo(() => new TreeEngine(curriculumDef), [])

  // Pila de navegación (engine, etiqueta). A raíz queda sempre no índice 0.
  const [stack, setStack] = useState<readonly Crumb[]>(() => [
    { engine: rootEngine, label: treeLabel(rootEngine) },
  ])
  const current = stack[stack.length - 1].engine

  // Re-render cando muda o estado do engine ACTUAL (para que a lectura de
  // progreso e as portas reaccionen en vivo).
  useSyncExternalStore(
    useCallback((cb: () => void) => current.subscribe(cb), [current]),
    () => current.getSnapshot(),
    () => current.getServerSnapshot(),
  )

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = current.getTreeDef().nodes.find((n) => n.id === nodeId)
      if (node === undefined) return
      if (node.type === 'subtree_anchor' && node.subtreeId !== undefined) {
        const st = current.getNodeState(nodeId)?.state
        if (st === 'unlocked' || st === 'maxed') {
          const res = current.enterSubtree(node.subtreeId)
          if (res.ok) {
            const sub = res.value
            setStack((prev) => [...prev, { engine: sub, label: treeLabel(sub) }])
          }
          return
        }
      }
      // Lección, ou anchor aínda bloqueado → intentar desbloquear.
      void current.unlock(nodeId)
    },
    [current],
  )

  const goTo = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, index + 1))
  }, [])

  // Lectura de progreso da árbore actual.
  const def = current.getTreeDef()
  const states = current.getAllNodeStates()
  let unlocked = 0
  for (const n of def.nodes) {
    const s = states.get(n.id)?.state
    if (s === 'unlocked' || s === 'maxed') unlocked++
  }
  const total = def.nodes.length
  const percent = total === 0 ? 0 : Math.round((unlocked / total) * 100)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Yggdrasil Forge — Nested curriculum</h1>
      <p style={{ color: '#666', margin: '0 0 12px', fontSize: 14 }}>
        Click a lesson to complete it. Click a module to unlock it, then click again to enter. A
        module unlocks when its prerequisite module is 100% complete.
      </p>

      <nav style={{ marginBottom: 8, fontSize: 14 }}>
        {stack.map((crumb, i) => {
          const isLast = i === stack.length - 1
          return (
            <span key={crumb.engine.getTreeDef().id}>
              {i > 0 && <span style={{ color: '#999' }}> › </span>}
              <button
                type="button"
                onClick={() => goTo(i)}
                disabled={isLast}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 14,
                  cursor: isLast ? 'default' : 'pointer',
                  color: isLast ? '#111' : '#2563eb',
                  fontWeight: isLast ? 600 : 400,
                }}
              >
                {crumb.label}
              </button>
            </span>
          )
        })}
      </nav>

      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#333' }}>
        {treeLabel(current)}: {unlocked}/{total} — {percent}%
      </p>

      <div style={{ height: 520, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <SkillTree engine={current} onNodeClick={handleNodeClick} />
      </div>
    </div>
  )
}
