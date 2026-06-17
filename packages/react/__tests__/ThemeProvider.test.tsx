import { render } from '@testing-library/react'
// ── INICIO: tests ThemeProvider ──
import { describe, expect, it } from 'vitest'
import { ThemeContext, ThemeProvider, useTheme } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'
import { minimal } from '../src/themes/minimal.js'

/** Compoñente test que expón o resultado de useTheme. */
function ThemeConsumer({ onTheme }: { readonly onTheme: (t: Theme | null) => void }): null {
  const theme = useTheme()
  onTheme(theme)
  return null
}

describe('ThemeProvider', () => {
  it('provee tema aos descendentes', () => {
    let captured: Theme | null = null
    render(
      <ThemeProvider theme={minimal}>
        <ThemeConsumer
          onTheme={(t) => {
            captured = t
          }}
        />
      </ThemeProvider>,
    )
    expect(captured).toBe(minimal)
  })

  it('useTheme sen Provider devolve null', () => {
    let captured: Theme | null = 'sentinel' as unknown as Theme | null
    render(
      <ThemeConsumer
        onTheme={(t) => {
          captured = t
        }}
      />,
    )
    expect(captured).toBeNull()
  })

  it('ThemeProvider aniñado: o interior gaña', () => {
    const inner: Theme = {
      colors: {
        ...minimal.colors,
        text: '#ff0000',
      },
      sizes: minimal.sizes,
    }
    let captured: Theme | null = null
    render(
      <ThemeProvider theme={minimal}>
        <ThemeProvider theme={inner}>
          <ThemeConsumer
            onTheme={(t) => {
              captured = t
            }}
          />
        </ThemeProvider>
      </ThemeProvider>,
    )
    expect(captured).toBe(inner)
    expect(captured?.colors.text).toBe('#ff0000')
  })

  it('cambio do prop theme actualiza descendentes', () => {
    const themes: (Theme | null)[] = []
    const { rerender } = render(
      <ThemeProvider theme={minimal}>
        <ThemeConsumer
          onTheme={(t) => {
            themes.push(t)
          }}
        />
      </ThemeProvider>,
    )
    const updated: Theme = {
      colors: { ...minimal.colors, text: '#00ff00' },
      sizes: minimal.sizes,
    }
    rerender(
      <ThemeProvider theme={updated}>
        <ThemeConsumer
          onTheme={(t) => {
            themes.push(t)
          }}
        />
      </ThemeProvider>,
    )
    expect(themes.length).toBeGreaterThanOrEqual(2)
    expect(themes[themes.length - 1]?.colors.text).toBe('#00ff00')
  })

  it('ThemeContext exportado para uso interno', () => {
    expect(ThemeContext).toBeDefined()
    expect(typeof ThemeContext).toBe('object')
  })

  it('ThemeProvider con children undefined renderiza cero contido sen crash', () => {
    const { container } = render(<ThemeProvider theme={minimal} />)
    expect(container.innerHTML).toBe('')
  })
})

// ── Bloque novo (F10.3.fix-2): singleton cross-bundle ──
describe('ThemeContext — singleton cross-bundle (F10.3.fix-2)', () => {
  it('Symbol.for resolve á mesma instancia entre dúas lecturas', () => {
    const key = Symbol.for('@yggdrasil-forge/react#ThemeContext')
    // Symbol.for é deterministic por descrición; ambas chamadas devolven o
    // MESMO símbolo, polo que apuntan á MESMA propiedade en globalThis.
    const key2 = Symbol.for('@yggdrasil-forge/react#ThemeContext')
    expect(key).toBe(key2)
  })

  it('ThemeContext rexístrase en globalThis baixo o Symbol.for esperado', () => {
    const key = Symbol.for('@yggdrasil-forge/react#ThemeContext')
    // O propio import xa debería ter rexistrado o Context en globalThis.
    // Por construción: cargar este módulo cre/recupera ThemeContext desde
    // globalThis[key]. Verificamos que existe e é === ao export.
    const stored = (globalThis as unknown as Record<symbol, unknown>)[key]
    expect(stored).toBeDefined()
    expect(stored).toBe(ThemeContext)
  })

  it('NOTA: este test só verifica estabilidade en mesmo grafo de módulos', () => {
    // Vitest comparte o grafo de módulos entre tests, polo que NON pode
    // reproducir o bug real de bundling (dous bundles separados con
    // copias distintas de createContext). O test serve de documentación
    // e regresión do mecanismo singleton; o bug orixinal só se reproduce
    // en runtime con dous bundles distintos cargados pola mesma página.
    expect(true).toBe(true)
  })
})

// ── Bloque novo (F10.3.fix-2): /headless re-exports ──
describe('headless — re-exports de tematización (F10.3.fix-2)', () => {
  it('/headless re-exporta ThemeProvider', async () => {
    const headless = await import('../src/headless.js')
    expect(headless.ThemeProvider).toBe(ThemeProvider)
  })

  it('/headless NON re-exporta minimal (segue autoload-only de /index)', async () => {
    const headless = (await import('../src/headless.js')) as Record<string, unknown>
    expect('minimal' in headless).toBe(false)
  })
})
// ── FIN: tests ThemeProvider ──
