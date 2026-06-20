// ── INICIO: SkillNodeControls (Interactivo Capa B) ──
// Controis SVG ➕/➖ que se renderizan adxacentes ao nodo seleccionado,
// dentro do `<g transform>` do viewport (móvense e escálanse co pan/zoom).
//
// Subcompoñente puro: non chama ao motor; só dispara callbacks.
// O consumidor (App.tsx no demo) cablea `engine.unlock` e
// `engine.lockOneTier` aos callbacks. O motor non está acoplado a `@react`.
import type { JSX } from 'react'
import { useTheme } from './ThemeProvider.js'

interface SkillNodeControlsProps {
  /** Posición do nodo seleccionado no espazo do layout. */
  readonly position: { readonly x: number; readonly y: number }
  /** Radio do nodo (para calcular offsets dos controis). */
  readonly nodeRadius: number
  /** ID do nodo seleccionado (pásase aos callbacks). */
  readonly nodeId: string
  /** Tier actual do nodo. Determina se ➖ está disabled (tier 0 → disabled). */
  readonly currentTier: number
  /** Tier máximo do nodo. Determina se ➕ está disabled (maxed → disabled). */
  readonly maxTier: number
  /** Se `false`, ➕ disabled aínda non estando maxed (afordabilidade/prereqs). */
  readonly canIncrease?: boolean
  /** Callback ao premer ➕. */
  readonly onIncrease: (nodeId: string) => void
  /** Callback ao premer ➖. */
  readonly onDecrease: (nodeId: string) => void
}

/**
 * Renderiza dous botóns SVG circulares con ➕ e ➖ ás laterais
 * (esquerda/dereita) do nodo, separados con `nodeRadius * 1.4` do centro.
 *
 * `stopPropagation` no onClick para que o clic no botón non dispare
 * a selección/pan do canvas.
 *
 * Disabled visuals: opacity reducida + `pointerEvents="none"` + sen
 * cursor pointer.
 */
export function SkillNodeControls({
  position,
  nodeRadius,
  nodeId,
  currentTier,
  maxTier,
  canIncrease,
  onIncrease,
  onDecrease,
}: SkillNodeControlsProps): JSX.Element {
  const theme = useTheme()
  const buttonR = Math.max(10, nodeRadius * 0.35)
  const offset = nodeRadius + buttonR + 4 // separación horizontal do centro do nodo

  const minusDisabled = currentTier <= 0
  const plusDisabled = currentTier >= maxTier || canIncrease === false

  const enabledFill = theme?.colors.nodeUnlockable ?? '#e0a93c'
  const disabledFill = theme?.colors.nodeLocked ?? '#5b6b86'
  const textColor = '#ffffff'

  const handleMinusClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (!minusDisabled) onDecrease(nodeId)
  }
  const handlePlusClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (!plusDisabled) onIncrease(nodeId)
  }
  const handleMinusKey = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    if (!minusDisabled) onDecrease(nodeId)
  }
  const handlePlusKey = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    if (!plusDisabled) onIncrease(nodeId)
  }
  const handlePointerDown = (e: React.PointerEvent): void => {
    // Impide que o pan do viewport capture este pointer.
    e.stopPropagation()
  }

  return (
    <g
      className="yf-skill-node-controls"
      data-node-id={nodeId}
      transform={`translate(${position.x},${position.y})`}
    >
      {/* ➖ botón (esquerda) */}
      <g
        className="yf-skill-node-controls__minus"
        data-testid="control-minus"
        data-disabled={minusDisabled ? 'true' : 'false'}
        transform={`translate(${-offset},0)`}
        // biome-ignore lint/a11y/useSemanticElements: SVG <g> non pode ser substituído por <button>; role="button" é a única vía dentro dun canvas SVG.
        role="button"
        tabIndex={minusDisabled ? -1 : 0}
        aria-label={`Retirar un punto de ${nodeId}`}
        aria-disabled={minusDisabled}
        style={{
          cursor: minusDisabled ? 'not-allowed' : 'pointer',
          opacity: minusDisabled ? 0.4 : 1,
          pointerEvents: minusDisabled ? 'none' : 'auto',
        }}
        onClick={handleMinusClick}
        onKeyDown={handleMinusKey}
        onPointerDown={handlePointerDown}
      >
        <circle cx={0} cy={0} r={buttonR} fill={minusDisabled ? disabledFill : enabledFill} />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: buttonR * 1.4,
            fontWeight: 700,
            fill: textColor,
            userSelect: 'none',
          }}
        >
          −
        </text>
      </g>
      {/* ➕ botón (dereita) */}
      <g
        className="yf-skill-node-controls__plus"
        data-testid="control-plus"
        data-disabled={plusDisabled ? 'true' : 'false'}
        transform={`translate(${offset},0)`}
        // biome-ignore lint/a11y/useSemanticElements: SVG <g> non pode ser substituído por <button>; role="button" é a única vía dentro dun canvas SVG.
        role="button"
        tabIndex={plusDisabled ? -1 : 0}
        aria-label={`Investir un punto en ${nodeId}`}
        aria-disabled={plusDisabled}
        style={{
          cursor: plusDisabled ? 'not-allowed' : 'pointer',
          opacity: plusDisabled ? 0.4 : 1,
          pointerEvents: plusDisabled ? 'none' : 'auto',
        }}
        onClick={handlePlusClick}
        onKeyDown={handlePlusKey}
        onPointerDown={handlePointerDown}
      >
        <circle cx={0} cy={0} r={buttonR} fill={plusDisabled ? disabledFill : enabledFill} />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: buttonR * 1.4,
            fontWeight: 700,
            fill: textColor,
            userSelect: 'none',
          }}
        >
          +
        </text>
      </g>
    </g>
  )
}
// ── FIN: SkillNodeControls ──
