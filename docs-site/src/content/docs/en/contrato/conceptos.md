---
title: Concepts
description: Nodes, edges, resources, prerequisites, exclusions, tiers and effects — the vocabulary of a progression tree.
sidebar:
  order: 1
---

A Yggdrasil Forge tree is a **`TreeDef`**: a directed graph of **nodes** joined by **edges**, with an economy of **resources** and **unlock** rules. The engine (`@yggdrasil-forge/core`) only understands this data; the editor, the renderer and the CLI work on top of it. *Same data, different themes.*

## Nodes

A node is something that can be **unlocked**: a skill, a lesson, a technology.

| Field | What it is |
|---|---|
| `id` | Stable, unique identifier (`pan_básico`). References (edges, prerequisites, effects) point by id. |
| `type` | Semantics and default shape: `small`, `notable`, `keystone`, `mastery`, `ascendancy`, `root`, `cluster`, `gateway`, `milestone`, `subtree_anchor`, `custom`. |
| `label`, `description` | Localizable text (`"Bread"` or `{ "gl": "Pan", "en": "Bread" }`). |
| `position` | `{ x, y }` in world space. Optional: `ygg layout` or *Dispor* fill it in. |
| `color`, `icon`, `shape`, `size`, `iconScale` | Appearance. `icon` accepts an emoji, an image URL or a registered icon id (`logic-key`, `norse-wolf`). |
| `maxTier` | How many **tiers** (ranks) it has (default 1). A 3-tier node unlocks in stages. |
| `cost`, `costPerTier` | What unlocking costs: a list of `{ resourceId, amount }`, or one list per tier. |
| `prerequisites` | The unlock rule (below). |
| `exclusions` | Ids of mutually exclusive nodes (*picking A closes B*). |
| `effects` | What happens on unlock (below). |
| `tags`, `group` | Tags (region tints, `tag_count` conditions) and group membership. |

## Edges

An edge `{ id, source, target, type }` **draws** a relationship. The `dependency` type is the main semantics: *A → B* means "B depends on A". Other types: `soft_dependency` (recommendation), `exclusion`, `enhancement`, `path`, `cluster`, `subtree_link`. Edges are the topology the layouts see; **the actual unlock rule lives in `prerequisites`** (when you connect in the editor, it adds both at once).

## Prerequisites

An `UnlockRule` is a **combinator** (`all`, `any`, `none`) over a flat list of **conditions**:

```json
"prerequisites": {
  "type": "all",
  "conditions": [
    { "type": "node_unlocked", "nodeId": "flour" },
    { "type": "resource_min", "resourceId": "coins", "amount": 5 }
  ]
}
```

Available conditions: `node_unlocked`, `node_maxed`, `node_state`, `tier_min`, `resource_min`, `tag_count`, `nodes_count`, `distance_max`, `progress_min`, `stat_min`, `subtree_completion`, `time_after`, `time_before`. A cycle (*A requires B which requires A*) does not block saving, but the editor warns about it and the layered layout rejects it.

## Resources and economy

```json
"resources": [{ "id": "point", "label": { "en": "Point" }, "initial": 3, "max": 10 }]
```

Resources are spent on costs and can be refunded (`refundable`, `refundPercent`). `initial` seeds the Play-mode budget. A cost referencing a non-existent resource is an editor warning.

## Tiers

With `maxTier > 1`, each unlock raises one tier. `costPerTier` is a **dense** list (one cost per tier: `[[…tier1], […tier2]]`). Visually, a half-way node is painted as *in progress*.

## Effects

On unlock, a node can fire effects: `modify_resource`, `modify_node_state`, `set_node_visibility`, `unlock_node`, `set_progress`, `trigger_event`, plus the composite ones `composite` / `conditional`. The editor only offers the ones the runtime knows how to apply.

## Groups and subtrees

**Groups** (`groups`) bundle nodes by `nodeIds` or by `node.group`; the *clustered radial* layout and the **cards** view are built on them. **Subtrees** (`subtrees`) nest one `TreeDef` inside another (curricula).

## Node states

At any moment the engine computes: `locked`, `unlockable`, `unlocked`, `maxed`, `in_progress` (and `hidden`, `disabled`, `expired`). The theme paints one fill per state — that is why presets carry five colors.

Next: [the file and the schema](../ficheiro-e-schema/).
