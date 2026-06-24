// ── INICIO: tests de ClusteredRadialLayout ──
import { describe, expect, it } from 'vitest'
import { ClusteredRadialLayout } from '../../../src/engine/layouts/ClusteredRadialLayout.js'
import type { EdgeDef } from '../../../src/types/edge.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { GroupDef, TreeDef } from '../../../src/types/tree.js'

/** TreeDef mínimo cunha config válida. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'cr-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Clustered-radial Test',
    nodes: [],
    edges: [],
    layout: { type: 'clustered-radial', groupRadius: 200 },
    ...overrides,
  }
}

/** Helper: nodo mínimo, opcionalmente con group. */
function n(id: string, group?: string): NodeDef {
  return {
    id,
    type: 'skill',
    label: id,
    ...(group !== undefined ? { group } : {}),
  }
}

/** Helper: edge mínimo. */
function e(id: string, source: string, target: string): EdgeDef {
  return { id, source, target }
}

/** Helper: GroupDef mínimo. */
function g(id: string, overrides?: Partial<GroupDef>): GroupDef {
  return { id, label: id, ...overrides }
}

const TWO_PI = 2 * Math.PI

describe('ClusteredRadialLayout', () => {
  it('layout type é "clustered-radial"', () => {
    const layout = new ClusteredRadialLayout()
    expect(layout.type).toBe('clustered-radial')
  })

  it('config inválido: propaga o err do parser', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: { type: 'clustered-radial', groupRadius: -1 },
    })
    const r = layout.compute(treeDef)
    expect(isErr(r)).toBe(true)
  })

  it('árbore baleira: nodes/edges baleiros, bounds (0,0,0,0)', () => {
    const layout = new ClusteredRadialLayout()
    const r = layout.compute(makeTreeDef())
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.nodes.size).toBe(0)
    expect(v.edges.size).toBe(0)
    expect(v.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
    expect(v.layoutType).toBe('clustered-radial')
    // sen mesh nun caso baleiro
    expect(v.mesh).toBeUndefined()
  })

  it('só raíz: posición = centro, sen clusters', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'root',
      nodes: [n('root')],
    })
    const r = layout.compute(treeDef)
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.nodes.size).toBe(1)
    expect(v.nodes.get('root')).toEqual({ x: 0, y: 0 })
    expect(v.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
    // Sen membros => sen spokes
    expect(v.mesh).toBeUndefined()
  })

  it('1 grupo / 1 membro: membro colocado en θ (rama M===1)', () => {
    const layout = new ClusteredRadialLayout()
    // groupRadius 100, orbitRadius 50, startAngle 0 (eixe X+)
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        orbitRadius: 50,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1')],
      groups: [g('g1')],
    })
    const r = layout.compute(treeDef)
    const v = unwrap(r)
    const pos = v.nodes.get('a')
    expect(pos).toBeDefined()
    // groupPoint = (100, 0); member en mesma dirección => (150, 0)
    expect(pos?.x).toBeCloseTo(150, 6)
    expect(pos?.y).toBeCloseTo(0, 6)
  })

  it('1 grupo / varios membros: cada un en posición distinta (abano)', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        orbitRadius: 50,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1'), n('c', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const a = v.nodes.get('a')
    const b = v.nodes.get('b')
    const c = v.nodes.get('c')
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(c).toBeDefined()
    // Os tres son distintos entre si
    expect(a).not.toEqual(b)
    expect(b).not.toEqual(c)
    expect(a).not.toEqual(c)
  })

  it('N grupos: ángulos uniformes a startAngle + i·(2π/N)', () => {
    const layout = new ClusteredRadialLayout()
    // 4 grupos cada un cun membro só, para ler `groupPoint` directamente
    // a partir do membro (M===1 → φ === θ; pos = groupPoint + orbit·dir(θ),
    // que aínda así está aliñado co θ do grupo).
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        orbitRadius: 0.0001, // case-cero para ler θ do grupo
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g2'), n('c', 'g3'), n('d', 'g4')],
      groups: [g('g1'), g('g2'), g('g3'), g('g4')],
    })
    const v = unwrap(layout.compute(treeDef))
    // Comproba que cada membro está aproximadamente á distancia
    // groupRadius do centro (porque orbit é case 0 e M===1).
    const dist = (id: string): number => {
      const p = v.nodes.get(id) ?? { x: 0, y: 0 }
      return Math.hypot(p.x, p.y)
    }
    expect(dist('a')).toBeCloseTo(100, 2)
    expect(dist('b')).toBeCloseTo(100, 2)
    expect(dist('c')).toBeCloseTo(100, 2)
    expect(dist('d')).toBeCloseTo(100, 2)
    // Os ángulos están separados ~π/2
    const ang = (id: string): number => {
      const p = v.nodes.get(id) ?? { x: 0, y: 0 }
      return Math.atan2(p.y, p.x)
    }
    const angA = ang('a')
    const angB = ang('b')
    const diff = ((angB - angA) % TWO_PI) + TWO_PI
    expect(diff % TWO_PI).toBeCloseTo(Math.PI / 2, 3)
  })

  it('pertenza vía node.group + group.nodeIds (unha soa vez se duplicado)', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      // 'a' pertence vía node.group; 'b' pertence vía group.nodeIds;
      // 'a' tamén está en nodeIds (debe contar UNHA vez).
      nodes: [n('r'), n('a', 'g1'), n('b'), n('c', 'g2')],
      groups: [g('g1', { nodeIds: ['a', 'b'] }), g('g2')],
    })
    const v = unwrap(layout.compute(treeDef))
    expect(v.nodes.size).toBe(4) // root + a + b + c
    // Ambos a e b están colocados (nun cluster)
    expect(v.nodes.get('a')).toBeDefined()
    expect(v.nodes.get('b')).toBeDefined()
    expect(v.nodes.get('c')).toBeDefined()
  })

  it('non-agrupados: cluster implícito __ungrouped__', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      // 'orphan' non está en ningún grupo nin é raíz
      nodes: [n('r'), n('a', 'g1'), n('orphan')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    // Coloca o orphan nalgún sitio (cluster implícito).
    expect(v.nodes.get('orphan')).toBeDefined()
  })

  it('sen grupos, con nodos: fallback nun cluster (todos non-raíz)', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: [n('r'), n('a'), n('b'), n('c')],
      // sen `groups`
    })
    const v = unwrap(layout.compute(treeDef))
    expect(v.nodes.size).toBe(4) // raíz + 3 non-raíz
    expect(v.nodes.get('a')).toBeDefined()
    expect(v.nodes.get('b')).toBeDefined()
    expect(v.nodes.get('c')).toBeDefined()
  })

  it("meshType default 'spokes': liñas centro→grupo, unha por cluster", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g2')],
      groups: [g('g1'), g('g2')],
    })
    const v = unwrap(layout.compute(treeDef))
    expect(v.mesh).toBeDefined()
    const lines = (v.mesh ?? []).filter((m) => m.type === 'line')
    expect(lines).toHaveLength(2) // 2 clusters
  })

  it("meshType 'none': cero mesh", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: { type: 'clustered-radial', groupRadius: 100, meshType: 'none' },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    expect(v.mesh).toBeUndefined()
  })

  it('edges de dato: posicionados (source/target)', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1')],
      edges: [e('e1', 'a', 'b')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const path = v.edges.get('e1')
    expect(path).toBeDefined()
    expect(path?.points).toHaveLength(2)
    // source = posición de 'a'; target = posición de 'b'
    expect(path?.points[0]).toEqual(v.nodes.get('a'))
    expect(path?.points[1]).toEqual(v.nodes.get('b'))
  })

  it('edges con nodos descoñecidos: usa ZERO (defensivo en ambos extremos)', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1')],
      // 'ghost' falta como target nun edge, e como source noutro.
      edges: [e('e_target_ghost', 'a', 'ghost'), e('e_source_ghost', 'ghost', 'a')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const t = v.edges.get('e_target_ghost')
    const s = v.edges.get('e_source_ghost')
    expect(t).toBeDefined()
    expect(s).toBeDefined()
    // target descoñecido → punto2 = ZERO
    expect(t?.points[1]).toEqual({ x: 0, y: 0 })
    // source descoñecido → punto1 = ZERO
    expect(s?.points[0]).toEqual({ x: 0, y: 0 })
  })

  it('sen edges: edges baleiro (panadeiro-like)', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    expect(v.edges.size).toBe(0)
  })

  it('defaults aplícanse: sen orbitRadius/centerX/startAngle, posicións consistentes', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: { type: 'clustered-radial', groupRadius: 100 }, // só obrigatorio
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    // raíz en (0,0) por defecto, primeiro grupo en startAngle = -π/2 ("arriba")
    expect(v.nodes.get('r')).toEqual({ x: 0, y: 0 })
    // O membro está aliñado co eixe Y- (arriba): x ≈ 0, y negativa
    const pos = v.nodes.get('a')
    expect(pos).toBeDefined()
    expect(pos?.x).toBeCloseTo(0, 6)
    expect(pos?.y).toBeLessThan(0)
  })

  it('rootNodeId definido pero non-existente: trátase como sen raíz', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'ghost-root',
      nodes: [n('a', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    // 'ghost-root' non está nas posicións
    expect(v.nodes.has('ghost-root')).toBe(false)
    // 'a' colócase de todas as maneiras (non é raíz)
    expect(v.nodes.get('a')).toBeDefined()
  })

  it('bounds: envolvente das posicións cando hai membros', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g2')],
      groups: [g('g1'), g('g2')],
    })
    const v = unwrap(layout.compute(treeDef))
    // bounds finitas e razoables
    expect(Number.isFinite(v.bounds.minX)).toBe(true)
    expect(Number.isFinite(v.bounds.maxX)).toBe(true)
    expect(v.bounds.maxX).toBeGreaterThanOrEqual(v.bounds.minX)
    expect(v.bounds.maxY).toBeGreaterThanOrEqual(v.bounds.minY)
  })

  it('recolocación: trocar identity ↔ clustered-radial recoloca sen tocar datos', () => {
    const layout = new ClusteredRadialLayout()
    const baseNodes = [n('r'), n('a', 'g1'), n('b', 'g2')]
    const baseEdges: EdgeDef[] = [e('e1', 'a', 'b')]
    const groupsArr = [g('g1'), g('g2')]
    const treeDef = makeTreeDef({
      rootNodeId: 'r',
      nodes: baseNodes,
      edges: baseEdges,
      groups: groupsArr,
    })
    const v1 = unwrap(layout.compute(treeDef))
    // Os datos do treeDef (nodes/edges/groups) son os mesmos referencialmente.
    expect(treeDef.nodes).toBe(baseNodes)
    expect(treeDef.edges).toBe(baseEdges)
    expect(treeDef.groups).toBe(groupsArr)
    // E o motor produciu posicións (recoloca).
    expect(v1.nodes.size).toBeGreaterThan(0)
  })

  // ── F11.2b / 2b-bis: memberLayout: 'list' (columna vertical growOutward) ──

  it("memberLayout 'list' grupo 'no eixe X' (lado): dir = +1 (abaixo)", () => {
    const layout = new ClusteredRadialLayout()
    // 1 grupo en θ=0, groupPoint=(300, 0). centerY=0, polo que
    // groupPoint.y === centerY → dir = +1 (cara abaixo por defecto).
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 300,
        memberLayout: 'list',
        rowGap: 50,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1'), n('c', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const pa = v.nodes.get('a')
    const pb = v.nodes.get('b')
    const pc = v.nodes.get('c')
    // Mesmo x (= groupPoint.x = 300), ys crecentes (50, 100, 150)
    expect(pa?.x).toBeCloseTo(300, 6)
    expect(pb?.x).toBeCloseTo(300, 6)
    expect(pc?.x).toBeCloseTo(300, 6)
    expect(pa?.y).toBeCloseTo(50, 6)
    expect(pb?.y).toBeCloseTo(100, 6)
    expect(pc?.y).toBeCloseTo(150, 6)
  })

  it("memberLayout 'list' growOutward: grupo 'arriba' → cara arriba (dir = -1)", () => {
    const layout = new ClusteredRadialLayout()
    // groupRadius pequeno + columna alta: en 2b expandíase effGroupRadius;
    // en 2b-bis non, porque growOutward elimina o motivo. Comprobamos
    // que ningún membro se achega ao centro (todos teñen y < groupPoint.y).
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        memberLayout: 'list',
        rowGap: 40,
        startAngle: -Math.PI / 2, // arriba → groupPoint.y ≈ -100
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('m1', 'g1'), n('m2', 'g1'), n('m3', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const m1 = v.nodes.get('m1')
    const m2 = v.nodes.get('m2')
    const m3 = v.nodes.get('m3')
    // groupPoint.y ≈ -100. Cara arriba: y vai aínda máis negativo.
    // m1 = -100 + 1*40*(-1) = -140, m2 = -180, m3 = -220
    expect(m1?.y).toBeCloseTo(-140, 6)
    expect(m2?.y).toBeCloseTo(-180, 6)
    expect(m3?.y).toBeCloseTo(-220, 6)
    // Ningún membro se achega ao centro máis ca o groupPoint:
    // |m_k.y| > |groupPoint.y| para todos k.
    expect(Math.abs(m1?.y ?? 0)).toBeGreaterThan(100)
    expect(Math.abs(m3?.y ?? 0)).toBeGreaterThan(100)
  })

  it("memberLayout 'list' growOutward: grupo 'abaixo' → cara abaixo (dir = +1)", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        memberLayout: 'list',
        rowGap: 40,
        startAngle: Math.PI / 2, // abaixo → groupPoint.y ≈ +100
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('m1', 'g1'), n('m2', 'g1'), n('m3', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const m1 = v.nodes.get('m1')
    const m3 = v.nodes.get('m3')
    expect(m1?.y).toBeCloseTo(140, 6)
    expect(m3?.y).toBeCloseTo(220, 6)
    // Afastándose monotónicamente
    expect((m3?.y ?? 0) > (m1?.y ?? 0)).toBe(true)
  })

  it("memberLayout 'list' growOutward: ningún membro se achega ao centro", () => {
    const layout = new ClusteredRadialLayout()
    // 4 grupos en cardinais (E, N, W, S) — comprobamos que para cada
    // membro, a distancia ao centro >= distancia do seu groupPoint.
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 200,
        memberLayout: 'list',
        rowGap: 30,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g2'), n('c', 'g3'), n('d', 'g4')],
      groups: [g('g1'), g('g2'), g('g3'), g('g4')],
    })
    const v = unwrap(layout.compute(treeDef))
    // Para cada membro, |pos - center| >= |groupPoint - center|.
    // Como o groupPoint está a groupRadius=200 do centro, e a columna
    // estende cara afóra, todos os membros están en y máis afastado.
    for (const [_, id] of [
      [0, 'a'],
      [1, 'b'],
      [2, 'c'],
      [3, 'd'],
    ] as const) {
      const pos = v.nodes.get(id)
      expect(pos).toBeDefined()
      const dist = Math.hypot(pos?.x ?? 0, pos?.y ?? 0)
      // O groupPoint do grupo correspondente está a 200. Cada membro
      // engade rowGap cara afóra, polo que dist >= 200 (cara abaixo
      // sumando o componente y; mira a maior compoñente).
      expect(dist).toBeGreaterThanOrEqual(200)
    }
  })

  it("memberLayout 'list': columna segue vertical (mesmo x)", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 200,
        memberLayout: 'list',
        rowGap: 30,
        startAngle: -Math.PI / 2,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1'), n('c', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const xs = new Set([v.nodes.get('a')?.x, v.nodes.get('b')?.x, v.nodes.get('c')?.x])
    expect(xs.size).toBe(1) // todos os membros mesmo x
  })

  it("memberLayout 'list': paso entre membros consecutivos == rowGap", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 200,
        memberLayout: 'list',
        rowGap: 37, // valor non-trivial
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1'), n('c', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const ya = v.nodes.get('a')?.y ?? 0
    const yb = v.nodes.get('b')?.y ?? 0
    const yc = v.nodes.get('c')?.y ?? 0
    expect(Math.abs(yb - ya)).toBeCloseTo(37, 6)
    expect(Math.abs(yc - yb)).toBeCloseTo(37, 6)
  })

  it("memberLayout 'list' con N grupos: cada columna na súa posición radial", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 500,
        memberLayout: 'list',
        rowGap: 40,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1'), n('c', 'g2'), n('d', 'g3')],
      groups: [g('g1'), g('g2'), g('g3')],
    })
    const v = unwrap(layout.compute(treeDef))
    // Todas as posicións dos membros son distintas
    const positions = [v.nodes.get('a'), v.nodes.get('b'), v.nodes.get('c'), v.nodes.get('d')]
    for (const p of positions) expect(p).toBeDefined()
    const xs = new Set(positions.map((p) => p?.x))
    // 'a' e 'b' comparten x (mesmo grupo); 'c' e 'd' distintos.
    expect(xs.size).toBeGreaterThanOrEqual(3)
  })

  it("memberLayout 'list' mantén spokes (mesh = un por cluster)", () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 300,
        memberLayout: 'list',
        rowGap: 40,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g2')],
      groups: [g('g1'), g('g2')],
    })
    const v = unwrap(layout.compute(treeDef))
    const lines = (v.mesh ?? []).filter((m) => m.type === 'line')
    expect(lines).toHaveLength(2)
  })

  it("regresión: sen memberLayout (default 'fan') equivale a 2a", () => {
    const layout = new ClusteredRadialLayout()
    // Fixture controlada: comprobamos que a posición de 'a' co default
    // coincide coa fórmula do fan de 2a (groupPoint + orbit·dir(θ)).
    const treeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        orbitRadius: 50,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1')],
      groups: [g('g1')],
    })
    const v = unwrap(layout.compute(treeDef))
    const a = v.nodes.get('a')
    // groupPoint = (100, 0); con M===1, phi == theta == 0; pos = (150, 0)
    expect(a?.x).toBeCloseTo(150, 6)
    expect(a?.y).toBeCloseTo(0, 6)
  })

  it("regresión: memberLayout 'fan' explícito = mesma colocación que default", () => {
    const layout = new ClusteredRadialLayout()
    const baseTreeDef = makeTreeDef({
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        orbitRadius: 50,
        startAngle: 0,
      },
      rootNodeId: 'r',
      nodes: [n('r'), n('a', 'g1'), n('b', 'g1')],
      groups: [g('g1')],
    })
    const fanExplicit = makeTreeDef({
      ...baseTreeDef,
      layout: {
        type: 'clustered-radial',
        groupRadius: 100,
        orbitRadius: 50,
        startAngle: 0,
        memberLayout: 'fan',
      },
    })
    const vDefault = unwrap(layout.compute(baseTreeDef))
    const vExplicit = unwrap(layout.compute(fanExplicit))
    expect(vDefault.nodes.get('a')).toEqual(vExplicit.nodes.get('a'))
    expect(vDefault.nodes.get('b')).toEqual(vExplicit.nodes.get('b'))
  })
})
// ── FIN: tests de ClusteredRadialLayout ──
