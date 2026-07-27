---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
'@yggdrasil-forge/cli': minor
---

feat: «Capas (para DAGs)» en Dispor + axuda por algoritmo + ygg layout --algo layered

`layered` únese á vía do dato completa: `AutoLayoutAlgo` e config por
defecto (90/130, espello de tree) en editor-core; entrada no menú
Dispor e no convite en editor-react, agora cunha liña de axuda por
algoritmo (cada un di a súa condición de uso); `--algo layered` no CLI.
O panadeiro da galería queda recolocado con layered como canónico do
caso multi-pai. O schema publicado xa admitía `layered` (layout.type é
aberto por deseño): sen drift.
