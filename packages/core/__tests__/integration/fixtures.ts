// ── INICIO: fixtures de integración (1.18) ──
// Helpers para construír TreeDefs ricos e variados para os tests de
// integración. Diferenciados dos mocks unitarios: aquí usamos tipos
// realistas do schema Zod (small/notable/root, dependency, exclusion...)
// para que toda árbore PASE polo round-trip toJSON ↔ fromJSON sen tropezar
// co contrato de validación de entrada non confiable.
//
// Convencións:
// - SCHEMA_VERSION '1.0.0' (alineada con common/constants).
// - Cero `any`. TreeDef nominal directo (interface importada).
// - Fixtures inválidos: construídos como unknown e devoltos como string
//   JSON ou como obxecto cru; nunca casteados a TreeDef.

import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, Resource, TreeDef, UnlockRule } from '../../src/types/index.js'

// ── Helpers atómicos ──

/** Constrúe un NodeDef coa forma mínima válida polo schema. */
export function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    type: 'small',
    label: id,
    ...overrides,
  }
}

/** NodeDef raíz: type 'root'. */
export function makeRoot(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    type: 'root',
    label: id,
    ...overrides,
  }
}

/** EdgeDef de dependencia entre dous nodos. */
export function makeEdge(
  id: string,
  source: string,
  target: string,
  overrides?: Partial<EdgeDef>,
): EdgeDef {
  return {
    id,
    source,
    target,
    type: 'dependency',
    ...overrides,
  }
}

/** Recurso simple, refundable ao 100% por defecto. */
export function makeResource(id: string, overrides?: Partial<Resource>): Resource {
  return {
    id,
    label: id,
    initial: 100,
    refundable: true,
    refundPercent: 100,
    ...overrides,
  }
}

// ── TreeDef base e fixtures completos ──

/** TreeDef mínimo válido (sen nodos). Útil para tests negativos. */
export function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'minimal-tree',
    schemaVersion: SCHEMA_VERSION,
    version: '1.0.0',
    label: 'Minimal',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/**
 * TreeDef rico de exemplo "skill tree" cunha raíz, dous nodos de tier 1, un
 * keystone con custo elevado e exclusión, varios prerequisites encadeados,
 * e dous grupos. Pasa o Zod schema sen tocalo (round-trip seguro).
 *
 * Estrutura conceptual:
 *
 *         root
 *        /    \
 *       a      b
 *       |      |
 *       c      d   (c e d son mutuamente excluíntes)
 *        \    /
 *         keystone (require c OU d)
 */
export function makeRichTreeDef(): TreeDef {
  const xp = makeResource('xp', { initial: 50, label: { gl: 'XP', en: 'XP' } })
  const sp = makeResource('sp', { initial: 5, label: { gl: 'Puntos', en: 'Points' } })

  const root = makeRoot('root', { label: { gl: 'Coroa', en: 'Crown' } })

  const a = makeNode('a', {
    cost: [{ resourceId: 'xp', amount: 5 }],
    prerequisites: { type: 'node_unlocked', nodeId: 'root' } satisfies UnlockRule,
  })
  const b = makeNode('b', {
    cost: [{ resourceId: 'xp', amount: 5 }],
    prerequisites: { type: 'node_unlocked', nodeId: 'root' } satisfies UnlockRule,
  })
  const c = makeNode('c', {
    type: 'notable',
    cost: [{ resourceId: 'xp', amount: 10 }],
    prerequisites: { type: 'node_unlocked', nodeId: 'a' } satisfies UnlockRule,
    exclusions: ['d'],
  })
  const d = makeNode('d', {
    type: 'notable',
    cost: [{ resourceId: 'xp', amount: 10 }],
    prerequisites: { type: 'node_unlocked', nodeId: 'b' } satisfies UnlockRule,
    exclusions: ['c'],
  })
  const keystone = makeNode('keystone', {
    type: 'keystone',
    cost: [
      { resourceId: 'xp', amount: 20 },
      { resourceId: 'sp', amount: 1 },
    ],
    prerequisites: {
      type: 'any',
      conditions: [
        { type: 'node_unlocked', nodeId: 'c' },
        { type: 'node_unlocked', nodeId: 'd' },
      ],
    } satisfies UnlockRule,
  })

  return {
    id: 'rich-tree',
    schemaVersion: SCHEMA_VERSION,
    version: '1.0.0',
    label: { gl: 'Árbore rica', en: 'Rich tree' },
    rootNodeId: 'root',
    nodes: [root, a, b, c, d, keystone],
    edges: [
      makeEdge('e-root-a', 'root', 'a'),
      makeEdge('e-root-b', 'root', 'b'),
      makeEdge('e-a-c', 'a', 'c'),
      makeEdge('e-b-d', 'b', 'd'),
      makeEdge('e-c-keystone', 'c', 'keystone'),
      makeEdge('e-d-keystone', 'd', 'keystone'),
    ],
    groups: [
      {
        id: 'g-left',
        label: { gl: 'Rama esquerda', en: 'Left branch' },
        nodeIds: ['a', 'c'],
      },
      {
        id: 'g-right',
        label: { gl: 'Rama dereita', en: 'Right branch' },
        nodeIds: ['b', 'd'],
      },
    ],
    resources: [xp, sp],
    startingBudget: { resources: { xp: 50, sp: 5 } },
    layout: { type: 'radial', radius: 200 },
  }
}

/** TreeDef cun único nodo multi-tier (maxTier=3) e custos escalados. */
export function makeMultiTierTreeDef(): TreeDef {
  return {
    id: 'multi-tier-tree',
    schemaVersion: SCHEMA_VERSION,
    version: '1.0.0',
    label: 'Multi tier',
    nodes: [
      makeNode('mt', {
        type: 'mastery',
        maxTier: 3,
        cost: [{ resourceId: 'xp', amount: 5 }],
        costPerTier: [
          [{ resourceId: 'xp', amount: 5 }],
          [{ resourceId: 'xp', amount: 10 }],
          [{ resourceId: 'xp', amount: 15 }],
        ],
      }),
    ],
    edges: [],
    resources: [makeResource('xp', { initial: 100 })],
    startingBudget: { resources: { xp: 100 } },
    layout: { type: 'radial' },
  }
}

/** TreeDef con prerequisites encadeados longos (a→b→c→d). */
export function makeChainedPrereqTreeDef(): TreeDef {
  return {
    id: 'chained-tree',
    schemaVersion: SCHEMA_VERSION,
    version: '1.0.0',
    label: 'Chained',
    nodes: [
      makeNode('a', { cost: [{ resourceId: 'xp', amount: 1 }] }),
      makeNode('b', {
        cost: [{ resourceId: 'xp', amount: 1 }],
        prerequisites: { type: 'node_unlocked', nodeId: 'a' },
      }),
      makeNode('c', {
        cost: [{ resourceId: 'xp', amount: 1 }],
        prerequisites: { type: 'node_unlocked', nodeId: 'b' },
      }),
      makeNode('d', {
        cost: [{ resourceId: 'xp', amount: 1 }],
        prerequisites: { type: 'node_unlocked', nodeId: 'c' },
      }),
    ],
    edges: [makeEdge('e-ab', 'a', 'b'), makeEdge('e-bc', 'b', 'c'), makeEdge('e-cd', 'c', 'd')],
    resources: [makeResource('xp', { initial: 10 })],
    startingBudget: { resources: { xp: 10 } },
    layout: { type: 'tree' },
  }
}

// ── Variantes inválidas / non confiables ──
// Construídas como JSON strings ou obxectos crus; nunca casteados a TreeDef.

/** JSON sintacticamente inválido. */
export const malformedJson = '{{{ non é JSON válido'

/** JSON válido pero estruturalmente non é TreeDef (falta nodes, edges...). */
export const structurallyInvalidJson = JSON.stringify({ id: 'x', other: 'stuff' })

/** JSON con schemaVersion non soportada. */
export function jsonWithBadSchemaVersion(): string {
  const def = makeMinimalTreeDef()
  return JSON.stringify({ ...def, schemaVersion: '99.0.0' })
}

/** JSON con NodeType non recoñecido polo schema Zod. */
export function jsonWithUnknownNodeType(): string {
  const def = makeMinimalTreeDef()
  // 'passive' non está no nodeTypeSchema; usamos un obxecto cru.
  return JSON.stringify({
    ...def,
    nodes: [{ id: 'x', type: 'passive', label: 'X' }],
  })
}
// ── FIN: fixtures de integración (1.18) ──
