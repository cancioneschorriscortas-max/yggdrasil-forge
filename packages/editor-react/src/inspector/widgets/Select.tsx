// ── INICIO: Select ──
// Desplegable propio (substitúe o `<select>` nativo) porque o nativo
// **non permite estilar `<option>`** — o contraste era ilexible cos
// tokens do chrome escuro (Briefing 7.5c-U §4).
//
// **Beneficios**:
//   - Contraste co chrome (fg/bg dos tokens editor-*).
//   - Amosa labels **localizados** (non valores crus como "subtree_anchor").
//   - Amosa unha liña de axuda por opción (do mapa de enum).
//   - Accesible: teclado (↑/↓/Enter/Escape), aria-expanded, aria-activedescendant.
//   - Peche ao clicar fóra ou premer Escape.

import { type JSX, useCallback, useEffect, useId, useRef, useState } from 'react'

export interface SelectOption {
  readonly value: string
  /** Etiqueta xa localizada. */
  readonly label: string
  /** Liña de axuda por opción (opcional). */
  readonly describe?: string
}

export interface SelectProps {
  readonly id?: string
  readonly value: string | undefined
  readonly options: readonly SelectOption[]
  readonly disabled?: boolean
  readonly onChange: (value: string) => void
  readonly ariaLabel?: string
  /** Texto cando value===undefined (defecto: "— sen definir —"). */
  readonly placeholder?: string
}

export function Select({
  id: providedId,
  value,
  options,
  disabled,
  onChange,
  ariaLabel,
  placeholder = '— sen definir —',
}: SelectProps): JSX.Element {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number>(() => {
    const idx = options.findIndex((o) => o.value === value)
    return idx >= 0 ? idx : 0
  })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const selected = options.find((o) => o.value === value)
  const displayLabel = selected?.label ?? placeholder

  // Sincroniza activeIdx cando muda value externo.
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value)
    if (idx >= 0) setActiveIdx(idx)
  }, [value, options])

  // Peche ao clicar fóra.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (
        buttonRef.current?.contains(e.target as Node) === true ||
        listRef.current?.contains(e.target as Node) === true
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const commit = useCallback(
    (idx: number) => {
      const opt = options[idx]
      if (opt === undefined) return
      onChange(opt.value)
      setOpen(false)
      buttonRef.current?.focus()
    },
    [options, onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (disabled === true) return
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setOpen(true)
        }
        return
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIdx((i) => Math.min(i + 1, options.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIdx((i) => Math.max(i - 1, 0))
          break
        case 'Home':
          e.preventDefault()
          setActiveIdx(0)
          break
        case 'End':
          e.preventDefault()
          setActiveIdx(options.length - 1)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          commit(activeIdx)
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          buttonRef.current?.focus()
          break
      }
    },
    [open, disabled, options.length, activeIdx, commit],
  )

  return (
    <div className="editor-select" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        className="editor-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? 'Selección'}
        disabled={disabled ?? false}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="editor-select__value">{displayLabel}</span>
        <span className="editor-select__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA combobox pattern requires listbox role on ul.
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA combobox pattern requires listbox role.
          role="listbox"
          className="editor-select__list"
          aria-activedescendant={`${id}-opt-${activeIdx}`}
          tabIndex={-1}
        >
          {options.map((opt, idx) => {
            const isActive = idx === activeIdx
            const isSelected = opt.value === value
            const cls = [
              'editor-select__option',
              isActive ? 'editor-select__option--active' : '',
              isSelected ? 'editor-select__option--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              // biome-ignore lint/a11y/useFocusableInteractive: focus managed via aria-activedescendant on the listbox.
              // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events are handled on the wrapping div via handleKeyDown.
              <li
                key={opt.value}
                id={`${id}-opt-${idx}`}
                // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA combobox option pattern.
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA combobox option pattern.
                role="option"
                aria-selected={isSelected}
                className={cls}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => commit(idx)}
              >
                <span className="editor-select__opt-label">{opt.label}</span>
                {opt.describe !== undefined && (
                  <span className="editor-select__opt-describe">{opt.describe}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
// ── FIN: Select ──
