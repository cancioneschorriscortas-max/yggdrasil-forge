// ── INICIO: PanelHost ──
// **O único sitio que importa dockview.** Iso encapsula a dependencia
// — se mañá cambiamos a outro layout manager, só este ficheiro se
// reescribe.
//
// API minimalista: rexístrase un conxunto de PanelDef e renderízase
// un DockviewReact. Os paneis créanse en `onReady` segundo o
// `defaultLocation` declarado, e despois o usuario pode arrastralos
// libremente (dockview xestiona iso).

import {
  type DockviewApi,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview-react'
import type { FC, JSX } from 'react'

/** Props que reciben os paneis. Por agora baleiro; estendible. */
export interface PanelProps {
  /** O API de dockview para o panel (close, move, etc.). */
  readonly api: IDockviewPanelProps['api']
}

export interface PanelDef {
  readonly id: string
  readonly title: string
  readonly component: FC<PanelProps>
  readonly defaultLocation: 'left' | 'center' | 'right' | 'bottom'
  readonly closable?: boolean
}

export interface PanelHostProps {
  readonly panels: readonly PanelDef[]
  /** Callback exposto cando o dockview está listo. Útil para tests. */
  readonly onReady?: (api: DockviewApi) => void
}

function placementOf(
  loc: PanelDef['defaultLocation'],
): { direction: 'left' | 'right' | 'above' | 'below'; referencePanel?: string } | undefined {
  switch (loc) {
    case 'left':
      return { direction: 'left' }
    case 'right':
      return { direction: 'right' }
    case 'bottom':
      return { direction: 'below' }
    default:
      // 'center' ou calquera outro: o primeiro panel central non leva
      // direction (vai ao root).
      return undefined
  }
}

export function PanelHost({ panels, onReady }: PanelHostProps): JSX.Element {
  // Mapeo id → component para dockview (require nome → factory).
  const components: Record<string, FC<IDockviewPanelProps>> = {}
  for (const panel of panels) {
    const Comp = panel.component
    components[panel.id] = (props: IDockviewPanelProps) => <Comp api={props.api} />
  }

  function handleReady(event: DockviewReadyEvent): void {
    // Engadir paneis na orde dada — primeiro o central (ancla), despois
    // os laterais que se posicionan respecto del.
    const center = panels.filter((p) => p.defaultLocation === 'center')
    const sides = panels.filter((p) => p.defaultLocation !== 'center')
    let referenceId: string | undefined
    for (const p of center) {
      event.api.addPanel({
        id: p.id,
        component: p.id,
        title: p.title,
      })
      if (referenceId === undefined) referenceId = p.id
    }
    for (const p of sides) {
      const placement = placementOf(p.defaultLocation)
      event.api.addPanel({
        id: p.id,
        component: p.id,
        title: p.title,
        ...(placement !== undefined && {
          position: {
            direction: placement.direction,
            ...(referenceId !== undefined && { referencePanel: referenceId }),
          },
        }),
      })
    }
    onReady?.(event.api)
  }

  return (
    <DockviewReact
      className="dv-dockview dockview-theme-light"
      components={components}
      onReady={handleReady}
    />
  )
}
// ── FIN: PanelHost ──
