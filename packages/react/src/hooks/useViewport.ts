'use client'

// ── INICIO: useViewport ──
// Hook para pan + wheel-zoom-toward-cursor + fit (F10.6).
//
// Modelo (MASTER A.6.22 candidata):
// - O `viewBox` do `<svg>` queda fixo segundo `bounds + padding` (fit
//   visual base). O pan/zoom interactivo aplícase nun `<g transform>`
//   arredor dos children. Razón: viewBox manipulado para zoom mestura
//   responsabilidades (encadre vs interacción) e dificulta o cálculo
//   das transformacións; un transform group é máis idiomático SVG.
// - Os helpers de matemática (`clampZoom`, `fitTransform`,
//   `zoomToward`, `clampPan`) son puros e exportados para tests sen
//   DOM.
// - Wheel listener rexístrase **nativamente** con `{ passive: false }`
//   en `useEffect`; React onWheel é pasivo por defecto e non permite
//   `preventDefault` (MASTER A.6.23).

import type { Bounds } from '@yggdrasil-forge/core'
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export interface ViewportState {
  readonly panX: number
  readonly panY: number
  readonly zoom: number
}

export interface ViewportOptions {
  readonly minZoom?: number
  readonly maxZoom?: number
  /** Encadrar bounds ao montar (default `true`). */
  readonly fitOnMount?: boolean
  /** Callback opcional cada vez que cambia o transform. */
  readonly onChange?: (state: ViewportState) => void
}

const DEFAULT_MIN_ZOOM = 0.25
const DEFAULT_MAX_ZOOM = 4
const PAN_CLICK_THRESHOLD = 4 // px en coords cliente; por debaixo é click
const PAN_MARGIN = 0.5 // pode irse fóra ata 50 % do bounds*zoom

const IDENTITY: ViewportState = { panX: 0, panY: 0, zoom: 1 }

// ── Helpers puros (testables sen DOM) ──

/**
 * Limita o zoom a `[min, max]`. Helper puro.
 */
export function clampZoom(z: number, min: number, max: number): number {
  if (z < min) return min
  if (z > max) return max
  return z
}

/**
 * Calcula o transform que encadra `bounds` (con `padding`) nun
 * viewport de tamaño `viewportW × viewportH` (en píxeles do cliente).
 * Helper puro.
 */
export function fitTransform(
  bounds: Bounds,
  padding: number,
  viewportW: number,
  viewportH: number,
  minZoom: number = DEFAULT_MIN_ZOOM,
  maxZoom: number = DEFAULT_MAX_ZOOM,
): ViewportState {
  // viewBox base. Como o `viewBox` xa fai un encadre con
  // `preserveAspectRatio="meet"`, o fit relativo é identidade salvo
  // clamp. Mantemos as dimensións explícitas para validar que non
  // son degeneradas.
  const vbW = bounds.maxX - bounds.minX + padding * 2
  const vbH = bounds.maxY - bounds.minY + padding * 2
  // Para "fit" preciso calcular o zoom que faga que `bounds + padding`
  // colla en `viewport`. Como `viewBox` xa mapea ese rect ao viewport
  // (preserveAspectRatio="xMidYMid meet" por defecto), o fit relativo
  // é simplemente `zoom = 1` con `pan = 0`. Pero se viewport ten
  // ratio distinto, o `preserveAspectRatio` xa centra; o `fit`
  // efectivo é a identidade.
  //
  // Para evitar bug se `vbW/vbH` é 0 (bounds degenerados), garantimos
  // un zoom mínimo razoable.
  if (vbW <= 0 || vbH <= 0 || viewportW <= 0 || viewportH <= 0) {
    return IDENTITY
  }
  // Identidade salvo clamp.
  return {
    panX: 0,
    panY: 0,
    zoom: clampZoom(1, minZoom, maxZoom),
  }
}

/**
 * Devolve un novo `ViewportState` aplicando un factor de zoom mantendo
 * fixo o punto baixo o cursor (en **coords de usuario**, é dicir, en
 * espazo SVG xa transformado por viewBox/CTM).
 *
 * Conta o pan/zoom previo. Helper puro.
 */
export function zoomToward(
  state: ViewportState,
  factor: number,
  cursorUserX: number,
  cursorUserY: number,
  minZoom: number = DEFAULT_MIN_ZOOM,
  maxZoom: number = DEFAULT_MAX_ZOOM,
): ViewportState {
  const newZoom = clampZoom(state.zoom * factor, minZoom, maxZoom)
  if (newZoom === state.zoom) return state
  // O punto baixo o cursor en coords SVG pre-transform (sen <g>) é
  // (cursorUserX, cursorUserY). Tras o `<g transform>`, ese punto
  // mapea a:
  //   localX = (cursorUserX - state.panX) / state.zoom
  //   localY = (cursorUserY - state.panY) / state.zoom
  // Queremos que tras o cambio, o mesmo (cursorUserX, cursorUserY)
  // siga sobre (localX, localY):
  //   cursorUserX = newPanX + newZoom * localX
  //   newPanX = cursorUserX - newZoom * localX
  const localX = (cursorUserX - state.panX) / state.zoom
  const localY = (cursorUserY - state.panY) / state.zoom
  return {
    panX: cursorUserX - newZoom * localX,
    panY: cursorUserY - newZoom * localY,
    zoom: newZoom,
  }
}

/**
 * Limita o pan para que `bounds` (en coords de usuario, sen padding)
 * non se aleje máis dun `margin` (proporcional ao bounds escalado)
 * fóra do viewport. Helper puro.
 *
 * `viewportW`/`viewportH` son en coords de usuario (despois de aplicar
 * a relación viewport-cliente vía CTM; en práctica usaremos o tamaño
 * do viewBox como aproximación).
 */
export function clampPan(
  state: ViewportState,
  bounds: Bounds,
  viewportW: number,
  viewportH: number,
  margin: number = PAN_MARGIN,
): ViewportState {
  const bw = (bounds.maxX - bounds.minX) * state.zoom
  const bh = (bounds.maxY - bounds.minY) * state.zoom
  const maxOffsetX = bw * margin + viewportW
  const maxOffsetY = bh * margin + viewportH
  // Limítase `panX/Y` para non saír moi lonxe. Os límites son
  // generosos para permitir respiración; non bloqueamos pan, só
  // evitamos que o usuario perda a vista por completo.
  const panX = Math.max(-maxOffsetX, Math.min(maxOffsetX, state.panX))
  const panY = Math.max(-maxOffsetY, Math.min(maxOffsetY, state.panY))
  if (panX === state.panX && panY === state.panY) return state
  return { ...state, panX, panY }
}

// ── Hook ──

export interface UseViewportResult {
  readonly state: ViewportState
  readonly transform: string
  readonly isPanning: boolean
  readonly onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly fit: () => void
  readonly reset: () => void
  readonly zoomIn: () => void
  readonly zoomOut: () => void
  readonly zoomBy: (factor: number) => void
  readonly getZoom: () => number
}

/**
 * Hook que xestiona o viewport interactivo da árbore (pan + zoom +
 * fit). Devolve un `transform` para envolver os children do
 * `SVGRenderer` e os handlers a conectar ao `<svg>`.
 */
export function useViewport(
  svgRef: RefObject<SVGSVGElement | null>,
  bounds: Bounds | undefined,
  padding: number,
  options: ViewportOptions = {},
): UseViewportResult {
  const minZoom = options.minZoom ?? DEFAULT_MIN_ZOOM
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM
  const fitOnMount = options.fitOnMount ?? true
  const { onChange } = options

  const [state, setState] = useState<ViewportState>(IDENTITY)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{
    startX: number
    startY: number
    initialPanX: number
    initialPanY: number
    moved: boolean
  } | null>(null)

  // Tracking de cambios → callback.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    onChangeRef.current?.(state)
  }, [state])

  const transform = `translate(${state.panX} ${state.panY}) scale(${state.zoom})`

  // Helper: converter coords cliente do mouse a coords de usuario do
  // SVG (espazo viewBox, antes do `<g transform>`).
  const clientToUser = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current
      /* v8 ignore next -- defensivo: ref pode ser null antes de montar */
      if (svg === null) return null
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svg.getScreenCTM()
      /* v8 ignore next -- defensivo: ctm pode ser null se non está montado */
      if (ctm === null) return null
      const inv = ctm.inverse()
      const local = pt.matrixTransform(inv)
      return { x: local.x, y: local.y }
    },
    [svgRef],
  )

  // ── Accións ──

  const fit = useCallback(() => {
    if (bounds === undefined) return
    const svg = svgRef.current
    /* v8 ignore next -- defensivo: ref pode ser null */
    if (svg === null) return
    const rect = svg.getBoundingClientRect()
    setState(fitTransform(bounds, padding, rect.width, rect.height, minZoom, maxZoom))
  }, [bounds, padding, svgRef, minZoom, maxZoom])

  const reset = useCallback(() => {
    setState(IDENTITY)
  }, [])

  const zoomBy = useCallback(
    (factor: number) => {
      setState((s) => {
        const newZoom = clampZoom(s.zoom * factor, minZoom, maxZoom)
        if (newZoom === s.zoom) return s
        // Zoom centrado no medio do viewBox (sen cursor explícito).
        // Calculamos un cursor "virtual" no centro do viewBox actual,
        // que tras zoom mantén ese centro fixo. Como non temos acceso
        // ao bounds aquí dunha forma estable, usamos panX/Y como
        // proxy: centro = (panX, panY) significa "manter en posición".
        // En práctica, queda OK para botóns; o wheel zooma ao cursor.
        return { ...s, zoom: newZoom }
      })
    },
    [minZoom, maxZoom],
  )

  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy])
  const getZoom = useCallback(() => state.zoom, [state.zoom])

  // ── Pan via pointer events ──

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      // Só botón principal. **Non** capturamos o pointer aínda: se
      // setamos `setPointerCapture` aquí, o `pointerup` redirixe ao
      // `<svg>` e o `onClick` dos nodos non se dispara (trap clásica
      // — A.6.24). O capture difírese ata que o cursor cruce o umbral
      // anti-click en `onPointerMove`, momento no que xa **somos un
      // pan** e queremos arrastrar o evento.
      if (e.button !== 0) return
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: state.panX,
        initialPanY: state.panY,
        moved: false,
      }
    },
    [state.panX, state.panY],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const ps = panStartRef.current
      if (ps === null) return
      const dx = e.clientX - ps.startX
      const dy = e.clientY - ps.startY
      if (!ps.moved) {
        // Umbral anti-click: por baixo, segue sendo click.
        if (Math.abs(dx) < PAN_CLICK_THRESHOLD && Math.abs(dy) < PAN_CLICK_THRESHOLD) return
        ps.moved = true
        setIsPanning(true)
        // **Agora** capturamos o pointer: cancela o `onClick` pendente
        // dos targets descendentes (xa entramos en modo pan) e
        // garante que o move/up cheguen mesmo se o cursor sae do
        // `<svg>`.
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      // Pan en coords cliente: aplicamos un factor para que o
      // desprazamento sexa percibido coherentemente. Como o viewBox xa
      // mapea coords cliente a usuario co `preserveAspectRatio="meet"`,
      // unha aproximación pragmática é usar a relación viewBoxW /
      // clientW. Para simplicidade: usamos dx/dy directos en coords
      // cliente → eso traduce ao espazo do `<g>` baixo o `<svg>`, e
      // funciona ben mentres o aspect ratio non é absurdo. Pode
      // refinarse cunha lectura do CTM se queremos pan en coords
      // usuario exactas.
      setState({
        panX: ps.initialPanX + dx,
        panY: ps.initialPanY + dy,
        zoom: state.zoom,
      })
    },
    [state.zoom],
  )

  const onPointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    panStartRef.current = null
    setIsPanning(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  // ── Wheel zoom (listener nativo non-pasivo) ──

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) return undefined

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const user = clientToUser(e.clientX, e.clientY)
      if (user === null) return
      setState((s) => zoomToward(s, factor, user.x, user.y, minZoom, maxZoom))
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      svg.removeEventListener('wheel', onWheel)
    }
  }, [svgRef, clientToUser, minZoom, maxZoom])

  // ── Fit on mount ──
  //
  // Patrón con `fitRef`: necesitamos chamar `fit()` dentro do useEffect
  // pero non queremos que `fit` (que cambia cando cambian as súas deps
  // internas) re-dispare o efecto cada vez. Usar un ref evita o
  // re-trigger e mantén Biome contento con dependencias honestas.
  const fitRef = useRef(fit)
  useEffect(() => {
    fitRef.current = fit
  }, [fit])

  // **Fix (reportado por un consumidor, F12.x)**: o nome "fit on mount"
  // prometía disparar UNHA vez, pero as deps `[bounds, fitOnMount]`
  // facían que se re-disparase cada vez que `bounds` cambiaba de
  // referencia — en consumidores sen `coordinateBounds` explícito
  // (onde `bounds` = layout bounds, recalculados en cada edición),
  // iso resetaba o pan/zoom interactivo a cada cambio estrutural
  // (ex. engadir un nodo), perdendo calquera axuste manual do
  // usuario. `hasFittedRef` garante que `fit()` se chama COMO MOITO
  // unha vez na vida do hook — se `bounds` non está dispoñible aínda
  // no primeiro render, o efecto sponta agarda (deps aínda inclúen
  // `bounds` para reaccionar a esa transición inicial undefined→
  // definido), pero unha vez fitted (con éxito OU por bounds
  // dexenerados), nunca máis volve chamar `fit()`.
  //
  // **Bounds dexenerados** (ex. árbore baleira → {minX:0,minY:0,
  // maxX:0,maxY:0}, largo/alto 0): NON fit — deixar o viewport por
  // defecto (identidade) en vez de encadrar un box de tamaño cero
  // (que produciría un zoom extremo). Igual se marca como "xa
  // fitted" para non reintentar: é o comportamento agardado dun
  // documento baleiro, non un estado transitorio a resolver despois.
  //
  // Para quen queira reencadrar baixo demanda (ex. tras engadir
  // moitos nodos), o contrato xa existe: `fit()` no valor de retorno.
  const hasFittedRef = useRef(false)
  useEffect(() => {
    if (!fitOnMount) return undefined
    if (hasFittedRef.current) return undefined
    if (bounds === undefined) return undefined

    const isDegenerate = bounds.maxX - bounds.minX <= 0 || bounds.maxY - bounds.minY <= 0
    if (isDegenerate) {
      hasFittedRef.current = true
      return undefined
    }

    hasFittedRef.current = true
    // Esperamos un tick para garantir que o <svg> está montado coas
    // dimensións finais. requestAnimationFrame é máis fiable que
    // setTimeout(0) en navegadores reais; en jsdom degrada a no-op.
    const raf =
      typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame(() => fitRef.current())
        : null
    return () => {
      if (raf !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(raf)
      }
    }
  }, [bounds, fitOnMount])

  return {
    state,
    transform,
    isPanning,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    fit,
    reset,
    zoomIn,
    zoomOut,
    zoomBy,
    getZoom,
  }
}
// ── FIN: useViewport ──
