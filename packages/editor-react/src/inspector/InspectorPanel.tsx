// ── INICIO: InspectorPanel ──
// Inspector real (7.5c-i/ii + pasada 7.5c-U):
//   - Le o nodo seleccionado desde SelectionEngine.
//   - Itera o nodePropertyRegistry.
//   - Reparte campos en **Básico** (visible) e **Avanzado** (pregado).
//   - Renderiza widget por type.kind con FieldLabel + FieldHelp.
//
// **Multi-selección**: v1 mostra "N seleccionados" sen widgets.
// **Selección baleira**: hint informativo.
// **Re-render en vivo**: useSyncExternalStore.

import type { NodeDef, Resource, StatDef } from '@yggdrasil-forge/core'
import {
  type EditorEngine,
  type PropertyDescriptor,
  type SelectionRef,
  nodePropertyRegistry,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useCallback, useRef, useSyncExternalStore } from 'react'
import { AdvancedSection } from './AdvancedSection.js'
import { TreeInspector } from './TreeInspector.js'
import { StructuredEditor } from './structured/StructuredEditor.js'
import { CheckboxWidget } from './widgets/CheckboxWidget.js'
import { ColorWidget } from './widgets/ColorWidget.js'
import { EnumWidget } from './widgets/EnumWidget.js'
import { FieldHelp, FieldLabel } from './widgets/FieldLabel.js'
import { LocalizedTextWidget } from './widgets/LocalizedTextWidget.js'
import { NumberWidget } from './widgets/NumberWidget.js'
import { TextWidget } from './widgets/TextWidget.js'

export interface InspectorPanelProps {
  readonly editorEngine: EditorEngine
}

/** Cache estable para current() (patrón documentado). */
function useSelectedRefs(editorEngine: EditorEngine): readonly SelectionRef[] {
  const selection = editorEngine.getSession().selection
  const cacheRef = useRef<readonly SelectionRef[]>([])
  const subscribe = useCallback(
    (cb: () => void) => {
      const unsubscribe = selection.subscribe(() => {
        cacheRef.current = selection.current()
        cb()
      })
      cacheRef.current = selection.current()
      return unsubscribe
    },
    [selection],
  )
  const getSnapshot = useCallback(() => cacheRef.current, [])
  const getServerSnapshot = useCallback(() => cacheRef.current, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Extrae string localizada priorizando gl. */
function pickText(loc: PropertyDescriptor['label'] | undefined): string {
  if (loc === undefined) return ''
  if (typeof loc === 'string') return loc
  return loc.gl ?? loc.en ?? Object.values(loc)[0] ?? ''
}

export function InspectorPanel({ editorEngine }: InspectorPanelProps): JSX.Element {
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )
  const selectedRefs = useSelectedRefs(editorEngine)

  const nodeRefs = selectedRefs.filter((r) => r.kind === 'node')

  if (nodeRefs.length === 0) {
    return <TreeInspector editorEngine={editorEngine} />
  }

  if (nodeRefs.length > 1) {
    return (
      <div className="editor-inspector editor-inspector--multi">
        <p className="editor-inspector__count">{nodeRefs.length} seleccionados</p>
        <p className="editor-inspector__hint">
          Edición de campo común para varios nodos: posterior. Selecciona un só nodo.
        </p>
      </div>
    )
  }

  const ref = nodeRefs[0]
  if (ref === undefined) return <div className="editor-inspector" />
  const node = doc.tree.nodes.find((n) => n.id === ref.id)
  if (node === undefined) {
    return (
      <div className="editor-inspector editor-inspector--empty">
        <p className="editor-inspector__hint">
          Nodo seleccionado non atopado no documento (id: {ref.id}).
        </p>
      </div>
    )
  }

  const commitField = (descriptor: PropertyDescriptor, value: unknown): void => {
    if (descriptor.readonly === true) return
    try {
      const cmd = descriptor.set(node.id, value)
      editorEngine.dispatch(cmd)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Inspector: commit error', err)
    }
  }

  // Partición: readonly / básico / avanzado.
  const readonlyFields = nodePropertyRegistry.filter((d) => d.readonly === true)
  const basicFields = nodePropertyRegistry.filter((d) => d.readonly !== true && d.advanced !== true)
  const advancedFields = nodePropertyRegistry.filter((d) => d.advanced === true)

  return (
    <div className="editor-inspector">
      {/* Cabeceira: id do nodo + campo readonly (id) inmediatamente debaixo */}
      <header className="editor-inspector__header">
        <span className="editor-inspector__node-id">{node.id}</span>
      </header>
      {readonlyFields.map((d) =>
        renderField(d, node, doc.tree.nodes, doc.tree.resources, doc.tree.stats, commitField),
      )}

      {/* Básico: sempre visible */}
      <section className="editor-inspector__group editor-inspector__group--basic">
        {basicFields.map((d) =>
          renderField(d, node, doc.tree.nodes, doc.tree.resources, doc.tree.stats, commitField),
        )}
      </section>

      {/* Avanzado: pregado por defecto */}
      {advancedFields.length > 0 && (
        <AdvancedSection fieldCount={advancedFields.length}>
          {advancedFields.map((d) =>
            renderField(d, node, doc.tree.nodes, doc.tree.resources, doc.tree.stats, commitField),
          )}
        </AdvancedSection>
      )}
    </div>
  )
}

/**
 * Renderiza un campo cunha estrutura consistente:
 *   [FieldLabel + (?)-tooltip]
 *   [widget]
 *   [FieldHelp (axuda curta sempre visible)]
 */
function renderField(
  d: PropertyDescriptor,
  node: NodeDef,
  allNodes: readonly NodeDef[],
  resources: readonly Resource[] | undefined,
  stats: readonly StatDef[] | undefined,
  commit: (d: PropertyDescriptor, value: unknown) => void,
): JSX.Element {
  const widgetId = `inspector-${d.key}`
  const value = d.get(node)
  const disabled = d.readonly === true

  const widget = renderWidget(
    d,
    widgetId,
    value,
    disabled,
    node,
    allNodes,
    resources,
    stats,
    commit,
  )

  // Resolvo unha aria-label tamén como pickText (ex.: "Etiqueta").
  return (
    <div key={d.key} className="editor-inspector__field">
      <FieldLabel
        htmlFor={widgetId}
        label={d.label}
        {...(d.describe !== undefined && { describe: d.describe })}
        {...(disabled && { readonly: true })}
      />
      {widget}
      <FieldHelp {...(d.describe !== undefined && { describe: d.describe })} />
    </div>
  )
}

/** Despacha polo type.kind. Separado para reducir aniñado do renderField. */
function renderWidget(
  d: PropertyDescriptor,
  widgetId: string,
  value: unknown,
  disabled: boolean,
  node: NodeDef,
  allNodes: readonly NodeDef[],
  resources: readonly Resource[] | undefined,
  stats: readonly StatDef[] | undefined,
  commit: (d: PropertyDescriptor, value: unknown) => void,
): JSX.Element {
  const labelText = pickText(d.label)
  switch (d.type.kind) {
    case 'text':
      return (
        <TextWidget
          id={widgetId}
          value={value as string | undefined}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
    case 'localizedText':
      return (
        <LocalizedTextWidget
          id={widgetId}
          value={value as Parameters<typeof LocalizedTextWidget>[0]['value']}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
    case 'number': {
      const t = d.type
      return (
        <NumberWidget
          id={widgetId}
          value={value as number | undefined}
          disabled={disabled}
          {...(t.min !== undefined && { min: t.min })}
          {...(t.max !== undefined && { max: t.max })}
          {...(t.step !== undefined && { step: t.step })}
          onCommit={(v) => commit(d, v)}
        />
      )
    }
    case 'enum': {
      // Detecta o tipo de enum para pasar o mapa de localización correcto.
      const enumKind: 'nodeType' | 'nodeShape' | 'raw' =
        d.key === 'type' ? 'nodeType' : d.key === 'shape' ? 'nodeShape' : 'raw'
      return (
        <EnumWidget
          enumKind={enumKind}
          id={widgetId}
          value={value as string | undefined}
          options={d.type.options}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
          ariaLabel={labelText}
        />
      )
    }
    case 'color':
      return (
        <ColorWidget
          id={widgetId}
          value={value as string | undefined}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
    case 'boolean':
      return (
        <CheckboxWidget
          id={widgetId}
          value={value as boolean | undefined}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
    case 'structured':
      return (
        <StructuredEditor
          typeInfo={d.type}
          value={value}
          currentNode={node}
          allNodes={allNodes}
          resources={resources}
          stats={stats}
          onCommit={(next) => commit(d, next)}
        />
      )
    default: {
      const _exhaust: never = d.type
      void _exhaust
      return <span />
    }
  }
}
// ── FIN: InspectorPanel ──
