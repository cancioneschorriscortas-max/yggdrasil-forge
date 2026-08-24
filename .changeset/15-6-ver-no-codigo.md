---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): «Ver no código» desde o panel Problemas

Acción secundaria nas filas con nodo: abre e ACTIVA o panel Código
(PanelHostHandle gaña `activatePanel`) e salta á liña do
`"id": "<nodeId>"` no texto actual, con cursor, scroll centrado e
foco. Taboleiro no ShellRuntime con petición pendente flusheada no
rexistro. Complementa o clic-que-centra-no-canvas de 7.18b; no-op en
Proba.
