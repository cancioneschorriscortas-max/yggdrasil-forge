# BRIEFING — sub-fase F10.3 (PLANO-ADAPTATIVO) de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **O nodo-orbe, versión plano-adaptativa.** Mesma anatomía (forma + anel
> de cor por estado + icono dentro + nome debaixo + padding que conta o
> raio) pero **estilo plano**: SEN glow, fill neutro/adaptativo. Elimina de
> raíz os bugs de "discos negros" e emojis invisibles. A librería renderiza
> neutro por defecto; o look dark-fantasy de Oberón será un **tema** futuro.
> Substitúe calquera F10.3 anterior (que NON está en main). Publicable →
> changeset `@react minor`. **Human visual check obrigatorio.**

---

## 1. Decisión de estilo (verificada co Director)

Tras o intento dark+glow (discos negros, emojis invisibles sobre fondo
case-negro), o estilo elixido é **plano-adaptativo**:
- **Sen `filter`/glow** (era a fonte dos bugs de contraste).
- **Fill neutro** (superficie clara/adaptativa), non escuro → os iconos
  (emoji) vense.
- **Anel** = cor de estado no `stroke` (contraste alto sobre fill neutro).
- Adapta a claro/escuro vía tokens do tema.

> O dark-fantasy de Oberón **non** se codifica no motor; será un Theme
> aplicado polo consumidor nunha sub-fase futura (coa súa pasada de
> contraste). F10.3 deixa a librería neutra e fiable.

## 2. Estado á entrada

`origin/main` en `1e2c939` (verde). **F10.2 presente** (`NodeDef.shape/size`).
**Ningún F10.3 en main** — `git reset --hard origin/main` para descartar
restos locais (as commits `2714434`/`2f5f684` da vía escura **descártanse**).

## 3. Decisións (NON discutibles)

1. **Módulo** `packages/react/src/nodeGeometry.tsx`: `resolveShape`,
   `resolveRadius`, mapas default por tipo (de F10.2), `polygonPoints`,
   `renderNodeShape`. Importado por `SkillNode` e `SkillTree`.
2. **Anatomía** (`SkillNode`): forma (`__shape`) + icono dentro (`__icon`,
   só se `node.icon`) + nome debaixo (`__label`) + progress debaixo do nome
   (`__progress`, só se existe).
3. **Estilo plano** (CSS no `SVGRenderer`): `fill` neutro adaptativo,
   `stroke` = cor de estado, anel groso, **SEN `filter`/glow**. Rename
   `__circle` → `__shape`.
4. **`viewBox` sen clipping**: `SkillTree` calcula padding = base + maxRadio
   + espazo do label.
5. **Demo**: separar emoji→`icon`; usar un **tema neutro/claro** (non o
   dragonborn escuro) para que loza limpo; CSS agnóstico de forma.
6. **Iconos**: emoji/char por agora (vense ben sobre fill neutro). Migrar a
   iconos de fonte/SVG = sub-fase futura.
7. **Oberón usa só círculos**; o resto de formas son design-wide.

## 4. Tarefas (T0–T8)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert` de áncora).
> exactOptionalPropertyTypes: spreads condicionais; cero `undefined`.

### T0 — Preflight
Fresh clone; HEAD == `1e2c939`. `git reset --hard origin/main`. Identidade git.

### T1 — `packages/react/src/nodeGeometry.tsx` (NOVO)
```typescript
import type { JSX } from 'react'
import type { NodeDef, NodeShape, NodeType } from '@yggdrasil-forge/core'

export const FALLBACK_RADIUS = 24
export const SHAPE_CLASS = 'yf-skill-node__shape'

const DEFAULT_SHAPE_BY_TYPE: Readonly<Record<NodeType, NodeShape>> = {
  root: 'circle', small: 'circle', notable: 'circle', keystone: 'hexagon',
  mastery: 'diamond', ascendancy: 'octagon', cluster: 'circle',
  gateway: 'diamond', milestone: 'square', subtree_anchor: 'hexagon', custom: 'circle',
}
const DEFAULT_RADIUS_BY_TYPE: Readonly<Record<NodeType, number>> = {
  root: 40, small: 16, notable: 26, keystone: 34, mastery: 30,
  ascendancy: 32, cluster: 22, gateway: 26, milestone: 24, subtree_anchor: 28, custom: 24,
}

export function resolveShape(node: NodeDef): NodeShape {
  return node.shape ?? DEFAULT_SHAPE_BY_TYPE[node.type] ?? 'circle'
}
export function resolveRadius(node: NodeDef): number {
  return node.size ?? DEFAULT_RADIUS_BY_TYPE[node.type] ?? FALLBACK_RADIUS
}

function polygonPoints(sides: number, r: number, rotationDeg: number): string {
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export function renderNodeShape(shape: NodeShape, r: number): JSX.Element {
  switch (shape) {
    case 'square':
      return <rect x={-r} y={-r} width={r * 2} height={r * 2} className={SHAPE_CLASS} />
    case 'diamond':
      return <polygon points={polygonPoints(4, r, -90)} className={SHAPE_CLASS} />
    case 'hexagon':
      return <polygon points={polygonPoints(6, r, -90)} className={SHAPE_CLASS} />
    case 'octagon':
      return <polygon points={polygonPoints(8, r, -67.5)} className={SHAPE_CLASS} />
    default:
      return <circle r={r} className={SHAPE_CLASS} />
  }
}
```

### T2 — `SkillNode.tsx`: módulo + anatomía
(a) Substituír `NODE_RADIUS` e calquera shape inline por:
```typescript
import { renderNodeShape, resolveRadius, resolveShape } from './nodeGeometry.js'
```
(b) Tras `const progress = instance?.progress`:
```typescript
  const shape = resolveShape(node)
  const radius = resolveRadius(node)
  const icon = node.icon
  const labelY = radius + 16
```
(c) Substituír o contido JSX (circle + label centrado + progress) por:
```tsx
      {renderNodeShape(shape, radius)}
      {icon !== undefined && (
        <text className="yf-skill-node__icon" textAnchor="middle" dominantBaseline="central" aria-hidden="true">
          {icon}
        </text>
      )}
      <text className="yf-skill-node__label" textAnchor="middle" y={labelY}>
        {resolveLabel(node)}
      </text>
      {progress !== undefined && (
        <text className="yf-skill-node__progress" textAnchor="middle" y={labelY + 16}>
          {progress}%
        </text>
      )}
```

### T3 — `SVGRenderer.tsx`: estilo PLANO (sen glow) + rename
Substituír as regras de nodo en `buildThemeRules` por (anel = stroke de
estado, fill neutro, **sen `filter`**):
```
${sel} .yf-skill-node__shape { fill: var(--yf-color-node-fill, #f4f4ef); stroke: var(--yf-color-node-locked); stroke-width: var(--yf-ring-width, 3); }
${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__shape { stroke: var(--yf-color-node-unlockable); }
${sel} .yf-skill-node[data-state="unlocked"] .yf-skill-node__shape { stroke: var(--yf-color-node-unlocked); }
${sel} .yf-skill-node[data-state="maxed"] .yf-skill-node__shape { stroke: var(--yf-color-node-maxed); }
${sel} .yf-skill-node[data-state="in_progress"] .yf-skill-node__shape { stroke: var(--yf-color-node-in-progress); }
${sel} .yf-skill-node__icon { font-size: var(--yf-font-size); }
${sel} .yf-skill-node__label { font-size: var(--yf-font-size); fill: var(--yf-color-text); }
${sel} .yf-skill-node__progress { font-size: var(--yf-font-size-small); fill: var(--yf-color-text); }
```
> NADA de `filter`/`drop-shadow`. Mantén `.yf-skill-edge` e
> `.yf-mesh-overlay__*` intactos (`yf-mesh-overlay__circle` é outra clase).

### T4 — `SkillTree.tsx`: padding que conta raio + label
- Importar `resolveRadius` de `./nodeGeometry.js`.
- Calcular e pasar o padding efectivo:
```typescript
  const maxRadius = engine.getTreeDef().nodes.reduce((m, n) => Math.max(m, resolveRadius(n)), 0)
  const effectivePadding = padding + maxRadius + 28
```
  `padding={effectivePadding}` no `<SVGRenderer>` do camiño normal.
> **GREP a API real do engine** para os nodos antes (pode ser
> `engine.getTreeDef().nodes` ou outra). NON inventes; se difire, adapta e
> indícao no reporte.

### T5 — `animations.ts`: rename
- `yf-skill-node__circle` → `yf-skill-node__shape`. Transición sobre
  `stroke` (non `fill`): `transition: stroke 0.3s ease;` (verifica o contido real).

### T6 — Demo: icono separado + tema neutro + CSS agnóstico
(a) `examples/react-demo/src/tree-def.ts`: mover o emoji do `label` a `icon`
e limpar o label. Ex.: `label:{gl:'⚔ Combate'}` → `icon:'⚔', label:{gl:'Combate',es:'Combate',en:'Combat'}`.
(b) `examples/react-demo/src/theme.ts`: cambiar a un **tema neutro/claro**
(fill claro, aneis de cor con bo contraste): por exemplo
`nodeLocked` gris medio, `nodeUnlockable` ámbar, `nodeUnlocked` verde,
`in_progress` ámbar-laranxa, `text` escuro. (Valores afinaranse no visual
check; o obxectivo é que loza limpo coma a referencia, non escuro.)
(c) `examples/react-demo/src/styles.css`: selectores agnósticos
(`.yf-skill-node__shape`), eliminar os mortos `[data-tier="root"|"keystone"]`,
e **quitar** o fondo case-negro do canvas (ou poñelo claro/neutro) para
que o estilo plano se vexa.

### T7 — Tests
- `SkillNode.shapes.test.tsx`: forma por tipo + overrides (`shape`/`size`).
- icono dentro (con/sen `icon`); label debaixo (`y` > 0).
- `animations.test.ts` e `SVGRenderer.test.tsx`: `__circle`→`__shape`; e
  **verificar que xa NON hai `drop-shadow`/`filter`** nas regras de nodo
  (se había aserción de `fill` por estado, cambiar a `stroke`).
- Gate completo verde.

### T8 — Changeset + tracking + commit
- `.changeset/f10-3-flat-orb-node.md`:
```markdown
---
'@yggdrasil-forge/react': minor
---

feat(react): flat orb node — shape with neutral fill + state-colored ring (no glow), icon inside, label below; radius-aware padding (F10.3)
```
- Copia este briefing a `docs/briefings/BRIEFING_10_3_FLAT_ORB_NODE.md`.
- Commit único:
```
feat(react): flat-adaptive orb node — ring color, icon inside, label below, no glow (F10.3)

- nodeGeometry.tsx: shared resolveShape/resolveRadius/renderNodeShape
- SkillNode: icon inside, label below the node
- SVGRenderer: flat ring model (neutral fill + state-colored stroke, NO glow), __circle→__shape
- SkillTree: padding accounts for max node radius + label
- demo: separate icon from label, neutral theme, shape-agnostic CSS
- tests updated

Flat/neutral by default; dark-fantasy is a future theme. Fixes black-disc + invisible-emoji. Visual check pending Agarfal.
```
- `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada)
```
packages/react/src/nodeGeometry.tsx                    (A)
packages/react/src/SkillNode.tsx                       (M)
packages/react/src/SVGRenderer.tsx                     (M)
packages/react/src/SkillTree.tsx                       (M)
packages/react/src/animations.ts                       (M)
packages/react/__tests__/SkillNode.shapes.test.tsx     (A)
packages/react/__tests__/animations.test.ts            (M)
packages/react/__tests__/SVGRenderer.test.tsx          (M)
examples/react-demo/src/tree-def.ts                    (M)
examples/react-demo/src/theme.ts                       (M)
examples/react-demo/src/styles.css                     (M)
.changeset/f10-3-flat-orb-node.md                      (A)
docs/briefings/BRIEFING_10_3_FLAT_ORB_NODE.md          (A)
```
Calquera outro = erro → **PARA e escala**. (`MeshOverlay.*` NON debe aparecer.)

## 6. Que NON facer
- ❌ NADA de glow/`drop-shadow`/`filter` nos nodos.
- ❌ NON fondo escuro no canvas do demo (queremos plano lexible).
- ❌ NON tocar `@core` nin `yf-mesh-overlay__circle`.
- ❌ NON inventar a API do engine (GREP — T4).
- ❌ NON migrar emoji→iconos de fonte (sub-fase futura).

## 7. Human visual check (REGRA SAGRADA)
Tras aplicar, **Agarfal** corre o demo e confirma contra a referencia plana:
- Orbes **nítidos**: anel de cor lexible, fill neutro, **sen** discos negros.
- **Icono dentro visible** (emoji sobre fill claro) e **nome debaixo** sen desbordar.
- **Sen clipping** nos bordes.
> O Executor deixa o demo listo; visual check **pendente de Agarfal**; non
> se pecha ata o seu OK.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T8) · `📂 DIFF` (== §5) ·
- `🟢 GATE CI` (lint/format:check/typecheck:packages/test; conta tests) ·
- `🔎 API ENGINE` (método real en T4) ·
- `👁️ VISUAL` (PENDENTE de Agarfal) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.3 (plano-adaptativo). 4º Arquitecto. Limpo e fiable; o escuro virá como tema. 🌳*
