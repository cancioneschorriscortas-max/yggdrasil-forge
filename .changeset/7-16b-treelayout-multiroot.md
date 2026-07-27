---
'@yggdrasil-forge/core': patch
---

fix(core): TreeLayout — separación de múltiples roots en slots lóxicos (7.16b)

O paso de shift de múltiples roots sumaba `nodeSpacing * 2` (píxeles)
sobre coordenadas LÓXICAS que o paso seguinte multiplica por
`nodeSpacing` outra vez → cada root desprazábase nodeSpacing² × 2 px
(~16.200 co default do editor) en vez de 2 slots. Árbores con varios
roots — moi comúns nas xeradas por IA — saían quilométricas (repro:
gaia-cards con `--algo tree` daba maxX≈81.000; agora 948). A
separación correcta é `+ 2` slots. Tests de regresión con MAGNITUDE
asertada (os previos só comprobaban a orde, por iso o bug sobreviviu).
