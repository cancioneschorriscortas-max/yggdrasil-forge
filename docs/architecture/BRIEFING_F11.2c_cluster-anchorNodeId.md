# BRIEFING — F11.2c · `memberLayout: 'cluster'` + `anchorNodeId` (estilo camareiro)

> **Para:** Executor · **De:** Director · **Esforzo:** M
> **Toca:** SÓ `@core` (`ClusteredRadialConfig` + `GroupDef` + `ClusteredRadialLayout` + tests).
> **Constrúe sobre:** `b149ee9`. **NON toca** `fan`, `list`, nin a colocación de grupos.
> **Gate:** lint + format:check + typecheck + test + cobertura `--force` (100/100/100/100 no novo).
>
> ⚠️ **O VISUAL desta fase está pendente de confirmación de Agarfal.** Non executar
> ata luz verde do Director sobre o look descrito en §0.

---

## 0. O VISUAL (camareiro) — confirmar antes de executar

Cada grupo ten un **nodo-áncora REAL** (ex. "Presenza Atenta") pegado á coroa, e os
demais membros (satélites) fanan **cara afóra** arredor del.

```
        satélite   satélite
            \        /
   coroa ──── ÁNCORA            (a áncora no punto-de-grupo; o spoke coroa→grupo cae nela)
            /        \
        satélite   satélite     (satélites a orbitRadius, en arco cara AFÓRA)
```
- A **áncora** colócase **no punto-de-grupo** (a groupRadius). Así o spoke
  coroa→grupo **remata na áncora** → a áncora queda conectada á coroa (camareiro).
- Os **satélites** van a `orbitRadius` da áncora, nun **arco centrado na dirección de
  saída** (radial cara afóra) → honra `growOutward` (A.1): o cluster abre afastándose
  do centro, nunca cara dentro.
- Os **cross-links** (a teia do camareiro) = **edges de DATO** (`semantic`), o motor
  só os posiciona. O panadeiro non ten → en cluster verase áncora+satélites **sen
  teia** ata haber datos con conexións. Correcto e esperado.

---

## 1. T0 — VERIFICACIÓN

```bash
grep -n "memberLayout\|orbitRadius\|DEFAULT_MEMBER_ARC\|groupPoint\|buildClusters" packages/core/src/engine/layouts/ClusteredRadialLayout.ts
grep -n "memberLayout\|'fan'\|'list'" packages/core/src/engine/layouts/ClusteredRadialConfig.ts
grep -nE "interface GroupDef|nodeIds|anchorNodeId" packages/core/src/types/*.ts
```
Confirma a forma de `GroupDef`, a unión `memberLayout`, e como `fan` usa `orbitRadius`
+ `DEFAULT_MEMBER_ARC`. Se difire, **para e repórtao**.

---

## 2. T1 — Modelo + Config (aditivo)

**`GroupDef`** (en `types`): engade
```ts
/** Designa un membro EXISTENTE como áncora do grupo (estilo cluster). */
readonly anchorNodeId?: string
```
Cambio aditivo, opcional, é un id que xa existe → cero cambio doutro modelo.

**`ClusteredRadialConfig`:**
```ts
readonly memberLayout?: 'fan' | 'list' | 'cluster'   // amplía a unión (engade 'cluster')
readonly clusterArc?: number                          // arco dos satélites (rad); opcional, > 0; default PI
```
`parseClusteredRadialConfig`: aceptar `'cluster'` en `memberLayout`; validar
`clusterArc` (se presente, número finito `> 0`, senón `err`). Mantén o resto igual.

---

## 3. T2 — Algoritmo (rama `cluster`)

Constante: `const DEFAULT_CLUSTER_ARC = Math.PI`.

Na rama por-cluster, engade `cluster` (sen tocar `fan`/`list`):
```ts
const clusterArc = cfg.clusterArc ?? DEFAULT_CLUSTER_ARC

// ... dentro do for de cada grupo, despois de calcular groupPoint e o spoke:
if (memberLayout === 'cluster') {
  const ids = cluster.memberIds
  if (ids.length > 0) {
    // 1) resolver áncora: anchorNodeId se é membro válido; senón o primeiro membro
    const declared = group.anchorNodeId            // (group = a GroupDef deste cluster; ver nota)
    const anchorId =
      declared !== undefined && ids.includes(declared) ? declared : ids[0]
    // 2) áncora NO punto-de-grupo (o spoke coroa→grupo cae nela)
    positions.set(anchorId as string, groupPoint)
    // 3) satélites = resto, en arco cara AFÓRA arredor da áncora (growOutward)
    const sats = ids.filter((id) => id !== anchorId)
    const S = sats.length
    for (const [j, sid] of sats.entries()) {
      if (sid === undefined) continue
      const phi = S === 1
        ? theta                                       // un só satélite: na dirección de saída
        : theta + (j - (S - 1) / 2) * (clusterArc / (S - 1))
      positions.set(sid, {
        x: groupPoint.x + orbitRadius * Math.cos(phi),
        y: groupPoint.y + orbitRadius * Math.sin(phi),
      })
    }
  }
} else if (memberLayout === 'list') {
  // ... sen cambios (growOutward de 2b-bis) ...
} else {
  // 'fan' ... sen cambios ...
}
```
> **Nota `group`:** `buildClusters` hoxe devolve `{ id, memberIds }`. Para acceder a
> `anchorNodeId` necesitas a `GroupDef`. Resólveo limpo: que `buildClusters` inclúa
> `anchorNodeId` no que devolve (lendo de `treeDef.groups`), OU mira a `GroupDef` por
> `cluster.id`. **Elixe a primeira** (engadir `anchorNodeId?` ao tipo de cluster
> interno) — máis limpo. O cluster `__ungrouped__` non ten áncora declarada → primeiro membro.

> **growOutward:** o arco dos satélites está centrado en `theta` (dirección de saída
> do centro), logo abren cara afóra. **Sen `effGroupRadius`** (eliminado en 2b-bis;
> non se reintroduce — os satélites nunca van cara o centro).

`computeEdges` (cross-links de dato), `computeBounds`, spokes, e as ramas `fan`/`list`:
**sen cambios.**

---

## 4. T3 — Tests (100/100/100/100 no novo)

**Config / modelo:**
- `memberLayout: 'cluster'` aceptado; `clusterArc` inválido (`0`/neg/`NaN`) → err; ausente → ok.
- `GroupDef.anchorNodeId` opcional compila e parséase.

**compute · `cluster`:**
- **áncora no punto-de-grupo:** con `anchorNodeId` designado → ese nodo en `groupPoint`
  exacto; o spoke coroa→grupo remata nesa posición.
- **fallback:** sen `anchorNodeId` → primeiro membro é a áncora (en groupPoint).
- **anchorNodeId inválido** (id que non é membro) → fallback ao primeiro membro.
- **satélites cara afóra (growOutward):** cada satélite máis lonxe do centro có
  groupPoint da áncora (`dist(satélite) > dist(áncora)`), repartidos no arco.
- **1 só membro:** só áncora en groupPoint, sen satélites (sen erro).
- **cross-links:** con `edges` de dato → posiciónanse (source/target); panadeiro (sen
  edges) → `edges` baleiro pero áncora+satélites colocados.

**Regresión:** `fan` e `list` idénticos (tests previos verdes).

**Integración panadeiro `cluster`:** 5 grupos, cada un coa súa áncora en groupPoint +
satélites cara afóra; recolocación sen tocar datos.

`v8 ignore start/stop` para os `continue` defensivos.

---

## 5. GATE + PATCH

```bash
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm turbo run typecheck --force
pnpm turbo run test --force
pnpm --filter @yggdrasil-forge/core run test:coverage
```
Changeset **minor** (`@core`): `memberLayout: 'cluster'` + `GroupDef.anchorNodeId`.
Patch: `git format-patch -1 HEAD`.
Commit: `feat(core): clustered-radial memberLayout 'cluster' + anchorNodeId (F11.2c)`.

---

## 6. ACEPTACIÓN

- `cluster`: áncora (designada ou primeiro membro) **no punto-de-grupo**; satélites
  en arco **cara afóra** (`growOutward`); cross-links posiciónanse se hai edges de dato.
- `anchorNodeId` opcional en `GroupDef`, fallback ao primeiro membro, robusto a id inválido.
- `fan`/`list` **idénticos** (regresión cero). Sen `effGroupRadius`.
- 100/100/100/100 no novo; cero regresión global.

> Desviación do esperado: **para e repórtao**. E lembra: **non executar sen a luz
> verde de Agarfal sobre o visual (§0)**.

---

*Briefing F11.2c · Director (5º Arquitecto) · estilo camareiro; áncora-membro designado, satélites growOutward, cross-links = edges de dato (semantic, E1).*
