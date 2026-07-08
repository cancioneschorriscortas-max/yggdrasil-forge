// ── INICIO: TreeInspector ──
// Inspector de árbore (briefing 7.12): cando NON hai nodo
// seleccionado, o Inspector deixa de dicir "Selecciona un nodo…" e
// pasa a editar a ÁRBORE — identidade + recursos.
//
// Mesmo patrón que InspectorPanel (registry-driven para Identidade),
// máis un editor estruturado propio para Recursos (mesmo estilo que
// CostPerTierEditor: lista de filas con engadir/eliminar).

import type { TreeDef } from '@yggdrasil-forge/core'
import {
  type EditorEngine,
  type TreePropertyDescriptor,
  setTreeField,
  treePropertyRegistry,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'
import { AdvancedSection } from './AdvancedSection.js'
import { ResourcesEditor } from './structured/ResourcesEditor.js'
import { FieldHelp, FieldLabel } from './widgets/FieldLabel.js'
import { LocalizedTextWidget } from './widgets/LocalizedTextWidget.js'
import { TextWidget } from './widgets/TextWidget.js'

export interface TreeInspectorProps {
  readonly editorEngine: EditorEngine
}

/** Extrae string localizada priorizando gl, para a cabeceira. */
function pickText(loc: TreeDef['label'] | undefined): string {
  if (loc === undefined) return ''
  if (typeof loc === 'string') return loc
  return loc.gl ?? loc.en ?? Object.values(loc)[0] ?? ''
}

export function TreeInspector({ editorEngine }: TreeInspectorProps): JSX.Element {
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )
  const tree = doc.tree

  const commitField = (descriptor: TreePropertyDescriptor, value: unknown): void => {
    if (descriptor.readonly === true) return
    try {
      const cmd = descriptor.set(value)
      editorEngine.dispatch(cmd)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('TreeInspector: commit error', err)
    }
  }

  const readonlyFields = treePropertyRegistry.filter((d) => d.readonly === true)
  const basicFields = treePropertyRegistry.filter((d) => d.readonly !== true && d.advanced !== true)
  const advancedFields = treePropertyRegistry.filter((d) => d.advanced === true)

  return (
    <div className="editor-inspector editor-inspector--tree">
      <header className="editor-inspector__header editor-inspector__header--tree">
        <span className="editor-inspector__node-id">{pickText(tree.label) || tree.id}</span>
        <span className="editor-inspector__tree-subtitle">Propiedades da árbore</span>
      </header>

      <section className="editor-inspector__group editor-inspector__group--basic">
        {basicFields.map((d) => renderField(d, tree, commitField))}
      </section>

      <section className="editor-inspector__group">
        <h3 className="editor-inspector__group-title">Recursos</h3>
        <p className="editor-inspector__hint">
          As moedas da árbore: o que se gasta ao desbloquear nodos.
        </p>
        <ResourcesEditor
          value={tree.resources}
          onCommit={(next) => editorEngine.dispatch(setTreeField('resources', next))}
        />
      </section>

      {(advancedFields.length > 0 || readonlyFields.length > 0) && (
        <AdvancedSection fieldCount={advancedFields.length + readonlyFields.length}>
          {readonlyFields.map((d) => renderField(d, tree, commitField))}
          {advancedFields.map((d) => renderField(d, tree, commitField))}
        </AdvancedSection>
      )}
    </div>
  )
}

function renderField(
  d: TreePropertyDescriptor,
  tree: TreeDef,
  commit: (d: TreePropertyDescriptor, value: unknown) => void,
): JSX.Element {
  const widgetId = `tree-inspector-${d.key}`
  const value = d.get(tree)
  const disabled = d.readonly === true

  const widget =
    d.type.kind === 'localizedText' ? (
      <LocalizedTextWidget
        id={widgetId}
        value={value as Parameters<typeof LocalizedTextWidget>[0]['value']}
        disabled={disabled}
        onCommit={(v) => commit(d, v)}
      />
    ) : (
      <TextWidget
        id={widgetId}
        value={value as string | undefined}
        disabled={disabled}
        onCommit={(v) => commit(d, v)}
      />
    )

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
// ── FIN: TreeInspector ──
