// ── INICIO: TreeEngine ──
// Fachada pública do motor. Envuelve StateStore, ResourceManager, EventEmitter
// e UnlockResolver. Expón getters síncronos (1.12) e mutacións async (1.13).

import { ErrorCode, type Locale, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import { type Draft, castDraft } from 'immer'
import type {
  ApplyChangesResult,
  AuditAction,
  AuditEntry,
  AuditFilter,
  Budget,
  EventMap,
  EventName,
  LockResult,
  NodeInstance,
  RespecResult,
  Result,
  Selector,
  StateChange,
  TreeChange,
  TreeDef,
  TreeEngineOptions,
  TreeState,
  UnlockCheck,
  UnlockResult,
} from '../types/index.js'
import { err, ok } from '../types/index.js'
import { AuditLogger } from './AuditLogger.js'
import { type ChangeAnalysis, type ChangeConflict, analyzeChanges } from './ChangeTracker.js'
import { EventEmitter, type Unsubscribe } from './EventEmitter.js'
import { deserialize, serialize } from './JsonSerializer.js'
import { ResourceManager } from './ResourceManager.js'
import { StateStore } from './StateStore.js'
import { UnlockResolver, type UnlockResolverContext } from './UnlockResolver.js'
import type { InferredTreeDef } from './treeDefSchema.js'

export class TreeEngine {
  private readonly store: StateStore
  private readonly locale: Locale
  private readonly readOnly: boolean
  private readonly events = new EventEmitter()
  private readonly resources: ResourceManager
  private readonly resolver = new UnlockResolver()
  // Rexistro de auditoría. Desactivado por defecto (cero overhead).
  private readonly audit: AuditLogger

  constructor(treeDef: TreeDef, options?: TreeEngineOptions) {
    this.locale = options?.locale ?? 'gl'
    this.readOnly = options?.readOnly ?? false
    TreeEngine.validateTreeDef(treeDef, this.locale)
    this.store = new StateStore(treeDef)
    this.resources = new ResourceManager(treeDef.resources ?? [])
    this.audit = new AuditLogger(options?.audit)
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

  // ── INICIO: API pública de auditoría (sub-fase 1.16) ──
  // Delegación directa no AuditLogger interno. readOnly NON afecta:
  // consultar/baleirar o log é válido sempre (as mutacións xa están
  // bloqueadas noutro sitio).

  /**
   * Devolve unha copia das entradas de auditoría que cumpren o filtro.
   * Síncrono. Se audit está desactivado devolve [].
   */
  getAuditLog(filter?: AuditFilter): AuditEntry[] {
    return this.audit.query(filter)
  }

  /** Baleira o rexistro de auditoría. */
  clearAuditLog(): void {
    this.audit.clear()
  }

  /**
   * Rexistro manual: permite ao consumidor anotar accións `custom` ou
   * propias. Se audit está desactivado é un no-op. Emite `auditEntry`
   * só se a entrada se creou realmente.
   */
  logAudit(
    action: AuditAction,
    opts?: { actor?: string; context?: Record<string, unknown>; rollbackable?: boolean },
  ): void {
    const entry = this.audit.record(action, opts)
    if (entry !== null) {
      this.events.emit('auditEntry', entry)
    }
  }
  // ── FIN: API pública de auditoría ──

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

  // ── Selectors e subscrición selectiva (1.15) ──

  /**
   * Aplica un selector ao snapshot actual e devolve o valor derivado.
   *
   * Lectura pura e síncrona. Se o selector lanza, a excepción propágase
   * ao chamante SEN capturarse (un selector que peta é bug do consumidor,
   * non un erro de dominio).
   */
  select<T>(selector: Selector<T>): T {
    // Intención: derivar unha porción do estado sen suscribirse a el.
    return selector(this.store.getSnapshot())
  }

  /**
   * Subscríbese ao estado pero só chama a `listener` cando o valor
   * SELECCIONADO cambia (segundo `equalityFn`, por defecto `Object.is`).
   *
   * Apóiase na subscrición global de StateStore: en cada notificación
   * recalcula o selector e compara co valor previo gardado neste closure.
   *
   * @param selector  Función pura que deriva o valor a observar.
   * @param listener  Recibe `(selected, previous)` cando o valor cambia.
   * @param options.equalityFn      Igualdade custom (default `Object.is`).
   * @param options.fireImmediately Se `true`, chama `listener` unha vez
   *                                no momento de subscribirse co valor
   *                                actual (como `(current, current)`).
   * @returns Función que cancela a subscrición ao store.
   */
  subscribeWithSelector<T>(
    selector: Selector<T>,
    listener: (selected: T, previous: T) => void,
    options?: {
      equalityFn?: (a: T, b: T) => boolean
      fireImmediately?: boolean
    },
  ): Unsubscribe {
    const eq = options?.equalityFn ?? Object.is
    let prev = selector(this.store.getSnapshot())

    if (options?.fireImmediately === true) {
      listener(prev, prev)
    }

    const unsub = this.store.subscribe(() => {
      const next = selector(this.store.getSnapshot())
      if (eq(next, prev)) {
        return
      }
      // Actualiza `prev` ANTES de chamar o listener: evita estado
      // inconsistente se o listener volve a ler dentro do mesmo ciclo.
      const previous = prev
      prev = next
      listener(next, previous)
    })

    return () => {
      unsub()
    }
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

    // Nodo expirado → non permitido (código específico NODE_EXPIRED)
    if (currentState === 'expired') {
      return ok({
        allowed: false,
        reason: getErrorMessage(ErrorCode.NODE_EXPIRED, this.locale, { nodeId }),
      })
    }

    // Nodo desactivado → estado inválido para a operación (DT-8)
    if (currentState === 'disabled') {
      return ok({
        allowed: false,
        reason: getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
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

    // Audit: rexistro tras a mutación exitosa (NON nos erros).
    const auditEntry = this.audit.record(
      { type: 'node_unlocked', nodeId, tier: targetTier },
      { rollbackable: true },
    )
    if (auditEntry !== null) {
      this.events.emit('auditEntry', auditEntry)
    }

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
    // DT-8: o erro é de ESTADO do nodo (non da súa definición, que é
    // válida). Úsase INVALID_NODE_STATE (YGG_E011), código específico.
    if (currentNodeState !== 'unlocked' && currentNodeState !== 'maxed') {
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_NODE_STATE,
          getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
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

    // Audit: rexistro tras a mutación exitosa (NON nos erros).
    const auditEntry = this.audit.record({ type: 'node_locked', nodeId }, { rollbackable: true })
    if (auditEntry !== null) {
      this.events.emit('auditEntry', auditEntry)
    }

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

    // Audit: rexistro tras a mutación exitosa (NON nos erros).
    // Copia defensiva dos ids para illar o log de mutacións futuras.
    const auditEntry = this.audit.record({
      type: 'respec',
      nodeIds: [...nodeIdsToLock],
    })
    if (auditEntry !== null) {
      this.events.emit('auditEntry', auditEntry)
    }

    return ok({ nodeIds: nodeIdsToLock, refunded: allCosts })
  }

  // ── INICIO: applyChanges (sub-fase 1.14) ──
  // Modifica a TreeDef en runtime de forma atómica (todo-ou-nada) e
  // reconcilia as NodeInstances afectadas. Detección de conflitos
  // internos delegada en analyzeChanges (NON se reimplementa aquí).
  async applyChanges(changes: readonly TreeChange[]): Promise<Result<ApplyChangesResult>> {
    // T3: modo só lectura → erro sen tocar nada.
    if (this.readOnly) {
      return err(
        new YggdrasilError(
          ErrorCode.READ_ONLY_VIOLATION,
          getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
        ),
      )
    }

    // T3: lista baleira → no-op explícito (non é erro).
    if (changes.length === 0) {
      return ok({
        applied: 0,
        affectedNodes: [],
        renames: new Map<string, string>(),
        cachesInvalidated: [],
      })
    }

    // T3: análise (conflitos internos, caches, renames, afectados).
    const analysis: ChangeAnalysis = analyzeChanges(changes)

    // T3: conflitos internos → CHANGE_CONFLICT (decisión do arquitecto,
    // YGG_E012). A mensaxe localizada describe o PRIMEIRO conflito; o
    // context leva TODOS para telemetría/devtools.
    if (analysis.internalConflicts.length > 0) {
      const first = analysis.internalConflicts[0] as ChangeConflict
      const details = this.describeConflict(first)
      return err(
        new YggdrasilError(
          ErrorCode.CHANGE_CONFLICT,
          getErrorMessage(ErrorCode.CHANGE_CONFLICT, this.locale, {
            conflictType: first.type,
            details,
          }),
          {
            context: {
              conflictType: first.type,
              details,
              internalConflicts: analysis.internalConflicts,
            },
          },
        ),
      )
    }

    // T4: validación estrutural contra a TreeDef ACTUAL. Atómico:
    // valídase TODO antes de aplicar NADA. Non é validación profunda
    // (ciclos/prerequisites son 1.17).
    const treeDef = this.store.getTreeDef()
    const nodeIds = new Set(treeDef.nodes.map((n) => n.id))
    const edgeIds = new Set(treeDef.edges.map((e) => e.id))
    const groupIds = new Set((treeDef.groups ?? []).map((g) => g.id))
    const resourceIds = new Set((treeDef.resources ?? []).map((r) => r.id))
    // Proxección dos ids segundo se vai aplicando (para detectar, p.ex.,
    // add_node + add_edge que referencia ese nodo novo na mesma lista).
    const projectedNodeIds = new Set(nodeIds)
    const projectedEdgeIds = new Set(edgeIds)
    const projectedGroupIds = new Set(groupIds)
    const projectedResourceIds = new Set(resourceIds)

    for (const change of changes) {
      const invalid = this.validateChange(
        change,
        projectedNodeIds,
        projectedEdgeIds,
        projectedGroupIds,
        projectedResourceIds,
      )
      if (invalid !== undefined) {
        return err(invalid)
      }
    }

    // T5: aplicación á TreeDef vía Immer, na orde dada. Cobre as 12
    // variantes de TreeChange.
    this.store.applyTreeDefChange((draft) => {
      for (const change of changes) {
        this.applyOneChange(draft, change)
      }
    })

    // T6: reconciliación de NodeInstances (decisión 5.9).
    const stateChanges: Array<{ nodeId: string; change: StateChange }> = []
    const now = Date.now()
    this.store.update((draft) => {
      for (const change of changes) {
        switch (change.type) {
          case 'add_node': {
            // Nodo engadido → NodeInstance inicial coherente.
            const id = change.node.id
            if (draft.nodes[id] === undefined) {
              draft.nodes[id] = { id, state: 'locked', currentTier: 0 }
            }
            break
          }
          case 'remove_node': {
            // Nodo eliminado → elimínase a súa NodeInstance.
            if (draft.nodes[change.nodeId] !== undefined) {
              delete draft.nodes[change.nodeId]
            }
            break
          }
          case 'rename_node_id': {
            // Nodo renomeado → móvese a instancia conservando o estado.
            const fromInst = draft.nodes[change.oldId]
            if (fromInst !== undefined) {
              const moved: NodeInstance = { ...fromInst, id: change.newId }
              draft.nodes[change.newId] = moved
              delete draft.nodes[change.oldId]
            }
            break
          }
          case 'modify_node': {
            // Se maxTier baixa por debaixo do currentTier actual,
            // axústase (clamp). Decisión 5.9.
            const inst = draft.nodes[change.nodeId]
            const newMax = change.changes.maxTier
            if (inst !== undefined && typeof newMax === 'number' && inst.currentTier > newMax) {
              inst.currentTier = newMax
            }
            break
          }
          default:
            // edges/grupos/recursos/layout non tocan NodeInstances.
            break
        }
      }
    })

    // Construír os StateChange para os nodos reconciliados que cambiaron
    // (rename: o estado consérvase pero o id cambia; clamp: cambia tier).
    // Emítese stateChange só onde hai cambio observable de estado.
    for (const change of changes) {
      if (change.type === 'rename_node_id') {
        const inst = this.store.getState().nodes[change.newId]
        if (inst !== undefined) {
          stateChanges.push({
            nodeId: change.newId,
            change: { from: inst.state, to: inst.state, timestamp: now, reason: 'rename' },
          })
        }
      }
    }

    // T7: invalidación de caches segundo a análise (subconxunto, non ALL
    // á forza).
    this.store.invalidate([...analysis.cachesToInvalidate])

    // T7: eventos. treeChanged sempre tras aplicar OK; stateChange por
    // nodo reconciliado con cambio observable.
    this.events.emit('treeChanged', changes)
    for (const sc of stateChanges) {
      this.events.emit('stateChange', sc.nodeId, sc.change)
    }

    // Audit: rexistro tras a mutación exitosa (NON nos erros).
    // tree_changed déixase non-rollbackable (decisión do briefing:
    // a reversión de cambios estruturais é fase posterior).
    const auditEntry = this.audit.record({ type: 'tree_changed', changes })
    if (auditEntry !== null) {
      this.events.emit('auditEntry', auditEntry)
    }

    return ok({
      applied: changes.length,
      affectedNodes: [...analysis.affectedNodes],
      renames: new Map(analysis.renames),
      cachesInvalidated: [...analysis.cachesToInvalidate],
    })
  }

  // ── Validación estrutural dun TreeChange contra ids proxectados ──
  // Devolve un YggdrasilError se é inválido, ou undefined se é válido.
  // Muta os conxuntos proxectados para reflectir o cambio (atómico a
  // nivel de validación: simúlase a secuencia antes de aplicar nada).
  private validateChange(
    change: TreeChange,
    nodeIds: Set<string>,
    edgeIds: Set<string>,
    groupIds: Set<string>,
    resourceIds: Set<string>,
  ): YggdrasilError | undefined {
    switch (change.type) {
      case 'add_node': {
        if (nodeIds.has(change.node.id)) {
          return new YggdrasilError(
            ErrorCode.INVALID_NODE_STATE,
            getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
              nodeId: change.node.id,
              details: 'xa existe un nodo con ese id',
            }),
          )
        }
        nodeIds.add(change.node.id)
        return undefined
      }
      case 'remove_node': {
        if (!nodeIds.has(change.nodeId)) {
          return new YggdrasilError(
            ErrorCode.NODE_NOT_FOUND,
            getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, {
              nodeId: change.nodeId,
            }),
          )
        }
        nodeIds.delete(change.nodeId)
        return undefined
      }
      case 'modify_node': {
        if (!nodeIds.has(change.nodeId)) {
          return new YggdrasilError(
            ErrorCode.NODE_NOT_FOUND,
            getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, {
              nodeId: change.nodeId,
            }),
          )
        }
        return undefined
      }
      case 'rename_node_id': {
        if (!nodeIds.has(change.oldId)) {
          return new YggdrasilError(
            ErrorCode.NODE_NOT_FOUND,
            getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, {
              nodeId: change.oldId,
            }),
          )
        }
        if (nodeIds.has(change.newId)) {
          return new YggdrasilError(
            ErrorCode.INVALID_NODE_STATE,
            getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
              nodeId: change.newId,
              details: 'xa existe un nodo con ese id (rename)',
            }),
          )
        }
        nodeIds.delete(change.oldId)
        nodeIds.add(change.newId)
        return undefined
      }
      case 'add_edge': {
        if (edgeIds.has(change.edge.id)) {
          return new YggdrasilError(
            ErrorCode.INVALID_EDGE_DEF,
            getErrorMessage(ErrorCode.INVALID_EDGE_DEF, this.locale, {
              edgeId: change.edge.id,
              details: 'xa existe unha edge con ese id',
            }),
          )
        }
        if (!nodeIds.has(change.edge.source)) {
          return new YggdrasilError(
            ErrorCode.NODE_NOT_FOUND,
            getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, {
              nodeId: change.edge.source,
            }),
          )
        }
        if (!nodeIds.has(change.edge.target)) {
          return new YggdrasilError(
            ErrorCode.NODE_NOT_FOUND,
            getErrorMessage(ErrorCode.NODE_NOT_FOUND, this.locale, {
              nodeId: change.edge.target,
            }),
          )
        }
        edgeIds.add(change.edge.id)
        return undefined
      }
      case 'remove_edge': {
        if (!edgeIds.has(change.edgeId)) {
          return new YggdrasilError(
            ErrorCode.INVALID_EDGE_DEF,
            getErrorMessage(ErrorCode.INVALID_EDGE_DEF, this.locale, {
              edgeId: change.edgeId,
              details: 'non existe unha edge con ese id',
            }),
          )
        }
        edgeIds.delete(change.edgeId)
        return undefined
      }
      case 'modify_edge': {
        if (!edgeIds.has(change.edgeId)) {
          return new YggdrasilError(
            ErrorCode.INVALID_EDGE_DEF,
            getErrorMessage(ErrorCode.INVALID_EDGE_DEF, this.locale, {
              edgeId: change.edgeId,
              details: 'non existe unha edge con ese id',
            }),
          )
        }
        return undefined
      }
      case 'add_group': {
        if (groupIds.has(change.group.id)) {
          return new YggdrasilError(
            ErrorCode.INVALID_NODE_STATE,
            getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
              nodeId: change.group.id,
              details: 'xa existe un grupo con ese id',
            }),
          )
        }
        groupIds.add(change.group.id)
        return undefined
      }
      case 'remove_group': {
        if (!groupIds.has(change.groupId)) {
          return new YggdrasilError(
            ErrorCode.INVALID_NODE_STATE,
            getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
              nodeId: change.groupId,
              details: 'non existe un grupo con ese id',
            }),
          )
        }
        groupIds.delete(change.groupId)
        return undefined
      }
      case 'modify_group': {
        if (!groupIds.has(change.groupId)) {
          return new YggdrasilError(
            ErrorCode.INVALID_NODE_STATE,
            getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
              nodeId: change.groupId,
              details: 'non existe un grupo con ese id',
            }),
          )
        }
        return undefined
      }
      case 'add_resource': {
        if (resourceIds.has(change.resource.id)) {
          return new YggdrasilError(
            ErrorCode.INVALID_NODE_STATE,
            getErrorMessage(ErrorCode.INVALID_NODE_STATE, this.locale, {
              nodeId: change.resource.id,
              details: 'xa existe un recurso con ese id',
            }),
          )
        }
        resourceIds.add(change.resource.id)
        return undefined
      }
      case 'modify_layout':
        // Non require validación de ids; aplícase sobre LayoutConfig.
        return undefined
      default:
        // Exhaustividade: todas as variantes están cubertas arriba.
        return undefined
    }
  }

  // ── Aplica un TreeChange sobre o draft da TreeDef (Immer) ──
  // draft é Draft<TreeDef>: Immer expón as propiedades como mutables.
  // castDraft() reinterpreta os valores inmutables (NodeDef, EdgeDef…)
  // como draft-compatibles sen copialos; é a API tipada de Immer para
  // conviver con exactOptionalPropertyTypes (NON é un any).
  private applyOneChange(draft: Draft<TreeDef>, change: TreeChange): void {
    switch (change.type) {
      case 'add_node': {
        draft.nodes.push(castDraft(change.node))
        break
      }
      case 'remove_node': {
        const idx = draft.nodes.findIndex((n) => n.id === change.nodeId)
        if (idx !== -1) {
          draft.nodes.splice(idx, 1)
        }
        if (change.cascadeEdges === true) {
          for (let i = draft.edges.length - 1; i >= 0; i--) {
            const e = draft.edges[i]
            if (e !== undefined && (e.source === change.nodeId || e.target === change.nodeId)) {
              draft.edges.splice(i, 1)
            }
          }
        }
        break
      }
      case 'modify_node': {
        const idx = draft.nodes.findIndex((n) => n.id === change.nodeId)
        const target = idx === -1 ? undefined : draft.nodes[idx]
        if (target !== undefined) {
          draft.nodes[idx] = castDraft({ ...target, ...change.changes })
        }
        break
      }
      case 'rename_node_id': {
        const idx = draft.nodes.findIndex((n) => n.id === change.oldId)
        const target = idx === -1 ? undefined : draft.nodes[idx]
        if (target !== undefined) {
          draft.nodes[idx] = castDraft({ ...target, id: change.newId })
        }
        // Reapuntar edges que referencian o id antigo.
        for (let i = 0; i < draft.edges.length; i++) {
          const e = draft.edges[i]
          if (e === undefined) {
            continue
          }
          if (e.source === change.oldId || e.target === change.oldId) {
            draft.edges[i] = castDraft({
              ...e,
              source: e.source === change.oldId ? change.newId : e.source,
              target: e.target === change.oldId ? change.newId : e.target,
            })
          }
        }
        if (draft.rootNodeId === change.oldId) {
          draft.rootNodeId = change.newId
        }
        break
      }
      case 'add_edge': {
        draft.edges.push(castDraft(change.edge))
        break
      }
      case 'remove_edge': {
        const idx = draft.edges.findIndex((e) => e.id === change.edgeId)
        if (idx !== -1) {
          draft.edges.splice(idx, 1)
        }
        break
      }
      case 'modify_edge': {
        const idx = draft.edges.findIndex((e) => e.id === change.edgeId)
        const target = idx === -1 ? undefined : draft.edges[idx]
        if (target !== undefined) {
          draft.edges[idx] = castDraft({ ...target, ...change.changes })
        }
        break
      }
      case 'add_group': {
        if (draft.groups === undefined) {
          draft.groups = []
        }
        draft.groups.push(castDraft(change.group))
        break
      }
      case 'remove_group': {
        if (draft.groups !== undefined) {
          const idx = draft.groups.findIndex((g) => g.id === change.groupId)
          if (idx !== -1) {
            draft.groups.splice(idx, 1)
          }
        }
        break
      }
      case 'modify_group': {
        if (draft.groups !== undefined) {
          const idx = draft.groups.findIndex((g) => g.id === change.groupId)
          const target = idx === -1 ? undefined : draft.groups[idx]
          if (target !== undefined) {
            draft.groups[idx] = castDraft({ ...target, ...change.changes })
          }
        }
        break
      }
      case 'add_resource': {
        if (draft.resources === undefined) {
          draft.resources = []
        }
        draft.resources.push(castDraft(change.resource))
        break
      }
      case 'modify_layout': {
        draft.layout = castDraft({ ...draft.layout, ...change.changes })
        break
      }
      default:
        // Exhaustividade garantida pola union TreeChange.
        break
    }
  }

  // ── Descrición curta dun ChangeConflict para a mensaxe localizada ──
  private describeConflict(conflict: ChangeConflict): string {
    switch (conflict.type) {
      case 'duplicate_add_node':
        return `nodo "${conflict.nodeId}" engadido en posicións ${conflict.positions.join(', ')}`
      case 'add_then_remove':
        return `nodo "${conflict.nodeId}" engadido (pos ${conflict.addPosition}) e eliminado (pos ${conflict.removePosition})`
      case 'remove_then_modify':
        return `nodo "${conflict.nodeId}" eliminado (pos ${conflict.removePosition}) e modificado (pos ${conflict.modifyPosition})`
      case 'modify_after_rename':
        return `nodo "${conflict.oldId}" modificado tras renomear (pos rename ${conflict.renamePosition}, pos modify ${conflict.modifyPosition})`
      case 'rename_chain':
        return `cadea de renomeados: "${conflict.firstRename.oldId}"→"${conflict.firstRename.newId}" e "${conflict.secondRename.oldId}"→"${conflict.secondRename.newId}"`
      case 'rename_to_existing':
        return `renomeado a un id xa existente "${conflict.newId}" (pos ${conflict.conflictingPosition})`
      case 'duplicate_edge_id':
        return `edge "${conflict.edgeId}" duplicada en posicións ${conflict.positions.join(', ')}`
      default:
        return 'conflito interno na lista de cambios'
    }
  }
  // ── FIN: applyChanges (sub-fase 1.14) ──

  // ── INICIO: serialización JSON (sub-fase 1.17) ──

  /**
   * Materializa un InferredTreeDef en un TreeDef nominal exacto.
   *
   * InferredTreeDef difiere de TreeDef SOLO en el artefacto de Zod 3 bajo
   * exactOptionalPropertyTypes (`?:T|undefined` en opcionales). La conversión
   * es puramente NOMINAL: el dato ya fue validado estructuralmente por
   * `deserialize` (Zod + esquema) antes de llegar aquí, por lo que esto NO
   * es una frontera de entrada no confiable, sino una conversión interna de
   * dato ya validado (decisión del arquitecto, Opción 6, punto 4).
   *
   * Construcción SUPERFICIAL (primer nivel de TreeDef), omitiendo opcionales
   * `undefined`. Suficiente porque StateStore guarda por referencia, Zod ya
   * validó los anidados y ningún consumidor depende en runtime de la
   * exactitud de opcionales anidados (decisión del arquitecto, Opción 6,
   * punto 3). La equivalencia esquema↔TreeDef está blindada por el helper +
   * test negativo de tipo de T7.
   */
  private static materializeTreeDef(value: InferredTreeDef): TreeDef {
    // Conversión nominal interna de dato YA validado por deserialize (Zod +
    // esquema). NO es frontera de entrada no confiable. Único `as` autorizado
    // explícitamente por el arquitecto (Opción 6, punto 4), encapsulado aquí
    // y solo aquí, blindado por el test de tipo de T7: si el esquema diverge
    // de TreeDef en algo distinto del `?:T|undefined`, T7 rompe la
    // compilación y este `as` no puede mentir silenciosamente.
    return value as TreeDef
  }

  /**
   * Construye un TreeEngine a partir de una cadena JSON.
   *
   * Deserializa + valida estructuralmente (JsonSerializer.deserialize:
   * parse -> validación Zod -> comprobación de schemaVersion). Si todo es
   * correcto, construye el engine; si no, devuelve el err SIN lanzar.
   *
   * NOTA: el constructor normal SÍ lanza (semántica intacta, decisión 5.5);
   * este factory devuelve Result porque la entrada (JSON) es externa/no
   * confiable. Las dos vías de validación son coherentes: deserialize hace
   * la validación estructural completa antes de construir.
   *
   * @param json - Cadena JSON de fuente externa.
   * @param options - Opciones del engine (locale, readOnly, audit).
   * @returns ok(TreeEngine) si el JSON es válido; err(YggdrasilError) si no.
   */
  static fromJSON(json: string, options?: TreeEngineOptions): Result<TreeEngine> {
    const locale = options?.locale ?? 'gl'
    const result = deserialize(json, locale)
    if (!result.ok) {
      return result
    }
    const treeDef = TreeEngine.materializeTreeDef(result.value)
    return ok(new TreeEngine(treeDef, options))
  }

  /**
   * Serializa el TreeDef actual del engine a JSON determinista.
   *
   * Usa JsonSerializer.serialize (claves ordenadas de forma estable,
   * incluye schemaVersion). Serializa SOLO la definición (TreeDef), nunca
   * el estado de runtime. round-trip a nivel engine: fromJSON(e.toJSON())
   * reconstruye un engine equivalente.
   */
  toJSON(): string {
    return serialize(this.store.getTreeDef())
  }

  // ── FIN: serialización JSON (sub-fase 1.17) ──
}
// ── FIN: TreeEngine ──
