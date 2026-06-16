# BRIEFING — SUB-FASE 6.1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Primeira sub-fase da Fase 6 (TreeRegistry + Multi-tenancy).** Crear
> `TreeRegistry` clase para xestionar múltiples TreeEngines de
> usuarios distintos compartindo o mesmo TreeDef, con 3 estratexias
> de cache (all-in-memory, lru, on-demand), build management completo
> (múltiples builds por usuario), e persistencia integrada via
> StorageAdapter. **Aggregate queries (6.2) e ScopedStorage / Quotas
> / Permissions (6.3+) diferidos a sub-fases seguintes**.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5
L2, 3.6.a L1, 4.3 L1, 5.2 L1+L2**: calquera modificación fóra de §6
require **ESCALAR ANTES DE APLICAR**. **Briefings con APIs
prescritas en código exemplo deben verificarse empíricamente** (5.2
L2): se algún método/campo prescrito non existe na sinatura real,
**cazar e corrixir transparentemente**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 6.1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 6.1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **6.1** de Yggdrasil Forge. **Primeira da Fase 6**
(TreeRegistry + Multi-tenancy).

**Pezas**:

1. **`TreeRegistry` clase** con:
   - Lifecycle methods: `createEngine`, `getEngine`, `removeEngine`,
     `listEngines`.
   - Shared tree: `getSharedTreeDef`, `applyChangesToAll`.
   - Build management completo: `saveBuild`, `loadBuild`,
     `listBuilds`, `removeBuild`, `exportAllBuilds`, `importBuilds`.
   - Persistence: `save`, `load`.
   - Cleanup: `destroy`.
2. **3 cache strategies**: `'all-in-memory'`, `'lru'`, `'on-demand'`.
3. **`TreeRegistryOptions` + `TreeRegistryCacheConfig` interfaces**.
4. **3 ErrorCodes novos**: `TREE_REGISTRY_USER_NOT_FOUND` (YGG_E029),
   `TREE_REGISTRY_USER_EXISTS` (YGG_E030),
   `TREE_REGISTRY_BUILD_NOT_FOUND` (YGG_E031).

**Cero modificación de pezas non listadas**: TreeEngine, SubtreeManager,
Federator, layouts, etc.

**`Aggregate queries` (6.2), `ScopedStorage` (6.3), `Quotas` (6.4) +
`Permissions` (6.4) DIFERIDAS** a sub-fases seguintes.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Spec MASTER §11 + §49**:
```typescript
class TreeRegistry {
  constructor(treeDef: TreeDef, options: {
    storage: StorageAdapter
    cache: {
      strategy: 'all-in-memory' | 'lru' | 'on-demand'
      maxInMemory?: number
      ttlMs?: number
    }
  })

  async getEngine(userId: string): Promise<TreeEngine>
  async createEngine(userId: string, build?: Build): Promise<TreeEngine>
  async removeEngine(userId: string): Promise<void>
  listEngines(): Promise<string[]>

  getSharedTreeDef(): TreeDef
  applyChangesToAll(changes: TreeChange[]): Promise<Result<void>>

  // Fase 6.2 (DIFERIDAS):
  async getAggregateStats(): Promise<AggregateStats>
  async getNodePopularity(): Promise<Map<string, number>>
  async getProgressDistribution(nodeId: string): Promise<number[]>
  async getStuckUsers(threshold?: number): Promise<string[]>

  async exportAllBuilds(): Promise<Build[]>
  async importBuilds(builds: Build[]): Promise<Result<void>>

  async save(): Promise<Result<void>>
  async load(): Promise<Result<void>>

  destroy(): void
}
```

**Auditoría do director (sobre commit `b8b6d89`)**:

- `Build` xa modelado en `types/build.ts` con: `id, treeId, treeVersion,
  schemaVersion, label?, author?, createdAt, updatedAt, state,
  parentBuildId?, tags?`.
- `StorageAdapter` xa definido con 6 métodos: `get, set, delete, list,
  clear, watch?`.
- `TreeChange` xa modelado.
- `TreeEngine.applyChanges(changes): Promise<Result<ApplyChangesResult>>`
  xa existe.
- `TreeEngineOptions.initialState?: TreeState` engadido en 5.2.
- **TreeRegistry, ScopedStorage, Quota types non existen aínda**.
- Engine.serialize / deserialize xa existen (JsonSerializer).

**Caso de uso**: SaaS educativo multi-tenant. Un só `TreeDef` (cursos
de matemáticas) é compartido entre N estudantes. Cada estudante ten
o seu engine cos seus unlocks/progress. TreeRegistry permite ao
profesor:
- Crear engine cando un estudante se rexistra.
- Recuperar engine cando un estudante volve.
- Aplicar cambios ao TreeDef (engadir lección nova) e propagar a todos.
- Snapshot dos progresos como Builds (múltiples por estudante:
  "antes do exame", "tras revisión", etc.).
- Importar/exportar builds entre instancias.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `b8b6d89` (hixiene MASTER post-Fase 5).
- 1381 tests core + 60 common + 171 storage = ~1612 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- 49 ErrorCodes existentes.
- DT abertas non bloqueantes: DT-9, DT-11, DT-12, DT-14, DT-15, DT-16,
  DT-17, DT-18, DT-19, DT-20.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/TreeRegistry.ts` cunha clase
`TreeRegistry` que xestiona múltiples TreeEngines compartindo un só
TreeDef, soportando 3 estratexias de cache (all-in-memory, lru,
on-demand) con `maxInMemory` e `ttlMs` opcionais para lru, build
management completo (múltiples builds por usuario via saveBuild,
loadBuild, listBuilds, removeBuild, exportAllBuilds, importBuilds),
persistence via StorageAdapter (save + load co schema de claves
prescritas), applyChangesToAll para propagar TreeChange aos engines
en cache, engadir 3 ErrorCodes novos (`TREE_REGISTRY_USER_NOT_FOUND`
+ `TREE_REGISTRY_USER_EXISTS` + `TREE_REGISTRY_BUILD_NOT_FOUND`)
con mensaxes nas 3 locales, exportar publicamente desde core, e
cubrir con tests funcionais exhaustivos. **Aggregate queries (6.2),
ScopedStorage (6.3), Quotas + Permissions (6.4) DIFERIDAS**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estructura de ficheiros

**Un só ficheiro**: `packages/core/src/engine/TreeRegistry.ts`.

**Cero ficheiro auxiliar**: LRU cache implementación inline (~30
liñas; cero `lru-cache` npm).

### 5.2 — Schema de claves no storage

```
registry:userIds              → string[] (lista de userIds rexistrados)
registry:buildsIndex          → { [userId]: string[] } (índice buildIds por usuario)
engine:${userId}:state        → TreeState (estado vivo do engine)
build:${buildId}              → Build (un build serializado)
registry:meta                 → { schemaVersion, createdAt, updatedAt } (opcional)
```

**Decisión clave**:
- Prefixos consistentes `registry:`, `engine:`, `build:` para
  facilitar `list(prefix)` na 6.3 (ScopedStorage).
- `buildsIndex` permite listar builds dun usuario sen carga total.
- `registry:meta` é opcional (cero se non foi gardado nunca).

### 5.3 — TreeRegistryOptions

```ts
export interface TreeRegistryOptions {
  /** Storage adapter para persistir engines e builds. */
  readonly storage: StorageAdapter

  /** Configuración do cache de engines en memoria. */
  readonly cache: TreeRegistryCacheConfig

  /** Locale para mensaxes de erro. Default 'gl'. */
  readonly locale?: Locale
}

export interface TreeRegistryCacheConfig {
  /**
   * Estratexia de cache:
   * - 'all-in-memory': todos os engines viven en memoria. save()
   *   persiste todos. load() carga todos.
   * - 'lru': cache LRU con maxInMemory. Cando se excede, evita o
   *   menos recentemente usado. load() carga só userIds; engines
   *   cargan lazy en getEngine.
   * - 'on-demand': cero cache. getEngine carga sempre desde storage.
   *   createEngine garda inmediatamente.
   */
  readonly strategy: 'all-in-memory' | 'lru' | 'on-demand'

  /**
   * Máximo de engines en memoria para 'lru'. Default 100.
   * Ignorado para 'all-in-memory' e 'on-demand'.
   */
  readonly maxInMemory?: number

  /**
   * TTL (Time To Live) en milisegundos para entries do LRU.
   * Cando se excede, a entry é evictada incluso se non estourou
   * o maxInMemory. Default null (sin TTL).
   * Ignorado para 'all-in-memory' e 'on-demand'.
   */
  readonly ttlMs?: number
}
```

### 5.4 — TreeRegistry — esqueleto da clase

```ts
import { deepClone } from '@yggdrasil-forge/common'  // verificar T0
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/storage'  // verificar T0
import type { Build, TreeChange, TreeDef, TreeState } from '../types/index.js'
import { TreeEngine } from './TreeEngine.js'

const DEFAULT_LOCALE: Locale = 'gl'
const DEFAULT_MAX_IN_MEMORY = 100

interface CacheEntry {
  readonly engine: TreeEngine
  lastAccessAt: number  // mutable para LRU bump
}

export class TreeRegistry {
  private readonly treeDef: TreeDef
  private readonly storage: StorageAdapter
  private readonly cacheConfig: TreeRegistryCacheConfig
  private readonly locale: Locale

  /** Cache en memoria. Usado segundo cache.strategy. */
  private readonly cache = new Map<string, CacheEntry>()

  /** Lista en memoria de userIds rexistrados. Persiste en registry:userIds. */
  private userIds = new Set<string>()

  /** Índice de builds por usuario. Persiste en registry:buildsIndex. */
  private buildsIndex = new Map<string, Set<string>>()

  /** Indica se load() foi chamado xa. */
  private loaded = false

  constructor(treeDef: TreeDef, options: TreeRegistryOptions) {
    this.treeDef = treeDef
    this.storage = options.storage
    this.cacheConfig = options.cache
    this.locale = options.locale ?? DEFAULT_LOCALE
  }

  // ── Lifecycle ──
  // ... ver §5.5
}
```

### 5.5 — Lifecycle methods

**createEngine(userId, build?)**:

```ts
async createEngine(userId: string, build?: Build): Promise<Result<TreeEngine>> {
  // 1. Verificar que userId NON existe xa
  if (this.userIds.has(userId)) {
    return err(
      new YggdrasilError(
        ErrorCode.TREE_REGISTRY_USER_EXISTS,
        getErrorMessage(ErrorCode.TREE_REGISTRY_USER_EXISTS, this.locale, {
          userId,
        }),
        { context: { userId } },
      ),
    )
  }

  // 2. Crear TreeEngine con initialState opcional desde build
  const engine = new TreeEngine(this.treeDef, {
    locale: this.locale,
    ...(build !== undefined && { initialState: build.state }),
  })

  // 3. Cache segundo strategy
  this.userIds.add(userId)
  this.putInCache(userId, engine)

  // 4. Para 'on-demand', persistir inmediatamente
  if (this.cacheConfig.strategy === 'on-demand') {
    const persistResult = await this.persistEngine(userId, engine)
    if (!persistResult.ok) return persistResult
  }

  return ok(engine)
}
```

**getEngine(userId)**:

```ts
async getEngine(userId: string): Promise<Result<TreeEngine>> {
  // 1. Verificar que userId existe
  if (!this.userIds.has(userId)) {
    return err(
      new YggdrasilError(
        ErrorCode.TREE_REGISTRY_USER_NOT_FOUND,
        getErrorMessage(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND, this.locale, {
          userId,
        }),
        { context: { userId } },
      ),
    )
  }

  // 2. Cache lookup
  const cached = this.cache.get(userId)
  if (cached !== undefined) {
    // Verificar TTL se aplicable
    if (this.cacheConfig.strategy === 'lru' && this.isExpired(cached)) {
      this.cache.delete(userId)
      // Continuar a load from storage
    } else {
      cached.lastAccessAt = Date.now()  // LRU bump
      return ok(cached.engine)
    }
  }

  // 3. Cache miss segundo strategy
  if (this.cacheConfig.strategy === 'all-in-memory') {
    // Cero load lazy para 'all-in-memory'; engine debería estar no cache
    // Caso edge: userId está en userIds pero cero hai engine en cache
    // (load() non foi chamado tras un removeEngine + crash).
    // Tratar como NOT_FOUND.
    return err(
      new YggdrasilError(
        ErrorCode.TREE_REGISTRY_USER_NOT_FOUND,
        getErrorMessage(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND, this.locale, {
          userId,
        }),
        { context: { userId } },
      ),
    )
  }

  // 4. Para 'lru' ou 'on-demand', cargar desde storage
  const loadResult = await this.loadEngineFromStorage(userId)
  if (!loadResult.ok) return loadResult

  const engine = loadResult.value
  this.putInCache(userId, engine)

  return ok(engine)
}
```

**removeEngine(userId)**:

```ts
async removeEngine(userId: string): Promise<Result<void>> {
  if (!this.userIds.has(userId)) {
    return ok(undefined)  // idempotent: cero erro se cero existe
  }

  this.userIds.delete(userId)
  this.cache.delete(userId)

  // Eliminar do storage
  await this.storage.delete(`engine:${userId}:state`)

  // Eliminar todos os builds do usuario
  const buildIds = this.buildsIndex.get(userId)
  if (buildIds !== undefined) {
    for (const buildId of buildIds) {
      await this.storage.delete(`build:${buildId}`)
    }
    this.buildsIndex.delete(userId)
  }

  return ok(undefined)
}
```

**listEngines()**:

```ts
async listEngines(): Promise<string[]> {
  return Array.from(this.userIds)
}
```

### 5.6 — getSharedTreeDef + applyChangesToAll

```ts
getSharedTreeDef(): TreeDef {
  return this.treeDef
}

/**
 * Aplica changes a TODOS os engines actualmente en cache.
 *
 * Decisión consciente: cero modifica engines en storage non
 * cargados. **Consumidor responsable** de cargar engines previo
 * a applyChangesToAll se quere full sync.
 *
 * Best-effort: se algún engine falla, rexístrase no result pero
 * non aborta os demais.
 */
async applyChangesToAll(changes: readonly TreeChange[]): Promise<Result<void>> {
  const errors: Array<{ userId: string; error: YggdrasilError }> = []

  for (const [userId, entry] of this.cache) {
    const result = await entry.engine.applyChanges(changes)
    if (!result.ok) {
      errors.push({ userId, error: result.error })
    }
  }

  if (errors.length > 0) {
    return err(
      new YggdrasilError(
        ErrorCode.APPLY_CHANGES_FAILED,  // verificar T0 que existe
        getErrorMessage(ErrorCode.APPLY_CHANGES_FAILED, this.locale, {
          count: errors.length,
        }),
        { context: { errors } },
      ),
    )
  }

  return ok(undefined)
}
```

**T0 verifica `APPLY_CHANGES_FAILED` existe**: se non, usar
`STORAGE_WRITE_FAILED` ou novo ErrorCode. **Verifica empiricamente
antes de implementar**.

### 5.7 — Build management

```ts
/**
 * Garda un snapshot do state actual do engine do usuario como Build.
 * O build asígnaselle un id único e queda persistido en storage.
 *
 * Devolve o Build creado.
 */
async saveBuild(
  userId: string,
  buildLabel?: LocalizedString,
): Promise<Result<Build>> {
  // 1. Obter engine
  const engineResult = await this.getEngine(userId)
  if (!engineResult.ok) return engineResult

  const engine = engineResult.value

  // 2. Crear Build co state actual
  const buildId = this.generateBuildId(userId)
  const now = Date.now()
  const build: Build = {
    id: buildId,
    treeId: this.treeDef.id,
    treeVersion: this.treeDef.version,
    schemaVersion: this.treeDef.schemaVersion,
    ...(buildLabel !== undefined && { label: buildLabel }),
    createdAt: now,
    updatedAt: now,
    state: engine.getSnapshot(),  // 5.2 L2: getSnapshot, NON getState
  }

  // 3. Persistir
  const setResult = await this.storage.set(`build:${buildId}`, build)
  if (!setResult.ok) return setResult

  // 4. Actualizar índice
  let buildIds = this.buildsIndex.get(userId)
  if (buildIds === undefined) {
    buildIds = new Set()
    this.buildsIndex.set(userId, buildIds)
  }
  buildIds.add(buildId)

  return ok(build)
}

/**
 * Carga un build desde storage e aplícao a un engine (novo se
 * cero existe; substitúe state actual se existe).
 *
 * Cero crea o usuario se cero existe; require que userId estea
 * rexistrado previamente con createEngine.
 */
async loadBuild(userId: string, buildId: string): Promise<Result<TreeEngine>> {
  // 1. Verificar que userId existe
  if (!this.userIds.has(userId)) {
    return err(/* USER_NOT_FOUND */)
  }

  // 2. Recuperar build do storage
  const buildResult = await this.storage.get(`build:${buildId}`)
  if (!buildResult.ok) return buildResult

  if (buildResult.value === null) {
    return err(
      new YggdrasilError(
        ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND,
        getErrorMessage(ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND, this.locale, {
          buildId,
        }),
        { context: { buildId } },
      ),
    )
  }

  const build = buildResult.value as Build

  // 3. Crear novo TreeEngine cos seus initialState
  const engine = new TreeEngine(this.treeDef, {
    locale: this.locale,
    initialState: build.state,
  })

  // 4. Substituír no cache
  this.putInCache(userId, engine)

  return ok(engine)
}

/**
 * Lista os buildIds dun usuario (ou todos se userId é undefined).
 */
async listBuilds(userId?: string): Promise<readonly string[]> {
  if (userId !== undefined) {
    return Array.from(this.buildsIndex.get(userId) ?? new Set())
  }
  const all: string[] = []
  for (const buildIds of this.buildsIndex.values()) {
    all.push(...buildIds)
  }
  return all
}

/**
 * Elimina un build do storage e do índice.
 */
async removeBuild(buildId: string): Promise<Result<void>> {
  // Atopar a quen pertence o build
  let owner: string | undefined
  for (const [userId, buildIds] of this.buildsIndex) {
    if (buildIds.has(buildId)) {
      owner = userId
      break
    }
  }

  if (owner === undefined) {
    return err(
      new YggdrasilError(
        ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND,
        getErrorMessage(ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND, this.locale, {
          buildId,
        }),
        { context: { buildId } },
      ),
    )
  }

  await this.storage.delete(`build:${buildId}`)
  this.buildsIndex.get(owner)!.delete(buildId)

  return ok(undefined)
}

/**
 * Itera todos os builds de todos os usuarios.
 */
async exportAllBuilds(): Promise<Build[]> {
  const builds: Build[] = []
  for (const buildIds of this.buildsIndex.values()) {
    for (const buildId of buildIds) {
      const result = await this.storage.get(`build:${buildId}`)
      if (result.ok && result.value !== null) {
        builds.push(result.value as Build)
      }
    }
  }
  return builds
}

/**
 * Importa unha lista de builds.
 *
 * NON crea engines automaticamente. **Só persiste os builds**.
 * O consumidor debe chamar loadBuild despois se quere aplicalo
 * a un engine.
 *
 * Se algún buildId xa existe, sobreescribe (last_wins).
 */
async importBuilds(builds: readonly Build[]): Promise<Result<void>> {
  // ... (similar a saveBuild pero sin getEngine; persistir cada
  // build + actualizar buildsIndex)
  // Para cada build, derivar userId. Pero Build NON ten userId!
  // Decisión: importBuilds require que builds teñan
  // metadata.userId? ... ou alternativa: usar build.author como
  // userId (modelo PoE: builds publicados por autor).
  // **Decisión do director**: usar build.author como userId. Se
  // build.author está undefined, **descartar ese build silenciosamente**.
  // (Anótomo en JSDoc.)
}
```

**Decisión clave importBuilds**: ¿como mapear Build → userId?
**Build cero ten userId field**. **Decisión do director**: usar
`build.author` como userId. Se `author` está undefined, **rexeitar
silenciosamente** (con count no result). **Anótomo en JSDoc**.

**`generateBuildId` helper privado**:
```ts
private generateBuildId(userId: string): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${userId}-${ts}-${rand}`
}
```

**Determinismo**: usa `Date.now()` + `Math.random()`. **Decisión
consciente**: build ids son non-deterministas (un build creado
agora terá id distinto de un creado mañá). **Patrón estándar**.

### 5.8 — Persistence (save + load)

**save()**:

```ts
async save(): Promise<Result<void>> {
  // 1. Persistir userIds
  await this.storage.set('registry:userIds', Array.from(this.userIds))

  // 2. Persistir buildsIndex (Map → plain object)
  const indexObj: Record<string, string[]> = {}
  for (const [userId, buildIds] of this.buildsIndex) {
    indexObj[userId] = Array.from(buildIds)
  }
  await this.storage.set('registry:buildsIndex', indexObj)

  // 3. Persistir engines segundo strategy
  if (this.cacheConfig.strategy === 'all-in-memory') {
    // Persistir TODOS os engines en cache
    for (const [userId, entry] of this.cache) {
      await this.persistEngine(userId, entry.engine)
    }
  } else if (this.cacheConfig.strategy === 'lru') {
    // Persistir só os engines en cache (load lazy posterior)
    for (const [userId, entry] of this.cache) {
      await this.persistEngine(userId, entry.engine)
    }
  }
  // 'on-demand': cada createEngine xa persistiu; cero acción extra

  // 4. Meta
  const now = Date.now()
  await this.storage.set('registry:meta', {
    schemaVersion: '1.0.0',
    createdAt: now,
    updatedAt: now,
  })

  return ok(undefined)
}

private async persistEngine(userId: string, engine: TreeEngine): Promise<Result<void>> {
  return await this.storage.set(`engine:${userId}:state`, engine.getSnapshot())
}
```

**load()**:

```ts
async load(): Promise<Result<void>> {
  // 1. Cargar userIds
  const userIdsResult = await this.storage.get('registry:userIds')
  if (!userIdsResult.ok) return userIdsResult

  if (userIdsResult.value === null) {
    // Cero estado persistido aínda; estado limpo
    this.loaded = true
    return ok(undefined)
  }

  this.userIds = new Set(userIdsResult.value as string[])

  // 2. Cargar buildsIndex
  const indexResult = await this.storage.get('registry:buildsIndex')
  if (!indexResult.ok) return indexResult

  if (indexResult.value !== null) {
    const indexObj = indexResult.value as Record<string, string[]>
    this.buildsIndex.clear()
    for (const [userId, buildIds] of Object.entries(indexObj)) {
      this.buildsIndex.set(userId, new Set(buildIds))
    }
  }

  // 3. Cargar engines segundo strategy
  if (this.cacheConfig.strategy === 'all-in-memory') {
    // Cargar TODOS os engines
    for (const userId of this.userIds) {
      const loadResult = await this.loadEngineFromStorage(userId)
      if (!loadResult.ok) return loadResult
      this.putInCache(userId, loadResult.value)
    }
  }
  // 'lru' ou 'on-demand': cero load eager; cargan lazy en getEngine

  this.loaded = true
  return ok(undefined)
}

private async loadEngineFromStorage(userId: string): Promise<Result<TreeEngine>> {
  const stateResult = await this.storage.get(`engine:${userId}:state`)
  if (!stateResult.ok) return stateResult

  const initialState = stateResult.value as TreeState | null
  const engine = new TreeEngine(this.treeDef, {
    locale: this.locale,
    ...(initialState !== null && { initialState }),
  })

  return ok(engine)
}
```

### 5.9 — Cache management (LRU)

```ts
private putInCache(userId: string, engine: TreeEngine): void {
  // Para 'on-demand', cero gardar no cache
  if (this.cacheConfig.strategy === 'on-demand') {
    return
  }

  const now = Date.now()
  this.cache.set(userId, { engine, lastAccessAt: now })

  // LRU evict se exceded
  if (this.cacheConfig.strategy === 'lru') {
    this.evictLRU()
  }
}

private evictLRU(): void {
  const maxInMemory = this.cacheConfig.maxInMemory ?? DEFAULT_MAX_IN_MEMORY
  while (this.cache.size > maxInMemory) {
    // Encontrar a entry máis vella
    let oldestUserId: string | undefined
    let oldestAccess = Number.POSITIVE_INFINITY
    for (const [userId, entry] of this.cache) {
      if (entry.lastAccessAt < oldestAccess) {
        oldestAccess = entry.lastAccessAt
        oldestUserId = userId
      }
    }
    if (oldestUserId !== undefined) {
      this.cache.delete(oldestUserId)
    } else {
      break
    }
  }
}

private isExpired(entry: CacheEntry): boolean {
  const ttlMs = this.cacheConfig.ttlMs
  if (ttlMs === undefined || ttlMs === null) {
    return false
  }
  return Date.now() - entry.lastAccessAt > ttlMs
}
```

**LRU implementation**: O(n) por evict. **Aceptable** para
maxInMemory típico (~100-1000). **Cero optimización prematura**.

### 5.10 — destroy

```ts
destroy(): void {
  // Limpa cache; cero close storage (storage é external)
  this.cache.clear()
  this.userIds.clear()
  this.buildsIndex.clear()
  this.loaded = false
}
```

### 5.11 — ErrorCodes novos en common

Modificar `packages/common/src/errors/codes.ts`:

```ts
// Despois de MERGE_INCOMPATIBLE_SCHEMA = 'YGG_E028':
TREE_REGISTRY_USER_NOT_FOUND = 'YGG_E029',
TREE_REGISTRY_USER_EXISTS = 'YGG_E030',
TREE_REGISTRY_BUILD_NOT_FOUND = 'YGG_E031',
```

Modificar `packages/common/src/errors/messages.ts`:

- **TREE_REGISTRY_USER_NOT_FOUND**:
  - gl: 'O usuario {userId} non está rexistrado no TreeRegistry'
  - es: 'El usuario {userId} no está registrado en el TreeRegistry'
  - en: 'User {userId} is not registered in the TreeRegistry'
- **TREE_REGISTRY_USER_EXISTS**:
  - gl: 'O usuario {userId} xa existe no TreeRegistry'
  - es: 'El usuario {userId} ya existe en el TreeRegistry'
  - en: 'User {userId} already exists in the TreeRegistry'
- **TREE_REGISTRY_BUILD_NOT_FOUND**:
  - gl: 'O build {buildId} non existe'
  - es: 'El build {buildId} no existe'
  - en: 'Build {buildId} not found'

**Autorización explícita** (excepción 3.4 L1): modificar
`packages/common/` só para estes 2 ficheiros.

### 5.12 — Cero modificación de pezas existentes

**Cero modificación** de:
- TreeEngine, SubtreeManager, Federator, mergeTreeDefWithOverrides.
- Layout Engine, MigrationRegistry, Reconciler, ProgressManager,
  StatComputer, EffectsRunner, UnlockResolver, TimeManager,
  DependencyGraph, AuditLogger, ResourceManager, StateStore.
- Tipos NodeDef, EdgeDef, TreeDef, TreeState, Build, TreeChange.
- StorageAdapter ou adapters concretos (LocalStorage, IndexedDB,
  Memory, FileSystem, Session).

**SI se modifica**:
- `packages/common/src/errors/codes.ts` (+3 ErrorCodes).
- `packages/common/src/errors/messages.ts` (+9 mensaxes).
- `packages/core/src/engine/index.ts` (+exports).
- `packages/core/package.json`: **verificar T0** que ten dependencia
  a `@yggdrasil-forge/storage` (xa debería para o uso de
  `StorageAdapter` type). Se non, **engadila**.

### 5.13 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
export { TreeRegistry } from './TreeRegistry.js'
export type {
  TreeRegistryOptions,
  TreeRegistryCacheConfig,
} from './TreeRegistry.js'
```

### 5.14 — Tests funcionais

Crear `packages/core/__tests__/engine/TreeRegistry.test.ts`.

**Setup dos tests**: precisas un `StorageAdapter` para os tests.
**Decisión do director**: usar `MemoryStorageAdapter` (xa existe en
storage). **Cero mock; usar real**.

**Tests esperados (~55-60)**:

*Construción (~5):*
1. Default options.
2. Cache strategy 'all-in-memory'.
3. Cache strategy 'lru' con maxInMemory.
4. Cache strategy 'lru' con ttlMs.
5. Cache strategy 'on-demand'.

*createEngine (~6):*
6. Crea engine novo sen build.
7. Crea engine con build.state como initialState.
8. UserId xa existe: err(TREE_REGISTRY_USER_EXISTS).
9. Engine resultante usa treeDef compartido.
10. 'on-demand' persiste inmediatamente.
11. 'all-in-memory' / 'lru' garda en cache.

*getEngine (~8):*
12. UserId non existe: err(TREE_REGISTRY_USER_NOT_FOUND).
13. UserId existe + cache hit: devolve engine.
14. 'all-in-memory': non load lazy.
15. 'lru': load lazy se cache miss.
16. 'on-demand': load sempre.
17. LRU: bump lastAccessAt en hit.
18. TTL: entries expiradas son recargadas.
19. Múltiples getEngine devolve mesma instance (cache).

*removeEngine (~5):*
20. Existe: elimina + ok.
21. Non existe: ok (idempotent).
22. Elimina engine state do storage.
23. Elimina todos os builds asociados.
24. Atualizar listEngines.

*listEngines (~3):*
25. Vacío: [].
26. Tras N createEngines: N userIds.
27. Tras removeEngine: lista actualizada.

*getSharedTreeDef (~2):*
28. Devolve mesmo TreeDef pasado no constructor.
29. Reference (cero clone).

*applyChangesToAll (~5):*
30. 0 engines: ok.
31. Aplica changes a todos os engines en cache.
32. Cero engines en cache (lru con miss): cero acción.
33. Engine fallido: err con context.
34. Engines posteriores continúan tras un fallo.

*saveBuild + loadBuild (~8):*
35. saveBuild crea build co state actual.
36. saveBuild persiste en storage.
37. saveBuild actualiza buildsIndex.
38. saveBuild con label.
39. loadBuild aplica state ao engine.
40. loadBuild con buildId non existe: err.
41. loadBuild con userId non existe: err.
42. Múltiples saveBuilds por mesmo userId: ids distintos.

*listBuilds + removeBuild (~5):*
43. listBuilds(userId): lista buildIds.
44. listBuilds() sen filtro: todos os builds.
45. removeBuild existe: ok + actualiza índice.
46. removeBuild non existe: err.
47. removeEngine elimina cascading os builds.

*exportAllBuilds + importBuilds (~6):*
48. exportAllBuilds: lista de Build objects.
49. importBuilds: persiste + actualiza índice.
50. importBuilds usa build.author como userId (5.7 decisión).
51. importBuilds con build.author undefined: descartado
    silenciosamente.
52. importBuilds sobreescribe buildIds existentes (last_wins).
53. Roundtrip export → import → export devolve mesmos builds.

*save + load (~8):*
54. save persiste userIds + buildsIndex + engines.
55. load() restaura userIds + buildsIndex.
56. 'all-in-memory' load: carga todos os engines.
57. 'lru' load: carga só userIds (cero engines).
58. 'on-demand' load: carga só userIds.
59. Roundtrip create → save → new registry → load → getEngine.
60. load() de storage vacío: estado limpo.

*destroy (~3):*
61. Limpa cache.
62. Limpa userIds + buildsIndex.
63. Posterior usage tras destroy: registry como novo.

**Total: ~63 tests.**

### 5.15 — Cobertura

- `TreeRegistry.ts`: **100% Stmts/Funcs/Lines, ≥90% Branch** (peza
  grande con múltiples ramas; lección 3.5 L1 + 5.2 L1 aplicables).
- Global core: non baixar de baseline (97.42%). **Mellora esperada**.

### 5.16 — Determinismo

- `generateBuildId`: usa `Date.now()` + `Math.random()`. **Non
  deterministic** (decisión consciente; build ids son únicos).
- `listEngines`: orde de inserción Set.
- `listBuilds`: orde de inserción Set.

### 5.17 — Tamaño previsto

- `TreeRegistry.ts`: ~600-700 liñas.
- Tests: ~600-700 liñas.
- ErrorCodes + mensaxes: ~12 liñas.
- **Total**: ~1250-1450 liñas. **Sub-fase grande**.

### 5.18 — Cero AGGREGATE QUERIES en 6.1

Os métodos `getAggregateStats`, `getNodePopularity`,
`getProgressDistribution`, `getStuckUsers` **NON se implementan en
6.1**. Reservados para **6.2**. **Cero exportar** desde index.ts
aínda.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/TreeRegistry.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +3 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +3 ErrorCodes;
  autorizado por 5.11)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +9 mensaxes;
  autorizado por 5.11)
- `packages/core/package.json` (verificar T0; engadir
  `@yggdrasil-forge/storage` dependency se necesario)

**Tests:**
- `packages/core/__tests__/engine/TreeRegistry.test.ts` (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións CRÍTICAS

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1381 tests core + 60 common + 171 storage con `--force`.

2. **Verifica StorageAdapter API empíricamente** (5.2 L2):
   ```
   grep -n "^  [a-z]*(" packages/storage/src/StorageAdapter.ts
   ```
   Confirma os 6 métodos: get, set, delete, list, clear, watch?.

3. **Verifica Build shape** exacto:
   ```
   sed -n '/^export interface Build/,/^}/p' packages/core/src/types/build.ts
   ```

4. **Verifica `engine.getSnapshot()` API** (5.2 L2):
   ```
   grep -n "^  getSnapshot\|^  getState" packages/core/src/engine/TreeEngine.ts
   ```

5. **Verifica `applyChanges` API**:
   ```
   grep -B1 -A1 "^  async applyChanges" packages/core/src/engine/TreeEngine.ts
   ```

6. **Verifica APPLY_CHANGES_FAILED ErrorCode existe**:
   ```
   grep "APPLY_CHANGES_FAILED" packages/common/src/errors/codes.ts
   ```
   Se NON existe, **ESCALAR** (briefing prescribe usalo en
   applyChangesToAll).

7. **Verifica @yggdrasil-forge/storage en package.json de core**:
   ```
   cat packages/core/package.json | grep -A2 dependencies
   ```
   Se NON está, **engadilo** (workspace dependency).

8. **Verifica deepClone export en common**:
   ```
   grep "deepClone" packages/common/src/index.ts
   ```
   Se NON existe, eliminar do import (cero usar deepClone).

9. **Verifica MemoryStorageAdapter para tests**:
   ```
   grep -l "MemoryStorage" packages/storage/src/
   ```

### T1 — ErrorCodes novos en common (5.11)

1. Editar `packages/common/src/errors/codes.ts`:
   - Engadir 3 ErrorCodes (YGG_E029, YGG_E030, YGG_E031).
2. Editar `packages/common/src/errors/messages.ts`:
   - Engadir as 9 mensaxes.
3. Typecheck 20/20.
4. Confirma 60 tests common seguen pasando.

### T2 — Engadir dependency @yggdrasil-forge/storage (se T0.7 indicou)

Editar `packages/core/package.json` para engadir workspace dependency
se aínda non existe. **NON pnpm install agora**; iso fai-se ao final.

### T3 — Esqueleto TreeRegistry (5.3 + 5.4)

Crear `packages/core/src/engine/TreeRegistry.ts` con:
- `TreeRegistryCacheConfig` interface.
- `TreeRegistryOptions` interface.
- `CacheEntry` interface privada.
- `TreeRegistry` clase con campos privados e constructor.
- Esqueleto vacío dos métodos públicos.

Typecheck 20/20.

### T4 — Lifecycle methods (5.5)

Implementar:
- `createEngine`.
- `getEngine`.
- `removeEngine`.
- `listEngines`.

Helpers privados: `putInCache`, `evictLRU`, `isExpired`.

Typecheck 20/20.

### T5 — getSharedTreeDef + applyChangesToAll (5.6)

Typecheck 20/20.

### T6 — Build management (5.7)

Implementar:
- `saveBuild`.
- `loadBuild`.
- `listBuilds`.
- `removeBuild`.
- `exportAllBuilds`.
- `importBuilds`.
- `generateBuildId` helper privado.

**Calquera dúbida sobre semántica de importBuilds (5.7 decisión:
build.author como userId) → ESCALAR**.

Typecheck 20/20.

### T7 — Persistence (5.8)

Implementar:
- `save`.
- `load`.
- `persistEngine` privado.
- `loadEngineFromStorage` privado.

Typecheck 20/20.

### T8 — destroy (5.10)

Typecheck 20/20.

### T9 — Exportar dende engine/index.ts (5.13)

Engadir 3 exports.

### T10 — Tests TreeRegistry (5.14)

Crear `__tests__/engine/TreeRegistry.test.ts` cos ~63 tests.

**Importante**:
- Usar `MemoryStorageAdapter` real (cero mock).
- Crear TreeDefs mínimas (poucos nodos) para acelerar tests.
- Verificar 'all-in-memory' / 'lru' / 'on-demand' separadamente.
- Verificar roundtrip create → save → new registry → load → getEngine.

### T11 — Verificación post-T10

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1381 tests previos seguen pasando intactos.
- 60 common previos intactos (cero ruptura por +3 ErrorCodes).
- 171 storage previos intactos.

### T12 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- TreeRegistry.ts 100/≥90%/100/100.
- Global core ≥97.42% (baseline post-Fase 5).

### T13 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/TreeRegistry.ts
pnpm test
```

- Changeset **minor** para `@yggdrasil-forge/core`.
- Changeset **patch** para `@yggdrasil-forge/common`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `TreeRegistry` clase: xestor de múltiples TreeEngines compartindo
    un só TreeDef.
    - Lifecycle: `createEngine`, `getEngine`, `removeEngine`,
      `listEngines`.
    - Shared tree: `getSharedTreeDef`, `applyChangesToAll`.
    - Build management completo: `saveBuild`, `loadBuild`,
      `listBuilds`, `removeBuild`, `exportAllBuilds`, `importBuilds`.
    - Persistence: `save`, `load` via StorageAdapter.
    - Cleanup: `destroy`.
  - 3 cache strategies:
    - `'all-in-memory'`: todos os engines en memoria; save persiste
      todos; load carga todos eager.
    - `'lru'`: cache LRU con `maxInMemory` + `ttlMs` opcionais;
      engines cargan lazy.
    - `'on-demand'`: cero cache; getEngine carga sempre desde storage.
  - `TreeRegistryOptions` + `TreeRegistryCacheConfig` types.
  - ErrorCodes novos:
    - `TREE_REGISTRY_USER_NOT_FOUND` (YGG_E029)
    - `TREE_REGISTRY_USER_EXISTS` (YGG_E030)
    - `TREE_REGISTRY_BUILD_NOT_FOUND` (YGG_E031)
    Traducidos gl/es/en.

  ### Note
  - Sub-fase 6.1 PRIMEIRA da Fase 6 (TreeRegistry + Multi-tenancy).
  - Aggregate queries (`getAggregateStats`, `getNodePopularity`,
    `getProgressDistribution`, `getStuckUsers`) DIFERIDAS a 6.2.
  - `ScopedStorage` DIFERIDO a 6.3.
  - `Quotas` + `Permissions` DIFERIDOS a 6.4 (require investigación
    arquitectónica adicional sobre Permissions).
  - `applyChangesToAll` aplica changes só aos engines en cache;
    engines en storage non cargados non se actualizan
    automaticamente (decisión consciente; consumidor responsable).
  - `importBuilds` usa `build.author` como userId; builds sen
    author son descartados silenciosamente (con count no result).
  - Schema de claves: `engine:${userId}:state`, `build:${buildId}`,
    `registry:userIds`, `registry:buildsIndex`, `registry:meta`.
    Cero modificación posterior; ScopedStorage (6.3) wrappea con
    prefixo tenant.
  ```

### T14 — Commit + push

Commit Conventional:
`feat(core): add TreeRegistry with build management and cache strategies (sub-phase 6.1)`.
Push directo a `origin/main` (base `b8b6d89`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/TreeRegistry.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO)
- `packages/common/src/errors/codes.ts` (MODIFICADO)
- `packages/common/src/errors/messages.ts` (MODIFICADO)
- `packages/core/package.json` (posiblemente MODIFICADO se T0.7)
- `packages/core/__tests__/engine/TreeRegistry.test.ts` (NOVO)
- `.changeset/*.md` (NOVO: 2 ficheiros)
- `CHANGELOG.md` (modificado)
- `pnpm-lock.yaml` (posiblemente modificado se T0.7)

**NON deben aparecer cambios en**:
- `packages/storage/` (cero modificar adapters).
- `tsconfig.base.json`, `tsup.config.ts`, ou outros globais.
- TreeEngine, SubtreeManager, Federator, ou outras pezas existentes
  (5.12).
- Tipos NodeDef, EdgeDef, TreeDef, TreeState, Build, TreeChange (xa
  modelados).
- Tests existentes (cero modificación).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` opcionais para os bloques de métodos. 2
espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar Aggregate queries (5.18: diferidas a 6.2).
- ❌ Implementar ScopedStorage (diferida a 6.3).
- ❌ Implementar Quotas ou Permissions (diferidos a 6.4).
- ❌ Modificar TreeEngine, SubtreeManager, Federator (5.12).
- ❌ Modificar StorageAdapter ou adapters concretos (5.12).
- ❌ Modificar TreeDef, NodeDef, Build, TreeChange tipos (5.12: xa
  modelados).
- ❌ Engadir userId field a Build (5.7: usar build.author como userId).
- ❌ Crear novos tipos en types/ (cero ficheiros en packages/core/src/
  types/).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` agás `codes.ts` e `messages.ts`
  (5.11 autorizado).
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes adicionais (só os 3 prescritos en 5.11).
- ❌ Implementar load lazy en getEngine para 'all-in-memory' (5.5:
  cero load lazy; engines deben estar no cache).
- ❌ Implementar deepClone de TreeDef (5.6: cero clone; treeDef é
  immutable shared).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → ESCALAR.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 6.1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base b8b6d89)
✅ TreeRegistry clase con lifecycle + shared + builds + persistence
✅ 3 cache strategies: 'all-in-memory', 'lru' (maxInMemory + ttlMs),
   'on-demand'
✅ Build management completo:
   - saveBuild, loadBuild, listBuilds, removeBuild
   - exportAllBuilds, importBuilds (build.author como userId)
✅ applyChangesToAll para engines en cache (decisión consciente:
   engines en storage non cargados non se actualizan)
✅ Schema de claves: engine:${userId}:state, build:${buildId},
   registry:userIds, registry:buildsIndex, registry:meta
✅ 3 ErrorCodes novos: YGG_E029, E030, E031 (3 locales)
✅ Cero modificación de TreeEngine, SubtreeManager, Federator
✅ Cero modificación de adapters de storage
✅ T0.2 StorageAdapter API verificada: <6 métodos>
✅ T0.3 Build shape verificada: <forma>
✅ T0.6 APPLY_CHANGES_FAILED verificado: <estado>
✅ T0.7 dependency @yggdrasil-forge/storage verificada: <estado>
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> Construción (3 strategies)
   - <Y> createEngine
   - <Z> getEngine (3 strategies + LRU + TTL)
   - <W> removeEngine
   - <V> Build management (saveBuild, loadBuild, listBuilds,
     removeBuild, exportAllBuilds, importBuilds)
   - <U> applyChangesToAll
   - <T> Persistence (save, load roundtrip)
   - <S> destroy
✅ Cobertura:
   - TreeRegistry.ts: <X%> (≥90% Branch; lección 3.5 L1 + 5.2 L1)
   - Global core: <X%> (baseline 97.42%; mantense ou sobe)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 6.1 PRIMEIRA da Fase 6.
   - Aggregate queries (6.2), ScopedStorage (6.3), Quotas +
     Permissions (6.4) DIFERIDOS.
   - Build management: múltiples builds por usuario; importBuilds
     usa build.author como userId; cero author = descartado.
   - applyChangesToAll: só engines en cache; cero load lazy
     forzado.
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 6.2 (Aggregate queries).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 6.1. Primera sub-fase Fase 6. TreeRegistry standalone
con build management completo. Sub-fase grande con risco arquitectónico
medio mitigado por pseudo-código exhaustivo. Calquera dúbida → ESCALAR.*
