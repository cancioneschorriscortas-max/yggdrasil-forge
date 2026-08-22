// ── INICIO: useMenuKeyboard (auto-2, Fase 16.4 teclado/ARIA) ──
// Patrón WAI-ARIA «menu button» para os tres menús do editor
// (Ficheiro, Paneis, Dispor), que xa tiñan roles correctos e peche por
// Escape/clic fóra pero NON navegación por teclado: abrir non movía o
// foco, as frechas non facían nada e Escape deixaba o foco perdido.
//
// Contrato (só activo mentres `open`):
//   - Ao abrir: foco á primeira entrada non desactivada.
//   - ArrowDown/ArrowUp: seguinte/anterior con volta; Home/End: extremos.
//   - Escape: pecha E devolve o foco ao trigger (`[aria-haspopup]`).
//   - Tab: pecha (o foco segue o seu curso natural).
// Os clics e Enter/Espazo seguen sendo os nativos dos <button>.

import { type RefObject, useEffect } from 'react'

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])'

function itemsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
}

export function useMenuKeyboard(
  open: boolean,
  menuRef: RefObject<HTMLElement | null>,
  close: () => void,
): void {
  useEffect(() => {
    if (!open) return undefined
    const root = menuRef.current
    if (root === null) return undefined

    // Foco inicial: primeira entrada (o menú acaba de montarse).
    itemsOf(root)[0]?.focus()

    const handleKey = (e: KeyboardEvent): void => {
      const items = itemsOf(root)
      if (items.length === 0) return
      const current = items.indexOf(document.activeElement as HTMLElement)
      const focusAt = (i: number): void => {
        e.preventDefault()
        items[(i + items.length) % items.length]?.focus()
      }
      switch (e.key) {
        case 'ArrowDown':
          focusAt(current + 1)
          break
        case 'ArrowUp':
          focusAt(current - 1)
          break
        case 'Home':
          focusAt(0)
          break
        case 'End':
          focusAt(items.length - 1)
          break
        case 'Escape': {
          close()
          root.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
          break
        }
        case 'Tab':
          close()
          break
        default:
          break
      }
    }
    root.addEventListener('keydown', handleKey)
    return () => root.removeEventListener('keydown', handleKey)
  }, [open, menuRef, close])
}
// ── FIN: useMenuKeyboard ──
