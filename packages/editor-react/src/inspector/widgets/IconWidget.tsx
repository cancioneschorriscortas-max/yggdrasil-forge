// ── INICIO: IconWidget (15.5) ──
// O banco cobra: o campo Icona deixa de ser texto a cegas. Widget
// compartido por nodo e recurso:
//   - TextWidget de sempre (texto libre segue valendo: emojis, URLs,
//     ids á man — cero regresión) + preview en vivo á esquerda
//     (IconGlyph se o id está rexistrado; o texto tal cal se non;
//     oco discreto se baleiro; unha URL móstrase como texto — honesto
//     e sen fetch).
//   - Botón de grella que abre un popover: busca instantánea, grella
//     agrupada por set (Builtin / Norse / Lóxica / Outras, derivado do
//     prefixo do id), entrada «Sen icona», teclado completo (frechas,
//     Inicio/Fin, Enter escolle, Esc pecha e devolve o foco, Tab
//     atrapado) e peche por clic fóra.
//
// Lección FileMenu vixente: o CONTEDOR do despregable leva as súas
// regras de posicionamento (`position: relative` en
// `.editor-iconwidget`), non abonda reutilizar clases dos fillos.

import { BUILTIN_ICONS, IconGlyph, getIcon, listRegisteredIcons } from '@yggdrasil-forge/react'
import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import { TextWidget } from './TextWidget.js'

export interface IconWidgetProps {
  readonly id: string
  readonly value: string | undefined
  readonly disabled?: boolean
  /** `undefined` = quitar a icona («Sen icona»). */
  readonly onCommit: (next: string | undefined) => void
}

/** Columnas fixas da grella — as frechas ↑/↓ móvense en saltos de GRID_COLS. */
const GRID_COLS = 6

interface IconGroup {
  readonly label: string
  readonly entries: ReadonlyArray<{ readonly id: string }>
}

/** Grupo dun id polo seu prefixo (Builtin por pertenza ao set base). */
function groupOf(iconId: string): 'Builtin' | 'Norse' | 'Lóxica' | 'Outras' {
  if (iconId.startsWith('norse-')) return 'Norse'
  if (iconId.startsWith('logic-')) return 'Lóxica'
  if (iconId in BUILTIN_ICONS) return 'Builtin'
  return 'Outras'
}

const GROUP_ORDER = ['Builtin', 'Norse', 'Lóxica', 'Outras'] as const

export function IconWidget({ id, value, disabled, onCommit }: IconWidgetProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  // Instantánea do rexistro só mentres o popover está aberto.
  const groups = useMemo<readonly IconGroup[]>(() => {
    if (!open) return []
    const q = query.trim().toLowerCase()
    const all = listRegisteredIcons().filter((e) => q === '' || e.id.toLowerCase().includes(q))
    return GROUP_ORDER.map((label) => ({
      label,
      entries: all.filter((e) => groupOf(e.id) === label),
    })).filter((g) => g.entries.length > 0)
  }, [open, query])

  // Ao abrir: foco na busca e query limpa.
  useEffect(() => {
    if (!open) return
    setQuery('')
    searchRef.current?.focus()
  }, [open])

  // Peche por clic fóra (patrón dos menús do shell).
  useEffect(() => {
    if (!open) return undefined
    const handleClick = (e: MouseEvent): void => {
      if (rootRef.current === null) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const choose = (next: string | undefined): void => {
    onCommit(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  /** Botóns navegables do popover, en orde do DOM. */
  const focusables = (): HTMLElement[] => {
    const root = rootRef.current
    if (root === null) return []
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        '.editor-iconwidget__popover input, .editor-iconwidget__popover button',
      ),
    )
  }

  const cells = (): HTMLElement[] => {
    const root = rootRef.current
    if (root === null) return []
    return Array.from(root.querySelectorAll<HTMLElement>('[data-icon-cell]'))
  }

  const handlePopoverKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    // Foco atrapado: Tab circula dentro do popover.
    if (e.key === 'Tab') {
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (first === undefined || last === undefined) return
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
      return
    }
    // Frechas: da busca á grella, e pola grella en saltos de fila/columna.
    const isArrow =
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    if (!isArrow && e.key !== 'Home' && e.key !== 'End') return
    const grid = cells()
    if (grid.length === 0) return
    const active = document.activeElement as HTMLElement | null
    if (active === searchRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        grid[0]?.focus()
      }
      return
    }
    const current = active === null ? -1 : grid.indexOf(active)
    if (current === -1) return
    e.preventDefault()
    const delta =
      e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowLeft'
          ? -1
          : e.key === 'ArrowDown'
            ? GRID_COLS
            : e.key === 'ArrowUp'
              ? -GRID_COLS
              : 0
    if (e.key === 'Home') grid[0]?.focus()
    else if (e.key === 'End') grid[grid.length - 1]?.focus()
    else {
      const next = current + delta
      if (e.key === 'ArrowUp' && next < 0) searchRef.current?.focus()
      else grid[Math.max(0, Math.min(grid.length - 1, next))]?.focus()
    }
  }

  const registered = value !== undefined && value !== '' ? getIcon(value) : undefined

  return (
    <div className="editor-iconwidget" ref={rootRef}>
      {/* Preview en vivo: decorativa (o input xa leva o valor). */}
      <span className="editor-iconwidget__preview" aria-hidden="true">
        {registered !== undefined ? (
          <IconGlyph def={registered} size={18} />
        ) : value !== undefined && value !== '' ? (
          <span className="editor-iconwidget__preview-text">{value}</span>
        ) : null}
      </span>
      <TextWidget
        id={id}
        value={value}
        {...(disabled !== undefined && { disabled })}
        onCommit={(v) => onCommit(v === '' ? undefined : v)}
      />
      <button
        type="button"
        ref={triggerRef}
        className="editor-iconwidget__trigger"
        aria-label="Escoller icona"
        title="Escoller icona"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled ?? false}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">▦</span>
      </button>
      {open && (
        /* <dialog> nativo NON modal (attr `open`): semántica de serie,
           posicionado polo noso CSS; o keydown delega o teclado do
           selector (frechas, Tab atrapado, Esc). */
        <dialog
          open
          className="editor-iconwidget__popover"
          aria-label="Selector de iconas"
          onKeyDown={handlePopoverKey}
        >
          <input
            ref={searchRef}
            type="search"
            className="editor-inspector-input editor-iconwidget__search"
            placeholder="Buscar icona…"
            aria-label="Buscar icona"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="editor-iconwidget__grid-scroll">
            <button
              type="button"
              className="editor-iconwidget__none"
              data-icon-cell
              onClick={() => choose(undefined)}
            >
              Sen icona
            </button>
            {groups.map((group) => (
              <div key={group.label}>
                <p className="editor-iconwidget__group-title">{group.label}</p>
                <div className="editor-iconwidget__grid">
                  {group.entries.map((entry) => {
                    const def = getIcon(entry.id)
                    if (def === undefined) return null
                    const isCurrent = entry.id === value
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        data-icon-cell
                        className={`editor-iconwidget__cell${isCurrent ? ' editor-iconwidget__cell--current' : ''}`}
                        title={entry.id}
                        onClick={() => choose(entry.id)}
                      >
                        <IconGlyph def={def} size={22} />
                        <span className="editor-iconwidget__cell-id">{entry.id}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <p className="editor-iconwidget__empty">Sen resultados para «{query}».</p>
            )}
          </div>
        </dialog>
      )}
    </div>
  )
}
// ── FIN: IconWidget ──
