// ── INICIO: PanelsMenu ──
// Menú dropdown "Paneis" no TopBar (7.7 §1). Amosa a lista de paneis
// dispoñibles no modo actual, cada un con marca de visible/pechado;
// clic alterna presenza. Ao final, entrada «Restaurar disposición».
//
// Deseño intencional: dropdown de acción propio (non un Select — os
// selects son para escoller un valor entre varios; aquí cada entrada
// é unha acción independente). Peche por clic fóra ou Escape.

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import type { PanelDef } from '../panels/PanelHost.js'

export interface PanelsMenuProps {
  readonly panels: readonly PanelDef[]
  readonly visiblePanelIds: readonly string[]
  readonly onTogglePanel: (id: string) => void
  readonly onResetLayout: () => void
}

export function PanelsMenu({
  panels,
  visiblePanelIds,
  onTogglePanel,
  onResetLayout,
}: PanelsMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Peche por clic fóra ou Escape.
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

  const visibleSet = new Set(visiblePanelIds)

  const handleToggle = useCallback(
    (id: string) => {
      onTogglePanel(id)
      // Non pechamos o menú — o usuario pode querer alternar varios.
    },
    [onTogglePanel],
  )

  const handleReset = useCallback(() => {
    onResetLayout()
    setOpen(false)
  }, [onResetLayout])

  return (
    <div className="editor-topbar__panels-menu" ref={menuRef}>
      <button
        type="button"
        className={`editor-button${open ? ' editor-button--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Paneis"
      >
        Paneis ▾
      </button>
      {open && (
        <ul className="editor-topbar__panels-menu-list" role="menu">
          {panels.map((p) => {
            const visible = visibleSet.has(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={visible}
                  className="editor-topbar__panels-menu-item"
                  onClick={() => handleToggle(p.id)}
                >
                  <span className="editor-topbar__panels-menu-mark" aria-hidden="true">
                    {visible ? '✓' : ' '}
                  </span>
                  <span>{p.title}</span>
                </button>
              </li>
            )
          })}
          <li aria-hidden="true">
            <hr className="editor-topbar__panels-menu-sep" />
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              className="editor-topbar__panels-menu-item editor-topbar__panels-menu-reset"
              onClick={handleReset}
            >
              <span className="editor-topbar__panels-menu-mark" aria-hidden="true">
                ↺
              </span>
              <span>Restaurar disposición</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
// ── FIN: PanelsMenu ──
