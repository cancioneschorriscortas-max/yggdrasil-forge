// ── INICIO: CodeEditor (7.15b, Decisión 1) ──
// **O único ficheiro do paquete que importa CodeMirror** — mesma regra
// de contención que dockview en PanelHost. O resto do editor non sabe
// que CodeMirror existe: recibe texto, emite texto, pinta franxas.
//
// Que compra CM6: sintaxe JSON, plegado (imprescindible a escala —
// pregar o array de nodos), marcas de erro por liña e rendemento
// decente en documentos grandes.
//
// Cores por TOKENS (Decisión 3): a sintaxe mapea a clases CSS
// (.cm-json-*) e as franxas de sección van nun gutter propio
// (.cm-sec-*), ambas estilizadas en styles.css cos tokens
// --editor-code-* definidos nos DOUS temas (A.6.39).

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { HighlightStyle, foldGutter, syntaxHighlighting } from '@codemirror/language'
import { Annotation, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, gutter, keymap, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { type JSX, useEffect, useRef } from 'react'
import type { SectionKind, SectionRange } from './sections.js'

export interface CodeEditorProps {
  /** Texto a amosar. Cambialo desde fóra actualiza a vista (sen disparar onUserEdit). */
  readonly value: string
  /** Só cambios INICIADOS POLO USUARIO (teclear/pegar) — non os programáticos. */
  readonly onUserEdit: (text: string) => void
  /** Rangos de sección para as franxas de cor do gutter. */
  readonly sections: readonly SectionRange[]
  /** Liña (1-based) coa marca de erro de sintaxe, se a hai. */
  readonly errorLine?: number
}

/** Anotación que marca transaccións programáticas (sync externa). */
const externalChange = Annotation.define<boolean>()

// ── Franxas de sección: StateField + gutter propio ──
const setSections = StateEffect.define<readonly SectionRange[]>()
const sectionsField = StateField.define<readonly SectionRange[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSections)) return effect.value
    }
    return value
  },
})

class SectionMarker extends GutterMarker {
  override readonly elementClass: string
  constructor(kind: SectionKind) {
    super()
    this.elementClass = `cm-sec-${kind}`
  }
}
const MARKERS: Record<SectionKind, SectionMarker> = {
  identity: new SectionMarker('identity'),
  nodes: new SectionMarker('nodes'),
  edges: new SectionMarker('edges'),
  resources: new SectionMarker('resources'),
  editor: new SectionMarker('editor'),
}

/** kind da sección á que pertence a liña, ou undefined. */
function sectionAtLine(ranges: readonly SectionRange[], line: number): SectionKind | undefined {
  // O último rango que contén a liña gaña (editor vai despois de tree
  // no ficheiro; os rangos de tree non se solapan entre si).
  let found: SectionKind | undefined
  for (const r of ranges) {
    if (line >= r.fromLine && line <= r.toLine) found = r.kind
  }
  return found
}

const sectionGutter = gutter({
  class: 'cm-section-gutter',
  lineMarker(view, blockInfo) {
    const line = view.state.doc.lineAt(blockInfo.from).number
    const kind = sectionAtLine(view.state.field(sectionsField), line)
    return kind === undefined ? null : MARKERS[kind]
  },
  lineMarkerChange: (update) =>
    update.transactions.some((tr) => tr.effects.some((e) => e.is(setSections))),
})

// ── Marca de erro por liña ──
const setErrorLine = StateEffect.define<number | null>()
const errorLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setErrorLine)) return effect.value
    }
    // Editar o texto invalida a marca (a liña xa non ten por que ser a mesma).
    return tr.docChanged ? null : value
  },
})
const errorLineHighlight = EditorView.decorations.compute([errorLineField], (state) => {
  const line = state.field(errorLineField)
  if (line === null || line < 1 || line > state.doc.lines) return Decoration.none
  return Decoration.set([
    Decoration.line({ class: 'cm-error-line' }).range(state.doc.line(line).from),
  ])
})

// ── Sintaxe → clases CSS (cores en styles.css por tokens) ──
const jsonHighlight = HighlightStyle.define([
  { tag: tags.propertyName, class: 'cm-json-key' },
  { tag: tags.string, class: 'cm-json-string' },
  { tag: tags.number, class: 'cm-json-number' },
  { tag: tags.bool, class: 'cm-json-number' },
  { tag: tags.null, class: 'cm-json-number' },
  { tag: tags.punctuation, class: 'cm-json-punct' },
  { tag: tags.brace, class: 'cm-json-punct' },
  { tag: tags.squareBracket, class: 'cm-json-punct' },
  { tag: tags.separator, class: 'cm-json-punct' },
])

export function CodeEditor({
  value,
  onUserEdit,
  sections,
  errorLine,
}: CodeEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Ref para que o updateListener (creado unha vez) vexa sempre o
  // callback actual sen recrear a vista.
  const onUserEditRef = useRef(onUserEdit)
  useEffect(() => {
    onUserEditRef.current = onUserEdit
  }, [onUserEdit])

  // Montaxe (unha soa vez).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `value` úsase só como doc INICIAL; os cambios posteriores sincronízanse no efecto de abaixo (recrear a vista por cada cambio destruiría cursor/scroll/foco).
  useEffect(() => {
    if (containerRef.current === null) return
    const view = new EditorView({
      doc: value,
      parent: containerRef.current,
      extensions: [
        lineNumbers(),
        sectionsField,
        sectionGutter,
        foldGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        json(),
        syntaxHighlighting(jsonHighlight),
        errorLineField,
        errorLineHighlight,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return
          const isExternal = update.transactions.some(
            (tr) => tr.annotation(externalChange) === true,
          )
          if (!isExternal) onUserEditRef.current(update.state.doc.toString())
        }),
      ],
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // A vista créase unha vez; value/sections/errorLine sincronízanse
    // nos efectos de abaixo.
  }, [])

  // Sync do texto desde fóra (anotada como externa → non dispara onUserEdit).
  useEffect(() => {
    const view = viewRef.current
    if (view === null) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      annotations: externalChange.of(true),
    })
  }, [value])

  // Sync das franxas de sección.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setSections.of(sections) })
  }, [sections])

  // Sync da marca de erro.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setErrorLine.of(errorLine ?? null) })
  }, [errorLine])

  return <div ref={containerRef} className="editor-code-editor" />
}
// ── FIN: CodeEditor ──
