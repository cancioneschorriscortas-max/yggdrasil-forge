---
'@yggdrasil-forge/editor-react': patch
---

fix(editor): LocalizedTextWidget editaba `en`, o canvas amosaba `gl` — cambios invisibles en nodos novos

**Reportado polo dono**: renomear un nodo creado coa tool Engadir nodo
(7.11) "non se cambiaba" no canvas, aínda que o Inspector amosaba
correctamente o novo nome ao reseleccionar o nodo.

**Causa raíz**: `LocalizedTextWidget.pickEditableString` priorizaba a
clave `en` ao editar un `LocalizedString` con varias locales. Pero o
canvas (`SkillTree` → `computeLayout`) usa `locale='gl'` por defecto
cando o consumidor non especifica ningunha — e `EditorCanvas` non o
fai. Un nodo novo (`buildNewNode`, 7.11) nace con
`{ gl: 'Novo nodo', en: 'New node' }`: editar no Inspector actualizaba
`en`, pero o canvas seguía a renderizar `gl` (inalterado) — o cambio
era invisible. Nodos importados adoitan ter só UNHA locale, por iso o
bug non se detectara antes: 7.10/7.11 (Novo + crear nodos) foron os
primeiros en abrir a ruta de nodos con AMBAS claves presentes desde o
nacemento.

**Fix**: `pickEditableString` prioriza `gl` (a locale que realmente se
renderiza por defecto), aliñado co patrón `pickText` xa usado en
`InspectorPanel`/`TreeInspector` e con `resolveLocalized`'s propio
default.

**Tests**: dous tests existentes que codificaban a asunción vella
(`en`) actualizados; novo test de regresión explícito que reproduce o
escenario exacto reportado (nodo con `{gl, en}`, editar, confirmar que
a clave `gl` — a visible — leva o valor novo).
