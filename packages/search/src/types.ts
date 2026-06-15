// ── INICIO: SearchEngine types ──

/**
 * Campos do NodeDef que SearchEngine indexa e busca.
 *
 * **Nota**: 'name' mapea internamente a `NodeDef.label`
 * (que é `LocalizedString`; todas as variantes localizadas
 * son indexadas).
 */
export type SearchField = 'name' | 'description' | 'tags' | 'searchKeywords'

/**
 * Opcións para SearchEngine.search().
 */
export interface SearchOptions {
  /**
   * Campos onde buscar. Default: todos os 4 campos
   * (name, description, tags, searchKeywords).
   */
  readonly fields?: readonly SearchField[]

  /**
   * Límite máximo de resultados.
   * Default: Infinity (cero limit).
   */
  readonly limit?: number
}

/**
 * Match individual dentro dun SearchResult.
 */
export interface SearchMatch {
  /** Campo do nodo onde houbo match. */
  readonly field: SearchField
  /** Valor (lowercased) do campo onde houbo match. */
  readonly value: string
}

/**
 * Resultado individual dunha busca.
 */
export interface SearchResult {
  /** Id do nodo que matcheou. */
  readonly nodeId: string
  /**
   * Score acumulado. Maior = mellor match.
   * Scoring por campo:
   * - name: +10 por match.
   * - searchKeywords: +7 por keyword que matcheou.
   * - description: +5 por match.
   * - tags: +3 por tag que matcheou.
   * Múltiples matches no mesmo nodo suman scores.
   */
  readonly score: number
  /** Lista de matches específicos dentro deste nodo. */
  readonly matches: readonly SearchMatch[]
}

// ── FIN: SearchEngine types ──
