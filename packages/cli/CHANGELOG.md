# @yggdrasil-forge/cli

## 1.0.0

### Major Changes

- Yggdrasil Forge 1.0 — motor de árbores de progresión, completo de punta a punta

  - **Renderer tematizable**: SkillTree SVG accesible con viewport, temas
    claro/escuro, recheos por estado, rexións, e tres sets de iconas
    recoloreables (builtin, norse, logic).
  - **Editor completo**: autoría visual (crear/mover/conectar), Inspector
    co rexistro de propiedades, validación en vivo, auto-layout con cinco
    motores, vista de tarxetas, presets de tema con nome, selector de
    iconas, modo Proba, exportación SVG/PNG, autosave e PWA offline.
  - **A vía do dato**: JSON Schema publicado, galería de ouro garantida
    por test, e o CLI `ygg` (validate · layout · render · schema · new) —
    unha IA xera unha árbore completa sen abrir o editor.
  - **Docs públicas bilingües** (galego primeiro): guías, contrato,
    layouts, theming e exemplos renderizados en cada build.

### Minor Changes

- d603eed: feat(cli): `ygg` v1 — a vía do dato (7.15)

  O paquete deixa de ser un stub. Tres comandos:

  - `ygg validate <ficheiro|->` — valida co MESMO camiño que o editor
    (`deserializeDocument`); exit 0/1; con `--json` emite
    `{ok, issues:[{severity, code, message}], stats}` — o erro como dato
    accionable para bucles automatizados (IAs, pipelines).
  - `ygg schema [--out ficheiro]` — emite o JSON Schema do documento
    completo (mesma fonte que `schema/yggdrasil-document.schema.json`).
  - `ygg new [--id x] [--label "…"]` — documento baleiro válido por
    stdout (`ygg new | ygg validate` pasa).

  Tamén: xerador do JSON Schema publicado (zod-to-json-schema) con gate
  de drift, e test anti-podrecemento da galería de ouro
  (`examples/gallery/`).

- a5364b0: feat(cli): `ygg layout` — o pipeline IA completo sen GUI (7.16)

  `ygg layout <ficheiro|-> --algo radial|tree|clustered-radial|constellation
[--out f]`: valida, aplica o auto-layout directo sobre o documento e
  emite o resultado. Con isto: xerar → validate → layout → importar, todo
  por CLI. Determinista (mesmo input → mesmo JSON).

- 29fdf5c: feat(cli): `ygg render` — o bucle xerar→ver→refinar péchase (7.17)

  `ygg render <ficheiro|-> --out <f.svg> [--dark] [--locale gl] [--width N]`:
  render headless da árbore a SVG autocontido (renderToStaticMarkup do
  SkillTree real + standaloneSvg). Co pipeline completo — xerar →
  validate → layout → render — unha IA pode VERSE e refinarse sen GUI.
  `--locale` pre-resolve as labels do dato (sen tocar @react).

- 2a7aafc: feat: «Capas (para DAGs)» en Dispor + axuda por algoritmo + ygg layout --algo layered

  `layered` únese á vía do dato completa: `AutoLayoutAlgo` e config por
  defecto (90/130, espello de tree) en editor-core; entrada no menú
  Dispor e no convite en editor-react, agora cunha liña de axuda por
  algoritmo (cada un di a súa condición de uso); `--algo layered` no CLI.
  O panadeiro da galería queda recolocado con layered como canónico do
  caso multi-pai. O schema publicado xa admitía `layered` (layout.type é
  aberto por deseño): sen drift.

### Patch Changes

- Updated dependencies [b13974f]
- Updated dependencies [7a12ac7]
- Updated dependencies [48cbf0f]
- Updated dependencies [25dae47]
- Updated dependencies [31eecec]
- Updated dependencies [ba14f74]
- Updated dependencies [ccfe428]
- Updated dependencies [a40dba3]
- Updated dependencies [bde42d7]
- Updated dependencies [5e55e2d]
- Updated dependencies [57746e0]
- Updated dependencies [0fc56ff]
- Updated dependencies [2a7aafc]
- Updated dependencies [2a7aafc]
- Updated dependencies [2a526c9]
- Updated dependencies [be15bc0]
- Updated dependencies [ca29e3b]
- Updated dependencies [bf704d0]
- Updated dependencies [30ce28f]
- Updated dependencies [7b79150]
- Updated dependencies [27b9f61]
- Updated dependencies [b9da309]
- Updated dependencies [c59ea73]
- Updated dependencies [7c9bf01]
- Updated dependencies [834c632]
- Updated dependencies [ab45275]
- Updated dependencies [885aebc]
- Updated dependencies [e2e9df4]
- Updated dependencies [8597e50]
- Updated dependencies [416df9a]
- Updated dependencies
- Updated dependencies [99d0d44]
- Updated dependencies [2eac199]
- Updated dependencies [5f41960]
- Updated dependencies [2a11e25]
  - @yggdrasil-forge/editor-core@1.0.0
  - @yggdrasil-forge/react@1.0.0
  - @yggdrasil-forge/core@1.0.0
  - @yggdrasil-forge/common@1.0.0
