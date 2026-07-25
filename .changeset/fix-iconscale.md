---
'@yggdrasil-forge/editor-react': patch
'@yggdrasil-forge/react': patch
---

fix(editor): adendo iconScale — undo limpo + clipPath por instancia

- **`@yggdrasil-forge/editor-react`** (`RangeWidget`): o slider commitea
  o valor unha soa vez ao rematar o xesto (pointerup / keyup / blur), non
  en cada `onChange`. Arrastrar a barra deixaba decenas de entradas no
  historial; agora respéctase «un xesto do usuario = UN undo». O valor
  segue actualizándose en vivo na UI. Test actualizado ao novo contrato.
- **`@yggdrasil-forge/react`** (`SkillNode`): o `id` do `clipPath` da
  icona-imaxe pasa a ser único por instancia (`useId`, mesmo precedente
  que o `SVGRenderer`) e sanéase o `node.id` (só `[A-Za-z0-9_-]`). Evita
  colisións de id DOM cando hai varios `SkillTree` na mesma páxina co
  mesmo `node.id`, e a rotura de `url(#…)` con ids que teñan espazos,
  comiñas ou unicode.
- Decisión 3 (anel do 10% con `iconScale === 1`): resólvese como
  intencionado (opción A) — só aclaración na redacción; sen cambio de
  comportamento.
