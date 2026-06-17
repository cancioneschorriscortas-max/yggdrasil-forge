import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'
import { SkillTree } from '@yggdrasil-forge/react/headless'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeLab, type ThemeLabValues, presetDarkClean } from './ThemeLab.js'
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

  // Theme Lab — tema vivo controlado polo panel lateral.
  const [themeVals, setThemeVals] = useState<ThemeLabValues>(presetDarkClean)

  // Construímos o `Theme` real desde os mandos do lab. Mantemos `background`
  // como 'transparent' porque o fondo do lenzo aplícase no wrapper externo.
  const builtTheme: Theme = useMemo(
    () => ({
      colors: {
        background: 'transparent',
        text: themeVals.text,
        nodeLocked: themeVals.nodeLocked,
        nodeUnlockable: themeVals.nodeUnlockable,
        nodeUnlocked: themeVals.nodeUnlocked,
        nodeMaxed: themeVals.nodeMaxed,
        nodeInProgress: themeVals.nodeInProgress,
        nodeStroke: themeVals.nodeLocked,
        edge: themeVals.edge,
        mesh: 'rgba(148, 163, 184, 0.08)',
      },
      sizes: {
        strokeWidth: 2.5,
        fontSize: 14,
        fontSizeSmall: 11,
      },
    }),
    [themeVals],
  )

  // CSS vars que o demo inxecta sobre o wrapper (non parte de Theme):
  // - `--yf-color-node-fill`: interior do orb (consumido polo CSS de F10.3).
  // - `--yf-ring-width`: grosor do anel.
  // - `background`: fondo do lenzo.
  const wrapperStyle: CSSProperties = useMemo(
    () =>
      ({
        background: themeVals.canvas,
        '--yf-color-node-fill': themeVals.fill,
        '--yf-ring-width': String(themeVals.ringWidth),
      }) as CSSProperties,
    [themeVals],
  )

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
          <div className="tree-container" style={wrapperStyle}>
            <ThemeProvider theme={builtTheme}>
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

          <ThemeLab value={themeVals} onChange={setThemeVals} />

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
