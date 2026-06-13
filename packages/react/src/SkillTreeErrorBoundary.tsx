'use client'

// ── INICIO: SkillTreeErrorBoundary ──
import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface SkillTreeErrorBoundaryProps {
  /** Children que se renderizan dentro do boundary. */
  readonly children: ReactNode

  /**
   * UI a renderizar cando un erro foi capturado. Pode ser:
   * - **ReactNode estático**: renderízase tal cual.
   * - **Function (render prop)**: recibe `(error, reset)` e devolve
   *   ReactNode para mostrar mensaxe + botón de retry.
   */
  readonly fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)

  /**
   * Callback opcional disparado en `componentDidCatch`. Útil para
   * logging (Sentry, console, OpenTelemetry, etc.).
   *
   * **Nota**: en modo dev de React, pode chamarse varias veces para
   * o mesmo erro.
   */
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface SkillTreeErrorBoundaryState {
  readonly error: Error | null
}

/**
 * Class component que captura erros lanzados durante o render dos
 * seus descendants e renderiza un fallback UI.
 *
 * **'use client' obrigatorio**: `componentDidCatch` e
 * `getDerivedStateFromError` requiren client-side execution.
 */
export class SkillTreeErrorBoundary extends Component<
  SkillTreeErrorBoundaryProps,
  SkillTreeErrorBoundaryState
> {
  constructor(props: SkillTreeErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
    this.reset = this.reset.bind(this)
  }

  /**
   * React lifecycle: devolve novo state cando un descendant lanza.
   */
  static getDerivedStateFromError(error: Error): SkillTreeErrorBoundaryState {
    return { error }
  }

  /**
   * React lifecycle: chamado tras render con state derivado do error.
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError !== undefined) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Restaura o boundary ao estado normal (children visibles de novo).
   */
  reset(): void {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error !== null) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(error, this.reset)
      }
      return fallback
    }
    return this.props.children
  }
}
// ── FIN: SkillTreeErrorBoundary ──
