---
'@yggdrasil-forge/react': patch
---

fix(react): `fit on mount` disparaba en cada cambio de `bounds`, non só ao montar

**Reportado polo dono**: engadir nodos co editor producía un "zoom
raro" — a vista reencadraba a cada nodo novo, e calquera pan/zoom
manual perdíase.

**Causa raíz**: o efecto "fit on mount" en `useViewport` tiña deps
`[bounds, fitOnMount]`, así que se re-disparaba cada vez que `bounds`
cambiaba de referencia — non só ao montar, coma o seu propio nome e
comentario prometían. En consumidores sen `coordinateBounds` explícito
(onde `bounds` = layout bounds, recalculados en cada edición
estrutural), iso resetaba o pan/zoom interactivo a cada cambio.

**Fix**: `hasFittedRef` garante que `fit()` se chama COMO MOITO unha
vez na vida do hook. Se `bounds` non está dispoñible aínda no primeiro
render, o efecto agarda a transición inicial undefined→definido (as
deps seguen a incluír `bounds` para iso), pero unha vez fitted (con
éxito OU por bounds dexenerados), nunca máis volve chamar `fit()`.
Para reencadrar baixo demanda, o contrato xa existía:
`SkillTreeHandle.fit()`.

**Garda engadida — bounds dexenerados**: unha árbore baleira produce
bounds `{minX:0,minY:0,maxX:0,maxY:0}` (largo/alto 0). A garda
existente en `fitTransform` só detecta isto cando `padding=0`; no uso
real (`effectivePadding = padding + maxRadius + 28`, sempre > 0), esa
garda NUNCA se activaba. Engadida unha garda adicional no propio
efecto (antes de padding) que salta o fit por completo se
`bounds` é dexenerado, deixando o viewport por defecto (identidade)
en vez de encadrar un box de tamaño cero (zoom extremo).

**Tests**: 4 tests novos — cambiar `bounds` tras montar non volve
agendar `requestAnimationFrame`; bounds dexenerados ao montar non
agendan fit; state queda en identidade con bounds dexenerados; `fit()`
manual segue funcionando. 29 tests existentes (incluíndo os de
`fitTransform`) pasan sen cambios.
