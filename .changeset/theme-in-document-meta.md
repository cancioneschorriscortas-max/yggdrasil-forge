---
'@yggdrasil-forge/editor-core': minor
---

Add theme as document data (7.5e):
- New `ThemeSpec` type: `{ nodeFills?, regions?, preset? }` in
  `DocumentMeta.theme` (optional).
- New `setMetaField<K>(field, value)` command: typed mirror of
  `setNodeField` but for `DocumentMeta`. Undo/redo automatic; enables
  UI to edit theme (and `background`) as data.
- `createEditorDocument` and JSON round-trip preserve `theme`
  (spread-conditional over `formatVersion`).

Consumers importing `EditorDocument`/`DocumentMeta` need no changes —
`theme` is optional. Consumers doing structural destructuring of
`DocumentMeta` may need to acknowledge the new field. `ThemeSpec` is
headless (no React dependency); mapping to a concrete `Theme` from
`@yggdrasil-forge/react` happens in the UI consumer.
