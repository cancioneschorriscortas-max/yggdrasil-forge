// ── INICIO: TreeDef do exemplo "Learn Yggdrasil Forge" ──
//
// Curso aniñado que ensina o propio motor. Forma:
//
//   learn-yggdrasil (custom layout, diamante)
//     ├─ core (subtree_anchor)         → subárbore Core concepts (tree)
//     │    └─ gates (subtree_anchor)   → subárbore Gates deep (tree, nivel-2)
//     ├─ react (subtree_anchor)        → subárbore React rendering (tree)
//     ├─ layouts (subtree_anchor)      → subárbore Layouts (tree)
//     ├─ nesting (subtree_anchor)      → subárbore Nesting & composition (tree)
//     └─ capstone (keystone)           → require todas as 4 subárbores ≥ 80%
//
// Portas (subtree_completion en escala 0-100):
//   react  ← core ≥ 80
//   layouts ← core ≥ 80
//   nesting ← all(react ≥ 80, layouts ≥ 80)
//   capstone ← all(core, react, layouts, nesting ≥ 80)

import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, TreeDef } from '@yggdrasil-forge/core'

// ── Helpers (idénticos en forma aos do curriculum) ──────────────────

function lesson(id: string, label: string, needs?: string): NodeDef {
  const base: NodeDef = { id, type: 'small', label: { en: label } }
  return needs === undefined
    ? base
    : { ...base, prerequisites: { type: 'node_unlocked', nodeId: needs } }
}

function edge(source: string, target: string): EdgeDef {
  return { id: `${source}__${target}`, source, target, type: 'dependency' }
}

/** Andamio para subárbores (todas usan `tree` layout con espazado lexible). */
function subtreeScaffold(id: string, label: string): Omit<TreeDef, 'nodes' | 'edges' | 'subtrees'> {
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

// ── Nivel 2: gates-deep (dentro de `core` → auto-demostración) ──────
const gatesDeep: TreeDef = {
  ...subtreeScaffold('gates-deep', 'Gates deep'),
  nodes: [
    lesson('subtree-completion', 'subtree_completion'),
    lesson('subtree-anchor', 'subtree_anchor', 'subtree-completion'),
    lesson('enter-subtree-l2', 'enterSubtree()', 'subtree-anchor'),
  ],
  edges: [edge('subtree-completion', 'subtree-anchor'), edge('subtree-anchor', 'enter-subtree-l2')],
}

// ── Nivel 1: catro subárbores temáticas ─────────────────────────────

const core: TreeDef = {
  ...subtreeScaffold('core', 'Core concepts'),
  nodes: [
    lesson('treedef', 'TreeDef'),
    lesson('treeengine', 'TreeEngine', 'treedef'),
    lesson('unlock-canunlock', 'unlock / canUnlock', 'treeengine'),
    lesson('resources-costs', 'Resources & costs', 'treeengine'),
    {
      id: 'gates',
      type: 'subtree_anchor',
      label: { en: 'Gates ↳' },
      subtreeId: 'gates-deep',
      prerequisites: { type: 'node_unlocked', nodeId: 'treeengine' },
    },
  ],
  edges: [
    edge('treedef', 'treeengine'),
    edge('treeengine', 'unlock-canunlock'),
    edge('treeengine', 'resources-costs'),
    edge('treeengine', 'gates'),
  ],
  subtrees: { 'gates-deep': gatesDeep },
}

const reactSub: TreeDef = {
  ...subtreeScaffold('react', 'React rendering'),
  nodes: [
    lesson('skilltree', 'SkillTree'),
    lesson('themeprovider', 'ThemeProvider', 'skilltree'),
    lesson('hooks', 'Hooks', 'themeprovider'),
    lesson('headless', 'Headless', 'hooks'),
  ],
  edges: [
    edge('skilltree', 'themeprovider'),
    edge('themeprovider', 'hooks'),
    edge('hooks', 'headless'),
  ],
}

const layouts: TreeDef = {
  ...subtreeScaffold('layouts', 'Layouts'),
  nodes: [
    lesson('radial', 'radial'),
    lesson('tree', 'tree', 'radial'),
    lesson('custom', 'custom', 'radial'),
    lesson('contract', 'Layout contract', 'radial'),
  ],
  edges: [edge('radial', 'tree'), edge('radial', 'custom'), edge('radial', 'contract')],
}

const nesting: TreeDef = {
  ...subtreeScaffold('nesting', 'Nesting & composition'),
  nodes: [
    lesson('subtrees', 'Subtrees'),
    lesson('anchor', 'Anchor nodes', 'subtrees'),
    lesson('enter-subtree', 'enterSubtree()', 'anchor'),
    lesson('porta-gates', 'Gates between subtrees', 'enter-subtree'),
  ],
  edges: [
    edge('subtrees', 'anchor'),
    edge('anchor', 'enter-subtree'),
    edge('enter-subtree', 'porta-gates'),
  ],
}

// ── Nivel 0: o curso (custom layout, diamante 5 nodos) ──────────────
export const learnYggdrasilDef: TreeDef = {
  id: 'learn-yggdrasil',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { en: 'Learn Yggdrasil Forge' },
  layout: { type: 'custom' },
  startingBudget: { resources: { xp: 999 } },
  resources: [{ id: 'xp', label: { en: 'XP' }, refundable: true, refundPercent: 100 }],
  nodes: [
    {
      id: 'core',
      type: 'subtree_anchor',
      label: { en: 'Core concepts' },
      subtreeId: 'core',
      position: { x: 300, y: 40 },
    },
    {
      id: 'react',
      type: 'subtree_anchor',
      label: { en: 'React rendering' },
      subtreeId: 'react',
      position: { x: 150, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'core', percent: 80 },
    },
    {
      id: 'layouts',
      type: 'subtree_anchor',
      label: { en: 'Layouts' },
      subtreeId: 'layouts',
      position: { x: 450, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'core', percent: 80 },
    },
    {
      id: 'nesting',
      type: 'subtree_anchor',
      label: { en: 'Nesting & composition' },
      subtreeId: 'nesting',
      position: { x: 300, y: 360 },
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'subtree_completion', subtreeId: 'react', percent: 80 },
          { type: 'subtree_completion', subtreeId: 'layouts', percent: 80 },
        ],
      },
    },
    {
      id: 'capstone',
      type: 'keystone',
      label: { en: 'Capstone' },
      position: { x: 300, y: 520 },
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'subtree_completion', subtreeId: 'core', percent: 80 },
          { type: 'subtree_completion', subtreeId: 'react', percent: 80 },
          { type: 'subtree_completion', subtreeId: 'layouts', percent: 80 },
          { type: 'subtree_completion', subtreeId: 'nesting', percent: 80 },
        ],
      },
    },
  ],
  edges: [
    edge('core', 'react'),
    edge('core', 'layouts'),
    edge('react', 'nesting'),
    edge('layouts', 'nesting'),
    edge('nesting', 'capstone'),
  ],
  subtrees: { core, react: reactSub, layouts, nesting },
}
// ── FIN: TreeDef ──
