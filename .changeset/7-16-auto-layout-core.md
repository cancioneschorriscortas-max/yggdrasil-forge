---
'@yggdrasil-forge/editor-core': minor
---

feat(editor-core): `applyAutoLayout` — dispor headless (7.16)

Executa un motor de layout de @core (radial / tree / clustered-radial /
constellation) UNHA vez e devolve os comandos `moveNode` que cocen as
posicións en `node.position` (decisión de deseño: cocer, non vivir).
Configs por defecto derivadas do dato en `defaultLayoutConfigs`
(`radius`/`groupRadius` calculados SEMPRE — lección A.6.9). Determinista;
`err` propaga o erro do motor. A sonda A.6.9 queda como test permanente
(4 algos × 3 árbores da galería → ok).
