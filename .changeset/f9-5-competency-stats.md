---
"@yggdrasil-forge/importers": minor
---

feat(gaia): xerar stats de competencia (F9.5). O importador declara TreeDef.stats en dúas capas — por skill canónica (`skill:<id>`, conta) e por categoría (`cat:<categoria>`, ponderada por peso) — e engade statContributions a cada microskill. Conecta a dimensión de competencia ao StatComputer/useStat existentes. Cero cambios en @core. Pecha F9.5.
