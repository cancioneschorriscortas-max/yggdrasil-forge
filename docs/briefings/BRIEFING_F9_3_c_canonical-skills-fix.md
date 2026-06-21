# BRIEFING — Sub-fase F9.3.c · Fix de perda: preservar skills canónicas (peche sen perda de F9)

> **Para o Executor.** Autocontido, **contexto cero**. Lée todo antes de tocar.
> Se o estado real non coincide co T0, **para e reporta ao Director**.
>
> **Director:** 5º Arquitecto · **Fase:** 9 · **Sub-fase:** 9.3.c (fix)
> **Esforzo:** S (un cambio + tests) · **Toca @core?** ❌ NON (só `@importers`)
> **Changeset:** patch · **Tipo:** fix (corrixe perda de datos no import)

---

## 0. Contexto e motivo

**Yggdrasil Forge**: motor open-source de *progression graphs* en TypeScript
estrito (monorepo pnpm + Turborepo + Biome + Vitest). `@yggdrasil-forge/core` é
o motor; `@yggdrasil-forge/importers` traduce datos externos (GAIA → `TreeDef`).

F9.4 pechou a Fase 9 a nivel **estrutural**. Na revisión do Director detectouse
**unha perda de datos** no importador GAIA que hai que corrixir para que F9
quede de verdade *sen perda* (era o seu criterio de aceptación):

- A entrada `GaiaCanonicalWeight` ten `{ id, label, categoria, peso, icono? }`.
- Pero `buildTreeMetadata` só garda `{ id: peso }` en `metadata.gaia.canonicalWeights`.
- **Tíranse `label`, `categoria` e `icono`** das 10 skills canónicas.

Iso impide que a capa gráfica (que se vai retomar a continuación) pinte cada
skill canónica coa súa categoría (física/atencional/cognitiva/social) e o seu
icono. **Este fix preserva esa información; é a peza que desbloquea a gráfica.**

**Importante:** `canonicalWeights` **mantense tal cal** (hai un test que depende
del). O fix é **aditivo**: engádese un novo campo `canonicalSkills` cos obxectos
completos. Cero breaking.

---

## 1. CONVENCIÓNS DURAS (ou rompes o gate)

- **Biome estrito:** `noExplicitAny` = error (cero `any`); sen `!`; `import type`
  para tipos (`useImportType` = error); nada de `delete`; dot-notation.
- **`exactOptionalPropertyTypes`:** campos opcionais só cando existen, vía spread
  condicional `...(x !== undefined ? { k: x } : {})`. Nunca asignar `undefined`.
- **`noUncheckedIndexedAccess`:** acceso por índice é `T | undefined`; `?.`.
- **`as`** permitido (non é `any`) só en fronteiras documentadas (ex.: acceso a
  `metadata`, que é opaco, nos tests).
- **NUNCA heredocs** para crear `.ts` en Git Bash (corrompe genéricos): usa
  `node -e "require('fs').writeFileSync(...)"` ou Python (`utf-8`, `newline='\n'`).
- **Clone fresco** + **`HUSKY=0`** en bot/CI. **Cero regresión global.**

---

## 2. T0 — VERIFICACIÓN EMPÍRICA (grep antes de tocar)

```bash
cd <repo>
git log -1 --oneline                          # esperado: fcaf726 (F9.4)

# (a) A entrada xa ten os campos; só se usa o peso
sed -n '15,21p' packages/importers/src/gaia.ts          # GaiaCanonicalWeight {id,label,categoria,peso,icono?}
grep -n "canonicalWeights\[s.id\] = s.peso" packages/importers/src/gaia.ts  # a liña que aplana

# (b) Confírmase que NON existe aínda canonicalSkills
grep -n "canonicalSkills" packages/importers/src/gaia.ts || echo "OK: canonicalSkills ausente (a engadir)"
```

Esperado: (a) o tipo ten os 5 campos e só se usa `s.peso`; (b) `canonicalSkills`
non existe. Se algo difire, **para**.

---

## 3. T1 — O FIX (`packages/importers/src/gaia.ts`)

Dentro de `buildTreeMetadata`, **xusto despois** do bloque que constrúe
`canonicalWeights` (o `for (const s of input.skills) { canonicalWeights[s.id] = s.peso }`),
engade:

```ts
  // canonicalSkills: obxectos completos (sen perda de label/categoria/icono).
  // canonicalWeights mantense por compatibilidade (mapa id→peso).
  const canonicalSkills = input.skills.map((s) => ({
    id: s.id,
    label: s.label,
    categoria: s.categoria,
    peso: s.peso,
    ...(s.icono !== undefined ? { icono: s.icono } : {}),
  }))
```

E no `return { gaia: { ... } }`, engade `canonicalSkills` **despois** de
`canonicalWeights`:

```ts
  return {
    gaia: {
      profession,
      canonicalWeights,
      canonicalSkills,
      ...(Object.keys(groupCanonical).length > 0 ? { groupCanonical } : {}),
    },
  }
```

Nada máis. `label` e `categoria` son obrigatorios na entrada (sempre presentes);
`icono` é opcional → spread condicional (respecta `exactOptionalPropertyTypes`).

---

## 4. T2 — TESTS (`packages/importers/__tests__/gaia.test.ts`)

`metadata` é opaco; nos asserts cástase como no resto do ficheiro (mira como o
test de round-trip xa accede a `canonicalWeights` e imita ese patrón).

**(a) Unit — preservación e icono opcional.** Constrúe unha `GaiaProfession`
mínima con dúas skills, unha con `icono` e outra sen, e verifica que
`canonicalSkills` ten ambas, con `label`/`categoria`/`peso`, e que o `icono` só
aparece na que o ten.

**(b) Round-trip real (panadeiro) — estende o bloque existente.** Engade asserts:
- `canonicalSkills` ten **10** entradas (igual que `canonicalWeights`).
- Spot-check dunha skill coñecida da fixture: `coordinación` →
  `categoria: 'física'`, `icono: '🤲'`, `peso: 2`. (Verifica os valores exactos
  na fixture `panadeiro.fixture.json` antes de fixalos; usa eses.)

Cobertura: o ficheiro novo de lóxica é só o `.map`; cobre os dous camiños
(con/sen `icono`) co test (a). **100/100/100/100** no que toques.

---

## 5. T3 — Docs + changeset

- **Changeset** `.changeset/f9-3c-canonical-skills.md`:
  ```md
  ---
  "@yggdrasil-forge/importers": patch
  ---

  fix(gaia): preservar as skills canónicas enteiras (label, categoria, icono),
  non só o peso. Antes `metadata.gaia.canonicalWeights` aplanaba a {id: peso} e
  perdía categoria/label/icono; engádese `metadata.gaia.canonicalSkills` cos
  obxectos completos. Aditivo (canonicalWeights mantense). Pecha F9 sen perda.
  ```
- **`packages/importers/README.md`:** menciona `metadata.gaia.canonicalSkills`
  na sección do importador GAIA (unha liña: forma `{id,label,categoria,peso,icono?}[]`).
- **Commit message** narrativo: que corrixe a perda detectada na revisión post-F9.4,
  que é aditivo, e que desbloquea a capa gráfica (pintar categoría/icono das canónicas).

---

## 6. GATE (orde exacta, todo verde)

```bash
HUSKY=0
pnpm install
pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check
pnpm turbo run typecheck --force
pnpm turbo run test --force
pnpm --filter @yggdrasil-forge/importers run test:coverage   # 100/100/100/100 no tocado
```

Cero regresión: a suite previa (incluído o round-trip de 9.3 e o de 9.4) segue
verde. `importers` debería subir o seu contador de tests no número de asserts
novos que engadas.

---

## 7. ENTREGA (patch)

- Sen heredocs para `.ts`. Un só commit; mensaxe narrativa (§5).
  ```bash
  git add -A && git commit
  git format-patch -1 HEAD
  ```
- O Director aplicará con `git am --keep-cr` nun clone fresco. Borra calquera
  copia local deste briefing dentro do repo antes de aplicar. Avisos de
  *trailing whitespace* non bloquean.

---

## 8. CHECKLIST DE ACEPTACIÓN

- [ ] `canonicalSkills` engadido a `metadata.gaia` cos 5 campos (icono condicional).
- [ ] `canonicalWeights` **intacto** (test previo verde).
- [ ] Round-trip do panadeiro: `canonicalSkills` con 10 entradas + spot-check
      `coordinación` (categoria/icono/peso).
- [ ] Test do icono opcional (con/sen).
- [ ] Gate completo verde; cobertura 100 % no tocado; cero regresión.
- [ ] Changeset patch + README.

**Con isto, a Fase 9 queda PECHADA sen perda.** O seguinte que prepara o Director
é o deseño de **F9.5 (competencia → stats)**, bancado para execución diferida; e
despois retómase a parte gráfica.

---

*Briefing F9.3.c · 5º Arquitecto · pre-resolto para execución sen consulta.*
