# BRIEFING — sub-fase F9.1 de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Primeira sub-fase con código da etapa Renderer→Studio.**
> Engade un campo opcional ao motor (`NodeDef.tiers`). Aditivo,
> non-breaking. Cero cambios de comportamento existente.

---

## 1. Contexto mínimo

Motor open-source de *progression graphs* en TypeScript (monorepo pnpm +
Turborepo; core dep única: Immer). Cliente cero: **Oberón** (app educativa
GAIA). Folla de ruta activa: `docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md`.

## 2. Que se fixo antes (estado á entrada)

- `origin/main` en **`e09945f`** (sub-fase `master-transition`, docs only).
- Fase 8 PECHADA. 7 paquetes activos + 13 scaffold. ~2195 tests.
- **52 sub-fases consecutivas sen rollback.**

## 3. Obxectivo (unha frase)

Engadir a `NodeDef` un campo opcional `tiers?: readonly NodeTierInfo[]`
(etiqueta + descrición localizadas **por rango**) + o seu tipo
`NodeTierInfo` + validación Zod, para que o motor cargue os 3 niveis das
microskills de GAIA ("Aprendiz/Oficial/Mestre") sen perda. **Roadmap §4 /
sub-fase 9.1.**

## 4. Decisións xa tomadas (NON discutibles — non consultar)

1. **Forma do tipo (pechada):**
   `NodeTierInfo = { label?: LocalizedString; description?: LocalizedString }`.
   Ambos campos opcionais. Índice no array = `tier - 1`.
2. **Non duplica** `costPerTier`/`effects` (custo/efectos por rango xa
   existen). `tiers` é **só texto de presentación** por rango.
3. **`freezeNodeDef` NON se toca** — `deepFreeze` conxela `tiers`
   automaticamente (verificado).
4. **`type-test` NON precisa caso novo** — `_SchemaMatchesTreeDef`
   (`EqualModuloExactOptional<InferredTreeDef, TreeDef>`) auto-enforza o
   aliñamento; se engades `tiers` só a un lado, **o build rompe só** (iso é
   o sinal de que falta o outro lado).
5. **Schema obrigatorio:** `nodeDefSchema` non é `.strict()`; Zod elimina
   claves descoñecidas. Sen engadir `tiers` ao schema, perderíase no
   round-trip. **Por iso o schema é parte do scope.**
6. **Bump:** changeset `minor` en `@yggdrasil-forge/core` (API nova
   aditiva). Escríbese como **ficheiro** (non `pnpm changeset` interactivo).

## 5. Tarefas a executar (T0–T9)

> Edicións de código vía **script Python en `/tmp/ygg-exec/`** (utf-8, sen
> heredocs, con `assert` que comprobe que cada áncora existe **antes** de
> modificar). Se algún `assert` falla → **PARA e escala** (§0.6).

### T0 — Preflight
- Fresh clone de `origin/main`. `git rev-parse HEAD` debe ser **`e09945f`**
  (se non, escala: o estado moveuse). Árbore limpa. Identidade git.
- **Feito:** SHA confirmado, árbore limpa.

### T1 — Tipo `NodeTierInfo` + campo `tiers` en `node.ts`
Ficheiro: `packages/core/src/types/node.ts`.

(a) **Inserir inmediatamente antes** da liña áncora
`export interface NodeDef {` este bloque exacto:

```typescript
// ── INICIO: F9.1 — info por rango (tier) ──
/**
 * Información de presentación POR RANGO (tier) dun nodo multi-rango.
 *
 * Índice no array `NodeDef.tiers` = `tier - 1` (tier 1 → índice 0).
 * Complementa `costPerTier`/`effects` (custo/efectos por rango); aquí só
 * vai texto: etiqueta e descrición localizadas. Ambos campos opcionais.
 *
 * Caso GAIA: os 3 niveis dunha microskill ("Aprendiz/Oficial/Mestre" +
 * descrición de cada un). Caso xogo: "Rango 1: Iniciado".
 *
 * Deséñase extensible: campos futuros por rango (ex. criterio de acceso)
 * engádense como opcionais sen romper.
 */
export interface NodeTierInfo {
  /** Etiqueta do rango (ex. "Aprendiz"). Localizable. */
  readonly label?: LocalizedString
  /** Descrición do rango. Localizable. */
  readonly description?: LocalizedString
}
// ── FIN: F9.1 ──

```

(b) **Inserir inmediatamente despois** da liña áncora
`  readonly costPerTier?: readonly (readonly Cost[])[]` este bloque exacto:

```typescript

  // ── INICIO: F9.1 — info de presentación por rango ──
  /**
   * Info de presentación por rango (etiqueta/descrición localizadas).
   * Índice = tier - 1. Complementa costPerTier/effects (non os duplica).
   */
  readonly tiers?: readonly NodeTierInfo[]
  // ── FIN: F9.1 ──
```

> Comproba que `LocalizedString` xa está importado en `node.ts` (xa o usa
> `label`). Non engadas imports duplicados.

- **Feito:** `NodeTierInfo` definido e exportado; `NodeDef.tiers` engadido.

### T2 — Export en `types/index.ts`
Ficheiro: `packages/core/src/types/index.ts`.
- Na bloque `export type { ... } from './node.js'`, engade `NodeTierInfo`.
  Áncora: a liña `  Position,` seguida de `} from './node.js'`. Resultado
  esperado:

```typescript
export type {
  NodeType,
  NodeState,
  NodeDef,
  NodeTierInfo,
  NodeInstance,
  StateChange,
  Position,
} from './node.js'
```

- **Feito:** `NodeTierInfo` exportado desde o índice de tipos.

### T3 — Schema Zod en `treeDefSchema.ts`
Ficheiro: `packages/core/src/engine/treeDefSchema.ts`.

(a) **Inserir inmediatamente antes** da liña áncora `const nodeDefSchema = z`
este bloque exacto:

```typescript
// ── INICIO: F9.1 — schema de info por rango ──
const nodeTierInfoSchema = z.object({
  label: localizedStringSchema.optional(),
  description: localizedStringSchema.optional(),
})
// ── FIN: F9.1 ──

```

(b) **Inserir inmediatamente despois** da liña áncora
`    costPerTier: z.array(z.array(costSchema)).optional(),` este bloque
exacto:

```typescript
    // ── INICIO: F9.1 — tiers ──
    tiers: z.array(nodeTierInfoSchema).optional(),
    // ── FIN: F9.1 ──
```

- **Feito:** `InferredTreeDef` agora inclúe `tiers` (z.infer); o
  `type-test` segue compilando (alinea con `NodeDef.tiers`).

### T4 — Tests
> `exactOptionalPropertyTypes: true`: nos fixtures **omite** `tiers` cando
> non aplique; **nunca** poñas `tiers: undefined` explícito.

(a) `packages/core/__tests__/types/node.test.ts` — engade un test de
freeze que confirme que un `NodeDef` con `tiers` se conxela en profundidade
(o array e cada `NodeTierInfo`). Mira o patrón dos tests `freezeNodeDef`
existentes (tier/maxTier) e imítao.

(b) `packages/core/__tests__/engine/TreeDefValidator.test.ts` — usando o
helper `makeValidTreeDef()`, engade casos:
- **válido:** nodo con `tiers: [{ label, description }, { description }, {}]`
  → `validateTreeDef` ok.
- **inválido:** `tiers` con `label` non-string-nin-record (ex. `label: 5`)
  → erro de validación.

(c) `packages/core/__tests__/engine/JsonSerializer.test.ts` — **test
crítico de round-trip:** un `TreeDef` cun nodo que ten `tiers` debe
sobrevivir `serialize` → `deserialize` **idéntico** (proba que NON se
elimina). Sen o T3, este test fallaría.

- **Feito:** os 3 ficheiros teñen os casos; cobertura do código novo
  ≥90% branch.

### T5 — Changeset (ficheiro, non interactivo)
- Crea `.changeset/f9-1-node-tiers.md` con contido exacto:

```markdown
---
'@yggdrasil-forge/core': minor
---

feat(core): add optional `NodeDef.tiers` (per-rank label/description) with `NodeTierInfo` type and Zod validation (F9.1)
```

- **Feito:** changeset creado.

### T6 — Tracking do briefing
- Copia **este briefing** a `docs/briefings/BRIEFING_9_1_NODE_TIERS.md`
  (verbatim).
- **Feito:** ficheiro existe.

### T7 — Lint / format / typecheck
- Cadea: `pnpm lint:fix → pnpm format → pnpm lint → pnpm format:check`.
- Se Biome reformatea ficheiros **fóra de scope** (como pasou con
  `App.tsx`), **reverte ese cambio** e déixao fóra do commit.
- `pnpm turbo run typecheck --force` → **verde** (clave: `_SchemaMatchesTreeDef`
  debe seguir compilando).
- **Feito:** lint, format:check e typecheck pasan.

### T8 — Tests + cobertura + non-regresión
- Constrúe `@yggdrasil-forge/common` antes (dep de core).
- `pnpm turbo run test --force`.
- **Conta de tests global ≥ 2195** (debe **subir**, non baixar). Se baixa →
  **PARA e escala**.
- `pnpm --filter @yggdrasil-forge/core run test:coverage` → cobertura
  **global de core sen regresión**; código novo ≥90% branch.
- Anti-placeholder: `grep -rnE "TODO|FIXME|PLACEHOLDER|XXX|lorem"` nos
  ficheiros novos/modificados → cero (agás mencións meta neste briefing).
- **Feito:** tests ↑, cobertura sen regresión, cero placeholders.

### T9 — Commit
- Un só commit. Mensaxe exacta:

```
feat(core): NodeDef.tiers — per-rank presentation info (F9.1)

- add NodeTierInfo type + NodeDef.tiers (optional, additive)
- export NodeTierInfo from types index
- Zod: nodeTierInfoSchema + tiers in nodeDefSchema (required so round-trip preserves it)
- tests: node freeze, validator valid/invalid, JsonSerializer round-trip
- changeset: @yggdrasil-forge/core minor
- track BRIEFING_9_1_NODE_TIERS.md

freezeNodeDef untouched (deepFreeze handles tiers). No behavior change.
```

- `git format-patch -1 HEAD`.
- **Feito:** patch xerado, listo para Agarfal.

## 6. Convencións obrigatorias

- Comentarios `// ── INICIO: F9.1 — ... ──` / `// ── FIN: F9.1 ──` no
  código novo (xa incluídos nos bloques prescritos).
- Idioma de comentarios/docs: galego.
- Scripts en `/tmp/ygg-exec/`, utf-8, sen heredocs, con `assert`.
- Un só commit. Conventional commits.

## 7. Ficheiros esperados no diff final (lista pechada)

```
packages/core/src/types/node.ts                              (M: NodeTierInfo + tiers)
packages/core/src/types/index.ts                             (M: export NodeTierInfo)
packages/core/src/engine/treeDefSchema.ts                    (M: nodeTierInfoSchema + tiers)
packages/core/__tests__/types/node.test.ts                   (M: freeze test)
packages/core/__tests__/engine/TreeDefValidator.test.ts      (M: valid/invalid)
packages/core/__tests__/engine/JsonSerializer.test.ts        (M: round-trip)
.changeset/f9-1-node-tiers.md                                (A)
docs/briefings/BRIEFING_9_1_NODE_TIERS.md                    (A)
```

Calquera outro ficheiro = erro → **PARA e escala**.

## 8. Que NON facer

- ❌ NON tocar `freezeNodeDef` nin `deepFreeze`.
- ❌ NON facer `.strict()` no schema (cambiaría comportamento de validación
  doutros campos).
- ❌ NON engadir caso novo ao `type-test` (o guard existente abonda).
- ❌ NON tocar o renderer, layouts, nin ningún outro paquete.
- ❌ NON poñer `tiers: undefined` explícito en ningún fixture.
- ❌ NON adiantar nada do importador (F9.3).

## 9. Como reportar (formato esperado)

- `✅ ESTADO` — feito / parado-escalado.
- `📋 TAREFAS` — T0–T9, cada unha ✅/⚠️/❌ cunha liña.
- `📂 DIFF` — `git diff --cached --name-only` (debe coincidir co §7).
- `🧪 TESTS` — conta global antes/despois (≥2195, debe subir) + cobertura
  core (global sen regresión; novo ≥90% branch).
- `🔍 VERIFICACIÓN` — typecheck verde + anti-placeholder + confirmación de
  que `_SchemaMatchesTreeDef` compila.
- `🧩 PATCH` — nome do `.patch`.
- `🚨 ESCALADAS` — asserts fallidos / descubertas fóra de asunción; se
  ningunha, «ningunha».

---

*Briefing F9.1. 4º Arquitecto. Aditivo, non-breaking, primeiro código da
nova etapa. 🌳*
