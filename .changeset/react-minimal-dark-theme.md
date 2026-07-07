---
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-react': minor
---

feat(react,editor): base de tema `minimalDark` + arranxo de raíz da costura chrome↔documento (briefing 7.9)

**Contexto:** o tema `minimal` (base por defecto cando o documento non
opina) asume fondo claro en TODAS as súas cores. O editor agora pode
poñer fondo escuro (7.8) — cada cor fixa de `minimal` era un bug
latente en escuro, xa detectado dúas veces (texto en 7.8.1/7.8.2,
arestas/malla pendentes segundo o informe de sesión).

**`@yggdrasil-forge/react`** — novo tema `minimalDark`, exportado
xunto a `minimal`. Mesma forma (`Theme`), `sizes` idénticos a
propósito (non hai motivo para que radios/font-sizes cambien só por
mudar de fondo). Cores de estado (`nodeMaxed`, `nodeInProgress`)
comparten valor con `minimal` — xa funcionan en ambos fondos; o resto
(`text`, `nodeStroke`, `edge`, `edgeActive`, `mesh`, `nodeFill`,
`nodeLocked`, `nodeUnlockable`) ten valores propios para fondo escuro.

**`@yggdrasil-forge/editor-react`** — `EditorCanvas` xa non aplica
unha heurística ad-hoc só para o campo `text` (a que se engadira en
7.8.1/7.8.2). Agora escolle a BASE ENTEIRA do tema segundo
`chromeTheme`: `minimalDark` en escuro, `minimal` en claro/sen
definir. Arestas, malla, trazos e recheo base tamén len ben en escuro
agora, non só o texto. Os overrides explícitos do documento
(`ThemeSpec.textColor`, `nodeFills`) seguen gañando sempre sobre a
base escollida — comportamento visible idéntico ao anterior para
quen xa usaba `textColor`.

Verificado que é o único punto de construción de tema en todo
`editor-react` (ningunha outra rama usaba `minimal` a pelo). Tests
adaptados (non borrados) para cubrir o mesmo contrato: base correcta
segundo chrome, override do documento gaña, arestas confirman que o
arranxo é da base enteira e non un parche de campo.
