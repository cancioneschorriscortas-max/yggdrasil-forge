# BRIEFING — sub-fase F9.3.b de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Completa o importador GAIA**: microskills → nodos, edges desde
> `conectadas`, e o round-trip completo contra a fixture **real** do
> panadeiro. Estende `gaia.ts` (F9.3.a). Publicable → engade changeset
> (acumúlase; **sen release** — Agarfal libera por lotes).

---

## 1. Contexto

`@yggdrasil-forge/importers` xa está activo (F9.3.a): mapea profesión→raíz
+ grupos→GroupDef[]. Falta mapear as **microskills** (os nodos folla) e as
relacións. Contrato e fixture: `docs/architecture/data-contracts/`. Roadmap
F9.3. Pipeline verde; 0.2.0 publicado.

## 2. Estado á entrada

`origin/main` en `f467219` (ci-green-3). `gaia.ts` con `importGaiaProfession`
que devolve `nodes:[root]`, `edges:[]`. 30 tests verdes no paquete.
**53+ sub-fases; pipeline CI/Release verde.**

## 3. Obxectivo (unha frase)

Que `importGaiaProfession` mapee tamén as microskills a `NodeDef[]` e as
`conectadas` a `prerequisites` + edges `dependency`, e que a **fixture real
do panadeiro** (5 grupos + 19 microskills) importe a un `TreeDef` válido
sen perda.

## 4. Decisións xa tomadas (verificadas — NON discutibles)

### 4.1 Mapeo microskill → `NodeDef`
| Campo NodeDef | Orixe GAIA |
|---|---|
| `id` | `m.id` |
| `type` | `'small'` (NodeType válido; microskill = nodo folla) |
| `label` | `toI18n(m.label_gl, _es, _en) ?? m.label_gl` |
| `description` | `toI18n(m.que_significa_gl, _es, _en)` (omitir se undefined) |
| `content` | `{ flavor: toI18n(m.accion_clave_gl, _es, _en) }` se accion_clave (o mantra → `content.flavor`, campo deseñado para Oberón) |
| `icon` | `m.icono` (omitir se undefined) |
| `group` | `m.grupo_id` |
| `position` | `m.posicion` (omitir se undefined) |
| `maxTier` | `options.microskillMaxTier ?? 3` (os 3 niveis; GAIA aínda non manda `niveis`, hardcode 3 acordado) |
| `prerequisites` | desde `m.conectadas` (ver 4.2) |
| `metadata` | `{ gaia: { canonicalSkillId?, video? } }` (ver 4.3) |

### 4.2 `conectadas` → `prerequisites` + edges
- **prerequisites** (runtime, MASTER §A.6.9): 
  - 0 conectadas → omitir `prerequisites`.
  - 1 → `{ type: 'node_unlocked', nodeId }`.
  - ≥2 → `{ type: 'all', conditions: [{type:'node_unlocked', nodeId}, ...] }`.
- **edges** (visual, `dependency`): por cada `prereqId` en `m.conectadas`,
  un `EdgeDef { id: `${prereqId}__${m.id}`, source: prereqId, target: m.id, type: 'dependency' }`.
- > O motor valida que `source/target`/`nodeId` apunten a nodos existentes
  > (`superRefine`). Como `conectadas` referencia outras microskills (que
  > están no `nodes`), valida. No panadeiro `conectadas` está baleiro → 0
  > edges, 0 prerequisites.

### 4.3 `metadata.gaia` do nodo microskill (conditional)
- `canonicalSkillId`: `m.skill_canonica_id` (se presente).
- `video`: só se `m.video_url` é **non baleiro**:
  `{ url: m.video_url, ...(m.video_proveedor ? { provider: m.video_proveedor } : {}) }`.
- Se ambos ausentes → **omitir `metadata`** enteiro do nodo.

### 4.4 `importGaiaProfession` actualízase
- `nodes: [buildRootNode(input), ...input.microskills.map(m => buildMicroskillNode(m, options))]`
- `edges: buildEdges(input.microskills)`
- `GaiaImportOptions` gana `microskillMaxTier?: number`.
- O resto (root, groups, metadata.gaia da árbore, layout) **non cambia**.

### 4.5 Fixture e tests
- Copia `docs/architecture/data-contracts/panadeiro.fixture.json` →
  `packages/importers/__tests__/fixtures/panadeiro.fixture.json` (verbatim;
  o paquete debe ser auto-contido para CI).
- Os 2 tests de F9.3.a titulados "nesta sub-fase" (`nodes só contén o
  raíz`, `edges baleiros`) **renoméanse** a "con 0 microskills, …" (seguen
  válidos co input de 0 microskills; só o nome era temporal).

### 4.6 Changeset
`@yggdrasil-forge/importers: minor` (o importador pasa a ser funcional).
Acumúlase; **non** dispara release.

## 5. Tarefas (T0–T7)

> Edicións vía script Python en `/tmp/ygg-exec/` (utf-8, sen heredocs,
> `assert` de áncora). exactOptionalPropertyTypes: **spreads condicionais**,
> nunca `campo: undefined`.

### T0 — Preflight
Fresh clone; HEAD == `f467219`. Árbore limpa. Identidade git
(`Director (4th Architect)`).

### T1 — Estender imports en `gaia.ts`
- Áncora: `import type { GroupDef, LayoutConfig, NodeDef, TreeDef } from '@yggdrasil-forge/core'`
- Substituír por (engadir `EdgeDef`, `UnlockRule`):
```typescript
import type {
  EdgeDef,
  GroupDef,
  LayoutConfig,
  NodeDef,
  TreeDef,
  UnlockRule,
} from '@yggdrasil-forge/core'
```

### T2 — `microskillMaxTier` en `GaiaImportOptions`
- Áncora: `export interface GaiaImportOptions {`
- Engadir dentro:
```typescript
  microskillMaxTier?: number
```

### T3 — Funcións de mapeo (inserir antes de `// ── API pública ──`)
```typescript
function toPrerequisites(conectadas?: string[]): UnlockRule | undefined {
  if (conectadas === undefined || conectadas.length === 0) return undefined
  const conditions = conectadas.map((nodeId) => ({
    type: 'node_unlocked' as const,
    nodeId,
  }))
  return conditions.length === 1 ? conditions[0]! : { type: 'all', conditions }
}

function buildMicroskillNode(m: GaiaMicroskill, options?: GaiaImportOptions): NodeDef {
  const description = toI18n(m.que_significa_gl, m.que_significa_es, m.que_significa_en)
  const flavor = toI18n(m.accion_clave_gl, m.accion_clave_es, m.accion_clave_en)
  const prerequisites = toPrerequisites(m.conectadas)

  // metadata.gaia: canonicalSkillId + video (só se non baleiro)
  const gaiaMeta: Record<string, unknown> = {}
  if (m.skill_canonica_id !== undefined) gaiaMeta.canonicalSkillId = m.skill_canonica_id
  if (m.video_url !== undefined && m.video_url !== '') {
    gaiaMeta.video = {
      url: m.video_url,
      ...(m.video_proveedor !== undefined && m.video_proveedor !== ''
        ? { provider: m.video_proveedor }
        : {}),
    }
  }
  const hasGaiaMeta = Object.keys(gaiaMeta).length > 0

  return {
    id: m.id,
    type: 'small',
    label: toI18n(m.label_gl, m.label_es, m.label_en) ?? m.label_gl,
    ...(description !== undefined ? { description } : {}),
    ...(flavor !== undefined ? { content: { flavor } } : {}),
    ...(m.icono !== undefined ? { icon: m.icono } : {}),
    group: m.grupo_id,
    ...(m.posicion !== undefined ? { position: m.posicion } : {}),
    maxTier: options?.microskillMaxTier ?? 3,
    ...(prerequisites !== undefined ? { prerequisites } : {}),
    ...(hasGaiaMeta ? { metadata: { gaia: gaiaMeta } } : {}),
  }
}

function buildEdges(microskills: GaiaMicroskill[]): EdgeDef[] {
  const edges: EdgeDef[] = []
  for (const m of microskills) {
    for (const prereqId of m.conectadas ?? []) {
      edges.push({
        id: `${prereqId}__${m.id}`,
        source: prereqId,
        target: m.id,
        type: 'dependency',
      })
    }
  }
  return edges
}
```

### T4 — Actualizar `importGaiaProfession`
- Áncora: `    nodes: [buildRootNode(input)],`
- Substituír esa liña por:
```typescript
    nodes: [buildRootNode(input), ...input.microskills.map((m) => buildMicroskillNode(m, options))],
```
- Áncora: `    edges: [],`
- Substituír por:
```typescript
    edges: buildEdges(input.microskills),
```

### T5 — Fixture + tests
(a) Copia `docs/architecture/data-contracts/panadeiro.fixture.json` →
`packages/importers/__tests__/fixtures/panadeiro.fixture.json`.

(b) En `gaia.test.ts`:
- **Renomea** os 2 tests "nesta sub-fase" → "con 0 microskills, nodes = só
  raíz" e "con 0 microskills, edges baleiros" (asercións intactas).
- **Engade** un bloque `describe('microskills + conectadas')`:
  - input cunha microskill (group válido, accion_clave, skill_canonica_id,
    posicion) → o nodo ten `type:'small'`, `group`, `content.flavor`,
    `metadata.gaia.canonicalSkillId`, `maxTier === 3`.
  - input con 2 microskills onde a 2ª ten `conectadas:['ms1']` → a 2ª ten
    `prerequisites { type:'node_unlocked', nodeId:'ms1' }` **e** existe un
    edge `{source:'ms1', target:'ms2', type:'dependency'}`.
  - `options.microskillMaxTier: 5` → `maxTier === 5`.
- **Engade** `describe('round-trip fixture real panadeiro')`:
  - Carga `./fixtures/panadeiro.fixture.json` (import JSON).
  - `const result = importGaiaProfession(fixture)`.
  - `validateTreeDef(result)` → **ok** (`result.ok === true`).
  - `result.nodes` → **20** (1 raíz + 19 microskills).
  - `result.groups` → **5**.
  - `result.edges` → **0** (conectadas baleiro).
  - `metadata.gaia.canonicalWeights` → **10** entradas; `resistencia_física === 3`.
  - Spot-check `pan_amasado`: `group === 'panadeiro_forno_masas'`,
    `metadata.gaia.canonicalSkillId === 'coordinación'`,
    `content.flavor.gl` contén "A masa fala", `maxTier === 3`.

### T6 — Changeset + tracking
- `.changeset/f9-3-b-gaia-microskills.md`:
```markdown
---
'@yggdrasil-forge/importers': minor
---

feat(importers): map GAIA microskills to nodes (type, group, position, maxTier, content.flavor, prerequisites from conectadas) + dependency edges; full panadeiro fixture round-trip (F9.3.b)
```
- Copia este briefing a `docs/briefings/BRIEFING_9_3_b_GAIA_MICROSKILLS.md`.

### T7 — Gate CI + commit
- Gate completo: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`
  → as catro verdes; conta de tests **sube**.
- Cobertura do código novo en `gaia.ts` ≥90% branch.
- Anti-placeholder → cero.
- Un só commit:
```
feat(importers): map GAIA microskills + conectadas → nodes/edges, full panadeiro round-trip (F9.3.b)

- buildMicroskillNode: type small, label/description/content.flavor (accion_clave), group, position, maxTier (default 3), metadata.gaia (canonicalSkillId, video)
- conectadas → prerequisites (node_unlocked / all) + dependency edges
- importGaiaProfession: nodes [root, ...microskills], edges from conectadas
- test: microskill mapping + real panadeiro fixture (20 nodes, 5 groups, validateTreeDef ok)
- changeset @importers minor; track briefing
```
- `git format-patch -1 HEAD`.

## 6. Ficheiros esperados no diff (lista pechada)
```
packages/importers/src/gaia.ts                                 (M)
packages/importers/__tests__/gaia.test.ts                      (M)
packages/importers/__tests__/fixtures/panadeiro.fixture.json   (A: copia verbatim)
.changeset/f9-3-b-gaia-microskills.md                          (A)
docs/briefings/BRIEFING_9_3_b_GAIA_MICROSKILLS.md              (A)
```
Calquera outro = erro → **PARA e escala**.

## 7. Que NON facer
- ❌ NON cambiar o mapeo de profesión/grupos de F9.3.a (só engadir microskills/edges).
- ❌ NON poñer `tiers` (sen datos de `niveis` aínda; só `maxTier:3`).
- ❌ NON validar dentro do importador (os tests validan a saída).
- ❌ NON tocar a fixture canónica de `docs/` (cópiase, non se move).
- ❌ NON `undefined` explícito en campos opcionais.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T7) · `📂 DIFF` (== §6) ·
- `🟢 GATE CI` (lint/format:check/typecheck:packages/test, conta tests) ·
- `🧪 FIXTURE` (asercións do round-trip panadeiro: 20 nodos / 5 grupos / validateTreeDef ok) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F9.3.b. 4º Arquitecto. O importador completo: GAIA → TreeDef sen perda. 🌳*
