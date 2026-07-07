// ── INICIO: minimalDark theme ──
import type { Theme } from '../theme-types.js'

/**
 * Tema "minimalDark": mesma estética minimalista neutra de `minimal`,
 * pero con valores axustados para consumidores con **fondo escuro**
 * (F7.9). `minimal` asume fondo claro en todas as súas cores; usalo
 * sobre un canvas escuro deixa texto/arestas/malla case invisibles.
 *
 * Non é un "tema escuro completo" con personalidade propia — é a
 * base neutra equivalente a `minimal`, só que pensada para o outro
 * extremo do espectro claro/escuro. Igual que `minimal`, cero
 * adornos; útil como base cando o consumidor (ex. o editor, F7.8)
 * decide fondo escuro pero non quere impoñer un tema visual propio.
 *
 * `sizes` mantense **idéntico** a `minimal` a propósito (non hai
 * motivo para que radios/anchos/font-sizes cambien só por mudar de
 * fondo). Se `minimal.sizes` cambia no futuro, actualizar aquí tamén
 * para non desviar.
 */
export const minimalDark: Theme = {
  colors: {
    text: '#e8e9ea',
    nodeLocked: '#4a4e58',
    nodeUnlockable: '#7a8090',
    nodeUnlocked: '#5b9ee8',
    nodeMaxed: '#f5a623',
    nodeInProgress: '#7ed321',
    // Mesma decisión de design que `minimal` (hixiene post-Fase 7):
    // `disabled`/`expired` non teñen cor específica — caen a
    // `nodeLocked` polo mecanismo de SVGRenderer.
    nodeStroke: '#9aa0ab',
    edge: '#565b66',
    edgeActive: '#8b909a',
    mesh: '#24262c',
    nodeFill: '#1e2026',
  },
  sizes: {
    strokeWidth: 2,
    fontSize: 14,
    fontSizeSmall: 11,
    ringWidth: 3,
  },
}
// ── FIN: minimalDark theme ──
