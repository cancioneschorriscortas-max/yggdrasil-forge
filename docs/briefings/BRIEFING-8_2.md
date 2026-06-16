# BRIEFING — SUB-FASE 8.2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEGUNDA sub-fase da Fase 8** (Builds + Plugins + Search +
> Validators). Engade ao paquete `@yggdrasil-forge/core`:
> 1. **Tipo `Loadout`** novo en `types/build.ts`: `{ name, build,
>    updatedAt }`.
> 2. **`SnapshotManager`** (interno) — in-memory `Map<id, BuildSnapshot>`
>    + opt-in persistencia via `StorageAdapter` con prefixo `snapshots:`.
> 3. **`LoadoutManager`** (interno) — in-memory `Map<name, Loadout>`
>    + opt-in persistencia con prefixo `loadouts:`.
> 4. **8 APIs novas en TreeEngine**:
>    - `snapshot(label?): Promise<BuildSnapshot>`
>    - `restoreSnapshot(id): Promise<Result<void>>`
>    - `listSnapshots(): Promise<readonly BuildSnapshot[]>`
>    - `deleteSnapshot(id): Promise<Result<void>>`
>    - `saveLoadout(name): Promise<Result<Loadout>>`
>    - `loadLoadout(name): Promise<Result<Loadout>>`
>    - `listLoadouts(): Promise<readonly Loadout[]>`
>    - `deleteLoadout(name): Promise<Result<void>>`
> 5. **`TreeEngineOptions.storage?`** novo (opcional;
>    `StorageAdapter`).
> 6. **4 eventos novos en EventMap**: `snapshotCreated`,
>    `snapshotRestored`, `loadoutSaved`, `loadoutLoaded`.
> 7. **3 ErrorCodes novos** baixo prefixo existente `YGG_B*`:
>    `YGG_B004 SNAPSHOT_NOT_FOUND`,
>    `YGG_B005 LOADOUT_NOT_FOUND`,
>    `YGG_B006 LOADOUT_NAME_INVALID`.
>
> **Opción C+ confirmada** (decisión do director):
> - **In-memory por defecto**: snapshots e loadouts viven en
>   `Map<>` dentro do engine. Sin storage, pérdense ao recargar.
> - **Opt-in persistencia**: `new TreeEngine(treeDef, { storage:
>   adapter })` activa write-through cache (escribe a storage; le
>   primeiro de memoria, fallback a storage).
>
> **Decisión chave**: `restoreSnapshot` **APLICA o estado** ao
> engine (vs `loadFromShareLink` de 8.1 que **NON** aplica). Usa
> `this.store.replaceTreeState(snap.state)` +
> `this.store.invalidate(ALL_CACHE_TYPES)` + emit
> `snapshotRestored` event.
>
> **Cero validación de versión en restore** (Opción A do director):
> aplica state independentemente de treeId/treeVersion. **DIFERIDO**
> a sub-fase futura con migración (probablemente coordinada con
> MigrationRunner existente da Fase 3.5).
>
> **Lazy init confirmado** (Opción A): a primeira chamada a `list*`,
> `load*` ou `restore*` carga desde storage. Cero auto-load no
> constructor.
>
> **CRUD completo** (decisión do director): 8 APIs en lugar das 4
> do MASTER §25 (engade list + delete). Razón: UI consumidor
> precisa enumerar e borrar.
>
> 8.3 (RespecManager), 8.4 (PluginManager + HookRunner), 8.5-8.8
> DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Especial
atención**: se descobres que `replaceTreeState` non notifica
correctamente subscribers (ex: subscribers de specific subtrees
non reciben), **ESCALAR** antes de inventar workarounds.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando
aplique (lección 8.1: `{ cause: e instanceof Error ? e : undefined }`
NON é válido; usar `{ ...(e instanceof Error ? { cause: e } : {}) }`).

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: pezas novas (SnapshotManager, LoadoutManager,
8 APIs en TreeEngine) chegan a **100/100/100/100**. Cero regresión
na baseline post-8.1 (97.54/91.23/98.85/98.2).

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de
calquera ficheiro existente fora dos explicitamente prescritos en
§5.1.

**Tódolos 1546 core + 60 common + 193 storage + 116 react = 1915
tests existentes deben pasar intactos**. Especial atención a:
- **TreeEngine tests existentes**: cero modificación nin breakage.
  As 8 APIs novas son aditivas; tódolos métodos previos manteñen
  comportamento.
- **StateStore.replaceTreeState**: cero modificación; uso desde
  os managers novos.

**0.14 — Lección 8.1 L2 aplicada**: verificar empíricamente acceso
a TreeEngine internals en T0.2. Especificamente:
- `this.store.replaceTreeState(newState)` existe.
- `this.store.invalidate(types)` existe.
- `ALL_CACHE_TYPES` exportado.

**0.15 — Lección 8.1 L1 aplicada**: antes de prescribir exports en
`core/src/index.ts`, grep o barrel completo para conflitos de nome.
**Especificamente**: `Loadout` non está xa exportado (verificable
con `grep "Loadout" packages/core/src/index.ts`). Cero conflito
esperado.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.2** de Yggdrasil Forge. **SEGUNDA da Fase 8**
(Builds + Plugins + Search + Validators).

**Pezas (8 grupos)**:

**Grupo A — ErrorCodes novos**:
1. **`packages/common/src/errors/codes.ts`** (MODIFICADO): engadir
   3 entradas baixo o bloque `// Builds` existente:
   ```ts
   SNAPSHOT_NOT_FOUND = 'YGG_B004',
   LOADOUT_NOT_FOUND = 'YGG_B005',
   LOADOUT_NAME_INVALID = 'YGG_B006',
   ```
2. **`packages/common/src/errors/messages.ts`** (MODIFICADO):
   engadir 3 entradas (gl/es/en) para os ErrorCodes anteriores.

**Grupo B — Tipo Loadout**:
3. **`packages/core/src/types/build.ts`** (MODIFICADO): engadir
   `Loadout` interface despois de `BuildSnapshot`:
   ```ts
   export interface Loadout {
     readonly name: string
     readonly build: Build
     readonly updatedAt: number
   }
   ```

**Grupo C — TreeEngineOptions storage**:
4. **`packages/core/src/types/tree.ts`** (MODIFICADO): engadir
   `storage?` opcional a `TreeEngineOptions`.

**Grupo D — EventMap (4 eventos novos)**:
5. **`packages/core/src/types/events.ts`** (MODIFICADO): engadir 4
   eventos novos despois dos existentes.

**Grupo E — SnapshotManager (NOVO)**:
6. **`packages/core/src/builds/SnapshotManager.ts`** (NOVO; interno;
   cero export público). In-memory + opt-in storage. Lazy init.

**Grupo F — LoadoutManager (NOVO)**:
7. **`packages/core/src/builds/LoadoutManager.ts`** (NOVO; interno;
   cero export público). Patrón análogo a SnapshotManager.

**Grupo G — TreeEngine 8 APIs**:
8. **`packages/core/src/engine/TreeEngine.ts`** (MODIFICADO):
   - Engadir imports (Loadout, StorageAdapter, ALL_CACHE_TYPES,
     SnapshotManager, LoadoutManager).
   - Engadir 2 membros privados: `snapshotManager`, `loadoutManager`.
   - Inicializar en constructor (pasando `options.storage` se existe).
   - Engadir 8 APIs públicas async.

**Grupo H — Exports en core/index.ts**:
9. **`packages/core/src/index.ts`** (MODIFICADO): engadir export do
   tipo `Loadout`.

**Grupo I — Tests**:
10. **`packages/core/__tests__/builds/SnapshotManager.test.ts`**
    (NOVO; ~12 tests).
11. **`packages/core/__tests__/builds/LoadoutManager.test.ts`**
    (NOVO; ~12 tests).
12. **`packages/core/__tests__/builds/TreeEngine.snapshot.test.ts`**
    (NOVO; ~8 tests).
13. **`packages/core/__tests__/builds/TreeEngine.loadout.test.ts`**
    (NOVO; ~8 tests).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros 14 paquetes scaffold.
- **Calquera outro ficheiro** en `packages/core/src/` fora dos
  prescritos en §5.1.
- **Calquera test existente** (61 ficheiros en `__tests__/` previos
  + 4 ficheiros builds/ de 8.1).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `docs/architecture/MASTER.md` (sub-fase doc posterior se require).

**CERO deps de npm engadidas.** Cero entry points novos.
**`@yggdrasil-forge/storage` xa é dep** de core (verificado en T0.2).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `760c11d`, verificada
empíricamente en clone independente)**.

### MASTER §25 (literal)

```
await engine.saveLoadout('Glass cannon')
await engine.loadLoadout('Tank')

const snap = await engine.snapshot('Antes do experimento')
await engine.restoreSnapshot(snap.id)
```

**Decisión do Director sobre signatures (verificadas vs MASTER
§19/§25)**:
- `snapshot(label?: string): Promise<BuildSnapshot>` — Promise pero
  cero pode fallar (devolve BuildSnapshot directamente; cero Result).
- `restoreSnapshot(id: string): Promise<Result<void>>` — Result
  porque pode fallar (id inexistente).
- `saveLoadout(name: string): Promise<Result<Loadout>>` — Result
  porque name pode ser inválido.
- `loadLoadout(name: string): Promise<Result<Loadout>>` — Result
  porque name pode non existir.

### StateStore.replaceTreeState (verificado empíricamente)

```ts
replaceTreeState(newState: TreeState): void {
  this.treeState = newState
  this.notify()
}
```

**Crítico**: `replaceTreeState` **NON invalida caches**. **Polo
tanto**: tras chamala, `restoreSnapshot` e `loadLoadout` deben
chamar **explícitamente** `this.store.invalidate(ALL_CACHE_TYPES)`.

`ALL_CACHE_TYPES` definido en `StateStore.ts`:
```ts
export const ALL_CACHE_TYPES: readonly CacheType[] = [
  'layout', 'dependency', 'search', 'stats',
]
```

### StorageAdapter API (verificada empíricamente)

```ts
interface StorageAdapter {
  get(key: string): Promise<Result<unknown | null>>
  set(key: string, value: unknown): Promise<Result<void>>
  delete(key: string): Promise<Result<void>>
  list(prefix?: string): Promise<Result<string[]>>
  clear(): Promise<Result<void>>
  watch?(key: string, callback: ...): () => void  // opcional
}
```

**Decisión do Director**: usar `prefix` parameter de `list()` para
filtrar `snapshots:*` e `loadouts:*` separadamente. Cero impacto
mutuo.

### TreeEngineOptions actual (verificada empíricamente)

`packages/core/src/types/tree.ts:139` ten:
```ts
export interface TreeEngineOptions {
  readonly locale?: Locale
  readonly readOnly?: boolean
  readonly audit?: { ... }
  readonly timeNow?: () => number
  readonly initialState?: TreeState
  readonly activeSubtreeIds?: ReadonlySet<string>
  // (engadir en 8.2):
  readonly storage?: StorageAdapter
}
```

### EventMap actual (verificado empíricamente)

14 eventos existentes (incluído `buildLoaded` xa). Decisión do
Director: engadir 4 novos específicos para Loadouts/Snapshots
(cero reutilización de `buildLoaded` que está reservado para casos
xenéricos):
- `snapshotCreated: (snapshot: BuildSnapshot) => void`
- `snapshotRestored: (snapshot: BuildSnapshot) => void`
- `loadoutSaved: (loadout: Loadout) => void`
- `loadoutLoaded: (loadout: Loadout) => void`

### TreeRegistry — cero overlap funcional (verificado)

`TreeRegistry` xa ten `saveBuild/loadBuild/listBuilds/removeBuild`
para **multi-tenancy** (multi-user). **Cero overlap con 8.2**:
- TreeRegistry: builds por usuario; persistencia global.
- 8.2: loadouts/snapshots por engine local; in-memory + opt-in
  storage.

### Storage keys: convención

**Decisión do Director**:
- **Snapshots**: `snapshots:${id}` (e.g., `snapshots:snap-1717000000-0`).
- **Loadouts**: `loadouts:${name}` (e.g., `loadouts:Tank`).

Cero solapa entre prefixos. Cero solapa con outros consumidores do
storage (TreeRegistry usa prefixos diferentes).

### Lazy init pattern

**Decisión do Director**:
- Constructor de Manager: recibe `storage?` + crea `Map` baleira +
  flag interno `loaded = false`.
- Primeira chamada a método CRUD (list, load, restore): chama
  internamente a `_ensureLoaded()` que:
  1. Se `loaded === true`: cero acción (xa cargado en memoria).
  2. Se `storage === undefined`: marca `loaded = true` (cero
     persistencia, in-memory only).
  3. Senón: chama `storage.list(prefix)` + para cada key chama
     `storage.get(key)` + popula a Map + marca `loaded = true`.
- **Cero auto-load no constructor** (require constructor async).

### Snapshot ID generation

**Decisión do Director**:
- Formato: `snap-${Date.now()}-${counter}`.
- Counter interno do manager (zero-based; incrementa con cada
  snapshot).
- **Cero require uniqueness global**: o counter+timestamp dentro
  do manager garante unicidade local. Storage cross-engine require
  multi-tenant prefix (fora de scope de 8.2).

### Loadout name validation

**Decisión do Director**:
- **`name.length === 0`** → `LOADOUT_NAME_INVALID`.
- **`name.trim() === ''`** → `LOADOUT_NAME_INVALID` (cero whitespace-only).
- **Calquera outra string** permitida (emojis, espazos no medio,
  caracteres especiais, etc.).
- **Case-sensitive lookup**: `'Tank'` != `'tank'`.

### Save replaces semantics

**Decisión do Director**: `saveLoadout('Tank')`:
- Se 'Tank' xa existe: sobreescribe `build` + actualiza
  `updatedAt: Date.now()`.
- Se non existe: crea novo Loadout.
- **Cero erro en ambos casos**.

### Restore semantics — cero version check

**Decisión do Director (Opción A confirmada)**:
- `restoreSnapshot(id)`:
  1. Busca snapshot por id en memoria (lazy init si require).
  2. Se cero existe: err `SNAPSHOT_NOT_FOUND`.
  3. Senón: `this.store.replaceTreeState(snap.state)` + `invalidate(ALL_CACHE_TYPES)` + emit `snapshotRestored`.
  4. **Cero check** de `snap.treeId` ou `snap.treeVersion`. Aplica
     state directamente.
- **Razón**: builds dunha versión anterior do tree deberían poderse
  recuperar. Migración é responsabilidade de sub-fase futura
  coordinada con MigrationRunner (3.5).

### Storage write-through cache

**Decisión do Director** para `save*` e `create*` methods:
1. Constrúe entry en memoria.
2. Insire na `Map`.
3. Se `storage !== undefined`: `await storage.set(key, entry)`. Se
   erro, **propágao** (devolve `err`).
4. Emite event.

Para `delete*`:
1. Comproba existencia en memoria (lazy init).
2. Borra da `Map`.
3. Se `storage !== undefined`: `await storage.delete(key)`. Propaga
   erro.

### Estado scaffold tras 8.1

```
packages/core/src/builds/
├── base64url.ts                 (existente 8.1)
├── BuildSerializer.ts           (existente 8.1)
├── UrlSerializer.ts             (existente 8.1)
├── SnapshotManager.ts           (NOVO 8.2)
└── LoadoutManager.ts            (NOVO 8.2)

packages/core/__tests__/builds/
├── base64url.test.ts            (existente 8.1)
├── BuildSerializer.test.ts      (existente 8.1)
├── UrlSerializer.test.ts        (existente 8.1)
├── TreeEngine.shareBuild.test.ts (existente 8.1)
├── SnapshotManager.test.ts      (NOVO 8.2)
├── LoadoutManager.test.ts       (NOVO 8.2)
├── TreeEngine.snapshot.test.ts  (NOVO 8.2)
└── TreeEngine.loadout.test.ts   (NOVO 8.2)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `760c11d` (sub-fase 8.1 — BuildSerializer
  + UrlSerializer).
- 1546 core + 60 common + 193 storage + 116 react = 1915 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 39 ErrorCodes existentes (E001-E036 + F001-F002 + C001 + RO001 +
  T001-T002 + R001 + L001-L002 + **B001-B003** de 8.1 = 39 totais).
- DT abertas: 11.
- **Cadea 38 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/core` os **dous managers
internos `SnapshotManager` e `LoadoutManager`** en
`packages/core/src/builds/` (in-memory `Map<>` + opt-in persistencia
via `StorageAdapter` con prefixos `snapshots:` e `loadouts:`; lazy
init; storage write-through cache); + **8 APIs públicas async novas
en TreeEngine** (`snapshot`, `restoreSnapshot`, `listSnapshots`,
`deleteSnapshot`, `saveLoadout`, `loadLoadout`, `listLoadouts`,
`deleteLoadout`); + **tipo `Loadout` novo** en `types/build.ts`; +
**`TreeEngineOptions.storage?`** opcional; + **4 eventos novos** en
EventMap; + **3 ErrorCodes baixo prefixo existente `YGG_B*`** con
mensaxes localizadas gl/es/en; + tests específicos (~40). **Cero
modificación de pezas existentes** salvo TreeEngine cirúrxico
(+imports +2 membros privados +8 APIs); + 4 ficheiros de tipo
(MODIFICADOS para engadir Loadout, storage option, 4 eventos);
+ 2 ficheiros de common (codes + messages); + index.ts (+export
Loadout). **Restore aplica state via `replaceTreeState` +
`invalidate(ALL_CACHE_TYPES)` + emit event**. **Cero version check**
en restore (DIFERIDO). **Cero migración** (sub-fase futura).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (6)**:
- `packages/core/src/builds/SnapshotManager.ts` (~180 liñas).
- `packages/core/src/builds/LoadoutManager.ts` (~180 liñas).
- `packages/core/__tests__/builds/SnapshotManager.test.ts` (~200
  liñas; ~12 tests).
- `packages/core/__tests__/builds/LoadoutManager.test.ts` (~200
  liñas; ~12 tests).
- `packages/core/__tests__/builds/TreeEngine.snapshot.test.ts`
  (~160 liñas; ~8 tests).
- `packages/core/__tests__/builds/TreeEngine.loadout.test.ts`
  (~160 liñas; ~8 tests).
- `.changeset/loadouts-snapshots.md` (NOVO).

**MODIFICADOS (7)**:
- `packages/common/src/errors/codes.ts` (engadir 3 entradas).
- `packages/common/src/errors/messages.ts` (engadir 3 entradas
  gl/es/en).
- `packages/core/src/types/build.ts` (engadir Loadout interface).
- `packages/core/src/types/tree.ts` (engadir `storage?` a
  TreeEngineOptions).
- `packages/core/src/types/events.ts` (engadir 4 eventos novos +
  import Loadout).
- `packages/core/src/engine/TreeEngine.ts` (engadir imports + 2
  membros privados + inicialización en constructor + 8 APIs).
- `packages/core/src/index.ts` (engadir export Loadout).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de** (lista completa):
- Calquera outro ficheiro en `packages/core/src/`
  (StateStore, EventEmitter, JsonSerializer, etc.).
- Tests existentes (61 en core + 4 builds de 8.1 + outros).
- `packages/storage/`, `packages/react/`, outros 14 paquetes scaffold.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `docs/architecture/MASTER.md`.

### 5.2 — Loadout interface (FIXADO)

**Engadir** en `packages/core/src/types/build.ts` despois de
`BuildSnapshot`:

```ts
/**
 * Loadout: build cun nome obrigatorio para identificación por nome
 * (en contraste con Build que se identifica por id auto-xerado).
 *
 * Usado en `engine.saveLoadout(name)` / `engine.loadLoadout(name)`.
 * Os loadouts son named profiles para alternar entre configuracións
 * (ex. "Glass cannon" vs "Tank").
 */
export interface Loadout {
  /** Nome único do loadout (case-sensitive). Cero string vacío nin whitespace-only. */
  readonly name: string
  /** Build asociada ao loadout. */
  readonly build: Build
  /** Marca temporal UTC ms da última actualización. */
  readonly updatedAt: number
}
```

**Engadir** en `packages/core/src/types/index.ts`:
```ts
export type { Build, BuildShareLink, BuildSnapshot, Loadout } from './build.js'
```

### 5.3 — TreeEngineOptions.storage (FIXADO)

**Engadir** en `packages/core/src/types/tree.ts` ao final de
`TreeEngineOptions` (antes do `}`):

```ts
/**
 * Adapter de storage para persistencia de loadouts e snapshots
 * (sub-fase 8.2). Se non se pasa, loadouts e snapshots viven só
 * en memoria do engine (pérdense ao recargar).
 *
 * Patrón: write-through cache. Save escribe a memoria + storage;
 * load le primeiro de memoria, fallback a storage (lazy init na
 * primeira chamada).
 *
 * Storage keys usan prefixos `snapshots:` e `loadouts:` para
 * evitar colisións.
 */
readonly storage?: StorageAdapter
```

**Engadir import** ao top do ficheiro:
```ts
import type { StorageAdapter } from '@yggdrasil-forge/storage'
```

### 5.4 — EventMap 4 eventos novos (FIXADO)

**Engadir** en `packages/core/src/types/events.ts` despois de
`buildLoaded`:

```ts
/** Un snapshot foi creado (engine.snapshot()). */
readonly snapshotCreated: (snapshot: BuildSnapshot) => void

/** Un snapshot foi restaurado (engine.restoreSnapshot()). */
readonly snapshotRestored: (snapshot: BuildSnapshot) => void

/** Un loadout foi gardado (engine.saveLoadout()). */
readonly loadoutSaved: (loadout: Loadout) => void

/** Un loadout foi cargado (engine.loadLoadout()). */
readonly loadoutLoaded: (loadout: Loadout) => void
```

**Engadir imports** ao top do ficheiro:
```ts
import type { BuildSnapshot, Loadout } from './build.js'
```

**Verificar empíricamente**: `BuildSnapshot` xa pode estar importado;
engadir só `Loadout` se require.

### 5.5 — SnapshotManager.ts (FIXADO)

```ts
// packages/core/src/builds/SnapshotManager.ts
// ── INICIO: SnapshotManager ──
// Maneja snapshots in-memory dun TreeEngine local + opt-in
// persistencia via StorageAdapter.
//
// **Patrón**:
// - In-memory `Map<id, BuildSnapshot>`.
// - Opt-in storage: se se pasa, write-through cache.
// - Lazy init: primeira chamada a list/restore/delete carga desde
//   storage.
// - Storage keys: `snapshots:${id}`.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/storage'
import type { BuildSnapshot, Result, TreeState } from '../types/index.js'
import { err, ok } from '../types/index.js'

const STORAGE_PREFIX = 'snapshots:'

export class SnapshotManager {
  private readonly snapshots = new Map<string, BuildSnapshot>()
  private readonly storage: StorageAdapter | undefined
  private counter = 0
  private loaded = false

  constructor(storage?: StorageAdapter) {
    this.storage = storage
  }

  /**
   * Crea un snapshot do estado actual.
   *
   * @param state Estado a snapshotear (typicamente o do engine).
   * @param buildId Id da build asociada (typicamente do engine).
   * @param label Label opcional (ex. "Antes do experimento").
   */
  async create(
    state: TreeState,
    buildId: string,
    label?: string,
  ): Promise<BuildSnapshot> {
    await this.ensureLoaded()
    const id = `snap-${Date.now()}-${this.counter++}`
    const snapshot: BuildSnapshot = {
      id,
      buildId,
      ...(label !== undefined ? { label } : {}),
      createdAt: Date.now(),
      state,
    }
    this.snapshots.set(id, snapshot)
    if (this.storage !== undefined) {
      const result = await this.storage.set(STORAGE_PREFIX + id, snapshot)
      if (!result.ok) {
        // Rollback in-memory para coherencia:
        this.snapshots.delete(id)
        throw result.error
      }
    }
    return snapshot
  }

  /**
   * Restaura un snapshot por id. Devolve `Result<BuildSnapshot>`
   * (o caller aplica `state` ao engine).
   */
  async restore(id: string): Promise<Result<BuildSnapshot>> {
    await this.ensureLoaded()
    const snapshot = this.snapshots.get(id)
    if (snapshot === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.SNAPSHOT_NOT_FOUND,
          getErrorMessage(ErrorCode.SNAPSHOT_NOT_FOUND, 'gl', { id }),
        ),
      )
    }
    return ok(snapshot)
  }

  /** Lista todos os snapshots (orde de inserción). */
  async list(): Promise<readonly BuildSnapshot[]> {
    await this.ensureLoaded()
    return Array.from(this.snapshots.values())
  }

  /** Borra un snapshot por id. */
  async delete(id: string): Promise<Result<void>> {
    await this.ensureLoaded()
    if (!this.snapshots.has(id)) {
      return err(
        new YggdrasilError(
          ErrorCode.SNAPSHOT_NOT_FOUND,
          getErrorMessage(ErrorCode.SNAPSHOT_NOT_FOUND, 'gl', { id }),
        ),
      )
    }
    this.snapshots.delete(id)
    if (this.storage !== undefined) {
      const result = await this.storage.delete(STORAGE_PREFIX + id)
      if (!result.ok) {
        throw result.error
      }
    }
    return ok(undefined)
  }

  /**
   * Lazy init: carga snapshots desde storage na primeira chamada.
   * Idempotente (cero re-carga tras a primeira).
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.storage === undefined) {
      this.loaded = true
      return
    }
    const keysResult = await this.storage.list(STORAGE_PREFIX)
    if (!keysResult.ok) {
      throw keysResult.error
    }
    for (const key of keysResult.value) {
      const valueResult = await this.storage.get(key)
      if (!valueResult.ok) {
        throw valueResult.error
      }
      const snapshot = valueResult.value as BuildSnapshot
      this.snapshots.set(snapshot.id, snapshot)
    }
    this.loaded = true
  }
}
// ── FIN: SnapshotManager ──
```

**Decisións nesta peza**:
- **Cero export público**: peza interna usada só por TreeEngine.
- **`create` cero pode fallar funcionalmente** salvo storage error
  (que propaga via throw). Devolve `BuildSnapshot` directamente.
- **`restore` devolve `Result<BuildSnapshot>`**: o caller aplica
  state.
- **Conditional spread** para label opcional (lección 8.1 #2).
- **Throw** para errores de storage críticos (cero Result; require
  intervención do caller).
- **Rollback in-memory** se storage.set falla en create (coherencia).

### 5.6 — LoadoutManager.ts (FIXADO)

```ts
// packages/core/src/builds/LoadoutManager.ts
// ── INICIO: LoadoutManager ──
// Maneja loadouts named in-memory + opt-in persistencia.
//
// **Patrón**: análogo a SnapshotManager pero con `name` como key
// en lugar de id auto-xerado, e Loadout interface en lugar de
// BuildSnapshot.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/storage'
import type { Build, Loadout, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'

const STORAGE_PREFIX = 'loadouts:'

export class LoadoutManager {
  private readonly loadouts = new Map<string, Loadout>()
  private readonly storage: StorageAdapter | undefined
  private loaded = false

  constructor(storage?: StorageAdapter) {
    this.storage = storage
  }

  /**
   * Garda un loadout co nome especificado. Sobreescribe se xa
   * existe (actualizando `updatedAt`).
   */
  async save(name: string, build: Build): Promise<Result<Loadout>> {
    const trimmed = name.trim()
    if (trimmed === '') {
      return err(
        new YggdrasilError(
          ErrorCode.LOADOUT_NAME_INVALID,
          getErrorMessage(ErrorCode.LOADOUT_NAME_INVALID, 'gl', { name }),
        ),
      )
    }
    await this.ensureLoaded()
    const loadout: Loadout = {
      name,
      build,
      updatedAt: Date.now(),
    }
    this.loadouts.set(name, loadout)
    if (this.storage !== undefined) {
      const result = await this.storage.set(STORAGE_PREFIX + name, loadout)
      if (!result.ok) {
        this.loadouts.delete(name)
        throw result.error
      }
    }
    return ok(loadout)
  }

  /** Carga un loadout polo nome. */
  async load(name: string): Promise<Result<Loadout>> {
    await this.ensureLoaded()
    const loadout = this.loadouts.get(name)
    if (loadout === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.LOADOUT_NOT_FOUND,
          getErrorMessage(ErrorCode.LOADOUT_NOT_FOUND, 'gl', { name }),
        ),
      )
    }
    return ok(loadout)
  }

  /** Lista todos os loadouts (orde de inserción). */
  async list(): Promise<readonly Loadout[]> {
    await this.ensureLoaded()
    return Array.from(this.loadouts.values())
  }

  /** Borra un loadout polo nome. */
  async delete(name: string): Promise<Result<void>> {
    await this.ensureLoaded()
    if (!this.loadouts.has(name)) {
      return err(
        new YggdrasilError(
          ErrorCode.LOADOUT_NOT_FOUND,
          getErrorMessage(ErrorCode.LOADOUT_NOT_FOUND, 'gl', { name }),
        ),
      )
    }
    this.loadouts.delete(name)
    if (this.storage !== undefined) {
      const result = await this.storage.delete(STORAGE_PREFIX + name)
      if (!result.ok) {
        throw result.error
      }
    }
    return ok(undefined)
  }

  /** Lazy init: carga loadouts desde storage na primeira chamada. */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.storage === undefined) {
      this.loaded = true
      return
    }
    const keysResult = await this.storage.list(STORAGE_PREFIX)
    if (!keysResult.ok) {
      throw keysResult.error
    }
    for (const key of keysResult.value) {
      const valueResult = await this.storage.get(key)
      if (!valueResult.ok) {
        throw valueResult.error
      }
      const loadout = valueResult.value as Loadout
      this.loadouts.set(loadout.name, loadout)
    }
    this.loaded = true
  }
}
// ── FIN: LoadoutManager ──
```

**Decisións nesta peza**:
- **`save` valida `name.trim() === ''`**: rejecta both empty e
  whitespace-only.
- **`save` sobreescribe sen erro** se name xa existe (updatedAt
  refrescase).
- **`name` orixinal preservado** (cero trim aplicado ao name; solo
  validation).
- Resto do patrón idéntico a SnapshotManager.

### 5.7 — TreeEngine modificacións (FIXADO)

**Engadir imports** ao top de TreeEngine.ts:

```ts
import type { StorageAdapter } from '@yggdrasil-forge/storage'
import { LoadoutManager } from '../builds/LoadoutManager.js'
import { SnapshotManager } from '../builds/SnapshotManager.js'
import { ALL_CACHE_TYPES } from './StateStore.js'
```

**Engadir tipos** ao import existente de `types/index.js`:
```ts
import type {
  // ... existentes
  Loadout,            // ← engadir
  // ... resto existentes
} from '../types/index.js'
```

**Engadir membros privados** despois dos existentes:
```ts
private readonly snapshotManager: SnapshotManager
private readonly loadoutManager: LoadoutManager
```

**Inicializar no constructor** despois das inicializacións
existentes (especificamente despois de `this.progressManager = ...`):
```ts
this.snapshotManager = new SnapshotManager(options?.storage)
this.loadoutManager = new LoadoutManager(options?.storage)
```

**Engadir 8 APIs públicas** despois de `loadFromShareLink` (que é
da sub-fase 8.1):

```ts
// ── Snapshots (8.2) ──

/**
 * Crea un snapshot do estado actual do engine.
 *
 * @param label Label opcional descritivo (ex. "Antes do respec").
 * @returns BuildSnapshot creado con id auto-xerado.
 *
 * @example
 * const snap = await engine.snapshot('Antes do experimento')
 * // ... cambios no engine ...
 * await engine.restoreSnapshot(snap.id)
 */
async snapshot(label?: string): Promise<BuildSnapshot> {
  const state = this.store.getState()
  const buildId = `build-${Date.now()}`
  const snap = await this.snapshotManager.create(state, buildId, label)
  this.events.emit('snapshotCreated', snap)
  return snap
}

/**
 * Restaura o estado do engine desde un snapshot.
 *
 * Aplica `snap.state` ao engine via `replaceTreeState` +
 * `invalidate(ALL_CACHE_TYPES)`. Emite `snapshotRestored` event.
 *
 * **Cero validación de versión**: aplica state independentemente
 * de treeId/treeVersion (sub-fase futura con migración).
 */
async restoreSnapshot(id: string): Promise<Result<void>> {
  const result = await this.snapshotManager.restore(id)
  if (!result.ok) return result
  const snap = result.value
  this.store.replaceTreeState(snap.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('snapshotRestored', snap)
  return ok(undefined)
}

/** Lista todos os snapshots creados. */
async listSnapshots(): Promise<readonly BuildSnapshot[]> {
  return this.snapshotManager.list()
}

/** Borra un snapshot por id. */
async deleteSnapshot(id: string): Promise<Result<void>> {
  return this.snapshotManager.delete(id)
}

// ── Loadouts (8.2) ──

/**
 * Garda o estado actual como loadout named.
 *
 * Sobreescribe se `name` xa existe (refrescando updatedAt).
 *
 * @example
 * await engine.saveLoadout('Glass cannon')
 * await engine.saveLoadout('Tank')
 * await engine.loadLoadout('Tank')
 */
async saveLoadout(name: string): Promise<Result<Loadout>> {
  const state = this.store.getState()
  const treeDef = this.store.getTreeDef()
  const build: Build = {
    id: `build-${Date.now()}`,
    treeId: treeDef.id,
    treeVersion: treeDef.version,
    schemaVersion: treeDef.schemaVersion,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state,
  }
  const result = await this.loadoutManager.save(name, build)
  if (!result.ok) return result
  this.events.emit('loadoutSaved', result.value)
  return result
}

/**
 * Carga un loadout polo nome e aplícao ao engine.
 *
 * Aplica `loadout.build.state` ao engine via `replaceTreeState`
 * + `invalidate(ALL_CACHE_TYPES)`. Emite `loadoutLoaded` event.
 */
async loadLoadout(name: string): Promise<Result<Loadout>> {
  const result = await this.loadoutManager.load(name)
  if (!result.ok) return result
  const loadout = result.value
  this.store.replaceTreeState(loadout.build.state)
  this.store.invalidate(ALL_CACHE_TYPES)
  this.events.emit('loadoutLoaded', loadout)
  return ok(loadout)
}

/** Lista todos os loadouts gardados. */
async listLoadouts(): Promise<readonly Loadout[]> {
  return this.loadoutManager.list()
}

/** Borra un loadout polo nome. */
async deleteLoadout(name: string): Promise<Result<void>> {
  return this.loadoutManager.delete(name)
}
```

**Decisións nesta peza**:
- **Cero modificación** de calquera outro método existente do
  TreeEngine.
- **`this.events.emit(...)`**: usa o EventEmitter existente (cero
  modificación de EventEmitter).
- **`this.store.getState()` + `this.store.getTreeDef()`**: lección
  8.1 L2 aplicada (cero `this.treeDef` direct access).
- **`build-${Date.now()}` non-determinismo**: aceptable (lección
  capturada en 8.1; runtime values esperables).
- **`saveLoadout` constrúe Build inline** (similar a `shareBuild`
  de 8.1).

### 5.8 — Modificacións en common/errors/codes.ts (FIXADO)

**Engadir** despois das entradas existentes do bloque `// Builds`
(B001-B003 de 8.1):

```ts
  SNAPSHOT_NOT_FOUND = 'YGG_B004',
  LOADOUT_NOT_FOUND = 'YGG_B005',
  LOADOUT_NAME_INVALID = 'YGG_B006',
```

### 5.9 — Modificacións en common/errors/messages.ts (FIXADO)

**Engadir** despois das entradas existentes (B001-B003 de 8.1):

```ts
  [ErrorCode.SNAPSHOT_NOT_FOUND]: {
    gl: 'Snapshot non atopado: {id}',
    es: 'Snapshot no encontrado: {id}',
    en: 'Snapshot not found: {id}',
  },
  [ErrorCode.LOADOUT_NOT_FOUND]: {
    gl: 'Loadout non atopado: {name}',
    es: 'Loadout no encontrado: {name}',
    en: 'Loadout not found: {name}',
  },
  [ErrorCode.LOADOUT_NAME_INVALID]: {
    gl: 'Nome de loadout inválido (cero vacío nin só espazos): "{name}"',
    es: 'Nombre de loadout inválido (no puede ser vacío ni solo espacios): "{name}"',
    en: 'Invalid loadout name (cannot be empty or whitespace-only): "{name}"',
  },
```

### 5.10 — Export en core/src/index.ts (FIXADO)

**Engadir** xunto cos exports de Build (verificar empíricamente
onde están):

```ts
// types/build.ts xa re-exporta Loadout via types/index.ts ✓
// (cero engadir aquí; o re-export é transitivo)
```

**Verificar empíricamente** se `Loadout` xa se re-exporta vía
`export type * from './types/index.js'` ou similar. Se cero,
engadir explicitamente.

**Cero re-export de SnapshotManager nin LoadoutManager** (internos).

### 5.11 — Tests prescritos (~40 totais)

**`__tests__/builds/SnapshotManager.test.ts`** (~12 tests):

1. Constructor sen storage: cero error.
2. `create()` engade snapshot á Map.
3. `create()` con label opcional preserva label.
4. `create()` sen label: snapshot.label === undefined.
5. `create()` xera id único (`snap-...`).
6. `list()` devolve snapshots en orde de inserción.
7. `restore()` devolve `ok(snapshot)` para id existente.
8. `restore()` devolve `err(SNAPSHOT_NOT_FOUND)` para id inexistente.
9. `delete()` removes do Map.
10. `delete()` devolve `err(SNAPSHOT_NOT_FOUND)` para id inexistente.
11. Con storage: `create()` persiste; novo manager con mesmo storage
    carga via `list()` (lazy init).
12. Con storage: `delete()` borra de storage tamén.

**`__tests__/builds/LoadoutManager.test.ts`** (~12 tests):

13. Constructor sen storage: cero error.
14. `save()` engade loadout; updatedAt timestamp.
15. `save()` sobreescribe loadout existente refrescando updatedAt.
16. `save()` con name vacío devolve `err(LOADOUT_NAME_INVALID)`.
17. `save()` con name whitespace-only devolve `err(LOADOUT_NAME_INVALID)`.
18. `save()` con nome con espazos no medio é válido.
19. `load()` devolve `ok(loadout)` para name existente.
20. `load()` devolve `err(LOADOUT_NOT_FOUND)` para name inexistente.
21. `load()` case-sensitive: 'Tank' ≠ 'tank'.
22. `list()` devolve loadouts en orde de inserción.
23. `delete()` borra; subsequente load devolve err.
24. Con storage: lazy init carga loadouts via list().

**`__tests__/builds/TreeEngine.snapshot.test.ts`** (~8 tests):

25. `engine.snapshot()` devolve BuildSnapshot con id auto-xerado.
26. `engine.snapshot('label')` preserva label.
27. `engine.snapshot()` emite `snapshotCreated` event.
28. `engine.restoreSnapshot(invalidId)` devolve
    `err(SNAPSHOT_NOT_FOUND)`.
29. `engine.restoreSnapshot(validId)` aplica state + emite
    `snapshotRestored` event.
30. Roundtrip end-to-end: snapshot → mudar state → restoreSnapshot
    → state recuperado.
31. `engine.listSnapshots()` despois de 3 chamadas a snapshot()
    devolve 3 entries.
32. `engine.deleteSnapshot()` válido reduce contenido de
    `listSnapshots()`.

**`__tests__/builds/TreeEngine.loadout.test.ts`** (~8 tests):

33. `engine.saveLoadout('Tank')` devolve `ok(loadout)`.
34. `engine.saveLoadout('Tank')` emite `loadoutSaved`.
35. `engine.saveLoadout('')` devolve `err(LOADOUT_NAME_INVALID)`.
36. `engine.loadLoadout('inexistente')` devolve `err(LOADOUT_NOT_FOUND)`.
37. `engine.loadLoadout('Tank')` aplica state + emite `loadoutLoaded`.
38. Roundtrip end-to-end: saveLoadout → mudar state → loadLoadout
    → state recuperado.
39. `engine.listLoadouts()` despois de saveLoadout 3 veces devolve
    3 entries (ou 1 se mesmos nomes).
40. Con storage opt-in: novo engine carga loadouts persistidos.

**Total: ~40 tests novos**. Post-8.2 esperado: 1546 → **~1586 core
tests**.

**Decisión sobre fixture engine para tests**:
- Usar `MemoryStorage` de `@yggdrasil-forge/storage` para os tests
  de opt-in storage (cero require IndexedDB nin LocalStorage en
  Node test env).
- TreeDef mínimo coherente con tests previos de 8.1.

### 5.12 — Cobertura prescrita

- **SnapshotManager.ts**: **100/100/100/100**.
- **LoadoutManager.ts**: **100/100/100/100**.
- **TreeEngine.ts**: manter baseline; cobertura das 8 APIs novas
  +inicialización dos 2 membros = 100% nas liñas novas.
- **types/build.ts**, **types/tree.ts**, **types/events.ts**: cero
  impacto (tipos puros; cero código executable).
- **packages/common**: cobertura mantida.
- **Cero regresión** noutras pezas.

### 5.13 — Cero deps novas

Verificable empíricamente: cero modificación de `package.json` deps
nin lockfile. `@yggdrasil-forge/storage` xa é dep de core
(verificado).

### 5.14 — Test counts esperados post-8.2

- **core**: 1546 + ~40 = **~1586 tests**.
- **common, storage, react**: intactos.

### 5.15 — Sobre version check de restore (DIFERIDO)

`restoreSnapshot` e `loadLoadout` **NON validan** que `snap.treeId`
ou `snap.treeVersion` coincidan co engine actual. **Aplica state
directamente**.

**Razón**: builds dunha versión anterior do tree deberían poderse
recuperar. Migración é responsabilidade de sub-fase futura
coordinada con MigrationRunner (3.5).

**Posibles consecuencias non desexadas**:
- Se state ten node ids que xa non existen no tree actual, o engine
  pode comportarse mal (e.g., `getNodeState(staleId)` devolve null).
- **Aceptable**: cero crash garantido (engine tolera unknown ids).
  Consumidor deberá validar coherencia se necesario.

**DIFERIDO**: sub-fase posterior pode engadir `restoreSnapshot(id,
{ strict?: true })` opcional que rexeite mismatches.

### 5.16 — Sobre límite máximo de snapshots/loadouts en memoria

**Decisión do Director**: cero límite. **DIFERIDO** auto-cleanup a
sub-fase futura. Razóns:
- Snapshots/loadouts son user-driven (cero crece sen control).
- Storage adapters teñen os seus propios quotas (storage handler
  retorna `STORAGE_QUOTA_EXCEEDED` se aplica).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| Loadout interface | TS interface | types/build.ts | +12 |
| TreeEngineOptions.storage | TS option | types/tree.ts | +15 |
| 4 eventos EventMap | TS readonly | types/events.ts | +14 |
| 3 ErrorCodes | enum entries | codes.ts | +5 |
| 3 mensaxes gl/es/en | object entries | messages.ts | +18 |
| SnapshotManager | class + 5 métodos | SnapshotManager.ts | ~180 |
| LoadoutManager | class + 5 métodos | LoadoutManager.ts | ~180 |
| TreeEngine 8 APIs | métodos públicos | TreeEngine.ts | +120 |
| Re-export Loadout | re-export | types/index.ts | +1 |
| 4 ficheiros tests | describe blocks | 4 .test.ts | ~720 |

**Total estimado**: ~545 liñas de código + ~720 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (7)**:
- `packages/core/src/builds/SnapshotManager.ts`
- `packages/core/src/builds/LoadoutManager.ts`
- `packages/core/__tests__/builds/SnapshotManager.test.ts`
- `packages/core/__tests__/builds/LoadoutManager.test.ts`
- `packages/core/__tests__/builds/TreeEngine.snapshot.test.ts`
- `packages/core/__tests__/builds/TreeEngine.loadout.test.ts`
- `.changeset/loadouts-snapshots.md`

**MODIFICADOS (8)**:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/types/build.ts`
- `packages/core/src/types/tree.ts`
- `packages/core/src/types/events.ts`
- `packages/core/src/types/index.ts` (re-export Loadout)
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 15 ficheiros tocados** (7 NOVOS + 8 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`.
- Tests existentes (61 ficheiros en core + 4 builds/ de 8.1).
- `packages/storage/`, `packages/react/`, outros paquetes.
- `package.json`, `tsconfig.json`, `tsup.config.ts`, etc.
- `docs/architecture/MASTER.md`.
- `packages/core/src/index.ts` (Loadout vai vía re-export de
  types/index.js; **verificar empíricamente** que iso é correcto;
  se non, engadir explicitamente).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`, cero `as` salvo `as BuildSnapshot`/`as Loadout`
tras `storage.get()` (cast autorizado tras `Result.ok` gate; valor
deserializado polo adapter).

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en cada método público de TreeEngine (8 APIs
novas).

**JSDoc en SnapshotManager + LoadoutManager**: básico (clase
interna; cero require detail user-facing).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Async/await**: tódalas APIs novas son async. Cero callbacks nin
Promises crudos.

**Patrón Result**: tódalas funcións que poden fallar funcionalmente
devolven `Result<T>`. Storage errors críticos throw (cero Result).

**Conditional spread**: lección 8.1: `{ ...(x !== undefined ?
{ key: x } : {}) }` cando `exactOptionalPropertyTypes`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/`, `packages/react/`, outros
  paquetes scaffold.
- ❌ Modificar **calquera outro ficheiro** en `packages/core/src/`
  fora dos 7 prescritos en §5.1.
- ❌ Modificar `StateStore.ts` (cero require; só uso da API existente).
- ❌ Modificar `EventEmitter.ts` (cero require; só uso de `emit()`).
- ❌ Modificar `JsonSerializer.ts` (cero require; non se solapa).
- ❌ Modificar `TreeRegistry.ts` (cero require; cero overlap funcional).
- ❌ Modificar **calquera test existente** (61 ficheiros en core,
  7 en common, 8 en storage, 17 en react, 4 builds/ de 8.1).
- ❌ Engadir version check en restoreSnapshot/loadLoadout
  (DIFERIDO a sub-fase futura).
- ❌ Engadir migración de state (DIFERIDO; coordina con
  MigrationRunner 3.5).
- ❌ Engadir límite máximo de snapshots/loadouts (DIFERIDO).
- ❌ Engadir auto-cleanup (DIFERIDO).
- ❌ Engadir deps de npm (cero deps engadidas).
- ❌ Engadir Zod schemas (validación inline é suficiente).
- ❌ Engadir auto-load no constructor (decisión lazy init).
- ❌ Engadir RespecManager — sub-fase 8.3.
- ❌ Engadir PluginManager — sub-fase 8.4.
- ❌ Engadir search ou validators — sub-fases 8.6/8.7.
- ❌ Modificar TreeEngine doutras formas (cero modificación de
  existing methods; só engadir 2 membros + 8 APIs).
- ❌ Exportar SnapshotManager ou LoadoutManager (internos).
- ❌ Usar `!` non-null assertions.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T10)

### T0 — Verificación previa + lección 8.1 L2 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `760c11d` como HEAD.

**T0.2** — Verificacións empíricas críticas (lección 8.1 L2 — verificar
acceso a internals):

```bash
# Confirmar storage adapter usable:
grep -E "@yggdrasil-forge/storage" packages/core/package.json
# esperado: 1 match en dependencies

# Confirmar replaceTreeState + invalidate existentes:
grep -E "replaceTreeState|invalidate.*types|ALL_CACHE_TYPES" \
  packages/core/src/engine/StateStore.ts | head -5
# esperado: 3+ matches

# Confirmar acceso a tree def vía store:
grep -E "this\.store\." packages/core/src/engine/TreeEngine.ts | head -10
# esperado: múltiples usos confirmando patrón

# Confirmar Build types re-exportados:
grep -E "Build|Loadout" packages/core/src/types/index.ts | head -5
# esperado: Build exportado; Loadout aínda non (engadir en 8.2)

# Confirmar ALL_CACHE_TYPES exportado:
grep -E "export const ALL_CACHE_TYPES" packages/core/src/engine/StateStore.ts
# esperado: 1 match
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1546 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir ErrorCodes + mensaxes a common

Aplicar §5.8 e §5.9 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/common test --force      # 60 tests pasando
```

### T2 — Engadir Loadout type + TreeEngineOptions.storage + EventMap

Aplicar §5.2, §5.3, §5.4 literal.

**Verificación intermedia** (cero código novo aínda):
```bash
pnpm turbo run typecheck --force                          # 22/22 esperado
```

Tódolos 1546 tests pasan **intactos**. Se algún falla → **ESCALAR**
(cambio de tipo afectou outra peza inesperadamente).

### T3 — Crear SnapshotManager.ts

Aplicar §5.5 literal.

### T4 — Crear LoadoutManager.ts

Aplicar §5.6 literal.

### T5 — Modificar TreeEngine (imports + membros + 8 APIs)

Aplicar §5.7 literal:
- Engadir imports.
- Engadir 2 membros privados.
- Inicializar no constructor.
- Engadir 8 APIs públicas.

### T6 — Verificación intermedia core (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1546 tests
```

**Tódolos 1546 tests previos deben pasar intactos** (cero modificación
de pezas existentes; só engadir 2 membros + 8 APIs). Se algún falla
→ **ESCALAR**.

### T7 — Crear 4 ficheiros de tests novos

Aplicar §5.11 literal:
- `SnapshotManager.test.ts` (~12 tests).
- `LoadoutManager.test.ts` (~12 tests).
- `TreeEngine.snapshot.test.ts` (~8 tests).
- `TreeEngine.loadout.test.ts` (~8 tests).

**Decisión empírica permitida**: se algún test require fixture extra
non descrito explicitamente (e.g., MemoryStorage import path),
**aplica decisión razoable in-situ** e **anótao no reporte como
"corrección in-situ"**.

### T8 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1586 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "Manager|^All files"
# Cobertura targets:
#   SnapshotManager.ts: 100/100/100/100
#   LoadoutManager.ts: 100/100/100/100
#   TreeEngine.ts: baseline mantida ou superada
#   Resto: sen regresión
```

### T9 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/builds/SnapshotManager.ts \
  packages/core/src/builds/LoadoutManager.ts \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/__tests__/builds/SnapshotManager.test.ts \
  packages/core/__tests__/builds/LoadoutManager.test.ts \
  packages/core/__tests__/builds/TreeEngine.snapshot.test.ts \
  packages/core/__tests__/builds/TreeEngine.loadout.test.ts
```

### T10 — Changeset + CHANGELOG + commit + push

`.changeset/loadouts-snapshots.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): add Loadouts + Snapshots managers with opt-in storage (sub-phase 8.2)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido
detallado (incluír todos os 8 APIs + 4 eventos + 3 ErrorCodes +
Loadout type + storage option + Opción C+ explicación + lazy init
+ DIFERIDOS).

Commit Conventional:
`feat(core): add Loadouts + Snapshots managers with opt-in storage (sub-phase 8.2)`

Push directo a `origin/main` (base `760c11d`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 760c11d)
✅ Tipo Loadout novo en types/build.ts: { name, build, updatedAt }
✅ TreeEngineOptions.storage? novo (StorageAdapter opcional)
✅ 4 eventos novos en EventMap: snapshotCreated/Restored,
   loadoutSaved/Loaded
✅ 3 ErrorCodes novos baixo prefixo YGG_B*:
   - YGG_B004 SNAPSHOT_NOT_FOUND
   - YGG_B005 LOADOUT_NOT_FOUND
   - YGG_B006 LOADOUT_NAME_INVALID
✅ Mensaxes localizadas gl/es/en para os 3 ErrorCodes
✅ SnapshotManager interno (in-memory + opt-in storage; lazy init;
   write-through cache; prefixo "snapshots:")
✅ LoadoutManager interno (mesmo patrón; prefixo "loadouts:";
   save sobreescribe; case-sensitive lookup)
✅ TreeEngine 8 APIs novas:
   - snapshot(label?), restoreSnapshot(id), listSnapshots(),
     deleteSnapshot(id)
   - saveLoadout(name), loadLoadout(name), listLoadouts(),
     deleteLoadout(name)
✅ Restore semantics: replaceTreeState + invalidate(ALL_CACHE_TYPES)
   + emit event
✅ Cero validación de versión en restore (Opción A; DIFERIDO)
✅ Lazy init confirmado (Opción A)
✅ Opción C+ implementada (in-memory por defecto + opt-in storage)
✅ T0.2 verificación empírica: @yggdrasil-forge/storage xa dep,
   replaceTreeState + invalidate + ALL_CACHE_TYPES dispoñibles,
   Build types re-exportados, Loadout aínda non (correcto)
✅ T2 verificación typecheck post-tipos: 22/22, 1546 tests intactos
✅ T6 verificación intermedia core: 1546 tests previos pasan
✅ CERO modificación de pezas existentes en packages/core/src/
   salvo TreeEngine.ts (+imports +2 membros +8 APIs) e 4 ficheiros
   de tipos
✅ CERO modificación de tests existentes (1546 core + 60 common +
   193 storage + 116 react = 1915 intactos)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ Tests: 1546 + 40 = ~1586 core tests
   - 12 SnapshotManager (CRUD + lazy storage + restore)
   - 12 LoadoutManager (CRUD + lazy + save replaces + case-sensitive)
   - 8 TreeEngine.snapshot (basic, label, events, roundtrip, list,
     delete)
   - 8 TreeEngine.loadout (basic, events, validation, roundtrip,
     storage opt-in)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - SnapshotManager.ts: 100/100/100/100
   - LoadoutManager.ts: 100/100/100/100
   - TreeEngine.ts: baseline mantida
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.2 SEGUNDA da Fase 8.
   - 6 sub-fases pendentes (8.3-8.8).
   - 39 sub-fases consecutivas sen rollback.
   - Version check en restore DIFERIDO a sub-fase futura.
   - Migración de state DIFERIDA.
   - restoreSnapshot/loadLoadout APLICAN state (vs loadFromShareLink
     de 8.1 que NON aplica).
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 15 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.3 (RespecManager).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.2. **SEGUNDA sub-fase da Fase 8**. Engade
infraestrutura completa de Loadouts + Snapshots con 2 managers
internos, 8 APIs novas en TreeEngine, 1 tipo Loadout novo, 4 eventos
novos, 3 ErrorCodes baixo prefixo YGG_B* (capacidade extendida),
TreeEngineOptions.storage opcional, e **Opción C+ confirmada**
(in-memory + opt-in storage). Risco ALTO-MEDIO: 15 ficheiros tocados,
8 APIs novas, primeira integration TreeEngine ↔ Storage. Mitigación
con T0.2 (lección 8.1 L2 aplicada), T2 (typecheck tras tipos), T6
(tests pasan tras integration). Cero modificación de pezas existentes
salvo TreeEngine cirúrxico + 6 ficheiros de tipos/common. Establece
patrón "Manager" para sub-fases futuras (8.3 RespecManager, 8.4
PluginManager + HookRunner). Calquera dúbida → ESCALAR.*

*Leccións 8.1 aplicadas: L1 (cero conflito de nomes Loadout no
barrel), L2 (T0.2 verifica acceso a internals do TreeEngine via
this.store.*), L3 (código prescrito é fonte de verdade; prosa
coherente).*
