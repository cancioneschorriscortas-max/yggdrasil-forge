---
'@yggdrasil-forge/editor-core': patch
---

fix(editor-core): blindar deserializeDocument contra docs que crashean

`deserializeDocument` corre agora tamén os tres validadores DUROS
(structural / uniqueIds / referentialIntegrity) sobre o documento
parseado e devolve `err` con mensaxe clara se algún falla. O schema Zod
non pillaba ids de nodo/aresta DUPLICADOS; sen esta garda, un doc así
cargábase e o `new TreeEngine(doc.tree)` do canvas lanzaba ao
renderizar, tumbando a UI e perdendo o documento. Contrato reforzado:
se devolve `ok`, o documento é cargable.
