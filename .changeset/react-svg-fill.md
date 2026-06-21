---
"@yggdrasil-forge/react": patch
---

fix(react): o `<svg>` do skill-tree enche o seu contedor por defecto (display:block, width:100%, height:100%). Antes renderizaba ao tamaño intrínseco do viewBox, producindo unha "banda morta" en contedores dimensionados a non ser que o consumidor engadise CSS extra. O fix é aditivo e sobreescribíbel polo tema (background) e por estilos do consumidor.
