// ── INICIO: examples/editor/main.tsx ──
// App runnable que monta o EditorShell coa fixture panadeiro.
// **Cero canvas real aínda** — só o chrome (PanelHost + tres zonas).
// Iso é o que entrega o briefing 7.5a.

import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { EditorShell } from '@yggdrasil-forge/editor-react'
import 'dockview-react/dist/styles/dockview.css'
import '@yggdrasil-forge/editor-react/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ── Fixture panadeiro mínima ──
// Usar a verdadera fixture do exemplo Oberón é máis idiomático, pero
// para 7.5a chega cunha versión inline que cubra a sondaxe visual:
// poucos grupos + nodos para que o Outliner mostre algo de vida.
const tree: TreeDef = {
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

const doc = createEditorDocument(tree, {
  coordinateBounds: { minX: 0, minY: 0, maxX: 1000, maxY: 600 },
})
const engine = new EditorEngine(doc)

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <StrictMode>
    <EditorShell engine={engine} />
  </StrictMode>,
)
// ── FIN: examples/editor/main.tsx ──
