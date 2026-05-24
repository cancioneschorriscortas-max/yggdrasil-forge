// ── INICIO: ProgressManager ──
// Peza standalone que xestiona o valor de progreso (0-100) dos nodos
// con `supportsProgress: true`. Soporta DÚAS fontes:
//   - `manual`: o consumidor establece o valor con `setProgress`. O
//     valor persiste en `NodeInstance.progress` no store.
//   - `computed` (sub-fase 2.4.c): o valor DERIVA dinámicamente dunha
//     fórmula (`sum`/`avg`/`min`/`max`) sobre `dependsOn`. NON se
//     persiste no store; recalcúlase cada vez que se chama
//     `getProgress`. `setProgress` sobre un nodo computed devolve err
//     `INVALID_PROGRESS_OPERATION` (E022).
//
// Outras fontes (`remote` / `callback` / `event`) seguen FÓRA de
// alcance ata Fase 5 e rexéitanse con `PROGRESS_SOURCE_UNSUPPORTED`.
//
// FÓRA de alcance (briefings 2.4 §5.7 / §5.9 / §9; 2.4.c §5.10):
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
//   - Validacións Zod sobre `progressMilestones` (rango / orde) ou
//     `dependsOn` (existencia, sen ciclos): diferidas a futuro
//     hardening do validador.
//   - **Cero `progressChange` event para computed** (briefing 2.4.c
//     §5.10): cando o progress derivado dun nodo computed cambia
//     porque cambiou un dos seus `dependsOn`, NON se emite ningún
//     evento automático. A "cascada de eventos" require detectar
//     todos os nodos computed que dependen indirectamente do nodo
//     mutado, e o lifecycle de eventos encadeados é fonte de bugs.
//     **Patrón recomendado para consumidores**: escoita
//     `progressChange` para nodos `manual` e re-consulta manualmente
//     `getProgress` para os computed que dependan deles.
//   - **Cache do progress computed**: NON existe. Cada chamada a
//     `getProgress` sobre un nodo computed recalcula. Razóns: os
//     cálculos son triviais (lonxitude de `dependsOn` tipicamente
//     <10), e unha cache requiriría invalidación coherente que é
//     fonte de bugs. Optimización futura se aparecera evidencia de
//     problema (briefing 2.4.c §5.2).
//
// Transicións descendentes (briefing 2.4 §5.5):
//   setProgress(80) seguido de setProgress(40) está permitido sen
//   restricións. Cando o progress baixa, `crossedMilestones`
//   devólvese baleiro (semántica de "des-cruzar" non se define nesta
//   sub-fase).
//
// Limitación coñecida (briefing 2.4.c — diferida a 2.4.d):
//   `UnlockResolver` lee `NodeInstance.progress` directamente para
//   avaliar condicións `progress_min` ao desbloquear nodos. **Non
//   pasa por este ProgressManager**, polo que un `progress_min`
//   apuntando a un nodo `computed` segue lendo 0 (xa que computed
//   non persiste progress no state). Arranxo en sub-fase 2.4.d
//   (require cableado UnlockResolver ↔ ProgressManager con análise
//   da dependencia circular potencial: ProgressManager xa non
//   consulta UnlockResolver, pero a inversa crearía ciclo).

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

    // ── 3. progressSource é 'computed' → rexeitar (sub-fase 2.4.c §5.5) ──
    // Un computed non se establece manualmente; só se deriva. Permitir
    // `setProgress` sobre un computed crearía drift entre o valor
    // establecido e o derivado dinámicamente.
    if (nodeDef.progressSource?.type === 'computed') {
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_PROGRESS_OPERATION,
          getErrorMessage(ErrorCode.INVALID_PROGRESS_OPERATION, this.context.locale, { nodeId }),
        ),
      )
    }

    // ── 4. progressSource é 'manual' ──
    // Se `progressSource` está ausente, a intención do autor da
    // árbore é ambigua e tamén se rexeita (briefing §5.1). As fontes
    // `remote` / `callback` / `event` seguen rexeitándose ata Fase 5.
    if (nodeDef.progressSource?.type !== 'manual') {
      return err(
        new YggdrasilError(
          ErrorCode.PROGRESS_SOURCE_UNSUPPORTED,
          getErrorMessage(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED, this.context.locale, { nodeId }),
        ),
      )
    }

    // ── 5. percent é finito e en [0, 100] ──
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
   * Lee o progreso actual dun nodo. Cero excepcións: defensivo por
   * deseño. Resolución segundo `progressSource` (briefing 2.4.c §5.6):
   *
   *   - Nodo NON existe (sen NodeDef): devolve **0**.
   *   - `progressSource.type === 'manual'`: devolve
   *     `NodeInstance.progress ?? 0` (comportamento clásico de 2.4).
   *   - `progressSource.type === 'computed'`: **calcula dinámicamente**
   *     a partir de `dependsOn` e `formula` (algoritmo en
   *     `computeProgressFor`). Sen cache; recalcula cada chamada
   *     (briefing 2.4.c §5.2).
   *   - Calquera outro caso (remote / callback / event / ausente):
   *     devolve **0** ignorando o que houbera en
   *     `NodeInstance.progress` (briefing 2.4.c §5.6, decisión B1 do
   *     arquitecto). Coherente con "se non sabemos de onde vén o
   *     progress, devolvemos 0 sen lanzar".
   *
   * **Nota sobre composición computed→computed**: un `dependsOn` pode
   * apuntar a outro nodo computed. A resolución é recursiva e detecta
   * ciclos lazy con `Set<string>` (ver `computeProgressFor`). En
   * ciclo, devolve 0 para o ramo afectado sen lanzar.
   */
  getProgress(nodeId: string): number {
    return this.computeProgressFor(nodeId, new Set<string>())
  }

  /**
   * Helper privado recursivo para `getProgress`. Mantén un `Set` de
   * nodos en curso de cálculo para detectar ciclos. Ver briefing
   * 2.4.c §5.3 (algoritmo) e §5.4 (ciclos lazy).
   *
   * Garantías:
   *   - Cero excepcións. Casos anómalos → devolve 0.
   *   - Resultado final clampado a `[0, 100]` (defensa en
   *     profundidade, §5.3 paso 4).
   *   - O `Set` `inProgress` modifícase durante o cálculo (add/delete)
   *     pero ao saír do método o estado é o mesmo que á entrada (a
   *     mutación-restauración garántese mesmo en ciclos detectados).
   */
  private computeProgressFor(nodeId: string, inProgress: Set<string>): number {
    // ── Ciclo detectado (briefing 2.4.c §5.4) ──
    // Se este nodeId xa está sendo calculado máis arriba na pila
    // recursiva, romper aquí devolvendo 0 (cero excepcións).
    if (inProgress.has(nodeId)) {
      return 0
    }

    const nodeDef = findNodeDef(this.context.treeDef, nodeId)
    if (nodeDef === undefined) {
      return 0
    }

    const source = nodeDef.progressSource

    // ── Caso manual ──
    if (source?.type === 'manual') {
      const state = this.context.store.getState()
      return state.nodes[nodeId]?.progress ?? 0
    }

    // ── Caso computed: cálculo recursivo con detección de ciclos ──
    if (source?.type === 'computed') {
      inProgress.add(nodeId)
      try {
        // Filtrar `dependsOn` por existencia antes de aplicar fórmula
        // (briefing 2.4.c §5.3.2.a: "omitir" os inexistentes). Isto
        // importa especialmente para `min`/`max` — un dep inexistente
        // tratado como 0 contaminaría o resultado.
        const validDeps = source.dependsOn.filter(
          (depId) => findNodeDef(this.context.treeDef, depId) !== undefined,
        )
        return computeForFormula(source.formula, validDeps, (depId) =>
          this.computeProgressFor(depId, inProgress),
        )
      } finally {
        // Sempre restaurar o estado do Set ao saír (mesmo se algo
        // lanzase nun futuro — defensa).
        inProgress.delete(nodeId)
      }
    }

    // ── Caso remote / callback / event / ausente (briefing 2.4.c §5.6) ──
    // Devolvemos 0 ignorando NodeInstance.progress aínda que houbese
    // algo gravado (deserialización dun estado antigo, test, etc.).
    // Decisión B1 do arquitecto: coherencia semántica > preservar
    // datos "orfos" de fontes non soportadas.
    return 0
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

/**
 * Aplica unha fórmula `sum`/`avg`/`min`/`max` sobre os valores
 * resoltos dunha lista de `dependsOn`. Algoritmo briefing 2.4.c §5.3
 * + §5.7.
 *
 * **Precondición**: `dependsOn` xa debe estar filtrado por
 * existencia polo chamante (`computeProgressFor` faino con
 * `findNodeDef` antes de chamarnos). Isto importa especialmente para
 * `min`/`max` — un dep inexistente tratado como 0 contaminaría o
 * resultado.
 *
 * Lista efectiva baleira (`dependsOn.length === 0`, sexa porque o
 * autor a deixou baleira ou porque todos os deps foron filtrados
 * por inexistentes) → **0** para todas as fórmulas (briefing §5.7).
 * Evita `NaN` (`avg`), `Infinity` (`min`/`max` sobre array baleiro)
 * ou `-Infinity`.
 *
 * Resultado final clampado a `[0, 100]` (§5.3 paso 4): `sum` pode
 * pasar de 100 facilmente (varios deps ao 80 cada un); `min`/`max`/
 * `avg` sobre valores en `[0, 100]` xa están en `[0, 100]`
 * matemáticamente, pero o clamp adicional é defensa en
 * profundidade.
 */
function computeForFormula(
  formula: 'sum' | 'avg' | 'min' | 'max',
  dependsOn: readonly string[],
  resolve: (depId: string) => number,
): number {
  if (dependsOn.length === 0) {
    return 0
  }

  const values = dependsOn.map(resolve)

  let result: number
  switch (formula) {
    case 'sum':
      result = values.reduce((acc, v) => acc + v, 0)
      break
    case 'avg':
      // values.length >= 1 garantido (length===0 retornaba arriba).
      result = values.reduce((acc, v) => acc + v, 0) / values.length
      break
    case 'min':
      // Spread sobre array non baleiro: seguro.
      result = Math.min(...values)
      break
    case 'max':
      result = Math.max(...values)
      break
  }

  // Clamp defensivo final a [0, 100]. `sum` pode superar 100; o
  // límite inferior é defensa en profundidade (un dep manual nunca
  // debería ser negativo, pero a fórmula `sum` con números garante
  // un dominio de saída non negativo só se asumimos invariantes de
  // entrada — usamos clamp por seguridade).
  return Math.max(0, Math.min(100, result))
}
// ── FIN: ProgressManager ──
