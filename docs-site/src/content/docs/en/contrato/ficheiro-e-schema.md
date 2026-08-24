---
title: The file and the schema
description: The { tree, editor } document, the published JSON Schema and how to validate it.
sidebar:
  order: 2
---

## The document: two namespaces

An editor `.json` file has **two** fields:

```json
{
  "tree":   { "id": "…", "schemaVersion": "1.0.0", "version": "1.0.0", "label": …, "nodes": […], "edges": […], "layout": { "type": "custom" } },
  "editor": { "formatVersion": "1.0.0", "coordinateBounds": { "minX": -60, "minY": -60, "maxX": 180, "maxY": 60 } }
}
```

- **`tree`** is the `TreeDef`: the portable contract. It is the only thing the engine, the renderer or any other consumer needs. You can use it alone (`new TreeEngine(doc.tree)`).
- **`editor`** is what belongs to the **editor**, not the domain: the world framing (`coordinateBounds`), the **document theme** (`theme`: per-state fills, text color, regions, preset), the **background** (`background`), thumbnail and imports. Lose it and the tree is still the same tree.

This separation is an architectural decision (MASTER A.6): the editor is a tool **over** data, it does not contain data.

## The published JSON Schema

The schema lives in the repository and is generated from the real (Zod) types of the engine and the editor, with a drift test that fails if they diverge:

**[`schema/yggdrasil-document.schema.json`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/blob/main/schema/yggdrasil-document.schema.json)**

The CLI emits it too — handy for pipelines that don't want to depend on a URL:

```bash
npx ygg schema --out yggdrasil-document.schema.json
```

Use it to: validate in any language (it is JSON Schema draft-07), get autocompletion in editors (`"$schema"`), and as **context for an AI** together with the [gallery](../../exemplos/galeria/).

> `layout.type` is an **open** string on purpose: besides the bundled engines (`radial`, `tree`, `layered`, `clustered-radial`, `constellation`, `custom`), a consumer may register its own. The schema does not restrict it.

## Validation: two layers

1. **Schema** (shape): fields, types, enumerations. What any JSON Schema validator does.
2. **Hard validators** (semantics): unique ids, existing references (edges, prerequisites, costs, exclusions), acyclic subtrees. `ygg validate` and the editor's import run them: if they pass, **the whole document is loadable**.

On top sit the **soft validators** (warnings): asymmetric exclusions, prerequisite cycles, nodes outside the framing, unsupported effects. They don't block; they show up in the *Problemas* panel.

```bash
npx ygg validate tree.json           # human-readable
npx ygg validate tree.json --json    # { "ok": false, "issues": [ … ] } — error as data
npx ygg new --id demo --label "Demo" # a valid empty document to start from
```

## Two minimal documents

The smallest useful one is in the gallery: [`minimal.json`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/blob/main/examples/gallery/minimal.json) — two nodes, one resource, one prerequisite, a per-tier cost, bilingual labels and framing. And the "friendly" reference, the baker tree, with groups, tiers and a theme.

## How far the promise goes

What this file describes is the **stable contract** of 1.x: additive schema, intact unlock semantics and guaranteed round-trip. The detail — which layer promises what, and under which versioning policy — lives in [the stable contract](../contrato-estable/).
