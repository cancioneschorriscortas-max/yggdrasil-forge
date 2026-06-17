# BRIEFING — sub-fase F10.2 de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Renderer 2.0 — vocabulario visual de NODO (core).** Engade `shape` e
> `size` a `NodeDef`, co seu tipo `NodeShape`, schema Zod e tests. **Puro
> vocabulario aditivo de datos** — o renderer aínda non o consome (iso é
> F10.3). Publicable → changeset `@core minor` (acumúlase; **sen release**).

---

## 1. Contexto

`NodeDef` só ten `icon?` e `color?` como campos visuais. Para que o
renderer poida debuxar nodos con forma e tamaño diferenciados (small =
círculo pequeno, keystone = hexágono grande, tech-tree = cadrado, etc.,
segundo os 5 arquetipos), o **dato** debe existir primeiro no modelo. Esta
sub-fase só engade ese vocabulario; debuxalo é F10.3 (co human visual
check real).

> **Decisión de troceado:** edges (`directed`), rexións de grupo e defaults
> por tipo no Theme **non** entran aquí; van en sub-fases dedicadas cando o
> renderer os necesite. F10.2 = só forma/tamaño de nodo.

## 2. Estado á entrada

`origin/main` en `22e8297` (F10.1). `NodeDef` con visual = `{icon?, color?}`.
Existe `packages/core/src/engine/treeDefSchema.type-test.ts` que **forza o
aliñamento** entre o tipo `TreeDef` e o schema Zod: `shape`/`size` deben
engadirse **nos dous** sitios ou o type-test falla.

## 3. Obxectivo (unha frase)

`NodeDef` gana `shape?: NodeShape` e `size?: number` (opcionais, aditivos),
validados polo schema, exportados na API pública.

## 4. Decisións xa tomadas (verificadas — NON discutibles salvo §9)

1. **`NodeShape`** = `'circle' | 'square' | 'diamond' | 'hexagon' | 'octagon'`.
   Cobre os arquetipos (constelación=circle, tech-tree=square, PoE
   keystone=hexagon/diamond). Aditivo: pódense engadir máis no futuro sen
   breaking change.
2. **`NodeDef.shape?: NodeShape`** — override de forma por nodo. Se ausente,
   o renderer (F10.3) derivará a forma por `type` cun default.
3. **`NodeDef.size?: number`** — tamaño base en **unidades de layout**
   (raio para `circle`; o renderer interpretará por forma). Debe ser > 0.
   Se ausente, o renderer derivará por `type`.
4. Ambos van **no tipo e no schema** (type-test esíxeo). `size` usa o
   mesmo patrón que `maxTier`: `z.number().positive(...)`.
5. `NodeShape` **expórtase** na API pública de `@core` (como `NodeType`).
6. **Cero rendering, cero @react.** Só `@core`.

## 5. Tarefas (T0–T6)

> Script Python en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert` de
> áncora). exactOptionalPropertyTypes: cero `undefined` explícito.

### T0 — Preflight
Fresh clone; HEAD == `22e8297`. Árbore limpa. Identidade git
(`Director (4th Architect)`).

### T1 — `NodeShape` + campos en `NodeDef` (`packages/core/src/types/node.ts`)
(a) Engadir o tipo `NodeShape` **inmediatamente despois** do bloque
`export type NodeType = … | 'custom'`. Áncora: a liña `  | 'custom'` que
pecha `NodeType` (é a primeira ocorrencia; confirma que é a de NodeType).
Inserir despois:
```typescript

/**
 * Forma visual dun nodo. O renderer derívaa por `type` se o nodo non
 * especifica `shape`. Aditiva: novos valores en sub-fases futuras.
 */
export type NodeShape = 'circle' | 'square' | 'diamond' | 'hexagon' | 'octagon'
```

(b) Engadir os campos en `NodeDef`. Áncora (bloque exacto):
```typescript
  /** Cor visual asociada ao nodo. */
  readonly color?: string
```
Inserir **despois**:
```typescript

  /** Forma visual do nodo. Se ausente, o renderer derívaa por `type`. */
  readonly shape?: NodeShape

  /** Tamaño base en unidades de layout (raio para `circle`). > 0. Se ausente, derívase por `type`. */
  readonly size?: number
```

### T2 — Schema Zod (`packages/core/src/engine/treeDefSchema.ts`)
(a) Definir `nodeShapeSchema` **antes** de `nodeDefSchema`. Áncora:
`const nodeDefSchema = z`
Inserir **antes**:
```typescript
const nodeShapeSchema = z.enum(['circle', 'square', 'diamond', 'hexagon', 'octagon'])

```
(b) Engadir os campos dentro de `nodeDefSchema`. Áncora (bloque exacto):
```typescript
    color: z.string().optional(),
    // ── INICIO: validación 2.5 #2 — tier > 0 ──
```
Inserir **entre** as dúas liñas (despois de `color`, antes do comentario):
```typescript
    shape: nodeShapeSchema.optional(),
    size: z.number().positive('size debe ser maior que 0').optional(),
```

### T3 — Export público (`packages/core/src/types/node.ts` xa exporta; confirmar barrel)
- Verifica que `NodeShape` se exporta na API pública. Localiza onde se
  re-exporta `NodeType` (probablemente `packages/core/src/index.ts` ou
  `types/index.ts`) e engade `NodeShape` na mesma lista/`export type`.
  Áncora: a liña que contén `NodeType` no barrel. Engade `NodeShape` xunto.
  Se `NodeType` se exporta vía `export type { … } from './node.js'`, engade
  `NodeShape` a esa lista.

### T4 — Tests (`packages/core/__tests__/` — mirror de src)
Engadir nun ficheiro de schema existente (ex. o que proba `nodeDefSchema`/
`validateTreeDef`; localízao con grep `validateTreeDef` en `__tests__`) un
`describe('NodeDef visual: shape + size (F10.2)')`:
- `validateTreeDef` **acepta** unha árbore cun nodo `{ shape: 'hexagon', size: 30 }` → `result.ok === true`, e o nodo conserva `shape`/`size`.
- **acepta** un nodo sen `shape`/`size` (opcionais).
- **rexeita** `shape: 'triangle'` (fóra do enum) → `result.ok === false`.
- **rexeita** `size: 0` e `size: -5` (non positivo) → `result.ok === false`.
- (Opcional) caso por cada valor válido de `NodeShape` aceptado.
> Reutiliza o helper de árbore mínima do ficheiro (ou constrúe un `TreeDef`
> inline con `layout: { type: 'custom' }`, 1 nodo `type:'small'`).
> O `treeDefSchema.type-test.ts` debe seguir compilando (aliñamento ok).

### T5 — Changeset + tracking
- `.changeset/f10-2-node-shape-size.md`:
```markdown
---
'@yggdrasil-forge/core': minor
---

feat(core): NodeDef visual vocabulary — shape (NodeShape) and size for renderer 2.0 (F10.2)
```
- Copia este briefing a `docs/briefings/BRIEFING_10_2_NODE_VISUAL_VOCAB.md`.

### T6 — Gate CI + commit
- Gate completo: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`
  → catro verdes; conta de tests **sube**. O type-test de schema debe pasar.
- Cobertura do código novo ≥ liña base (sen regresión).
- Anti-placeholder → cero.
- Un só commit:
```
feat(core): NodeDef shape + size visual vocabulary for renderer 2.0 (F10.2)

- NodeShape type ('circle'|'square'|'diamond'|'hexagon'|'octagon'); exported
- NodeDef.shape? + NodeDef.size? (optional, additive)
- zod: nodeShapeSchema + shape/size in nodeDefSchema (size > 0)
- tests: schema accepts/rejects shape & size; type alignment preserved
- changeset @core minor; track briefing

No rendering yet (consumed in F10.3). Core data vocabulary only.
```
- `git format-patch -1 HEAD`.

## 6. Ficheiros esperados no diff (lista pechada)
```
packages/core/src/types/node.ts                          (M: NodeShape + shape/size)
packages/core/src/engine/treeDefSchema.ts                (M: nodeShapeSchema + campos)
packages/core/src/<barrel cos exports>                   (M: export NodeShape)
packages/core/__tests__/<ficheiro de schema>             (M: tests F10.2)
.changeset/f10-2-node-shape-size.md                      (A)
docs/briefings/BRIEFING_10_2_NODE_VISUAL_VOCAB.md        (A)
```
Calquera outro = erro → **PARA e escala**. (Se o export de `NodeType` xa
arrastra `NodeShape` por estar no mesmo `export *`, o ficheiro barrel pode
non aparecer no diff — documéntao no reporte.)

## 7. Que NON facer
- ❌ NON tocar `@react` nin o renderer (F10.3).
- ❌ NON engadir defaults por tipo, edges `directed`, nin estilo de grupo (sub-fases futuras).
- ❌ NON `undefined` explícito.

## 8. Human visual check
F10.2 é **vocabulario de datos**, sen saída visual. Check visual **N/A**
(coma F10.1). O primeiro check visual real é F10.3 (debuxar as formas).
Indícao no reporte.

## 9. Punto aberto para o Director (responder antes de aplicar)
O set `NodeShape` proposto é `circle | square | diamond | hexagon |
octagon`. **Se os teus mockups precisan algunha forma máis** (p.ex. `star`,
`rounded_square`, `triangle`), dimo e amplíoo antes de que o Executor
aplique. Se che vale, procede tal cal.

## 10. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T6) · `📂 DIFF` (== §6) ·
- `🟢 GATE CI` (lint/format:check/typecheck:packages/test; conta tests; type-test ok) ·
- `👁️ VISUAL` (N/A — vocabulario) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.2. 4º Arquitecto. O dato antes do pixel. 🌳*
