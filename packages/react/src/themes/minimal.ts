// ── INICIO: minimal theme ──
import type { Theme } from '../theme-types.js'

/**
 * Tema "minimal": estética minimalista neutra para uso por defecto
 * cando o consumidor non especifica un tema vía `ThemeProvider`.
 *
 * Aplica cores grises e contraste razoable. Cero adornos. Útil para
 * primeira impresión e testing.
 *
 * Power users que queiran cero estilos importan desde
 * `@yggdrasil-forge/react/headless`.
 */
export const minimal: Theme = {
  colors: {
    text: '#222222',
    nodeLocked: '#cccccc',
    nodeUnlockable: '#e8e8e8',
    nodeUnlocked: '#4a90e2',
    nodeMaxed: '#f5a623',
    nodeInProgress: '#7ed321',
    // Decisión de design intencional (hixiene post-Fase 7):
    // Os estados `disabled` e `expired` NON teñen cor específica neste
    // tema "minimal" — caen no fallback ao color de `nodeLocked` polo
    // mecanismo de SVGRenderer. Consumidores que requirean cores
    // específicas inxectan tema custom vía <ThemeProvider theme={...}>.
    nodeStroke: '#555555',
    edge: '#999999',
    mesh: '#dddddd',
  },
  sizes: {
    strokeWidth: 2,
    fontSize: 14,
    fontSizeSmall: 11,
  },
}
// ── FIN: minimal theme ──
