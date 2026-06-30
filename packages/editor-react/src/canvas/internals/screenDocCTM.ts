// ── INICIO: screenDocCTM ──
// Conversión screen↔doc usando o **mesmo CTM do elemento que ten o
// transform pan/zoom do SkillTree**. Iso é determinista: a UI de
// hit-test e o overlay aliñan EXACTAMENTE co render do SkillTree
// porque comparten o CTM.
//
// **★ Cicatriz importante (review visual de Agarfal, 7.5b-ii)**:
// inicialmente collíamos o CTM do `<svg>` raíz. Pero o SkillTree
// aplica o transform pan/zoom nun `<g>` INTERNO dentro do <svg>
// (SVGRenderer:253). Polo tanto getScreenCTM() do <svg> raíz **non
// inclúe** ese transform → o overlay debuxaba aneis/ghosts en
// doc-coords directos (sin escalar nin trasladar), o que daba aneis
// orfos lonxe dos nodos ao facer zoom.
//
// **Solución**: usar o CTM do `<g>` co transform. Atópase como o
// primeiro <g> descendente do <svg> raíz (estrutura estable do
// SVGRenderer).
//
// Banco (futuro): expoñer screenToWorld/worldToScreen no
// `SkillTreeHandle` de @react para non ter que consultar o DOM.

import type { Position } from '@yggdrasil-forge/core'

/**
 * Localiza o `<g>` co transform pan/zoom do SkillTree dentro dun
 * container. Estrutura do SVGRenderer: `<svg><defs/><g transform=...>...</g></svg>`.
 * Polo tanto buscamos o primeiro `<g>` descendente do `<svg>`.
 *
 * Devolve null se aínda non está montado.
 */
export function findCanvasCtmElement(container: HTMLElement | null): SVGGraphicsElement | null {
  if (container === null) return null
  const svg = container.querySelector('svg')
  if (svg === null) return null
  // querySelector('g') devolve o primeiro <g> descendente en orde de
  // documento; ese é o <g transform=...> do SVGRenderer.
  return svg.querySelector('g')
}

/** Punto en coordenadas de pantalla (cliente). */
export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

/**
 * Converte un punto screen-space (clientX/clientY do PointerEvent) a
 * doc-space usando o `getScreenCTM().inverse()` do elemento que ten o
 * transform pan/zoom.
 *
 * Devolve null se o CTM non está dispoñible (caso jsdom; tampouco no
 * primeiro paint antes do montaxe completo).
 */
export function screenToDoc(ctmEl: SVGGraphicsElement, screen: ScreenPoint): Position | null {
  // jsdom non implementa getScreenCTM; guard.
  if (typeof ctmEl.getScreenCTM !== 'function') return null
  const ctm = ctmEl.getScreenCTM()
  if (ctm === null) return null
  // ownerSVGElement é onde vive createSVGPoint(); se non está dispoñible,
  // significa que o elemento aínda non foi inserido no DOM.
  const svg = ctmEl.ownerSVGElement
  if (svg === null) return null
  const pt = svg.createSVGPoint()
  pt.x = screen.x
  pt.y = screen.y
  const dp = pt.matrixTransform(ctm.inverse())
  return { x: dp.x, y: dp.y }
}

/** Inversa: doc-space → screen-space. Usado polo Overlay para pintar. */
export function docToScreen(ctmEl: SVGGraphicsElement, doc: Position): ScreenPoint | null {
  if (typeof ctmEl.getScreenCTM !== 'function') return null
  const ctm = ctmEl.getScreenCTM()
  if (ctm === null) return null
  const svg = ctmEl.ownerSVGElement
  if (svg === null) return null
  const pt = svg.createSVGPoint()
  pt.x = doc.x
  pt.y = doc.y
  const sp = pt.matrixTransform(ctm)
  return { x: sp.x, y: sp.y }
}

/**
 * Devolve o factor de escala (zoom) do CTM actual. **Necesario para o
 * Overlay**: aneis e ghosts deben crecer/decrecer co zoom (igual que
 * os nodos no SkillTree, que están dentro do mesmo transform). Sin
 * isto, ao facer zoom os aneis quedan do mesmo tamaño en pixels
 * mentres os nodos se fan grandes/pequenos.
 *
 * CTM convencional 2D: matrix(a, b, c, d, e, f). Escala uniforme = a
 * (asumindo que SkillTree non aplica skew/rotate; o transform é só
 * translate+scale uniforme).
 */
export function getCtmScale(ctmEl: SVGGraphicsElement): number {
  if (typeof ctmEl.getScreenCTM !== 'function') return 1
  const ctm = ctmEl.getScreenCTM()
  if (ctm === null) return 1
  return ctm.a
}
// ── FIN: screenDocCTM ──
