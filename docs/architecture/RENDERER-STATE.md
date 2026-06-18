# Renderer 2.0 — estado consolidado

> Estado das sub-fases do **Renderer 2.0** (Fase 10) do Yggdrasil Forge.
> Fonte de verdade para o estado actual do renderer; complementaria a
> `MASTER.md` (decisións arquitectónicas + leccións).

## Sub-fases pechadas

| Sub-fase | Descrición | Estado |
|---|---|---|
| **F10.1** | `SkillTreeWithDefaultTheme` respecta `ThemeProvider` ascendente (non sobrescribe sempre con `minimal`). | ✅ pushed |
| **F10.2** | `NodeDef.shape?` + `NodeDef.size?` + `NodeShape` (`circle/square/diamond/hexagon/octagon`) tipados + Zod. | ✅ pushed |
| **F10.3** | Flat orb: shape + icono dentro + label debaixo + anel de cor por estado. Padding aware do raio máximo. | ✅ pushed |
| **theme-lab** | Demo: panel "Theme Lab" en vivo (color pickers + ring-width + presets + copy-values). | ✅ pushed |
| **F10.3.fix** | Tematización por **inline style desde `useTheme()`** (eliminada a cascada via CSS vars no `<style>` interior, que era fráxil). | ✅ pushed |
| **F10.3.fix-2** | `ThemeContext` = **singleton cross-bundle** (`Symbol.for(globalThis)`); `/headless` re-exporta `ThemeProvider`. Resolve o `useTheme()===null` cando se mestura `/index` + `/headless`. | ✅ pushed |
| **F10.4** | SkillEdge v2: `SkillTree.curve?` prop + edge-state coloring (`edgeStateFor`) + `ThemeColors.edgeActive?` + frechas (`EdgeStyle.directed?` + `<defs><marker>`) + `shortenEdgeAtTarget` para visibilidade. | ✅ pushed |
| **F10.4b** | Curva e routing baixan ao **contrato de datos**: `LayoutConfig.curve?` + `EdgeStyle.routing?` aplicados por `computeLayout` via `applyEdgeRouting`. `SkillTree.curve` queda como override de presentación. | ⏳ neste patch |

## Decisións arquitectónicas relacionadas (MASTER)

- **A.6.17** — `ThemeContext` singleton multi-entry-point.
- **A.6.18** — `pnpm turbo run build --force` (non `pnpm --filter`) para DTS interdependente.
- **A.6.19** — `marker-end` SVG + orde de render + `shortenEdgeAtTarget`.
- **A.6.20** — Curva/routing = contrato de datos, non prop de React.

## Backlog (Renderer 2.0)

- **F10.5+** (sen briefing aínda): a definir polo Director. Posibles:
  candidatos a polish: animacións de transición de estado nos nodos
  (locked→unlockable→unlocked), efectos de hover/focus máis ricos,
  serialización de `LayoutConfig.curve` en exportadores; tema dark
  "Oberón" oficial; migración de emojis nativos a iconos
  recoloreables (xa anotada en F10.3 plano).

## Notas de versión externas

- `@yggdrasil-forge/core@0.x`: introduce `LayoutConfig.curve` +
  `EdgeStyle.routing` (F10.4b). Retrocompatible: TreeDefs sen estes
  campos seguen renderizando edges rectos.
- `@yggdrasil-forge/react@0.x`: `SkillTree.curve` prop conservado como
  override de presentación (F10.4b non o elimina; só rebaixa o seu papel
  semántico). Cero breaking changes.
