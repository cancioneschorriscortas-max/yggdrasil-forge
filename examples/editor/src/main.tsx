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
import type { SerializedDockview } from 'dockview-react'
import { type JSX, StrictMode, useCallback, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { panadeiroDocumentMeta, panadeiroTree } from './fixtures/panadeiro.js'

// ── 7.7 — persistencia da disposición ──
// Clave **versionada**: incrementar LAYOUT_VERSION cando cambien
// os ids/conxunto de paneis, para invalidar layouts vellos sen
// pegarse a bugs de "pestanas orfas". Con versión distinta, fromJSON
// simplemente non atopa o gardado, cae ao default. Cero risco.
const LAYOUT_VERSION = 1
const LAYOUT_STORAGE_KEY = `ygg-editor-layout@v${LAYOUT_VERSION}`

function loadLayout(): SerializedDockview | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === null) return undefined
    return JSON.parse(raw) as SerializedDockview
  } catch {
    return undefined
  }
}
function saveLayout(layout: SerializedDockview): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // Cota chea ou modo privado — silencio.
  }
}
function clearLayout(): void {
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY)
  } catch {
    // Idem.
  }
}

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

function App(): JSX.Element {
  const initialLayout = useMemo(() => loadLayout(), [])
  const onLayoutChange = useCallback((layout: SerializedDockview) => saveLayout(layout), [])
  const onLayoutInvalid = useCallback(() => clearLayout(), [])
  return (
    <EditorShell
      engine={engine}
      {...(initialLayout !== undefined && { initialLayout })}
      onLayoutChange={onLayoutChange}
      onLayoutInvalid={onLayoutInvalid}
    />
  )
}

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// ── FIN: examples/editor/main.tsx ──
