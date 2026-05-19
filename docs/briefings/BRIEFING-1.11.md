# BRIEFING — SUB-FASE 1.11 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo (Sonnet 4.6).
> É autosuficiente: contén todo o necesario. Non preguntes "X ou Y?": todo está decidido aquí.

---

## 1. IDENTIFICACIÓN

Briefing para a **sub-fase 1.11** de Yggdrasil Forge.
Tipo: **consolidación / pago de débeda técnica** (non é unha feature nova).

> Nota do director: o roadmap do MASTER lista a 1.11 como "YggdrasilError +
> códigos + mensaxes localizadas". Iso XA se construíu na sub-fase 1.1
> (commit `1897fbf`, paquete `@yggdrasil-forge/common`). O roadmap estaba
> desincronizado co código. Esta rañura 1.11 reaprovéitase para consolidar
> dúas desviacións detectadas na revisión da 1.10. NON recrees YggdrasilError
> nin os ErrorCode: xa existen e funcionan.

---

## 2. CONTEXTO MÍNIMO (que é Yggdrasil Forge)

Motor de skill trees para web, monorepo pnpm + turbo. TypeScript strict.
Paquete `@yggdrasil-forge/common`: constantes, error codes, i18n.
Paquete `@yggdrasil-forge/core`: o motor (types + engine).
Estamos na Fase 1 (core types + engine + statestore). Aínda non hai TreeEngine.

---

## 3. ESTADO DO PROXECTO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `9ce26dd` (ResourceManager + DT-4).
- `pnpm test` → **314 tests pasan**, 20/20 tasks turbo. ✓
- `pnpm typecheck` → **20/20 exitoso**. ✓
- `pnpm lint` → **1 warning** (ver tarefa T1). ✗ ← isto hai que arranxalo.
- `ResourceManager` implementado e funcional, pero con 2 desviacións (T1, T2).
- `UnlockResolver` xa está ben localizado vía `unlockMessages.ts` (NON o toques).

Entorno do autor: **Windows + Git Bash**, path `C:\Users\tajes\proxectos\yggdrasil-forge`.
Node 22+, pnpm 11.0.9. Crear ficheiros con `python3` + `encoding='utf-8'`
(NUNCA heredoc de Git Bash: corrompe o contido). Edición parcial con `str_replace`.

---

## 4. OBXECTIVO DESTA SUB-FASE (unha frase)

Eliminar o warning de lint do `ResourceManager` e facer que as súas mensaxes de
error usen a infraestrutura localizada gl/es/en de `@yggdrasil-forge/common`,
engadindo o ErrorCode `INVALID_COST` que faltaba.

---

## 5. DECISIÓNS XA TOMADAS (non discutibles)

1. **Engádese `INVALID_COST = 'YGG_V006'`** ao enum `ErrorCode` en
   `packages/common/src/errors/codes.ts`. Familia `YGG_V` (Validation).
   Razón: reutilizar `INVALID_NODE_DEF` para un custo negativo é
   semánticamente incorrecto e contamina telemetría/logs.

2. **Engádese a mensaxe localizada de `INVALID_COST`** a
   `packages/common/src/errors/messages.ts` (gl/es/en).

3. **`ResourceManager` debe usar `getErrorMessage()`** de `@yggdrasil-forge/common`
   para construír as mensaxes dos seus `YggdrasilError`, en vez de strings
   hardcoded en inglés. O `UnlockResolver` xa fai o equivalente correcto
   (vía `unlockMessages.ts`); aquí seguimos o mesmo principio pero usando
   directamente `getErrorMessage` porque ResourceManager emite `YggdrasilError`
   (non `LocalizedString` de explain()).

4. **NON se toca `UnlockResolver` nin `unlockMessages.ts`**: xa están ben.

5. **NON se toca `TreeEngine`**: aínda non existe; é fase posterior.

6. **A locale por defecto para as mensaxes de YggdrasilError** é `'gl'`
   (FALLBACK_LOCALE do proxecto). `ResourceManager` aínda non recibe locale
   por construtor; pásaselle `'gl'` como argumento a `getErrorMessage` por
   agora. (Cando exista TreeEngine, este propagará a locale activa; iso é
   fase futura, NON o fagas agora.)

---

## 6. TAREFAS A EXECUTAR (numeradas, con criterio "feito")

### T1 — Eliminar o warning de lint (DT-5)

Ficheiro: `packages/core/src/engine/ResourceManager.ts`, liña ~46.
Hai unha concatenación de string que Biome marca como
`lint/style/useTemplate`. Convértea a template literal.

Esta liña vai DESAPARECER de todos modos en T3 (substituirémola por
`getErrorMessage`), pero faise igual primeiro para ter o repo limpo en cada
paso ("un cambio cada vez con verificación").

**Feito cando:** `pnpm lint` reporta 0 warnings e 0 errors.

### T2 — Engadir o ErrorCode INVALID_COST + mensaxe localizada

**T2.a** En `packages/common/src/errors/codes.ts`, dentro do bloque
`// Validation`, engade tras `PEDAGOGICAL_RULE_VIOLATED = 'YGG_V005',`:

```
  INVALID_COST = 'YGG_V006',
```

**T2.b** En `packages/common/src/errors/messages.ts`, engade unha entrada
nova no obxecto `ERROR_MESSAGES` (colócaa preto das outras `INVALID_*` /
familia `V`), co patrón exacto das demais:

```
  [ErrorCode.INVALID_COST]: {
    gl: 'Custo inválido: o importe debe ser non negativo (recibido {amount})',
    es: 'Coste inválido: el importe debe ser no negativo (recibido {amount})',
    en: 'Invalid cost: amount must be non-negative (got {amount})',
  },
```

(Respecta a orde de claves que Biome impón; corre `pnpm lint:fix` despois.)

**Feito cando:** `pnpm typecheck` segue 20/20 (o `Record<ErrorCode, ...>` de
`messages.ts` obriga a cubrir o novo código; se faltase, typecheck rompería).

### T3 — Localizar as mensaxes de error do ResourceManager

Ficheiro: `packages/core/src/engine/ResourceManager.ts`.

Hai exactamente **2** sitios que crean `new YggdrasilError(...)` con string
hardcoded:

1. Custo negativo / inválido →
   actualmente: `new YggdrasilError(ErrorCode.INVALID_NODE_DEF, 'Cost amounts must be non-negative')`
   debe pasar a usar `ErrorCode.INVALID_COST` e
   `getErrorMessage(ErrorCode.INVALID_COST, 'gl', { amount })`
   (pasa o `amount` ofensivo no context para que se interpole `{amount}`).

2. Recursos insuficientes →
   actualmente: `new YggdrasilError(ErrorCode.INSUFFICIENT_RESOURCES, 'Insufficient resource: need ' + ...)`
   debe pasar a usar
   `getErrorMessage(ErrorCode.INSUFFICIENT_RESOURCES, 'gl', { needed, resourceId, available })`.
   ⚠️ Importante: a mensaxe localizada que XA existe en `messages.ts` para
   `INSUFFICIENT_RESOURCES` usa os placeholders **`{needed}`, `{resourceId}`,
   `{available}`**. Pasa eses tres nomes exactos no context, e tamén o
   `resourceId` (que neste punto do código está dispoñible na iteración).
   Verifica o template real abrindo `messages.ts` antes de escribir o context.

Import a engadir en ResourceManager (xa hai un import de
`'@yggdrasil-forge/common'`; engade `getErrorMessage` a ese import existente,
non crees un segundo import):

```ts
import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
```

Pasa o `YggdrasilError` co `code` correcto + a mensaxe de `getErrorMessage`.
Opcionalmente engade `context` ao YggdrasilError coas mesmas variables (útil
para telemetría); non é obrigatorio pero é boa práctica e aliña coa sección
56-58 do MASTER.

**Feito cando:** non queda ningún string de error en inglés hardcoded en
`ResourceManager.ts`; `grep -n "Insufficient\|non-negative" ResourceManager.ts`
non devolve nada; `pnpm typecheck` 20/20.

### T4 — Reforzar os tests dos erros (anti-regresión)

Ficheiro: `packages/core/__tests__/engine/ResourceManager.test.ts`.

Hai 2 tests febles que pasan sen verificar o `code`:

- "errors with INSUFFICIENT_RESOURCES when cannot pay" (liña ~110): só
  comproba `isYggdrasilError`. Engade
  `expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)`.
- "errors with INVALID_COST for negative amounts" (liña ~119): só comproba
  `result.ok === false`. Engade
  `expect(result.error.code).toBe(ErrorCode.INVALID_COST)` dentro dun
  `if (!result.ok)`.

Engade tamén **1 test novo** que verifique que a mensaxe se localiza
(p.ex. que `result.error.message` non está baleira e contén o importe
interpolado). Non hardcodees a tradución exacta no assert (fráxil);
comproba que a interpolación funcionou (ex.: a mensaxe inclúe o número
do amount, ou usa `getErrorMessage` no propio test como oráculo).

Importa `ErrorCode` no test dende `@yggdrasil-forge/common` se non está xa.

**Feito cando:** `pnpm test` pasa con **≥ 316 tests** (314 previos + ≥2
asserts reforzados que poden ser tests novos ou asserts engadidos; como
mínimo 1 test novo de localización). Cero tests rotos.

### T5 — Verificación final, changeset, CHANGELOG, commit

Patrón obrigatorio ANTES do commit (seccións 1.1.2 / 1.3.3 do MASTER):

```bash
pnpm lint:fix
pnpm format
pnpm lint          # debe pasar: 0 warnings
pnpm format:check  # debe pasar
pnpm typecheck     # 20/20
pnpm test          # ≥316 pasan
```

Crea **un changeset minor** (afecta a `@yggdrasil-forge/common` —novo
ErrorCode, API aditiva— e a `@yggdrasil-forge/core` —ResourceManager—).
Recorda: common e core están en versionado **sincronizado** (sección 66).

Engade entrada ao `CHANGELOG.md` baixo `## [Unreleased]`:
- Added: `INVALID_COST` (`YGG_V006`) error code + mensaxe localizada gl/es/en.
- Changed: `ResourceManager` agora emite mensaxes de error localizadas vía
  `getErrorMessage` (antes hardcoded en inglés).
- Fixed: warning de lint `useTemplate` en `ResourceManager` (DT-5).

Commit (Conventional Commits, mensaxe en inglés):

```
fix(core): localize ResourceManager error messages; add INVALID_COST code (YGG_V006)
```

Push a `origin/main` só tras recordar ao autor que verifique
(o autor pasa o código a ChatGPT como revisor secundario — tómao en serio).

---

## 7. CONVENCIÓNS OBRIGATORIAS

- Comentarios no código en **castelán**. Marcadores `// ── INICIO: ... ──` /
  `// ── FIN: ... ──` (respecta o estilo xa presente nos ficheiros).
- Indentación 2 espazos, comilla simple, sen punto e coma, trailing commas
  multi-liña, máx 100 cols, UTF-8 + LF.
- TypeScript strict: nada de `any`. `Number.parseInt` namespaced se aplica.
- Crear/editar ficheiros con `python3` + `encoding='utf-8'` (Windows).
- Non desactivar regras de Biome: o código adáptase.

---

## 8. QUE ENTREGAR AO FINAL

- `packages/common/src/errors/codes.ts` (con `INVALID_COST`).
- `packages/common/src/errors/messages.ts` (con mensaxe localizada nova).
- `packages/core/src/engine/ResourceManager.ts` (localizado, sen warning).
- `packages/core/__tests__/engine/ResourceManager.test.ts` (asserts reforzados
  + test de localización).
- `.changeset/<nome>.md` (minor, common + core).
- `CHANGELOG.md` actualizado.
- Commit en `origin/main`.

Saídas de verificación a pegar no reporte:
`pnpm lint` (0 warnings), `pnpm typecheck` (20/20), `pnpm test` (≥316).

---

## 9. QUE NON FACER (scope creep evitable)

- ❌ NON recrees `YggdrasilError` nin os ErrorCode existentes.
- ❌ NON toques `UnlockResolver` nin `unlockMessages.ts` (xa están ben).
- ❌ NON crees `TreeEngine` nin nada da sub-fase 1.12+.
- ❌ NON engadas un parámetro `locale` ao construtor de ResourceManager
  (iso é traballo de cando exista TreeEngine; usa `'gl'` fixo por agora).
- ❌ NON refactorices outras clases do engine "de paso".
- ❌ NON cambies o lockfile nin engadas dependencias.

---

## 10. COMO REPORTAR (formato esperado)

```
═══════════════════════════════════════
SUB-FASE 1.11 — COMPLETADA
═══════════════════════════════════════
✅ DT-5 resolto: warning useTemplate eliminado
✅ INVALID_COST (YGG_V006) engadido a common + mensaxe gl/es/en
✅ ResourceManager: mensaxes localizadas vía getErrorMessage
✅ Tests reforzados: <N> pasan (<delta> novos/reforzados)
✅ Typecheck: 20/20
✅ Lint: 0 warnings, 0 errors
✅ Changeset minor (common + core, sincronizado)
✅ CHANGELOG actualizado
✅ Commit: <hash> — en origin/main
⚠️ Bloqueos / notas: <se hai algún, descríbeo; se non, "ningún">
📋 Confirma: método python3+utf-8 mantido, sen heredoc
LISTO PARA PROCEDER Á SUB-FASE 1.12 (TreeEngine: constructor + getters)
```

---

*Fin do briefing 1.11. Dúbidas estruturais → ao director, non improvisar.*
