// ── INICIO: CapacityBar (barra segmentada used/max) ──
// Le capacity do budget e o max do resources def. Barra de N celas;
// `used` celas acendidas. Aviso visual se used está preto de max.

import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'

interface CapacityBarProps {
  readonly engine: TreeEngine
  readonly def: TreeDef
}

export function CapacityBar({ engine, def }: CapacityBarProps): JSX.Element {
  const resource = def.resources?.find((r) => r.id === 'capacity')
  const max = resource?.max ?? resource?.initial ?? 24
  const remaining = engine.getBudget().resources.capacity ?? max
  const used = Math.max(0, max - remaining)
  const danger = used >= max - 1
  const warn = used >= max - 4

  const cells: JSX.Element[] = []
  for (let i = 0; i < max; i++) {
    const lit = i < used
    cells.push(
      <span key={String(i)} className={`cyber-cap__cell${lit ? ' cyber-cap__cell--lit' : ''}`} />,
    )
  }

  return (
    <div className="cyber-cap">
      <div className="cyber-cap__title">CAPACITY</div>
      <div className="cyber-cap__row">
        <span className={`cyber-cap__count${danger ? ' cyber-cap__count--danger' : ''}`}>
          {used} / {max}
        </span>
        <div className="cyber-cap__cells">{cells}</div>
      </div>
      {warn && (
        <div className="cyber-cap__warn">⚠ EXCEEDING CAPACITY MAY CAUSE SYSTEM INSTABILITY</div>
      )}
    </div>
  )
}
// ── FIN: CapacityBar ──
