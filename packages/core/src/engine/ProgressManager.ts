// ── INICIO: ProgressManager ──
// Peza standalone que xestiona o valor de progreso (0-100) dos nodos
// con `supportsProgress: true` e fonte `manual`. Sub-fase 2.4: NON
// está integrada en TreeEngine (iso é 2.4.b). Nesta sub-fase outras
// fontes (`remote` / `callback` / `event` / `computed`) rexéitanse
// con `PROGRESS_SOURCE_UNSUPPORTED`.
//
// Alcance EXACTO (briefing 2.4 §5.1):
//   - Só `ProgressSourceConfig { type: 'manual' }` admite setProgress.
//   - Calquera outra fonte (ou ausencia) → PROGRESS_SOURCE_UNSUPPORTED.
//
// FÓRA de alcance (briefing 2.4 §5.7 / §5.9 / §9):
//   - Auto-unlock cando progress=100: NUNCA muta NodeInstance.state.
//     O consumidor que queira ese comportamento implémentao no
//     wrapper despois de chamar a setProgress (ex):
//
//         const result = engine.setProgress(nodeId, percent)   // 2.4.b
//         if (result.ok && result.value.newPercent === 100) {
//           const can = await engine.canUnlock(nodeId)
//           if (can.ok && can.value.allowed) {
//             await engine.unlock(nodeId)
//           }
//         }
//
//   - Cero scheduling (setInterval/setTimeout) e cero handlers:
//     a peza é síncrona, determinista e cero I/O. Mesma filosofía
//     ca TimeManager (2.3).
//   - Validacións Zod sobre `progressMilestones` (rango / orde):
//     diferidas a futuro hardening do validador (§5.10).
//
// Transicións descendentes (briefing 2.4 §5.5):
//   setProgress(80) seguido de setProgress(40) está permitido sen
//   restricións. Cando o progress baixa, `crossedMilestones`
//   devólvese baleiro (semántica de "des-cruzar" non se define nesta
//   sub-fase).

import { ErrorCode, type Locale, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { NodeDef, TreeDef } from '../types/index.js'
import { type Result, err, ok } from '../types/result.js'
import type { AuditLogger } from './AuditLogger.js'
import type { EventEmitter } from './EventEmitter.js'
import type { StateStore } from './StateStore.js'

// ── INICIO: tipos públicos ──

/**
 * Contexto inxectado no ProgressManager.
 *
 * Consistente coas demais pezas standalone (StatComputer,
 * EffectsRunner, TimeManager): treeDef + store + events + audit +
 * locale. A integración real co `TreeEngine` (expoñer
 * `engine.setProgress`, etc.) é sub-fase aparte (2.4.b).
 */
export interface ProgressManagerContext {
  readonly treeDef: TreeDef
  readonly store: StateStore
  readonly events: EventEmitter
  readonly audit: AuditLogger
  readonly locale: Locale
}

/**
 * Resultado dun setProgress exitoso.
 *
 * - `oldPercent`: valor previo (0 se a instancia non existía).
 * - `newPercent`: valor novo realmente aplicado.
 * - `crossedMilestones`: milestones cruzados nesta chamada. Só se
 *   poboa cando o progress sobe (newPercent > oldPercent). Para
 *   bajadas e idempotencia → array baleiro.
 */
export interface ProgressUpdateResult {
  readonly nodeId: string
  readonly oldPercent: number
  readonly newPercent: number
  readonly crossedMilestones: readonly number[]
}

// ── FIN: tipos públicos ──

export class ProgressManager {
  private readonly context: ProgressManagerContext

  constructor(context: ProgressManagerContext) {
    this.context = context
  }

  /**
   * Establece o progreso dun nodo. Validacións na orde estricta do
   * briefing §5.4:
   *   1. NodeDef existe → senón NODE_NOT_FOUND.
   *   2. supportsProgress === true → senón PROGRESS_NOT_SUPPORTED.
   *   3. progressSource?.type === 'manual' → senón
   *      PROGRESS_SOURCE_UNSUPPORTED.
   *   4. percent finito e en [0, 100] → senón INVALID_PROGRESS_VALUE.
   * Cero excepcións propagadas; todo se devolve como Result.
   *
   * Idempotencia: se oldPercent === newPercent non se emite evento,
   * non se rexistra audit, non se muta o store. Devólvese ok cun
   * ProgressUpdateResult con crossedMilestones baleiro (§5.4 paso 2).
   */
  setProgress(nodeId: string, percent: number): Result<ProgressUpdateResult> {
    // ── 1. NodeDef existe ──
    const nodeDef = findNodeDef(this.context.treeDef, nodeId)
    if (nodeDef === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.NODE_NOT_FOUND,
          getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.context.locale, { nodeId }),
        ),
      )
    }

    // ── 2. supportsProgress === true ──
    if (nodeDef.supportsProgress !== true) {
      return err(
        new YggdrasilError(
          ErrorCode.PROGRESS_NOT_SUPPORTED,
          getErrorMessage(ErrorCode.PROGRESS_NOT_SUPPORTED, this.context.locale, { nodeId }),
        ),
      )
    }

    // ── 3. progressSource é 'manual' ──
    // Se `progressSource` está ausente, a intención do autor da
    // árbore é ambigua e tamén se rexeita (briefing §5.1).
    if (nodeDef.progressSource?.type !== 'manual') {
      return err(
        new YggdrasilError(
          ErrorCode.PROGRESS_SOURCE_UNSUPPORTED,
          getErrorMessage(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED, this.context.locale, { nodeId }),
        ),
      )
    }

    // ── 4. percent é finito e en [0, 100] ──
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_PROGRESS_VALUE,
          getErrorMessage(ErrorCode.INVALID_PROGRESS_VALUE, this.context.locale, {
            nodeId,
            percent,
          }),
        ),
      )
    }

    // ── Cálculo de oldPercent ──
    // Se a NodeInstance non existe aínda, oldPercent é 0 (briefing
    // §5.4 paso 4: nodo locked sen unlock previo é caso válido).
    const state = this.context.store.getState()
    const existingInstance = state.nodes[nodeId]
    const oldPercent = existingInstance?.progress ?? 0

    // ── Idempotencia ──
    if (oldPercent === percent) {
      return ok({
        nodeId,
        oldPercent,
        newPercent: percent,
        crossedMilestones: [],
      })
    }

    // ── Cálculo de crossedMilestones ──
    // Só cando o progress sobe (§5.5: para bajadas devólvese vacío).
    const crossedMilestones = computeCrossedMilestones(
      nodeDef.progressMilestones,
      oldPercent,
      percent,
    )

    // ── Mutación de estado ──
    // NON tocar NodeInstance.state baixo ningunha circunstancia
    // (§5.7). Só se actualiza o campo `progress`.
    this.context.store.update((draft) => {
      const node = draft.nodes[nodeId]
      if (node !== undefined) {
        node.progress = percent
      } else {
        // Crear instancia mínima (briefing §5.4 paso 4): nodo locked
        // que recibe progress antes de ningún unlock. Estado segue
        // 'locked'.
        draft.nodes[nodeId] = {
          id: nodeId,
          state: 'locked',
          currentTier: 0,
          progress: percent,
        }
      }
    })

    // ── Evento ──
    this.context.events.emit('progressChange', nodeId, percent)

    // ── Audit ──
    // Estrutura confirmada en T0: { type, nodeId, from, to }. Non hai
    // campo `crossedMilestones` no AuditAction; o consumidor recibe
    // esa info no ProgressUpdateResult devolto. `rollbackable: true`
    // porque un cambio de progress pódese reverter en respec.
    this.context.audit.record(
      {
        type: 'progress_updated',
        nodeId,
        from: oldPercent,
        to: percent,
      },
      { rollbackable: true },
    )

    return ok({
      nodeId,
      oldPercent,
      newPercent: percent,
      crossedMilestones,
    })
  }

  /**
   * Lee o progreso actual dun nodo. Cero excepcións: devolve 0 se o
   * nodo non ten progress definido, ou non existe, ou non existe a
   * instancia. Defensivo por deseño (§5.3).
   */
  getProgress(nodeId: string): number {
    const state = this.context.store.getState()
    return state.nodes[nodeId]?.progress ?? 0
  }

  /**
   * Devolve a lista de milestones xa alcanzados para un nodo,
   * baseándose no seu progress actual e no `progressMilestones` do
   * NodeDef. Útil para UI mostrar marcas conseguidas (§5.8).
   *
   * Cero side effects. Asume que `progressMilestones` vén xa
   * ordenado ascendentemente do TreeDef; NON se ordena aquí
   * internamente (responsabilidade do validador da TreeDef, §5.10).
   *
   * Defensivo: nodo inexistente ou sen milestones → array baleiro.
   */
  getReachedMilestones(nodeId: string): readonly number[] {
    const nodeDef = findNodeDef(this.context.treeDef, nodeId)
    if (nodeDef === undefined) {
      return []
    }
    const milestones = nodeDef.progressMilestones
    if (milestones === undefined || milestones.length === 0) {
      return []
    }
    const current = this.getProgress(nodeId)
    return milestones.filter((m) => m <= current)
  }
}

// ── INICIO: helpers a nivel de módulo ──

/**
 * Busca un NodeDef por id no array `treeDef.nodes`. Devolve
 * `undefined` se non existe. Helper privado: o índice por id non é
 * O(1) aquí (TreeDef.nodes é array) pero esta peza non se chama en
 * loops quentes, polo que linear é aceptable e consistente co resto
 * do motor (ver TreeEngine).
 */
function findNodeDef(treeDef: TreeDef, nodeId: string): NodeDef | undefined {
  return treeDef.nodes.find((n) => n.id === nodeId)
}

/**
 * Calcula os milestones cruzados ao pasar de `oldPercent` a
 * `newPercent`. Briefing §5.4 paso 3 + §5.5:
 *
 *   - Se `milestones` é undefined ou vacío → [].
 *   - Se newPercent <= oldPercent (sen movemento ou bajada) → [].
 *   - Senón, devolve os milestones en `(oldPercent, newPercent]`
 *     (exclusivo no inferior, inclusivo no superior).
 *
 * Tipo `NodeInstance` non é necesario aquí; só se usa para anotar
 * que esta función é a única responsable do cálculo deste campo no
 * `ProgressUpdateResult`.
 */
function computeCrossedMilestones(
  milestones: readonly number[] | undefined,
  oldPercent: number,
  newPercent: number,
): readonly number[] {
  if (milestones === undefined || milestones.length === 0) {
    return []
  }
  if (newPercent <= oldPercent) {
    return []
  }
  return milestones.filter((m) => m > oldPercent && m <= newPercent)
}

// ── FIN: helpers a nivel de módulo ──
// ── FIN: ProgressManager ──
