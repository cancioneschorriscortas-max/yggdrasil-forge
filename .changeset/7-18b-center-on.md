---
'@yggdrasil-forge/react': minor
---

feat(react): SkillTreeHandle.centerOn — navegación programática ao nodo

`centerOn(nodeId, opts?)` centra a vista nun nodo: salto directo
(coherente con `fit()`, que tampouco anima), `opts.zoom` opcional co
clamp de sempre, pan resultante polo MESMO `clampPan` do pan manual.
`nodeId` inexistente ou sen posición → no-op silencioso documentado (o
handle non lanza). Novo helper puro `centerOnTransform` exportado do
hook para tests sen DOM.
