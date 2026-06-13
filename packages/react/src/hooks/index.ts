// ── INICIO: hooks barrel ──
// Re-exporta os 4 hooks customizados de @yggdrasil-forge/react.
// Diferidos a sub-fases futuras (require APIs en core):
//   - useTreeChanges (require API de historial de changes).
//   - useGroupNodes (require getNodesByGroup en TreeEngine).
//   - useVisibleNodes (require tipo Viewport en core).

export { useSkillTree } from './useSkillTree.js'
export { useNodeState } from './useNodeState.js'
export { useNodeSelector } from './useNodeSelector.js'
export { useStat } from './useStat.js'
// ── FIN: hooks barrel ──
