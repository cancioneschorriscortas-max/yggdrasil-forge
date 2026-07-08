---
'@yggdrasil-forge/editor-react': minor
'@yggdrasil-forge/editor-core': patch
---

feat(editor): Gardar / Abrir — o editor pasa de demo a ferramenta (briefing 7.10)

**`@yggdrasil-forge/editor-react`** — `EditorShell` gaña prop opcional
`documentActions?: { onNew?, onImport?, onExport? }`. Se se pasa (con
polo menos unha entrada), o TopBar renderiza un dropdown "Ficheiro"
(mesmo compoñente/estilo que "Paneis", colocado antes del) con **Novo**
· **Importar JSON…** · **Exportar JSON**. Cada entrada chama o seu
callback e pecha o menú; entradas ausentes non se renderizan. A
biblioteca non fai I/O nin toca o DOM global — só UI + callbacks (mesma
fronteira que co tema e o layout).

**`examples/editor`** — `main.tsx` reestruturado: o motor xa non se
crea a nivel de módulo, vive en estado de React. Substituír o
documento (Novo/Importar) crea un `EditorEngine` novo e remonta o
`EditorShell` (`key={docEpoch}`), para que selección/undo/sesión de
proba nazan limpos; a disposición de paneis non se perde (persiste en
localStorage por 7.7, independente do motor). Exportar usa `toJson` +
`Blob` + `<a download>`; Importar le un ficheiro local con
`FileReader` + `deserializeDocument`, con confirmación antes de
substituír e mensaxe clara se o JSON é inválido (documento actual
queda intacto). Sen backend, sen localStorage do documento (é dato do
usuario, non do navegador).

**`@yggdrasil-forge/editor-core`** — novo test headless
(`emptyDocumentProbe.test.ts`, probe A.6.42 esixido polo briefing
antes de tocar UI): confirma que unha árbore baleira (`nodes: []`,
`edges: []`) inicializa `EditorEngine` sen errors duros, fai
round-trip completo (incluíndo variante con `theme`+`costPerTier`+
`resources` xuntos, gap non cuberto por tests existentes), e que JSON
inválido/incompleto devolve `Result.err` con mensaxe. Sen cambios de
API — só test novo.
