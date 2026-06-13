'use client'

// ── INICIO: ThemeProvider ──
import { type JSX, type ReactNode, createContext, useContext } from 'react'
import type { Theme } from './theme-types.js'

/**
 * Context que distribúe o tema activo aos compoñentes descendentes.
 *
 * **Default value `null`** indica "modo headless" (cero estilos
 * aplicados). O entry point principal de `@yggdrasil-forge/react`
 * envolve automáticamente `SkillTree` cun `ThemeProvider theme={minimal}`,
 * polo que o consumidor casual recibe o tema por defecto. Power
 * users importan desde `/headless` para cero autoload.
 *
 * @internal — Exportado para uso interno por `SVGRenderer` (vía
 * `useTheme`) e polo wrapper de root entry. NON exportado como API
 * pública porque o consumidor debería usar `ThemeProvider` (a
 * abstración).
 */
export const ThemeContext = createContext<Theme | null>(null)

export interface ThemeProviderProps {
  /** Tema a distribuír aos descendentes. */
  readonly theme: Theme

  /** Compoñentes filhos (tipicamente `<SkillTree>` ou similar). */
  readonly children?: ReactNode
}

/**
 * Provee un tema aos compoñentes descendentes. Sobrescribe calquera
 * tema ascendente. Cero animación de transición.
 *
 * Uso típico:
 * ```tsx
 * <ThemeProvider theme={oberon}>
 *   <SkillTree engine={engine} />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps): JSX.Element {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

/**
 * Hook interno que devolve o tema activo ou `null` (cero tema).
 *
 * @internal — Non exportado publicamente. Uso reservado a `SVGRenderer`.
 */
export function useTheme(): Theme | null {
  return useContext(ThemeContext)
}
// ── FIN: ThemeProvider ──
