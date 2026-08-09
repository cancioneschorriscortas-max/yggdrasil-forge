// ── INICIO: ThemePanel ──
// **Pestana "Tema"** (7.5e §4) no mesmo grupo dockview que o Inspector.
//
// **Concerns separados** (mockup aprobado por Agarfal):
//   - Inspector = UN nodo (os seus campos, incluído o seu `color`).
//   - Tema      = a árbore enteira (recheo por estado, tinte de rexións, fondo).
//
// **Non require selección** de ningún nodo — opera sobre o documento
// enteiro. Cambios inmediatos vía `setMetaField('theme', ...)` /
// `setMetaField('background', ...)`.
//
// Estrutura (4 seccións):
//   1. Preset — chips Tintado/Neutro.
//   2. Recheo por estado — 5 estados con widget de cor.
//   3. Rexións — lista con swatch editable (só cor; id/label/tag readonly v1).
//   4. Fondo — URL de imaxe.
//
// Estándar de usabilidade do 7.5c-U: FieldLabel + FieldHelp por campo,
// axuda curta sempre visible, mesmos widgets/tokens.

import {
  type EditorEngine,
  THEME_PRESETS,
  type ThemeRegionTint,
  type ThemeSpec,
  getThemePreset,
  nextFreeId,
  setMetaField,
  setNodeField,
  toggleTag,
} from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'
import { useSelectedRefs } from '../inspector/useSelectedRefs.js'
import { ColorWidget } from '../inspector/widgets/ColorWidget.js'
import { FieldHelp, FieldLabel } from '../inspector/widgets/FieldLabel.js'
import { TextWidget } from '../inspector/widgets/TextWidget.js'

// ── Rotación de paleta distinguible para rexións novas (7.13) ──
const REGION_COLOR_ROTATION: readonly string[] = [
  '#c8875f',
  '#5f9ec8',
  '#7cb37c',
  '#c85f8e',
  '#c8b85f',
  '#8e5fc8',
]

// ── Presets (7.5e §4 #1 → 7.19 Cambio 2) ──
//
// Os presets viven agora como DATO en `@editor-core/themePresets`
// (rexistro con id + label + spec completo); o panel só os renderiza.
// Aplicar un preset dispatcha o seu `ThemeSpec` COMPLETO co `preset`
// anotado. Non fusiona co existente — substitúo.
//
// Re-exports de compatibilidade (contrato dos tests do 7.5e; a fonte
// única é o rexistro).

const TINTADO_SPEC = getThemePreset('tintado')?.spec
const NEUTRO_SPEC = getThemePreset('neutro')?.spec
if (TINTADO_SPEC === undefined || NEUTRO_SPEC === undefined) {
  // Contrato do rexistro: os dous históricos existen sempre.
  throw new Error('themePresets: faltan os presets históricos tintado/neutro')
}
export const PRESET_TINTADO: ThemeSpec = TINTADO_SPEC
export const PRESET_NEUTRO: ThemeSpec = NEUTRO_SPEC

/** Extrae string localizada priorizando gl (patrón de FieldLabel). */
function presetLabel(label: string | Record<string, string>, fallback: string): string {
  if (typeof label === 'string') return label
  return label.gl ?? label.en ?? Object.values(label)[0] ?? fallback
}

export interface ThemePanelProps {
  readonly editorEngine: EditorEngine
}

export function ThemePanel({ editorEngine }: ThemePanelProps): JSX.Element {
  // O panel Tema depende do `meta.theme` + `meta.background`. Subscribimos
  // ao engine coma o Inspector.
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )
  const theme: ThemeSpec = doc.meta.theme ?? {}
  const background = doc.meta.background

  const dispatchTheme = (next: ThemeSpec): void => {
    editorEngine.dispatch(
      setMetaField('theme', next, { en: 'Update theme', gl: 'Actualizar tema' }),
    )
  }

  const applyPreset = (preset: ThemeSpec): void => {
    dispatchTheme(preset)
  }

  const setNodeFill = (state: keyof NonNullable<ThemeSpec['nodeFills']>, color: string): void => {
    dispatchTheme({
      ...theme,
      nodeFills: {
        ...(theme.nodeFills ?? {}),
        [state]: color,
      },
    })
  }

  const setTextColor = (color: string): void => {
    dispatchTheme({ ...theme, textColor: color })
  }

  const clearTextColor = (): void => {
    const { textColor: _omit, ...rest } = theme
    dispatchTheme(rest)
  }

  const setRegionColor = (regionId: string, color: string): void => {
    const regions = (theme.regions ?? []).map(
      (r): ThemeRegionTint => (r.id === regionId ? { ...r, color } : r),
    )
    dispatchTheme({ ...theme, regions })
  }

  const setRegionLabel = (regionId: string, label: string): void => {
    const regions = (theme.regions ?? []).map(
      (r): ThemeRegionTint => (r.id === regionId ? { ...r, label } : r),
    )
    dispatchTheme({ ...theme, regions })
  }

  const addRegion = (): void => {
    const existingRegions = theme.regions ?? []
    const existingIds = new Set(existingRegions.map((r) => r.id))
    const id = nextFreeId(existingIds, 'rexion')
    const color =
      REGION_COLOR_ROTATION[existingRegions.length % REGION_COLOR_ROTATION.length] ?? '#c8875f'
    const newRegion: ThemeRegionTint = { id, label: 'Nova rexión', tag: id, color }
    dispatchTheme({ ...theme, regions: [...existingRegions, newRegion] })
  }

  // **Eliminar rexión = quitar SÓ o tinte.** Os `tags` dos nodos NON se
  // tocan — poden servir a condicións `tag_count`; borrar presentación
  // non debe mutar regras (mesma doutrina que co recurso, 7.12: nada de
  // cascadas silenciosas sobre semántica).
  const removeRegion = (regionId: string): void => {
    const regions = (theme.regions ?? []).filter((r) => r.id !== regionId)
    dispatchTheme({ ...theme, regions })
  }

  // ── Selección (7.13): "Asignar/Quitar da selección" ──
  const selectedRefs = useSelectedRefs(editorEngine)
  const selectedNodeIds = selectedRefs.filter((r) => r.kind === 'node').map((r) => r.id)

  const assignRegionToSelection = (tag: string): void => {
    if (selectedNodeIds.length === 0) return
    editorEngine.transaction({ en: 'Assign region', gl: 'Asignar rexión' }, (tx) => {
      for (const nodeId of selectedNodeIds) {
        const node = doc.tree.nodes.find((n) => n.id === nodeId)
        tx.apply(setNodeField(nodeId, 'tags', toggleTag(node?.tags, tag, true)))
      }
    })
  }

  const removeRegionFromSelection = (tag: string): void => {
    if (selectedNodeIds.length === 0) return
    editorEngine.transaction({ en: 'Remove region', gl: 'Quitar rexión' }, (tx) => {
      for (const nodeId of selectedNodeIds) {
        const node = doc.tree.nodes.find((n) => n.id === nodeId)
        tx.apply(setNodeField(nodeId, 'tags', toggleTag(node?.tags, tag, false)))
      }
    })
  }

  const setBackgroundSrc = (src: string): void => {
    editorEngine.dispatch(
      setMetaField('background', src === '' ? undefined : { src }, {
        en: 'Update background',
        gl: 'Actualizar fondo',
      }),
    )
  }

  const clearBackground = (): void => {
    editorEngine.dispatch(
      setMetaField('background', undefined, { en: 'Clear background', gl: 'Quitar fondo' }),
    )
  }

  const activePreset = theme.preset

  return (
    <div className="editor-panel">
      <div className="editor-panel__body editor-theme-panel">
        {/* ── §1: Preset ── */}
        <section className="editor-theme-panel__section">
          <h3 className="editor-theme-panel__section-title">Preset</h3>
          <p className="editor-theme-panel__section-help">Aplica de golpe un tema base.</p>
          {/* 7.19: fichas renderizadas DESDE o rexistro (fila desprazable). */}
          <div className="editor-theme-panel__chips">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`editor-theme-panel__chip${activePreset === preset.id ? ' editor-theme-panel__chip--active' : ''}`}
                onClick={() => applyPreset(preset.spec)}
              >
                {presetLabel(preset.label, preset.id)}
              </button>
            ))}
          </div>
        </section>

        {/* ── §2: Recheo por estado ── */}
        <section className="editor-theme-panel__section">
          <h3 className="editor-theme-panel__section-title">Recheo por estado</h3>
          <p className="editor-theme-panel__section-help">
            Cor de fondo dos nodos segundo o seu estado. O `color` propio dun nodo prevalece sobre
            estas cores.
          </p>
          <NodeFillRow
            stateKey="locked"
            label={{ en: 'Locked', gl: 'Bloqueado' }}
            value={theme.nodeFills?.locked}
            onCommit={(c) => setNodeFill('locked', c)}
          />
          <NodeFillRow
            stateKey="unlockable"
            label={{ en: 'Unlockable', gl: 'Desbloqueable' }}
            value={theme.nodeFills?.unlockable}
            onCommit={(c) => setNodeFill('unlockable', c)}
          />
          <NodeFillRow
            stateKey="inProgress"
            label={{ en: 'In progress', gl: 'En progreso' }}
            value={theme.nodeFills?.inProgress}
            onCommit={(c) => setNodeFill('inProgress', c)}
          />
          <NodeFillRow
            stateKey="unlocked"
            label={{ en: 'Unlocked', gl: 'Desbloqueado' }}
            value={theme.nodeFills?.unlocked}
            onCommit={(c) => setNodeFill('unlocked', c)}
          />
          <NodeFillRow
            stateKey="maxed"
            label={{ en: 'Maxed', gl: 'Ao máximo' }}
            value={theme.nodeFills?.maxed}
            onCommit={(c) => setNodeFill('maxed', c)}
          />

          <hr className="editor-theme-panel__divider" />

          <div className="editor-inspector__field editor-theme-panel__fill-row">
            <FieldLabel
              htmlFor="theme-text-color"
              label={{ en: 'Text & icons', gl: 'Texto e iconas' }}
              describe={{
                en: 'Node label, progress and region-label color. Auto-adapts to the editor chrome theme when unset.',
                gl: 'Cor da etiqueta, progreso e etiquetas de rexión dos nodos. Sen definir, adáptase automaticamente ao tema claro/escuro do editor.',
              }}
            />
            <div className="editor-theme-panel__text-color-row">
              <ColorWidget id="theme-text-color" value={theme.textColor} onCommit={setTextColor} />
              {theme.textColor !== undefined && (
                <button
                  type="button"
                  className="editor-button editor-theme-panel__text-color-reset"
                  onClick={clearTextColor}
                >
                  Automático
                </button>
              )}
            </div>
            <FieldHelp
              describe={{
                en: 'Node label, progress and region-label color. Auto-adapts to the editor chrome theme when unset.',
                gl: 'Cor da etiqueta, progreso e etiquetas de rexión dos nodos. Sen definir, adáptase automaticamente ao tema claro/escuro do editor.',
              }}
            />
          </div>
        </section>

        {/* ── §3: Rexións ── */}
        <section className="editor-theme-panel__section">
          <h3 className="editor-theme-panel__section-title">Rexións</h3>
          <p className="editor-theme-panel__section-help">
            Tinte de fondo dos grupos de nodos por etiqueta. Eliminar unha rexión quita só o tinte —
            as pertenzas dos nodos non se tocan.
          </p>
          {theme.regions === undefined || theme.regions.length === 0 ? (
            <p className="editor-inspector__hint">Sen rexións definidas.</p>
          ) : (
            <ul className="editor-panel__list editor-theme-panel__regions">
              {theme.regions.map((r) => (
                <li key={r.id} className="editor-theme-panel__region-row">
                  <div className="editor-theme-panel__region-row-main">
                    <ColorWidget
                      id={`theme-region-${r.id}`}
                      value={r.color}
                      onCommit={(c) => setRegionColor(r.id, c)}
                    />
                    <div className="editor-theme-panel__region-info">
                      <TextWidget
                        id={`theme-region-${r.id}-label`}
                        value={r.label}
                        onCommit={(v) => setRegionLabel(r.id, v)}
                      />
                      <span className="editor-theme-panel__region-tag">tag: {r.tag}</span>
                    </div>
                    <button
                      type="button"
                      className="editor-resources-editor__row-remove"
                      onClick={() => removeRegion(r.id)}
                      aria-label={`Eliminar rexión ${r.label}`}
                    >
                      Eliminar
                    </button>
                  </div>
                  {selectedNodeIds.length > 0 && (
                    <div className="editor-theme-panel__region-selection-actions">
                      <button
                        type="button"
                        className="editor-button"
                        onClick={() => assignRegionToSelection(r.tag)}
                      >
                        Asignar á selección
                      </button>
                      <button
                        type="button"
                        className="editor-button"
                        onClick={() => removeRegionFromSelection(r.tag)}
                      >
                        Quitar da selección
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="editor-inspector-struct__add">
            <button type="button" className="editor-button" onClick={addRegion}>
              Engadir rexión
            </button>
          </div>
        </section>

        {/* ── §4: Fondo ── */}
        <section className="editor-theme-panel__section">
          <h3 className="editor-theme-panel__section-title">Fondo</h3>
          <div className="editor-inspector__field">
            <FieldLabel
              htmlFor="theme-background-src"
              label={{ en: 'Background URL', gl: 'URL do fondo' }}
              describe={{
                en: 'Background image of the canvas (URL).',
                gl: 'Imaxe de fondo do canvas (URL).',
              }}
            />
            <TextWidget
              id="theme-background-src"
              value={background?.src ?? ''}
              onCommit={setBackgroundSrc}
            />
            <FieldHelp
              describe={{
                en: 'Background image of the canvas (URL).',
                gl: 'Imaxe de fondo do canvas (URL).',
              }}
            />
            {background !== undefined && (
              <button
                type="button"
                className="editor-button editor-theme-panel__clear-bg"
                onClick={clearBackground}
              >
                Quitar fondo
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Fila de recheo por estado (widget de cor + label + help) ──

interface NodeFillRowProps {
  readonly stateKey: string
  readonly label: { readonly en: string; readonly gl: string }
  readonly value: string | undefined
  readonly onCommit: (color: string) => void
}

function NodeFillRow({ stateKey, label, value, onCommit }: NodeFillRowProps): JSX.Element {
  const id = `theme-fill-${stateKey}`
  return (
    <div className="editor-inspector__field editor-theme-panel__fill-row">
      <FieldLabel htmlFor={id} label={label} />
      <ColorWidget id={id} value={value} onCommit={onCommit} />
    </div>
  )
}
// ── FIN: ThemePanel ──
