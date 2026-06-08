import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { TreeDef, TreeState } from '../types/tree.js'
import type { Unsubscribe } from './EventEmitter.js'
import type { TreeEngine } from './TreeEngine.js'
import { mergeTreeDefWithOverrides } from './mergeTreeDefWithOverrides.js'

const DEFAULT_LOCALE: Locale = 'gl'
const DEFAULT_MAX_DEPTH = 10

// ── INICIO: 5.2 — TreeEngineFactoryContext ──

/**
 * Contexto pasado á factory cando SubtreeManager crea un sub-engine.
 * Permite á factory propagar o subtreeId e os activeSubtreeIds
 * ao constructor do sub-engine para cycle detection recursivo.
 */
export interface TreeEngineFactoryContext {
  /** Subtree id que se está creando. */
  readonly subtreeId: string
  /** Set de subtreeIds activos no nivel ancestral. */
  readonly parentActiveIds: ReadonlySet<string>
}

// ── FIN: 5.2 — TreeEngineFactoryContext ──

/**
 * Factory que crea instancias de TreeEngine.
 *
 * SubtreeManager require unha factory inxectada (cero acoplamento
 * circular con TreeEngine). En 5.2, TreeEngine.enterSubtree
 * pasa a si mesmo como factory ao construír SubtreeManager.
 *
 * O terceiro parámetro `context` é opcional (cero ruptura con 5.1).
 */
export type TreeEngineFactory = (
  treeDef: TreeDef,
  initialState?: TreeState,
  context?: TreeEngineFactoryContext,
) => TreeEngine

// ── INICIO: 5.2 — SubtreeCacheEntry ──

/** Entrada do cache interno: engine + cleanup handle. */
interface SubtreeCacheEntry {
  readonly engine: TreeEngine
  readonly unsubscribe: Unsubscribe | null
}

// ── FIN: 5.2 — SubtreeCacheEntry ──

/**
 * Opcións de configuración do SubtreeManager.
 */
export interface SubtreeManagerOptions {
  /**
   * TreeDef do parent. Necesario para resolver subtreeId →
   * `parentTreeDef.subtrees[subtreeId]`.
   */
  readonly parentTreeDef: TreeDef

  /**
   * Estado runtime do parent. Necesario para inicializar sub-engines
   * con `parentState.subtreeStates[subtreeId]` se xa existe.
   */
  readonly parentState: TreeState

  /**
   * Factory para crear sub-engines.
   */
  readonly engineFactory: TreeEngineFactory

  /**
   * Profundidade desta instancia de SubtreeManager. Default 0 (para
   * o do parent principal). Sub-engines crean o seu SubtreeManager
   * con depth+1.
   */
  readonly depth?: number

  /**
   * Máxima profundidade permitida. Default 10. Cando getOrCreateSubtree
   * intenta crear un sub-engine que excedería este límite, devolve
   * err(SUBTREE_DEPTH_EXCEEDED).
   */
  readonly maxDepth?: number

  /**
   * Locale para mensaxes de erro. Default 'gl'.
   */
  readonly locale?: Locale

  /**
   * Set de subtreeIds activos na cadea recursiva ancestral. Usado
   * para cycle detection. Cero pasar desde o consumidor inicial
   * (default Set vacío); SubtreeManager interno propágao aos
   * SubtreeManagers dos sub-engines.
   */
  readonly activeSubtreeIds?: ReadonlySet<string>
}

/**
 * Xestor do lifecycle de sub-engines (TreeEngine instances para
 * sub-trees aniñadas).
 *
 * Responsabilidades:
 * - Creación lazy de sub-engines ao primeiro acceso.
 * - Cache: o mesmo subtreeId devolve sempre a mesma instance.
 * - Verificación de profundidade (maxDepth).
 * - Detección de ciclos (subtreeId que se referencia a si mesmo
 *   nunha cadea ancestral).
 * - Xestión de Unsubscribe handles para memory leak prevention
 *   (5.2: destroySubtree e clear liberan listeners).
 *
 * Patrón paralelo a MigrationRegistry, LayoutEngineRegistry,
 * Reconciler: peza standalone reutilizable por TreeEngine cando
 * sexa necesaria.
 */
export class SubtreeManager {
  private readonly parentTreeDef: TreeDef
  private readonly parentState: TreeState
  private readonly engineFactory: TreeEngineFactory
  private readonly depth: number
  private readonly maxDepth: number
  private readonly locale: Locale
  private readonly activeSubtreeIds: ReadonlySet<string>
  private readonly cache = new Map<string, SubtreeCacheEntry>()

  constructor(options: SubtreeManagerOptions) {
    this.parentTreeDef = options.parentTreeDef
    this.parentState = options.parentState
    this.engineFactory = options.engineFactory
    this.depth = options.depth ?? 0
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
    this.locale = options.locale ?? DEFAULT_LOCALE
    this.activeSubtreeIds = options.activeSubtreeIds ?? new Set()
  }

  /**
   * Devolve o sub-engine xa creado para subtreeId, ou null se non
   * foi creado aínda. Lookup pasivo.
   */
  getExistingSubtree(subtreeId: string): TreeEngine | null {
    return this.cache.get(subtreeId)?.engine ?? null
  }

  /**
   * Verifica se hai un sub-engine creado para subtreeId.
   */
  hasSubtree(subtreeId: string): boolean {
    return this.cache.has(subtreeId)
  }

  /**
   * Crea (ou devolve cached) un sub-engine para subtreeId.
   *
   * Validacións aplicadas (en orde):
   * 1. Cache check: se xa existe, devolve.
   * 2. Cycle check: se subtreeId está en `activeSubtreeIds`, devolve
   *    err(SUBTREE_CYCLE_DETECTED).
   * 3. Depth check: se `depth + 1 > maxDepth`, devolve
   *    err(SUBTREE_DEPTH_EXCEEDED).
   * 4. Existence check: se parentTreeDef.subtrees[subtreeId] non
   *    existe, devolve err(SUBTREE_NOT_FOUND).
   * 5. Procura o subtree_anchor NodeDef con `subtreeId` matching
   *    para obter `subtreeOverrides`.
   * 6. Aplicar subtreeOverrides ao TreeDef base.
   * 7. Recuperar estado inicial desde parentState.subtreeStates.
   * 8. Chamar engineFactory(mergedTreeDef, initialState, context).
   * 9. Cachear e devolver.
   */
  getOrCreateSubtree(subtreeId: string): Result<TreeEngine> {
    return this.createSubtreeInternal(subtreeId, null)
  }

  // ── INICIO: 5.2 — getOrCreateSubtreeWithSync ──

  /**
   * Como getOrCreateSubtree pero permite ao consumidor rexistrar
   * cleanup callback (Unsubscribe) que se chamará en destroySubtree
   * ou clear. Garda o handle internamente; o consumidor non precisa
   * lembralo.
   *
   * O callback `setupSync` recibe o engine creado e debe devolver
   * un Unsubscribe handle (normalmente procedente de subscribe).
   */
  getOrCreateSubtreeWithSync(
    subtreeId: string,
    setupSync: (engine: TreeEngine) => Unsubscribe,
  ): Result<TreeEngine> {
    return this.createSubtreeInternal(subtreeId, setupSync)
  }

  // ── FIN: 5.2 — getOrCreateSubtreeWithSync ──

  /**
   * Lista todos os subtreeIds con sub-engine creado.
   */
  listSubtrees(): readonly string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Destrúe o sub-engine para subtreeId (libera memoria e listener).
   * Devolve true se había un sub-engine, false se non.
   */
  destroySubtree(subtreeId: string): boolean {
    const entry = this.cache.get(subtreeId)
    if (entry === undefined) return false
    entry.unsubscribe?.()
    this.cache.delete(subtreeId)
    return true
  }

  /**
   * Conta de sub-engines vivos no cache.
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Limpa todos os sub-engines do cache (libera todos os listeners).
   */
  clear(): void {
    for (const entry of this.cache.values()) {
      entry.unsubscribe?.()
    }
    this.cache.clear()
  }

  // ── Lóxica interna compartida ──

  private createSubtreeInternal(
    subtreeId: string,
    setupSync: ((engine: TreeEngine) => Unsubscribe) | null,
  ): Result<TreeEngine> {
    // 1. Cache check
    const cached = this.cache.get(subtreeId)
    if (cached !== undefined) {
      return ok(cached.engine)
    }

    // 2. Cycle check
    if (this.activeSubtreeIds.has(subtreeId)) {
      return err(
        new YggdrasilError(
          ErrorCode.SUBTREE_CYCLE_DETECTED,
          getErrorMessage(ErrorCode.SUBTREE_CYCLE_DETECTED, this.locale, {
            subtreeId,
            chain: Array.from(this.activeSubtreeIds).join(' → '),
          }),
          { context: { subtreeId } },
        ),
      )
    }

    // 3. Depth check
    if (this.depth + 1 > this.maxDepth) {
      return err(
        new YggdrasilError(
          ErrorCode.SUBTREE_DEPTH_EXCEEDED,
          getErrorMessage(ErrorCode.SUBTREE_DEPTH_EXCEEDED, this.locale, {
            depth: this.depth + 1,
            maxDepth: this.maxDepth,
          }),
          { context: { depth: this.depth + 1, maxDepth: this.maxDepth } },
        ),
      )
    }

    // 4. Existence check
    const subtreeTemplate = this.parentTreeDef.subtrees?.[subtreeId]
    if (subtreeTemplate === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.SUBTREE_NOT_FOUND,
          getErrorMessage(ErrorCode.SUBTREE_NOT_FOUND, this.locale, {
            subtreeId,
          }),
          { context: { subtreeId } },
        ),
      )
    }

    // 5. Buscar subtree_anchor NodeDef que referencia este subtreeId
    const anchorNode = this.parentTreeDef.nodes.find((n) => n.subtreeId === subtreeId)
    const overrides = anchorNode?.subtreeOverrides ?? {}

    // 6. Aplicar overrides
    const mergedTreeDef = mergeTreeDefWithOverrides(subtreeTemplate, overrides)

    // 7. Recuperar estado inicial
    const initialState = this.parentState.subtreeStates?.[subtreeId]

    // 8. Crear sub-engine via factory
    // Context pasado só cando hai setupSync (integración con
    // TreeEngine en 5.2). getOrCreateSubtree standalone (5.1)
    // non pasa context para manter compatibilidade.
    const subEngine =
      setupSync !== null
        ? this.engineFactory(mergedTreeDef, initialState, {
            subtreeId,
            parentActiveIds: this.activeSubtreeIds,
          })
        : this.engineFactory(mergedTreeDef, initialState)

    // 9. Setup sync se procede, cachear e devolver
    const unsubscribe = setupSync !== null ? setupSync(subEngine) : null
    this.cache.set(subtreeId, { engine: subEngine, unsubscribe })
    return ok(subEngine)
  }
}
