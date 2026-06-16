# BRIEFING — SUB-FASE 4.4 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase MINIMAL.** O roadmap MASTER lista "4.4 CustomLayout"
> pero o spec §20 só especifica que `'custom'` significa "Posicións
> manuais (Editor)". **IdentityLayout (4.1) xa cumpre fielmente este
> contrato**. A 4.4 reduce a engadir `parseCustomConfig` validador
> para coherencia arquitectónica con `parseRadialConfig` (4.2) e
> `parseTreeConfig` (4.3). Cero renomeado, cero opcións opt-in
> inventadas, cero modificación de IdentityLayout.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2
e 3.6.a L1**: calquera modificación fóra de §6 require **ESCALAR
ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 4.4 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 4.4 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **4.4** de Yggdrasil Forge. **Cuarta da Fase 4** (Layout
Engine). **MINIMAL** por decisión arquitectónica do director.

**Contexto**: MASTER §20 describe `'custom'` como "Posicións manuais
(Editor)". **IdentityLayout creada en 4.1 cumpre fielmente este
contrato**: copia `NodeDef.position` se está definida, usa (0,0) como
fallback, edges como liñas rectas. **Cero funcionalidade adicional é
necesaria**.

**A 4.4 fai unha cousa**: engade `parseCustomConfig` validador como
**coherencia arquitectónica** co patrón establecido en 4.2
(`parseRadialConfig`) e 4.3 (`parseTreeConfig`). **Cero outras
modificacións**.

---

## 2. CONTEXTO MÍNIMO

§20 MASTER non especifica nada máis sobre 'custom' que "Posicións
manuais". **A decisión do director foi conscientemente minimal**:
inflar a sub-fase con `requireAllPositions`, `defaultPosition`, ou
renomeado `IdentityLayout → CustomLayout` sería **inflación de scope
sen casos de uso reais**. **Iso violaría 3.0 L1** ("cero refactor sen
valor inmediato") e **arrastra o risco 4.3 L1** (complexity blooming).

**O patrón establecido en 4.2/4.3**: cada layout exporta o seu propio
`parseXxxConfig` validador, usado polo `compute()` para validar
`treeDef.layout` antes de proceder. **CustomLayout debería ter o
mesmo patrón por consistencia**.

**Pero IdentityLayout actual NON usa parseCustomConfig**. Vaiámolo
engadir como **opcional**: a clase IdentityLayout pode chamalo se
quere validación estricta, **pero non se modifica**. **Mantén
compatibilidade total con tests 4.1**.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `2006f87` (TreeLayout Buchheim 4.3).
- 1134 tests core + 60 common + 171 storage = ~1365 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **IdentityLayout** existe en
  `packages/core/src/engine/layouts/IdentityLayout.ts` con `type =
  'custom'`. **NON se modifica**.
- **`parseRadialConfig`, `parseTreeConfig`** existen como patrón
  establecido.
- **`ErrorCode.LAYOUT_COMPUTE_FAILED` (YGG_L002)** dispoñible.
- **`BaseLayoutConfig`** existe (4.1).
- DT-9, DT-11, DT-12, DT-14, DT-15, DT-16, DT-17 abertas, non
  bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/layouts/CustomLayoutConfig.ts` cunha
interface `CustomLayoutConfig extends BaseLayoutConfig` (sen campos
adicionais máis que `type: 'custom'`) e unha función validadora
`parseCustomConfig(config, locale?)` que rexeita config con `type !==
'custom'` (paralelo a parseRadialConfig/parseTreeConfig), exportar
publicamente desde core, e cubrir con tests.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Cero modificación de IdentityLayout

**Decisión clave**: **IdentityLayout.ts permanece IDÉNTICO**.

Razóns:
1. IdentityLayout cumpre o contrato 'custom' segundo MASTER §20.
2. Renomear a CustomLayout sería refactor sen valor (3.0 L1).
3. Cero ruptura de tests 4.1, 4.2, 4.3 que importan IdentityLayout.

**O nome IdentityLayout describe ben a función**: identidade entre
NodeDef.position e LayoutResult.nodes. **O `type` público é
`'custom'`**; o nome da clase é detalle interno.

### 5.2 — Cero `requireAllPositions` ou `defaultPosition`

**Decisión clave**: **cero campos opt-in en CustomLayoutConfig**.

Razóns:
1. Cero casos de uso reais documentados.
2. Validación de "todas as posicións declaradas" pode facela o
   consumidor no seu pipeline (cero responsabilidade do LayoutEngine).
3. `defaultPosition` é equivalente a aplicar `centerX/centerY` no
   consumidor.
4. **3.0 L1**: cero engadir features sin valor inmediato.
5. **4.3 L1**: evitar complexity blooming.

### 5.3 — CustomLayoutConfig interface

`CustomLayoutConfig.ts`:

```ts
import type { BaseLayoutConfig } from '../../types/tree.js'

/**
 * Configuración do CustomLayout (posicións manuais).
 *
 * Esta interface só extende BaseLayoutConfig con `type: 'custom'`
 * literal. Cero campos adicionais en 4.4 — IdentityLayout xa cumpre
 * o contrato MASTER §20 sen necesidade de opcións extras. Sub-fases
 * futuras poden engadir campos opcionais aquí se algún caso de uso
 * real os require.
 *
 * O autor declara `NodeDef.position` para cada nodo que queira
 * posicionar manualmente; nodos sen position quedan en (0, 0).
 */
export interface CustomLayoutConfig extends BaseLayoutConfig {
  readonly type: 'custom'
}
```

### 5.4 — parseCustomConfig

No mesmo ficheiro:

```ts
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { LayoutConfig } from '../../types/tree.js'

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Valida e parsea un LayoutConfig xenérico a CustomLayoutConfig
 * estricto. Devolve err(LAYOUT_COMPUTE_FAILED) se `type` non é
 * exactamente 'custom'.
 *
 * Función minimal por deseño: en 4.4 CustomLayoutConfig só ten o
 * campo `type`. Coherencia arquitectónica con parseRadialConfig
 * (4.2) e parseTreeConfig (4.3) — todos os layouts teñen o seu
 * propio parser.
 */
export function parseCustomConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<CustomLayoutConfig> {
  if (config.type !== 'custom') {
    return err(
      new YggdrasilError(
        ErrorCode.LAYOUT_COMPUTE_FAILED,
        getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
          type: config.type,
          reason: `expected type 'custom', got '${config.type}'`,
        }),
        { context: { type: config.type } },
      ),
    )
  }

  return ok({ type: 'custom' })
}
```

**Patrón consistente** con parseRadialConfig + parseTreeConfig:
- Mesma sinatura `(config, locale?) => Result<XxxConfig>`.
- Mesmo ErrorCode `LAYOUT_COMPUTE_FAILED`.
- Mesmo formato de mensaxe ("expected type 'X', got 'Y'").

### 5.5 — Cero modificación de pezas existentes

**Cero modificación** de:
- IdentityLayout.ts (5.1).
- LayoutEngine.ts, LayoutEngineRegistry.ts, computeLayout.ts,
  LayoutResult.ts (4.1 intactos).
- RadialLayout.ts, RadialLayoutConfig.ts, MeshGenerator.ts (4.2
  intactos).
- TreeLayout.ts, TreeLayoutConfig.ts (4.3 intactos).
- DependencyGraph (cero relación).
- Calquera outra peza de core, common, ou storage.
- LayoutConfig en tree.ts (segue intacto da 4.1).

### 5.6 — Cero ErrorCodes novos

`LAYOUT_COMPUTE_FAILED` xa existe. **Cero novos**.

### 5.7 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
export type { CustomLayoutConfig } from './layouts/CustomLayoutConfig.js'
export { parseCustomConfig } from './layouts/CustomLayoutConfig.js'
```

### 5.8 — Tests funcionais

Crear un só ficheiro de test:
`packages/core/__tests__/engine/layouts/CustomLayoutConfig.test.ts`.

**Mínimo 5 tests**:

1. parseCustomConfig con `{ type: 'custom' }`: devolve `ok({ type:
   'custom' })`.
2. parseCustomConfig con `{ type: 'radial' }`: devolve
   err(LAYOUT_COMPUTE_FAILED).
3. parseCustomConfig con `{ type: 'tree' }`: err.
4. parseCustomConfig con `{ type: 'foo' }` (cualquera outro string):
   err.
5. Locale 'es'/'en' propaga á mensaxe.

**Cero tests adicionais**: a peza é minimal por deseño.

### 5.9 — Cobertura

- `CustomLayoutConfig.ts`: **100% Stmts/Branch/Funcs/Lines**. Cero
  tolerancia: a peza é tan pequena que 100% é trivial.
- Global core: non baixar de baseline (98.01% post-4.3). **Cero
  presión** porque engadimos cero ramas defensivas.

### 5.10 — Sub-fase consciente de ser minimal

**O reporte final debe documentar explícitamente**:
- Que IdentityLayout (4.1) xa cumpre o contrato 'custom'.
- Que `parseCustomConfig` engádese por **coherencia
  arquitectónica** (patrón paralelo a parseRadialConfig +
  parseTreeConfig).
- Que esto é decisión consciente: cero inflación de scope sin
  casos de uso reais.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/layouts/CustomLayoutConfig.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +2 exports)

**Tests:**
- `packages/core/__tests__/engine/layouts/CustomLayoutConfig.test.ts`
  (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1134 tests core + 60 common + 171 storage con `--force`.

2. **Verifica patrón exacto de parseRadialConfig** (a replicar):
   ```
   grep -B1 -A15 "export function parseRadialConfig" \
     packages/core/src/engine/layouts/RadialLayoutConfig.ts
   ```

3. **Verifica patrón exacto de parseTreeConfig** (a replicar):
   ```
   grep -B1 -A15 "export function parseTreeConfig" \
     packages/core/src/engine/layouts/TreeLayoutConfig.ts
   ```

### T1 — CustomLayoutConfig + parseCustomConfig (5.3 + 5.4)

Crear `packages/core/src/engine/layouts/CustomLayoutConfig.ts`.

Typecheck 20/20.

### T2 — Tests CustomLayoutConfig (5.8)

Crear `__tests__/engine/layouts/CustomLayoutConfig.test.ts` cos 5
tests. **Cobertura 100% en todo**.

### T3 — Exportar dende engine/index.ts (5.7)

Engadir 2 exports.

### T4 — Verificación post-T3

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1134 tests previos seguen pasando intactos.
- 60 common intactos.
- 171 storage intactos.

### T5 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- CustomLayoutConfig.ts 100/100/100/100.

### T6 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/layouts/CustomLayoutConfig.ts
pnpm test
```

**Nota sobre `unknown`**: cero esperado.

- Changeset **patch** para `@yggdrasil-forge/core` (peza pequena,
  cero novo comportamento).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `CustomLayoutConfig` interface (extends BaseLayoutConfig con
    `type: 'custom'`).
  - `parseCustomConfig(config, locale?)` validador. Patrón consistente
    con parseRadialConfig (4.2) e parseTreeConfig (4.3).

  ### Note
  - Sub-fase 4.4 **MINIMAL por deseño**: IdentityLayout (4.1) xa
    cumpre o contrato 'custom' segundo MASTER §20 ("Posicións
    manuais"). A 4.4 só engade parseCustomConfig por coherencia
    arquitectónica con sub-fases anteriores. Cero modificación de
    IdentityLayout. Cero opcións opt-in (requireAllPositions,
    defaultPosition) inventadas: decisión consciente de evitar
    inflación de scope sin casos de uso reais (3.0 L1 + 4.3 L1
    aplicadas).
  ```

### T7 — Commit + push

Commit Conventional:
`feat(core): add parseCustomConfig validator (sub-phase 4.4)`.
Push directo a `origin/main` (base `2006f87`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/layouts/CustomLayoutConfig.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +2 exports)
- `packages/core/__tests__/engine/layouts/CustomLayoutConfig.test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/common/`.
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- IdentityLayout.ts (5.1).
- Calquera peza existente de layouts/.
- Calquera teste existente.
- Calquera outra peza core.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

---

## 9. QUE NON FACER

- ❌ Modificar IdentityLayout.ts en absoluto (5.1).
- ❌ Renomear IdentityLayout a CustomLayout (5.1: cero ruptura).
- ❌ Engadir `requireAllPositions`, `defaultPosition`, ou outros
  campos opt-in a CustomLayoutConfig (5.2).
- ❌ Crear unha clase `CustomLayout` separada (5.1: IdentityLayout
  cumpre).
- ❌ Modificar LayoutResult, LayoutEngine, LayoutEngineRegistry,
  computeLayout (5.5).
- ❌ Modificar RadialLayout, TreeLayout, MeshGenerator (5.5).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/`.
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes (5.6).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 4.4 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 2006f87)
✅ CustomLayoutConfig interface (extends BaseLayoutConfig)
✅ parseCustomConfig validador (paralelo a parseRadialConfig + parseTreeConfig)
✅ Cero modificación de IdentityLayout (4.1 intacta)
✅ Cero campos opt-in inventados (requireAllPositions, defaultPosition omitidos)
✅ Cero renomeado IdentityLayout → CustomLayout
✅ Cero modificación de outras pezas existentes
✅ Cero modificación de common/storage/tsconfig/tsup
✅ Cero ErrorCodes novos
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> CustomLayoutConfig (validación type='custom')
✅ Cobertura:
   - CustomLayoutConfig 100/100/100/100
   - Global core: <X%> (baseline 98.01%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Nota arquitectónica:
   - Sub-fase 4.4 MINIMAL por deseño consciente. IdentityLayout (4.1)
     xa cumpre o contrato 'custom' MASTER §20. parseCustomConfig
     engadido só por coherencia arquitectónica con 4.2 + 4.3.
   - Cero inflación de scope (3.0 L1 + 4.3 L1 aplicadas).
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 4.5 (PathBuilder + BoundsCalculator + QuadTree).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 4.4. Sub-fase MINIMAL por deseño consciente.
Engadir só parseCustomConfig por coherencia. Cero inflación de scope.*
