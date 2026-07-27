---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): «Dispor» — as posicións xa non se inventan (7.16)

Dropdown «Dispor» na barra do canvas (Autoría + vista grafo): Radial ·
Árbore (por niveis) · Radial por grupos · Constelación. Aplicar coce as
posicións nunha transacción (UN undo devolve todo) e encadra con fit().
Convite tras importar: se ≥30% dos nodos non teñen posición, barra
discreta «Hai N nodos sen posición — ¿Dispor?» cos algoritmos a un clic
(sen modais; ✕ péchaa; desaparece soa ao dispor).
