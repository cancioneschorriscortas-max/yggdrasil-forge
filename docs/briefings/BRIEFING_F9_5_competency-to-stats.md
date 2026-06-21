# BRIEFING — Sub-fase F9.5 · Competencia → Stats (Capa A por skill + Capa B por categoría)

> **Para o Executor.** Autocontido, **contexto cero**. Lée todo antes de tocar.
> Se o estado real non coincide co T0, **para e reporta ao Director**.
>
> **Director:** 5º Arquitecto · **Fase:** 9.5 · **Esforzo:** M
> **Toca @core?** ❌ NON · **Toca o renderer?** ❌ NON · **Só `@importers` + tests.**
> **Changeset:** minor (@importers). **Decisión visual xa tomada por Agarfal: AS DÚAS capas.**

---

## 0. Contexto e obxectivo

**Yggdrasil Forge**: motor de *progression graphs* en TypeScript estrito
(monorepo pnpm + Turborepo + Biome + Vitest). `@yggdrasil-forge/importers`
traduce datos GAIA → `TreeDef`. A Fase 9 pechou o encaixe estrutural e sen perda
(F9.4 + F9.3.c). **F9.5 conecta a dimensión de competencia ao stats engine.**

O motor **xa ten toda a maquinaria** (non se toca):
- `TreeDef.stats?: readonly StatDef[]` — `StatDef { id, label, initial?, min?, max?, format? }`,
  `format: 'number' | 'percent' | 'currency'`.
- `NodeDef.statContributions?: readonly StatContribution[]` —
  `StatContribution { statId, op, value, perTier?, conditions? }`,
  `op: '+' | '-' | '*' | '/' | 'min' | 'max' | 'set'`.
- `StatComputer` agrega en vivo as contribucións dos nodos **desbloqueados**.
- O renderer xa ten o hook `useStat`.

F9.5 é puro **adaptador**: o importador GAIA xera os `StatDef` (na árbore) e as
`statContributions` (en cada microskill), lendo das skills canónicas que F9.3.c
xa preserva. **Modelo (decidido):**

- **Capa A — por skill canónica.** `StatDef { id: 'skill:<skillId>', label, min:0, max:<nº microskills que a desenvolven>, format:'number' }`. Cada microskill achega `{ statId:'skill:<skill_canonica_id>', op:'+', value:1 }`. → conta de desenvolvemento.
- **Capa B — por categoría.** `StatDef { id: 'cat:<categoria>', label, min:0, max:<suma de peso das microskills da categoría>, format:'number' }`. Cada microskill achega `{ statId:'cat:<categoria da súa skill>', op:'+', value:<peso da súa skill> }`. → perfil ponderado por importancia.
- `perTier`: **NON**. `conditions`: ningunha (entra ao desbloquear, por defecto).

---

## 1. CONVENCIÓNS DURAS

- Biome estrito: `noExplicitAny` = error; sen `!`; `import type` para tipos; nada de `delete`; dot-notation.
- `exactOptionalPropertyTypes`: campos opcionais vía spread condicional `...(x !== undefined ? {k:x} : {})`.
- `noUncheckedIndexedAccess`: acceso por índice é `T | undefined`; `?.` ou comprobar. `Map.get` devolve `T | undefined` → comprobar.
- **NUNCA heredocs** para `.ts` (corrompe genéricos): `node -e fs.writeFileSync` ou Python (`utf-8`, `newline='\n'`).
- Clone fresco + `HUSKY=0` en bot/CI. **Cero regresión global.**

---

## 2. T0 — VERIFICACIÓN EMPÍRICA (grep)

```bash
cd <repo>
git log -1 --oneline                       # esperado: cd0ac48 (F9.3.c)

# Tipos do motor que imos consumir
grep -n "interface StatDef" packages/core/src/types/stats.ts
grep -n "interface StatContribution\|StatContributionOp" packages/core/src/types/stats.ts
grep -n "readonly stats?:" packages/core/src/types/tree.ts
grep -n "readonly statContributions?:" packages/core/src/types/node.ts

# Estado de partida do importador
grep -n "function buildMicroskillNode\|function importGaiaProfession\|GaiaCanonicalWeight" packages/importers/src/gaia.ts
grep -n "buildStats\|statContributions" packages/importers/src/gaia.ts || echo "OK: aínda non existen (a engadir)"
```

Esperado: os 4 tipos do motor existen; `buildStats`/`statContributions` aínda non
están no importador. **Se algo difire, para.**

---

## 3. T1 — Imports de tipos (`packages/importers/src/gaia.ts`)

Engade `StatDef` e `StatContribution` ao `import type { ... } from '@yggdrasil-forge/core'`
existente (xunto a `NodeDef`, `EdgeDef`, etc.). `GaiaCanonicalWeight` xa está
definido localmente no ficheiro.

---

## 4. T2 — `buildStats` (nova función en `gaia.ts`)

Colócaa preto de `buildTreeMetadata`. `GaiaCanonicalWeight` é
`{ id, label, categoria, peso, icono? }` (xa definido no ficheiro).

```ts
function buildStats(
  input: GaiaProfession,
  skillIndex: ReadonlyMap<string, GaiaCanonicalWeight>,
): StatDef[] {
  // Capa A — por skill: max = nº de microskills que a desenvolven.
  const perSkillCount = new Map<string, number>()
  for (const m of input.microskills) {
    const sid = m.skill_canonica_id
    if (sid !== undefined && skillIndex.has(sid)) {
      perSkillCount.set(sid, (perSkillCount.get(sid) ?? 0) + 1)
    }
  }
  const skillStats: StatDef[] = input.skills.map((s) => ({
    id: `skill:${s.id}`,
    label: s.label,
    min: 0,
    max: perSkillCount.get(s.id) ?? 0,
    format: 'number',
  }))

  // Capa B — por categoría: max = suma ponderada (peso) das microskills da categoría.
  const perCatMax = new Map<string, number>()
  for (const m of input.microskills) {
    const sid = m.skill_canonica_id
    if (sid === undefined) continue
    const skill = skillIndex.get(sid)
    if (skill === undefined) continue
    perCatMax.set(skill.categoria, (perCatMax.get(skill.categoria) ?? 0) + skill.peso)
  }
  // Categorías distintas (orde estable de aparición nas skills).
  const seen = new Set<string>()
  const categoryStats: StatDef[] = []
  for (const s of input.skills) {
    if (seen.has(s.categoria)) continue
    seen.add(s.categoria)
    categoryStats.push({
      id: `cat:${s.categoria}`,
      label: s.categoria,
      min: 0,
      max: perCatMax.get(s.categoria) ?? 0,
      format: 'number',
    })
  }

  return [...skillStats, ...categoryStats]
}
```

> Nota tipos: `s.label`/`s.categoria` son `string`; `string` é un `LocalizedString`
> válido, así que valen como `StatDef.label`. O literal `format: 'number'` é
> válido porque o array está anotado `StatDef[]`.

---

## 5. T3 — `statContributions` en `buildMicroskillNode`

Engade un parámetro `skillIndex` (antes de `options`) e constrúe as contribucións.

```ts
function buildMicroskillNode(
  m: GaiaMicroskill,
  skillIndex: ReadonlyMap<string, GaiaCanonicalWeight>,
  options?: GaiaImportOptions,
): NodeDef {
  // ... (todo o corpo existente: description, flavor, prerequisites, gaiaMeta) ...

  // F9.5: contribucións a stats (Capa A + Capa B). Só se a skill se resolve.
  const statContributions: StatContribution[] = []
  const sid = m.skill_canonica_id
  if (sid !== undefined) {
    const skill = skillIndex.get(sid)
    if (skill !== undefined) {
      statContributions.push({ statId: `skill:${sid}`, op: '+', value: 1 })
      statContributions.push({ statId: `cat:${skill.categoria}`, op: '+', value: skill.peso })
    }
  }

  return {
    // ... (todos os campos existentes do return, sen tocar) ...
    ...(statContributions.length > 0 ? { statContributions } : {}),
  }
}
```

> Microskill orfa (sen `skill_canonica_id` ou cunha id que non está en
> `skillIndex`) → **sen** `statContributions`. Defensivo e correcto.

---

## 6. T4 — Cablear en `importGaiaProfession`

Constrúe o índice unha vez, pásao, e engade `stats` ao `TreeDef` (condicional).

```ts
export function importGaiaProfession(input: GaiaProfession, options?: GaiaImportOptions): TreeDef {
  const version = options?.version ?? '1.0.0'
  const layout: LayoutConfig = options?.layout ?? { type: 'identity' }
  const description = toI18n(input.epigrafe_gl, input.epigrafe_es, input.epigrafe_en)
  const skillIndex = new Map(input.skills.map((s) => [s.id, s]))   // F9.5
  const stats = buildStats(input, skillIndex)                       // F9.5

  return {
    id: input.id,
    schemaVersion: SCHEMA_VERSION,
    version,
    label: input.label,
    ...(description !== undefined ? { description } : {}),
    rootNodeId: input.id,
    nodes: [
      buildRootNode(input),
      ...input.microskills.map((m) => buildMicroskillNode(m, skillIndex, options)),  // F9.5: +skillIndex
    ],
    edges: buildEdges(input.microskills),
    groups: input.grupos.map(toGroupDef),
    ...(stats.length > 0 ? { stats } : {}),                          // F9.5
    layout,
    metadata: buildTreeMetadata(input),
  }
}
```

> `buildMicroskillNode` é interno (non exportado): o único call site é este.

---

## 7. T5 — Tests (`packages/importers/__tests__/gaia.test.ts`)

Cobertura **100/100/100/100** no engadido. `metadata`/`stats` léense con cast
como no resto do ficheiro. Casos:

**(a) `stats` xerados.** Cunha `GaiaProfession` mínima (2 skills de distinta
categoría, varias microskills), verifica:
- `tree.stats` ten un `skill:<id>` por skill, con `max` = nº de microskills que a desenvolven.
- `tree.stats` ten un `cat:<categoria>` por categoría distinta, con `max` = suma de `peso`.
- ids con prefixo `skill:` / `cat:`, `min:0`, `format:'number'`.

**(b) contribucións.** Un microskill cunha skill coñecida → `node.statContributions`
ten exactamente as dúas entradas (`skill:`, value 1; `cat:`, value = peso).
Un microskill **orfo** (skill_canonica_id ausente ou descoñecido) → **sen** `statContributions`.

**(c) round-trip real (panadeiro) — estende o bloque existente.**
- `tree.stats` ten **14** entradas (10 skills + 4 categorías: física/atencional/cognitiva/social).
- Spot-check ancla: `skill:coordinación` → `max: 2` (microskills `pan_amasado` e `pan_formado`).
- **Computa o resto contra a fixture**, non fíes os meus números sen verificar:
  conta microskills por skill e suma `peso` por categoría directamente do JSON.
- (Opcional, proba forte) constrúe un `TreeEngine` desde a árbore importada,
  desbloquea `pan_amasado` e asegura que `computedStats['skill:coordinación'] === 1`
  e `computedStats['cat:física']` aumenta no `peso` de coordinación (2). Verifica
  a API de unlock do `TreeEngine` no T0 antes; se é directa, engádeo. Se non, os
  asserts estruturais (a)/(b)/(c) abondan — a agregación xa está testeada en @core.

---

## 8. T6 — Docs + changeset

- **Changeset** `.changeset/f9-5-competency-stats.md`:
  ```md
  ---
  "@yggdrasil-forge/importers": minor
  ---

  feat(gaia): xerar stats de competencia (F9.5). O importador declara TreeDef.stats
  en dúas capas — por skill canónica (`skill:<id>`, conta) e por categoría
  (`cat:<categoria>`, ponderada por peso) — e engade statContributions a cada
  microskill. Conecta a dimensión de competencia ao StatComputer/useStat existentes.
  Cero cambios en @core. Pecha F9.5.
  ```
- **`packages/importers/README.md`:** sección curta sobre os stats xerados (ids
  `skill:` / `cat:`, semántica conta vs ponderada) cun exemplo.
- **Commit message** narrativo: que F9.5 conecta a competencia ao stats engine xa
  existente, modelo de dúas capas, só adaptador (cero @core/renderer).

---

## 9. GATE

```bash
HUSKY=0
pnpm install
pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check
pnpm turbo run typecheck --force
pnpm turbo run test --force
pnpm --filter @yggdrasil-forge/importers run test:coverage   # 100/100/100/100 no tocado
```

Cero regresión: round-trips de 9.3/9.3.c/9.4 seguen verdes. `importers` sube o
contador no nº de asserts novos.

---

## 10. ENTREGA + CHECKLIST

- Sen heredocs. Un commit, mensaxe narrativa. `git format-patch -1 HEAD`. Director
  aplica con `git am --keep-cr` en clone fresco; borra copia local do briefing antes.

- [ ] `buildStats` xera Capa A (por skill, max=conta) + Capa B (por categoría, max=suma peso).
- [ ] `buildMicroskillNode` engade as dúas contribucións; orfas sen contribucións.
- [ ] `importGaiaProfession` cablea `skillIndex` + `stats` (condicional).
- [ ] Round-trip panadeiro: 14 stats; spot-check `skill:coordinación` max=2.
- [ ] Gate verde; cobertura 100 %; cero regresión.
- [ ] Changeset minor + README.

**Con F9.5 dentro, o perfil de competencias é un valor vivo e computado** que a
capa gráfica poderá ler vía `useStat` cando se retome. Execución diferida: pode ir
despois da rolda gráfica sen problema.

---

*Briefing F9.5 · 5º Arquitecto · pre-resolto para execución sen consulta.*
