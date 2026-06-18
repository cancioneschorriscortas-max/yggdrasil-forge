// ── INICIO: tests edgeGeometry — shortenEdgeAtTarget (F10.4.fix-arrow) ──
import type { EdgePath } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { shortenEdgeAtTarget } from '../src/edgeGeometry.js'

describe('shortenEdgeAtTarget', () => {
  it('line vertical: move o último punto cara o anterior', () => {
    const path: EdgePath = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ],
      kind: 'line',
    }
    const result = shortenEdgeAtTarget(path, 20)
    expect(result.points.length).toBe(2)
    expect(result.points[0]).toEqual({ x: 0, y: 0 })
    expect(result.points[1]?.x).toBeCloseTo(0)
    expect(result.points[1]?.y).toBeCloseTo(80)
    expect(result.kind).toBe('line')
  })

  it('line diagonal: respecta a dirección', () => {
    const path: EdgePath = {
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 40 }, // distancia = 50
      ],
    }
    const result = shortenEdgeAtTarget(path, 10)
    expect(result.points[1]?.x).toBeCloseTo(24) // 30 * (40/50)
    expect(result.points[1]?.y).toBeCloseTo(32) // 40 * (40/50)
    expect(result.kind).toBeUndefined()
  })

  it('cubic: acorta P3 cara P2 (controla tanxente final)', () => {
    // P2=(90,50), P3=(100,100). dist = sqrt(10²+50²) ≈ 50.99
    const path: EdgePath = {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 50 },
        { x: 90, y: 50 },
        { x: 100, y: 100 },
      ],
      kind: 'cubic',
    }
    const result = shortenEdgeAtTarget(path, 7.07)
    expect(result.points.length).toBe(4)
    expect(result.points[0]).toEqual({ x: 0, y: 0 })
    expect(result.points[1]).toEqual({ x: 10, y: 50 })
    expect(result.points[2]).toEqual({ x: 90, y: 50 })
    // ratio = (50.99 - 7.07) / 50.99 ≈ 0.861
    // newX = 90 + 10 * 0.861 ≈ 98.61; newY = 50 + 50 * 0.861 ≈ 93.07
    expect(result.points[3]?.x).toBeCloseTo(98.61, 1)
    expect(result.points[3]?.y).toBeCloseTo(93.07, 1)
    expect(result.kind).toBe('cubic')
  })

  it('gap >= distancia: devolve o path inalterado', () => {
    const path: EdgePath = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
    }
    const result = shortenEdgeAtTarget(path, 50)
    expect(result).toBe(path)
  })

  it('gap <= 0: devolve o path inalterado', () => {
    const path: EdgePath = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ],
    }
    expect(shortenEdgeAtTarget(path, 0)).toBe(path)
    expect(shortenEdgeAtTarget(path, -5)).toBe(path)
  })

  it('puntos coincidentes (dist=0): devolve sen modificar', () => {
    const path: EdgePath = {
      points: [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
      ],
    }
    expect(shortenEdgeAtTarget(path, 10)).toBe(path)
  })

  it('só 1 punto: devolve sen modificar (defensivo)', () => {
    const path: EdgePath = { points: [{ x: 0, y: 0 }] }
    expect(shortenEdgeAtTarget(path, 10)).toBe(path)
  })

  it('polyline 3+ puntos: só toca o último', () => {
    const path: EdgePath = {
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 50 },
      ],
      kind: 'polyline',
    }
    const result = shortenEdgeAtTarget(path, 10)
    expect(result.points[0]).toEqual({ x: 0, y: 0 })
    expect(result.points[1]).toEqual({ x: 50, y: 50 })
    expect(result.points[2]?.x).toBeCloseTo(90)
    expect(result.points[2]?.y).toBeCloseTo(50)
    expect(result.kind).toBe('polyline')
  })
})
// ── FIN: tests edgeGeometry ──
