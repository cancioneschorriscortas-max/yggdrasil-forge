# BRIEFING — Rexións (cor por columna) + Theme Lab á dereita

> **4º Arquitecto (Director) → Executor.**
> **Organización visual por columnas.** Cada columna (Guerreiro / Paladín /
> Clérigo) píntase cun **tinte de fondo temático**, e o **Theme Lab** pasa a ser
> un panel **fixo á dereita** (sen despregable cara abaixo) cun **selector de
> columna** que edita a cor de cada rexión, xunto coas cores por estado (incluída
> a de **bloqueo**). Rexións = **por tag** (vía prop de `@react` + datos do demo;
> sen schema de core). `@react` **minor** + demo. **Human visual check.**

---

## 1. Estado á entrada (verificado polo Director, HEAD `c1f237e`)

- Layout `custom` (posicións manuais); `@react` ten as posicións no render.
- F10.8 introduciu o patrón de **`<rect>` de surface dentro do `<g transform>`**
  (reusable para os tintes de rexión).
- Nodos do paladín teñen `tags:['warrior']` na rama Guerreiro; **Clérigo e
  centro non teñen tag aínda**.
- Theme Lab actual: sección (posiblemente despregable) co picker de cores.

## 2. Modelo (NON discutible)

### 2.1 `@react` — render de rexións
- Novo prop `SkillTree.regions?: readonly RegionSpec[]`:
  ```typescript
  interface RegionSpec {
    readonly id: string
    readonly label: string
    readonly tag: string        // pertenza por tag de nodo
    readonly color: string      // tinte (aplícase con baixa opacidade)
  }
  ```
- Para cada rexión: calcular o **bounding box** dos nodos cuxo `tags` inclúe
  `region.tag` (+ padding), e debuxar un `<rect>` de tinte **dentro do `<g
  transform>`**, **antes** dos edges e nodos. **Z-order: rexións → edges →
  nodos.** Opacidade baixa (ex. 0.12) para non tapar.
- Etiqueta da rexión (`label`) na parte superior do seu bbox (texto themed).
- Sen rexións → nada (cero regresión).

### 2.2 demo — tags + datos de rexión
- Engadir tags ao `tree-def-paladin`: `cleric` aos nodos do Clérigo (Luz Sagrada,
  Mans Sanadoras, Golpe Divino, Escudo Divino, Xuízo Divino) e `paladin` aos do
  centro (Guerreiro Sagrado, Campeón da Luz, Aura de Valor, Pacto Escuro).
- Pasar `regions` ao `SkillTree`:
  `[{id:'warrior',label:'Guerreiro',tag:'warrior',color:<vermello tenue>},
    {id:'paladin',label:'Paladín',tag:'paladin',color:<dourado tenue>},
    {id:'cleric',label:'Clérigo',tag:'cleric',color:<azul tenue>}]`
  (cores en **estado do demo**, editables polo Theme Lab).

### 2.3 demo — Theme Lab á dereita + selector de columna
- **Layout**: o Theme Lab pasa a **panel fixo á dereita** (columna propia), **sen
  despregable cara abaixo**. (Reorganizar o panel lateral: Status/Inspector/
  Controls + **Theme Lab como panel á dereita**.)
- **Selector de columna** (dropdown/botóns: «Guerreiro / Paladín / Clérigo») que
  selecciona a rexión activa; o color picker edita **a cor desa rexión** (estado
  do demo) → reflíctese en vivo no tinte.
- Manter os pickers por estado existentes (incluída a **cor de bloqueo**,
  `nodeFillLocked`) **no mesmo panel á dereita**.

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD (tras Nivel·A se xa aterrou, ou `c1f237e`). Identidade git. GREP:
- O `<g transform>` e onde se debuxan edges/nodos (para inserir as rexións
  antes; z-order).
- Como se accede ás posicións dos nodos no render (para o bbox por tag).
- Estrutura actual do Theme Lab (para reorganizar á dereita + engadir selector).
- Tags actuais no `tree-def-paladin`.

### T1 — `@react`: `RegionSpec` + render
- Prop `regions?`; bbox por tag; `<rect>` de tinte (z-order rexións→edges→nodos);
  label da rexión. Opacidade baixa.

### T2 — demo: tags + datos
- Engadir tags `cleric`/`paladin`; definir `regions` en estado do demo; pasalas
  ao `SkillTree`.

### T3 — demo: Theme Lab á dereita + selector
- Reorganizar a Theme Lab a panel **á dereita**, sen despregable.
- Selector de columna + picker que edita a cor da rexión activa.
- Conservar pickers por estado (incl. bloqueo) no mesmo panel.

### T4 — Tests
- `@react`: con `regions`, renderízanse N rects de tinte detrás dos nodos co
  bbox correcto; sen `regions` → ningún.
- Z-order: rexións antes que edges/nodos.
- (demo) selector cambia a cor da rexión activa.
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T5 — Docs + changeset + commit
- `docs/GUIDE.md` (doc vivo): prop `regions` (RegionSpec) + exemplo.
- `RENDERER-STATE.md`: «Rexións (tinte por tag, z-order rexións→edges→nodos) +
  Theme Lab á dereita con selector de columna».
- Changeset `.changeset/feat-regions.md` → `@yggdrasil-forge/react` minor:
  `feat(react): region tints (per-tag bounding box) behind the tree`
- Copia este briefing a `docs/briefings/BRIEFING_REXIONS_THEME_LAB.md`.
- Commit + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/SkillTree.tsx                             (M)
packages/react/src/SkillRegions.tsx                          (A, subcompoñente render)
packages/react/src/SkillTreeWithDefaultTheme.tsx             (M, pass-through)
packages/react/__tests__/SkillTree.*.test.tsx                (M/A)
examples/react-demo/src/tree-def-paladin.ts                  (M, tags)
examples/react-demo/src/App.tsx                              (M, regions + layout)
examples/react-demo/src/ThemeLab.tsx                         (M, dereita + selector)
examples/react-demo/src/styles.css                           (M, layout dereita)
docs/GUIDE.md                                                (M)
docs/architecture/RENDERER-STATE.md                          (M)
.changeset/feat-regions.md                                   (A)
docs/briefings/BRIEFING_REXIONS_THEME_LAB.md                 (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON schema de rexións en `@core` (v1 = prop de `@react` + datos do demo).
- ❌ NON tapar nodos/edges (tinte de baixa opacidade, z-order detrás).
- ❌ NON Theme Lab despregable cara abaixo (panel fixo á dereita).
- ❌ NON props obrigatorias. ❌ NON esquecer GUIDE. ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: as **tres columnas teñen tinte temático** (Guerreiro/
Paladín/Clérigo) detrás dos nodos; o **Theme Lab está á dereita** (sen
despregable) cun **selector de columna** que cambia a cor de cada rexión en
vivo; a cor de **bloqueo** segue editable no mesmo panel. Visual check
**pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) · `🔎 GREP T0` ·
  `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Rexións + Theme Lab. 4º Arquitecto. Cada columna, o seu mundo. 🌳*
