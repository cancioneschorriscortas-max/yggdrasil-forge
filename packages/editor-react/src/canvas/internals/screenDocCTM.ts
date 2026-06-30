// ── INICIO: screenDocCTM ──
// Conversión screen↔doc usando o **mesmo CTM do <svg> que renderiza o
// SkillTree**. Iso é determinista: a UI de hit-test e o overlay
// aliñan EXACTAMENTE co render do SkillTree porque comparten o CTM.
//
// **Cicatriz A.6.39/40**: en versións anteriores tentouse adiviñar
// a matriz (panX/panY/zoom replicado) e iso derivaba ata uns pocos
// pixels off. Co CTM real, cero adivinanza.
//
// Banco (futuro): expoñer screenToWorld/worldToScreen no
// `SkillTreeHandle` de @react. Iso permitiría non consultar o DOM.
// Mentres tanto, buscar o <svg> dentro do container é o v1 pragmático.

import type { Position } from '@yggdrasil-forge/core'

/**
 * Localiza o `<svg>` do SkillTree dentro dun container. Garante que
 * existe un só (o do SkillTree); se houbera máis, devolve o primeiro
 * (suficiente porque o SkillTree pinta nun único <svg> raíz).
 */
export function findCanvasSvg(container: HTMLElement | null): SVGSVGElement | null {
  if (container === null) return null
  return container.querySelector('svg')
}

/** Punto en coordenadas de pantalla (cliente). */
export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

/**
 * Converte un punto screen-space (clientX/clientY do PointerEvent) a
 * doc-space usando o `getScreenCTM().inverse()` do SVG.
 *
 * Devolve null se o SVG non está montado ou non ten CTM dispoñible.
 */
export function screenToDoc(svg: SVGSVGElement, screen: ScreenPoint): Position | null {
  // jsdom non implementa getScreenCTM (devolve undefined ou tira); guard.
  if (typeof svg.getScreenCTM !== 'function') return null
  const ctm = svg.getScreenCTM()
  if (ctm === null) return null
  const pt = svg.createSVGPoint()
  pt.x = screen.x
  pt.y = screen.y
  const dp = pt.matrixTransform(ctm.inverse())
  return { x: dp.x, y: dp.y }
}

/** Inversa: doc-space → screen-space. Usado polo Overlay para pintar. */
export function docToScreen(svg: SVGSVGElement, doc: Position): ScreenPoint | null {
  // jsdom non implementa getScreenCTM (devolve undefined ou tira); guard.
  if (typeof svg.getScreenCTM !== 'function') return null
  const ctm = svg.getScreenCTM()
  if (ctm === null) return null
  const pt = svg.createSVGPoint()
  pt.x = doc.x
  pt.y = doc.y
  const sp = pt.matrixTransform(ctm)
  return { x: sp.x, y: sp.y }
}
// ── FIN: screenDocCTM ──
