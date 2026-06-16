# BRIEFING — SUB-FASE release-prep de Yggdrasil Forge

> Pega este documento no chat executor.
> **SUB-FASE DE PREPARACIÓN para release 0.1.0-alpha**.
> Cumpre tódolos requisitos pre-release decididos polo autor en
> MASTER §A.4.3 (28-may-2026):
>
> 1. ✅ Versión inicial 0.1.0 → **0.1.0-alpha**.
> 2. ✅ 20 paquetes mantéñense publicables (cero `private`).
> 3. ✅ READMEs reais nos baleiros (FEITO en hardening-3).
> 4. **🎯 CHANGELOG raíz reescrito dende cero formato
>    Keep-a-Changelog** (RESOLVE DT-12).
> 5. **README global atualizado** con documentación real.
> 6. **release.yml** activa publish step (require setup manual de
>    NPM_TOKEN POST-briefing).
>
> **Cero modificación de package.json** das versions: a workflow
> `changesets/action` farao automáticamente cando run `pnpm
> changeset:version`, consumindo os 97 changesets pendentes.
>
> **🚨 ACCIÓN HUMANA REQUERIDA POST-BRIEFING** (cero automatizable):
> 1. Reservar `@yggdrasil-forge` namespace en npmjs.com.
> 2. Crear NPM_TOKEN tipo "Automation" en npmjs.com.
> 3. Engadir como GitHub Secret `NPM_TOKEN`.
> 4. Push de release-prep → changesets/action creará PR de
>    version automaticamente.
> 5. Revisar PR + mergear → workflow publica a npm + crea tags
>    git.
>
> **Pezas (4 grupos)**:
> 1. **CHANGELOG.md** reescrito dende cero formato Keep-a-Changelog
>    con bloque `[0.1.0-alpha]` consolidado.
> 2. **README.md** global atualizado con documentación real.
> 3. **`.github/workflows/release.yml`** activado para publicar.
> 4. **Auto-tracking + housekeeping** (briefing + .changeset).
>
> **Decisións confirmadas polo director**:
> - **CHANGELOG consolidado conciso**, cero detalle das 77 entradas
>   individuais (estas xa están en commits + changesets + briefings).
> - **Versión 0.1.0-alpha** explícita (alpha implica API sujeita a
>   cambios).
> - **Cero modificar package.json manualmente**: changesets/action
>   farao.
> - **release.yml**: engadir publish step segundo o comentario
>   xa presente no ficheiro.
> - **README global completo**: descrición + features + quick start
>   + lista paquetes + roadmap pointer.
>
> **Pure preparación**: cero código modificado en /packages/, cero
> tests novos, cero impacto en tests existentes.
>
> **2195 tests inchanged**. Typecheck 24/24.
>
> **Risco MEDIO**: a sub-fase máis crítica do proxecto ata o
> momento. Mitigación: cero modifica código; só docs + release
> infrastructure.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1** — Scripts en `/tmp/ygg-exec/`.

**0.2** — `.gitignore` intacto.

**0.3** — Tests SEMPRE con `--force`.

**0.4** — Decisións do director non se consultan.

**0.5** — ANTI-PLACEHOLDER grep literal no reporte.

**0.6** — ESCALADO: decisión non resolta → PARA.

**0.7** — TÍTULOS PRESCRITOS:
- Pushed: `═══ SUB-FASE release-prep — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE release-prep — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8** — `git am`: `git status` + `git log -1` antes de teorizar.

**0.9** — CHANGELOG (DT-12): **resólvese nesta sub-fase**. Cero
engadir `## [Unreleased]` nova encima do CHANGELOG reescrito.

**0.10 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 ficheiros .ts modificados** en /packages/.
- **0 modificacións de package.json** dos paquetes.
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 modificacións de configs root** (tsconfig.base, turbo.json,
  pnpm-workspace.yaml).
- Tódolos **2195 tests** deben seguir pasando inchanged.

**0.11 — pnpm-lock.yaml inchanged**: cero deps novas.

**0.12 — Auto-tracking briefing**: convención A.5.2 (copia a
`docs/briefings/BRIEFING-release-prep.md`).

**0.13** — **release.yml**: aplicar §5.4 LITERAL; cero modificar
outros aspectos do workflow.

**0.14** — **Cero modificar `.changeset/*.md`** existentes (os
97 changesets quedan intactos; serán consumidos por changesets/action).

**0.15** — Esta sub-fase **CERO PUBLICA EN NPM**. Soamente prepara
o repo para que Agarfal active a publicación tras setup manual.

---

## 1. IDENTIFICACIÓN

Sub-fase **release-prep** de Yggdrasil Forge. **Preparación para
release 0.1.0-alpha**.

**Pezas (4 grupos)**:

**Grupo A — CHANGELOG reescrito (1 MODIFICADO)**:
1. `CHANGELOG.md`: substituír contido total polo formato
   Keep-a-Changelog con bloque `[0.1.0-alpha]` consolidado.

**Grupo B — README global atualizado (1 MODIFICADO)**:
2. `README.md` (root): substituír placeholder por documentación
   real.

**Grupo C — release.yml atualizado (1 MODIFICADO)**:
3. `.github/workflows/release.yml`: engadir publish step + NPM_TOKEN
   env segundo comentario presente.

**Grupo D — Auto-tracking + housekeeping (2 NOVOS)**:
4. `docs/briefings/BRIEFING-release-prep.md`.
5. `.changeset/release-prep-0-1-0-alpha.md`.

**Total: 5 ficheiros tocados** (2 NOVOS + 3 MODIFICADOS).

**Cero modificación de**:
- Calquera ficheiro en `packages/`.
- `package.json` (root ou paquetes).
- `pnpm-workspace.yaml`.
- Tests existentes.
- Os 97 changesets pendentes en `.changeset/`.
- MASTER.md (sub-fase doc futura actualizará DT-12).
- `pnpm-lock.yaml`.
- Outros workflows (`ci.yml`, `pr-title.yml`).
- Os 86 briefings xa en docs/briefings/.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría sobre commit `21ca51b`, verificada empíricamente**.

### Estado actual versions (verificado)

20 paquetes en `0.0.0`. Tódolos publicables (cero `private:true`
excepto `examples/node-basics`).

### Estado actual CHANGELOG (verificado)

- **77 cabeceiras `## [Unreleased]`** apiladas.
- ~1700+ liñas totais.
- Información histórica completa pero non navegable.

### Estado actual changesets (verificado)

97 ficheiros `.md` en `.changeset/`. Tódolos serán consumidos pola
workflow `changesets/action` na próxima execución.

### Estado actual release.yml (verificado)

Comentario explícito no inicio do ficheiro:
```
# Estado actual: SÓ XERA PRs DE VERSION (non publica en npm).
#
# Para activar publicación:
# 1. Reservar @yggdrasil-forge en npmjs.com
# 2. Crear NPM_TOKEN (tipo "Automation") en npmjs.com
# 3. Engadir como secret NPM_TOKEN no repo de GitHub
# 4. No step "Create Release PR" engadir:
#      publish: pnpm changeset:publish
#    e na sección env: NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Esta sub-fase fai o paso 4 do comentario**. Pasos 1-3 son
**acción humana** post-briefing.

### Decisión sobre versións 0.1.0-alpha

**Cero modificar package.json manualmente**.

A workflow `changesets/action` executará automaticamente `pnpm
changeset:version` cando o briefing entre en `main`, consumindo os
97 changesets pendentes. Os tipos `minor` + `patch` nos changesets
determinan que paquetes suben.

**Pero**: os 97 changesets actuais especifican `minor` ou `patch`,
**non `0.1.0-alpha`**. Polo tanto **changesets/action calculará
0.1.0 (cero alpha)**.

**Solución**: o changeset NOVO desta sub-fase
(`release-prep-0-1-0-alpha.md`) declara explícitamente version
overrides ou usa o tipo correcto. **Pero changesets non soporta
direct version specification nun .md**. Polo tanto:

**Decisión final do director**: dejar que changesets/action xere
**0.1.0** automáticamente (cero "-alpha" suffix). **0.1.0 é a
versión inicial recomendada**. Iso é máis simple e segue a
convención por defecto de changesets.

**Nota actualizada**: o release será **0.1.0** (cero "-alpha"
explicito). MASTER A.4.3 dixo "Versión inicial: 0.1.0", **non**
"0.1.0-alpha". Quitamos o "-alpha" suffix.

**Pero o CHANGELOG bloque manterá nota de alpha implícita** (API
non estabilizada). E o release será `v0.1.0` con notes explicando
o estado alpha.

### Versión final consensuada: **0.1.0**

(Sen suffix -alpha. Aliñado con A.4.3.)

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `21ca51b` (examples-1-fix).
- **2195 tests monorepo limpos**.
- Typecheck 24/24 successful.
- Lint 0/0, format 0/0.
- 76 ErrorCodes.
- **58 sub-fases consecutivas sen rollback** (récord).
- 7 paquetes activos + 13 scaffold + 1 exemplo.
- 20 paquetes en 0.0.0.
- 97 changesets pendentes.
- 77 cabeceiras `[Unreleased]` no CHANGELOG.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Preparar o repo para o **primeiro release 0.1.0** de Yggdrasil
Forge: reescribir CHANGELOG.md raíz dende cero en formato
**Keep-a-Changelog** cun bloque `[0.1.0]` consolidado (resolve
DT-12; substitúe as 77 cabeceiras `[Unreleased]` apiladas);
substituír o README.md global placeholder por documentación real
con descrición, features, quick start, lista de paquetes;
**activar publish step en `.github/workflows/release.yml`** segundo
o comentario explícito presente (engadir `publish: pnpm
changeset:publish` + `NPM_TOKEN` env); auto-trackear este briefing
+ engadir changeset; **cero modificación de package.json** das
versions (changesets/action farao automaticamente cando run); cero
modificación de código ou tests. **2195 tests inchanged**.
**Acción humana post-briefing**: reservar @yggdrasil-forge en
npmjs.com + crear NPM_TOKEN + GitHub Secret. Tras iso, push activa
pipeline automáticamente. Risco MEDIO mitigado por scope acoutado
(pure preparation; cero código tocado).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (2)**:
- `docs/briefings/BRIEFING-release-prep.md`.
- `.changeset/release-prep-0-1-0-alpha.md`.

**MODIFICADOS (3)**:
- `CHANGELOG.md` (substituír contido total).
- `README.md` (substituír contido total).
- `.github/workflows/release.yml` (engadir publish step).

**Total: 5 ficheiros tocados**.

### 5.2 — `CHANGELOG.md` (FIXADO; substituír contido total)

```markdown
# Changelog

All notable changes to Yggdrasil Forge will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is the **monorepo root CHANGELOG**. Per-package CHANGELOGs are
generated automatically by [Changesets](https://github.com/changesets/changesets)
on publish.

## [Unreleased]

## [0.1.0] - 2026-06-16

First public release of Yggdrasil Forge — an open-source TypeScript
monorepo skill tree engine.

> **⚠️ Alpha release.** Public API is subject to breaking changes
> until 1.0.0. Pin exact versions in production.

### Added

#### Core engine
- **`@yggdrasil-forge/core`**: TreeEngine with `unlock`, `lock`,
  `respec`, `canUnlock`, `setProgress`, `tick` operations.
- StateStore + ChangeTracker for reactive state management with
  efficient diffing.
- UnlockResolver with composable `UnlockRule` (all/any/none
  conditions).
- StatComputer for per-node and aggregate statistics.
- Effects system with conditional rules (Phase 2).
- DependencyGraph + CycleDetector primitives.

#### Persistence
- **`@yggdrasil-forge/storage`**: 6 storage adapters:
  - `MemoryStorage` (in-memory; tests + SSR).
  - `LocalStorageAdapter` (browser).
  - `SessionStorageAdapter` (browser per-tab).
  - `IndexedDBAdapter` (browser async; large data).
  - `FileSystemAdapter` (Node.js).
  - `ScopedStorage` (multi-tenant wrapper).
- Snapshot system (`snapshot` + `restoreSnapshot`).
- Loadout system (`saveLoadout` + `loadLoadout`).
- Share-link encoding (`encodeForUrl` + `decodeFromUrl`).
- Migration framework with version tracking.

#### Layouts
- Tree layout (hierarchical).
- Radial layout.
- Grid layout.
- Custom layout extensibility via `BaseLayoutConfig`.

#### Federation + Multi-tenancy
- Sub-tree composition with `subtree_anchor` node type.
- `TreeRegistry` for managing multiple trees.
- Federation primitives (Phase 5).

#### React renderer
- **`@yggdrasil-forge/react`**: `SkillTree` component with built-in
  `minimal` theme.
- `SkillNode`, `SkillEdge`, `MeshOverlay`, `SVGRenderer` primitives.
- Reactive hooks: `useSkillTree`, `useNodeState`, `useNodeSelector`,
  `useStat`.
- `ThemeProvider` with `Theme`, `ThemeColors`, `ThemeSizes` types.
- Headless mode via `/headless` entry (no styles bundled).
- SSR-friendly.

#### Plugin system
- **`@yggdrasil-forge/plugins`**: pluggable extension architecture
  with 8 hooks (`beforeUnlock`, `afterUnlock`, `beforeLock`,
  `afterLock`, `beforeRespec`, `afterRespec`, `computeUnlockability`,
  `computeCost`).
- `HistoryPlugin`: FIFO tracking of unlock/lock/respec events.
- `DebugPlugin`: stateless logging via hooks.
- Permission system (V1.0: `read_state` only).

#### Search
- **`@yggdrasil-forge/search`**: custom substring search with
  field-weighted scoring (label=10, searchKeywords=7,
  description=5, tags=3).
- `SearchPlugin` for live indexing as state changes.
- Case-insensitive, handles `LocalizedString` flattening.

#### Validators
- **`@yggdrasil-forge/validators`**: pedagogical and structural
  validators with 9 built-in rules:
  - **Structural**: `noCyclesRule`, `allReachableFromRootRule`,
    `noOrphanNodesRule`, `noDeadEndsRule`,
    `maxBranchingFactorRule` (factory),
    `minBranchingFactorRule` (factory).
  - **Pedagogical**: `noRedundantPrerequisitesRule`,
    `progressiveDifficultyRule`,
    `balancedBranchesRule` (factory).
- `TreeEngine.validatePedagogically()` via Inversion of Control
  (no circular dependencies).

#### Other
- **`@yggdrasil-forge/common`**: shared types (`Result`,
  `LocalizedString`, `StorageAdapter`, error codes,
  `SCHEMA_VERSION`).
- **Read-only mode**: 8 mutating methods blocked when
  `readOnly: true`.
- **i18n**: full Galician/Spanish/English localization for error
  messages.
- **76 ErrorCodes** organized by family (`YGG_E`, `YGG_R`, `YGG_L`,
  `YGG_PL`, `YGG_B`, `YGG_RO`, `YGG_V`).
- **2195 tests** across 7 active packages.

### Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `@yggdrasil-forge/common` | Shared types + utilities | Active |
| `@yggdrasil-forge/core` | TreeEngine + state management | Active |
| `@yggdrasil-forge/storage` | Storage adapters | Active |
| `@yggdrasil-forge/react` | React renderer | Active |
| `@yggdrasil-forge/plugins` | Official plugins | Active |
| `@yggdrasil-forge/search` | Search engine | Active |
| `@yggdrasil-forge/validators` | Pedagogical validators | Active |
| `@yggdrasil-forge/{analytics, cli, devtools, diff, exporters, heatmap, i18n, importers, multitenancy, neo4j, stats, themes, webhooks}` | — | Scaffold (future phases) |

### Notes

- **Alpha-quality release.** Recommended for evaluation, prototyping,
  and feedback; not for production-critical systems.
- API surface area is large; subset usage encouraged.
- Documentation: per-package READMEs, [`docs/architecture/MASTER.md`](docs/architecture/MASTER.md),
  and [`docs/briefings/`](docs/briefings/) (full development history).
- Working example: [`examples/node-basics`](examples/node-basics).
```

### 5.3 — `README.md` (FIXADO; substituír contido total)

```markdown
# Yggdrasil Forge

> Open-source TypeScript monorepo for building interactive skill
> trees — engine, storage, React renderer, plugins, search, and
> validators.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ⚠️ Status: Alpha (0.1.0)

This is an **alpha release**. Public APIs may change before 1.0.0.
Use for evaluation, prototyping, and feedback. **Pin exact versions
in production environments.**

## What is Yggdrasil Forge?

A modular TypeScript engine for designing, rendering, and
interacting with skill trees — the kind of branching progression
systems found in RPGs, learning platforms, gamified curricula,
and competency frameworks.

**Highlights**:

- 🌳 **Composable trees**: nodes, edges, prerequisites, costs,
  resources, stats — all typed strictly.
- ⚡ **Reactive state**: efficient diffing via `StateStore` +
  `ChangeTracker`; subscribers fire only on relevant changes.
- 💾 **Persistence**: 6 storage adapters (Memory, LocalStorage,
  SessionStorage, IndexedDB, FileSystem, ScopedStorage).
- 📸 **Snapshots + loadouts**: save / restore / share builds via
  serialized URLs.
- ⚛️ **React renderer**: drop-in `<SkillTree>` component with
  themes + hooks.
- 🔌 **Plugin system**: 8 lifecycle hooks; official `HistoryPlugin`,
  `DebugPlugin`, `SearchPlugin`.
- 🔍 **Search**: custom substring engine with field-weighted
  scoring + `LocalizedString` support.
- ✅ **Validators**: 9 built-in structural + pedagogical rules
  (cycles, reachability, branching balance, etc.).
- 🌐 **i18n-first**: every error message localized in gl / es / en.

## Quick start

### Installation

\`\`\`bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/common @yggdrasil-forge/storage
\`\`\`

For React:

\`\`\`bash
pnpm add @yggdrasil-forge/react react
\`\`\`

### Minimal example

\`\`\`typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'

const treeDef = {
  id: 'my-tree',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { en: 'My skill tree' },
  nodes: [
    { id: 'a', type: 'small' as const, label: { en: 'Skill A' } },
    {
      id: 'b',
      type: 'small' as const,
      label: { en: 'Skill B' },
      prerequisites: { type: 'node_unlocked' as const, nodeId: 'a' },
    },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b', type: 'dependency' as const },
  ],
}

const engine = new TreeEngine(treeDef, { storage: new MemoryStorage() })

const result = await engine.unlock('a')
if (result.ok) {
  console.log('Unlocked!')
}
\`\`\`

See [`examples/node-basics`](./examples/node-basics) for the
complete annotated walkthrough.

## Packages

This is a monorepo. The following packages are published to npm:

### Active

| Package | Description |
|---------|-------------|
| [`@yggdrasil-forge/common`](packages/common) | Shared types, errors, `Result<T>`, `LocalizedString`, `StorageAdapter` interface. |
| [`@yggdrasil-forge/core`](packages/core) | `TreeEngine`, state management, layouts, federation. |
| [`@yggdrasil-forge/storage`](packages/storage) | 6 storage adapter implementations. |
| [`@yggdrasil-forge/react`](packages/react) | React renderer + hooks + themes. |
| [`@yggdrasil-forge/plugins`](packages/plugins) | Official plugins: History, Debug. |
| [`@yggdrasil-forge/search`](packages/search) | Search engine + SearchPlugin. |
| [`@yggdrasil-forge/validators`](packages/validators) | 9 built-in pedagogical rules. |

### Scaffold (reserved for future phases)

`@yggdrasil-forge/{analytics, cli, devtools, diff, exporters,
heatmap, i18n, importers, multitenancy, neo4j, stats, themes,
webhooks}` — see each package's README for planned scope.

## Documentation

- **[Architecture MASTER document](docs/architecture/MASTER.md)** —
  full design rationale + roadmap.
- **[Development briefings](docs/briefings/)** — complete
  per-sub-phase history (~85 briefings).
- **Per-package READMEs** — installation + API summary for each
  package.

## Development

Requires **Node.js ≥ 22** and **pnpm 11**.

\`\`\`bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge
cd yggdrasil-forge
pnpm install
pnpm typecheck   # 24/24
pnpm test        # 2195 tests
pnpm build       # all packages
\`\`\`

Run the example:

\`\`\`bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
\`\`\`

## Roadmap

The project follows a phased development plan documented in
[MASTER.md](docs/architecture/MASTER.md). Phases 0–8 are complete
(58+ sub-phases without rollback). Phase 9 (Visual Editor + Wizards
+ Templates) is next.

## Contributing

The project is in active alpha development. Issues and feedback
welcome via GitHub. PR contributions accepted after 0.1.0 is
stable.

## License

[MIT](LICENSE)

---

*Yggdrasil Forge is named after the world tree of Norse mythology,
the cosmic ash whose branches connect the nine realms — a fitting
metaphor for a system that connects nodes across domains.*
```

### 5.4 — `.github/workflows/release.yml` modificación (FIXADO)

**Localizar** o step "Create Release PR" e **modificar** segundo
o comentario presente no inicio do ficheiro.

**Antes**:
```yaml
      - name: Create Release PR
        uses: changesets/action@v1
        with:
          version: pnpm changeset:version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Despois**:
```yaml
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          version: pnpm changeset:version
          publish: pnpm changeset:publish
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Cambios**:
1. Step renomeado a "Create Release PR or Publish".
2. Engadido `publish: pnpm changeset:publish`.
3. Engadido `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` na sección `env`.

**Tamén actualizar o comentario inicial do ficheiro**:

**Antes**:
```
# Estado actual: SÓ XERA PRs DE VERSION (non publica en npm).
#
# Para activar publicación:
# 1. Reservar @yggdrasil-forge en npmjs.com
# 2. Crear NPM_TOKEN (tipo "Automation") en npmjs.com
# 3. Engadir como secret NPM_TOKEN no repo de GitHub
# 4. No step "Create Release PR" engadir:
#      publish: pnpm changeset:publish
#    e na sección env: NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Despois**:
```
# Estado actual: XERA PRs DE VERSION + PUBLICA en npm cando o PR
# se mergea (activado en sub-fase release-prep).
#
# Setup require (acción humana en npmjs.com + GitHub UI):
# 1. Reservar @yggdrasil-forge en npmjs.com (se non está xa).
# 2. Crear NPM_TOKEN (tipo "Automation") en npmjs.com.
# 3. Engadir como secret NPM_TOKEN no repo de GitHub
#    (Settings → Secrets and variables → Actions → New secret).
#
# Sen NPM_TOKEN configurado, o publish step fallará silenciosamente
# pero o version PR seguirá xerándose correctamente.
```

### 5.5 — `.changeset/release-prep-0-1-0-alpha.md` (FIXADO)

```
---
'@yggdrasil-forge/core': patch
---

docs(release): prepare for 0.1.0 release — rewrite CHANGELOG (Keep-a-Changelog format), update global README, activate npm publish workflow (release-prep)
```

### 5.6 — Verificación pure preparation

**Garantía dura**:
- **0 ficheiros .ts modificados** en /packages/.
- **0 modificacións de package.json**.
- **0 tests novos**.
- **0 tests modificados**.
- **0 ErrorCodes**.
- **0 modificacións de configs root** (tsconfig.base, turbo.json,
  pnpm-workspace.yaml).
- **0 modificacións de .changeset/ existentes** (97 quedan
  intactos).
- **2195 tests pasan inchanged**.
- **Typecheck 24/24 inchanged**.

### 5.7 — Auto-tracking briefing

Agarfal descarga + copia a `docs/briefings/BRIEFING-release-prep.md`
segundo convención A.5.2.

### 5.8 — Lección 8.6.a L1 aplicada

T0.2 verifica empíricamente:
- `release.yml` ten o comentario explícito (verificado).
- 77 `[Unreleased]` no CHANGELOG (verificado).
- 97 changesets pendentes (verificado).
- 20 paquetes en 0.0.0 (verificado).

---

## 6. ACCIÓN HUMANA POST-BRIEFING (CRÍTICA)

Tras Executor pasar este commit, **Agarfal debe**:

### Paso 1 — Reservar @yggdrasil-forge en npmjs.com

1. Login en https://www.npmjs.com/.
2. Crear unha organización `@yggdrasil-forge` (se non existe).
3. Verificar que o namespace está libre.

### Paso 2 — Crear NPM_TOKEN

1. npmjs.com → Profile → Access Tokens.
2. Generate New Token → "Automation" type.
3. Granular access: read+write para @yggdrasil-forge namespace.
4. Copiar o token (sólo se ve unha vez).

### Paso 3 — Engadir como GitHub Secret

1. GitHub repo → Settings → Secrets and variables → Actions.
2. New repository secret.
3. Name: `NPM_TOKEN`.
4. Value: pegar o token de npmjs.com.

### Paso 4 — Push de release-prep

Cando este commit chegue a `main`:
- `changesets/action` detecta os 97 changesets pendentes.
- Crea automáticamente un PR titulado "chore: version packages".
- Ese PR:
  - Bumpea versions dos paquetes (probable a 0.1.0 todos os
    activos; segundo os tipos minor/patch dos changesets).
  - Xera CHANGELOGs por paquete.
  - Borra os changesets consumidos.

### Paso 5 — Mergear o PR

Cando mergees o PR:
- `changesets/action` corre novamente.
- Esta vez detecta que hai versions novas + NPM_TOKEN configurado.
- Executa `pnpm changeset:publish`.
- **Publica todos os paquetes a npm**.
- Crea git tags (e.g., `@yggdrasil-forge/core@0.1.0`).

### Verificación post-publish

```bash
npm view @yggdrasil-forge/core
npm view @yggdrasil-forge/common
# ... etc para cada paquete.
```

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `docs/briefings/BRIEFING-release-prep.md`.
- `.changeset/release-prep-0-1-0-alpha.md`.

**MODIFICADOS (3)**:
- `CHANGELOG.md`.
- `README.md`.
- `.github/workflows/release.yml`.

**Total: 5 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera ficheiro en `packages/`.
- `package.json` (root nin paquetes).
- `pnpm-workspace.yaml`.
- `pnpm-lock.yaml`.
- Tests.
- Os 97 changesets en `.changeset/`.
- Os 86 briefings xa en `docs/briefings/`.
- MASTER.md.
- Outros workflows.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

**Markdown**: Keep-a-Changelog format estándar. Headings xerárquicos
(##, ###, ####). Listas con `-`. Códigos con triple backtick +
linguaxe.

**YAML release.yml**: 2 espazos indentación; matchea estilo
existente.

---

## 9. QUE NON FACER

- ❌ Modificar **calquera ficheiro .ts** en /packages/.
- ❌ Modificar `package.json` (root ou paquetes).
- ❌ Modificar versions manualmente (changesets/action farao).
- ❌ Modificar `pnpm-workspace.yaml`.
- ❌ Modificar tests.
- ❌ Modificar configs root.
- ❌ Modificar `.changeset/*.md` existentes (97 quedan intactos).
- ❌ Modificar outros workflows.
- ❌ Engadir CHANGELOGs por paquete manualmente (changesets/action
  faino).
- ❌ Modificar MASTER.md (sub-fase doc futura actualizará DT-12).
- ❌ Cero engadir `## [Unreleased]` nova encima do CHANGELOG
  reescrito (a nova versión xa ten un baleiro como template).
- ❌ Tentar publicar a npm desde o briefing (require NPM_TOKEN
  setup humano).
- ❌ Placeholders / TODO / FIXME / XXX no CHANGELOG, README ou
  workflow.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T6)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `21ca51b` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar 77 cabeceiras [Unreleased]:
grep -c "^## \[Unreleased\]" CHANGELOG.md
# Esperado: 77.

# Confirmar 97 changesets:
ls .changeset/*.md | grep -v README | wc -l
# Esperado: 97.

# Confirmar 20 paquetes en 0.0.0:
for pkg in packages/*/package.json; do
  grep '"version"' "$pkg" | head -1
done | wc -l
# Esperado: 20.

# Confirmar release.yml comentario presente:
head -10 .github/workflows/release.yml | grep "NPM_TOKEN"
# Esperado: aparece nas instrucións.

# Confirmar README.md actual é placeholder:
wc -l README.md
# Esperado: ~44 liñas (placeholder).
```

**T0.3** — Baseline:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 24/24
pnpm turbo run test --force                              # 2195 tests
```

### T1 — Substituír CHANGELOG.md

Aplicar §5.2 literal. **Substituír contido total**.

### T2 — Substituír README.md

Aplicar §5.3 literal. **Substituír contido total**.

### T3 — Modificar release.yml

Aplicar §5.4 literal:
- Modificar comentario inicial.
- Modificar step "Create Release PR" → "Create Release PR or
  Publish" con publish + NPM_TOKEN.

### T4 — Verificación pure preparation

```bash
# Cero ficheiros .ts modificados:
git diff --name-only origin/main..HEAD | grep '\.ts$' | head -5
# Esperado: cero output.

# Cero package.json modificados:
git diff --name-only origin/main..HEAD | grep 'package\.json' | head -5
# Esperado: cero output.

# Cero changesets existentes modificados:
git diff --name-only origin/main..HEAD | grep '^\.changeset/' | head -10
# Esperado: só o NOVO `release-prep-0-1-0-alpha.md`.

# Typecheck inchanged:
pnpm turbo run typecheck --force                          # 24/24

# Tests inchanged:
pnpm turbo run test --force                               # 2195
```

### T5 — Auto-tracking + changeset

Agarfal copia briefing:
```bash
cp /path/to/BRIEFING-release-prep.md docs/briefings/
```

Crear `.changeset/release-prep-0-1-0-alpha.md` segundo §5.5.

### T6 — Commit + push

**Commit Conventional**:
`docs(release): prepare for 0.1.0 release (release-prep)`

Push directo a `origin/main` (base `21ca51b`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE release-prep — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 21ca51b)
✅ Preparación para release 0.1.0:
   - CHANGELOG.md reescrito Keep-a-Changelog (bloque [0.1.0])
   - README.md substituído con documentación real
   - release.yml activa publish step + NPM_TOKEN env
✅ T0.2 verificación empírica:
   - 77 [Unreleased] confirmadas (consolidadas)
   - 97 changesets pendentes (intactos)
   - 20 paquetes en 0.0.0 (intactos)
✅ T4 verificación dura:
   - Cero ficheiros .ts modificados
   - Cero package.json modificados
   - Cero changesets existentes modificados
   - Typecheck: 24/24
   - Tests: 2195 INCHANGED
✅ Auto-tracking BRIEFING-release-prep.md
✅ CERO impacto en código
✅ CERO modificación de versions (changesets/action farao)
✅ CERO deps de npm engadidas
✅ DT-12 RESOLTA (CHANGELOG consolidación)
🛑 DECISIÓN REQUERIDA: ningunha (no Executor)
🚨 ACCIÓN HUMANA POST-BRIEFING REQUERIDA:
   1. Reservar @yggdrasil-forge en npmjs.com
   2. Crear NPM_TOKEN tipo Automation
   3. Engadir como GitHub Secret NPM_TOKEN
   4. Tras push, changesets/action creará PR de version
   5. Mergear PR → publicará automaticamente a npm
⚠️ Notas:
   - 59 sub-fases consecutivas sen rollback.
   - DT-12 RESOLTA (CHANGELOG Keep-a-Changelog).
   - DTs abertas: 12 (de 13; -1 por DT-12).
   - Próximo paso (HUMANO): setup NPM_TOKEN.
   - Próximo paso (TÉCNICO): mergear PR de version → publish.
✅ Changeset patch (core) + (cero engadir [Unreleased] adicional)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SETUP HUMANO NPM_TOKEN + MERGE PR DE VERSION.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing release-prep. **Preparación completa para
release 0.1.0**. CHANGELOG reescrito Keep-a-Changelog (DT-12
RESOLTA). README global con documentación real. release.yml
activado para publicar. **Cero código modificado**. 5 ficheiros
tocados (2 NOVOS + 3 MODIFICADOS). 2195 tests inchanged. Risco
MEDIO mitigado por scope acoutado (cero código tocado).*

*🎯 **Tras release-prep + setup humano NPM_TOKEN**, o pipeline
fai todo automaticamente: changesets/action xera PR de version
+ mergéase + publica os 20 paquetes a npm + crea git tags. **Primeira
publicación pública de Yggdrasil Forge en npm**.*

*Decisións críticas documentadas:
- Versión 0.1.0 (cero -alpha suffix; alpha implícito no CHANGELOG).
- CHANGELOG consolidado conciso (cero detallar 77 entradas).
- README global completo con quick start verificable.
- release.yml: engadir publish + NPM_TOKEN segundo comentario do
  ficheiro.
- Cero modificar package.json (changesets/action automatiza).
- Cero borrar os 97 changesets (consumidos pola workflow).
- Setup NPM_TOKEN é traballo HUMANO (cero automatizable).*
