// ── INICIO: Event types ──
// Sinaturas dos eventos emitidos polo TreeEngine.

import type { YggdrasilError } from '@yggdrasil-forge/common'
import type { AuditEntry } from './audit.js'
import type { Build, BuildSnapshot, Loadout } from './build.js'
import type { TreeChange } from './changes.js'
import type { NodeInstance, StateChange } from './node.js'

/**
 * Mapa de eventos do TreeEngine.
 *
 * Cada chave é un nome de evento; cada valor é a sinatura do handler.
 *
 * Os consumidores usan `engine.on(event, handler)` con autocompletado tipado.
 *
 * @example
 * const unsubscribe = engine.on('unlock', (nodeId, instance) => {
 *   console.info(`Unlocked ${nodeId} at tier ${instance.currentTier}`)
 * })
 */
export interface EventMap {
  /** Un nodo desbloqueouse (manual ou por cascada). */
  readonly unlock: (nodeId: string, instance: NodeInstance) => void

  /** Un nodo bloqueouse (respec ou exclusión). */
  readonly lock: (nodeId: string, instance: NodeInstance) => void

  /** Cambio xenérico de estado dun nodo (calquera transición). */
  readonly stateChange: (nodeId: string, change: StateChange) => void

  /** Cambiou a cantidade dispoñible dun recurso. */
  readonly budgetChange: (resourceId: string, oldAmount: number, newAmount: number) => void

  /**
   * Cambiou un stat calculado polo StatComputer.
   *
   * **NOTA (sub-fase 2.2.b):** este evento está declarado pero **NON
   * se emite aínda**. A emisión require comparar valores antes/despois
   * de cada mutación (overhead non trivial; decisión do director en
   * 2.2.b §5.3-5.4: queda diferida). Para observar cambios de stats,
   * subscríbase aos eventos de mutación (`unlock`, `lock`, `respec`,
   * `treeChanged`) e re-consulte `TreeEngine.getStat`/`getAllStats`.
   */
  readonly statChange: (statId: string, oldValue: number, newValue: number) => void

  /** Cambiou o progreso dun nodo (manual ou externo). */
  readonly progressChange: (nodeId: string, percent: number) => void

  /** Realizouse un respec, devolvendo puntos. */
  readonly respec: (nodeIds: readonly string[]) => void

  /** Cargouse unha build completa (importBuild, loadFromShareLink). */
  readonly buildLoaded: (build: Build) => void

  /** Un snapshot foi creado (engine.snapshot()). */
  readonly snapshotCreated: (snapshot: BuildSnapshot) => void

  /** Un snapshot foi restaurado (engine.restoreSnapshot()). */
  readonly snapshotRestored: (snapshot: BuildSnapshot) => void

  /** Un loadout foi gardado (engine.saveLoadout()). */
  readonly loadoutSaved: (loadout: Loadout) => void

  /** Un loadout foi cargado (engine.loadLoadout()). */
  readonly loadoutLoaded: (loadout: Loadout) => void

  /** O usuario entrou nunha sub-árbore. */
  readonly subtreeEntered: (subtreeId: string) => void

  /** A treeDef foi modificada vía applyChanges. */
  readonly treeChanged: (changes: readonly TreeChange[]) => void

  /** Un nodo expirou por time constraints. */
  readonly nodeExpired: (nodeId: string) => void

  /** Sincronizouse progreso dunha fonte externa. */
  readonly externalProgressSynced: (nodeId: string, percent: number) => void

  /** Un plugin emitiu un erro capturable. */
  readonly pluginError: (pluginId: string, error: YggdrasilError) => void

  /** Error xenérico capturable polo consumidor. */
  readonly error: (error: YggdrasilError) => void

  /** Nova entrada engadida ao audit log. */
  readonly auditEntry: (entry: AuditEntry) => void

  /**
   * Evento custom emitido polo effect `trigger_event` do EffectsRunner.
   * O `payload` trátase como `unknown`: o consumidor é responsable de
   * validalo (mediante guardas de tipo) antes de usalo.
   */
  readonly customEvent: (eventName: string, payload?: unknown) => void
}

/**
 * Nome dun evento válido (chave do EventMap).
 */
export type EventName = keyof EventMap

/**
 * Handler tipado para un evento concreto.
 */
export type EventHandler<K extends EventName> = EventMap[K]
// ── FIN: Event types ──
