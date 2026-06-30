// ── INICIO: InspectorPanel ──
// Inspector real: substitúe o placeholder. Le o nodo seleccionado vía
// `SelectionEngine`, itera o `nodePropertyRegistry` e renderiza widgets
// por `type.kind`.
//
// **Multi-selección**: v1 mostra "N seleccionados" + widgets
// desactivados (edición común é posterior; o briefing pide explicitamente).
//
// **Selección baleira**: mostra placeholder informativo.
//
// **Re-render en vivo**: useSyncExternalStore subscribe ao engine e
// a selection separadamente. Cambiar un campo → engine.dispatch →
// transacción → commit → re-render natural (Inspector + canvas).
//
// **Granularidade de undo**: garantida polos widgets — commit on blur
// nos text/number/color (evita 1-command-por-tecla), commit inmediato
// nos enum/boolean (cambios discretos).

import type { NodeDef } from '@yggdrasil-forge/core'
import {
  type EditorEngine,
  type PropertyDescriptor,
  type SelectionRef,
  nodePropertyRegistry,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useCallback, useRef, useSyncExternalStore } from 'react'
import { CheckboxWidget } from './widgets/CheckboxWidget.js'
import { ColorWidget } from './widgets/ColorWidget.js'
import { EnumWidget } from './widgets/EnumWidget.js'
import { LocalizedTextWidget } from './widgets/LocalizedTextWidget.js'
import { NumberWidget } from './widgets/NumberWidget.js'
import { StructuredSummaryWidget } from './widgets/StructuredSummaryWidget.js'
import { TextWidget } from './widgets/TextWidget.js'

export interface InspectorPanelProps {
  readonly editorEngine: EditorEngine
}

/**
 * Hook auxiliar: subscribe ao SelectionEngine cunha cache estable. Mesmo
 * patrón que en EditorCanvas (current() devolve array novo → bucle se
 * non se cachea).
 */
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

/** Etiquetas dos grupos en galego. */
const GROUP_LABELS: Record<PropertyDescriptor['group'], string> = {
  identity: 'Identidade',
  appearance: 'Aparencia',
  logic: 'Lóxica',
}

/**
 * Resolve a etiqueta dun descriptor en galego (fallback inglés).
 */
function descriptorLabel(d: PropertyDescriptor): string {
  if (typeof d.label === 'string') return d.label
  return d.label.gl ?? d.label.en ?? d.key
}

export function InspectorPanel({ editorEngine }: InspectorPanelProps): JSX.Element {
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )
  const selectedRefs = useSelectedRefs(editorEngine)

  // Filtrar refs de tipo 'node' (Inspector só edita NodeDef en 7.5c).
  const nodeRefs = selectedRefs.filter((r) => r.kind === 'node')

  // ── Sen selección ──
  if (nodeRefs.length === 0) {
    return (
      <div className="editor-inspector editor-inspector--empty">
        <p className="editor-inspector__hint">
          Selecciona un nodo para editar as súas propiedades.
        </p>
      </div>
    )
  }

  // ── Multi-selección (>1) ──
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

  // ── Selección única ──
  const ref = nodeRefs[0]
  if (ref === undefined) return <div className="editor-inspector" />
  const node = doc.tree.nodes.find((n) => n.id === ref.id)
  if (node === undefined) {
    // O nodo desapareceu (raro pero posible: outro proceso o eliminou).
    return (
      <div className="editor-inspector editor-inspector--empty">
        <p className="editor-inspector__hint">
          Nodo seleccionado non atopado no documento (id: {ref.id}).
        </p>
      </div>
    )
  }

  // Agrupar descriptors por `group` para renderizar en seccións.
  const byGroup = new Map<PropertyDescriptor['group'], PropertyDescriptor[]>()
  for (const d of nodePropertyRegistry) {
    const arr = byGroup.get(d.group) ?? []
    arr.push(d)
    byGroup.set(d.group, arr)
  }

  const commitField = (descriptor: PropertyDescriptor, value: unknown): void => {
    if (descriptor.readonly === true) return
    try {
      const cmd = descriptor.set(node.id, value)
      editorEngine.dispatch(cmd)
    } catch (err) {
      // Defensivo: o id descriptor lanza. Outros nunca deberían lanzar.
      // eslint-disable-next-line no-console
      console.error('Inspector: commit error', err)
    }
  }

  return (
    <div className="editor-inspector">
      <header className="editor-inspector__header">
        <span className="editor-inspector__node-id">{node.id}</span>
      </header>
      {Array.from(byGroup.entries()).map(([group, descriptors]) => (
        <section key={group} className="editor-inspector__group">
          <h3 className="editor-inspector__group-title">{GROUP_LABELS[group]}</h3>
          {descriptors.map((d) => renderField(d, node, commitField))}
        </section>
      ))}
    </div>
  )
}

/**
 * Renderiza unha fila <label, widget> para un descriptor. Despacha por
 * `type.kind`.
 */
function renderField(
  d: PropertyDescriptor,
  node: NodeDef,
  commit: (d: PropertyDescriptor, value: unknown) => void,
): JSX.Element {
  const widgetId = `inspector-${d.key}`
  const value = d.get(node)
  const disabled = d.readonly === true
  const labelText = descriptorLabel(d)

  let widget: JSX.Element
  switch (d.type.kind) {
    case 'text':
      widget = (
        <TextWidget
          id={widgetId}
          value={value as string | undefined}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
      break
    case 'localizedText':
      widget = (
        <LocalizedTextWidget
          id={widgetId}
          value={value as Parameters<typeof LocalizedTextWidget>[0]['value']}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
      break
    case 'number': {
      const t = d.type
      widget = (
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
      break
    }
    case 'enum':
      widget = (
        <EnumWidget
          id={widgetId}
          value={value as string | undefined}
          options={d.type.options}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
      break
    case 'color':
      widget = (
        <ColorWidget
          id={widgetId}
          value={value as string | undefined}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
      break
    case 'boolean':
      widget = (
        <CheckboxWidget
          id={widgetId}
          value={value as boolean | undefined}
          disabled={disabled}
          onCommit={(v) => commit(d, v)}
        />
      )
      break
    case 'structured':
      widget = <StructuredSummaryWidget of={d.type.of} value={value} />
      break
    default: {
      // Exhaustividade: se PropertyType medra sin actualizar este switch,
      // TS marcará erro aquí.
      const _exhaust: never = d.type
      void _exhaust
      widget = <span />
    }
  }

  return (
    <div key={d.key} className="editor-inspector__field">
      <label className="editor-inspector__label" htmlFor={widgetId}>
        {labelText}
        {disabled && <span className="editor-inspector__readonly-tag"> (readonly)</span>}
      </label>
      {widget}
    </div>
  )
}
// ── FIN: InspectorPanel ──
