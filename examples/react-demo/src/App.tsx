import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { SkillTree, type SkillTreeHandle, ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import type { JSX } from 'react'
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ConditionInspector } from './ConditionInspector.js'
import { ThemeLab, type ThemeLabValues, presetDarkClean } from './ThemeLab.js'
// Showcase Capa 1a: árbore activa = «O Paladín» (13 nodos / 11 capacidades).
// `rpgTreeDef` segue exportado en ./tree-def.js para un futuro toggle
// multi-exemplo (sub-fase posterior).
import { paladinLongLabels, paladinTreeDef } from './tree-def-paladin.js'

export function App(): JSX.Element {
  const [engine] = useState(() => {
    const storage = new MemoryStorage()
    return new TreeEngine(paladinTreeDef, { storage })
  })

  // F10.6: handle imperativo para controlar o viewport (Fit, Reset,
  // Zoom +, Zoom −) desde botóns no panel Controls.
  const treeRef = useRef<SkillTreeHandle>(null)

  // Showcase «Economía de Puntos»: subscribe estable para
  // `useSyncExternalStore`. Devolve un ref-stable subscribe que React
  // pode rexistrar/desrexistrar sen perder eventos do snapshot async
  // (arranxo do BUG 3: o subscribe manual con useEffect perdía os
  // primeiros unlocks porque rexistrábase tras eles).
  const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine])
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine])
  const getBudgetSnapshot = useCallback(() => engine.getBudget(), [engine])

  // Estado da árbore en vivo (renderízase a cada cambio do engine).
  const treeState = useSyncExternalStore(subscribe, getSnapshot)
  const budget = useSyncExternalStore(subscribe, getBudgetSnapshot)

  // Interactivo Capa C: arranque LIMPO. `setupPaladinSnapshot` segue
  // exportado por se algún test quere precargar a foto do mockup, pero
  // o demo arranca con 0 nodos investidos e 18 puntos no budget. O
  // usuario constrúe a árbore punto a punto cos botóns ➕ no canvas
  // (Capa B) e pode resetear todo co botón Reset do panel Status.

  // Conta derivada do snapshot reactivo: nodos con tier >= 1
  // (unlocked + in_progress + maxed). Corrixe o bug do contador
  // anterior que só miraba `state === 'unlocked'` e ignoraba `maxed`.
  const unlockedCount = useMemo(() => {
    let count = 0
    for (const node of paladinTreeDef.nodes) {
      const inst = treeState.nodes[node.id]
      if (inst === undefined) continue
      if (inst.state === 'unlocked' || inst.state === 'in_progress' || inst.state === 'maxed') {
        count += 1
      }
    }
    return count
  }, [treeState])

  // Pools en vivo (lectura directa do budget reactivo).
  const skillPoints = budget.resources['skill-points'] ?? 0
  const pietyPoints = budget.resources.piety ?? 0

  const [lastAction, setLastAction] = useState<string>('')
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Theme Lab — tema vivo controlado polo panel lateral.
  const [themeVals, setThemeVals] = useState<ThemeLabValues>(presetDarkClean)

  // Capa 2 — Rexións visuais por columna. Cores en estado do demo,
  // editables no Theme Lab vía selector. Cada rexión = un tag de
  // `NodeDef.tags`. As cores son tintes de baixa opacidade aplicadas
  // detrás de edges/nodos.
  const [regionColors, setRegionColors] = useState<Record<string, string>>({
    warrior: '#c1442e', // vermello (Guerreiro)
    paladin: '#d4a017', // dourado (Paladín, centro)
    cleric: '#3a7ec7', // azul (Clérigo)
  })
  // Selector da rexión activa no Theme Lab (cal estase a editar).
  const [activeRegion, setActiveRegion] = useState<string>('warrior')

  const regions = useMemo(
    () => [
      {
        id: 'warrior',
        label: 'Guerreiro',
        tag: 'warrior',
        color: regionColors.warrior ?? '#c1442e',
      },
      { id: 'paladin', label: 'Paladín', tag: 'paladin', color: regionColors.paladin ?? '#d4a017' },
      { id: 'cleric', label: 'Clérigo', tag: 'cleric', color: regionColors.cleric ?? '#3a7ec7' },
    ],
    [regionColors],
  )

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
        // Renderer sub-fase 1: fills por estado. O Theme Lab garda os 5
        // como cadeas non-baleiras (presets sempre os providen); pasamos
        // tal cal.
        nodeFillLocked: themeVals.nodeFillLocked,
        nodeFillUnlockable: themeVals.nodeFillUnlockable,
        nodeFillUnlocked: themeVals.nodeFillUnlocked,
        nodeFillMaxed: themeVals.nodeFillMaxed,
        nodeFillInProgress: themeVals.nodeFillInProgress,
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

  // (BUG 3 fixed) O efecto manual `engine.subscribe(updateCount)` foi
  // substituído por `useSyncExternalStore` arriba — rexístrase no
  // primeiro render, sen perder eventos do snapshot async nin do
  // StrictMode double-mount.

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

  // Interactivo Capa C: reset global de toda a árbore. Confirmation
  // dialog antes para evitar resets accidentais. `engine.respec()` sen
  // args desbloquea todo cun refund completo (require recursos cun
  // flag `refundable: true` no TreeDef — xa o fai paladín).
  const handleResetAll = useCallback(async () => {
    const confirmed = window.confirm('¿Reiniciar toda a árbore? Tódolos puntos volverán ao budget.')
    if (!confirmed) return
    const result = await engine.respec()
    if (result.ok) {
      setLastAction('↻ Árbore reseteada')
    } else {
      setLastAction(`⛔ Reset failed: ${result.error.message}`)
    }
  }, [engine])

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
                showTierBadge
                onNodeTierIncrease={(nodeId) => {
                  void engine.unlock(nodeId).then((r) => {
                    if (r.ok) {
                      setLastAction(`✨ +1 ${paladinLongLabels[nodeId] ?? nodeId}`)
                    } else {
                      setLastAction(`⛔ ${r.error.message}`)
                    }
                  })
                }}
                onNodeTierDecrease={(nodeId) => {
                  void engine.lockOneTier(nodeId).then((r) => {
                    if (r.ok) {
                      setLastAction(`↩️ -1 ${paladinLongLabels[nodeId] ?? nodeId}`)
                    } else {
                      setLastAction(`⛔ ${r.error.message}`)
                    }
                  })
                }}
                canIncrease={(nodeId) => {
                  const check = engine.canUnlock(nodeId)
                  return check.ok && check.value.allowed
                }}
                regions={regions}
              />
            </ThemeProvider>
          </div>
        </div>

        <aside className="sidebar">
          <section className="panel">
            <h2 className="panel-title">⚜ Status</h2>
            <div className="stat-row">
              <span className="stat-label">⭐ Puntos</span>
              <span className="stat-value">
                {skillPoints} <span className="stat-of">/ 18</span>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">💧 Piedade</span>
              <span className="stat-value">
                {pietyPoints} <span className="stat-of">/ 20</span>
              </span>
            </div>
            <div className="stat-row">
              <button
                type="button"
                className="rune-button"
                onClick={() => void handleResetAll()}
                style={{ width: '100%' }}
              >
                ↻ Reset puntos
              </button>
            </div>
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

          {/* Showcase Capa 1b: panel ConditionInspector — fai visible o que
              o motor xa sabe (explainUnlock + cost vs budget + exclusións +
              canUnlock). Reactivo vía useSyncExternalStore interno. */}
          <ConditionInspector engine={engine} selectedNodeId={selectedNode} locale="es" />

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

        <aside className="theme-lab-column">
          <ThemeLab
            value={themeVals}
            onChange={setThemeVals}
            regions={regions.map((r) => ({ id: r.id, label: r.label }))}
            regionColors={regionColors}
            activeRegion={activeRegion}
            onActiveRegionChange={setActiveRegion}
            onRegionColorChange={(id, color) =>
              setRegionColors((prev) => ({ ...prev, [id]: color }))
            }
          />
        </aside>
      </div>
    </div>
  )
}
