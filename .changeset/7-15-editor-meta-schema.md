---
'@yggdrasil-forge/editor-core': minor
---

feat(editor-core): Zod para o namespace `editor` do ficheiro (7.15)

Novos schemas públicos (`documentMetaSchema`, `themeSpecSchema`,
`backgroundRefSchema`, `boundsSchema`, `themeRegionTintSchema`) que
espellan os tipos TS do documento. `deserializeDocument` valida agora
tamén o namespace `editor`: tipos errados nos campos coñecidos → `err`
coa ruta do campo (ex. `editor.theme.nodeFills.locked`); claves
descoñecidas do futuro consérvanse tal cal (passthrough,
forward-compat). Contrato ampliado: se devolve `ok`, o documento
ENTEIRO é san — árbore E meta.
