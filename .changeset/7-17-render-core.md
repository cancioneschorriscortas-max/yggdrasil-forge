---
'@yggdrasil-forge/editor-core': minor
---

feat(editor-core): helpers de render — `themeOverridesFromSpec` + `standaloneSvg` (7.17)

- `themeOverridesFromSpec(spec, dark)`: o mapeo `meta.theme → overrides
  de ThemeColors` extraído de EditorCanvas SEN cambio de comportamento,
  para que o CLI e calquera consumidor headless o compartan.
- `standaloneSvg(markup, opts)`: autocontención dun SVG de árbore
  (xmlns, width/height deterministas do viewBox, rect de fondo, fonte
  embebida, cero `var(--…)` — erro honesto se as hai). A ÚNICA fonte
  para o export do editor e para `ygg render`.
