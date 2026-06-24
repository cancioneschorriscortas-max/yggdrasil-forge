# Building "The Paladin" — Anatomy of a Skill Tree with Yggdrasil Forge

A step-by-step walkthrough of the `react-demo` example. It teaches the engine by
building one real tree: **The Paladin** — 13 nodes across 3 branches, showcasing
11 engine capabilities, a level system, mutually-exclusive paths, themable regions,
and AAA painted badges on a textured canvas.

Each step explains **why it comes where it does**, and flags **⚠️ pitfalls** — the
real ones we hit while building this example, not invented ones.

**What you get:**

- ✅ Data-driven skill trees — describe the tree, the engine runs it
- ✅ Rich prerequisites — AND / OR, tiers, stats, resources, scoped counts
- ✅ Mutually-exclusive branches
- ✅ Custom painted badges (raster art) on a themed canvas
- ✅ Dynamic theming and per-region tints
- ✅ Snapshots — save and restore progress

> **Guiding principle: the engine is data-driven.** You describe *what the tree is*
> (a `TreeDef`); the engine computes state, validates unlocks, and the React layer
> renders it. So we build in that order: **data first, rendering second, dressing last.**

---

## 1. What we're building

![The finished Paladin tree — three branches, painted badges, on a textured canvas](img/paladin-overview.png)

Three columns:

- **Guerreiro (Warrior)** — a linear martial path.
- **Clérigo (Cleric)** — faith powers that *feed a stat*.
- **Paladín** — the convergence: nodes that require progress on *both* sides, plus a
  forbidden branch (**Dark Pact**) that excludes the holy ones.

The whole thing is one object (`paladinTreeDef`) handed to one engine
(`new TreeEngine(...)`) and one component (`<SkillTree>`).

---

## 2. The data model — `tree-def-paladin.ts`

This is the heart. Get this right and the rest is wiring.

### 2.1 The `TreeDef` skeleton

![A TreeDef is one object holding resources, stats, nodes and edges](img/treedef-anatomy.svg)

```ts
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'

export const paladinTreeDef: TreeDef = {
  id: 'el-paladin',
  schemaVersion: SCHEMA_VERSION,          // always pin the engine's schema version
  version: '1.0.0',                        // YOUR tree's version
  label: { gl: 'O Paladín', es: 'El Paladín', en: 'The Paladin' },  // i18n object
  description: { /* gl / es / en */ },
  rootNodeId: 'sword-basics',              // the entry node
  // ...stats, resources, startingBudget, layout, nodes, edges
}
```

Labels and descriptions are **i18n objects** (`{ gl, es, en }`), not plain strings —
the engine and renderer resolve the active locale for you.

### 2.2 Resources and stats — the economy

Two different concepts:

- **Resources** are *spent* pools (currencies). The Paladin has three:

```ts
resources: [
  { id: 'piety',        initial: 7,  max: 20, icon: '💧', refundable: true },
  { id: 'skill-points', initial: 18, max: 18, icon: '⭐', refundable: true },
  { id: 'level',        initial: 1,  max: 10, icon: '🎖️' },   // not spent — a gate value
],
startingBudget: { resources: { 'skill-points': 18, piety: 7, level: 1 } },
```

- **Stats** are *derived* values that nodes contribute to:

```ts
stats: [{ id: 'faith', initial: 6, format: 'number' }],
```

`level` is the interesting one: it is never *spent*; it's a dial (1→10) that **gates**
nodes via `resource_min(level, N)`. You move it with the `+/−` control, which calls
`engine.grantResource('level', delta)`.

### 2.3 Anatomy of a node

```ts
{
  id: 'sword-basics',
  icon: '/badges/sword-basics.webp',  // a painted badge (see §5)
  type: 'notable',                     // 'notable' | 'keystone' — visual weight
  shape: 'circle',                     // 'circle' | 'hexagon'
  maxTier: 3,                          // multi-rank node (1/3 → 3/3)
  label: { gl: 'Esgrima Básica', /* ... */ },
  tags: ['warrior'],                   // used for regions AND scoped counting
  position: { x: 80, y: 40 },          // this tree uses a `custom` layout
  cost: [{ resourceId: 'skill-points', amount: 1 }],  // 1 point per tier
}
```

Notes:
- **`maxTier`** makes a node multi-rank. `sword-basics` is `maxTier: 3`, so unlocking
  it three times takes it to `3/3` (maxed). Each tier costs `cost` again.
- **`tags`** do double duty: they drive the colored **regions** (warrior/paladin/cleric)
  *and* feed scoped prerequisites like "4 warrior nodes" (see `nodes_count` below).
- **`position`** is here because this tree declares `layout: { type: 'custom' }` — three
  fixed columns at `x = 80 / 360 / 640`. (Other trees can use algorithmic layouts;
  this one is hand-placed for an exact look.)

### 2.4 The prerequisite catalog — 11 capabilities, one per example node

This tree was designed so each node demonstrates a different gate. This is your
reference for *how to express dependencies*:

| Capability | Where | Meaning |
|---|---|---|
| `node_unlocked` | Muro de Escudos ← sword-basics | needs another node unlocked |
| `node_maxed` | Furia Berserker ← sword-basics | needs another node *maxed* |
| `nodes_count` + `scope` | Veterano (4 `warrior`) | needs N nodes of a tag unlocked |
| `tier_min` | Campeón (sword tier ≥ 3) | needs another node at tier ≥ N |
| `stat_min` | Xuízo Divino (faith ≥ 10) | needs an accumulated stat |
| `resource_min` | Veterano (level ≥ 3), Dark Pact (level ≥ 10) | needs a resource value |
| `all` (AND) | Guerreiro Sagrado, Campeón | every condition must hold |
| `any` (OR) | Aura de Valor | at least one condition |
| `exclusions` | Dark Pact | mutually-exclusive branch |
| `cost` | Escudo / Xuízo (piety) | spends resources to unlock |
| `statContributions` | Luz / Mans / Smite → faith | nodes that *fill* a stat |

Examples straight from the file:

```ts
// Simple dependency
prerequisites: { type: 'node_unlocked', nodeId: 'sword-basics' }

// Conjunction: needs BOTH a tier threshold AND another node
prerequisites: {
  type: 'all',
  conditions: [
    { type: 'tier_min', nodeId: 'sword-basics', tier: 3 },
    { type: 'node_unlocked', nodeId: 'smite' },
  ],
}

// Two gates of different nature on one node (count + level)
prerequisites: {
  type: 'all',
  conditions: [
    { type: 'nodes_count', count: 4, scope: 'warrior' },
    { type: 'resource_min', resourceId: 'level', amount: 3 },
  ],
}
```

And the stat-feeding nodes that make `stat_min` reachable:

```ts
// holy-light / healing-hands / smite each add to `faith`,
// so that `divine-judgment` (faith ≥ 10) eventually opens.
statContributions: [{ statId: 'faith', op: '+', value: 3 }]
```

### 2.5 Exclusions — the forbidden branch

![Two paths converge into a keystone (AND); the Dark Pact excludes the holy keystones](img/paladin-convergence.svg)

`dark-pact` is reachable, but taking it forbids the holy keystones:

```ts
{
  id: 'dark-pact',
  color: '#7d3cff',                       // node-level color override
  prerequisites: {
    type: 'all',
    conditions: [
      { type: 'node_unlocked', nodeId: 'sword-basics' },
      { type: 'resource_min', resourceId: 'level', amount: 10 },  // opens at max level
    ],
  },
  exclusions: ['champion-of-light', 'holy-warrior'],
}
```

### 2.6 Edges — the visible connections

Edges are the *drawn* relationships. They carry a `type` (and optional routing):

```ts
edges: [
  { id: 'e1',  source: 'sword-basics', target: 'shield-wall', type: 'dependency' },
  { id: 'e9',  source: 'divine-shield', target: 'valor-aura', type: 'soft_dependency' },
  { id: 'e11', source: 'dark-pact', target: 'champion-of-light',
    type: 'exclusion', style: { routing: 'orthogonal' } },
]
```

> Edges describe *meaning* (dependency / exclusion). They are part of the model — if
> you exported the graph, they'd be in it. (Purely visual scaffolding the layout draws —
> like spokes or halos — is **not** an edge and is never exported.)

### ⚠️ Pitfalls in the data model

- **Prerequisites are gates checked at unlock time, not invariants.** Lowering a
  resource *after* a node is unlocked does **not** re-lock it. Don't model "must keep
  level ≥ 10 forever" as a prerequisite — it only guards the moment of unlocking.
- **Exclusions are symmetric.** Declaring `dark-pact` excludes `champion-of-light`
  also means `champion-of-light` excludes `dark-pact`. The engine enforces both
  directions — design your branches knowing the relationship goes both ways.
- **A node's `color` overrides the state fill.** `dark-pact`'s purple shows in *every*
  state (even locked), because `node.color` wins over the per-state fill tokens. Use it
  deliberately for "signature" nodes; don't expect it to dim with state.
- **Strict state checks can become logic traps.** An earlier version gated
  `divine-shield` on `node_state: 'unlocked'` (strict — it *rejected* `maxed`). Maxing
  the prerequisite then made the shield impossible to unlock. We switched it to
  `node_unlocked` (accepts unlocked *or* maxed). Prefer the permissive gate unless you
  truly mean "exactly this state."

---

## 3. Putting it on screen — `App.tsx`

Now the engine + React.

### 3.1 Create the engine

```ts
import { TreeEngine } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'

const [engine] = useState(() => {
  const storage = new MemoryStorage()           // swap for a persistent store in prod
  return new TreeEngine(paladinTreeDef, { storage })
})
```

`useState(() => ...)` constructs the engine **once** (lazy initializer), not on every
render.

### 3.2 Reactivity — subscribe to the engine

The engine is an external store. Bridge it to React with `useSyncExternalStore`:

```ts
const subscribe = useCallback((listener) => engine.subscribe(listener), [engine])
const getBudgetSnapshot = useCallback(() => engine.getBudget(), [engine])
const budget = useSyncExternalStore(subscribe, getBudgetSnapshot)

const skillPoints = budget.resources['skill-points'] ?? 0
const level = budget.resources.level ?? 1
```

> **⚠️ Keep `subscribe` stable** (wrap in `useCallback`). If `subscribe` is a new
> function every render, `useSyncExternalStore` re-subscribes and can **miss events**
> — notably the async snapshot replay on startup. A stable reference fixes it.

### 3.3 The minimal render

```tsx
import { SkillTree, ThemeProvider } from '@yggdrasil-forge/react'

<ThemeProvider theme={builtTheme}>
  <SkillTree engine={engine} onNodeClick={handleNodeClick} regions={regions} />
</ThemeProvider>
```

> **⚠️ Use `SkillTree` + your own `ThemeProvider`** to control theming. There is a
> convenience `SkillTreeWithDefaultTheme` that wraps a built-in theme and **overrides**
> a consumer theme — handy for a quick start, wrong if you want your own palette.

### 3.4 Interaction — everything returns a `Result`

Engine mutations don't throw; they return `Result` objects you must check:

```ts
const handleNodeClick = useCallback(async (nodeId: string) => {
  setSelectedNode(nodeId)
  const state = engine.getNodeState(nodeId)
  const result = state?.state === 'unlocked'
    ? await engine.lock(nodeId)
    : await engine.unlock(nodeId)
  if (result.ok) setLastAction(`✨ ${nodeId}`)
  else            setLastAction(`⛔ ${result.error.message}`)   // shows WHY it failed
}, [engine])
```

Other handlers follow the same shape:
- tiers: `engine.unlock(id)` / `engine.lockOneTier(id)`, gated by
  `engine.canUnlock(id)` → `.value.allowed`;
- the level dial: `engine.grantResource('level', delta)` → `.value` is
  `{ previous, current }` (a *direct* mutation, distinct from cost/refund);
- snapshots: `engine.snapshot(name)` and `engine.restoreSnapshot(id)`.

> **⚠️ Always check `result.ok` before trusting `.value`.** And surface
> `result.error.message` to the user — it's how the demo's toast explains
> "prerequisites not met."

### 3.5 Viewport control

`<SkillTree>` exposes an imperative handle:

```tsx
const treeRef = useRef<SkillTreeHandle>(null)
// ...<SkillTree ref={treeRef} .../>
useEffect(() => {
  const id = requestAnimationFrame(() => treeRef.current?.fit())  // center after first paint
  return () => cancelAnimationFrame(id)
}, [])
// also: treeRef.current?.reset() / zoomIn() / zoomOut() / getZoom()
```

`fit()` inside `requestAnimationFrame` waits for the SVG to have layout, then frames
the tree to the available canvas (avoids a half-empty canvas when the side panel is
narrow).

> **⚠️ `exactOptionalPropertyTypes` is on.** You can't pass `undefined` to an optional
> prop. Spread it conditionally instead:
> ```tsx
> {...(selectedNode !== null && { selectedNodeId: selectedNode })}
> ```

---

## 4. Dressing it — theme, regions, states

The live theme is built from `themeVals` (the Theme Lab panel) and memoized:

```ts
const builtTheme: Theme = useMemo(() => ({
  colors: {
    text: themeVals.text,
    nodeLocked: themeVals.nodeLocked,
    nodeUnlockable: themeVals.nodeUnlockable,
    nodeUnlocked: themeVals.nodeUnlocked,
    nodeMaxed: themeVals.nodeMaxed,
    nodeInProgress: themeVals.nodeInProgress,
    edge: themeVals.edge,
    nodeFill: themeVals.fill,
    nodeFillLocked: themeVals.nodeFillLocked,
    // ...one fill per state
  },
  sizes: { strokeWidth: 2.5, fontSize: 14, ringWidth: themeVals.ringWidth },
  typography: { fontFamily: '"Cinzel", serif', fontWeight: 600 },
}), [themeVals])
```

The colors are **state-driven**: each node state (locked / unlockable / unlocked /
in-progress / maxed) has its own ring color and fill. **Regions** are passed separately
to `<SkillTree regions={...}>` and tint each column (warrior red, paladin gold,
cleric blue).

> **⚠️ The canvas background is a trap.** `theme.colors.background`, if set, is applied
> **inline** on the `<svg>` element — and inline style **overrides** any CSS background
> on that element. So to control the canvas background from CSS (e.g. a texture image),
> you must **omit** the `background` key from the theme entirely:
> ```ts
> // NOT background: 'transparent' (still applied inline, still overrides CSS)
> // NOT background: undefined  (rejected by exactOptionalPropertyTypes)
> // Just leave the key out.  → SVGRenderer skips the inline bg → CSS wins.
> ```

---

## 5. The AAA art — raster badges + textured canvas

### 5.1 Badges via `icon: URL`

A node's `icon` can be a registered glyph id, an emoji, **or a URL/path to an image**.
For painted badges, point it at a file:

```ts
{ id: 'sword-basics', icon: '/badges/sword-basics.webp', /* ... */ }
```

Place the assets in the example's `public/` folder so the dev server serves them at the
root path:

```
examples/react-demo/public/badges/<node-id>.webp   ← one per node, named by id
examples/react-demo/public/bg/fondo.png            ← the canvas texture
```

Naming each file exactly as its node id means the wiring is uniform
(`/badges/${id}.webp`).

> **⚠️ The icon must be *detected* as an image.** The renderer decides image-vs-emoji
> by pattern. It recognizes `http(s)://`, `//`, `data:` URIs, relative/absolute paths
> (`/…`, `./…`), and image extensions (`.webp/.png/.avif/…`). A bare string with none
> of those falls through to text — you'd see the path printed in the node. Use a real
> path or extension.

> **⚠️ Source the badges with real alpha.** WebP/AVIF with a true transparent channel
> (not a baked or chroma-key background) so edges don't halo. ~256px is plenty; the
> browser downscales to node size cleanly.

### 5.2 Sizing — badges are bigger than glyphs

Vector glyphs and painted badges want *different* sizes. The renderer keeps them
separate:

```ts
const iconSize  = radius * 1.0   // vector glyphs (unchanged)
const imageSize = radius * 1.8   // raster badges fill more of the node
// <image width={imageSize} height={imageSize} preserveAspectRatio="xMidYMid meet" .../>
```

> **⚠️ Keep `preserveAspectRatio`.** The badges aren't all square (e.g. 197×256). With
> `xMidYMid meet` the image fits its box preserving ratio — no stretching. Design
> badges roughly vertical/square.

### 5.3 Locked nodes get dimmed

With vivid badges, a locked node looks as inviting as an unlockable one. So the badge
image is desaturated + darkened when the node is locked — while the **ring keeps its
state color**:

```tsx
const dimBadge = state === 'locked'
// <image ... style={dimBadge ? { filter: 'grayscale(1) brightness(0.5)' } : undefined} />
```

### 5.4 The canvas texture

With `theme.colors.background` omitted (§4 pitfall), CSS owns the canvas, so the
texture goes there with a light dark veil for contrast:

```css
.canvas-zone > svg.yf-skill-tree {
  background:
    linear-gradient(rgba(10, 8, 16, 0.35), rgba(10, 8, 16, 0.35)),
    url('/bg/fondo.png') center / cover no-repeat;
}
```

> **⚠️ Native emojis don't read on a dark canvas.** The resource icons (💧⭐🎖️) are
> fine in the HUD but wash out on the dark texture inside the tree; the durable fix is
> recolorable vector icons (a later step).

---

## 6. Pitfalls, all in one place

1. **Prereqs are unlock-time gates**, not lasting invariants — lowering a resource
   doesn't re-lock.
2. **Exclusions are symmetric** — both directions are enforced.
3. **`node.color` overrides state fills** — colored nodes don't dim with state.
4. **Strict `node_state` gates can deadlock** — prefer `node_unlocked` (accepts maxed).
5. **`useSyncExternalStore` needs a stable `subscribe`** — or you lose async events.
6. **Use `SkillTree` + `ThemeProvider`**, not `SkillTreeWithDefaultTheme`, for custom
   theming.
7. **Engine methods return `Result`** — check `.ok`, surface `.error.message`.
8. **`exactOptionalPropertyTypes`** — never pass `undefined`; spread props conditionally.
9. **Local image icons** must match the URL/extension detection and live in `public/`.
10. **Raster badges** need their own size (`imageSize`) + `preserveAspectRatio`.
11. **`theme.colors.background` is applied inline and beats CSS** — omit the key to let
    CSS control the canvas.
12. **Native emojis wash out on dark backgrounds** — move to recolorable icons.

---

## Summary

With this one example you've covered the whole engine surface:

- **13 nodes** across 3 branches
- **11 prerequisite capabilities** — `node_unlocked`, `node_maxed`, `nodes_count`, `tier_min`, `stat_min`, `resource_min`, `all`, `any`, `exclusions`, `cost`, `statContributions`
- **resources and stats** — a spendable economy and a derived value
- **mutually-exclusive branches**
- **dynamic theming** with per-region tints
- **custom painted badges** on a textured canvas

You're ready to build your own: copy `tree-def-paladin.ts`, swap the nodes, keep the
`<SkillTree>` wiring. The data drives everything.

---

## 7. Where to go next

- **Curved organic connectors** — turning the straight edges into "vines" for a more
  game-like feel.
- **Theme-aware canvas** — let each preset (light / dark) carry its own background via a
  CSS variable, so the texture only shows on the dark theme.
- **Your own tree** — copy `tree-def-paladin.ts`, change the nodes, keep the engine and
  `<SkillTree>` wiring. The data drives everything.

---

*Powered by `@yggdrasil-forge` — an open-source progression-graph engine. The Paladin
example lives in `examples/react-demo`.*
