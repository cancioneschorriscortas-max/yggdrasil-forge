// ── INICIO: MeshGenerator función pura ──
import type { Position } from '../../types/node.js'
import type { MeshElement } from './LayoutResult.js'
import type { MeshType, RadialLayoutConfig } from './RadialLayoutConfig.js'

/**
 * Xera elementos visuais auxiliares para un RadialLayout.
 *
 * Outputs por `meshType`:
 * - `'none'`: array baleiro (cero elementos).
 * - `'rings'`: un círculo por nivel da árbore.
 * - `'cross'`: dúas liñas (horizontal + vertical) cruzando o centro.
 * - `'star'`: N radios desde o centro (N = número de roots).
 *
 * Adicionalmente, se `config.polygon` está definido, engade o
 * polígono perimetral independentemente do `meshType`.
 *
 * Función pura: cero efectos secundarios, cero asincronía.
 */
export function generateMesh(
  meshType: MeshType,
  config: RadialLayoutConfig,
  centerX: number,
  centerY: number,
  ringRadii: readonly number[],
  nodeLevels: ReadonlyMap<string, number>,
  startAngle: number,
): readonly MeshElement[] {
  const elements: MeshElement[] = []

  // Polígono perimetral (independente do meshType)
  if (config.polygon !== undefined) {
    elements.push(buildPolygon(config.polygon, centerX, centerY))
  }

  switch (meshType) {
    case 'none':
      // Cero elementos adicionais.
      break

    case 'rings':
      for (const radius of ringRadii) {
        elements.push({
          type: 'circle',
          center: { x: centerX, y: centerY },
          radius,
        })
      }
      break

    case 'cross': {
      // Calcular extensión: max ringRadius ou polygon radius
      const maxR = Math.max(
        ...(ringRadii.length > 0 ? ringRadii : [0]),
        config.polygon?.radius ?? 0,
      )
      if (maxR > 0) {
        elements.push({
          type: 'line',
          from: { x: centerX - maxR, y: centerY },
          to: { x: centerX + maxR, y: centerY },
        })
        elements.push({
          type: 'line',
          from: { x: centerX, y: centerY - maxR },
          to: { x: centerX, y: centerY + maxR },
        })
      }
      break
    }

    case 'star': {
      // N radios desde centro, N = número de roots (nodos de nivel 0)
      let rootsCount = 0
      for (const level of nodeLevels.values()) {
        if (level === 0) rootsCount++
      }
      const maxR = Math.max(
        ...(ringRadii.length > 0 ? ringRadii : [0]),
        config.polygon?.radius ?? 0,
      )
      if (maxR > 0 && rootsCount > 0) {
        for (let i = 0; i < rootsCount; i++) {
          const angle = startAngle + i * ((2 * Math.PI) / Math.max(rootsCount, 1))
          elements.push({
            type: 'line',
            from: { x: centerX, y: centerY },
            to: {
              x: centerX + maxR * Math.cos(angle),
              y: centerY + maxR * Math.sin(angle),
            },
          })
        }
      }
      break
    }
  }

  return elements
}

/** Constrúe un polígono regular como MeshElement. */
function buildPolygon(
  polygon: { readonly sides: number; readonly radius: number },
  centerX: number,
  centerY: number,
): MeshElement {
  const points: Position[] = []
  for (let i = 0; i < polygon.sides; i++) {
    const angle = -Math.PI / 2 + i * ((2 * Math.PI) / polygon.sides)
    points.push({
      x: centerX + polygon.radius * Math.cos(angle),
      y: centerY + polygon.radius * Math.sin(angle),
    })
  }
  return { type: 'polygon', points }
}
// ── FIN: MeshGenerator función pura ──
