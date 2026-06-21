// ── INICIO: Inspector — panel dereito con pestanas ──
// Substitúe a antiga columna sidebar: agora todo o detalle do nodo
// vive aquí, con catro pestanas:
//   - Node       → NodeDetails (identidade + estado actual)
//   - Conditions → ConditionInspector (existente, reutilizado)
//   - Stats      → StatsPanel (treeDef.stats vía useStat)
//   - Tema       → ThemeLab (editor de tema + cores por rexión)
import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { useState } from 'react'
import { ConditionInspector } from './ConditionInspector.js'
import { NodeDetails } from './NodeDetails.js'
import { StatsPanel } from './StatsPanel.js'
import { ThemeLab, type ThemeLabValues } from './ThemeLab.js'

type InspectorTab = 'node' | 'conditions' | 'stats' | 'theme'

export interface InspectorThemeBinding {
  readonly value: ThemeLabValues
  readonly onChange: (next: ThemeLabValues) => void
  readonly regions: readonly { readonly id: string; readonly label: string }[]
  readonly regionColors: Readonly<Record<string, string>>
  readonly activeRegion: string
  readonly onActiveRegionChange: (id: string) => void
  readonly onRegionColorChange: (id: string, color: string) => void
}

export interface InspectorProps {
  readonly engine: TreeEngine
  readonly treeDef: TreeDef
  readonly selectedNodeId: string | null
  readonly theme: InspectorThemeBinding
}

const TABS: readonly { id: InspectorTab; label: string }[] = [
  { id: 'node', label: 'Node' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'stats', label: 'Stats' },
  { id: 'theme', label: 'Tema' },
]

export function Inspector({ engine, treeDef, selectedNodeId, theme }: InspectorProps): JSX.Element {
  const [tab, setTab] = useState<InspectorTab>('node')

  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="inspector-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`inspector-tab${tab === t.id ? ' inspector-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="inspector-body" role="tabpanel">
        {tab === 'node' && (
          <NodeDetails engine={engine} treeDef={treeDef} selectedNodeId={selectedNodeId} />
        )}
        {tab === 'conditions' && (
          <ConditionInspector engine={engine} selectedNodeId={selectedNodeId} locale="es" />
        )}
        {tab === 'stats' && <StatsPanel engine={engine} treeDef={treeDef} />}
        {tab === 'theme' && (
          <ThemeLab
            value={theme.value}
            onChange={theme.onChange}
            regions={theme.regions}
            regionColors={theme.regionColors}
            activeRegion={theme.activeRegion}
            onActiveRegionChange={theme.onActiveRegionChange}
            onRegionColorChange={theme.onRegionColorChange}
          />
        )}
      </div>
    </aside>
  )
}
// ── FIN: Inspector ──
