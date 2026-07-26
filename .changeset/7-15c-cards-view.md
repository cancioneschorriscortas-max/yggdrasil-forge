---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): vista de tarxetas no canvas — toggle `grafo | tarxetas` (7.15c)

O editor conecta a ClusterCardsView de @react como segunda forma de ver
a MESMA árbore ("Same Data, Different Views"), nos DOUS modos:

- Toggle segmentado na esquina do canvas; o estado vive en EditorShell
  e chega polo ShellRuntimeContext (lección 7.14-A).
- Autoría: badges 0/N; clic en fila → SelectionEngine → o Inspector
  funciona normal. Proba: tiers vivos da sesión (badges 2/3, ✓);
  desbloquear desde a ficha actualiza a tarxeta en vivo.
- `GroupDef.position` → posición da tarxeta (% via coordinateBounds);
  sen posición, anel automático. Iconas resoltas contra o registry.
- En tarxetas non hai mover/conectar/marquee (tools de creación
  desactivadas, tooltip explícao); Supr borra a selección coa cascada
  de sempre; a coroa central leva a identidade da árbore.
