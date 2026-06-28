// ── INICIO: SystemsColumn (left column — grupos por sistema corporal) ──
// Por cada def.groups, unha tarxeta co label + contador instalados/total.
// Resalta o grupo do nodo seleccionado.

import { resolveLocalized } from '@yggdrasil-forge/common'
import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'

interface SystemsColumnProps {
  readonly engine: TreeEngine
  readonly def: TreeDef
  readonly selectedGroupId?: string | undefined
}

const LOCALE = 'en'

export function SystemsColumn({ engine, def, selectedGroupId }: SystemsColumnProps): JSX.Element {
  const groups = def.groups ?? []
  return (
    <nav className="cyber-systems" aria-label="Body systems">
      {groups.map((g) => {
        const members = def.nodes.filter((n) => n.group === g.id)
        const installed = members.filter(
          (n) => (engine.getNodeState(n.id)?.currentTier ?? 0) > 0,
        ).length
        const isActive = selectedGroupId === g.id
        const label = resolveLocalized(g.label, LOCALE).toUpperCase()
        return (
          <div
            key={g.id}
            className={`cyber-system${isActive ? ' cyber-system--active' : ''}`}
            data-augmented-ui="border tl-clip tr-clip br-clip bl-clip"
            style={{ ['--system-color' as string]: g.color ?? '#1ad0e0' }}
          >
            <div className="cyber-system__icon" aria-hidden="true">
              ◈
            </div>
            <div className="cyber-system__body">
              <div className="cyber-system__label">{label}</div>
              <div className="cyber-system__count">
                {installed} / {members.length}
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
// ── FIN: SystemsColumn ──
