import { act, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
// ── INICIO: tests SkillTreeErrorBoundary ──
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SkillTreeErrorBoundary } from '../src/SkillTreeErrorBoundary.js'

function ThrowingComponent({ shouldThrow }: { readonly shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div data-testid="ok">OK</div>
}

describe('SkillTreeErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza children sen erro', () => {
    const { container } = render(
      <SkillTreeErrorBoundary fallback={<span data-testid="fb">FB</span>}>
        <ThrowingComponent shouldThrow={false} />
      </SkillTreeErrorBoundary>,
    )
    expect(container.querySelector('[data-testid="ok"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="fb"]')).toBeNull()
  })

  it('renderiza fallback ReactNode tras erro', () => {
    const { container } = render(
      <SkillTreeErrorBoundary fallback={<span data-testid="fb2">FB</span>}>
        <ThrowingComponent shouldThrow={true} />
      </SkillTreeErrorBoundary>,
    )
    expect(container.querySelector('[data-testid="fb2"]')).not.toBeNull()
  })

  it('renderiza fallback function (render prop)', () => {
    const { container } = render(
      <SkillTreeErrorBoundary
        fallback={(error) => <span data-testid="fb-fn">Erro: {error.message}</span>}
      >
        <ThrowingComponent shouldThrow={true} />
      </SkillTreeErrorBoundary>,
    )
    const el = container.querySelector('[data-testid="fb-fn"]')
    expect(el).not.toBeNull()
    expect(el?.textContent).toBe('Erro: Test error')
  })

  it('onError callback chámase con error + errorInfo', () => {
    const onError = vi.fn()
    render(
      <SkillTreeErrorBoundary fallback={<span>FB</span>} onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </SkillTreeErrorBoundary>,
    )
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    )
  })

  it('reset() restaura estado normal', () => {
    let resetFn: (() => void) | undefined
    const Wrapper = ({ shouldThrow }: { readonly shouldThrow: boolean }) => (
      <SkillTreeErrorBoundary
        fallback={(error, reset) => {
          resetFn = reset
          return (
            <div data-testid="fb-reset">
              <span>Erro: {error.message}</span>
            </div>
          )
        }}
      >
        <ThrowingComponent shouldThrow={shouldThrow} />
      </SkillTreeErrorBoundary>
    )

    const { container, rerender } = render(<Wrapper shouldThrow={true} />)
    expect(container.querySelector('[data-testid="fb-reset"]')).not.toBeNull()

    // Rerender con shouldThrow=false e chamar reset
    rerender(<Wrapper shouldThrow={false} />)
    act(() => {
      if (resetFn) resetFn()
    })

    expect(container.querySelector('[data-testid="ok"]')).not.toBeNull()
  })

  it('cero onError non rompe o boundary', () => {
    const { container } = render(
      <SkillTreeErrorBoundary fallback={<span data-testid="fb-safe">FB</span>}>
        <ThrowingComponent shouldThrow={true} />
      </SkillTreeErrorBoundary>,
    )
    expect(container.querySelector('[data-testid="fb-safe"]')).not.toBeNull()
  })

  it('SSR-safety: renderToString sen erro renderiza children', () => {
    const html = renderToString(
      <SkillTreeErrorBoundary fallback={<span>FB</span>}>
        <div>OK</div>
      </SkillTreeErrorBoundary>,
    )
    expect(html).toContain('OK')
  })
})
// ── FIN: tests SkillTreeErrorBoundary ──
