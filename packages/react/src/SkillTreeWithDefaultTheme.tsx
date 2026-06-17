'use client'

// ── INICIO: SkillTreeWithDefaultTheme ──
import type { JSX } from 'react'
import { SkillTree as SkillTreeCore, type SkillTreeProps } from './SkillTree.js'
import { ThemeProvider, useTheme } from './ThemeProvider.js'
import { minimal } from './themes/minimal.js'

/**
 * Wrapper sobre `SkillTree` que aplica automáticamente o tema
 * `minimal` se non hai un `ThemeProvider` ascendente. Usado polo
 * root entry de `@yggdrasil-forge/react` para que consumidores
 * casuales obteñan estilos por defecto.
 *
 * Power users que queiran cero estilos importan desde
 * `@yggdrasil-forge/react/headless`.
 *
 * Se o consumidor envolve `<ThemeProvider theme={X}><SkillTree .../>
 * </ThemeProvider>`, o tema X **respéctase** (o wrapper detecta o tema
 * ascendente vía `useTheme` e non aplica `minimal`). Sen ThemeProvider
 * ascendente, aplícase `minimal` automaticamente.
 */
export function SkillTreeWithDefaultTheme(props: SkillTreeProps): JSX.Element {
  // Respecta un ThemeProvider ascendente; só aplica `minimal` se non o hai.
  const ascendantTheme = useTheme()
  if (ascendantTheme !== null) {
    return <SkillTreeCore {...props} />
  }
  return (
    <ThemeProvider theme={minimal}>
      <SkillTreeCore {...props} />
    </ThemeProvider>
  )
}
// ── FIN: SkillTreeWithDefaultTheme ──
