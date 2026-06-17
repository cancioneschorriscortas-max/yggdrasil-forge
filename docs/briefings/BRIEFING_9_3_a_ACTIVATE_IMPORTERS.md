# BRIEFING — sub-fase F9.3.a de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Activación do 1º paquete scaffold (`@importers`) + esqueleto real do
> importador GAIA.** Todo contido en `packages/importers/` (verificado: a
> raíz xa referencia o paquete; cero config raíz). Non toca outros paquetes.

---

## 1. Contexto mínimo

Motor de *progression graphs* en TS (monorepo pnpm + Turborepo). Cliente
cero: **Oberón** (app educativa GAIA). O contrato GAIA→Yggdrasil é un JSON
(`TreeDef`). Esta sub-fase activa o paquete que fai esa conversión.
Roadmap: `docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md` (F9.3).
Fixture de referencia: `docs/architecture/data-contracts/panadeiro.fixture.json`.

## 2. Que se fixo antes (estado á entrada)

- `origin/main` en **`1bb3902`** (F9.1: `NodeDef.tiers`).
- `@importers` é scaffold placeholder (`export const VERSION='0.0.0'`),
  sen dependencia de `@core`. Config tsup/tsconfig **sen** o fix DT-14.
- **53 sub-fases consecutivas sen rollback.**

## 3. Obxectivo (unha frase)

Activar `@yggdrasil-forge/importers` (deps + build DT-14) e implementar o
**esqueleto real** do importador GAIA: tipos de entrada completos + mapeo
de **profesión → nodo raíz** e **grupos → GroupDef[]**, producindo un
`TreeDef` **válido** (sen microskills aínda; esas van en 9.3.b).

## 4. Decisións xa tomadas (NON discutibles — non consultar)

### 4.1 Activación do paquete (imitar `@validators`, que xa leva DT-14)
- `package.json`: engadir bloque `dependencies` con
  `@yggdrasil-forge/common` e `@yggdrasil-forge/core` (`workspace:*`).
- `tsup.config.ts`: aplicar **DT-14** — `dts` como obxecto con
  `{ resolve: true, compilerOptions: { composite: false, incremental: false } }`
  e engadir `tsconfig: 'tsconfig.json'`.
- `tsconfig.json`: `rootDir: "."`, `include: ["src/**/*","__tests__/**/*"]`,
  engadir `references: [{path:"../common"},{path:"../core"}]`, **quitar**
  `composite: true` e o `exclude` de `__tests__` (idéntico a `@validators`).

### 4.2 API pública do importador
```typescript
export function importGaiaProfession(
  input: GaiaProfession,
  options?: GaiaImportOptions,
): TreeDef
```
- **Mapeo puro** (determinista, sen I/O). **NON valida dentro**: a
  validación é traballo do motor (`validateTreeDef`). Os tests si validan
  a saída.
- `GaiaImportOptions = { version?: string; layout?: LayoutConfig }`.
  Defaults: `version = '1.0.0'`, `layout = { type: 'identity' }` (honra as
  posicións dadas; engine `IdentityLayout` existe; F11 poderá ofrecer un
  preset clustered-radial).

### 4.3 Regra de metadata (CLAVE, design-wide)
Os campos de GAIA que **teñen campo de primeira clase** mapéanse nativo
(`id, label, icon, color, position, group, maxTier, prerequisites`). O
**resto de GAIA vai namespaced baixo `metadata.gaia.*`** (a nivel árbore e
a nivel nodo). Así nada se perde **e** a librería segue xenérica
(un dev de xogos ignora `metadata.gaia`). `GroupDef` non ten campo
`metadata`, polo que o `skill_canonica_dominante` dos grupos vai en
`tree.metadata.gaia.groupCanonical`.

### 4.4 Helper i18n (inclúese tal cal)
```typescript
import type { LocalizedString } from '@yggdrasil-forge/common'

/** Constrúe LocalizedString {gl,es,en} omitindo as ausentes. undefined se todas faltan. */
export function toI18n(
  gl?: string,
  es?: string,
  en?: string,
): LocalizedString | undefined {
  const out: Record<string, string> = {}
  if (gl !== undefined) out.gl = gl
  if (es !== undefined) out.es = es
  if (en !== undefined) out.en = en
  return Object.keys(out).length > 0 ? out : undefined
}
```
> `exactOptionalPropertyTypes: true`: ao construír obxectos, usa **spread
> condicional** para campos opcionais que poden ser `undefined`
> (`...(x !== undefined ? { k: x } : {})`); **nunca** asignes `k: undefined`.

### 4.5 Mapeo desta sub-fase (profesión + grupos)

**`TreeDef` raíz:**

| Campo TreeDef | Orixe GAIA |
|---|---|
| `id` | `input.id` |
| `schemaVersion` | `SCHEMA_VERSION` (de `@common`) |
| `version` | `options.version ?? '1.0.0'` |
| `label` | `input.label` (string plano = LocalizedString válido) |
| `description` | `toI18n(epigrafe_gl, epigrafe_es, epigrafe_en)` (omitir se undefined) |
| `rootNodeId` | `input.id` |
| `nodes` | `[rootNode]` (microskills en 9.3.b) |
| `edges` | `[]` |
| `groups` | `input.grupos.map(toGroupDef)` |
| `layout` | `options.layout ?? { type: 'identity' }` |
| `metadata` | `{ gaia: { profession, canonicalWeights, groupCanonical } }` |

**`metadata.gaia`:**
- `profession`: `{ rol, bloque, salario_medio?, proxeccion?, risco_automatizacion?, via_formativa?, imaxe_escena_url?, oberon_completo? }` (omitir ausentes).
- `canonicalWeights`: `Record<skillId, peso>` desde `input.skills` (`{ [s.id]: s.peso }`).
- `groupCanonical`: `Record<groupId, skill_canonica_dominante>` desde os grupos (omitir entradas sen dominante).

**Nodo raíz (`rootNode: NodeDef`):**

| Campo NodeDef | Orixe |
|---|---|
| `id` | `input.id` |
| `type` | `'root'` |
| `label` | `input.label` |
| `icon` | `input.icono` (omitir se undefined) |
| `description` | `toI18n(epigrafe_gl, epigrafe_es, epigrafe_en)` |
| `metadata` | `{ gaia: { poetic: toI18n(descricion_poetica_*), short: toI18n(descricion_curta_*) } }` (omitir claves ausentes) |

**`toGroupDef(g) → GroupDef`:**

| Campo GroupDef | Orixe |
|---|---|
| `id` | `g.id` |
| `label` | `toI18n(g.label_gl, g.label_es, g.label_en) ?? g.label_gl` |
| `color` | `g.cor` (omitir se undefined) |
| `icon` | `g.icono` (omitir se undefined) |
| `position` | `g.posicion` (`{x,y}`, omitir se undefined) |

> Os grupos quedan sen nodos membro nesta sub-fase (as microskills van en
> 9.3.b). `GroupDef` sen membros é estructuralmente válido.

### 4.6 Tipos de entrada GAIA (inclúense tal cal, contrato pechado)
```typescript
export interface GaiaCanonicalWeight {
  id: string
  label: string
  categoria: string
  peso: number
  icono?: string
}
export interface GaiaGroup {
  id: string
  profesion_id?: string
  label_gl: string
  label_es?: string
  label_en?: string
  icono?: string
  cor?: string
  skill_canonica_dominante?: string
  posicion?: { x: number; y: number }
}
export interface GaiaMicroskill {
  id: string
  label_gl: string
  label_es?: string
  label_en?: string
  que_significa_gl?: string
  que_significa_es?: string
  que_significa_en?: string
  accion_clave_gl?: string
  accion_clave_es?: string
  accion_clave_en?: string
  grupo_id: string
  skill_canonica_id?: string
  icono?: string
  video_url?: string
  video_proveedor?: string
  posicion?: { x: number; y: number }
  conectadas?: string[]
}
export interface GaiaProfession {
  id: string
  rol: string
  bloque: string
  label: string
  icono?: string
  proxeccion?: string
  salario_medio?: number
  risco_automatizacion?: string
  via_formativa?: string
  descricion_curta_gl?: string
  descricion_curta_es?: string
  descricion_curta_en?: string
  epigrafe_gl?: string
  epigrafe_es?: string
  epigrafe_en?: string
  descricion_poetica_gl?: string
  descricion_poetica_es?: string
  descricion_poetica_en?: string
  imaxe_escena_url?: string
  oberon_completo?: boolean
  skills: GaiaCanonicalWeight[]
  grupos: GaiaGroup[]
  microskills: GaiaMicroskill[]
}
export interface GaiaImportOptions {
  version?: string
  layout?: LayoutConfig
}
```

### 4.7 Sen changeset nesta sub-fase
9.3.a é **activación interna** (importador incompleto). O changeset de
`@importers` vai en **9.3.b** ao completar, para non sinalar "listo"
prematuramente. **NON crees changeset aquí.**

## 5. Tarefas (T0–T9)

> Edicións vía script Python en `/tmp/ygg-exec/` (utf-8, sen heredocs,
> `assert` de áncora antes de modificar). Áncora fallida → **PARA e escala**.

- **T0 — Preflight.** Fresh clone; HEAD == `1bb3902` (se non, escala).
  Árbore limpa. Identidade git.
- **T1 — package.json.** Engadir bloque `dependencies` (@common + @core
  `workspace:*`) antes de `devDependencies`.
- **T2 — tsup.config.ts.** Aplicar DT-14 (§4.1). Actualiza o comentario
  cabeceira mencionando DT-14 (como en `@validators`).
- **T3 — tsconfig.json.** Reescribir para igualar `@validators` (§4.1):
  rootDir ".", include src+__tests__, references common+core, sen composite.
- **T4 — `src/gaia.ts` (novo).** `toI18n` (§4.4) + tipos de entrada (§4.6)
  + `importGaiaProfession` co mapeo de §4.5 (profesión + grupos; nodes =
  [root]; edges = []). Comentarios `// ── INICIO: F9.3.a — ... ──` / FIN.
- **T5 — `src/index.ts`.** Re-exportar de `./gaia.js`
  (`importGaiaProfession`, `toI18n`, e os tipos `Gaia*`). **Manter** o
  `export const VERSION` (non rompas o smoke test existente).
- **T6 — `__tests__/gaia.test.ts` (novo).** Tests:
  - Importa un input mínimo (profesión + 1-2 grupos, microskills `[]`) →
    `importGaiaProfession` devolve TreeDef.
  - **`validateTreeDef(output)` é OK** (saída válida).
  - Asercións estruturais: `output.id`, `schemaVersion === SCHEMA_VERSION`,
    `rootNodeId`, nodo raíz `type:'root'`, `groups.length`, label/cor/icon/
    position dun grupo, `metadata.gaia.canonicalWeights`/`groupCanonical`.
  - i18n: `description` do raíz é `{gl,es,en}` cando hai epigrafe nos 3.
  - `toI18n`: casos (todas, algunhas, ningunha → undefined).
  - Cobertura do código novo ≥90% branch.
  - **NON** dependas aínda da fixture completa do panadeiro (iso é 9.3.b);
    usa un input pequeno inline.
- **T7 — Lint/format/typecheck.** `pnpm lint:fix → format → lint →
  format:check`. Reverte calquera cambio automático fóra de scope.
  `pnpm turbo run typecheck --force` verde (clave: `@importers` agora
  typecheckea contra `@core`).
- **T8 — Build + tests + cobertura.**
  - Build do paquete: `pnpm --filter @yggdrasil-forge/importers run build`
    → **xera `dist/` con `.d.ts`** (proba do DT-14; se falla a xeración de
    tipos, é DT-14 mal aplicado → revisa §4.1).
  - `@common` e `@core` construídos antes (deps).
  - `pnpm turbo run test --force` → conta global **sube** (≥2195 + novos).
    Se baixa → **PARA e escala**.
  - Anti-placeholder nos ficheiros novos/modificados → cero (agás meta
    deste briefing). **O `VERSION='0.0.0'` non conta como placeholder.**
- **T9 — Commit + patch.** Un só commit; mensaxe:
```
feat(importers): activate @importers + GAIA importer skeleton (profession + groups) (F9.3.a)

- package: depend on @core + @common; tsup DT-14 dts fix; tsconfig project references
- src/gaia.ts: GAIA input types, toI18n helper, importGaiaProfession (profession→root, groups→GroupDef[])
- metadata.gaia namespace for non-first-class GAIA fields (lossless, keeps lib generic)
- tests: output validates, structural + i18n assertions
- track BRIEFING_9_3_a_ACTIVATE_IMPORTERS.md

Microskills + edges + full panadeiro round-trip come in F9.3.b. No changeset yet (internal activation).
```
- `git format-patch -1 HEAD`.

## 6. Ficheiros esperados no diff (lista pechada)
```
packages/importers/package.json                              (M)
packages/importers/tsup.config.ts                            (M)
packages/importers/tsconfig.json                             (M)
packages/importers/src/gaia.ts                               (A)
packages/importers/src/index.ts                              (M)
packages/importers/__tests__/gaia.test.ts                    (A)
docs/briefings/BRIEFING_9_3_a_ACTIVATE_IMPORTERS.md          (A)
```
Calquera outro ficheiro = erro → **PARA e escala**. (Especialmente: NON
toques a raíz `tsconfig.json`/`turbo.json`/`pnpm-workspace.yaml` — xa
inclúen `@importers`.)

## 7. Que NON facer
- ❌ NON implementar microskills, edges (`conectadas`), nin `maxTier`/`tiers`
  (todo iso é 9.3.b).
- ❌ NON validar dentro do importador (a saída valídase nos tests, non na fn).
- ❌ NON crear changeset (vai en 9.3.b).
- ❌ NON tocar outros paquetes nin config raíz.
- ❌ NON poñer `undefined` explícito en campos opcionais (spread condicional).
- ❌ NON romper o smoke test existente (`VERSION`).

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T9) · `📂 DIFF` (== §6) ·
  `🧪 TESTS` (conta antes/despois, ≥2195↑; cobertura novo ≥90% branch) ·
  `🏗️ BUILD` (confirmar que `dist/*.d.ts` se xerou — proba DT-14) ·
  `🔍 VERIFICACIÓN` (typecheck verde + anti-placeholder) ·
  `🧩 PATCH` (nome do .patch) · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F9.3.a. 4º Arquitecto. Primeiro scaffold activado; o importador
empeza a vivir. 🌳*
