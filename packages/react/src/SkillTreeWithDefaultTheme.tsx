'use client'

// ── INICIO: SkillTreeWithDefaultTheme ──
import type { JSX } from 'react'
import { SkillTree as SkillTreeCore, type SkillTreeProps } from './SkillTree.js'
import { ThemeProvider } from './ThemeProvider.js'
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
 * </ThemeProvider>`, o tema X **non** se aplica porque o wrapper
 * interno envolve incondicionalmente en `<ThemeProvider theme={minimal}>`.
 * Para temas custom, importar `SkillTree` desde `/headless` e envolver
 * explicitamente con `<ThemeProvider theme={customTheme}>`.
 */
export function SkillTreeWithDefaultTheme(props: SkillTreeProps): JSX.Element {
  return (
    <ThemeProvider theme={minimal}>
      <SkillTreeCore {...props} />
    </ThemeProvider>
  )
}
// ── FIN: SkillTreeWithDefaultTheme ──
