import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'

export const rpgTreeDef: TreeDef = {
  id: 'rpg-character',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: {
    en: 'RPG Character',
    es: 'Personaje RPG',
    gl: 'Personaxe RPG',
  },
  description: {
    en: 'A sample skill tree for an RPG character with melee and ranged branches.',
  },
  rootNodeId: 'combat',
  layout: { type: 'tree', curve: 'diagonal-vertical' },
  nodes: [
    {
      id: 'combat',
      type: 'root',
      icon: '⚔',
      label: { en: 'Combat', es: 'Combate', gl: 'Combate' },
    },
    {
      id: 'melee',
      type: 'notable',
      icon: '🗡',
      label: { en: 'Melee', es: 'Cuerpo', gl: 'Corpo' },
      prerequisites: { type: 'node_unlocked', nodeId: 'combat' },
    },
    {
      id: 'ranged',
      type: 'notable',
      icon: '🏹',
      label: { en: 'Ranged', es: 'Distancia', gl: 'Distancia' },
      prerequisites: { type: 'node_unlocked', nodeId: 'combat' },
    },
    {
      id: 'sword-mastery',
      type: 'small',
      icon: '⚔',
      label: { en: 'Sword', es: 'Espada', gl: 'Espada' },
      prerequisites: { type: 'node_unlocked', nodeId: 'melee' },
    },
    {
      id: 'shield-bash',
      type: 'small',
      icon: '🛡',
      label: { en: 'Shield', es: 'Escudo', gl: 'Escudo' },
      prerequisites: { type: 'node_unlocked', nodeId: 'melee' },
    },
    {
      id: 'bow-mastery',
      type: 'small',
      icon: '🏹',
      label: { en: 'Bow', es: 'Arco', gl: 'Arco' },
      prerequisites: { type: 'node_unlocked', nodeId: 'ranged' },
    },
    {
      id: 'critical-shot',
      type: 'keystone',
      icon: '💥',
      label: { en: 'Crit', es: 'Crítico', gl: 'Crítico' },
      prerequisites: { type: 'node_unlocked', nodeId: 'bow-mastery' },
    },
    {
      id: 'whirlwind',
      type: 'keystone',
      icon: '🌪',
      label: { en: 'Whirl', es: 'Torbellino', gl: 'Remuíño' },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-mastery' },
    },
  ],
  edges: [
    // F10.4: dependencies principais marcadas como directed (con frecha).
    {
      id: 'e-combat-melee',
      source: 'combat',
      target: 'melee',
      type: 'dependency',
      style: { directed: true },
    },
    {
      id: 'e-combat-ranged',
      source: 'combat',
      target: 'ranged',
      type: 'dependency',
      style: { directed: true },
    },
    { id: 'e-melee-sword', source: 'melee', target: 'sword-mastery', type: 'dependency' },
    {
      id: 'e-melee-shield',
      source: 'melee',
      target: 'shield-bash',
      type: 'dependency',
      // F10.4b: override por-edge — este edge úsase como mostra do
      // contrato de datos (`EdgeStyle.routing`), debuxado en ángulos
      // rectos contra os demais curvos da árbore.
      style: { routing: 'orthogonal' },
    },
    { id: 'e-ranged-bow', source: 'ranged', target: 'bow-mastery', type: 'dependency' },
    { id: 'e-bow-crit', source: 'bow-mastery', target: 'critical-shot', type: 'dependency' },
    { id: 'e-sword-whirl', source: 'sword-mastery', target: 'whirlwind', type: 'dependency' },
  ],
}

/**
 * Long label lookup for the side panel. Used when showing details
 * of the currently selected node.
 */
export const longLabels: Record<string, string> = {
  combat: 'Combat',
  melee: 'Melee Combat',
  ranged: 'Ranged Combat',
  'sword-mastery': 'Sword Mastery',
  'shield-bash': 'Shield Bash',
  'bow-mastery': 'Bow Mastery',
  'critical-shot': 'Critical Shot',
  whirlwind: 'Whirlwind',
}
