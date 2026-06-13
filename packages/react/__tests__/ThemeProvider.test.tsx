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
// ── FIN: tests ThemeProvider ──
