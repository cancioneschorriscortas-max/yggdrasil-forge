# Learn Yggdrasil Forge walkthrough — the polished consumer shell

> **Highlights**
> - A nested course — the same composition-as-data as the [Curriculum walkthrough](./curriculum-walkthrough.en.md), now with a **polished consumer shell** on top.
> - **Drill-in is 100% consumer-side**: a stack of engines + a breadcrumb over `enterSubtree` — **zero changes to `@core` or `@react`**.
> - Module gates use **`subtree_completion` at 80%** (the Curriculum uses 100%) — you don't need every lesson to move on.
> - The shell adds a HUD, a "why is this locked" panel, and a select/open affordance — all from the public API.

![Learn Yggdrasil Forge running](./img/learn-yggdrasil-overview.png)
<!-- screenshot: drop a capture of examples/learn-yggdrasil running here -->

## What this example shows

`examples/learn-yggdrasil` is a course **about Yggdrasil Forge, built with Yggdrasil Forge**. Its modules — Core concepts, React rendering, Layouts, Nesting & composition — are themselves skill trees, gated and composed like any other progression. Where the [Curriculum walkthrough](./curriculum-walkthrough.en.md) keeps the UI deliberately bare to isolate *composition*, this sibling wraps the same engine in a **polished shell** to show what a real consumer UI looks like — without touching the library.

## The shape: a course as nested subtrees

The parent tree `learn-yggdrasil` (layout `custom`) holds four module anchors plus a capstone:

- **Core concepts** — the entry; no prerequisite.
- **React rendering** and **Layouts** — both gated on Core (parallel branches).
- **Nesting & composition** — gated on React *and* Layouts (a convergence).
- **Capstone** — a `keystone` gated on all four.

Each anchor carries a `subtreeId` pointing at a full `TreeDef` in the parent's `subtrees` registry. One module — Core concepts — nests another subtree (`gates-deep`) behind its **Gates ↳** anchor, giving **two levels** of composition. None of this is a special case: it's the same data model at any depth.

## Gates: `subtree_completion` at 80%

Modules unlock based on how complete a prerequisite subtree is. `subtree_completion` is a percentage (0–100): unlocked nodes ÷ total × 100. This course gates at **80%** rather than 100% — a deliberate contrast with the Curriculum. The message: a learner doesn't have to finish *every* lesson in Core to start React or Layouts; clearing most of it is enough. Convergences use an `all` rule (Nesting needs React **and** Layouts at 80%; the Capstone needs all four).

Prerequisites gate the *unlock*; they aren't continuous invariants, so dropping progress later won't re-lock what's already open.

## Drill-in: a stack of engines, one renderer

![Drill-in is consumer-side](./img/learn-yggdrasil-drillin.svg)

Opening a module enters its subtree. `engine.enterSubtree(subtreeId)` returns a **child `TreeEngine`**, and that child renders with the **same `<SkillTree>` component** as the parent. The shell keeps a stack of `{ engine, label }` crumbs; the breadcrumb's `goTo(i)` climbs back up.

This is the adoption message: a polished, multi-level drill-in is built **entirely on the public API** — `enterSubtree`, `getSnapshot`, `subscribe` — with **no changes to `@core` or `@react`**. The renderer never learns about nesting; the consumer composes it.

## The polished shell

![Shell anatomy](./img/learn-yggdrasil-shell.svg)

Everything around the tree is plain consumer code (~260 lines), each region fed by a public-API call:

- **HUD** (`.ly-hud`) — title plus a progress bar for the current level, from `currentProgress(engine)`.
- **Breadcrumb** (`.ly-crumb`) — the engine stack rendered as links; `goTo(i)` pops back to a level.
- **Selection bar** (`.ly-select`) — shows one of three states for the selected node: subtree progress (for an open anchor), a **why-locked** list (for a locked node), or an explicit **Open** button (for an unlocked anchor). The why-locked list comes from `explainUnlock(id)`, which returns each condition with a ✓/✗ and a human-readable reason.
- **Canvas** (`.ly-canvas`) — the `<SkillTree>` itself, under a `ThemeProvider`. `onNodeClick` tells a **single click (select)** from a **double click within 300 ms (open the anchor)**, and a fire-and-forget `unlock(id)` handles lessons — the engine's `canUnlock` is the real gatekeeper.

## The academic theme

The course uses an `academic` theme — paper `#faf8f2`, ink `#1f2933`, teal for unlocked, sepia for maxed — and opts in to `maxLabelChars: 14`, so long labels like `unlock / canUnlock` truncate with an ellipsis and a hover tooltip while the full text stays in the `aria-label`. The library provides the *mechanism* (optional truncation); the consumer chooses the *policy* (here, a denser academic look). Same engine, different skin.

## Run it

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/learn-yggdrasil dev
```

## Summary

A polished course is still just *data plus a consumer shell*. The data is anchors + `subtreeId` + a recursive `subtrees` registry with `subtree_completion` gates; the shell is a stack of engines, a breadcrumb, a HUD, and a selection bar — all on the public API. The drill-in, the why-locked panel, the progress bars: none of it required a single change to `@core` or `@react`.
