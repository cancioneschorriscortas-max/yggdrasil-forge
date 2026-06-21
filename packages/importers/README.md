# @yggdrasil-forge/importers

Import skill tree definitions from external formats.

## Status

🟢 **Active** — GAIA importer (F9.3) + generic `importTree` + identity
import from JSON/YAML (F9.4) shipped. Further importers (Graphviz/Mermaid,
JSON-LD, LMS exports) tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Convert external skill tree formats into Yggdrasil Forge `TreeDef`
instances. *Build narrow, design wide:* GAIA is the customer-zero
consumer, but the generic `importTree` keeps the door open for games,
courses, and other graph-shaped domains.

## API

### `importTree(data, mapping)` — design-wide

Map any input shape to a `TreeDef` by providing a `TreeMapping<TInput>`.
Pure mapping (no I/O, deterministic). Does **not** validate; that's the
engine's job (`validateTreeDef`).

```ts
import { importTree, type TreeMapping } from '@yggdrasil-forge/importers'

interface Course {
  slug: string
  title: string
  steps: { key: string; name: string }[]
}

const mapping: TreeMapping<Course> = {
  id: (c) => c.slug,
  label: (c) => c.title,
  nodes: (c) => c.steps.map((s) => ({ id: s.key, type: 'small', label: s.name })),
}

const tree = importTree(myCourse, mapping)
```

Required mappers: `id`, `label`, `nodes`. The rest (`edges`, `groups`,
`rootNodeId`, `metadata`, `version`, `layout`) have sensible defaults.

### `importTreeFromJson(json)` / `importTreeFromYaml(yaml)` — identity import

Load a document that **already has the shape of a `TreeDef`** (the
inverse of `exportTreeTo{Json,Yaml}`). Parses and structurally validates
via the engine. Never throws — bad input returns `err`.

```ts
import { importTreeFromJson, importTreeFromYaml } from '@yggdrasil-forge/importers'

const r = importTreeFromJson(jsonString)
if (r.ok) {
  console.log(r.value.id)
} else {
  console.error(r.error.message)
}
```

### `importGaiaProfession(input, options?)`

Existing GAIA importer (F9.3). Maps a `GaiaProfession` (profession +
groups + microskills with `conectadas`) to a `TreeDef`. See [GAIA fixture](../../docs/architecture/data-contracts/panadeiro.fixture.json)
for the contract.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/exporters](../exporters): Inverse direction
  (export to external formats).
- [@yggdrasil-forge/validators](../validators): Validate imported trees.
- [@yggdrasil-forge/cli](../cli): CLI exposes importers.

## License

MIT
