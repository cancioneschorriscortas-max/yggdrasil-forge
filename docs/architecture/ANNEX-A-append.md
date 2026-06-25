# Annex A — entradas a anexar (sesión maxLabelChars / learn-yggdrasil / erro-layout-DEV)

> Anexar a `docs/architecture/MASTER.md` (Annex A). Os números A.6.31–A.6.34 son **suxeridos**: comproba o último número real en Annex A e renumera se fai falta.

### A.6.31 — `maxLabelChars`: token opt-in (mecanismo vs política)
`theme.sizes.maxLabelChars?: number` (default `undefined` = apagado). Cando se define (>0) e a etiqueta supera ese largo, o `SkillNode` mostra `slice(0,N).trimEnd()+'…'` e engade un `<title>` SVG co texto completo (tooltip hover); o `aria-label` conserva o completo. Con token apagado a saída é **byte-idéntica**. Principio: a **librería dá o mecanismo** (truncado opcional + detalles ao interactuar), o **consumidor elixe a política** (denso vs amplo). Documentado en `packages/react/README.md` (sección "Labels").

### A.6.32 — Aniñamento / drill-in é **consumidor-side**
`enterSubtree(subtreeId)` devolve un `TreeEngine` fillo que se renderiza co **mesmo `<SkillTree>`**; unha pila de engines + breadcrumb dan a navegación. **O motor non precisa cambios** para un drill-in pulido. Para a UI: `explainUnlock(id)` (público) devolve `UnlockExplanation{satisfied, conditions[]}` ("necesitas A, B e C"); o progreso por subárbore derívase de `getSnapshot().subtreeStates[id]` (conta unlocked/maxed) ÷ `getTreeDef().subtrees[id].nodes.length`. `getSubtreeEngine(id)` é `null` antes de entrar. Demostrado no exemplo `learn-yggdrasil`.

### A.6.33 — Lección "tests ≠ fluxo" + estándar da sonda runnable
Un nodo nunca tocado dá `getNodeState() === null` → estado inicial `'locked'`, **non** `'unlockable'`; condicionar o `unlock` a `'unlockable'` rompe o primeiro clic (pasa typecheck e todos os tests). Guard correcto: `st !== 'unlocked' && st !== 'maxed'`. **Estándar:** toda briefing que cree/toque un exemplo inclúe unha **sonda de fluxo runnable** (3–5 chamadas que simulan a UI, con asertos no estado intermedio), e a verificación post-aterraxe córrea. (Continúa o patrón de A.6.9/radius.)

### A.6.34 — Erro de layout visible en DEV + lección "tests ≠ bundle"
`SkillTree`/`SVGRenderer`: cando `computeLayout` falla, en **DEV** renderízase un banner co código + mensaxe do erro; en **produción**, saída idéntica á previa (svg baleiro, silencioso). Detección DEV co **texto estático** `process.env.NODE_ENV !== 'production'` (que os bundlers substitúen) + `declare const process` ambiente de módulo (sen `@types/node`); **NON** `globalThis.process` dinámico (non o substitúen os bundlers, é `undefined` no navegador → o banner non aparecería en dev e viaxaría en prod). **Lección:** para código gated por entorno, verifícase o **bundle real en prod E dev**, non os tests (estes corren en Node, onde `process` existe). Engadiuse o prop opcional `SVGRenderer.errorMessage`.
