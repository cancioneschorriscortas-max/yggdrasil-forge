# LEGADO DO 5º ARQUITECTO — Yggdrasil Forge

> Documento de relevo. Léeo enteiro antes de tocar nada. Vai en `docs/architecture/`.

## 0. Quen es e como se traballa (protocolo)

Es o **Director / Arquitecto**. O dono é **Agarfal**: non programador, criterio visual extraordinario (pilla bugs que pasan typecheck + tests só mirando a app), terso (galego + castelán), sign-off visual final.

- **Director → Executor:** o Director investiga → escribe **briefing** (ficheiros en `/mnt/user-data/outputs/`) → o **Executor** (chat aparte) implementa como **patch** (`git format-patch -1 HEAD`) → Agarfal aplica con `git am --keep-cr` e **empuxa el dende a súa consola** → o Director **verifica en CLONE FRESCO**. **Claude NUNCA toca origin.**
- **Docs (markdown/SVG):** commíteos **Agarfal directo** (sen Executor). O Director produce o contido en `/mnt/user-data/outputs/`.
- **Patrón clave de Agarfal:** *"monta o contido para que o lea ANTES do briefing"* / *"non empeces a deseñar sen que estemos a pensar no mesmo"*. As decisións visuais ofrécenselle como opcións (usa `ask_user_input`); valida el.
- Antes de tocar `@core`/`@react`: sempre briefing + luz verde. Exemplos (paquetes privados) tamén van por Executor se tocan TS.

## 1. Estado actual (esta sesión)

**HEAD de código = `11c9f84`.** Aterrado e verificado esta sesión:

- **`maxLabelChars`** — token opt-in de tema (truncado de etiqueta + `<title>` hover; `aria-label` completo; default off = byte-idéntico) + docs "Labels — denso vs amplo" no README de `@react` (`cdb54f3`).
- **Exemplo `examples/learn-yggdrasil`** — curso aniñado pulido (drill-in, HUD, breadcrumb, barra de selección con progreso + "por que bloqueado", tema académico). Commit `34a66c4` + fix do primeiro-clic `3061e28`.
- **Erro de layout visible en DEV** — banner no `SVGRenderer` co código + mensaxe (prod silencioso). Commit `6113f40` + fix da detección DEV (`11c9f84`).
- **Walkthrough do `curriculum`** (en + es + `curriculum-nesting.svg`) — **PRODUCIDO** (fontes en `/mnt/user-data/outputs/`). Agarfal colocou os ficheiros en `docs/guide/` e `docs/guide/img/` pero **ao escribir isto NON están en origin** (HEAD segue `11c9f84`) → **confirmar o push**.

Exemplos no repo: `react-demo`, `node-basics`, `curriculum`, `learn-yggdrasil`.

## 2. Leccións críticas de verificación (MANTER ESTA DISCIPLINA)

Regra unificada: **verifica datos + layout + fluxo + bundle de entorno. O typecheck e os tests NON abondan.** Tres casos consecutivos onde o briefing pasou typecheck/lint/test/build e fallou no runtime:

1. **typecheck ≠ render** (o `radius`): `LayoutConfig` tipa, pero `RadialLayoutConfig` esixe `radius > 0` en runtime → SVG baleiro silencioso. → correr `computeLayout(def, registry).ok`, non só validar tipos.
2. **tests ≠ fluxo** (`unlock`/`'unlockable'`): un nodo nunca tocado dá `getNodeState() === null` → estado `'locked'`, **non** `'unlockable'`; condicionar o unlock a `'unlockable'` rompe o primeiro clic. Tests verdes porque non probaban o fluxo. **Estándar adoptado:** toda briefing que cree/toque un exemplo leva unha **"sonda de fluxo runnable"** (3-5 chamadas que simulen a UI, con asertos no estado intermedio), e a verificación post-aterraxe **córrea**. Guard correcto: `st !== 'unlocked' && st !== 'maxed'`.
3. **tests ≠ bundle** (detección DEV): o acceso dinámico `globalThis.process` **non** o substitúen os bundlers e é `undefined` no navegador → o banner non aparecía en dev (só nos tests, que corren en Node) e viaxaba no bundle de prod. **Para código gated por entorno** (`process.env.NODE_ENV`/`import.meta.env`): **verifica o BUNDLE real en prod E dev** (`NODE_ENV=production` e `NODE_ENV=development` + `vite build`, grep do `dist`), non os tests. Forma correcta: texto **estático** `process.env.NODE_ENV !== 'production'` + `declare const process` ambiente de módulo (sen `@types/node`), **sen** garda `typeof process` (rompería en vite).

## 3. Patróns de verificación (recetas)

- **Clone fresco:** `cd /home/claude; rm -rf X; git clone --depth 1 <repo> X`.
- **Tests `@core`/`@react`:** `corepack enable; corepack pnpm install`; **compila `@common` antes** (`corepack pnpm --filter @yggdrasil-forge/common run build`) senón vite non resolve o paquete.
- **Sonda runnable:** test en `packages/core/__tests__/engine/__verify_*.test.ts` importando de `../../src/engine/index.js` e `../../src/types/index.js`; correr con `corepack pnpm --filter @yggdrasil-forge/core exec vitest run <path>`.
- **Registry de layout:** `new LayoutEngineRegistry().register(new IdentityLayout()).register(new RadialLayout()).register(new TreeLayout()).register(new ClusteredRadialLayout())`; `computeLayout(def, registry)` → `Result` con `.value.nodes` (Map id→{x,y}); `registry.find(type)` (non `.get`).
- **Código gated por entorno:** `corepack pnpm turbo run build --filter=<exemplo> --force`; logo `cd <exemplo>; NODE_ENV=production corepack pnpm exec vite build` e `NODE_ENV=development …`; `grep -oc '<string>' dist/assets/*.js`.
- **NUNCA heredocs para `.ts`** (usar `create_file`). Scripts efímeros fóra do repo.
- Gate: `pnpm lint:fix → format → lint → format:check`; `turbo run typecheck --force`; `turbo run test --force`.

## 4. Backlog (priorizado)

1. **`learn-yggdrasil` walkthrough (en + es) + diagramas — A PEZA SEGUINTE.** Plan acordado con Agarfal: **dous walkthroughs separados** (curriculum [feito] + learn-yggdrasil), diagramas **claro/académico**, **en + es**. Diagramas a producir: (a) **drill-in consumidor-side** (pai → `enterSubtree` → `TreeEngine` fillo → mesmo `<SkillTree>` + pila/breadcrumb) — a mensaxe de adopción; (b) **a casca pulida** (HUD / progreso por módulo / why-locked / afordancia botón+dobre-clic); (c) opcional modelo de datos. **Ancorar no App REAL** (`examples/learn-yggdrasil/src/App.tsx`: clases `ly-shell`/`ly-hud`/`ly-crumb`/`ly-select`/`ly-open-button`; helper `subtreeProgress`; `explainUnlock` para condicións ✓/✗; clic single=selecciona / double=abre por timing 300ms; `enterSubtree`). **Molde** = `curriculum-walkthrough.{en,es}.md` (en `/mnt/user-data/outputs/`). Vende: **drill-in 100% consumidor-side (cero cambios en `@react`)**.
2. **READMEs por exemplo** (`curriculum`, `learn-yggdrasil`) apuntando aos walkthroughs.
3. **Rescatar `examples/curriculum/src/README.md`** — apareceu como **untracked** na consola de Agarfal (escrito, nunca commiteado).
4. **Bancados previos:** solver de auto-layout (`docs/architecture/ARQUITECTURA_auto-layout-system.md`, untracked); `node.color` modulable por estado (A.6.17, Pacto Escuro); F12 vides curvas; multi-tema do "Fondo do lenzo" no Theme Lab; 3 ficheiros profundos de cobertura; OIDC Trusted Publisher (E404 en NPM_TOKEN); Capa 1A LOGIC_ICONS (`tools/icon-preview/logic.ts`, untracked); Layout pass L (HUD/Inspector/Theme-modal, magnitude L).

## 5. Datos útiles

- Stack: pnpm 11.0.9, Turborepo, Biome 1.9.4, Vitest, TS estrito (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 19, Vite. `@yggdrasil-forge` npm scope.
- API de aniñamento (pública, verificada): `new TreeEngine(def)`, `unlock(id): Promise<Result>`, `canUnlock(id): Result<UnlockCheck{allowed, reason?}>`, `explainUnlock(id): Result<UnlockExplanation{satisfied, conditions[]}>` (útil para UI), `enterSubtree(id): Result<TreeEngine>`, `getSubtreeEngine(id): TreeEngine|null` (null antes de entrar), `getSnapshot().subtreeStates[id]` (TreeState fillo sincronizado), `getTreeDef().subtrees[id]`, `getNodeState(id): NodeInstance|null`. `subtree_completion` en escala **0–100**.
- Tema do learn-yggdrasil: académico (papel `#faf8f2`, ink `#1f2933`, teal `#2c6e8f`, sepia `#9a6b3f`) + `maxLabelChars: 14`. Portas ao **80%** (o curriculum usa **100%**).
- `/mnt/user-data/outputs/` contén os fontes desta sesión: `BRIEFING_*`, `CONTENT_curriculum-pro.md`, `react-README.md`, `curriculum-walkthrough.{en,es}.md`, `curriculum-nesting.svg`, `BRIEFING_layout-error-dev-detection-fix.md`.
- Transcript desta sesión arquivado; ver `journal.txt` en `/mnt/transcripts/`.
