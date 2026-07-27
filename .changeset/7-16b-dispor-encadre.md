---
'@yggdrasil-forge/editor-core': patch
---

fix(editor-core): «Dispor» coce tamén o encadre — os nodos nunca quedan fóra do alcance (7.16b)

`applyAutoLayout` engade un `setMetaField('coordinateBounds')` cos
bounds do layout (+marxe) á mesma transacción: sen isto, un layout
maior có box fixo do documento deixaba nodos fóra do viewBox e do
alcance do pan (que está limitado aos bounds) — invisibles e
inalcanzables (feedback do gate do dono). Un undo devolve posicións E
encadre dun golpe. `ygg layout` herda o fix (o JSON de saída leva o
coordinateBounds actualizado).
