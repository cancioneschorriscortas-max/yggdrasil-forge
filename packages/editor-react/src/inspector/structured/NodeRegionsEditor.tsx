// ── INICIO: NodeRegionsEditor ──
// Sección "Rexións" no Inspector de NODO (briefing 7.13 Cambio 3).
// É UI cruzada nodo↔meta: as rexións viven en `meta.theme.regions`,
// pero a pertenza é `node.tags`. Segue o precedente xa establecido
// dos editores estruturados que reciben contexto alén do propio nodo
// (ex. `CostEditor` recibe `doc.tree.resources`).
//
// Toggle → `setNodeField('tags', toggleTag(...))`. Tags alleas ás
// rexións (calquera outra cousa en `node.tags`) presérvanse
// invisibles — só se listan/tocan as que coinciden cun tag de rexión.

import type { NodeDef } from '@yggdrasil-forge/core'
import type { ThemeRegionTint } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'

export interface NodeRegionsEditorProps {
  readonly regions: readonly ThemeRegionTint[]
  readonly node: NodeDef
  readonly onToggle: (tag: string, present: boolean) => void
}

export function NodeRegionsEditor({
  regions,
  node,
  onToggle,
}: NodeRegionsEditorProps): JSX.Element {
  return (
    <section className="editor-inspector__group">
      <h3 className="editor-inspector__group-title">Rexións</h3>
      {regions.length === 0 ? (
        <p className="editor-inspector__hint">Sen rexións. Créaas na pestana Tema.</p>
      ) : (
        <>
          <p className="editor-inspector__hint">As zonas ás que pertence este nodo.</p>
          <ul className="editor-node-regions">
            {regions.map((r) => {
              const checked = (node.tags ?? []).includes(r.tag)
              const inputId = `node-region-${r.id}`
              return (
                <li key={r.id} className="editor-node-regions__row">
                  <input
                    id={inputId}
                    type="checkbox"
                    className="editor-inspector-checkbox"
                    checked={checked}
                    onChange={(e) => onToggle(r.tag, e.target.checked)}
                  />
                  <label htmlFor={inputId} className="editor-node-regions__label">
                    <span
                      className="editor-node-regions__swatch"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    {r.label}
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
// ── FIN: NodeRegionsEditor ──
