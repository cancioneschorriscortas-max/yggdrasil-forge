# Yggdrasil Forge — gold gallery

> ⚠️ En galego: esta galería son exemplos de ouro do formato de documento — datos válidos garantidos por test; o `README` vai en inglés porque a audiencia é externa (máquinas, terceiros e IAs).

Known-good example documents for the Yggdrasil Forge document format
(`{ tree, editor }`). Every file here is guaranteed importable: a test
runs `deserializeDocument` over each `*.json` on every CI pass, so the
gallery cannot rot.

Use these together with the published JSON Schema
([`schema/yggdrasil-document.schema.json`](../../schema/yggdrasil-document.schema.json))
as few-shot examples when generating documents programmatically (or
with an AI). Validate output with `ygg validate <file>` from
`@yggdrasil-forge/cli`.

## Files

### `minimal.json` — the smallest useful document
Hand-written, didactic. Exercises:
- 2 nodes (`small` + `keystone`), 1 `dependency` edge.
- 1 resource with `initial` (seeds the play-mode budget).
- A `prerequisites` group (`all`) with a `node_unlocked` condition.
- `costPerTier` (dense array, single tier).
- Bilingual labels (`gl`/`en`) at every level.
- `editor.coordinateBounds` (stable canvas world box).

### `panadeiro.json` — the friendly reference tree
Generated from the canonical baker fixture (`examples/editor`) with
`serializeDocument` — never edited by hand. Exercises:
- Node `groups` (two groups).
- A multi-tier node (`maxTier: 3`) with escalating `costPerTier`.
- A document theme (`editor.theme`): preset, per-state `nodeFills`
  and a region tint bound to a node tag.
- `editor.coordinateBounds` + document `background` reference.

### `adversarial.json` — the deliberately awkward tree
Generated from `adversarialDocument()` (`@yggdrasil-forge/editor-core`)
with `serializeDocument` — never edited by hand. Exercises the paths
the friendly data never touches:
- **No** `editor.coordinateBounds` (renderer must derive bounds).
- Bilingual labels at every level (tree, nodes, resources).
- 2 resources, one `refundable` with `refundPercent`.
- `prerequisites` groups `any` **and** `none`.
- Symmetric `exclusions` between two nodes.
- `tags` + `editor.theme.regions` with two regions (one shared).
- A node with its own `color` override; a node **without** `position`.

## Regenerating

`minimal.json` is manual. The other two:

```bash
HUSKY=0 corepack pnpm turbo run build --filter @yggdrasil-forge/editor-core
HUSKY=0 corepack pnpm --filter @yggdrasil-forge-examples/editor run gen:gallery
```
