// ── INICIO: Modal — overlay reutilizable usando <dialog> nativo ──
// Usamos o elemento HTML5 <dialog> para a11y nativa: showModal() bloquea
// a interacción co fondo, Escape pecha automaticamente, e o foco
// xestionase polo navegador. Engadimos clic-fóra (no propio <dialog>)
// como pechado adicional.
import type { JSX, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

export interface ModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Sincronizamos showModal/close co prop `open`.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Escape do dialog dispara 'cancel'; propagamos a onClose.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    function handleCancel(e: Event): void {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      onClick={(e) => {
        // Clic no backdrop (no propio elemento <dialog>, non nos fillos).
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        // Browser xestiona Escape vía 'cancel'; este handler é placebo
        // a11y para que Biome aprobe o onClick.
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="modal-box">
        <div className="modal-header">
          {title !== undefined && <h2 className="modal-title">{title}</h2>}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Pechar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  )
}
// ── FIN: Modal ──
