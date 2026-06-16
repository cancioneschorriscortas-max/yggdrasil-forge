# React demo

Interactive React skill tree demo for Yggdrasil Forge.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/cancioneschorriscortas-max/yggdrasil-forge/tree/main/examples/react-demo)

## What it demonstrates

This example renders an **interactive 8-node skill tree** (RPG
character branches) with:

- Click-to-unlock / click-to-lock interaction.
- Reactive stats panel (unlocked count, last action).
- Snapshot + Restore buttons (state persistence in-memory).
- Localized labels (en/es/gl).
- Default `minimal` theme from `@yggdrasil-forge/react`.

Built with **Vite + React 18 + TypeScript**.

## Open in Stackblitz

Click the badge above — Stackblitz will load this example with all
dependencies installed from npm.

## Run locally

```bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git
cd yggdrasil-forge/examples/react-demo
pnpm install
pnpm dev
```

Then open http://localhost:5173 in your browser.

## What's in the code

- **`src/tree-def.ts`** — `TreeDef` definition (8 nodes, 7
  dependency edges, with `prerequisites: UnlockRule` for runtime
  enforcement).
- **`src/App.tsx`** — main React component:
  - Engine setup with `MemoryStorage`.
  - `<SkillTree>` component with `onNodeClick` handler.
  - Reactive state via `engine.subscribe()` for stats panel.
  - Snapshot/restore controls.
- **`src/styles.css`** — minimal dark theme styling.

## Key APIs used

| API | Purpose |
|-----|---------|
| `new TreeEngine(treeDef, { storage })` | Engine setup |
| `<SkillTree engine={engine} onNodeClick={...} />` | Visual renderer |
| `engine.subscribe(callback)` | React to state changes |
| `engine.getNodeState(nodeId)` | Read individual node state |
| `await engine.unlock(nodeId)` | Unlock a skill |
| `await engine.lock(nodeId)` | Lock a skill |
| `await engine.snapshot(label)` | Save state |
| `await engine.restoreSnapshot(id)` | Restore state |

## Notes on prerequisites

This example uses **both**:

- **`dependency` edges**: for visual rendering (arrows between
  nodes).
- **`NodeDef.prerequisites`**: for runtime enforcement (which
  skills must be unlocked before this one).

See the [README of `node-basics`](../node-basics) for an explanation
of why both exist.

## License

MIT
