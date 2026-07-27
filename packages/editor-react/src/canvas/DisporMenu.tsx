// ── INICIO: DisporMenu (7.16, Cambio 2) ──
// Dropdown «Dispor» da barra do canvas (Autoría + vista grafo só — o
// caller decide non renderizalo noutros contextos, igual que fai coa
// CanvasToolbar). Mesmo patrón de peche que FileMenu/PanelsMenu:
// clic fóra ou Escape.
//
// «Coloca todos os nodos automaticamente. Podes retocar despois
// arrastrando.» — a acción coce posicións via applyAutoLayout (un
// undo devolve todo).

import type { AutoLayoutAlgo } from '@yggdrasil-forge/editor-core'
import { type JSX, useEffect, useRef, useState } from 'react'

export const ALGO_LABELS: Readonly<Record<AutoLayoutAlgo, string>> = {
  radial: 'Radial',
  tree: 'Árbore (por niveis)',
  'clustered-radial': 'Radial por grupos',
  constellation: 'Constelación',
}

export interface DisporMenuProps {
  readonly onDispor: (algo: AutoLayoutAlgo) => void
}

export function DisporMenu({ onDispor }: DisporMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current === null) return
      if (!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="editor-dispor" ref={menuRef}>
      <button
        type="button"
        className={`editor-canvas-toolbar__btn editor-dispor__trigger${open ? ' editor-canvas-toolbar__btn--active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Dispor"
        title="Dispor — coloca todos os nodos automaticamente. Podes retocar despois arrastrando."
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">✥</span>
      </button>
      {open && (
        <ul className="editor-dispor__menu" role="menu" aria-label="Algoritmos de disposición">
          {(Object.entries(ALGO_LABELS) as [AutoLayoutAlgo, string][]).map(([algo, label]) => (
            <li key={algo}>
              <button
                type="button"
                role="menuitem"
                className="editor-dispor__item"
                onClick={() => {
                  setOpen(false)
                  onDispor(algo)
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
// ── FIN: DisporMenu ──
