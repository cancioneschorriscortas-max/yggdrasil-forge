---
'@yggdrasil-forge/editor-react': patch
---

feat(editor-react): atallos de teclado Undo/Redo (Ctrl/Cmd+Z / Ctrl/Cmd+Y)

Ctrl/Cmd+Z desfai; Ctrl/Cmd+Y ou Ctrl/Cmd+Shift+Z refai. Con garda de
foco: non rouban o undo NATIVO cando se escribe nun input/textarea, e
non actúan en modo Proba (alí o "undo" é Reiniciar).
