# Learn Yggdrasil Forge — a hands-on guide

> Build a working, multi-level progression from scratch, then see how the `learn-yggdrasil` example scales it into a full course. **Every snippet below is real code** — it compiles and runs against the public API.
> For the minimal sibling that isolates composition, see the [Curriculum walkthrough](./curriculum-walkthrough.en.md).

![Learn Yggdrasil Forge running](./img/learn-yggdrasil-overview.png)
<!-- screenshot: drop a capture of examples/learn-yggdrasil running here -->

## The mental model (read this first)

```
TreeDef       the world you declare        nodes · prerequisites · layout
   │  describes
   ▼
TreeEngine    the evolving state + rules    unlock · gates · explanations
   │  evaluates
   ▼
Snapshot      a plain, serialisable view    what is unlocked right now
   │  renders
   ▼
SkillTree     one view over the engine      React today · editor on the roadmap
```

`TreeDef` **describes** the world; `TreeEngine` **holds the evolving state** and the rules that change it. That split is the whole point. The engine doesn't just track progress — it can *explain its own rules*: `engine.explainUnlock(id)` tells you, condition by condition, why a node is still locked. **This is a progression engine, and the renderer is only one view of it.**

## 1. Install

```bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/react @yggdrasil-forge/common
```

`core` is the engine (framework-agnostic), `react` is the renderer, `common` carries shared types and `SCHEMA_VERSION`.

## 2. A node, and how it unlocks

A node is any step in any progression — not just an RPG perk. Cooking works fine:

```ts
import type { NodeDef } from '@yggdrasil-forge/core'

const boil: NodeDef = { id: 'boil', type: 'small', label: { en: 'Boil water' } }
```

A node stays locked until its `prerequisites` are met. Three shapes cover almost everything:

```ts
// unlocks once another node is unlocked
prerequisites: { type: 'node_unlocked', nodeId: 'boil' }

// unlocks once a subtree is ≥ N% complete (0–100)
prerequisites: { type: 'subtree_completion', subtreeId: 'core', percent: 80 }

// unlocks once ALL of several conditions hold
prerequisites: { type: 'all', conditions: [
  { type: 'node_unlocked', nodeId: 'pasta' },
  { type: 'node_unlocked', nodeId: 'eggs'  },
]}
```

Prerequisites gate the *unlock* only — they aren't continuous, so lowering progress later won't re-lock an already-open node.

## 3. Assemble a TreeDef

A `TreeDef` is the whole thing: metadata, a `layout`, `nodes`, and `edges` (the lines drawn between nodes). Two tiny helpers remove the boilerplate — copy them:

```ts
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, TreeDef } from '@yggdrasil-forge/core'

const step = (id: string, label: string, needs?: string): NodeDef =>
  needs === undefined
    ? { id, type: 'small', label: { en: label } }
    : { id, type: 'small', label: { en: label }, prerequisites: { type: 'node_unlocked', nodeId: needs } }

const edge = (source: string, target: string): EdgeDef =>
  ({ id: `${source}__${target}`, source, target, type: 'dependency' })
```

A complete, valid tree — making carbonara:

```ts
const cooking: TreeDef = {
  id: 'cooking',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { en: 'Cooking' },
  layout: { type: 'tree', nodeSpacing: 180, levelSpacing: 150 },
  nodes: [
    step('boil', 'Boil water'),
    step('pasta', 'Cook pasta', 'boil'),       // needs boil
    step('carbonara', 'Carbonara', 'pasta'),   // needs pasta
  ],
  edges: [edge('boil', 'pasta'), edge('pasta', 'carbonara')],
}
```

`layout` is required (`tree`, `radial`, `custom`, …). Swap the labels and it's a guitar practice plan, a course, an onboarding checklist — the engine doesn't care what the steps *mean*.

## 4. Create the engine — and watch it explain itself

```ts
import { TreeEngine } from '@yggdrasil-forge/core'

const engine = new TreeEngine(cooking)

engine.getNodeState('boil')?.state      // 'locked' | 'unlockable' | 'unlocked' | 'maxed'  (null if untouched)
engine.explainUnlock('carbonara')       // why is Carbonara locked? → conditions, each with ✓/✗ and a reason
await engine.unlock('boil')             // returns a Result; canUnlock is the internal gatekeeper
```

`explainUnlock` is the tell that this isn't a renderer: the engine knows its own rules and can narrate them. Hold onto that — it's what powers a "what do I still need?" panel later.

## 5. Render it

```tsx
import { SkillTree, ThemeProvider } from '@yggdrasil-forge/react'
import { useMemo, useCallback, useSyncExternalStore } from 'react'

function Tree() {
  const engine = useMemo(() => new TreeEngine(cooking), [])

  // re-render this component whenever the engine's state changes
  useSyncExternalStore(
    useCallback((cb: () => void) => engine.subscribe(cb), [engine]),
    () => engine.getSnapshot(),
    () => engine.getServerSnapshot(),
  )

  const onNodeClick = (id: string) => { void engine.unlock(id) }

  return (
    <ThemeProvider theme={academic}>
      <SkillTree engine={engine} onNodeClick={onNodeClick} />
    </ThemeProvider>
  )
}
```

That's a working, clickable tree: click *Boil water*, then *Cook pasta* unlocks, then *Carbonara*. `SkillTree` renders from the engine; `useSyncExternalStore` is what makes a click repaint. (`academic` is just a theme object — step 9.)

> **Gotcha, now that it runs.** An untouched node reports `'locked'`, **never** `'unlockable'` — so if you gate `unlock` on `'unlockable'`, the very first click never fires (and tests won't catch it). The correct guard:
>
> ```ts
> const st = engine.getNodeState(id)?.state ?? 'locked'
> if (st !== 'unlocked' && st !== 'maxed') void engine.unlock(id)
> ```

## 6. Nesting: anchors + subtrees

Any node can point at a *whole other tree*. Give it `type: 'subtree_anchor'` and a `subtreeId`, and register the child under the parent's `subtrees`:

```ts
const parent: TreeDef = {
  /* …metadata… */
  layout: { type: 'custom' },
  nodes: [
    { id: 'core',  type: 'subtree_anchor', label: { en: 'Core concepts' },  subtreeId: 'core',
      position: { x: 300, y: 40 } },
    { id: 'react', type: 'subtree_anchor', label: { en: 'React rendering' }, subtreeId: 'react',
      position: { x: 150, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'core', percent: 80 } },
  ],
  edges: [edge('core', 'react')],
  subtrees: { core, react: reactSub },   // each value is a full TreeDef
}
```

A subtree is itself a `TreeDef`, so it can carry its own `subtrees` — nesting is recursive, with no special case at any depth. (`position` is needed because the parent uses `layout: { type: 'custom' }`.)

## 7. Drill-in: enter a subtree

![Drill-in is consumer-side](./img/learn-yggdrasil-drillin.svg)

`enterSubtree` returns the child as a **new `TreeEngine`** that you render with the **same `<SkillTree>`**. Keep a stack to navigate:

```tsx
type Crumb = { engine: TreeEngine; label: string }
const [stack, setStack] = useState<Crumb[]>([{ engine: rootEngine, label: 'Course' }])
const current = stack[stack.length - 1]

function open(subtreeId: string, label: string) {
  const res = current.engine.enterSubtree(subtreeId)
  if (res.ok) setStack(s => [...s, { engine: res.value, label }])
}
const goTo = (i: number) => setStack(s => s.slice(0, i + 1))   // breadcrumb back up
```

You always render `<SkillTree engine={current.engine} … />`. That's the entire drill-in — you compose engines on the consumer side, with **no changes to `@core` or `@react`**.

## 8. Why is it locked? + the shell

Remember `explainUnlock` from step 4 — here it earns its keep, turning a locked node into a checklist:

```ts
const res = engine.explainUnlock(selectedId)
if (res.ok && !res.value.satisfied) {
  for (const c of res.value.conditions) {
    console.log(c.satisfied ? '✓' : '✗', c.reason)   // e.g.  ✓ Core 80%   ✗ Layouts 80%
  }
}
```

The shell around the tree — HUD, breadcrumb, this why-locked list, the Open button — is all consumer code over the public API:

![Shell anatomy](./img/learn-yggdrasil-shell.svg)

## 9. Theming

A theme is a plain `Theme` object passed to `ThemeProvider`. The `academic` theme opts in to `maxLabelChars`, which truncates long labels with a tooltip while keeping the full text in `aria-label` — the library gives the *mechanism*, you choose the *policy*:

```ts
import type { Theme } from '@yggdrasil-forge/react'

const academic: Theme = {
  colors: { text: '#1f2933', nodeUnlocked: '#2c6e8f', nodeMaxed: '#9a6b3f', nodeFill: '#faf8f2', /* …+ nodeLocked, nodeUnlockable, nodeStroke, edge… */ },
  sizes:  { fontSize: 14, maxLabelChars: 14 },   // truncate labels longer than 14 chars
}
```

## 10. Run the full example

The course wires all of the above — four module subtrees, 80% gates, two-level nesting, the polished shell — in ~260 lines of consumer code. Read `examples/learn-yggdrasil/src/` (`tree-def-learn-yggdrasil.ts` for the data, `App.tsx` for the shell), then run it:

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/learn-yggdrasil dev
```

## Beyond skill trees — where this is heading

*(Not implemented — a research direction, shown so the shape is clear.)*

Because a `TreeEngine` is a rules engine over a graph, the nodes don't have to be skills. A future direction we call **Living Mind** treats the same machinery as a graph of knowledge that *learns* from use:

```
Living Mind
   Knowledge · Beliefs · Goals · Memories
        │
        ▼  edges gain weight as they are observed (Rome ↔ Architecture, 0.72)
   Dynamic activation
```

The point of putting it here: **Yggdrasil Forge models evolving graphs, not only RPG skill trees.** A skill tree is just the first, most legible instance.

## In one line

Data (nodes + prerequisites + recursive `subtrees`) → `new TreeEngine(def)` → `<SkillTree engine>` → make it live with `useSyncExternalStore` + `unlock`. Everything past that — gates, drill-in, the engine *explaining itself*, theming — is the public API. The renderer is one view; the engine is the project.
