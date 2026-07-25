---
'@yggdrasil-forge/editor-react': patch
---

fix(editor-react): o canvas volve entrar en modo Proba (regresión 7.7/7.7c)

Desde 7.7 (eliminar `key={mode}`) + 7.7c (reconciliación de paneis), os
paneis de dockview non se remontan ao alternar Autoría↔Proba. Como o
panel `canvas` está en todos os modos, nunca se recreaba e conservaba
a `probaSession` obsoleta (null) do primeiro montaxe → o canvas non
reflectía a sesión (recheos non cambiaban, edición seguía activa) e
`reset()` non chegaba nin ao canvas nin ao ProbaPanel.

Arranxo: novo `ShellRuntimeContext` que provee a sesión (e o tema) en
vivo; os paneis leen do contexto en vez do closure. dockview-react
renderiza por portais, que preservan o contexto de React, así que o
valor actualízase sen recrear o panel (conservando os tamaños de 7.7c).
