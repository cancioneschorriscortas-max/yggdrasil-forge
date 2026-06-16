import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react/headless'
import { ThemeProvider } from '@yggdrasil-forge/react'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { useCallback, useEffect, useState } from 'react'
import { dragonborn } from './theme.js'
import { longLabels, rpgTreeDef } from './tree-def.js'

export function App(): JSX.Element {
  const [engine] = useState(() => {
    const storage = new MemoryStorage()
    return new TreeEngine(rpgTreeDef, { storage })
  })

  const [unlockedCount, setUnlockedCount] = useState(0)
  const [lastAction, setLastAction] = useState<string>('')
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Subscribe to engine changes:
  useEffect(() => {
    const updateCount = (): void => {
      let count = 0
      for (const node of rpgTreeDef.nodes) {
        const state = engine.getNodeState(node.id)
        if (state?.state === 'unlocked') count += 1
      }
      setUnlockedCount(count)
    }

    updateCount()
    const unsubscribe = engine.subscribe(updateCount)
    return unsubscribe
  }, [engine])

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      setSelectedNode(nodeId)
      const state = engine.getNodeState(nodeId)

      if (state?.state === 'unlocked') {
        const result = await engine.lock(nodeId)
        if (result.ok) {
          setLastAction(`🔒 Locked: ${longLabels[nodeId] ?? nodeId}`)
        } else {
          setLastAction(`✗ Cannot lock: ${result.error.message}`)
        }
      } else {
        const result = await engine.unlock(nodeId)
        if (result.ok) {
          setLastAction(`✨ Unlocked: ${longLabels[nodeId] ?? nodeId}`)
        } else {
          setLastAction(`⛔ ${result.error.message}`)
        }
      }
    },
    [engine],
  )

  const handleSnapshot = useCallback(async () => {
    const snapshot: BuildSnapshot = await engine.snapshot('demo-checkpoint')
    setSnapshotId(snapshot.id)
    setLastAction('📸 Snapshot saved')
  }, [engine])

  const handleRestore = useCallback(async () => {
    if (snapshotId === null) {
      setLastAction('⛔ No snapshot to restore')
      return
    }
    const result = await engine.restoreSnapshot(snapshotId)
    if (result.ok) {
      setLastAction('↺ Restored snapshot')
    } else {
      setLastAction(`✗ Restore failed: ${result.error.message}`)
    }
  }, [engine, snapshotId])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Yggdrasil Forge</h1>
        <p className="app-subtitle">⚔ Forge thy character. Click skills to unlock.</p>
      </header>

      <div className="app-body">
        <div className="tree-frame">
          <div className="tree-container">
            <ThemeProvider theme={dragonborn}>
              <SkillTree engine={engine} onNodeClick={handleNodeClick} />
            </ThemeProvider>
          </div>
        </div>

        <aside className="sidebar">
          <section className="panel">
            <h2 className="panel-title">⚜ Status</h2>
            <div className="stat-row">
              <span className="stat-label">Unlocked</span>
              <span className="stat-value">
                {unlockedCount} <span className="stat-of">/ {rpgTreeDef.nodes.length}</span>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Last action</span>
              <span className="stat-value-text">{lastAction || '(none yet)'}</span>
            </div>
            {selectedNode !== null && (
              <div className="stat-row">
                <span className="stat-label">Selected</span>
                <span className="stat-value-text">{longLabels[selectedNode] ?? selectedNode}</span>
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">⚜ Controls</h2>
            <button type="button" className="rune-button" onClick={handleSnapshot}>
              📸 Save Snapshot
            </button>
            <button
              type="button"
              className="rune-button"
              onClick={handleRestore}
              disabled={snapshotId === null}
            >
              ↺ Restore
            </button>
          </section>

          <section className="panel panel-info">
            <h2 className="panel-title">⚜ About</h2>
            <p>
              Powered by <code>@yggdrasil-forge</code> 0.1.0 — an open-source TypeScript skill tree
              engine.
            </p>
            <p>
              <a
                href="https://github.com/cancioneschorriscortas-max/yggdrasil-forge"
                target="_blank"
                rel="noopener noreferrer"
                className="rune-link"
              >
                ⚔ View on GitHub →
              </a>
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
