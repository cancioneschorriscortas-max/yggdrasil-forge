// ── INICIO: FileMenu ──
// Menú dropdown "Ficheiro" no TopBar (7.10). Mesmo patrón que
// PanelsMenu: dropdown de acción propio, peche por clic fóra ou
// Escape. Cada entrada é unha acción (non un toggle), así que usa
// role="menuitem" (non "menuitemcheckbox").
//
// Fronteira: este compoñente NON fai I/O nin toca o DOM global — só
// UI + callbacks. A app decide que fai "Novo"/"Importar"/"Exportar"
// (mesma fronteira que co tema e o layout, 7.8/7.7).
//
// Entradas ausentes (callback non pasado) non se renderizan; se
// ningunha entrada está presente, o menú enteiro non se renderiza
// (ver TopBar: renderízase só se `documentActions` está definido).

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

export interface FileMenuProps {
  readonly onNew?: () => void
  readonly onImport?: () => void
  readonly onExport?: () => void
}

export function FileMenu({ onNew, onImport, onExport }: FileMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Peche por clic fóra ou Escape (idéntico a PanelsMenu).
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

  const wrap = useCallback((fn?: () => void) => {
    if (fn === undefined) return undefined
    return (): void => {
      fn()
      setOpen(false)
    }
  }, [])

  const handleNew = wrap(onNew)
  const handleImport = wrap(onImport)
  const handleExport = wrap(onExport)

  return (
    <div className="editor-topbar__file-menu" ref={menuRef}>
      <button
        type="button"
        className={`editor-button${open ? ' editor-button--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ficheiro"
      >
        Ficheiro ▾
      </button>
      {open && (
        <ul className="editor-topbar__panels-menu-list" role="menu">
          {handleNew !== undefined && (
            <li>
              <button
                type="button"
                role="menuitem"
                className="editor-topbar__panels-menu-item"
                onClick={handleNew}
              >
                <span className="editor-topbar__panels-menu-mark" aria-hidden="true" />
                <span>Novo</span>
              </button>
            </li>
          )}
          {handleImport !== undefined && (
            <li>
              <button
                type="button"
                role="menuitem"
                className="editor-topbar__panels-menu-item"
                onClick={handleImport}
              >
                <span className="editor-topbar__panels-menu-mark" aria-hidden="true" />
                <span>Importar JSON…</span>
              </button>
            </li>
          )}
          {handleExport !== undefined && (
            <li>
              <button
                type="button"
                role="menuitem"
                className="editor-topbar__panels-menu-item"
                onClick={handleExport}
              >
                <span className="editor-topbar__panels-menu-mark" aria-hidden="true" />
                <span>Exportar JSON</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
// ── FIN: FileMenu ──
