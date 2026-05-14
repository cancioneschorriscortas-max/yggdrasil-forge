// ── INICIO: EventEmitter ──
// Sistema de eventos tipado sobre o EventMap do motor.

import type { EventMap, EventName } from '../types/events.js'

/**
 * Función que cancela unha subscrición.
 */
export type Unsubscribe = () => void

/**
 * Emisor de eventos tipado.
 *
 * Todos os eventos e as súas sinaturas están definidos en EventMap.
 * Os métodos `on`, `once`, `emit` son type-safe respecto a ese mapa.
 *
 * Características:
 * - `on()` devolve unha función de unsubscribe (ergonómico)
 * - `off()` tamén dispoñible para casos con referencia gardada
 * - emit é síncrono; handlers execútanse en orde de rexistro
 * - un erro nun handler NON impide que os demais se executen
 * - `once()` para handlers de un só uso
 *
 * @example
 * const emitter = new EventEmitter()
 * const unsub = emitter.on('unlock', (nodeId, instance) => {
 *   console.info(`${nodeId} unlocked`)
 * })
 * emitter.emit('unlock', 'forno', someInstance)
 * unsub()  // cancela a subscrición
 */
export class EventEmitter {
  /**
   * Mapa de evento → conxunto de handlers rexistrados.
   * Úsase un array (non Set) para garantir orde de execución determinista.
   */
  private readonly listeners = new Map<EventName, Array<(...args: never[]) => void>>()

  /**
   * Handler opcional para erros lanzados dentro doutros handlers.
   * Se non se define, os erros silénciánse (pero non rompen o emit).
   */
  private errorHandler: ((error: unknown, event: EventName) => void) | undefined

  /**
   * Rexistra un handler para un evento.
   *
   * @returns Función que, ao chamarse, cancela esta subscrición.
   */
  on<K extends EventName>(event: K, handler: EventMap[K]): Unsubscribe {
    const handlers = this.listeners.get(event) ?? []
    handlers.push(handler as (...args: never[]) => void)
    this.listeners.set(event, handlers)

    return () => {
      this.off(event, handler)
    }
  }

  /**
   * Rexistra un handler que se executa unha soa vez e despois se elimina.
   *
   * @returns Función que cancela a subscrición antes de que se dispare.
   */
  once<K extends EventName>(event: K, handler: EventMap[K]): Unsubscribe {
    const wrapper = ((...args: Parameters<EventMap[K]>) => {
      this.off(event, wrapper as EventMap[K])
      ;(handler as (...a: Parameters<EventMap[K]>) => void)(...args)
    }) as EventMap[K]

    return this.on(event, wrapper)
  }

  /**
   * Elimina un handler concreto dun evento.
   *
   * Para que funcione, debe pasarse a MESMA referencia de función que se
   * pasou a `on()`. Se se usou unha función anónima inline, usar a Unsubscribe.
   */
  off<K extends EventName>(event: K, handler: EventMap[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers === undefined) {
      return
    }
    const index = handlers.indexOf(handler as (...args: never[]) => void)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
    if (handlers.length === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * Emite un evento, executando todos os handlers rexistrados en orde.
   *
   * Os erros lanzados por un handler captúranse e pásanse ao errorHandler
   * (se está definido); os demais handlers execútanse igualmente.
   */
  emit<K extends EventName>(event: K, ...args: Parameters<EventMap[K]>): void {
    const handlers = this.listeners.get(event)
    if (handlers === undefined || handlers.length === 0) {
      return
    }

    // Copia defensiva: un handler podería modificar a lista (off/on) durante o emit.
    const snapshot = [...handlers]

    for (const handler of snapshot) {
      try {
        ;(handler as unknown as (...a: Parameters<EventMap[K]>) => void)(...args)
      } catch (error) {
        if (this.errorHandler !== undefined) {
          this.errorHandler(error, event)
        }
      }
    }
  }

  /**
   * Define o handler de erros para handlers que lancen excepcións.
   */
  setErrorHandler(handler: (error: unknown, event: EventName) => void): void {
    this.errorHandler = handler
  }

  /**
   * Conta cantos handlers hai rexistrados para un evento.
   */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.length ?? 0
  }

  /**
   * Elimina todos os handlers dun evento, ou de todos os eventos se non
   * se especifica.
   */
  removeAllListeners(event?: EventName): void {
    if (event === undefined) {
      this.listeners.clear()
    } else {
      this.listeners.delete(event)
    }
  }
}
// ── FIN: EventEmitter ──
