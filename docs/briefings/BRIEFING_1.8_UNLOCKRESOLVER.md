# BRIEFING EXECUTABLE — Sub-fase 1.8
## Yggdrasil Forge: UnlockResolver — corazón da lóxica de desbloqueo

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa
- `@yggdrasil-forge/common` con código real
- `@yggdrasil-forge/core` con:
  - Tipos das 3 ondas (1.2, 1.3, 1.4)
  - EventEmitter + ConcurrencyGuard + utils (1.5)
  - StateStore con Immer + cache versioning + subscripcións (1.6)
  - ChangeTracker (1.7)
- CI verde, 164 tests pasan
- Documento mestre en `docs/architecture/MASTER.md`

**Esta sub-fase é a peza máis importante da Fase 1.** O UnlockResolver decide se un nodo pode desbloquearse agora mesmo — o corazón da experiencia do usuario.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.8**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Sección 7.11** completa (UnlockCondition con 15 tipos, UnlockRule con all/any/none)
- **Sección 12** (UnlockResolver — API e explain())
- **Sección 1.3** e **1.3.2** (convencións e reglas de Biome)
- **Sección 1.1.2** (patrón lint:fix + format)
- **Sección 1.1.1** (evitar heredoc TypeScript en Git Bash, useLiteralKeys, etc.)

---

## 3. OBXECTIVO DESTA SUB-FASE

Implementar `UnlockResolver` con:

1. **`evaluate(rule, ctx)`** — devolve `boolean` (rápido, sen contexto)
2. **`evaluateCondition(condition, ctx)`** — versión atómica para unha sola condición
3. **`explain(rule, ctx)`** — devolve `UnlockExplanation` con detalle (cada condición avaliada con razón localizada)

Soportar **as 15 condicións atómicas** e **os 3 combinadores** (all/any/none) + condición simple sen wrapper.

**NON entra nesta sub-fase:**
- `DependencyGraph` completo (sub-fase 1.9). Pero `distance_max` precisa BFS — o resolver acepta un grafo opcional como dependencia inxectada.
- `StatComputer` (sub-fase posterior). Pero `stat_min` precisa stats — o resolver lee directamente `TreeState.computedStats`.
- Registry de plugins custom (vén despois). Pero `custom` precisa evaluators — o resolver acepta un Map opcional.

---

## 4. DECISIÓNS XA TOMADAS

### 4.1 UnlockResolver é stateless

- **Non garda estado interno** entre chamadas
- Recibe todo o que necesita por parámetros (TreeDef, TreeState, opcionalmente DependencyGraph e evaluators)
- Facilita testing, composición e razoamento

### 4.2 Contexto inxectado

Defínese un tipo `UnlockResolverContext` que agrupa as dependencias:

```typescript
interface UnlockResolverContext {
  readonly treeDef: TreeDef
  readonly state: TreeState
  /** Para distance_max (sub-fase 1.9). Se non se proporciona, distance_max falla con razón clara. */
  readonly dependencyGraph?: DependencyGraphLike
  /** Para custom conditions. Mapa de evaluator id → función. */
  readonly customEvaluators?: ReadonlyMap<string, ConditionEvaluator>
  /** Locale para mensaxes en explain(). */
  readonly locale?: Locale
}
```

Onde `DependencyGraphLike` é un mínimo interface, non a clase completa:

```typescript
interface DependencyGraphLike {
  /** Devolve a distancia (en steps de edges) entre dous nodos, ou Infinity se non hai camiño. */
  distanceBetween(fromId: string, toId: string): number
}
```

Cuando se implemente DependencyGraph real (1.9), implementará esta interface.

### 4.3 evaluate vs explain

- **`evaluate`** é **rápido**: devolve `boolean` directamente. Optimizado para o caso "podo desbloquear este nodo?" en cada renderizado.
- **`explain`** é **detallado**: devolve `UnlockExplanation` con cada condición individual e mensaxe localizada. Optimizado para tooltips ("necesitas X, Y e Z").

A implementación de `evaluate` pode ser un short-circuit (parar no primeiro fallo en `all`, no primeiro éxito en `any`). A implementación de `explain` avalía todas as condicións.

### 4.4 Mensaxes localizadas

Para explain(), cada condición xera unha `LocalizedString` con razón en gl/es/en. Por simplicidade, definimos un módulo interno `unlockMessages.ts` con templates por tipo de condición.

### 4.5 Comportamento de condicións que falten dependencias

- **`distance_max` sen `dependencyGraph`:** devolve `false`, razón "Dependency graph not available".
- **`custom` sen evaluator rexistrado:** devolve `false`, razón "Custom evaluator 'X' not registered".
- **`stat_min` sen `computedStats`:** trata stat como `0` (default razoable).
- **`subtree_completion` sen `subtreeStates`:** trata como `0%`.

### 4.6 Combinadores

- **`all`:** todas as condicións deben cumprirse. Se a lista é baleira, devolve `true` (vacuous truth).
- **`any`:** polo menos unha. Se a lista é baleira, devolve `false`.
- **`none`:** ningunha debe cumprirse. Se a lista é baleira, devolve `true`.

### 4.7 Recursividade

UnlockRule é recursivo: `all/any/none` poden conter UnlockConditions, pero non outras UnlockRules (segundo o tipo en `unlock.ts`). Iso simplifica a lóxica: dous niveis máximo (rule top-level + condicións).

### 4.8 Convencións

- Imports relativos con `.js`
- `import type` para tipos
- Cero `any`, cero `console.log`
- Acceso por punto (`.xp`) en propiedades con identificador válido
- Cobertura **100%** (toda a lóxica é determinística)
- Comentarios INICIO/FIN
- `useLiteralKeys` debe pasar dende o primeiro intento

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: 6719059
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 Crear packages/core/src/engine/unlockMessages.ts

Módulo interno con templates de mensaxes localizadas para `explain()`.

```typescript
// ── INICIO: unlockMessages ──
// Templates de mensaxes para o explain() do UnlockResolver.
// Cada función devolve unha LocalizedString xa interpolada.

import { type LocalizedString, type SupportedLocale } from '@yggdrasil-forge/common'

/**
 * Constrúe unha LocalizedString a partir de templates gl/es/en con interpolación.
 */
function localized(
  gl: string,
  es: string,
  en: string,
  vars?: Record<string, string | number>,
): LocalizedString {
  const apply = (template: string): string => {
    if (vars === undefined) {
      return template
    }
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
      if (key in vars) {
        return String(vars[key])
      }
      return match
    })
  }
  return {
    gl: apply(gl),
    es: apply(es),
    en: apply(en),
  } satisfies Record<SupportedLocale, string>
}

// ── Mensaxes por tipo de condición ──

export const messages = {
  nodeUnlocked: {
    satisfied: (nodeId: string) =>
      localized(
        'O nodo "{nodeId}" está desbloqueado',
        'El nodo "{nodeId}" está desbloqueado',
        'Node "{nodeId}" is unlocked',
        { nodeId },
      ),
    notSatisfied: (nodeId: string) =>
      localized(
        'O nodo "{nodeId}" non está desbloqueado',
        'El nodo "{nodeId}" no está desbloqueado',
        'Node "{nodeId}" is not unlocked',
        { nodeId },
      ),
  },

  nodeMaxed: {
    satisfied: (nodeId: string) =>
      localized(
        'O nodo "{nodeId}" está completamente desbloqueado',
        'El nodo "{nodeId}" está al máximo',
        'Node "{nodeId}" is maxed',
        { nodeId },
      ),
    notSatisfied: (nodeId: string) =>
      localized(
        'O nodo "{nodeId}" non está ao máximo',
        'El nodo "{nodeId}" no está al máximo',
        'Node "{nodeId}" is not maxed',
        { nodeId },
      ),
  },

  nodeState: {
    satisfied: (nodeId: string, state: string) =>
      localized(
        'O nodo "{nodeId}" está no estado "{state}"',
        'El nodo "{nodeId}" está en el estado "{state}"',
        'Node "{nodeId}" is in state "{state}"',
        { nodeId, state },
      ),
    notSatisfied: (nodeId: string, state: string, current: string) =>
      localized(
        'O nodo "{nodeId}" non está en "{state}" (está en "{current}")',
        'El nodo "{nodeId}" no está en "{state}" (está en "{current}")',
        'Node "{nodeId}" is not in state "{state}" (currently "{current}")',
        { nodeId, state, current },
      ),
  },

  nodesCount: {
    satisfied: (count: number, scope: string | undefined) =>
      scope === undefined
        ? localized(
            'Hai polo menos {count} nodos desbloqueados',
            'Hay al menos {count} nodos desbloqueados',
            'At least {count} nodes unlocked',
            { count },
          )
        : localized(
            'Hai polo menos {count} nodos desbloqueados no scope "{scope}"',
            'Hay al menos {count} nodos desbloqueados en el scope "{scope}"',
            'At least {count} nodes unlocked in scope "{scope}"',
            { count, scope },
          ),
    notSatisfied: (count: number, scope: string | undefined, actual: number) =>
      scope === undefined
        ? localized(
            'Necesítanse {count} nodos desbloqueados, hai {actual}',
            'Se necesitan {count} nodos desbloqueados, hay {actual}',
            'Need {count} unlocked nodes, have {actual}',
            { count, actual },
          )
        : localized(
            'Necesítanse {count} en "{scope}", hai {actual}',
            'Se necesitan {count} en "{scope}", hay {actual}',
            'Need {count} in "{scope}", have {actual}',
            { count, scope, actual },
          ),
  },

  resourceMin: {
    satisfied: (resourceId: string, amount: number) =>
      localized(
        'Tes polo menos {amount} de "{resourceId}"',
        'Tienes al menos {amount} de "{resourceId}"',
        'You have at least {amount} of "{resourceId}"',
        { resourceId, amount },
      ),
    notSatisfied: (resourceId: string, amount: number, current: number) =>
      localized(
        'Necesítanse {amount} de "{resourceId}", tes {current}',
        'Se necesitan {amount} de "{resourceId}", tienes {current}',
        'Need {amount} of "{resourceId}", have {current}',
        { resourceId, amount, current },
      ),
  },

  tierMin: {
    satisfied: (nodeId: string, tier: number) =>
      localized(
        'O nodo "{nodeId}" está en tier {tier} ou superior',
        'El nodo "{nodeId}" está en tier {tier} o superior',
        'Node "{nodeId}" is at tier {tier} or higher',
        { nodeId, tier },
      ),
    notSatisfied: (nodeId: string, tier: number, current: number) =>
      localized(
        'O nodo "{nodeId}" debe estar en tier {tier} (está en {current})',
        'El nodo "{nodeId}" debe estar en tier {tier} (está en {current})',
        'Node "{nodeId}" must be at tier {tier} (currently {current})',
        { nodeId, tier, current },
      ),
  },

  distanceMax: {
    satisfied: (fromNodeId: string, maxSteps: number) =>
      localized(
        'Estás a {maxSteps} pasos ou menos de "{fromNodeId}"',
        'Estás a {maxSteps} pasos o menos de "{fromNodeId}"',
        'Within {maxSteps} steps of "{fromNodeId}"',
        { fromNodeId, maxSteps },
      ),
    notSatisfied: (fromNodeId: string, maxSteps: number) =>
      localized(
        'Estás demasiado lonxe de "{fromNodeId}" (máximo {maxSteps} pasos)',
        'Estás demasiado lejos de "{fromNodeId}" (máximo {maxSteps} pasos)',
        'Too far from "{fromNodeId}" (max {maxSteps} steps)',
        { fromNodeId, maxSteps },
      ),
    noGraph: () =>
      localized(
        'Non se pode calcular distancia: grafo de dependencias non dispoñible',
        'No se puede calcular distancia: grafo de dependencias no disponible',
        'Cannot compute distance: dependency graph not available',
      ),
  },

  tagCount: {
    satisfied: (tag: string, count: number) =>
      localized(
        'Hai polo menos {count} nodos con tag "{tag}"',
        'Hay al menos {count} nodos con tag "{tag}"',
        'At least {count} nodes have tag "{tag}"',
        { tag, count },
      ),
    notSatisfied: (tag: string, count: number, actual: number) =>
      localized(
        'Necesítanse {count} nodos con "{tag}", hai {actual}',
        'Se necesitan {count} nodos con "{tag}", hay {actual}',
        'Need {count} nodes with "{tag}", have {actual}',
        { tag, count, actual },
      ),
  },

  progressMin: {
    satisfied: (nodeId: string, percent: number) =>
      localized(
        'O nodo "{nodeId}" ten progreso ≥ {percent}%',
        'El nodo "{nodeId}" tiene progreso ≥ {percent}%',
        'Node "{nodeId}" has progress ≥ {percent}%',
        { nodeId, percent },
      ),
    notSatisfied: (nodeId: string, percent: number, actual: number) =>
      localized(
        'O nodo "{nodeId}" debe ter {percent}% (ten {actual}%)',
        'El nodo "{nodeId}" debe tener {percent}% (tiene {actual}%)',
        'Node "{nodeId}" must be at {percent}% (has {actual}%)',
        { nodeId, percent, actual },
      ),
  },

  subtreeCompletion: {
    satisfied: (subtreeId: string, percent: number) =>
      localized(
        'A sub-árbore "{subtreeId}" está completa ao {percent}% ou máis',
        'El sub-árbol "{subtreeId}" está completo al {percent}% o más',
        'Subtree "{subtreeId}" is at least {percent}% complete',
        { subtreeId, percent },
      ),
    notSatisfied: (subtreeId: string, percent: number, actual: number) =>
      localized(
        'A sub-árbore "{subtreeId}" debe estar ao {percent}% (está ao {actual}%)',
        'El sub-árbol "{subtreeId}" debe estar al {percent}% (está al {actual}%)',
        'Subtree "{subtreeId}" must be {percent}% complete (currently {actual}%)',
        { subtreeId, percent, actual },
      ),
  },

  statMin: {
    satisfied: (statId: string, amount: number) =>
      localized(
        'O stat "{statId}" é ≥ {amount}',
        'El stat "{statId}" es ≥ {amount}',
        'Stat "{statId}" is ≥ {amount}',
        { statId, amount },
      ),
    notSatisfied: (statId: string, amount: number, current: number) =>
      localized(
        'O stat "{statId}" debe ser ≥ {amount} (é {current})',
        'El stat "{statId}" debe ser ≥ {amount} (es {current})',
        'Stat "{statId}" must be ≥ {amount} (is {current})',
        { statId, amount, current },
      ),
  },

  timeAfter: {
    satisfied: (timestamp: number) =>
      localized(
        'O momento {timestamp} xa pasou',
        'El momento {timestamp} ya pasó',
        'Timestamp {timestamp} has passed',
        { timestamp },
      ),
    notSatisfied: (timestamp: number) =>
      localized(
        'Aínda non chegou o momento {timestamp}',
        'Aún no llegó el momento {timestamp}',
        'Timestamp {timestamp} not yet reached',
        { timestamp },
      ),
  },

  timeBefore: {
    satisfied: (timestamp: number) =>
      localized(
        'Aínda non chegou o momento {timestamp}',
        'Aún no llegó el momento {timestamp}',
        'Still before timestamp {timestamp}',
        { timestamp },
      ),
    notSatisfied: (timestamp: number) =>
      localized(
        'Xa pasou o momento {timestamp}',
        'Ya pasó el momento {timestamp}',
        'Timestamp {timestamp} already passed',
        { timestamp },
      ),
  },

  custom: {
    satisfied: (evaluator: string) =>
      localized(
        'O avaliador custom "{evaluator}" devolveu true',
        'El evaluador custom "{evaluator}" devolvió true',
        'Custom evaluator "{evaluator}" returned true',
        { evaluator },
      ),
    notSatisfied: (evaluator: string) =>
      localized(
        'O avaliador custom "{evaluator}" devolveu false',
        'El evaluador custom "{evaluator}" devolvió false',
        'Custom evaluator "{evaluator}" returned false',
        { evaluator },
      ),
    notRegistered: (evaluator: string) =>
      localized(
        'O avaliador custom "{evaluator}" non está rexistrado',
        'El evaluador custom "{evaluator}" no está registrado',
        'Custom evaluator "{evaluator}" is not registered',
        { evaluator },
      ),
  },
} as const
// ── FIN: unlockMessages ──
```

### 5.2 Crear packages/core/src/engine/UnlockResolver.ts

```typescript
// ── INICIO: UnlockResolver ──
// Avalía UnlockRules contra o estado actual.
// Stateless: recibe todo o necesario por parámetros.

import type { Locale } from '@yggdrasil-forge/common'
import type {
  ConditionEvaluator,
  TreeDef,
  TreeState,
  UnlockCondition,
  UnlockConditionEvaluation,
  UnlockExplanation,
  UnlockRule,
} from '../types/index.js'
import { messages } from './unlockMessages.js'

/**
 * Interface mínima para inxectar un grafo de dependencias.
 * Implementarase completo en sub-fase 1.9 (DependencyGraph).
 */
export interface DependencyGraphLike {
  /**
   * Distancia (en steps de edges) entre dous nodos.
   * Devolve Infinity se non hai camiño.
   */
  distanceBetween(fromId: string, toId: string): number
}

/**
 * Contexto pasado ao UnlockResolver.
 */
export interface UnlockResolverContext {
  readonly treeDef: TreeDef
  readonly state: TreeState
  readonly dependencyGraph?: DependencyGraphLike
  readonly customEvaluators?: ReadonlyMap<string, ConditionEvaluator>
  readonly locale?: Locale
}

/**
 * Avalía UnlockRules e UnlockConditions.
 *
 * Stateless: todos os métodos son puros respecto ao contexto que se pasa.
 *
 * @example
 * const resolver = new UnlockResolver()
 * const canUnlock = resolver.evaluate(
 *   { type: 'all', conditions: [
 *     { type: 'node_unlocked', nodeId: 'a' },
 *     { type: 'resource_min', resourceId: 'xp', amount: 100 },
 *   ] },
 *   { treeDef, state }
 * )
 */
export class UnlockResolver {
  /**
   * Avalía un UnlockRule. Versión rápida (boolean).
   *
   * Usa short-circuit: en 'all' para no primeiro fallo, en 'any' para no primeiro éxito.
   */
  evaluate(rule: UnlockRule, ctx: UnlockResolverContext): boolean {
    // Atómica directa.
    if (this.isAtomic(rule)) {
      return this.evaluateCondition(rule, ctx)
    }

    if (rule.type === 'all') {
      if (rule.conditions.length === 0) {
        return true
      }
      return rule.conditions.every((c) => this.evaluateCondition(c, ctx))
    }

    if (rule.type === 'any') {
      if (rule.conditions.length === 0) {
        return false
      }
      return rule.conditions.some((c) => this.evaluateCondition(c, ctx))
    }

    // rule.type === 'none'
    if (rule.conditions.length === 0) {
      return true
    }
    return !rule.conditions.some((c) => this.evaluateCondition(c, ctx))
  }

  /**
   * Avalía unha condición atómica.
   */
  evaluateCondition(condition: UnlockCondition, ctx: UnlockResolverContext): boolean {
    switch (condition.type) {
      case 'node_unlocked':
        return this.checkNodeUnlocked(condition.nodeId, ctx)

      case 'node_maxed':
        return this.checkNodeMaxed(condition.nodeId, ctx)

      case 'node_state':
        return this.checkNodeState(condition.nodeId, condition.state, ctx)

      case 'nodes_count':
        return this.countUnlockedNodes(condition.scope, ctx) >= condition.count

      case 'resource_min':
        return this.getResource(condition.resourceId, ctx) >= condition.amount

      case 'tier_min':
        return this.getCurrentTier(condition.nodeId, ctx) >= condition.tier

      case 'distance_max':
        return this.checkDistance(condition.fromNodeId, condition.maxSteps, ctx)

      case 'tag_count':
        return this.countNodesWithTag(condition.tag, ctx) >= condition.count

      case 'progress_min':
        return this.getProgress(condition.nodeId, ctx) >= condition.percent

      case 'subtree_completion':
        return (
          this.getSubtreeCompletion(condition.subtreeId, ctx) >= condition.percent
        )

      case 'stat_min':
        return this.getStat(condition.statId, ctx) >= condition.amount

      case 'time_after':
        return Date.now() >= condition.timestamp

      case 'time_before':
        return Date.now() < condition.timestamp

      case 'custom':
        return this.evaluateCustom(condition.evaluator, ctx)
    }
  }

  /**
   * Versión detallada que devolve explicación localizada.
   * Avalía TODAS as condicións (sen short-circuit) para ofrecer feedback completo.
   */
  explain(rule: UnlockRule, ctx: UnlockResolverContext): UnlockExplanation {
    if (this.isAtomic(rule)) {
      const evaluation = this.explainCondition(rule, ctx)
      return {
        satisfied: evaluation.satisfied,
        conditions: [evaluation],
      }
    }

    const evaluations = rule.conditions.map((c) => this.explainCondition(c, ctx))

    let satisfied: boolean
    if (rule.type === 'all') {
      satisfied = evaluations.length === 0 || evaluations.every((e) => e.satisfied)
    } else if (rule.type === 'any') {
      satisfied = evaluations.length > 0 && evaluations.some((e) => e.satisfied)
    } else {
      // none
      satisfied = evaluations.length === 0 || !evaluations.some((e) => e.satisfied)
    }

    return {
      satisfied,
      conditions: evaluations,
    }
  }

  // ───────────────────────────────────────────────
  // Helpers de avaliación individual
  // ───────────────────────────────────────────────

  private explainCondition(
    condition: UnlockCondition,
    ctx: UnlockResolverContext,
  ): UnlockConditionEvaluation {
    switch (condition.type) {
      case 'node_unlocked': {
        const satisfied = this.checkNodeUnlocked(condition.nodeId, ctx)
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodeUnlocked.satisfied(condition.nodeId)
            : messages.nodeUnlocked.notSatisfied(condition.nodeId),
        }
      }

      case 'node_maxed': {
        const satisfied = this.checkNodeMaxed(condition.nodeId, ctx)
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodeMaxed.satisfied(condition.nodeId)
            : messages.nodeMaxed.notSatisfied(condition.nodeId),
        }
      }

      case 'node_state': {
        const satisfied = this.checkNodeState(condition.nodeId, condition.state, ctx)
        const instance = ctx.state.nodes[condition.nodeId]
        const current = instance?.state ?? 'locked'
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodeState.satisfied(condition.nodeId, condition.state)
            : messages.nodeState.notSatisfied(
                condition.nodeId,
                condition.state,
                current,
              ),
        }
      }

      case 'nodes_count': {
        const actual = this.countUnlockedNodes(condition.scope, ctx)
        const satisfied = actual >= condition.count
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodesCount.satisfied(condition.count, condition.scope)
            : messages.nodesCount.notSatisfied(
                condition.count,
                condition.scope,
                actual,
              ),
        }
      }

      case 'resource_min': {
        const current = this.getResource(condition.resourceId, ctx)
        const satisfied = current >= condition.amount
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.resourceMin.satisfied(condition.resourceId, condition.amount)
            : messages.resourceMin.notSatisfied(
                condition.resourceId,
                condition.amount,
                current,
              ),
        }
      }

      case 'tier_min': {
        const current = this.getCurrentTier(condition.nodeId, ctx)
        const satisfied = current >= condition.tier
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.tierMin.satisfied(condition.nodeId, condition.tier)
            : messages.tierMin.notSatisfied(
                condition.nodeId,
                condition.tier,
                current,
              ),
        }
      }

      case 'distance_max': {
        if (ctx.dependencyGraph === undefined) {
          return {
            condition,
            satisfied: false,
            reason: messages.distanceMax.noGraph(),
          }
        }
        const satisfied = this.checkDistance(
          condition.fromNodeId,
          condition.maxSteps,
          ctx,
        )
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.distanceMax.satisfied(
                condition.fromNodeId,
                condition.maxSteps,
              )
            : messages.distanceMax.notSatisfied(
                condition.fromNodeId,
                condition.maxSteps,
              ),
        }
      }

      case 'tag_count': {
        const actual = this.countNodesWithTag(condition.tag, ctx)
        const satisfied = actual >= condition.count
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.tagCount.satisfied(condition.tag, condition.count)
            : messages.tagCount.notSatisfied(
                condition.tag,
                condition.count,
                actual,
              ),
        }
      }

      case 'progress_min': {
        const current = this.getProgress(condition.nodeId, ctx)
        const satisfied = current >= condition.percent
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.progressMin.satisfied(condition.nodeId, condition.percent)
            : messages.progressMin.notSatisfied(
                condition.nodeId,
                condition.percent,
                current,
              ),
        }
      }

      case 'subtree_completion': {
        const actual = this.getSubtreeCompletion(condition.subtreeId, ctx)
        const satisfied = actual >= condition.percent
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.subtreeCompletion.satisfied(
                condition.subtreeId,
                condition.percent,
              )
            : messages.subtreeCompletion.notSatisfied(
                condition.subtreeId,
                condition.percent,
                actual,
              ),
        }
      }

      case 'stat_min': {
        const current = this.getStat(condition.statId, ctx)
        const satisfied = current >= condition.amount
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.statMin.satisfied(condition.statId, condition.amount)
            : messages.statMin.notSatisfied(
                condition.statId,
                condition.amount,
                current,
              ),
        }
      }

      case 'time_after': {
        const satisfied = Date.now() >= condition.timestamp
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.timeAfter.satisfied(condition.timestamp)
            : messages.timeAfter.notSatisfied(condition.timestamp),
        }
      }

      case 'time_before': {
        const satisfied = Date.now() < condition.timestamp
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.timeBefore.satisfied(condition.timestamp)
            : messages.timeBefore.notSatisfied(condition.timestamp),
        }
      }

      case 'custom': {
        if (ctx.customEvaluators === undefined) {
          return {
            condition,
            satisfied: false,
            reason: messages.custom.notRegistered(condition.evaluator),
          }
        }
        const evaluator = ctx.customEvaluators.get(condition.evaluator)
        if (evaluator === undefined) {
          return {
            condition,
            satisfied: false,
            reason: messages.custom.notRegistered(condition.evaluator),
          }
        }
        const satisfied = evaluator({})
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.custom.satisfied(condition.evaluator)
            : messages.custom.notSatisfied(condition.evaluator),
        }
      }
    }
  }

  // ───────────────────────────────────────────────
  // Predicados primitivos
  // ───────────────────────────────────────────────

  private isAtomic(rule: UnlockRule): rule is UnlockCondition {
    return rule.type !== 'all' && rule.type !== 'any' && rule.type !== 'none'
  }

  private checkNodeUnlocked(nodeId: string, ctx: UnlockResolverContext): boolean {
    const instance = ctx.state.nodes[nodeId]
    if (instance === undefined) {
      return false
    }
    return instance.state === 'unlocked' || instance.state === 'maxed'
  }

  private checkNodeMaxed(nodeId: string, ctx: UnlockResolverContext): boolean {
    const instance = ctx.state.nodes[nodeId]
    return instance?.state === 'maxed'
  }

  private checkNodeState(
    nodeId: string,
    state: string,
    ctx: UnlockResolverContext,
  ): boolean {
    const instance = ctx.state.nodes[nodeId]
    return instance?.state === state
  }

  private countUnlockedNodes(
    scope: string | undefined,
    ctx: UnlockResolverContext,
  ): number {
    let count = 0
    for (const [nodeId, instance] of Object.entries(ctx.state.nodes)) {
      if (instance.state !== 'unlocked' && instance.state !== 'maxed') {
        continue
      }
      if (scope === undefined) {
        count++
        continue
      }
      // Scope = group ou tag. Procurar no NodeDef.
      const def = ctx.treeDef.nodes.find((n) => n.id === nodeId)
      if (def === undefined) {
        continue
      }
      if (def.group === scope || def.tags?.includes(scope) === true) {
        count++
      }
    }
    return count
  }

  private getResource(resourceId: string, ctx: UnlockResolverContext): number {
    return ctx.state.budget.resources[resourceId] ?? 0
  }

  private getCurrentTier(nodeId: string, ctx: UnlockResolverContext): number {
    return ctx.state.nodes[nodeId]?.currentTier ?? 0
  }

  private checkDistance(
    fromNodeId: string,
    maxSteps: number,
    ctx: UnlockResolverContext,
  ): boolean {
    if (ctx.dependencyGraph === undefined) {
      return false
    }
    // Aínda que iso é "distancia DENDE algún nodo unlocked ata aquí",
    // o significado exacto dependerá do TreeEngine ao chamar. Por agora,
    // tomamos a distancia "desde fromNodeId ata algún nodo unlocked".
    // Implementación mínima: comprobar se hai un nodo unlocked a <= maxSteps de fromNodeId.
    for (const [nodeId, instance] of Object.entries(ctx.state.nodes)) {
      if (instance.state !== 'unlocked' && instance.state !== 'maxed') {
        continue
      }
      const distance = ctx.dependencyGraph.distanceBetween(fromNodeId, nodeId)
      if (distance <= maxSteps) {
        return true
      }
    }
    return false
  }

  private countNodesWithTag(tag: string, ctx: UnlockResolverContext): number {
    let count = 0
    for (const [nodeId, instance] of Object.entries(ctx.state.nodes)) {
      if (instance.state !== 'unlocked' && instance.state !== 'maxed') {
        continue
      }
      const def = ctx.treeDef.nodes.find((n) => n.id === nodeId)
      if (def?.tags?.includes(tag) === true) {
        count++
      }
    }
    return count
  }

  private getProgress(nodeId: string, ctx: UnlockResolverContext): number {
    return ctx.state.nodes[nodeId]?.progress ?? 0
  }

  private getSubtreeCompletion(
    subtreeId: string,
    ctx: UnlockResolverContext,
  ): number {
    const subtreeState = ctx.state.subtreeStates?.[subtreeId]
    if (subtreeState === undefined) {
      return 0
    }
    const subtreeDef = ctx.treeDef.subtrees?.[subtreeId]
    if (subtreeDef === undefined || subtreeDef.nodes.length === 0) {
      return 0
    }
    const totalNodes = subtreeDef.nodes.length
    let unlockedCount = 0
    for (const instance of Object.values(subtreeState.nodes)) {
      if (instance.state === 'unlocked' || instance.state === 'maxed') {
        unlockedCount++
      }
    }
    return (unlockedCount / totalNodes) * 100
  }

  private getStat(statId: string, ctx: UnlockResolverContext): number {
    return ctx.state.computedStats?.[statId] ?? 0
  }

  private evaluateCustom(
    evaluatorId: string,
    ctx: UnlockResolverContext,
  ): boolean {
    const evaluator = ctx.customEvaluators?.get(evaluatorId)
    if (evaluator === undefined) {
      return false
    }
    return evaluator({})
  }
}
// ── FIN: UnlockResolver ──
```

### 5.3 Actualizar packages/core/src/engine/index.ts

Substituír por:

```typescript
// ── INICIO: engine public API ──
// Exporta as pezas do motor.

export { EventEmitter, type Unsubscribe } from './EventEmitter.js'
export {
  ConcurrencyGuard,
  type ConcurrencyGuardOptions,
} from './ConcurrencyGuard.js'
export {
  StateStore,
  type CacheType,
  ALL_CACHE_TYPES,
  type StateListener,
  type StateStoreOptions,
} from './StateStore.js'
export {
  ChangeTracker,
  analyzeChanges,
  type ChangeAnalysis,
  type ChangeConflict,
} from './ChangeTracker.js'
export {
  UnlockResolver,
  type DependencyGraphLike,
  type UnlockResolverContext,
} from './UnlockResolver.js'
// ── FIN: engine public API ──
```

### 5.4 Tests

Crear `packages/core/__tests__/engine/UnlockResolver.test.ts`:

⚠️ O ficheiro de tests é longo — divídeo en describes por tipo de condición. Suxestión de estrutura:

```typescript
// ── INICIO: tests de UnlockResolver ──
import { describe, expect, it, vi } from 'vitest'
import {
  UnlockResolver,
  type DependencyGraphLike,
  type UnlockResolverContext,
} from '../../src/engine/index.js'
import type {
  ConditionEvaluator,
  NodeInstance,
  TreeDef,
  TreeState,
  UnlockCondition,
  UnlockRule,
} from '../../src/types/index.js'

// ── Helpers ──

function makeTree(nodes: TreeDef['nodes'] = []): TreeDef {
  return {
    id: 'test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes,
    edges: [],
    layout: { type: 'radial' },
  }
}

function makeState(
  nodes: Record<string, NodeInstance> = {},
  resources: Record<string, number> = {},
  computedStats: Record<string, number> = {},
): TreeState {
  return {
    nodes,
    budget: { resources },
    computedStats,
  }
}

function ctx(
  partial: Partial<UnlockResolverContext> & {
    treeDef?: TreeDef
    state?: TreeState
  },
): UnlockResolverContext {
  return {
    treeDef: partial.treeDef ?? makeTree(),
    state: partial.state ?? makeState(),
    ...partial,
  }
}

const resolver = new UnlockResolver()

// ── Tests por tipo de condición ──

describe('UnlockResolver — atomic conditions', () => {
  describe('node_unlocked', () => {
    it('returns true when node is unlocked', () => {
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state })),
      ).toBe(true)
    })

    it('returns true when node is maxed', () => {
      const state = makeState({
        a: { id: 'a', state: 'maxed', currentTier: 5 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state })),
      ).toBe(true)
    })

    it('returns false when node is locked', () => {
      const state = makeState({
        a: { id: 'a', state: 'locked', currentTier: 0 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state })),
      ).toBe(false)
    })

    it('returns false when node does not exist', () => {
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'x' }, ctx({})),
      ).toBe(false)
    })
  })

  describe('node_maxed', () => {
    it('returns true only when maxed', () => {
      const state = makeState({
        a: { id: 'a', state: 'maxed', currentTier: 5 },
        b: { id: 'b', state: 'unlocked', currentTier: 2 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_maxed', nodeId: 'a' }, ctx({ state })),
      ).toBe(true)
      expect(
        resolver.evaluateCondition({ type: 'node_maxed', nodeId: 'b' }, ctx({ state })),
      ).toBe(false)
    })
  })

  describe('node_state', () => {
    it('matches exact state', () => {
      const state = makeState({
        a: { id: 'a', state: 'in_progress', currentTier: 0, progress: 50 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'node_state', nodeId: 'a', state: 'in_progress' },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'node_state', nodeId: 'a', state: 'unlocked' },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('returns false when node missing', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'node_state', nodeId: 'x', state: 'locked' },
          ctx({}),
        ),
      ).toBe(false)
    })
  })

  describe('nodes_count', () => {
    it('counts globally without scope', () => {
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
        c: { id: 'c', state: 'maxed', currentTier: 3 },
        d: { id: 'd', state: 'locked', currentTier: 0 },
      })
      expect(
        resolver.evaluateCondition({ type: 'nodes_count', count: 3 }, ctx({ state })),
      ).toBe(true)
      expect(
        resolver.evaluateCondition({ type: 'nodes_count', count: 4 }, ctx({ state })),
      ).toBe(false)
    })

    it('counts by group scope', () => {
      const tree = makeTree([
        { id: 'a', type: 'small', label: 'A', group: 'gA' },
        { id: 'b', type: 'small', label: 'B', group: 'gB' },
      ])
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'nodes_count', count: 1, scope: 'gA' },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'nodes_count', count: 2, scope: 'gA' },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(false)
    })

    it('counts by tag scope', () => {
      const tree = makeTree([
        { id: 'a', type: 'small', label: 'A', tags: ['social'] },
        { id: 'b', type: 'small', label: 'B', tags: ['social', 'combat'] },
        { id: 'c', type: 'small', label: 'C', tags: ['combat'] },
      ])
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
        c: { id: 'c', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'nodes_count', count: 2, scope: 'social' },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
    })
  })

  describe('resource_min', () => {
    it('returns true when resource >= amount', () => {
      const state = makeState({}, { xp: 100 })
      expect(
        resolver.evaluateCondition(
          { type: 'resource_min', resourceId: 'xp', amount: 100 },
          ctx({ state }),
        ),
      ).toBe(true)
    })

    it('returns false when below', () => {
      const state = makeState({}, { xp: 50 })
      expect(
        resolver.evaluateCondition(
          { type: 'resource_min', resourceId: 'xp', amount: 100 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing resource as 0', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'resource_min', resourceId: 'xp', amount: 1 },
          ctx({}),
        ),
      ).toBe(false)
    })
  })

  describe('tier_min', () => {
    it('compares currentTier', () => {
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 3 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'tier_min', nodeId: 'a', tier: 3 },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'tier_min', nodeId: 'a', tier: 4 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing node as tier 0', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'tier_min', nodeId: 'x', tier: 1 },
          ctx({}),
        ),
      ).toBe(false)
    })
  })

  describe('distance_max', () => {
    it('returns false when no dependencyGraph provided', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
          ctx({}),
        ),
      ).toBe(false)
    })

    it('uses dependencyGraph when provided', () => {
      const graph: DependencyGraphLike = {
        distanceBetween: (from, to) => (from === 'a' && to === 'b' ? 2 : Infinity),
      }
      const state = makeState({
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
          ctx({ state, dependencyGraph: graph }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'distance_max', fromNodeId: 'a', maxSteps: 1 },
          ctx({ state, dependencyGraph: graph }),
        ),
      ).toBe(false)
    })
  })

  describe('tag_count', () => {
    it('counts unlocked nodes with the given tag', () => {
      const tree = makeTree([
        { id: 'a', type: 'small', label: 'A', tags: ['t1'] },
        { id: 'b', type: 'small', label: 'B', tags: ['t1'] },
        { id: 'c', type: 'small', label: 'C', tags: ['t2'] },
      ])
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
        c: { id: 'c', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'tag_count', tag: 't1', count: 2 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'tag_count', tag: 't1', count: 3 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(false)
    })
  })

  describe('progress_min', () => {
    it('checks the node progress', () => {
      const state = makeState({
        a: { id: 'a', state: 'in_progress', currentTier: 0, progress: 75 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'progress_min', nodeId: 'a', percent: 50 },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'progress_min', nodeId: 'a', percent: 80 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing progress as 0', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'progress_min', nodeId: 'x', percent: 1 },
          ctx({}),
        ),
      ).toBe(false)
    })
  })

  describe('subtree_completion', () => {
    it('returns 0% when subtree state missing', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'subtree_completion', subtreeId: 's1', percent: 1 },
          ctx({}),
        ),
      ).toBe(false)
    })

    it('calculates percentage of unlocked nodes', () => {
      const subtreeDef: TreeDef = makeTree([
        { id: 's1.a', type: 'small', label: 'A' },
        { id: 's1.b', type: 'small', label: 'B' },
        { id: 's1.c', type: 'small', label: 'C' },
        { id: 's1.d', type: 'small', label: 'D' },
      ])
      const tree = {
        ...makeTree(),
        subtrees: { s1: subtreeDef },
      }
      const state: TreeState = {
        nodes: {},
        budget: { resources: {} },
        subtreeStates: {
          s1: {
            nodes: {
              's1.a': { id: 's1.a', state: 'unlocked', currentTier: 1 },
              's1.b': { id: 's1.b', state: 'unlocked', currentTier: 1 },
              's1.c': { id: 's1.c', state: 'locked', currentTier: 0 },
              's1.d': { id: 's1.d', state: 'locked', currentTier: 0 },
            },
            budget: { resources: {} },
          },
        },
      }
      // 2/4 = 50%
      expect(
        resolver.evaluateCondition(
          { type: 'subtree_completion', subtreeId: 's1', percent: 50 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'subtree_completion', subtreeId: 's1', percent: 51 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(false)
    })
  })

  describe('stat_min', () => {
    it('reads from computedStats', () => {
      const state = makeState({}, {}, { damage: 50 })
      expect(
        resolver.evaluateCondition(
          { type: 'stat_min', statId: 'damage', amount: 50 },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'stat_min', statId: 'damage', amount: 51 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing stat as 0', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'stat_min', statId: 'unknown', amount: 1 },
          ctx({}),
        ),
      ).toBe(false)
    })
  })

  describe('time_after / time_before', () => {
    it('time_after evaluates against Date.now()', () => {
      const past = Date.now() - 10000
      const future = Date.now() + 10000
      expect(
        resolver.evaluateCondition({ type: 'time_after', timestamp: past }, ctx({})),
      ).toBe(true)
      expect(
        resolver.evaluateCondition({ type: 'time_after', timestamp: future }, ctx({})),
      ).toBe(false)
    })

    it('time_before evaluates against Date.now()', () => {
      const past = Date.now() - 10000
      const future = Date.now() + 10000
      expect(
        resolver.evaluateCondition(
          { type: 'time_before', timestamp: future },
          ctx({}),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition({ type: 'time_before', timestamp: past }, ctx({})),
      ).toBe(false)
    })
  })

  describe('custom', () => {
    it('returns false when customEvaluators not provided', () => {
      expect(
        resolver.evaluateCondition({ type: 'custom', evaluator: 'x' }, ctx({})),
      ).toBe(false)
    })

    it('returns false when evaluator not registered', () => {
      const evaluators = new Map<string, ConditionEvaluator>()
      expect(
        resolver.evaluateCondition(
          { type: 'custom', evaluator: 'missing' },
          ctx({ customEvaluators: evaluators }),
        ),
      ).toBe(false)
    })

    it('uses registered evaluator result', () => {
      const truthy = vi.fn(() => true)
      const falsy = vi.fn(() => false)
      const evaluators = new Map<string, ConditionEvaluator>([
        ['truthy', truthy],
        ['falsy', falsy],
      ])
      expect(
        resolver.evaluateCondition(
          { type: 'custom', evaluator: 'truthy' },
          ctx({ customEvaluators: evaluators }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'custom', evaluator: 'falsy' },
          ctx({ customEvaluators: evaluators }),
        ),
      ).toBe(false)
      expect(truthy).toHaveBeenCalled()
      expect(falsy).toHaveBeenCalled()
    })
  })
})

describe('UnlockResolver — combinators', () => {
  const trueCond: UnlockCondition = { type: 'time_after', timestamp: 0 }
  const falseCond: UnlockCondition = {
    type: 'time_after',
    timestamp: Date.now() + 1_000_000,
  }

  describe('all', () => {
    it('returns true when empty', () => {
      const rule: UnlockRule = { type: 'all', conditions: [] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns true when all satisfied', () => {
      const rule: UnlockRule = { type: 'all', conditions: [trueCond, trueCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns false when any fails', () => {
      const rule: UnlockRule = { type: 'all', conditions: [trueCond, falseCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })
  })

  describe('any', () => {
    it('returns false when empty', () => {
      const rule: UnlockRule = { type: 'any', conditions: [] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })

    it('returns true when at least one satisfied', () => {
      const rule: UnlockRule = { type: 'any', conditions: [falseCond, trueCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns false when none satisfied', () => {
      const rule: UnlockRule = { type: 'any', conditions: [falseCond, falseCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })
  })

  describe('none', () => {
    it('returns true when empty', () => {
      const rule: UnlockRule = { type: 'none', conditions: [] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns true when none satisfied', () => {
      const rule: UnlockRule = { type: 'none', conditions: [falseCond, falseCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns false when any satisfied', () => {
      const rule: UnlockRule = { type: 'none', conditions: [falseCond, trueCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })
  })

  describe('atomic rule (no wrapper)', () => {
    it('evaluates a bare UnlockCondition', () => {
      expect(resolver.evaluate(trueCond, ctx({}))).toBe(true)
      expect(resolver.evaluate(falseCond, ctx({}))).toBe(false)
    })
  })
})

describe('UnlockResolver — explain()', () => {
  it('returns evaluation per condition with localized reason', () => {
    const state = makeState({}, { xp: 50 })
    const rule: UnlockRule = {
      type: 'all',
      conditions: [
        { type: 'resource_min', resourceId: 'xp', amount: 30 },
        { type: 'resource_min', resourceId: 'xp', amount: 100 },
      ],
    }
    const explanation = resolver.explain(rule, ctx({ state }))
    expect(explanation.satisfied).toBe(false)
    expect(explanation.conditions).toHaveLength(2)
    expect(explanation.conditions[0]?.satisfied).toBe(true)
    expect(explanation.conditions[1]?.satisfied).toBe(false)
    // Localized reason: por defecto LocalizedString como obxecto.
    expect(typeof explanation.conditions[0]?.reason).toBe('object')
  })

  it('returns satisfied=true for empty all', () => {
    const explanation = resolver.explain({ type: 'all', conditions: [] }, ctx({}))
    expect(explanation.satisfied).toBe(true)
    expect(explanation.conditions).toHaveLength(0)
  })

  it('returns satisfied=false for empty any', () => {
    const explanation = resolver.explain({ type: 'any', conditions: [] }, ctx({}))
    expect(explanation.satisfied).toBe(false)
  })

  it('returns satisfied=true for empty none', () => {
    const explanation = resolver.explain({ type: 'none', conditions: [] }, ctx({}))
    expect(explanation.satisfied).toBe(true)
  })

  it('explains an atomic rule', () => {
    const state = makeState({}, { xp: 100 })
    const explanation = resolver.explain(
      { type: 'resource_min', resourceId: 'xp', amount: 50 },
      ctx({ state }),
    )
    expect(explanation.satisfied).toBe(true)
    expect(explanation.conditions).toHaveLength(1)
  })

  it('explains distance_max with no graph', () => {
    const explanation = resolver.explain(
      { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
      ctx({}),
    )
    expect(explanation.satisfied).toBe(false)
    expect(explanation.conditions[0]?.reason).toBeDefined()
  })

  it('explains custom missing evaluator', () => {
    const explanation = resolver.explain(
      { type: 'custom', evaluator: 'missing' },
      ctx({}),
    )
    expect(explanation.satisfied).toBe(false)
  })
})
// ── FIN: tests de UnlockResolver ──
```

### 5.5 Verificación local

```bash
pnpm lint:fix
pnpm format
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @yggdrasil-forge/core test:coverage
pnpm validate
```

⚠️ **Cobertura esperada en UnlockResolver:** **100%**. Toda a lóxica é determinística.

⚠️ **Tests de time_after/time_before:** usan Date.now() real. Os tests están deseñados con marxe grande (10000 ms) para evitar flakiness.

### 5.6 Actualizar packages/core/README.md

Engadir despois da sección "ChangeTracker":

```markdown
### UnlockResolver

\`\`\`typescript
import { UnlockResolver } from '@yggdrasil-forge/core'

const resolver = new UnlockResolver()

const canUnlock = resolver.evaluate(
  {
    type: 'all',
    conditions: [
      { type: 'node_unlocked', nodeId: 'panadeiro_inicio' },
      { type: 'resource_min', resourceId: 'xp', amount: 100 },
    ],
  },
  { treeDef, state },
)

// Detailed explanation with localized reasons
const explanation = resolver.explain(rule, { treeDef, state, locale: 'gl' })
for (const e of explanation.conditions) {
  console.info(e.satisfied, e.reason)
}
\`\`\`

Supports all 15 atomic conditions (node_unlocked, resource_min, tier_min,
distance_max, tag_count, progress_min, subtree_completion, stat_min,
time_after, time_before, custom, etc.) and all/any/none combinators.
```

### 5.7 Engadir changeset

```bash
pnpm changeset
```

- Selecciona `@yggdrasil-forge/core`
- **Minor** (non major)
- Summary: `Add UnlockResolver: stateless evaluator of UnlockRules. Supports all 15 atomic conditions, all/any/none combinators, evaluate() for fast boolean and explain() for detailed localized feedback. Accepts injected DependencyGraph (for distance_max) and custom evaluators registry.`

### 5.8 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: `UnlockResolver` class
  - Evaluates `UnlockRule` (all/any/none combinators + atomic conditions)
  - Supports all 15 atomic condition types
  - `evaluate(rule, ctx)` — fast boolean evaluation with short-circuit
  - `evaluateCondition(condition, ctx)` — atomic evaluation
  - `explain(rule, ctx)` — detailed explanation with localized reasons (gl/es/en)
  - Stateless: receives `UnlockResolverContext` (treeDef, state, optional dependencyGraph, customEvaluators, locale)
  - Localized error messages for missing dependency graph and unregistered custom evaluators
  - 100% test coverage
```

### 5.9 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add UnlockResolver with all 15 atomic conditions and explain()"
git push origin main
```

Verifica **CI verde**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN** en todos os ficheiros novos.
- **Idioma de comentarios:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar código.
- **Imports relativos con `.js`**, `import type` para tipos.
- **Cero `any`**, cero `console.log`.
- **Acceso por punto** (`.xp`) en propiedades con identificador válido.
- **Evitar heredoc de Git Bash para TypeScript** (usar create_file directo).
- **CI verde obrigatorio.**

---

## 7. QUE NON FACER

- ❌ Non implementar DependencyGraph (1.9). Aceptase como dependencia inxectada vía `DependencyGraphLike`.
- ❌ Non implementar StatComputer. Le directamente `state.computedStats`.
- ❌ Non implementar plugin registry para custom evaluators. Acéptase como Map opcional.
- ❌ Non engadir lóxica de mutación (o resolver é stateless).
- ❌ Non engadir dependencias externas.

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ `packages/core/src/engine/unlockMessages.ts` con templates gl/es/en para as 15 condicións
2. ✅ `packages/core/src/engine/UnlockResolver.ts` con clase completa
3. ✅ `packages/core/src/engine/index.ts` actualizado
4. ✅ `packages/core/__tests__/engine/UnlockResolver.test.ts` con cobertura 100%
5. ✅ `packages/core/README.md` actualizado
6. ✅ Changeset minor creado
7. ✅ CHANGELOG raíz actualizado
8. ✅ Build, test, validate pasan
9. ✅ CI verde

Mostra ao autor:
```bash
ls packages/core/src/engine/
pnpm --filter @yggdrasil-forge/core test
pnpm --filter @yggdrasil-forge/core test:coverage
git log --oneline -3
```

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.8 — COMPLETADA
═══════════════════════════════════════

✅ UnlockResolver implementado:
   - 15 condicións atómicas soportadas
   - 3 combinadores (all/any/none) + condición simple
   - evaluate() rápido con short-circuit
   - explain() detallado con mensaxes gl/es/en
   - DependencyGraphLike inxectable
   - customEvaluators inxectable

✅ Tests: [N] tests pasan ([M] novos)
✅ Cobertura: 100% en UnlockResolver
✅ Changeset minor creado
✅ CHANGELOG actualizado
✅ CI verde

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor:
[Lista, ou "Ningunha"]

📋 Estado:
LISTO PARA PROCEDER Á SUB-FASE 1.9
(DependencyGraph + CycleDetector — para distance_max e detección de ciclos)
```

---

**FIN DO BRIEFING 1.8**
