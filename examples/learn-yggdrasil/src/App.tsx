// ── INICIO: App "Learn Yggdrasil Forge" ──
//
// Casca pulida para o curso aniñado:
//   - Pila de engines + breadcrumb clicable.
//   - Selección: clic simple selecciona, dobre clic abre anchor (≤300ms).
//   - Barra inferior: mostra progreso da subárbore (se anchor) ou
//     condicións con ✓/✗ (se bloqueado) usando `explainUnlock`.
//   - Transición CSS curta ao mudar de nivel (opt-out por reduced-motion).
//   - Tema `academic` aplicado vía <ThemeProvider> exterior; SkillTree
//     respéctao (SkillTreeWithDefaultTheme detecta tema ascendente).
//
// Todo é consumidor-side, **só API pública** do motor:
// `subscribe`/`getSnapshot`/`getServerSnapshot`, `enterSubtree`,
// `getTreeDef`, `getNodeState`, `getAllNodeStates`, `canUnlock`,
// `unlock`, `explainUnlock`.

import type { LocalizedString } from '@yggdrasil-forge/common'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { NodeDef, UnlockConditionEvaluation } from '@yggdrasil-forge/core'
import { SkillTree, ThemeProvider } from '@yggdrasil-forge/react'
import type { JSX } from 'react'
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { academic } from './theme-academic.js'
import { learnYggdrasilDef } from './tree-def-learn-yggdrasil.js'

interface Crumb {
  readonly engine: TreeEngine
  readonly label: string
}

function resolveLabel(label: LocalizedString | string | undefined): string {
  if (label === undefined) return ''
  if (typeof label === 'string') return label
  return label.en ?? Object.values(label)[0] ?? ''
}

function nodeLabel(node: NodeDef | undefined): string {
  return resolveLabel(node?.label)
}

interface SubtreeProgress {
  readonly unlocked: number
  readonly total: number
  readonly pct: number
}

/** Lectura de progreso dunha subárbore (consumidor-side). */
function subtreeProgress(engine: TreeEngine, subtreeId: string): SubtreeProgress {
  const def = engine.getTreeDef().subtrees?.[subtreeId]
  const total = def?.nodes.length ?? 0
  const snap = engine.getSnapshot()
  const sst = snap.subtreeStates?.[subtreeId]
  let unlocked = 0
  if (sst !== undefined) {
    for (const inst of Object.values(sst.nodes)) {
      if (inst.state === 'unlocked' || inst.state === 'maxed') unlocked++
    }
  }
  const pct = total === 0 ? 0 : Math.round((unlocked / total) * 100)
  return { unlocked, total, pct }
}

/** Progreso global da árbore actual (conta nodos do nivel actual). */
function currentProgress(engine: TreeEngine): SubtreeProgress {
  const def = engine.getTreeDef()
  const states = engine.getAllNodeStates()
  let unlocked = 0
  for (const n of def.nodes) {
    const s = states.get(n.id)?.state
    if (s === 'unlocked' || s === 'maxed') unlocked++
  }
  const total = def.nodes.length
  const pct = total === 0 ? 0 : Math.round((unlocked / total) * 100)
  return { unlocked, total, pct }
}

export function App(): JSX.Element {
  const rootEngine = useMemo(() => new TreeEngine(learnYggdrasilDef), [])
  const rootLabel = useMemo(() => resolveLabel(rootEngine.getTreeDef().label), [rootEngine])

  const [stack, setStack] = useState<readonly Crumb[]>(() => [
    { engine: rootEngine, label: rootLabel || 'Curso' },
  ])
  // Stack nunca está baleiro: inicialízase con 1 elemento e `goTo` só
  // recorta deixando 1+ elementos. Lectura segura do último elemento.
  const current = stack[stack.length - 1] ?? stack[0]
  if (current === undefined) {
    throw new Error('learn-yggdrasil: stack inesperadamente baleiro')
  }
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined)

  // Re-render cando muda o estado do engine actual.
  useSyncExternalStore(
    useCallback((cb: () => void) => current.engine.subscribe(cb), [current.engine]),
    () => current.engine.getSnapshot(),
    () => current.engine.getServerSnapshot(),
  )

  // Dobre-clic: rexistro do último clic con timeout suave.
  const lastClick = useRef<{ id: string; t: number } | null>(null)

  const openSubtree = useCallback(
    (anchorId: string) => {
      const node = current.engine.getTreeDef().nodes.find((n) => n.id === anchorId)
      const subtreeId = node?.subtreeId
      if (subtreeId === undefined) return
      const res = current.engine.enterSubtree(subtreeId)
      if (res.ok) {
        const sub = res.value
        setStack((prev) => [...prev, { engine: sub, label: nodeLabel(node) }])
        setSelectedNodeId(undefined)
      }
    },
    [current.engine],
  )

  const handleNodeClick = useCallback(
    (id: string) => {
      const now = Date.now()
      const isDouble = lastClick.current?.id === id && now - lastClick.current.t < 300
      lastClick.current = { id, t: now }

      const node = current.engine.getTreeDef().nodes.find((n) => n.id === id)
      const st = current.engine.getNodeState(id)?.state ?? 'locked'
      const openableAnchor =
        node?.type === 'subtree_anchor' && (st === 'unlocked' || st === 'maxed')

      if (openableAnchor) {
        if (isDouble) openSubtree(id)
        else setSelectedNodeId(id)
        return
      }
      setSelectedNodeId(id)
      // Lección ou anchor aínda non aberto: intentar unlock (fire-and-forget).
      // canUnlock decide internamente; o estado inicial é 'locked' (non
      // 'unlockable') aínda que non haxa prerequisites pendentes, polo que
      // limitar a `st === 'unlockable'` impediría o primeiro unlock.
      if (st !== 'unlocked' && st !== 'maxed') {
        void current.engine.unlock(id)
      }
    },
    [current.engine, openSubtree],
  )

  const goTo = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, index + 1))
    setSelectedNodeId(undefined)
  }, [])

  // HUD: progreso global (do nivel actual).
  const progress = currentProgress(current.engine)

  // Barra de selección.
  const selectedNode =
    selectedNodeId !== undefined
      ? current.engine.getTreeDef().nodes.find((n) => n.id === selectedNodeId)
      : undefined
  const selectedState =
    selectedNodeId !== undefined
      ? (current.engine.getNodeState(selectedNodeId)?.state ?? 'locked')
      : undefined
  const isSelectedAnchor =
    selectedNode?.type === 'subtree_anchor' && selectedNode.subtreeId !== undefined
  const isAnchorOpen =
    isSelectedAnchor && (selectedState === 'unlocked' || selectedState === 'maxed')
  const explain =
    selectedNodeId !== undefined && selectedState === 'locked'
      ? current.engine.explainUnlock(selectedNodeId)
      : undefined

  return (
    <div className="ly-shell">
      <header className="ly-hud">
        <h1 className="ly-title">Learn Yggdrasil Forge</h1>
        <p className="ly-progress-text">
          {resolveLabel(current.engine.getTreeDef().label) || current.label}: {progress.unlocked}/
          {progress.total} lessons · {progress.pct}%
        </p>
        <div className="ly-progress-bar" aria-hidden="true">
          <div className="ly-progress-fill" style={{ width: `${progress.pct}%` }} />
        </div>
      </header>

      <nav className="ly-crumb" aria-label="Breadcrumb">
        {stack.map((crumb, i) => {
          const isLast = i === stack.length - 1
          return (
            <span key={crumb.engine.getTreeDef().id}>
              {i > 0 && <span className="ly-crumb-sep"> › </span>}
              {isLast ? (
                <span className="ly-crumb-current">{crumb.label}</span>
              ) : (
                <button type="button" className="ly-crumb-link" onClick={() => goTo(i)}>
                  {crumb.label}
                </button>
              )}
            </span>
          )
        })}
      </nav>

      {selectedNode !== undefined && (
        <div className="ly-select" aria-live="polite">
          <div className="ly-select-title">{nodeLabel(selectedNode)}</div>
          {isSelectedAnchor && selectedNode.subtreeId !== undefined && (
            <SubtreeProgressLine
              progress={subtreeProgress(current.engine, selectedNode.subtreeId)}
            />
          )}
          {explain?.ok === true && !explain.value.satisfied && (
            <ul className="ly-select-conditions">
              {explain.value.conditions.map((c, idx) => (
                <ConditionRow key={`${c.condition.type}-${idx}`} evaluation={c} />
              ))}
            </ul>
          )}
          {isAnchorOpen && (
            <button
              type="button"
              className="ly-open-button"
              onClick={() => openSubtree(selectedNode.id)}
            >
              Open {nodeLabel(selectedNode)} →
            </button>
          )}
        </div>
      )}

      <main className="ly-canvas">
        <div className="ly-canvas-inner" key={stack.length}>
          <ThemeProvider theme={academic}>
            <SkillTree
              engine={current.engine}
              onNodeClick={handleNodeClick}
              {...(selectedNodeId !== undefined ? { selectedNodeId } : {})}
            />
          </ThemeProvider>
        </div>
      </main>
    </div>
  )
}

function SubtreeProgressLine({ progress }: { readonly progress: SubtreeProgress }): JSX.Element {
  return (
    <div>
      {progress.unlocked}/{progress.total} · {progress.pct}%
    </div>
  )
}

function ConditionRow({
  evaluation,
}: {
  readonly evaluation: UnlockConditionEvaluation
}): JSX.Element {
  const { satisfied, reason } = evaluation
  const text = resolveLabel(reason)
  return (
    <li>
      <span className={satisfied ? 'ly-cond-ok' : 'ly-cond-no'}>{satisfied ? '✓' : '✗'}</span>
      <span>{text}</span>
    </li>
  )
}
// ── FIN: App ──
