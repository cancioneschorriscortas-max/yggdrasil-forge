# BRIEFING — SUB-FASE hardening-1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA do ciclo de hardening pre-release 0.1.0-alpha**.
> Resolve **DT-21** (StorageAdapter interface acoplada en @storage,
> causando dep `core → storage` cero ideal).
>
> **Refactor cirúrxico**: mover `StorageAdapter` interface de
> `@yggdrasil-forge/storage` a `@yggdrasil-forge/common`. Patrón
> idéntico ao movemento de `Result` en sub-fase 3.0 (xa establecido).
>
> **Decisións confirmadas polo director**:
> - **Breaking change limpo**: cero re-export en @storage.
>   StorageAdapter vive **só** en @common.
> - **Implementacións concretas quedan en @storage** (MemoryStorage,
>   LocalStorageAdapter, IndexedDBAdapter, FileSystemAdapter
>   permanecen alí; só importan StorageAdapter desde @common).
> - **@core/package.json**: mover @storage de `dependencies` a
>   `devDependencies` (só tests usan implementacións).
> - **Patrón Result en 3.0** replicado literal (mesmo comentario
>   explicativo).
> - **`packages/common/src/StorageAdapter.ts`** root (cero subfolder;
>   coherente con Result.ts).
> - **Pure refactor**: cero lóxica nova, cero ErrorCodes, cero tests
>   novos, cero modificacións funcionais.
>
> **Aliñado co MASTER A.4.3** (decisión pre-release pre-resolta):
> *"DT-21 require breaking change menor que se acometerá nun ciclo
> de hardening anterior á 0.1.0-alpha"*.
>
> **Lección 8.6.a L1 aplicada con rigor**: T0.2 verifica empíricamente
> os 5 imports actuais antes de modificar (4 en @core src + 1 en
> tests).
>
> **Próximas sub-fases do ciclo hardening** (DIFERIDAS):
> - **hardening-2** (DT-25): commit `docs: briefings phases 4+5+6+7+8`.
> - **hardening-3**: READMEs placeholders nos 12 paquetes scaffold.
> - **hardening-4** (DT-12): CHANGELOG consolidación Keep-a-Changelog.
> - **hardening-5+** (opcionais): DT-15, DT-24.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE hardening-1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE hardening-1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: cero impacto (cero novos tipos).

**0.11 — c8 ignore**: cero require (pure refactor; cobertura igual).

**0.12 — Strings multiline**: cero aplicable.

**0.13 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 tests novos**.
- **0 modificacións funcionais** dos tests existentes.
- **A única modificación** de tests é actualizar o import path en
  1 línea (TreeRegistry.test.ts:1734).
- Tódolos **2195 tests** deben seguir pasando **exactamente igual**
  tras o refactor.

**0.14 — `git rm` para borrar StorageAdapter.ts en @storage**:
preserva history. Sintaxe:
```bash
git rm packages/storage/src/StorageAdapter.ts
```

**0.15 — pnpm install OBRIGATORIO** tras modificar @core/package.json
(@storage move dependencies → devDependencies).

**0.16 — Lección 8.6.a L1 aplicada con rigor**: T0.2 verifica
empíricamente:
- Localización exacta de StorageAdapter (`packages/storage/src/StorageAdapter.ts`).
- 4 imports en @core src (tree.ts, SnapshotManager, LoadoutManager,
  TreeRegistry).
- 1 import en @core tests (TreeRegistry.test.ts:1734).
- 3-4 implementacións en @storage que importan StorageAdapter
  (Memory, LocalStorage, IndexedDB, FileSystem).
- Cero outros paquetes importan @storage.

**0.17 — Patrón Result en 3.0 disponible para copia**: comentario
explicativo en `packages/common/src/result.ts` é referencia. Replicar
literal para StorageAdapter.

---

## 1. IDENTIFICACIÓN

Sub-fase **hardening-1** de Yggdrasil Forge. **PRIMEIRA do ciclo
de hardening pre-release 0.1.0-alpha**. Resolve DT-21.

**Pezas (5 grupos)**:

**Grupo A — Mover interface (3 ficheiros)**:
1. **NOVO** `packages/common/src/StorageAdapter.ts` (interface
   completa con JSDoc + comentario do move).
2. **MODIFICADO** `packages/common/src/index.ts` (+export type
   StorageAdapter).
3. **BORRADO** (via `git rm`)
   `packages/storage/src/StorageAdapter.ts`.

**Grupo B — Actualizar implementacións @storage (~4-5 ficheiros)**:
4-7+. **MODIFICADOS**: tódolos ficheiros que `implements StorageAdapter`
en `packages/storage/src/` cambian o import (de relativo `./StorageAdapter`
a `@yggdrasil-forge/common`). T0.2 verifica empíricamente a lista
exacta.
8. **MODIFICADO** `packages/storage/src/index.ts` (eliminar
   `export { StorageAdapter }` se existe; manter exports de
   implementacións).

**Grupo C — Actualizar imports en @core src (4 ficheiros)**:
9. **MODIFICADO** `packages/core/src/types/tree.ts` (import path
   de @common).
10. **MODIFICADO** `packages/core/src/builds/SnapshotManager.ts`.
11. **MODIFICADO** `packages/core/src/builds/LoadoutManager.ts`.
12. **MODIFICADO** `packages/core/src/engine/TreeRegistry.ts`.

**Grupo D — Tests + dependency cleanup (2 ficheiros)**:
13. **MODIFICADO** `packages/core/__tests__/engine/TreeRegistry.test.ts`
    línea 1734 (1 import).
14. **MODIFICADO** `packages/core/package.json` (mover @storage de
    `dependencies` → `devDependencies`).

**Grupo E — Housekeeping (2 ficheiros)**:
15. **NOVO** `.changeset/hardening-1-storage-adapter-to-common.md`.
16. **MODIFICADO** `CHANGELOG.md`.

**Total estimado: ~14-16 ficheiros tocados** (2 NOVOS + 12-13
MODIFICADOS + 1 BORRADO).

**Cero modificación de**:
- Calquera test funcional (~2195 tests). Único cambio: 1 import
  path.
- Lóxica de TreeEngine.ts (cero modifica métodos).
- Lóxica de implementacións de storage (cero modifica comportamento).
- Outros paquetes (plugins, search, validators, react, common
  outros ficheiros).
- Configs (tsconfig, tsup, vitest dos paquetes).
- MASTER.md (sub-fase doc futura actualizará DT-21 a PECHADA).

**CERO deps de npm engadidas externas**. Só **move workspace
dependency**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `8bc4900`, verificada
empíricamente)**.

### Estado actual StorageAdapter (verificado)

**Localización actual**: `packages/storage/src/StorageAdapter.ts`.

**Interface** (verificada literal):
```ts
export interface StorageAdapter {
  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non
   * existe. Erros posibles: STORAGE_READ_FAILED.
   */
  get(key: string): Promise<Result<unknown | null>>

  /**
   * Garda un valor para unha clave. Sobreescribe se xa existe.
   * Erros posibles: STORAGE_WRITE_FAILED, STORAGE_QUOTA_EXCEEDED.
   */
  set(key: string, value: unknown): Promise<Result<void>>

  /**
   * Elimina o valor asociado a unha clave. Cero erro se non existe.
   * Erros posibles: STORAGE_WRITE_FAILED.
   */
  delete(key: string): Promise<Result<void>>

  // ... outros métodos (verificar empíricamente en T0.2)
}
```

**T0.2 verifica empíricamente** o contido completo de StorageAdapter
para copia literal.

### Imports actuais (verificados)

**En @core src (4 ficheiros)**:
- `packages/core/src/types/tree.ts:6` — `import type { StorageAdapter }`
  (usado en TreeEngineOptions probable).
- `packages/core/src/builds/SnapshotManager.ts:14` —
  `import type { StorageAdapter }`.
- `packages/core/src/builds/LoadoutManager.ts:10` —
  `import type { StorageAdapter }`.
- `packages/core/src/engine/TreeRegistry.ts:16` —
  `import type { StorageAdapter }`.

**En @core tests (1 ficheiro)**:
- `packages/core/__tests__/engine/TreeRegistry.test.ts:1734` —
  `import type { StorageAdapter }`.

**En @storage src** (verificar empíricamente en T0.2):
- `LocalStorageAdapter.ts` — probable `implements StorageAdapter`.
- `IndexedDBAdapter.ts` — probable.
- `FileSystemAdapter.ts` — probable.
- `MemoryStorage.ts` — verificar.

**Cero outros paquetes** importan @storage.

### Patrón Result en 3.0 (verificado; replicable literal)

Comentario en `packages/common/src/result.ts`:
```ts
// Tipo Result para operacións que poden fallar.
// Inspirado en Rust: forza ao consumidor a manexar ambos casos.
// Movido de @yggdrasil-forge/core/types/result.ts a common en
// sub-fase 3.0 para que paquetes futuros (storage, validators,
// etc.) poidan importar Result sen acoplarse a core.
```

**Patrón equivalente para StorageAdapter**:
```ts
// StorageAdapter interface para implementacións de almacenamento.
// Movido de @yggdrasil-forge/storage/src/StorageAdapter.ts a common
// en sub-fase hardening-1 (DT-21) para que @core poda importar
// StorageAdapter sen acoplarse a @storage. As implementacións
// concretas (MemoryStorage, LocalStorageAdapter, IndexedDBAdapter,
// FileSystemAdapter) permanecen en @storage.
```

### @core/package.json estado actual

```json
"dependencies": {
  "@yggdrasil-forge/common": "workspace:*",
  "immer": "^10.1.1",
  "zod": "^3.25.76",
  "@yggdrasil-forge/storage": "workspace:*"
}
```

**Estado tras hardening-1**:
```json
"dependencies": {
  "@yggdrasil-forge/common": "workspace:*",
  "immer": "^10.1.1",
  "zod": "^3.25.76"
},
"devDependencies": {
  // ... existentes ...
  "@yggdrasil-forge/storage": "workspace:*"
}
```

**Razón**: tras o move, @core src **cero require @storage** (cero
runtime imports). Só tests importan MemoryStorage. **devDependency
é o lugar correcto**.

### Aliñamento con A.4.3 do MASTER

> *"DT-21: 'StorageAdapter' interface vive en `@yggdrasil-forge/storage`.
> En 6.1, ao engadir `TreeRegistry` que require `StorageAdapter` no
> constructor, creouse a dependencia `core → storage`. **Ideal
> arquitectónico**: mover a interface a `@yggdrasil-forge/common`
> (paralelo ao movemento de `Result` na 3.0); as implementacións
> concretas seguirían en `storage`. Cero impacto funcional [...].
> **Diferido**: require breaking change menor (imports cambiarían
> `from '@yggdrasil-forge/storage'` a `from '@yggdrasil-forge/common'`)
> que se acometerá nun ciclo de hardening anterior á 0.1.0-alpha."*

**hardening-1 executa este plan literalmente**.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `8bc4900` (sub-fase doc-8 — peche
  MASTER post-Fase 8).
- **2195 tests monorepo limpos** (1691 core + 60 common + 193
  storage + 116 react + 35 plugins + 32 search + 68 validators).
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 76 ErrorCodes.
- **52 sub-fases consecutivas sen rollback** (récord).
- 7 paquetes activos.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Mover a interface `StorageAdapter` de `@yggdrasil-forge/storage` a
`@yggdrasil-forge/common` (resolución DT-21; aliñado con MASTER
A.4.3 pre-release decisión documentada) **replicando literal o
patrón de Result en sub-fase 3.0**: crear novo
`packages/common/src/StorageAdapter.ts` con interface + JSDoc +
comentario explicativo do move; engadir export a `packages/common/src/index.ts`;
borrar `packages/storage/src/StorageAdapter.ts` via `git rm` (cero
re-export); actualizar imports nas 3-4 implementacións concretas
en `@storage` (que permanecen alí) para importar StorageAdapter
desde `@common`; eliminar export de StorageAdapter en
`packages/storage/src/index.ts`; actualizar 4 imports en @core src
+ 1 en tests; **mover @storage de `dependencies` a `devDependencies`**
en `packages/core/package.json` (tras o move, @core src cero require
@storage; só tests usan MemoryStorage); **cero modificación funcional**
de calquera test (só 1 import path actualizado). **Pure refactor**:
2195 tests pasan inchanged, cobertura inchanged, typecheck 23/23,
build ok.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (2)**:
- `packages/common/src/StorageAdapter.ts` (~80 liñas; copia literal
  do contido actual + comentario explicativo novo do move).
- `.changeset/hardening-1-storage-adapter-to-common.md`.

**MODIFICADOS (~12)**:
- `packages/common/src/index.ts` (+1 liña export).
- `packages/storage/src/index.ts` (eliminar export StorageAdapter
  se existe).
- `packages/storage/src/LocalStorageAdapter.ts` (1 import).
- `packages/storage/src/IndexedDBAdapter.ts` (1 import).
- `packages/storage/src/FileSystemAdapter.ts` (1 import).
- `packages/storage/src/MemoryStorage.ts` (1 import — se aplica;
  verificar empíricamente).
- `packages/core/src/types/tree.ts` (1 import).
- `packages/core/src/builds/SnapshotManager.ts` (1 import).
- `packages/core/src/builds/LoadoutManager.ts` (1 import).
- `packages/core/src/engine/TreeRegistry.ts` (1 import).
- `packages/core/__tests__/engine/TreeRegistry.test.ts` líña 1734
  (1 import).
- `packages/core/package.json` (mover @storage dependencies →
  devDependencies).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**BORRADOS (1)**:
- `packages/storage/src/StorageAdapter.ts` (via `git rm`).

**Total estimado: ~14-15 ficheiros tocados** (2 NOVOS + 11-12
MODIFICADOS + 1 BORRADO).

### 5.2 — `packages/common/src/StorageAdapter.ts` (FIXADO)

**Copia literal do contido actual de
`packages/storage/src/StorageAdapter.ts`** con:
1. Engadir comentario explicativo do move ao principio (similar a
   `Result.ts`).
2. Cambiar imports relativos (`./errors`, etc.) a imports do paquete
   `@common` se aplicaba (cero require porque @common cero importa
   nada de @storage; só `Result` que xa está alí).

**Estructura prescrita**:
```ts
// ── INICIO: StorageAdapter interface ──
// Interface para implementacións de almacenamento (in-memory,
// localStorage, IndexedDB, filesystem).
//
// Movido de @yggdrasil-forge/storage/src/StorageAdapter.ts a
// common en sub-fase hardening-1 (DT-21) para que @core poda
// importar StorageAdapter sen acoplarse a @storage (paralelo ao
// movemento de Result en sub-fase 3.0).
//
// As implementacións concretas (MemoryStorage, LocalStorageAdapter,
// IndexedDBAdapter, FileSystemAdapter) permanecen en @storage.

import type { Result } from './result.js'

/**
 * Interface para adaptadores de almacenamento.
 * 
 * [JSDoc completa copiada do orixinal]
 */
export interface StorageAdapter {
  // ... interface completa copiada literal do orixinal
}

// ── FIN: StorageAdapter interface ──
```

**T0.2 verifica empíricamente** o contido exacto da interface (cero
asumir; ler o ficheiro orixinal para copia literal).

### 5.3 — `packages/common/src/index.ts` modificación (FIXADO)

**Engadir** após exports existentes:

```ts
// hardening-1 (DT-21):
export type { StorageAdapter } from './StorageAdapter.js'
```

**Mantén** tódolos exports existentes inchanged.

### 5.4 — Borrar `packages/storage/src/StorageAdapter.ts` (FIXADO)

```bash
git rm packages/storage/src/StorageAdapter.ts
```

**Cero re-export en @storage**. Breaking change limpo.

### 5.5 — Actualizar `packages/storage/src/index.ts` (FIXADO)

**T0.2 verifica empíricamente** o contido actual. Se existe línea
exportando StorageAdapter (e.g., `export type { StorageAdapter }
from './StorageAdapter.js'`): **eliminar**. Manter os exports de
implementacións concretas inchanged.

### 5.6 — Actualizar implementacións @storage (FIXADO)

**Para cada ficheiro en `packages/storage/src/`** que importa ou
implementa StorageAdapter:
- Cambiar `import type { StorageAdapter } from './StorageAdapter.js'`
  a `import type { StorageAdapter } from '@yggdrasil-forge/common'`.

**Ficheiros típicos** (T0.2 verifica empíricamente):
- LocalStorageAdapter.ts
- IndexedDBAdapter.ts
- FileSystemAdapter.ts
- MemoryStorage.ts (se implementa)

**Cero outras modificacións** (cero lóxica, cero JSDoc).

### 5.7 — Actualizar imports en @core src (FIXADO)

**4 ficheiros**:
- `packages/core/src/types/tree.ts:6`
- `packages/core/src/builds/SnapshotManager.ts:14`
- `packages/core/src/builds/LoadoutManager.ts:10`
- `packages/core/src/engine/TreeRegistry.ts:16`

**Cambio idéntico en cada un**:
```ts
// Antes:
import type { StorageAdapter } from '@yggdrasil-forge/storage'

// Despois:
import type { StorageAdapter } from '@yggdrasil-forge/common'
```

**Cero outras modificacións**. **Cero lóxica nova**.

### 5.8 — Actualizar import en test (FIXADO)

`packages/core/__tests__/engine/TreeRegistry.test.ts:1734`:

```ts
// Antes:
import type { StorageAdapter } from '@yggdrasil-forge/storage'

// Despois:
import type { StorageAdapter } from '@yggdrasil-forge/common'
```

**Cero modificacións funcionais ao test** (a lóxica do teste é
inchanged; só 1 import path).

### 5.9 — `packages/core/package.json` (FIXADO)

**Antes** (verificado):
```json
"dependencies": {
  "@yggdrasil-forge/common": "workspace:*",
  "immer": "^10.1.1",
  "zod": "^3.25.76",
  "@yggdrasil-forge/storage": "workspace:*"
}
```

**Despois**:
```json
"dependencies": {
  "@yggdrasil-forge/common": "workspace:*",
  "immer": "^10.1.1",
  "zod": "^3.25.76"
},
"devDependencies": {
  // ... existentes ...
  "@yggdrasil-forge/storage": "workspace:*"
}
```

**T0.2 verifica empíricamente** que devDependencies xa existe (probable
con tsup, vitest, etc.) + engade @storage alfabéticamente ordenado.

### 5.10 — Verificación pure refactor

**Garantía dura**:
- **0 tests novos**.
- **0 modificacións funcionais** de tests (só 1 import path actualizado).
- **0 ErrorCodes**.
- **0 tipos novos**.
- **0 lóxica nova**.
- **Cobertura** inchanged (mesmo % en cada métrica).
- **Tests** inchanged (2195 totais; **TÓDOLOS pasan**).
- **Typecheck** inchanged (23/23 successful).
- **Build** ok en tódolos paquetes.

### 5.11 — Lección 8.6.a L1 aplicada con rigor

T0.2 verifica empíricamente **ANTES** de modificar:

```bash
# Localización exacta de StorageAdapter:
ls packages/storage/src/StorageAdapter.ts

# Contido completo da interface (para copia literal):
cat packages/storage/src/StorageAdapter.ts

# Imports actuais en @core src (4 esperados):
grep -rn "from '@yggdrasil-forge/storage'" packages/core/src/ | grep -v "^.*:.*//"
# Esperado: 4 matches (tree.ts, SnapshotManager, LoadoutManager,
# TreeRegistry).

# Imports en @core tests (1 esperado):
grep -rn "from '@yggdrasil-forge/storage'" packages/core/__tests__/ | grep "import type"
# Esperado: TreeRegistry.test.ts:1734.

# Implementacións en @storage que importan StorageAdapter:
grep -ln "import.*StorageAdapter.*from\|implements StorageAdapter" packages/storage/src/*.ts
# Esperado: ~3-4 ficheiros.

# Confirmar que @core/package.json ten @storage en dependencies:
grep -A 3 '"@yggdrasil-forge/storage"' packages/core/package.json | head -5
```

**Calquera desvío** das expectativas → **ESCALAR**.

### 5.12 — pnpm install OBRIGATORIO

**Tras modificar package.json**:
```bash
pnpm install
```

**Esperado**: pnpm-lock.yaml actualízase (move @storage entre
sections). **Incluír no commit**.

### 5.13 — Lecturas críticas T0.2

T0.2 **debe verificar empíricamente** o **contido completo** de
`packages/storage/src/StorageAdapter.ts` ANTES de crear o novo en
@common. Cero copia parcial nin reconstrución manual; **copia
literal byte-by-byte**.

**Procedimiento**:
1. `cat packages/storage/src/StorageAdapter.ts > /tmp/original.txt`.
2. Crear `packages/common/src/StorageAdapter.ts` con contido idéntico.
3. Engadir comentario explicativo de move ao principio.
4. Verificar que tódolos imports relativos no orixinal (e.g.,
   `./errors/...`) se resolveñan correctamente en @common (probable
   non haxa).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| Interface mover | TS NOVO | common/src/StorageAdapter.ts | ~80 (copia literal) |
| Common index export | TS additions | common/src/index.ts | +2 |
| Borrar orixinal | git rm | storage/src/StorageAdapter.ts | -80 |
| Storage index update | TS removal | storage/src/index.ts | -1 a -3 |
| Implementacións @storage | TS imports | storage/src/*.ts (3-4 files) | +1 c/u |
| @core src imports | TS imports | core/src/{4 files} | +1 c/u |
| Test import | TS imports | core/__tests__/.../TreeRegistry.test.ts | +1 |
| package.json @core | JSON | core/package.json | +1 modif |
| .changeset | YAML+md | .changeset/hardening-1-...md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~25 |

**Total estimado**: ~120 liñas movidas + ~20 imports actualizados.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `packages/common/src/StorageAdapter.ts`
- `.changeset/hardening-1-storage-adapter-to-common.md`

**MODIFICADOS (~12)**:
- `packages/common/src/index.ts`
- `packages/storage/src/index.ts`
- `packages/storage/src/LocalStorageAdapter.ts`
- `packages/storage/src/IndexedDBAdapter.ts`
- `packages/storage/src/FileSystemAdapter.ts`
- `packages/storage/src/MemoryStorage.ts` (se aplica; verificar T0.2)
- `packages/core/src/types/tree.ts`
- `packages/core/src/builds/SnapshotManager.ts`
- `packages/core/src/builds/LoadoutManager.ts`
- `packages/core/src/engine/TreeRegistry.ts`
- `packages/core/__tests__/engine/TreeRegistry.test.ts`
- `packages/core/package.json`
- `CHANGELOG.md`

**BORRADOS (1)**:
- `packages/storage/src/StorageAdapter.ts`

**Total estimado: ~14-15 ficheiros tocados**.

**Cambios secundarios esperados**:
- `pnpm-lock.yaml`: actualízase (move @storage). **Incluír no
  commit**.

**NON deben aparecer cambios en**:
- Outros paquetes (plugins, search, validators, react).
- Tests funcionais (~2195 inchanged; só 1 import path).
- Configs (tsconfig, tsup, vitest).
- MASTER.md (sub-fase doc futura actualizará DT-21).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc**: copia literal do orixinal en `packages/storage/src/StorageAdapter.ts`.

**Marcadores**: `// ── INICIO: StorageAdapter interface ──` / `// ──
FIN: StorageAdapter interface ──` no novo ficheiro.

**Comentario explicativo do move**: literal segundo §5.2 (replica
patrón Result.ts).

---

## 9. QUE NON FACER

- ❌ Modificar **calquera lóxica** dentro de StorageAdapter
  (interface idéntica).
- ❌ Modificar **calquera lóxica funcional** das implementacións
  @storage (só cambia o import path).
- ❌ Modificar **calquera lóxica funcional** dos consumidores @core
  (só cambia import path).
- ❌ Modificar **calquera test funcional** (~2195 inchanged; só 1
  import path).
- ❌ Engadir re-export en @storage para backward-compat (cero;
  breaking change limpo).
- ❌ Renomear `StorageAdapter` ou cambiar a súa estructura.
- ❌ Engadir métodos á interface.
- ❌ Crear subfolder en @common (cero `packages/common/src/storage/`;
  patrón é root como Result.ts).
- ❌ Modificar outros paquetes (plugins, search, validators, react).
- ❌ Modificar configs (tsconfig, tsup, vitest).
- ❌ Modificar README dos paquetes.
- ❌ Modificar MASTER.md (sub-fase doc futura).
- ❌ Engadir tests novos (pure refactor).
- ❌ Engadir ErrorCodes.
- ❌ Esquecer `pnpm install` tras modificar package.json.
- ❌ Esquecer `git rm` para borrar StorageAdapter.ts en @storage.
- ❌ Borrar + crear como dúas operacións separadas (`git rm` é
  preferido para tracking).
- ❌ Modificar deps externas de npm.
- ❌ Usar `!` non-null assertions.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T8)

### T0 — Verificación previa + lección 8.6.a L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `8bc4900` como HEAD.

**T0.2** — Verificacións empíricas (críticas):

```bash
# Localización + contido de StorageAdapter:
ls packages/storage/src/StorageAdapter.ts
wc -l packages/storage/src/StorageAdapter.ts

# Copiar contido para referencia:
cp packages/storage/src/StorageAdapter.ts /tmp/storage-adapter-original.txt

# Imports en @core src:
grep -rn "from '@yggdrasil-forge/storage'" packages/core/src/
# Esperado: 4 matches (tree.ts:6, SnapshotManager.ts:14,
# LoadoutManager.ts:10, TreeRegistry.ts:16).

# Imports en @core tests:
grep -rn "from '@yggdrasil-forge/storage'" packages/core/__tests__/ | grep "import type"
# Esperado: 1 match (TreeRegistry.test.ts:1734).

# Implementacións en @storage:
grep -ln "implements StorageAdapter\|import.*StorageAdapter.*from" packages/storage/src/*.ts
# Esperado: 3-4 matches.

# Confirmar @storage/src/index.ts exporta StorageAdapter:
grep "StorageAdapter" packages/storage/src/index.ts

# Confirmar @core/package.json:
grep -A 1 "@yggdrasil-forge/storage" packages/core/package.json

# Confirmar Result.ts patrón referencia:
head -10 packages/common/src/result.ts
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/storage build
pnpm --filter @yggdrasil-forge/core build
pnpm turbo run typecheck --force                        # 23/23
pnpm turbo run test --force                              # 2195 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear `packages/common/src/StorageAdapter.ts`

Aplicar §5.2 literal. **Copia byte-by-byte** do contido orixinal +
comentario explicativo de move ao principio.

### T2 — Engadir export a `packages/common/src/index.ts`

Aplicar §5.3 literal (+2 liñas).

### T3 — Borrar StorageAdapter en @storage + actualizar @storage/src/index.ts

```bash
git rm packages/storage/src/StorageAdapter.ts
```

Modificar `packages/storage/src/index.ts` segundo §5.5.

### T4 — Actualizar imports en implementacións @storage

Aplicar §5.6 literal. **T0.2 lista exacta** de ficheiros con
`implements StorageAdapter` ou `import StorageAdapter`. Cambiar
import path en cada un.

### T5 — Actualizar imports en @core src + tests + package.json

Aplicar §5.7 + §5.8 + §5.9 literal:
- 4 ficheiros en @core src (tree.ts, SnapshotManager, LoadoutManager,
  TreeRegistry).
- 1 import en test (TreeRegistry.test.ts:1734).
- package.json: mover @storage de dependencies → devDependencies.

### T6 — pnpm install

```bash
pnpm install
```

Verificar que pnpm-lock.yaml se actualizou correctamente:
```bash
git diff pnpm-lock.yaml | head -20
```

### T7 — Verificación dura

```bash
# Typecheck: cero regresión:
pnpm turbo run typecheck --force                          # 23/23

# Tests: 2195 inchanged:
pnpm turbo run test --force
# Esperado:
#   core: 1691 (inchanged)
#   common: 60 (inchanged)
#   storage: 193 (inchanged)
#   react: 116 (inchanged)
#   plugins: 35 (inchanged)
#   search: 32 (inchanged)
#   validators: 68 (inchanged)
#   Total: 2195

# Cobertura: cero regresión:
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep "^All files" | head -1
# Esperado: 97.36 / 91.4 / 96.75 / 97.95 (ou superior; cero
# regresión).
```

**Se algún teste falla**: **ESCALAR INMEDIATAMENTE. NON CONTINUAR**.

### T8 — Build + Lint + Format + Grep + commit + push

```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/storage build
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check

# Cero placeholders esperados:
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/common/src/StorageAdapter.ts
```

`.changeset/hardening-1-storage-adapter-to-common.md`:
```
---
'@yggdrasil-forge/common': minor
'@yggdrasil-forge/storage': minor
'@yggdrasil-forge/core': minor
---

refactor: move StorageAdapter interface from @storage to @common (DT-21; hardening pre-0.1.0-alpha)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Changed
- **BREAKING (DT-21)**: `StorageAdapter` interface movida de
  `@yggdrasil-forge/storage` a `@yggdrasil-forge/common`. Patrón
  idéntico ao movemento de `Result` en sub-fase 3.0.
  - **Antes**: `import type { StorageAdapter } from '@yggdrasil-forge/storage'`.
  - **Despois**: `import type { StorageAdapter } from '@yggdrasil-forge/common'`.
- Implementacións concretas (`MemoryStorage`, `LocalStorageAdapter`,
  `IndexedDBAdapter`, `FileSystemAdapter`) **permanecen en
  `@yggdrasil-forge/storage`** (cero cambio para usuarios destas).
- `@yggdrasil-forge/core/package.json`: `@yggdrasil-forge/storage`
  movido de `dependencies` a `devDependencies` (tras o move, @core
  src cero require @storage runtime; só tests usan implementacións).

### Note
- Sub-fase **hardening-1**. PRIMEIRA do ciclo de hardening pre-release
  0.1.0-alpha.
- Resolve **DT-21**: aliñado con decisión documentada en MASTER
  A.4.3 (*"breaking change menor que se acometerá nun ciclo de
  hardening anterior á 0.1.0-alpha"*).
- **Pure refactor**: cero lóxica nova, cero tests novos, cero
  ErrorCodes, cero cambio de comportamento.
- **2195 tests pasan inchanged**. Cobertura inchanged. Typecheck
  23/23.
- **Breaking change limpo**: cero re-export en @storage (usuarios
  importan directamente de @common). Aceptable porque cero release
  feito aínda (0.0.0).
- **Patrón Result en 3.0 replicado** literal con comentario
  explicativo do move.
- **Lección 8.6.a L1 aplicada**: T0.2 verifica empíricamente os 5
  imports actuais + lista de implementacións en @storage antes de
  modificar.
- 53 sub-fases consecutivas sen rollback tras hardening-1.
- **Próximas sub-fases hardening pre-release** (DIFERIDAS):
  hardening-2 (DT-25 briefings), hardening-3 (READMEs scaffold),
  hardening-4 (DT-12 CHANGELOG Keep-a-Changelog).
```

Commit Conventional:
`refactor: move StorageAdapter interface from @storage to @common (DT-21; hardening pre-0.1.0-alpha)`

Push directo a `origin/main` (base `8bc4900`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE hardening-1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 8bc4900)
✅ DT-21 RESOLTA: StorageAdapter movida @storage → @common
✅ Pure refactor (cero lóxica nova, cero tests novos):
   - NOVO packages/common/src/StorageAdapter.ts (~80 liñas; copia
     literal + comentario do move)
   - +1 export en packages/common/src/index.ts
   - BORRADO packages/storage/src/StorageAdapter.ts (git rm)
   - @storage/src/index.ts actualizado (eliminado export)
   - 3-4 implementacións @storage actualizan import (Memory, Local,
     IndexedDB, FileSystem)
   - 4 imports en @core src actualizados (tree.ts, SnapshotManager,
     LoadoutManager, TreeRegistry)
   - 1 import en @core tests actualizado (TreeRegistry.test.ts:1734)
   - @core/package.json: @storage dependencies → devDependencies
✅ T0.2 verificación empírica (lección 8.6.a L1):
   - StorageAdapter localización confirmada
   - 4 imports en @core src confirmados
   - 1 import en @core tests confirmado
   - X implementacións en @storage confirmadas
   - Patrón Result.ts en @common verificado como referencia
✅ T6 pnpm install: lock actualizado (move @storage)
✅ T7 verificación dura:
   - Typecheck: 23/23 successful
   - Tests: 2195 INCHANGED (cero novos, cero modificados
     funcionalmente)
   - Cobertura: 97.36 / 91.4 / 96.75 / 97.95 (inchanged)
✅ CERO lóxica nova
✅ CERO tests novos
✅ CERO ErrorCodes novos
✅ CERO modificación de outros paquetes (plugins/search/validators/react)
✅ CERO modificación de MASTER.md (sub-fase doc futura)
✅ CERO deps de npm engadidas externas
✅ Build: @common + @storage + @core ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - PRIMEIRA sub-fase do ciclo hardening pre-release 0.1.0-alpha.
   - 53 sub-fases consecutivas sen rollback.
   - Breaking change menor limpo (cero re-export); aceptable porque
     cero release feito aínda (0.0.0).
   - Próximas sub-fases hardening pre-release: hardening-2 (DT-25),
     hardening-3 (READMEs), hardening-4 (DT-12 CHANGELOG).
   - DT-21 status no MASTER actualizarase nunha sub-fase doc
     futura (cero require neste momento).
✅ Changeset minor (common + storage + core) + nova [Unreleased]
✅ git status pre-commit: 14-15 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE hardening-2 (DT-25 briefings phases 4+5+6+7+8).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing hardening-1. **PRIMEIRA do ciclo de hardening
pre-release 0.1.0-alpha**. Resolve DT-21 mediante refactor cirúrxico
do StorageAdapter interface de `@yggdrasil-forge/storage` a
`@yggdrasil-forge/common`, replicando literal o patrón do movemento
de Result en sub-fase 3.0. **Pure refactor**: cero lóxica nova,
cero tests novos, cero ErrorCodes, cero modificación funcional.
~14-15 ficheiros tocados (2 NOVOS + 11-12 MODIFICADOS + 1 BORRADO).
**Risco MEDIO** mais ben acoutado: imports masivos (~10 ficheiros)
mais cero lóxica nova; **2195 tests deben pasar inchanged**.
Lección 8.6.a L1 aplicada con rigor en T0.2.*

*🎯 **Próximo paso**: tras hardening-1, próxima sub-fase recomendada
é hardening-2 (DT-25: commit `docs: briefings phases 4+5+6+7+8`).
Roteiro pre-release 0.1.0-alpha:
- ✅ hardening-1: DT-21 (StorageAdapter → @common).
- ⏳ hardening-2: DT-25 (commit briefings Fases 4-8).
- ⏳ hardening-3: READMEs placeholders nos 12 paquetes scaffold.
- ⏳ hardening-4: DT-12 (CHANGELOG Keep-a-Changelog).
- ⏳ hardening-5+: DT-15, DT-24 (opcionais).*

*Decisións críticas documentadas:
- Breaking change limpo (cero re-export en @storage).
- @core/package.json: @storage dependencies → devDependencies.
- StorageAdapter en common root (cero subfolder; coherente con
  Result.ts).
- Implementacións concretas quedan en @storage.
- Comentario explicativo de move replica patrón Result.ts.
- Copia literal byte-by-byte do contido orixinal.
- git rm en lugar de delete + create para preservar history.*
