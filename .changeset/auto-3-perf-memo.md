---
'@yggdrasil-forge/react': patch
---

perf(react): SkillNode/SkillEdge memoizados + listas de elementos memoizadas

A 1500 nodos (4500 arestas) cada interacción reconciliaba os 6.000
fillos do SkillTree: drag ~1,7 s, pan ~24 fps. Agora `SkillNode` e
`SkillEdge` son `memo` (mesmo nome, mesmos props), as listas de
elementos van en `useMemo`, e `buildPaths` (con `curve`) aplícase unha
vez por layout en vez de por render. Medido na mesma máquina: drag
~0,6 s (−64 %), pan ~41 fps, selección −27 %. Sen cambio de API.
