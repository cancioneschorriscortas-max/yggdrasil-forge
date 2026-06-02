// ── INICIO: LayoutEngineRegistry ──
import type { LayoutEngine } from './LayoutEngine.js'

/**
 * Rexistro de engines de layout por tipo.
 *
 * Permite rexistrar implementacións de LayoutEngine e recuperalas
 * polo `type` que xestionan. Cero validación defensiva: se o
 * consumidor pasa datos incorrectos, detectarase nos seus tests.
 */
export class LayoutEngineRegistry {
  private readonly engines = new Map<string, LayoutEngine>()

  /**
   * Rexistra un engine. Sobreescribe se xa existía un co mesmo `type`.
   * Devolve a propia instancia para chaining.
   */
  register(engine: LayoutEngine): this {
    this.engines.set(engine.type, engine)
    return this
  }

  /**
   * Recupera un engine polo seu `type`. Devolve undefined se non hai.
   */
  find(type: string): LayoutEngine | undefined {
    return this.engines.get(type)
  }

  /**
   * Indica se hai un engine rexistrado para o `type` dado.
   */
  has(type: string): boolean {
    return this.engines.has(type)
  }

  /**
   * Conta de engines rexistrados.
   */
  size(): number {
    return this.engines.size
  }
}
// ── FIN: LayoutEngineRegistry ──
