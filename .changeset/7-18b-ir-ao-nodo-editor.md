---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): «Ir ao nodo» — Estrutura e Problemas navegables

Clic nun nodo do panel Estrutura → selecciónao E centra a vista nel;
clic nunha fila de Problemas (que xa seleccionaba) agora tamén centra —
atopar o nodo problemático nunha árbore grande deixa de ser buscalo á
man. Vehículo: o EditorCanvas rexistra un navegador (que delega en
`SkillTreeHandle.centerOn`) no ShellRuntimeContext; en vista tarxetas
non hai viewport de grafo e a navegación é un no-op sen erro.
