// ── INICIO: ResourcesEditor ──
// Sub-editor para `TreeDef.resources: Resource[]` (briefing 7.12).
// Mesmo estilo que CostEditor/CostPerTierEditor: lista de filas con
// engadir/eliminar, granularidade 1 commit por acción.
//
// Cada recurso: Básico (Etiqueta, Inicial, Máximo) + Avanzado pregado
// (Icona, Cor, Reembolsable, % de reembolso — visible só se
// reembolsable). Id xerado ao crear (nextFreeId, prefixo 'recurso'),
// readonly despois — os custos referéncianno; renomear rompería
// referencias (mesma doutrina que o id de nodo).

import type { Resource } from '@yggdrasil-forge/core'
import { nextFreeId } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'
import { AdvancedSection } from '../AdvancedSection.js'
import { CheckboxWidget } from '../widgets/CheckboxWidget.js'
import { ColorWidget } from '../widgets/ColorWidget.js'
import { FieldHelp, FieldLabel } from '../widgets/FieldLabel.js'
import { LocalizedTextWidget } from '../widgets/LocalizedTextWidget.js'
import { NumberWidget } from '../widgets/NumberWidget.js'
import { TextWidget } from '../widgets/TextWidget.js'

export interface ResourcesEditorProps {
  readonly value: readonly Resource[] | undefined
  readonly onCommit: (next: readonly Resource[]) => void
}

export function ResourcesEditor({ value, onCommit }: ResourcesEditorProps): JSX.Element {
  const list = value ?? []

  const updateAt = (idx: number, patch: Partial<Resource>): void => {
    const next = list.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    onCommit(next)
  }
  const removeAt = (idx: number): void => {
    onCommit(list.filter((_, i) => i !== idx))
  }
  const addResource = (): void => {
    const existingIds = new Set(list.map((r) => r.id))
    const id = nextFreeId(existingIds, 'recurso')
    const newResource: Resource = { id, label: { gl: 'Novo recurso' } }
    onCommit([...list, newResource])
  }

  return (
    <div className="editor-inspector-struct editor-resources-editor">
      {list.length === 0 ? (
        <p className="editor-inspector__hint">Sen recursos.</p>
      ) : (
        <ul className="editor-inspector-struct__list editor-resources-editor__list">
          {list.map((resource, idx) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              onChange={(patch) => updateAt(idx, patch)}
              onRemove={() => removeAt(idx)}
            />
          ))}
        </ul>
      )}
      <div className="editor-inspector-struct__add">
        <button type="button" className="editor-button" onClick={addResource}>
          Engadir recurso
        </button>
      </div>
    </div>
  )
}

interface ResourceRowProps {
  readonly resource: Resource
  readonly onChange: (patch: Partial<Resource>) => void
  readonly onRemove: () => void
}

function ResourceRow({ resource, onChange, onRemove }: ResourceRowProps): JSX.Element {
  return (
    <li className="editor-resources-editor__row">
      <div className="editor-resources-editor__row-header">
        <span className="editor-resources-editor__row-id">{resource.id}</span>
        <button
          type="button"
          className="editor-resources-editor__row-remove"
          onClick={onRemove}
          aria-label={`Eliminar recurso ${resource.id}`}
        >
          Eliminar
        </button>
      </div>

      <div className="editor-inspector__field">
        <FieldLabel htmlFor={`res-${resource.id}-label`} label={{ en: 'Label', gl: 'Etiqueta' }} />
        <LocalizedTextWidget
          id={`res-${resource.id}-label`}
          value={resource.label}
          onCommit={(v) => onChange({ label: v })}
        />
      </div>

      <div className="editor-resources-editor__row-numbers">
        <div className="editor-inspector__field">
          <FieldLabel
            htmlFor={`res-${resource.id}-initial`}
            label={{ en: 'Initial', gl: 'Inicial' }}
          />
          <NumberWidget
            id={`res-${resource.id}-initial`}
            value={resource.initial}
            min={0}
            step={1}
            onCommit={(v) => onChange({ initial: v })}
          />
        </div>
        <div className="editor-inspector__field">
          <FieldLabel htmlFor={`res-${resource.id}-max`} label={{ en: 'Max', gl: 'Máximo' }} />
          <NumberWidget
            id={`res-${resource.id}-max`}
            value={resource.max}
            min={0}
            step={1}
            onCommit={(v) => onChange({ max: v })}
          />
        </div>
      </div>

      <AdvancedSection fieldCount={4}>
        <div className="editor-inspector__field">
          <FieldLabel
            htmlFor={`res-${resource.id}-icon`}
            label={{ en: 'Icon', gl: 'Icona' }}
            describe={{
              en: 'An icon or emoji (optional).',
              gl: 'Unha icona ou emoji (opcional).',
            }}
          />
          <TextWidget
            id={`res-${resource.id}-icon`}
            value={resource.icon}
            onCommit={(v) => onChange({ icon: v })}
          />
          <FieldHelp
            describe={{
              en: 'An icon or emoji (optional).',
              gl: 'Unha icona ou emoji (opcional).',
            }}
          />
        </div>
        <div className="editor-inspector__field">
          <FieldLabel htmlFor={`res-${resource.id}-color`} label={{ en: 'Color', gl: 'Cor' }} />
          <ColorWidget
            id={`res-${resource.id}-color`}
            value={resource.color}
            onCommit={(v) => onChange({ color: v })}
          />
        </div>
        <div className="editor-inspector__field">
          <FieldLabel
            htmlFor={`res-${resource.id}-refundable`}
            label={{ en: 'Refundable', gl: 'Reembolsable' }}
          />
          <CheckboxWidget
            id={`res-${resource.id}-refundable`}
            value={resource.refundable}
            onCommit={(v) => onChange({ refundable: v })}
          />
        </div>
        {resource.refundable === true && (
          <div className="editor-inspector__field">
            <FieldLabel
              htmlFor={`res-${resource.id}-refundPercent`}
              label={{ en: 'Refund %', gl: '% de reembolso' }}
            />
            <NumberWidget
              id={`res-${resource.id}-refundPercent`}
              value={resource.refundPercent}
              min={0}
              max={100}
              step={1}
              onCommit={(v) => onChange({ refundPercent: v })}
            />
          </div>
        )}
      </AdvancedSection>
    </li>
  )
}
// ── FIN: ResourcesEditor ──
