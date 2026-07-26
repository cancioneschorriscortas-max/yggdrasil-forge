---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): panel «Código» — o JSON en vivo, con cores que explican (7.15b)

Nova pestana «Código» no grupo do Inspector (só Autoría): o documento
serializado actualízase en vivo con cada commit do motor (debounce
~150ms). Ao teclear ou pegar entra en modo borrador (a sync pausa,
nada pisa o texto) cun banner Validar · Aplicar · Descartar:

- **Validar** corre `deserializeDocument` (o mesmo camiño que o
  import); erros de sintaxe con marca na liña, semánticos en lista.
- **Aplicar** (só co texto validado) substitúe o documento enteiro
  como UN paso de undo e limpa a selección.
- Se o documento cambia por debaixo durante o borrador, avísase.

Cores por tokens novos nos DOUS temas: sintaxe (`--editor-code-*`) e
franxas de sección no gutter + lenda (`--editor-code-sec-*`:
identidade/nodos/arestas/recursos/editor). CodeMirror 6 queda contido
nun único ficheiro (CodeEditor.tsx), como dockview en PanelHost.
Documentos >2MB dexeneran honestamente a actualización baixo demanda.
