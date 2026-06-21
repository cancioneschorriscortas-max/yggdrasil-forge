---
"@yggdrasil-forge/importers": patch
---

fix(gaia): preservar as skills canónicas enteiras (label, categoria, icono), non só o peso. Antes `metadata.gaia.canonicalWeights` aplanaba a {id: peso} e perdía categoria/label/icono; engádese `metadata.gaia.canonicalSkills` cos obxectos completos. Aditivo (canonicalWeights mantense). Pecha F9 sen perda.
