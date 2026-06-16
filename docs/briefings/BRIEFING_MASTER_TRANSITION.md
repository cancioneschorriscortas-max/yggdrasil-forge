# BRIEFING — sub-fase `master-transition` de Yggdrasil Forge

> **Briefing do 4º Arquitecto (Director) para o Executor.**
> **Sub-fase de transición. CERO CÓDIGO.** Só documentación + un fixture
> de datos. Abre a etapa Renderer→Studio (camiño a 1.0).

---

## 1. Contexto mínimo (que é Yggdrasil Forge en 3 liñas)

Motor open-source de *progression graphs* (skill trees) en TypeScript,
monorepo pnpm + Turborepo. Core framework-agnostic (dep única: Immer) +
renderer React + (futuro) editor. Cliente cero: **Oberón**, a sección de
profesións da app educativa **GAIA** (repo aparte `gaia-frontend`).

## 2. Que se fixo antes (estado á entrada)

- `origin/main` en `155881b`. **Fase 8 PECHADA.** 7 paquetes activos
  (common, core, storage, react, plugins, search, validators) + 13
  scaffold. ~2195 tests. **51 sub-fases consecutivas sen rollback.**
- 0.1.0 publicado en npm. README xa ten aviso de alpha.
- O renderer `@react` é insuficiente visualmente (recoñecido); a súa
  reconstrución é traballo **futuro** (Fase 10), non desta sub-fase.

## 3. Obxectivo desta sub-fase (unha frase)

Asentar a nova folla de ruta a 1.0 no repo e o contrato de datos de GAIA,
marcar o roadmap vello como superseded e capturar 3 leccións — **sen tocar
nin unha liña de código fonte**.

## 4. Decisións xa tomadas (NON discutibles — non consultar)

1. A folla de ruta nova (`ROADMAP-1.0-RENDERER-TO-STUDIO.md`) e o fixture
   (`panadeiro.fixture.json`) **fornéceos Agarfal como artefactos xa
   creados**. Colócanse **verbatim**. **NON os regeneres nin os edites.**
2. Numeración de leccións: a última en MASTER é **A.6.9**. As novas son
   **A.6.10, A.6.11, A.6.12** (textos exactos en T4).
3. As Fases 0–8 mantéñense no MASTER §67 como **rexistro histórico**; só
   se engade un banner de superseded para as fases 9+.
4. Esta sub-fase **non corre a suite completa de tests** (cero código): a
   proba de non-regresión é que o diff só toca `docs/` e `README.md`.

## 5. Tarefas a executar (T0–T9)

> Para as edicións do MASTER/README usa **un script Python en
> `/tmp/ygg-exec/`** (utf-8, **sen heredocs**, con `assert` que comprobe
> que o texto-áncora existe **antes** de modificar). Se algún `assert`
> falla (o ficheiro cambiou respecto ao esperado) → **PARA e escala**
> (§0.6). Non improvises.

### T0 — Preflight
- Fresh clone de `origin/main`. Confirma `git rev-parse HEAD` (anota o
  SHA). Working tree limpo (`git status`).
- Configura identidade git local se non a hai (`user.email`, `user.name`).
- **Feito:** SHA anotado, árbore limpa.

### T1 — Colocar a folla de ruta
- Copia o artefacto fornecido `ROADMAP-1.0-RENDERER-TO-STUDIO.md` a
  `docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md` (verbatim).
- **Feito:** o ficheiro existe e o seu contido é idéntico ao fornecido.

### T2 — Colocar o contrato de datos GAIA
- Crea `docs/architecture/data-contracts/`.
- Copia o artefacto fornecido `panadeiro.fixture.json` a
  `docs/architecture/data-contracts/panadeiro.fixture.json` (verbatim).
- Crea `docs/architecture/data-contracts/README.md` con este contido
  exacto:

```markdown
# Contratos de datos — referencia

Fixtures de referencia do contrato **GAIA → Yggdrasil** (`TreeDef`).
A BD de GAIA (Neo4j) é externa; o contrato é JSON. Ver
`../ROADMAP-1.0-RENDERER-TO-STUDIO.md` §3–§4.

- `panadeiro.fixture.json` — saída real de
  `GET /oberon/profesion/panadeiro/completa` (5 grupos, 19 microskills,
  10 skills canónicas). **Ground truth do importador** (sub-fase F9.3,
  paquete `@yggdrasil-forge/importers`).
```

- **Feito:** os dous ficheiros existen; o JSON parsea sen erro.

### T3 — Banner superseded en MASTER §67
- Áncora (debe existir exactamente): `## 67. ROADMAP POR FASES (EXECUTABLE)`
- Insire **inmediatamente despois** desa liña (deixando unha liña en
  branco antes e despois) este bloque exacto:

```markdown
> ⚠️ **SUPERSEDED (4º Arquitecto, etapa Renderer→Studio).** As Fases 9+
> deste roadmap orixinal quedan substituídas por
> `docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md` (folla de ruta a
> 1.0). As Fases 0–8 abaixo mantéñense como **rexistro histórico**
> (pechadas). Para o traballo activo, ler o roadmap novo.
```

- **Feito:** o banner aparece xusto baixo o título de §67.

### T4 — Leccións A.6.10 / A.6.11 / A.6.12
- Áncora (debe existir exactamente): `## A.7 — Protocolo consolidado`
- Insire **inmediatamente antes** desa liña este bloque exacto:

```markdown
### A.6.10 — Renderer arquitectónicamente insuficiente sen North Star (examples-2 L1)

A Fase 7 implementou o renderer `@react` **sen mockup de referencia**:
construíuse para pasar tests, non para vender. Tras 0.1.0, o feedback
empírico revelou ~18 gaps arquitectónicos. **Aprendizaxe:** orde estricta
**mockup → arquitectura → código**; cero código de UI antes de North Star
+ análise. **Customer Zero:** cando un OSS nace dunha necesidade interna
(Oberón), ese cliente é o North Star autoritativo; cada decisión pasa
«¿isto serve a Oberón?».

### A.6.11 — «Same Data. Different Themes.»

Separación radical entre **lóxica** (estrutura do grafo) e **presentación**
(tema). **Nunca acoplar unha decisión de tema á estrutura de datos.** A
comparación visual de temas sobre os mesmos datos é a validación explícita
desta promesa.

### A.6.12 — Build narrow, design wide (reconciliación de alcance)

Un roadmap que mestura tres proxectos (produto / librería / plataforma)
sen fronteira ten **alcance infinito**. Doutrina: **entrégase o estreito**
(cliente cero, Oberón) e **deséñase o ancho** (sen pechar xogos nin
Duolingo). Test por decisión: «¿isto pecharíalle a porta a un dev de
xogos ou de Duolingo?». E: **verificar empíricamente que os datos do
cliente caben no motor ANTES de planificar a capa visual**. Detalle en
`docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md`.
```

- **Feito:** as 3 leccións aparecen ao final de §A.6, antes de §A.7.

### T5 — Punteiro no README
- Áncora (debe existir exactamente): `in production environments.**`
- Insire **inmediatamente despois** desa liña (liña en branco + o
  seguinte):

```markdown

> 🗺️ **Roadmap a 1.0:** ver
> [`docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md`](docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md).
```

- **Feito:** o punteiro aparece baixo o parágrafo de alpha.

### T6 — Tracking do briefing (§A.5.2)
- Copia **este briefing** a `docs/briefings/BRIEFING_MASTER_TRANSITION.md`
  (verbatim).
- **Feito:** o ficheiro existe.

### T7 — Lint / format
- Executa a cadea estándar: `pnpm lint:fix → pnpm format → pnpm lint →
  pnpm format:check`.
- Markdown probablemente está ignorado por Biome; se Biome reformatea o
  `panadeiro.fixture.json` (só espazos/indentación, **sen reordenar
  claves**), é aceptable.
- **Feito:** `pnpm lint` e `pnpm format:check` pasan sen erros.

### T8 — Verificación (proba de non-regresión)
- `git add -A` e despois:
  - `git diff --cached --name-only` → **toda** ruta debe estar baixo
    `docs/` ou ser exactamente `README.md`. Se aparece calquera ficheiro
    de `packages/**/src` ou config → **PARA e escala**.
  - Anti-placeholder: `grep -rnE "TODO|FIXME|PLACEHOLDER|XXX|lorem"` nos
    ficheiros novos/modificados → **cero coincidencias**.
  - `pnpm turbo run typecheck --force` → segue pasando (sanity; non debe
    verse afectado).
- **Feito:** diff só docs+README, cero placeholders, typecheck verde.

### T9 — Commit
- Un só commit. Mensaxe exacta:

```
docs(architecture): roadmap 1.0 (renderer→studio), GAIA data contract, supersede §67, lessons A.6.10-12

- add docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md
- add docs/architecture/data-contracts/ (panadeiro fixture + README)
- MASTER §67: superseded banner for phases 9+
- MASTER §A.6.10/A.6.11/A.6.12: new structural lessons
- README: roadmap pointer
- track BRIEFING_MASTER_TRANSITION.md

No source code touched. ~2195 tests unchanged.
```

- Xera o patch: `git format-patch -1 HEAD`.
- **Feito:** patch xerado, listo para entregar a Agarfal.

## 6. Convencións obrigatorias

- Idioma docs: galego (coherente co MASTER).
- INICIO/FIN: **n/a** (cero código).
- Scripts en `/tmp/ygg-exec/`, utf-8, sen heredocs, con `assert` antes de
  modificar. Nunca na raíz do repo.
- Un só commit. Conventional commits.

## 7. Ficheiros esperados no diff final (lista pechada)

```
docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md            (novo)
docs/architecture/data-contracts/panadeiro.fixture.json        (novo)
docs/architecture/data-contracts/README.md                     (novo)
docs/architecture/MASTER.md                                    (modificado: §67 banner + A.6.10-12)
docs/briefings/BRIEFING_MASTER_TRANSITION.md                   (novo)
README.md                                                       (modificado: punteiro roadmap)
```

Calquera outro ficheiro no diff = erro → **PARA e escala**.

## 8. Que NON facer (anti scope-creep)

- ❌ NON tocar `packages/**` (nin src, nin tests, nin config).
- ❌ NON editar nin regenerar os artefactos fornecidos (roadmap, fixture).
- ❌ NON consolidar o CHANGELOG nin bumpar versións.
- ❌ NON renomear briefings existentes.
- ❌ NON adiantar nada de F9.1 (o campo `tiers`).

## 9. Como reportar (formato esperado)

Resposta final con estas cabeceiras exactas:

- `✅ ESTADO` — feito / parado-escalado.
- `📋 TAREFAS` — T0–T9, cada unha ✅/⚠️/❌ cunha liña.
- `📂 DIFF` — saída de `git diff --cached --name-only` (debe coincidir coa
  lista pechada de §7).
- `🔍 VERIFICACIÓN` — resultado de anti-placeholder + typecheck.
- `🧩 PATCH` — confirmación de `git format-patch -1 HEAD` (nome do .patch).
- `🚨 ESCALADAS` — calquera assert fallido ou descuberta fóra de
  asunción; se ningunha, «ningunha».

---

*Briefing master-transition. 4º Arquitecto. Cero código, rastro limpo. 🌳*
