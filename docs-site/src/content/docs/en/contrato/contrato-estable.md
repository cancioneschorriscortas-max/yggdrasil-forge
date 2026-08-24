---
title: The stable contract
description: What 1.x promises and what it doesn't — the format as the product, stability tiers per layer, and the versioning policy.
sidebar:
  order: 3
---

**The product is the format.** Apps, renderers and editors change; the data you describe today must still load years from now. That is why the 1.x stability commitment is defined in layers, from hardest to softest:

## 1. The data contract — stable 1.x (the hard promise)

| Piece | Promise |
|---|---|
| **Published JSON Schema** (`schema/yggdrasil-document.schema.json`) | A document valid in 1.0 stays valid in any 1.x. New fields only **additively and optionally**. |
| **Unlock semantics** (`UnlockRule`, conditions, exclusions, tiers, resources, effects) | The same document produces the same unlock decisions in any 1.x. |
| **Serialization** (`{ tree, editor }`, `serializeDocument`/`deserializeDocument`) | Round-trip guaranteed; what you save in 1.0 opens in any 1.x. |

**Breaking changes only with a major** (2.0) — and the support policy covers the current and previous major (MASTER §61). The schema drift gate (a test comparing the published schema against the real types) is the mechanism, not just the promise: if they diverge, CI fails.

## 2. The engine API — stable

`TreeEngine`, the domain types (`TreeDef`, `NodeDef`, `EdgeDef`, `Effect`…), the layout engines and registry (`LayoutEngineRegistry`) in `@yggdrasil-forge/core`, and the `ygg` CLI surface: **strict semver**. Minor = new API only; patch = fixes only. APIs carry tier markers (`@stable`, `@experimental`, `@deprecated`, `@internal` — MASTER §60): anything not marked `@experimental` is covered by the promise.

## 3. The renderer — stable, with visual leeway

`@yggdrasil-forge/react` (SkillTree, themes, icons, viewport): the **API** follows strict semver; the **exact pixel** is not a contract — visual improvements that don't change the API may land in a minor (a theme may refine a tone; your configuration keeps working).

## 4. The application layer — moves faster

`@yggdrasil-forge/editor-core` and `@yggdrasil-forge/editor-react` are the **application** layer (the editor): they version with the group but are still private, and their surface may move faster while the Studio grows. If you build on them, pin versions. What the editor **produces** — the document — is covered by the hard promise in section 1: nothing the editor evolves can break your files.

## What to trust, in short

- **Trust the file**: it is the contract. Generate it with AI, keep it for years, load it anywhere.
- **Trust `core` and the CLI**: strict semver.
- **Trust the `react` API**, not the pixel.
- **Pin `editor-*`** if you build on them.

The format details live in [concepts](../conceptos/) and [the file and the schema](../ficheiro-e-schema/).
