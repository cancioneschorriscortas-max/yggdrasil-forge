---
'@yggdrasil-forge/editor-react': minor
---

**7.7 — Estabilidade das ventás (as 4 dores do Cliente Zero)**

- **Menú «Paneis»** no TopBar (substitúe os presets Design/Tree/Testing
  disabled): dropdown propio con listaxe de paneis dispoñibles + marca
  ✓ para os visibles; clic alterna. Última entrada, separada:
  «Restaurar disposición». Peche por clic fóra ou Escape.
- **Cambio de modo conserva a disposición**: eliminado `key={mode}` do
  `PanelHost`; ao cambiar `panels` prop, faise reconciliación
  engadir-antes-de-quitar. Cando engade un panel novo con `withinPanel`
  que xa non existe, procura un panel vivo co mesmo `defaultLocation`
  como pivot — así Inspector/Tema aterran no mesmo grupo onde estaba
  Proba e viceversa. Alternar Autoría↔Proba non destrúe grupos, tamaños
  nin reordenacións do usuario.
- **Persistencia** por props na `EditorShell`:
  - `initialLayout?: SerializedDockview` — restaurada no `onReady`; se
    falla, invócase `onLayoutInvalid` (a app limpa o gardado) e cae ao
    default.
  - `onLayoutChange?: (layout) => void` — chamado debounced a 300 ms
    tras cada cambio. **Só en Autoría** (filtrado no shell). A biblioteca
    non toca localStorage — é decisión da app.
- **`examples/editor` cablea** localStorage con clave versionada
  `ygg-editor-layout@v1`. Se cambia o conxunto/ids de paneis, bump da
  versión → layouts vellos ignorados sen crash.
- **«Restaurar disposición»** reconstrúe o layout inicial (unha soa
  fonte de verdade en `buildDefaultLayout`) e sinala `onLayoutInvalid`
  á app para que limpe o gardado.
- **Bug latente arranxado**: o `PanelHost` fixaba os callbacks
  (`onLayoutChange`, `onVisiblePanelsChange`) no `onReady` inicial e
  nunca os actualizaba. Agora usa refs → invoca sempre a versión máis
  recente. Isto era necesario para que o filtrado por modo do
  `EditorShell` tivese efecto.

O `PanelHost` segue sendo o único importador de dockview (nova API
imperativa a `SerializedDockview` inclusive). Cero cambios en `@core`,
`@editor-core`.
