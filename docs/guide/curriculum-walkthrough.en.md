# Curriculum walkthrough — composition with nested subtrees

> **Highlights**
> - A course modeled as **nested subtrees** — entirely data-driven.
> - Module gates use **`subtree_completion`** (a percentage of a subtree).
> - **Two levels of nesting**: a subtree inside a subtree.
> - **Deliberately plain UI** — this example sells *composition*, not chrome. For the polished sibling, see the [Learn Yggdrasil Forge walkthrough](./learn-yggdrasil-walkthrough.en.md).

![Programming 101 running](./img/curriculum-overview.png)
<!-- screenshot: capture the running curriculum example here -->

## What this example shows

`examples/curriculum` is **Programming 101**: a course whose modules are separate skill trees, composed under one parent. It shows how Yggdrasil Forge expresses a curriculum (or a tech tree, or any layered progression) as plain data — no custom engine code.

## The shape: a course as nested subtrees

The parent tree (`programming-101`, a `custom` layout) holds five nodes: four **module anchors** and a capstone. Each anchor points to its own `TreeDef` through `subtreeId`, and those defs live in the parent's `subtrees` record. One of them — Data Structures — nests a further subtree (`trees`), giving **two levels** of composition.

![Nested structure](./img/curriculum-nesting.svg)

A `subtree_anchor` is just a node carrying a `subtreeId`; the subtree it points to is a full `TreeDef`, so it can hold its own subtrees, recursively. None of this is special-cased — it is the same data model at every depth.

## Gates: `subtree_completion`

Modules unlock based on how complete a prerequisite subtree is. `subtree_completion` is a percentage (0–100): unlocked nodes ÷ total × 100. Programming 101 wires three shapes of dependency:

- **Chain** — Fundamentals → Data Structures → Algorithms (each needs the previous at 100%).
- **Parallel** — Fundamentals also unlocks Web.
- **Convergence** — the Capstone needs **all** of Algorithms and Web at 100% (an `all` rule).

Prerequisites gate the *unlock*; they are not ongoing invariants, so lowering progress later does not re-lock what is already unlocked.

## Drill-in

Opening a module enters its subtree: `engine.enterSubtree(subtreeId)` returns a **child `TreeEngine`**, which renders with the same `<SkillTree>` component. The example keeps a stack of engines plus a breadcrumb to climb back up. This is the *minimal* form of drill-in; the Learn Yggdrasil Forge example builds a richer shell — progress, "why locked", an explicit Open button — on top of the very same calls.

## Plain on purpose

Nodes here are sober: no badges, tiers, or icons. That is the point — the example isolates **composition and gating** so they are easy to read. Styling and chrome are a separate concern (a theme plus consumer UI), shown in the polished sibling.

## Run it

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/curriculum dev
```

## Summary

A multi-level curriculum is just *data*: anchors plus `subtreeId` plus a recursive `subtrees` record, gated by `subtree_completion`. The engine treats every depth identically, and a plain `<SkillTree>` renders each level — no renderer changes required.
