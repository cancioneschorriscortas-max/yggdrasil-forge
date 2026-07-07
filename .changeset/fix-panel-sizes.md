---
'@yggdrasil-forge/editor-react': patch
---

**7.7b — As ventás á vontade do usuario (fix de defecto + tamaños)**

Dous fixes complementarios sobre 7.7:

- **Proporcións por defecto sas**: `buildDefaultLayout` aplica agora
  tamaños tras crear os paneis: 240 px para Estrutura (esquerda),
  340 px para o grupo dereito (Inspector | Tema), 180 px para
  Problemas (inferior). Canvas queda co resto. Antes non se
  especificaba nada e dockview repartía a partes iguais, deixando o
  panel dereito ~45 % da pantalla.
- **Cinto de seguridade no beforeunload**: os cambios de tamaño ao
  arrastrar sashes disparan `onDidLayoutChange` de forma pouco fiable
  na versión 6.6.1 de dockview. Engádese listener global de
  `beforeunload` que flushea sincronamente o último `toJSON()` sen
  agardar o debounce (300 ms). Con isto, o F5 ou pechar leva sempre
  a última foto do layout, sexa cal sexa a fonte do cambio. O timer
  do debounce pendente cancélase para non duplicar. O filtrado por
  modo do `EditorShell` séguelle aplicando (o callback é o mesmo).

Zero cambios en API pública. O `PanelHost` segue como único
importador de dockview.
