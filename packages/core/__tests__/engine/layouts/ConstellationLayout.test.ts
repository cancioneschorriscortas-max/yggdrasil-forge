// ── INICIO: tests de ConstellationLayout ──
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../../src/engine/TreeEngine.js'
import { ClusteredRadialLayout } from '../../../src/engine/layouts/ClusteredRadialLayout.js'
import { ConstellationLayout } from '../../../src/engine/layouts/ConstellationLayout.js'
import { IdentityLayout } from '../../../src/engine/layouts/IdentityLayout.js'
import { LayoutEngineRegistry } from '../../../src/engine/layouts/LayoutEngineRegistry.js'
import { RadialLayout } from '../../../src/engine/layouts/RadialLayout.js'
import { TreeLayout } from '../../../src/engine/layouts/TreeLayout.js'
import { computeLayout } from '../../../src/engine/layouts/computeLayout.js'
import type { EdgeDef } from '../../../src/types/edge.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { GroupDef, TreeDef } from '../../../src/types/tree.js'

/** TreeDef mínimo cunha config válida. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'constellation-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Constellation Test',
    nodes: [],
    edges: [],
    layout: { type: 'constellation' },
    ...overrides,
  }
}

/** Helper: nodo mínimo, opcionalmente con group e tipo. */
function n(id: string, group?: string, type: NodeDef['type'] = 'small'): NodeDef {
  return {
    id,
    type,
    label: id,
    ...(group !== undefined ? { group } : {}),
  }
}

/** Helper: edge mínimo. */
function e(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'path' }
}

/** Helper: GroupDef mínimo. */
function g(id: string, overrides?: Partial<GroupDef>): GroupDef {
  return { id, label: id, ...overrides }
}

/**
 * Fixture "Panadeiro-like": 1 raíz + 5 clusters: catro con 4 membros, un
 * con 3 (Materia Prima en miniatura). Sen edges semánticos (o
 * consumidor adoita derivalas con topoloxía 'chain', pero o layout NON
 * as necesita para posicionar).
 */
function panadeiroLikeTreeDef(layoutOverrides: Record<string, unknown> = {}): TreeDef {
  const groups: GroupDef[] = [
    g('forno'),
    g('tempos'),
    g('sabor'),
    g('resistencia'),
    g('materia'), // 3 membros — o cluster curto
  ]
  const nodes: NodeDef[] = [
    n('root', undefined, 'root'),
    // forno (4)
    n('forno_a', 'forno'),
    n('forno_b', 'forno'),
    n('forno_c', 'forno'),
    n('forno_d', 'forno'),
    // tempos (4)
    n('tempos_a', 'tempos'),
    n('tempos_b', 'tempos'),
    n('tempos_c', 'tempos'),
    n('tempos_d', 'tempos'),
    // sabor (4)
    n('sabor_a', 'sabor'),
    n('sabor_b', 'sabor'),
    n('sabor_c', 'sabor'),
    n('sabor_d', 'sabor'),
    // resistencia (4)
    n('resistencia_a', 'resistencia'),
    n('resistencia_b', 'resistencia'),
    n('resistencia_c', 'resistencia'),
    n('resistencia_d', 'resistencia'),
    // materia (3 — cluster curto)
    n('materia_a', 'materia'),
    n('materia_b', 'materia'),
    n('materia_c', 'materia'),
  ]
  return makeTreeDef({
    rootNodeId: 'root',
    nodes,
    edges: [],
    groups,
    layout: { type: 'constellation', ...layoutOverrides },
  })
}

/** Radio dunha posición respecto a (0,0). */
function r(p: { x: number; y: number }): number {
  return Math.hypot(p.x, p.y)
}

describe('ConstellationLayout', () => {
  describe('contrato básico', () => {
    it('layout type é "constellation"', () => {
      const layout = new ConstellationLayout()
      expect(layout.type).toBe('constellation')
    })

    it('árbore baleira: nodes/edges baleiros, bounds (0,0,0,0)', () => {
      const layout = new ConstellationLayout()
      const res = layout.compute(makeTreeDef())
      expect(isOk(res)).toBe(true)
      const v = unwrap(res)
      expect(v.nodes.size).toBe(0)
      expect(v.edges.size).toBe(0)
      expect(v.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
      expect(v.layoutType).toBe('constellation')
      expect(v.mesh).toBeUndefined()
    })

    it('só raíz: posición = centro, sen membros', () => {
      const layout = new ConstellationLayout()
      const res = layout.compute(
        makeTreeDef({ rootNodeId: 'root', nodes: [n('root', undefined, 'root')] }),
      )
      expect(isOk(res)).toBe(true)
      const v = unwrap(res)
      expect(v.nodes.size).toBe(1)
      expect(v.nodes.get('root')).toEqual({ x: 0, y: 0 })
    })
  })

  describe('validación de config', () => {
    it('shape "curve" rexéitase (v1 só "line")', () => {
      const layout = new ConstellationLayout()
      const res = layout.compute(makeTreeDef({ layout: { type: 'constellation', shape: 'curve' } }))
      expect(isErr(res)).toBe(true)
    })

    it('innerRadius <= 0 → err', () => {
      const layout = new ConstellationLayout()
      const res = layout.compute(makeTreeDef({ layout: { type: 'constellation', innerRadius: 0 } }))
      expect(isErr(res)).toBe(true)
    })

    it('outerRadius <= innerRadius → err', () => {
      const layout = new ConstellationLayout()
      const res = layout.compute(
        makeTreeDef({ layout: { type: 'constellation', innerRadius: 200, outerRadius: 100 } }),
      )
      expect(isErr(res)).toBe(true)
    })

    it('lengthMode descoñecido → err', () => {
      const layout = new ConstellationLayout()
      const res = layout.compute(
        makeTreeDef({ layout: { type: 'constellation', lengthMode: 'spiral' } }),
      )
      expect(isErr(res)).toBe(true)
    })
  })

  describe('posicionado radial (panadeiro-like)', () => {
    it('coroa no centro; ningún membro máis preto que innerRadius; todos ≤ outerRadius', () => {
      const layout = new ConstellationLayout()
      const def = panadeiroLikeTreeDef({ innerRadius: 90, outerRadius: 320 })
      const res = layout.compute(def)
      expect(isOk(res)).toBe(true)
      const v = unwrap(res)

      expect(v.nodes.get('root')).toEqual({ x: 0, y: 0 })

      for (const [id, pos] of v.nodes) {
        if (id === 'root') continue
        const ri = r(pos)
        expect(
          ri,
          `${id} debe ter r ≥ innerRadius (anti growOutward inverso)`,
        ).toBeGreaterThanOrEqual(90 - 1e-6)
        expect(ri, `${id} debe ter r ≤ outerRadius`).toBeLessThanOrEqual(320 + 1e-6)
      }
    })

    it('membros do mesmo cluster: r estrictamente crecente (do centro cara fóra)', () => {
      const layout = new ConstellationLayout()
      const def = panadeiroLikeTreeDef({ innerRadius: 90, outerRadius: 320 })
      const res = layout.compute(def)
      const v = unwrap(res)

      // forno (4 membros, orde a,b,c,d)
      const rs = ['forno_a', 'forno_b', 'forno_c', 'forno_d'].map((id) => {
        const p = v.nodes.get(id)
        if (p === undefined) throw new Error(`falta ${id}`)
        return r(p)
      })
      for (let i = 1; i < rs.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: array indexing inside known range
        expect(rs[i]!, `r crecente: r[${i}] > r[${i - 1}]`).toBeGreaterThan(rs[i - 1]!)
      }
    })

    it('clusters van en distintas direccións radiais (ángulos separados)', () => {
      const layout = new ConstellationLayout()
      const def = panadeiroLikeTreeDef()
      const res = layout.compute(def)
      const v = unwrap(res)

      // O primeiro membro (innerRadius) de cada cluster marca a dirección
      // do fío. Esperamos 5 ángulos distintos.
      const firstOfEach = ['forno_a', 'tempos_a', 'sabor_a', 'resistencia_a', 'materia_a']
      const angles = firstOfEach.map((id) => {
        const p = v.nodes.get(id)
        if (p === undefined) throw new Error(`falta ${id}`)
        return Math.atan2(p.y, p.x)
      })
      // Todos distintos (módulo 2π, tolerancia mínima).
      for (let i = 0; i < angles.length; i++) {
        for (let j = i + 1; j < angles.length; j++) {
          // biome-ignore lint/style/noNonNullAssertion: array indexing inside known range
          expect(Math.abs(angles[i]! - angles[j]!)).toBeGreaterThan(0.1)
        }
      }
    })
  })

  describe('lengthMode — equal-span vs fixed-step (aserto duro)', () => {
    it('equal-span: TODOS os clusters rematan en outerRadius (incluído o de 3)', () => {
      const layout = new ConstellationLayout()
      const def = panadeiroLikeTreeDef({
        innerRadius: 100,
        outerRadius: 300,
        lengthMode: 'equal-span',
      })
      const res = layout.compute(def)
      const v = unwrap(res)

      // Último membro de cada cluster (orde do fixture):
      // forno_d/tempos_d/sabor_d/resistencia_d para os de 4; materia_c para o de 3.
      const lastOfEach = ['forno_d', 'tempos_d', 'sabor_d', 'resistencia_d', 'materia_c']
      for (const id of lastOfEach) {
        const p = v.nodes.get(id)
        if (p === undefined) throw new Error(`falta ${id}`)
        expect(r(p), `${id} debe rematar a outerRadius=300 en equal-span`).toBeCloseTo(300, 5)
      }
    })

    it('fixed-step: cluster de 3 remata ANTES ca os de 4', () => {
      const layout = new ConstellationLayout()
      const def = panadeiroLikeTreeDef({
        innerRadius: 100,
        outerRadius: 300,
        lengthMode: 'fixed-step',
      })
      const res = layout.compute(def)
      const v = unwrap(res)

      // Kmax = 4; step = (300-100)/3 = 66.66...
      // Cluster de 4: último a innerRadius + 3*step = 300.
      // Cluster de 3: último a innerRadius + 2*step = ~233.33 (< 300).
      const forno_d = v.nodes.get('forno_d')
      const materia_c = v.nodes.get('materia_c')
      if (forno_d === undefined || materia_c === undefined) {
        throw new Error('faltan nodos esperados')
      }
      const rLong = r(forno_d)
      const rShort = r(materia_c)
      expect(rLong, 'cluster de 4 remata a outerRadius').toBeCloseTo(300, 5)
      expect(rShort, 'cluster de 3 remata antes').toBeLessThan(rLong - 10)
      // Tamén: paso constante → mesmo r para mesmo índice j en clusters
      // distintos (forno_a, tempos_a, etc. — todos a innerRadius=100).
      for (const id of ['forno_a', 'tempos_a', 'sabor_a', 'resistencia_a', 'materia_a']) {
        const p = v.nodes.get(id)
        if (p === undefined) throw new Error(`falta ${id}`)
        expect(r(p), `${id} (j=0) a innerRadius`).toBeCloseTo(100, 5)
      }
    })
  })

  describe('edges + integración', () => {
    it('result.edges constrúese cando hai treeDef.edges', () => {
      const layout = new ConstellationLayout()
      const def = panadeiroLikeTreeDef()
      // Topoloxía 'chain' simplificada para un cluster.
      const edges: EdgeDef[] = [
        e('e1', 'root', 'forno_a'),
        e('e2', 'forno_a', 'forno_b'),
        e('e3', 'forno_b', 'forno_c'),
      ]
      const defWithEdges: TreeDef = { ...def, edges }
      const res = layout.compute(defWithEdges)
      const v = unwrap(res)
      expect(v.edges.size).toBe(3)
      const e1 = v.edges.get('e1')
      if (e1 === undefined) throw new Error('falta e1')
      expect(e1.points.length).toBe(2)
      // O primeiro punto debe ser o root (centro), o segundo forno_a.
      expect(e1.points[0]).toEqual({ x: 0, y: 0 })
    })

    it('motor intacto (A.6.35): unlock x3 nun multi-tier segue indo', async () => {
      // Constrúese un microskill multi-tier sen prereqs; o layout non
      // toca o estado, polo que unlock debe ir x3 igual ca con calquera
      // outro layout.
      const nodes: NodeDef[] = [
        n('root', undefined, 'root'),
        // small multi-tier sen prereqs, maxTier 3
        { id: 'm1', type: 'small', label: 'm1', group: 'g', maxTier: 3 },
      ]
      const def = makeTreeDef({
        rootNodeId: 'root',
        nodes,
        edges: [],
        groups: [g('g')],
        layout: { type: 'constellation' },
      })
      const engine = new TreeEngine(def)
      const r1 = await engine.unlock('m1')
      expect(r1.ok, `t1: ${r1.ok ? '' : r1.error.message}`).toBe(true)
      const r2 = await engine.unlock('m1')
      expect(r2.ok, `t2: ${r2.ok ? '' : r2.error.message}`).toBe(true)
      const r3 = await engine.unlock('m1')
      expect(r3.ok, `t3: ${r3.ok ? '' : r3.error.message}`).toBe(true)
      expect(engine.getNodeState('m1')?.state).toBe('maxed')
    })

    it('computeLayout via registry con startAngle Math.PI/2 (voltear)', () => {
      const registry = new LayoutEngineRegistry()
        .register(new IdentityLayout())
        .register(new RadialLayout())
        .register(new TreeLayout())
        .register(new ClusteredRadialLayout())
        .register(new ConstellationLayout())

      const def = panadeiroLikeTreeDef({ startAngle: Math.PI / 2 })
      const res = computeLayout(def, registry, 'gl')
      expect(res.ok, `compute: ${res.ok ? '' : res.error.message}`).toBe(true)
      if (!res.ok) return
      // Sanidade: o primeiro membro do primeiro cluster debe estar
      // "abaixo" (y > 0) cando startAngle = +PI/2 (sin/cos quedan así).
      const firstMember = res.value.nodes.get('forno_a')
      if (firstMember === undefined) throw new Error('falta forno_a')
      expect(firstMember.y).toBeGreaterThan(0)
      expect(Math.abs(firstMember.x)).toBeLessThan(1e-6)
    })
  })
})
// ── FIN: tests de ConstellationLayout ──
