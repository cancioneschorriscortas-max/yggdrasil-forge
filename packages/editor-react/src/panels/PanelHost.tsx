// ── INICIO: PanelHost ──
// **O único sitio que importa dockview.** Iso encapsula a dependencia
// — se mañá cambiamos a outro layout manager, só este ficheiro se
// reescribe.
//
// **7.7 — reconciliación en lugar de remount**:
//   - Cando `panels` prop cambia (por exemplo, entrar/saír de Proba
//     no EditorShell), PanelHost fai diff entre o conxunto vivo e o
//     novo, e usa a API imperativa de dockview
//     (`addPanel`/`removePanel`) para axustar só os paneis afectados.
//     Iso preserva grupos, tamaños e reordenacións do usuario.
//   - **Engadir-antes-de-quitar** (dor 2): para os paneis novos con
//     `withinPanel` explícito, refírense ao panel referenciado se
//     está vivo. Senón, ao primeiro vivo co mesmo `defaultLocation`.
//     Iso mantén Inspector/Tema no mesmo grupo onde estaba Proba (e
//     viceversa) ao alternar modos.
//
// **7.7 — persistencia**:
//   - `initialLayout?`: se ven, `fromJSON` no `onReady` (envolto en
//     try/catch — se falla, invoca `onLayoutInvalid?()` para que a
//     app limpe o gardado e reconstrúe o default).
//   - `onLayoutChange?`: subscrito a `onDidLayoutChange` con
//     debouncing curto (300ms) — a app decide se gardar ou non.
//   - **`resetLayoutRef?`**: se ven, PanelHost expón unha función
//     `reset()` no ref para volver á disposición por defecto.

import {
  type DockviewApi,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type SerializedDockview,
} from 'dockview-react'
import { type FC, type JSX, type MutableRefObject, useEffect, useMemo, useRef } from 'react'

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
  /**
   * Se define, o panel engádese como **pestana no mesmo grupo** do
   * panel referenciado (7.5e §4). Iso usa `position.direction: 'within'`
   * de dockview.
   */
  readonly withinPanel?: string
  readonly closable?: boolean
}

/** API pública para invocar accións sobre o dock desde fóra. */
export interface PanelHostHandle {
  /** Volve á disposición por defecto (borrando o layout gardado). */
  readonly reset: () => void
  /** Amosa un panel (por id) se non está montado; reabreo na posición por defecto. */
  readonly showPanel: (id: string) => void
  /** Peche un panel (por id) se está montado. */
  readonly hidePanel: (id: string) => void
  /** Devolve os ids dos paneis actualmente montados. */
  readonly getVisiblePanelIds: () => readonly string[]
}

export interface PanelHostProps {
  readonly panels: readonly PanelDef[]
  /** Callback exposto cando o dockview está listo. Útil para tests. */
  readonly onReady?: (api: DockviewApi) => void
  /** Disposición serializada a restaurar no arranque. Se falla, cae ao default. */
  readonly initialLayout?: SerializedDockview
  /** Chamado (debounced ~300ms) tras cada cambio de layout. */
  readonly onLayoutChange?: (layout: SerializedDockview) => void
  /**
   * Chamado se o `initialLayout` proporcionado non se puido restaurar
   * (mal formado, versión vella, paneis ausentes). A app debería
   * limpar o gardado.
   */
  readonly onLayoutInvalid?: () => void
  /**
   * Ref opcional para expoñer accións imperativas (reset, showPanel,
   * hidePanel). Alimentado tras o `onReady`.
   */
  readonly handleRef?: MutableRefObject<PanelHostHandle | null>
  /**
   * Callback chamado cando a lista de paneis visibles cambia
   * (usuario pecha o X, dockview restaura, etc.). Útil para actualizar
   * o estado do menú Paneis no TopBar.
   */
  readonly onVisiblePanelsChange?: (ids: readonly string[]) => void
}

function directionOf(
  loc: PanelDef['defaultLocation'],
): 'left' | 'right' | 'above' | 'below' | undefined {
  switch (loc) {
    case 'left':
      return 'left'
    case 'right':
      return 'right'
    case 'bottom':
      return 'below'
    default:
      return undefined
  }
}

/**
 * Engade un panel á API. Se ten `withinPanel` e o obxectivo existe,
 * mételo dentro do seu grupo. Se non, procura un panel vivo con mesmo
 * `defaultLocation` para preservar a banda escollida polo usuario.
 * Se non atopa ningún, cae ao posicionamento por defecto (referenza
 * ao central).
 */
function addPanelSmart(
  api: DockviewApi,
  panel: PanelDef,
  allPanelDefs: readonly PanelDef[],
  centerId: string | undefined,
): void {
  const options: Parameters<DockviewApi['addPanel']>[0] = {
    id: panel.id,
    component: panel.id,
    title: panel.title,
  }

  // 1) `within` explícito e vivo?
  if (panel.withinPanel !== undefined && api.getPanel(panel.withinPanel) !== undefined) {
    // ★ Non roubar foco ao panel referenciado (que é onde o usuario
    // xa estaba mirando). Iso mantén Inspector activo cando Tema
    // reaparece tras un swap de modo.
    options.inactive = true
    options.position = { direction: 'within', referencePanel: panel.withinPanel }
    api.addPanel(options)
    return
  }

  // 2) Central: sen `position` → vai ao root.
  if (panel.defaultLocation === 'center') {
    api.addPanel(options)
    return
  }

  // 3) Procurar un vivo con mesmo defaultLocation (preserva a banda
  //    onde estea agora).
  const liveSameBand = allPanelDefs.find(
    (p) =>
      p.id !== panel.id &&
      p.defaultLocation === panel.defaultLocation &&
      api.getPanel(p.id) !== undefined,
  )
  if (liveSameBand !== undefined) {
    options.position = { direction: 'within', referencePanel: liveSameBand.id }
    api.addPanel(options)
    return
  }

  // 4) Fallback: dirección + centro como referencia.
  const dir = directionOf(panel.defaultLocation)
  if (dir !== undefined) {
    options.position =
      centerId !== undefined ? { direction: dir, referencePanel: centerId } : { direction: dir }
  }
  api.addPanel(options)
}

/**
 * Constrúe a disposición por defecto (arranque limpo).
 * **Unha soa fonte de verdade** — usada polo onReady sen initialLayout
 * e polo reset().
 */
function buildDefaultLayout(api: DockviewApi, panels: readonly PanelDef[]): void {
  api.clear()
  const center = panels.filter((p) => p.defaultLocation === 'center')
  const sides = panels.filter((p) => p.defaultLocation !== 'center' && p.withinPanel === undefined)
  const within = panels.filter((p) => p.withinPanel !== undefined)

  let referenceId: string | undefined
  for (const p of center) {
    api.addPanel({ id: p.id, component: p.id, title: p.title })
    if (referenceId === undefined) referenceId = p.id
  }
  for (const p of sides) {
    const dir = directionOf(p.defaultLocation)
    api.addPanel({
      id: p.id,
      component: p.id,
      title: p.title,
      ...(dir !== undefined && {
        position: {
          direction: dir,
          ...(referenceId !== undefined && { referencePanel: referenceId }),
        },
      }),
    })
  }
  for (const p of within) {
    const target = p.withinPanel
    if (target === undefined) continue
    api.addPanel({
      id: p.id,
      component: p.id,
      title: p.title,
      // ★ 7.7 fix: engadido como pestana no mesmo grupo pero SEN
      // roubarlle o foco ao panel referenciado. Doutro xeito o último
      // panel engadido queda como tab activa e Inspector arrancaría
      // pechado detrás de Tema.
      inactive: true,
      position: { direction: 'within', referencePanel: target },
    })
  }
}

export function PanelHost({
  panels,
  onReady,
  initialLayout,
  onLayoutChange,
  onLayoutInvalid,
  handleRef,
  onVisiblePanelsChange,
}: PanelHostProps): JSX.Element {
  const apiRef = useRef<DockviewApi | null>(null)
  const panelsRef = useRef<readonly PanelDef[]>(panels)
  // Refs para callbacks — así o subscribe onDidLayoutChange (feito unha
  // vez no onReady) sempre invoca a versión máis recente. Sen isto, o
  // filtrado por modo do EditorShell non tería efecto.
  const onLayoutChangeRef = useRef(onLayoutChange)
  const onVisiblePanelsChangeRef = useRef(onVisiblePanelsChange)
  useEffect(() => {
    panelsRef.current = panels
  }, [panels])
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange
  }, [onLayoutChange])
  useEffect(() => {
    onVisiblePanelsChangeRef.current = onVisiblePanelsChange
  }, [onVisiblePanelsChange])

  // Mapeo id → component para dockview (require nome → factory).
  // Memoizado para non re-crear en cada render.
  const components = useMemo<Record<string, FC<IDockviewPanelProps>>>(() => {
    const map: Record<string, FC<IDockviewPanelProps>> = {}
    for (const panel of panels) {
      const Comp = panel.component
      map[panel.id] = (props: IDockviewPanelProps) => <Comp api={props.api} />
    }
    return map
  }, [panels])

  const emitVisible = (api: DockviewApi): void => {
    const cb = onVisiblePanelsChangeRef.current
    if (cb === undefined) return
    cb(api.panels.map((p) => p.id))
  }

  const handleReady = (event: DockviewReadyEvent): void => {
    apiRef.current = event.api

    // Restaurar layout gardado se procede.
    let restored = false
    if (initialLayout !== undefined) {
      try {
        event.api.fromJSON(initialLayout)
        restored = true
      } catch (_err) {
        // Layout inválido — a app debe limpar o gardado.
        onLayoutInvalid?.()
      }
    }
    if (!restored) {
      buildDefaultLayout(event.api, panels)
    }

    // Subscribir cambios para persistencia (con debounce).
    // Usamos ref → sempre invoca a versión máis recente do callback,
    // permitindo que o EditorShell filtre por modo (só Autoría persiste).
    let timer: ReturnType<typeof setTimeout> | null = null
    event.api.onDidLayoutChange(() => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        const cb = onLayoutChangeRef.current
        if (cb === undefined) return
        try {
          cb(event.api.toJSON())
        } catch {
          // Ignora — o cambio seguinte reintentará.
        }
      }, 300)
    })

    // Emitir visibilidade inicial + subscribirse a cambios.
    emitVisible(event.api)
    event.api.onDidAddPanel(() => emitVisible(event.api))
    event.api.onDidRemovePanel(() => emitVisible(event.api))

    // Expoñer handle imperativo.
    if (handleRef !== undefined) {
      handleRef.current = {
        reset: () => {
          buildDefaultLayout(event.api, panelsRef.current)
        },
        showPanel: (id: string) => {
          if (event.api.getPanel(id) !== undefined) return
          const def = panelsRef.current.find((p) => p.id === id)
          if (def === undefined) return
          addPanelSmart(
            event.api,
            def,
            panelsRef.current,
            panelsRef.current.find((p) => p.defaultLocation === 'center')?.id,
          )
        },
        hidePanel: (id: string) => {
          const p = event.api.getPanel(id)
          if (p !== undefined) event.api.removePanel(p)
        },
        getVisiblePanelIds: () => event.api.panels.map((p) => p.id),
      }
    }

    onReady?.(event.api)
  }

  // ── Reconciliación cando `panels` prop cambia ──
  // Diff engadir-antes-de-quitar para preservar grupos e tamaños
  // (dor 2 do briefing 7.7).
  useEffect(() => {
    const api = apiRef.current
    if (api === null) return
    const currentIds = new Set(api.panels.map((p) => p.id))
    const nextIds = new Set(panels.map((p) => p.id))
    const toAdd = panels.filter((p) => !currentIds.has(p.id))
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id))

    if (toAdd.length === 0 && toRemove.length === 0) return

    const centerId = panels.find((p) => p.defaultLocation === 'center')?.id

    // 1) Engadir os novos primeiro — poden referenciar aos que van
    //    desaparecer como pivot para conservar o grupo.
    for (const p of toAdd) {
      addPanelSmart(api, p, panels, centerId)
    }
    // 2) Retirar os que sobran.
    for (const id of toRemove) {
      const p = api.getPanel(id)
      if (p !== undefined) api.removePanel(p)
    }
  }, [panels])

  return (
    <DockviewReact
      className="dv-dockview dockview-theme-light"
      components={components}
      onReady={handleReady}
    />
  )
}
// ── FIN: PanelHost ──
