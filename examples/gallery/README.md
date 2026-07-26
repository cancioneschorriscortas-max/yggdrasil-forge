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

### `lobo-de-inverno.json` — the AI-authored showcase
*"The Winter Wolf Path"* — generated end-to-end by an AI assistant from the
published schema plus this gallery, valid on the first try. The most complete
example: use it as the reference for what a finished, game-ready document
looks like. Exercises:
- 18 nodes in 3 branches with a shared trunk and a summit keystone reachable
  via an `any` group over three branch keystones.
- Embedded **SVG icons as data URIs** (self-contained, no network) on
  keystones/notables; Unicode runes as text icons on minor nodes.
- A **background image** (`editor.background.src`, data-URI SVG night sky).
- Full **theme**: per-state `nodeFills`, `textColor`, 3 tinted regions bound
  to node tags; hexagon/diamond/circle shapes; per-node `color` + `size`
  override on the summit.
- Two resources with `icon`, `color`, `initial` and `max`; multi-rank nodes
  with escalating `costPerTier`; `node_maxed` prerequisites; symmetric
  `exclusions` between two keystones ("choose your path").
- Screenshots in [`docs/assets/`](../../docs/assets/) (see the root README's
  *AI-assisted authoring* section).

### `congoxa-netrunner.json` — the neon mesh (AI-authored)
*"The Netrunner's Dread"* — cyberpunk theme on near-black with a neon grid
background. Structurally the opposite of the wolf tree: a **mesh with
cross-branch links** instead of symmetric fans. Exercises:
- Cross-links between branches (a node reachable from two branches via an
  `any` group); two mutually-exclusive capstones feeding a shared summit.
- Dark neon theme: cyan state fills, magenta/cyan/amber region tints, and a
  per-node `color` override (magenta summit).
- Embedded SVG icon set (chip, skull, ghost, storm…) as data URIs.

### `escola-de-gaita.json` — the learning path (AI-authored)
*"Gaita School"* — a **Galician bagpipe course**, proving the engine works
for education, not just games. Exercises:
- A **light parchment theme** (the other two showcases are dark): warm
  fills, ink text, music-staff background — "Same Data, Different Themes".
- Left-to-right course layout (progression as a timeline, not a fan).
- A single resource (practice hours); a final keystone gated by an `all`
  group across the three tracks (breath / fingering / repertoire), with a
  `node_maxed` condition on the technique node.

### `gaia-cards.json` — the card-ready pattern
*"Constellation Atlas"* — **the reference pattern for generating trees meant
for the cards view** (the `graph | cards` toggle in the editor canvas): each
group renders as a card, each member node as an icon+label+badge row.
Exercises:
- 4 groups with bilingual `label`, `color`, `icon` (built-in registry ids:
  `sparkle`/`arrow`/`bolt`/`gem`) — one group without `color` (deterministic
  palette rotation) and two with `position` (explicit card placement; the
  rest fall back to the automatic ring).
- **Dual membership, deliberately mixed**: some nodes join via
  `GroupDef.nodeIds`, others declare `node.group`, one group uses both.
  Either way works; generators can pick whichever is convenient.
- Two nodes with **no group at all** → they appear under a synthetic
  *"Ungrouped"* card (the view never hides tree content).
- Varied `maxTier` (1/2/3) so card badges show `0/1`, `0/3`… and fill up
  as you play in Proba mode.

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
