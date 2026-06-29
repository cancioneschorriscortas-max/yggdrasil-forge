// ── INICIO: fixture mínima para tests do editor-core ──
// TreeDef estritamente local. NON acoplar á dos exemplos (que poden
// cambiar). Cero compromiso de actualidade — só forma válida que pase
// validateTreeDef.

import type { TreeDef } from '@yggdrasil-forge/core'

export function minimalTreeDef(): TreeDef {
  return {
    id: 'editor-core-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { en: 'Editor Core Test Tree' },
    nodes: [
      {
        id: 'root',
        type: 'keystone',
        label: { en: 'Root' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'child',
        type: 'small',
        label: { en: 'Child' },
        position: { x: 100, y: 0 },
      },
    ],
    edges: [{ id: 'e1', source: 'root', target: 'child', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
}
// ── FIN: fixture ──
