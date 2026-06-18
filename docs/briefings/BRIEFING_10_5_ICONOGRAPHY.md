# BRIEFING — sub-fase F10.5 (Iconografía: rexistro SVG + recolor)

> **4º Arquitecto (Director) → Executor.**
> **Mátanse os emojis.** Os iconos pasan de texto cru (que nin recolorea nin
> se ve en escuro) a **SVG recoloreables** resoltos por un **rexistro**.
> `node.icon` interprétase como **ID de rexistro**, con **fallback** a
> emoji/char (e URL→imaxe). Recolor vía `useTheme()` inline (patrón fiable).
> O rexistro é **singleton `Symbol.for(globalThis)`** (aplicamos A.6.17 de
> saída, senón os iconos rexistrados nun bundle non os ve o `SkillNode`
> doutro). Publicable → `@react` **minor**. **Human visual check.**
>
> **Alcance honesto:** o valor durable é a **arquitectura** (rexistro +
> recolor + integración). A **arte** dos iconos é un *starter funcional*
> (paths simples que dou eu); refinala/ampliala é dominio visual de Agarfal e
> faise trivial vía o rexistro (sen tocar o motor).

---

## 1. Estado á entrada (verificado polo Director)

- `SkillNode` (línea ~65, ~152): `const icon = node.icon` →
  `{icon !== undefined && <text className="yf-skill-node__icon">{icon}</text>}`.
- `NodeDef.icon?: string` (doc «URL, emoji, etc.»). **Non se toca o tipo.**
- **Sen infra de iconos** en `@react`/`@themes`.
- Patrón de singleton xa no repo: `ThemeProvider.tsx` (`Symbol.for` +
  `resolveThemeContext`). **Reutilizar ese patrón** para o rexistro.

## 2. Decisións (NON discutible)

1. **Rexistro singleton** vía `Symbol.for('@yggdrasil-forge/react#IconRegistry')`
   en `globalThis` (idéntico patrón a `ThemeContext`). Un só `Map<string, IconDef>`.
2. **API**: `registerIcon(id, def)`, `registerIcons(record)`, `getIcon(id)`,
   `hasIcon(id)`. Exportadas de `/index` **e** `/headless`.
3. **`IconDef`** (datos, non ReactNode — serializable/sinxelo):
   ```typescript
   export interface IconPath { readonly d: string; readonly mode?: 'fill' | 'stroke' }
   export interface IconDef { readonly viewBox?: string; readonly paths: readonly IconPath[] }
   ```
   `viewBox` default `'0 0 24 24'`. `mode` default `'fill'`.
4. **Resolución en `SkillNode`** (orde):
   - `getIcon(node.icon)` hit → render SVG do `IconDef` (recoloreado).
   - senón, `node.icon` parece URL (`/^(https?:)?\/\//`) → `<image href>`.
   - senón → `<text>` (emoji/char) — **fallback retrocompatible**.
5. **Recolor**: o `<svg>`/`<g>` do icono leva `color` = cor do icono do tema;
   os `<path>` usan `currentColor` (`fill="currentColor"` ou
   `stroke="currentColor"` segundo `mode`). Aplicar **inline** (patrón F10.3.fix).
6. **`ThemeColors.icon?`** opcional (fallback a `text`).
7. **Iconset starter** (arte funcional, ampliable): IDs semánticos cos paths
   de §4.2. Reuso permitido no demo.

## 3. Tarefas (T0–T8)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional.

### T0 — Preflight + GREP
HEAD = `origin/main` (`997e783`). Identidade git. GREP e reporta:
- Render exacto do icono en `SkillNode` (líneas; estilo do `<text>` actual,
  tamaño/fonte para dimensionar o SVG ao mesmo oco).
- Patrón `Symbol.for` de `ThemeProvider.tsx` (para clonar a estrutura).
- Puntos de export de `/index` e `/headless`.

### T1 — `icons/registry.ts` (NOVO): tipos + singleton + API
- `IconPath`/`IconDef` (§2.3).
- Rexistro singleton:
  ```typescript
  const REGISTRY_KEY = Symbol.for('@yggdrasil-forge/react#IconRegistry')
  type GlobalWithReg = { [REGISTRY_KEY]?: Map<string, IconDef> }
  const store = globalThis as unknown as GlobalWithReg
  const registry: Map<string, IconDef> = store[REGISTRY_KEY] ?? (store[REGISTRY_KEY] = new Map())
  ```
- `registerIcon(id, def)`, `registerIcons(record)`, `getIcon(id): IconDef | undefined`,
  `hasIcon(id): boolean`.

### T2 — `icons/builtin.ts` (NOVO): iconset starter + auto-rexistro
Paths starter (24×24; line = `mode:'stroke'`, fill = `mode:'fill'`). **Úsaos tal cal:**
```typescript
export const BUILTIN_ICONS: Record<string, IconDef> = {
  'crossed-swords': { paths: [{ d: 'M4 4 L20 20 M20 4 L4 20', mode: 'stroke' }] },
  shield: { paths: [{ d: 'M12 2 L20 5 V11 C20 16.5 12 22 12 22 C12 22 4 16.5 4 11 V5 Z', mode: 'fill' }] },
  sparkle: { paths: [{ d: 'M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z', mode: 'fill' }] },
  arrow: { paths: [{ d: 'M5 19 L19 5 M10 5 H19 V14', mode: 'stroke' }] },
  gem: { paths: [{ d: 'M12 3 L19 12 L12 21 L5 12 Z', mode: 'fill' }] },
  bolt: { paths: [{ d: 'M13 2 L4 14 H11 L9 22 L20 9 H13 Z', mode: 'fill' }] },
}
```
- Auto-rexistrar (`registerIcons(BUILTIN_ICONS)`) ao importar o módulo do icono
  (ou desde o barrel; garantir que se executa antes do primeiro render — ex.
  import side-effect en `index.ts`/`headless.ts`).

### T3 — `icons/IconGlyph.tsx` (NOVO ou inline en SkillNode): render do IconDef
- Compoñente puro que recibe `def: IconDef`, `size: number`, `color?: string`
  e renderiza un `<svg>` (ou `<g>` con `<svg>`/symbol) centrado, con
  `style={{ color }}` e paths con `fill="currentColor"`/`stroke="currentColor"`
  (`fill="none"` cando `mode:'stroke'`, `strokeWidth` ~2, `strokeLinecap/join`
  round). `aria-hidden`.

### T4 — `SkillNode.tsx`: resolución (rexistro → URL → texto)
- Substituír o bloque do `<text className="yf-skill-node__icon">` por:
  - `const def = node.icon !== undefined ? getIcon(node.icon) : undefined`
  - se `def` → `<IconGlyph def size={iconSize} color={iconColor} />` centrado.
  - senón se URL → `<image href={node.icon} ... />` centrada e dimensionada.
  - senón se `node.icon` → `<text ...>` (igual que hoxe; fallback emoji/char).
- `iconColor = theme?.colors.icon ?? theme?.colors.text`; `iconSize` derivado
  do raio/fontSize (coherente co oco actual do emoji).

### T5 — `theme-types.ts`: `ThemeColors.icon?`
- `readonly icon?: string` (doc «Cor dos iconos; fallback a text»). `minimal`
  pódelle dar valor (ou deixar fallback a text).

### T6 — Exports
- `/index` e `/headless`: exportar `registerIcon`, `registerIcons`, `getIcon`,
  `hasIcon`, `BUILTIN_ICONS`, e os tipos `IconDef`/`IconPath`. Garantir o
  **side-effect de auto-rexistro** dos builtin.

### T7 — Demo
- `tree-def.ts`: cambiar `node.icon` de emoji a IDs do starter, ex.:
  combat→`crossed-swords`, melee→`crossed-swords`, sword→`crossed-swords`,
  shield→`shield`, ranged→`arrow`, bow→`arrow`, crit→`sparkle`,
  whirlwind→`bolt`. **Deixar 1 nodo con emoji** (ex. un calquera) para
  **demostrar o fallback**.
- Resultado: iconos **recoloreados** segundo o tema, visibles en escuro; o
  nodo emoji segue funcionando (fallback).

### T8 — Tests + docs + changeset + commit
- Tests: rexistro (register/get/has; singleton estable); `SkillNode`
  (def→IconGlyph; URL→image; emoji→text); `IconGlyph` (mode fill/stroke;
  color aplicado).
- `MASTER.md`: nota **A.6.21** — «Rexistros compartidos (iconos, etc.) en
  paquetes multi-entry-point requiren o mesmo singleton `Symbol.for(globalThis)`
  que o Context (A.6.17), ou as entradas non se ven entre bundles.»
- `RENDERER-STATE.md`: 10.5 ✅; nota «iconset = starter funcional; arte
  refínase vía rexistro (dominio de Agarfal)»; pendente «iconos temáticos
  ricos» no backlog.
- `build`: `pnpm turbo run build --filter=@react --force` (A.6.18) se procede.
- Changeset `.changeset/f10-5-icon-registry.md` → `@yggdrasil-forge/react` minor:
  `feat(react): SVG icon registry (Symbol.for singleton) + builtin starter set + recolorable icons with emoji/URL fallback (F10.5)`
- Copia este briefing a `docs/briefings/BRIEFING_10_5_ICONOGRAPHY.md`.
- Commit único + `git format-patch -1 HEAD`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/icons/registry.ts                     (A)
packages/react/src/icons/builtin.ts                      (A)
packages/react/src/icons/IconGlyph.tsx                   (A)
packages/react/src/SkillNode.tsx                         (M)
packages/react/src/theme-types.ts                        (M)
packages/react/src/themes/minimal.ts                     (M, se procede)
packages/react/src/index.ts                              (M)
packages/react/src/headless.ts                           (M)
packages/react/__tests__/icons.*.test.tsx                (A)
packages/react/__tests__/SkillNode.*.test.tsx            (M)
examples/react-demo/src/tree-def.ts                      (M)
docs/architecture/MASTER.md                              (M)
docs/architecture/RENDERER-STATE.md                      (M)
.changeset/f10-5-icon-registry.md                        (A)
docs/briefings/BRIEFING_10_5_ICONOGRAPHY.md              (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON deseñar arte complexa: usa os paths starter de §T2 (refínase despois).
- ❌ NON romper o fallback emoji/char (retrocompatible obrigatorio).
- ❌ NON rexistro como módulo-Map normal: **Symbol.for singleton** (A.6.17/A.6.21).
- ❌ NON recolor por CSS vars/`<style>`: inline `color` + `currentColor`.
- ❌ NON cambiar `NodeDef.icon` (segue `string`).
- ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: os iconos **vense nítidos en escuro e toman a cor do
tema** (proba: cambiar `text`/`icon` no Theme Lab e ver os iconos recolorar);
o nodo deixado con emoji **segue funcionando**. Visual check **pendente de
Agarfal**. (Lembrar: a arte é starter; o importante é que recolorea e se ve.)

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T8) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` (render icono, Symbol.for patrón, exports) ·
- `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.5. 4º Arquitecto. Iconos que se acenden coa cor do tema; adeus aos emojis. 🌳*
