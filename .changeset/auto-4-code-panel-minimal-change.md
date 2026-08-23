---
'@yggdrasil-forge/editor-react': patch
---

perf(editor-react): o panel Código sincroniza só o tramo que cambiou

Cada commit do motor substituía o documento ENTEIRO en CodeMirror, que
reconstruía o DOM de tódalas liñas e reparseaba o JSON completo — a
1500 nodos, máis da metade do custo dun drag (perfil CDP). Agora
calcúlase o cambio mínimo (prefixo/sufixo comúns) e despáchase só ese
rango: traballo proporcional ao cambio, non ao documento. Mesmo
comportamento visible; o modo borrador e a anotación de cambio externo
non varían.
