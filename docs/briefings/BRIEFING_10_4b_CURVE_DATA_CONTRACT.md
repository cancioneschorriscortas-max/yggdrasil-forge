# BRIEFING — sub-fase F10.4b (curva/routing = contrato de datos)

> **4º Arquitecto (Director) → Executor.**
> **A xeometría dos edges baixa ao contrato de datos.** En F10.4 a curva
> aplicábase vía un prop só-de-React (`SkillTree.curve`). Iso é presentación;
> a **xeometría** (curva, routing) debe viaxar co `TreeDef` para que o Studio,
> os exportadores e calquera renderer a respecten. 10.4b move a curva a
> **`LayoutConfig.curve`** (canónica) + **routing por-edge** vía
> **`EdgeStyle.routing`**, aplicados por **`computeLayout`**. O prop
> `SkillTree.curve` **sobrevive como override de presentación** (gaña se se
> pasa). Pecha a DT aberta en F10.4. Publicable → `@core` **minor**.
> **Human visual check** (lixeiro: a árbore debe verse igual que F10.4 +
> un edge orthogonal de mostra).

---

## 1. Principio (decisión arquitectónica — MASTER A.6.20)

> **Curva/routing = contrato de datos** (`LayoutConfig.curve`,
> `EdgeStyle.routing`), **non** prop de React. Razón: a xeometría debe viaxar
> co `TreeDef` (Studio edítao, exportadores sérianno, calquera renderer
> respéctao). O **tema** (cores) si é runtime vía `ThemeProvider`; a
> xeometría, non. O prop `SkillTree.curve` queda como **override** opcional de
> presentación (prop > dato).

## 2. Estado á entrada (verificado polo Director)

- `CurveStyle` = `'straight' | 'diagonal-vertical' | 'diagonal-horizontal' |
  'radial' | 'orthogonal'` (en `PathBuilder.ts`). ('chain' NON existe; non se
  engade aquí.)
- `LayoutConfig { type: string; [key: string]: unknown }` (index signature →
  admite engadir `curve?` tipado sen romper).
- `computeLayout(treeDef, registry, locale)` → `engine.compute(treeDef)`. **NON**
  aplica `buildPaths` (paths rectos do layout).
- `buildPaths(layoutResult, style, opts)` aplica **un** `CurveStyle` a **todos**
  os edges (tree-wide). Existe un helper por-edge `buildPath(style, src, tgt,
  opts)` (privado en `PathBuilder.ts`).
- `SkillTree.curve?` prop → aplica `buildPaths(layoutResult.value, curve)` tras
  `computeLayout`, só se se pasa.
- `EdgeStyle` = color/width/dashPattern/glow/animated/**directed** (F10.4). Sen
  `routing`.

## 3. Decisións (NON discutible)

1. **`LayoutConfig.curve?: CurveStyle`** (tipado; Zod opcional).
2. **`EdgeStyle.routing?: CurveStyle`** (override por-edge; Zod opcional).
3. **`computeLayout` aplica routing** tras `engine.compute`: para cada edge,
   `resolved = edge.style?.routing ?? treeDef.layout.curve`; se `resolved`
   está definido **e ≠ 'straight'**, reconstrúe ese edge co helper por-edge;
   senón déixao recto. **Retrocompatible**: sen `curve`/`routing`, paths
   rectos coma hoxe.
4. **`SkillTree.curve` prop = override de presentación** (gaña sobre o dato).
   A lóxica actual (`curve !== undefined ? buildPaths(...) : layoutResult.value`)
   **xa** o consegue: se hai prop, aplica tree-wide por riba do que veña de
   `computeLayout`; se non, usa o resultado de `computeLayout` (que xa trae a
   curva do dato). Probablemente **só hai que actualizar o JSDoc** + verificar.
5. **Reutilizar `buildPath`** (helper por-edge existente); non duplicar
   xeometría. Exportar/expor o mínimo necesario.

## 4. Tarefas (T0–T6)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional.

### T0 — Preflight + GREP (obrigatorio, reporta)
HEAD = `origin/main` (`c275965`). Identidade git. GREP e reporta:
- Firma e corpo de `computeLayout` (punto exacto onde inserir a aplicación de
  routing; devolve `Result<LayoutResult>` → aplicar sobre o `.value` ok).
- `buildPath` (helper por-edge): firma, se é exportable/exportado, e
  `PathBuilderOptions` (tension/center/cornerRatio) — para pasar opts coherentes.
- Esquemas **Zod** de `LayoutConfig` e `EdgeStyle` (onde engadir `curve`/`routing`).
- Confirmar a forma de `treeDef.layout` e `treeDef.edges` accesibles dentro de
  `computeLayout`.

### T1 — core: tipos + Zod
- `tree.ts`: `LayoutConfig.curve?: CurveStyle` (importar tipo; doc:
  «Estilo de curva por defecto dos edges»).
- `edge.ts`: `EdgeStyle.routing?: CurveStyle` (doc: «Override de curva
  por-edge; gaña sobre LayoutConfig.curve»).
- Zod de ambos (`curve`/`routing` = enum opcional dos valores de `CurveStyle`).
- Type-tests de aliñación tipo↔schema se ese patrón existe no repo.

### T2 — core: `computeLayout` aplica routing
- Novo helper puro en `PathBuilder.ts` (ex. `applyEdgeRouting(layoutResult,
  treeDef, opts?)`): itera `treeDef.edges`, resolve
  `edge.style?.routing ?? treeDef.layout.curve`, e se procede reconstrúe ese
  edge co `buildPath`. Devolve novo `LayoutResult` (inmutable, sen mutar).
  - Edges sen routing resolto ou `'straight'` → quedan como están (rectos).
  - Centro para 'radial': usar bounds do layout (centerX/Y) se aplicable.
- `computeLayout`: tras `engine.compute(treeDef)` ok, devolver
  `ok(applyEdgeRouting(result.value, treeDef, opts))`.
- Tests: tree-wide curve (todos curvos); routing por-edge (un edge distinto);
  override (edge.routing gaña sobre layout.curve); sen nada (rectos); kind
  correcto por estilo (incl. 'orthogonal' → polyline/right-angle).

### T3 — react: `SkillTree` (override de presentación)
- Verificar que a lóxica actual segue correcta (prop gaña). Actualizar **JSDoc**
  do prop `curve`: «Override de presentación; o canónico é `LayoutConfig.curve`
  / `EdgeStyle.routing` (aplicados por `computeLayout`). Se se pasa, aplica
  tree-wide por riba do resultado do layout.»
- Se hai algún test que asumía «computeLayout devolve rectos», **actualizalo**
  (agora pode traer curva se o treeDef a define).

### T4 — demo
- Mover a curva: `rpgTreeDef.layout.curve = 'diagonal-vertical'` (canónica).
- **Quitar** o prop `curve` do `<SkillTree>` no `App.tsx` (xa vén do dato).
- **Demostrar routing por-edge**: marcar 1 edge con
  `style: { routing: 'orthogonal' }` (ex. unha rama lateral) para ver o
  contraste de estilos na mesma árbore.

### T5 — docs (MASTER + RENDERER-STATE)
- `MASTER.md`: engadir **A.6.20** co principio de §1.
- `RENDERER-STATE.md`: marcar **10.4b ✅**; pechar a DT «routing por-edge /
  curve via LayoutConfig» do backlog; nota de que `SkillTree.curve` queda como
  override.

### T6 — tests + changeset + commit
- Gate verde (lint→format→typecheck:packages→test; conta tests).
- **Build multi-paquete**: lembrar `pnpm turbo run build --filter=@react --force`
  (NON `pnpm --filter @react build`) porque `@core` cambia — DTS interdependente
  (A.6.18).
- Changeset `.changeset/f10-4b-curve-data-contract.md` →
  `@yggdrasil-forge/core` minor:
  `feat(core): LayoutConfig.curve + EdgeStyle.routing applied by computeLayout (edge geometry in the data contract) (F10.4b)`
- Copia este briefing a `docs/briefings/BRIEFING_10_4b_CURVE_DATA_CONTRACT.md`.
- Commit único + `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/types/tree.ts                          (M)
packages/core/src/types/edge.ts                          (M)
packages/core/src/engine/<zod LayoutConfig/EdgeStyle>.ts (M)   ← T0
packages/core/src/engine/layouts/PathBuilder.ts          (M)   ← applyEdgeRouting
packages/core/src/engine/layouts/computeLayout.ts        (M)
packages/core/__tests__/<pathbuilder/computeLayout/schema>.test.ts (M/A)
packages/react/src/SkillTree.tsx                         (M, JSDoc/min)
packages/react/__tests__/SkillTree.*.test.tsx            (M, se procede)
examples/react-demo/src/tree-def.ts                      (M)
examples/react-demo/src/App.tsx                          (M)
docs/architecture/MASTER.md                              (M)
docs/architecture/RENDERER-STATE.md                      (M)
.changeset/f10-4b-curve-data-contract.md                 (A)
docs/briefings/BRIEFING_10_4b_CURVE_DATA_CONTRACT.md     (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 6. Que NON facer
- ❌ NON eliminar o prop `SkillTree.curve` (queda como override).
- ❌ NON duplicar xeometría: reutilizar `buildPath`.
- ❌ NON engadir 'chain' a `CurveStyle` (fóra de alcance).
- ❌ NON `curve`/`routing` obrigatorios (rompe; opcionais + retrocompatibles).
- ❌ NON `pnpm --filter @react build` (usa turbo --force; A.6.18).
- ❌ NON inventar API (GREP T0).

## 7. Human visual check
A árbore debe verse **igual que F10.4** (edges curvos), agora dirixida polo
**dato** (`layout.curve`), non polo prop; **+** o edge marcado `orthogonal`
debe renderizarse en **ángulos rectos** fronte aos curvos. Visual check
**pendente de Agarfal**.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T6) · `📂 DIFF` (== §5) ·
- `🔎 GREP T0` (computeLayout, buildPath, Zod schemas) ·
- `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.4b. 4º Arquitecto. A xeometría, no dato; o tema, no runtime. 🌳*
