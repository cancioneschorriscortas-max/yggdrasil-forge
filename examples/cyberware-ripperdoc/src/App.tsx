// ── INICIO: App (cyberware-ripperdoc showcase) ──
//
// Composición: HUD arriba, columna esquerda (sistemas), centro (SkillTree
// dentro de ThemeProvider con concept-art como background-image),
// columna dereita (CyberInspector cando hai selección), barra de
// capacidade no fondo. Refresco vía useSyncExternalStore.

import type { TreeEngine } from '@yggdrasil-forge/core'
import { TreeEngine as TreeEngineCtor } from '@yggdrasil-forge/core'
import { SkillTree, ThemeProvider } from '@yggdrasil-forge/react'
import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CapacityBar } from './CapacityBar.js'
import { CyberHUD } from './CyberHUD.js'
import { CyberInspector } from './CyberInspector.js'
import { SystemsColumn } from './SystemsColumn.js'
import { chromeTheme } from './chromeTheme.js'
import { cyberwareTree } from './cyberware.tree.js'

export function App(): JSX.Element {
  const def = useMemo(() => cyberwareTree, [])
  const engine: TreeEngine = useMemo(() => new TreeEngineCtor(def), [def])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  // Fondo personalizado (concept-art final de Agarfal). URL blob: creada
  // con URL.createObjectURL; o useEffect cleanup revoga a anterior ao
  // cambiar/desmontar para evitar memory leak. null = placeholder.
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null)
  useEffect(() => {
    return () => {
      if (customBgUrl !== null) URL.revokeObjectURL(customBgUrl)
    }
  }, [customBgUrl])

  // Re-render reactivo ao cambio de estado do engine (unlock, etc.).
  useSyncExternalStore(
    useCallback((cb: () => void) => engine.subscribe(cb), [engine]),
    () => engine.getSnapshot(),
    () => engine.getServerSnapshot(),
  )

  const handleInstall = useCallback(
    (id: string) => {
      // unlock é async + devolve Result. Ignoramos o valor; o re-render
      // chega do useSyncExternalStore tras o cambio de snapshot.
      void engine.unlock(id).catch(() => {
        /* unlock falla; estado non cambia, inspector queda igual */
      })
    },
    [engine],
  )

  const selectedNode =
    selectedId !== undefined ? (def.nodes.find((n) => n.id === selectedId) ?? null) : null
  const selectedGroupId = selectedNode?.group

  return (
    <div className="cyber-shell">
      <CyberHUD engine={engine} />
      <div className="cyber-body">
        <SystemsColumn engine={engine} def={def} selectedGroupId={selectedGroupId} />
        <main className="cyber-canvas">
          <div
            className="cyber-canvas__bg"
            aria-hidden="true"
            style={
              customBgUrl !== null
                ? ({ '--cyber-bg': `url(${customBgUrl})` } as CSSProperties)
                : undefined
            }
          />
          <label className="cyber-canvas__bg-picker" title="Cargar imaxe de fondo">
            <span aria-hidden="true">⬚</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file === undefined) return
                setCustomBgUrl(URL.createObjectURL(file))
              }}
            />
          </label>
          <ThemeProvider theme={chromeTheme}>
            <SkillTree
              engine={engine}
              onNodeClick={setSelectedId}
              {...(selectedId !== undefined ? { selectedNodeId: selectedId } : {})}
              curve="octilinear"
              locale="en"
            />
          </ThemeProvider>
          <div className="cyber-canvas__capacity">
            <CapacityBar engine={engine} def={def} />
          </div>
        </main>
        {selectedId !== undefined && (
          <CyberInspector
            engine={engine}
            def={def}
            nodeId={selectedId}
            onInstall={handleInstall}
            onClose={() => setSelectedId(undefined)}
          />
        )}
      </div>
    </div>
  )
}
// ── FIN: App ──
