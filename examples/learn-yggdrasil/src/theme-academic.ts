// ── INICIO: tema académico (light, papel + sepia/teal) ──
//
// Demostra:
//   - Tema custom distinto do `minimal` (azul/ámbar/verde) e do Paladín (dark).
//   - O token opt-in `theme.sizes.maxLabelChars` (recén aterrado en @react).
//     Con `maxLabelChars: 14`, etiquetas longas como "unlock / canUnlock"
//     truncaranse a "unlock / can…" con tooltip nativo do <title> SVG.
//
// Aplícase envolvendo `<ThemeProvider theme={academic}>` arredor do
// `<SkillTree>` (que respecta o ThemeProvider ascendente automáticamente).

import type { Theme } from '@yggdrasil-forge/react'

export const academic: Theme = {
  colors: {
    text: '#1f2933',
    nodeLocked: '#d6d3cb',
    nodeUnlockable: '#f3e7c6',
    nodeUnlocked: '#2c6e8f',
    nodeMaxed: '#9a6b3f',
    nodeInProgress: '#5b8c5a',
    nodeStroke: '#7a7468',
    edge: '#c2bcae',
    edgeActive: '#7a7468',
    mesh: '#ece8df',
    nodeFill: '#faf8f2',
  },
  sizes: {
    strokeWidth: 1.5,
    fontSize: 14,
    fontSizeSmall: 11,
    ringWidth: 2.5,
    maxLabelChars: 14,
  },
}
// ── FIN: tema académico ──
