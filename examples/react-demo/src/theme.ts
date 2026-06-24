import type { Theme } from '@yggdrasil-forge/react'

/**
 * Tema demo neutro/claro para F10.3 (estilo plano-adaptativo).
 *
 * - Background: textura `/bg/fondo.png` cun veo escuro lixeiro para
 *   contraste do dourado (F11.3c). O tema é o lugar correcto:
 *   SVGRenderer aplica `colors.background` inline no <svg>, e o inline
 *   manda sobre calquera regra CSS no `.canvas-zone`.
 * - Text: dark slate (lexible sobre fill claro).
 * - Anel por estado (modelo plano sen glow):
 *   - locked: slate medio (visible pero "morto")
 *   - unlockable: amber (podes desbloquealo)
 *   - unlocked: emerald (desbloqueado)
 *   - maxed: blue (maxed/superado)
 *   - in_progress: orange
 * - Edges: slate clara, sutil.
 *
 * Mantemos o nome do export como `dragonborn` polo binding actual no App.tsx;
 * o look dark-fantasy real será un tema custom en sub-fase futura.
 * Valores afinaranse no visual check.
 */
export const dragonborn: Theme = {
  colors: {
    background:
      "linear-gradient(rgba(10, 8, 16, 0.35), rgba(10, 8, 16, 0.35)), url('/bg/fondo.png') center / cover no-repeat",
    text: '#2a2730',
    nodeLocked: '#9ca3af',
    nodeUnlockable: '#f59e0b',
    nodeUnlocked: '#10b981',
    nodeMaxed: '#3b82f6',
    nodeInProgress: '#f97316',
    nodeStroke: '#9ca3af',
    edge: '#cbd5e1',
    mesh: 'rgba(148, 163, 184, 0.08)',
  },
  sizes: {
    strokeWidth: 2.5,
    fontSize: 14,
    fontSizeSmall: 11,
  },
}
