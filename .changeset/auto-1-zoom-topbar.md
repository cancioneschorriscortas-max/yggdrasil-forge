---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): botóns de zoom da TopBar operativos (−/+)

Pecha o «TODO» histórico: os botóns −/+ da TopBar achegan e afastan o
canvas vía `SkillTreeHandle.zoomIn/zoomOut`, co mesmo taboleiro de
anuncios do ShellRuntimeContext que usa «Ir ao nodo» (o canvas rexistra
`ViewportControls`; o shell reenvíaos á TopBar por props). En vista
tarxetas quedan desactivados (non hai viewport de grafo). `TopBar` gaña
`onZoomIn`/`onZoomOut`/`zoomDisabled` opcionais — sen eles compórtase
coma antes (desactivados).
