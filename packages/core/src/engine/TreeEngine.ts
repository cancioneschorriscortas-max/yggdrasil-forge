// ── INICIO: TreeEngine ──
// Fachada pública do motor. Envuelve StateStore, ResourceManager, EventEmitter
// e UnlockResolver. Expón getters síncronos (1.12) e mutacións async (1.13).

import { ErrorCode, type Locale, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type {
  Budget,
  EventMap,
  EventName,
  LockResult,
  NodeInstance,
  RespecResult,
  Result,
  TreeDef,
  TreeEngineOptions,
  TreeState,
  UnlockCheck,
  UnlockResult,
} from '../types/index.js'
import { err, ok } from '../types/index.js'
import { EventEmitter, type Unsubscribe } from './EventEmitter.js'
import { ResourceManager } from './ResourceManager.js'
import { StateStore } from './StateStore.js'
import { UnlockResolver, type UnlockResolverContext } from './UnlockResolver.js'

export class TreeEngine {
  private readonly store: StateStore
  private readonly locale: Locale
  private readonly readOnly: boolean
  private readonly events = new EventEmitter()
  private readonly resources: ResourceManager
  private readonly resolver = new UnlockResolver()

  constructor(treeDef: TreeDef, options?: TreeEngineOptions) {
    this.locale = options?.locale ?? 'gl'
    this.readOnly = options?.readOnly ?? false
    TreeEngine.validateTreeDef(treeDef, this.locale)
    this.store = new StateStore(treeDef)
    this.resources = new ResourceManager(treeDef.resources ?? [])
  }

  // ── Validación mínima do TreeDef (T3.b) ──
  // Non valida prerequisites/ciclos/edges en profundidade (iso é 1.17).
  private static validateTreeDef(treeDef: TreeDef, locale: Locale): void {
    if (treeDef === null || typeof treeDef !== 'object' || Array.isArray(treeDef)) {
      throw new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: 'treeDef debe ser un obxecto plano',
        }),
      )
    }
    if (typeof treeDef.id !== 'string' || treeDef.id.trim() === '') {
      throw new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: 'falta o campo id ou está baleiro',
        }),
      )
    }
    if (!Array.isArray(treeDef.nodes)) {
      throw new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: 'nodes debe ser un array',
        }),
      )
    }
    const seen = new Set<string>()
    for (const node of treeDef.nodes) {
      if (seen.has(node.id)) {
        throw new YggdrasilError(
          ErrorCode.INVALID_TREE_DEF,
          getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
            details: `id de nodo duplicado: "${node.id}"`,
          }),
        )
      }
      seen.add(node.id)
    }
  }

  // ── Subscrición a eventos (on/off) ──

  on<K extends EventName>(event: K, handler: EventMap[K]): Unsubscribe {
    return this.events.on(event, handler)
  }

  off<K extends EventName>(event: K, handler: EventMap[K]): void {
    this.events.off(event, handler)
  }

  // ── Getters síncronos (T3.c) ──

  getNodeState(nodeId: string): NodeInstance | null {
    const state = this.store.getState()
    return state.nodes[nodeId] ?? null
  }

  getAllNodeStates(): ReadonlyMap<string, NodeInstance> {
    const state = this.store.getState()
    return new Map(Object.entries(state.nodes))
  }

  getBudget(): Readonly<Budget> {
    return this.store.getState().budget
  }

  getProgress(nodeId: string): number {
    const node = this.getNodeState(nodeId)
    if (node === null) {
      return 0
    }
    return node.progress ?? 0
  }

  getTreeDef(): Readonly<TreeDef> {
    return this.store.getTreeDef()
  }

  getLocale(): Locale {
    return this.locale
  }

  isReadOnly(): boolean {
    return this.readOnly
  }

  getSnapshot(): TreeState {
    return this.store.getSnapshot()
  }

  getServerSnapshot(): TreeState {
    return this.store.getServerSnapshot()
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener)
  }

  // ── canUnlock: comprobación síncrona pura (T3) ──
  // Decisión: nodo xa unlocked/maxed → ok({ allowed: false, reason }) non err,
  // porque é información válida da comprobación, non un fallo do sistema.
  // err resérvase para nodo non encontrado (non se puido evaluar de ningún modo).
  canUnlock(nodeId: string): Result<UnlockCheck> {
    const treeDef = this.store.getTreeDef()
    const state = this.store.getState()

    const nodeDef = treeDef.nodes.find((n) => n.id === nodeId)
    if (nodeDef === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.NODE_NOT_FOUND,
          getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, { nodeId }),
        ),
      )
    }

    const instance = state.nodes[nodeId]
    const currentState = instance?.state ?? 'locked'

    // Xa desbloqueado ou maxed → non está permitido, pero non é un erro de sistema
    if (currentState === 'unlocked' || currentState === 'maxed') {
      return ok({
        allowed: false,
        reason: getErrorMessage(ErrorCode.NODE_ALREADY_UNLOCKED, this.locale, { nodeId }),
      })
    }

    // Nodo desactivado ou expirado → non permitido
    if (currentState === 'disabled' || currentState === 'expired') {
      return ok({
        allowed: false,
        reason: getErrorMessage(ErrorCode.INVALID_NODE_DEF, this.locale, {
          nodeId,
          details: `estado actual: ${currentState}`,
        }),
      })
    }

    // Comprobar prerequisites co UnlockResolver
    if (nodeDef.prerequisites !== undefined) {
      const ctx: UnlockResolverContext = { treeDef, state, locale: this.locale }
      const satisfied = this.resolver.evaluate(nodeDef.prerequisites, ctx)
      if (!satisfied) {
        return ok({
          allowed: false,
          reason: getErrorMessage(ErrorCode.PREREQUISITES_NOT_MET, this.locale, { nodeId }),
        })
      }
    }

    // Comprobar exclusións: se algún nodo excluído está unlocked/maxed → non permitido
    if (nodeDef.exclusions !== undefined) {
      for (const excludedId of nodeDef.exclusions) {
        const excludedInst = state.nodes[excludedId]
        const excludedState = excludedInst?.state
        if (excludedState === 'unlocked' || excludedState === 'maxed') {
          return ok({
            allowed: false,
            reason: getErrorMessage(ErrorCode.EXCLUSION_VIOLATION, this.locale, {
              nodeId,
              conflictId: excludedId,
            }),
          })
        }
      }
    }

    // Comprobar custo con ResourceManager
    const currentTier = instance?.currentTier ?? 0
    const costs = this.resources.getCostForTier(nodeDef, currentTier + 1)
    if (costs.length > 0) {
      const budget = state.budget
      const affordable = this.resources.canAfford(costs, budget)
      if (!affordable) {
        return ok({
          allowed: false,
          reason: getErrorMessage(ErrorCode.INSUFFICIENT_RESOURCES, this.locale, {
            needed: String(costs[0]?.amount ?? 0),
            resourceId: costs[0]?.resourceId ?? '',
            available: String(budget.resources[costs[0]?.resourceId ?? ''] ?? 0),
          }),
        })
      }
    }

    return ok({ allowed: true })
  }

  // ── unlock: mutación async (T4) ──
  async unlock(nodeId: string): Promise<Result<UnlockResult>> {
    if (this.readOnly) {
      return err(
        new YggdrasilError(
          ErrorCode.READ_ONLY_VIOLATION,
          getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
        ),
      )
    }

    // Verificar que o nodo existe antes de chamar canUnlock para distinguir erros
    const treeDef = this.store.getTreeDef()
    const nodeDef = treeDef.nodes.find((n) => n.id === nodeId)
    if (nodeDef === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.NODE_NOT_FOUND,
          getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, { nodeId }),
        ),
      )
    }

    const checkResult = this.canUnlock(nodeId)
    if (!checkResult.ok) {
      return checkResult
    }

    const check = checkResult.value
    if (!check.allowed) {
      // Derivar o código de erro máis específico baseado na razón
      const state = this.store.getState()
      const instance = state.nodes[nodeId]
      const currentState = instance?.state ?? 'locked'

      if (currentState === 'unlocked' || currentState === 'maxed') {
        return err(
          new YggdrasilError(
            ErrorCode.NODE_ALREADY_UNLOCKED,
            getErrorMessage(ErrorCode.NODE_ALREADY_UNLOCKED, this.locale, { nodeId }),
          ),
        )
      }

      // Comprobar se é por exclusión
      if (nodeDef.exclusions !== undefined) {
        for (const excludedId of nodeDef.exclusions) {
          const excl = state.nodes[excludedId]
          if (excl?.state === 'unlocked' || excl?.state === 'maxed') {
            return err(
              new YggdrasilError(
                ErrorCode.EXCLUSION_VIOLATION,
                getErrorMessage(ErrorCode.EXCLUSION_VIOLATION, this.locale, {
                  nodeId,
                  conflictId: excludedId,
                }),
              ),
            )
          }
        }
      }

      // Comprobar se é por recursos
      const currentTier = instance?.currentTier ?? 0
      const costs = this.resources.getCostForTier(nodeDef, currentTier + 1)
      if (costs.length > 0) {
        const affordable = this.resources.canAfford(costs, state.budget)
        if (!affordable) {
          return err(
            new YggdrasilError(
              ErrorCode.INSUFFICIENT_RESOURCES,
              getErrorMessage(ErrorCode.INSUFFICIENT_RESOURCES, this.locale, {
                needed: String(costs[0]?.amount ?? 0),
                resourceId: costs[0]?.resourceId ?? '',
                available: String(state.budget.resources[costs[0]?.resourceId ?? ''] ?? 0),
              }),
            ),
          )
        }
      }

      // Fallo por prerequisites
      return err(
        new YggdrasilError(
          ErrorCode.PREREQUISITES_NOT_MET,
          getErrorMessage(ErrorCode.PREREQUISITES_NOT_MET, this.locale, { nodeId }),
        ),
      )
    }

    // Calcular custo e aplicalo de forma atómica
    const state = this.store.getState()
    const instance = state.nodes[nodeId]
    const currentTier = instance?.currentTier ?? 0
    const targetTier = currentTier + 1
    const costs = this.resources.getCostForTier(nodeDef, targetTier)

    const budgetResult = this.resources.applyCost(costs, state.budget)
    if (!budgetResult.ok) {
      return budgetResult
    }

    const newBudget = budgetResult.value
    // maxed só cando maxTier está definido explicitamente e se alcanza
    const newNodeState =
      nodeDef.maxTier !== undefined && targetTier >= nodeDef.maxTier ? 'maxed' : 'unlocked'
    const now = Date.now()

    // Gardamos o budget anterior por recurso para emitir budgetChange
    const oldBudget = state.budget

    // Mutación atómica vía StateStore.update (Immer)
    this.store.update((draft) => {
      const node = draft.nodes[nodeId]
      if (node !== undefined) {
        node.state = newNodeState
        node.currentTier = targetTier
        node.unlockedAt = now
        node.history = [
          ...(node.history ?? []),
          { from: node.state, to: newNodeState, timestamp: now, reason: 'manual' },
        ]
      } else {
        draft.nodes[nodeId] = {
          id: nodeId,
          state: newNodeState,
          currentTier: targetTier,
          unlockedAt: now,
          history: [{ from: 'locked', to: newNodeState, timestamp: now, reason: 'manual' }],
        }
      }
      draft.budget = newBudget
    })

    // Construír a instancia actualizada para o evento (sabemos que existe tras o update)
    const newInstance: NodeInstance = this.store.getState().nodes[nodeId] ?? {
      id: nodeId,
      state: newNodeState,
      currentTier: targetTier,
    }

    // Emitir eventos tras a mutación exitosa
    for (const cost of costs) {
      const oldAmount = oldBudget.resources[cost.resourceId] ?? 0
      const newAmount = newBudget.resources[cost.resourceId] ?? 0
      if (oldAmount !== newAmount) {
        this.events.emit('budgetChange', cost.resourceId, oldAmount, newAmount)
      }
    }
    const prevNodeState = instance?.state ?? 'locked'
    this.events.emit('stateChange', nodeId, {
      from: prevNodeState,
      to: newNodeState,
      timestamp: now,
      reason: 'manual',
    })
    this.events.emit('unlock', nodeId, newInstance)

    return ok({ nodeId, newState: newNodeState, tier: targetTier, spent: costs })
  }

  // ── lock: mutación async (T4) ──
  // Limitación coñecida (1.13): non fai cascada de dependentes.
  // A cascada é responsabilidade de respec/applyChanges (1.14+).
  async lock(nodeId: string): Promise<Result<LockResult>> {
    if (this.readOnly) {
      return err(
        new YggdrasilError(
          ErrorCode.READ_ONLY_VIOLATION,
          getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
        ),
      )
    }

    const treeDef = this.store.getTreeDef()
    const nodeDef = treeDef.nodes.find((n) => n.id === nodeId)
    if (nodeDef === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.NODE_NOT_FOUND,
          getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, { nodeId }),
        ),
      )
    }

    const state = this.store.getState()
    const instance = state.nodes[nodeId]
    const currentNodeState = instance?.state ?? 'locked'

    // Só se pode lockear un nodo que estea unlocked ou maxed.
    // Decisión: non hai ErrorCode específico para "nodo non desbloqueado";
    // usamos INVALID_NODE_DEF con reason clara, que é o máis honesto.
    if (currentNodeState !== 'unlocked' && currentNodeState !== 'maxed') {
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_NODE_DEF,
          getErrorMessage(ErrorCode.INVALID_NODE_DEF, this.locale, {
            nodeId,
            details: `non se pode lockear un nodo en estado "${currentNodeState}"`,
          }),
        ),
      )
    }

    const currentTier = instance?.currentTier ?? 1
    const costs = this.resources.getTotalCost(nodeDef, 0, currentTier)
    const oldBudget = state.budget
    const newBudget = this.resources.refund(costs, oldBudget)
    const now = Date.now()

    this.store.update((draft) => {
      const node = draft.nodes[nodeId]
      if (node !== undefined) {
        node.state = 'locked'
        node.currentTier = 0
        Reflect.deleteProperty(node, 'unlockedAt')
        node.history = [
          ...(node.history ?? []),
          { from: currentNodeState, to: 'locked', timestamp: now, reason: 'manual' },
        ]
      }
      draft.budget = newBudget
    })

    // Construír a instancia actualizada para o evento
    const newInstance: NodeInstance = this.store.getState().nodes[nodeId] ?? {
      id: nodeId,
      state: 'locked',
      currentTier: 0,
    }

    // Emitir eventos
    for (const [resourceId, newAmount] of Object.entries(newBudget.resources)) {
      const oldAmount = oldBudget.resources[resourceId] ?? 0
      if (oldAmount !== newAmount) {
        this.events.emit('budgetChange', resourceId, oldAmount, newAmount)
      }
    }
    this.events.emit('stateChange', nodeId, {
      from: currentNodeState,
      to: 'locked',
      timestamp: now,
      reason: 'manual',
    })
    this.events.emit('lock', nodeId, newInstance)

    return ok({ nodeId, newState: 'locked', refunded: costs })
  }

  // ── respec: mutación async (T5) ──
  // Con nodeId: lock dese nodo + cascada de dependentes con prerequisites incumpridos.
  // Sen nodeId: respec total (todos os nodos unlocked/maxed volven a locked).
  // Atómico: unha soa StateStore.update para todo.
  async respec(nodeId?: string): Promise<Result<RespecResult>> {
    if (this.readOnly) {
      return err(
        new YggdrasilError(
          ErrorCode.READ_ONLY_VIOLATION,
          getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
        ),
      )
    }

    const treeDef = this.store.getTreeDef()
    const state = this.store.getState()
    const now = Date.now()

    // Determinar que nodos se van lockear
    let nodeIdsToLock: string[]

    if (nodeId === undefined) {
      // Respec total: todos os nodos en unlocked ou maxed
      nodeIdsToLock = Object.values(state.nodes)
        .filter((n) => n.state === 'unlocked' || n.state === 'maxed')
        .map((n) => n.id)
    } else {
      // Respec parcial: o nodo indicado + dependentes que quedan con prerequisites incumpridos
      const targetInst = state.nodes[nodeId]
      if (
        targetInst === undefined ||
        (targetInst.state !== 'unlocked' && targetInst.state !== 'maxed')
      ) {
        // Se o nodo non está desbloqueado, non hai nada que facer; devolve ok baleiro
        return ok({ nodeIds: [], refunded: [] })
      }

      nodeIdsToLock = [nodeId]

      // Detectar dependentes: nodos unlocked/maxed que teñen prerequisites que usan nodeId
      // Iteramos ata punto fixo para coller cascadas encadeadas
      let changed = true
      while (changed) {
        changed = false
        for (const candidateDef of treeDef.nodes) {
          if (nodeIdsToLock.includes(candidateDef.id)) continue
          const candidateInst = state.nodes[candidateDef.id]
          if (candidateInst?.state !== 'unlocked' && candidateInst?.state !== 'maxed') continue
          if (candidateDef.prerequisites === undefined) continue

          // Simular estado sen os nodos que xa vamos lockear
          const simulatedState: TreeState = {
            ...state,
            nodes: Object.fromEntries(
              Object.entries(state.nodes).map(([id, inst]) =>
                nodeIdsToLock.includes(id)
                  ? [id, { ...inst, state: 'locked' as const, currentTier: 0 }]
                  : [id, inst],
              ),
            ),
          }
          const ctx: UnlockResolverContext = { treeDef, state: simulatedState, locale: this.locale }
          const stillSatisfied = this.resolver.evaluate(candidateDef.prerequisites, ctx)
          if (!stillSatisfied) {
            nodeIdsToLock.push(candidateDef.id)
            changed = true
          }
        }
      }
    }

    if (nodeIdsToLock.length === 0) {
      return ok({ nodeIds: [], refunded: [] })
    }

    // Calcular refund acumulado de todos os nodos a lockear
    let accumulatedBudget = state.budget
    const allCosts: Array<{ resourceId: string; amount: number }> = []

    for (const id of nodeIdsToLock) {
      const inst = state.nodes[id]
      if (inst === undefined) continue
      const def = treeDef.nodes.find((n) => n.id === id)
      if (def === undefined) continue
      const tierCosts = this.resources.getTotalCost(def, 0, inst.currentTier)
      accumulatedBudget = this.resources.refund(tierCosts, accumulatedBudget)
      for (const c of tierCosts) {
        allCosts.push(c)
      }
    }

    const newBudget = accumulatedBudget
    const oldBudget = state.budget

    // Mutación atómica
    this.store.update((draft) => {
      for (const id of nodeIdsToLock) {
        const node = draft.nodes[id]
        if (node !== undefined) {
          const prevState = node.state
          node.state = 'locked'
          node.currentTier = 0
          Reflect.deleteProperty(node, 'unlockedAt')
          node.history = [
            ...(node.history ?? []),
            { from: prevState, to: 'locked', timestamp: now, reason: 'respec' },
          ]
        }
      }
      draft.budget = newBudget
    })

    // Emitir eventos
    for (const [resourceId, newAmount] of Object.entries(newBudget.resources)) {
      const oldAmount = oldBudget.resources[resourceId] ?? 0
      if (oldAmount !== newAmount) {
        this.events.emit('budgetChange', resourceId, oldAmount, newAmount)
      }
    }
    for (const id of nodeIdsToLock) {
      const prevInst = state.nodes[id]
      if (prevInst !== undefined) {
        this.events.emit('stateChange', id, {
          from: prevInst.state,
          to: 'locked',
          timestamp: now,
          reason: 'respec',
        })
      }
    }
    this.events.emit('respec', nodeIdsToLock)

    return ok({ nodeIds: nodeIdsToLock, refunded: allCosts })
  }
}
// ── FIN: TreeEngine ──
