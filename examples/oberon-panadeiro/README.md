# Oberón — Panadeiro/a

The flagship **Yggdrasil Forge** example: a full *progression-graph
skill screen* for a baker profession (`Panadeiro/a`), built as the
reference rebuild of Oberón's GAIA profession screen.

It is the most complete demo in the repo — a single screen that
exercises layouts, theming, recolorable icons, multi-tier
progression, an Inspector panel, scene backgrounds and label
legibility, all driven from one GAIA profession fixture.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/cancioneschorriscortas-max/yggdrasil-forge/tree/main/examples/oberon-panadeiro)

## What it demonstrates

The screen renders a **crown** (`Panadeiro/a`) surrounded by **5
clusters** (19 microskills), all imported from a GAIA profession JSON.
Everything below is switchable live from the toolbar:

- **Two interchangeable layouts** from the layout registry:
  - `clustered-radial` — clusters orbit the crown; intra-cluster
    shape is `fan` / `list` / `cluster`.
  - `constellation` — each cluster is a radial *thread* of nodes
    from the centre outward; tunable `inner`/`outer` radius,
    `equal-span` vs `fixed-step` length, and short-cluster size
    compensation.
- **Cluster colouring** (`colorByCluster`) plus **regions** (the
  tinted cluster boxes with titles).
- **Recolorable SVG icons** — 19 baker icons registered with
  `registerIcons`; each recolours from the node's resolved colour
  via `currentColor`. Toggle native emoji ↔ SVG icons live.
- **Multi-tier progression** — every microskill has 3 tiers. Select a
  node, open the Inspector, *level up* tier by tier, and watch it
  **lock itself at MAXED** (the level-up button disables).
- **Inspector / DetailPanel** — selecting a node opens a side panel
  with label, description, per-tier state (done / current / locked),
  *acción clave*, a video slot and the level-up action. This is the
  **Explainability layer** made visible.
- **Derived edges (topology)** — consumer-side edge derivation
  (`none` / `star` / `hub` / `chain`) drawn as `type:'path'` visual
  edges that **do not** create unlock gates.
- **Scene backgrounds** — `gravity-well` (radial well), `plain`,
  `custom` (upload any image), or `transparent`.
- **Label legibility backing** — `nada` / `halo` / `sombra`: a CSS
  text backing so node labels stay readable over any background
  image (a map-style technique; default `sombra`).
- **Live theming (ThemeLab)** — edit per-state fill/ring colour
  tokens, the per-node `color` override, and light/dark presets, with
  changes reflected instantly.
- **GAIA importer** — `importGaiaProfession` turns the profession
  JSON (5 groups, 19 microskills) into a `TreeDef` with i18n labels
  and `metadata.gaia` (video, canonical skill).

Built with **Vite + React 19 + TypeScript** (strict).

## Run locally

```bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git
cd yggdrasil-forge/examples/oberon-panadeiro
pnpm install
pnpm dev
```

Then open http://localhost:5173.

## Controls reference

Every control in the toolbar, and the engine/render feature it
exercises:

| Control | Options | What it does |
|---|---|---|
| **Layout** | `clustered-radial` · `constellation` | Switches the layout engine |
| **Forma intra-cluster** | `fan` · `list` · `cluster` | *(clustered-radial)* how members arrange inside a cluster |
| **inner / outer** | 40–200 / 200–420 | *(constellation)* inner & outer radius of the threads |
| **lengthMode** | `equal-span` · `fixed-step` | *(constellation)* all clusters reach `outerRadius` vs a fixed step per node |
| **compensar nodo curto** | on/off | *(constellation, equal-span)* enlarge the members of the smallest cluster |
| **cor por cluster** | on/off | Colour nodes by cluster (sets `node.color`, which overrides per-state fill — see Notes) |
| **iconas** | on/off | Recolorable SVG icons vs native emoji |
| **topoloxía** | `ningunha` · `estrela` · `hub` · `fío` | Derive visual edges (`type:'path'`, no gates) |
| **voltear** | on/off | Flip the ring orientation (`startAngle`) |
| **fondo** | `pozo` · `plano` · `personalizada` · `sen` | Canvas background; `personalizada` reveals a file input |
| **etiquetas** | `nada` · `halo` · `sombra` | Label legibility backing over the image |
| *click a node* | — | Open the Inspector / DetailPanel |
| **ThemeLab** *(right)* | colour tokens | Live-edit the theme (per-state fill/ring, overrides, presets) |

## What's in the code

- **`src/App.tsx`** — main component: engine setup, GAIA import,
  toolbar, `<SkillTree>` + Inspector wiring, reactive state via
  `useSyncExternalStore`.
- **`src/panadeiro.fixture.json`** — GAIA profession data: 5 groups,
  19 microskills, multilingual labels, `accion_clave`, `que_significa`,
  optional video, canonical-skill ids.
- **`src/bakerIcons.ts`** — 19 recolorable `IconDef`s + the
  `node.id → icon slug` map.
- **`src/DetailPanel.tsx`** + **`src/detailLogic.ts`** — the Inspector
  panel and its pure tier logic (`tierRowsFor`, `badgeText`), isolated
  so the probe tests exactly what renders.
- **`src/deriveEdges.ts`** — consumer-side topology → visual edges.
- **`src/ThemeLab.tsx`** — live theme editor.
- **`src/styles.css`** — styling, scene-background modes and the
  label backing rules.
- **`src/__verify_baker_icons.test.ts`**,
  **`src/__verify_detailpanel.test.ts`** — wiring/flow probes. The
  example is not in the workspace test pipeline; run them with:
  ```bash
  pnpm vitest run examples/oberon-panadeiro/src/__verify_detailpanel.test.ts
  ```

## Key APIs used

| API | Purpose |
|-----|---------|
| `importGaiaProfession(profession, { layout })` | GAIA JSON → `TreeDef` (i18n, multi-tier, metadata) |
| `new TreeEngine(treeDef)` | Engine + multi-tier state |
| `<SkillTree engine regions locale … />` | Visual renderer |
| `onNodeClick` / `selectedNodeId` | Node selection + selected ring |
| `onNodeTierIncrease` | Level-up button on the selected node |
| `engine.getNodeState(id)` | Read a node's `currentTier` |
| `engine.canUnlock(id)` | Gate check (is level-up allowed) |
| `await engine.unlock(id)` | Advance one tier (async, returns `Result`) |
| `engine.subscribe` / `engine.getSnapshot` | Reactive state for the panel |
| `registerIcons(record)` | Register recolorable SVG icons |
| `createDefaultLayoutRegistry()` | `clustered-radial` + `constellation` |

## Notes

- **Layout vs render.** The layout produces *positions*; the renderer
  is a separate concern. The same constellation positions could feed
  an SVG renderer (today) or a 3D-camera backend (future) — *same
  graph, different render*.
- **Derived edges are visual.** Topology edges use `type:'path'`:
  they draw lines but create **no** unlock dependencies, so the
  progression logic is unaffected by the chosen topology.
- **`node.color` wins.** With `cor por cluster` on, each node's
  `color` is set to its cluster colour, which **overrides** the
  per-state fill. That is why cluster colouring trades the
  locked/unlocked colour for cluster identity.
- **Label backing is consumer-side.** The `halo`/`sombra` legibility
  backing is plain CSS over the existing label class — robust to any
  background image, with no library change. A true rounded-pill
  backing would need a renderer change and is intentionally left out.

## License

MIT
