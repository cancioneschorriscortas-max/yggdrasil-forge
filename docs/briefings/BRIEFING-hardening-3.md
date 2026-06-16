# BRIEFING — SUB-FASE hardening-3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **TERCEIRA do ciclo de hardening pre-release 0.1.0-alpha**.
> Resolve a falla de READMEs informativos en **15 paquetes** (13
> scaffold + 2 activos sen README real: storage + react).
>
> **Achado crítico do director** (verificado empíricamente):
> - 13 paquetes scaffold con README placeholder de 21 liñas: OK
>   pero require informativo "scaffold; planned for future phase".
> - **2 paquetes activos** (storage + react) con **README placeholder**
>   aínda con código activo (~309 tests entre os dous). **Falla
>   importante para release 0.1.0-alpha**.
>
> **Pezas (4 grupos)**:
> 1. **13 READMEs scaffold informativos** (~30-40 liñas cada un):
>    analytics, cli, devtools, diff, exporters, heatmap, i18n,
>    importers, multitenancy, neo4j, stats, themes, webhooks.
> 2. **2 READMEs activos detallados** (~80-120 liñas cada un):
>    storage, react.
> 3. **Borrar `docs/briefings/briefings.zip`** (cosmético; herdado
>    de hardening-2; cero relevante en repo).
> 4. **Auto-tracking** deste briefing en `docs/briefings/` (segundo
>    convención A.5.2 establecida en hardening-2).
>
> **Decisións confirmadas polo director**:
> - **Cero comprometer Fase concreta** nos READMEs scaffold: usar
>   "planned for a future phase" en xeral (MASTER cero detalla
>   Fases 10-19 individuais).
> - **READMEs activos con exemplos verificables** (storage +
>   react): copiar APIs reais dos `src/index.ts` actuais.
> - **Borrar briefings.zip**: pure cosmético; cero risco.
> - **READMEs scaffold compactos** (cero técnicos): tagline +
>   status + brief description + related + license.
> - **READMEs activos completos**: installation + quick start +
>   exemplos por API + notes + related + license.
>
> **Aliñado con MASTER A.4.3** (decisión pre-release): *"Engadir
> README placeholder real a cada baleiro antes do primeiro publish"*.
>
> **Risco BAIXO**: pure documentación. Cero impacto en código.
>
> 8.4.b.ii recuperado polo Agarfal no zip hardening-2 (confirmado).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1** — Scripts en `/tmp/ygg-exec/`.

**0.2** — `.gitignore` intacto.

**0.3** — Tests SEMPRE con `--force`** (cero novos esperados).

**0.4** — Decisións do director non se consultan.

**0.5** — ANTI-PLACEHOLDER grep literal no reporte (cero
coincidencias esperadas).

**0.6** — ESCALADO: decisión non resolta → PARA.

**0.7** — TÍTULOS PRESCRITOS:
- Pushed: `═══ SUB-FASE hardening-3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE hardening-3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8** — `git am`: `git status` + `git log -1` antes de teorizar.

**0.9** — CHANGELOG (DT-12): nova `[Unreleased]`.

**0.10** — exactOptionalPropertyTypes: cero aplicable.

**0.11** — c8 ignore: cero aplicable.

**0.12 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 ficheiros .ts modificados**.
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 cambios funcionais**.
- Tódolos **2195 tests** deben seguir pasando inchanged.

**0.13 — Convención A.5.2 (auto-tracking briefings)**: este propio
briefing copíase a `docs/briefings/BRIEFING-hardening-3.md` como
parte da sub-fase.

**0.14 — READMEs son MODIFICADOS, NON NOVOS**: tódolos 15 READMEs
xa existen (con placeholder). **Substituír contido total** (cero
crear desde cero).

---

## 1. IDENTIFICACIÓN

Sub-fase **hardening-3**. **TERCEIRA do ciclo de hardening
pre-release 0.1.0-alpha**.

**Pezas (5 grupos)**:

**Grupo A — 13 READMEs scaffold informativos (MODIFICADOS)**:
1. `packages/analytics/README.md`
2. `packages/cli/README.md`
3. `packages/devtools/README.md`
4. `packages/diff/README.md`
5. `packages/exporters/README.md`
6. `packages/heatmap/README.md`
7. `packages/i18n/README.md`
8. `packages/importers/README.md`
9. `packages/multitenancy/README.md`
10. `packages/neo4j/README.md`
11. `packages/stats/README.md`
12. `packages/themes/README.md`
13. `packages/webhooks/README.md`

**Grupo B — 2 READMEs activos detallados (MODIFICADOS)**:
14. `packages/storage/README.md`
15. `packages/react/README.md`

**Grupo C — Borrar briefings.zip (BORRADO)**:
16. `docs/briefings/briefings.zip` via `git rm`.

**Grupo D — Auto-tracking deste briefing (NOVO)**:
17. `docs/briefings/BRIEFING-hardening-3.md` (copia deste mesmo
    briefing).

**Grupo E — Housekeeping (2 ficheiros)**:
18. **NOVO** `.changeset/hardening-3-readmes-and-cleanup.md`.
19. **MODIFICADO** `CHANGELOG.md`.

**Total: 19 ficheiros tocados** (3 NOVOS + 15 MODIFICADOS + 1
BORRADO).

**Cero modificación de**:
- Calquera ficheiro .ts.
- Configs (tsconfig, tsup, vitest, package.json).
- Tests.
- READMEs xa informativos (common, core, plugins, search,
  validators).
- Os 84 briefings xa en docs/briefings/ + os 5 da sesión.
- MASTER.md.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director sobre commit `5eeef8b`, verificada
empíricamente**.

### Estado actual READMEs por paquete (verificado)

| Paquete | src files | README liñas | Categoría |
|---|---|---|---|
| analytics | 1 | 21 | Scaffold (substituír) |
| cli | 1 | 21 | Scaffold |
| devtools | 1 | 21 | Scaffold |
| diff | 1 | 21 | Scaffold |
| exporters | 1 | 21 | Scaffold |
| heatmap | 1 | 21 | Scaffold |
| i18n | 1 | 21 | Scaffold |
| importers | 1 | 21 | Scaffold |
| multitenancy | 1 | 21 | Scaffold |
| neo4j | 1 | 21 | Scaffold |
| stats | 1 | 21 | Scaffold |
| themes | 1 | 21 | Scaffold |
| webhooks | 1 | 21 | Scaffold |
| storage | 7 | 21 | **ACTIVO** — substituír por real |
| react | 20 | 21 | **ACTIVO** — substituír por real |
| common | 7 | 46 | OK (cero modificar) |
| core | 6 | 155 | OK |
| plugins | 3 | 72 | OK |
| search | 4 | 111 | OK |
| validators | 4 | 165 | OK |

### APIs públicas verificadas

**@storage** (`packages/storage/src/index.ts`):
```
exports:
  MemoryStorage
  LocalStorageAdapter + LocalStorageAdapterOptions
  IndexedDBAdapter + IndexedDBAdapterOptions
  SessionStorageAdapter + SessionStorageAdapterOptions
  FileSystemAdapter + FileSystemAdapterOptions
  ScopedStorage
  VERSION
```

**@react** (`packages/react/src/index.ts`):
```
exports:
  SkillTree (con default theme; wrapper)
  SkillTreeProps
  SkillNode + SkillNodeProps
  SkillEdge + SkillEdgeProps
  MeshOverlay + MeshOverlayProps
  SVGRenderer + SVGRendererProps
  ThemeProvider + ThemeProviderProps
  Theme + ThemeColors + ThemeSizes
  minimal (theme)
  useSkillTree, useNodeState, useNodeSelector, useStat (hooks)
  VERSION
Subentry: /headless (cero estilos)
```

**StorageAdapter interface** ahora en `@yggdrasil-forge/common`
(tras hardening-1).

### Mapeo paquete → Fase planificada

**MASTER cero detalla Fases 10-19 individualmente**. Polo tanto:
- **READMEs scaffold**: usar "planned for a future phase" en xeral.
- **Cero comprometer** Fases concretas que poden cambiar.
- Mencionar onde aplicable: "Phase 9 (Visual Editor) for @themes
  active integration" se claro.

### Decisión sobre `briefings.zip`

Herdado de hardening-2 (incluído por accidente). Cero relevante
en repo:
- Os 78 briefings xa están extraídos en docs/briefings/.
- Tamaño: ~XMB (cero medido pero relevante para clean repo).
- Decisión: **borrar via `git rm`** como peza colateral.

### Convención A.5.2 (auto-tracking briefings)

Establecida en hardening-2. Aplica desde **hardening-3** en adiante.
Este briefing copíase a `docs/briefings/BRIEFING-hardening-3.md`
como parte da sub-fase.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `5eeef8b` (hardening-2; 44 briefings).
- **2195 tests monorepo limpos**.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 76 ErrorCodes.
- **54 sub-fases consecutivas sen rollback** (récord).
- 7 paquetes activos + 13 scaffold.
- 85 ficheiros en docs/briefings/ (84 .md + 1 .zip).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Substituír READMEs placeholders dos 15 paquetes (13 scaffold +
storage + react) por READMEs informativos: **13 scaffold** con
formato compacto (~30-40 liñas: title + tagline + status +
description + related + license, sen comprometer Fases concretas
que MASTER cero detalla aínda) + **2 activos detallados** (storage:
~80 liñas con exemplos por adaptador; react: ~100 liñas con
componentes + hooks + themes + entry points root vs headless);
**borrar `docs/briefings/briefings.zip`** (cosmético herdado de
hardening-2 vía `git rm`); **auto-trackear este briefing** a
`docs/briefings/BRIEFING-hardening-3.md` (segundo convención
A.5.2). **Pure documentación**: cero código modificado, cero
tests modificados, cero impacto en typecheck/build/cobertura.
**2195 tests inchanged**. **19 ficheiros tocados** (3 NOVOS + 15
MODIFICADOS + 1 BORRADO). **Risco BAIXO**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (3)**:
- `docs/briefings/BRIEFING-hardening-3.md`.
- `.changeset/hardening-3-readmes-and-cleanup.md`.
- (Outro non; só 2 novos + 1 changeset = 3 total).

Actualizar: NOVOS son 2 (briefing + changeset).

**MODIFICADOS (16)**:
- 13 READMEs scaffold (analytics, cli, devtools, diff, exporters,
  heatmap, i18n, importers, multitenancy, neo4j, stats, themes,
  webhooks).
- 2 READMEs activos (storage, react).
- CHANGELOG.md.

**BORRADOS (1)**:
- `docs/briefings/briefings.zip`.

**Total: 19 ficheiros tocados**.

### 5.2 — Plantilla READMEs scaffold (FIXADO; aplicable a 13
paquetes)

Cada README scaffold segue **a mesma estrutura** con texto
específico por paquete. Esquema base:

```markdown
# @yggdrasil-forge/<paquete>

<Tagline curta dunha liña>

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

<2-3 frases describindo o propósito>

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
<Outras relacións se aplica>

## License

MIT
```

### 5.3 — Contidos específicos READMEs scaffold (FIXADO)

#### `packages/analytics/README.md`

```markdown
# @yggdrasil-forge/analytics

Analytics adapters for skill tree usage tracking.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Integrate Yggdrasil Forge with analytics platforms (Mixpanel,
Amplitude, PostHog, GA4) to track skill unlock events, progression
patterns, and user engagement metrics.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/heatmap](../heatmap): Visual analytics for skill
  paths.
- [@yggdrasil-forge/stats](../stats): Aggregated statistics over
  skill trees.

## License

MIT
```

#### `packages/cli/README.md`

```markdown
# @yggdrasil-forge/cli

Command-line tooling for Yggdrasil Forge.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Provide a CLI for validating, transforming, importing, exporting,
and managing Yggdrasil Forge skill tree definitions. Will include
commands to scaffold new trees, run validators, batch-import from
external formats, and inspect tree statistics.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/validators](../validators): Pedagogical
  validators usable from CLI.
- [@yggdrasil-forge/importers](../importers): Import adapters.
- [@yggdrasil-forge/exporters](../exporters): Export adapters.

## License

MIT
```

#### `packages/devtools/README.md`

```markdown
# @yggdrasil-forge/devtools

Browser DevTools extension for inspecting skill trees.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Chrome / Firefox DevTools extension for live inspection of
TreeEngine state, plugin hooks firing, validator reports, and
event history during development.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/plugins](../plugins): Plugin system inspectable
  via DevTools.

## License

MIT
```

#### `packages/diff/README.md`

```markdown
# @yggdrasil-forge/diff

Diff utilities for skill tree definitions and states.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Compute structural and stateful diffs between two skill tree
definitions or two `TreeState` snapshots. Useful for version
control, migration tooling, and undo/redo systems.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.

## License

MIT
```

#### `packages/exporters/README.md`

```markdown
# @yggdrasil-forge/exporters

Export skill tree definitions to external formats.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Convert Yggdrasil Forge `TreeDef` instances to external formats
(GraphML, JSON-LD, DOT/Graphviz, Mermaid, custom LMS formats) for
integration with external tooling and pipelines.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/importers](../importers): Inverse direction
  (import from external formats).
- [@yggdrasil-forge/cli](../cli): CLI exposes exporters.

## License

MIT
```

#### `packages/heatmap/README.md`

```markdown
# @yggdrasil-forge/heatmap

Visual analytics overlay showing user progression density on skill
trees.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Render heatmap overlays on skill trees showing how often each
node is unlocked, which paths users prefer, and where progression
stalls. Useful for UX research and curriculum design.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/analytics](../analytics): Data source for
  heatmap rendering.
- [@yggdrasil-forge/react](../react): React rendering integration.

## License

MIT
```

#### `packages/i18n/README.md`

```markdown
# @yggdrasil-forge/i18n

Internationalization utilities for Yggdrasil Forge.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Provide tooling to manage and resolve `LocalizedString` values
across multiple locales, integrate with i18n frameworks (i18next,
FormatJS, Lingui), and offer extraction helpers for translation
workflows.

The `LocalizedString` type itself already lives in
[@yggdrasil-forge/common](../common); this package will provide
higher-level utilities.

## Related packages

- [@yggdrasil-forge/common](../common): `LocalizedString` type.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.

## License

MIT
```

#### `packages/importers/README.md`

```markdown
# @yggdrasil-forge/importers

Import skill tree definitions from external formats.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Convert external skill tree formats (game engine exports, LMS
data, Graphviz/Mermaid sources, JSON-LD) into Yggdrasil Forge
`TreeDef` instances, with validation and migration helpers.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/exporters](../exporters): Inverse direction
  (export to external formats).
- [@yggdrasil-forge/validators](../validators): Validate imported
  trees.
- [@yggdrasil-forge/cli](../cli): CLI exposes importers.

## License

MIT
```

#### `packages/multitenancy/README.md`

```markdown
# @yggdrasil-forge/multitenancy

Multi-tenant primitives for serving skill trees to multiple
isolated tenants.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Provide tenant-scoped TreeRegistry, storage namespacing, and
permission checks for SaaS scenarios where multiple organizations
or user groups share a single Yggdrasil Forge deployment with
strict isolation.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeRegistry (single-tenant
  baseline).
- [@yggdrasil-forge/storage](../storage): `ScopedStorage` is a
  building block for tenant isolation.

## License

MIT
```

#### `packages/neo4j/README.md`

```markdown
# @yggdrasil-forge/neo4j

Neo4j graph database adapter for Yggdrasil Forge skill trees.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Synchronize Yggdrasil Forge tree definitions with Neo4j graph
databases, enabling Cypher-based queries, advanced graph analytics,
and bidirectional sync between application-level trees and the
graph store.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/storage](../storage): Local storage adapters
  (Neo4j is a separate concern).

## License

MIT
```

#### `packages/stats/README.md`

```markdown
# @yggdrasil-forge/stats

Aggregated statistics and metrics over skill trees.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Compute aggregated statistics over `TreeDef` and `TreeState`:
unlock counts, depth distributions, prerequisite chain analytics,
critical paths, completion rates, and other derived metrics. The
core `StatComputer` already provides per-node stats; this package
focuses on aggregations and reporting.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): `StatComputer` and stats
  primitives.

## License

MIT
```

#### `packages/themes/README.md`

```markdown
# @yggdrasil-forge/themes

Pre-built themes for the React skill tree renderer.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Curated collection of themes for the
[@yggdrasil-forge/react](../react) renderer: dark/light variants,
genre presets (RPG, sci-fi, fantasy, minimalist), accessibility-first
themes (high contrast, dyslexia-friendly), and customization
primitives.

The `minimal` theme currently ships from `@yggdrasil-forge/react`
itself; this package will host the expanded collection.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/react](../react): React renderer (theme
  consumer).

## License

MIT
```

#### `packages/webhooks/README.md`

```markdown
# @yggdrasil-forge/webhooks

Webhook integration for skill tree events.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Emit HTTP webhooks when significant TreeEngine events occur
(unlocks, completions, milestones), with retry policies, signature
verification, and event filtering for external service integration.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine event system.
- [@yggdrasil-forge/plugins](../plugins): Webhook emitter
  implementable as plugin.

## License

MIT
```

### 5.4 — `packages/storage/README.md` (FIXADO; substitución total)

```markdown
# @yggdrasil-forge/storage

Storage backends for Yggdrasil Forge.

This package provides concrete implementations of the
`StorageAdapter` interface (defined in
[@yggdrasil-forge/common](../common)) for use with the core
`TreeEngine`, `SnapshotManager`, `LoadoutManager`, and
`TreeRegistry`.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/storage @yggdrasil-forge/common
\`\`\`

## Available adapters

| Adapter | Use case |
|---------|----------|
| `MemoryStorage` | In-memory; ideal for tests and SSR. |
| `LocalStorageAdapter` | Browser `localStorage` (synchronous; ~5MB limit). |
| `SessionStorageAdapter` | Browser `sessionStorage` (per-tab). |
| `IndexedDBAdapter` | Browser IndexedDB (asynchronous; large data). |
| `FileSystemAdapter` | Node.js filesystem (server-side). |
| `ScopedStorage` | Wraps any adapter with a key prefix (multi-tenant). |

## Quick start

\`\`\`typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'

const storage = new MemoryStorage()
const engine = new TreeEngine(treeDef, { storage })

await engine.snapshot('checkpoint-1')
\`\`\`

## Adapter examples

### LocalStorageAdapter (browser)

\`\`\`typescript
import { LocalStorageAdapter } from '@yggdrasil-forge/storage'

const storage = new LocalStorageAdapter({ prefix: 'myapp:' })
\`\`\`

### IndexedDBAdapter (browser, async, large data)

\`\`\`typescript
import { IndexedDBAdapter } from '@yggdrasil-forge/storage'

const storage = new IndexedDBAdapter({
  databaseName: 'myapp-trees',
  storeName: 'snapshots',
})
\`\`\`

### FileSystemAdapter (Node.js)

\`\`\`typescript
import { FileSystemAdapter } from '@yggdrasil-forge/storage'

const storage = new FileSystemAdapter({
  baseDirectory: './data/trees',
})
\`\`\`

### ScopedStorage (multi-tenant)

\`\`\`typescript
import {
  ScopedStorage,
  LocalStorageAdapter,
} from '@yggdrasil-forge/storage'

const base = new LocalStorageAdapter()
const tenant1 = new ScopedStorage(base, 'tenant-1:')
const tenant2 = new ScopedStorage(base, 'tenant-2:')
// tenant-1 and tenant-2 cannot read each other's data.
\`\`\`

## Custom adapters

Implement the `StorageAdapter` interface (from
[@yggdrasil-forge/common](../common)):

\`\`\`typescript
import type { StorageAdapter } from '@yggdrasil-forge/common'
import type { Result } from '@yggdrasil-forge/common'

export class MyAdapter implements StorageAdapter {
  async get(key: string): Promise<Result<unknown | null>> {
    // ...
  }

  async set(key: string, value: unknown): Promise<Result<void>> {
    // ...
  }

  async delete(key: string): Promise<Result<void>> {
    // ...
  }

  // ... other methods
}
\`\`\`

## Notes

- The `StorageAdapter` interface lives in `@yggdrasil-forge/common`
  (moved there in sub-phase hardening-1 to avoid coupling `@core`
  to `@storage`).
- All adapters return `Result<T>` for explicit error handling.
- `MemoryStorage` is reset on process restart; use it for tests
  and SSR only.

## License

MIT
```

### 5.5 — `packages/react/README.md` (FIXADO; substitución total)

```markdown
# @yggdrasil-forge/react

React renderer for Yggdrasil Forge skill trees.

Render interactive skill trees with built-in SVG components,
themes, and hooks.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/react @yggdrasil-forge/core react
\`\`\`

`react@18` or newer is required as a peer dependency.

## Quick start

\`\`\`tsx
import { TreeEngine } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'

const engine = new TreeEngine(treeDef)

function App() {
  return (
    <SkillTree
      engine={engine}
      width={800}
      height={600}
    />
  )
}
\`\`\`

This uses the default `minimal` theme automatically.

## Headless mode (no styles)

For full control over styling, import from the `/headless` entry:

\`\`\`tsx
import { SkillTree } from '@yggdrasil-forge/react/headless'

// No theme applied; bring your own CSS or theme.
<SkillTree engine={engine} width={800} height={600} />
\`\`\`

## Components

| Component | Purpose |
|-----------|---------|
| `SkillTree` | Top-level component rendering an entire tree. |
| `SkillNode` | Individual node renderer (composable). |
| `SkillEdge` | Individual edge renderer (composable). |
| `MeshOverlay` | Optional background mesh / grid overlay. |
| `SVGRenderer` | Lower-level SVG container. |
| `ThemeProvider` | Provides theme context to descendants. |

## Hooks

Subscribe to `TreeEngine` state from React with reactive hooks:

\`\`\`tsx
import {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from '@yggdrasil-forge/react'

function MyComponent({ engine, nodeId }) {
  const nodeState = useNodeState(engine, nodeId)
  const isUnlocked = nodeState?.unlocked ?? false

  const playerLevel = useStat(engine, 'level')

  return <div>{isUnlocked ? 'Unlocked!' : 'Locked'}</div>
}
\`\`\`

| Hook | Returns |
|------|---------|
| `useSkillTree(engine)` | The full reactive tree state. |
| `useNodeState(engine, nodeId)` | State for a specific node. |
| `useNodeSelector(engine, selector)` | Filtered nodes via selector. |
| `useStat(engine, statId)` | Reactive value of a single stat. |

## Themes

The default `minimal` theme ships with the package. For more themes,
see the planned [@yggdrasil-forge/themes](../themes) package.

\`\`\`tsx
import { ThemeProvider, minimal } from '@yggdrasil-forge/react'

<ThemeProvider theme={minimal}>
  <SkillTree engine={engine} />
</ThemeProvider>
\`\`\`

Define a custom theme by implementing the `Theme` type:

\`\`\`tsx
import type { Theme } from '@yggdrasil-forge/react'

const myTheme: Theme = {
  colors: { /* ... */ },
  sizes: { /* ... */ },
  // ...
}
\`\`\`

## Notes

- Components use SVG; no Canvas or WebGL is required.
- Hooks subscribe to `TreeEngine` events efficiently (only
  re-render on relevant state changes).
- The package is tree-shakeable; importing individual components
  avoids loading the rest.
- SSR-friendly: components render statically; hydration is
  client-only.

## Related packages

- [@yggdrasil-forge/core](../core): TreeEngine.
- [@yggdrasil-forge/common](../common): Shared types
  (`LocalizedString`, `Result`, etc.).
- [@yggdrasil-forge/themes](../themes): Planned theme collection.

## License

MIT
```

### 5.6 — Borrar `docs/briefings/briefings.zip` (FIXADO)

```bash
git rm docs/briefings/briefings.zip
```

**Justificación**: incluído por accidente en hardening-2. Cero
relevante en repo (os briefings xa están extraídos como .md).
Cosmético non bloqueante; aproveitamos hardening-3 para limpalo.

### 5.7 — Auto-trackear este briefing (FIXADO)

Copia este propio briefing a `docs/briefings/BRIEFING-hardening-3.md`
seguindo convención A.5.2 establecida en hardening-2.

```bash
# Agarfal descarga este briefing tras presentación + copia:
cp /path/to/BRIEFING-hardening-3.md docs/briefings/
```

### 5.8 — Verificación pure documentación

**Garantía dura**:
- **0 ficheiros .ts modificados**.
- **0 tests novos**.
- **0 modificacións funcionais** de tests.
- **0 ErrorCodes**.
- **0 modificacións de configs**.
- **2195 tests pasan inchanged**.
- **Typecheck 23/23 inchanged**.
- **Build inchanged**.
- **Cobertura inchanged**.

### 5.9 — Lección 8.6.a L1 aplicada

T0.2 verifica empíricamente:
- 15 READMEs actuais son **placeholder de 21 liñas** (substitución
  total).
- 5 READMEs xa informativos (common, core, plugins, search,
  validators) **intactos**.
- briefings.zip presente en docs/briefings/.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Liñas aprox |
|---|---|---|
| 13 READMEs scaffold | MODIFICADO | ~30-40 liñas cada |
| storage README | MODIFICADO | ~95 liñas |
| react README | MODIFICADO | ~120 liñas |
| Borrar briefings.zip | git rm | -1 binario |
| Auto-tracking briefing | copia | ~900 liñas |
| .changeset | NOVO | ~6 liñas |
| CHANGELOG | MODIFICADO | ~30 liñas |

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `docs/briefings/BRIEFING-hardening-3.md`.
- `.changeset/hardening-3-readmes-and-cleanup.md`.

**MODIFICADOS (16)**:
- 13 READMEs scaffold (paquetes en §5.1 grupo A).
- `packages/storage/README.md`.
- `packages/react/README.md`.
- `CHANGELOG.md`.

**BORRADOS (1)**:
- `docs/briefings/briefings.zip`.

**Total: 19 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera ficheiro .ts.
- Configs (tsconfig, tsup, vitest, package.json).
- Tests existentes.
- READMEs xa informativos (common, core, plugins, search,
  validators).
- Os 84 briefings .md xa en docs/briefings/.
- `pnpm-lock.yaml`.
- MASTER.md.
- Outros paquetes.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

**Markdown**: headings xerárquicos (#, ##, ###). Listas con `-`.
Códigos con triple backtick + linguaxe.

**Tódolos READMEs scaffold** usan **a mesma estrutura base**
(§5.2) con texto específico (§5.3).

**README storage + react**: substitución total (cero merge
incremental).

**Convención de naming**: cero modificar nomes de ficheiros.

---

## 9. QUE NON FACER

- ❌ Modificar **calquera ficheiro .ts**.
- ❌ Modificar configs.
- ❌ Modificar tests.
- ❌ Modificar **READMEs xa informativos** (common, core, plugins,
  search, validators).
- ❌ Modificar **outros paquetes**.
- ❌ Comprometer Fase concreta nos READMEs scaffold (usar "future
  phase" en xeral).
- ❌ Mover briefings.zip a outro sitio (borrar via `git rm`).
- ❌ Borrar outros briefings .md (cero solapamento).
- ❌ Modificar `pnpm-lock.yaml`.
- ❌ Modificar `MASTER.md`.
- ❌ Engadir tests novos.
- ❌ Engadir ErrorCodes.
- ❌ Engadir deps de npm.
- ❌ Renomear paquetes.
- ❌ Inventar contidos distintos dos prescritos en §5.3-§5.5.
- ❌ Placeholders / TODO / FIXME / XXX nos READMEs novos.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T6)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `5eeef8b` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar 15 READMEs placeholder (21 liñas):
for pkg in analytics cli devtools diff exporters heatmap i18n importers \
           multitenancy neo4j stats themes webhooks storage react; do
  lines=$(wc -l < packages/$pkg/README.md)
  echo "$pkg: $lines"
done
# Esperado: tódolos 21.

# Confirmar 5 READMEs xa informativos (intactos):
for pkg in common core plugins search validators; do
  lines=$(wc -l < packages/$pkg/README.md)
  echo "$pkg: $lines"
done
# Esperado: 46, 155, 72, 111, 165.

# Confirmar briefings.zip presente:
ls -la docs/briefings/briefings.zip

# Confirmar 84 briefings .md + 1 .zip = 85 total:
ls docs/briefings/ | wc -l
# Esperado: 85.
```

**T0.3** — Baseline:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 23/23
pnpm turbo run test --force                              # 2195 tests
```

### T1 — Substituír 13 READMEs scaffold

Aplicar §5.3 literal. **Substituír contido total** de cada un dos
13 ficheiros segundo o contido prescrito.

### T2 — Substituír 2 READMEs activos

Aplicar §5.4 (storage) + §5.5 (react) literal.

### T3 — Borrar briefings.zip

```bash
git rm docs/briefings/briefings.zip
```

### T4 — Auto-trackear briefing

Agarfal descarga BRIEFING-hardening-3.md via Claude.ai chat
actual + copia:
```bash
cp /path/to/downloads/BRIEFING-hardening-3.md docs/briefings/
```

**Verificación**:
```bash
ls docs/briefings/BRIEFING-hardening-3.md
# Esperado: existe.
```

### T5 — Verificación dura

```bash
# Typecheck: 23/23 inchanged:
pnpm turbo run typecheck --force

# Tests: 2195 inchanged:
pnpm turbo run test --force

# Cero ficheiros .ts modificados:
git diff --name-only origin/main..HEAD | grep '\.ts$' | head -5
# Esperado: cero output.

# READMEs xa informativos intactos:
for pkg in common core plugins search validators; do
  git diff origin/main..HEAD packages/$pkg/README.md | head -1
done
# Esperado: cero diff (intactos).
```

### T6 — Changeset + CHANGELOG + commit + push

`.changeset/hardening-3-readmes-and-cleanup.md`:
```
---
'@yggdrasil-forge/core': patch
---

docs(packages): informative READMEs for 15 packages + remove briefings.zip (hardening-3)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio:

```
### Documentation
- **15 READMEs substituídos** con contido informativo:
  - **13 paquetes scaffold** (analytics, cli, devtools, diff,
    exporters, heatmap, i18n, importers, multitenancy, neo4j,
    stats, themes, webhooks): formato compacto (~30-40 liñas)
    con tagline, status, purpose, related packages.
  - **2 paquetes activos** (storage + react): formato completo
    con installation, quick start, exemplos por API, components,
    hooks, themes, notes.
- **`docs/briefings/briefings.zip` borrado** (cosmético; herdado
  de hardening-2; cero relevante en repo).
- **Auto-tracking**: este propio briefing trackeado en
  `docs/briefings/BRIEFING-hardening-3.md` segundo convención
  A.5.2 establecida en hardening-2.

### Note
- Sub-fase **hardening-3**. TERCEIRA do ciclo de hardening
  pre-release 0.1.0-alpha.
- **Pure documentación**: cero código modificado, cero tests
  modificados, cero impacto en typecheck/build/cobertura.
- **2195 tests pasan inchanged**.
- **Cero comprometer Fase concreta** nos READMEs scaffold (MASTER
  cero detalla Fases 10-19 individuais; usar "future phase" en
  xeral).
- **READMEs xa informativos preservados** (common, core, plugins,
  search, validators): cero modificación.
- **APIs públicas verificadas empíricamente** para storage + react
  antes de redactar exemplos.
- **Aliñado con MASTER A.4.3** (decisión pre-release: *"Engadir
  README placeholder real a cada baleiro antes do primeiro
  publish"*).
- 55 sub-fases consecutivas sen rollback tras hardening-3.
- **DTs abertas restantes**: 13 (mesmas que tras hardening-2;
  hardening-3 cero estaba ligado a DT específica).
- **Próximas sub-fases pre-release**:
  - hardening-4 (opcional; DT-15 + DT-24 cosmética).
  - examples-1 a N (validación API con casos prácticos).
  - release-prep + 0.1.0-alpha (bump versions + DT-12 CHANGELOG
    Keep-a-Changelog + npm publish).
```

Commit Conventional:
`docs(packages): informative READMEs for 15 packages + remove briefings.zip (hardening-3)`

Push directo a `origin/main` (base `5eeef8b`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE hardening-3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 5eeef8b)
✅ Pure documentación (cero código modificado):
   - 13 READMEs scaffold informativos (substitución total)
   - 2 READMEs activos detallados (storage + react)
   - briefings.zip BORRADO via git rm
   - Auto-tracking briefing en docs/briefings/
✅ T0.2 verificación empírica:
   - 15 READMEs placeholder confirmados (21 liñas cada)
   - 5 READMEs informativos intactos (common/core/plugins/search/validators)
   - briefings.zip confirmado presente antes do borrado
✅ T5 verificación dura:
   - Typecheck: 23/23 successful
   - Tests: 2195 INCHANGED
   - Cero ficheiros .ts modificados
   - READMEs informativos intactos
✅ CERO modificacións de código
✅ CERO modificacións de configs
✅ CERO modificacións de tests
✅ CERO ErrorCodes
✅ CERO deps de npm
✅ MASTER.md inchanged
✅ Os 84 briefings .md previos en docs/briefings/ inchanged
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - TERCEIRA sub-fase do ciclo hardening pre-release 0.1.0-alpha.
   - 55 sub-fases consecutivas sen rollback.
   - READMEs scaffold NON comprometen Fase concreta (MASTER cero
     detalla Fases 10-19).
   - briefings.zip eliminado (cosmético herdado de hardening-2).
   - Convención A.5.2 aplicada (auto-tracking en docs/briefings/).
   - DTs abertas restantes: 13 (sen cambio).
   - Próximas sub-fases: hardening-4 (opcional) ou examples-1.
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit: 19 ficheiros (2 NOVOS + 16 MODIFICADOS + 1 BORRADO)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE hardening-4 (opcional) OU examples-1.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing hardening-3. **TERCEIRA do ciclo de hardening
pre-release 0.1.0-alpha**. Substitúe READMEs placeholders dos 15
paquetes (13 scaffold + 2 activos) por contido informativo. Pure
documentación: cero código modificado, cero tests modificados.
19 ficheiros tocados (2 NOVOS + 16 MODIFICADOS + 1 BORRADO).
2195 tests inchanged. Risco BAIXO.*

*🎯 **Estado tras hardening-3**: 55 sub-fases consecutivas sen
rollback. **Todos os paquetes publicables teñen README real**:
- 5 paquetes activos con README informativo previo (common, core,
  plugins, search, validators).
- 2 paquetes activos con README real novo (storage, react).
- 13 paquetes scaffold con README "future phase" novo.
**= 20 paquetes con README publicable**.*

*Decisións críticas documentadas:
- Plantilla uniforme para 13 READMEs scaffold.
- READMEs storage + react con exemplos verificables (APIs
  públicas).
- briefings.zip borrado (cosmético).
- Auto-tracking briefing (convención A.5.2).
- Cero comprometer Fase concreta.*
