// ── INICIO: examples/editor/main.tsx ──
// App runnable que monta o EditorShell. Desde 7.10, o editor pasa de
// demo (fixture cableada, morre co F5) a ferramenta real: Novo /
// Importar / Exportar en JSON local, sen backend.
//
// **Principio A.6**: o editor é unha ferramenta sobre dato, non
// contén dato. O paquete @yggdrasil-forge/editor-react non importa
// fixture ningún; é a APP a que decide que documento abrir.
//
// **7.10**: o motor xa non se crea a nivel de módulo — vive en
// estado de React (`useState`), porque substituír o documento
// (Novo/Importar) require un `EditorEngine` novo. O remount
// (`key={docEpoch}`) garante que selección, undo e sesión de proba
// nacen limpos co documento novo; a disposición de paneis NON se
// perde (persiste en localStorage por 7.7, independente do motor).

import type { TreeDef } from '@yggdrasil-forge/core'
import {
  type EditorDocument,
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
  deserializeDocument,
  toJson,
} from '@yggdrasil-forge/editor-core'
import { EditorShell } from '@yggdrasil-forge/editor-react'
import 'dockview-react/dist/styles/dockview.css'
import '@yggdrasil-forge/editor-react/styles.css'
import type { SerializedDockview } from 'dockview-react'
import { type JSX, StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// ── 7.8 — tema do chrome (claro/escuro) ──
// Mesma clave que le o script anti-flash de index.html. Por defecto
// claro; se o localStorage falla (cota/privado) cae en claro tamén.
type EditorTheme = 'light' | 'dark'
const THEME_STORAGE_KEY = 'ygg-editor-theme'

function loadTheme(): EditorTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// ── 7.10 — motor + I/O de documento ──

/** Documento panadeiro por defecto (o mesmo que antes de 7.10). */
function loadDefaultDocument(): EditorDocument {
  // Carga panadeiro como dato + coordinateBounds para que a status bar
  // amose "World W×H" e o SkillTree fit-on-mount encadre ben, e o
  // tema por defecto (7.5e §5) que aplica preset "tintado" + rexión pan.
  return createEditorDocument(panadeiroTree, panadeiroDocumentMeta)
}

/**
 * Árbore baleira para "Novo". Campos mínimos confirmados polo probe
 * A.6.42 (briefing 7.10, Cambio 3): `nodes`/`edges` sen mínimo no
 * schema, pero `id`/`schemaVersion`/`version`/`label`/`layout.type`
 * son obrigatorios.
 */
function emptyTreeDef(): TreeDef {
  return {
    id: 'nova-arbore',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Nova árbore' },
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

function buildEngine(doc: EditorDocument): EditorEngine {
  // ★ 7.5c-ii: rexistrar os soft validators para que o ProblemsPanel
  // reciba warnings (asymmetricExclusion, prerequisiteCycle,
  // layoutOverflow, unsupportedFeature). Os duros (structural,
  // uniqueIds, referentialIntegrity) xa están incluídos polo engine.
  return new EditorEngine(doc, { validators: createDefaultValidators() })
}

function App(): JSX.Element {
  const initialLayout = useMemo(() => loadLayout(), [])
  const onLayoutChange = useCallback((layout: SerializedDockview) => saveLayout(layout), [])
  const onLayoutInvalid = useCallback(() => clearLayout(), [])

  // ── 7.8 — tema do chrome ──
  const [theme, setTheme] = useState<EditorTheme>(() => loadTheme())
  useEffect(() => {
    document.documentElement.dataset.editorTheme = theme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Cota chea ou modo privado — silencio.
    }
  }, [theme])
  const onThemeChange = useCallback((t: EditorTheme) => setTheme(t), [])

  // ── 7.10 — motor en estado + remount por docEpoch ──
  const [engine, setEngine] = useState<EditorEngine>(() => buildEngine(loadDefaultDocument()))
  const [docEpoch, setDocEpoch] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const replaceDocument = useCallback((doc: EditorDocument) => {
    setEngine(buildEngine(doc))
    setDocEpoch((n) => n + 1)
  }, [])

  const handleNew = useCallback(() => {
    if (!window.confirm('Substituír o documento actual? O que non exportaras perderase.')) {
      return
    }
    replaceDocument(createEditorDocument(emptyTreeDef()))
  }, [replaceDocument])

  const handleExport = useCallback(() => {
    const doc = engine.getDocument()
    const json = toJson(doc)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.tree.id || 'arbore'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [engine])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Sempre limpar o input, para poder re-importar o MESMO ficheiro
      // dúas veces seguidas (o navegador non dispara 'change' se o
      // valor non cambia).
      e.target.value = ''
      if (file === undefined) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        const restored = deserializeDocument(text)
        if (!restored.ok) {
          window.alert(`Non se puido importar: ${restored.error.message}`)
          return
        }
        if (!window.confirm('Substituír o documento actual? O que non exportaras perderase.')) {
          return
        }
        replaceDocument(restored.value)
      }
      reader.onerror = () => {
        window.alert('Non se puido importar: erro lendo o ficheiro.')
      }
      reader.readAsText(file)
    },
    [replaceDocument],
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <EditorShell
        key={docEpoch}
        engine={engine}
        {...(initialLayout !== undefined && { initialLayout })}
        onLayoutChange={onLayoutChange}
        onLayoutInvalid={onLayoutInvalid}
        theme={theme}
        onThemeChange={onThemeChange}
        documentActions={{
          onNew: handleNew,
          onImport: handleImportClick,
          onExport: handleExport,
        }}
      />
    </>
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
