import type { Theme } from '@yggdrasil-forge/react'

/**
 * Tema custom "dragonborn" — dark fantasy palette inspirada en
 * Elder Scrolls / Path of Exile.
 *
 * - Background: transparent (delegamos ao CSS body gradient).
 * - Text: gold-cream para contraste sobre dark.
 * - Nodes locked: dark obsidian.
 * - Nodes unlockable: gold dim (con pulse animation via CSS).
 * - Nodes unlocked: rich gold (con glow via CSS drop-shadow).
 * - Edges: metallic muted.
 * - Mesh: barely-visible gold.
 */
export const dragonborn: Theme = {
  colors: {
    background: 'transparent',
    text: '#e6d5a8',
    nodeLocked: '#2a2520',
    nodeUnlockable: '#4a3f2a',
    nodeUnlocked: '#b8860b',
    nodeMaxed: '#e7a523',
    nodeInProgress: '#c07a3a',
    nodeStroke: '#daa520',
    edge: '#8c6e4b',
    mesh: 'rgba(218, 165, 32, 0.05)',
  },
  sizes: {
    strokeWidth: 2.5,
    fontSize: 14,
    fontSizeSmall: 11,
  },
}
