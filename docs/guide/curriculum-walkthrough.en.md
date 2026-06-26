# Curriculum walkthrough — composing nested subtrees

> Model a multi-level course as **pure data**: anchors plus a recursive `subtrees` registry, gated by how complete each module is. This is the *minimal* sibling — it isolates **composition**. For the polished consumer shell (HUD, why-locked, drill-in UI), see the [Learn Yggdrasil Forge guide](./learn-yggdrasil-walkthrough.en.md).
> Every snippet below is real code from `examples/curriculum`.

![Programming 101 running](./img/curriculum-overview.png)

## The mental model

```
parent TreeDef
   │  a node with type: 'subtree_anchor' + subtreeId
   ▼
subtree_anchor ──points at──► child TreeDef     registered under parent.subtrees
   │  the child can hold subtree_anchors too…
   ▼
…recursively, to any depth
```

A course is not a special structure — it's a `TreeDef` whose nodes point at *other* `TreeDef`s. The engine treats every depth identically; the gates between modules are just a percentage of a subtree's completion.

## 1. A module is just a TreeDef

Three helpers keep the data readable (copy them):

```ts
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, TreeDef } from '@yggdrasil-forge/core'

const lesson = (id: string, label: string, needs?: string): NodeDef =>
  needs === undefined
    ? { id, type: 'small', label: { en: label } }
    : { id, type: 'small', label: { en: label }, prerequisites: { type: 'node_unlocked', nodeId: needs } }

const edge = (source: string, target: string): EdgeDef =>
  ({ id: `${source}__${target}`, source, target, type: 'dependency' })

const scaffold = (id: string, label: string): Omit<TreeDef, 'nodes' | 'edges' | 'subtrees'> => ({
  id, schemaVersion: SCHEMA_VERSION, version: '1.0.0', label: { en: label },
  layout: { type: 'tree', nodeSpacing: 180, levelSpacing: 150 },
  startingBudget: { resources: { xp: 999 } },            // unlocks are free → click-to-complete
  resources: [{ id: 'xp', label: { en: 'XP' }, refundable: true, refundPercent: 100 }],
})
```

A module is then a normal tree of lessons:

```ts
const fundamentals: TreeDef = {
  ...scaffold('fundamentals', 'Fundamentals'),
  nodes: [
    lesson('variables', 'Variables'),
    lesson('control-flow', 'Control flow', 'variables'),    // needs variables
    lesson('functions', 'Functions', 'control-flow'),
  ],
  edges: [edge('variables', 'control-flow'), edge('control-flow', 'functions')],
}
```

## 2. Compose: anchors + a `subtrees` registry

To put a module *inside* another tree, add a node with `type: 'subtree_anchor'` and a `subtreeId`, then register the child under `subtrees`:

```ts
const trees: TreeDef = {                                   // a level-2 module
  ...scaffold('trees', 'Trees'),
  nodes: [lesson('binary-tree', 'Binary tree'), lesson('bst', 'Binary search tree', 'binary-tree')],
  edges: [edge('binary-tree', 'bst')],
}

const dataStructures: TreeDef = {
  ...scaffold('data-structures', 'Data Structures'),
  nodes: [
    lesson('arrays', 'Arrays'),
    lesson('maps', 'Maps', 'arrays'),
    { id: 'trees-anchor', type: 'subtree_anchor', label: { en: 'Trees (nested)' },
      subtreeId: 'trees', prerequisites: { type: 'node_unlocked', nodeId: 'arrays' } },
  ],
  edges: [edge('arrays', 'maps'), edge('arrays', 'trees-anchor')],
  subtrees: { trees },     // ← `trees` is itself a full TreeDef → two levels of nesting
}
```

Because a subtree is *itself* a `TreeDef`, it can carry its own `subtrees` — nesting is recursive, with no special case at any depth.

![Nested structure](./img/curriculum-nesting.svg)

## 3. Gates between modules: `subtree_completion`

Modules unlock based on how complete a prerequisite subtree is. `subtree_completion` is a percentage (0–100): unlocked nodes ÷ total × 100. Three wiring patterns cover most courses:

```ts
// CHAIN — Data Structures opens once Fundamentals is fully done
prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 }

// PARALLEL — Web is gated on the same Fundamentals: a sibling branch, not a sequel
prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 }

// CONVERGENCE — the Capstone needs BOTH final branches at once
prerequisites: { type: 'all', conditions: [
  { type: 'subtree_completion', subtreeId: 'algorithms', percent: 100 },
  { type: 'subtree_completion', subtreeId: 'web',        percent: 100 },
]}
```

This course uses **100%** (every lesson required). Loosen it to `80` and a module opens before its prerequisite is exhausted — that's the choice the [Learn Yggdrasil Forge](./learn-yggdrasil-walkthrough.en.md) course makes.

> Prerequisites gate the *unlock* only — they're not continuous invariants. Lowering a subtree's progress later won't re-lock a module that's already open.

## 4. The root: assembling the course

The root is a `TreeDef` like any other. It uses `layout: { type: 'custom' }` because the course is a DAG with a convergence (the Capstone has two parents), so the nodes are hand-placed into a clean diamond:

```ts
export const curriculumDef: TreeDef = {
  ...scaffold('programming-101', 'Programming 101'),
  layout: { type: 'custom' },
  nodes: [
    { id: 'mod-fundamentals', type: 'subtree_anchor', label: { en: 'Fundamentals' },
      subtreeId: 'fundamentals', position: { x: 300, y: 40 } },
    { id: 'mod-data-structures', type: 'subtree_anchor', label: { en: 'Data Structures' },
      subtreeId: 'data-structures', position: { x: 150, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 } },
    // …mod-web (parallel) and mod-algorithms (after data-structures)…
    { id: 'capstone', type: 'keystone', label: { en: 'Capstone project' }, position: { x: 300, y: 540 },
      prerequisites: { type: 'all', conditions: [
        { type: 'subtree_completion', subtreeId: 'algorithms', percent: 100 },
        { type: 'subtree_completion', subtreeId: 'web',        percent: 100 },
      ] } },
  ],
  edges: [
    edge('mod-fundamentals', 'mod-data-structures'), edge('mod-fundamentals', 'mod-web'),
    edge('mod-data-structures', 'mod-algorithms'),
    edge('mod-algorithms', 'capstone'), edge('mod-web', 'capstone'),
  ],
  subtrees: { fundamentals, 'data-structures': dataStructures, algorithms, web },
}
```

> **Gotcha — give `tree` layouts room.** The solver places nodes but doesn't yet measure label widths, so siblings with tight spacing overlap their text. The `scaffold` above uses generous `nodeSpacing`/`levelSpacing` on purpose; the root uses `custom` with hand `position`s for the same reason.

## 5. Render it, and drill in

Rendering a composed tree is no different from any other — create one engine, hand it to one `<SkillTree>`:

```ts
import { TreeEngine } from '@yggdrasil-forge/core'

const engine = new TreeEngine(curriculumDef)
// <SkillTree engine={engine} onNodeClick={id => engine.unlock(id)} />
```

Opening a module drills into its subtree. `enterSubtree` returns the child as a **new `TreeEngine`** you render with the **same `<SkillTree>`**:

```ts
const res = engine.enterSubtree('fundamentals')   // → Result<TreeEngine>
if (res.ok) {
  // render res.value with the same <SkillTree>; keep a stack to navigate back up
}
```

That's the minimal drill-in. The [Learn Yggdrasil Forge guide](./learn-yggdrasil-walkthrough.en.md) builds the polished version on top of these same calls — a breadcrumb, progress per module, and a "why is this locked?" panel.

## 6. Run it

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/curriculum dev
```

## In one line

A multi-level course is just *data*: anchors + `subtreeId` + a recursive `subtrees` registry, gated by `subtree_completion`. The engine treats every depth identically, and one `<SkillTree>` renders each level — no custom engine code, no special case for nesting.
