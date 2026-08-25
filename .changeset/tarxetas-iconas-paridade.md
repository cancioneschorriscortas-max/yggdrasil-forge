---
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-react': patch
---

Paridade de iconas nas tarxetas (17.2): `ClusterMember.icon` acepta `IconDef | string` co mesmo criterio có grafo (id → glyph, data-URI/URL → `<img>`, calquera outro → texto/emoji) — nunca descarte silencioso. O criterio de imaxe F11.3 extráese a un helper único compartido co SkillNode, e a derivación do editor pasa os strings sen rexistrar tal cal en vez de comelos.
