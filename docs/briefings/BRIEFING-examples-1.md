# BRIEFING — SUB-FASE examples-1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA SUB-FASE DE EXEMPLOS PRÁCTICOS** post-Fase 8.
> Aliñada con MASTER A.4.2: *"casos prácticos / exemplos diferidos
> antes do editor (probablemente Fase 7+) cando xa exista
> persistencia (Fase 3), React hooks (Fase 6)"*.
>
> **Crea o primeiro exemplo executable** que demostra a API de
> Yggdrasil Forge end-to-end en Node.js.
>
> **Saltado**: hardening-4 (DT-15 + DT-24 cosmética; non bloqueante;
> diferido a release-prep ou cleanup posterior).
>
> **Pezas (3 grupos)**:
> 1. **Paquete novo** `examples/node-basics/` con 4 ficheiros:
>    package.json + tsconfig.json + README.md + src/index.ts.
> 2. **Auto-tracking** deste briefing en `docs/briefings/`
>    (convención A.5.2).
> 3. **Housekeeping** (.changeset + CHANGELOG).
>
> **Decisións confirmadas polo director**:
> - **Naming descritivo** (`node-basics`, cero `01-node-basics`):
>   permite engadir futuros exemplos sen renomear.
> - **`private: true`** no package.json: cero publicar en npm.
> - **tsx** para executar TypeScript directamente (cero build step).
> - **Workspace dependencies**: `@yggdrasil-forge/core`,
>   `@yggdrasil-forge/common`, `@yggdrasil-forge/storage` como
>   `workspace:*`.
> - **3 nodos sample** (skill-a → skill-b → skill-c via dependency).
> - **Cero rootNodeId**: simplificación; demostra que é opcional.
> - **8 pasos demostrativos** no index.ts cobrindo: unlock,
>   canUnlock, lock, snapshot, restoreSnapshot + Result error
>   handling.
> - **README educativo** con explicación + "how to run" + output
>   esperado.
>
> **APIs verificadas empíricamente** (lección 8.6.a L1):
> - `NodeType`: usar `'small'` para tódolos nodos.
> - `EdgeType`: usar `'dependency'`.
> - `SCHEMA_VERSION = '1.0.0'` en @common/constants.
> - `unlock`/`lock`/`canUnlock` son **async** (Promise<Result<...>>).
> - `snapshot(label?)` async; `restoreSnapshot(id)` async; require
>   storage.
> - TreeDef require: id, schemaVersion, version, label, nodes,
>   edges.
> - NodeDef require: id, type, label.
> - EdgeDef require: id, source, target, type.
>
> **Risco MEDIO**: novo scope; require código TypeScript válido.
> Mitigación: APIs verificadas + código prescrito.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1** — Scripts en `/tmp/ygg-exec/`.

**0.2** — `.gitignore` intacto.

**0.3** — Tests SEMPRE con `--force`** (cero novos esperados;
verificar baseline).

**0.4** — Decisións do director non se consultan.

**0.5** — ANTI-PLACEHOLDER grep literal no reporte.

**0.6** — ESCALADO: decisión non resolta → PARA.

**0.7** — TÍTULOS PRESCRITOS:
- Pushed: `═══ SUB-FASE examples-1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE examples-1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8** — `git am`: `git status` + `git log -1` antes de teorizar.

**0.9** — CHANGELOG (DT-12): nova `[Unreleased]`.

**0.10** — exactOptionalPropertyTypes: aplica no tsconfig.json
do exemplo (extends do base).

**0.11** — c8 ignore: cero aplicable (exemplo non testeado).

**0.12 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 ficheiros .ts modificados** nos paquetes existentes (@core,
  @common, @storage, etc.).
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 modificacións de configs root** (turbo, tsconfig.base, etc.).
- Tódolos **2195 tests** deben seguir pasando inchanged.

**0.13** — pnpm install OBRIGATORIO tras crear paquete novo
(actualiza pnpm-lock.yaml).

**0.14** — **Verificación crítica T5**: executar `pnpm --filter
@yggdrasil-forge-examples/node-basics start` debe correr o exemplo
**sen erros** e imprimir o output esperado. Se falla → ESCALAR.

**0.15** — Convención A.5.2 (auto-tracking briefings): copia este
briefing a `docs/briefings/BRIEFING-examples-1.md`.

**0.16** — **Cero modificar pnpm-workspace.yaml**: xa inclúe
`examples/*` (verificado polo director).

---

## 1. IDENTIFICACIÓN

Sub-fase **examples-1**. **PRIMEIRA da serie de exemplos prácticos**
post-Fase 8.

**Pezas (3 grupos)**:

**Grupo A — Paquete novo `examples/node-basics/` (4 NOVOS)**:
1. `examples/node-basics/package.json`.
2. `examples/node-basics/tsconfig.json`.
3. `examples/node-basics/README.md`.
4. `examples/node-basics/src/index.ts`.

**Grupo B — Auto-tracking briefing (1 NOVO)**:
5. `docs/briefings/BRIEFING-examples-1.md` (copia deste).

**Grupo C — Housekeeping (2 ficheiros)**:
6. **NOVO** `.changeset/examples-1-node-basics.md`.
7. **MODIFICADO** `CHANGELOG.md`.

**Total: 7 ficheiros tocados** (6 NOVOS + 1 MODIFICADO).

**Cero modificación de**:
- Calquera ficheiro .ts dos paquetes existentes.
- Configs root (turbo, tsconfig.base, package.json root).
- pnpm-workspace.yaml.
- Tests existentes.
- Outros paquetes.
- READMEs dos paquetes.
- MASTER.md.

**Cambios secundarios esperados**:
- `pnpm-lock.yaml`: actualizado (novo paquete + tsx dep). **Incluír
  no commit**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría sobre commit `b9787cc`, verificada empíricamente**.

### Estado actual examples/

- `examples/.gitkeep` (baleiro; preserva carpeta en git).
- **pnpm-workspace.yaml** xa inclúe `examples/*` automáticamente.

### APIs verificadas empíricamente

**TreeDef estructura**:
```ts
interface TreeDef {
  readonly id: string
  readonly schemaVersion: string  // '1.0.0' from @common
  readonly version: string
  readonly label: LocalizedString
  readonly description?: LocalizedString
  readonly author?: string
  readonly rootNodeId?: string  // OPCIONAL
  readonly nodes: readonly NodeDef[]
  readonly edges: readonly EdgeDef[]
  readonly groups?: readonly GroupDef[]
  readonly resources?: readonly Resource[]
  readonly stats?: readonly StatDef[]
}
```

**NodeDef estructura**:
```ts
interface NodeDef {
  readonly id: string
  readonly type: NodeType  // OBRIGATORIO
  readonly label: LocalizedString
  readonly description?: LocalizedString
  // ... outros opcionais
}
```

**NodeType valores** (verificado):
```
'small' | 'notable' | 'keystone' | 'mastery' | 'ascendancy'
| 'root' | 'cluster' | 'gateway' | 'milestone' | 'subtree_anchor'
```

**EdgeDef estructura**:
```ts
interface EdgeDef {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: EdgeType  // 'dependency' | ...
  // ... outros opcionais
}
```

**TreeEngine API utilizada**:
- `constructor(treeDef: TreeDef, options?: TreeEngineOptions)`.
- `async unlock(nodeId): Promise<Result<UnlockResult>>`.
- `async lock(nodeId): Promise<Result<LockResult>>`.
- `canUnlock(nodeId): Result<CanUnlockResult>` (sync).
- `getNodeState(nodeId): NodeState`.
- `async snapshot(label?): Promise<BuildSnapshot>` (require
  storage).
- `async restoreSnapshot(id): Promise<Result<void>>`.

**Result discriminated union**:
```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: ... }
```

### Decisión Node version + tsx

**`engines.node`**: `">=22"` (aliñado con paquetes existentes).

**tsx version**: `^4.19.0` (estable; cero versión específica
catalogada no workspace).

**Cero require `--experimental-strip-types`** (tsx é máis robusto).

### Estructura padrón do exemplo

```
examples/node-basics/
├── package.json    (~25 liñas; private: true)
├── tsconfig.json   (~10 liñas; extends base)
├── README.md       (~80 liñas; how to run + output)
└── src/
    └── index.ts    (~140 liñas; 8 pasos demonstrativos)
```

### Demonstración no index.ts

8 pasos secuenciais cobrindo:
1. Definir treeDef (3 skills + 2 dependency edges).
2. Crear engine con MemoryStorage.
3. canUnlock(skill-a) → check pre-unlock.
4. unlock(skill-a) → primeiro skill.
5. **Intentar** unlock(skill-c) sen prereq → demostra Result.err.
6. unlock(skill-b), unlock(skill-c) → cadea correcta.
7. snapshot('checkpoint').
8. lock(skill-a), restoreSnapshot, verificar restaurado.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `b9787cc` (hardening-3 auto-tracking).
- **2195 tests monorepo limpos**.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 76 ErrorCodes.
- **56 sub-fases consecutivas sen rollback** (récord).
- 7 paquetes activos + 13 scaffold.
- 85 ficheiros en docs/briefings/ (84 .md + 1 .zip eliminado tras
  hardening-3; total real: 85 .md tras auto-tracking de hardening-3).
- `examples/` baleiro (só .gitkeep).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear o **primeiro exemplo práctico** de Yggdrasil Forge no
monorepo: paquete `examples/node-basics/` (private: true; cero
publica en npm) con package.json + tsconfig + README + src/index.ts
demostrando 8 pasos secuenciais (definir treeDef de 3 skills,
crear TreeEngine con MemoryStorage, canUnlock + unlock + lock,
intentar unlock cero prereqs para demostrar Result.err, snapshot
+ restoreSnapshot); aliñado co MASTER A.4.2 (*"casos prácticos
diferidos antes do editor"*); usar `tsx` para executar TypeScript
directamente sen build step; **cero modificación de calquera
ficheiro .ts dos paquetes existentes**; tests 2195 inchanged;
verificación crítica T5 require que `pnpm --filter @yggdrasil-forge-examples/node-basics
start` execute o exemplo sen erros e imprima output esperado.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (6)**:
- `examples/node-basics/package.json`.
- `examples/node-basics/tsconfig.json`.
- `examples/node-basics/README.md`.
- `examples/node-basics/src/index.ts`.
- `docs/briefings/BRIEFING-examples-1.md`.
- `.changeset/examples-1-node-basics.md`.

**MODIFICADOS (1)**:
- `CHANGELOG.md` (nova `## [Unreleased]`).

**Total: 7 ficheiros tocados**.

### 5.2 — `examples/node-basics/package.json` (FIXADO)

```json
{
  "name": "@yggdrasil-forge-examples/node-basics",
  "version": "0.0.0",
  "private": true,
  "description": "Basic Node.js example demonstrating Yggdrasil Forge core APIs",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@yggdrasil-forge/common": "workspace:*",
    "@yggdrasil-forge/core": "workspace:*",
    "@yggdrasil-forge/storage": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "catalog:"
  },
  "engines": {
    "node": ">=22"
  }
}
```

**Decisións nesta peza**:
- **`private: true`**: cero publica en npm.
- **Nome `@yggdrasil-forge-examples/`** (cero `@yggdrasil-forge/`):
  diferencia exemplos dos paquetes publicables.
- **Cero `main`, `module`, `types`, `exports`, `files`,
  `publishConfig`**: cero require porque é private.
- **`type: "module"`**: ESM moderno.
- **`tsx` como devDep**: única dependencia externa nova.
- **Scripts**: só `start` e `typecheck`. Cero tests, cero build.

### 5.3 — `examples/node-basics/tsconfig.json` (FIXADO)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

**Decisións**:
- **`extends` do base**: hereda strict mode, exactOptionalPropertyTypes,
  etc.
- **`noEmit: true`**: cero compila (tsx executa directamente).
- **Cero `references`**: tsx resolve workspace imports
  directamente.

### 5.4 — `examples/node-basics/src/index.ts` (FIXADO)

```typescript
// ── INICIO: Yggdrasil Forge — exemplo Node.js básico ──
//
// Demostra a API core de Yggdrasil Forge end-to-end:
//   1. Definir un TreeDef.
//   2. Crear un TreeEngine con MemoryStorage.
//   3. Comprobar canUnlock antes de mutación.
//   4. unlock dunha cadea de skills.
//   5. Intentar unlock sen prereqs (demostra Result.err).
//   6. Snapshot do estado.
//   7. lock dun skill.
//   8. restoreSnapshot e verificación.
//
// Executar: pnpm start

import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { TreeDef } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'

// ── 1. Definir un TreeDef con 3 skills ──────────────────────────

const treeDef: TreeDef = {
  id: 'sample-tree',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: {
    gl: 'Árbore de exemplo',
    es: 'Árbol de ejemplo',
    en: 'Sample tree',
  },
  nodes: [
    {
      id: 'skill-a',
      type: 'small',
      label: { gl: 'Habilidade A', es: 'Habilidad A', en: 'Skill A' },
    },
    {
      id: 'skill-b',
      type: 'small',
      label: { gl: 'Habilidade B', es: 'Habilidad B', en: 'Skill B' },
    },
    {
      id: 'skill-c',
      type: 'small',
      label: { gl: 'Habilidade C', es: 'Habilidad C', en: 'Skill C' },
    },
  ],
  edges: [
    {
      id: 'edge-ab',
      source: 'skill-a',
      target: 'skill-b',
      type: 'dependency',
    },
    {
      id: 'edge-bc',
      source: 'skill-b',
      target: 'skill-c',
      type: 'dependency',
    },
  ],
}

// ── 2. Crear engine con MemoryStorage ───────────────────────────

const storage = new MemoryStorage()
const engine = new TreeEngine(treeDef, { storage })

console.log('▶ TreeEngine criado co tree:', treeDef.id)
console.log('  Nodos:', treeDef.nodes.length)
console.log('  Edges:', treeDef.edges.length)
console.log()

// ── 3. Comprobar canUnlock antes da mutación ───────────────────

const canUnlockA = engine.canUnlock('skill-a')
console.log('▶ canUnlock(skill-a):', canUnlockA.ok ? 'OK' : 'erro')

// ── 4. unlock dunha cadea de skills ────────────────────────────

const unlockA = await engine.unlock('skill-a')
if (unlockA.ok) {
  console.log('▶ unlock(skill-a): OK (tier', unlockA.value.tier, ')')
} else {
  console.error('✗ unlock(skill-a) fallou:', unlockA.error.message)
  process.exit(1)
}

// ── 5. Intentar unlock cero prereqs (demostra Result.err) ──────

const unlockCFail = await engine.unlock('skill-c')
if (!unlockCFail.ok) {
  console.log(
    '▶ unlock(skill-c) bloqueado correctamente:',
    unlockCFail.error.message,
  )
}

// ── 6. unlock secuencial b, c ──────────────────────────────────

const unlockB = await engine.unlock('skill-b')
if (unlockB.ok) {
  console.log('▶ unlock(skill-b): OK')
}

const unlockC = await engine.unlock('skill-c')
if (unlockC.ok) {
  console.log('▶ unlock(skill-c): OK (cadea completa)')
}

// ── 7. Snapshot do estado ──────────────────────────────────────

const snapshot = await engine.snapshot('checkpoint')
console.log()
console.log('▶ Snapshot creado:', snapshot.id)

// ── 8. lock + restoreSnapshot + verificación ───────────────────

const lockA = await engine.lock('skill-a')
if (lockA.ok) {
  console.log('▶ lock(skill-a): OK')
}

const stateAfterLock = engine.getNodeState('skill-a')
console.log('  skill-a estado tras lock:', stateAfterLock.unlocked ? 'unlocked' : 'locked')

const restored = await engine.restoreSnapshot(snapshot.id)
if (restored.ok) {
  console.log('▶ restoreSnapshot: OK')
}

const stateAfterRestore = engine.getNodeState('skill-a')
console.log(
  '  skill-a estado tras restore:',
  stateAfterRestore.unlocked ? 'unlocked ✓' : 'locked ✗',
)

console.log()
console.log('✓ Exemplo completado correctamente.')

// ── FIN: Yggdrasil Forge — exemplo Node.js básico ──
```

**Decisións nesta peza**:
- **Cero `try/catch`**: usa Result discriminated union (idiomático).
- **`process.exit(1)` no primeiro erro crítico**: o resto require
  estado previo.
- **Console output con prefixos `▶` `✓` `✗`**: lexible.
- **Comentarios divisorios** entre pasos.
- **Cero usar `rootNodeId`**: simplifica + demostra que é opcional.

### 5.5 — `examples/node-basics/README.md` (FIXADO)

```markdown
# Node.js basics example

A minimal Node.js example demonstrating the core APIs of Yggdrasil
Forge end-to-end.

## What it demonstrates

This example walks through 8 sequential steps covering the most
common operations:

1. Defining a `TreeDef` with 3 skills (a → b → c).
2. Creating a `TreeEngine` with in-memory storage.
3. Checking if a skill can be unlocked (`canUnlock`).
4. Unlocking the first skill in the chain.
5. Attempting to unlock a skill without its prerequisites (shows
   error handling via `Result`).
6. Unlocking the remaining skills in sequence.
7. Taking a snapshot of the current state.
8. Locking a skill, then restoring from snapshot.

## How to run

From the monorepo root:

\`\`\`bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/node-basics start
\`\`\`

## Expected output

\`\`\`
▶ TreeEngine criado co tree: sample-tree
  Nodos: 3
  Edges: 2

▶ canUnlock(skill-a): OK
▶ unlock(skill-a): OK (tier 1 )
▶ unlock(skill-c) bloqueado correctamente: ...
▶ unlock(skill-b): OK
▶ unlock(skill-c): OK (cadea completa)

▶ Snapshot creado: build-...
▶ lock(skill-a): OK
  skill-a estado tras lock: locked
▶ restoreSnapshot: OK
  skill-a estado tras restore: unlocked ✓

✓ Exemplo completado correctamente.
\`\`\`

## Key concepts shown

- **`Result<T>` pattern**: All async operations return
  `Result<T> = { ok: true, value } | { ok: false, error }`. The
  example checks `.ok` before using `.value`.
- **Dependency edges**: Skills connected via `type: 'dependency'`
  enforce prerequisite chains.
- **Snapshots**: `snapshot(label)` captures the current state;
  `restoreSnapshot(id)` rolls back.
- **Storage**: `MemoryStorage` is the simplest backend; for
  production use `LocalStorageAdapter`, `IndexedDBAdapter`, or
  `FileSystemAdapter` from `@yggdrasil-forge/storage`.

## Source

See [`src/index.ts`](./src/index.ts) for the full annotated source.

## License

MIT
```

### 5.6 — `.changeset/examples-1-node-basics.md` (FIXADO)

```
---
'@yggdrasil-forge/core': patch
---

docs(examples): add Node.js basics example demonstrating core APIs end-to-end (examples-1)
```

### 5.7 — `CHANGELOG.md` (nova [Unreleased] FIXADA)

```
## [Unreleased]

### Added
- **First practical example**: `examples/node-basics/` —
  end-to-end Node.js demonstration of core APIs (TreeEngine,
  unlock/lock/canUnlock, snapshot/restoreSnapshot, MemoryStorage,
  Result pattern). Aligned with MASTER A.4.2 (*"casos prácticos
  diferidos antes do editor"*).
  - 4 files: package.json (private: true), tsconfig.json,
    README.md (80 lines), src/index.ts (140 lines; 8 demonstration
    steps).
  - Executable via `pnpm --filter @yggdrasil-forge-examples/node-basics
    start` (uses tsx for direct TypeScript execution).
  - Cero build step required.

### Note
- Sub-fase **examples-1**. FIRST sub-phase of the practical
  examples series.
- **hardening-4 skipped** (DT-15 + DT-24 cosmetic; non-blocking;
  deferred to release-prep).
- **0 modifications** to existing packages, tests, configs, or
  README files.
- 2195 tests pass unchanged. Typecheck 23/23.
- 57 consecutive sub-phases without rollback after examples-1.
- **APIs verified empirically** before drafting (NodeType values,
  EdgeType, SCHEMA_VERSION, async signatures of
  unlock/lock/snapshot/restoreSnapshot).
- **Auto-tracked**: BRIEFING-examples-1.md added to docs/briefings/
  per A.5.2 convention.
- **Next sub-phases**:
  - examples-2 (React app demonstrating @react components +
    hooks).
  - examples-3 (plugins demonstration).
  - examples-4+ (search, validators).
  - release-prep + 0.1.0-alpha.
```

### 5.8 — Verificación T5 crítica

**OBRIGATORIA**: tras crear os 4 ficheiros + `pnpm install`,
executar:

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

**Esperado**: output similar a §5.5 sen erros. Exit code 0.

**Se falla**:
- TypeScript error → revisar src/index.ts contra prescrición §5.4.
- Module resolution error → verificar `pnpm install` correu
  correctamente.
- Runtime error → ESCALAR.

### 5.9 — Cero impacto en outros paquetes

**Garantía dura**:
- **0 ficheiros .ts modificados** en /packages/ (cero engadir
  exports, cero modificar tipos).
- **2195 tests inchanged**.
- **Typecheck 23/23 successful** (engadirá probablemente 1 entrada
  máis polo paquete examples, pero cero require: tsconfig do
  exemplo ten `noEmit: true` e cero é un paquete publicado).
- **Cero modificar pnpm-workspace.yaml**.
- **Cero modificar configs root**.

### 5.10 — Lección 8.6.a L1 aplicada

**T0.2 verifica empíricamente** APIs antes de aplicar:
- `SCHEMA_VERSION` exportado por @common.
- `TreeEngine` constructor signature.
- `unlock/lock/canUnlock/snapshot/restoreSnapshot` signatures.
- `NodeType` valores válidos (`'small'` usable).
- `MemoryStorage` exportado por @storage.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Liñas aprox |
|---|---|---|
| package.json | NOVO | ~25 |
| tsconfig.json | NOVO | ~10 |
| README.md | NOVO | ~80 |
| src/index.ts | NOVO | ~140 |
| BRIEFING-examples-1.md | NOVO (copia) | ~ briefing length |
| .changeset | NOVO | ~6 |
| CHANGELOG | MODIFICADO | ~30 |

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (6)**:
- `examples/node-basics/package.json`.
- `examples/node-basics/tsconfig.json`.
- `examples/node-basics/README.md`.
- `examples/node-basics/src/index.ts`.
- `docs/briefings/BRIEFING-examples-1.md`.
- `.changeset/examples-1-node-basics.md`.

**MODIFICADOS (2)**:
- `CHANGELOG.md`.
- `pnpm-lock.yaml` (automático tras pnpm install).

**Total: 8 ficheiros tocados** (6 NOVOS + 2 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera ficheiro en `packages/`.
- Configs root (turbo.json, tsconfig.base.json, package.json
  root).
- `pnpm-workspace.yaml`.
- Tests existentes.
- READMEs dos paquetes.
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

**TypeScript**: strict mode (heredado do base). Cero `any`.

**2 espazos, comilla simple, sen `;`, trailing commas, máx 100
cols, UTF-8 LF**.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc**: comentarios divisorios entre pasos no index.ts.

**Markdown READMEs**: encabezados xerárquicos; código con triple
backtick + linguaxe.

---

## 9. QUE NON FACER

- ❌ Modificar **calquera ficheiro .ts** dentro de `packages/`.
- ❌ Modificar configs root.
- ❌ Modificar `pnpm-workspace.yaml` (xa inclúe `examples/*`).
- ❌ Modificar tests existentes.
- ❌ Engadir tests novos (exemplo cero require).
- ❌ Engadir ErrorCodes.
- ❌ Engadir deps externas máis aló de `tsx`.
- ❌ Publicar o paquete (`private: true` debe estar).
- ❌ Usar nomes `@yggdrasil-forge/...` para o paquete (usar
  `@yggdrasil-forge-examples/...`).
- ❌ Mover exemplos a outro directorio.
- ❌ Engadir Vitest ou outros frameworks de test ao exemplo.
- ❌ Engadir tsup ou outros builds (tsx executa directamente).
- ❌ Modificar contidos prescritos en §5.2 - §5.7.
- ❌ Modificar README dos paquetes existentes.
- ❌ Modificar MASTER.md.
- ❌ Placeholders / TODO / FIXME / XXX nos ficheiros novos.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T7)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `b9787cc` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar examples/ baleiro:
ls examples/
# Esperado: só .gitkeep

# Confirmar workspace inclúe examples:
grep "examples" pnpm-workspace.yaml
# Esperado: 'examples/*'

# Confirmar SCHEMA_VERSION:
grep "SCHEMA_VERSION" packages/common/src/index.ts
# Esperado: exportado

# Confirmar NodeType 'small' válido:
grep "'small'" packages/core/src/types/node.ts | head -2

# Confirmar MemoryStorage exportado:
grep "MemoryStorage" packages/storage/src/index.ts | head -2

# Confirmar tsconfig.base existe:
ls tsconfig.base.json
```

**T0.3** — Baseline:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 23/23
pnpm turbo run test --force                              # 2195 tests
```

### T1 — Crear estructura de directorios

```bash
mkdir -p examples/node-basics/src
```

### T2 — Crear ficheiros do exemplo

Aplicar §5.2, §5.3, §5.4, §5.5 literal:
- `examples/node-basics/package.json`.
- `examples/node-basics/tsconfig.json`.
- `examples/node-basics/README.md`.
- `examples/node-basics/src/index.ts`.

### T3 — pnpm install OBRIGATORIO

```bash
pnpm install
```

**Verificar**:
- pnpm-lock.yaml actualizado (novo paquete + tsx).
- node_modules do exemplo presente.

### T4 — Typecheck do exemplo

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics typecheck
```

**Se erros de tipo**: revisar src/index.ts contra §5.4.

### T5 — VERIFICACIÓN CRÍTICA: executar exemplo

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

**Esperado**:
- Output similar a §5.5 (logs ▶ con ✓ final).
- Exit code 0.
- Cero erros.

**Se falla**: **ESCALAR INMEDIATAMENTE**.

### T6 — Verificación dura — paquetes existentes intactos

```bash
# Typecheck monorepo: 23/23 (engadiu o exemplo? cero, porque
# noEmit + private; verificar):
pnpm turbo run typecheck --force

# Tests monorepo: 2195 inchanged:
pnpm turbo run test --force

# Cero ficheiros .ts modificados en /packages/:
git diff --name-only origin/main..HEAD | grep '^packages/.*\.ts$' | head -5
# Esperado: cero output.
```

### T7 — Auto-tracking briefing + changeset + CHANGELOG + commit + push

**Auto-tracking** (Agarfal copia o briefing):
```bash
cp /path/to/BRIEFING-examples-1.md docs/briefings/
```

**Changeset**: aplicar §5.6 literal.

**CHANGELOG**: aplicar §5.7 literal.

**Commit Conventional**:
`docs(examples): add Node.js basics example demonstrating core APIs (examples-1)`

Push directo a `origin/main` (base `b9787cc`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE examples-1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base b9787cc)
✅ Primeiro exemplo práctico criado: examples/node-basics/
   - 4 ficheiros: package.json + tsconfig.json + README.md + src/index.ts
   - Demostra 8 pasos: unlock, canUnlock, lock, snapshot, restore,
     Result pattern, MemoryStorage
✅ T0.2 verificación empírica:
   - examples/ baleiro previo confirmado
   - SCHEMA_VERSION, NodeType 'small', MemoryStorage confirmados
✅ T3 pnpm install: lock actualizado (tsx engadido)
✅ T4 typecheck do exemplo: OK
✅ T5 CRÍTICA: pnpm start executou correctamente:
   - Output: <breve resumen>
   - Exit code: 0
✅ T6 verificación dura:
   - Typecheck monorepo: 23/23
   - Tests monorepo: 2195 INCHANGED
   - Cero ficheiros .ts en packages/ modificados
✅ Auto-tracking BRIEFING-examples-1.md en docs/briefings/
✅ CERO impacto en paquetes existentes
✅ CERO tests novos
✅ CERO modificacións de configs root
✅ Paquete `private: true` (cero publica en npm)
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - PRIMEIRA sub-fase da serie de exemplos prácticos.
   - 57 sub-fases consecutivas sen rollback.
   - hardening-4 saltado (cosmética; deferido).
   - APIs verificadas empíricamente antes de redactar (lección
     8.6.a L1 aplicada).
   - Convención A.5.2 aplicada (auto-tracking en docs/briefings/).
   - DTs abertas: 13 (sen cambio).
   - Próximas: examples-2 (React) ou release-prep.
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit: 8 ficheiros (6 NOVOS + 2 MODIFICADOS)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA examples-2 (React) OU release-prep.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing examples-1. **PRIMEIRA da serie de exemplos
prácticos** post-Fase 8. Crea `examples/node-basics/` con 4
ficheiros demostrando 8 pasos secuenciais da API core. Pure
exemplo: cero modificación de paquetes existentes, cero tests
novos. 7 ficheiros tocados (6 NOVOS + 1 MODIFICADO). Tests 2195
inchanged. Risco MEDIO mitigado por APIs verificadas empíricamente
+ código TypeScript prescrito + verificación crítica T5 (execución
real do exemplo).*

*🎯 **Estado tras examples-1**: 57 sub-fases consecutivas sen
rollback. **Primeira demostración funcional de Yggdrasil Forge
end-to-end**. Material reutilizable para README global + sitio
web futuro + release notes.*

*Decisións críticas documentadas:
- Naming descritivo (cero numeric prefix).
- private: true (cero publica).
- tsx para execución directa (cero build step).
- Cero rootNodeId (demostra opcional).
- 3 nodos en cadea (skill-a → b → c).
- Demostración de Result.err (intentar unlock cero prereqs).
- APIs verificadas empíricamente.
- Convención A.5.2 (auto-tracking).*
