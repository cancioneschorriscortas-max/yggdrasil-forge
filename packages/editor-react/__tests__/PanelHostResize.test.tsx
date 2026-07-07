// ── INICIO: test PanelHost — 7.7c ──
// Cobre o bug: engadir/quitar un panel dun grupo (swap de modo)
// facía que dockview recalculase o tamaño do grupo por si só,
// perdendo o axuste manual do usuario. O fix captura `group.api.width/
// height` antes de mutar e reaplícao despois, por `group.id` (estable
// mentres o grupo non queda baleiro — engadir-antes-de-quitar garántео).
//
// **Nota honesta (esixida no adendo 7.7c)**: dockview-core calcula
// os tamaños reais de grupo a través do seu algoritmo interno de
// grid/splitview, que en jsdom pode non reproducir un layout de
// píxeles real (contedor a 0×0). Este test comproba que a nosa
// LÓXICA (capturar + reaplicar) se executa e produce o mesmo valor
// antes/despois — non que o resultado visual en píxeles reais sexa
// correcto. Iso último só o pode confirmar o dono no dev server.

import { act, cleanup, render } from '@testing-library/react'
import type { DockviewApi } from 'dockview-react'
import { afterEach, describe, expect, it } from 'vitest'
import { type PanelDef, PanelHost } from '../src/panels/PanelHost.js'

afterEach(() => cleanup())

function panelDef(id: string, loc: PanelDef['defaultLocation'], withinPanel?: string): PanelDef {
  return {
    id,
    title: id,
    component: () => <div>{id}</div>,
    defaultLocation: loc,
    ...(withinPanel !== undefined && { withinPanel }),
  }
}

describe('★ 7.7c — tamaños de grupo sobreviven á reconciliación de modo', () => {
  it('un tamaño fixado manualmente persiste tras engadir/quitar panel no mesmo grupo, e volta a facelo á inversa', async () => {
    let api: DockviewApi | null = null

    const panelsAutoria: PanelDef[] = [
      panelDef('canvas', 'center'),
      panelDef('inspector', 'right'),
      panelDef('tema', 'right', 'inspector'),
    ]
    const panelsProba: PanelDef[] = [panelDef('canvas', 'center'), panelDef('proba', 'right')]

    const { rerender } = render(
      <PanelHost
        panels={panelsAutoria}
        onReady={(a) => {
          api = a
        }}
      />,
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(api).not.toBeNull()
    const a = api as unknown as DockviewApi

    // Axuste "manual" do usuario: fixar explicitamente o tamaño do
    // grupo dereito (onde vive Inspector/Tema).
    const rightGroupBefore = a.getPanel('inspector')?.group
    expect(rightGroupBefore).toBeDefined()
    act(() => {
      rightGroupBefore?.api.setSize({ width: 512, height: 400 })
    })
    const fixedWidth = rightGroupBefore?.api.width
    const fixedHeight = rightGroupBefore?.api.height

    // Swap de modo: Autoría → Proba (quita inspector+tema, engade proba
    // no mesmo grupo dereito).
    rerender(<PanelHost panels={panelsProba} onReady={undefined} />)
    await new Promise((r) => setTimeout(r, 0))

    const rightGroupProba = a.getPanel('proba')?.group
    expect(rightGroupProba).toBeDefined()
    // Mesmo grupo (mesmo id) — nunca quedou baleiro durante o swap.
    expect(rightGroupProba?.id).toBe(rightGroupBefore?.id)
    expect(rightGroupProba?.api.width).toBe(fixedWidth)
    expect(rightGroupProba?.api.height).toBe(fixedHeight)

    // Volta: Proba → Autoría.
    rerender(<PanelHost panels={panelsAutoria} onReady={undefined} />)
    await new Promise((r) => setTimeout(r, 0))

    const rightGroupBack = a.getPanel('inspector')?.group
    expect(rightGroupBack).toBeDefined()
    expect(rightGroupBack?.id).toBe(rightGroupBefore?.id)
    expect(rightGroupBack?.api.width).toBe(fixedWidth)
    expect(rightGroupBack?.api.height).toBe(fixedHeight)
  })
})
// ── FIN: test PanelHost — 7.7c ──
