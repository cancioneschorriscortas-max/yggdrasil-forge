// Helper privado para os tests SSR. Cero export desde index.
import type { TreeDef } from '../../src/types/tree.js'

/** Crea unha TreeDef mínima con 3 nodos lineares para tests SSR. */
export function createSimpleTreeDef(
  layoutType: string,
  extras: Record<string, unknown> = {},
): TreeDef {
  return {
    id: 'ssr-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'SSR Test',
    nodes: [
      { id: 'root', type: 'skill', label: 'Root' },
      { id: 'child1', type: 'skill', label: 'Child 1' },
      { id: 'child2', type: 'skill', label: 'Child 2' },
    ],
    edges: [
      { id: 'e1', source: 'root', target: 'child1', type: 'dependency' },
      { id: 'e2', source: 'root', target: 'child2', type: 'dependency' },
    ],
    layout: { type: layoutType, ...extras },
  }
}
