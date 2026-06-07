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
import type { TreeEngine } from './TreeEngine.js'
import { mergeTreeDefWithOverrides } from './mergeTreeDefWithOverrides.js'

const DEFAULT_LOCALE: Locale = 'gl'
const DEFAULT_MAX_DEPTH = 10

/**
 * Factory que crea instancias de TreeEngine.
 *
 * SubtreeManager require unha factory inxectada (cero acoplamento
 * circular con TreeEngine). En 5.2, TreeEngine.getSubtreeEngine
 * pasará a si mesmo como factory ao construír SubtreeManager.
 */
export type TreeEngineFactory = (treeDef: TreeDef, initialState?: TreeState) => TreeEngine

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
   * SubtreeManagers dos sub-engines (en 5.2).
   *
   * NOTA: en 5.1 cero hai uso real porque cero hai recursión
   * (SubtreeManager non se crea desde dentro doutro SubtreeManager
   * aínda). Anticípase para 5.2.
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
 *
 * NOTA: en 5.1 SubtreeManager é standalone. Non modifica TreeEngine.
 * A integración real (TreeEngine.getSubtreeEngine, enterSubtree,
 * sincronización parent ↔ sub) vai en 5.2.
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
  private readonly cache = new Map<string, TreeEngine>()

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
    return this.cache.get(subtreeId) ?? null
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
   * 5. Procura o subtree_anchor NodeDef no parentTreeDef.nodes con
   *    `subtreeId` matching para obter `subtreeOverrides`. Se cero
   *    nodo o referencia, usa overrides vacíos.
   * 6. Aplicar subtreeOverrides ao TreeDef base usando
   *    mergeTreeDefWithOverrides.
   * 7. Recuperar estado inicial desde parentState.subtreeStates[
   *    subtreeId] se existe.
   * 8. Chamar engineFactory(mergedTreeDef, initialState).
   * 9. Cachear e devolver.
   */
  getOrCreateSubtree(subtreeId: string): Result<TreeEngine> {
    // 1. Cache check
    const cached = this.cache.get(subtreeId)
    if (cached !== undefined) {
      return ok(cached)
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
    const subEngine = this.engineFactory(mergedTreeDef, initialState)

    // 9. Cachear e devolver
    this.cache.set(subtreeId, subEngine)
    return ok(subEngine)
  }

  /**
   * Lista todos os subtreeIds con sub-engine creado.
   */
  listSubtrees(): readonly string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Destrúe o sub-engine para subtreeId (libera memoria). Devolve
   * true se había un sub-engine, false se non.
   */
  destroySubtree(subtreeId: string): boolean {
    return this.cache.delete(subtreeId)
  }

  /**
   * Conta de sub-engines vivos no cache.
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Limpa todos os sub-engines do cache.
   */
  clear(): void {
    this.cache.clear()
  }
}
