// ── INICIO: tree-def-paladin (Showcase Capa 1a) ──
// Árbore «O Paladín» — 13 nodos exhibindo 11 capacidades do motor:
//
//   1. node_unlocked        (dependencia simple)            → Muro de Escudos
//   2. node_maxed           (require maxed)                 → Furia Berserker
//   3. node_state           (estado unlocked)               → Escudo Divino
//   4. nodes_count + scope  (tag-scoped progression)        → Veterano (4 'warrior')
//   5. tier_min             (tier ≥ N)                      → Campeón (sword tier ≥ 3)
//   6. stat_min             (stat acumulado)                → Xuízo Divino (faith ≥ 10)
//   7. all (AND lóxico)     (conxunción de prereqs)         → Guerreiro Sagrado, Campeón
//   8. any (OR lóxico)      (disxunción de prereqs)         → Aura de Valor
//   9. exclusions           (rama mutuamente excluínte)     → Pacto Escuro
//  10. cost                 (custo en recursos)             → Escudo Divino, Xuízo Divino
//  11. statContributions    (nodos que enchen un stat)      → Luz, Mans, Smite contribúen a faith
//
// Layout `custom` con `position` por nodo (IdentityLayout reproduce
// posicións exactas; 3 columnas a x=80/360/640).
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'

export const paladinTreeDef: TreeDef = {
  id: 'el-paladin',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { gl: 'O Paladín', es: 'El Paladín', en: 'The Paladin' },
  description: {
    gl: 'Un guerreiro que domina a Espada e a Fe. Só quen avanza en ambos camiños alcanza o Paladín puro. Ninguén pode ser á vez Paladín e Herexe.',
    es: 'Un guerrero que domina la Espada y la Fe. Solo quien avanza en ambos caminos alcanza al Paladín puro. Nadie puede ser a la vez Paladín y Hereje.',
    en: 'A warrior who masters Sword and Faith. Only those who advance both paths reach the pure Paladin. None may be both Paladin and Heretic.',
  },
  rootNodeId: 'sword-basics',
  stats: [
    {
      id: 'faith',
      label: { gl: 'Fe', es: 'Fe', en: 'Faith' },
      initial: 6,
      format: 'number',
    },
  ],
  resources: [
    {
      id: 'piety',
      label: { gl: 'Piedade', es: 'Piedad', en: 'Piety' },
      initial: 7,
      max: 20,
      icon: '💧',
      color: '#4aa3df',
      refundable: true,
    },
    // Showcase «Economía de Puntos»: pool xeral de progresión.
    // Cada nodo non-divino consume 1 punto por tier desbloqueado;
    // un multi-tier maxed (ex. sword-basics tier 3) gasta 3 puntos.
    // Inicial = 18, abondo para reproducir o snapshot e deixar marxe
    // visible (5 restantes tras a foto do mockup).
    {
      id: 'skill-points',
      label: { gl: 'Puntos', es: 'Puntos', en: 'Points' },
      initial: 18,
      max: 18,
      icon: '⭐',
      color: '#f0c040',
      refundable: true,
    },
  ],
  startingBudget: { resources: { 'skill-points': 18, piety: 7 } },
  layout: { type: 'custom', curve: 'diagonal-vertical' },
  nodes: [
    // ── Columna esquerda: GUERREIRO ──
    {
      id: 'sword-basics',
      type: 'notable',
      shape: 'circle',
      maxTier: 3,
      label: { gl: 'Esgrima Básica', es: 'Esgrima Básica', en: 'Basic Fencing' },
      tags: ['warrior'],
      position: { x: 80, y: 40 },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'shield-wall',
      type: 'notable',
      shape: 'circle',
      maxTier: 2,
      label: { gl: 'Muro de Escudos', es: 'Muro de Escudos', en: 'Shield Wall' },
      tags: ['warrior'],
      position: { x: 80, y: 190 },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-basics' },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'berserker-rage',
      type: 'notable',
      shape: 'circle',
      maxTier: 1,
      label: { gl: 'Furia Berserker', es: 'Furia Berserker', en: 'Berserker Rage' },
      tags: ['warrior'],
      position: { x: 80, y: 340 },
      prerequisites: { type: 'node_maxed', nodeId: 'sword-basics' },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'war-veteran',
      type: 'notable',
      shape: 'circle',
      maxTier: 1,
      label: { gl: 'Veterano de Guerra', es: 'Veterano de Guerra', en: 'War Veteran' },
      tags: ['warrior'],
      position: { x: 80, y: 490 },
      prerequisites: { type: 'nodes_count', count: 4, scope: 'warrior' },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    // ── Columna central: CONVERXENCIA (hexágonos) ──
    {
      id: 'holy-warrior',
      type: 'keystone',
      shape: 'hexagon',
      maxTier: 1,
      label: { gl: 'Guerreiro Sagrado', es: 'Guerrero Sagrado', en: 'Holy Warrior' },
      position: { x: 360, y: 115 },
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'shield-wall' },
          { type: 'node_unlocked', nodeId: 'healing-hands' },
        ],
      },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'champion-of-light',
      type: 'keystone',
      shape: 'hexagon',
      maxTier: 2,
      label: { gl: 'Campeón da Luz', es: 'Campeón de la Luz', en: 'Champion of Light' },
      position: { x: 360, y: 265 },
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'tier_min', nodeId: 'sword-basics', tier: 3 },
          { type: 'node_unlocked', nodeId: 'smite' },
        ],
      },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'valor-aura',
      type: 'keystone',
      shape: 'hexagon',
      maxTier: 1,
      label: { gl: 'Aura de Valor', es: 'Aura de Valor', en: 'Valor Aura' },
      position: { x: 360, y: 415 },
      prerequisites: {
        type: 'any',
        conditions: [
          { type: 'node_unlocked', nodeId: 'berserker-rage' },
          { type: 'node_unlocked', nodeId: 'divine-shield' },
        ],
      },
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'dark-pact',
      type: 'keystone',
      shape: 'hexagon',
      maxTier: 1,
      label: { gl: 'Pacto Escuro', es: 'Pacto Oscuro', en: 'Dark Pact' },
      color: '#7d3cff',
      position: { x: 360, y: 575 },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-basics' },
      exclusions: ['champion-of-light', 'holy-warrior'],
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    // ── Columna dereita: CLÉRIGO ──
    {
      id: 'holy-light',
      type: 'notable',
      shape: 'circle',
      maxTier: 3,
      label: { gl: 'Luz Sagrada', es: 'Luz Sagrada', en: 'Holy Light' },
      position: { x: 640, y: 40 },
      statContributions: [{ statId: 'faith', op: '+', value: 3 }],
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'healing-hands',
      type: 'notable',
      shape: 'circle',
      maxTier: 2,
      label: { gl: 'Mans Sanadoras', es: 'Manos Sanadoras', en: 'Healing Hands' },
      position: { x: 640, y: 190 },
      prerequisites: { type: 'node_unlocked', nodeId: 'holy-light' },
      statContributions: [{ statId: 'faith', op: '+', value: 2 }],
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'smite',
      type: 'notable',
      shape: 'circle',
      maxTier: 1,
      label: { gl: 'Golpe Divino', es: 'Golpe Divino', en: 'Smite' },
      position: { x: 640, y: 340 },
      prerequisites: { type: 'node_unlocked', nodeId: 'holy-light' },
      statContributions: [{ statId: 'faith', op: '+', value: 1 }],
      cost: [{ resourceId: 'skill-points', amount: 1 }],
    },
    {
      id: 'divine-shield',
      type: 'notable',
      shape: 'circle',
      maxTier: 1,
      label: { gl: 'Escudo Divino', es: 'Escudo Divino', en: 'Divine Shield' },
      position: { x: 640, y: 490 },
      // ⚠️ Capa Reset-Bugs: prereq cambiado de `node_state: 'unlocked'`
      // (estricto, rexeitaba 'maxed') a `node_unlocked` (acepta unlocked
      // OU maxed). O orixinal pretendía demostrar a capacidade
      // `node_state` pero era unha trampa lóxica: max-ear `healing-hands`
      // volvía imposible desbloquear o Escudo Divino. Mantemos a
      // demostración das outras 10 capacidades; `node_state` cae do
      // escaparate.
      prerequisites: { type: 'node_unlocked', nodeId: 'healing-hands' },
      cost: [{ resourceId: 'piety', amount: 3 }],
    },
    {
      id: 'divine-judgment',
      type: 'notable',
      shape: 'circle',
      maxTier: 1,
      label: { gl: 'Xuízo Divino', es: 'Juicio Divino', en: 'Divine Judgment' },
      position: { x: 640, y: 640 },
      prerequisites: { type: 'stat_min', statId: 'faith', amount: 10 },
      cost: [{ resourceId: 'piety', amount: 3 }],
    },
  ],
  edges: [
    { id: 'e1', source: 'sword-basics', target: 'shield-wall', type: 'dependency' },
    { id: 'e2', source: 'sword-basics', target: 'berserker-rage', type: 'dependency' },
    { id: 'e3', source: 'berserker-rage', target: 'war-veteran', type: 'dependency' },
    { id: 'e4', source: 'shield-wall', target: 'holy-warrior', type: 'dependency' },
    { id: 'e5', source: 'healing-hands', target: 'holy-warrior', type: 'dependency' },
    { id: 'e6', source: 'sword-basics', target: 'champion-of-light', type: 'dependency' },
    { id: 'e7', source: 'smite', target: 'champion-of-light', type: 'dependency' },
    { id: 'e8', source: 'berserker-rage', target: 'valor-aura', type: 'dependency' },
    { id: 'e9', source: 'divine-shield', target: 'valor-aura', type: 'soft_dependency' },
    { id: 'e10', source: 'sword-basics', target: 'dark-pact', type: 'dependency' },
    {
      id: 'e11',
      source: 'dark-pact',
      target: 'champion-of-light',
      type: 'exclusion',
      style: { routing: 'orthogonal' },
    },
    {
      id: 'e12',
      source: 'dark-pact',
      target: 'holy-warrior',
      type: 'exclusion',
      style: { routing: 'orthogonal' },
    },
    { id: 'e13', source: 'holy-light', target: 'healing-hands', type: 'dependency' },
    { id: 'e14', source: 'holy-light', target: 'smite', type: 'dependency' },
    { id: 'e15', source: 'healing-hands', target: 'divine-shield', type: 'dependency' },
    { id: 'e16', source: 'holy-light', target: 'divine-judgment', type: 'dependency' },
  ],
}

/**
 * Mapa nodeId → label longo (es) derivado do propio `paladinTreeDef`.
 * Útil para o status panel do demo («Last action: Esgrima Básica»). Cero
 * acoplamento manual: se cambia un label no TreeDef, este mapa actualiza
 * automaticamente.
 */
export const paladinLongLabels: Record<string, string> = Object.fromEntries(
  paladinTreeDef.nodes.map((n) => {
    const label = n.label
    if (typeof label === 'string') return [n.id, label]
    return [n.id, label.es ?? label.gl ?? label.en ?? n.id]
  }),
)

/**
 * Reproduce a foto do mockup do north-star: desbloquea nodos en orde
 * (multi-tier = varios unlock consecutivos para o mesmo id, polo que
 * `sword-basics` desbloquéase 3 veces ata `maxed 3/3`).
 *
 * Chamar **unha soa vez** tras crear o engine; o resto da subscrición
 * actualiza o render automaticamente.
 *
 * Os unlock individuais que poidan fallar (ex. precondicións aínda non
 * satisfeitas se o orde non está perfecto) ignóranse silenciosamente
 * — o setup é best-effort para o demo, non infraestrutura crítica.
 */
export async function setupPaladinSnapshot(engine: TreeEngine): Promise<void> {
  const seq: readonly string[] = [
    'sword-basics', // tier 1
    'sword-basics', // tier 2
    'sword-basics', // tier 3 (→ maxed 3/3)
    'shield-wall', // tier 1
    'shield-wall', // tier 2 (→ maxed 2/2)
    'berserker-rage', // tier 1 (require sword-basics maxed)
    'holy-light', // tier 1
    'holy-light', // tier 2 (→ 2/3)
    'healing-hands', // tier 1 (require holy-light unlocked)
    'smite', // (require holy-light unlocked)
    'holy-warrior', // AND: shield-wall + healing-hands
    'champion-of-light', // tier 1 (AND: tier_min sword 3 + smite unlocked)
    'valor-aura', // OR: berserker-rage OR divine-shield
  ]
  for (const id of seq) {
    await engine.unlock(id)
  }
}
// ── FIN: tree-def-paladin ──
