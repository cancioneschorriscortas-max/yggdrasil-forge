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
  layout: { type: 'tree' },
  rootNodeId: 'combat',
  nodes: [
    {
      id: 'combat',
      type: 'root',
      label: { en: 'Combat', es: 'Combate', gl: 'Combate' },
    },
    {
      id: 'melee',
      type: 'notable',
      label: { en: 'Melee Combat', es: 'Combate cuerpo a cuerpo', gl: 'Combate corpo a corpo' },
      prerequisites: { type: 'node_unlocked', nodeId: 'combat' },
    },
    {
      id: 'ranged',
      type: 'notable',
      label: { en: 'Ranged Combat', es: 'Combate a distancia', gl: 'Combate á distancia' },
      prerequisites: { type: 'node_unlocked', nodeId: 'combat' },
    },
    {
      id: 'sword-mastery',
      type: 'small',
      label: { en: 'Sword Mastery', es: 'Maestría con espada', gl: 'Mestría con espada' },
      prerequisites: { type: 'node_unlocked', nodeId: 'melee' },
    },
    {
      id: 'shield-bash',
      type: 'small',
      label: { en: 'Shield Bash', es: 'Golpe con escudo', gl: 'Golpe con escudo' },
      prerequisites: { type: 'node_unlocked', nodeId: 'melee' },
    },
    {
      id: 'bow-mastery',
      type: 'small',
      label: { en: 'Bow Mastery', es: 'Maestría con arco', gl: 'Mestría con arco' },
      prerequisites: { type: 'node_unlocked', nodeId: 'ranged' },
    },
    {
      id: 'critical-shot',
      type: 'keystone',
      label: { en: 'Critical Shot', es: 'Disparo crítico', gl: 'Disparo crítico' },
      prerequisites: { type: 'node_unlocked', nodeId: 'bow-mastery' },
    },
    {
      id: 'whirlwind',
      type: 'keystone',
      label: { en: 'Whirlwind', es: 'Torbellino', gl: 'Remuíño' },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-mastery' },
    },
  ],
  edges: [
    { id: 'e-combat-melee', source: 'combat', target: 'melee', type: 'dependency' },
    { id: 'e-combat-ranged', source: 'combat', target: 'ranged', type: 'dependency' },
    { id: 'e-melee-sword', source: 'melee', target: 'sword-mastery', type: 'dependency' },
    { id: 'e-melee-shield', source: 'melee', target: 'shield-bash', type: 'dependency' },
    { id: 'e-ranged-bow', source: 'ranged', target: 'bow-mastery', type: 'dependency' },
    { id: 'e-bow-crit', source: 'bow-mastery', target: 'critical-shot', type: 'dependency' },
    { id: 'e-sword-whirl', source: 'sword-mastery', target: 'whirlwind', type: 'dependency' },
  ],
}
