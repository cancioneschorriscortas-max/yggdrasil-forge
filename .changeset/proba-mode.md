---
'@yggdrasil-forge/editor-react': minor
---

**7.6 — Modo Proba (o toggle deixa de mentir)**

O toggle Autoría/Proba pasa a **gobernar** a experiencia, non só cambiar
a cor da barra. Entrar en Proba crea unha **sesión de xogo real** sobre
a árbore actual (novo `TreeEngine`) que permite desbloquear nodos,
gastar recursos e ver estados en acción **sen tocar o documento**. Saír
descártaa; volver entrar dá unha nova sesión fresca.

- Novo hook `useProbaSession(engine, mode)` — devolve un `TreeEngine`
  fresco cando `mode === 'preview'`; `null` en Autoría. Ten `reset()`
  para descartar e recrear a sesión.
- Novo `ProbaPanel`: cabeceira con badge «en vivo», recursos con
  botóns `+` / `−` (via `grantResource`), ficha do nodo seleccionado
  con condicións (`explainUnlock`), custo do próximo rango con
  afordabilidade, botón «Desbloquear» / «Subir rango» gated por
  `canUnlock`, e «Reiniciar proba».
- `EditorCanvas` acepta `probaSession?`. Con sesión: SkillTree
  renderiza co runtime da sesión (estados vivos, temas locindo);
  drag/marquee desactivados; clic segue seleccionando para a ficha;
  pan/zoom intactos.
- `EditorShell` cambia os paneis por modo — en Proba só se ve «Proba»
  no grupo dereito; en Autoría, Inspector | Tema. `key={mode}` no
  PanelHost forza reset do layout de dockview.
- TopBar: toggle localizado («Autoría» / «Proba»); undo/redo do
  documento ocúltanse en Proba (o seu «undo» é «Reiniciar proba»).
- StatusBar: modo localizado.

Cero cambios en `@core` e `@editor-core`. O motor xa daba todo o
necesario (`canUnlock`, `explainUnlock`, `unlock`, `grantResource`,
`getBudget`, `getNodeState`).
