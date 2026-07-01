// ── INICIO: enumLabels ──
// **Mapas de localización** para os enums usados no editor (7.5c-U):
// `NodeType`, `NodeShape`, e tipos de `Effect`.
//
// **Principio**: os widgets non poden pintar valores crus como
// `"subtree_anchor"` en dropdowns. O usuario le "Áncora de subárbore".
// A mesma información alimenta o dropdown propio (`Select.tsx`) e o
// tooltip por opción.
//
// **★ Cobertura obrigatoria (test)**: se `@core` engade un valor a
// `NodeType`/`NodeShape`/`SUPPORTED_EFFECT_TYPES` sen actualizar o
// mapa, un test específico falla. Mesmo espírito que o gate
// manifesto-descriptor (a "boca" non pode divirxir do dominio).
//
// **Honestidade** (Briefing §7): as descricións non venden. `NodeType`
// só ten un valor con comportamento real no runtime
// (`subtree_anchor`); os demais son categorías visuais. A descrición
// dío.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeShape, NodeType } from '@yggdrasil-forge/core'
import type { SUPPORTED_EFFECT_TYPES } from '@yggdrasil-forge/core'

/** Entrada localizada dun valor de enum. */
export interface EnumLabelEntry {
  readonly label: LocalizedString
  readonly describe?: LocalizedString
}

// ── NodeType ──
export const NODE_TYPE_LABELS: Readonly<Record<NodeType, EnumLabelEntry>> = {
  small: {
    label: { en: 'Small', gl: 'Pequeno' },
    describe: { en: 'Minor node, low weight.', gl: 'Nodo menor, de pouco peso.' },
  },
  notable: {
    label: { en: 'Notable', gl: 'Destacado' },
    describe: {
      en: 'Standout node, above a normal one.',
      gl: 'Salientable, por riba dun normal.',
    },
  },
  keystone: {
    label: { en: 'Keystone', gl: 'Clave' },
    describe: {
      en: 'Central node that marks an important decision.',
      gl: 'Nodo central que marca unha decisión importante.',
    },
  },
  mastery: {
    label: { en: 'Mastery', gl: 'Mestría' },
    describe: {
      en: 'Domain node within a branch.',
      gl: 'Nodo de dominio dentro dunha rama.',
    },
  },
  ascendancy: {
    label: { en: 'Ascendancy', gl: 'Ascensión' },
    describe: { en: 'Advanced specialization.', gl: 'Especialización avanzada.' },
  },
  root: {
    label: { en: 'Root', gl: 'Raíz' },
    describe: {
      en: 'Starting node of a tree or branch.',
      gl: 'O nodo de partida dunha árbore ou rama.',
    },
  },
  cluster: {
    label: { en: 'Cluster', gl: 'Grupo' },
    describe: { en: 'Groups a related set.', gl: 'Agrupa un conxunto relacionado.' },
  },
  gateway: {
    label: { en: 'Gateway', gl: 'Porta' },
    describe: {
      en: 'Transit node that connects sections.',
      gl: 'Nodo de paso que conecta seccións.',
    },
  },
  milestone: {
    label: { en: 'Milestone', gl: 'Fito' },
    describe: {
      en: 'Marks an achievement or important point.',
      gl: 'Marca un logro ou punto importante.',
    },
  },
  subtree_anchor: {
    label: { en: 'Subtree anchor', gl: 'Áncora de subárbore' },
    describe: {
      en: 'Contains another full tree inside (composition). The only type with real runtime behavior.',
      gl: 'Contén outra árbore enteira dentro (composición). O único tipo con comportamento real no motor.',
    },
  },
  custom: {
    label: { en: 'Custom', gl: 'Personalizado' },
    describe: {
      en: 'Free type, no predefined category.',
      gl: 'Tipo libre, sen categoría predefinida.',
    },
  },
}

// ── NodeShape ──
export const NODE_SHAPE_LABELS: Readonly<Record<NodeShape, EnumLabelEntry>> = {
  circle: { label: { en: 'Circle', gl: 'Círculo' } },
  square: { label: { en: 'Square', gl: 'Cadrado' } },
  diamond: { label: { en: 'Diamond', gl: 'Rombo' } },
  hexagon: { label: { en: 'Hexagon', gl: 'Hexágono' } },
  octagon: { label: { en: 'Octagon', gl: 'Octógono' } },
}

// ── Effect types (só os SUPPORTED, dado que o gate manifesto excluíu os UNSUPPORTED) ──
/**
 * Mapa localizado para `SUPPORTED_EFFECT_TYPES`. Cobre tanto os planos
 * (usables en fase 1) como os aniñados (`composite`, `conditional`,
 * lectura só en fase 1).
 */
export const EFFECT_TYPE_LABELS: Readonly<
  Record<(typeof SUPPORTED_EFFECT_TYPES)[number], EnumLabelEntry>
> = {
  modify_resource: {
    label: { en: 'Modify resource', gl: 'Modificar recurso' },
    describe: {
      en: 'Sum, subtract or multiply a resource.',
      gl: 'Sumar, restar ou multiplicar un recurso.',
    },
  },
  modify_node_state: {
    label: { en: 'Modify node state', gl: 'Cambiar estado dun nodo' },
    describe: {
      en: 'Forces another node to a state (locked/unlocked/…).',
      gl: 'Forza outro nodo a un estado (bloqueado/desbloqueado/…).',
    },
  },
  set_node_visibility: {
    label: { en: 'Set node visibility', gl: 'Cambiar visibilidade dun nodo' },
    describe: {
      en: 'Show or hide another node.',
      gl: 'Amosar ou agochar outro nodo.',
    },
  },
  unlock_node: {
    label: { en: 'Unlock node', gl: 'Desbloquear nodo' },
    describe: {
      en: 'Unlocks another node directly.',
      gl: 'Desbloquea outro nodo directamente.',
    },
  },
  set_progress: {
    label: { en: 'Set progress', gl: 'Fixar progreso' },
    describe: {
      en: 'Sets progress percentage on a node.',
      gl: 'Fixa a porcentaxe de progreso dun nodo.',
    },
  },
  trigger_event: {
    label: { en: 'Trigger event', gl: 'Disparar evento' },
    describe: {
      en: 'Emits a named event (external listeners).',
      gl: 'Emite un evento con nome (para listeners externos).',
    },
  },
  conditional: {
    label: { en: 'Conditional', gl: 'Condicional' },
    describe: {
      en: 'Applies an effect only if a condition matches (nested).',
      gl: 'Aplica un efecto só se se cumpre unha condición (aniñado).',
    },
  },
  composite: {
    label: { en: 'Composite', gl: 'Composto' },
    describe: {
      en: 'Applies multiple effects at once (nested).',
      gl: 'Aplica varios efectos á vez (aniñado).',
    },
  },
}

// ── Getters con fallback (nunca devolven undefined; usan o valor cru como último recurso) ──

function pick(loc: LocalizedString | undefined, prefer: 'gl' | 'en' = 'gl'): string | undefined {
  if (loc === undefined) return undefined
  if (typeof loc === 'string') return loc
  return loc[prefer] ?? loc.en ?? Object.values(loc)[0]
}

/** Devolve o label localizado dun NodeType, ou o valor cru se falta (defensivo). */
export function getNodeTypeLabel(v: NodeType, locale: 'gl' | 'en' = 'gl'): string {
  return pick(NODE_TYPE_LABELS[v]?.label, locale) ?? v
}

/** Devolve a descrición localizada dun NodeType, ou undefined se non hai. */
export function getNodeTypeDescribe(v: NodeType, locale: 'gl' | 'en' = 'gl'): string | undefined {
  return pick(NODE_TYPE_LABELS[v]?.describe, locale)
}

export function getNodeShapeLabel(v: NodeShape, locale: 'gl' | 'en' = 'gl'): string {
  return pick(NODE_SHAPE_LABELS[v]?.label, locale) ?? v
}

export function getEffectTypeLabel(type: string, locale: 'gl' | 'en' = 'gl'): string {
  const entry = (EFFECT_TYPE_LABELS as Record<string, EnumLabelEntry | undefined>)[type]
  return pick(entry?.label, locale) ?? type
}

export function getEffectTypeDescribe(
  type: string,
  locale: 'gl' | 'en' = 'gl',
): string | undefined {
  const entry = (EFFECT_TYPE_LABELS as Record<string, EnumLabelEntry | undefined>)[type]
  return pick(entry?.describe, locale)
}
// ── FIN: enumLabels ──
