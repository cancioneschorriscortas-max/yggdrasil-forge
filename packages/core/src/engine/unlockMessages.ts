// ── INICIO: unlockMessages ──
// Templates de mensaxes para o explain() do UnlockResolver.
// Cada función devolve unha LocalizedString xa interpolada.

import type { LocalizedString, SupportedLocale } from '@yggdrasil-forge/common'

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
      /* v8 ignore start -- defensivo: todas as templates do módulo
         pásanlle `vars` cas claves que usan; o `else` (key non en vars) só
         dispara con templates malformados (non existen no repo). */
      if (key in vars) {
        return String(vars[key])
      }
      return match
      /* v8 ignore stop */
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
