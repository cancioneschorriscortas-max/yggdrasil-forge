// ── INICIO: CodePanel (7.15b) ──
// Panel «Código»: o JSON do documento EN VIVO mentres editas no
// canvas, con cores que explican (lenda + franxas de sección), onde
// podes pegar JSON (dunha IA, dun compañeiro) e velo converterse en
// árbore. A cara GUI da vía do dato (7.15).
//
// **Máquina de estados (Decisión 2, o corazón UX):**
//   - `synced` (defecto): amosa o doc serializado (indent 2) e
//     actualízase con cada commit do motor (subscrición + debounce
//     ~150ms). En canto o usuario TECLEA ou PEGA → `draft`.
//   - `draft`: a sync PAUSA (nada de pisar o texto mentres escribe).
//     Banner con Validar · Aplicar · Descartar. Se o documento cambia
//     por debaixo, avisa — Aplicar segue sendo substitución completa
//     (last-write-wins consciente e avisado).
//   - Validar corre `deserializeDocument` (o MESMO camiño que o
//     import); Aplicar só se habilita co texto ACTUAL validado, e
//     despacha `replaceDocument` (un paso de undo) + limpa selección.
//
// **Documentos moi grandes:** se a serialización pasa de
// SYNC_SIZE_LIMIT (~2MB), a vista en vivo dexenera HONESTAMENTE a
// actualización baixo demanda (botón «Actualizar») en vez de
// conxelarse re-serializando a cada commit.
//
// CodeMirror queda contido en CodeEditor.tsx; aquí só React + motor.

import {
  type EditorDocument,
  type EditorEngine,
  deserializeDocument,
  replaceDocument,
  serializeDocument,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShellRuntime } from '../../shell/ShellRuntimeContext.js'
import { CodeEditor } from './CodeEditor.js'
import { SECTION_LEGEND, computeSectionRanges } from './sections.js'

/** Limiar de tamaño (chars serializados) para a dexeneración honesta. */
export const SYNC_SIZE_LIMIT = 2_000_000

const SYNC_DEBOUNCE_MS = 150

interface ValidationState {
  readonly ok: boolean
  /** Doc parseado do texto validado (só ok=true) — o que Aplicar aplica. */
  readonly doc?: EditorDocument
  /** Mensaxes de issue (best-effort: o erro agregado pártese en items). */
  readonly issues: readonly string[]
  /** Liña 1-based do erro de sintaxe JSON, se se puido extraer. */
  readonly errorLine?: number
}

/** Serialización canónica para o panel: indent 2 + \n final. */
function prettyDocument(engineDoc: EditorDocument): string {
  return `${JSON.stringify(JSON.parse(serializeDocument(engineDoc)), null, 2)}\n`
}

/** Extrae "line N" da mensaxe de SyntaxError de V8 (best-effort). */
function extractErrorLine(message: string): number | undefined {
  const match = /line (\d+)/.exec(message)
  if (match === null) return undefined
  const line = Number.parseInt(match[1] as string, 10)
  return Number.isFinite(line) && line > 0 ? line : undefined
}

/** Parte a mensaxe agregada en items lexibles (o prefixo fóra). */
function splitIssues(message: string): readonly string[] {
  const idx = message.indexOf(':')
  const body = idx === -1 ? message : message.slice(idx + 1)
  return body
    .split('; ')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export interface CodePanelProps {
  readonly editorEngine: EditorEngine
}

export function CodePanel({ editorEngine }: CodePanelProps): JSX.Element {
  const [mode, setMode] = useState<'synced' | 'draft'>('synced')
  const [syncedText, setSyncedText] = useState(() => prettyDocument(editorEngine.getDocument()))
  const [draftText, setDraftText] = useState('')
  const [validation, setValidation] = useState<ValidationState | null>(null)
  const [docChangedBehind, setDocChangedBehind] = useState(false)
  const [stale, setStale] = useState(false)
  // 15.6 «Ver no código»: Problemas pide revelar un nodo; buscamos
  // `"id": "<nodeId>"` no texto ACTUAL (a mesma técnica honesta que a
  // liña de erro do Validar) e pedímoslle o salto ao CodeEditor.
  const { registerCodeReveal } = useShellRuntime()
  const [reveal, setReveal] = useState<{ line: number; nonce: number } | undefined>(undefined)
  const textRef = useRef('')

  // Refs para que a subscrición (montada unha vez) vexa o estado vivo.
  const modeRef = useRef(mode)
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const refreshSynced = useCallback(() => {
    setSyncedText(prettyDocument(editorEngine.getDocument()))
    setStale(false)
  }, [editorEngine])

  // Subscrición ao motor: en synced, refresco con debounce; en draft,
  // só marco que o documento cambiou por debaixo (aviso do banner).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = editorEngine.subscribe(() => {
      if (modeRef.current === 'draft') {
        setDocChangedBehind(true)
        return
      }
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        // Documentos grandes: sen re-serialización automática — botón.
        const compact = serializeDocument(editorEngine.getDocument())
        if (compact.length > SYNC_SIZE_LIMIT) {
          setStale(true)
          return
        }
        setSyncedText(`${JSON.stringify(JSON.parse(compact), null, 2)}\n`)
        setStale(false)
      }, SYNC_DEBOUNCE_MS)
    })
    return () => {
      if (timer !== null) clearTimeout(timer)
      unsubscribe()
    }
  }, [editorEngine])

  // ── Accións ──
  const handleUserEdit = useCallback((text: string) => {
    setDraftText(text)
    setValidation(null) // editar invalida a validación anterior
    if (modeRef.current === 'synced') {
      setMode('draft')
      setDocChangedBehind(false)
    }
  }, [])

  const handleValidate = useCallback(() => {
    const result = deserializeDocument(draftText)
    if (result.ok) {
      setValidation({ ok: true, doc: result.value, issues: [] })
    } else {
      const message = result.error.message
      const errorLine = extractErrorLine(message)
      setValidation({
        ok: false,
        issues: splitIssues(message),
        ...(errorLine !== undefined && { errorLine }),
      })
    }
  }, [draftText])

  const handleApply = useCallback(() => {
    if (validation?.ok !== true || validation.doc === undefined) return
    const result = editorEngine.transaction({ en: 'Apply code', gl: 'Aplicar código' }, (tx) => {
      tx.apply(replaceDocument(validation.doc as EditorDocument))
    })
    if (!result.ok) {
      // Rede de seguridade (os validadores da transacción rexeitaron):
      // quedamos en borrador coa mensaxe á vista.
      setValidation({ ok: false, issues: splitIssues(result.error.message) })
      return
    }
    // Os ids seleccionados poden non existir no documento novo.
    editorEngine.getSession().selection.clear()
    setMode('synced')
    setValidation(null)
    setDocChangedBehind(false)
    refreshSynced()
  }, [editorEngine, validation, refreshSynced])

  const handleDiscard = useCallback(() => {
    setMode('synced')
    setValidation(null)
    setDocChangedBehind(false)
    refreshSynced()
  }, [refreshSynced])

  // ── Derivados ──
  const text = mode === 'synced' ? syncedText : draftText
  textRef.current = text

  useEffect(() => {
    registerCodeReveal((nodeId: string) => {
      const needle = `"id": "${nodeId}"`
      const idx = textRef.current.indexOf(needle)
      if (idx === -1) return
      const line = textRef.current.slice(0, idx).split('\n').length
      setReveal((prev) => ({ line, nonce: (prev?.nonce ?? 0) + 1 }))
    })
    return () => registerCodeReveal(null)
  }, [registerCodeReveal])
  const sections = useMemo(() => computeSectionRanges(text), [text])

  return (
    <div className="editor-code">
      <header className="editor-code__header">
        <div className="editor-code__legend" aria-label="Lenda de seccións do código">
          {SECTION_LEGEND.map((entry) => (
            <span key={entry.kind} className="editor-code__legend-item">
              <span
                aria-hidden="true"
                className={`editor-code__legend-swatch editor-code__legend-swatch--${entry.kind}`}
              />
              {entry.label}
            </span>
          ))}
        </div>
        {mode === 'synced' && stale && (
          // biome-ignore lint/a11y/useSemanticElements: contedor de estado con accións dentro (non hai elemento HTML semántico equivalente; mesmo precedente que StatusBar).
          <div className="editor-code__stale" role="status">
            <span>Documento grande — vista conxelada.</span>
            <button type="button" className="editor-button" onClick={refreshSynced}>
              Actualizar
            </button>
          </div>
        )}
        {mode === 'draft' && (
          // biome-ignore lint/a11y/useSemanticElements: banner de estado con botóns dentro (mesmo precedente que StatusBar).
          <div className="editor-code__banner" role="status">
            <span className="editor-code__banner-text">
              Editando o código — a vista xa non segue o canvas
              {docChangedBehind && (
                <em className="editor-code__banner-behind">
                  {' '}
                  (o documento cambiou desde que empezaches)
                </em>
              )}
            </span>
            <div className="editor-code__banner-actions">
              <button type="button" className="editor-button" onClick={handleValidate}>
                Validar
              </button>
              <button
                type="button"
                className="editor-button"
                disabled={validation?.ok !== true}
                title={
                  validation?.ok === true
                    ? 'Substituír o documento enteiro (un paso de undo)'
                    : 'Valida primeiro (só se habilita cun documento san)'
                }
                onClick={handleApply}
              >
                Aplicar
              </button>
              <button type="button" className="editor-button" onClick={handleDiscard}>
                Descartar
              </button>
            </div>
          </div>
        )}
        {validation !== null && (
          // biome-ignore lint/a11y/useSemanticElements: resultado de validación como rexión de estado (mesmo precedente que StatusBar).
          <div className="editor-code__validation" role="status">
            {validation.ok ? (
              <p className="editor-code__validation-ok">✓ Documento san — podes Aplicar.</p>
            ) : (
              <ul className="editor-code__issues">
                {validation.issues.map((issue) => (
                  <li key={issue} className="editor-code__issue">
                    <span className="editor-code__issue-sev">erro</span> {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>
      <CodeEditor
        value={text}
        {...(reveal !== undefined && { reveal })}
        onUserEdit={handleUserEdit}
        sections={sections}
        {...(validation?.ok === false &&
          validation.errorLine !== undefined && { errorLine: validation.errorLine })}
      />
    </div>
  )
}
// ── FIN: CodePanel ──
