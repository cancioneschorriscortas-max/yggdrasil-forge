// ── INICIO: SearchEngine ──
// Motor de busca custom para Yggdrasil Forge skill trees.
//
// **Sub-fase 8.6.a**: implementación standalone. Algoritmo simple:
// substring case-insensitive con scoring por campo.
//
// **Adaptación**: NodeDef usa `label` (non `name`) e ambos
// `label`/`description` son `LocalizedString = string | Record<string, string>`.
// Tódalas variantes localizadas son indexadas como texto plano.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'
import type { SearchField, SearchMatch, SearchOptions, SearchResult } from './types.js'

interface IndexedNode {
  readonly name: string
  readonly description: string
  readonly tags: readonly string[]
  readonly searchKeywords: readonly string[]
}

const ALL_FIELDS: readonly SearchField[] = ['name', 'description', 'tags', 'searchKeywords']

const SCORE_BY_FIELD: Readonly<Record<SearchField, number>> = {
  name: 10,
  searchKeywords: 7,
  description: 5,
  tags: 3,
}

/**
 * Flatten a LocalizedString to a single lowercased string.
 * For plain strings: lowercase directly.
 * For i18n records: join all locale values with space, then lowercase.
 */
function flattenLocalized(value: LocalizedString | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value.toLowerCase()
  return Object.values(value).join(' ').toLowerCase()
}

/**
 * Motor de busca custom para skill trees.
 *
 * Indexa lowercased label/description/tags/searchKeywords de cada
 * NodeDef. Busca substring case-insensitive con scoring acumulado.
 *
 * @example
 * const engine = new SearchEngine()
 * engine.index(treeDef)
 * const results = engine.search('warrior', { limit: 5 })
 */
export class SearchEngine {
  private readonly indexed = new Map<string, IndexedNode>()

  /**
   * Indexa un TreeDef. Limpa o index previo antes.
   */
  index(tree: TreeDef): void {
    this.indexed.clear()
    for (const node of tree.nodes) {
      this.indexed.set(node.id, {
        name: flattenLocalized(node.label),
        description: flattenLocalized(node.description),
        tags: (node.tags ?? []).map((t) => t.toLowerCase()),
        searchKeywords: (node.searchKeywords ?? []).map((k) => k.toLowerCase()),
      })
    }
  }

  /**
   * Busca nodos que matcheen `query` (substring case-insensitive).
   *
   * @param query Texto a buscar. Se vacía, devolve `[]`.
   * @param options `fields` (default todos) + `limit` (default Infinity).
   */
  search(query: string, options?: SearchOptions): readonly SearchResult[] {
    if (query.length === 0) return []

    const normalizedQuery = query.toLowerCase()
    const fields = options?.fields ?? ALL_FIELDS
    const limit = options?.limit ?? Number.POSITIVE_INFINITY

    const results: SearchResult[] = []

    for (const [nodeId, idx] of this.indexed) {
      const matches: SearchMatch[] = []
      let score = 0

      if (fields.includes('name') && idx.name.includes(normalizedQuery)) {
        matches.push({ field: 'name', value: idx.name })
        score += SCORE_BY_FIELD.name
      }
      if (fields.includes('description') && idx.description.includes(normalizedQuery)) {
        matches.push({ field: 'description', value: idx.description })
        score += SCORE_BY_FIELD.description
      }
      if (fields.includes('tags')) {
        for (const tag of idx.tags) {
          if (tag.includes(normalizedQuery)) {
            matches.push({ field: 'tags', value: tag })
            score += SCORE_BY_FIELD.tags
          }
        }
      }
      if (fields.includes('searchKeywords')) {
        for (const kw of idx.searchKeywords) {
          if (kw.includes(normalizedQuery)) {
            matches.push({ field: 'searchKeywords', value: kw })
            score += SCORE_BY_FIELD.searchKeywords
          }
        }
      }

      if (matches.length > 0) {
        results.push({ nodeId, score, matches })
      }
    }

    results.sort((a, b) => b.score - a.score)

    if (limit === Number.POSITIVE_INFINITY) return results
    return results.slice(0, limit)
  }

  /**
   * Limpa o index.
   */
  clear(): void {
    this.indexed.clear()
  }

  /**
   * Devolve o número de nodos indexados.
   */
  size(): number {
    return this.indexed.size
  }
}
// ── FIN: SearchEngine ──
