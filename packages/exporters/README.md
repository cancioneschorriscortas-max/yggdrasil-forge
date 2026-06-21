# @yggdrasil-forge/exporters

Export skill tree definitions to external formats.

## Status

🟢 **Active** — JSON / YAML serialization landed in F9.4. Further formats
(GraphML, JSON-LD, DOT/Graphviz, Mermaid, custom LMS) tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Convert Yggdrasil Forge `TreeDef` instances to external formats for
integration with external tooling and pipelines.

## API

### `exportTreeToJson(tree, options?)`

Serializes a `TreeDef` to a JSON string. Deterministic and lossless;
`JSON.parse(exportTreeToJson(t))` is structurally equal to `t`.

```ts
import { exportTreeToJson } from '@yggdrasil-forge/exporters'

const json = exportTreeToJson(tree)                    // pretty (default)
const compact = exportTreeToJson(tree, { pretty: false })
const indented = exportTreeToJson(tree, { indent: 4 })
```

Options:

- `pretty?: boolean` — indented output. Default: `true`.
- `indent?: number` — indentation spaces when `pretty`. Default: `2`.

### `exportTreeToYaml(tree)`

Serializes a `TreeDef` to a YAML string via the `yaml` package (pure JS).
Round-trip works with `importTreeFromYaml` in `@yggdrasil-forge/importers`.

```ts
import { exportTreeToYaml } from '@yggdrasil-forge/exporters'

const yaml = exportTreeToYaml(tree)
```

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/importers](../importers): Inverse direction
  (import from external formats).
- [@yggdrasil-forge/cli](../cli): CLI exposes exporters.

## License

MIT
