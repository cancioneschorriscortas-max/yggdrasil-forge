// ── INICIO: fixtures/panadeiro.ts ──
// Fixture do exemplo Oberón (panadeiro). NON se carga por defecto no
// editor — un editor universal de árbores de progresión non debería
// arrincar cun pan_básico e churros.
//
// Reservado para SMOKE TEST VISUAL do desenvolvedor: cando se está
// debugando un cambio na UI e queres verificar que un documento con
// contido se renderiza correctamente (Outliner lista nodos, etc.),
// importa esta fixture en `main.tsx` substituíndo `emptyTree()`.
//
// Cando exista un menú "File → Open example" (decisión de Arquitecto,
// fora do scope de 7.5a), este ficheiro pode promover a fonte oficial
// dos exemplos cargables polo usuario.

import type { TreeDef } from '@yggdrasil-forge/core'
import type { DocumentMeta, ThemeSpec } from '@yggdrasil-forge/editor-core'

export const panadeiroTree: TreeDef = {
  id: 'oberon-panadeiro-shell',
  schemaVersion: '1.0.0',
  version: '0.1.0',
  label: { en: 'Oberón (panadeiro)', gl: 'Oberón (panadeiro)' },
  groups: [
    { id: 'pan', label: { en: 'Bread' } },
    { id: 'docería', label: { en: 'Pastry' } },
  ],
  nodes: [
    { id: 'fariña', type: 'small', label: { en: 'Flour' }, group: 'pan', position: { x: 0, y: 0 } },
    {
      id: 'levadura',
      type: 'small',
      label: { en: 'Yeast' },
      group: 'pan',
      position: { x: 100, y: 0 },
    },
    {
      id: 'pan_básico',
      type: 'keystone',
      label: { en: 'Basic bread' },
      group: 'pan',
      position: { x: 200, y: 0 },
    },
    {
      id: 'masa_dulce',
      type: 'small',
      label: { en: 'Sweet dough' },
      group: 'docería',
      position: { x: 0, y: 200 },
    },
    {
      id: 'churros',
      type: 'keystone',
      label: { en: 'Churros' },
      group: 'docería',
      position: { x: 100, y: 200 },
    },
  ],
  edges: [
    { id: 'e1', source: 'fariña', target: 'pan_básico', type: 'dependency' },
    { id: 'e2', source: 'levadura', target: 'pan_básico', type: 'dependency' },
    { id: 'e3', source: 'fariña', target: 'masa_dulce', type: 'dependency' },
    { id: 'e4', source: 'masa_dulce', target: 'churros', type: 'dependency' },
  ],
  layout: { type: 'custom' },
} as TreeDef

/**
 * Tema de mostra (7.5e §5). Panadeiro cárgase co preset "tintado" +
 * unha rexión tintada para o grupo `pan` (validación visual do
 * ThemePanel dende o arranque).
 */
export const panadeiroTheme: ThemeSpec = {
  preset: 'tintado',
  nodeFills: {
    locked: '#c8c4bb',
    unlockable: '#e6b8a2',
    unlocked: '#7cb37c',
    maxed: '#4a8f4a',
    inProgress: '#e6c98a',
  },
  regions: [{ id: 'pan-region', label: 'Pan', tag: 'pan', color: '#c8875f' }],
}

/** Meta por defecto do panadeiro (bounds + tema). */
export const panadeiroDocumentMeta: Partial<DocumentMeta> = {
  coordinateBounds: { minX: -50, minY: -50, maxX: 300, maxY: 300 },
  theme: panadeiroTheme,
}
// ── FIN: fixtures/panadeiro.ts ──
