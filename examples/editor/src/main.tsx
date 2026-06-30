// ── INICIO: examples/editor/main.tsx ──
// App runnable que monta o EditorShell co estado inicial neutro
// (documento baleiro). O editor é universal — non se "tematiza" por
// proxecto editado e non arranca cun contido específico.
//
// **Estado inicial**: documento baleiro etiquetado "Untitled". O
// Outliner mostra "empty document"; a StatusBar amosa 0 nodos / 0
// arestas. Cando exista un menú "File → New / Open example..."
// (decisión de Arquitecto, fora do scope de 7.5a), substituirase
// esta inicialización por unha pantalla de bienvenida ou similar.
//
// **Smoke test visual**: para debugar un cambio na UI cun documento
// que conteña contido (Outliner con nodos, etc.), importa unha
// fixture e substitúe `emptyTree()`:
//
//   import { panadeiroTree } from './fixtures/panadeiro.js'
//   const doc = createEditorDocument(panadeiroTree, { ... })

import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { EditorShell } from '@yggdrasil-forge/editor-react'
import 'dockview-react/dist/styles/dockview.css'
import '@yggdrasil-forge/editor-react/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Constrúe un TreeDef mínimo válido (cero nodos, cero arestas).
 * `schemaVersion`/`version`/`label`/`groups`/`nodes`/`edges`/`layout`
 * son os campos requiridos polo schema; con todo a estructura é
 * estructuralmente válida e o validador estrutural pasa.
 */
function emptyTree(): TreeDef {
  return {
    id: 'untitled',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Untitled', gl: 'Sen título' },
    groups: [],
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

const doc = createEditorDocument(emptyTree())
const engine = new EditorEngine(doc)

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <StrictMode>
    <EditorShell engine={engine} />
  </StrictMode>,
)
// ── FIN: examples/editor/main.tsx ──
