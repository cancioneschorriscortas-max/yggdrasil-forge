import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, TreeDef } from '@yggdrasil-forge/core'

// ── Helpers (manteñen os datos lexibles) ────────────────────────────

/** Lección simple. `needs` engade un único prereq node_unlocked. */
function lesson(id: string, label: string, needs?: string): NodeDef {
  const base: NodeDef = { id, type: 'small', label: { en: label } }
  return needs === undefined
    ? base
    : { ...base, prerequisites: { type: 'node_unlocked', nodeId: needs } }
}

/** Edge de dependencia entre dous nodos. */
function edge(source: string, target: string): EdgeDef {
  return { id: `${source}__${target}`, source, target, type: 'dependency' }
}

/**
 * Andamio común a toda (sub)árbore.
 * - `startingBudget` fai os unlocks gratuítos (clic-para-completar).
 * - As sub-árbores usan layout `tree` (top-down). O espazado é xeneroso
 *   porque o motor coloca nodos pero NON mide o ancho das etiquetas
 *   (minLabelSpacing aínda non está no solver); con pouco espazo, as
 *   etiquetas de nodos irmáns solápanse.
 */
function scaffold(id: string, label: string): Omit<TreeDef, 'nodes' | 'edges' | 'subtrees'> {
  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    version: '1.0.0',
    label: { en: label },
    layout: { type: 'tree', nodeSpacing: 180, levelSpacing: 150 },
    startingBudget: { resources: { xp: 999 } },
    resources: [{ id: 'xp', label: { en: 'XP' }, refundable: true, refundPercent: 100 }],
  }
}

// ── Nivel 2: Trees (anidado dentro de Data Structures) ──────────────
const trees: TreeDef = {
  ...scaffold('trees', 'Trees'),
  nodes: [
    lesson('binary-tree', 'Binary tree'),
    lesson('bst', 'Binary search tree', 'binary-tree'),
    lesson('traversal', 'Traversal', 'bst'),
  ],
  edges: [edge('binary-tree', 'bst'), edge('bst', 'traversal')],
}

// ── Nivel 1: os catro módulos ───────────────────────────────────────
const fundamentals: TreeDef = {
  ...scaffold('fundamentals', 'Fundamentals'),
  nodes: [
    lesson('variables', 'Variables'),
    lesson('control-flow', 'Control flow', 'variables'),
    lesson('functions', 'Functions', 'control-flow'),
  ],
  edges: [edge('variables', 'control-flow'), edge('control-flow', 'functions')],
}

const dataStructures: TreeDef = {
  ...scaffold('data-structures', 'Data Structures'),
  nodes: [
    lesson('arrays', 'Arrays'),
    lesson('maps', 'Maps', 'arrays'),
    {
      id: 'trees-anchor',
      type: 'subtree_anchor',
      label: { en: 'Trees (nested)' },
      subtreeId: 'trees',
      prerequisites: { type: 'node_unlocked', nodeId: 'arrays' },
    },
    {
      id: 'ds-capstone',
      type: 'keystone',
      label: { en: 'DS capstone' },
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'maps' },
          { type: 'subtree_completion', subtreeId: 'trees', percent: 100 },
        ],
      },
    },
  ],
  edges: [edge('arrays', 'maps'), edge('arrays', 'trees-anchor'), edge('maps', 'ds-capstone')],
  subtrees: { trees },
}

const algorithms: TreeDef = {
  ...scaffold('algorithms', 'Algorithms'),
  nodes: [
    lesson('sorting', 'Sorting'),
    lesson('searching', 'Searching', 'sorting'),
    lesson('big-o', 'Big-O notation', 'searching'),
  ],
  edges: [edge('sorting', 'searching'), edge('searching', 'big-o')],
}

const web: TreeDef = {
  ...scaffold('web', 'Web'),
  nodes: [lesson('html', 'HTML'), lesson('css', 'CSS', 'html'), lesson('http', 'HTTP', 'html')],
  edges: [edge('html', 'css'), edge('html', 'http')],
}

// ── Nivel 0: o curso ────────────────────────────────────────────────
// Layout `custom`: o curso é un DAG con converxencia (Capstone ten dous
// pais: Algorithms + Web). O layout `tree` apilaría Capstone no mesmo
// nivel ca Algorithms; con `custom` colocámolo a man nun diamante limpo,
// con espazo dabondo para que as etiquetas non se solapen.
export const curriculumDef: TreeDef = {
  ...scaffold('programming-101', 'Programming 101'),
  layout: { type: 'custom' },
  nodes: [
    {
      id: 'mod-fundamentals',
      type: 'subtree_anchor',
      label: { en: 'Fundamentals' },
      subtreeId: 'fundamentals',
      position: { x: 300, y: 40 },
    },
    {
      id: 'mod-data-structures',
      type: 'subtree_anchor',
      label: { en: 'Data Structures' },
      subtreeId: 'data-structures',
      position: { x: 150, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 },
    },
    {
      id: 'mod-web',
      type: 'subtree_anchor',
      label: { en: 'Web' },
      subtreeId: 'web',
      position: { x: 450, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 },
    },
    {
      id: 'mod-algorithms',
      type: 'subtree_anchor',
      label: { en: 'Algorithms' },
      subtreeId: 'algorithms',
      position: { x: 150, y: 380 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'data-structures', percent: 100 },
    },
    {
      id: 'capstone',
      type: 'keystone',
      label: { en: 'Capstone project' },
      position: { x: 300, y: 540 },
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'subtree_completion', subtreeId: 'algorithms', percent: 100 },
          { type: 'subtree_completion', subtreeId: 'web', percent: 100 },
        ],
      },
    },
  ],
  edges: [
    edge('mod-fundamentals', 'mod-data-structures'),
    edge('mod-fundamentals', 'mod-web'),
    edge('mod-data-structures', 'mod-algorithms'),
    edge('mod-algorithms', 'capstone'),
    edge('mod-web', 'capstone'),
  ],
  subtrees: { fundamentals, 'data-structures': dataStructures, algorithms, web },
}
