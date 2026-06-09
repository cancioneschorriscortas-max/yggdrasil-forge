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
import type { StorageAdapter } from '@yggdrasil-forge/storage'
import type { Build, TreeChange, TreeDef, TreeState } from '../types/index.js'
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

export interface TreeRegistryOptions {
  /** Storage adapter para persistir engines e builds. */
  readonly storage: StorageAdapter

  /** Configuración do cache de engines en memoria. */
  readonly cache: TreeRegistryCacheConfig

  /** Locale para mensaxes de erro. Default 'gl'. */
  readonly locale?: Locale
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

  constructor(treeDef: TreeDef, options: TreeRegistryOptions) {
    this.treeDef = treeDef
    this.storage = options.storage
    this.cacheConfig = options.cache
    this.locale = options.locale ?? DEFAULT_LOCALE
  }

  // ── Lifecycle ──

  async createEngine(userId: string, build?: Build): Promise<Result<TreeEngine>> {
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
    if (!this.userIds.has(userId)) {
      return ok(undefined) // idempotent
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

  // ── Build management ──

  /**
   * Garda un snapshot do state actual do engine do usuario como Build.
   * O build asígnaselle un id único e queda persistido en storage.
   *
   * Devolve o Build creado. Establece build.author = userId para
   * compatibilidade con importBuilds (que usa author como userId).
   */
  async saveBuild(userId: string, buildLabel?: LocalizedString): Promise<Result<Build>> {
    const engineResult = await this.getEngine(userId)
    if (!engineResult.ok) return engineResult

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

    const setResult = await this.storage.set(`build:${buildId}`, build)
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

    await this.storage.delete(`build:${buildId}`)
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

      await this.storage.set(`build:${build.id}`, build)

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
    await this.storage.set('registry:userIds', Array.from(this.userIds))

    // 2. Persistir buildsIndex (Map → plain object)
    const indexObj: Record<string, string[]> = {}
    for (const [userId, buildIds] of this.buildsIndex) {
      indexObj[userId] = Array.from(buildIds)
    }
    await this.storage.set('registry:buildsIndex', indexObj)

    // 3. Persistir engines segundo strategy
    if (this.cacheConfig.strategy === 'all-in-memory' || this.cacheConfig.strategy === 'lru') {
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

  async load(): Promise<Result<void>> {
    // 1. Cargar userIds
    const userIdsResult = await this.storage.get('registry:userIds')
    if (!userIdsResult.ok) return userIdsResult

    if (userIdsResult.value === null) {
      // Cero estado persistido aínda; estado limpo
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

    return ok(undefined)
  }

  // ── Cleanup ──

  destroy(): void {
    this.cache.clear()
    this.userIds.clear()
    this.buildsIndex.clear()
  }

  // ── Private helpers ──

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
    return await this.storage.set(`engine:${userId}:state`, engine.getSnapshot())
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

  private generateBuildId(userId: string): string {
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    return `${userId}-${ts}-${rand}`
  }
}
// ── FIN: TreeRegistry ──
