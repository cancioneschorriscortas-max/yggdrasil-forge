import { useCallback, useEffect, useState } from 'react'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { rpgTreeDef } from './tree-def.js'

export function App(): JSX.Element {
  const [engine] = useState(() => {
    const storage = new MemoryStorage()
    return new TreeEngine(rpgTreeDef, { storage })
  })

  const [unlockedCount, setUnlockedCount] = useState(0)
  const [lastAction, setLastAction] = useState<string>('')
  const [snapshotId, setSnapshotId] = useState<string | null>(null)

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
      const state = engine.getNodeState(nodeId)

      if (state?.state === 'unlocked') {
        const result = await engine.lock(nodeId)
        if (result.ok) {
          setLastAction(`Locked: ${nodeId}`)
        } else {
          setLastAction(`Cannot lock ${nodeId}: ${result.error.message}`)
        }
      } else {
        const result = await engine.unlock(nodeId)
        if (result.ok) {
          setLastAction(`Unlocked: ${nodeId}`)
        } else {
          setLastAction(`Cannot unlock ${nodeId}: ${result.error.message}`)
        }
      }
    },
    [engine],
  )

  const handleSnapshot = useCallback(async () => {
    const snapshot: BuildSnapshot = await engine.snapshot('demo-checkpoint')
    setSnapshotId(snapshot.id)
    setLastAction(`Snapshot saved: ${snapshot.id.slice(0, 12)}...`)
  }, [engine])

  const handleRestore = useCallback(async () => {
    if (snapshotId === null) {
      setLastAction('No snapshot to restore')
      return
    }
    const result = await engine.restoreSnapshot(snapshotId)
    if (result.ok) {
      setLastAction(`Restored snapshot: ${snapshotId.slice(0, 12)}...`)
    } else {
      setLastAction(`Restore failed: ${result.error.message}`)
    }
  }, [engine, snapshotId])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Yggdrasil Forge — React Demo</h1>
        <p className="tagline">Click nodes to unlock / lock them. Try the snapshot buttons!</p>
      </header>

      <div className="app-body">
        <div className="tree-container">
          <SkillTree engine={engine} onNodeClick={handleNodeClick} />
        </div>

        <aside className="sidebar">
          <section className="stats">
            <h2>Stats</h2>
            <p>
              <strong>Unlocked:</strong> {unlockedCount} / {rpgTreeDef.nodes.length}
            </p>
            <p>
              <strong>Last action:</strong>
              <br />
              <code>{lastAction || '(none yet)'}</code>
            </p>
          </section>

          <section className="controls">
            <h2>Controls</h2>
            <button type="button" onClick={handleSnapshot}>
              📸 Snapshot
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={snapshotId === null}
            >
              ⏪ Restore
            </button>
            {snapshotId !== null && (
              <p className="snapshot-info">
                Snapshot ready: <code>{snapshotId.slice(0, 12)}...</code>
              </p>
            )}
          </section>

          <section className="info">
            <h2>About</h2>
            <p>
              This demo uses <code>@yggdrasil-forge/react</code> 0.1.0
              and <code>@yggdrasil-forge/core</code> 0.1.0.
            </p>
            <p>
              See{' '}
              <a
                href="https://github.com/cancioneschorriscortas-max/yggdrasil-forge"
                target="_blank"
                rel="noopener noreferrer"
              >
                the repository
              </a>{' '}
              for full documentation.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
