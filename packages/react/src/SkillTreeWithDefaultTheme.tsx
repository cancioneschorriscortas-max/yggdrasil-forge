'use client'

// ── INICIO: SkillTreeWithDefaultTheme ──
import { type ForwardedRef, forwardRef } from 'react'
import {
  SkillTree as SkillTreeCore,
  type SkillTreeHandle,
  type SkillTreeProps,
} from './SkillTree.js'
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
 *
 * F10.6: tamén reenvía o `ref` (SkillTreeHandle) ao SkillTreeCore para
 * que consumidores poidan controlar o viewport imperativamente.
 */
export const SkillTreeWithDefaultTheme = forwardRef<SkillTreeHandle, SkillTreeProps>(
  function SkillTreeWithDefaultTheme(props, ref: ForwardedRef<SkillTreeHandle>) {
    // Respecta un ThemeProvider ascendente; só aplica `minimal` se non o hai.
    const ascendantTheme = useTheme()
    if (ascendantTheme !== null) {
      return <SkillTreeCore ref={ref} {...props} />
    }
    return (
      <ThemeProvider theme={minimal}>
        <SkillTreeCore ref={ref} {...props} />
      </ThemeProvider>
    )
  },
)
// ── FIN: SkillTreeWithDefaultTheme ──
