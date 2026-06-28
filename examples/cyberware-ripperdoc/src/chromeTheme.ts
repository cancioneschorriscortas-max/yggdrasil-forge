// ── INICIO: chromeTheme (cyberpunk Theme) ──
// Cores e tipografía do showcase. Os tokens de estado son os reais
// expostos por ThemeColors: nodeLocked / nodeUnlockable / nodeUnlocked /
// nodeMaxed / selected (opcional). Verificado contra theme-types.ts.

import type { Theme } from '@yggdrasil-forge/react'

export const chromeTheme: Theme = {
  colors: {
    background: '#06121a',
    surface: '#0a1620',
    text: '#c8dde0',
    icon: '#1ad0e0',
    // estados (todos os requiridos)
    nodeLocked: '#566075',
    nodeUnlockable: '#2dd4d4',
    nodeUnlocked: '#2dd4d4',
    nodeMaxed: '#1ad0e0',
    nodeInProgress: '#5fc8c8',
    nodeStroke: '#1ad0e0',
    edge: '#1ad0e0',
    edgeActive: '#2dd4d4',
    mesh: '#1ad0e0',
    selected: '#f0a830',
    // Fill do corpo dos nodos (por defecto turquesa escuro; por estado).
    nodeFill: '#0f2530',
    nodeFillLocked: '#1a2230',
    nodeFillUnlockable: '#0f2530',
    nodeFillUnlocked: '#0f3540',
    nodeFillMaxed: '#0f4550',
    nodeFillInProgress: '#0f3540',
  },
  sizes: {
    strokeWidth: 1.5,
    fontSize: 12,
    fontSizeSmall: 10,
    ringWidth: 2,
  },
  typography: {
    fontFamily: "'Share Tech Mono', monospace",
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
}
// ── FIN: chromeTheme ──
