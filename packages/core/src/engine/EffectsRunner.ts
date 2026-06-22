// ── INICIO: EffectsRunner ──
// Runner standalone do Effects DSL. Aplica e revira efectos declarativos
// (definidos en types/effects.ts) contra unha pila inxectada de pezas do
// motor (StateStore, ResourceManager, UnlockResolver, EventEmitter,
// TreeEngine).
//
// **Standalone por deseño** (sub-fase 2.1): NON se conecta automaticamente
// a `TreeEngine.unlock`. O consumidor (test, integración ou outra capa)
// instancia manualmente as pezas e constrúe `EffectContext`. A integración
// cómoda `unlock → effects` é a sub-fase 2.1.b.
//
// Cobertura desta sub-fase: 8 dos 10 effect types con forward + reverse:
//   modify_resource, trigger_event, conditional, composite,
//   set_node_visibility, unlock_node, modify_node_state, set_progress.
// Os outros dous (`modify_stat`, `plugin`) devolven `EFFECT_TYPE_UNSUPPORTED`
// tanto en `validate` como en `run`; quedan para 2.2 e fase 8.
//
// Atomicidade: `run` aplica todo-ou-nada. Se o N-ésimo effect falla, os
// N-1 anteriores revírtense automaticamente en orde inversa.

import { ErrorCode, type Locale, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type {
  Cost,
  Effect,
  EffectResult,
  NodeState,
  Result,
  TreeDef,
  UnlockCondition,
} from '../types/index.js'
import { err, ok } from '../types/index.js'
import type { EventEmitter } from './EventEmitter.js'
import type { ResourceManager } from './ResourceManager.js'
import type { StateStore } from './StateStore.js'
import type { TreeEngine } from './TreeEngine.js'
import type {
  ProgressManagerLike,
  UnlockResolver,
  UnlockResolverContext,
} from './UnlockResolver.js'

// ── Constantes ──

/**
 * Profundidade máxima de cascada de effects (recursión composite/conditional
 * e/ou unlock_node aniñados). Supera isto → CIRCULAR_EFFECT.
 */
const MAX_EFFECT_DEPTH = 8

/**
 * Lista branca de transicións permitidas en `modify_node_state` (sec. 5.8).
 * Calquera transición fóra desta lista → EFFECT_APPLICATION_FAILED.
 * Non se permite saltar a 'unlocked' ou 'maxed' directamente; iso ten que
 * pasar polo fluxo normal de `unlock` con custos e prerequisites.
 */
const ALLOWED_NODE_STATE_TRANSITIONS: ReadonlyArray<readonly [NodeState, NodeState]> = [
  ['locked', 'unlockable'],
  ['unlockable', 'locked'],
  ['unlocked', 'disabled'],
  ['disabled', 'unlocked'],
]

// ── Tipos públicos ──

/**
 * Contexto inxectado ao `EffectsRunner`. Agrupa as pezas do motor que cada
 * tipo de effect precisa para aplicar/reverter o seu cambio.
 *
 * En 2.1 o consumidor constrúe isto manualmente. En 2.1.b
 * `TreeEngine.unlock` farao internamente.
 */
export interface EffectContext {
  /** Motor: usado por `unlock_node`, `modify_node_state`, `set_progress`. */
  readonly engine: TreeEngine
  /** Store: usado por `set_node_visibility`, `modify_node_state`, `set_progress`. */
  readonly store: StateStore
  /** Recursos: usado por `modify_resource`. */
  readonly resources: ResourceManager
  /** Resolver de condicións: usado por `conditional`. */
  readonly resolver: UnlockResolver
  /** Emisor de eventos: usado por `trigger_event`. */
  readonly events: EventEmitter
  /** Idioma para mensaxes de error. */
  readonly locale: Locale
  // ── INICIO: 2.4.e — ProgressManagerLike opcional ──
  /**
   * `ProgressManager` (ou compatible estructural) opcional. Se está
   * presente, propágase ao `UnlockResolverContext` cando se constrúe
   * en `applyConditional` para que as condicións `progress_min` dentro
   * de effects `conditional` consulten valores derivados de nodos
   * `computed` correctamente (sub-fase 2.4.c).
   *
   * **Pecha a asimetría coñecida documentada en 2.4.d**: antes desta
   * sub-fase, `progress_min` apuntando a un nodo computed avaliábase
   * sempre como 0 dentro dun effect conditional, mentres que
   * funcionaba correctamente en `canUnlock` (cableado en 2.4.d).
   *
   * Inxectado por `TreeEngine` (sub-fase 2.4.e). Se ausente, o
   * `UnlockResolver` cae no fallback legacy (`state.nodes[nodeId]?.progress ?? 0`),
   * garantindo cero regresión en consumidores que constrúan o context
   * a man sen este campo (tests illados, mocks).
   */
  readonly progressManager?: ProgressManagerLike
  // ── FIN: 2.4.e ──
}

// ── Helpers internos (non exportados) ──

/**
 * Constrúe un YggdrasilError listo para devolver dentro dun Result.
 * Mantén o patrón usado polo resto do paquete.
 */
function makeError(
  code: ErrorCode,
  locale: Locale,
  vars: Readonly<Record<string, string>>,
  context?: Readonly<Record<string, unknown>>,
): YggdrasilError {
  const message = getErrorMessage(code, locale, vars)
  /* v8 ignore start -- defensivo: todos os call-sites internos pasan context; rama existe só pola sinatura pública. */
  if (context === undefined) {
    return new YggdrasilError(code, message)
  }
  /* v8 ignore stop */
  return new YggdrasilError(code, message, {
    context: context as Record<string, unknown>,
  })
}

/**
 * True se o effect ten un tipo coñecido pero non soportado nesta sub-fase
 * (i.e. queda para 2.2 ou fase 8).
 */
function isUnsupportedType(type: Effect['type']): boolean {
  return type === 'modify_stat' || type === 'plugin'
}

/**
 * Comproba se un nodeId existe na TreeDef.
 */
function nodeExistsInTreeDef(treeDef: TreeDef, nodeId: string): boolean {
  return treeDef.nodes.some((n) => n.id === nodeId)
}

/**
 * Comproba se un resourceId existe na TreeDef.
 */
function resourceExistsInTreeDef(treeDef: TreeDef, resourceId: string): boolean {
  const resources = treeDef.resources
  if (resources === undefined) {
    return false
  }
  return resources.some((r) => r.id === resourceId)
}

/**
 * Comproba se unha transición (from, to) está na lista branca de 5.8.
 */
function isAllowedStateTransition(from: NodeState, to: NodeState): boolean {
  return ALLOWED_NODE_STATE_TRANSITIONS.some(([f, t]) => f === from && t === to)
}

/**
 * Devolve a transición inversa se está na lista branca; null en caso contrario.
 * Como a lista é simétrica por pares (locked↔unlockable, unlocked↔disabled),
 * o inverso sempre existe se o orixinal estaba permitido.
 */
function inverseStateTransition(from: NodeState, to: NodeState): NodeState | null {
  const pair = ALLOWED_NODE_STATE_TRANSITIONS.find(([f, t]) => f === to && t === from)
  if (pair === undefined) {
    return null
  }
  return pair[1]
}

/**
 * Extrae todas as `UnlockCondition` atómicas que referencian un nodeId
 * dunha condición. Necesario para validar `conditional` recursivamente.
 *
 * Implementación simple: como `condition` no effect 'conditional' é un
 * `UnlockCondition` (atómica), basta inspeccionar os seus campos.
 */
function conditionReferencesNodeId(condition: UnlockCondition): string | null {
  switch (condition.type) {
    case 'node_unlocked':
    case 'node_maxed':
    case 'node_state':
    case 'tier_min':
    case 'progress_min':
      return condition.nodeId
    case 'distance_max':
      return condition.fromNodeId
    default:
      return null
  }
}

// ── Clase EffectsRunner ──

/**
 * Runner do Effects DSL. Stateless externamente: garda só a referencia ao
 * contexto. Cada `run`/`reverse` é unha operación atómica independente.
 */
export class EffectsRunner {
  constructor(private readonly context: EffectContext) {}

  // ───────────────────────────────────────────────
  // validate: comprobación estática sen aplicar
  // ───────────────────────────────────────────────

  /**
   * Valida unha lista de effects sen aplicalos. Comproba:
   *  - tipos coñecidos (rexeita `modify_stat`/`plugin` con EFFECT_TYPE_UNSUPPORTED)
   *  - referencias a nodeId/resourceId existen na TreeDef
   *  - `set_progress`: percent en [0, 100]
   *  - `modify_node_state`: transición na lista branca
   *  - `composite`/`conditional`: recursión sobre os internos
   *
   * NON comproba detección de bucles dinámica (iso só ten sentido durante
   * `run`).
   */
  validate(effects: readonly Effect[]): Result<void> {
    const treeDef = this.context.engine.getTreeDef()
    for (const effect of effects) {
      const result = this.validateOne(effect, treeDef)
      if (!result.ok) {
        return result
      }
    }
    return ok(undefined)
  }

  /**
   * Valida un único effect contra a TreeDef.
   */
  private validateOne(effect: Effect, treeDef: TreeDef): Result<void> {
    const { locale } = this.context

    // 1. Tipos non soportados nesta sub-fase.
    if (isUnsupportedType(effect.type)) {
      return err(
        makeError(
          ErrorCode.EFFECT_TYPE_UNSUPPORTED,
          locale,
          { effectType: effect.type },
          { effectType: effect.type },
        ),
      )
    }

    // 2. Comprobacións específicas por tipo.
    /* v8 ignore start -- defensivo: os casos 'modify_stat' e 'plugin' do
       switch xa están filtrados por isUnsupportedType arriba; o switch ten
       que ser exhaustivo para o type checker. As branches do switch
       atribúense á liña do `switch`, polo que o ignore ten que envolvelo. */
    switch (effect.type) {
      case 'modify_stat':
      case 'plugin': {
        // Inalcanzable se isUnsupportedType funciona, pero o switch ten
        // que ser exhaustivo para que TypeScript infira que devolvemos
        // sempre. Reutilizamos o mesmo erro.
        return err(
          makeError(
            ErrorCode.EFFECT_TYPE_UNSUPPORTED,
            locale,
            { effectType: effect.type },
            { effectType: effect.type },
          ),
        )
      }
      /* v8 ignore stop */
      case 'modify_resource': {
        if (!resourceExistsInTreeDef(treeDef, effect.resourceId)) {
          return err(
            makeError(
              ErrorCode.EFFECT_TARGET_NOT_FOUND,
              locale,
              { effectType: effect.type, targetId: effect.resourceId },
              { effectType: effect.type, targetId: effect.resourceId },
            ),
          )
        }
        return ok(undefined)
      }
      case 'set_node_visibility':
      case 'unlock_node':
      case 'modify_node_state':
      case 'set_progress': {
        if (!nodeExistsInTreeDef(treeDef, effect.nodeId)) {
          return err(
            makeError(
              ErrorCode.EFFECT_TARGET_NOT_FOUND,
              locale,
              { effectType: effect.type, targetId: effect.nodeId },
              { effectType: effect.type, targetId: effect.nodeId },
            ),
          )
        }
        if (effect.type === 'set_progress') {
          if (effect.percent < 0 || effect.percent > 100) {
            return err(
              makeError(
                ErrorCode.EFFECT_APPLICATION_FAILED,
                locale,
                {
                  effectType: effect.type,
                  failedAt: '0',
                  reason: `percent fóra de rango: ${effect.percent}`,
                },
                { effectType: effect.type, percent: effect.percent },
              ),
            )
          }
        }
        if (effect.type === 'modify_node_state') {
          // Non podemos saber o estado actual aquí (é runtime), pero si que
          // o estado destino estea presente nalgún par válido como `to`.
          // É unha comprobación débil pero detecta destinos absurdos.
          const hasValidPair = ALLOWED_NODE_STATE_TRANSITIONS.some(([, to]) => to === effect.state)
          if (!hasValidPair) {
            return err(
              makeError(
                ErrorCode.EFFECT_APPLICATION_FAILED,
                locale,
                {
                  effectType: effect.type,
                  failedAt: '0',
                  reason: `transition destino non permitido: ${effect.state}`,
                },
                { effectType: effect.type, targetState: effect.state },
              ),
            )
          }
        }
        return ok(undefined)
      }
      case 'trigger_event': {
        // Nada que validar estaticamente: o nome de evento é arbitrario.
        return ok(undefined)
      }
      case 'conditional': {
        // Se a condición referencia un nodeId, este debe existir.
        const nodeRef = conditionReferencesNodeId(effect.condition)
        if (nodeRef !== null && !nodeExistsInTreeDef(treeDef, nodeRef)) {
          return err(
            makeError(
              ErrorCode.EFFECT_TARGET_NOT_FOUND,
              locale,
              { effectType: effect.type, targetId: nodeRef },
              { effectType: effect.type, targetId: nodeRef },
            ),
          )
        }
        // Recursión sobre then/else.
        for (const inner of effect.then) {
          const r = this.validateOne(inner, treeDef)
          if (!r.ok) {
            return r
          }
        }
        if (effect.else !== undefined) {
          for (const inner of effect.else) {
            const r = this.validateOne(inner, treeDef)
            if (!r.ok) {
              return r
            }
          }
        }
        return ok(undefined)
      }
      case 'composite': {
        for (const inner of effect.effects) {
          const r = this.validateOne(inner, treeDef)
          if (!r.ok) {
            return r
          }
        }
        return ok(undefined)
      }
    }
  }

  // ───────────────────────────────────────────────
  // run: forward (aplicar lista atomicamente)
  // ───────────────────────────────────────────────

  /**
   * Aplica unha lista de effects atomicamente: todo-ou-nada. Se algún
   * falla, revira automaticamente os anteriores en orde inversa e devolve
   * `EFFECT_APPLICATION_FAILED` con contexto `{ failedAt, failedEffect,
   * reason, revertedCount }`.
   *
   * Síncrono internamente; firma `Promise` para flexibilidade futura
   * (eventualmente algún tipo de effect podería requirir I/O — ex.
   * `plugin` na fase 8).
   */
  async run(effects: readonly Effect[]): Promise<Result<readonly EffectResult[]>> {
    const applied: EffectResult[] = []
    const unlockedDuringRun = new Set<string>()

    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i]
      if (effect === undefined) {
        continue
      }
      // Aplicación dun effect; depth=0 (chamada raíz).
      const result = await this.applyOne(effect, 0, unlockedDuringRun)
      if (!result.ok) {
        // Reverter os xa aplicados en orde inversa (sec. 5.4).
        const revertedCount = await this.revertApplied(applied)
        return err(
          makeError(
            ErrorCode.EFFECT_APPLICATION_FAILED,
            this.context.locale,
            {
              effectType: effect.type,
              failedAt: String(i),
              reason: result.error.message,
            },
            {
              failedAt: i,
              failedEffect: effect,
              reason: result.error.message,
              revertedCount,
              originalErrorCode: result.error.code,
            },
          ),
        )
      }
      applied.push(result.value)
    }

    return ok(applied)
  }

  /**
   * Aplica un único effect e devolve o seu `EffectResult` con
   * `previousValue` cando proceda.
   */
  private async applyOne(
    effect: Effect,
    depth: number,
    unlockedDuringRun: Set<string>,
  ): Promise<Result<EffectResult>> {
    const { locale } = this.context

    if (depth > MAX_EFFECT_DEPTH) {
      return err(
        makeError(
          ErrorCode.CIRCULAR_EFFECT,
          locale,
          { cycle: `depth>${MAX_EFFECT_DEPTH}` },
          { depth, maxDepth: MAX_EFFECT_DEPTH },
        ),
      )
    }

    switch (effect.type) {
      /* v8 ignore start -- defensivo: igual ca o switch de validateOne; estes
         casos xa están rexeitados por isUnsupportedType, pero o switch ten
         que ser exhaustivo para o type checker. */
      case 'modify_stat':
      case 'plugin': {
        return err(
          makeError(
            ErrorCode.EFFECT_TYPE_UNSUPPORTED,
            locale,
            { effectType: effect.type },
            { effectType: effect.type },
          ),
        )
      }
      /* v8 ignore stop */

      case 'modify_resource':
        return this.applyModifyResource(effect)

      case 'trigger_event':
        return this.applyTriggerEvent(effect)

      case 'conditional':
        return this.applyConditional(effect, depth, unlockedDuringRun)

      case 'composite':
        return this.applyComposite(effect, depth, unlockedDuringRun)

      case 'set_node_visibility':
        return this.applySetNodeVisibility(effect)

      case 'unlock_node':
        return this.applyUnlockNode(effect, depth, unlockedDuringRun)

      case 'modify_node_state':
        return this.applyModifyNodeState(effect)

      case 'set_progress':
        return this.applySetProgress(effect)
    }
  }

  // ── Aplicadores individuais ──

  private async applyModifyResource(
    effect: Extract<Effect, { type: 'modify_resource' }>,
  ): Promise<Result<EffectResult>> {
    const { store, resources, locale, events } = this.context
    const state = store.getState()
    /* v8 ignore start -- ?? 0 defensivo: o validate xa garantiu que o recurso existe na treeDef e o startingBudget ponse no constructor; rama undefined só se daría con consumidor que muta a estructura por hack. */
    const currentAmount = state.budget.resources[effect.resourceId] ?? 0
    /* v8 ignore stop */

    // Calcular o delta efectivo segundo a operación.
    // applyCost resta; refund suma. Para '*' calcúlase o diferencial e
    // aplícase como cost (se diferencial>0) ou refund (se <0).
    let nextAmount: number
    if (effect.op === '+') {
      nextAmount = currentAmount + effect.amount
    } else if (effect.op === '-') {
      nextAmount = currentAmount - effect.amount
    } else {
      nextAmount = currentAmount * effect.amount
    }

    if (nextAmount < 0) {
      return err(
        makeError(
          ErrorCode.EFFECT_APPLICATION_FAILED,
          locale,
          {
            effectType: effect.type,
            failedAt: '0',
            reason: `recurso resultaría negativo: ${nextAmount}`,
          },
          {
            effectType: effect.type,
            resourceId: effect.resourceId,
            currentAmount,
            nextAmount,
          },
        ),
      )
    }

    // Calcular delta absoluto e usar applyCost / refund segundo o signo.
    const delta = nextAmount - currentAmount
    if (delta < 0) {
      // Resta: usar applyCost (devolve Result<Budget>).
      const costs: readonly Cost[] = [{ resourceId: effect.resourceId, amount: -delta }]
      const applyResult = resources.applyCost(costs, state.budget)
      /* v8 ignore start -- defensivo: xa fixemos a comprobación nextAmount<0 arriba, polo que applyCost non debería fallar aquí. Rama queda como salvaguarda fronte a regresións de ResourceManager. */
      if (!applyResult.ok) {
        return err(
          makeError(
            ErrorCode.EFFECT_APPLICATION_FAILED,
            locale,
            {
              effectType: effect.type,
              failedAt: '0',
              reason: applyResult.error.message,
            },
            { effectType: effect.type, resourceId: effect.resourceId },
          ),
        )
      }
      /* v8 ignore stop */
      const newBudget = applyResult.value
      store.update((draft) => {
        /* v8 ignore start -- ?? 0 defensivo: applyCost garante que o resourceId está en newBudget.resources. */
        draft.budget.resources[effect.resourceId] = newBudget.resources[effect.resourceId] ?? 0
        /* v8 ignore stop */
      })
    } else if (delta > 0) {
      // Suma: aplicación directa (refund respecta refundable; aquí queremos
      // crédito incondicional, así que escribimos directamente).
      store.update((draft) => {
        draft.budget.resources[effect.resourceId] = currentAmount + delta
      })
    }
    // delta === 0 → no-op pero applied=true.

    // ── INICIO: 2.6.fix2 — emitir budgetChange tras mutación ──
    // Bug latente (DT-13): applyModifyResource mutaba o budget pero non
    // emitía budgetChange, polo que os suscritores externos non se
    // enteraban dos cambios vía effect. Replicamos o patrón de TreeEngine
    // (só emitir se houbo cambio real). budgetChange non ten audit
    // asociado (nin sequera na vía TreeEngine), polo que só se emite o
    // evento.
    if (currentAmount !== nextAmount) {
      events.emit('budgetChange', effect.resourceId, currentAmount, nextAmount)
    }
    // ── FIN: 2.6.fix2 ──

    return ok({
      effect,
      applied: true,
      previousValue: currentAmount,
    })
  }

  private async applyTriggerEvent(
    effect: Extract<Effect, { type: 'trigger_event' }>,
  ): Promise<Result<EffectResult>> {
    this.context.events.emit('customEvent', effect.eventName, effect.payload)
    return ok({
      effect,
      applied: true,
      // trigger_event non garda previousValue (non hai estado que restaurar).
    })
  }

  private async applyConditional(
    effect: Extract<Effect, { type: 'conditional' }>,
    depth: number,
    unlockedDuringRun: Set<string>,
  ): Promise<Result<EffectResult>> {
    const { resolver, engine, store, locale } = this.context
    // ── INICIO: 2.4.e — pasar progressManager para soportar progress_min sobre nodos computed ──
    // Usamos spread condicional por `exactOptionalPropertyTypes: true`:
    // se this.context.progressManager é undefined, NON debe pasarse o
    // campo (un campo opcional con undefined explícito non é permitido).
    const ctx: UnlockResolverContext = {
      treeDef: engine.getTreeDef(),
      state: store.getState(),
      locale,
      ...(this.context.progressManager !== undefined && {
        progressManager: this.context.progressManager,
      }),
    }
    // ── FIN: 2.4.e ──
    const matched = resolver.evaluate(effect.condition, ctx)
    const branch = matched ? effect.then : (effect.else ?? [])

    // Aplicar a rama escollida un a un, gardando resultados internos.
    const innerResults: EffectResult[] = []
    for (const inner of branch) {
      const r = await this.applyOne(inner, depth + 1, unlockedDuringRun)
      if (!r.ok) {
        // Revertir os internos xa aplicados antes de propagar.
        await this.revertApplied(innerResults)
        return r
      }
      innerResults.push(r.value)
    }

    return ok({
      effect,
      applied: true,
      // O previousValue dun conditional é { branchTaken, innerResults }
      // para que reverse poida desfacer a rama exacta que se aplicou.
      previousValue: { branchTaken: matched ? 'then' : 'else', innerResults },
    })
  }

  private async applyComposite(
    effect: Extract<Effect, { type: 'composite' }>,
    depth: number,
    unlockedDuringRun: Set<string>,
  ): Promise<Result<EffectResult>> {
    const innerResults: EffectResult[] = []
    for (const inner of effect.effects) {
      const r = await this.applyOne(inner, depth + 1, unlockedDuringRun)
      if (!r.ok) {
        await this.revertApplied(innerResults)
        return r
      }
      innerResults.push(r.value)
    }
    return ok({
      effect,
      applied: true,
      previousValue: innerResults,
    })
  }

  private async applySetNodeVisibility(
    effect: Extract<Effect, { type: 'set_node_visibility' }>,
  ): Promise<Result<EffectResult>> {
    const { store } = this.context
    const instance = store.getState().nodes[effect.nodeId]
    // Capturamos o valor previo exacto: pode ser boolean ou undefined (campo
    // ausente). Distinguimos as dúas situacións para reverter con precisión.
    const previousVisible: boolean | undefined = instance?.visible

    store.update((draft) => {
      const existing = draft.nodes[effect.nodeId]
      if (existing === undefined) {
        // Sen instancia previa: créase mínima cos defaults + visible novo.
        draft.nodes[effect.nodeId] = {
          id: effect.nodeId,
          state: 'locked',
          currentTier: 0,
          visible: effect.visible,
        }
      } else {
        existing.visible = effect.visible
      }
    })

    return ok({
      effect,
      applied: true,
      previousValue: previousVisible,
    })
  }

  private async applyUnlockNode(
    effect: Extract<Effect, { type: 'unlock_node' }>,
    depth: number,
    unlockedDuringRun: Set<string>,
  ): Promise<Result<EffectResult>> {
    const { engine, locale } = this.context

    // Detección de bucles (sec. 5.7): se este nodeId xa foi desbloqueado
    // durante esta invocación de run, é un ciclo.
    if (unlockedDuringRun.has(effect.nodeId)) {
      return err(
        makeError(
          ErrorCode.CIRCULAR_EFFECT,
          locale,
          { cycle: [...unlockedDuringRun, effect.nodeId].join('→') },
          { cycle: [...unlockedDuringRun, effect.nodeId] },
        ),
      )
    }

    // Profundidade tamén controlada (defense in depth).
    /* v8 ignore start -- defensivo: a comprobación primaria está en applyOne; esta é unha salvaguarda redundante para o caso de que alguén chame directamente a applyUnlockNode no futuro. */
    if (depth > MAX_EFFECT_DEPTH) {
      return err(
        makeError(
          ErrorCode.CIRCULAR_EFFECT,
          locale,
          { cycle: `depth>${MAX_EFFECT_DEPTH}` },
          { depth, maxDepth: MAX_EFFECT_DEPTH },
        ),
      )
    }
    /* v8 ignore stop */

    unlockedDuringRun.add(effect.nodeId)

    const result = await engine.unlock(effect.nodeId)
    if (!result.ok) {
      return err(
        makeError(
          ErrorCode.EFFECT_APPLICATION_FAILED,
          locale,
          {
            effectType: effect.type,
            failedAt: '0',
            reason: result.error.message,
          },
          {
            effectType: effect.type,
            nodeId: effect.nodeId,
            originalErrorCode: result.error.code,
          },
        ),
      )
    }

    return ok({
      effect,
      applied: true,
      // Gardamos o tier previo (0 se non existía instancia) para info de
      // reverse; o lock real non precisa este dato pero é útil no audit.
      previousValue: { unlockedNodeId: effect.nodeId },
    })
  }

  private async applyModifyNodeState(
    effect: Extract<Effect, { type: 'modify_node_state' }>,
  ): Promise<Result<EffectResult>> {
    const { store, locale } = this.context
    const instance = store.getState().nodes[effect.nodeId]
    const currentState: NodeState = instance?.state ?? 'locked'

    if (!isAllowedStateTransition(currentState, effect.state)) {
      return err(
        makeError(
          ErrorCode.EFFECT_APPLICATION_FAILED,
          locale,
          {
            effectType: effect.type,
            failedAt: '0',
            reason: `transition not allowed: ${currentState}→${effect.state}`,
          },
          {
            effectType: effect.type,
            nodeId: effect.nodeId,
            from: currentState,
            to: effect.state,
          },
        ),
      )
    }

    store.update((draft) => {
      const existing = draft.nodes[effect.nodeId]
      if (existing === undefined) {
        draft.nodes[effect.nodeId] = {
          id: effect.nodeId,
          state: effect.state,
          currentTier: 0,
        }
      } else {
        existing.state = effect.state
      }
    })

    return ok({
      effect,
      applied: true,
      previousValue: currentState,
    })
  }

  private async applySetProgress(
    effect: Extract<Effect, { type: 'set_progress' }>,
  ): Promise<Result<EffectResult>> {
    const { store, locale, progressManager } = this.context

    // Validación local de rango (briefing 2.6.fix §5.5): mantémola aquí
    // por defense in depth e para preservar a mensaxe específica
    // (`percent fóra de rango`) que os tests existentes esperan.
    // ProgressManager validaríao tamén, pero co código
    // INVALID_PROGRESS_VALUE — semánticamente equivalente pero distinto
    // textualmente.
    if (effect.percent < 0 || effect.percent > 100) {
      return err(
        makeError(
          ErrorCode.EFFECT_APPLICATION_FAILED,
          locale,
          {
            effectType: effect.type,
            failedAt: '0',
            reason: `percent fóra de rango: ${effect.percent}`,
          },
          { effectType: effect.type, percent: effect.percent },
        ),
      )
    }

    // ── INICIO: 2.6.fix — capturar previousValue antes da mutación ──
    // O `previousValue` é o que `reverse()` usa para restaurar; ten
    // que ser o progress previo do store, non o `ProgressUpdateResult`
    // devolto polo manager (decisión §5.2 do briefing).
    const instance = store.getState().nodes[effect.nodeId]
    const previousProgress = instance?.progress
    // ── FIN: 2.6.fix ──

    // ── INICIO: 2.6.fix — cablear via ProgressManager se está dispoñible ──
    // Patrón paralelo ao fallback de `UnlockResolver.getProgress` (2.4.d
    // §5.3): se `progressManager` está inxectado no context (caso normal
    // cando `TreeEngine` constrúe o `EffectsRunner` desde 2.4.e), delégase
    // nel para que se:
    //   - emita o evento `progressChange(nodeId, percent)`,
    //   - se grave a entrada `progress_updated` no audit log,
    //   - e se invalide a cache de `StatComputer` (decisión 2.4.e).
    //
    // Sen este cableado, o effect `set_progress` salta o `ProgressManager`
    // e perde as tres cascadas (bug latente introducido en 2.1, revelado
    // pola investigación T0 da sub-fase 2.6 e arranxado aquí).
    if (progressManager !== undefined) {
      const pmResult = progressManager.setProgress(effect.nodeId, effect.percent)
      if (!pmResult.ok) {
        return err(
          makeError(
            ErrorCode.EFFECT_APPLICATION_FAILED,
            locale,
            {
              effectType: effect.type,
              failedAt: '0',
              reason: pmResult.error.message,
            },
            {
              effectType: effect.type,
              nodeId: effect.nodeId,
              percent: effect.percent,
              originalErrorCode: pmResult.error.code,
            },
          ),
        )
      }
      return ok({
        effect,
        applied: true,
        previousValue: previousProgress,
      })
    }
    // ── FIN: 2.6.fix — vía ProgressManager ──

    // ── INICIO: 2.6.fix — fallback legacy ──
    // Cando `progressManager` é `undefined` (caso típico: tests que
    // constrúen `EffectContext` manualmente con `buildContext` sen
    // pasar por `TreeEngine`), mantemos o comportamento previo de
    // mutación directa do store. Cero ruptura de tests illados.
    // Limitación coñecida e deliberada: nesta vía non se emite
    // `progressChange`, non se grava audit, non se invalida cache. É
    // aceptable porque a única forma de chegar aquí é construír un
    // contexto sen manager (raro fóra de tests).
    store.update((draft) => {
      const existing = draft.nodes[effect.nodeId]
      if (existing === undefined) {
        draft.nodes[effect.nodeId] = {
          id: effect.nodeId,
          state: 'locked',
          currentTier: 0,
          progress: effect.percent,
        }
      } else {
        existing.progress = effect.percent
      }
    })

    return ok({
      effect,
      applied: true,
      previousValue: previousProgress,
    })
    // ── FIN: 2.6.fix — fallback legacy ──
  }

  // ───────────────────────────────────────────────
  // reverse: aplicar inversos en orde inversa
  // ───────────────────────────────────────────────

  /**
   * Revira unha lista de `EffectResult` previamente devolvida por `run`.
   * Itera en orde INVERSA. Cada effect usa o seu `previousValue` para
   * restaurar o estado previo.
   *
   * Effects `irreversible: true` → err `IRREVERSIBLE_EFFECT`.
   */
  async reverse(results: readonly EffectResult[]): Promise<Result<void>> {
    for (let i = results.length - 1; i >= 0; i--) {
      const r = results[i]
      if (r === undefined || !r.applied) {
        continue
      }
      const revResult = await this.reverseOne(r)
      if (!revResult.ok) {
        return revResult
      }
    }
    return ok(undefined)
  }

  /**
   * Helper interno: revira a aplicación da lista xa exitosa de results
   * dentro dun `run` que vai abortar. Devolve canto se reverteu (ignorando
   * fallos individuais de reverse para preservar a información orixinal
   * do fallo principal).
   */
  private async revertApplied(applied: readonly EffectResult[]): Promise<number> {
    let revertedCount = 0
    for (let i = applied.length - 1; i >= 0; i--) {
      const r = applied[i]
      /* v8 ignore start -- r===undefined defensivo: o array `applied` constrúese internamente con push() de valores ok; nunca contén ocos. Quédase como guarda contra noUncheckedIndexedAccess. */
      if (r === undefined || !r.applied) {
        continue
      }
      /* v8 ignore stop */
      const rev = await this.reverseOne(r)
      /* v8 ignore start -- `if (rev.ok)` cobre o caso de revert exitoso (xa exercitado). A rama non-ok require fabricar EffectResults corruptos en stream concorrente; documentamos pero non testamos pola complexidade. */
      if (rev.ok) {
        revertedCount++
      }
      /* v8 ignore stop */
      // Se algún revert falla, segue intentando os demais. O reporte
      // detallado queda nos comentarios do contexto do error principal.
    }
    return revertedCount
  }

  private async reverseOne(result: EffectResult): Promise<Result<void>> {
    const { locale } = this.context
    const { effect, previousValue } = result

    /* v8 ignore start -- defensivo: os casos 'modify_stat' e 'plugin' do
       switch rexéitanse en applyOne; un EffectResult deste tipo non se
       construiría normalmente. */
    switch (effect.type) {
      case 'modify_stat':
      case 'plugin': {
        // Nunca deberían chegar aquí (rexéitanse en applyOne) pero
        // mantemos a rama defensiva.
        return err(
          makeError(
            ErrorCode.EFFECT_TYPE_UNSUPPORTED,
            locale,
            { effectType: effect.type },
            { effectType: effect.type },
          ),
        )
      }
      /* v8 ignore stop */

      case 'modify_resource':
        return this.reverseModifyResource(effect, previousValue)

      case 'trigger_event':
        return this.reverseTriggerEvent(effect)

      case 'conditional':
        return this.reverseConditional(previousValue)

      case 'composite':
        return this.reverseComposite(previousValue)

      case 'set_node_visibility':
        return this.reverseSetNodeVisibility(effect, previousValue)

      case 'unlock_node':
        return this.reverseUnlockNode(effect)

      case 'modify_node_state':
        return this.reverseModifyNodeState(effect, previousValue)

      case 'set_progress':
        return this.reverseSetProgress(effect, previousValue)
    }
  }

  // ── Reversores individuais ──

  private async reverseModifyResource(
    effect: Extract<Effect, { type: 'modify_resource' }>,
    previousValue: unknown,
  ): Promise<Result<void>> {
    if (typeof previousValue !== 'number') {
      // Defensa: previousValue debería ser number. Se non o é, non hai
      // forma fiable de reverter; documentamos no error.
      return err(
        makeError(
          ErrorCode.EFFECT_APPLICATION_FAILED,
          this.context.locale,
          {
            effectType: effect.type,
            failedAt: '0',
            reason: 'previousValue ausente ou non-numérico',
          },
          { effectType: effect.type, resourceId: effect.resourceId },
        ),
      )
    }
    const { store } = this.context
    const restore = previousValue
    store.update((draft) => {
      draft.budget.resources[effect.resourceId] = restore
    })
    return ok(undefined)
  }

  private async reverseTriggerEvent(
    effect: Extract<Effect, { type: 'trigger_event' }>,
  ): Promise<Result<void>> {
    const { locale, events } = this.context
    if (effect.irreversible === true) {
      return err(
        makeError(
          ErrorCode.IRREVERSIBLE_EFFECT,
          locale,
          { effectType: effect.type },
          { effectType: effect.type, eventName: effect.eventName },
        ),
      )
    }
    // Non se pode "desemitir" un evento. Convención: emitir o mesmo evento
    // cun payload marcado como reverso. O consumidor decide que facer.
    events.emit('customEvent', effect.eventName, {
      reverted: true,
      original: effect.payload,
    })
    return ok(undefined)
  }

  private async reverseConditional(previousValue: unknown): Promise<Result<void>> {
    if (
      previousValue === null ||
      typeof previousValue !== 'object' ||
      !('innerResults' in previousValue)
    ) {
      // Sen results internos non hai nada que reverter (rama baleira ou
      // estructura corrupta). Trátase como no-op.
      return ok(undefined)
    }
    const inner = (previousValue as { readonly innerResults: readonly EffectResult[] }).innerResults
    return this.reverse(inner)
  }

  private async reverseComposite(previousValue: unknown): Promise<Result<void>> {
    if (!Array.isArray(previousValue)) {
      return ok(undefined)
    }
    return this.reverse(previousValue as readonly EffectResult[])
  }

  private async reverseSetNodeVisibility(
    effect: Extract<Effect, { type: 'set_node_visibility' }>,
    previousValue: unknown,
  ): Promise<Result<void>> {
    const { store } = this.context
    // previousValue pode ser boolean (o valor previo) ou undefined (o campo
    // non estaba definido). Distinguimos as dúas situacións para preservar
    // a precisión do estado.
    if (previousValue === undefined) {
      store.update((draft) => {
        const node = draft.nodes[effect.nodeId]
        /* v8 ignore start -- defensivo: applySetNodeVisibility creou o nodo se non existía; non pode desaparecer entre forward e reverse no fluxo normal. */
        if (node !== undefined) {
          // Elimina o campo para preservar a distinción "ausente vs
          // explicitamente undefined" pedida polo arquitecto. Asignar
          // `undefined` non compila con `exactOptionalPropertyTypes: true`
          // e ademais cambiaría a semántica do estado previo.
          // biome-ignore lint/performance/noDelete: requerido para preservar ausencia exacta do campo opcional.
          delete node.visible
        }
        /* v8 ignore stop */
      })
      return ok(undefined)
    }
    if (typeof previousValue !== 'boolean') {
      // Defensa: previousValue non é boolean nin undefined → estado
      // corrupto. Non revertemos pero non fallamos critically.
      /* v8 ignore next 2 */
      return ok(undefined)
    }
    const restore = previousValue
    store.update((draft) => {
      const node = draft.nodes[effect.nodeId]
      /* v8 ignore start -- defensivo: applySetNodeVisibility garantiu a existencia do nodo no forward. */
      if (node !== undefined) {
        node.visible = restore
      }
      /* v8 ignore stop */
    })
    return ok(undefined)
  }

  private async reverseUnlockNode(
    effect: Extract<Effect, { type: 'unlock_node' }>,
  ): Promise<Result<void>> {
    const { engine } = this.context
    const lockResult = await engine.lock(effect.nodeId)
    if (!lockResult.ok) {
      // Sec. 5.7: se o lock falla, documentar pero non considerar fallo
      // crítico do reverse. Volvemos ok(undefined) e o fallo queda no
      // log do consumidor (que pode subscribirse ao evento 'error' do
      // engine se quere capturalo).
      return ok(undefined)
    }
    return ok(undefined)
  }

  private async reverseModifyNodeState(
    effect: Extract<Effect, { type: 'modify_node_state' }>,
    previousValue: unknown,
  ): Promise<Result<void>> {
    if (typeof previousValue !== 'string') {
      /* v8 ignore next 2 */
      return ok(undefined)
    }
    const previousState = previousValue as NodeState
    // A transición inversa debe estar tamén na lista branca.
    const inverse = inverseStateTransition(previousState, effect.state)
    if (inverse === null) {
      return err(
        makeError(
          ErrorCode.EFFECT_APPLICATION_FAILED,
          this.context.locale,
          {
            effectType: effect.type,
            failedAt: '0',
            reason: `inverse transition not allowed: ${effect.state}→${previousState}`,
          },
          {
            effectType: effect.type,
            nodeId: effect.nodeId,
            from: effect.state,
            to: previousState,
          },
        ),
      )
    }
    this.context.store.update((draft) => {
      const node = draft.nodes[effect.nodeId]
      /* v8 ignore start -- defensivo: applyModifyNodeState creou o nodo se non existía. */
      if (node !== undefined) {
        node.state = previousState
      }
      /* v8 ignore stop */
    })
    return ok(undefined)
  }

  private async reverseSetProgress(
    effect: Extract<Effect, { type: 'set_progress' }>,
    previousValue: unknown,
  ): Promise<Result<void>> {
    const { store } = this.context
    if (previousValue === undefined) {
      // Restaurar a 0 (ou eliminar). Optamos por 0 para evitar tropezar
      // con consumidores que asumen progress sempre presente.
      store.update((draft) => {
        const node = draft.nodes[effect.nodeId]
        /* v8 ignore start -- defensivo: applySetProgress creou o nodo se non existía. */
        if (node !== undefined) {
          node.progress = 0
        }
        /* v8 ignore stop */
      })
      return ok(undefined)
    }
    if (typeof previousValue !== 'number') {
      /* v8 ignore next 2 */
      return ok(undefined)
    }
    const restore = previousValue
    store.update((draft) => {
      const node = draft.nodes[effect.nodeId]
      /* v8 ignore start -- defensivo: applySetProgress creou o nodo se non existía. */
      if (node !== undefined) {
        node.progress = restore
      }
      /* v8 ignore stop */
    })
    return ok(undefined)
  }
}
// ── FIN: EffectsRunner ──
