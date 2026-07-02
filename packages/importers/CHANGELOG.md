# @yggdrasil-forge/importers

## 0.2.1

### Patch Changes

- Updated dependencies [27b9f61]
- Updated dependencies [8597e50]
- Updated dependencies [99d0d44]
- Updated dependencies [5f41960]
  - @yggdrasil-forge/core@0.5.0

## 0.2.0

### Minor Changes

- fcaf726: F9.4: import xenérico (`importTree` + identity import JSON/YAML) e export `TreeDef` → JSON/YAML. Inclúe `checkCanonicalCoherence` (helper opt-in da F9.2). Pecha a Fase 9. Aditivo, sen breaking changes.
- cc8584c: feat(gaia): xerar stats de competencia (F9.5). O importador declara TreeDef.stats en dúas capas — por skill canónica (`skill:<id>`, conta) e por categoría (`cat:<categoria>`, ponderada por peso) — e engade statContributions a cada microskill. Conecta a dimensión de competencia ao StatComputer/useStat existentes. Cero cambios en @core. Pecha F9.5.

### Patch Changes

- cd0ac48: fix(gaia): preservar as skills canónicas enteiras (label, categoria, icono), non só o peso. Antes `metadata.gaia.canonicalWeights` aplanaba a {id: peso} e perdía categoria/label/icono; engádese `metadata.gaia.canonicalSkills` cos obxectos completos. Aditivo (canonicalWeights mantense). Pecha F9 sen perda.
- Updated dependencies [af88cf8]
- Updated dependencies [c275965]
- Updated dependencies [997e783]
- Updated dependencies [77864f5]
- Updated dependencies [b149ee9]
- Updated dependencies [3164597]
- Updated dependencies [10a995b]
- Updated dependencies [169049f]
- Updated dependencies [942cff7]
- Updated dependencies [8523a05]
- Updated dependencies [582bd89]
- Updated dependencies [0a8900d]
  - @yggdrasil-forge/core@0.4.0
  - @yggdrasil-forge/common@0.4.0

## 0.1.0

### Minor Changes

- [`2bf74cb`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2bf74cb769d3fa2f09944f71b9357e8bcc5efd57) - feat(importers): map GAIA microskills to nodes (type, group, position, maxTier, content.flavor, prerequisites from conectadas) + dependency edges; full panadeiro fixture round-trip (F9.3.b)

### Patch Changes

- Updated dependencies [[`4a85088`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/4a8508855c79001dfdd68ca767fe329aebe718aa)]:
  - @yggdrasil-forge/core@0.3.0

## 0.0.1

### Patch Changes

- Updated dependencies [[`155881b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/155881b013f8672d114b73c622e31c712f048f63), [`410dcb6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/410dcb66208d14ef9024137e57bb3d4a4442295e), [`1bb3902`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1bb3902c0a295af91f74f0cb13ebb7c1854bb999), [`36cd1f0`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/36cd1f0cf394877d4e5e60a637cefbb92c4215dd)]:
  - @yggdrasil-forge/core@0.2.0
