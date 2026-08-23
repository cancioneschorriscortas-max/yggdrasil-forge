---
title: Installation
description: What to install depending on what you want to do — use the editor, embed the renderer in an app, or generate trees from the command line.
sidebar:
  order: 1
---

Yggdrasil Forge is a monorepo. Pick your entry point:

| I want to… | What you need |
|---|---|
| **Build trees visually** | Clone the repo and start the editor (below). |
| **Show a tree in my React app** | `@yggdrasil-forge/core` + `@yggdrasil-forge/react`. |
| **Generate/validate trees in a pipeline or with AI** | `@yggdrasil-forge/cli` (`ygg`). |
| **Just the engine (no UI)** | `@yggdrasil-forge/core`. |

> **Status: alpha (0.x).** The public API of `core`/`react` is stabilizing towards 1.0; the `editor-*` packages live in the repo and are not published yet.

## Requirements

- **Node.js ≥ 22** and **pnpm 11** (via `corepack`).
- A modern browser (Chromium, Firefox, Safari) for the editor.

## The editor (from the repo)

```bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git
cd yggdrasil-forge
corepack pnpm install
corepack pnpm --filter @yggdrasil-forge-examples/editor run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). It loads the baker example tree (the editor's UI is in Galician — the guides give each label with its translation); from there, [your first tree](../primeira-arbore/).

## The renderer in your app

```bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/react react react-dom
```

```tsx
import { TreeEngine } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'
import treeDef from './my-tree.json'

const engine = new TreeEngine(treeDef.tree) // the `tree` field of the document

export function Tree() {
  return <SkillTree engine={engine} />
}
```

`SkillTree` renders accessible, interactive SVG (pan, zoom, selection) and subscribes to the engine: when a node unlocks, the render follows. Theme, icons and layouts are explained in their own sections.

## The command line

```bash
pnpm add -D @yggdrasil-forge/cli
npx ygg --help
```

`ygg validate`, `ygg layout`, `ygg render`, `ygg schema`, `ygg new`. It is the tool of the [data path](../../via-do-dato/): everything the editor knows how to do with a document, without opening the editor.

## In the repo (to contribute)

```bash
corepack pnpm install
corepack pnpm build          # all packages and examples
corepack pnpm test           # full suite
corepack pnpm run docs:dev   # this documentation, locally
```

The quality gates (lint, format, typecheck, tests) and the conventions live in `docs/architecture/MASTER.md`, the project's canonical document.
