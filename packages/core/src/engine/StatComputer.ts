// ── INICIO: StatComputer ──
// Peza standalone que calcula valores agregados de stats globais a
// partir das `statContributions` dos nodos desbloqueados. Sub-fase 2.2:
// NON está integrada en TreeEngine (iso é 2.2.b).
//
// API canónica (decisión do director, ver briefing 2.2 §5.2):
//   - computeStat(statId): number        — con cache.
//   - computeAllStats(): Record<...>     — itera treeDef.stats.
//   - explainStat(statId): StatExplanation — sen cache, detalle por nodo.
//   - invalidate(): void                  — borra cache completa.
//
// Algoritmo (briefing 2.2 §5.3):
//   1. acumulador = StatDef.initial ?? 0
//   2. iterar Object.values(state.nodes) en orde natural.
//   3. só nodos con state ∈ {'unlocked','maxed'}.
//   4. para cada StatContribution con statId coincidente:
//      - se conditions? está e algunha falla → saltar (na explicación
//        aparece con conditional:true, appliedTier:0).
//      - appliedTier = perTier ? currentTier : 1.
//      - effectiveValue = value * appliedTier.
//      - aplicar op sobre acumulador.
//   5. clamp final con StatDef.min/max.
//   6. devolver acumulador.
//
// Cero validación semántica de operacións patolóxicas (división por 0
// produce Infinity; é responsabilidade do deseñador da árbore). Cero
// excepcións: statId descoñecido → NaN.

import type { Locale } from '@yggdrasil-forge/common'
import type {
  NodeDef,
  NodeInstance,
  StatContributionOp,
  StatDef,
  StatExplanation,
  TreeDef,
  TreeState,
  UnlockCondition,
} from '../types/index.js'
import type { UnlockResolver, UnlockResolverContext } from './UnlockResolver.js'

// ── INICIO: tipos públicos ──

/**
 * Contexto inxectado no StatComputer. Mantense por referencia: cando o
 * estado externo muta, basta con chamar `invalidate()` para forzar
 * recálculo na seguinte consulta.
 */
export interface StatComputerContext {
  readonly treeDef: TreeDef
  readonly state: TreeState
  readonly resolver: UnlockResolver
  readonly locale: Locale
}

// ── FIN: tipos públicos ──

// ── INICIO: tipos internos ──

/**
 * Entrada da lista de contribucións detallada en `StatExplanation`.
 */
interface ExplanationEntry {
  readonly nodeId: string
  readonly op: StatContributionOp
  readonly value: number
  readonly appliedTier: number
  readonly conditional?: boolean
}

// ── FIN: tipos internos ──

export class StatComputer {
  private readonly context: StatComputerContext
  private readonly cache: Map<string, number>

  constructor(context: StatComputerContext) {
    this.context = context
    this.cache = new Map()
  }

  /**
   * Devolve o valor final dun stat. Usa cache.
   *
   * Comportamento:
   *  - `statId` descoñecido → NaN (sen lanzar).
   *  - Sen contribucións aplicables → `StatDef.initial ?? 0`.
   *  - Aplica clamp `min`/`max` ao final.
   *
   * Nota: cero validación semántica. Unha contribución `/0` propaga
   * `Infinity`; non se lanza nin se transforma. É responsabilidade do
   * deseñador da árbore evitar operacións patolóxicas.
   */
  computeStat(statId: string): number {
    // ── INICIO: consulta de cache ──
    const cached = this.cache.get(statId)
    if (cached !== undefined) {
      return cached
    }
    // ── FIN: consulta de cache ──

    const statDef = this.findStatDef(statId)
    if (statDef === undefined) {
      // statId descoñecido: NaN sinala o erro sen lanzar nin romper
      // cadeas de cálculo. Non se cachea para non contaminar a cache.
      return Number.NaN
    }

    const value = this.computeInternal(statDef, null)
    this.cache.set(statId, value)
    return value
  }

  /**
   * Devolve un Record con un valor por cada stat definido en
   * `treeDef.stats`. Reutiliza `computeStat` (e polo tanto a cache).
   */
  computeAllStats(): Readonly<Record<string, number>> {
    const stats = this.context.treeDef.stats ?? []
    const result: Record<string, number> = {}
    for (const statDef of stats) {
      result[statDef.id] = this.computeStat(statDef.id)
    }
    return result
  }

  /**
   * Devolve a explicación detallada do cálculo. NON usa cache (briefing
   * §5.4: a explicación é para debug e debe ser exacta no momento).
   *
   * Para statIds descoñecidos devolve `{ statId, finalValue: NaN,
   * contributions: [] }`.
   */
  explainStat(statId: string): StatExplanation {
    const statDef = this.findStatDef(statId)
    if (statDef === undefined) {
      return {
        statId,
        finalValue: Number.NaN,
        contributions: [],
      }
    }

    const entries: ExplanationEntry[] = []
    const finalValue = this.computeInternal(statDef, entries)
    return {
      statId,
      finalValue,
      contributions: entries,
    }
  }

  /**
   * Baleira a cache completa. Nesta sub-fase chámase explicitamente
   * (sub-fase 2.2.b cableará isto aos eventos de cambio de estado).
   */
  invalidate(): void {
    this.cache.clear()
  }

  // ── INICIO: helpers internos ──

  /**
   * Busca un StatDef por id en `treeDef.stats`. Devolve undefined se
   * non existe (en lugar de lanzar).
   */
  private findStatDef(statId: string): StatDef | undefined {
    const stats = this.context.treeDef.stats ?? []
    for (const stat of stats) {
      if (stat.id === statId) {
        return stat
      }
    }
    return undefined
  }

  /**
   * Núcleo do algoritmo. Se `entries` é un array, vai engadindo cada
   * contribución avaliada (modo `explainStat`); se é `null`, omítese o
   * detalle (modo `computeStat`, máis rápido).
   */
  private computeInternal(statDef: StatDef, entries: ExplanationEntry[] | null): number {
    const { treeDef, state } = this.context
    let acc = statDef.initial ?? 0

    // Construímos o context para o resolver unha soa vez por cálculo.
    const resolverCtx: UnlockResolverContext = {
      treeDef,
      state,
      locale: this.context.locale,
    }

    // Iteramos os nodos na orde natural de Object.values(state.nodes).
    // Briefing §5.3 punto 2: NON se ordena por nada externo.
    for (const instance of Object.values(state.nodes)) {
      if (!isContributingState(instance.state)) {
        continue
      }

      const nodeDef = this.findNodeDef(treeDef, instance.id)
      if (nodeDef === undefined) {
        // Defensivo: NodeInstance que referencia un NodeDef inexistente.
        // Non debería pasar con TreeDef validada por Zod. Saltamos.
        continue
      }

      const contributions = nodeDef.statContributions
      if (contributions === undefined || contributions.length === 0) {
        continue
      }

      for (const contribution of contributions) {
        if (contribution.statId !== statDef.id) {
          continue
        }

        // Avaliación de conditions? (AND lóxico, briefing §5.5).
        // UnlockResolver.evaluate acepta UnlockRule = UnlockCondition |
        // { type: 'all'|'any'|'none', conditions }. Para AND lóxico
        // sobre un array de UnlockCondition, envolvemos como 'all'.
        const hasConditions =
          contribution.conditions !== undefined && contribution.conditions.length > 0
        const conditionsPass = hasConditions
          ? this.evaluateConditions(contribution.conditions ?? [], resolverCtx)
          : true

        if (!conditionsPass) {
          // Contribución saltada: aparece na explicación con
          // conditional:true e appliedTier:0 (briefing §5.5).
          if (entries !== null) {
            entries.push({
              nodeId: instance.id,
              op: contribution.op,
              value: contribution.value,
              appliedTier: 0,
              conditional: true,
            })
          }
          continue
        }

        const appliedTier = contribution.perTier === true ? instance.currentTier : 1
        const effectiveValue = contribution.value * appliedTier
        acc = applyOp(acc, contribution.op, effectiveValue)

        if (entries !== null) {
          // Marcamos conditional como true só se a contribución
          // tiña conditions? que se avaliaron e pasaron. Sen
          // conditions → undefined (briefing §5.5).
          const entry: ExplanationEntry = hasConditions
            ? {
                nodeId: instance.id,
                op: contribution.op,
                value: contribution.value,
                appliedTier,
                conditional: true,
              }
            : {
                nodeId: instance.id,
                op: contribution.op,
                value: contribution.value,
                appliedTier,
              }
          entries.push(entry)
        }
      }
    }

    // Clamp final tras todas as contribucións (briefing §5.3 paso 4).
    if (statDef.min !== undefined) {
      acc = Math.max(acc, statDef.min)
    }
    if (statDef.max !== undefined) {
      acc = Math.min(acc, statDef.max)
    }
    return acc
  }

  /**
   * Busca un NodeDef por id en `treeDef.nodes`. Devolve undefined se
   * non existe (caso defensivo, ver computeInternal).
   */
  private findNodeDef(treeDef: TreeDef, nodeId: string): NodeDef | undefined {
    for (const node of treeDef.nodes) {
      if (node.id === nodeId) {
        return node
      }
    }
    return undefined
  }

  /**
   * Avalía un array de UnlockCondition como AND lóxico. Envolvémolas
   * nun UnlockRule de tipo 'all' (briefing §5.5).
   */
  private evaluateConditions(
    conditions: readonly UnlockCondition[],
    ctx: UnlockResolverContext,
  ): boolean {
    return this.context.resolver.evaluate({ type: 'all', conditions }, ctx)
  }

  // ── FIN: helpers internos ──
}

// ── INICIO: helpers a nivel de módulo ──

/**
 * Comproba se o estado dun nodo conta como "contribuínte". Briefing
 * §5.3: só `unlocked` e `maxed` contribúen.
 */
function isContributingState(state: NodeInstance['state']): boolean {
  return state === 'unlocked' || state === 'maxed'
}

/**
 * Aplica unha operación de contribución sobre o acumulador.
 *
 * `'set'` reemplaza por completo o acumulador (briefing §5.3 paso 3).
 * Cero validación: divisións por cero, NaN, etc., propágansen tal cal.
 */
function applyOp(acc: number, op: StatContributionOp, value: number): number {
  switch (op) {
    case '+':
      return acc + value
    case '-':
      return acc - value
    case '*':
      return acc * value
    case '/':
      return acc / value
    case 'min':
      return Math.min(acc, value)
    case 'max':
      return Math.max(acc, value)
    case 'set':
      return value
  }
}

// ── FIN: helpers a nivel de módulo ──
// ── FIN: StatComputer ──
