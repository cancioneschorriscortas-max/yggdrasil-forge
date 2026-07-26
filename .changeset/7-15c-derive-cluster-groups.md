---
'@yggdrasil-forge/editor-core': minor
---

feat(editor-core): `deriveClusterGroups` — derivación headless da vista de tarxetas (7.15c)

TreeDef → grupos coa forma que pide a ClusterCardsView de @react (icon
cru como string; resólvese na capa react). Pertenza dual (unión de
`GroupDef.nodeIds` + `node.group`, sen duplicados, orde estable), nodos
sen grupo nun «Sen grupo» sintético ao final (a vista nunca oculta
contido), labels localizadas e rotación determinista de paleta para
grupos sen cor. A fixture adversarial gaña `groups` coa pertenza dual
mesturada (mellora de paso).
