---
'@yggdrasil-forge/editor-core': minor
---

feat(editor-core): comando `replaceDocument` (7.15b)

Novo comando que substitúe `tree` E `meta` dun golpe nunha soa
transacción: **un undo devolve o documento anterior enteiro**. É a
base do «Aplicar» do panel Código (pegar JSON dunha IA e convertelo
en árbore como un único paso de historial). A selección debe limpala
o chamador tras aplicar (os ids poden non existir no doc novo).
