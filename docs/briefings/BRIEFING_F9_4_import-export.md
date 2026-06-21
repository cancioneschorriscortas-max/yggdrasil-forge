# BRIEFING — Sub-fase F9.4 · Import xenérico + Export `TreeDef` → JSON/YAML

> **Para o Executor.** Este documento é autocontido: asume **contexto cero**.
> Lée todo antes de tocar nada. Se algo do estado real non coincide co que
> aquí se describe (T0), **para e reporta ao Director**; non improvises.
>
> **Director:** 5º Arquitecto · **Fase:** 9 (Encaixe de datos) · **Sub-fase:** 9.4
> **Esforzo:** M · **Toca @core?** ❌ NON (só `@importers` e `@exporters`)
> **Changeset:** minor (importers + exporters)

---

## 0. Contexto en 90 segundos

**Yggdrasil Forge** é un motor open-source de *progression graphs* (skill
trees / tech trees / árbores de aprendizaxe) en TypeScript estrito. Monorepo
pnpm + Turborepo + Biome + Vitest. O motor (`@yggdrasil-forge/core`) é puro;
hai paquetes satélite (`react`, `importers`, `exporters`, `validators`…).

**Doutrina (lei do proxecto):** *build narrow, design wide*. Entregamos o que
o cliente cero (Oberón, app educativa) precisa, pero **deseñamos para non
pecharlle a porta a xogos nin a Duolingo**. Test que pasa cada decisión:
*«¿isto pecharíalle a porta a un dev de videoxogos ou de Duolingo?»* Se si →
rexéitase e búscase a versión xenérica.

**Onde estamos en F9.** F9.1 (campo `tiers` en `NodeDef`) e F9.3 (importador
GAIA `importGaiaProfession`) **xa están feitos e en `main`** con tests. O que
falta para pechar F9 é **9.4**: a parte xenérica de import e o export.

**Obxectivo de 9.4 (esta sub-fase):**

1. **Export** — serializar un `TreeDef` a **JSON** e a **YAML** (paquete `@exporters`).
2. **Import xenérico** — `importTree(data, mapping)` design-wide (calquera forma
   de entrada, non só GAIA) + *identity import* (`importTreeFromJson` /
   `importTreeFromYaml`: cargar un documento que xa ten forma de `TreeDef`).
3. **(Opcional)** Helper de coherencia canónica (resto de 9.2). Só se 1–2 quedan limpos.

---

## 1. CONVENCIÓNS DURAS (lée isto ou romperás o gate)

- **Biome estrito.** `noExplicitAny` = **error** (cero `any`). Sen `!`
  (non-null assertion). `useImportType` = error → usa `import type { ... }`
  para tipos. Nada de `delete`. Dot-notation sobre bracket cando se poida.
- **`exactOptionalPropertyTypes`.** Para engadir un campo opcional só cando
  existe, **usa spread condicional**, non asignar `undefined`:
  ```ts
  ...(x !== undefined ? { campo: x } : {})
  ```
  (Patrón xa usado en todo `gaia.ts`; imítao.)
- **`noUncheckedIndexedAccess`.** Todo acceso por índice é `T | undefined`;
  encadea con `?.` ou comproba antes.
- **Casts.** `as` está permitido (non é `any`); úsao só nas fronteiras
  documentadas que se indican abaixo, nunca por comodidade.
- **NUNCA heredocs en Git Bash para crear ficheiros `.ts`** (corrompe os
  genéricos). Crea ficheiros con `node -e "require('fs').writeFileSync(...)"`
  ou un script Python en `/tmp/ygg-exec/` (`encoding='utf-8'`, `newline='\n'`).
- **Clone fresco** antes de empezar. **`HUSKY=0`** se traballas nun bot/CI.
- **Cero regresión global:** os tests que xa pasan deben seguir pasando.
  É traballo **aditivo**.

---

## 2. T0 — VERIFICACIÓN EMPÍRICA (grep antes de prescribir)

Executa e confirma que o estado de partida é o esperado. **Se algo non cadra, para.**

```bash
cd <repo>

# (a) F9.3 feito: importador GAIA presente
grep -n "export function importGaiaProfession" packages/importers/src/gaia.ts

# (b) F9.1 feito: NodeTierInfo + NodeDef.tiers
grep -n "NodeTierInfo\|readonly tiers" packages/core/src/types/node.ts

# (c) exporters é scaffold baleiro (só VERSION); configs xa cableados
cat packages/exporters/src/index.ts
ls packages/exporters/{tsup.config.ts,vitest.config.ts,tsconfig.json}

# (d) yaml NON está en ningún package.json
grep -rn "\"yaml\"" packages/*/package.json || echo "OK: yaml ausente"

# (e) Exports que imos consumir existen
grep -n "ok,\|err,\|type Result\|YggdrasilError\|ErrorCode\|SCHEMA_VERSION" packages/common/src/index.ts
grep -n "validateTreeDef" packages/importers/__tests__/gaia.test.ts   # confírmase que vén de @core
```

Esperado: (a) e (b) ✅ presentes; (c) `index.ts` só exporta `VERSION='0.0.0'`;
(d) yaml ausente; (e) `ok`/`err`/`Result`/`YggdrasilError`/`ErrorCode`/
`SCHEMA_VERSION` exportados desde `@yggdrasil-forge/common`, `validateTreeDef`
desde `@yggdrasil-forge/core`.

---

## 3. T1 — Engadir a dependencia `yaml`

`yaml` é runtime (pure-JS, sen build script → non necesita `allowBuilds`).
Vai a `dependencies` directas (o `catalog:` é só para devDeps compartidas).

**`packages/exporters/package.json`** — engadir bloque `dependencies`
(actualmente non existe) **antes** de `devDependencies`:
```json
  "dependencies": {
    "@yggdrasil-forge/core": "workspace:*",
    "yaml": "^2.9.0"
  },
```

**`packages/importers/package.json`** — engadir `yaml` ao `dependencies`
existente (que xa ten `@common` e `@core`):
```json
  "dependencies": {
    "@yggdrasil-forge/common": "workspace:*",
    "@yggdrasil-forge/core": "workspace:*",
    "yaml": "^2.9.0"
  },
```

Logo: `pnpm install` (resolve o lockfile).

---

## 4. T2 — EXPORT (`@yggdrasil-forge/exporters`)

### 4.1 Novo ficheiro `packages/exporters/src/serialize.ts`

```ts
// ── INICIO: F9.4 — serialización de TreeDef (JSON/YAML) ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { stringify as stringifyYaml } from 'yaml'

/** Opcións de exportación a JSON. */
export interface JsonExportOptions {
  /** Saída identada (lexible) vs compacta. Default: true. */
  readonly pretty?: boolean
  /** Espazos de identación cando `pretty`. Default: 2. */
  readonly indent?: number
}

/**
 * Serializa un `TreeDef` a unha cadea JSON.
 *
 * Determinista e sen perda: as claves `undefined` ómitense (igual que nun
 * `TreeDef` construído), polo que `JSON.parse(exportTreeToJson(t))` é
 * estruturalmente igual a `t`. Round-trip cos importadores.
 */
export function exportTreeToJson(tree: TreeDef, options?: JsonExportOptions): string {
  const pretty = options?.pretty ?? true
  const indent = options?.indent ?? 2
  return JSON.stringify(tree, null, pretty ? indent : undefined)
}

/**
 * Serializa un `TreeDef` a unha cadea YAML (paquete `yaml`, pure-JS).
 * Round-trip via `importTreeFromYaml`.
 */
export function exportTreeToYaml(tree: TreeDef): string {
  return stringifyYaml(tree)
}
// ── FIN: F9.4 ──
```

### 4.2 Cablear en `packages/exporters/src/index.ts`

**Conserva** `export const VERSION = '0.0.0'` (o smoke test depende del).
Engade dentro do bloque, antes do `// ── FIN`:
```ts
// ── F9.4: serialización ──
export { exportTreeToJson, exportTreeToYaml } from './serialize.js'
export type { JsonExportOptions } from './serialize.js'
```

### 4.3 Tests `packages/exporters/__tests__/serialize.test.ts`

Sen dependencia de `@importers` (decoupling). Constrúe un `TreeDef` mínimo a man.
Casos (cobertura 100%):
```ts
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import type { TreeDef } from '@yggdrasil-forge/core'
import { exportTreeToJson, exportTreeToYaml } from '../src/index.js'

const tree: TreeDef = {
  id: 't',
  schemaVersion: '1.0.0',
  version: '1.0.0',
  label: 'T',
  nodes: [{ id: 'a', type: 'small', label: 'A' }],
  edges: [],
  layout: { type: 'identity' },
}

describe('exportTreeToJson', () => {
  it('round-trip: JSON.parse(export) iguala o TreeDef', () => {
    expect(JSON.parse(exportTreeToJson(tree))).toEqual(tree)
  })
  it('pretty=false produce saída compacta (sen saltos de liña)', () => {
    expect(exportTreeToJson(tree, { pretty: false })).not.toContain('\n')
  })
  it('respeta indent custom', () => {
    expect(exportTreeToJson(tree, { indent: 4 })).toContain('\n    "id"')
  })
})

describe('exportTreeToYaml', () => {
  it('round-trip: parseYaml(export) iguala o TreeDef', () => {
    expect(parseYaml(exportTreeToYaml(tree))).toEqual(tree)
  })
})
```

---

## 5. T3 — IMPORT XENÉRICO (`@yggdrasil-forge/importers`)

### 5.1 Novo ficheiro `packages/importers/src/generic.ts`

```ts
// ── INICIO: F9.4 — import xenérico + identity import (JSON/YAML) ──
import {
  ErrorCode,
  err,
  ok,
  type LocalizedString,
  type Result,
  SCHEMA_VERSION,
  YggdrasilError,
} from '@yggdrasil-forge/common'
import type {
  EdgeDef,
  GroupDef,
  LayoutConfig,
  NodeDef,
  TreeDef,
} from '@yggdrasil-forge/core'
import { validateTreeDef } from '@yggdrasil-forge/core'
import { parse as parseYaml } from 'yaml'

/**
 * Mapeo design-wide: describe como obter as pezas dun `TreeDef` a partir de
 * calquera forma de entrada `TInput`. O importador GAIA é UN consumidor; un
 * xogo ou un curso tipo Duolingo definen o seu propio `TreeMapping`.
 *
 * Obrigatorias (mínimo dun TreeDef): `id`, `label`, `nodes`.
 * O resto teñen defaults sensatos (edges=[], layout=identity, version='1.0.0').
 */
export interface TreeMapping<TInput> {
  readonly id: (input: TInput) => string
  readonly label: (input: TInput) => LocalizedString
  readonly nodes: (input: TInput) => readonly NodeDef[]
  readonly edges?: (input: TInput) => readonly EdgeDef[]
  readonly groups?: (input: TInput) => readonly GroupDef[]
  readonly rootNodeId?: (input: TInput) => string | undefined
  readonly metadata?: (input: TInput) => Readonly<Record<string, unknown>> | undefined
  readonly version?: (input: TInput) => string
  readonly layout?: (input: TInput) => LayoutConfig
}

/**
 * Importa calquera entrada a un `TreeDef` aplicando un `TreeMapping`.
 * Mapeo puro (sen I/O, determinista). NON valida: a validación é traballo
 * do motor (`validateTreeDef`) ou dos tests.
 */
export function importTree<TInput>(data: TInput, mapping: TreeMapping<TInput>): TreeDef {
  const rootNodeId = mapping.rootNodeId?.(data)
  const groups = mapping.groups?.(data)
  const metadata = mapping.metadata?.(data)
  return {
    id: mapping.id(data),
    schemaVersion: SCHEMA_VERSION,
    version: mapping.version?.(data) ?? '1.0.0',
    label: mapping.label(data),
    ...(rootNodeId !== undefined ? { rootNodeId } : {}),
    nodes: mapping.nodes(data),
    edges: mapping.edges?.(data) ?? [],
    ...(groups !== undefined ? { groups } : {}),
    layout: mapping.layout?.(data) ?? { type: 'identity' },
    ...(metadata !== undefined ? { metadata } : {}),
  }
}

/**
 * Carga un documento que XA ten forma de `TreeDef` (a inversa de exportar):
 * parse + validación estrutural co motor. Nunca lanza: JSON inválido ou
 * estrutura incorrecta → `err` controlado.
 */
export function importTreeFromJson(json: string): Result<TreeDef> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch (e) {
    const detail = e instanceof Error ? e.message : /* v8 ignore next */ String(e)
    return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `JSON inválido: ${detail}`))
  }
  return finishImport(parsed)
}

/** Igual que `importTreeFromJson` pero para YAML. */
export function importTreeFromYaml(yaml: string): Result<TreeDef> {
  let parsed: unknown
  try {
    parsed = parseYaml(yaml) as unknown
  } catch (e) {
    const detail = e instanceof Error ? e.message : /* v8 ignore next */ String(e)
    return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `YAML inválido: ${detail}`))
  }
  return finishImport(parsed)
}

/**
 * Valida a estrutura e estreita a `TreeDef`. `validateTreeDef` devolve
 * `InferredTreeDef` (estruturalmente TreeDef; o único delta é o artefacto
 * `T | undefined` de Zod 3 vs `T?` con exactOptionalPropertyTypes). Cast
 * único e documentado nesta fronteira de confianza.
 */
function finishImport(parsed: unknown): Result<TreeDef> {
  const validation = validateTreeDef(parsed)
  if (!validation.ok) return err(validation.error)
  return ok(validation.value as TreeDef)
}
// ── FIN: F9.4 ──
```

### 5.2 Cablear en `packages/importers/src/index.ts`

Engade tras o bloque de exports de `gaia.js`:
```ts
// ── F9.4: import xenérico + identity import ──
export { importTree, importTreeFromJson, importTreeFromYaml } from './generic.js'
export type { TreeMapping } from './generic.js'
```

### 5.3 Tests `packages/importers/__tests__/generic.test.ts`

Sen dependencia de `@exporters` (decoupling). Para o round-trip de identidade
usa `JSON.stringify` / `yaml.stringify` directos. Cobertura 100% (incluído
ambos camiños de erro). Casos requiridos:

```ts
import { describe, expect, it } from 'vitest'
import { stringify as stringifyYaml } from 'yaml'
import type { NodeDef, TreeDef } from '@yggdrasil-forge/core'
import { validateTreeDef } from '@yggdrasil-forge/core'
import {
  importTree,
  importTreeFromJson,
  importTreeFromYaml,
  type TreeMapping,
} from '../src/index.js'

// ── importTree (design-wide, entrada non-GAIA) ──
interface ToyInput {
  slug: string
  title: string
  steps: { key: string; name: string }[]
}
const toyMapping: TreeMapping<ToyInput> = {
  id: (i) => i.slug,
  label: (i) => i.title,
  nodes: (i): readonly NodeDef[] => i.steps.map((s) => ({ id: s.key, type: 'small', label: s.name })),
}

describe('importTree (design-wide)', () => {
  const input: ToyInput = { slug: 'curso', title: 'Curso', steps: [{ key: 'n1', name: 'Un' }] }
  const tree = importTree(input, toyMapping)

  it('mapea id/label/nodes e aplica defaults', () => {
    expect(tree.id).toBe('curso')
    expect(tree.nodes).toHaveLength(1)
    expect(tree.edges).toEqual([])
    expect(tree.layout).toEqual({ type: 'identity' })
    expect(tree.version).toBe('1.0.0')
  })
  it('produce un TreeDef válido segundo o motor', () => {
    expect(validateTreeDef(tree).ok).toBe(true)
  })
  it('honra os mappers opcionais cando se dan', () => {
    const tree2 = importTree(input, {
      ...toyMapping,
      rootNodeId: () => 'n1',
      groups: () => [{ id: 'g', label: 'G' }],
      metadata: () => ({ source: 'toy' }),
      version: () => '2.0.0',
      edges: () => [],
    })
    expect(tree2.rootNodeId).toBe('n1')
    expect(tree2.groups).toHaveLength(1)
    expect(tree2.metadata).toEqual({ source: 'toy' })
    expect(tree2.version).toBe('2.0.0')
  })
})

// ── identity import (round-trip vía stringify nativo) ──
const sample: TreeDef = {
  id: 't', schemaVersion: '1.0.0', version: '1.0.0', label: 'T',
  nodes: [{ id: 'a', type: 'small', label: 'A' }], edges: [],
  layout: { type: 'identity' },
}

describe('importTreeFromJson', () => {
  it('round-trip dun TreeDef serializado', () => {
    const r = importTreeFromJson(JSON.stringify(sample))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual(sample)
  })
  it('JSON sintacticamente inválido → err', () => {
    const r = importTreeFromJson('{ esto non é json')
    expect(r.ok).toBe(false)
  })
  it('estrutura inválida (non é TreeDef) → err', () => {
    const r = importTreeFromJson('{}')
    expect(r.ok).toBe(false)
  })
})

describe('importTreeFromYaml', () => {
  it('round-trip dun TreeDef serializado', () => {
    const r = importTreeFromYaml(stringifyYaml(sample))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual(sample)
  })
  it('YAML inválido → err', () => {
    const r = importTreeFromYaml(': : : non válido\n  - x')
    expect(r.ok).toBe(false)
  })
})
```

> **Nota de cobertura:** se `validateTreeDef('{}')` ou o YAML inválido non
> disparan exactamente o branch esperado, axusta a entrada ata cubrir os dous
> camiños (parse-fail e validate-fail). O `/* v8 ignore next */` xa marca o
> fallback `String(e)` (inalcanzable: `JSON.parse`/`yaml` lanzan `Error`).

---

## 6. T4 — (OPCIONAL) Helper de coherencia canónica (resto de 9.2)

**Só se T1–T3 quedan limpos.** Opt-in, non lanza, non muta. Pecha a parte de
9.2 que faltaba (validar a convención `canonicalSkillId` ↔ `canonicalWeights`).

`packages/importers/src/canonical.ts`:
```ts
// ── INICIO: F9.2 — coherencia da convención canónica (opt-in) ──
import type { TreeDef } from '@yggdrasil-forge/core'

/**
 * Verifica a convención canónica de GAIA (opt-in). Regra: todo
 * `node.metadata.gaia.canonicalSkillId` debe existir como clave en
 * `tree.metadata.gaia.canonicalWeights`. Devolve a lista de problemas
 * (baleira = coherente). Non lanza; non muta. `metadata` é opaco
 * (`Record<string, unknown>`), de aí os casts documentados.
 */
export function checkCanonicalCoherence(tree: TreeDef): readonly string[] {
  const problems: string[] = []
  const treeGaia = (tree.metadata?.gaia ?? {}) as Record<string, unknown>
  const weights = (treeGaia.canonicalWeights ?? {}) as Record<string, number>
  const known = new Set(Object.keys(weights))
  for (const node of tree.nodes) {
    const nodeGaia = (node.metadata?.gaia ?? {}) as Record<string, unknown>
    const canonicalId = nodeGaia.canonicalSkillId
    if (typeof canonicalId === 'string' && !known.has(canonicalId)) {
      problems.push(
        `node "${node.id}": canonicalSkillId "${canonicalId}" non está en canonicalWeights`,
      )
    }
  }
  return problems
}
// ── FIN: F9.2 ──
```
Export en `index.ts`: `export { checkCanonicalCoherence } from './canonical.js'`.
Tests `__tests__/canonical.test.ts`: (a) árbore coherente → `[]`; (b) un nodo
con id descoñecido → 1 problema; (c) árbore sen metadata gaia → `[]`. 100%.

---

## 7. T5 — Docs + changeset

- **Changeset** `.changeset/f9-4-import-export.md`:
  ```md
  ---
  "@yggdrasil-forge/importers": minor
  "@yggdrasil-forge/exporters": minor
  ---

  F9.4: import xenérico (`importTree` + identity import JSON/YAML) e export
  `TreeDef` → JSON/YAML. Pecha a Fase 9. Aditivo, sen breaking changes.
  ```
- **`packages/exporters/README.md`** e **`packages/importers/README.md`**:
  engade unha sección curta coas novas funcións e un exemplo de uso de cada
  unha (export → string; importTreeFromJson → Result).
- **Commit message** longo e narrativo (o porqué, non só o qué): que 9.4 pecha
  F9, que o importador GAIA xa existía (9.3), e que isto engade a capa
  xenérica + serialización mantendo o decoupling entre `@importers` e
  `@exporters` (cada paquete proba a súa metade do round-trip).

---

## 8. GATE (orde exacta, todo verde)

```bash
HUSKY=0
pnpm install
pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check
pnpm turbo run typecheck --force
pnpm turbo run test --force
# Cobertura dos ficheiros novos (100/100/100/100):
pnpm --filter @yggdrasil-forge/exporters run test:coverage
pnpm --filter @yggdrasil-forge/importers run test:coverage
```

Mandato de cobertura: **100 % statements/branches/functions/lines** nos
ficheiros novos. Para branches defensivos imposibles de disparar, `/* v8 ignore
next */` co motivo (xa aplicado a un caso).

---

## 9. ENTREGA (patch)

- **NON** uses heredocs para os `.ts` (corrompe genéricos): `node -e` con
  `fs.writeFileSync` ou script Python (`encoding='utf-8'`, `newline='\n'`).
- Un só commit. Xera o patch desde a raíz do repo:
  ```bash
  git add -A && git commit  # mensaxe narrativa (§7)
  git format-patch -1 HEAD
  ```
- O Director aplicará con `git am --keep-cr` nun clone fresco. Se o teu entorno
  ten copia local deste briefing dentro do repo, bórraa antes de aplicar
  (`rm -f docs/briefings/BRIEFING_F9.4*.md`) para evitar colisións.
- Avisos de *trailing whitespace* de `git am` son non-bloqueantes.

---

## 10. CHECKLIST DE ACEPTACIÓN (F9.4 = feito)

- [ ] `yaml@^2.9.0` engadido a `@importers` e `@exporters`; `pnpm install` ok.
- [ ] `exportTreeToJson` / `exportTreeToYaml` exportados; round-trip nativo verde.
- [ ] `importTree(data, mapping)` xenérico produce `TreeDef` válido desde entrada
      **non-GAIA** (proba design-wide).
- [ ] `importTreeFromJson` / `importTreeFromYaml`: round-trip ok + ambos camiños
      de erro (parse-fail, validate-fail) → `err` controlado, nunca lanzan.
- [ ] (Opcional) `checkCanonicalCoherence` con tests.
- [ ] Gate completo verde; cobertura 100 % nos ficheiros novos.
- [ ] Changeset minor + READMEs actualizados.
- [ ] Cero regresión: a suite previa (incluído o round-trip do panadeiro de
      9.3) segue verde.

**Con F9.4 dentro, a Fase 9 (Encaixe de datos) queda PECHADA.** O seguinte é
decisión do Director (probablemente F11 layouts ou continuar polo renderer
segundo prioridade de Agarfal).

---

*Briefing F9.4 · 5º Arquitecto · pre-resolto para execución sen consulta.*
