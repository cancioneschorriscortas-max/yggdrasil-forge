// ── INICIO: examples/editor/main.tsx ──
// App runnable que monta o EditorShell coa fixture panadeiro cargada
// como DATO (non como engine baked-in). Iso é o que pide o briefing
// 7.5b-i: o canvas aparece pintando un documento real, para que se
// poida verificar o render + pan/zoom + selección por clic.
//
// **Principio A.6**: o editor é unha ferramenta sobre dato, non
// contén dato. O paquete @yggdrasil-forge/editor-react non importa
// fixture ningún; é a APP a que decide que documento abrir.
//
// **Cando exista un menú File → Open example** (decisión de
// Arquitecto), esta inicialización substituirase por unha pantalla
// de bienvenida ou un cargador de exemplos. Mentres tanto, panadeiro
// é o exemplo por defecto para o desenvolvedor ver a UI funcionando.

import {
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
} from '@yggdrasil-forge/editor-core'
import { EditorShell } from '@yggdrasil-forge/editor-react'
import 'dockview-react/dist/styles/dockview.css'
import '@yggdrasil-forge/editor-react/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { panadeiroDocumentMeta, panadeiroTree } from './fixtures/panadeiro.js'

// Carga panadeiro como dato + coordinateBounds para que a status bar
// amose "World W×H" e o SkillTree fit-on-mount encadre ben, e o
// tema por defecto (7.5e §5) que aplica preset "tintado" + rexión pan.
const doc = createEditorDocument(panadeiroTree, panadeiroDocumentMeta)
// ★ 7.5c-ii: rexistrar os soft validators para que o ProblemsPanel
// reciba warnings (asymmetricExclusion, prerequisiteCycle,
// layoutOverflow, unsupportedFeature). Os duros (structural,
// uniqueIds, referentialIntegrity) xa están incluídos polo engine.
const engine = new EditorEngine(doc, {
  validators: createDefaultValidators(),
})

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <StrictMode>
    <EditorShell engine={engine} />
  </StrictMode>,
)
// ── FIN: examples/editor/main.tsx ──
