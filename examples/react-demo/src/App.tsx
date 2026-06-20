import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { SkillTree, type SkillTreeHandle, ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemeLab, type ThemeLabValues, presetDarkClean } from './ThemeLab.js'
// Showcase Capa 1a: árbore activa = «O Paladín» (13 nodos / 11 capacidades).
// `rpgTreeDef` segue exportado en ./tree-def.js para un futuro toggle
// multi-exemplo (sub-fase posterior).
import { paladinLongLabels, paladinTreeDef, setupPaladinSnapshot } from './tree-def-paladin.js'

export function App(): JSX.Element {
  const [engine] = useState(() => {
    const storage = new MemoryStorage()
    return new TreeEngine(paladinTreeDef, { storage })
  })

  // F10.6: handle imperativo para controlar o viewport (Fit, Reset,
  // Zoom +, Zoom −) desde botóns no panel Controls.
  const treeRef = useRef<SkillTreeHandle>(null)

  // Showcase Capa 1a: setup inicial async (reproduce a foto do mockup).
  // Guard anti-doble-execución por React StrictMode (que monta os
  // effects dúas veces en dev). Se ben `engine.unlock` con nodo xa maxed
  // devolve un Result.err inocuo, evitamos o ruído da segunda pasada.
  const setupDoneRef = useRef(false)
  useEffect(() => {
    if (setupDoneRef.current) return
    setupDoneRef.current = true
    void setupPaladinSnapshot(engine)
  }, [engine])

  const [unlockedCount, setUnlockedCount] = useState(0)
  const [lastAction, setLastAction] = useState<string>('')
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Theme Lab — tema vivo controlado polo panel lateral.
  const [themeVals, setThemeVals] = useState<ThemeLabValues>(presetDarkClean)

  // Construímos o `Theme` real desde os mandos do lab. F10.3.fix: os
  // valores `fill` e `ringWidth` viaxan agora dentro do propio Theme
  // (campos opcionais novos), non como CSS vars no wrapper.
  // F10.8: `background` e `typography` viven no Theme; o wrapper xa
  // non precisa style propio. O hack de `font-family: !important` no
  // CSS do demo elimínase a favor de typography do tema.
  const builtTheme: Theme = useMemo(
    () => ({
      colors: {
        background: themeVals.canvas,
        text: themeVals.text,
        nodeLocked: themeVals.nodeLocked,
        nodeUnlockable: themeVals.nodeUnlockable,
        nodeUnlocked: themeVals.nodeUnlocked,
        nodeMaxed: themeVals.nodeMaxed,
        nodeInProgress: themeVals.nodeInProgress,
        nodeStroke: themeVals.nodeLocked,
        edge: themeVals.edge,
        mesh: 'rgba(148, 163, 184, 0.08)',
        nodeFill: themeVals.fill,
      },
      sizes: {
        strokeWidth: 2.5,
        fontSize: 14,
        fontSizeSmall: 11,
        ringWidth: themeVals.ringWidth,
      },
      typography: {
        fontFamily: '"Cinzel", serif',
        fontWeight: 600,
        letterSpacing: '0.04em',
      },
    }),
    [themeVals],
  )

  // F10.8: o wrapper xa non precisa style propio para o fondo.
  // `colors.background` do tema viaxa ao `<svg>` do `SVGRenderer`
  // como `style.background` inline (vía fiable, post-F10.8). Cero
  // CSS vars / `<style>` interno requeridas.

  // Subscribe to engine changes:
  useEffect(() => {
    const updateCount = (): void => {
      let count = 0
      for (const node of paladinTreeDef.nodes) {
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
          setLastAction(`🔒 Locked: ${paladinLongLabels[nodeId] ?? nodeId}`)
        } else {
          setLastAction(`✗ Cannot lock: ${result.error.message}`)
        }
      } else {
        const result = await engine.unlock(nodeId)
        if (result.ok) {
          setLastAction(`✨ Unlocked: ${paladinLongLabels[nodeId] ?? nodeId}`)
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
            <ThemeProvider theme={builtTheme}>
              <SkillTree
                ref={treeRef}
                engine={engine}
                onNodeClick={handleNodeClick}
                {...(selectedNode !== null && { selectedNodeId: selectedNode })}
              />
            </ThemeProvider>
          </div>
        </div>

        <aside className="sidebar">
          <section className="panel">
            <h2 className="panel-title">⚜ Status</h2>
            <div className="stat-row">
              <span className="stat-label">Unlocked</span>
              <span className="stat-value">
                {unlockedCount} <span className="stat-of">/ {paladinTreeDef.nodes.length}</span>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Last action</span>
              <span className="stat-value-text">{lastAction || '(none yet)'}</span>
            </div>
            {selectedNode !== null && (
              <div className="stat-row">
                <span className="stat-label">Selected</span>
                <span className="stat-value-text">
                  {paladinLongLabels[selectedNode] ?? selectedNode}
                </span>
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
            {/* F10.6: viewport controls. Arrastrar e roda do rato xa
                funcionan no propio SVG; estes botóns dan acceso directo
                a accións concretas. */}
            <div className="viewport-controls">
              <button
                type="button"
                className="rune-button rune-button--small"
                onClick={() => treeRef.current?.fit()}
              >
                ⛶ Fit
              </button>
              <button
                type="button"
                className="rune-button rune-button--small"
                onClick={() => treeRef.current?.reset()}
              >
                ⟲ Reset
              </button>
              <button
                type="button"
                className="rune-button rune-button--small"
                onClick={() => treeRef.current?.zoomIn()}
              >
                ⊕ Zoom +
              </button>
              <button
                type="button"
                className="rune-button rune-button--small"
                onClick={() => treeRef.current?.zoomOut()}
              >
                ⊖ Zoom −
              </button>
            </div>
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
