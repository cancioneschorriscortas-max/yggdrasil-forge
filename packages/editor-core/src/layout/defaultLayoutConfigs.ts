// ── INICIO: defaultLayoutConfigs (7.16, Cambio 1) ──
// Configs por defecto dos motores de layout, DERIVADAS DO DATO.
// Un só módulo para que as fórmulas vivan xuntas e afinen xuntas.
//
// Lección vinculante (Annex A.6.9): `radius` de radial e `groupRadius`
// de clustered-radial son OBRIGATORIOS — un briefing vello asumiunos
// opcionais e saíu SVG en branco. Aquí calcúlanse SEMPRE.
//
// Cada fórmula leva unha liña de porqué. Afinadas coa galería
// (panadeiro / adversarial / gaia-cards) e o gate visual do dono.

import type { TreeDef } from '@yggdrasil-forge/core'

/** Algoritmos expostos por «Dispor» (identity/custom quedan fóra: non colocan). */
export type AutoLayoutAlgo = 'radial' | 'tree' | 'clustered-radial' | 'constellation'

export const AUTO_LAYOUT_ALGOS: readonly AutoLayoutAlgo[] = [
  'radial',
  'tree',
  'clustered-radial',
  'constellation',
]

/** Config de layout por defecto para `algo`, derivada da forma da árbore. */
export function defaultLayoutConfig(algo: AutoLayoutAlgo, tree: TreeDef): TreeDef['layout'] {
  const nodeCount = Math.max(1, tree.nodes.length)
  // Grupos efectivos: os declarados + 1 polo __ungrouped__ que o motor
  // clustered xa modela (os nodos orfos van sempre a algún sitio).
  const groupCount = Math.max(1, (tree.groups?.length ?? 0) + 1)
  const maxGroupSize = Math.max(
    1,
    ...(tree.groups ?? []).map(
      (g) => (g.nodeIds?.length ?? 0) + tree.nodes.filter((n) => n.group === g.id).length,
    ),
    tree.nodes.filter((n) => n.group === undefined).length,
  )

  switch (algo) {
    case 'radial':
      // Separación de arco ~72px por nodo (2πr/n) cun chan de 160 para
      // que as árbores pequenas non queden pegadas ao centro.
      return { type: 'radial', radius: Math.max(160, Math.round(nodeCount * 11.5)) }
    case 'tree':
      // Espazados fixos sensatos: o motor por niveis xa reparte o ancho;
      // 90/130 dan aire aos labels sen estratosfera nas árbores fondas.
      return { type: 'tree', nodeSpacing: 90, levelSpacing: 130 }
    case 'clustered-radial':
      // Anel de grupos: ~110px de arco por grupo (chan 240 para que 2-3
      // grupos non se solapen coa coroa); órbita segundo o grupo maior.
      return {
        type: 'clustered-radial',
        groupRadius: Math.max(240, Math.round(groupCount * 55)),
        orbitRadius: Math.max(70, Math.round(maxGroupSize * 16)),
      }
    case 'constellation':
      // Aneis interior/exterior proporcionais ao tamaño; 0.45 de ratio
      // deixa unha coroa lexible entre ambos.
      return {
        type: 'constellation',
        outerRadius: Math.max(280, Math.round(nodeCount * 12)),
        innerRadius: Math.max(120, Math.round(nodeCount * 5.4)),
      }
  }
}
// ── FIN: defaultLayoutConfigs ──
