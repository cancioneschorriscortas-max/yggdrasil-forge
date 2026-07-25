---
'@yggdrasil-forge/editor-react': patch
---

fix(editor-react): o SVG do canvas enche o seu panel (non se desborda)

Sen `height/width` explícitos, o `.editor-canvas` colapsaba e o SVG
(que é width/height:100%) collía o seu tamaño intrínseco cadrado
(viewBox), desbordándose o panel e tapándose ~40% detrás do panel
Problemas. Agora enche o panel coma `.editor-panel`.
