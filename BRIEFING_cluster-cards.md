# BRIEFING — Vista "tarxetas-lista" (ClusterCards) + toggle + coroa

**Para:** Executor
**De:** Director
**Magnitude:** M
**Toca `@core`/`@react`/`@importers`:** NON. Cero librería.
**Changeset:** NON (só exemplo `oberon-panadeiro`).
**Base:** `origin/main` @ `918eafa` (ou HEAD actual; confirmar).

---

## 0. Contexto

GAIA agrupa os nodos en **tarxetas-lista** (título de cluster + filas `icona + label + estado`), forma **fixa** independente de cantos nodos teña o cluster. É *o mesmo grafo, render distinto*: como é UI de lista (non layout espacial), o exemplo pódea debuxar **el só** cos datos que xa ten. **Cero `@react`.**

Decisión do dono: **as dúas vistas CONVIVEN** cun toggle `vista: grafo / tarxetas`. Oberón tirará por tarxetas; a **distribución** das tarxetas é provisional ("xa veremos") → déixase **trivial de cambiar** (un só obxecto de posicións).

Confirmado contra o repo:
- Render: `<ThemeProvider><SkillTree .../></ThemeProvider>` dentro de `.ob-canvas`. O `<DetailPanel>` (F12) xa vive no `<aside>` dereito ao seleccionar nodo.
- `GROUP_COLORS` (App.tsx:31). `regions` useMemo (App.tsx:297) = `{ id, label, tag, color }[]` desde `def.groups`.
- `detailLogic.ts` exporta `TierState`, `tierRowsFor(ct,mt)`, `badgeText(ct,mt)`.
- Selección xa cableada: `onNodeClick`/`setSelectedNodeId` + `selectedNodeId`.
- Iconas en `bakerIcons.ts` (`BAKER_ICONS` + `BAKER_NODE_ICONS`).
- Root: `if (m.type === 'root') m = { ...m, size: 52 }` (App.tsx:221).

---

## 1. Alcance (todo en `examples/oberon-panadeiro/src/`)

1. **NOVO** `ClusterCards.tsx` — a vista tarxetas (presentacional).
2. **NOVO** `cardLogic.ts` — helper puro `rowState` + `rowBadge` (estado por fila), para a sonda.
3. **EDIT** `App.tsx` — toggle `vista`, render condicional, preparar props, **coroa** no root.
4. **EDIT** `bakerIcons.ts` — engadir a icona `crown`.
5. **EDIT** `styles.css` — estilos das tarxetas + posicións.
6. **NOVO** `__verify_cluster_cards.test.ts` — sonda.

---

## 2. `cardLogic.ts` (NOVO — puro, testable)

```ts
export type RowState = 'done' | 'actual' | 'locked'

/** Estado resumido dunha fila a partir do tier actual/máximo. */
export function rowState(currentTier: number, maxTier: number): RowState {
  if (maxTier > 0 && currentTier >= maxTier) return 'done'
  if (currentTier > 0) return 'actual'
  return 'locked'
}

/** Texto compacto do badge da fila: '✓' se completado, senón 'ct/mt'. */
export function rowBadge(currentTier: number, maxTier: number): string {
  return currentTier >= maxTier && maxTier > 0 ? '✓' : `${currentTier}/${maxTier}`
}
```

---

## 3. `ClusterCards.tsx` (NOVO — presentacional, cero estado propio)

Props (datos preparados por App; o compoñente non toca o engine):
```ts
import type { IconDef } from '@yggdrasil-forge/react'

interface CardMember {
  readonly id: string
  readonly label: string
  readonly icon: IconDef | undefined
  readonly currentTier: number
  readonly maxTier: number
}
interface CardGroup {
  readonly id: string
  readonly label: string
  readonly color: string
  readonly members: readonly CardMember[]
}
interface ClusterCardsProps {
  readonly groups: readonly CardGroup[]
  readonly crownLabel: string                 // "Panadeiro/a"
  readonly crownIcon: IconDef | undefined     // a coroa
  readonly selectedNodeId: string | undefined
  readonly onRowClick: (id: string) => void
}
```
Render:
- Contenedor relativo a pantalla completa do lenzo.
- **Coroa** no centro (círculo + `crownIcon` + `crownLabel`).
- Unha **tarxeta por grupo**, posicionada segundo `CARD_POSITIONS` (ver §5). Cada tarxeta:
  - **barra de título**: franxa coa `color` do grupo + `label` en maiúsculas.
  - **filas** (`members`): por cada membro, unha fila clicable:
    - icona pequena (renderizar o `IconDef` inline: `<svg viewBox="0 0 24 24">` + `<path d fill="none" stroke="currentColor" stroke-width="2" .../>` por cada path mode 'stroke'; `currentColor` = `group.color`). Se `icon` é `undefined`, oco baleiro.
    - `label`.
    - badge á dereita: `rowBadge(currentTier, maxTier)`; cor segundo `rowState` (done=verde, actual=ámbar, locked=gris).
    - `onClick={() => onRowClick(member.id)}`. Resaltar a fila se `member.id === selectedNodeId`.
- **Liñas finas** opcionais coroa→tarxeta (decorativas; se complican, omitir).
- Sen `<form>`. Interacción con `onClick`.

> O compoñente é **presentacional puro**: toda a resolución de datos (tier, icona) faina App e pásaa nas props. Así a sonda proba `cardLogic` e App, e o compoñente queda trivial.

---

## 4. `App.tsx` (EDIT)

### 4a. Estado da vista
```ts
const [view, setView] = useState<'grafo' | 'tarxetas'>('grafo')
```
(Default `'grafo'` = comportamento actual sen sorpresa. Para que abra en tarxetas, cambiar a `'tarxetas'` — unha palabra.)

### 4b. Toggle na barra (primeiro control, antes de "Layout")
```tsx
<label>
  vista:{' '}
  <select value={view} onChange={(e) => setView(e.target.value as 'grafo' | 'tarxetas')}>
    <option value="grafo">grafo</option>
    <option value="tarxetas">tarxetas</option>
  </select>
</label>
```

### 4c. Ocultar os controis que só aplican ao grafo cando `view==='tarxetas'`
Envolver en `{view === 'grafo' && ( … )}` os controis: **Layout, Forma intra-cluster, inner/outer/lengthMode/compensar, cor por cluster, topoloxía, voltear, regions, etiquetas**. Deixar visibles sempre: **vista** e **fondo**. (Evita mandos mortos na vista tarxetas.)

### 4d. Render condicional dentro de `.ob-canvas`
```tsx
<ThemeProvider theme={builtTheme}>
  {view === 'grafo' ? (
    <SkillTree /* ...props actuais... */ />
  ) : (
    <ClusterCards
      groups={cardGroups}
      crownLabel="Panadeiro/a"
      crownIcon={getIcon('crown')}
      {...(selectedNodeId !== undefined ? { selectedNodeId } : {})}
      onRowClick={onNodeClick}
    />
  )}
</ThemeProvider>
```
(`getIcon` impórtase de `@yggdrasil-forge/react`; a coroa rexístrase en §6.)

### 4e. Preparar `cardGroups` (useMemo)
Desde `def.groups` (ou `regions`) + `tree.nodes` + `engine` + iconas:
```ts
const cardGroups = useMemo<CardGroup[]>(() => {
  return (def.groups ?? []).map((g) => ({
    id: g.id,
    label: g.label ?? g.id,
    color: regionColors[g.id] ?? GROUP_COLORS[g.id] ?? '#999999',
    members: tree.nodes
      .filter((n) => n.group === g.id)
      .map((n) => {
        const slug = BAKER_NODE_ICONS[n.id]
        return {
          id: n.id,
          label: typeof n.label === 'string' ? n.label : (n.label?.gl ?? n.id),
          icon: slug !== undefined ? BAKER_ICONS[slug] : undefined,
          currentTier: engine.getNodeState(n.id)?.currentTier ?? 0,
          maxTier: n.maxTier ?? 1,
        }
      }),
  }))
}, [/* tree, regionColors, engine snapshot */])
```
> Incluír nas deps o que xa fai reactivo o resto (a subscrición `useSyncExternalStore`/snapshot do engine), para que ao subir tier dende o DetailPanel as filas das tarxetas se actualicen. Confirmar a forma de `n.label` (string vs i18n) e adaptar.

### 4f. Coroa no root (App.tsx:221)
```ts
if (m.type === 'root') m = { ...m, size: 52, icon: 'crown' }
```

---

## 5. `styles.css` (EDIT) — tarxetas + posicións

- Tarxeta: `.ob-card` (rect redondeado, fondo escuro semi-opaco, bordo na cor do grupo), `.ob-card__title` (barra coa cor do grupo), `.ob-card__row` (flex: icona + label + badge; hover/seleccionado resaltado).
- **Posicións fáciles de cambiar** (a distribución é provisional): un só obxecto, p.ex. porcentaxes respecto ao lenzo. Empezar coa disposición do mock (pétalas arredor da coroa):
```ts
// en ClusterCards.tsx ou App.tsx — editable nun sitio:
const CARD_POSITIONS: Record<string, { left: string; top: string }> = {
  panadeiro_forno_masas:       { left: '50%', top: '8%'  },
  panadeiro_tempos_fermentacion:{ left: '82%', top: '38%' },
  panadeiro_sabor_creatividade:{ left: '70%', top: '82%' },
  panadeiro_resistencia_oficio:{ left: '30%', top: '82%' },
  panadeiro_materia_prima:     { left: '18%', top: '38%' },
}
```
Cada tarxeta `position:absolute; transform:translate(-50%,-50%)` co seu `left/top`. Cambiar a distribución = editar este obxecto. Coroa centrada (`50%/50%`).

---

## 6. `bakerIcons.ts` (EDIT) — coroa

Engadir a `BAKER_ICONS`:
```ts
crown: { paths: [{ d: 'M3 9L6 19H18L21 9L15 13L12 7L9 13L3 9ZM2 7A1 1 0 1 1 4 7A1 1 0 1 1 2 7ZM11 5A1 1 0 1 1 13 5A1 1 0 1 1 11 5ZM20 7A1 1 0 1 1 22 7A1 1 0 1 1 20 7Z', mode: 'stroke' }] },
```
(Xa se rexistra co resto en `registerIcons(BAKER_ICONS)`. Validada: SVG path correcto, dentro do viewBox.)

---

## 7. Sonda — `__verify_cluster_cards.test.ts` (NOVO)

```ts
import { TreeEngine } from '@yggdrasil-forge/core'
import { importGaiaProfession, type GaiaProfession } from '@yggdrasil-forge/importers'
import { describe, expect, it } from 'vitest'
import { BAKER_ICONS, BAKER_NODE_ICONS } from './bakerIcons.js'
import { rowBadge, rowState } from './cardLogic.js'
import panadeiro from './panadeiro.fixture.json'

describe('ClusterCards — datos e lóxica de fila', () => {
  const def = importGaiaProfession(panadeiro as unknown as GaiaProfession)
  const engine = new TreeEngine(def)

  it('rowState: locked/actual/done', () => {
    expect(rowState(0, 3)).toBe('locked')
    expect(rowState(1, 3)).toBe('actual')
    expect(rowState(3, 3)).toBe('done')
  })
  it('rowBadge: ct/mt ou ✓', () => {
    expect(rowBadge(0, 3)).toBe('0/3')
    expect(rowBadge(3, 3)).toBe('✓')
  })
  it('cada grupo ten membros e cada membro icona resoluble', () => {
    for (const g of def.groups ?? []) {
      const members = def.nodes.filter((n) => n.group === g.id)
      expect(members.length, `grupo ${g.id} baleiro`).toBeGreaterThan(0)
      for (const n of members) {
        const slug = BAKER_NODE_ICONS[n.id]
        expect(slug, `sen slug: ${n.id}`).toBeDefined()
        expect(BAKER_ICONS[slug!], `sen icona: ${slug}`).toBeDefined()
      }
    }
  })
  it('a coroa está rexistrada en BAKER_ICONS', () => {
    expect(BAKER_ICONS.crown).toBeDefined()
  })
})
```
Execución manual: `pnpm vitest run examples/oberon-panadeiro/src/__verify_cluster_cards.test.ts`.

---

## 8. Verificación
`HUSKY=0`: `lint:fix → format → lint → format:check → typecheck → test → build`. Turbo `--force`.
- Sonda verde + sondas existentes (icons, detailpanel) seguen verde.
- `vite build` OK.
- **Visual** (A.6.36): toggle grafo↔tarxetas; premer unha fila → abre o Inspector; subir nivel no Inspector → o badge da fila actualízase. Crosscheck con Agarfal (a distribución é provisional).

---

## 9. Cousas que o Executor debe verificar / cazar
1. **`n.label`**: string ou i18n? Adaptar a resolución no `cardGroups` (e na coroa).
2. **Reactividade**: ao subir tier no DetailPanel, as filas das tarxetas deben actualizarse → confirmar que `cardGroups` depende do snapshot do engine (mesma subscrición que xa usa App).
3. **`def.groups`**: confirmar a forma (`id`, `label`) e que existe; se non, derivar grupos de `regions`.
4. **`getIcon`/`IconDef`** impórtanse de `@yggdrasil-forge/react` (xa exportados).
5. **Render do IconDef inline**: respectar `mode` ('stroke' → `fill=none stroke=currentColor`; 'fill' → `fill=currentColor`), `viewBox` default `0 0 24 24`.
6. **Controis ocultos** en `view==='tarxetas'`: que non queden referencias a estados que rompan (os `useState` seguen existindo; só se oculta a UI).
7. Liñas exactas (buscar por contido, non por número).

---

## 10. Fóra de alcance
- Nada en `@core`/`@react`/`@importers`. Se aparece a tentación de promover `ClusterCards` a `@react`, **parar e escalar**: primeiro vive no exemplo (§13); promóvese só se outro exemplo o pide.
- Sen changeset.
- A **distribución** das tarxetas é provisional: a do mock é punto de partida, **non** invertir tempo en afinala (Agarfal decidiraa despois).
- Sen barra de afinidade, sen "como medra", sen textos por nivel (segue bancado).
