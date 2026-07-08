// ── INICIO: EditorCanvas ──
// 7.5b-ii: o canvas reacciona a tactos reais.
//
// Engade sobre 7.5b-i:
//   - **Drag-to-move**: arrastrar un nodo → ghost no Overlay → soltar
//     → 1 transacción → undo restáura. (★ test visible.)
//   - **Multi-selección**: shift-clic engade/quita; aneis no Overlay.
//   - **Marquee**: shift-drag sobre baleiro → rect → seleccionar nodos
//     dentro.
//
// **Pipeline de eventos** (en fase de captura do contedor):
//   pointerdown nun nodo → state='pressed-node' (esperar limiar).
//     stopPropagation: o SkillTree NON inicia pan.
//   pointermove con state='pressed-node':
//     se desprazamento > limiar → state='dragging' + createMoveOperation.
//     se non, ignorar (clic non confirmado).
//   pointermove con state='dragging' → operation.update(docPoint).
//   pointerup con state='dragging' → engine.transaction(commit). 1 entrada.
//   pointerup con state='pressed-node' (sin drag) → selección (replace
//     ou toggle se shift).
//   pointerdown sobre baleiro + shift → state='marquee'.
//   pointermove con state='marquee' → actualizar rect.
//   pointerup con state='marquee' → seleccionar nodos dentro do rect.
//   pointerdown sobre baleiro sin shift → deixar pasar (pan do SkillTree).
//   Escape → cancel (operation/marquee).
//
// **Decisión arquitectural** (banco): o InteractionController + Tools
// de 7.3 quedan latentes para cando exista UI de barra de tools.
// 7.5b-ii usa createMoveOperation + engine.transaction + SelectionEngine
// directos, porque o modelo "drag vs clic polo limiar" non encaixa co
// modelo Tool actual (a tool teríase que decidir DESPOIS do pointerdown).

import { TreeEngine } from '@yggdrasil-forge/core'
import {
  type EditorEngine,
  type Operation,
  type SelectionRef,
  type ThemeSpec,
  addNode,
  buildConnect,
  buildNewNode,
  buildRemoveCascade,
  createMoveOperation,
} from '@yggdrasil-forge/editor-core'
import {
  type RegionSpec,
  SkillTree,
  type Theme,
  ThemeProvider,
  type ViewportState,
  minimal,
  minimalDark,
} from '@yggdrasil-forge/react'
import {
  type JSX,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ProbaSession } from '../proba/useProbaSession.js'
import { CanvasOverlay, type OverlayRectPx } from './CanvasOverlay.js'
import { type CanvasTool, CanvasToolbar } from './CanvasToolbar.js'
import { hitTestNode, nodesInRect } from './internals/hitTest.js'
import {
  IDLE,
  type PointerState,
  exceededDragThreshold,
  isAdditive,
  modifiersOf,
  rectBetween,
} from './internals/pointerState.js'
import { docToScreen, findCanvasCtmElement, screenToDoc } from './internals/screenDocCTM.js'

export interface EditorCanvasProps {
  readonly editorEngine: EditorEngine
  /**
   * **7.6**: sesión de Proba activa (opcional). Se está definida:
   *   - o SkillTree renderiza co treeEngine da sesión (non co de render).
   *   - drag/marquee desactivados; a selección (para a ficha) mantense.
   *   - undo/redo do documento non se ven afectados (o EditorEngine
   *     non se toca; edición está apagada polo TopBar/Inspector aparte).
   */
  readonly probaSession?: ProbaSession | null
  /**
   * **F7.9** (antes 7.8.1, heurística por campo, xa retirada): tema do
   * CHROME do editor (claro/escuro), non do documento. Escolle a BASE
   * de render do canvas — `minimalDark` en escuro, `minimal` en
   * claro/sen definir — para que texto, arestas, malla e trazos sexan
   * lexibles sobre calquera fondo do chrome. Os overrides explícitos
   * do documento (`ThemeSpec.textColor`, `nodeFills`) gañan sempre
   * sobre a base escollida. Sen esta prop, compórtase coma sempre
   * (`minimal`) — cero regresión.
   */
  readonly chromeTheme?: 'light' | 'dark'
}

/**
 * Hook auxiliar: subscribe ao SelectionEngine e devolve as refs
 * actuais (todas as seleccionadas — para multi-selección no Overlay).
 *
 * **Cache estable**: `selection.current()` devolve un array novo cada
 * chamada (limitación do SelectionEngine en 7.3). `useSyncExternalStore`
 * require referencias estables entre snapshots sin cambio, ou bucla
 * indefinidamente. Cacheamos polo subscribe: cada vez que dispara,
 * recalculamos e gardamos; entre disparos devolvemos a mesma ref.
 */
function useSelectedRefs(editorEngine: EditorEngine): readonly SelectionRef[] {
  const selection = editorEngine.getSession().selection
  const cacheRef = useRef<readonly SelectionRef[]>([])
  const subscribe = useCallback(
    (cb: () => void) => {
      // Refrescar a cache cando dispara o subscribe.
      const unsubscribe = selection.subscribe(() => {
        cacheRef.current = selection.current()
        cb()
      })
      // Snapshot inicial.
      cacheRef.current = selection.current()
      return unsubscribe
    },
    [selection],
  )
  const getSnapshot = useCallback(() => cacheRef.current, [])
  const getServerSnapshot = useCallback(() => cacheRef.current, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function EditorCanvas({
  editorEngine,
  probaSession = null,
  chromeTheme,
}: EditorCanvasProps): JSX.Element {
  // Re-render en commits do EditorEngine.
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )
  // **7.6**: se hai sesión de Proba, o SkillTree renderiza co seu
  // TreeEngine (con estado vivo — nodos desbloquéanse, recursos
  // baixan). Sen sesión, TreeEngine de RENDER (todo bloqueado, para
  // ver a estrutura durante Autoría).
  const renderTreeEngine = useMemo(() => new TreeEngine(doc.tree), [doc])
  const treeEngine = probaSession?.treeEngine ?? renderTreeEngine
  const selectedRefs = useSelectedRefs(editorEngine)
  const inProba = probaSession !== null

  // Container do canvas e versión do viewport (para forzar overlay redraw).
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportVersion, setViewportVersion] = useState(0)

  // O CTM do `<g>` co transform pan/zoom (dentro do <svg> do SkillTree)
  // é a fonte de verdade screen↔doc. ★ Importante: NON o <svg> raíz —
  // ese non inclúe o transform. Ver screenDocCTM.ts para a cicatriz.
  //
  // **Robustez**: o primeiro paint pode non ter o `<g>` aínda (o
  // SkillTree fai cálculos de layout antes de pintar). Usamos
  // MutationObserver no contedor para captar o `<g>` cando apareza, e
  // así evitamos un primeiro frame con ctmEl=null (que nesgaba aneis
  // ata o segundo render).
  const [ctmEl, setCtmEl] = useState<SVGGraphicsElement | null>(null)
  useEffect(() => {
    if (containerRef.current === null) return
    const el = containerRef.current
    // 1. Comprobación inmediata (caso normal: <svg><g/> xa montado).
    const initial = findCanvasCtmElement(el)
    if (initial !== null) {
      setCtmEl(initial)
      return
    }
    // 2. Se non está, observa o subtree ata que apareza.
    const mo = new MutationObserver(() => {
      const found = findCanvasCtmElement(el)
      if (found !== null) {
        setCtmEl(found)
        mo.disconnect()
      }
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  // Container rect (para converter screen-clientX a relative-X no overlay).
  //
  // **Problema histórico (visto na review visual)**: o `containerRect`
  // capturado só no mount + window resize/scroll quedaba **obsoleto** cando
  // dockview redimensionaba os paneis arrastrando o borde — dockview non
  // dispara window resize, polo que os aneis/ghosts quedaban en
  // coordenadas vellas (anel orfo arriba á esquerda do canvas).
  //
  // **Arranxo**: ResizeObserver no propio contedor. Captura cambios de
  // tamaño/posición do elemento sin depender de eventos de ventana.
  // Window resize/scroll seguen como sinais adicionais (cambios de
  // posición do elemento na páxina).
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (containerRef.current === null) return
    const el = containerRef.current
    const update = (): void => {
      setContainerRect(el.getBoundingClientRect())
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [])

  // Estado interno do pointer (idle / pressed-node / dragging / marquee).
  // Usamos ref porque queremos que os handlers vexan sempre o estado
  // máis recente sin re-binding por cada paint; e state separado para
  // o que precisa re-render (ghosts/marquee rect).
  const pointerStateRef = useRef<PointerState>(IDLE)
  const [ghostPositions, setGhostPositions] = useState<
    ReadonlyMap<string, { x: number; y: number }> | undefined
  >(undefined)
  const [marqueeRectPx, setMarqueeRectPx] = useState<OverlayRectPx | undefined>(undefined)

  // ── 7.11 — barra de ferramentas ──
  const [tool, setTool] = useState<CanvasTool>('select')
  // Persiste durante a sesión (non se reinicia ao trocar de tool nin
  // ao conectar); por defecto marcado, tal como pide o briefing.
  const [createPrerequisite, setCreatePrerequisite] = useState(true)
  // Posición do cursor (doc-space) mentres a tool Conectar ten un
  // primeiro clic feito. undefined = sen conexión en curso.
  const [connectCursorDoc, setConnectCursorDoc] = useState<{ x: number; y: number } | undefined>(
    undefined,
  )

  // ── Conversión: positions canónicas dos nodos (para o Overlay) ──
  const nodePositions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    for (const node of doc.tree.nodes) {
      if (node.position !== undefined) {
        m.set(node.id, { x: node.position.x, y: node.position.y })
      }
    }
    return m
  }, [doc])

  // ── Commit dunha Operation ──
  const commitOperation = useCallback(
    (op: Operation) => {
      const cmds = op.commit()
      if (cmds.length === 0) return
      editorEngine.transaction({ en: 'Move' }, (tx) => {
        for (const cmd of cmds) tx.apply(cmd)
      })
    },
    [editorEngine],
  )

  // ── Pointer handlers (en fase de captura sobre o contedor) ──
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (ctmEl === null) return
      const screen = { x: e.clientX, y: e.clientY }
      const docPoint = screenToDoc(ctmEl, screen)
      if (docPoint === null) return
      const mods = modifiersOf(e)
      const hit = hitTestNode(docPoint, doc.tree)

      // **7.6**: en Proba, clic segue seleccionando (a ficha do
      // ProbaPanel necesítao) pero NON se inicia drag nin marquee.
      if (inProba) {
        if (hit !== null) {
          e.stopPropagation()
          editorEngine.getSession().selection.replace([hit])
        } else {
          editorEngine.getSession().selection.clear()
        }
        // Pan/zoom seguen funcionando (non paramos propagación no
        // caso de baleiro; en nodo si para evitar pan sobre nodo).
        return
      }

      // ── 7.11 — tool Engadir nodo ──
      // Clic sobre nodo existente: só selecciona (evita solapado
      // accidental). Clic en baleiro: crea o nodo aí mesmo.
      if (tool === 'add') {
        e.stopPropagation()
        if (hit !== null) {
          editorEngine.getSession().selection.replace([hit])
          return
        }
        const newNode = buildNewNode(editorEngine.getDocument(), docPoint)
        const result = editorEngine.transaction({ en: 'Add node', gl: 'Engadir nodo' }, (tx) =>
          tx.apply(addNode(newNode)),
        )
        if (result.ok) {
          editorEngine.getSession().selection.replace([{ kind: 'node', id: newNode.id }])
        }
        return
      }

      // ── 7.11 — tool Conectar ──
      // Primeiro clic (nun nodo): arranca a fantasma. Segundo clic
      // (noutro nodo): despacha buildConnect e remata. Clic en
      // baleiro mentres conecta: cancela.
      if (tool === 'connect') {
        const state = pointerStateRef.current
        if (state.kind === 'connecting') {
          e.stopPropagation()
          if (hit !== null) {
            const cmds = buildConnect(editorEngine.getDocument(), state.sourceId, hit.id, {
              withPrerequisite: createPrerequisite,
            })
            if (cmds.length > 0) {
              editorEngine.transaction({ en: 'Connect', gl: 'Conectar' }, (tx) => {
                for (const c of cmds) tx.apply(c)
              })
            }
          }
          pointerStateRef.current = IDLE
          setConnectCursorDoc(undefined)
          return
        }
        if (hit !== null) {
          e.stopPropagation()
          pointerStateRef.current = { kind: 'connecting', sourceId: hit.id }
          setConnectCursorDoc(docPoint)
          return
        }
        // Clic en baleiro sen conexión en curso: nada especial.
        return
      }

      // ── tool Seleccionar (comportamento orixinal 7.5b-ii) ──
      if (hit !== null) {
        // Sobre un nodo: o editor xestiona. Bloqueamos a propagación para
        // que o SkillTree NON inicie pan.
        e.stopPropagation()
        // Capturamos o punteiro para que pointermove/up sigan chegando aínda
        // que se saia do elemento.
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        pointerStateRef.current = {
          kind: 'pressed-node',
          target: hit,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startDoc: docPoint,
          modifiers: mods,
        }
        return
      }

      // Sobre baleiro:
      if (mods.shift) {
        // Marquee. Bloqueamos pan; comezamos rect.
        e.stopPropagation()
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        pointerStateRef.current = {
          kind: 'marquee',
          startDoc: docPoint,
          currentDoc: docPoint,
          additive: true, // shift = additive
        }
        setMarqueeRectPx({
          x: e.clientX - (containerRect?.left ?? 0),
          y: e.clientY - (containerRect?.top ?? 0),
          width: 0,
          height: 0,
        })
        return
      }
      // Sen modificador, clic en baleiro → o SkillTree fai pan. Tamén
      // limpamos selección (UX habitual: clic no fondo = deseleccionar).
      editorEngine.getSession().selection.clear()
      // NON stopPropagation: deixa que o SkillTree inicie pan.
    },
    [ctmEl, doc, containerRect, editorEngine, inProba, tool, createPrerequisite],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (ctmEl === null) return
      if (inProba) return
      const state = pointerStateRef.current

      if (state.kind === 'connecting') {
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint === null) return
        setConnectCursorDoc(docPoint)
        return
      }

      if (state.kind === 'pressed-node') {
        if (!exceededDragThreshold(state.startScreenX, state.startScreenY, e.clientX, e.clientY)) {
          return // sigue podendo ser clic
        }
        // Confirma drag. Se o nodo non está xa seleccionado, replace-o (un
        // só) para que MoveOperation o leve. Se SI está seleccionado, drag
        // move todos os seleccionados xuntos (multi-drag).
        const selection = editorEngine.getSession().selection
        if (!selection.isSelected(state.target)) {
          selection.replace([state.target])
        }
        // Crea MoveOperation: captura posicións iniciais dos seleccionados.
        const op = createMoveOperation(editorEngine.getDocument(), selection, state.startDoc)
        // Aplica xa o primeiro update (delta = current - start).
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint !== null) {
          op.update(docPoint, {
            ...(state.modifiers.shift && { shift: true }),
            ...(state.modifiers.ctrl && { ctrl: true }),
            ...(state.modifiers.meta && { meta: true }),
            ...(state.modifiers.alt && { alt: true }),
          })
        }
        pointerStateRef.current = { kind: 'dragging', operation: op }
        // Actualiza ghosts no overlay.
        const ghosts = op.preview().nodePositions
        if (ghosts !== undefined) setGhostPositions(new Map(ghosts))
        return
      }

      if (state.kind === 'dragging') {
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint === null) return
        state.operation.update(docPoint, {})
        const ghosts = state.operation.preview().nodePositions
        if (ghosts !== undefined) setGhostPositions(new Map(ghosts))
        return
      }

      if (state.kind === 'marquee') {
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint === null) return
        pointerStateRef.current = { ...state, currentDoc: docPoint }
        // Actualizar rect screen-space para o overlay.
        if (containerRect !== null) {
          // Convertir os dous extremos doc → screen para o rect visible.
          // Pero é máis simple e exacto pintar usando screen-space directos
          // (clientX/Y respecto a containerRect) co startScreen rexistrado.
          // Aproximación: re-proxectamos startDoc → screen.
          // (Para precisión absoluta usaríamos os clientX/Y orixinais; iso
          // é mellor, así que cambiamos a forma de gardar o marquee.)
          const startScreen = (() => {
            const sp = docToScreen(ctmEl, state.startDoc)
            if (sp === null) return null
            return { x: sp.x - containerRect.left, y: sp.y - containerRect.top }
          })()
          if (startScreen === null) return
          const cur = {
            x: e.clientX - containerRect.left,
            y: e.clientY - containerRect.top,
          }
          setMarqueeRectPx({
            x: Math.min(startScreen.x, cur.x),
            y: Math.min(startScreen.y, cur.y),
            width: Math.abs(cur.x - startScreen.x),
            height: Math.abs(cur.y - startScreen.y),
          })
        }
        return
      }
      // idle: sin operación, sin marquee → nada que facer.
    },
    [ctmEl, editorEngine, containerRect, inProba],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (inProba) return
      const state = pointerStateRef.current

      if (state.kind === 'pressed-node') {
        // Foi clic (non se superou o limiar): selección.
        const selection = editorEngine.getSession().selection
        if (isAdditive(state.modifiers)) {
          selection.toggle(state.target)
        } else {
          selection.replace([state.target])
        }
        pointerStateRef.current = IDLE
        return
      }

      if (state.kind === 'dragging') {
        commitOperation(state.operation)
        setGhostPositions(undefined)
        pointerStateRef.current = IDLE
        return
      }

      if (state.kind === 'marquee') {
        const rect = rectBetween(state.startDoc, state.currentDoc)
        const inside = nodesInRect(rect, doc.tree)
        const selection = editorEngine.getSession().selection
        if (state.additive) {
          for (const ref of inside) selection.add(ref)
        } else {
          selection.replace(inside)
        }
        setMarqueeRectPx(undefined)
        pointerStateRef.current = IDLE
        return
      }
      // Sin acción específica; non tocou nada o noso pipeline.
      void e
    },
    [editorEngine, doc, commitOperation, inProba],
  )

  // ── 7.11 — reset do estado de punteiro + cambio de tool ──
  // Compartido entre Esc, atallos de teclado e clics na toolbar: trocar
  // de tool a media xesto (drag/marquee/connecting) debe cancelar ese
  // xesto sempre, ou queda "pillado" (ex. liña fantasma que non
  // desaparece se saltas de Conectar a Seleccionar por atallo sen
  // pasar por Esc).
  const resetPointerState = useCallback(() => {
    const state = pointerStateRef.current
    if (state.kind === 'dragging') {
      state.operation.cancel()
      setGhostPositions(undefined)
    } else if (state.kind === 'marquee') {
      setMarqueeRectPx(undefined)
    } else if (state.kind === 'connecting') {
      setConnectCursorDoc(undefined)
    }
    if (state.kind !== 'idle') {
      pointerStateRef.current = IDLE
    }
  }, [])
  const changeTool = useCallback(
    (t: CanvasTool) => {
      resetPointerState()
      setTool(t)
    },
    [resetPointerState],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Non interceptar mentres se escribe nun campo de texto (ex.
      // nome do nodo no Inspector, cor de tema): "n"/"c"/"v" son
      // letras normais aí.
      const target = e.target as HTMLElement | null
      const isTyping =
        target !== null &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (e.key === 'Escape') {
        resetPointerState()
        // 7.11: Esc volve sempre a Seleccionar (só ten sentido en
        // Autoría — a toolbar nin sequera se renderiza en Proba).
        if (!inProba) setTool('select')
        return
      }

      if (inProba || isTyping) return

      // 7.11: atallos de tool.
      if (e.key === 'v' || e.key === 'V') {
        changeTool('select')
        return
      }
      if (e.key === 'n' || e.key === 'N') {
        changeTool('add')
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        changeTool('connect')
        return
      }

      // 7.11: Supr/Delete — borrado con cascada da selección actual
      // (só con tool Seleccionar; noutras tools non hai selección de
      // arestas nin sentido de "borrar" no medio dun xesto).
      if (e.key === 'Delete' && tool === 'select') {
        const selection = editorEngine.getSession().selection
        const refs = selection.current()
        const nodeIds = refs.filter((r) => r.kind === 'node').map((r) => r.id)
        const edgeIds = refs.filter((r) => r.kind === 'edge').map((r) => r.id)
        if (nodeIds.length === 0 && edgeIds.length === 0) return
        const cmds = buildRemoveCascade(editorEngine.getDocument(), nodeIds, edgeIds)
        if (cmds.length > 0) {
          editorEngine.transaction({ en: 'Delete', gl: 'Eliminar' }, (tx) => {
            for (const c of cmds) tx.apply(c)
          })
          selection.clear()
        }
      }
    },
    [inProba, tool, editorEngine, resetPointerState, changeTool],
  )
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleViewportChange = useCallback((_vs: ViewportState) => {
    // Forza re-medida do CTM no overlay (aneis/ghosts seguen aos nodos
    // cando o usuario pan/zoom).
    setViewportVersion((v) => v + 1)
  }, [])

  const { coordinateBounds, theme: themeSpec, background } = doc.meta

  // ── 7.5e → F7.9: mapeo tema→render ──
  //
  // Constrúe o `Theme` de @react partindo dunha BASE escollida segundo
  // `chromeTheme` (`minimalDark` en escuro, `minimal` en claro/sen
  // definir) con override parcial dos nodeFill<Estado> e textColor do
  // documento. Memoiza por identidade do `themeSpec`+`chromeTheme`
  // para non crear un obxecto novo en cada render.
  //
  // **F7.9**: antes disto había unha heurística ad-hoc só para o
  // texto (`textOverride = spec.textColor ?? (chromeTheme==='dark' ?
  // '#e8e9ea' : undefined)`). Arranxo de raíz: a heurística morre, a
  // BASE ENTEIRA cambia con `chromeTheme` (texto, arestas, malla,
  // trazos, recheo base — todos lexibles en escuro sen overrides
  // puntuais). O override do documento (`spec.textColor`, nodeFills)
  // segue gañando sempre sobre a base escollida.
  //
  // O ThemeProvider é un provider de contexto React puro — **non mete
  // nodos DOM entre o contedor e o `<svg>`/`<g>`**. Por tanto a costura
  // CTM de 7.5b-ii (findCanvasCtmElement busca o primeiro `<g>`
  // descendente do `<svg>`) segue intacta. Aínda así, verificable
  // visualmente con drag + zoom.
  const theme: Theme = useMemo(() => {
    const spec: ThemeSpec = themeSpec ?? {}
    const fills = spec.nodeFills ?? {}
    const base = chromeTheme === 'dark' ? minimalDark : minimal
    return {
      ...base,
      colors: {
        ...base.colors,
        ...(spec.textColor !== undefined && { text: spec.textColor }),
        ...(fills.locked !== undefined && { nodeFillLocked: fills.locked }),
        ...(fills.unlockable !== undefined && { nodeFillUnlockable: fills.unlockable }),
        ...(fills.unlocked !== undefined && { nodeFillUnlocked: fills.unlocked }),
        ...(fills.maxed !== undefined && { nodeFillMaxed: fills.maxed }),
        ...(fills.inProgress !== undefined && { nodeFillInProgress: fills.inProgress }),
      },
    }
  }, [themeSpec, chromeTheme])

  // Rexións do tema → props do SkillTree. Mesma forma exacta.
  const regions: readonly RegionSpec[] = themeSpec?.regions ?? []

  // Fondo: v1 só `src`. `opacity/contrast` esperan a que @react os
  // consuma (banked).
  const backgroundImage: string | undefined = background?.src

  // ── 7.11 — liña fantasma da tool Conectar (doc-space) ──
  const connectLine = useMemo(() => {
    const state = pointerStateRef.current
    if (state.kind !== 'connecting' || connectCursorDoc === undefined) return undefined
    const sourcePos = nodePositions.get(state.sourceId)
    if (sourcePos === undefined) return undefined
    return { from: sourcePos, to: connectCursorDoc }
    // pointerStateRef non dispara re-render por si só; connectCursorDoc
    // SI (é o que muda en cada pointermove mentres se conecta), así que
    // vale como dep para recalcular isto en cada frame relevante.
  }, [connectCursorDoc, nodePositions])

  return (
    <div
      ref={containerRef}
      className="editor-canvas"
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onPointerCancelCapture={handlePointerUp}
      style={{ position: 'relative' }}
    >
      <ThemeProvider theme={theme}>
        <SkillTree
          engine={treeEngine}
          onViewportChange={handleViewportChange}
          {...(coordinateBounds !== undefined && { coordinateBounds })}
          {...(regions.length > 0 && { regions })}
          {...(backgroundImage !== undefined && { backgroundImage })}
        />
      </ThemeProvider>
      <CanvasOverlay
        ctmEl={ctmEl}
        containerRect={containerRect}
        selectedRefs={selectedRefs}
        nodePositions={nodePositions}
        viewportVersion={viewportVersion}
        {...(ghostPositions !== undefined && { ghosts: ghostPositions })}
        {...(marqueeRectPx !== undefined && { marqueeRect: marqueeRectPx })}
        {...(connectLine !== undefined && { connectLine })}
      />
      {!inProba && (
        <CanvasToolbar
          tool={tool}
          onToolChange={changeTool}
          createPrerequisite={createPrerequisite}
          onCreatePrerequisiteChange={setCreatePrerequisite}
        />
      )}
    </div>
  )
}
// ── FIN: EditorCanvas ──
