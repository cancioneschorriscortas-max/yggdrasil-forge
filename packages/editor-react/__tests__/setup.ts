// ── INICIO: vitest setup — polyfills para jsdom ──
// jsdom non implementa ResizeObserver (que dockview-core usa
// internamente). Stub mínimo: callback rexístrase pero non se dispara
// (suficiente para os component tests do shell — non probamos
// resize behaviour).

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react@16 non auto-limpa con vitest; iso fai que
// múltiples tests no mesmo ficheiro deixen DOM residual e queries
// como getByRole/getByText devolvan multiple matches.
afterEach(() => {
  cleanup()
})

class ResizeObserverStub {
  observe(): void {
    /* no-op */
  }
  unobserve(): void {
    /* no-op */
  }
  disconnect(): void {
    /* no-op */
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: polyfill de DOM API.
  ;(globalThis as any).ResizeObserver = ResizeObserverStub
}

// dockview tamén usa requestAnimationFrame; jsdom inclúeo, pero por
// seguridade extra non lle facemos nada.

// matchMedia: jsdom non o ten por defecto.
if (typeof globalThis.matchMedia === 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: polyfill.
  ;(globalThis as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      /* no-op */
    },
    removeListener: () => {
      /* no-op */
    },
    addEventListener: () => {
      /* no-op */
    },
    removeEventListener: () => {
      /* no-op */
    },
    dispatchEvent: () => false,
  })
}
// ── FIN: vitest setup ──
