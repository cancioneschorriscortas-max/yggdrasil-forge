import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { SkillTree, type SkillTreeHandle, ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Inspector } from './Inspector.js'
import { Modal } from './Modal.js'
import { type StateChip, StatesLegend } from './StatesLegend.js'
import { ThemeLab, type ThemeLabValues, presetDarkClean } from './ThemeLab.js'
import { type ResourceBar, TopHud } from './TopHud.js'
import { ZoomControl } from './ZoomControl.js'
// Showcase Capa 1a: árbore activa = «O Paladín» (13 nodos / 11 capacidades).
// `rpgTreeDef` segue exportado en ./tree-def.js para un futuro toggle
// multi-exemplo (sub-fase posterior).
import { paladinLongLabels, paladinTreeDef } from './tree-def-paladin.js'

export function App(): JSX.Element {
  const [engine] = useState(() => {
    const storage = new MemoryStorage()
    return new TreeEngine(paladinTreeDef, { storage })
  })

  // F10.6: handle imperativo para controlar o viewport (Fit, Reset, ±).
  const treeRef = useRef<SkillTreeHandle>(null)

  // Subscribe estable para `useSyncExternalStore` (sen perder eventos
  // do snapshot async; arranxo do BUG 3).
  const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine])
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine])
  const getBudgetSnapshot = useCallback(() => engine.getBudget(), [engine])

  const treeState = useSyncExternalStore(subscribe, getSnapshot)
  const budget = useSyncExternalStore(subscribe, getBudgetSnapshot)

  // Conta de nodos con tier >= 1 (unlocked + in_progress + maxed).
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
  const level = budget.resources.level ?? 1

  const [lastAction, setLastAction] = useState<string>('')
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // UI chrome: modais (Tema, Axuda).
  const [themeOpen, setThemeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // Zoom: `getZoom()` non é reactivo; gardamos o % en estado e
  // actualizámolo nos handlers de zoom + tras o primeiro paint.
  const [zoomPercent, setZoomPercent] = useState(100)
  const refreshZoom = useCallback(() => {
    const z = treeRef.current?.getZoom() ?? 1
    setZoomPercent(Math.round(z * 100))
  }, [])
  useEffect(() => {
    refreshZoom()
  }, [refreshZoom])

  // Theme Lab — tema vivo controlado polo panel lateral.
  const [themeVals, setThemeVals] = useState<ThemeLabValues>(presetDarkClean)

  // Rexións visuais por columna.
  const [regionColors, setRegionColors] = useState<Record<string, string>>({
    warrior: '#c1442e',
    paladin: '#d4a017',
    cleric: '#3a7ec7',
  })
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

  const handleSnapshot = useCallback(() => {
    void (async () => {
      const snapshot: BuildSnapshot = await engine.snapshot('demo-checkpoint')
      setSnapshotId(snapshot.id)
      setLastAction('📸 Snapshot saved')
    })()
  }, [engine])

  const handleRestore = useCallback(() => {
    void (async () => {
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
    })()
  }, [engine, snapshotId])

  const handleLevelChange = useCallback(
    (delta: number) => {
      void (async () => {
        const result = await engine.grantResource('level', delta)
        if (result.ok) {
          const { previous, current } = result.value
          if (previous === current) {
            setLastAction(`🎖️ Nivel ${current} (no límite, sen cambio)`)
          } else {
            setLastAction(`🎖️ Nivel ${previous} → ${current}`)
          }
        } else {
          setLastAction(`⛔ ${result.error.message}`)
        }
      })()
    },
    [engine],
  )

  const handleFit = useCallback(() => {
    treeRef.current?.fit()
    refreshZoom()
  }, [refreshZoom])
  const handleReset = useCallback(() => {
    treeRef.current?.reset()
    refreshZoom()
  }, [refreshZoom])
  const handleZoomIn = useCallback(() => {
    treeRef.current?.zoomIn()
    refreshZoom()
  }, [refreshZoom])
  const handleZoomOut = useCallback(() => {
    treeRef.current?.zoomOut()
    refreshZoom()
  }, [refreshZoom])

  const hudBars: readonly ResourceBar[] = useMemo(
    () => [
      { id: 'points', label: 'Puntos', value: skillPoints, max: 18, icon: '⭐' },
      { id: 'piety', label: 'Piedade', value: pietyPoints, max: 20, icon: '💧' },
      { id: 'level', label: 'Nivel', value: level, max: 10, icon: '🎖️' },
    ],
    [skillPoints, pietyPoints, level],
  )

  const stateChips: readonly StateChip[] = useMemo(
    () => [
      { id: 'locked', label: 'Bloqueado', color: themeVals.nodeLocked },
      { id: 'unlockable', label: 'Desbloqueable', color: themeVals.nodeUnlockable },
      { id: 'in_progress', label: 'En progreso', color: themeVals.nodeInProgress },
      { id: 'unlocked', label: 'Completado', color: themeVals.nodeUnlocked },
      { id: 'maxed', label: 'Máximo', color: themeVals.nodeMaxed },
      { id: 'excluded', label: 'Incompatible', color: 'rgba(160, 60, 60, 0.85)' },
    ],
    [themeVals],
  )

  return (
    <div className="app">
      <TopHud
        bars={hudBars}
        level={level}
        onLevelChange={handleLevelChange}
        onSave={handleSnapshot}
        onRestore={handleRestore}
        canRestore={snapshotId !== null}
        onOpenTheme={() => setThemeOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <div className="app-body">
        <div className="canvas-zone">
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

          <StatesLegend chips={stateChips} />

          <ZoomControl
            zoomPercent={zoomPercent}
            onFit={handleFit}
            onReset={handleReset}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />

          {lastAction !== '' && (
            <div className="last-action" aria-live="polite">
              {lastAction}
            </div>
          )}

          <div className="canvas-counter" aria-label="Contador de nodos desbloqueados">
            {unlockedCount} / {paladinTreeDef.nodes.length}
          </div>
        </div>

        <Inspector engine={engine} treeDef={paladinTreeDef} selectedNodeId={selectedNode} />
      </div>

      <Modal open={themeOpen} onClose={() => setThemeOpen(false)} title="Tema">
        <ThemeLab
          value={themeVals}
          onChange={setThemeVals}
          regions={regions.map((r) => ({ id: r.id, label: r.label }))}
          regionColors={regionColors}
          activeRegion={activeRegion}
          onActiveRegionChange={setActiveRegion}
          onRegionColorChange={(id, color) => setRegionColors((prev) => ({ ...prev, [id]: color }))}
        />
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Axuda">
        <div className="help-body">
          <p>
            <strong>Yggdrasil Forge</strong> é un motor open-source de árbores de habilidades en
            TypeScript. Esta demo usa a árbore <em>El Paladín</em>
            (13 nodos exhibindo 11 capacidades do motor).
          </p>
          <ul>
            <li>
              <strong>Clic</strong> nun nodo → desbloquéao (ou avanza ao seguinte tier se ten
              varios).
            </li>
            <li>
              Os botóns <strong>+/−</strong> baixo cada nodo permiten subir e baixar tier
              directamente.
            </li>
            <li>
              <strong>Arrastra</strong> ou usa a <strong>roda</strong> sobre o lenzo para moverte e
              ampliar.
            </li>
            <li>
              Cambia o <strong>Nivel</strong> no HUD para abrir nodos gatados por
              `resource_min(level, N)`.
            </li>
            <li>
              <strong>Tema</strong> permite editar a paleta e as cores por rexión (Guerreiro /
              Paladín / Clérigo).
            </li>
          </ul>
          <p>
            Powered by <code>@yggdrasil-forge</code> —{' '}
            <a
              href="https://github.com/cancioneschorriscortas-max/yggdrasil-forge"
              target="_blank"
              rel="noopener noreferrer"
              className="rune-link"
            >
              ⚔ GitHub →
            </a>
          </p>
        </div>
      </Modal>
    </div>
  )
}
