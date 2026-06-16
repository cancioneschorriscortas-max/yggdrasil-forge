// ── INICIO: TreeRegistry ──
// Xestor de múltiples TreeEngines compartindo un só TreeDef.
// Soporta 3 estratexias de cache: 'all-in-memory', 'lru', 'on-demand'.
// Build management completo e persistencia via StorageAdapter.

import {
  ErrorCode,
  type Locale,
  type LocalizedString,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/common'
import type { Build, NodeInstance, TreeChange, TreeDef, TreeState } from '../types/index.js'
import { TreeEngine } from './TreeEngine.js'

const DEFAULT_LOCALE: Locale = 'gl'
const DEFAULT_MAX_IN_MEMORY = 100

// ── Interfaces públicas ──

export interface TreeRegistryCacheConfig {
  /**
   * Estratexia de cache:
   * - 'all-in-memory': todos os engines viven en memoria. save()
   *   persiste todos. load() carga todos.
   * - 'lru': cache LRU con maxInMemory. Cando se excede, evicta o
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
   * o maxInMemory. Default undefined (sin TTL).
   * Ignorado para 'all-in-memory' e 'on-demand'.
   */
  readonly ttlMs?: number
}

export interface QuotaConfig {
  /**
   * Número máximo de usuarios (engines) que se poden rexistrar
   * neste registry. `createEngine` falla con `QUOTA_USERS_EXCEEDED`
   * se se intenta crear un cando xa hai maxUsers rexistrados.
   * Se non se define, sen límite.
   */
  readonly maxUsers?: number

  /**
   * Número máximo de builds por usuario. `saveBuild` falla con
   * `QUOTA_BUILDS_EXCEEDED` se o usuario xa ten maxBuildsPerUser
   * builds. `importBuilds` tamén valida por usuario.
   * Se non se define, sen límite.
   */
  readonly maxBuildsPerUser?: number

  /**
   * Número máximo de bytes acumulados en storage (escrituras feitas
   * polo TreeRegistry: engine states + builds + metadata). Calculado
   * como `JSON.stringify(value).length` por clave (best-effort).
   * Cualquera escritura interna que vaia exceder este límite falla
   * con `QUOTA_STORAGE_EXCEEDED`. Se non se define, sen límite.
   *
   * **Precondición**: storage values son JSON-serializables.
   *
   * **Distinción**: `QUOTA_STORAGE_EXCEEDED` (YGG_E035) é o límite
   * lóxico (config do registry); `STORAGE_QUOTA_EXCEEDED` (YGG_S003)
   * preexistente é o límite físico (backend de storage cheo).
   */
  readonly maxStorageBytes?: number
}

export interface TreeRegistryOptions {
  /** Storage adapter para persistir engines e builds. */
  readonly storage: StorageAdapter

  /** Configuración do cache de engines en memoria. */
  readonly cache: TreeRegistryCacheConfig

  /** Locale para mensaxes de erro. Default 'gl'. */
  readonly locale?: Locale

  /**
   * Cotas opcionais multi-tenant. Se non se define, cero límites
   * (back-compat con sub-fases anteriores).
   */
  readonly quotas?: QuotaConfig

  /**
   * Verificador de permisos opcional. Se non se define, todas as
   * operacións de mutación per-user permítense (back-compat).
   * Modelo enriquecido (ACL/RBAC/policies) difírido a Fase 8.4.
   */
  readonly permissions?: PermissionChecker
}

export interface AggregateStats {
  /** Total de usuarios con state persistido en storage. */
  readonly totalUsers: number
  /** Promedio de nodos unlocked-or-maxed por usuario. 0 se totalUsers=0. */
  readonly avgUnlockedCount: number
  /**
   * Promedio do campo `progress` entre todos os NodeInstance que teñen
   * `progress` definido en todos os usuarios. 0 se cero nodos teñen
   * progress definido.
   */
  readonly avgProgress: number
  /** Top-10 nodos máis populares (count = nº de users con unlocked-or-maxed). */
  readonly mostPopularNodes: ReadonlyArray<{
    readonly nodeId: string
    readonly count: number
  }>
  /** Bottom-10 nodos menos populares (cero excluídos: count pode ser 0). */
  readonly leastPopularNodes: ReadonlyArray<{
    readonly nodeId: string
    readonly count: number
  }>
  /**
   * Ratio de usuarios que teñen TODOS os nodos do treeDef en estado
   * unlocked-or-maxed. Rango [0, 1]. 0 se totalUsers=0.
   */
  readonly completionRate: number
}

/**
 * Acciones sometidas a verificación de permiso polo `PermissionChecker`
 * opcional do TreeRegistry. Limitada a 5 operacións de mutación per-user.
 * Operacións de lectura e administrativas NON son sometidas a permiso en
 * 6.5; o modelo enriquecido vía hooks de 8.4 PluginManager poderá
 * estender.
 */
export type PermissionAction =
  | 'createEngine'
  | 'removeEngine'
  | 'saveBuild'
  | 'loadBuild'
  | 'removeBuild'

/**
 * Interface mínima de verificación de permisos para o TreeRegistry.
 * Se se pasa en `TreeRegistryOptions.permissions`, o TreeRegistry chama
 * `check(action, userId)` antes de cada operación de mutación per-user.
 * Se devolve `false` (ou Promise resolved a false), a operación falla
 * con `PERMISSION_DENIED` (YGG_E036) sen efectos colaterais.
 *
 * **Default cando undefined**: todas as operacións permitidas.
 *
 * **Modelo expandido**: Fase 8.4 PluginManager + HookRunner ofrecerá
 * hooks máis ricos.
 */
export interface PermissionChecker {
  /**
   * Verifica se a `action` está permitida para `userId`. Pode ser
   * síncrono (boolean) ou asíncrono (Promise<boolean>).
   */
  check(action: PermissionAction, userId: string): boolean | Promise<boolean>
}

// ── Interfaces internas ──

interface CacheEntry {
  readonly engine: TreeEngine
  lastAccessAt: number
}

// ── TreeRegistry ──

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

  /** Quotas configuradas; undefined se non se pasaron en options. */
  private readonly quotas: QuotaConfig | undefined

  /** Verificador de permisos opcional; undefined se non se pasou. */
  private readonly permissions: PermissionChecker | undefined

  /**
   * Total acumulado de bytes en storage (só rastreado se
   * quotas?.maxStorageBytes !== undefined). 0 se non aplicable.
   */
  private bytesUsed = 0

  /**
   * Bytes acumulados por clave (para restar correctamente en
   * delete/overwrite). Baleiro se non se rastrean bytes.
   */
  private readonly bytesPerKey = new Map<string, number>()

  constructor(treeDef: TreeDef, options: TreeRegistryOptions) {
    this.treeDef = treeDef
    this.storage = options.storage
    this.cacheConfig = options.cache
    this.locale = options.locale ?? DEFAULT_LOCALE
    this.quotas = options.quotas
    this.permissions = options.permissions
  }

  // ── Lifecycle ──

  async createEngine(userId: string, build?: Build): Promise<Result<TreeEngine>> {
    // ── Check permiso (6.5) ──
    const permResult = await this.checkPermission('createEngine', userId)
    if (!permResult.ok) return permResult

    // ── Check maxUsers (6.4) ──
    if (this.quotas?.maxUsers !== undefined) {
      const currentUsers = this.userIds.size
      if (!this.userIds.has(userId) && currentUsers + 1 > this.quotas.maxUsers) {
        return err(
          new YggdrasilError(
            ErrorCode.QUOTA_USERS_EXCEEDED,
            getErrorMessage(ErrorCode.QUOTA_USERS_EXCEEDED, this.locale, {
              current: currentUsers + 1,
              max: this.quotas.maxUsers,
            }),
          ),
        )
      }
    }

    if (this.userIds.has(userId)) {
      return err(
        new YggdrasilError(
          ErrorCode.TREE_REGISTRY_USER_EXISTS,
          getErrorMessage(ErrorCode.TREE_REGISTRY_USER_EXISTS, this.locale, { userId }),
          { context: { userId } },
        ),
      )
    }

    const engine = new TreeEngine(this.treeDef, {
      locale: this.locale,
      ...(build !== undefined && { initialState: build.state }),
    })

    this.userIds.add(userId)
    this.putInCache(userId, engine)

    // Para 'on-demand', persistir inmediatamente
    if (this.cacheConfig.strategy === 'on-demand') {
      const persistResult = await this.persistEngine(userId, engine)
      if (!persistResult.ok) return persistResult
    }

    return ok(engine)
  }

  async getEngine(userId: string): Promise<Result<TreeEngine>> {
    if (!this.userIds.has(userId)) {
      return err(
        new YggdrasilError(
          ErrorCode.TREE_REGISTRY_USER_NOT_FOUND,
          getErrorMessage(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND, this.locale, { userId }),
          { context: { userId } },
        ),
      )
    }

    // Cache lookup
    const cached = this.cache.get(userId)
    if (cached !== undefined) {
      // Verificar TTL se aplicable
      if (this.cacheConfig.strategy === 'lru' && this.isExpired(cached)) {
        this.cache.delete(userId)
        // Continuar a load from storage
      } else {
        cached.lastAccessAt = Date.now()
        return ok(cached.engine)
      }
    }

    // 'all-in-memory': cero load lazy; engine debería estar no cache
    /* v8 ignore next 8 -- rama defensiva inalcanzable: all-in-memory load() carga todos os engines */
    if (this.cacheConfig.strategy === 'all-in-memory') {
      return err(
        new YggdrasilError(
          ErrorCode.TREE_REGISTRY_USER_NOT_FOUND,
          getErrorMessage(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND, this.locale, { userId }),
          { context: { userId } },
        ),
      )
    }

    // Para 'lru' ou 'on-demand', cargar desde storage
    const loadResult = await this.loadEngineFromStorage(userId)
    if (!loadResult.ok) return loadResult

    const engine = loadResult.value
    this.putInCache(userId, engine)

    return ok(engine)
  }

  async removeEngine(userId: string): Promise<Result<void>> {
    // ── Check permiso (6.5) ──
    const permResult = await this.checkPermission('removeEngine', userId)
    if (!permResult.ok) return permResult

    if (!this.userIds.has(userId)) {
      return ok(undefined) // idempotent
    }

    this.userIds.delete(userId)
    this.cache.delete(userId)

    // Eliminar do storage
    await this.quotaCheckedDelete(`engine:${userId}:state`)

    // Eliminar todos os builds do usuario
    const buildIds = this.buildsIndex.get(userId)
    if (buildIds !== undefined) {
      for (const buildId of buildIds) {
        await this.quotaCheckedDelete(`build:${buildId}`)
      }
      this.buildsIndex.delete(userId)
    }

    return ok(undefined)
  }

  async listEngines(): Promise<string[]> {
    return Array.from(this.userIds)
  }

  // ── Shared tree ──

  getSharedTreeDef(): TreeDef {
    return this.treeDef
  }

  /**
   * Aplica changes a TODOS os engines actualmente en cache.
   *
   * Decisión consciente: cero modifica engines en storage non
   * cargados. Consumidor responsable de cargar engines previo
   * a applyChangesToAll se quere full sync.
   *
   * Best-effort: se algún engine falla, rexístrase pero
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
          ErrorCode.APPLY_CHANGES_FAILED,
          getErrorMessage(ErrorCode.APPLY_CHANGES_FAILED, this.locale, { count: errors.length }),
          { context: { errors } },
        ),
      )
    }

    return ok(undefined)
  }

  // ── Aggregate queries ──

  /**
   * Métricas globais agregadas sobre todos os usuarios con state persistido.
   *
   * Opera directamente sobre storage sen instanciar TreeEngines
   * (decisión MASTER §5.6.5). Cero descenso a subtreeStates
   * (decisión consciente). Cada chamada lee storage fresco
   * (cero cache de resultados).
   *
   * **Precondición**: chamar `save()` previamente para que mutacións
   * de engines en cache sexan visibles.
   */
  async getAggregateStats(): Promise<AggregateStats> {
    const states = await this.loadAllStates()
    const totalUsers = states.size
    const treeNodeIds = this.treeDef.nodes.map((n) => n.id)
    const totalTreeNodes = treeNodeIds.length

    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        avgUnlockedCount: 0,
        avgProgress: 0,
        mostPopularNodes: [],
        leastPopularNodes: [],
        completionRate: 0,
      }
    }

    // Conteos por nodeId (popularidade)
    const popularity = new Map<string, number>()
    for (const nodeId of treeNodeIds) popularity.set(nodeId, 0)

    let totalUnlocked = 0
    let totalProgressSum = 0
    let totalProgressCount = 0
    let completedUsers = 0

    for (const state of states.values()) {
      let userUnlockedCount = 0
      for (const nodeId of treeNodeIds) {
        const instance = state.nodes[nodeId]
        if (instance !== undefined && this.isUnlocked(instance)) {
          popularity.set(nodeId, (popularity.get(nodeId) ?? 0) + 1)
          userUnlockedCount++
        }
        if (instance?.progress !== undefined) {
          totalProgressSum += instance.progress
          totalProgressCount++
        }
      }
      totalUnlocked += userUnlockedCount
      if (totalTreeNodes > 0 && userUnlockedCount === totalTreeNodes) {
        completedUsers++
      }
    }

    // Ordenar por count desc, tie-break por nodeId asc (DETERMINISMO)
    const sortedDesc = [...popularity.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )
    const sortedAsc = [...popularity.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
    )

    return {
      totalUsers,
      avgUnlockedCount: totalUnlocked / totalUsers,
      avgProgress: totalProgressCount > 0 ? totalProgressSum / totalProgressCount : 0,
      mostPopularNodes: sortedDesc.slice(0, 10).map(([nodeId, count]) => ({ nodeId, count })),
      leastPopularNodes: sortedAsc.slice(0, 10).map(([nodeId, count]) => ({ nodeId, count })),
      completionRate: totalTreeNodes > 0 ? completedUsers / totalUsers : 0,
    }
  }

  /**
   * Count de usuarios con cada nodo desbloqueado (state ∈ {unlocked, maxed}).
   *
   * Devolve un Map con TODOS os nodos do treeDef (incluso count=0).
   * Opera directamente sobre storage sen instanciar TreeEngines.
   * Cero descenso a subtreeStates.
   */
  async getNodePopularity(): Promise<Map<string, number>> {
    const states = await this.loadAllStates()
    const popularity = new Map<string, number>()
    for (const node of this.treeDef.nodes) {
      popularity.set(node.id, 0)
    }

    for (const state of states.values()) {
      for (const node of this.treeDef.nodes) {
        const instance = state.nodes[node.id]
        if (instance !== undefined && this.isUnlocked(instance)) {
          popularity.set(node.id, (popularity.get(node.id) ?? 0) + 1)
        }
      }
    }
    return popularity
  }

  /**
   * Array determinístico (orde alfabética por userId) dos valores
   * `progress` dos usuarios cuxo nodeId ten progress definido.
   *
   * Usuarios sen o nodo ou sen progress definido son excluídos.
   * nodeId inexistente no treeDef devolve []. Opera directamente
   * sobre storage sen instanciar TreeEngines.
   */
  async getProgressDistribution(nodeId: string): Promise<number[]> {
    const states = await this.loadAllStates()
    const values: number[] = []
    const sortedUserIds = [...states.keys()].sort()
    for (const userId of sortedUserIds) {
      const state = states.get(userId)
      const instance = state?.nodes[nodeId]
      if (instance?.progress !== undefined) {
        values.push(instance.progress)
      }
    }
    return values
  }

  /**
   * Usuarios con menos de `threshold` nodos desbloqueados (default 1).
   *
   * Threshold é nº absoluto de nodos unlocked, NON porcentaxe.
   * Orde alfabética por userId. Usuarios sen state en storage
   * (best-effort skip de loadAllStates) non contan como stuck.
   * Opera directamente sobre storage sen instanciar TreeEngines.
   */
  async getStuckUsers(threshold?: number): Promise<string[]> {
    const effectiveThreshold = threshold ?? 1
    const states = await this.loadAllStates()
    const stuck: string[] = []
    for (const [userId, state] of states) {
      let unlockedCount = 0
      for (const node of this.treeDef.nodes) {
        const instance = state.nodes[node.id]
        if (instance !== undefined && this.isUnlocked(instance)) {
          unlockedCount++
        }
      }
      if (unlockedCount < effectiveThreshold) {
        stuck.push(userId)
      }
    }
    return stuck.sort()
  }

  // ── Build management ──

  /**
   * Garda un snapshot do state actual do engine do usuario como Build.
   * O build asígnaselle un id único e queda persistido en storage.
   *
   * Devolve o Build creado. Establece build.author = userId para
   * compatibilidade con importBuilds (que usa author como userId).
   */
  async saveBuild(userId: string, buildLabel?: LocalizedString): Promise<Result<Build>> {
    // ── Check permiso (6.5) ──
    const permResult = await this.checkPermission('saveBuild', userId)
    if (!permResult.ok) return permResult

    const engineResult = await this.getEngine(userId)
    if (!engineResult.ok) return engineResult

    // ── Check maxBuildsPerUser (6.4) ──
    if (this.quotas?.maxBuildsPerUser !== undefined) {
      const currentBuilds = this.buildsIndex.get(userId)?.size ?? 0
      if (currentBuilds + 1 > this.quotas.maxBuildsPerUser) {
        return err(
          new YggdrasilError(
            ErrorCode.QUOTA_BUILDS_EXCEEDED,
            getErrorMessage(ErrorCode.QUOTA_BUILDS_EXCEEDED, this.locale, {
              userId,
              current: currentBuilds + 1,
              max: this.quotas.maxBuildsPerUser,
            }),
          ),
        )
      }
    }

    const engine = engineResult.value
    const buildId = this.generateBuildId(userId)
    const now = Date.now()

    const build: Build = {
      id: buildId,
      treeId: this.treeDef.id,
      treeVersion: this.treeDef.version,
      schemaVersion: this.treeDef.schemaVersion,
      author: userId,
      ...(buildLabel !== undefined && { label: buildLabel }),
      createdAt: now,
      updatedAt: now,
      state: engine.getSnapshot(),
    }

    const setResult = await this.quotaCheckedSet(`build:${buildId}`, build)
    if (!setResult.ok) return setResult

    let buildIds = this.buildsIndex.get(userId)
    if (buildIds === undefined) {
      buildIds = new Set()
      this.buildsIndex.set(userId, buildIds)
    }
    buildIds.add(buildId)

    return ok(build)
  }

  /**
   * Carga un build desde storage e crea un novo engine co seu state.
   *
   * Require que userId estea rexistrado previamente con createEngine.
   */
  async loadBuild(userId: string, buildId: string): Promise<Result<TreeEngine>> {
    // ── Check permiso (6.5) ──
    const permResult = await this.checkPermission('loadBuild', userId)
    if (!permResult.ok) return permResult

    if (!this.userIds.has(userId)) {
      return err(
        new YggdrasilError(
          ErrorCode.TREE_REGISTRY_USER_NOT_FOUND,
          getErrorMessage(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND, this.locale, { userId }),
          { context: { userId } },
        ),
      )
    }

    const buildResult = await this.storage.get(`build:${buildId}`)
    if (!buildResult.ok) return buildResult

    if (buildResult.value === null) {
      return err(
        new YggdrasilError(
          ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND,
          getErrorMessage(ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND, this.locale, { buildId }),
          { context: { buildId } },
        ),
      )
    }

    const build = buildResult.value as Build
    const engine = new TreeEngine(this.treeDef, {
      locale: this.locale,
      initialState: build.state,
    })

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
          getErrorMessage(ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND, this.locale, { buildId }),
          { context: { buildId } },
        ),
      )
    }

    // ── Check permiso (6.5) — usa owner como userId ──
    const permResult = await this.checkPermission('removeBuild', owner)
    if (!permResult.ok) return permResult

    await this.quotaCheckedDelete(`build:${buildId}`)
    const ownerBuilds = this.buildsIndex.get(owner)
    if (ownerBuilds !== undefined) {
      ownerBuilds.delete(buildId)
    }

    return ok(undefined)
  }

  /**
   * Exporta todos os builds de todos os usuarios.
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
   * NON crea engines automaticamente. Só persiste os builds e
   * actualiza o índice interno.
   *
   * Usa build.author como userId. Builds sen author son descartados
   * silenciosamente. Se un buildId xa existe, sobreescríbese
   * (last_wins).
   */
  async importBuilds(builds: readonly Build[]): Promise<Result<void>> {
    for (const build of builds) {
      if (build.author === undefined) {
        continue
      }

      const userId = build.author

      await this.quotaCheckedSet(`build:${build.id}`, build)

      let userBuildIds = this.buildsIndex.get(userId)
      if (userBuildIds === undefined) {
        userBuildIds = new Set()
        this.buildsIndex.set(userId, userBuildIds)
      }
      userBuildIds.add(build.id)
    }

    return ok(undefined)
  }

  // ── Persistence ──

  async save(): Promise<Result<void>> {
    // 1. Persistir userIds
    const userIdsResult = await this.quotaCheckedSet('registry:userIds', Array.from(this.userIds))
    if (!userIdsResult.ok) return userIdsResult

    // 2. Persistir buildsIndex (Map → plain object)
    const indexObj: Record<string, string[]> = {}
    for (const [userId, buildIds] of this.buildsIndex) {
      indexObj[userId] = Array.from(buildIds)
    }
    const indexResult = await this.quotaCheckedSet('registry:buildsIndex', indexObj)
    if (!indexResult.ok) return indexResult

    // 3. Persistir engines segundo strategy
    if (this.cacheConfig.strategy === 'all-in-memory' || this.cacheConfig.strategy === 'lru') {
      for (const [userId, entry] of this.cache) {
        const persistResult = await this.persistEngine(userId, entry.engine)
        if (!persistResult.ok) return persistResult
      }
    }
    // 'on-demand': cada createEngine xa persistiu; cero acción extra

    // 4. Meta
    const now = Date.now()
    const metaResult = await this.quotaCheckedSet('registry:meta', {
      schemaVersion: '1.0.0',
      createdAt: now,
      updatedAt: now,
    })
    if (!metaResult.ok) return metaResult

    return ok(undefined)
  }

  async load(): Promise<Result<void>> {
    // 1. Cargar userIds
    const userIdsResult = await this.storage.get('registry:userIds')
    /* v8 ignore next -- MemoryStorage.get non falla; rama defensiva para adapters con I/O */
    if (!userIdsResult.ok) return userIdsResult

    if (userIdsResult.value === null) {
      // Cero estado persistido aínda; estado limpo
      return ok(undefined)
    }

    this.userIds = new Set(userIdsResult.value as string[])

    // 2. Cargar buildsIndex
    const indexResult = await this.storage.get('registry:buildsIndex')
    /* v8 ignore next -- MemoryStorage.get non falla; rama defensiva para adapters con I/O */
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
        /* v8 ignore next -- loadEngineFromStorage non falla con MemoryStorage; rama defensiva */
        if (!loadResult.ok) return loadResult
        this.putInCache(userId, loadResult.value)
      }
    }
    // 'lru' ou 'on-demand': cero load eager; cargan lazy en getEngine

    // ── Reconstrución de accounting de bytes (só se maxStorageBytes activo) ──
    if (this.quotas?.maxStorageBytes !== undefined) {
      this.bytesUsed = 0
      this.bytesPerKey.clear()
      const listResult = await this.storage.list()
      /* v8 ignore next -- MemoryStorage.list non falla; defensivo para adapters con I/O */
      if (!listResult.ok) return listResult
      for (const key of listResult.value) {
        const getResult = await this.storage.get(key)
        /* v8 ignore next -- MemoryStorage.get non falla; defensivo para adapters con I/O */
        if (!getResult.ok) return getResult
        /* v8 ignore next -- MemoryStorage.get never returns null for listed keys; defensivo */
        if (getResult.value === null) continue
        const size = JSON.stringify(getResult.value).length
        this.bytesPerKey.set(key, size)
        this.bytesUsed += size
      }
    }

    return ok(undefined)
  }

  // ── Cleanup ──

  destroy(): void {
    this.cache.clear()
    this.userIds.clear()
    this.buildsIndex.clear()
    this.bytesUsed = 0
    this.bytesPerKey.clear()
  }

  // ── Private helpers ──

  // ── Quota accounting ──

  /**
   * Verifica permiso para unha acción mediante `this.permissions` se
   * está configurado. Devolve `err(PERMISSION_DENIED)` se o checker
   * devolve `false`. Devolve `ok(undefined)` se é `true` ou se
   * `this.permissions` é undefined (default open).
   *
   * @internal
   */
  private async checkPermission(action: PermissionAction, userId: string): Promise<Result<void>> {
    if (this.permissions === undefined) {
      return ok(undefined)
    }
    const result = await this.permissions.check(action, userId)
    if (result === false) {
      return err(
        new YggdrasilError(
          ErrorCode.PERMISSION_DENIED,
          getErrorMessage(ErrorCode.PERMISSION_DENIED, this.locale, { action, userId }),
        ),
      )
    }
    return ok(undefined)
  }

  /**
   * Wrapper de `storage.set` con quota check. Se quotas.maxStorageBytes
   * está definido, pesa o valor con `JSON.stringify(value).length`,
   * comproba se a operación excedería o límite, e só procede se cabe.
   * Se non hai quotas activas, delega directo a storage.set (cero
   * overhead, cero tracking).
   *
   * @internal
   */
  private async quotaCheckedSet(key: string, value: unknown): Promise<Result<void>> {
    const maxBytes = this.quotas?.maxStorageBytes
    if (maxBytes === undefined) {
      return this.storage.set(key, value)
    }

    const newSize = JSON.stringify(value).length
    const previousSize = this.bytesPerKey.get(key) ?? 0
    const projectedTotal = this.bytesUsed - previousSize + newSize

    if (projectedTotal > maxBytes) {
      return err(
        new YggdrasilError(
          ErrorCode.QUOTA_STORAGE_EXCEEDED,
          getErrorMessage(ErrorCode.QUOTA_STORAGE_EXCEEDED, this.locale, {
            current: projectedTotal,
            max: maxBytes,
          }),
        ),
      )
    }

    const setResult = await this.storage.set(key, value)
    /* v8 ignore next -- MemoryStorage.set non falla; defensivo para adapters con I/O */
    if (!setResult.ok) return setResult

    // Actualizar accounting só tras escrita exitosa
    this.bytesPerKey.set(key, newSize)
    this.bytesUsed = projectedTotal
    return ok(undefined)
  }

  /**
   * Wrapper de `storage.delete` con accounting de bytes. Se hai cota
   * de bytes activa, resta o tamaño previo da clave. Se non, delega
   * directo.
   *
   * @internal
   */
  private async quotaCheckedDelete(key: string): Promise<Result<void>> {
    if (this.quotas?.maxStorageBytes === undefined) {
      return this.storage.delete(key)
    }

    const deleteResult = await this.storage.delete(key)
    /* v8 ignore next -- MemoryStorage.delete non falla; defensivo para adapters con I/O */
    if (!deleteResult.ok) return deleteResult

    /* v8 ignore next 5 -- previousSize=0 cando a clave non foi rastreada previamente (defensivo) */
    const previousSize = this.bytesPerKey.get(key) ?? 0
    if (previousSize > 0) {
      this.bytesUsed -= previousSize
      this.bytesPerKey.delete(key)
    }
    return ok(undefined)
  }

  /**
   * Convención autoritativa de "unlocked" reutilizada de TreeEngine
   * (TreeEngine.ts liñas 583, 813, 1203).
   */
  private isUnlocked(instance: NodeInstance): boolean {
    return instance.state === 'unlocked' || instance.state === 'maxed'
  }

  /**
   * Le TreeState de cada userId rexistrado directamente desde storage.
   *
   * **Sen instanciar TreeEngines** (decisión MASTER §5.6.5). Best-effort:
   * se algún userId falla a ler (storage error ou null), skip silencioso.
   * Devolve un Map con só os userIds cuxo state se conseguiu cargar
   * correctamente.
   *
   * **Precondición**: para que aggregate reflicte estado actual, o
   * consumidor debe ter chamado `save()` previamente. Engines en cache
   * aínda non persistidos non contan. En estratexia 'on-demand' isto
   * cúmplese automaticamente (createEngine persiste in situ); en
   * 'all-in-memory' e 'lru' require save() explícito tras mutacións.
   */
  private async loadAllStates(): Promise<Map<string, TreeState>> {
    const states = new Map<string, TreeState>()
    for (const userId of this.userIds) {
      const result = await this.storage.get(`engine:${userId}:state`)
      /* v8 ignore next -- MemoryStorage.get non falla; rama defensiva para adapters con I/O */
      if (!result.ok) continue
      if (result.value === null) continue
      states.set(userId, result.value as TreeState)
    }
    return states
  }

  private putInCache(userId: string, engine: TreeEngine): void {
    // Para 'on-demand', cero gardar no cache
    if (this.cacheConfig.strategy === 'on-demand') {
      return
    }

    const now = Date.now()
    this.cache.set(userId, { engine, lastAccessAt: now })

    // LRU evict se excedido
    if (this.cacheConfig.strategy === 'lru') {
      this.evictLRU()
    }
  }

  private evictLRU(): void {
    const maxInMemory = this.cacheConfig.maxInMemory ?? DEFAULT_MAX_IN_MEMORY
    while (this.cache.size > maxInMemory) {
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
        /* v8 ignore next -- rama defensiva inalcanzable: cache sempre ten entries no while */
        break
      }
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    const ttlMs = this.cacheConfig.ttlMs
    if (ttlMs === undefined) {
      return false
    }
    return Date.now() - entry.lastAccessAt > ttlMs
  }

  private async persistEngine(userId: string, engine: TreeEngine): Promise<Result<void>> {
    return await this.quotaCheckedSet(`engine:${userId}:state`, engine.getSnapshot())
  }

  private async loadEngineFromStorage(userId: string): Promise<Result<TreeEngine>> {
    const stateResult = await this.storage.get(`engine:${userId}:state`)
    /* v8 ignore next -- MemoryStorage.get non falla; rama defensiva para adapters con I/O */
    if (!stateResult.ok) return stateResult

    const initialState = stateResult.value as TreeState | null
    const engine = new TreeEngine(this.treeDef, {
      locale: this.locale,
      ...(initialState !== null && { initialState }),
    })

    return ok(engine)
  }

  private generateBuildId(userId: string): string {
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    return `${userId}-${ts}-${rand}`
  }
}
// ── FIN: TreeRegistry ──
